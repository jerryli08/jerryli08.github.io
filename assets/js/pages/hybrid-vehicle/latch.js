// Scroll-driven section through the docking latch. The picture is a pure function of the scroll
// position: t = step + progress through the step (0..6).
//   0  the docked pair, whole          3  the servo opens both latches (arms 0 to 42 degrees)
//   1  a section cut sweeps in (x 0.417) 4  the drone lifts its tubes out
//   2  the geartrain lights up           5  the latch closes again: 6 active and 4 passive parts
import { createStage } from '/assets/js/lib/stage.js';
import { rigLatch, rigProps, addElastic, labels, anchor, hud, region, lerpView, smooth, lerp, clamp, hull, CUT_X, LATCH_OPEN, RATIO, DEG } from './common.js';

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const latch = rigLatch(stage, rover);
  const props = rigProps(stage, drone);
  const elastic = addElastic(stage, rover, latch);
  latch.onChange = elastic.update;
  // parked past the far end of the model: nothing is cut until step 1
  const OFF = 0.72;
  const cut = stage.sectionPlane([-1, 0, 0], OFF);
  const shape = hull(stage, [rover, drone]);
  let wholeKey = '', wholeView = null; // the uncut view depends only on the stage size

  // regions to frame (model metres): the latch section, and the same with the drone lifted clear
  const secBox = region([0.405, -0.146, -0.206], [0.43, -0.040, -0.007]);
  const upBox = region([0.405, -0.146, -0.206], [0.43, 0.012, -0.007]);
  const SEC_DIR = [1, 0.13, 0.17];

  const A = (p) => anchor(rover, rover, p);
  const narrow = () => el.clientWidth < 620;
  const items = [
    { id: 'gear', anchor: A([CUT_X, -0.1111, -0.0867]), side: 'r', long: '25-tooth servo gear', short: '25T servo gear' },
    { id: 'idler', anchor: A([CUT_X, -0.1110, -0.1367]), side: 'l', long: '25-tooth idler', short: '25T idler' },
    { id: 'p1', anchor: A([CUT_X, -0.0888, -0.0567]), side: 'r', long: '7-tooth arm pinions', short: '7T pinions' },
    { id: 'p2', anchor: A([CUT_X, -0.0888, -0.1667]), side: 'l', long: '7-tooth arm pinions', short: '7T pinions' },
    { id: 'tube', anchor: anchor(drone, drone, [CUT_X, -0.0701, -0.0565]), side: 'r', long: 'Landing tube, 16 mm', short: 'Tube, 16 mm' },
    { id: 'door', anchor: anchor(latch.doors[0].part, rover, [CUT_X, -0.0531, -0.0380]), side: 'r', cls: 'pas', long: '<b>4 passive</b> doors', short: '<b>4</b> passive doors' },
    { id: 'act', anchor: A([CUT_X, -0.0888, -0.1167]), side: 'r', long: '<b>6 active</b>: servo gear, idler, 4 arms', short: '<b>6</b> active' },
  ];
  for (const it of items) { it.text = it.long; it.on = false; }
  const labs = labels(stage, items);
  const info = hud(stage, [{ key: 'servo', label: 'Servo gear' }, { key: 'arms', label: 'Arms' }, { key: 'ratio', label: 'Gear ratio' }], { where: 'tr' });
  info.set({ ratio: '25 : 7' });
  info.show(false);

  let lit = '', unlight = [];
  function light(mode) {
    if (mode === lit) return;
    unlight.forEach((f) => f()); unlight = [];
    lit = mode;
    if (mode === 'active' || mode === 'both') unlight.push(stage.highlight([...latch.gears, ...latch.armParts], '#ff7a2e', { intensity: 0.34 }));
    if (mode === 'both') unlight.push(stage.highlight(latch.doorParts, '#4aa8ff', { intensity: 0.4 }));
  }

  function setProgress(p, step = 0, stepP = 0) {
    const t = clamp(step + stepP, 0, 6);
    const portrait = el.clientHeight > el.clientWidth * 1.05;
    stage.setShift(portrait ? 0 : 0.15, portrait ? 0.2 : 0);
    // camera: the whole pair, then square on to the cut face, then back a little to watch the lift
    const key = `${el.clientWidth}x${el.clientHeight}`;
    if (wholeKey !== key) { wholeKey = key; wholeView = shape.fit({ azimuth: 58, elevation: 22 }, portrait ? 1.12 : 1.5); }
    const whole = { pos: wholeView.pos.clone(), target: wholeView.target.clone() };
    const sec = stage.frame(secBox, { dir: SEC_DIR, pad: portrait ? 1.04 : 1.22, apply: false, track: false });
    const up = stage.frame(upBox, { dir: SEC_DIR, pad: portrait ? 1.04 : 1.14, apply: false, track: false });
    let view = lerpView(whole, sec, smooth(0.3, 1.55, t));
    view = lerpView(view, up, smooth(4.0, 4.6, t));
    stage.setView(view);
    // the cut sweeps in through the middle of the latch arms
    cut.set(lerp(OFF, CUT_X, smooth(1.0, 1.7, t)));
    // open, hold, close
    const a = smooth(3.08, 3.85, t) * (1 - smooth(5.1, 5.75, t));
    latch.set(a);
    // lift the drone clear, props turning as it goes
    drone.position.y = 0.06 * smooth(4.1, 4.75, t);
    props.set(22 * clamp(t - 3.95, 0, 2.05));
    // lights and labels
    light(t >= 5 ? 'both' : t >= 2 ? 'active' : '');
    const n = narrow(), txt = (id) => { const it = items.find((x) => x.id === id); return n ? it.short : it.long; };
    const arrows = t >= 3 && t < 4;
    labs.set('gear', { on: t >= 2 && t < 5, text: txt('gear') + (arrows ? ' ↺' : '') });
    labs.set('idler', { on: t >= 2 && t < 5, text: txt('idler') + (arrows ? ' ↻' : '') });
    labs.set('p1', { on: t >= 2 && t < 5, text: txt('p1') });
    labs.set('p2', { on: t >= 2 && t < 5 && !n, text: txt('p2') });
    labs.set('tube', { on: t >= 1.5 && t < 2 || (t >= 4 && t < 5), text: txt('tube') });
    labs.set('door', { on: t >= 5, text: txt('door') });
    labs.set('act', { on: t >= 5, text: txt('act') });
    info.show(t >= 3 && t < 5);
    info.set({ servo: `${(a * LATCH_OPEN * RATIO / DEG).toFixed(1)}°`, arms: `${(a * 42).toFixed(1)}°` });
    stage.invalidate();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { unlight.forEach((f) => f()); labs.dispose(); info.dispose(); elastic.dispose(); secBox.geometry.dispose(); upBox.geometry.dispose(); stage.dispose(); },
  };
}
