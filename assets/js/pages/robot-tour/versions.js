// "Belts to gears", scroll-driven, both of Jerry's CAD versions on one stage (they share one frame of
// reference: the same axes, the same floor).
// Steps: 0 V1, the belted drive (60T and 20T GT2 pulleys, 3 : 1), 1 where the belt ran (fixed
// centres, the pulley shaft in a third bearing in the printed frame), 2 V2 dissolves in: a 40T gear
// on the servo hub and a 16T on the axle on the same 33 mm centres, 3 both robots side by side, each
// servo turning exactly one turn: V1's wheels turn 3 times, V2's 2.5 times.
// Pulleys, gears and wheels turn about their real axes (rig.js). Every picture is a pure function
// of the scroll position; views are framed once with both robots at rest.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, views, frameBox, readout, smooth, clamp, lerp, R, AXLE, SERVO, FLOOR, TURN, DOWEL_Z } from './rig.js';

const ORANGE = '#ff6b35', BLUE = '#3d8bff', RED = '#ef4444';
const APART = 0.28; // V1 stands this far to V2's left in step 3

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
  const [V1, V2] = await Promise.all([loadRobot(stage, 'belted'), loadRobot(stage, 'geared')]);

  // every part of each model in exactly one list (looks are keyed by these arrays)
  function groups(bot) {
    const { parts: P, S, bearing } = bot;
    const third = [bearing.L.third, bearing.R.third].filter(Boolean);
    const plain = (s) => S.bearings[s].filter((b) => !third.includes(b));
    return {
      frame: P.frame, beams: P.beams, deck: [...P.arduino, ...P.battery], nose: [...P.casters, ...P.otos, ...P.dowel],
      bodyL: [...S.servo.L, ...S.standoffs.L, ...plain('L'), ...S.hub.L, ...S.axle.L, ...S.wheel.L],
      bodyR: [...S.servo.R, ...S.standoffs.R, ...plain('R'), ...S.hub.R, ...S.axle.R, ...S.wheel.R],
      bigL: S.big.L, bigR: S.big.R, smallL: S.small.L, smallR: S.small.R,
      beltL: S.belt.L, beltR: S.belt.R,
      thirdL: bearing.L.third ? [bearing.L.third] : [], thirdR: bearing.R.third ? [bearing.R.third] : [],
    };
  }
  const GB = groups(V1), GG = groups(V2);
  const inner = { deck: 0, beams: 0, nose: 0.25 };
  // per step: which version shows (fade of V1; V2 is the rest), each list's opacity and tint
  const STEPS = [
    { v1: 1, a: { ...inner, frame: 0.12 }, tint: { bigL: ORANGE, bigR: ORANGE, smallL: BLUE, smallR: BLUE } },
    { v1: 1, a: { ...inner, frame: 0.1, bodyR: 0, bigR: 0, smallR: 0, beltR: 0, thirdR: 0 }, tint: { thirdL: RED, bigL: ORANGE, smallL: BLUE } },
    { v1: 0, a: { ...inner, frame: 0.1, bodyR: 0, bigR: 0, smallR: 0, beltR: 0, thirdR: 0 }, tint: { bigL: ORANGE, smallL: BLUE } },
    { v1: 1, both: true, a: {}, tint: {} },
  ];

  // both robots at rest, and in step 3 V1 to V2's left; the ground covers every place they drive to
  V1.carrier.position.set(TURN[0] + APART, TURN[1], TURN[2] + 0.34);
  stage.fitGround();
  V1.carrier.position.set(...TURN);
  const rest = (fn) => {
    const a = V1.carrier.position.clone(), b = V2.carrier.position.clone();
    V1.carrier.position.set(...TURN); V2.carrier.position.set(...TURN);
    stage.root.updateWorldMatrix(true, true);
    try { return fn(); } finally { V1.carrier.position.copy(a); V2.carrier.position.copy(b); stage.root.updateWorldMatrix(true, true); }
  };
  const V = views(stage, el, rest);
  const driveParts = (G) => [...G.bodyL, ...G.bodyR, ...G.bigL, ...G.bigR, ...G.smallL, ...G.smallR];
  const pulleyL = [...GB.bigL, ...GB.smallL, ...GB.beltL, ...GB.thirdL];
  const side = frameBox(THREE, [TURN[0] - 0.075, FLOOR, TURN[2] - 0.08], [TURN[0] + APART + 0.075, 0.08, TURN[2] + 0.09 + 0.34]);
  const VIEW = [
    () => stage.frame(driveParts(GB), { azimuth: 22, elevation: 34, pad: 1.5, apply: false, refresh: true }),
    () => stage.frame(pulleyL, { azimuth: -74, elevation: 12, pad: 2.1, apply: false, refresh: true }),
    () => stage.frame(pulleyL, { azimuth: -80, elevation: 8, pad: 2.1, apply: false, refresh: true }),
    () => stage.frame(side, { azimuth: -90, elevation: 40, pad: 1.4, apply: false, refresh: true }),
  ];

  // the centre distance: a dimension between the two axes in the plane of the left gears (step 2)
  const over = new THREE.Group();
  const lm = new THREE.MeshBasicMaterial({ color: '#f4efe8', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const a0 = new THREE.Vector3(-0.0331, AXLE[0], AXLE[1]), a1 = new THREE.Vector3(-0.0331, SERVO[0], SERVO[1]);
  const len = a0.distanceTo(a1);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.0005, 0.0005, len, 8), lm);
  rod.position.copy(a0).lerp(a1, 0.5);
  rod.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), a1.clone().sub(a0).normalize());
  const dot = (p) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0011, 12, 8), lm); m.position.copy(p); return m; };
  over.add(rod, dot(a0), dot(a1));
  over.renderOrder = 5;
  over.children.forEach((m) => { m.renderOrder = 5; });
  over.visible = false;
  // the start line under both dowels (step 3)
  const sm = new THREE.MeshBasicMaterial({ color: '#f4efe8', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const startLine = new THREE.Mesh(new THREE.PlaneGeometry(APART + 0.2, 0.0025).rotateX(-Math.PI / 2), sm);
  startLine.position.set(TURN[0] + APART / 2, FLOOR + 0.0005, DOWEL_Z);
  startLine.visible = false;
  stage.scene.add(over, startLine);

  // labels, pinned to points in each model
  const ov = labelLayer(stage);
  const W = (bot, p) => bot.obj.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
  const LB = [
    [
      { b: V1, t: '60T pulley', p: [-0.0335, SERVO[0] + 0.021, SERVO[1]], c: ORANGE },
      { b: V1, t: '20T pulley', p: [-0.0298, AXLE[0] - 0.008, AXLE[1] + 0.004], c: BLUE, side: 'l' },
      { b: V1, t: 'GT2 belt, 150 mm', p: [-0.0636, 0.012, 0.03], side: 'l', minW: 480 },
    ],
    [
      { b: V1, t: 'Third bearing', p: [-0.0404, SERVO[0] + 0.006, SERVO[1]], c: RED, side: 'l' },
      { b: V1, t: '60T', p: [-0.0335, SERVO[0] + 0.021, SERVO[1] - 0.004], c: ORANGE },
      { b: V1, t: '20T', p: [-0.0298, AXLE[0] - 0.008, AXLE[1] + 0.004], c: BLUE },
      { b: V1, t: 'Belt: fixed centres, no tensioner', p: [-0.0329, 0.0115, 0.034], minW: 480 },
    ],
    [
      { b: V2, t: '40T on the servo hub', p: [-0.0331, SERVO[0] + 0.025, SERVO[1]], c: ORANGE },
      { b: V2, t: '16T on the axle', p: [-0.0331, AXLE[0] - 0.0115, AXLE[1]], c: BLUE, side: 'l' },
      { b: V2, t: '33 mm, same as the belt', p: [-0.0331, (AXLE[0] + SERVO[0]) / 2, (AXLE[1] + SERVO[1]) / 2 + 0.003] },
    ],
    [
      { b: V1, t: 'V1, belts', p: [-0.048, 0.1, 0.03] },
      { b: V2, t: 'V2, gears', p: [-0.048, 0.1, 0.03] },
    ],
  ].map((list) => list.map((d) => ({ ...d, l: ov.label(d.t, W(d.b, d.p).toArray(), { color: d.c || '#fff1e2', side: d.side, minW: d.minW }) })));

  // the real belt, as a print over the stage (step 1)
  const inset = document.createElement('figure');
  Object.assign(inset.style, { position: 'absolute', right: '14px', top: '14px', width: 'min(24%, 250px)', margin: '0', opacity: '0', zIndex: '2', pointerEvents: 'none' });
  inset.innerHTML = `<img alt="Version 1 in my hand: a servo and its belt" decoding="async" style="display:block;width:100%;border-radius:12px;box-shadow:0 20px 40px -20px rgba(0,0,0,.9)"><figcaption style="margin-top:6px;font-size:12px;color:#b8b0a7">The real belt, Dec 29, 2024</figcaption>`;
  inset.querySelector('img').src = ctx.asset(`/assets/media/${ctx.slug}/photo-v1-belt-side-s.webp`);
  el.appendChild(inset);

  // the comparison (step 3)
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  Object.assign(hud.style, { opacity: '0', width: 'min(340px, calc(100% - 28px))' });
  hud.innerHTML = `
    <table class="num"><thead><tr><th></th><th>Servo</th><th>Wheel</th><th>Rolled</th></tr></thead><tbody>
      <tr><td>V1, belts <small>60T : 20T</small></td><td data-k="s1"></td><td data-k="w1"></td><td data-k="d1"></td></tr>
      <tr><td>V2, gears <small>40T : 16T</small></td><td data-k="s2"></td><td data-k="w2"></td><td data-k="d2"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>V2 at the wheel</span><b>17% slower, 20% more torque</b></div>`;
  ov.layer.append(hud);
  const out = readout(hud);
  const shown = { inset: -1, hud: -1 };
  const fadeEl = (key, node, a) => { a = Math.round(a * 100) / 100; if (shown[key] !== a) { node.style.opacity = String(a); shown[key] = a; } };

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    // in the last step the readout sits top right: the two robots sit a little lower
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy - (step === 3 ? 0.07 * (reduced ? 1 : smooth(0, 0.45, stepP)) : 0));
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const A = STEPS[prev], Bs = STEPS[step];
    // which version shows: V1 fades out in step 2; in step 3 both show, V1 fading in beside V2
    const f1 = step === 3 ? k : step === prev ? Bs.v1 : lerp(A.v1, Bs.v1, k);
    const f2 = step === 3 ? 1 : 1 - f1;
    for (const [bot, G, f] of [[V1, GB, f1], [V2, GG, f2]]) {
      for (const [g, list] of Object.entries(G)) {
        const oa = A.a[g] ?? 1, ob = Bs.a[g] ?? 1;
        const o = step === prev ? ob : lerp(oa, ob, k);
        const [tint, tk] = tintOf(A.tint[g], Bs.tint[g], k, step === prev);
        bot.look(list, { opacity: o * f, tint, k: tk });
      }
    }

    // motion: the drive turns with the scroll; in step 3 each servo turns exactly once
    let w1 = 0, w2 = 0, n = 0;
    if (step <= 1) w1 = reduced ? 0 : 2 * (step + stepP); // V1 wheels, turns
    else if (step === 2) { w1 = 4; w2 = reduced ? 0 : 1.6 * smooth(0.45, 1, stepP); }
    else n = reduced ? 1 : smooth(0.5, 0.95, stepP);
    if (step === 3) { w1 = 3 * n; w2 = 2.5 * n; }
    const s1 = step === 3 ? w1 * Math.PI * 2 * R : 0, s2 = step === 3 ? w2 * Math.PI * 2 * R : 0;
    // V1 stands to V2's left in step 3 (it slides there while it fades in)
    const off = step === 3 ? 1 : 0;
    V1.carrier.position.set(TURN[0] + APART * off, TURN[1], TURN[2] + s1);
    V2.carrier.position.set(TURN[0], TURN[1], TURN[2] + s2);
    stage.root.updateWorldMatrix(true, true);
    V1.drive(w1 * 2 * Math.PI); V2.drive(w2 * 2 * Math.PI);
    stage.invalidate();

    // overlays
    const oa = step === 2 ? smooth(0.3, 0.6, stepP) : 0;
    lm.opacity = 0.95 * oa; over.visible = oa > 0.01;
    const sa = step === 3 ? k : 0;
    sm.opacity = 0.7 * sa; startLine.visible = sa > 0.01;

    // camera
    const va = V.get(prev, VIEW[prev]), vb = V.get(step, VIEW[step]);
    const drift = reduced ? 0 : (stepP - 0.5) * 0.1;
    V.place(va, vb, k, step === 0 ? drift : lerp(0, drift, k));

    LB.forEach((list, i) => {
      const s = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === prev && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
      for (const d of list) { d.l.a = s; if (s > 0) d.l.p.copy(W(d.b, d.p)); }
    });
    fadeEl('inset', inset, step === 1 ? smooth(0.3, 0.7, k) : step === 2 ? 1 - smooth(0, 0.3, stepP) : 0);
    fadeEl('hud', hud, step === 3 ? k : 0);
    const turns = (x) => `${x.toFixed(2)}`;
    out.put('s1', turns(n)); out.put('s2', turns(n));
    out.put('w1', turns(w1 * (step === 3 ? 1 : 0))); out.put('w2', turns(w2 * (step === 3 ? 1 : 0)));
    out.put('d1', `${(s1 * 100).toFixed(1)} cm`); out.put('d2', `${(s2 * 100).toFixed(1)} cm`);
    out.put('mini', `One servo turn: V1 ${(s1 * 100).toFixed(1)} cm, V2 ${(s2 * 100).toFixed(1)} cm`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); inset.remove(); stage.dispose(); } };
}
