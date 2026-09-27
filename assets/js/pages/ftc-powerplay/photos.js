// Our photos, one per step of the text, with outlines drawn over them by the scroll. The outlines
// and their labels are annotations on the real photo (image-relative coordinates), not geometry:
// there is no CAD of this robot. A step's photo dissolves in over the one before during the first
// part of the step (a cut with reduced motion), then its outlines draw themselves one after another.
// A step may also dissolve into a second photo of the same framing across the step (`to`), and
// `solo` marks light up one at a time instead of adding up. Every picture is a pure function of
// (step, stepP).
import { css, h, svg, clamp, smooth, setter, mediaUrl, cardCover, fitFocus } from './kit.js';

const LOCAL_CSS = `
.pp-ph-slide { position: absolute; opacity: 0; will-change: opacity; }
.pp-ph-slide > img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.pp-ph-slide > img.to { opacity: 0; }
.pp-ph-slide > svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pp-ph-glow { fill: none; stroke: #ff6b35; stroke-opacity: 0.35; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.pp-ph-line { fill: none; stroke: #ffb38f; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.pp-ph-slide .pp-chip { position: absolute; transform: translate(-50%, -50%); border-color: rgba(255, 107, 53, 0.6); opacity: 0; }
.pp-ph-slide .pp-chip i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.pp-ph-cap { position: absolute; z-index: 3; left: 50%; bottom: 14px; transform: translateX(-50%); max-width: calc(100% - 28px); white-space: normal; text-align: center; border-radius: 12px; }
.pp-ph-cap .d { color: var(--accent); font-weight: 650; }
.pp-ph-dots { position: absolute; z-index: 3; top: 14px; right: 14px; display: flex; gap: 6px; padding: 7px 10px; border-radius: 999px; background: rgba(10, 8, 7, 0.78); border: 1px solid rgba(255, 255, 255, 0.12); }
.pp-ph-dots i { width: 7px; height: 7px; border-radius: 50%; background: rgba(237, 232, 226, 0.25); }
.pp-ph-dots i.on { background: var(--accent); }
@media (max-width: 900px) {
  .pp-ph-cap { bottom: 8px; left: 8px; right: 8px; max-width: none; transform: none; text-align: left; font-size: 12px; padding: 5px 10px 6px; }
  .pp-ph-dots { top: 8px; right: 8px; padding: 5px 8px; }
  .pp-ph-slide .pp-chip { font-size: 11px; padding: 3px 8px; }
}
`;

