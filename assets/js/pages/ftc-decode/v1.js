// "V1's ball path", scroll-driven: V1 from Jerry's CAD, cut down the middle (keeps the robot's
// left half, x >= -0.036), with every moving part rigged about its real axis (rig.js). A ball
// travels the whole path as the reader scrolls. u = step + progress through it (0..5):
//   0  the path: a third ball waits in front of the intake, two are stored
//   1  the first intake gearing, 1,620 rpm: the ball stalls against the roller (Nov 8, 2025)
//   2  geared down to 1,150 rpm: the roller takes it in and it climbs the ramp (Nov 15)
//   3  flap up (close zone): gate opens, feed wheels lift the top ball into the flywheel, it rides
//      the hood and leaves about 58 degrees up; the other two move up behind it
//   4  flap down (far zone, as modelled): the next ball leaves about 38 degrees up
// Angles and positions are pure functions of u. The roller turns with the scroll at speeds in the
// ratio of the two gearings (the readout has the real speeds). Launch directions are the tangent
// where the hood ends in the CAD (geometry only). How far the gate and flap swing is illustrative;
// their axes are the servos'. The stall is shown as it was filmed: the ball stops at the roller.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadParts, rigV1, restCentre, placeBall, wholeBalls, region, viewSet, hudPanel, stepState, integrate, V1, DEG, MID_X, BALL_R, FLOOR_Y, lerp, smooth, mix3, clamp } from './rig.js';

const RPM = { old: 1620, now: 1150 };
const N = 5;
// the incoming ball: waiting on the floor, touching the roller (the stall), under it, at the foot
// of the 40 degree ramp (the ramp line through the stored balls, at floor-ball height)
const FLOOR_BALL = FLOOR_Y + BALL_R;
const START = [MID_X, FLOOR_BALL, 0.44];
const TOUCH_Z = V1.roller.z + Math.sqrt((BALL_R + V1.roller.r) ** 2 - (V1.roller.y - FLOOR_BALL) ** 2) - 0.004;
const TOUCH = [MID_X, FLOOR_BALL, TOUCH_Z];
const UNDER = [MID_X, FLOOR_BALL, V1.roller.z];

