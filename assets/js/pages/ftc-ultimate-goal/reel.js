// One of our phone videos, advanced by the scroll. There is no CAD of this robot, so the footage is
// the model: the clip is cut into frames (ten per second) and the scroll picks the frame. Never
// play(), nothing moves on its own. A step can also hold one still from the same camera with marker
// callouts, which draw themselves in as you scroll.
// Under the picture: a counter switched at moments measured frame by frame on the clip
// (data.counter), the clip time, an optional event chip, and an optional readout of numbers
// re-typed from the screen in the footage (data.readout: only values actually read, never
// interpolated; the readout says when each was read).
// setProgress is a pure function of (step, stepP): scrolling back plays the clip backwards.
//
// data: { aria, aspect, frames, framesSmall, count, fps, clipStart,
//         counter: { label, max, start, at: [[time, value], ...] }, event: { at, text },
//         readout: { title, names, max, waiting, until, after, at: [[frame time, [values]], ...] },
//         steps: [{ from, to, still } | { image, ar, alt, chip, doodles, notes }] }
import { css, h, svg, clamp, lerp, smooth, setter, freeLeft, ringMeter, clock, frameSeq, mediaUrl, markerFont, doodle } from './kit.js';

const LOCAL = `
.ug-reel-box { position: absolute; border-radius: 14px; overflow: hidden; background: #151210; box-shadow: 0 34px 70px -34px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.08); }
.ug-reel-box canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ug-reel-still { position: absolute; opacity: 0; }
.ug-reel-still img { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.ug-reel-hud { position: absolute; display: flex; justify-content: center; align-items: center; gap: 8px 10px; flex-wrap: wrap; }
.ug-reel-hud .lbl { color: var(--muted); font-size: 12px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; }
.ug-reel-ev b { color: #ff9a62; }
.ug-ro { position: absolute; display: grid; grid-template-columns: auto minmax(60px, 1fr) auto; gap: 5px 12px; align-items: center; padding: 11px 14px 10px; border-radius: 12px; background: rgba(10,8,7,0.8); border: 1px solid rgba(255,255,255,0.12); font-size: 13px; color: var(--text-2); }
.ug-ro .t { grid-column: 1 / -1; margin: 0 0 2px; font-size: 11px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.ug-ro code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; color: var(--text-2); }
.ug-ro i { display: block; height: 7px; border-radius: 4px; background: rgba(255,255,255,0.08); overflow: hidden; }
.ug-ro i em { display: block; height: 100%; width: 0; background: var(--accent); border-radius: 4px; }
.ug-ro b { min-width: 4ch; text-align: right; color: var(--text); font-weight: 650; font-variant-numeric: tabular-nums; }
@media (max-width: 900px) {
  .ug-reel-hud .lbl { font-size: 10.5px; }
  .ug-reel-box { border-radius: 10px; }
  .ug-ro { padding: 7px 10px; gap: 3px 9px; font-size: 12px; }
  .ug-ro code { font-size: 11px; }
}
`;

