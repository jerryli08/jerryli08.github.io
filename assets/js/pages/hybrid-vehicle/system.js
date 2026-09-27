// "Docking and release", scroll-driven, on the real CAD of both vehicles (assets/models/rover.glb
// and drone.glb, the landing scene's models). u = step + progress through the step, 0..6:
//   0  the docked pair                          3  the drone lifts the rover, then sets it down
//   1  what is where (labels)                   4  the servo opens the latch; the drone lifts off alone
//   2  a cut along the rover's centreline       5  it comes back: the tubes push the doors down and
//      shows the parts inside                      the elastic snaps them shut (the passive catch)
// Every picture is a pure function of u: views are framed once per stage size with the models at
// rest and blended; the latch angles are the CAD's (42 degrees at the arms, 11.8 at the servo), the
// door angles during the catch come from the CAD section (common.js, doorPush).
import { createStage } from '/assets/js/lib/stage.js';
import { rigLatch, rigProps, addElastic, tags, hudPanel, freeLeftOf, anchor, doorPush, snapDoor, hull, region, orbit, blend, integrate, smooth, clamp, lerp, DEG, LATCH_OPEN, RATIO, SNAP_H, OK, INK } from './common.js';

const CARRY = 0.12; // m, how high the drone lifts the rover (illustration)
const LIFT = 0.2;   // m, the drone above the rover after the release (illustration)
const NEAR = 0.03;  // m: the last 30 mm of the descent run slowly, so the doors can be seen
const TURNS = 1.6;  // prop turns per step of scrolling at full speed (slowed, so it reads)