// intake roller speed (1 = the 1,620 rpm gearing), flywheel and feed wheel speeds, over u
const intakeSpeed = (u) => (u < 2 ? smooth(1.0, 1.15, u) : lerp(1, RPM.now / RPM.old, smooth(2.0, 2.2, u)) * (1 - smooth(3.0, 3.25, u)));
const flySpeed = (u) => smooth(3.0, 3.3, u);
const feedSpeed = (u) => smooth(3.38, 3.42, u) * (1 - smooth(3.6, 3.64, u)) + smooth(4.38, 4.42, u) * (1 - smooth(4.6, 4.64, u));
const intakeAngle = integrate(intakeSpeed, N), flyAngle = integrate(flySpeed, N), feedAngle = integrate(feedSpeed, N);
const flapAt = (u) => smooth(3.08, 3.35, u) * (1 - smooth(4.08, 4.35, u)); // 0 down .. 1 up
const gateAt = (u) => smooth(3.34, 3.42, u) * (1 - smooth(3.84, 3.95, u)) + smooth(4.34, 4.42, u) * (1 - smooth(4.84, 4.95, u));
const HOOD_END = [V1.hoodEndUp, V1.hoodEndDown]; // step 3 shoots with the flap up, step 4 with it down

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const { chassis, top } = await loadParts(stage, 'v1');
  const rig = rigV1(stage, chassis, top);
  stage.sectionPlane([1, 0, 0], -MID_X); // keeps x >= -0.036: the robot's left half
  const b = rig.balls;
  const rest = { top: restCentre(stage, b.top), mid: restCentre(stage, b.mid), low: restCentre(stage, b.low) };
  const ballMat = wholeBalls(stage, [b.low, b.mid, b.top], ['#35b04a']); // whole balls inside the cut; the incoming one green
  const matOf = { low: ballMat[0], mid: ballMat[1], top: ballMat[2] };
  matOf.top.transparent = matOf.mid.transparent = true; // a shot fades out once it is clear of the robot

  // the ball's path from the floor to the flywheel, by arc length
  const intakePath = [TOUCH, UNDER, [MID_X, FLOOR_BALL, rest.low[2] + (rest.low[1] - FLOOR_BALL) / Math.tan(40 * DEG)], rest.low];
  const seg = intakePath.slice(1).map((q, i) => Math.hypot(q[1] - intakePath[i][1], q[2] - intakePath[i][2]));
  const total = seg.reduce((a, x) => a + x, 0);
  const alongIntake = (f) => {
    let d = f * total;
    for (let i = 0; i < seg.length; i++) { if (d <= seg[i] || i === seg.length - 1) return mix3(intakePath[i], intakePath[i + 1], clamp(d / seg[i], 0, 1)); d -= seg[i]; }
    return rest.low;
  };
  const r0 = Math.hypot(rest.top[1] - V1.fly.y, rest.top[2] - V1.fly.z);
  const th0 = Math.atan2(rest.top[1] - V1.fly.y, rest.top[2] - V1.fly.z) / DEG; // about -28 degrees: in front of the wheel
  const FLY = 0.3; // metres of flight shown past the hood
  const exitOf = (endTh) => ({ p: rig.hoodPoint(endTh), d: [0, Math.cos(endTh * DEG), -Math.sin(endTh * DEG)] });
  // one shot, t = progress through its step: lifted by the feed wheels, carried under the hood, out
  function shotAt(t, endTh) {
    if (t < 0.42) return rest.top;
    if (t < 0.55) { const k = smooth(0.42, 0.55, t); return rig.hoodPoint(lerp(th0, th0 + 10, k), lerp(r0, V1.ballPathR, k)); }
    if (t < 0.72) return rig.hoodPoint(lerp(th0 + 10, endTh, (t - 0.55) / 0.17));
    if (t < 0.9) { const { p, d } = exitOf(endTh), s = FLY * (t - 0.72) / 0.18; return [p[0], p[1] + d[1] * s, p[2] + d[2] * s]; }
    return null; // gone
  }
  // where each ball is at u (null: out of the picture)
  function balls(u) {
    const s = Math.min(Math.floor(u), N - 1), f = u - s; // u = 5 is the end of step 4, not a new step
    const topP = s < 3 ? rest.top : s === 3 ? shotAt(f, HOOD_END[0]) : null;
    const midP = u < 3.6 ? rest.mid : s === 3 ? mix3(rest.mid, rest.top, smooth(3.6, 3.9, u)) : shotAt(f, HOOD_END[1]);
    let lowP;
    if (s <= 0) lowP = START;
    else if (s === 1) lowP = mix3(START, TOUCH, smooth(0.2, 0.65, f));
    else if (s === 2) lowP = alongIntake(smooth(0.28, 0.9, f));
    else if (s === 3) lowP = mix3(rest.low, rest.mid, smooth(3.6, 3.9, u));
    else lowP = mix3(rest.mid, rest.top, smooth(4.6, 4.9, u));
    return { top: topP, mid: midP, low: lowP };
  }

  // launch directions: dashed lines from where the ball leaves the hood (annotations, not CAD)
  const lines = HOOD_END.map((th, i) => {
    const { p, d } = exitOf(th);
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...p), new THREE.Vector3(p[0], p[1] + d[1] * 0.3, p[2] + d[2] * 0.3)]);
    const m = new THREE.LineDashedMaterial({ color: i ? '#ffd2bd' : '#ff6b35', dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0, depthTest: false });
    const l = new THREE.Line(g, m);
    l.computeLineDistances(); l.renderOrder = 5; l.visible = false;
    stage.scene.add(l);
    return { l, m, end: [p[0], p[1] + d[1] * 0.3, p[2] + d[2] * 0.3] };
  });

  // views, framed once at rest on fixed regions, from the cut side
  const R = (a, c) => region(THREE, [MID_X - 0.005, a[0], a[1]], [MID_X + 0.005, c[0], c[1]]);
  const regions = { whole: R([FLOOR_Y, -0.235], [0.41, 0.5]), intake: R([-0.06, -0.03], [0.27, 0.5]), shooter: R([0.08, -0.42], [0.6, 0.08]) };
  const views = viewSet(stage, el, {
    whole: { obj: regions.whole, azimuth: -90, elevation: 6, pad: 1.06 },
    intake: { obj: regions.intake, azimuth: -90, elevation: 6, pad: 1.08 },
    shooter: { obj: regions.shooter, azimuth: -90, elevation: 6, pad: 1.04 },
  });
  const VIEW = ['whole', 'intake', 'intake', 'shooter', 'shooter'];

  // labels and readout
  const ov = labelLayer(stage);
  // on a phone the robot fills the stage: every label reads to the right, so none runs off the left edge
  const L = (text, p, o) => ov.label(text, p, { color: '#fff1e2', ...o, ...(el.clientWidth < 640 ? { side: 'r' } : {}) });
  const lab = {
    path: [L('Intake roller', [MID_X, V1.roller.y, V1.roller.z]), L('Ramp, 40°', [MID_X, 0.07, 0.08], { side: 'l', minW: 520 }), L('Gate', [MID_X, 0.268, -0.03]), L('Flywheel pair', [MID_X, V1.fly.y, V1.fly.z], { side: 'l' }), L('Hood flap', [MID_X, 0.37, -0.03])],
    intake: [L(el.clientWidth < 640 ? 'Intake roller' : 'Intake roller: eight 48 mm wheels', [MID_X, V1.roller.y + 0.02, V1.roller.z], { side: 'l' })],
    shooter: [L('Flap, Swyft servo', [MID_X, 0.372, -0.02]), L('Gate', [MID_X, 0.268, -0.034], { side: 'l', minW: 520 }), L('Feed wheel', [V1.feedR.x, V1.feedR.y - 0.03, -0.066], { side: 'l', minW: 520 }), L('Flywheel, 96 mm', [MID_X, V1.fly.y - 0.03, V1.fly.z], { side: 'l' })],
    angles: [L('About 58° up', lines[0].end), L('About 38° up', lines[1].end, { side: 'l' })],
  };
  const hud = hudPanel(ov.layer, `
    <table class="num"><tbody>
      <tr><td>Intake gearing</td><td data-k="r"></td></tr>
      <tr><td>Roller surface speed <small>48 mm wheels</small></td><td data-k="v"></td></tr>
      <tr><td>Torque at the roller</td><td data-k="q"></td></tr>
      <tr><td>Hood flap</td><td data-k="f"></td></tr>
      <tr><td>Ball leaves the hood</td><td data-k="l"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`);

  const placed = {};
  function setProgress(p, step, stepP) {
    const s = stepState(step, stepP, N, reduced);
    const u = s.uu;
    const spin = reduced ? 0 : 1;
    rig.setIntake(intakeAngle(s.u) * 4 * 2 * Math.PI * spin); // 4 turns per step at 1,620 rpm (slowed; the numbers are real)
    rig.setFly(-flyAngle(s.u) * 3 * 2 * Math.PI * spin);
    rig.setFeed(feedAngle(s.u) * 30 * spin);
    rig.setFlap(flapAt(u));
    rig.setGate(gateAt(u));
    const pos = balls(u);
    let moved = false;
    for (const k of ['top', 'mid', 'low']) {
      const q = pos[k], vis = !!q;
      if (b[k].visible !== vis) { b[k].visible = vis; moved = true; }
      if (q && placeBall(stage, b[k], q)) moved = true;
      placed[k] = q;
    }
    // each shot fades out over the end of its flight
    const f = u - Math.min(Math.floor(u), N - 1);
    const fades = { top: u >= 3 && u < 4 ? 1 - smooth(0.8, 0.9, f) : 1, mid: u >= 4 ? 1 - smooth(0.8, 0.9, f) : 1, low: 1 };
    for (const k of ['top', 'mid']) { const m = matOf[k]; if (Math.abs(m.opacity - fades[k]) > 0.004) { m.opacity = fades[k]; m.depthWrite = fades[k] > 0.99; moved = true; } }
    if (moved) stage.invalidate();
    // launch lines: the close-zone line once the flap is up, the far-zone one once it is down again
    const la = [smooth(3.3, 3.4, u) * (u < 4 ? 1 : 0.4), smooth(4.3, 4.4, u)];
    lines.forEach((x, i) => { const o = Math.round(la[i] * 100) / 100; if (x.m.opacity !== o) { x.m.opacity = o; x.l.visible = o > 0; stage.invalidate(false); } });
    // camera
    stage.setShift(0, el.clientWidth < 640 ? -0.05 : 0);
    views.blend(VIEW[s.prev], VIEW[s.step], s.k);
    // labels
    const settled = s.step === 0 ? 1 : smooth(0.4, 0.6, stepP);
    const g = (i) => (s.step === i ? settled : 0);
    for (const l of lab.path) l.a = g(0);
    for (const l of lab.intake) l.a = g(1) + g(2);
    // the shooter's parts are named while the flap moves, and give way to the ball once it is shot
    const named = s.step >= 3 && !reduced ? smooth(0.06, 0.16, stepP) * (1 - smooth(0.34, 0.42, stepP)) : s.step >= 3 ? 1 : 0;
    for (const l of lab.shooter) l.a = named;
    lab.angles[0].a = la[0]; lab.angles[1].a = la[1];
    ov.update();
    // readout
    const geared = u >= 2.15;
    const rpm = geared ? RPM.now : RPM.old;
    const up = flapAt(u) > 0.5;
    hud.show(1);
    hud.put('r', `${rpm.toLocaleString('en-US')} rpm (${geared ? 'Nov 15' : 'Nov 8'})`);
    hud.put('v', `${((Math.PI * V1.intakeWheelD * rpm) / 60).toFixed(1)} m/s`);
    hud.put('q', `${(RPM.old / rpm).toFixed(2)}x`);
    hud.put('f', up ? 'Up: close zone' : 'Down: far zone');
    hud.put('l', `about ${90 - (up ? V1.hoodEndUp : V1.hoodEndDown)}° up`);
    hud.put('mini', s.step < 3 ? `Intake ${rpm.toLocaleString('en-US')} rpm, ${((Math.PI * V1.intakeWheelD * rpm) / 60).toFixed(1)} m/s` : `Flap ${up ? 'up: close zone, about 58°' : 'down: far zone, about 38°'} up`);
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); for (const x of lines) { x.l.geometry.dispose(); x.m.dispose(); } for (const r of Object.values(regions)) r.geometry.dispose(); stage.dispose(); },
  };
}