export function mount(el, ctx) {
  css('pp-ph-css', LOCAL_CSS);
  const slides = ctx.data.slides || [];
  const reduced = ctx.reducedMotion;
  const S = setter();
  const small = el.clientWidth < 700;
  const root = h('div', 'pp pp-ph');
  root.setAttribute('role', 'img');
  el.appendChild(root);

  const made = slides.map((sl) => {
    const div = h('div', 'pp-ph-slide');
    const img = h('img');
    img.alt = sl.alt || '';
    img.decoding = 'async';
    div.append(img);
    let to = null;
    if (sl.to) { to = h('img', 'to'); to.alt = sl.toAlt || ''; to.decoding = 'async'; div.append(to); }
    const s = svg('svg', { viewBox: `0 0 ${sl.w} ${sl.h}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' }, div);
    const marks = (sl.marks || []).map((m) => {
      const g = svg('g', {}, s);
      const shape = (cls, sw) => {
        const a = { class: cls, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1 };
        if (sw) a['stroke-width'] = sw;
        if (m.pts) return svg(m.closed === false ? 'polyline' : 'polygon', { ...a, points: m.pts.map(([x, y]) => `${x * sl.w},${y * sl.h}`).join(' ') }, g);
        const [x0, y0, x1, y1] = m.box;
        if (m.shape === 'ellipse') return svg('ellipse', { ...a, cx: ((x0 + x1) / 2) * sl.w, cy: ((y0 + y1) / 2) * sl.h, rx: ((x1 - x0) / 2) * sl.w, ry: ((y1 - y0) / 2) * sl.h }, g);
        return svg('rect', { ...a, x: x0 * sl.w, y: y0 * sl.h, width: (x1 - x0) * sl.w, height: (y1 - y0) * sl.h, rx: Math.min(sl.w, sl.h) * 0.012 }, g);
      };
      const glow = shape('pp-ph-glow', 9);
      const line = shape('pp-ph-line');
      let chip = null;
      if (m.label) {
        chip = h('p', 'pp-chip');
        chip.append(h('i'), h('b', null, m.label));
        const at = m.at || (m.box ? [(m.box[0] + m.box[2]) / 2, m.box[1] - 0.04] : m.pts[0]);
        chip.style.left = `${at[0] * 100}%`;
        chip.style.top = `${at[1] * 100}%`;
        div.append(chip);
      }
      return { m, g, glow, line, chip };
    });
    root.append(div);
    return { sl, div, img, to, marks, loaded: false };
  });
  const cap = h('p', 'pp-chip pp-ph-cap');
  const dots = h('div', 'pp-ph-dots');
  const dotEls = slides.map(() => { const i = h('i'); dots.append(i); return i; });
  root.append(cap, dots);

  function load(i) {
    for (let j = i - 1; j <= i + 2; j++) {
      const m = made[j];
      if (!m || m.loaded) continue;
      m.loaded = true;
      m.img.src = mediaUrl(ctx, m.sl.img, small);
      if (m.to) m.to.src = mediaUrl(ctx, m.sl.to, small);
    }
  }

  function layout() {
    const W = el.clientWidth, H = el.clientHeight;
    const left = cardCover(el, ctx);
    const narrow = W < 700;
    const pad = narrow ? 8 : 18;
    const area = { x: left + pad, y: pad + (narrow ? 0 : 30), w: W - left - pad * 2, h: H - pad * 2 - (narrow ? 34 : 86) };
    for (const m of made) {
      const f = fitFocus(area, m.sl.w, m.sl.h, m.sl.focus || [0, 0, 1, 1]);
      Object.assign(m.div.style, { left: `${f.x}px`, top: `${f.y}px`, width: `${f.w}px`, height: `${f.h}px` });
    }
    S.style(cap, 'left', narrow ? '' : `${left + (W - left) / 2}px`);
  }

  let shownCap = -1;
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, made.length - 1);
    const q = clamp(stepP, 0, 1);
    load(s);
    // the step's photo dissolves in over the one before (both fully drawn, the new one on top)
    const k = s === 0 || reduced ? 1 : smooth(0, 0.4, q);
    made.forEach((m, i) => {
      const o = i === s ? k : i === s - 1 && k < 1 ? 1 : 0;
      S.style(m.div, 'opacity', o.toFixed(3));
      S.style(m.div, 'zIndex', String(i === s ? 2 : 1));
      if (m.to) {
        const t = i === s ? (reduced ? (q >= 0.5 ? 1 : 0) : smooth(0.42, 0.58, q)) : i < s ? 1 : 0;
        S.style(m.to, 'opacity', t.toFixed(3));
      }
    });
    // outlines draw one after another over the rest of the step
    const cur = made[s];
    const n = cur.marks.length;
    const t0 = s === 0 ? 0.08 : 0.3, t1 = 0.86;
    cur.marks.forEach((mk, j) => {
      const a = t0 + ((t1 - t0) * j) / Math.max(1, n);
      const b = t0 + ((t1 - t0) * (j + 1)) / Math.max(1, n);
      const draw = reduced ? (q >= a ? 1 : 0) : smooth(a, a + (b - a) * 0.7, q);
      let o = 1;
      if (cur.sl.solo && j < n - 1) o = 1 - 0.7 * (reduced ? (q >= b ? 1 : 0) : smooth(b, b + 0.04, q));
      S.attr(mk.glow, 'stroke-dashoffset', (1 - draw).toFixed(4));
      S.attr(mk.line, 'stroke-dashoffset', (1 - draw).toFixed(4));
      S.style(mk.g, 'opacity', o.toFixed(3));
      if (mk.chip) S.style(mk.chip, 'opacity', (smooth(0.5, 1, draw) * o).toFixed(3));
    });
    // outlines on the other photos: fully drawn if already passed, else hidden
    made.forEach((m, i) => {
      if (i === s) return;
      for (const mk of m.marks) {
        const v = i < s ? '0' : '1';
        S.attr(mk.glow, 'stroke-dashoffset', v);
        S.attr(mk.line, 'stroke-dashoffset', v);
        S.style(mk.g, 'opacity', m.sl.solo ? '0.3' : '1');
        if (mk.chip) S.style(mk.chip, 'opacity', i < s ? '1' : '0');
      }
    });
    if (s !== shownCap) {
      shownCap = s;
      cap.replaceChildren();
      if (cur.sl.date) cap.append(h('span', 'd', `${cur.sl.date}  `));
      cap.append(document.createTextNode(cur.sl.c || ''));
      root.setAttribute('aria-label', cur.sl.alt || cur.sl.c || '');
      dotEls.forEach((d, i) => d.classList.toggle('on', i === s));
    }
  }

  const ro = new ResizeObserver(layout);
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
