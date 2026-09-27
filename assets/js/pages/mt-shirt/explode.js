// Hero scrolly (`hero-explode`): the page opens on the machine closed up as one box, and scrolling
// lifts it apart, layer by layer and top down like a step in an assembly manual, into the exact pose
// that is printed on the shirt: Jerry's CAD as exported, seen from azimuth 35, elevation 30.
//
// Every group moves only along STEP Z, the axis his explode uses (rig.js has the offsets and why).
// The picture is a pure function of the scroll: P = (step + stepP) / 4 over the four steps. With
// reduced motion each step shows its end state and the camera cuts, with no drift.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { GROUPS, loadMechanism, smooth, lerp, sph, place } from './rig.js';

const STEPS = 4;

export async function mount(el, ctx) {
  // the page opens on this block: let the page itself load first (the poster shows meanwhile)
  await new Promise((res) => (document.readyState === 'complete' ? res() : addEventListener('load', res, { once: true })));
  await new Promise((res) => (window.requestIdleCallback ? requestIdleCallback(res, { timeout: 1200 }) : setTimeout(res, 200)));
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const mech = await loadMechanism(stage);
  const { model, parts, base } = mech;
  const reduced = ctx.reducedMotion;
  const up = new THREE.Vector3(0, 1, 0); // STEP +Z in the model's frame

  // the guide lines fade: give them their own material (the CAD shares theirs with the screws)
  const guideMats = [];
  for (const o of parts.guides) o.traverse((m) => {
    if (!m.isMesh) return;
    m.material = stage.cloneMaterial(m.material);
    m.material.transparent = true;
    guideMats.push(m.material);
  });

  const shown = new Map(); // group key -> last opening applied
  function pose(P) {
    let moved = false;
    for (const g of GROUPS) {
      const e = smooth(g.win[0], g.win[1], P);
      if (shown.get(g.key) === e) continue;
      shown.set(g.key, e);
      moved = true;
      if (g.fade) {
        for (const m of guideMats) { m.opacity = e; m.depthWrite = e > 0.98; }
        for (const o of parts[g.key]) o.visible = e > 0.01;
        continue;
      }
      const off = (g.dz / 1000) * (1 - e);
      for (const o of parts[g.key]) o.position.copy(base.get(o)).addScaledVector(up, off);
    }
    if (moved) stage.invalidate();
  }

  // two views, framed once at rest and cached: the closed box and the shirt pose (framed on the
  // parts, not the guide lines, which stand far above the closed box while they are hidden)
  const solid = model.children.filter((o) => !parts.guides.includes(o));
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    shown.clear();
    pose(0);
    const closed = sph(THREE, stage.frame(solid, { azimuth: 35, elevation: 28, pad: 1.22, apply: false, refresh: true }));
    shown.clear();
    pose(1);
    const open = sph(THREE, stage.frame(solid, { azimuth: 35, elevation: 30, pad: 1.1, apply: false, refresh: true }));
    shown.clear();
    return (views = { closed, open });
  }

  // step 4: the print itself, small in a corner, so the match can be checked by eye
  const ov = labelLayer(stage);
  const card = ov.card({ corner: 'br' });
  const img = new Image();
  img.src = ctx.asset('/assets/media/mt-shirt/shirt-print-s.webp');
  img.alt = 'The print on the shirt';
  img.decoding = 'async';
  Object.assign(img.style, { display: 'block', width: 'clamp(110px, 11vw, 170px)', height: 'auto', borderRadius: '8px' });
  const cap = document.createElement('div');
  cap.textContent = 'The print on the shirt';
  Object.assign(cap.style, { marginTop: '7px', color: '#eee9e3', fontWeight: '600' });
  card.append(img, cap);
  let cardA = -1;

  function setProgress(p, step, stepP) {
    step = Math.max(0, Math.min(STEPS - 1, step | 0));
    const P = reduced ? (step === 0 ? 0 : (step + 1) / STEPS) : (step + stepP) / STEPS;
    stage.setShift(...ctx.shift());
    const v = viewsNow();
    pose(P);
    const k = reduced ? (step >= 2 ? 1 : step * 0.5) : smooth(0.25, 0.75, P);
    // a slow turn of a few degrees while the box opens, gone by the time it reaches the shirt's angle
    const drift = reduced ? 0 : -5 * (1 - smooth(0, 0.8, P));
    place(stage, v.closed, v.open, k, drift, 0);
    // (not on narrow stages, where it would sit on the model)
    const a = step === STEPS - 1 && el.clientWidth >= 700 ? (reduced ? 1 : smooth(0.05, 0.4, stepP)) : 0;
    if (a !== cardA) { card.style.opacity = String(a); cardA = a; }
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
