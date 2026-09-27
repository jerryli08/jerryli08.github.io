// "The turret", scroll-driven, on the Worlds CAD (V2) with its moving parts rigged about their real
// axes (rig.js). u = step + progress through it (0..4):
//   0  at rest: the turret on its turntable bearing, the 150T ring and the two 90T gears named
//   1  the turret turns 60 degrees; both 90T gears counter-rotate 150/90 as far (100 degrees)
//   2  the turret comes back, the section sweeps in down the centreline (keeping the robot's left
//      half, where the pinion is), and the hood rolls along its toothed arc from 50 to 30 degrees
//      about the flywheel axle while the 40T pinion turns 7.65 times as far the other way
//   3  the hood rolls back, the flywheel spins up, the four TPU spinners push the stack, and the
//      top ball rises out of the bearing's bore onto the wheel, rides under the hood and leaves
//      (fading out past the robot); the other two move up behind it
// Every picture is a pure function of the scroll. Tooth counts and pitch radii are from the CAD;
// how far the turret turns here is illustrative (not its real travel limit); the hood stays where
// the pinion is on the arc in the CAD. Launch directions are geometry only.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadParts, rigTurret, restCentre, placeBall, dropMouthBall, wholeBalls, region, viewSet, hudPanel, stepState, integrate, DEG, V2, MID_X, RING_T, SERVO_T, HOOD_RACK_R, PINION_R, lerp, smooth, mix3 } from './rig.js';

