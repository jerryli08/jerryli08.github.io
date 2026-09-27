// Scrolly through the final CAD (version two), one step per mechanism in Jerry's checklist:
//   0 the geared drivetrain: 8T pinion on the motor, 48T gear on the rear axle (6 : 1)
//   1 the geared encoder: the same pinion drives a 40T gear whose shaft carries the MT6701's magnet
//   2 the two GT2 belts to the front axle (1 : 1), so all four wheels drive
//   3 the two buttons on the top plate: left toggles the laser pointer, right starts the run
//   4 the whole car
// The picture is a pure function of the scroll (step, progress through it). The drivetrain turns
// only while the reader scrolls, every part at its tooth ratio (rig.js); with reduced motion
// nothing turns and the views cut from one step to the next.
import { createStage } from '/assets/js/lib/stage.js';
import { M, AXES, WHEEL_R, PITCH_R, partsOf, rigDrive, beltMarkers, labels, chip, clamp, smooth, lerp } from './rig.js';

const ORANGE = '#ff6b35', PURPLE = '#a78bfa', BLUE = '#3d8bff';
const PARK = 5; // a plane constant that keeps everything

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const { THREE } = stage;
  const model = await stage.load(`${M}/final.glb`);
  const parts = partsOf(stage, model);
  const car = [...model.children]; // the CAD only: framing ignores the markers and the beam added below
  const drive = rigDrive(stage, parts);
  const reduced = ctx.reducedMotion;

  // section planes (world metres): keep y <= c (drops the top plate) and x <= c (drops the right-hand belt,
  // wheels and the goBILDA beam in front of the gears, so the gear train is seen face on)
  const cutY = stage.sectionPlane([0, -1, 0], PARK);
  const cutX = stage.sectionPlane([-1, 0, 0], PARK);
  const markers = beltMarkers(stage, model);
  const labs = labels(el);
  const info = chip(el);

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
  const press = (list, t) => { for (const o of list) o.position.y = base.get(o) - 0.002 * t; };
  // the laser pointer's beam (an annotation line, not a part): out of the front clamp on the top
  // plate, whose U cradle is 12 mm wide with its floor at y = 89.5 mm, so the module's axis is ~95.5 mm up
  const beamLen = 1.4;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, beamLen, 10, 1, true), new THREE.MeshBasicMaterial({ color: '#ff3b30', toneMapped: false, transparent: true, opacity: 0.9 }));
  beam.rotation.x = Math.PI / 2;
  const hz = stage.bounds(parts.laserHolder).box.min.z;
  beam.position.set(0, 0.0955, hz - beamLen / 2);
  beam.visible = false;
  model.add(beam);

  // blend two views by orbiting about a moving target (a straight line between camera positions
  // on opposite sides of the car would pass through it)
  const S0 = new THREE.Spherical(), S1 = new THREE.Spherical(), off = new THREE.Vector3();
  const blend = (a, b, k) => {
    S0.setFromVector3(off.copy(a.pos).sub(a.target)); S1.setFromVector3(off.copy(b.pos).sub(b.target));
    let dT = S1.theta - S0.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.target.clone().lerp(b.target, k);
    off.setFromSphericalCoords(lerp(S0.radius, S1.radius, k), lerp(S0.phi, S1.phi, k), S0.theta + dT * k);
    return { pos: target.clone().add(off), target };
  };
  // camera for each step as a function of the progress through it
  const V = (obj, o) => stage.frame(obj, { ...o, apply: false });
  // Each step's camera is framed ONCE, with the drivetrain at rest, and scrolling only blends
  // between those fixed views. Framing the spinning gears on every scroll frame made the camera
  // shake, because a turning gear's bounding box changes size as it turns.
  drive.set(0);
  const fixed = [
    [V(gears, { azimuth: 90, elevation: 12, pad: 1.45 }), V(gears, { azimuth: 90, elevation: 16, pad: 1.45 })],
    [V([...parts.pinion, ...encoderSet], { azimuth: 90, elevation: 16, pad: 1.9 }), V([...parts.pinion, ...encoderSet], { azimuth: 60, elevation: 26, pad: 1.9 })],
    [V(beltSet, { azimuth: 58, elevation: 42, pad: 1.3 }), V(beltSet, { azimuth: 118, elevation: 32, pad: 1.3 })],
    [V([...btnL, ...btnR, ...parts.mountPlate], { azimuth: 6, elevation: 50, pad: 1.6 }), V(car, { azimuth: 30, elevation: 28, pad: 1.0, offset: [0, 0, -0.1] })],
    [V(car, { azimuth: 250, elevation: 30, pad: 1.04 }), V(car, { azimuth: 212, elevation: 20, pad: 1.04 })],
  ];
  const views = fixed.map(([a, b], i) => (sp) => blend(a, b, i === 3 ? smooth(0.3, 0.55, sp) : sp));
  const TEXT = [
    '8T pinion : 48T axle gear = 1 : 6. The motor turns 6 times per wheel turn.',
    '8T pinion : 40T encoder gear = 1 : 5. The encoder turns 1.2 times per wheel turn.',
    '47T to 47T on both sides: 1 : 1. All four wheels driven.',
    'Left button: laser pointer on and off. Right button: run. The plate is lettered LASER and RUN in the CAD.',
    '',
  ];

  let lastKey = '';
  function setProgress(p, step, stepP = 0) {
    step = clamp(step | 0, 0, 4);
    const sp = reduced ? 0.5 : clamp(stepP, 0, 1);
    const portrait = el.clientHeight > el.clientWidth;
    stage.setShift(portrait ? 0 : 0.15, portrait ? 0.2 : 0);

    // camera: each step eases in from where the previous one ended
    let view = views[step](sp);
    if (step > 0 && !reduced) {
      const k = smooth(0, 0.35, stepP);
      if (k < 1) {
        view = blend(views[step - 1](1), view, k);
      }
    }
    stage.setView(view);

    // drivetrain: turns with the scroll (about 0.8 m of travel over the section)
    const theta = reduced ? 0 : -22 * clamp(p, 0, 1);
    drive.set(theta);
    markers.setTravel(-theta * PITCH_R);

    // what is cut, hidden and lit in each step
    const gearSteps = step <= 1;
    cutY.set(step <= 2 ? 0.083 : PARK);
    cutX.set(gearSteps ? 0.031 : PARK);
    for (const o of parts.endPanels) o.visible = !gearSteps;
    for (const o of [...parts.encoder, ...parts.encMount]) o.visible = step !== 0;
    for (const o of parts.mountPlate) o.visible = !gearSteps;
    markers.mesh.visible = step >= 2;
    light('a', step === 0, [...parts.pinion, ...parts.gear48], ORANGE, 0.85);
    light('b', step === 1, encoderSet, PURPLE, 0.6);
    light('c', step === 2, beltSet, BLUE, 0.5);

    // buttons: left pressed (laser) early in step 3, right pressed (run) later in it
    const bp = step === 3 ? (reduced ? 1 : sp) : step > 3 ? 1 : 0;
    press(btnL, step === 3 ? smooth(0.15, 0.3, bp) - smooth(0.4, 0.5, bp) : 0);
    press(btnR, step === 3 ? smooth(0.62, 0.72, bp) - smooth(0.8, 0.9, bp) : 0);
    beam.visible = step > 3 || (step === 3 && bp > 0.24);

    // chip and labels
    const w = WHEEL_R * Math.abs(theta) / (2 * Math.PI * WHEEL_R); // wheel turns
    let text = TEXT[step];
    if (step === 1) text += ` Now: motor ${(6 * w).toFixed(1)} turns, encoder ${(1.2 * w).toFixed(1)}, wheels ${w.toFixed(1)}.`;
    info.set(text);
    const key = String(step);
    if (key !== lastKey) {
      lastKey = key;
      if (step === 1) labs.set([{ text: 'MT6701 encoder', p: stage.bounds(parts.encoder).center.toArray(), side: 'r', color: PURPLE }]);
      else if (step === 0) labs.set([
        { text: '8T pinion', p: [0.012, AXES.motor[1] + 0.012, AXES.motor[2]], side: 'r', color: ORANGE },
        { text: '48T on the rear axle', p: [0.006, AXES.rear[1] + 0.026, AXES.rear[2]], side: 'l', color: ORANGE },
      ]);
      else labs.set([]);
    }
    labs.update(stage.camera, THREE);
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { labs.dispose(); info.dispose(); markers.dispose(); model.remove(beam); beam.geometry.dispose(); beam.material.dispose(); stage.dispose(); },
  };
}
