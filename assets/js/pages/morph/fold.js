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

export async function mount(el) {
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
    position: 'absolute', right: '16px', top: '16px', zIndex: 4, margin: 0, padding: '10px', borderRadius: '14px',
    background: 'rgba(10, 8, 7, 0.74)', border: '1px solid rgba(255, 255, 255, 0.12)', opacity: 0, transition: 'opacity 0.3s',
    pointerEvents: 'none', display: 'grid', gap: '6px', justifyItems: 'center',
  });
  mask.innerHTML = `${silhouetteSvg(heart.sil, { size: 120, label: 'The heart\'s target drawing' })}<figcaption style="font-size:12px;color:var(--muted)">The target drawing</figcaption>`;
  el.append(mask);

  // move index (0..n, fractional mid-move) for each step
  const at = (step, sp) => { const [a, b] = spans[clamp(step, 0, 4)]; return a + (b - a) * smooth(0.1, 0.9, sp); };
  const flat = flatAxis(snaps[n]);
  let last = -1;
  function setProgress(p, step = 0, sp = 0) {
    const portrait = el.clientHeight > el.clientWidth;
    stage.setShift(portrait ? 0 : 0.16, portrait ? 0.2 : 0);
    const t = at(step, sp);
    const i = Math.min(n, Math.floor(t)), f = t - i;
    if (t !== last) {
      last = t;
      const M = i >= n || f < 1e-4 ? view.matrices(snaps[i]) : view.matrices(snaps[i], moves[i], f * f * (3 - 2 * f));
      view.write(M);
      outline(wireEnd, 0, M);
      active.visible = i < n && f >= 1e-4;
      if (active.visible) outline(active, moves[i].j, M);
    }
    // camera: each step frames the poses it passes through, easing over from the previous step;
    // the last step comes round to face the finished drawing, from the side where it reads like its
    // silhouette.txt (from the other side it is mirrored)
    const s0 = clamp(step, 0, 4);
    const pads = portrait ? [1.08, 1.08, 1.08, 1.08] : [1.5, 1.5, 1.2, 1.1];
    const camFor = (k) => (k === 4
      ? stage.frame(boxes[4], { ...(flat === 2 ? { azimuth: 0, elevation: 88 } : flat === 1 ? { azimuth: 180, elevation: 8 } : { azimuth: 270, elevation: 8 }), pad: portrait ? 1.7 : 1.35, apply: false, refresh: true })
      : stage.frame(boxes[k], { azimuth: 20 + 12 * k, elevation: 30, pad: pads[k], apply: false, refresh: true }));
    const cur = camFor(s0);
    const k = s0 > 0 ? smooth(0, 0.25, sp) : 1;
    const prev = k < 1 ? camFor(s0 - 1) : cur;
    stage.setView({ pos: prev.pos.clone().lerp(cur.pos, k), target: prev.target.clone().lerp(cur.target, k) });
    mask.style.opacity = step >= 4 && sp > 0.35 ? '1' : '0';
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { mask.remove(); stage.dispose(); } };
}
