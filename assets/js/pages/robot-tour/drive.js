// "How the drive works", scroll-driven, on Jerry's final (geared) CAD.
// Steps: 0 both drive modules in the frame, 1 one module and its 2.5 : 1 gear stage (with a turn
// counter), 2 a section along the axle (two flanged bearings carry the axle; the wheel and the 16T
// gear sit between them), 3 the robot turning in place about the middle of the axle.
// Every part turns about its real axis in the CAD (rig.js); every picture is a pure function of the
// scroll position, and views are framed once with the robot at rest.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, views, frameBox, readout, smooth, clamp, lerp, R, B, AXLE, SERVO, CX, FLOOR, TURN } from './rig.js';

const ORANGE = '#ff6b35', BLUE = '#3d8bff', GREEN = '#22c55e';
const WHEEL_D_CM = 1.375 * 2.54;

// wheel turns as a function of the scroll (u = step + progress through it): a slow roll, then in
// step 1 exactly one servo turn (2.5 wheel turns) for the counter, then a slow roll, then still
const S1 = [0.08, 0.92];
function wheelTurns(u) {
  const step = Math.floor(u), f = u - step;
  if (step <= 0) return 0.6 * f;
  if (step === 1) return 0.6 + 2.5 * smooth(S1[0], S1[1], f);
  if (step === 2) return 3.1 + 0.4 * f;
  return 3.5;
}

