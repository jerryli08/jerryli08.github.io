// Scrolly: a reach sweep of the arm, driven only by the scroll. The target moves in the arm's plane
// and the two-link inverse kinematics (rig.js) turns the real shoulder and elbow about their CAD
// axes to put the grip point on it: out to full reach, around the edge of everything it can reach,
// then along the one arc where the claw stays level, back to the pose in the CAD. This is the
// planned control, worked out on the CAD; it never ran on the arm. The joint limits only keep the
// arm under the drone (the real ones are not in the CAD); every point on the path is inside them.
// The near half of the drone is cut away so the arm reads in profile.
// Every picture is a pure function of u = step + progress through it (0..4).
import { createStage } from '/assets/js/lib/stage.js';
import { loadArm, ik, fk, allowed, labels, S, G, ZP, L1, L2, RMIN, RMAX, PHI_0, Q1_0, Q1_LIM, DEG, clamp, lerp } from './rig.js';

const NS = 'http://www.w3.org/2000/svg';
const CSS = `
.da-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.da-svg.back { z-index: 0; }
.da-svg.front { z-index: 2; }
.da-svg .ring { fill: rgba(127,212,255,.08); stroke: rgba(127,212,255,.4); stroke-width: 1; fill-rule: evenodd; }
.da-svg .arc { fill: none; stroke: rgba(255,210,122,.8); stroke-width: 1.6; stroke-dasharray: 5 5; }
.da-svg .bone { fill: none; stroke: #7fd4ff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.da-svg .joint { fill: #0b0a09; stroke: #eee9e3; stroke-width: 2; }
.da-svg .grip { fill: #7fd4ff; }
.da-svg .tgt { fill: #ff6b35; stroke: #fff; stroke-width: 2; }
`;
let styled = false;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// the path of the target, from the shoulder: polar (distance, angle) and the level arc
const polar = (d, t) => [S[0] + d * Math.cos(t * DEG), S[1] + d * Math.sin(t * DEG)];
const level = (q) => [S[0] + L1 * Math.cos(q * DEG) + L2 * Math.cos(PHI_0), S[1] + L1 * Math.sin(q * DEG) + L2 * Math.sin(PHI_0)];
const G0 = [Math.hypot(G[0] - S[0], G[1] - S[1]), Math.atan2(G[1] - S[1], G[0] - S[0]) / DEG]; // the CAD pose: 171 mm, -124.7 deg
const FAR = 0.505; // m: the sweep runs just inside the 514 mm full reach
const QS = -150;   // deg: where the level arc starts
const LS = (() => { const p = level(QS); return [Math.hypot(p[0] - S[0], p[1] - S[1]), Math.atan2(p[1] - S[1], p[0] - S[0]) / DEG]; })();
function targetAt(u) {
  if (u < 1) return G;
  if (u < 2) { const k = smooth(0.1, 0.9, u - 1); return polar(lerp(G0[0], FAR, k), lerp(G0[1], -90, k)); }
  if (u < 3) {
    const s = u - 2;
    if (s < 0.42) return polar(FAR, lerp(-90, -25, smooth(0.05, 0.4, s)));
    const k = smooth(0.45, 0.95, s);
    return polar(lerp(FAR, LS[0], k), lerp(-25, LS[1], k));
  }
  return level(lerp(QS, Q1_0 / DEG, smooth(0.1, 0.9, u - 3)));
}

