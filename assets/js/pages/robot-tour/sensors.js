// "What the robot knows", scroll-driven, on Jerry's final (geared) CAD.
// Steps: 0 the first code's distance measurement: an analog angle signal on the servo side of the
// gears, scaled by the 2.5 : 1 ratio into wheel turns and distance; 1 the SparkFun OTOS on the
// underside (seen from below); 2 its offset: turning in place, the sensor swings round the turning
// point while the dowel swings wider, and the offset the code gives the sensor makes it report the
// turning point.
// Numbers: angle to voltage is the first sketches' 0 to 3.3 V per turn; the ratio and the wheel
// (1.375 in) are from the code and the CAD; the offset is the code's setOffset. Every picture is a
// pure function of the scroll position; views are framed once with the robot at rest.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, views, frameBox, readout, smooth, clamp, lerp, R, B, CX, FLOOR, TURN, AXLE, OTOS_Z, DOWEL_Z } from './rig.js';

const RED = '#ef4444', TAN = '#e2b56b', ORANGE = '#ff6b35';
const SERVO_TURNS = 1.6; // step 0: the servo side turns 1.6 times (4 wheel turns)
const D_CM = 1.375 * 2.54;
const OTOS_R = OTOS_Z - AXLE[1]; // 30.4 mm in the CAD
const DOWEL_R = DOWEL_Z - AXLE[1]; // 80 mm

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const bot = await loadRobot(stage, 'geared');
  const { parts: P, S } = bot;
  stage.fitGround();

  const G = {
    frame: P.frame, beams: P.beams, deck: [...P.arduino, ...P.battery], casters: P.casters, otos: P.otos, dowel: P.dowel,
    left: [...S.servo.L, ...S.standoffs.L, ...S.bearings.L, ...S.hub.L, ...S.axle.L, ...S.wheel.L, ...S.big.L, ...S.small.L],
    right: [...S.servo.R, ...S.standoffs.R, ...S.bearings.R, ...S.hub.R, ...S.axle.R, ...S.wheel.R, ...S.big.R, ...S.small.R],
  };
  const STEPS = [
    { a: { frame: 0.16, beams: 0.3, deck: 0, dowel: 0.4, right: 0.5 }, tint: {} },
    { a: {}, tint: { otos: RED } },
    { a: { frame: 0.14, beams: 0.2, deck: 0 }, tint: { otos: RED, dowel: TAN } },
  ];

  const rest = (fn) => {
    const r = bot.carrier.rotation.y;
    bot.carrier.rotation.y = 0; bot.carrier.updateWorldMatrix(true, true);
    try { return fn(); } finally { bot.carrier.rotation.y = r; bot.carrier.updateWorldMatrix(true, true); }
  };
  const V = views(stage, el, rest);
  const moduleL = [...S.servo.L, ...S.hub.L, ...S.big.L, ...S.small.L, ...S.wheel.L];
  const turnBox = frameBox(THREE, [TURN[0] - 0.105, FLOOR, TURN[2] - 0.105], [TURN[0] + 0.105, 0.02, TURN[2] + 0.105]);
  const VIEW = [
    () => stage.frame(moduleL, { azimuth: 62, elevation: 30, pad: 1.35, apply: false, refresh: true }),
    () => stage.frame(stage.root, { azimuth: 28, elevation: -58, pad: 1.1, apply: false, refresh: true }),
    () => stage.frame(turnBox, { azimuth: 180, elevation: 80, pad: 1.3, apply: false, refresh: true }),
  ];

  // floor marks for step 2: where the OTOS and the dowel go as the robot turns in place
  const over = new THREE.Group();
  over.position.set(TURN[0], FLOOR + 0.0006, TURN[2]);
  const mat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const SEG = 96;
  // arcs from straight ahead (+z) towards the robot's left (+x), the way a left turn swings them
  const arc = (r, w, m) => new THREE.Mesh(new THREE.RingGeometry(r - w / 2, r + w / 2, SEG, 1, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), m);
  const otosM = mat(RED), dowelM = mat(TAN), crossM = mat(ORANGE);
  const otosArc = arc(OTOS_R, 0.0022, otosM), dowelArc = arc(DOWEL_R, 0.0016, dowelM);
  const bar = (a, b, m) => new THREE.Mesh(new THREE.PlaneGeometry(a, b).rotateX(-Math.PI / 2), m);
  over.add(otosArc, dowelArc, bar(0.02, 0.002, crossM), bar(0.002, 0.02, crossM));
  over.children.forEach((m) => { m.renderOrder = 3; });
  over.visible = false;
  stage.scene.add(over);

  const ov = labelLayer(stage);
  const W = (p) => bot.obj.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
  const LB = [
    [
      { t: 'Angle signal on the servo side', p: [0.0016, 0.045, 0.004] },
      { t: '2.5 : 1', p: [-0.0331, 0.012, 0.03] },
      { t: 'Wheel', p: [0.0198, AXLE[0] - 0.012, AXLE[1] + 0.012], side: 'l', minW: 460 },
    ],
    [
      { t: 'SparkFun OTOS', p: [CX, FLOOR + 0.011, OTOS_Z], c: RED },
      { t: 'Front caster', p: [CX, FLOOR, 0.0828], side: 'l' },
      { t: 'Rear caster', p: [CX, FLOOR, -0.0299], side: 'l', minW: 460 },
      { t: 'Wheel axis', p: [CX + B + 0.004, AXLE[0], AXLE[1]], minW: 460 },
    ],
    [
      { t: 'Turning point', p: [CX, FLOOR, AXLE[1]], c: ORANGE, world: true },
    ],
  ].map((list) => list.map((d) => ({ ...d, l: ov.label(d.t, W(d.p).toArray(), { color: d.c || '#fff1e2', side: d.side, minW: d.minW }) })));
  // step 2 labels ride with the parts they name
  const otosL = ov.label('OTOS, 30.3 mm ahead', W([CX, FLOOR + 0.012, OTOS_Z]).toArray(), { color: RED });
  const dowelL = ov.label('Dowel, 80 mm ahead', W([CX, FLOOR + 0.05, DOWEL_Z]).toArray(), { color: TAN, side: 'l' });

  // the real sensor, as a print over the stage (step 1)
  const inset = document.createElement('figure');
  Object.assign(inset.style, { position: 'absolute', right: '14px', bottom: '14px', width: 'min(32%, 250px)', margin: '0', opacity: '0', zIndex: '2', pointerEvents: 'none' });
  inset.innerHTML = `<img alt="The underside of the robot: the red OTOS between the gears and the front caster" decoding="async" style="display:block;width:100%;border-radius:12px;box-shadow:0 20px 40px -20px rgba(0,0,0,.9)"><figcaption style="margin-top:6px;font-size:12px;color:#b8b0a7">The real one</figcaption>`;
  inset.querySelector('img').src = ctx.asset(`/assets/media/${ctx.slug}/photo-otos-underside-s.webp`);
  el.appendChild(inset);

  // readouts: the first code's arithmetic (step 0), the offset (step 2)
  const hud0 = document.createElement('div');
  hud0.className = 'rx-hud';
  Object.assign(hud0.style, { width: 'min(250px, calc(100% - 28px))', opacity: '0' });
  hud0.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center">
      <svg viewBox="-50 -50 100 100" width="74" height="74" aria-hidden="true" style="flex:none">
        <circle r="44" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="3"/>
        <circle r="44" fill="none" stroke="${ORANGE}" stroke-width="3" data-k="rim" style="opacity:0"/>
        <path d="M0 -44 V -36 M44 0 H36 M0 44 V36 M-44 0 H-36" stroke="rgba(255,255,255,.4)" stroke-width="2"/>
        <line x1="0" y1="0" x2="0" y2="-38" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round" data-k="needle"/>
        <circle r="4" fill="#eee9e3"/>
      </svg>
      <div style="flex:1">
        <div class="rx-hud-row"><span>Angle</span><b class="num" data-k="ang"></b></div>
        <div class="rx-hud-row"><span>On A0</span><b class="num" data-k="v"></b></div>
      </div>
    </div>
    <div class="rx-hud-row" style="margin-top:8px"><span>Wheel turns, x 2.5</span><b class="num" data-k="wt"></b></div>
    <div class="rx-hud-row rx-hud-big"><span>Distance</span><b class="num" data-k="d"></b></div>`;
  const hud2 = document.createElement('div');
  hud2.className = 'rx-hud';
  Object.assign(hud2.style, { width: 'min(270px, calc(100% - 28px))', opacity: '0' });
  hud2.innerHTML = `
    <div class="rx-hud-row"><span>Heading</span><b class="num" data-k="h"></b></div>
    <div class="rx-hud-row"><span>Sensor has moved</span><b class="num" data-k="arc"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Dowel has moved</span><b class="num" data-k="darc"></b></div>
    <div class="rx-hud-row rx-hud-big"><span>Reported x, y</span><b class="num">0, 0 mm</b></div>
    <div class="rx-hud-x" style="margin-top:8px;font:12px/1.4 ui-monospace,Menlo,monospace;color:#eee9e3">setOffset({0, 0.0303 m, -90°})</div>`;
  ov.layer.append(hud0, hud2);
  const o0 = readout(hud0), o2 = readout(hud2);
  const shown = {};
  const fadeEl = (key, node, a) => { a = Math.round(a * 100) / 100; if (shown[key] !== a) { node.style.opacity = String(a); shown[key] = a; } };
  let groundOn = true;

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    stage.setShift(...ctx.shift());
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const A = STEPS[prev], Bs = STEPS[step];
    for (const [g, list] of Object.entries(G)) {
      const oa = A.a[g] ?? 1, ob = Bs.a[g] ?? 1;
      const ta = A.tint[g], tb = Bs.tint[g];
      const tint = tb || ta || '';
      const tk = step === prev ? (tb ? 1 : 0) : ta && tb ? 1 : tb ? k : ta ? 1 - k : 0;
      bot.look(list, { opacity: step === prev ? ob : lerp(oa, ob, k), tint, k: tk });
    }
    // the floor is in the way of a view from below
    const groundWanted = step === 1 ? false : step === 2 ? k > 0.35 : true;
    if (groundWanted !== groundOn) { stage.ground.visible = groundWanted; groundOn = groundWanted; stage.invalidate(); }

    // step 0: the servo side turns 1.6 times, the wheel four times
    const s0 = step === 0 ? (reduced ? 1 : smooth(0.1, 0.9, stepP)) : 1;
    const servoTurns = SERVO_TURNS * s0;
    const wheel = servoTurns * 2.5 * 2 * Math.PI;
    // step 2: half a turn to the left, in place
    const psi = step === 2 ? Math.PI * (reduced ? 1 : smooth(0.1, 0.9, stepP)) : 0;
    bot.carrier.rotation.y = psi;
    bot.carrier.updateWorldMatrix(true, true);
    bot.drive(wheel - (psi * B) / R, wheel + (psi * B) / R);
    stage.invalidate();

    // floor marks
    const oa = step === 2 ? k : 0;
    otosM.opacity = 0.95 * oa; dowelM.opacity = 0.85 * oa; crossM.opacity = oa;
    over.visible = oa > 0.01;
    const idx = (m, f) => m.geometry.setDrawRange(0, Math.round(SEG * clamp(f, 0, 1)) * 6);
    idx(otosArc, psi / Math.PI); idx(dowelArc, psi / Math.PI);

    const va = V.get(prev, VIEW[prev]), vb = V.get(step, VIEW[step]);
    const drift = reduced ? 0 : (stepP - 0.5) * 0.1;
    V.place(va, vb, k, step === 0 ? drift : lerp(0, drift, k));

    LB.forEach((list, i) => {
      const s = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === prev && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
      for (const d of list) { d.l.a = s; if (s > 0 && !d.world) d.l.p.copy(W(d.p)); }
    });
    const s2 = step === 2 ? smooth(0.5, 1, k) : 0;
    otosL.a = s2; dowelL.a = s2;
    if (s2 > 0) { otosL.p.copy(W([CX, FLOOR + 0.012, OTOS_Z])); dowelL.p.copy(W([CX, 0.02, DOWEL_Z])); }

    fadeEl('inset', inset, step === 1 ? smooth(0.3, 0.7, k) : step === 2 ? 1 - smooth(0, 0.3, stepP) : 0);
    fadeEl('h0', hud0, step === 0 ? 1 : step === 1 ? 1 - smooth(0, 0.3, stepP) : 0);
    fadeEl('h2', hud2, step === 2 ? k : 0);

    // the first code's arithmetic: angle 0..360 on the servo side (0 to 3.3 V), times 2.5 for the
    // wheel, unwrapped at 360 back to 0, times the wheel's circumference
    const ang = (servoTurns * 360) % 360;
    o0.put('ang', `${ang.toFixed(0)}°`);
    o0.put('v', `${((ang / 360) * 3.3).toFixed(2)} V`);
    o0.style('needle', 'transform', `rotate(${ang.toFixed(1)}deg)`);
    o0.style('rim', 'opacity', ang < 14 && servoTurns > 0.5 ? '1' : '0'); // the wrap from 360 back to 0
    o0.put('wt', `${(servoTurns * 2.5).toFixed(2)}`);
    o0.put('d', `${(servoTurns * 2.5 * Math.PI * D_CM).toFixed(1)} cm`);
    const deg = (psi * 180) / Math.PI;
    o2.put('h', `${deg.toFixed(0)}° left`);
    o2.put('arc', `${(OTOS_R * psi * 1000).toFixed(0)} mm`);
    o2.put('darc', `${(DOWEL_R * psi * 1000).toFixed(0)} mm`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); inset.remove(); stage.ground.visible = true; stage.dispose(); } };
}
