// "Passive latching", scroll-driven, in a section through the middle of the latch (x = 0.417).
// u = step + progress through the step (0..5):
//   0  the drone 32 mm up; elastic holds the doors up   3  pulling up: the tubes press into the doors
//   1  the tubes push the doors down on their pins       4  the servo swings the arms out and the drone
//   2  past the doors, the elastic snaps them shut          lifts clear; the arms close again
// Door angles come from the real door section turned against the 16 mm tube (common.js, doorPush);
// the elastic is drawn in (it is not in the CAD). Every picture is a pure function of u, and the
// view is framed once per stage size.
import { createStage } from '/assets/js/lib/stage.js';
import { rigLatch, addElastic, tags, hudPanel, freeLeftOf, anchor, region, doorPush, snapDoor, smooth, lerp, clamp, CUT_X, DEG, HOLD_H, FIRST_TOUCH, SNAP_H, LATCH_OPEN, OK, WARN, INK } from './common.js';

const TOP = 32; // mm, the drone's starting height above docked
const PUSH0 = 38.75; // degrees: the door angle just before the tube passes (common.js PUSH[0])
const LOW = 2.5; // mm, where step 1 leaves it
// the drone's height above docked (mm) through the scroll
function height(u) {
  if (u < 2) return lerp(TOP, LOW, smooth(1.05, 1.9, u));
  if (u < 3) return LOW * (1 - clamp((u - 2) / 0.25, 0, 1));
  if (u < 4) return HOLD_H * smooth(3.1, 3.5, u);
  return lerp(HOLD_H, TOP, smooth(4.35, 4.75, u));
}
const U_SNAP = 2 + 0.25 * (1 - SNAP_H / LOW);
const openK = (u) => smooth(4.05, 4.3, u) * (1 - smooth(4.8, 4.96, u));

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const latch = rigLatch(stage, rover);
  const elastic = addElastic(stage, rover, latch);
  stage.sectionPlane([-1, 0, 0], CUT_X);
  const reduced = ctx.reducedMotion;

  // the first latch in section, with room above it for the drone's tube
  const box = region([0.405, -0.122, -0.094], [0.43, -0.028, -0.019]);
  let view = null, vkey = '';
  function viewNow() {
    const key = `${el.clientWidth}x${el.clientHeight}|${ctx.shift()[0]}`;
    if (view && key === vkey) return view;
    vkey = key;
    const portrait = el.clientHeight > el.clientWidth * 1.05;
    view = stage.frame(box, { dir: [1, 0.1, 0.12], pad: ctx.shift()[0] > 0 ? 1.65 : portrait ? 1.22 : 1.08, apply: false, track: false, refresh: true });
    return view;
  }

  const ov = tags(stage);
  const T = {
    band: ov.tag('Elastic on the knobs', elastic.bands[0].b, { side: 'r', short: 'Elastic', color: '#f4c542' }),
    door: ov.tag('Door, on the pin at the arm tip', anchor(latch.doors[0].part, rover, [CUT_X, -0.0531, -0.0380]), { side: 'r', short: 'Door' }),
    arm: ov.tag('Arm', anchor(latch.arms[0].part, rover, [CUT_X, -0.078, -0.041]), { side: 'r' }),
    tube: ov.tag('Landing tube, 16 mm', anchor(drone, drone, [CUT_X, -0.0701, -0.0565]), { side: 'l', short: 'Tube, 16 mm' }),
    held: ov.tag('Pulling up: held', anchor(drone, drone, [CUT_X, -0.0621, -0.0565]), { side: 'l', short: 'Held', color: '#8fe3a8' }),
  };
  const hud = hudPanel(ov.layer, `
    <div class="rx-hud-row"><b data-k="state"></b></div>
    <div class="rx-hud-row"><span>Drone above docked</span><b class="num" data-k="h"></b></div>
    <div class="rx-hud-row"><span>Door angle</span><b class="num" data-k="b"></b><i><em data-k="bBar"></em></i></div>
    <div class="rx-hud-row rx-hud-x"><span>Elastic stretch</span><b class="num" data-k="s"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Arms (servo)</span><b class="num" data-k="arm"></b></div>`);
  const freeLeft = freeLeftOf(el, ctx);
  const rest = elastic.rest;

  let moved = '';
  function setProgress(p, step, stepP) {
    const u = clamp(step + stepP, 0, 5);
    // full-width desktop: a little further right than usual, clear of the step cards
    const [sx, sy] = ctx.shift();
    // a phone's readout spans the top of the stage: the section sits a little lower there
    stage.setShift(sx > 0 ? 0.2 : 0, el.clientWidth < 640 ? -0.08 : sy);
    stage.setView(viewNow());
    const h = height(u);
    const a = openK(u);
    latch.set(a);
    let b = 0; // door angle, radians finger down
    if (u < U_SNAP) b = (doorPush(h) ?? PUSH0) * DEG;
    else if (u < 3) b = reduced ? 0 : snapDoor((u - U_SNAP) * 1.1);
    latch.setDoor(b);
    if (`${a}|${b}|${h}` !== moved) { moved = `${a}|${b}|${h}`; drone.position.y = h / 1000; drone.updateMatrixWorld(true); elastic.update(); }
    // labels
    const narrow = el.clientWidth < 620;
    T.band.a = 1 - smooth(3.9, 4.05, u);
    T.door.a = u < 1 ? smooth(0.1, 0.35, u) : 1 - smooth(3.25, 3.4, u);
    T.arm.a = smooth(0.1, 0.35, u) * (1 - smooth(0.9, 1.1, u)) + smooth(4.02, 4.15, u) * (1 - smooth(4.8, 4.95, u));
    T.tube.a = smooth(0.1, 0.35, u) * (1 - smooth(1.05, 1.2, u));
    T.held.a = smooth(3.4, 3.55, u) * (1 - smooth(3.95, 4.05, u));
    ov.update(narrow, freeLeft());
    // readout
    hud.show(1);
    let s = 'Above the latch', c = INK;
    if (u >= 4.05) s = u < 4.3 ? 'The servo swings the arms open' : u < 4.78 ? 'Open: the drone lifts clear' : u < 4.96 ? 'Closing' : 'Closed, ready for the next landing';
    else if (u >= U_SNAP) { s = h >= HOLD_H - 0.05 ? 'Held: the tubes press up into the doors' : 'Latched, no power'; c = OK; }
    else if (h < FIRST_TOUCH) { s = 'The tubes push the doors down'; c = WARN; }
    hud.put('state', s); hud.color('state', c);
    hud.put('h', `${h.toFixed(1)} mm`);
    hud.put('b', `${(b / DEG).toFixed(1)}°`); hud.bar('bBar', Math.max(0, b / DEG) / 42);
    hud.put('s', `${Math.max(0, (elastic.bands[0].len - rest) * 1000).toFixed(1)} mm`);
    hud.put('arm', `${(a * LATCH_OPEN / DEG).toFixed(1)}°`);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); elastic.dispose(); box.geometry.dispose(); stage.dispose(); } };
}
