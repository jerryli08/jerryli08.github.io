// "Inside the latch", scroll-driven: a section through the middle of both latches, then the
// geartrain runs. u = step + progress through the step (0..6):
//   0  the docked pair, whole            3  the servo opens both latches (11.8 degrees in, 42 out)
//   1  a section cut sweeps in (x 0.417) 4  the drone lifts its tubes out
//   2  the geartrain lights up           5  the latch closes again: 6 active and 4 passive parts
// Every picture is a pure function of u. The three views are framed once per stage size, with
// the latch closed and the drone docked, and blended.
import { createStage } from '/assets/js/lib/stage.js';
import { rigLatch, rigProps, addElastic, tags, hudPanel, anchor, region, hull, orbit, blend, integrate, smooth, lerp, clamp, CUT_X, LATCH_OPEN, RATIO, DEG } from './common.js';

const propTurns = integrate((u) => smooth(3.95, 4.15, u) * (1 - smooth(4.9, 5.2, u)), 6);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const latch = rigLatch(stage, rover);
  const props = rigProps(stage, drone);
  const elastic = addElastic(stage, rover, latch);
  const reduced = ctx.reducedMotion;
  // parked past the far end of the model: nothing is cut until step 1
  const OFF = 0.72;
  const cut = stage.sectionPlane([-1, 0, 0], OFF);
  const shape = hull(stage, [rover, drone]);

  // regions to frame (model metres): the latch section, and the same with the drone lifted clear
  const secBox = region([0.405, -0.146, -0.206], [0.43, -0.040, -0.007]);
  const upBox = region([0.405, -0.146, -0.206], [0.43, 0.012, -0.007]);
  const SEC_DIR = [1, 0.13, 0.17];
  let views = null, vkey = '';
  function viewsNow() {
    const key = `${el.clientWidth}x${el.clientHeight}|${ctx.shift()[0]}`;
    if (views && key === vkey) return views;
    vkey = key;
    const portrait = el.clientHeight > el.clientWidth * 1.05, full = ctx.shift()[0] > 0;
    const f = (box, pad) => orbit(stage.frame(box, { dir: SEC_DIR, pad, apply: false, track: false, refresh: true }));
    views = {
      whole: orbit(shape.fit({ azimuth: 58, elevation: 22 }, full ? 1.8 : portrait ? 1.1 : 1.3)),
      sec: f(secBox, full ? 1.5 : portrait ? 1.04 : 1.14),
      up: f(upBox, full ? 1.4 : portrait ? 1.04 : 1.08),
    };
    return views;
  }

  const A = (p) => anchor(rover, rover, p);
  const ov = tags(stage);
  const T = {
    gear: ov.tag('25-tooth servo gear', A([CUT_X, -0.1111, -0.0867]), { side: 'l', short: '25T servo gear' }),
    idler: ov.tag('25-tooth idler', A([CUT_X, -0.1110, -0.1367]), { side: 'r', short: '25T idler' }),
    p1: ov.tag('7-tooth arm pinions', A([CUT_X, -0.0888, -0.0567]), { side: 'l', short: '7T pinions' }),
    p2: ov.tag('7-tooth arm pinions', A([CUT_X, -0.0888, -0.1667]), { side: 'r', short: '7T pinions' }),
    tube: ov.tag('Landing tube, 16 mm', anchor(drone, drone, [CUT_X, -0.0701, -0.0565]), { side: 'l', short: 'Tube, 16 mm' }),
    door: ov.tag('4 passive: the doors', anchor(latch.doors[0].part, rover, [CUT_X, -0.0531, -0.0380]), { side: 'l', short: '4 passive doors', color: '#6cc3ff' }),
    act: ov.tag('6 active: servo gear, idler, 4 arms', A([CUT_X, -0.0888, -0.1167]), { side: 'r', short: '6 active' }),
  };
  const hud = hudPanel(ov.layer, `
    <div class="rx-hud-row"><span>Servo gear, 25T</span><b class="num" data-k="servo"></b><i><em data-k="servoBar"></em></i></div>
    <div class="rx-hud-row"><span>Each arm, 7T</span><b class="num" data-k="arms"></b><i><em data-k="armBar"></em></i></div>
    <div class="rx-hud-row rx-hud-x"><span>Step up, 25 : 7</span><b class="num">x 3.6</b></div>`);

  let lit = '', unlight = [];
  function light(mode) {
    if (mode === lit) return;
    unlight.forEach((f) => f()); unlight = [];
    lit = mode;
    if (mode === 'active' || mode === 'both') unlight.push(stage.highlight([...latch.gears, ...latch.armParts], '#ff7a2e', { intensity: 0.34 }));
    if (mode === 'both') unlight.push(stage.highlight(latch.doorParts, '#4aa8ff', { intensity: 0.4 }));
  }

  let moved = '';
  function setProgress(p, step = 0, stepP = 0) {
    const t = clamp(step + stepP, 0, 6);
    stage.setShift(...ctx.shift());
    // camera: the whole pair, then square on to the cut face, then back a little to watch the lift
    const v = viewsNow();
    const k1 = reduced ? (t >= 1 ? 1 : 0) : smooth(0.3, 1.55, t), k2 = reduced ? (t >= 4 ? 1 : 0) : smooth(4.0, 4.6, t);
    stage.setView(k2 > 0 ? blend(v.sec, v.up, k2) : blend(v.whole, v.sec, k1));
    // the cut sweeps in through the middle of the latch arms
    cut.set(lerp(OFF, CUT_X, reduced ? (t >= 1 ? 1 : 0) : smooth(1.0, 1.7, t)));
    // open, hold, close
    const a = smooth(3.08, 3.85, t) * (1 - smooth(5.1, 5.75, t));
    latch.set(a);
    // lift the drone clear, props turning as it goes
    const y = 0.06 * smooth(4.1, 4.75, t);
    if (`${a}|${y}` !== moved) { moved = `${a}|${y}`; drone.position.y = y; drone.updateMatrixWorld(true); elastic.update(); }
    props.set(reduced ? 0 : propTurns(t) * 1.6 * 2 * Math.PI);
    // lights and labels
    light(t >= 5 ? 'both' : t >= 2 ? 'active' : '');
    const narrow = el.clientWidth < 620;
    const gearsA = smooth(2.05, 2.35, t) * (1 - smooth(4.85, 5, t));
    T.gear.a = gearsA; T.idler.a = gearsA; T.p1.a = gearsA; T.p2.a = narrow ? 0 : gearsA;
    T.tube.a = Math.max(smooth(1.45, 1.6, t) * (1 - smooth(1.9, 2.02, t)), smooth(4.05, 4.2, t) * (1 - smooth(4.85, 5, t)));
    T.door.a = smooth(5.05, 5.3, t); T.act.a = smooth(5.05, 5.3, t);
    ov.update(narrow);
    hud.show(smooth(3.0, 3.1, t) * (1 - smooth(4.9, 5.05, t)));
    hud.put('servo', `${(a * LATCH_OPEN * RATIO / DEG).toFixed(1)}°`); hud.bar('servoBar', a * RATIO);
    hud.put('arms', `${(a * 42).toFixed(1)}°`); hud.bar('armBar', a);
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { unlight.forEach((f) => f()); ov.dispose(); elastic.dispose(); secBox.geometry.dispose(); upBox.geometry.dispose(); stage.dispose(); },
  };
}
