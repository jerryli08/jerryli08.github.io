// Scrolly through the final CAD (version two), one step per mechanism in Jerry's checklist:
//   0 the geared drivetrain: 8T pinion on the motor, 48T gear on the rear axle (6 : 1)
//   1 the geared encoder: the same pinion drives a 40T gear whose shaft carries the MT6701's magnet
//   2 the two GT2 belts to the front axle (1 : 1), so all four wheels drive
//   3 the two buttons on the top plate: left toggles the laser pointer, right starts the run
//   4 the whole car
// Nothing is cut (Jerry, Sept 27: a section view makes the gears look weird). To see the gears, the
// top plate (with the laser clamp and the buttons that sit in it), the printed end panels, the motor
// mount and the encoder fade out for the steps that need them gone and fade back in afterwards.
// The picture is a pure function of the scroll (step, progress through it). The drivetrain turns
// only while the reader scrolls, every part at its tooth ratio (rig.js), and the readout counts the
// turns. Each view is framed ONCE with the drivetrain at rest and cached (per stage shape); scrolling
// only blends between those fixed views. Framing the spinning gears on every scroll frame made the
// camera shake, because a turning gear's bounding box changes size as it turns. With reduced motion
// nothing turns and the views cut from one step to the next.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { M, AXES, WHEEL_R, PITCH_R, BELT_X, partsOf, rigDrive, beltMarkers, blendViews, hud, clamp, smooth } from './rig.js';