function tintOf(ta, tb, k, same) {
  if (same) return tb ? [tb, 1] : ['', 0];
  if (ta && tb && ta === tb) return [ta, 1];
  if (tb && (!ta || k >= 0.5)) return [tb, ta ? (k - 0.5) * 2 : k];
  if (ta) return [ta, tb ? 1 - 2 * k : 1 - k];
  return ['', 0];
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const bot = await loadRobot(stage, 'geared');
  const { parts: P, S, bearing } = bot;
  stage.fitGround();

  // stable part lists (looks are keyed by these arrays)
  const G = {
    frame: P.frame, beams: P.beams, deck: [...P.arduino, ...P.battery], nose: [...P.casters, ...P.otos, ...P.dowel],
    moduleR: [...S.servo.R, ...S.standoffs.R, ...S.bearings.R, ...S.hub.R, ...S.axle.R, ...S.wheel.R],
    bigR: S.big.R, smallR: S.small.R,
    moduleL: [...S.servo.L, ...S.standoffs.L, ...S.hub.L, ...S.axle.L, ...S.wheel.L],
    bearingsL: S.bearings.L, bigL: S.big.L, smallL: S.small.L,
  };
  // per step: opacity of each list (default 1) and tints
  const STEPS = [
    { a: { frame: 0.2, beams: 0.35, deck: 0.35, nose: 0.5 }, tint: { bigL: ORANGE, bigR: ORANGE, smallL: BLUE, smallR: BLUE } },
    { a: { frame: 0, beams: 0, deck: 0, nose: 0.1, moduleR: 0, bigR: 0, smallR: 0 }, tint: { bigL: ORANGE, smallL: BLUE } },
    { a: {}, tint: { bearingsL: GREEN, smallL: BLUE } },
    { a: { frame: 0.28, beams: 0.4, deck: 0.22 }, tint: {} },
  ];

  // views, framed once with the robot at rest
  const rest = (fn) => {
    const r = bot.carrier.rotation.y;
    bot.carrier.rotation.y = 0; bot.carrier.updateWorldMatrix(true, true);
    try { return fn(); } finally { bot.carrier.rotation.y = r; bot.carrier.updateWorldMatrix(true, true); }
  };
  const V = views(stage, el, rest);
  const moduleL = [...S.servo.L, ...S.hub.L, ...S.big.L, ...S.small.L, ...S.wheel.L, ...S.axle.L];
  const axleL = [bearing.L.outer, bearing.L.inner, ...S.small.L, ...S.wheel.L, ...S.axle.L].filter(Boolean);
  const axleWide = [...axleL, ...S.servo.L, ...S.big.L, ...S.bearings.R];
  // every heading the robot turns through: a box round its bounding circle about the turning point
  const turnBox = frameBox(THREE, [TURN[0] - 0.11, FLOOR, TURN[2] - 0.11], [TURN[0] + 0.11, 0.09, TURN[2] + 0.11]);
  const VIEW = [
    () => stage.frame(stage.root, { azimuth: 32, elevation: 24, pad: 1.12, apply: false, refresh: true }),
    () => stage.frame(moduleL, { azimuth: -62, elevation: 16, pad: 1.18, apply: false, refresh: true }),
    () => stage.frame(axleWide, { azimuth: 16, elevation: 12, pad: 1.3, apply: false, refresh: true }),
    () => stage.frame(turnBox, { azimuth: 18, elevation: 64, pad: 1.02, apply: false, refresh: true }),
  ];

  // the section along the axle (step 2): keeps z <= the axle line, seen from the front
  let cut = null;
  const axleZ = AXLE[1]; // world z of the axle line with the robot at rest (the carrier sits on it)
  function setCut(amount) {
    if (amount <= 0.001) { if (cut) cut.set(1e3); return; }
    if (!cut) cut = stage.sectionPlane([0, 0, -1], 1e3);
    cut.set(lerp(0.16, axleZ, amount));
  }

  // floor marks for the turn (step 3): the track width and the turning point, riding with the robot
  const over = new THREE.Group();
  const mat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const lineM = mat('#f4efe8'), crossM = mat(ORANGE);
  const bar = (len, w, m) => new THREE.Mesh(new THREE.PlaneGeometry(len, w).rotateX(-Math.PI / 2), m);
  const dim = bar(2 * B, 0.0014, lineM);
  const tickA = bar(0.0014, 0.014, lineM); tickA.position.x = -B;
  const tickB = bar(0.0014, 0.014, lineM); tickB.position.x = B;
  const cx1 = bar(0.02, 0.002, crossM), cx2 = bar(0.002, 0.02, crossM);
  over.add(dim, tickA, tickB, cx1, cx2);
  over.children.forEach((m) => { m.position.y = 0.0006; m.renderOrder = 3; });
  over.position.set(TURN[0], FLOOR, TURN[2]);
  over.visible = false;
  stage.scene.add(over);

  const ov = labelLayer(stage);
  const W = (p) => bot.obj.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
  const lp = (o, dx = 0, dy = 0, dz = 0) => {
    const c = bot.obj.worldToLocal(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()));
    return [c.x + dx, c.y + dy, c.z + dz];
  };
  const LB = [
    [ // 0
      { t: 'Left drive module', p: lp(S.servo.L[0], 0.004, 0.03, -0.01) },
      { t: 'Right drive module', p: lp(S.servo.R[0], -0.004, 0.03, -0.01), side: 'l' },
    ],
    [ // 1
      { t: 'Axon MINI servo', p: lp(S.servo.L[0], 0.004, 0.02, -0.012), side: 'l' },
      { t: '40T on the servo hub', p: [-0.0331, SERVO[0] + 0.024, SERVO[1]], c: ORANGE },
      { t: '16T on the axle', p: [-0.0331, AXLE[0] - 0.011, AXLE[1] + 0.006], c: BLUE },
      { t: 'Wheel, 1-3/8 in', p: [0.0116, AXLE[0] - 0.014, AXLE[1] + 0.012], side: 'l', minW: 460 },
    ],
    [ // 2
      { t: 'Bearing in the side plate', p: lp(bearing.L.outer, 0.001, 0.007, 0), c: GREEN, side: 'l' },
      { t: 'Inboard bearing', p: lp(bearing.L.inner, 0, 0.007, 0), c: GREEN },
      { t: '6 mm axle', p: [-0.014, AXLE[0] - 0.003, AXLE[1]], side: 'l', minW: 460 },
      { t: '16T', p: [-0.0331, AXLE[0] - 0.011, AXLE[1]], c: BLUE },
      { t: 'Wheel', p: [0.0116, AXLE[0] - 0.017, AXLE[1]] },
    ],
    [ // 3
      { t: 'Turning point', p: [CX, FLOOR, AXLE[1]], c: ORANGE },
      { t: '120 mm', p: [CX + B, FLOOR, AXLE[1]], minW: 420 },
    ],
  ].map((list) => list.map((d) => ({ ...d, l: ov.label(d.t, W(d.p).toArray(), { color: d.c || '#fff1e2', side: d.side, minW: d.minW }) })));

  // the ratio counter (step 1)
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.style.width = 'min(240px, calc(100% - 28px))';
  hud.style.opacity = '0';
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Servo and 40T</span><b class="num" data-k="s"></b></div>
    <div class="rx-hud-row"><span>Wheel and 16T</span><b class="num" data-k="w"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Wheel travel</span><b class="num" data-k="d"></b></div>
    <div class="rx-hud-row rx-hud-big"><span>40 / 16</span><b class="num">2.5 : 1</b></div>`;
  ov.layer.append(hud);
  const out = readout(hud);
  let hudShown = -1;

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    stage.setShift(...ctx.shift());
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const A = STEPS[prev], Bs = STEPS[step];
    for (const [g, list] of Object.entries(G)) {
      const oa = A.a[g] ?? 1, ob = Bs.a[g] ?? 1;
      const [tint, tk] = tintOf(A.tint[g], Bs.tint[g], k, step === prev);
      bot.look(list, { opacity: step === prev ? ob : lerp(oa, ob, k), tint, k: tk });
    }
    // the section only in step 2 (it slides back out as step 3 begins)
    setCut(step === 2 ? k : step === 3 && !reduced ? 1 - k : 0);

    // wheels roll with the scroll; in the last step the robot turns in place instead
    const u = step + stepP;
    const w = reduced ? [0, 0.6, 3.1, 3.5][step] + (step === 1 ? 2.5 : 0) : wheelTurns(u);
    const roll = w * 2 * Math.PI;
    const psi = step === 3 ? (Math.PI / 2) * (reduced ? 1 : smooth(0.12, 0.9, stepP)) : 0;
    bot.carrier.rotation.y = psi;
    bot.carrier.updateWorldMatrix(true, true);
    // turning left in place: the left wheel rolls back by psi * b, the right one forward by as much
    bot.drive(roll - (psi * B) / R, roll + (psi * B) / R);
    over.rotation.y = psi;
    const ovA = step === 3 ? k : 0;
    lineM.opacity = 0.9 * ovA; crossM.opacity = ovA;
    over.visible = ovA > 0.01;
    stage.invalidate();

    // camera
    const va = V.get(prev, VIEW[prev]), vb = V.get(step, VIEW[step]);
    const drift = reduced ? 0 : (stepP - 0.5) * 0.12;
    V.place(va, vb, k, step === 0 ? drift : lerp(0, drift, k));

    // labels: the old set leaves before the new one arrives
    LB.forEach((list, i) => {
      const s = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === prev && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
      for (const d of list) { d.l.a = s; if (s > 0) d.l.p.copy(W(d.p)); }
    });

    // the counter: one servo turn is two and a half wheel turns
    const hudA = Math.round((step === 1 ? k : step === 2 ? 1 - smooth(0, 0.3, stepP) : 0) * 100) / 100;
    if (hudA !== hudShown) { hud.style.opacity = String(hudA); hudShown = hudA; }
    const wt = clamp(w - 0.6, 0, 2.5);
    out.put('s', `${(wt / 2.5).toFixed(2)} turns`);
    out.put('w', `${wt.toFixed(2)} turns`);
    out.put('d', `${(wt * Math.PI * WHEEL_D_CM).toFixed(1)} cm`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
