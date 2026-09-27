// Drive the Worlds robot (Jerry's V2 CAD) around a simplified field. The robot drives to the
// cursor (tap on a phone), the heading slider turns the chassis, and the turret turns on its own
// so the shooter always faces the goal. The magenta arc is a plain projectile path (no drag, no
// spin) from where the ball leaves the hood, at the hood's modelled launch angle, to the goal
// opening. Holding the shoot button fires balls along it. The field, walls and goals are simple
// stand-ins drawn for the demo; only the robot is CAD.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, readout } from '/assets/js/lib/ui.js';
import { loadParts, rigTurret, ballCopy, part, dropMouthBall, DEG, V2, FLOOR_Y, CENTRE, clamp } from './rig.js';

const FIELD = 3.66, TILE = FIELD / 6, WALL_H = 0.3;
const G = 9.81;
const wrap = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 30 });
  const { THREE, scene } = stage;

  // ------------------------------------------------------------ the stand-in field (not CAD)
  const field = new THREE.Group(); field.name = 'field';
  scene.add(field);
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const g2 = cv.getContext('2d');
  g2.fillStyle = '#8d9096'; g2.fillRect(0, 0, 512, 512);
  g2.strokeStyle = 'rgba(40,42,46,0.45)'; g2.lineWidth = 2;
  for (let i = 0; i <= 6; i++) { const p = (i * 512) / 6; g2.beginPath(); g2.moveTo(p, 0); g2.lineTo(p, 512); g2.stroke(); g2.beginPath(); g2.moveTo(0, p); g2.lineTo(512, p); g2.stroke(); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(FIELD, FIELD), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  field.add(floor);
  const wallMat = new THREE.MeshStandardMaterial({ color: '#d9dadc', roughness: 0.6, transparent: true, opacity: 0.55 });
  for (const [x, z, w, d] of [[0, -FIELD / 2, FIELD, 0.02], [0, FIELD / 2, FIELD, 0.02], [-FIELD / 2, 0, 0.02, FIELD], [FIELD / 2, 0, 0.02, FIELD]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, WALL_H, d), wallMat);
    wall.position.set(x, WALL_H / 2, z); field.add(wall);
  }
  // goals: an open box in each far corner, rim at AIM.y
  const AIM = { x: -FIELD / 2 + 0.3, y: 0.98, z: -FIELD / 2 + 0.3 };
  function goal(color, x, z) {
    const grp = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false });
    const s = 0.42, h = AIM.y;
    for (const [px, pz, w, d] of [[0, -s / 2, s, 0.01], [0, s / 2, s, 0.01], [-s / 2, 0, 0.01, s], [s / 2, 0, 0.01, s]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(px, h / 2, pz); grp.add(m);
    }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(s * 0.5, 0.012, 8, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.4 }));
    rim.rotation.set(-Math.PI / 2, 0, Math.PI / 4); rim.scale.set(1.414, 1.414, 1); rim.position.y = h;
    grp.add(rim);
    grp.position.set(x, 0, z);
    field.add(grp);
    return grp;
  }
  const blue = goal('#2f6fe0', AIM.x, AIM.z);
  const red = goal('#d8423a', FIELD / 2 - 0.3, -FIELD / 2 + 0.3);

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
  const wheelNames = ['mecanum_lf', 'mecanum_rf', 'mecanum_lb', 'mecanum_rb'];
  const wheels = Object.fromEntries(wheelNames.map((n) => [n, stage.pivot(part(stage, chassis, n), 'center', [1, 0, 0])]));
  stage.ground.visible = false;

  // shadow light follows the robot
  const key = stage.light;
  const keyOff = key.position.clone().sub(key.target.position);
  Object.assign(key.shadow.camera, { left: -0.6, right: 0.6, top: 0.6, bottom: -0.6, near: 0.1, far: 6 });
  key.shadow.camera.updateProjectionMatrix();

  // camera: fixed three-quarter view of the whole field
  const frameAll = () => stage.frame([floor, blue, red], { azimuth: -38, elevation: 36, pad: 0.94 });
  frameAll();

  // ------------------------------------------------------------ state
  const st = {
    pos: new THREE.Vector2(0.7, 0.8), vel: new THREE.Vector2(), target: new THREE.Vector2(0.7, 0.8),
    heading: 0, headingTarget: 0, turret: 0, fired: 0, shooting: false, shootClock: 0,
  };
  const wheelAngle = Object.fromEntries(wheelNames.map((n) => [n, 0]));

  // world position of the turret's yaw axis and of the ball leaving the hood
  const tmp = new THREE.Vector3();
  const modelToWorld = (p) => { inner.updateWorldMatrix(true, false); return tmp.set(p[0], p[1], p[2]).applyMatrix4(inner.matrixWorld).clone(); };
  const launchInfo = () => {
    const p0 = modelToWorld(rig.onTurret(rig.hoodPoint(rig.hoodEnd)));
    const e = (90 - rig.hoodEnd) * DEG;
    const dx = AIM.x - p0.x, dz = AIM.z - p0.z;
    const d = Math.hypot(dx, dz), dh = AIM.y - p0.y;
    const den = 2 * Math.cos(e) ** 2 * (d * Math.tan(e) - dh);
    const v = den > 0 ? Math.sqrt((G * d * d) / den) : NaN;
    return { p0, e, d, dh, v, ux: dx / d, uz: dz / d };
  };

  // ------------------------------------------------------------ the magenta arc
  const arcMat = new THREE.MeshBasicMaterial({ color: '#ff00ff' });
  let arc = null;
  function drawArc() {
    const L = launchInfo();
    if (!(L.v > 0)) { if (arc) arc.visible = false; return L; }
    const pts = [];
    const T = L.d / (L.v * Math.cos(L.e));
    for (let i = 0; i <= 48; i++) {
      const t = (T * i) / 48, h = L.v * Math.cos(L.e) * t;
      pts.push(new THREE.Vector3(L.p0.x + L.ux * h, L.p0.y + L.v * Math.sin(L.e) * t - 0.5 * G * t * t, L.p0.z + L.uz * h));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.014, 6, false);
    if (!arc) { arc = new THREE.Mesh(geo, arcMat); arc.renderOrder = 2; scene.add(arc); } else { arc.geometry.dispose(); arc.geometry = geo; }
    arc.visible = true;
    return L;
  }

  // ------------------------------------------------------------ balls in flight (pool)
  const src = rig.balls.top;
  const purple = src.material, green = src.material.clone(); green.color.set('#35b04a');
  const pool = [];
  for (let i = 0; i < 16; i++) {
    const c = ballCopy(stage, src, i % 2 ? green : purple);
    c.mesh.visible = false; c.mesh.castShadow = true; scene.add(c.mesh);
    pool.push({ c, t: 0, T: 0, L: null, live: false });
  }
  let next = 0;
  function fire() {
    const L = launchInfo(); if (!(L.v > 0)) return;
    const b = pool[next]; next = (next + 1) % pool.length;
    Object.assign(b, { t: 0, T: L.d / (L.v * Math.cos(L.e)), L, live: true });
    b.c.mesh.visible = true;
    st.fired++;
  }
  function stepBalls(dt) {
    let any = false;
    for (const b of pool) {
      if (!b.live) continue;
      any = true;
      b.t += dt;
      const { L } = b; const t = b.t;
      const h = L.v * Math.cos(L.e) * Math.min(t, b.T);
      let y = L.p0.y + L.v * Math.sin(L.e) * t - 0.5 * G * t * t;
      if (t > b.T) y = Math.max(AIM.y - 0.9, y); // drops into the goal
      b.c.place(L.p0.x + L.ux * h, y, L.p0.z + L.uz * h);
      if (t > b.T + 0.45) { b.live = false; b.c.mesh.visible = false; }
    }
    return any;
  }

  // ------------------------------------------------------------ controls
  const info = readout(null, { rows: [
    { key: 'd', label: 'To the goal', unit: 'm', format: (v) => v.toFixed(2) },
    { key: 't', label: 'Turret vs chassis', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'v', label: 'Launch speed needed', format: (v) => (v > 0 ? `${v.toFixed(1)} m/s` : 'out of reach') },
    { key: 'n', label: 'Balls fired', format: (v) => String(v) },
  ] });
  slider(ctx.panel, { label: 'Robot heading', min: -180, max: 180, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0),
    onInput: (v) => { st.headingTarget = v * DEG; wake(); } });
  const shoot = document.createElement('button');
  shoot.type = 'button'; shoot.className = 'rx-ui rx-btn'; shoot.textContent = 'Hold to shoot';
  shoot.setAttribute('aria-pressed', 'false');
  const setShoot = (on) => { st.shooting = on; shoot.setAttribute('aria-pressed', String(on)); if (on) { st.shootClock = 0.4; wake(); } };
  shoot.addEventListener('pointerdown', (e) => { e.preventDefault(); shoot.setPointerCapture?.(e.pointerId); setShoot(true); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) shoot.addEventListener(ev, () => setShoot(false));
  shoot.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); setShoot(true); } });
  shoot.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') setShoot(false); });
  shoot.addEventListener('contextmenu', (e) => e.preventDefault());
  shoot.style.touchAction = 'none';
  ctx.panel.append(shoot, info.el);

  // pointer: the floor point under the cursor (or the tap) becomes the drive target
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const LIM = FIELD / 2 - 0.26;
  function aimAt(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    if (!ray.ray.intersectPlane(plane, hit)) return;
    let x = clamp(hit.x, -LIM, LIM), z = clamp(hit.z, -LIM, LIM);
    // keep clear of the goal: the arc needs room to rise
    const gx = x - AIM.x, gz = z - AIM.z, gd = Math.hypot(gx, gz);
    if (gd < 1.0) { x = AIM.x + (gx / (gd || 1)) * 1.0; z = AIM.z + (gz / (gd || 1)) * 1.0; }
    st.target.set(x, z);
    wake();
  }
  const onMove = (e) => { if (e.pointerType === 'mouse') aimAt(e); };
  let down = null;
  const onDown = (e) => { if (e.pointerType !== 'mouse') down = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => { if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12) aimAt(e); down = null; };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointerup', onUp);
  el.style.cursor = 'crosshair';

  // ------------------------------------------------------------ simulation
  function place() {
    robot.position.set(st.pos.x, 0, st.pos.y);
    robot.rotation.y = st.heading;
    robot.updateWorldMatrix(true, true);
    key.target.position.set(st.pos.x, 0.2, st.pos.y);
    key.position.copy(key.target.position).add(keyOff);
  }
  function aimTurret(dt) {
    const L = modelToWorld([V2.yaw.x, 0, V2.yaw.z]);
    const want = wrap(Math.atan2(-(AIM.x - L.x), -(AIM.z - L.z)) - st.heading);
    const err = wrap(want - st.turret);
    const maxStep = 720 * DEG * dt;
    st.turret = dt > 0 ? st.turret + clamp(err, -maxStep, maxStep) : want;
    rig.setTurret(st.turret);
    return Math.abs(err) > 1e-3;
  }
  let loop = null;
  function wake() { if (!loop) loop = stage.onFrame(tick); }
  function tick(dt) {
    // drive: holonomic like the real mecanum chassis; translation is independent of heading
    const err = st.target.clone().sub(st.pos);
    const dist = err.length();
    const want = dist < 0.01 ? new THREE.Vector2() : err.multiplyScalar(4).clampLength(0, 1.6);
    const dv = want.clone().sub(st.vel).clampLength(0, 4 * dt);
    st.vel.add(dv);
    if (dist < 0.01 && st.vel.length() < 0.02) st.vel.set(0, 0);
    st.pos.addScaledVector(st.vel, dt);
    const hErr = wrap(st.headingTarget - st.heading);
    const hStep = clamp(hErr, -270 * DEG * dt, 270 * DEG * dt);
    st.heading = wrap(st.heading + hStep);
    const omega = dt > 0 ? hStep / dt : 0;
    place();
    // wheels: mecanum inverse kinematics from the robot-frame velocity (cosmetic)
    const c = Math.cos(st.heading), s = Math.sin(st.heading);
    const f = st.vel.x * s + st.vel.y * c, l = st.vel.x * c - st.vel.y * s; // robot forward (+Z) and left (+X)
    const k = 0.17 + 0.144; // half wheelbase + half track, from the wheel centres in the CAD
    const sp = { mecanum_lf: f - l - k * omega, mecanum_rf: f + l + k * omega, mecanum_lb: f + l - k * omega, mecanum_rb: f - l + k * omega };
    for (const n of wheelNames) { wheelAngle[n] += (sp[n] / 0.052) * dt; wheels[n].setAngle(wheelAngle[n]); }
    const turning = aimTurret(dt);
    // shooting
    if (st.shooting) {
      rig.setFly(rig.flyAngle - dt * 16);
      st.shootClock += dt;
      if (st.shootClock >= 0.4) { st.shootClock = 0; fire(); }
    }
    const flying = stepBalls(dt);
    const L = drawArc();
    info.set({ d: L.d, t: st.turret / DEG, v: L.v, n: st.fired });
    const moving = dist > 0.01 || st.vel.length() > 0 || Math.abs(hErr) > 1e-3 || turning;
    if (!moving && !flying && !st.shooting) { loop(); loop = null; }
  }

  place();
  aimTurret(0);
  const L0 = drawArc();
  info.set({ d: L0.d, t: st.turret / DEG, v: L0.v, n: 0 });
  stage.invalidate();

  return {
    dispose() {
      loop?.();
      el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointerup', onUp);
      tex.dispose(); green.dispose(); arc?.geometry.dispose();
      stage.dispose();
    },
  };
}