export function mount(el, ctx) {
  css('ug-reel-css', LOCAL);
  const D = ctx.data;
  const steps = D.steps || [];
  const reduced = ctx.reducedMotion;
  const hasImage = steps.some((s) => s.image);
  if (hasImage) markerFont();

  const root = h('div', 'ug ug-reel');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', D.aria || 'Frames from one of our videos');
  const box = h('div', 'ug-reel-box');
  const canvas = document.createElement('canvas');
  box.appendChild(canvas);

  // stills with callouts (only steps that have an image); each keeps its own aspect and covers the box
  const stills = steps.map((s) => {
    if (!s.image) return null;
    const wrap = h('div', 'ug-reel-still');
    const img = h('img');
    img.alt = s.alt || '';
    img.decoding = 'async';
    img.src = mediaUrl(ctx, s.image, el.clientWidth < 700);
    wrap.appendChild(img);
    const g = svg(wrap, 'svg', { class: 'ug-doodle', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const paths = (s.doodles || []).map(() => svg(g, 'path', { pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }));
    const notes = (s.notes || []).map((n) => {
      const e = h('span', 'ug-note ug-marker', n.text);
      e.style.left = `${n.x}%`; e.style.top = `${n.y}%`; e.style.opacity = '0';
      if (n.rot) e.style.transform = `translate(-50%, -50%) rotate(${n.rot}deg)`;
      wrap.appendChild(e);
      return e;
    });
    box.appendChild(wrap);
    return { s, wrap, g, paths, notes };
  });

  const hud = h('div', 'ug-reel-hud');
  let meter = null, countChip = null;
  if (D.counter) {
    countChip = h('span', 'ug-chip');
    meter = ringMeter(D.counter.max || 3);
    countChip.append(h('span', 'lbl', D.counter.label), meter.el);
    hud.append(countChip);
  }
  const timeChip = h('span', 'ug-chip');
  const timeB = h('b', null, '0:00.0');
  timeChip.append(h('span', 'lbl', 'Clip'), timeB);
  hud.append(timeChip);
  let evChip = null;
  if (D.event) { evChip = h('span', 'ug-chip ug-reel-ev'); evChip.append(h('b', null, D.event.text)); hud.append(evChip); }
  const stillChip = h('span', 'ug-chip');
  const stillB = h('b');
  stillChip.append(stillB);
  if (hasImage) hud.append(stillChip);

  // readout of values re-typed from the screen in the footage
  let ro = null;
  if (D.readout) {
    const R = D.readout;
    const wrap = h('div', 'ug-ro');
    const title = h('p', 't', R.title || '');
    wrap.appendChild(title);
    const rows = R.names.map((n) => {
      const code = h('code', null, n);
      const bar = h('i'); const fill = h('em'); bar.appendChild(fill);
      const val = h('b', null, '');
      wrap.append(code, bar, val);
      return { fill, val };
    });
    ro = { wrap, title, rows };
  }
  root.append(box, hud);
  if (ro) root.append(ro.wrap);
  el.appendChild(root);

  const set = setter();
  let small = el.clientWidth < 700;
  let seq = null;
  function build() {
    small = el.clientWidth < 700;
    seq?.dispose();
    const dir = small ? D.framesSmall || D.frames : D.frames;
    seq = frameSeq(canvas, { url: (i) => ctx.asset(`${dir}${String(i + 1).padStart(3, '0')}.webp`), count: D.count },
      () => draw(true));
  }

  // the picture in the free part of the stage (right of the step cards on a full-width desktop),
  // as large as fits at the clip's aspect, with the readouts under it
  function layout() {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    if ((W < 700) !== small) build();
    const left = freeLeft(el, ctx);
    const phone = W < 700;
    const pad = phone ? 8 : 26;
    const chipsH = phone ? 36 : 54;
    const roH = ro ? (phone ? 104 : 132) : 0;
    const aw = W - left - pad * 2, ah = H - pad * 2 - chipsH - roH;
    const ar = D.aspect || 16 / 9;
    let bw = aw, bh = bw / ar;
    if (bh > ah) { bh = ah; bw = bh * ar; }
    const bx = left + pad + (aw - bw) / 2;
    const by = pad + (ah - bh) / 2 + (phone ? 0 : 0);
    Object.assign(box.style, { left: `${bx}px`, top: `${by}px`, width: `${bw}px`, height: `${bh}px` });
    Object.assign(hud.style, { left: `${left + pad}px`, width: `${aw}px`, top: `${by + bh + (phone ? 8 : 14)}px` });
    if (ro) {
      const rw = Math.min(bw, phone ? aw : 460);
      Object.assign(ro.wrap.style, { left: `${bx + (bw - rw) / 2}px`, width: `${rw}px`, top: `${by + bh + chipsH + (phone ? 4 : 6)}px` });
    }
    for (const st of stills) if (st) {
      // cover the box at the still's own aspect, so the callouts stay on what they point at
      const sar = st.s.ar || ar;
      let w = bw, hh = bw / sar;
      if (hh < bh) { hh = bh; w = bh * sar; }
      Object.assign(st.wrap.style, { left: `${(bw - w) / 2}px`, top: `${(bh - hh) / 2}px`, width: `${w}px`, height: `${hh}px` });
      st.g.setAttribute('viewBox', `0 0 ${Math.round(1000 * sar)} 1000`);
      (st.s.doodles || []).forEach((d, k) => st.paths[k].setAttribute('d', doodle(d, sar)));
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const cw = Math.round(bw * dpr), ch = Math.round(bh * dpr);
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    draw(true);
  }

  // the clip step nearest to step i (an image step shows the next clip step's first frame under it)
  function clipStep(i) {
    for (let d = 0; d < steps.length; d++) {
      if (steps[i + d] && !steps[i + d].image) return [steps[i + d], 1];
      if (steps[i - d] && !steps[i - d].image) return [steps[i - d], -1];
    }
    return [null, 0];
  }
  let cur = { step: 0, stepP: 0 };
  function draw(force = false) {
    const i = clamp(cur.step | 0, 0, steps.length - 1);
    const q = clamp(cur.stepP, 0, 1);
    const s = steps[i];
    let t;
    if (s && !s.image) t = reduced ? (s.still ?? (s.from + s.to) / 2) : lerp(s.from, s.to, q);
    else { const [c, dir] = clipStep(i); t = c ? (dir > 0 ? c.from : c.to) : 0; }
    if (D.count) seq?.draw(t * (D.fps || 10), force);
    // stills: shown on their own step; the next step fades from the still into the clip
    stills.forEach((st, k) => {
      if (!st) return;
      let a = 0, dr = 1, na = 1;
      if (k === i) {
        a = reduced || i === 0 ? 1 : smooth(0, 0.3, q);
        dr = reduced ? 1 : smooth(0.12, 0.6, q);
        na = reduced ? 1 : smooth(0.35, 0.65, q);
      } else if (k === i - 1) a = reduced ? 0 : 1 - smooth(0, 0.3, q);
      set.style(st.wrap, 'opacity', a.toFixed(3));
      st.paths.forEach((p) => set.attr(p, 'stroke-dashoffset', (1 - dr).toFixed(4)));
      st.notes.forEach((n) => set.style(n, 'opacity', na.toFixed(3)));
    });
    const onImage = !!(s && s.image);
    if (countChip) {
      let v = D.counter.start ?? 0;
      for (const [at, val] of D.counter.at || []) if (t >= at) v = val;
      meter.set(v);
      set.style(countChip, 'display', onImage ? 'none' : '');
    }
    set.text(timeB, clock((D.clipStart || 0) + t));
    set.style(timeChip, 'display', onImage ? 'none' : '');
    if (evChip) set.style(evChip, 'display', !onImage && t >= D.event.at ? '' : 'none');
    if (hasImage) {
      set.style(stillChip, 'display', onImage ? '' : 'none');
      if (onImage) set.text(stillB, s.chip || '');
    }
    if (ro) {
      const R = D.readout;
      let row = null;
      for (const r of R.at) if (t >= r[0] - 0.05) row = r; // r[0] is a frame time; frames switch half a frame early
      const live = !onImage && row && !(R.until != null && t >= R.until);
      set.style(ro.wrap, 'visibility', !onImage && (row || R.waiting) ? 'visible' : 'hidden');
      if (live) {
        set.text(ro.title, `${R.title} ${clock(row[0])}`);
        row[1].forEach((v, k) => {
          set.text(ro.rows[k].val, v.toLocaleString('en-US'));
          set.style(ro.rows[k].fill, 'width', `${clamp(v / R.max, 0, 1) * 100}%`);
        });
      } else {
        set.text(ro.title, R.until != null && t >= R.until ? R.after || '' : R.waiting || '');
        ro.rows.forEach((r) => { set.text(r.val, '...'); set.style(r.fill, 'width', '0%'); });
      }
    }
  }
  function setProgress(p, step, stepP) {
    cur = { step, stepP };
    draw();
  }

  build();
  const obs = new ResizeObserver(layout);
  obs.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { obs.disconnect(); seq?.dispose(); root.remove(); } };
}
