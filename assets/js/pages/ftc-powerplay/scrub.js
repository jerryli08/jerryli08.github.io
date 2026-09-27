// One of our clips, scrubbed by the scroll. The clip is not played or seeked: it was cut into a
// sequence of WebP stills (assets/models/ftc-powerplay/frames/), and each scroll position draws the
// still for one moment of the clip on a canvas. Each step of the text covers one stretch of clip
// time; scrolling back plays it backwards. A step may instead show one still photo (`img`), which
// dissolves into the footage over the first part of the next step (a cut with reduced motion).
// Overlays are annotations only: a rail of the steps, the clip clock, an optional outline drawn on
// the fixed camera's picture (the robot's chassis, which never moves) and an optional counter whose
// values were read off the frames by eye. Every picture is a pure function of (step, stepP).
import { css, h, svg, clamp, smooth, lerp, setter, mediaUrl, cardCover, fitFocus, frameSeq, canvasLayer } from './kit.js';

const LOCAL_CSS = `
.pp-sc-rail { position: absolute; z-index: 3; bottom: 16px; display: grid; gap: 6px; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); margin: 0; padding: 0; list-style: none; }
.pp-sc-rail li { display: grid; gap: 5px; min-width: 0; }
.pp-sc-rail i { display: block; height: 4px; border-radius: 2px; background: rgba(237, 232, 226, 0.18); overflow: hidden; }
.pp-sc-rail i em { display: block; height: 100%; width: 0; background: var(--accent); }
.pp-sc-rail small { font-size: 12px; font-weight: 600; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pp-sc-rail li.on small { color: var(--text); }
.pp-sc-tag { position: absolute; z-index: 3; top: 14px; }
.pp-sc-tag .t { color: var(--text); font-weight: 650; font-variant-numeric: tabular-nums; }
.pp-sc-box { position: absolute; z-index: 2; pointer-events: none; }
.pp-sc-box svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pp-sc-box rect { fill: none; stroke: #ff6b35; stroke-width: 2.5; stroke-dasharray: 7 6; vector-effect: non-scaling-stroke; }
.pp-sc-box .pp-chip { position: absolute; left: 0; top: 0; transform: translate(0, calc(-100% - 8px)); border-color: rgba(255, 107, 53, 0.55); }
.pp-sc-count { position: absolute; z-index: 3; top: 14px; display: grid; gap: 8px; padding: 12px 14px 12px; border-radius: 14px; background: rgba(10, 8, 7, 0.82); border: 1px solid rgba(255, 255, 255, 0.12); }
.pp-sc-count .n { display: flex; align-items: baseline; gap: 10px; }
.pp-sc-count .n b { font-size: 40px; line-height: 1; font-weight: 750; font-variant-numeric: tabular-nums; color: var(--text); }
.pp-sc-count .cones { display: flex; gap: 5px; align-items: flex-end; }
.pp-sc-count .cones svg { width: 20px; height: 24px; display: block; }
.pp-sc-count .cones path { fill: #3d6fe0; stroke: #3d6fe0; stroke-width: 1.5; }
.pp-sc-count .cones .gone path { fill: none; stroke: rgba(237, 232, 226, 0.28); stroke-dasharray: 3 3; }
@media (max-width: 900px) {
  .pp-sc-rail { bottom: 8px; gap: 4px; }
  .pp-sc-rail small { font-size: 10.5px; }
  .pp-sc-tag, .pp-sc-count { top: 8px; }
  .pp-sc-count { padding: 8px 10px; gap: 5px; }
  .pp-sc-count .n b { font-size: 26px; }
  .pp-sc-count .cones svg { width: 13px; height: 16px; }
}
@media (max-width: 480px) { .pp-sc-rail small { display: none; } .pp-sc-tag .w { display: none; } }
`;

const fmtT = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

