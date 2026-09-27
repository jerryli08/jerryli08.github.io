// "Aiming from the pose", scroll-driven: the Worlds robot (Jerry's V2 CAD) drives a scripted path
// on a simplified field, and the turret keeps the shooter on the goal from the robot's pose alone:
// the direction to the goal, minus the robot's heading. u = step + progress through it (0..5):
//   0  at the start pose        2  stopped: three balls along the arc     4  three more from there
//   1  drive and turn           3  strafe and turn to the far side
// The mecanum wheels turn by the running total of their inverse-kinematics speeds along the path
// (tabulated once), so everything is a pure function of the scroll. The magenta arc is a plain
// projectile (no drag, no spin) from where the ball leaves the hood, at the hood's modelled 40
// degree launch angle, to the goal opening. The field, walls and goals are simple stand-ins drawn
// for the demo; only the robot is CAD. The camera is framed once on the field and never moves.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadParts, rigTurret, ballCopy, part, dropMouthBall, hudPanel, stepState, integrate, DEG, V2, FLOOR_Y, CENTRE, clamp, lerp, smooth } from './rig.js';

const FIELD = 3.66, WALL_H = 0.3, G = 9.81, N = 5;
const AIM = { x: -FIELD / 2 + 0.3, y: 0.98, z: -FIELD / 2 + 0.3 }; // the goal opening (stand-in)
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
// the script: poses (field metres, heading in degrees about +Y; 0 faces +Z) and the curve between them
const A = { x: 0.7, z: 0.9, h: 0 }, B = { x: -0.35, z: 0.15, h: 90 }, C = { x: 1.15, z: 1.05, h: -35 };
const LEGS = { 1: { from: A, to: B, via: [-0.15, 1.0] }, 3: { from: B, to: C, via: [0.55, 0.35] } };
function poseAt(u) {
  const s = Math.min(Math.floor(u), N - 1), f = u - s;
  const leg = LEGS[s];
  if (!leg) return s < 1 ? { ...A } : s < 3 ? { ...B } : { ...C };
  const e = smooth(0.06, 0.94, f), q = 1 - e;
  const { from: P, to: Q, via: V } = leg;
  return {
    x: q * q * P.x + 2 * q * e * V[0] + e * e * Q.x, // quadratic Bezier through the waypoints
    z: q * q * P.z + 2 * q * e * V[1] + e * e * Q.z,
    h: lerp(P.h, Q.h, smooth(0.1, 0.9, f)),
  };
}
// mecanum wheels: inverse kinematics of the path, integrated once (wheel radius 52 mm from the CAD)
const HALF = 0.17 + 0.144; // half wheelbase + half track, from the wheel centres in the CAD
const WHEELS = ['mecanum_lf', 'mecanum_rf', 'mecanum_lb', 'mecanum_rb'];
function wheelSpeed(u, du = 1e-3) {
  const a = poseAt(Math.max(0, u - du)), b = poseAt(Math.min(N, u + du)), p = poseAt(u);
  const dt = (Math.min(N, u + du) - Math.max(0, u - du)) || 1;
  const vx = (b.x - a.x) / dt, vz = (b.z - a.z) / dt, w = ((b.h - a.h) * DEG) / dt;
  const c = Math.cos(p.h * DEG), s = Math.sin(p.h * DEG);
  const f = vx * s + vz * c, l = vx * c - vz * s; // robot forward (+Z) and left (+X)
  return [f - l - HALF * w, f + l + HALF * w, f + l - HALF * w, f - l + HALF * w].map((v) => v / 0.052);
}
const wheelAngle = WHEELS.map((_, i) => integrate((u) => wheelSpeed(u)[i], N, 1500));
const SHOTS = [0.12, 0.37, 0.62], FLIGHT = 0.3; // when each ball leaves, and how long it flies, in step progress
// the flywheel runs through the two shooting steps
const flyAngle = integrate((u) => smooth(2, 2.08, u) * (1 - smooth(2.92, 3, u)) + smooth(4, 4.08, u), N);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 38 });
  const { THREE, scene } = stage;
  const reduced = ctx.reducedMotion;

  // ------------------------------------------------------------ the stand-in field (not CAD)
  const field = new THREE.Group(); field.name = 'field';
  scene.add(field);
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g2 = cv.getContext('2d');
  g2.fillStyle = '#8d9096'; g2.fillRect(0, 0, 512, 512);
  g2.strokeStyle = 'rgba(40,42,46,0.45)'; g2.lineWidth = 2;
  for (let i = 0; i <= 6; i++) { const q = (i * 512) / 6; g2.beginPath(); g2.moveTo(q, 0); g2.lineTo(q, 512); g2.stroke(); g2.beginPath(); g2.moveTo(0, q); g2.lineTo(512, q); g2.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const floorMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FIELD, FIELD), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  field.add(floor);
  const disposables = [tex, floorMat, floor.geometry];
  const wallMat = new THREE.MeshStandardMaterial({ color: '#d9dadc', roughness: 0.6, transparent: true, opacity: 0.55 });
  disposables.push(wallMat);
  for (const [x, z, w, d] of [[0, -FIELD / 2, FIELD, 0.02], [0, FIELD / 2, FIELD, 0.02], [-FIELD / 2, 0, 0.02, FIELD], [FIELD / 2, 0, 0.02, FIELD]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
    wall.position.set(x, WALL_H / 2, z); field.add(wall); disposables.push(wall.geometry);
  }
  function goal(color, x, z) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    const rimMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4 });
    disposables.push(mat, rimMat);
    const sz = 0.42, h = AIM.y;
    for (const [px, pz, w, d] of [[0, -sz / 2, sz, 0.01], [0, sz / 2, sz, 0.01], [-sz / 2, 0, 0.01, sz], [sz / 2, 0, 0.01, sz]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, h / 2, pz); grp.add(m); disposables.push(m.geometry);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(sz * 0.5, 0.012, 8, 4), rimMat);
    rim.rotation.set(-Math.PI / 2, 0, Math.PI / 4); rim.scale.set(1.414, 1.414, 1); rim.position.y = h;
    grp.add(rim); disposables.push(rim.geometry);
    grp.position.set(x, 0, z);
    field.add(grp);
    return grp;
  }
  goal('#2f6fe0', AIM.x, AIM.z);
  goal('#d8423a', FIELD / 2 - 0.3, -FIELD / 2 + 0.3);

  // ------------------------------------------------------------ the robot (Jerry's V2 CAD)
  const robot = new THREE.Group(); robot.name = 'robot';
  const inner = new THREE.Group();
  inner.position.set(-CENTRE.x, -FLOOR_Y, -CENTRE.z); // footprint centre, on the floor, at the group origin
  robot.add(inner);
  const { chassis, top } = await loadParts(stage, 'v2');
  stage.root.add(robot);
  inner.add(chassis, top);
  dropMouthBall(stage, top); // this CAD ball sits outside the robot, in front of the intake
  const rig = rigTurret(stage, chassis, top);
  const wheels = WHEELS.map((n) => stage.pivot(part(stage, chassis, n), 'center', [1, 0, 0]));
  stage.ground.visible = false; // the field floor takes the shadow instead

  // the key light's shadow follows the robot
  const key = stage.light;
  const keyOff = key.position.clone().sub(key.target.position).normalize().multiplyScalar(3);
  Object.assign(key.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.1, far: 7 });
  key.shadow.camera.updateProjectionMatrix();

  // camera: framed once on the field, never moved
  // side on to the shots, so the arc reads as an arc
  const CAM = { azimuth: -42, elevation: 32 };
  const view = {};
  let framedFor = '';

  // ------------------------------------------------------------ aiming, the arc and the balls
  const tmp = new THREE.Vector3();
  const toWorld = (q) => { inner.updateWorldMatrix(true, false); return tmp.set(q[0], q[1], q[2]).applyMatrix4(inner.matrixWorld).clone(); };
  function launch() {
    const p0 = toWorld(rig.onTurret(rig.hoodPoint(rig.hoodEnd)));
    const e = (90 - rig.hoodEnd) * DEG;
    const dx = AIM.x - p0.x, dz = AIM.z - p0.z, d = Math.hypot(dx, dz), dh = AIM.y - p0.y;
    const den = 2 * Math.cos(e) ** 2 * (d * Math.tan(e) - dh);
    const v = den > 0 ? Math.sqrt((G * d * d) / den) : NaN;
    return { p0, e, d, v, ux: dx / d, uz: dz / d, T: d / (v * Math.cos(e)) };
  }
  const arcMat = new THREE.MeshBasicMaterial({ color: '#ff00ff' });
  let arc = null;
  function drawArc(L) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = (L.T * i) / 40, hz = L.v * Math.cos(L.e) * t;
      pts.push(new THREE.Vector3(L.p0.x + L.ux * hz, L.p0.y + L.v * Math.sin(L.e) * t - 0.5 * G * t * t, L.p0.z + L.uz * hz));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 56, 0.014, 6, false);
    if (!arc) { arc = new THREE.Mesh(geo, arcMat); arc.renderOrder = 2; scene.add(arc); } else { arc.geometry.dispose(); arc.geometry = geo; }
  }
  const purple = new THREE.MeshPhysicalMaterial({ color: '#7b3fbf', roughness: 0.55, clearcoat: 0.25 });
  const green = new THREE.MeshPhysicalMaterial({ color: '#35b04a', roughness: 0.55, clearcoat: 0.25 });
  disposables.push(arcMat, purple, green);
  const flying = [0, 1, 2].map((i) => {
    const c = ballCopy(stage, rig.balls.top, i % 2 ? green : purple);
    c.mesh.visible = false; c.mesh.castShadow = true; scene.add(c.mesh);
    return c;
  });
  function ballsAt(L, f) {
    let moved = false;
    flying.forEach((c, i) => {
      const tau = (f - SHOTS[i]) / FLIGHT;
      const vis = !!L && tau > 0 && tau < 1.25;
      if (c.mesh.visible !== vis) { c.mesh.visible = vis; moved = true; }
      if (!vis) return;
      const t = Math.min(tau, 1) * L.T, hz = L.v * Math.cos(L.e) * t;
      let y = L.p0.y + L.v * Math.sin(L.e) * t - 0.5 * G * t * t;
      if (tau > 1) y -= 1.2 * (tau - 1); // drops into the goal
      c.place(L.p0.x + L.ux * hz, y, L.p0.z + L.uz * hz);
      moved = true;
    });
    return moved;
  }

  // ------------------------------------------------------------ readout and a top-down inset
  const ov = labelLayer(stage);
  const hud = hudPanel(ov.layer, `
    <table class="num"><tbody>
      <tr><td>Heading <small>from odometry</small></td><td data-k="h"></td></tr>
      <tr><td>Direction to the goal</td><td data-k="b"></td></tr>
      <tr><td>Turret vs chassis <small>0° shoots straight back</small></td><td data-k="t"></td></tr>
      <tr><td>To the goal</td><td data-k="d"></td></tr>
      <tr><td>Launch speed needed <small>40° launch, no drag</small></td><td data-k="v"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`);
  // the inset is drawn in the camera's own orientation: up on the inset is into the screen
  const az = CAM.azimuth * DEG, fwd = [-Math.sin(az), -Math.cos(az)], right = [-fwd[1], fwd[0]];
  const S = 26; // px per metre
  const mapXY = (x, z) => [x * right[0] + z * right[1], -(x * fwd[0] + z * fwd[1])].map((v) => +(v * S).toFixed(1));
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, c]) => mapXY((a * FIELD) / 2, (c * FIELD) / 2).join(','));
  const goalXY = mapXY(AIM.x, AIM.z);
  const trace = [];
  for (let i = 0; i <= 200; i++) { const q = poseAt((i / 200) * N); trace.push(mapXY(q.x, q.z).join(',')); }
  const inset = document.createElement('div');
  inset.className = 'rx-hud';
  Object.assign(inset.style, { left: '14px', right: 'auto', top: 'auto', bottom: '14px', width: 'auto', padding: '8px' });
  inset.innerHTML = `<svg viewBox="-70 -70 140 140" width="132" height="132" aria-hidden="true" style="display:block">
    <polygon points="${corners.join(' ')}" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.3)"/>
    <polyline points="${trace.join(' ')}" fill="none" stroke="rgba(255,255,255,.22)" stroke-dasharray="2 3"/>
    <circle cx="${goalXY[0]}" cy="${goalXY[1]}" r="5" fill="#2f6fe0"/>
    <line data-k="aim" stroke="#ff00ff" stroke-width="2"/>
    <g data-k="bot"><rect x="-5.1" y="-5.9" width="10.2" height="11.8" rx="1.5" fill="#eee9e3"/><path d="M0 -9 L3 -5.9 L-3 -5.9 Z" fill="#ff6b35"/></g>
  </svg><div style="font-size:11px;color:var(--muted);text-align:center;margin-top:2px">From above; the notch is the front</div>`;
  ov.layer.append(inset);
  const aimLine = inset.querySelector('[data-k="aim"]'), bot = inset.querySelector('[data-k="bot"]');
  const drawn = {};
  const setAttr = (n, k, a, v) => { if (drawn[k] !== v) { n.setAttribute(a, v); drawn[k] = v; } };

  const fmtDeg = (r) => { const d = Math.round(r / DEG); return `${d === 0 ? 0 : d}°`; };
  let lastPose = '';
  function setProgress(p, step, stepP) {
    const s = stepState(step, stepP, N, reduced);
    const u = s.uu;
    const pose = poseAt(u);
    const sig = `${pose.x.toFixed(5)},${pose.z.toFixed(5)},${pose.h.toFixed(4)}`;
    // the robot, its wheels and the turret: a pure function of the pose
    robot.position.set(pose.x, 0, pose.z);
    robot.rotation.y = pose.h * DEG;
    robot.updateWorldMatrix(true, true);
    wheels.forEach((w, i) => w.setAngle(reduced ? 0 : wheelAngle[i](s.u)));
    const yawW = toWorld([V2.yaw.x, 0, V2.yaw.z]);
    const bearing = Math.atan2(-(AIM.x - yawW.x), -(AIM.z - yawW.z)); // the shot direction that hits the goal
    const turret = wrap(bearing - pose.h * DEG);
    rig.setTurret(turret);
    const shooting = s.step === 2 || s.step === 4;
    rig.setFly(reduced ? 0 : -flyAngle(s.u) * 40);
    const L = launch();
    if (sig !== lastPose) {
      lastPose = sig;
      key.target.position.set(pose.x, 0.2, pose.z);
      key.position.copy(key.target.position).add(keyOff);
      drawArc(L);
      stage.invalidate();
    }
    if (ballsAt(shooting && !reduced ? L : null, stepP)) stage.invalidate();
    // camera, framed once (again only if the stage changes shape)
    const shape = `${el.clientWidth}x${el.clientHeight}`;
    if (shape !== framedFor) { framedFor = shape; Object.assign(view, stage.frame(field, { ...CAM, pad: el.clientWidth < 640 ? 0.9 : 0.96, apply: false, track: false, refresh: true })); stage.setView(view); }
    stage.setShift(0, el.clientWidth < 640 ? -0.04 : 0);
    // readout, in field terms seen from above: angles counterclockwise from the field's +x axis
    const H = wrap(pose.h * DEG - Math.PI / 2), Bg = Math.atan2(-(AIM.z - yawW.z), AIM.x - yawW.x);
    hud.show(1);
    hud.put('h', fmtDeg(H)); hud.put('b', fmtDeg(Bg)); hud.put('t', fmtDeg(turret));
    hud.put('d', `${L.d.toFixed(2)} m`); hud.put('v', L.v > 0 ? `${L.v.toFixed(1)} m/s` : 'out of reach');
    hud.put('mini', `Turret ${fmtDeg(turret)} vs chassis, ${L.d.toFixed(2)} m to the goal`);
    // inset
    const [rx, ry] = mapXY(pose.x, pose.z), [fx, fy] = mapXY(Math.sin(pose.h * DEG), Math.cos(pose.h * DEG));
    const ang = (Math.atan2(fy, fx) / DEG + 90).toFixed(1); // the rect's front is -y
    setAttr(bot, 'bot', 'transform', `translate(${rx} ${ry}) rotate(${ang})`);
    const [yx, yy] = mapXY(yawW.x, yawW.z);
    setAttr(aimLine, 'x1', 'x1', String(yx)); setAttr(aimLine, 'y1', 'y1', String(yy));
    setAttr(aimLine, 'x2', 'x2', String(goalXY[0])); setAttr(aimLine, 'y2', 'y2', String(goalXY[1]));
    const ia = el.clientWidth < 640 ? 'none' : '';
    if (drawn.disp !== ia) { inset.style.display = ia; drawn.disp = ia; }
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ov.dispose(); arc?.geometry.dispose(); for (const d of disposables) d.dispose(); stage.dispose(); },
  };
}
