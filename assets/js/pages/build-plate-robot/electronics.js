// "Electronics", scroll-driven: the two printed bays at the back of the base, from the CAD. I measured
// every board and the power supply and modelled them, then designed the bays around them. Each step
// fades the bays, lights one group of parts and moves to a view of it (framed once, on parts that do
// not move). The camera comes in from the front, over the arm: the 24 V supply runs the full width
// of the back (x -120 to 120 mm, z 395 to 438 mm, 68 mm tall), so from behind it hid the boards. From
// the front the arm's back end (65 mm tall at z 280 mm) clears the boards at elevations above about
// 55°. It replaces the group buttons; nothing is clicked. The stepper driver modules are not in
// the CAD (the perfboard they plug into is), so nothing stands in for them. The boards come from
// electronics.glb, which only this section loads.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRig, clamp, smooth, lerp, glow, blendView, inward } from './rig.js';

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadRig(stage, { electronics: true });
  const { P } = rig;
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'STOCK']) P[n].visible = false;
  stage.fitGround();
  const reduced = !!ctx.reducedMotion;
  const c = (o) => stage.bounds(o, true).center.clone();
  const top = (o) => { const b = stage.bounds(o, true).box; return new T.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2); };

  // azimuth 180 looks from the front of the robot (the printer's side) toward the back
  const S = [
    { parts: [], frame: [P.BAY_L, P.BAY_R, P.PSU, P.BUCK], az: 180, el: 58, pad: 1.3, fade: 1,
      // named by what they hold: seen from the front, the robot's left bay is on the right
      labs: [{ text: 'Uno, drivers and Pi', p: top(P.BAY_L) }, { text: 'Power and magnets', p: top(P.BAY_R), side: 'l' }] },
    { parts: [P.PSU, P.BUCK, P.TERM], frame: [P.PSU, P.BUCK, P.TERM], az: 205, el: 52, pad: 1.35, fade: 0.16,
      labs: [
        { text: '24 V, 250 W supply', p: top(P.PSU) },
        { text: '24 V to 5 V buck, 16 A', p: top(P.BUCK), side: 'l' },
        { text: 'Screw terminal block', p: c(P.TERM), side: 'l' },
      ] },
    // the carriage (its electromagnet mount covers the magnets from above) fades so they show
    { parts: [P.MOS1, P.MOS2, P.MAG], frame: [P.MOS1, P.MOS2, P.MAG, P.ROT], az: 160, el: 48, pad: 1.1, fade: 0.16, ext: 0.22,
      labs: [
        { text: 'MOSFET module', p: top(P.MOS1), side: 'l' },
        { text: 'MOSFET module', p: top(P.MOS2) },
        { text: '4 electromagnets, 5 V', p: c(P.MAG) },
      ] },
    { parts: [P.UNO, P.PERF, P.NEMA23, P.EPUL_L, P.EPUL_R], frame: [P.UNO, P.PERF, P.NEMA23, P.EPUL_L, P.EPUL_R], az: 160, el: 56, pad: 1.3, fade: 0.16,
      labs: [
        { text: 'Arduino Uno', p: top(P.UNO) },
        { text: 'Driver perfboard', p: c(P.PERF) },
        { text: 'NEMA 23, turntable', p: top(P.NEMA23), side: 'l' },
        { text: 'NEMA 17 x 2, extension', p: top(P.EPUL_L) },
      ] },
    { parts: [P.PI], frame: [P.PI, P.UNO], az: 150, el: 60, pad: 1.8, fade: 0.16,
      labs: [{ text: 'Raspberry Pi Zero 2 W', p: top(P.PI) }] },
  ];
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      views = S.map((m) => stage.frame(m.frame, { azimuth: m.az, elevation: m.el, pad: m.pad * (a < 1 ? 1.08 : 1), apply: false, refresh: true }));
    }
    return views;
  }

  const ov = labelLayer(stage);
  for (const m of S) {
    m.glow = m.parts.length ? glow(stage, m.parts, '#ff7a2f', 0.38) : () => {};
    m.els = m.labs.map((l) => ov.label(l.text, l.p.toArray(), { color: '#fff1e2', side: l.side }));
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, S.length - 1);
    stage.setShift(...ctx.shift());
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const v = viewsNow();
    stage.setView(step === prev ? v[step] : blendView(v[prev], v[step], k));
    const f = lerp(S[prev].fade, S[step].fade, k);
    rig.fade(P.BAY_L, f); rig.fade(P.BAY_R, f);
    rig.fade(P.EXT, lerp(S[prev].ext ?? 1, S[step].ext ?? 1, k));
    S.forEach((m, i) => {
      const w = i === step ? k : i === prev && step !== prev ? 1 - k : 0;
      m.glow(w);
      const a = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === prev && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
      for (const l of m.els) l.a = a;
    });
    ov.update();
    inward(el, ov.labels);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
