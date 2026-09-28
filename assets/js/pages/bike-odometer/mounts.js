// The two printed parts, toured by the scroll: the sensor tower that stands on the trainer and puts
// the MT6701 board on the line of the flywheel's axle, and the two-piece clamp that holds the LCD
// on the handlebar. Both are Jerry's real CAD (tower.glb and display.glb, built by
// tools/optimize-cad.mjs; the display file's two STEP solids were only separated into two nodes,
// no vertex changed). Nothing here is a stand-in: there is no bike, trainer, flywheel or LCD
// model. The dashed lines and labels are annotations.
//
// Real axes, from the STEP files (tools/cad-axes.py), in the GLB frame (metres, Y up):
//  - sensor: the four 3.05 mm board holes of `solid mount:1` sit on a 16.7 mm square centred at
//    x = -0.0649, y = 0.1254, their axes along z; the board, and the flywheel's axle, sit on that line
//  - clamp screws: four 3.4 mm holes through both flanges at x = +-0.037, z = 0.015 and 0.067,
//    axes along y (STEP Z). The cap (`handlebar clamp`) moves only along them.
//  - the cap's half bore is centred on its lower face (y = 0.040) and the base's on its upper face
//    (y = 0.030), both 14 mm in radius: the CAD draws the halves 10 mm apart, and they make one
//    28 mm bore when they meet.
// Views are framed once, at rest (the cap's lifted position included in the clamp view), cached,
// and blended; every picture is a pure function of (step, progress through the step).
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const ACCENT = '#ff6b35';

const DISPLAY_AT = [0.15, -0.036, 0.0]; // the clamp placed beside the tower, on the same floor
const SENSOR = [-0.0649, 0.12535]; // x, y of the sensor axis (along z)
const SCREWS = [[-0.037, 0.015], [0.037, 0.015], [-0.037, 0.067], [0.037, 0.067]]; // x, z (axes along y)
const LIFT = 0.03; // how far the cap lifts along its screws (an exploded view)
const CLOSE = -0.01; // the 10 mm gap in the CAD, closed

