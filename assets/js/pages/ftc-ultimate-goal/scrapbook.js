// The build as a scrapbook: one real photo per scroll step, in the order the photos were taken,
// dropped onto a pile like prints on a table. The earlier prints stay underneath, slid aside and a
// little darker. A marker stamp on each print says which day of the album it is (days counted from
// the first photo), and a marker doodle draws itself over the thing to look at. There is no CAD of
// this robot and nothing here is modelled: every picture is one of our photos, cropped to hands and
// hardware. Nothing plays and there is nothing to click: every style is a pure function of
// (step, stepP), so scrolling back lifts the prints off the pile again.
import { css, h, svg, clamp, lerp, smooth, easeOut, setter, freeLeft, mediaUrl, markerFont, doodle } from './kit.js';

const LOCAL = `
.ug-pile { position: absolute; }
.ug-print { position: absolute; left: 0; top: 0; margin: 0; padding: 10px 10px 40px; border-radius: 4px; background: #efe9e1;
  box-shadow: 0 30px 50px -26px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.35); transform-origin: 50% 50%; will-change: transform, opacity; }
.ug-print-img { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 2px; background: #d9d1c7; }
.ug-print-img img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
.ug-shade { position: absolute; inset: 0; border-radius: 4px; background: #0b0a09; opacity: 0; pointer-events: none; }
.ug-stamp { position: absolute; left: 14px; bottom: 7px; color: #d4471b; font-size: 21px; line-height: 1; transform: rotate(-2deg); }
.ug-tape { position: absolute; top: -13px; left: 50%; width: 92px; height: 28px; margin-left: -46px; background: rgba(236, 226, 196, 0.62);
  box-shadow: 0 1px 2px rgba(0,0,0,0.18); transform: rotate(-4deg); border-left: 1px dashed rgba(0,0,0,0.06); border-right: 1px dashed rgba(0,0,0,0.06); }
.ug-print .ug-note { font-size: clamp(16px, 1.6vw, 24px); }
@media (max-width: 900px) {
  .ug-print { padding: 6px 6px 26px; }
  .ug-stamp { font-size: 15px; left: 9px; bottom: 5px; }
  .ug-tape { width: 62px; height: 20px; margin-left: -31px; top: -9px; }
  .ug-print .ug-note { font-size: 14px; }
}
`;

