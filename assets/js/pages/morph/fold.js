// Scrolly: the heart from the team's public library, move by move, as a pure function of the scroll
// position. Steps (matching the page): 0 straight chain, 1 move 1 (out), 2 moves 2 to 6 (in),
// 3 moves 7 to 11 (out), 4 the finished heart next to its target drawing.
import { createStage } from '/assets/js/lib/stage.js';
import lib from './library.js';
import { movesOf, snapshots, flatAxis } from './kin.js';
import { createChain, cubeOutline } from './chain3d.js';
import { silhouetteSvg } from './minimap.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const THREE = stage.THREE;
  const view = await createChain(stage);
  const heart = lib.shapes.find((s) => s.id === 'heart');
  const moves = movesOf(heart);
  const snaps = snapshots(heart);
  const n = moves.length;
  // one camera frame per step, around the poses that step passes through
  const spans = [[0, 0], [0, 1], [1, 6], [6, n], [n, n]];
  const boxes = spans.map(([a, b]) => {
    const bx = view.boundsOf(...snaps.slice(a, b + 1)).clone();
    bx.visible = false; stage.scene.add(bx); bx.updateMatrixWorld(true);
    return bx;
  });
  const wireEnd = cubeOutline(THREE, '#9fd3ff', 0.8);
  const active = cubeOutline(THREE, '#ff6b35', 1);
  stage.scene.add(wireEnd, active);
  wireEnd.visible = true;
  const outline = (o, k, M) => { o.matrixAutoUpdate = false; o.matrix.copy(M.F[k]); o.matrixWorldNeedsUpdate = true; };

  // the target drawing, shown over the stage on the last step
  const mask = document.createElement('figure');
  Object.assign(mask.style, {
    position: 'absolute', right: el.clientWidth < 640 ? '8px' : '16px', top: el.clientWidth < 640 ? '8px' : '16px', zIndex: 4, margin: 0, padding: el.clientWidth < 640 ? '6px' : '10px', borderRadius: '14px',
    background: 'rgba(10, 8, 7, 0.74)', border: '1px solid rgba(255, 255, 255, 0.12)', opacity: 0,
    pointerEvents: 'none', display: 'grid', gap: '6px', justifyItems: 'center',
  });
  mask.innerHTML = `${silhouetteSvg(heart.sil, { size: el.clientWidth < 640 ? 112 : 210, label: 'The heart\'s target drawing' })}<figcaption style="font-size:var(--rx-ov-small);color:var(--muted)">The target drawing</figcaption>`;
  el.append(mask);

  // move index (0..n, fractional mid-move) for each step
  const at = (step, sp) => { const [a, b] = spans[clamp(step, 0, 4)]; return a + (b - a) * smooth(0.1, 0.9, sp); };
  const flat = flatAxis(snaps[n]);
  // camera: one view per step around the poses that step passes through, and for the last step a view
  // that faces the finished drawing from the side where it reads like its silhouette.txt (from the
  // other side it is mirrored). Framed once at rest, cached per stage shape, then blended.
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || Math.abs(a - aspect) > 1e-3) {
      aspect = a;
      const portrait = a < 1;
      const pads = portrait ? [1.08, 1.08, 1.08, 1.08] : [1.5, 1.5, 1.2, 1.1];
      views = boxes.map((b, k) => (k === 4
        ? stage.frame(b, { ...(flat === 2 ? { azimuth: 0, elevation: 88 } : flat === 1 ? { azimuth: 180, elevation: 8 } : { azimuth: 270, elevation: 8 }), pad: portrait ? 1.7 : 1.35, apply: false })
        : stage.frame(b, { azimuth: 20 + 12 * k, elevation: 30, pad: pads[k], apply: false })));
    }
    return views;
  }
  const reduced = ctx.reducedMotion;
  let last = -1, maskA = '';
  function setProgress(p, step = 0, sp = 0) {
    const [fx, fy] = ctx.shift();
    stage.setShift(fx, fy + (el.clientWidth < 640 ? -0.07 : 0)); // on a phone, down from the target drawing
    let t = at(step, sp);
    if (reduced) t = Math.round(t);
    const i = Math.min(n, Math.floor(t)), f = t - i;
    if (t !== last) {
      last = t;
      const M = i >= n || f < 1e-4 ? view.matrices(snaps[i]) : view.matrices(snaps[i], moves[i], f * f * (3 - 2 * f));
      view.write(M);
      outline(wireEnd, 0, M);
      active.visible = i < n && f >= 1e-4;
      if (active.visible) outline(active, moves[i].j, M);
    }
    // each step eases over from the previous step's view
    const s0 = clamp(step, 0, 4);
    const V = viewsNow();
    const k = s0 > 0 && !reduced ? smooth(0, 0.25, sp) : 1;
    const prev = V[Math.max(0, s0 - 1)], cur = V[s0];
    stage.setView({ pos: prev.pos.clone().lerp(cur.pos, k), target: prev.target.clone().lerp(cur.target, k) });
    const a = step >= 4 ? (reduced ? '1' : smooth(0.3, 0.5, sp).toFixed(3)) : '0';
    if (a !== maskA) { mask.style.opacity = a; maskA = a; }
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { mask.remove(); stage.dispose(); } };
}
