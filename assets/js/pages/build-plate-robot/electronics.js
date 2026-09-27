// Demo: the electronics at the back of the base, from the CAD. I measured every board and the
// power supply and modelled them, then designed the printed bays around them. Picking a group
// fades the bays, lights the parts and flies the camera to them. The stepper driver modules are
// not in the CAD (the perfboard they plug into is), so nothing stands in for them.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented } from '/assets/js/lib/ui.js';
import { loadRig, labels } from './rig.js';

export async function mount(el, ctx) {
  const stage = createStage(el);
  const rig = await loadRig(stage);
  const { P } = rig;
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'STOCK']) P[n].visible = false;
  const c = (o) => stage.bounds(o, true).center.clone();
  const top = (o) => { const b = stage.bounds(o, true).box; return new stage.THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2); };

  const MODES = {
    all: { label: 'Overview', parts: [], frame: [P.BAY_L, P.BAY_R, P.PSU, P.BUCK], az: 20, el: 38, pad: 1.1, fade: 1, labs: [] },
    power: { label: 'Power', parts: [P.PSU, P.BUCK, P.TERM], frame: [P.PSU, P.BUCK, P.TERM], az: 28, el: 42, pad: 1.15, fade: 0.16,
      labs: [
        { text: '24 V, 250 W supply', p: top(P.PSU), side: 'l' },
        { text: '24 V to 5 V buck, 16 A', p: top(P.BUCK), side: 'r' },
        { text: 'Screw terminal block', p: c(P.TERM), side: 'r' },
      ] },
    magnets: { label: 'Magnets', parts: [P.MOS1, P.MOS2, P.MAG], frame: [P.MOS1, P.MOS2, P.MAG, P.ROT], az: 38, el: 34, pad: 1.0, fade: 0.16,
      labs: [
        { text: 'MOSFET module', p: top(P.MOS1), side: 'r' },
        { text: 'MOSFET module', p: top(P.MOS2), side: 'l' },
        { text: '4 electromagnets, 5 V', p: c(P.MAG), side: 'r' },
      ] },
    motion: { label: 'Motion', parts: [P.UNO, P.PERF, P.NEMA23, P.EPUL_L, P.EPUL_R], frame: [P.UNO, P.PERF, P.NEMA23, P.EPUL_L, P.EPUL_R], az: -28, el: 36, pad: 1.1, fade: 0.16,
      labs: [
        { text: 'Arduino Uno', p: top(P.UNO), side: 'r' },
        { text: 'Driver perfboard', p: c(P.PERF), side: 'l' },
        { text: 'NEMA 23, turntable', p: top(P.NEMA23), side: 'r' },
        { text: 'NEMA 17 x 2, extension', p: top(P.EPUL_L), side: 'l' },
      ] },
    pi: { label: 'Raspberry Pi', parts: [P.PI], frame: [P.PI, P.UNO], az: -35, el: 48, pad: 1.4, fade: 0.16,
      labs: [{ text: 'Raspberry Pi Zero 2 W', p: top(P.PI), side: 'l' }] },
  };
  const views = {};
  for (const [k, m] of Object.entries(MODES)) views[k] = stage.frame(m.frame, { azimuth: m.az, elevation: m.el, pad: m.pad, apply: false, refresh: true });
  stage.setView(views.all);

  const labs = labels(el);
  let unlight = null, follow = null;
  function show(k, first = false) {
    const m = MODES[k];
    unlight?.(); unlight = null;
    rig.fade(P.BAY_L, m.fade); rig.fade(P.BAY_R, m.fade);
    if (m.parts.length) unlight = stage.highlight(m.parts, '#ff7a2f', { intensity: 0.5 });
    labs.set(m.labs);
    follow?.(); follow = null;
    if (first || ctx.reducedMotion) { stage.setView(views[k]); labs.update(stage.camera); return; }
    const done = stage.tweenCamera(views[k], 0.9);
    follow = stage.onFrame(() => labs.update(stage.camera));
    done.then(() => { labs.update(stage.camera); follow?.(); follow = null; });
  }
  segmented(ctx.panel, {
    label: 'Show', value: 'all',
    options: Object.entries(MODES).map(([value, m]) => ({ value, label: m.label })),
    onChange: (k) => show(k),
  });
  stage.controls?.addEventListener('change', () => labs.update(stage.camera));
  const ro = new ResizeObserver(() => labs.update(stage.camera)); ro.observe(el);
  show('all', true);
  return { dispose() { follow?.(); ro.disconnect(); stage.dispose(); } };
}
