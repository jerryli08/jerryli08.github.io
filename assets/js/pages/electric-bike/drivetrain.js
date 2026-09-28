// Scroll-driven section views through the drivetrain (section `drivetrain`, five steps):
//   0 the two motors, cut across through the middle of the stator stack
//   1 the first belt: its serpentine path, with the wrap on each motor pulley drawn on
//   2 the jackshaft and output shaft, cut open lengthwise through both axes
//   3 the second belt, from the drive side
//   4 the whole drive in the frame, carbon parts called out, the motors revving up
// The picture is a pure function of the scroll position (step and progress through it). The
// drivetrain turns only while the reader scrolls: the motor angle is a function of scroll, and
// every other part follows by its tooth ratio (bike.js). With reduced motion nothing turns and the
// views cut from one to the next.
import { createStage } from '/assets/js/lib/stage.js';
import { loadBike, AXES, R16, STAGE1, STAGE2 } from './bike.js';
import { overlayLayer } from './overlay.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// colors for the looks (annotation tints, not the parts' real colors)
const ACCENT = '#ff6b35', BLUE = '#3d8bff', STEEL = '#9fb4c8', YELLOW = '#f2c14e', PALE = '#fff1e2';

// Section planes, in model metres (stage.sectionPlane keeps dot(n, p) + c >= 0):
//  motors: square to both motor axes at z = -23 mm, the middle of the 30 mm stator stack (the
//          "Stator Lamination Stack" and "Magnet Array" both span z = -38 to -8 mm); keeps the pulley side
//  shafts: contains the jackshaft axis (-39.8, -24.8) and the output axis (8.3, -94.5); keeps the motor side
const CUT = {
  motors: { n: [0, 0, 1], c: 0.023, open: 0.056 },
  shafts: { n: [0.82344, 0.56744, 0], c: 0.04683, open: 0.115 },
};
const PARK = 5; // a constant that keeps everything

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const { THREE } = stage;
  const bike = await loadBike(stage);
  const G = bike.groups;
  const reduced = ctx.reducedMotion;
  const cutM = stage.sectionPlane(CUT.motors.n, PARK);
  const cutS = stage.sectionPlane(CUT.shafts.n, PARK);

  const ALL = Object.keys(G);
  const set = (list, v) => Object.fromEntries(list.map((k) => [k, v]));
  const motor = ['motorCase', 'stator', 'magnets', 'rotor'];
  const shafts = ['pulley72j', 'pulley72o', 'pulley20', 'pulley16', 'sprocket', 'hub', 'printed', 'bearing6202'];
  // per step: opacity per group (missing = 0; a function of the progress through the step for
  // things that change within it) and tints
  const LOOKS = [
    { o: { stator: 1, magnets: 1, rotor: 1 }, t: { stator: [STEEL, 0.5], magnets: [ACCENT, 0.75] } },
    { o: { ...set(motor, 1), ...set(shafts, 1), motorMount: 1, idlerMount: 1, standoffs: 1, idlerBearings: 1, idlerHardware: 1, belt1: 1, belt2: 1, plateD: 1 },
      t: { belt1: [ACCENT, 0.5], idlerBearings: [BLUE, 0.5], pulley16: [PALE, 0.25], pulley72j: [PALE, 0.12] } },
    { o: { ...set(shafts, 1), belt1: 0.18, belt2: 0.18, plateND: 0.14, plateD: 0.14, retainer: 0.14, motorMount: 0.1 },
      t: { printed: [ACCENT, 0.6], bearing6202: [BLUE, 0.55], hub: [YELLOW, 0.45], pulley72j: [PALE, 0.1], pulley72o: [PALE, 0.1], pulley20: [PALE, 0.2] } },
    // the pulleys go see-through so the belt shows where it wraps them
    { o: { ...set(motor, 0.3), pulley16: 0.3, pulley72j: 0.3, pulley72o: 0.38, pulley20: 0.55, idlerBearings: 1, idlerHardware: 1, belt2: 1, belt1: 0.3, motorMount: 0.3,
      // the chain sprocket comes back in over the second half of the step
      sprocket: (sp) => smooth(0.5, 0.8, sp), hub: (sp) => smooth(0.5, 0.8, sp) },
      t: { belt2: [ACCENT, 0.5], pulley20: [PALE, 0.25], idlerBearings: [BLUE, 0.5] } },
    { o: set(ALL, 1), t: {} },
  ];
  const opacityOf = (i, g, sp = 1) => { const v = LOOKS[i].o[g] ?? 0; return typeof v === 'function' ? v(sp) : v; };
  const tintOf = (i, g) => LOOKS[i].t[g] || null;

  // what each view frames, and the direction it looks from (from the phase A camera presets)
  const pick = (...names) => names.flatMap((n) => G[n] || []);
  const VIEWS = [
    { parts: pick('stator', 'magnets'), dir: [0.3, 0.26, -1], pad: 1.18 },
    { parts: pick('belt1', 'pulley16', 'rotor'), dir: [0.31, 0.15, 0.42], pad: 1.12 },
    { parts: pick('pulley72j', 'pulley72o', 'bearing6202', 'sprocket'), dir: [-0.434, -0.29, 0.25], pad: 1.08 },
    { parts: pick('belt2', 'pulley20', 'pulley72o'), dir: [0.16, 0.1, -1], pad: 1.4 },
    { parts: null, dir: [-0.23, 0.3, -1.3], pad: 1.02 },
  ];

  // --- annotations
  const ov = overlayLayer(stage);
  const P = (x, y, z) => [x, y, z];
  // points on the motor cut face, by radius and angle about each motor's axis
  const onMotor = (ax, r, deg) => P(ax.p[0] + r * Math.cos(deg * Math.PI / 180), ax.p[1] + r * Math.sin(deg * Math.PI / 180), -0.0232);
  const L = [
    // seen from the drive side, model +x is on the left of the screen
    [ov.label('Stator: 12 teeth, fixed', onMotor(AXES.motor2, 0.02, 160), { color: STEEL }),
      ov.label('Rotor: 14 magnets, spins', onMotor(AXES.motor2, 0.0285, 20), { side: 'l' }),
      ov.label('Motor 2', onMotor(AXES.motor2, 0.033, 80), { color: PALE, side: 'l', minW: 520 }),
      ov.label('Motor 1', onMotor(AXES.motor1, 0.033, 280), { color: PALE, side: 'l', minW: 520 })],
    [ov.label('135° of wrap', P(0.0885, -0.0155, 0.052)),
      ov.label('207° of wrap', P(0.0745, 0.0655, 0.052)),
      ov.label('Backside idlers', P(0.0428, 0.0138, 0.061), { color: BLUE, side: 'l' }),
      ov.label('72T pulley', P(-0.0398, 0.035, 0.05), { color: PALE, minW: 520 }),
      ov.label('Belt 1: 115 teeth, HTD 5M', P(0.0315, -0.0527, 0.052), { side: 'l' })],
  ];
  // shafts: labels sit at each part's rim in the cut plane, pushed away from the other shaft
  const u = [0.567, -0.823];
  const onShaft = (ax, r, z, sgn) => P(ax.p[0] + sgn * u[0] * r, ax.p[1] + sgn * u[1] * r, z);
  const J = AXES.jack, O = AXES.output;
  L.push([
    ov.label('72T pulley', onShaft(J, 0.06, 0.0326, -1), { color: PALE, side: 'l' }),
    ov.label('20T pulley', onShaft(J, 0.018, -0.0086, -1), { color: PALE, side: 'l', minW: 520 }),
    ov.label('Printed spacers', onShaft(J, 0.0137, -0.0399, -1), { color: ACCENT, side: 'l', minW: 520 }),
    ov.label('6202 bearing', onShaft(J, 0.0175, 0.0597, 1), { color: BLUE, minW: 520 }),
    ov.label('39.8 mm printed spacer', onShaft(O, 0.0137, 0.0323, 1), { color: ACCENT, minW: 520 }),
    ov.label('Keyed hub + stainless adapter plate', onShaft(O, 0.029, -0.041, -1), { color: YELLOW, side: 'l', minW: 520 }),
    ov.label('20T chain sprocket', onShaft(O, 0.0437, -0.0475, 1), { color: PALE }),
  ]);
  L.push([
    ov.label('Belt 2: 84 teeth, HTD 5M', P(-0.0565, -0.07, -0.026), { side: 'l' }),
    ov.label('20T pulley', P(-0.058, -0.0248, -0.026), { color: PALE, minW: 520 }),
    ov.label('72T pulley', P(0.068, -0.125, -0.026), { color: PALE }),
    ov.label('Idler: 6 × 698 bearings', P(0.018, -0.0202, -0.03), { color: BLUE, side: 'l', minW: 520 }),
  ]);
  L.push([
    ov.label('Carbon fiber', P(-0.16, 0.12, -0.074)),
    ov.label('Carbon fiber bearing plate', P(-0.035, -0.09, -0.068), { side: 'l', minW: 520 }),
    ov.label('3D-printed polycarbonate idler mount', P(0.086, -0.12, -0.079)),
    ov.label('Frame (mockup in the CAD)', P(-0.33, -0.05, -0.024), { color: PALE, side: 'l', minW: 520 }),
  ]);

  // legend for the shaft section and the belt pulls for step 3
  const legend = ov.card();
  legend.append(Object.assign(document.createElement('div'), { textContent: 'Colors in this cut', style: 'font-weight:650;margin-bottom:2px' }));
  legend.append(ov.chip(ACCENT, '3D-printed spacers'), ov.chip(BLUE, '6202 bearings, 14 mm bore'), ov.chip(YELLOW, 'Keyed hub, 1/4 in spacer, stainless adapter plate'), ov.chip('#d9d4ce', 'Belt pulleys and chain sprocket'));
  const pulls = ov.card();
  pulls.innerHTML = '<div style="font-weight:650">Belt pull at 100 N·m on the sprocket</div>';
  const bar = (name, n, frac, color) => {
    const r = document.createElement('div');
    r.style.cssText = 'margin-top:7px';
    r.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px"><span>${name}</span><b style="font-variant-numeric:tabular-nums">${n}</b></div><div style="height:6px;margin-top:3px;border-radius:3px;background:rgba(255,255,255,.1)"><div style="height:100%;width:${frac * 100}%;border-radius:3px;background:${color}"></div></div>`;
    return r;
  };
  // effective tension = torque / pitch radius of the 72T pulley each belt drives (57.3 mm):
  // belt 2 = 100 / 0.0573 = 1,745 N; belt 1 carries the jackshaft torque, 100 / 3.6 = 27.8 N·m, so 485 N
  pulls.append(bar('Belt 1', '485 N', 1 / STAGE2, PALE), bar('Belt 2', '1,745 N', 1, ACCENT));
  const pullNote = document.createElement('div');
  pullNote.style.cssText = 'margin-top:7px;color:#b8b0a7;font-size:var(--rx-ov-small)';
  pullNote.textContent = 'Torque ÷ the 72T pulley\'s pitch radius, no losses.';
  pulls.append(pullNote);

  // the wrap on each motor pulley (tangent-line model with the HTD pitch circles, as in the write-up),
  // drawn as rings just outside the belt on its non-drive face
  const arcs = new THREE.Group();
  const arcMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false });
  const DEG = Math.PI / 180;
  for (const [ax, a0, a1] of [[AXES.motor1, -61.5, 73.6], [AXES.motor2, -59.6, 147.6]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.0165, 0.0185, 48, 1, a0 * DEG, (a1 - a0) * DEG), arcMat);
    ring.position.set(ax.p[0], ax.p[1], 0.0516);
    arcs.add(ring);
  }
  arcs.renderOrder = 3;
  stage.scene.add(arcs);

  // --- the picture as a function of (step, stepP)
  const eA = new THREE.Color(), eB = new THREE.Color();
  const sA = new THREE.Spherical(), sB = new THREE.Spherical();
  function viewOf(i) {
    const v = VIEWS[i];
    return stage.frame(v.parts || undefined, { dir: v.dir, pad: v.pad, apply: false });
  }
  function blendView(a, b, k) {
    sA.setFromVector3(a.pos.clone().sub(a.target));
    sB.setFromVector3(b.pos.clone().sub(b.target));
    let dT = sB.theta - sA.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.target.clone().lerp(b.target, k);
    const s = new THREE.Spherical(lerp(sA.radius, sB.radius, k), lerp(sA.phi, sB.phi, k), sA.theta + dT * k);
    return { pos: new THREE.Vector3().setFromSpherical(s).add(target), target };
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, LOOKS.length - 1);
    stage.setShift(...ctx.shift()); // clear of the step cards on a desktop; none on a phone (text below)
    // blend in from the previous step over the first 40 % of this one (a cut with reduced motion)
    const k = step === 0 || reduced ? 1 : smooth(0, 0.4, stepP);
    const prev = Math.max(0, step - 1);

    for (const g of ALL) {
      const o = lerp(opacityOf(prev, g), opacityOf(step, g, stepP), k);
      const ta = tintOf(prev, g), tb = tintOf(step, g);
      // blend the old tint into the new one
      eA.set(0); eB.set(0);
      if (ta && k < 1) eA.set(ta[0]).multiplyScalar(ta[1]);
      if (tb) eB.set(tb[0]).multiplyScalar(tb[1]);
      bike.look(g, { opacity: o, emissive: eA.lerp(eB, k) });
    }
    // belt markers only while their belt is the subject (and never over a cut)
    const w = (i) => (step === i ? k : step === i + 1 ? 1 - k : 0);
    bike.markers.belt1.setOpacity(Math.max(w(1), step === 4 ? k : 0));
    bike.markers.belt2.setOpacity(Math.max(w(3), step === 4 ? k : 0, step === 1 ? k * 0.6 : 0));
    arcMat.opacity = w(1); arcs.visible = arcMat.opacity > 0.01;

    // section planes: the motor cut sweeps in over the first third of step 0 and out as step 1 begins;
    // the shaft cut sweeps in during step 2 and out as step 3 begins
    const mIn = reduced ? 1 : smooth(0.05, 0.4, stepP);
    const m = step === 0 ? mIn : step === 1 ? 1 - k : 0;
    cutM.set(m > 0.001 ? lerp(CUT.motors.open, CUT.motors.c, m) : PARK);
    const s = step === 2 ? (reduced ? 1 : smooth(0.1, 0.55, stepP)) : step === 3 ? 1 - k : 0;
    cutS.set(s > 0.001 ? lerp(CUT.shafts.open, CUT.shafts.c, s) : PARK);

    // camera
    const vb = viewOf(step);
    const view = k < 1 ? blendView(viewOf(prev), vb, k) : vb;
    stage.setView(view);

    // the drivetrain turns with the scroll: 1.2 motor turns per step, then it revs up in the last one
    const turns = reduced ? 0 : 1.2 * (step + stepP) + (step === 4 ? 9 * stepP * stepP : 0);
    bike.set(turns * 2 * Math.PI);

    // annotations
    // labels on a cut face wait for the cut
    // labels hand over rather than cross-fade: the old set is gone before the new one appears
    const la = (i) => (step === i ? (i === 0 ? 1 : smooth(0.5, 1, k)) : step === i + 1 ? 1 - smooth(0, 0.5, k) : 0);
    L.forEach((ls, i) => { const a = i === 0 ? Math.min(la(0), m) : i === 2 ? Math.min(la(2), s) : la(i); for (const l of ls) l.a = a; });
    legend.style.opacity = String(Math.min(w(2), s));
    pulls.style.opacity = String(w(3));
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); stage.dispose(); },
  };
}