// per step: which view, where the cap is (end of the step), what is lit and labelled
const STEPS = [
  { view: 'both', cap: 0 },
  { view: 'tower', cap: 0 },
  { view: 'plate', cap: 0 },
  { view: 'clampUp', cap: LIFT },
  { view: 'clampShut', cap: CLOSE },
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const [tower, display] = await Promise.all([
    stage.load('/assets/models/bike-odometer/tower.glb', { finish: 'printed' }),
    stage.load('/assets/models/bike-odometer/display.glb', { finish: 'printed' }),
  ]);
  display.position.set(...DISPLAY_AT);
  display.updateMatrixWorld(true);
  stage.fitGround();
  const plate = stage.part(/solid_mount/, tower);
  const cap = stage.part(/handlebar_clamp/, display);
  const cap0 = cap.map((c) => c.position.y);
  let capAt = 0;
  const setCap = (d) => {
    if (Math.abs(d - capAt) < 1e-7) return; // only when it moves: moving parts re-render the shadows
    capAt = d;
    cap.forEach((c, i) => { c.position.y = cap0[i] + d; });
    stage.invalidate();
  };

  // annotations: dashed lines (not parts), added after the views are framed
  const dashed = (pts, color, parent) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
    const m = new THREE.LineDashedMaterial({ color, dashSize: 0.004, gapSize: 0.003, transparent: true, opacity: 0, depthTest: false });
    const line = new THREE.Line(g, m);
    line.computeLineDistances();
    line.renderOrder = 10;
    line.raycast = () => {};
    parent.add(line);
    return line;
  };

  // views, framed once with everything at rest and cached per aspect ratio
  const sph = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const portrait = a < 1;
    const f = (obj, o) => sph(stage.frame(obj, { ...o, apply: false, refresh: true }));
    setCap(LIFT);
    const up = f(display, { azimuth: 38, elevation: 24, pad: portrait ? 1.25 : 1.5 });
    setCap(0);
    views = {
      both: f([tower, display], { azimuth: 22, elevation: 16, pad: portrait ? 1.05 : 1.2 }),
      tower: f(tower, { azimuth: 28, elevation: 14, pad: portrait ? 1.1 : 1.3 }),
      plate: f(plate, { azimuth: 55, elevation: 12, pad: portrait ? 2.6 : 3.4 }),
      clampUp: up,
      clampShut: f(display, { azimuth: 150, elevation: 26, pad: portrait ? 1.25 : 1.5 }),
    };
    return views;
  }
  const sp = new THREE.Spherical();
  function place(a, b, k, drift) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sp).add(target), target });
  }
  viewsNow();

  const axis = dashed([[SENSOR[0], SENSOR[1], -0.075], [SENSOR[0], SENSOR[1], 0.055]], ACCENT, tower);
  const screwLines = SCREWS.map(([x, z]) => dashed([[x, -0.004, z], [x, 0.1, z]], '#ffd2bf', display));

  // labels (world metres) and a small readout of numbers taken from the CAD
  const ov = labelLayer(stage);
  const W = (p, off = DISPLAY_AT) => [p[0] + off[0], p[1] + off[1], p[2] + off[2]];
  const L = {
    tower: ov.label('Sensor tower: stands on the trainer', [-0.085, 0.1, 0.035], { color: '#fff1e2', side: 'l', minW: 560 }),
    clamp: ov.label('Display clamp: goes on the handlebar', W([0.0, 0.064, 0.041]), { color: '#fff1e2', side: 'l', minW: 560 }),
    pockets: ov.label('Three pockets through the side', [-0.066, 0.058, 0.07], { color: '#fff1e2', side: 'l' }),
    plate: ov.label('Top plate for the sensor board', [-0.045, 0.135, 0.004], { color: ACCENT }),
    axis: ov.label('Sensor axis: in line with the flywheel\'s axle', [SENSOR[0], SENSOR[1], -0.075], { color: ACCENT, side: 'l' }),
    holes: ov.label('4 holes on a 16.7 mm square', [-0.0566, 0.1167, 0.003], { color: '#fff1e2', minW: 480 }),
    cap: ov.label('Cap', cap[0], { color: ACCENT }),
    screws: ov.label('4 screws, one axis each', W([0.037, 0.1, 0.015]), { color: '#ffd2bf' }),
    bar: ov.label('Handlebar goes through here', W([0.043, 0.032, 0.041]), { color: '#fff1e2' }),
    lcd: ov.label('Flat plate: the LCD screws on here', W([0.0, 0.003, -0.021]), { color: ACCENT, side: 'l' }),
  };
  const LABELS = [
    ['tower', 'clamp'],
    ['pockets', 'plate'],
    ['axis', 'holes'],
    ['cap', 'screws', 'bar'],
    ['lcd', 'bar'],
  ];
  if (!document.getElementById('odo-mounts-css')) {
    const st = document.createElement('style');
    st.id = 'odo-mounts-css';
    st.textContent = '.rx-odo-hud { width: min(320px, calc(100% - 28px)); } .rx-odo-hud .rx-hud-row + .rx-hud-row { margin-top: 5px; } .rx-odo-hud small { margin-top: 6px; }'
      + ' @media (max-width: 640px) { .rx-odo-hud { top: auto; bottom: 10px; right: 10px; width: auto; max-width: calc(100% - 20px); padding: 7px 10px 8px; } }';
    document.head.appendChild(st);
  }
  const hud = document.createElement('div');
  hud.className = 'rx-hud rx-odo-hud';
  hud.innerHTML = '<div class="rx-hud-row"><span data-k="a"></span><b class="num" data-k="av"></b></div><div class="rx-hud-row"><span data-k="b"></span><b class="num" data-k="bv"></b></div><small>From my CAD</small>';
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const READ = [
    ['Tower height', '177 mm', 'Clamp width', '86 mm'],
    ['Tower height', '177 mm', 'Base length', '172 mm'],
    ['Sensor above the base', '161 mm', 'Board holes', '16.7 mm square'],
    ['Cap travel shown', '30 mm', 'Clamp screws', '4'],
    ['Gap in the CAD', '10 mm', 'Bore when closed', '28 mm'],
  ];
  let shownRead = -1;

  let unlight = null, lit = '';
  function light(which) {
    if (which === lit) return;
    unlight?.(); unlight = null; lit = which;
    if (which === 'plate') unlight = stage.highlight(plate, ACCENT, { intensity: 0.55 });
    if (which === 'cap') unlight = stage.highlight(cap, ACCENT, { intensity: 0.45 });
  }

  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, STEPS.length - 1);
    const q = clamp(stepP, 0, 1);
    stage.setShift(...ctx.shift());
    const prev = Math.max(0, s - 1);
    const k = s === 0 || reduced ? 1 : smooth(0, 0.45, q);
    const v = viewsNow();
    const drift = reduced ? 0 : (q - 0.5) * 0.12;
    place(v[STEPS[prev].view], v[STEPS[s].view], k, drift);
    // the cap moves along its screw axes: up in step 4, back down past the drawn gap in step 5
    const from = STEPS[prev].cap, to = STEPS[s].cap;
    const m = reduced ? 1 : smooth(0.1, 0.8, q);
    setCap(s === 0 ? 0 : lerp(s === prev ? to : from, to, m));
    light(s === 2 ? 'plate' : s === 3 ? 'cap' : '');
    // the clamp views leave the tower out, so it does not clutter the background
    const towerOn = !(s === 4 || (s === 3 && k > 0.5));
    if (tower.visible !== towerOn) { tower.visible = towerOn; stage.invalidate(); }
    // annotations
    const ao = s === 2 ? 0.95 * k : 0;
    const sl = s === 3 ? 0.9 * k : s === 4 ? 0.9 * (1 - k) : 0;
    if (ao !== axis.material.opacity || sl !== screwLines[0].material.opacity) {
      axis.material.opacity = ao;
      for (const line of screwLines) line.material.opacity = sl;
      stage.invalidate(false);
    }
    Object.entries(L).forEach(([name, l]) => { l.a = LABELS[s].includes(name) ? (reduced ? 1 : smooth(0.25, 0.55, q)) : 0; });
    if (s !== shownRead) {
      shownRead = s;
      const [a, av, b, bv] = READ[s];
      K.a.textContent = a; K.av.textContent = av; K.b.textContent = b; K.bv.textContent = bv;
    }
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
