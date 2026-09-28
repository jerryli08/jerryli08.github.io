// The extension intake's moving parts, rigged about the real axes in Jerry's CAD.
//
// Model: /assets/models/cryptic-extendo/robot.glb, baked from his Fusion 360 assembly by
// /home/claude/work/ftc-23-24-cryptic-extendo-concept/bake-robot.mjs. The file was pitched 1.0
// degree nose down with -Z up; the bake turned every vertex +89 degrees about X, so here Y is up,
// +Z is forward (the way the intake reaches), X runs across the robot, the lowest point of the
// robot is at y = 0 and the intake's centreline is at x = 0. Units are metres.
//
// Axes (every one runs along +X). Measured on the CAD meshes (the hex shafts' centres, the
// rollers' and gears' centres) and moved into this frame by the bake:
//   P  the 312 mm hex shaft: the fold arm's pivot and the three middle star rollers
//   F  the front shaft on the fold arm: three front star rollers (114.0 mm from P)
//   R  the rear shaft: two 61 mm TPU rollers over the top of the ramp
//   C  the 16 mm counter roller at the lip of the ramp, with its 15T gear
//   S  the 40T servo gear that drives it (22.0 mm from C: 40T + 15T at module 0.8)
//   O  the two 1.5 in omni wheels under the intake
//   D  the wheel of the robot's 4-bar dumper (on the robot, not on the slides)
// The slides run exactly along +Z. Every part is at its CAD position (fully extended) at ext = 1.
// The slides (Jerry, Sept 27: "all of the backs and fronts should be aligned when stowed"): each
// side is three Misumi SAR330 slides in a cascade, and each slide is three bodies (outer, middle,
// inner), all nine exactly 300.0 mm long (measured on the CAD). Slide A's outer body is bolted to
// the robot's side plate through the V-groove block :18; its inner body is bolted back to back to
// slide B's outer body through the blocks :14 and :15; B's inner body to C's outer body through :16
// and :17; and C's inner body carries the intake. (The last round took each whole slide for one
// member: A, extended 160.6 mm in the CAD, measured 460.6 mm end to end; B and C, extended 400 mm,
// 700 mm.) Retracted (ext = 0) all nine bodies on each side line up front and back with A's outer
// body, whose front end is flush with the front of :18 (model z 196.9 mm), 2.4 mm inside the front
// of the robot, and whose back end is at z -103.1 mm, 152.6 mm inside its back. Travel of each group
// from there to the CAD pose, along the slide axis (robot.glb groups, bake-robot.mjs):
//   A outer and middle, :18   static (0)
//   sl1  A inner + B outer    160.6 mm      sl2  B middle   360.6 mm
//   sl3  B inner + C outer    560.6 mm      sl4  C middle   760.6 mm
//   slide3 C inner, with the carriage and the intake       960.6 mm
// The same 960.6 mm is where seven robot parts copied into the intake component sit relative to
// the robot's own copies (four of them exactly 960.6 mm along the slide axis), so the intake was
// modelled in place there; at that position the ramp lines up with the 4-bar dumper (same width,
// same centreline). Every group moves in proportion to the carriage.
// Fold: +30 degrees about P brings the tips of the front star rollers (51.6 mm radius) down to
// 11.7 mm above the floor (the mecanum wheels' contact plane), under a pixel's 12.7 mm, while
// their swept circle still clears the counter roller by 0.7 mm; at 31 degrees it would touch it.
// Derived from the CAD; Jerry has not stated a fold angle, so the page does not print it.
export const AX = {
  P: [0, 0.1238, 1.03185],
  F: [0, 0.12414, 1.14586],
  R: [0, 0.11581, 0.95985],
  C: [0, 0.01631, 1.09799],
  S: [0, 0.03831, 1.09791],
  O: [0, 0.02601, 0.99345],
  D: [0, 0.09735, -0.09326],
};
export const RADII = { star: 0.0516, rear: 0.0301, counter: 0.00817, omni: 0.019, dumper: 0.0333 };
export const TRAVEL = 0.96061; // m of carriage (slide C inner body) travel along the slides
export const SLIDE_TRAVEL = { sl1: 0.16061, sl2: 0.36061, sl3: 0.56061, sl4: 0.76061 }; // m, from the CAD (above)
export const SLIDE_LEN = 0.3; // m, every slide body
export const SLIDE_FRONT = 0.1969; // m, model z of the slides' front ends when retracted (A outer, :18)
export const FOLD = (30 * Math.PI) / 180;
export const MODEL = '/assets/models/cryptic-extendo/robot.glb';
export const INTAKE = /^anim_cx_(carriage|ramp|omni|arm|rollF|rollP|rollR|rollC|gear40)$/;

