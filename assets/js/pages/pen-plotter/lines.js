// Two ways to draw a straight line, from my code. cartesianTest.ino (my first x-y program) solved
// the inverse kinematics only at the corners of the square and moved the motor angles in straight
// lines between them. cartesianPathing.ino (the final one) moves the target in a straight x-y line
// and solves the inverse kinematics again on every pass through the loop. The scroll runs the same
// edge both ways; the pen positions for the first way come from forward kinematics of the
// interpolated angles (kin.fk), so the bow is computed from my link lengths, not drawn by hand.
// The last step runs the bottom edge in motor angles, where the elbows would have to be further
// apart than two 100 mm forearms can reach. Pure function of the scroll.
import * as K from './kin.js';
import { createFlat, fkPose } from './flat.js';

const TL = [12.5, 150], TR = [87.5, 150], BR = [87.5, 75], BL = [12.5, 75];
const SQ = [TL, TR, BR, BL, TL];
const f1 = (v) => v.toFixed(1).padStart(6);

// one edge in motor angles: IK at both ends, angles linear between (cartesianTest's loop)
function jointEdge(a, b, n = 240) {
  const qa = K.ik(...a), qb = K.ik(...b);
  const out = [];
  let prev = a;
  for (let i = 0; i <= n; i++) {
    const t = i / n, l = K.lerp(qa.l, qb.l, t), r = K.lerp(qa.r, qb.r, t);
    const p = fkPose(l, r, prev);
    if (p.P) prev = p.P;
    out.push(p);
  }
  return { qa, qb, poses: out };
}
const offLine = (P, a, b) => { const vx = b[0] - a[0], vy = b[1] - a[1]; return Math.abs((P[0] - a[0]) * vy - (P[1] - a[1]) * vx) / Math.hypot(vx, vy); };

export async function mount(el, ctx) {
  const F = createFlat(el, {
    label: 'Top view: the top edge of the square drawn by interpolating motor angles, and by solving the inverse kinematics every loop',
    region: [-95, 195, -25, 170],
    margin: (w) => (w < 640 ? [0.3, 0.03, 0.02, 0.03] : [0.2, 0.03, 0.04, 0.03]),
  });
  const drawGrid = F.grid(-90, 190, -20, 170);
  const g = F.layer('main');
  const want = F.polyline(g, 'want');
  const bowInk = F.polyline(g, 'ink');
  const goodInk = F.polyline(g, 'ink good');
  const drawMotors = F.motors(g);
  const ghost = F.linkage(g, 'ghost');
  const link = F.linkage(g);
  const card = F.card('tl');
  const lab = { a: F.label('Corner (12.5, 150)'), b: F.label('Corner (87.5, 150)'), bow: F.label(''), gap: F.label('') };
  lab.gap.n.style.color = '#ff8a8a';

  const top = jointEdge(TL, TR);
  const bottom = jointEdge(BR, BL);
  const bowMax = Math.max(...top.poses.map((p) => offLine(p.P, TL, TR)));
  const gapMax = Math.max(...bottom.poses.map((p) => p.gap));
  const bowPts = top.poses.map((p) => p.P);
  const at = (u) => Math.round(K.clamp(u, 0, 1) * (top.poses.length - 1));

  function setProgress(p, step, stepP) {
    const phone = F.W < 640;
    if (F.layout()) { drawGrid(); drawMotors(); want.set(SQ); }
    step = K.clamp(step | 0, 0, 3);
    const u = K.smooth(0.08, 0.88, stepP);
    let pose, ghostPose = null, lines = [];
    const q0 = top.qa, q1 = top.qb;
    if (step === 0) {
      pose = K.pose(...TL);
      ghostPose = K.pose(...TR);
      bowInk.set([]); goodInk.set([]);
      lines = [
        '<b>The top edge of the square</b>', '',
        `corner (12.5, 150)  left ${f1(q0.l)}°  right ${f1(q0.r)}°`,
        `corner (87.5, 150)  left ${f1(q1.l)}°  right ${f1(q1.r)}°`,
      ];
    } else if (step === 1) {
      const i = at(u);
      pose = top.poses[i];
      bowInk.set(bowPts.slice(0, i + 1)); goodInk.set([]);
      const off = offLine(pose.P, TL, TR);
      lines = [
        '<b>cartesianTest: motor angles in straight lines</b>', '',
        `left  = ${f1(q0.l)}° + (${f1(q1.l)}° − ${f1(q0.l).trim()}°) × ${(i / (top.poses.length - 1)).toFixed(2)} = ${f1(pose.l)}°`,
        `right = ${f1(q0.r)}° + (${f1(q1.r)}° − ${f1(q0.r).trim()}°) × ${(i / (top.poses.length - 1)).toFixed(2)} = ${f1(pose.r)}°`,
        '', `pen off the straight line  <span class="l"><b>${off.toFixed(1)} mm</b></span>   (up to ${bowMax.toFixed(1)} mm)`,
      ];
      lab.bow.text(`${off.toFixed(1)} mm off the line`);
    } else if (step === 2) {
      const x = K.lerp(TL[0], TR[0], u);
      pose = K.pose(x, 150);
      bowInk.set(bowPts);
      goodInk.set([TL, [x, 150]]);
      lines = [
        '<b>cartesianPathing: straight in x and y</b>', '',
        `target x = ${f1(x)} mm   y = ${f1(150)} mm   (every loop)`,
        `IK: left ${f1(pose.l)}°   right ${f1(pose.r)}°`,
        '', `pen off the straight line  <span class="g"><b>0.0 mm</b></span>`,
        `<span class="l">first program: up to ${bowMax.toFixed(1)} mm</span>`,
      ];
    } else {
      const i = at(u);
      pose = bottom.poses[i];
      bowInk.set(bowPts); goodInk.set([TL, TR]);
      const short = pose.gap - 2 * K.L;
      lines = [
        '<b>The bottom edge, in motor angles</b>', '',
        `left ${f1(pose.l)}°   right ${f1(pose.r)}°`,
        `elbows apart  <b>${pose.gap.toFixed(1)} mm</b>   forearms reach 200.0 mm`,
        short > 0 ? `<span class="w">the loop cannot close: ${short.toFixed(1)} mm short</span>` : '<span class="g">the loop closes</span>',
        '', `worst on this edge: ${gapMax.toFixed(1)} mm apart`,
      ];
      lab.gap.text(short > 0 ? `${short.toFixed(1)} mm short` : '');
    }
    link.set(pose);
    ghost.set(ghostPose);
    lab.a.at(TL, -150, -34, step === 0 ? 1 : 0);
    lab.b.at(TR, 12, -34, step === 0 ? 1 : 0);
    lab.bow.at(pose.P || TL, 14, 14, step === 1 && !phone ? 1 : 0);
    if (step === 3 && !pose.P) {
      const mid = [(pose.E1[0] + pose.E2[0]) / 2, (pose.E1[1] + pose.E2[1]) / 2];
      lab.gap.at(mid, 12, -34, pose.gap > 200.3 ? 1 : 0);
    } else lab.gap.at([0, 0], 0, 0, 0);
    card.html(lines.join('\n'));
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { F.dispose(); } };
}
