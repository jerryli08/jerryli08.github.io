// "Drive: servos, not motors", scroll-driven: Jerry's CAD on a floor grid that slides under it, the
// way a camera riding along would see it. Each step sets the two sides' commands; the wheels turn
// about their axles in the CAD by the distance each side has rolled, and the floor moves by the
// robot's differential-drive kinematics on the CAD's 397 mm track. u = step + progress, 0..4:
//   0 at rest     1 both sides the same: straight     2 one side slower: a curve     3 opposite: in place
// Commands are fractions of full speed, shown as the PWM pulse the Arduino sends (1,500 us stop,
// 500 us either way is full speed; the drive code caps it at 300 us). Wheel speed is taken as
// proportional to the pulse offset, and full speed is an illustrative pace (the real top speed is
// not known). The pose and wheel angles are integrals of the commands over the scroll, tabulated
// once, so everything is a pure function of the scroll. The floor grid, the path ahead and the
// centre-of-turn ring are annotations, not parts.
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, TRACK_HALF, WHEEL_R, clamp, lerp, smooth } from './rig.js';

// [other side (-X), arm side (+X)] as fractions of full speed, per step
const CMD = [[0, 0], [0.6, 0.6], [0.6, 0.3], [0.6, -0.6]];
const N = CMD.length;
const VMAX = 0.3; // m/s at full speed: illustrative only
const AXLE_Z = 0.178; // the driven axle (the free wheels behind it are dragged sideways in a turn)
const TIME = 2.4; // seconds of robot time per step of scrolling
const seg = (f, a, b) => smooth((f - a) / (b - a));
function cmdAt(u) {
  const s = clamp(Math.floor(u), 0, N - 1), f = u - s;
  if (s === 0) return CMD[0];
  const k = seg(f, 0, 0.3);
  return [lerp(CMD[s - 1][0], CMD[s][0], k), lerp(CMD[s - 1][1], CMD[s][1], k)];
}
// integrate once: the pose of the driven axle's middle (x, z, heading) and how far each side has rolled
const STEPS = 2400, TAB = new Float64Array((STEPS + 1) * 5);
for (let i = 1; i <= STEPS; i++) {
  const u = ((i - 0.5) / STEPS) * N, dt = (N / STEPS) * TIME;
  const [o, a] = cmdAt(u).map((c) => c * VMAX);
  const v = (o + a) / 2, w = (o - a) / (2 * TRACK_HALF); // the other side ahead turns the robot toward the arm side
  const j = (i - 1) * 5, k = i * 5;
  const psi = TAB[j + 2] + (w * dt) / 2;
  TAB[k] = TAB[j] + Math.sin(psi) * v * dt;
  TAB[k + 1] = TAB[j + 1] + Math.cos(psi) * v * dt;
  TAB[k + 2] = TAB[j + 2] + w * dt;
  TAB[k + 3] = TAB[j + 3] + o * dt;
  TAB[k + 4] = TAB[j + 4] + a * dt;
}
const poseAt = (u) => {
  const x = (clamp(u, 0, N) / N) * STEPS, i = Math.min(STEPS - 1, Math.floor(x)), f = x - i;
  return [0, 1, 2, 3, 4].map((c) => lerp(TAB[i * 5 + c], TAB[(i + 1) * 5 + c], f));
};

