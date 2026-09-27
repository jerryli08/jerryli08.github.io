// Demo: the turntable. The arm turns about the real axis (vertical through x 0, z 79.5 mm), the
// NEMA 23's 80-tooth pulley turns 288/80 = 3.6 times as far, and the bearing stack can be pulled
// apart along the axis or cut through one of its eight posts (the post at x +100 mm, z 79.5 mm)
// by a plane through the axis, so the post's bearings show in section.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, segmented } from '/assets/js/lib/ui.js';
import { loadRig, RATIO, smooth, labels } from './rig.js';

export async function mount(el, ctx) {
  const stage = createStage(el);
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const { P } = rig;
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'STOCK']) P[n].visible = false;

  const robot = [P.ROT, P.BASE, P.RING, P.BELT];
  const views = {
    whole: stage.frame(robot, { azimuth: 40, elevation: -18, pad: 0.95, apply: false, refresh: true }),
    explode: null,
    // cut: looking along +Z at the section plane, close on the post (+X is on the left from here)
    cut: { pos: new T.Vector3(0.135, -0.012, -0.065), target: new T.Vector3(0.1, -0.034, 0.0795) },
  };
  // pulled apart: close on the post at x +100 mm so the layers read
  views.explode = { pos: new T.Vector3(0.43, 0.11, 0.46), target: new T.Vector3(0.05, -0.03, 0.0795) };
  stage.setView(views.whole);

  // keeps z >= 79.5 mm: the plane through the turntable axis and the post at x +100 mm
  const cut = stage.sectionPlane([0, 0, 1], -0.0795);
  cut.enable(false);

  const labs = labels(el);
  // label points on the post at x 100 mm (CAD heights); all but the middle plate turn with the arm
  const LAB = [
    { text: 'Bottom plate (turns)', x: 0.088, y: -0.0235, dy: 0.09, side: 'l' },
    { text: 'Upper thrust bearing', x: 0.1, y: -0.027, dy: 0.045, side: 'r' },
    { text: 'Fixed middle plate', x: 0.118, y: -0.0295, dy: 0, side: 'l', fixed: true },
    { text: 'MR106 on the hole edge', x: 0.1, y: -0.0305, dy: 0, side: 'r' },
    { text: 'Lower thrust bearing', x: 0.1, y: -0.0335, dy: -0.045, side: 'r' },
    { text: 'Printed pulley disc (turns)', x: 0.088, y: -0.043, dy: -0.09, side: 'l' },
  ];
  let mode = 'whole', explode = 0, theta = 0;
  const placeLabels = () => {
    if (mode === 'whole') { labs.set([]); return; }
    const a = (theta * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    labs.set(LAB.map((l) => {
      const dz = 0; // every label point lies on the plane z = 79.5 mm
      const x = l.fixed ? l.x : l.x * c + dz * s, z = l.fixed ? 0.0795 : 0.0795 - l.x * s + dz * c;
      return { text: l.text, side: l.side, p: new T.Vector3(x, l.y + l.dy * explode, z) };
    }));
    labs.update(stage.camera);
  };

  const info = readout(null, { rows: [
    { key: 'a', label: 'Turntable', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'm', label: 'NEMA 23 pulley', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'r', label: 'Reduction (CAD)', format: () => '288 : 80 = 3.6 : 1' },
  ] });
  const setAngle = (deg) => { theta = deg; rig.set({ theta: deg }); info.set({ a: deg, m: RATIO * deg, r: 0 }); placeLabels(); };
  const ang = slider(ctx.panel, { label: 'Turn', min: -90, max: 90, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0), onInput: setAngle });

  let stop = null, phase = 0;
  playToggle(ctx.panel, {
    playing: false,
    onChange(on) {
      stop?.(); stop = null;
      if (!on) return;
      // 0 -> +90 -> -90 -> 0, the three stations, with short holds
      stop = stage.onFrame((dt) => {
        phase = (phase + dt / 8) % 1;
        const k = phase * 8;
        const deg = 90 * (smooth(0, 1.5, k) - 2 * smooth(2.5, 4.5, k) + smooth(5.5, 7, k));
        ang.set(Math.round(deg));
      });
    },
  });

  let anim = null;
  segmented(ctx.panel, {
    label: 'View', value: 'whole',
    options: [{ value: 'whole', label: 'Assembled' }, { value: 'explode', label: 'Pull the stack apart' }, { value: 'cut', label: 'Cut one post' }],
    onChange(v) {
      mode = v;
      cut.enable(v === 'cut');
      const to = v === 'explode' ? 1 : v === 'cut' ? 0.25 : 0, from = explode; // the cut is pulled apart a little so its labels read
      anim?.(); anim = null;
      const dur = ctx.reducedMotion ? 0 : 0.9;
      stage.tweenCamera(views[v], dur);
      let t = 0;
      anim = stage.onFrame((dt) => {
        t = dur ? Math.min(1, t + dt / dur) : 1;
        explode = from + (to - from) * smooth(0, 1, t);
        rig.set({ explode });
        placeLabels();
        if (t >= 1) { anim?.(); anim = null; }
      });
    },
  });
  ctx.panel.append(info.el);
  stage.controls?.addEventListener('change', () => labs.update(stage.camera));
  setAngle(0);
  placeLabels();
  return { dispose() { stop?.(); anim?.(); stage.dispose(); } };
}