// ------------------------------------------------------------------ the timeline, u = 0..6
const cutK = (u) => smooth(2.02, 2.45, u) * (1 - smooth(3.0, 3.28, u));
const carry = (u) => CARRY * smooth(3.3, 3.68, u) * (1 - smooth(3.8, 3.98, u));
const openK = (u) => smooth(4.04, 4.3, u) * (1 - smooth(4.78, 4.96, u));
function droneUp(u) { // the drone above its docked position on the rover (m)
  if (u < 5) return LIFT * smooth(4.28, 4.72, u);
  if (u < 5.32) return lerp(LIFT, NEAR, smooth(5, 5.32, u));
  return NEAR * (1 - clamp((u - 5.32) / 0.3, 0, 1));
}
const U_SNAP = 5.32 + 0.3 * (1 - SNAP_H / (NEAR * 1000)); // where the tubes pass below the doors
const propSpeed = (u) => smooth(3.02, 3.25, u) * (1 - smooth(5.62, 5.9, u));
const propTurns = integrate(propSpeed, 6);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const latch = rigLatch(stage, rover);
  const props = rigProps(stage, drone);
  const elastic = addElastic(stage, rover, latch);
  const reduced = ctx.reducedMotion;
  // the cut: keeps z <= c. Parked beyond the drone's far side until step 2, then it takes the
  // rover's left half off along its centreline (z = -0.108), showing the parts inside
  const OFF = 0.3, MID = -0.108;
  const cut = stage.sectionPlane([0, 0, -1], OFF);

  // ---------------------------------------------------------------- views, framed once at rest
  const shape = hull(stage, [rover, drone]);
  // the rover with the underside of the drone: the labelled views, and the drone coming back down
  const deckBox = region([0.21, -0.175, -0.21], [0.54, 0.02, -0.005]);
  const roverBox = region([0.211, -0.174, -0.205], [0.538, -0.045, -0.018]);
  let views = null, vkey = '';
  function viewsNow() {
    const key = `${el.clientWidth}x${el.clientHeight}|${ctx.shift()[0]}`;
    if (views && key === vkey) return views;
    vkey = key;
    const portrait = el.clientHeight > el.clientWidth * 1.05;
    // full-width desktop: the cards cover the left, so the model is framed smaller, right of centre
    const pad = ctx.shift()[0] > 0 ? { home: 1.8, deck: 1.32, cut: 1.22, carry: 1.6, lift: 1.4, land: 1.62 }
      : portrait ? { home: 1.08, deck: 1.0, cut: 1.0, carry: 1.06, lift: 1.06, land: 1.04 } : { home: 1.28, deck: 1.08, cut: 1.04, carry: 1.2, lift: 1.12, land: 1.2 };
    const at = (hr, hd, dir, p) => {
      rover.position.y = hr; drone.position.y = hr + hd;
      rover.updateMatrixWorld(true); drone.updateMatrixWorld(true);
      const v = orbit(shape.fit(dir, p));
      rover.position.y = 0; drone.position.y = 0;
      rover.updateMatrixWorld(true); drone.updateMatrixWorld(true);
      return v;
    };
    const box = (b, azimuth, elevation, p) => orbit(stage.frame(b, { azimuth, elevation, pad: p, apply: false, track: false, refresh: true }));
    views = {
      home: at(0, 0, { azimuth: -42, elevation: 22 }, pad.home),
      label: box(deckBox, -28, 18, pad.deck),
      cut: box(roverBox, -9, 14, pad.cut),
      carry: at(CARRY, 0, { azimuth: -36, elevation: 9 }, pad.carry),
      lift: at(0, LIFT, { azimuth: -44, elevation: 20 }, pad.lift),
      land: at(0, 0, { azimuth: -30, elevation: 17 }, pad.land),
    };
    return views;
  }
  // [from, to, u0, u1]: the camera moves from one cached view to the next over [u0, u1]
  const MOVES = [['home', 'label', 1, 1.45], ['label', 'cut', 2, 2.45], ['cut', 'carry', 3, 3.5], ['carry', 'lift', 4, 4.45], ['lift', 'land', 5, 5.34]];
  function viewAt(u) {
    const v = viewsNow();
    let m = MOVES[0], k = 0;
    for (const mv of MOVES) { if (u >= mv[2]) { m = mv; k = reduced ? 1 : smooth(mv[2], mv[3], u); } }
    // a slow turn through the first two steps, then still
    const drift = reduced ? 0 : 0.25 * (clamp(u, 0, 2) - 2) / 2;
    return blend(v[m[0]], v[m[1]], k, drift);
  }

  // ---------------------------------------------------------------- labels and readout
  const R = (p) => anchor(rover, rover, p), D = (p) => anchor(drone, drone, p);
  const ov = tags(stage);
  const outside = [
    ov.tag('Holybro X500 V2', D([0.36, -0.0005, 0.02]), { side: 'r', short: 'X500 V2' }),
    ov.tag('16 mm landing tubes', D([0.3, -0.0621, -0.0565]), { side: 'l', short: 'Tubes, 16 mm' }),
    ov.tag('Latches (2)', anchor(latch.doors[0].part, rover, [0.4175, -0.05, -0.03]), { side: 'r', short: 'Latches' }),
    ov.tag('AprilTag', R([0.268, -0.084, -0.09]), { side: 'l' }),
    ov.tag('Downward Pi camera and ARK Flow', D([0.279, -0.0451, -0.1115]), { side: 'l', short: 'Camera' }),
    ov.tag('HTD 3M belt, 384 mm', R([0.418, -0.1196, -0.0539]), { side: 'r', short: 'Belt' }),
  ];
  const inside = [ // on the cut face (z = -0.108) or behind it: hollow dots, inside the chassis
    ov.tag('Latch servo, Feetech FT5325M', R([0.3892, -0.1111, -0.109]), { side: 'l', short: 'Latch servo', hollow: true }),
    ov.tag('Raspberry Pi 5 and Arduino Mega', R([0.2445, -0.1305, -0.1108]), { side: 'l', short: 'Pi 5 + Mega', hollow: true }),
    ov.tag('2S 2200 mAh LiPo', R([0.3453, -0.1376, -0.1101]), { side: 'r', short: 'LiPo', hollow: true }),
    ov.tag('Drive servos, Axon MINI (2)', R([0.4764, -0.1372, -0.1309]), { side: 'r', short: 'Drive servo', hollow: true }),
  ];
  const onPhone = new Set([0, 1, 2, 3]); // outside labels that still fit on a narrow stage
  const hud = hudPanel(ov.layer, `
    <div class="rx-hud-row"><span>Latch</span><b data-k="state"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Servo gear</span><b class="num" data-k="servo"></b></div>
    <div class="rx-hud-row"><span>Arms</span><b class="num" data-k="arms"></b><i><em data-k="armBar"></em></i></div>
    <div class="rx-hud-row rx-hud-x"><span>Doors</span><b class="num" data-k="doors"></b></div>`);
  const freeLeft = freeLeftOf(el, ctx);

  function state(u, a, doorDeg, hmm) {
    if (u < 3.3) return ['Closed', INK];
    if (u < 4.02) return ['Closed: carrying the rover', OK];
    if (u < 4.3) return ['Opening', INK];
    if (u < 4.78) return ['Open: the drone lifts clear', INK];
    if (a > 0.001) return ['Closing', INK];
    if (u < 5.32 || hmm >= 24) return ['Closed, ready for the drone', INK];
    if (u < U_SNAP) return ['The tubes push the doors down', '#ffb45c'];
    return ['Latched, no power', OK];
  }

  let moved = '';
  function setProgress(p, step, stepP) {
    const u = clamp(step + stepP, 0, 6);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy - 0.03);
    // the mechanism
    const a = openK(u);
    latch.set(a);
    const up = droneUp(u), hmm = up * 1000;
    let door = 0;
    if (u >= 5) { const b = doorPush(hmm); door = b == null || u >= U_SNAP ? snapDoor((u - U_SNAP) * 4) : b * DEG; }
    latch.setDoor(door);
    const hr = carry(u);
    // only when the parts moved: a camera-only change then skips the shadow pass
    const sig = `${a}|${door}|${hr}|${up}`;
    if (sig !== moved) {
      moved = sig;
      rover.position.y = hr; drone.position.y = hr + up;
      rover.updateMatrixWorld(true); drone.updateMatrixWorld(true);
      elastic.update(); // redraws the scene too
    }
    props.set(reduced ? 0 : propTurns(u) * TURNS * 2 * Math.PI);
    cut.set(lerp(OFF, MID, reduced ? (u >= 2 && u < 3 ? 1 : 0) : cutK(u)));
    // the camera
    stage.setView(viewAt(u));
    // labels
    const narrow = el.clientWidth < 620;
    const aOut = smooth(1.12, 1.45, u) * (1 - smooth(1.9, 2.08, u));
    const aIn = smooth(2.3, 2.55, u) * (1 - smooth(2.92, 3.06, u));
    outside.forEach((t, i) => { t.a = narrow && !onPhone.has(i) ? 0 : aOut; });
    inside.forEach((t, i) => { t.a = narrow && i === 2 ? 0 : aIn; }); // the LiPo label would crowd a phone
    ov.update(narrow, freeLeft());
    // readout
    hud.show(smooth(3.02, 3.22, u));
    const [txt, col] = state(u, a, door / DEG, hmm);
    hud.put('state', txt); hud.color('state', col);
    hud.put('servo', `${(a * LATCH_OPEN * RATIO / DEG).toFixed(1)}°`);
    hud.put('arms', `${(a * 42).toFixed(1)}°`); hud.bar('armBar', a);
    hud.put('doors', `${(door / DEG).toFixed(1)}°`);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); elastic.dispose(); deckBox.geometry.dispose(); roverBox.geometry.dispose(); stage.dispose(); } };
}