export async function mount(el, ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadArm(stage);
  const reduced = ctx.reducedMotion;
  if (rig.parts.bottle) rig.parts.bottle.visible = false;
  stage.sectionPlane([0, 0, -1], -0.045); // keep z <= -45 mm: the near landing gear and props come off

  // ---------------------------------------------------------------- overlay layers
  const back = document.createElementNS(NS, 'svg'); back.setAttribute('class', 'da-svg back'); back.setAttribute('aria-hidden', 'true');
  const front = document.createElementNS(NS, 'svg'); front.setAttribute('class', 'da-svg front'); front.setAttribute('aria-hidden', 'true');
  el.insertBefore(back, stage.canvas); // behind the transparent canvas: the model draws over it
  el.append(front);
  const mk = (p, tag, cls) => { const n = document.createElementNS(NS, tag); if (cls) n.setAttribute('class', cls); p.append(n); return n; };
  const ring = mk(back, 'path', 'ring'), arc = mk(back, 'path', 'arc');
  const bone = mk(front, 'polyline', 'bone');
  const jS = mk(front, 'circle', 'joint'), jE = mk(front, 'circle', 'joint'), jG = mk(front, 'circle', 'grip'), tgt = mk(front, 'circle', 'tgt');
  jS.setAttribute('r', 5); jE.setAttribute('r', 5); jG.setAttribute('r', 4.5); tgt.setAttribute('r', 8);

  const labs = labels(el);
  labs.add('s', { text: 'Shoulder', side: 'r' });
  labs.add('e', { text: 'Elbow', side: 'r' });
  labs.add('l1', { text: `L1 = ${(L1 * 1000).toFixed(1)} mm`, side: 'l', cls: 'ik dim' });
  labs.add('l2', { text: `L2 = ${(L2 * 1000).toFixed(1)} mm`, side: 'r', cls: 'ik dim' });
  labs.add('ring', { text: 'Everywhere the claw can reach', side: 'r', cls: 'ik' });
  labs.add('arc', { text: 'Claw level along this arc', side: 'r', cls: 'cam' });

  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  labs.box.append(hud);
  hud.innerHTML = `
    <table class="num"><tbody>
      <tr><td>Target from the shoulder</td><td data-k="t"></td></tr>
      <tr><td>Shoulder q1</td><td data-k="q1"></td></tr>
      <tr><td>Elbow q2</td><td data-k="q2"></td></tr>
      <tr><td>Claw tilt from level</td><td data-k="p"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Reach, of ${(RMAX * 1000).toFixed(0)} mm</span><b class="num" data-k="r"></b></div>`;
  const KK = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { KK[k].textContent = t; shown[k] = t; } };
  const attr = (n, k, v) => { const key = `_${k}`; if (n[key] !== v) { n.setAttribute(k, v); n[key] = v; } };

  // ---------------------------------------------------------------- side view of the arm's plane, framed once per stage shape
  const region = new T.Mesh(new T.BoxGeometry(1.04, 0.74, 0.02));
  const v3 = new T.Vector3();
  const scr = (x, y) => { v3.set(x, y, ZP).project(stage.camera); return [((v3.x + 1) / 2) * el.clientWidth, ((1 - v3.y) / 2) * el.clientHeight]; };
  const P = (x, y) => scr(x, y).map((n) => n.toFixed(1)).join(',');
  let shape = '';
  function frameNow(fx, fy) {
    const key = `${stage.camera.aspect}|${el.clientWidth}x${el.clientHeight}|${fx}|${fy}`;
    if (key === shape) return;
    shape = key;
    const tall = el.clientHeight > el.clientWidth * 0.8;
    region.scale.set(1, tall ? 1.15 : 1, 1);
    region.position.set(0.38, tall ? -0.28 : -0.255, ZP);
    region.updateMatrixWorld(true);
    stage.setView(stage.frame(region, { azimuth: 0, elevation: 0, pad: 1.02, apply: false, refresh: true }));
    stage.setShift(fx, fy);
    stage.camera.updateMatrixWorld();
    // the reach ring between |L1 - L2| and L1 + L2, and the arc where the claw is level
    const circ = (r) => { const a = []; for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2; a.push(P(S[0] + r * Math.cos(t), S[1] + r * Math.sin(t))); } return `M${a.join('L')}Z`; };
    ring.setAttribute('d', `${circ(RMAX)} ${circ(RMIN)}`);
    const pts = [];
    for (let q = Q1_LIM[0]; q <= Q1_LIM[1] + 1e-9; q += DEG) {
      if (allowed(q, wrap(PHI_0 - q))) pts.push(P(...level(q / DEG)));
    }
    arc.setAttribute('d', pts.length ? `M${pts.join('L')}` : '');
    labs.resize();
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 3);
    const phone = el.clientWidth < 640;
    frameNow(phone ? 0 : -0.07, phone ? -0.1 : -0.04); // clear of the readout (top right; across the top on a phone)
    const u = step + (reduced ? (step === 0 ? 0 : 0.999) : stepP);
    const [tx, ty] = targetAt(u);
    const r = ik(tx - S[0], ty - S[1]);
    rig.setJoints(r.q1, r.q2);
    const { e, g } = fk(r.q1, r.q2);

    // overlays: the ring from the sweep on, the level arc in the last step
    const ringA = smooth(2, 2.3, u), arcA = smooth(3, 3.3, u);
    attr(ring, 'opacity', ringA.toFixed(2)); attr(arc, 'opacity', arcA.toFixed(2));
    attr(bone, 'points', `${P(...S)} ${P(...e)} ${P(...g)}`);
    const [sx, sy] = scr(...S), [ex, ey] = scr(...e), [gx, gy] = scr(...g), [qx, qy] = scr(tx, ty);
    attr(jS, 'cx', sx.toFixed(1)); attr(jS, 'cy', sy.toFixed(1));
    attr(jE, 'cx', ex.toFixed(1)); attr(jE, 'cy', ey.toFixed(1));
    attr(jG, 'cx', gx.toFixed(1)); attr(jG, 'cy', gy.toFixed(1));
    attr(tgt, 'cx', qx.toFixed(1)); attr(tgt, 'cy', qy.toFixed(1));
    const tA = smooth(1, 1.15, u);
    attr(tgt, 'opacity', tA.toFixed(2));

    labs.point('s', new T.Vector3(S[0], S[1], ZP)); labs.alpha('s', 1);
    labs.point('e', new T.Vector3(e[0], e[1], ZP)); labs.alpha('e', 1);
    const dimA = 1 - smooth(0.85, 1.05, u);
    labs.point('l1', new T.Vector3((S[0] + e[0]) / 2 - 0.012, (S[1] + e[1]) / 2, ZP)); labs.alpha('l1', dimA);
    labs.point('l2', new T.Vector3((e[0] + g[0]) / 2, (e[1] + g[1]) / 2 - 0.02, ZP)); labs.alpha('l2', dimA);
    labs.point('ring', new T.Vector3(S[0] + RMAX * Math.cos(-35 * DEG) + 0.01, S[1] + RMAX * Math.sin(-35 * DEG), ZP)); labs.alpha('ring', ringA * (1 - smooth(3, 3.3, u)) * (phone ? 0 : 1));
    labs.point('arc', new T.Vector3(...level(-100), ZP)); labs.alpha('arc', arcA);
    labs.update(stage.camera);

    const tilt = wrap(r.q1 + r.q2 - PHI_0) / DEG;
    const du = (tx - S[0]) * 1000, dv = (ty - S[1]) * 1000;
    const reach = Math.hypot(g[0] - S[0], g[1] - S[1]) * 1000;
    put('t', `${du.toFixed(0)}, ${dv.toFixed(0)} mm`);
    put('q1', `${(r.q1 / DEG).toFixed(1)}°`); put('q2', `${(r.q2 / DEG).toFixed(1)}°`);
    put('p', `${Math.abs(tilt) < 0.05 ? '0.0' : tilt.toFixed(1)}°`);
    put('r', `${reach.toFixed(0)} mm`);
    put('mini', `q1 ${(r.q1 / DEG).toFixed(1)}°, q2 ${(r.q2 / DEG).toFixed(1)}°, claw tilt ${Math.abs(tilt) < 0.05 ? '0.0' : tilt.toFixed(1)}°`);
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { back.remove(); front.remove(); labs.dispose(); region.geometry.dispose(); region.material.dispose(); stage.dispose(); },
  };
}