const ORANGE = '#ff6b35', PURPLE = '#a78bfa', BLUE = '#3d8bff', INK = '#fff1e2';
const TURN = 2 * Math.PI;
const CIRC = 2 * Math.PI * WHEEL_R; // m of travel per wheel turn (229.4 mm)
// what the readout says in each step
const HUD = [
  { t: '8T pinion to 48T axle gear', r: '6 : 1' },
  { t: '8T pinion to 40T encoder gear', r: '1.2 : 1' },
  { t: '47T to 47T, both sides', r: '1 : 1' },
  { t: 'Left: laser pointer on and off. Right: run. The plate is lettered LASER and RUN in the CAD.', r: '' },
  { t: 'Wheelbase 523 mm, track 320 mm (CAD)', r: '' },
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const model = await stage.load(`${M}/final.glb`);
  const parts = partsOf(stage, model);
  const car = [...model.children]; // the CAD only: framing ignores the markers and the beam added below
  const drive = rigDrive(stage, parts);
  const reduced = ctx.reducedMotion;
  const blend = blendViews(stage);

  const markers = beltMarkers(stage, model);

  // parts that fade out of the way (no section cuts). Each faded mesh gets its own copy of its
  // materials, so parts that shared them (the bottom plate) are untouched. The opacity is written to
  // whatever material the mesh has at the time, so a highlight's copies fade too.
  const topPlate = parts.plates.filter((o) => stage.bounds(o).center.y > 0.07); // G10 plate 2, y 83 to 85 mm
  function fader(list) {
    const meshes = [];
    for (const o of list) o.traverse((m) => {
      if (!m.isMesh) return;
      m.material = Array.isArray(m.material) ? m.material.map(stage.cloneMaterial) : stage.cloneMaterial(m.material);
      meshes.push(m);
    });
    let last = -1;
    return (a) => {
      a = a > 0.995 ? 1 : a < 0.005 ? 0 : a;
      let changed = a !== last;
      last = a;
      for (const m of meshes) {
        if (m.visible !== a > 0) { m.visible = a > 0; changed = true; }
        for (const x of [].concat(m.material)) {
          if (x.opacity === a && x.transparent === (a < 1)) continue;
          x.opacity = a; x.transparent = a < 1; changed = true;
        }
      }
      if (changed) stage.invalidate(); // what casts shadows changes too
    };
  }
  const fadeTop = fader([...topPlate, ...parts.laserHolder, ...parts.btnLaser, ...parts.btnRun]);
  const fadeHousing = fader([...parts.endPanels, ...parts.mountPlate]);
  const fadeEncoder = fader([...parts.encoder, ...parts.encMount]);

  const gears = [...parts.pinion, ...parts.gear48, ...parts.gear40];
  const encoderSet = [...parts.gear40, ...parts.encShaft, ...parts.encoder, ...parts.encMount];
  const beltSet = [...parts.belts, ...parts.pulleys];
  const hl = { a: null, b: null, c: null };
  const light = (key, on, list, color, intensity = 0.55) => {
    if (on && !hl[key]) hl[key] = stage.highlight(list, color, { intensity });
    if (!on && hl[key]) { hl[key](); hl[key] = null; }
  };

  // buttons: pressed = pushed 2 mm down into the plate
  const btnL = parts.btnLaser, btnR = parts.btnRun;
  const base = new Map([...btnL, ...btnR].map((o) => [o, o.position.y]));
  const pressed = new Map();
  const press = (list, t) => {
    for (const o of list) {
      if (pressed.get(o) === t) continue;
      pressed.set(o, t);
      o.position.y = base.get(o) - 0.002 * t;
      stage.invalidate();
    }
  };
  // the laser pointer's beam (an annotation line, not a part): out of the front clamp on the top
  // plate, whose U cradle is 12 mm wide with its floor at y = 89.5 mm, so the module's axis is ~95.5 mm up
  const beamLen = 1.4;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, beamLen, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ff3b30', toneMapped: false, transparent: true, opacity: 0.9 }));
  beam.rotation.x = Math.PI / 2;
  const hz = stage.bounds(parts.laserHolder).box.min.z;
  beam.position.set(0, 0.0955, hz - beamLen / 2);
  beam.visible = false;
  model.add(beam);

  // labels pinned to the parts (annotations)
  const ov = labelLayer(stage);
  const center = (list) => stage.bounds(list).center.toArray();
  const L = [
    [ov.label('8T pinion', [0.012, AXES.motor[1] + 0.012, AXES.motor[2]], { color: ORANGE }),
      ov.label('48T on the rear axle', [0.006, AXES.rear[1] - 0.026, AXES.rear[2]], { color: ORANGE })],
    [ov.label('MT6701 encoder', center(parts.encoder), { color: PURPLE }),
      ov.label('40T gear', [0.006, AXES.enc[1] + 0.021, AXES.enc[2]], { color: PURPLE, side: 'l' })],
    [ov.label('GT2 belt, 1140 mm', [-BELT_X, AXES.rear[1] + PITCH_R, 0], { color: BLUE, side: 'l' }),
      ov.label('47T pulleys', [-BELT_X - 0.01, AXES.front[1] + PITCH_R, AXES.front[2]], { color: BLUE, minW: 520 })],
    [ov.label('Laser', center(btnL), { color: INK, side: 'l' }), ov.label('Run', center(btnR), { color: INK })],
    [],
  ];

  // the readout
  const H = hud(ov.layer, `
    <div class="rx-hud-row"><span data-k="t"></span><b class="num" data-k="r"></b></div>
    <table class="num" data-k="tab"><thead><tr><th></th><th>Turns</th></tr></thead><tbody>
      <tr data-k="rowM"><td>Motor <small>8T pinion</small></td><td data-k="m"></td></tr>
      <tr data-k="rowE"><td>Encoder <small>40T gear, MT6701</small></td><td data-k="e"></td></tr>
      <tr><td>Rear wheels <small>48T gear</small></td><td data-k="w"></td></tr>
      <tr data-k="rowF"><td>Front wheels <small>through the belts</small></td><td data-k="f"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big rx-hud-x" data-k="big"><span>Travel</span><b class="num" data-k="d"></b></div>`);

  // Views, framed once per stage shape with the drivetrain at rest and the buttons up. Each step
  // has a start and an end view; the step drifts slowly from one to the other.
  const V = (obj, o) => stage.frame(obj, { ...o, apply: false, refresh: true });
  let fixed = null, aspect = 0;
  function viewsNow(theta) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (fixed && a === aspect) return fixed;
    aspect = a;
    drive.set(0); press([...btnL, ...btnR], 0);
    fixed = [
      [V(gears, { azimuth: 90, elevation: 40, pad: 1.8 }), V(gears, { azimuth: 78, elevation: 36, pad: 1.8 })],
      [V([...parts.pinion, ...encoderSet], { azimuth: 84, elevation: 30, pad: 2.2 }), V([...parts.pinion, ...encoderSet], { azimuth: 62, elevation: 34, pad: 2.2 })],
      [V(beltSet, { azimuth: 58, elevation: 42, pad: 1.75 }), V(beltSet, { azimuth: 118, elevation: 32, pad: 1.75 })],
      [V([...btnL, ...btnR, ...parts.mountPlate], { azimuth: 6, elevation: 50, pad: 1.6 }), V(car, { azimuth: 30, elevation: 28, pad: 1.0, offset: [0, 0, -0.1] })],
      [V(car, { azimuth: 250, elevation: 30, pad: 1.04 }), V(car, { azimuth: 212, elevation: 20, pad: 1.04 })],
    ];
    drive.set(theta);
    return fixed;
  }
  const within = (i, sp) => (i === 3 ? smooth(0.3, 0.55, sp) : sp); // step 3 holds on the buttons, then pulls back

  function setProgress(p, step, stepP = 0) {
    step = clamp(step | 0, 0, 4);
    const sp = reduced ? 0.5 : clamp(stepP, 0, 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.35, stepP);
    stage.setShift(...ctx.shift());

    // drivetrain: turns with the scroll (about 0.8 m of travel over the section)
    const theta = reduced ? 0 : -22 * clamp(p, 0, 1);
    const views = viewsNow(theta);
    drive.set(theta);
    markers.setTravel(-theta * PITCH_R);

    // camera: each step eases in from where the previous one ended, then drifts to its end view
    const [a, b] = views[step];
    let view = blend(a, b, within(step, sp));
    if (k < 1) view = blend(blend(...views[step - 1], within(step - 1, 1)), view, k);
    stage.setView(view);

    // what is lit, and what is faded out of the way. Step 0 starts with the whole car and fades the
    // top plate, the housings and the encoder away; the encoder comes back in step 1, the housings in
    // step 2 and the top plate with its buttons in step 3, each while its step's view eases in.
    const out0 = step === 0 ? 1 - smooth(0.05, 0.35, sp) : 0;
    light('a', step === 0, [...parts.pinion, ...parts.gear48], ORANGE, 0.85);
    light('b', step === 1, encoderSet, PURPLE, 0.6);
    light('c', step === 2, beltSet, BLUE, 0.5);
    fadeTop(step >= 4 ? 1 : step === 3 ? k : out0);
    fadeHousing(step >= 3 ? 1 : step === 2 ? k : out0);
    fadeEncoder(step >= 2 ? 1 : step === 1 ? k : out0);
    if (markers.mesh.visible !== (step >= 2)) { markers.mesh.visible = step >= 2; stage.invalidate(); }

    // buttons: left pressed (laser) early in step 3, right pressed (run) later in it
    const bp = step === 3 ? (reduced ? 1 : sp) : step > 3 ? 1 : 0;
    press(btnL, step === 3 ? smooth(0.15, 0.3, bp) - smooth(0.4, 0.5, bp) : 0);
    press(btnR, step === 3 ? smooth(0.62, 0.72, bp) - smooth(0.8, 0.9, bp) : 0);
    const beamOn = step > 3 || (step === 3 && bp > 0.24);
    if (beam.visible !== beamOn) { beam.visible = beamOn; stage.invalidate(); }

    // labels: the previous step's leave before this step's arrive
    L.forEach((ls, i) => {
      const s = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === step - 1 ? 1 - smooth(0, 0.5, k) : 0;
      for (const l of ls) l.a = s;
    });

    // readout
    const w = Math.abs(theta) / TURN; // wheel turns
    H.put('t', HUD[step].t); H.put('r', HUD[step].r);
    H.show('tab', step <= 2); H.show('big', step <= 2); H.show('mini', step <= 2);
    H.show('rowM', step <= 1); H.show('rowE', step === 1); H.show('rowF', step === 2);
    H.put('m', (6 * w).toFixed(1)); H.put('e', (1.2 * w).toFixed(1)); H.put('w', w.toFixed(1)); H.put('f', w.toFixed(1));
    H.put('d', `${Math.round(w * CIRC * 100)} cm`);
    H.put('mini', step === 0 ? `Motor ${(6 * w).toFixed(1)} turns, wheels ${w.toFixed(1)}`
      : step === 1 ? `Encoder ${(1.2 * w).toFixed(1)} turns, wheels ${w.toFixed(1)}` : `Front and rear wheels ${w.toFixed(1)} turns`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); markers.dispose(); model.remove(beam); beam.geometry.dispose(); beam.material.dispose(); stage.dispose(); },
  };
}
