// Where the linkage is weak (computed from my CAD's link lengths and my code's step size). The map
// colours every reachable pen point by how far one microstep of one motor moves the pen there
// (kin.perStep: the velocity equations of the loop, times 0.1125°). It is small in the middle of the
// workspace and grows without limit on the fold line, where the two forearms lie in one straight
// line and the motors no longer pin the pen down. The scroll takes the pen from the letters down the
// right edge of my test square, through the fold line, and along the square's bottom edge, which
// lies just past it. Pure function of the scroll.
import * as K from './kin.js';
import { createFlat } from './flat.js';
import { byId } from './shapes.js';

const HUE = [127, 212, 255]; // the fold-line blue: one hue, brighter where the pen is looser
const alphaOf = (ps) => (ps === Infinity ? 0.9 : 0.07 + 0.83 * K.clamp(Math.log10(ps / 0.1) / 2, 0, 1));
// the pen's path along the scroll: to the right edge, down it, then along the bottom edge
const LEGS = [
  [[50, 186.6], [50, 186.6]],
  [[50, 186.6], [87.5, 150]],
  [[87.5, 150], [87.5, 76.29]],
  [[87.5, 76.29], [87.5, 75], [50, 75]],
];

export async function mount(el, ctx) {
  const F = createFlat(el, {
    canvas: true,
    label: 'Map of how far one motor microstep moves the pen, with the fold line where the forearms line up',
    region: [-86, 196, -22, 200],
    margin: (w) => (w < 640 ? [0.25, 0.03, 0.02, 0.03] : [0.05, 0.03, 0.05, 0.3]),
  });
  // the map on a 1 mm grid, once
  const R = [-95, 200, -25, 205];
  const gw = R[1] - R[0], gh = R[3] - R[2];
  const off = document.createElement('canvas');
  off.width = gw; off.height = gh;
  const img = off.getContext('2d').createImageData(gw, gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = R[0] + i + 0.5, y = R[3] - j - 0.5;
    const q = K.ik(x, y);
    const o = (j * gw + i) * 4;
    if (!q) { img.data[o + 3] = 0; continue; }
    const ps = K.perStep(K.pose(x, y, q));
    img.data[o] = HUE[0]; img.data[o + 1] = HUE[1]; img.data[o + 2] = HUE[2]; img.data[o + 3] = Math.round(alphaOf(ps) * 255);
  }
  off.getContext('2d').putImageData(img, 0, 0);
  F.onLayout(() => {
    const c = F.canvas.getContext('2d');
    const dpr = F.canvas.width / Math.max(1, F.W);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, F.W, F.H);
    c.imageSmoothingEnabled = true;
    c.drawImage(off, F.X(R[0]), F.Y(R[3]), gw * F.s, gh * F.s);
  });

  const g = F.layer('main');
  const fold = F.polyline(g, 'fold');
  const name = F.polyline(g, 'want');
  const square = F.polyline(g, 'want');
  const drawMotors = F.motors(g);
  const link = F.linkage(g);
  const slide = F.mk(g, 'line', 'slide');
  const foldPts = K.foldLine().filter((p) => p[0] > -20 && p[0] < 120);
  const card = F.card('tl');
  const lab = { fold: F.label('Fold line: forearms in line'), name: F.label('"Jerry Li"'), sq: F.label('Test square') };
  lab.fold.n.style.color = '#7fd4ff';
  const bar = '<span style="display:inline-block;width:140px;height:9px;border-radius:3px;vertical-align:-1px;background:linear-gradient(90deg,rgba(127,212,255,.07),rgba(127,212,255,.9))"></span>';
  const legend = (on) => on ? `\n\nbrighter: the pen moves further per step\n0.1 mm ${bar} 10 mm` : '';

  function setProgress(p, step, stepP) {
    if (F.layout()) {
      drawMotors();
      fold.set(foldPts);
      name.set(byId.name.path.slice(1, -1).map((e) => [e[0], e[1]]));
      square.set([[12.5, 150], [87.5, 150], [87.5, 75], [12.5, 75], [12.5, 150]]);
    }
    step = K.clamp(step | 0, 0, LEGS.length - 1);
    const leg = LEGS[step];
    let u = K.smooth(0.08, 0.88, stepP), P;
    if (leg.length === 3) {
      // down the last millimetre to the corner, then along the bottom edge
      const a = K.dist(leg[0], leg[1]), b = K.dist(leg[1], leg[2]), s = u * (a + b);
      P = s < a ? [leg[0][0], K.lerp(leg[0][1], leg[1][1], s / a)] : [K.lerp(leg[1][0], leg[2][0], (s - a) / b), leg[1][1]];
    } else if (step === 2) {
      // slow down into the fold line: equal scroll per halving of the distance to it
      const y0 = leg[0][1], y1 = leg[1][1];
      const y = y1 + (y0 - y1) * Math.pow(1 - u, 2.2);
      P = [leg[0][0], y];
    } else P = [K.lerp(leg[0][0], leg[1][0], u), K.lerp(leg[0][1], leg[1][1], u)];
    const pose = K.pose(P[0], P[1]);
    link.set(pose);
    const ps = K.perStep(pose);
    link.hot(ps > 2);
    // the free direction at the fold line: across the forearms' line
    const E = [pose.E2[0] - pose.E1[0], pose.E2[1] - pose.E1[1]], n = Math.hypot(...E);
    const nx = -E[1] / n, ny = E[0] / n, h = 9;
    F.attr(slide, 'x1', F.X(P[0] - nx * h).toFixed(1)); F.attr(slide, 'y1', F.Y(P[1] - ny * h).toFixed(1));
    F.attr(slide, 'x2', F.X(P[0] + nx * h).toFixed(1)); F.attr(slide, 'y2', F.Y(P[1] + ny * h).toFixed(1));
    F.show(slide, ps > 6);

    lab.fold.text(F.W < 640 ? 'Fold line' : 'Fold line: forearms in line');
    lab.fold.at(F.W < 640 ? [100, 66] : [-3, 63], F.W < 640 ? 10 : -210, 6, 1);
    lab.name.at([-30, 160], -6, -30, step <= 1 ? 1 : 0);
    lab.sq.at([87.5, 150], 14, -12, step <= 1 ? 1 : 0);
    const j = pose.joints.a;
    const val = ps > 99 ? 'unbounded' : `${ps < 1 ? ps.toFixed(2) : ps.toFixed(1)} mm`;
    const lines = [
      `<b>pen  x = ${P[0].toFixed(1)}   y = ${P[1].toFixed(1)} mm</b>`, '',
      `one microstep moves the pen  <b class="${ps > 2 ? 'r' : ''}">${val}</b>`,
      `pen joint angle   ${j[2].toFixed(1)}°${Math.abs(j[2] - 180) < 1.5 ? '  <span class="r">forearms in line</span>' : j[2] > 180 ? '  <span class="r">folded through</span>' : ''}`,
      `elbows apart      ${K.dist(pose.E1, pose.E2).toFixed(1)} mm of 200`,
    ];
    card.html(lines.join('\n') + legend(step === 0));
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { F.dispose(); } };
}