// floor: grid lines in world coordinates while the robot stays put, faded toward the edge
function driveFloor() {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uPos: { value: new THREE.Vector2() }, uPsi: { value: 0 }, uC: { value: AXLE_Z }, uColor: { value: new THREE.Color('#e9e2d8') } },
    vertexShader: 'varying vec2 vP; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec2 uPos; uniform float uPsi; uniform float uC; uniform vec3 uColor; varying vec2 vP;
      float grid(vec2 p, float s, float w) { vec2 g = abs(fract(p / s - 0.5) - 0.5) * s; vec2 f = fwidth(p) * w; vec2 l = 1.0 - smoothstep(vec2(0.0), f, g); return max(l.x, l.y); }
      void main() {
        float c = cos(uPsi), s = sin(uPsi);
        vec2 q = vP - vec2(0.0, uC); // about the middle of the driven axle, where a skid-steer pivots
        vec2 w = uPos + vec2(q.x * c + q.y * s, -q.x * s + q.y * c);
        float a = max(grid(w, 0.1, 1.0) * 0.35, grid(w, 0.5, 1.6) * 0.8);
        float r = length(vP); a *= 1.0 - smoothstep(0.6, 1.3, r);
        gl_FragColor = vec4(uColor, a * 0.55);
      }`,
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.35, 72), mat);
  m.rotation.x = -Math.PI / 2; m.position.y = 0.0015; m.renderOrder = 1;
  return m;
}

export async function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const R = await loadRobot(stage);
  const floor = driveFloor();
  stage.scene.add(floor);
  stage.highlight(R.groups.drive, '#ff6b35', { intensity: 0.28 }); // the two driven wheels

  // the path the centre will follow at the current commands, and the centre of the turn
  const PTS = 48;
  const pathGeo = new THREE.BufferGeometry();
  pathGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PTS * 2 * 3), 3));
  const idx = [];
  for (let i = 1; i < PTS; i++) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  pathGeo.setIndex(idx);
  const path = new THREE.Mesh(pathGeo, new THREE.MeshBasicMaterial({ color: '#ffd23f', transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  path.renderOrder = 2; path.frustumCulled = false;
  stage.scene.add(path);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.018, 0.028, 40), new THREE.MeshBasicMaterial({ color: '#ff6b35', side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.004; ring.renderOrder = 2;
  stage.scene.add(ring);
  const pos = pathGeo.attributes.position;
  let lastPath = '';
  function drawPath(o, a) {
    const v = (o + a) / 2, w = (o - a) / (2 * TRACK_HALF);
    const key = `${o.toFixed(3)},${a.toFixed(3)}`;
    if (key === lastPath) return;
    lastPath = key;
    const L = 0.95, hw = 0.012;
    let icc = null;
    const pt = (sArc) => {
      if (Math.abs(w) < 1e-6 || Math.abs(v / w) > 50) return [0, sArc];
      const Rr = v / w, th = sArc / Rr;
      return [Rr - Rr * Math.cos(th), Rr * Math.sin(th)];
    };
    if (Math.abs(v) < 1e-4 && Math.abs(w) > 1e-6) {
      // turning in place: the centre follows no path; draw the circle the driven wheels run on
      for (let i = 0; i < PTS; i++) {
        const th = (i / (PTS - 1)) * Math.PI * 2, r0 = TRACK_HALF - hw, r1 = TRACK_HALF + hw;
        pos.setXYZ(i * 2, Math.sin(th) * r0, 0.004, Math.cos(th) * r0 + AXLE_Z);
        pos.setXYZ(i * 2 + 1, Math.sin(th) * r1, 0.004, Math.cos(th) * r1 + AXLE_Z);
      }
      icc = [0, AXLE_Z];
    } else {
      for (let i = 0; i < PTS; i++) {
        const s0 = (i / (PTS - 1)) * L * Math.sign(v || 1);
        const [x, z] = pt(s0), [x2, z2] = pt(s0 + 0.001);
        let dx = x2 - x, dz = z2 - z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        pos.setXYZ(i * 2, x - dz * hw, 0.004, z + dx * hw + AXLE_Z);
        pos.setXYZ(i * 2 + 1, x + dz * hw, 0.004, z - dx * hw + AXLE_Z);
      }
      if (Math.abs(w) > 1e-6 && Math.abs(v / w) < 1.4) icc = [v / w, AXLE_Z];
    }
    pos.needsUpdate = true;
    path.visible = Math.abs(v) > 1e-4 || Math.abs(w) > 1e-6;
    ring.visible = !!icc;
    if (icc) ring.position.set(icc[0], 0.004, icc[1]);
    stage.invalidate();
    return icc;
  }

  // labels
  const ov = labelLayer(stage);
  const narrow = el.clientWidth < 640; // phone: shorter labels
  const L = {
    servo: ov.label(narrow ? 'Axon MAX servo' : 'Axon MAX servo, straight onto a 72 mm wheel', [0.2, 0.08, AXLE_Z], { color: '#ff6b35' }),
    free: ov.label('Free wheel on an 8 mm REX shaft', [-0.2, 0.08, -0.144], { color: '#fff1e2', side: 'l', minW: 520 }),
    icc: ov.label('Centre of the turn', [0, 0.01, 0], { color: '#ff6b35' }),
  };
  // readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Arm side</span><b class="num" data-k="a"></b><i><em data-k="aBar"></em></i></div>
    <div class="rx-hud-row" style="margin-top:8px"><span>Other side</span><b class="num" data-k="o"></b><i><em data-k="oBar"></em></i></div>
    <table class="num"><tbody>
      <tr><td>Motion</td><td data-k="m"></td></tr>
      <tr><td>Turning radius <small>397 mm track</small></td><td data-k="r"></td></tr>
      <tr class="rx-hud-x"><td>Wheel travel per turn <small>72 mm wheel</small></td><td>226 mm</td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, s) => { if (shown[k] !== s) { K[k].textContent = s; shown[k] = s; } };
  const bar = (k, f) => { const w = `${(Math.abs(f) * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } };
  const us = (c) => Math.round(1500 + 500 * c);
  const side = (c) => `${us(c).toLocaleString('en-US')} µs${Math.abs(c) < 0.005 ? ', stop' : `, ${Math.round(Math.abs(c) * 100)} % ${c > 0 ? 'ahead' : 'back'}`}`;
  function readout(o, a) {
    put('a', side(a)); bar('aBar', a);
    put('o', side(o)); bar('oBar', o);
    const eps = 0.01;
    let m, r;
    if (Math.abs(a) < eps && Math.abs(o) < eps) { m = 'Stopped'; r = '-'; }
    else if (Math.abs(a - o) < eps) { m = a > 0 ? 'Straight ahead' : 'Straight back'; r = 'Straight'; }
    else if (Math.abs(a + o) < eps) { m = 'Turns in place'; r = '0 m'; }
    else {
      m = (o - a) * (a + o) > 0 ? 'Curves toward the arm side' : 'Curves away from the arm side';
      r = `${(TRACK_HALF * Math.abs((a + o) / (o - a))).toFixed(2)} m`;
    }
    put('m', m); put('r', r);
    put('mini', `Arm side ${us(a).toLocaleString('en-US')} µs, other side ${us(o).toLocaleString('en-US')} µs: ${m.toLowerCase()}`);
  }

  // one view, framed once with the robot at rest; only a slow drift with the scroll
  const view0 = stage.frame(R.model, { azimuth: 38, elevation: 30, pad: 1.18, apply: false });
  const s0 = new THREE.Spherical().setFromVector3(view0.pos.clone().sub(view0.target));
  const sp = new THREE.Spherical(), cam = new THREE.Vector3();
  // the last step never scrolls all the way through on a desktop (its card leaves the screen at about
  // 0.6 of it), so it plays out over the first 55 % and then holds
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, N - 1), f = clamp(s === N - 1 ? stepP / 0.55 : stepP, 0, 1), u = s + f;
    const shift = ctx.shift(), phone = el.clientWidth < 640;
    stage.setShift(shift[0] + (phone ? 0 : -0.08), phone ? -0.1 : shift[1]); // clear of the readout (top right, or the top on a phone)
    sp.set(s0.radius, s0.phi, s0.theta + (reduced ? 0 : (u / N - 0.5) * 0.35));
    stage.setView({ pos: cam.setFromSpherical(sp).add(view0.target), target: view0.target });
    const [x, z, psi, dO, dA] = reduced ? [0, 0, 0, 0, 0] : poseAt(u);
    floor.material.uniforms.uPos.value.set(x % 1, z % 1);
    floor.material.uniforms.uPsi.value = psi;
    R.wheels.set(dO / WHEEL_R, dA / WHEEL_R);
    const [o, a] = reduced ? CMD[s] : cmdAt(u);
    const icc = drawPath(o, a);
    if (icc !== undefined) { if (icc) L.icc.p.set(icc[0], 0.01, icc[1]); L.icc.on = !!icc; }
    L.icc.a = L.icc.on && s >= 2 ? seg(f, 0.2, 0.35) : 0;
    L.servo.a = s <= 1 ? 1 - (s === 1 ? seg(f, 0.5, 0.7) : 0) : 0;
    L.free.a = s === 0 ? 1 : s === 1 ? 1 - seg(f, 0.5, 0.7) : 0;
    readout(o, a);
    stage.invalidate();
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