export function mount(el, ctx) {
  css('pp-sc-css', LOCAL_CSS);
  const D = ctx.data;
  const reduced = ctx.reducedMotion;
  const S = setter();
  const steps = D.segs || [];
  const root = h('div', 'pp pp-sc');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', D.aria || 'A clip of our robot, stepped through by the scroll');
  el.appendChild(root);

  const small = el.clientWidth < 700;
  const seq = frameSeq(ctx, { ...D.frames, small });
  const cv = canvasLayer(root);
  const fade = h('div', 'pp-fade');
  root.appendChild(fade);

  // stills shown by some steps (a photo of the same scene), loaded when needed
  const stills = steps.map((st) => (st.img ? { st, img: null, ok: false } : null));
  function still(i) {
    const s = stills[i];
    if (!s) return null;
    if (!s.img) {
      s.img = new Image();
      s.img.decoding = 'async';
      s.img.onload = () => { s.ok = true; draw(); };
      s.img.src = mediaUrl(ctx, s.st.img, small);
    }
    return s.ok ? s.img : null;
  }

  // the rail: one segment per step
  const rail = h('ol', 'pp-sc-rail');
  const segs = steps.map((st) => {
    const li = h('li');
    const bar = h('i'); const fill = h('em'); bar.append(fill);
    li.append(bar, h('small', null, st.label || ''));
    rail.append(li);
    return { li, fill };
  });
  root.append(rail);

  // the clip clock
  const tag = h('p', 'pp-chip pp-sc-tag');
  const tagW = h('span', 'w', D.source ? `${D.source} · ` : '');
  const tagT = h('span', 't');
  tag.append(tagW, tagT);
  root.append(tag);

  // an outline on the picture (image-relative rect), shown on the listed steps
  const boxes = (D.boxes || []).map((b) => {
    const box = h('div', 'pp-sc-box');
    const s = svg('svg', { viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' }, box);
    svg('rect', { x: 0, y: 0, width: 100, height: 100, rx: 3 }, s);
    const chip = h('p', 'pp-chip', b.label);
    box.append(chip);
    root.append(box);
    return { ...b, el: box };
  });

  // the counter (values read off the frames)
  let count = null;
  if (D.counter) {
    const C = D.counter;
    const wrap = h('div', 'pp-sc-count');
    const top = h('div', 'n');
    const num = h('b');
    top.append(num, h('span', 'pp-kicker', C.title));
    const cones = h('div', 'cones');
    const icons = [];
    for (let i = 0; i < C.max; i++) {
      const sp = h('span');
      const s = svg('svg', { viewBox: '0 0 20 24', 'aria-hidden': 'true' }, sp);
      svg('path', { d: 'M7 2 H13 L18 21 Q10 23.5 2 21 Z', 'stroke-linejoin': 'round' }, s);
      cones.append(sp);
      icons.push(sp);
    }
    wrap.append(top, cones);
    root.append(wrap);
    count = { wrap, num, icons, marks: C.marks.slice().sort((a, b) => a.t - b.t) };
  }
  const countAt = (t) => { let n = count.marks[0].n; for (const m of count.marks) if (t + 1e-6 >= m.t) n = m.n; return n; };

  // layout: the area right of the step cards (full width, desktop) or the whole stage
  let L = null;
  function layout() {
    const { W, H } = cv.size();
    const left = cardCover(el, ctx);
    const narrow = W < 700;
    const pad = narrow ? 8 : 16;
    const railH = narrow ? 18 : 40;
    const area = { x: left + pad, y: pad + (narrow ? 0 : 44), w: W - left - pad * 2, h: H - pad * 2 - railH - (narrow ? 0 : 44) };
    const fit = fitFocus(area, seq.w, seq.h, D.focus || [0, 0, 1, 1]);
    L = { W, H, left, area, fit, narrow };
    S.style(fade, 'width', `${Math.round(left + (left ? 80 : 0))}px`);
    S.style(fade, 'display', left ? '' : 'none');
    S.style(rail, 'left', `${Math.round(Math.max(area.x, fit.x + 12))}px`);
    S.style(rail, 'right', `${Math.round(Math.max(pad, W - (fit.x + fit.w) + 12))}px`);
    S.style(tag, 'left', `${Math.round(Math.max(area.x, fit.x + 12))}px`);
    if (count) S.style(count.wrap, 'right', `${Math.round(Math.max(pad, W - (fit.x + fit.w) + 12))}px`);
    for (const b of boxes) {
      const [x0, y0, x1, y1] = b.rect;
      Object.assign(b.el.style, {
        left: `${fit.x + x0 * fit.w}px`, top: `${fit.y + y0 * fit.h}px`,
        width: `${(x1 - x0) * fit.w}px`, height: `${(y1 - y0) * fit.h}px`,
      });
    }
  }

  // what is on screen: frame index (or still), a still over it at alpha, and the clip time
  let cur = { step: 0, stepP: 0 };
  function state(step, stepP) {
    const st = steps[step] || {};
    let t, still0 = null, a = 0;
    if (st.img) {
      // a still step: hold the still over the first frame of the next footage step
      const nxt = steps.slice(step + 1).find((x) => !x.img);
      t = nxt ? nxt.from : 0;
      still0 = step; a = 1;
    } else {
      const q = clamp((stepP - 0.06) / 0.88, 0, 1);
      t = lerp(st.from, st.to, q);
      const prev = steps[step - 1];
      if (prev?.img && !reduced) { still0 = step - 1; a = 1 - smooth(0.02, 0.4, stepP); }
    }
    return { t, still0, a };
  }

  let drawnKey = '';
  function draw(force) {
    if (!L) layout();
    const { step, stepP } = cur;
    const { t, still0, a } = state(step, stepP);
    const want = seq.at(t);
    seq.want(want);
    const got = seq.nearest(want);
    const im = still0 != null && a > 0.001 ? still(still0) : null;
    const key = `${got ? got.i : -1}|${im ? a.toFixed(3) : 0}|${L.W}x${L.H}|${L.fit.x.toFixed(1)}`;
    if (force || key !== drawnKey) {
      drawnKey = key;
      const { g } = cv;
      const d = cv.dpr;
      g.setTransform(d, 0, 0, d, 0, 0);
      g.clearRect(0, 0, L.W, L.H);
      const f = L.fit;
      if (got) g.drawImage(got.img, f.x, f.y, f.w, f.h);
      if (im) {
        const s = stills[still0].st;
        const sf = fitFocus(L.area, s.w, s.h, s.focus || D.focus || [0, 0, 1, 1]);
        g.globalAlpha = a;
        g.drawImage(im, sf.x, sf.y, sf.w, sf.h);
        g.globalAlpha = 1;
      }
    }
    // overlays
    segs.forEach((sg, i) => {
      S.cls(sg.li, 'on', i === step);
      S.style(sg.fill, 'width', `${i < step ? 100 : i > step ? 0 : Math.round(clamp(stepP, 0, 1) * 100)}%`);
    });
    const onStill = still0 === step;
    S.text(tagT, onStill ? (steps[step].tag || 'Photo') : `${fmtT(t + (D.clipStart || 0))}`);
    for (const b of boxes) S.style(b.el, 'opacity', b.steps && !b.steps.includes(step) ? '0' : '1');
    if (count) {
      const n = onStill ? steps[step].count ?? countAt(t) : countAt(t);
      S.text(count.num, String(n));
      count.icons.forEach((ic, i) => S.cls(ic, 'gone', i >= n));
    }
  }
  seq.onReady = () => draw();

  function setProgress(p, step, stepP) {
    cur = { step: clamp(step | 0, 0, steps.length - 1), stepP: clamp(stepP, 0, 1) };
    draw();
  }
  const ro = new ResizeObserver(() => { layout(); draw(true); });
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