export function mount(el, ctx) {
  css('ug-scrap-css', LOCAL);
  markerFont();
  const D = ctx.data;
  const groups = D.prints || []; // one entry per step: an array of one or two prints
  const reduced = ctx.reducedMotion;
  const root = h('div', 'ug ug-scrap');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', D.aria || 'Photos of the build, one per step');
  const pile = h('div', 'ug-pile');
  root.appendChild(pile);
  el.appendChild(root);
  const set = setter();
  const big = () => el.clientWidth >= 1100;

  // build every print once; images load a step or two ahead of the reader
  const G = groups.map((list, gi) => list.map((p, j) => {
    const fig = h('figure', 'ug-print');
    const box = h('div', 'ug-print-img');
    const img = h('img');
    img.alt = p.alt || p.c || '';
    img.decoding = 'async';
    box.appendChild(img);
    const paths = [];
    let dsvg = null;
    if (p.doodles?.length) {
      dsvg = svg(box, 'svg', { class: 'ug-doodle', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
      for (let k = 0; k < p.doodles.length; k++) paths.push(svg(dsvg, 'path', { pathLength: '1', 'stroke-dasharray': '1 1', 'stroke-dashoffset': '1' }));
    }
    const notes = (p.notes || []).map((n) => {
      const e = h('span', 'ug-note ug-marker', n.text);
      e.style.left = `${n.x}%`; e.style.top = `${n.y}%`; e.style.opacity = '0';
      if (n.rot) e.style.transform = `translate(-50%, -50%) rotate(${n.rot}deg)`;
      box.appendChild(e);
      return e;
    });
    const stamp = h('span', 'ug-stamp ug-marker', p.stamp || '');
    const tape = h('i', 'ug-tape');
    if (p.tapeAt != null) tape.style.left = `${p.tapeAt}%`;
    const shade = h('i', 'ug-shade');
    fig.append(box, stamp, tape, shade);
    fig.style.opacity = '0';
    pile.appendChild(fig);
    img.addEventListener('load', () => {
      if (img.naturalWidth && img.naturalHeight) {
        const ar = img.naturalWidth / img.naturalHeight;
        if (Math.abs(ar - (p.ar || 0)) > 0.01) { p.ar = ar; layout(); }
      }
    });
    return { p, gi, j, fig, img, dsvg, paths, notes, stamp, shade, w: 0, h: 0, x: 0, y: 0 };
  }));

  function ensure(upto) {
    for (let g = 0; g <= Math.min(G.length - 1, upto); g++) for (const it of G[g]) {
      const want = mediaUrl(ctx, it.p.i, !big());
      if (it.img.getAttribute('src') !== want) it.img.src = want;
    }
  }

  let A = { x: 0, y: 0, w: 1, h: 1, W: 1, H: 1 };
  // rest size and place of each print in the free part of the stage
  function layout() {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const left = freeLeft(el, ctx);
    const phone = W < 700;
    const pad = phone ? 14 : 34;
    A = { x: left + pad, y: pad + (phone ? 6 : 16), w: W - left - pad * 2, h: H - pad * 2 - (phone ? 6 : 16), W, H };
    const bw = phone ? 12 : 20, bh = phone ? 32 : 50; // print border: sides, top+bottom
    for (const list of G) {
      const pair = list.length > 1;
      for (const it of list) {
        const ar = it.p.ar || 1.33;
        const maxH = A.h * (pair ? 0.66 : 0.78) - bh;
        const maxW = A.w * (pair ? 0.47 : 0.84) - bw;
        let ih = maxH, iw = ih * ar;
        if (iw > maxW) { iw = maxW; ih = iw / ar; }
        it.w = iw + bw; it.h = ih + bh;
        const cx = A.x + A.w / 2 + (pair ? (it.j === 0 ? -1 : 1) * A.w * 0.245 : 0) + (it.p.dx || 0) * A.w;
        const cy = A.y + A.h / 2 + (pair ? (it.j === 0 ? -0.04 : 0.05) * A.h : 0) + (it.p.dy || 0) * A.h;
        it.x = cx; it.y = cy;
        if (it.dsvg) {
          it.dsvg.setAttribute('viewBox', `0 0 ${Math.round(1000 * ar)} 1000`);
          it.p.doodles.forEach((d, k) => it.paths[k].setAttribute('d', doodle(d, ar)));
        }
        it.fig.style.width = `${Math.round(it.w)}px`;
        it.fig.style.height = `${Math.round(it.h)}px`;
      }
    }
    apply(true);
  }

  let cur = { step: 0, stepP: 0 };
  function apply() {
    const s = clamp(cur.step | 0, 0, G.length - 1);
    const q = reduced ? 1 : clamp(cur.stepP, 0, 1);
    ensure(s + 2);
    const slide = (A.W < 700 ? 0.05 : 0.07) * A.w;
    G.forEach((list, g) => list.forEach((it) => {
      const f = it.fig;
      if (g > s) { set.style(f, 'opacity', '0'); set.style(f, 'visibility', 'hidden'); return; }
      const tilt = it.p.tilt || 0;
      let tx = 0, ty = 0, sc = 1, op = 1, rot = tilt, shade = 0, draw = 1, stampA = 1;
      if (g === s) {
        // the new print lands: from above, bigger and see-through, to rest by 45 % of the step
        const k = reduced ? 1 : easeOut(0.02 + it.j * 0.08, 0.45 + it.j * 0.08, q);
        ty = -(1 - k) * A.H * 0.4;
        sc = lerp(1.1, 1, k);
        op = smooth(0, 0.6, k);
        rot = lerp(0, tilt, k);
        stampA = reduced ? 1 : smooth(0.3, 0.45, q);
        draw = reduced ? 1 : smooth(0.45, 0.8, q);
      } else {
        // older prints: slid left and darker, one notch per step they have been under the pile
        const k = reduced ? 1 : smooth(0, 0.45, q);
        const age = s - g - 1 + k;
        tx = -slide * Math.min(age, 2.5);
        shade = 0.42 * Math.min(age, 1) + 0.12 * clamp(age - 1, 0, 2);
        op = age > 3 ? clamp(1 - (age - 3), 0, 1) : 1;
      }
      set.style(f, 'visibility', op > 0.001 ? 'visible' : 'hidden');
      set.style(f, 'opacity', op.toFixed(3));
      set.style(f, 'zIndex', String(10 + g * 2 + it.j));
      set.style(f, 'transform', `translate(${(it.x - it.w / 2 + tx).toFixed(1)}px, ${(it.y - it.h / 2 + ty).toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc.toFixed(4)})`);
      set.style(it.shade, 'opacity', shade.toFixed(3));
      set.style(it.stamp, 'opacity', stampA.toFixed(3));
      for (const pth of it.paths) set.attr(pth, 'stroke-dashoffset', (1 - draw).toFixed(4));
      const na = g === s ? (reduced ? 1 : smooth(0.6, 0.85, q)) : 1;
      for (const n of it.notes) set.style(n, 'opacity', na.toFixed(3));
    }));
  }
  function setProgress(p, step, stepP) {
    cur = { step, stepP };
    apply();
  }

  const ro = new ResizeObserver(layout);
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
