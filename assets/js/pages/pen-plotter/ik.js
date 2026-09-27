// "Cartesian in, two angles out": my inverse kinematics drawn as it computes. The pen target moves
// with the scroll; for every target the two isosceles triangles (motor, elbow, pen) are drawn with
// the numbers my code works out (computeAll5BarSolutions + selectBestSolution in kin.js): D, the
// angle phi of the line to the pen, the half-angle alpha, and the motor angles. Later steps show the
// second solution of each arm and what the code does with a target out of reach. Pure function of
// the scroll.
import * as K from './kin.js';
import { createFlat } from './flat.js';

// the pen target along the scroll: one stretch per step (code mm)
const LEGS = [
  [[50, 186.6], [21.7, 151]],
  [[21.7, 151], [-12, 138]],
  [[-12, 138], [82, 132]],
  [[82, 132], [45, 122]],
  [[45, 122], [-160, 118]],
];
const f1 = (v) => v.toFixed(1).padStart(6);

export async function mount(el, ctx) {
  const F = createFlat(el, {
    label: 'Top view of the linkage with the two triangles the inverse kinematics solves',
    region: [-92, 196, -28, 205],
    margin: (w) => (w < 640 ? [0.34, 0.03, 0.02, 0.03] : [0.04, 0.03, 0.04, 0.3]),
  });
  const drawGrid = F.grid(-90, 190, -20, 200);
  const g = F.layer('main');
  const reach = F.mk(g, 'path', 'reach');
  const triL = F.mk(g, 'polygon', 'tri-l'), triR = F.mk(g, 'polygon', 'tri-r');
  const dL = F.mk(g, 'line', 'dline l'), dR = F.mk(g, 'line', 'dline r');
  const phiL = F.mk(g, 'path', 'arc l phi'), alL = F.mk(g, 'path', 'arc l'), phiR = F.mk(g, 'path', 'arc r phi'), alR = F.mk(g, 'path', 'arc r');
  const ax = F.mk(g, 'line', 'axis'), ay = F.mk(g, 'line', 'axis');
  const drawMotors = F.motors(g);
  const ghost = F.linkage(g, 'ghost');
  const link = F.linkage(g);
  const target = F.mk(g, 'circle', 'target');
  const lab = {
    x: F.label('x'), y: F.label('y'),
    m1: F.label('Left motor (0, 0)'), m2: F.label('Right motor (100, 0)'),
    pen: F.label('Pen (x, y)'), D1: F.label('D1'), D2: F.label('D2'),
    phi1: F.label('φ1'), a1: F.label('α1'), phi2: F.label('φ2'), a2: F.label('α2'),
    ghost: F.label('Elbows in: also a solution'), out: F.label('Out of reach'),
  };
  for (const k of ['D1', 'phi1', 'a1']) lab[k].n.style.color = '#ff8a5c';
  for (const k of ['D2', 'phi2', 'a2']) lab[k].n.style.color = '#7fd4ff';
  const card = F.card('tl');

  // the reachable workspace (every point with a legal solution), traced once as an outline
  function reachPath() {
    const cells = [], step = 2;
    for (let x = -100; x <= 200; x += step) for (let y = -60; y <= 210; y += step) if (K.ik(x, y)) cells.push([x, y]);
    // an outline from the grid: for each column the lowest and highest reachable y
    const cols = new Map();
    for (const [x, y] of cells) { const c = cols.get(x) || [Infinity, -Infinity]; c[0] = Math.min(c[0], y); c[1] = Math.max(c[1], y); cols.set(x, c); }
    const xs = [...cols.keys()].sort((a, b) => a - b);
    const top = xs.map((x) => [x, cols.get(x)[1]]), bot = xs.map((x) => [x, cols.get(x)[0]]).reverse();
    return [...top, ...bot];
  }
  const outline = reachPath();

  // where the pen really is for target t on leg 4: the code holds the last reachable pose
  function heldOn(a, b, f) {
    const at = (u) => [K.lerp(a[0], b[0], u), K.lerp(a[1], b[1], u)];
    if (K.ik(...at(f))) return at(f);
    let lo = 0, hi = f;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (K.ik(...at(m))) lo = m; else hi = m; }
    return at(lo);
  }

  function setProgress(p, step, stepP) {
    const phone = F.W < 640;
    if (F.layout()) { drawGrid(); drawMotors(); F.attr(reach, 'd', `M${outline.map(F.pt).join('L')}Z`); }
    step = K.clamp(step | 0, 0, LEGS.length - 1);
    const [a, b] = LEGS[step];
    const f = K.smooth(0.08, 0.9, stepP);
    const want = [K.lerp(a[0], b[0], f), K.lerp(a[1], b[1], f)];
    const P = step === 4 ? heldOn(a, b, f) : want;
    const pose = K.pose(P[0], P[1]);
    const S = K.solutions(P[0], P[1]);
    const out = step === 4 && K.dist(P, want) > 0.5;

    link.set(pose);
    // the other solution (elbows in), from step 4 of the story on
    const alt = S && S.sols[1];
    const showGhost = step === 3 && alt;
    if (showGhost) { const [E1, E2] = K.elbows(alt.l, alt.r); ghost.set({ E1, E2, P }); } else ghost.set(null);
    F.show(reach, step === 4);

    // the triangles and their angles
    const O1 = [0, 0], O2 = [K.D, 0];
    const tri = step >= 1 && step <= 2;
    F.attr(triL, 'points', [O1, pose.E1, P].map(F.pt).join(' ')); F.show(triL, step === 1 || step === 3);
    F.attr(triR, 'points', [O2, pose.E2, P].map(F.pt).join(' ')); F.show(triR, step === 2 || step === 3);
    const line = (n, u, v) => { F.attr(n, 'x1', F.X(u[0]).toFixed(1)); F.attr(n, 'y1', F.Y(u[1]).toFixed(1)); F.attr(n, 'x2', F.X(v[0]).toFixed(1)); F.attr(n, 'y2', F.Y(v[1]).toFixed(1)); };
    line(dL, O1, P); F.show(dL, step === 1);
    line(dR, O2, P); F.show(dR, step === 2);
    F.attr(phiL, 'd', F.arcPath(O1, 30, 0, S.phi1)); F.attr(alL, 'd', F.arcPath(O1, 44, S.phi1, pose.l));
    F.attr(phiR, 'd', F.arcPath(O2, 30, 0, S.phi2)); F.attr(alR, 'd', F.arcPath(O2, 44, S.phi2, pose.r));
    F.show(phiL, step === 1); F.show(alL, step === 1); F.show(phiR, step === 2); F.show(alR, step === 2);
    line(ax, [0, 0], [34, 0]); line(ay, [0, 0], [0, 34]);
    F.attr(target, 'cx', F.X(want[0]).toFixed(1)); F.attr(target, 'cy', F.Y(want[1]).toFixed(1)); F.attr(target, 'r', 11);
    target.classList.toggle('out', out);

    // labels
    const D2R = Math.PI / 180;
    const polar = (c, r, deg) => [c[0] + r * Math.cos(deg * D2R), c[1] + r * Math.sin(deg * D2R)];
    lab.x.at([34, 0], 6, -2, step === 0 || step === 1 ? 1 : 0);
    lab.y.at([0, 34], 6, -24, step === 0 || step === 1 ? 1 : 0);
    lab.m1.text(phone ? '(0, 0)' : 'Left motor (0, 0)');
    lab.m1.at(O1, phone ? -52 : -150, 18, step === 0 ? 1 : 0);
    lab.m2.text(phone ? '(100, 0)' : 'Right motor (100, 0)');
    lab.m2.at(O2, 14, 18, step === 0 ? 1 : 0);
    lab.pen.at(want, 16, -30, step === 0 ? 1 : 0);
    lab.D1.at([P[0] * 0.55, P[1] * 0.55], 8, -10, step === 1 ? 1 : 0);
    lab.D2.at([K.lerp(K.D, P[0], 0.55), P[1] * 0.55], 8, -10, step === 2 ? 1 : 0);
    lab.phi1.at(polar(O1, 30, S.phi1 / 2), 4, -8, step === 1 && S.phi1 > 30 ? 1 : 0);
    lab.a1.at(polar(O1, 44, (S.phi1 + pose.l) / 2), 6, -14, step === 1 ? 1 : 0);
    lab.phi2.at(polar(O2, 30, S.phi2 / 2), 6, -14, step === 2 ? 1 : 0);
    lab.a2.at(polar(O2, 44, (S.phi2 + pose.r) / 2), -26, -16, step === 2 ? 1 : 0);
    if (showGhost) { const [E1] = K.elbows(alt.l, alt.r); lab.ghost.at(E1, 12, -12, 1); } else lab.ghost.at([0, 0], 0, 0, 0);
    lab.out.at(phone ? P : want, 14, -12, out ? 1 : 0);

    // the numbers, as the code computes them
    const x = P[0], y = P[1];
    const L1 = `<b>x = ${x.toFixed(1)} mm   y = ${y.toFixed(1)} mm</b>`;
    const left = [
      `<span class="l">Left arm</span>`,
      ` D1    = √(x² + y²)          = ${f1(S.D1)} mm`,
      ` φ1    = atan2(y, x)         = ${f1(S.phi1)}°`,
      ` α1    = acos(D1 / 200)      = ${f1(S.a1)}°`,
      ` <b>left  = φ1 + α1             = ${f1(pose.l)}°</b>`,
    ];
    const right = [
      `<span class="r">Right arm</span>`,
      ` D2    = √((x − 100)² + y²)  = ${f1(S.D2)} mm`,
      ` φ2    = atan2(y, x − 100)   = ${f1(S.phi2)}°`,
      ` α2    = acos(D2 / 200)      = ${f1(S.a2)}°`,
      ` <b>right = φ2 − α2             = ${f1(pose.r)}°</b>`,
    ];
    let lines;
    if (step === 0) lines = [L1, '', `left motor  <b>${f1(pose.l)}°</b>   ${K.steps(pose.l)} steps`, `right motor <b>${f1(pose.r)}°</b>   ${K.steps(pose.r)} steps`];
    else if (step === 1) lines = [L1, '', ...left, ...(phone ? [] : ['', ...right.map((r) => `<span style="opacity:.45">${r.replace(/<\/?b>/g, '')}</span>`)])];
    else if (step === 2) lines = [L1, '', ...(phone ? [] : [...left.map((r) => `<span style="opacity:.45">${r.replace(/<\/?b>/g, '')}</span>`), '']), ...right];
    else if (step === 3) {
      const s0 = S.sols[0], s1 = S.sols[1];
      const row = (n, s, on) => `${n}  left ${f1(s.l)}°  right ${f1(s.r)}°  left − right ${f1(s.l - s.r)}°${on ? '  <span class="g">kept</span>' : K.legal(s) ? '' : '  <span class="w">limit</span>'}`;
      lines = [L1, '', row('<b>elbows out</b>', s0, pose.idx === 0), row('elbows in ', s1, pose.idx === 1), '', 'limits: left 15° to 270°, right −90° to 165°'];
    } else {
      const Sw = K.solutions(want[0], want[1]);
      const D1w = Math.hypot(want[0], want[1]), D2w = Math.hypot(want[0] - K.D, want[1]);
      lines = [`<b>target x = ${want[0].toFixed(1)}   y = ${want[1].toFixed(1)} mm</b>`, '',
        ` D1 = ${f1(D1w)} mm   D2 = ${f1(D2w)} mm`,
        out || !Sw ? ` <span class="w">${D2w > 200 ? 'D2' : 'D1'} is more than 200 mm: out of reach</span>` : ' both under 200 mm: reachable',
        out ? ' the code holds the motors where they are' : '',
        '', `pen at x = ${x.toFixed(1)}   y = ${y.toFixed(1)} mm`];
    }
    card.html(lines.join('\n'));
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { F.dispose(); } };
}