// FTC CENTERSTAGE pixel: a hexagon 3 in (76.2 mm) across and 0.5 in (12.7 mm) thick (game manual),
// drawn here with a hexagonal hole in the middle. Not part of the CAD: added to show the path.
export const PIXEL = { across: 0.0762, thick: 0.0127 };

export async function rigRobot(stage) {
  const { THREE } = stage;
  const model = await stage.load(MODEL);
  const part = (name) => stage.part(new RegExp(`^anim_cx_${name}$`), model);
  const X = [1, 0, 0];
  const gF = stage.pivot(part('rollF'), AX.F, X);
  const gArm = stage.pivot([...part('arm'), gF], AX.P, X);
  const gP = stage.pivot(part('rollP'), AX.P, X);
  const gR = stage.pivot(part('rollR'), AX.R, X);
  const gC = stage.pivot(part('rollC'), AX.C, X);
  const gS = stage.pivot(part('gear40'), AX.S, X);
  const gO = stage.pivot(part('omni'), AX.O, X);
  const gD = stage.pivot(part('dwheel'), AX.D, X);
  // the carriage slides along +Z with everything on it; the other slide bodies follow in proportion
  // (SLIDE_TRAVEL), so that retracted, all nine bodies on each side line up front and back
  const car = new THREE.Group(); car.name = 'cx-carriage'; model.add(car);
  for (const o of [...part('carriage'), ...part('slide3'), ...part('ramp'), gArm, gP, gR, gC, gS, gO]) car.attach(o);
  const slides = Object.entries(SLIDE_TRAVEL).map(([k, travel]) => {
    const g = new THREE.Group(); g.name = `cx-${k}`; model.add(g);
    for (const o of part(k)) g.attach(o);
    return { g, travel };
  });

  // pixels: plain annotations, a white one and a yellow one
  const hex = (r) => { const s = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + Math.PI / 6; s[i ? 'lineTo' : 'moveTo'](r * Math.cos(a), r * Math.sin(a)); } s.closePath(); return s; };
  const R = PIXEL.across / 2 / Math.cos(Math.PI / 6); // corner radius for 76.2 mm across the flats
  const shape = hex(R); shape.holes.push(hex(R * 0.42));
  const geo = new THREE.ExtrudeGeometry(shape, { depth: PIXEL.thick, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 2 });
  geo.translate(0, 0, -PIXEL.thick / 2); geo.rotateX(-Math.PI / 2); // lying flat, centred on its middle
  const mk = (color) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 }));
    m.castShadow = true; m.receiveShadow = true; m.name = 'cx-pixel';
    return m;
  };
  const pixels = [mk('#f4f2ec'), mk('#f2c230')];
  for (const p of pixels) { p.visible = false; model.add(p); }

  // pose: ext 0..1 (retracted..extended), fold radians (+ = front rollers down), spin radians of
  // the star rollers (the others follow at the same surface speed), dspin: the dumper wheel
  let last = '';
  function pose({ ext = 1, fold = 0, spin = 0, dspin = 0 } = {}) {
    const key = `${ext}|${fold}|${spin}|${dspin}`;
    if (key === last) return;
    last = key;
    const dz = -TRAVEL * (1 - ext);
    car.position.z = dz;
    for (const sl of slides) sl.g.position.z = -sl.travel * (1 - ext);
    gO.setAngle(dz / RADII.omni); // rolling on the floor
    gArm.setAngle(fold);
    gF.setAngle(spin); gP.setAngle(spin); // identical sprockets on the two shafts in the CAD: 1:1
    gR.setAngle((spin * RADII.star) / RADII.rear);
    const c = (-spin * RADII.star) / RADII.counter; // counter roller turns the other way, under the pixel
    gC.setAngle(c);
    gS.setAngle((-c * 15) / 40); // 40T servo gear driving the 15T gear on the counter roller
    gD.setAngle(dspin);
    stage.invalidate();
  }
  // carriage-frame point -> model point for the current pose (for labels and pixels)
  const toModel = (p, out = new THREE.Vector3()) => out.set(p[0], p[1], p[2] + car.position.z);
  return { model, car, slides, pixels, pose, toModel, groups: { gF, gArm, gP, gR, gC, gS, gO, gD }, part };
}