const N = 4, TURN = 60, HOOD_LOW = 30;
const CUT_AT = -MID_X, CUT_OFF = 0.3;
const turretAt = (u) => TURN * smooth(1.1, 1.8, u) * (1 - smooth(2.0, 2.25, u)); // degrees
const hoodAt = (u) => V2.hoodEnd - (V2.hoodEnd - HOOD_LOW) * smooth(2.5, 2.85, u) * (1 - smooth(3.0, 3.2, u));
const cutAt = (u) => smooth(2.15, 2.4, u);
const flySpeed = (u) => smooth(3.0, 3.3, u);
const spinSpeed = (u) => smooth(3.28, 3.34, u) * (1 - smooth(3.72, 3.78, u));
const flyAngle = integrate(flySpeed, N), spinAngle = integrate(spinSpeed, N);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const { chassis, top } = await loadParts(stage, 'v2');
  dropMouthBall(stage, top);
  const rig = rigTurret(stage, chassis, top);
  const cut = stage.sectionPlane([1, 0, 0], CUT_OFF); // parked outside the robot until step 3
  const b = rig.balls;
  const rest = { top: restCentre(stage, b.top), mid: restCentre(stage, b.mid), low: restCentre(stage, b.low) };
  const topMat = wholeBalls(stage, [b.low, b.mid, b.top], ['#35b04a', null, '#35b04a'])[2];
  topMat.transparent = true;

  // glow on the parts a step is about (emissive only: no material rebuild while scrolling)
  const glow = (parts) => { let k = -1; return (x) => { x = Math.round(x * 100) / 100; if (x !== k) { k = x; stage.highlight(parts, '#ff6b35', { intensity: 0.5 * x }); } }; };
  const glowGears = glow([...rig.ring, ...rig.gears]), glowHood = glow(rig.hoodParts), glowSpin = glow(rig.spinnerParts);

  // the ball's trip: out of the bore onto the wheel, under the hood, out along the tangent
  const startTh = Math.atan2(rest.top[1] - V2.fly.y, rest.top[2] - V2.fly.z) / DEG; // about -21 degrees
  const exitOf = (th) => ({ p: rig.hoodPoint(th), d: [0, Math.cos(th * DEG), -Math.sin(th * DEG)] });
  function shotAt(t) {
    if (t < 0.4) return rest.top;
    if (t < 0.5) return mix3(rest.top, rig.hoodPoint(startTh), smooth(0.4, 0.5, t));
    if (t < 0.68) return rig.hoodPoint(lerp(startTh, V2.hoodEnd, (t - 0.5) / 0.18));
    if (t < 0.84) { const { p, d } = exitOf(V2.hoodEnd), s = 0.2 * (t - 0.68) / 0.16; return [p[0], p[1] + d[1] * s, p[2] + d[2] * s]; }
    return null;
  }
  function balls(u) {
    const t = u - 3;
    return {
      top: u < 3 ? rest.top : shotAt(t),
      mid: u < 3 ? rest.mid : mix3(rest.mid, rest.top, smooth(0.5, 0.85, t)),
      low: u < 3 ? rest.low : mix3(rest.low, rest.mid, smooth(0.5, 0.85, t)),
    };
  }

  // the launch direction while the hood rolls: a dashed line from where the ball leaves (annotation)
  const lineGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const lineMat = new THREE.LineDashedMaterial({ color: '#ff6b35', dashSize: 0.012, gapSize: 0.008, transparent: true, opacity: 0, depthTest: false });
  const line = new THREE.Line(lineGeo, lineMat);
  line.renderOrder = 5; line.visible = false; line.frustumCulled = false;
  stage.scene.add(line);
  let lineTh = NaN;
  const lineEnd = new THREE.Vector3();
  function setLine(th, a) {
    if (th !== lineTh) {
      lineTh = th;
      const { p, d } = exitOf(th);
      lineEnd.set(p[0], p[1] + d[1] * 0.26, p[2] + d[2] * 0.26);
      lineGeo.attributes.position.array.set([...p, lineEnd.x, lineEnd.y, lineEnd.z]);
      lineGeo.attributes.position.needsUpdate = true;
      line.computeLineDistances();
      stage.invalidate(false);
    }
    const o = Math.round(a * 100) / 100;
    if (o !== lineMat.opacity) { lineMat.opacity = o; line.visible = o > 0; stage.invalidate(false); }
  }

  // views, framed once at rest on fixed regions (the turret's swept space, the hood, the cut)
  const regions = {
    turret: region(THREE, [-0.22, 0.12, -0.23], [0.15, 0.41, 0.1]),
    hood: region(THREE, [MID_X - 0.005, 0.12, -0.3], [MID_X + 0.005, 0.5, 0.14]),
    cut: region(THREE, [MID_X - 0.005, -0.02, -0.4], [MID_X + 0.005, 0.56, 0.2]),
  };
  const views = viewSet(stage, el, {
    turret: { obj: regions.turret, azimuth: 38, elevation: 28, pad: 1.0 },
    hood: { obj: regions.hood, azimuth: -90, elevation: 6, pad: 1.05 },
    cut: { obj: regions.cut, azimuth: -90, elevation: 8, pad: 1.04 },
  });
  const VIEW = ['turret', 'turret', 'hood', 'cut'];

  // labels (model metres; points on the turret follow it) and the readout
  const ov = labelLayer(stage);
  const L = (text, p, o) => ov.label(text, p, { color: '#fff1e2', ...o });
  const gearL = rig.gears[0], gearR = rig.gears[1];
  const lab = {
    rest: [L('150T ring gear, on the turret', [V2.yaw.x, 0.226, V2.yaw.z + 0.088]), L('90T gear', gearL, { side: 'l' }), L('90T gear', gearR)],
    turn: [L('90T gear', gearL, { side: 'l' }), L('90T gear', gearR)],
    hood: [L(el.clientWidth < 640 ? 'Hood, toothed arc' : 'Hood: a toothed arc about the flywheel axle', [MID_X, 0.341, -0.0014], { side: 'l' }), L('40T pinion', [-0.021, 0.353, 0.026]), L('Flywheel axle', [MID_X, V2.fly.y, V2.fly.z], { side: 'l' })],
    cut: [L('Top ball, in the bearing\'s bore', [MID_X, rest.top[1], rest.top[2]], { side: 'l' }), L('Flywheel, 72 mm', [MID_X, V2.fly.y, V2.fly.z], { side: 'l' }), L('TPU spinner', [0.0505, 0.1655, -0.0212])],
  };
  const hud = hudPanel(ov.layer, `
    <table class="num"><tbody>
      <tr><td>Turret</td><td data-k="t"></td></tr>
      <tr><td>Each 90T gear <small>150 : 90</small></td><td data-k="s"></td></tr>
      <tr><td>Hood end, about the axle</td><td data-k="h"></td></tr>
      <tr><td>40T pinion <small>180.5 : 23.6 mm</small></td><td data-k="p"></td></tr>
      <tr><td>Ball leaves at</td><td data-k="l"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`);

  function setProgress(p, step, stepP) {
    const s = stepState(step, stepP, N, reduced);
    const u = s.uu;
    const tDeg = turretAt(u), hEnd = hoodAt(u);
    rig.setTurret(tDeg * DEG);
    rig.setHood(hEnd);
    rig.setFly(reduced ? 0 : -flyAngle(s.u) * 3 * 2 * Math.PI);
    rig.setSpin(reduced ? 0 : -spinAngle(s.u) * 26);
    cut.set(lerp(CUT_OFF, CUT_AT, cutAt(u)));
    const pos = balls(u);
    let moved = false;
    for (const k of ['top', 'mid', 'low']) {
      const q = pos[k], vis = !!q;
      if (b[k].visible !== vis) { b[k].visible = vis; moved = true; }
      if (q && placeBall(stage, b[k], q)) moved = true;
    }
    // the shot fades out once it is clear of the robot
    const fade = u < 3 ? 1 : 1 - smooth(0.73, 0.83, u - 3);
    if (Math.abs(topMat.opacity - fade) > 0.004) { topMat.opacity = fade; topMat.depthWrite = fade > 0.99; moved = true; }
    if (moved) stage.invalidate();
    glowGears(s.step === 1 ? 1 : s.step === 2 ? 1 - smooth(0, 0.3, stepP) : 0);
    glowHood(s.step === 2 ? smooth(0.4, 0.5, stepP) : s.step === 3 ? 1 - smooth(0, 0.25, stepP) : 0);
    glowSpin(s.step === 3 ? smooth(0.25, 0.32, stepP) * (1 - smooth(0.78, 0.86, stepP)) : 0);
    setLine(hEnd, s.step === 2 ? smooth(0.42, 0.5, stepP) : s.step === 3 ? 1 - smooth(0, 0.15, stepP) : 0);
    // camera
    stage.setShift(...(el.clientWidth < 640 ? [0, -0.06] : ctx.shift()));
    views.blend(VIEW[s.prev], VIEW[s.step], s.k);
    // labels
    const settled = s.step === 0 ? 1 : smooth(0.4, 0.6, stepP);
    for (const l of lab.rest) l.a = s.step === 0 ? 1 : 0;
    for (const l of lab.turn) l.a = s.step === 1 ? smooth(0.05, 0.15, stepP) : 0;
    for (const l of lab.hood) l.a = s.step === 2 ? settled : 0;
    for (const l of lab.cut) l.a = s.step === 3 ? settled * (1 - smooth(0.42, 0.5, stepP)) : 0;
    ov.update();
    // readout: the turret, the gears it drives, the hood and its pinion
    const gear = (-RING_T / SERVO_T) * tDeg, pin = -(V2.hoodEnd - hEnd) * (HOOD_RACK_R / PINION_R);
    const deg = (v) => `${Math.round(v) === 0 ? 0 : Math.round(v)}°`;
    hud.show(1);
    hud.put('t', deg(tDeg)); hud.put('s', deg(gear));
    hud.put('h', deg(hEnd)); hud.put('p', deg(pin));
    hud.put('l', `about ${Math.round(90 - hEnd)}° up`);
    hud.put('mini', s.step < 2 ? `Turret ${deg(tDeg)}, each 90T gear ${deg(gear)}` : `Hood ${deg(hEnd)}, pinion ${deg(pin)}, ball leaves about ${Math.round(90 - hEnd)}° up`);
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); lineGeo.dispose(); lineMat.dispose(); for (const r of Object.values(regions)) r.geometry.dispose(); stage.dispose(); },
  };
}
