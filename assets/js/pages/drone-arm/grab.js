// Scrolly: how the drone would pick up a bottle of water, animated on the real CAD and driven only
// by the scroll. The plan: a camera on the end of the arm finds the bottle and its position
// relative to the drone, the drone closes in and holds position, the arm uses inverse kinematics to
// reach the bottle and the claw closes, and the drone lifts off with it. None of this ran: the arm
// never flew. The table, the camera, its view and the detection box are drawn in (they are not in
// the CAD); the hover point, the path and the 25 degree jaw opening are choices for this animation.
// Every picture is a pure function of u = step + progress through it (0..5).
import { createStage } from '/assets/js/lib/stage.js';
import { loadArm, ik, fk, labels, S, G, ZP, RMAX, PHI_0, Q1_0, Q2_0, DEG, clamp, lerp, ease } from './rig.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const AMID = [0.33, 0.05], H = [0, 0], UP = 0.30;
const TILT = 18 * DEG;         // the planned camera looks this far below the forearm (not in the CAD)
const CAM = [0.330, -0.120];   // planned camera, above the claw servo in the CAD pose (not in the CAD)
// which view each step uses: the whole approach, or close on the table
const VIEW_OF = ['wide', 'wide', 'close', 'close', 'wide'];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const reduced = ctx.reducedMotion;
  const tallAtMount = el.clientHeight > el.clientWidth * 0.8;
  const A0 = tallAtMount ? [0.5, 0.12] : [0.75, 0.12]; // start of the approach; shorter on a tall (phone) stage so the drone starts in frame
  const rig = await loadArm(stage);
  const { model, fore } = rig;
  const bottle = rig.parts.bottle;

  // ---------------------------------------------------------------- key poses (drone frame, metres)
  const pose = (q1) => ({ q1: q1 * DEG, q2: wrap(PHI_0 - q1 * DEG) }); // forearm at its CAD angle: claw level
  const GRASP = pose(-75), HIGH = pose(-12);
  const gGrasp = fk(GRASP.q1, GRASP.q2).g, gHigh = fk(HIGH.q1, HIGH.q2).g;
  const gPre = [gGrasp[0] + 0.14, gGrasp[1]];

  // the bottle: its place in the claw (from the CAD), and where it stands on the table before the grab
  model.updateMatrixWorld(true);
  const Lb = fore.matrixWorld.clone().invert().multiply(bottle.matrixWorld);
  stage.root.attach(bottle);
  bottle.matrixAutoUpdate = false;
  rig.setJoints(GRASP.q1, GRASP.q2);
  model.position.set(H[0], H[1], 0);
  model.updateMatrixWorld(true);
  const Tb = fore.matrixWorld.clone().multiply(Lb);
  bottle.matrix.copy(Tb); bottle.matrixWorldNeedsUpdate = true; bottle.updateMatrixWorld(true);
  const bBox = new T.Box3().setFromObject(bottle);
  const tableY = bBox.min.y;
  const bottleC = bBox.getCenter(new T.Vector3());
  const gripW = new T.Vector3(gGrasp[0] + H[0], gGrasp[1] + H[1], ZP); // the grip point on the bottle, world

  // ---------------------------------------------------------------- a table (drawn in, not CAD)
  const scene = new T.Group(); scene.name = 'scene (not CAD)';
  const wood = new T.MeshStandardMaterial({ color: '#5d5046', roughness: 0.85 });
  const topGeo = new T.BoxGeometry(0.5, 0.025, 0.36);
  const top = new T.Mesh(topGeo, wood);
  const tx = bottleC.x - 0.09;
  top.position.set(tx, tableY - 0.0125, ZP);
  scene.add(top);
  const legGeo = new T.BoxGeometry(0.035, 0.725, 0.035);
  for (const [dx, dz] of [[-0.22, -0.15], [0.22, -0.15], [-0.22, 0.15], [0.22, 0.15]]) {
    const leg = new T.Mesh(legGeo, wood); leg.position.set(tx + dx, tableY - 0.025 - 0.3625, ZP + dz); scene.add(leg);
  }
  scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  stage.root.add(scene);
  stage.fitGround();

  // ---------------------------------------------------------------- IK overlay (drone frame), planned camera (forearm frame), detection box
  const lineMat = (c, o = 1) => new T.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false });
  const ikG = new T.Group();
  const bones = new T.Line(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(9), 3)), lineMat('#7fd4ff'));
  const ringPts = []; for (let i = 0; i <= 128; i++) { const a = (i / 128) * Math.PI * 2; ringPts.push(new T.Vector3(S[0] + RMAX * Math.cos(a), S[1] + RMAX * Math.sin(a), ZP)); }
  const reachRing = new T.Line(new T.BufferGeometry().setFromPoints(ringPts), lineMat('#7fd4ff', 0.16));
  const dotGeo = new T.SphereGeometry(0.007, 16, 12);
  const dotMat = new T.MeshBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true });
  const tDot = new T.Mesh(dotGeo, dotMat);
  const jMat = new T.MeshBasicMaterial({ color: '#7fd4ff', depthTest: false, transparent: true });
  const jS = new T.Mesh(dotGeo, jMat), jE = new T.Mesh(dotGeo, jMat), jG = new T.Mesh(dotGeo, jMat);
  jS.position.set(S[0], S[1], ZP);
  for (const o of [bones, reachRing, tDot, jS, jE, jG]) { o.renderOrder = 10; o.frustumCulled = false; ikG.add(o); }
  model.add(ikG);
  const ikMats = [[bones.material, 1], [reachRing.material, 0.16], [dotMat, 1], [jMat, 1]];

  // planned camera: on top of the claw, looking along the forearm and TILT below it; drawn as a frustum
  const camPlan = new T.Object3D();
  {
    model.position.set(0, 0, 0);
    rig.setJoints(Q1_0, Q2_0);
    model.updateMatrixWorld(true);
    const look = new T.PerspectiveCamera();
    look.position.set(CAM[0], CAM[1], ZP);
    const a = PHI_0 + TILT;
    look.lookAt(CAM[0] + Math.cos(a), CAM[1] + Math.sin(a), ZP);
    camPlan.position.copy(look.position); camPlan.quaternion.copy(look.quaternion);
    model.add(camPlan); camPlan.updateMatrixWorld(true);
    fore.attach(camPlan);
  }
  const far = 0.26, hh = far * Math.tan(25 * DEG), hw = hh * (4 / 3);
  const fr = [[0, 0, 0], [-hw, -hh, -far], [0, 0, 0], [hw, -hh, -far], [0, 0, 0], [hw, hh, -far], [0, 0, 0], [-hw, hh, -far],
    [-hw, -hh, -far], [hw, -hh, -far], [hw, -hh, -far], [hw, hh, -far], [hw, hh, -far], [-hw, hh, -far], [-hw, hh, -far], [-hw, -hh, -far]];
  const frustum = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(fr.flat()), 3)), lineMat('#ffd27a', 0.9));
  frustum.renderOrder = 11; frustum.frustumCulled = false;
  camPlan.add(frustum);
  // what the camera would report: a box around the bottle where it stands on the table
  const det = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1, 1, 1)), lineMat('#7fd4ff', 0.95));
  const bSize = bBox.getSize(new T.Vector3());
  det.scale.set(bSize.x + 0.02, bSize.y + 0.02, bSize.z + 0.02);
  det.position.copy(bottleC);
  det.renderOrder = 11; det.frustumCulled = false;
  stage.root.add(det);

  // ---------------------------------------------------------------- tags and readout
  const labs = labels(el);
  labs.add('table', { text: 'Table: drawn in, not CAD', side: 'r', cls: 'scene' });
  labs.add('cam', { text: 'Planned camera', side: 'r', cls: 'cam' });
  const narrow = el.clientWidth < 520; // a phone: the bottle's tag goes on its right, inside the stage
  labs.add('det', { text: 'Bottle found (the plan)', side: narrow ? 'r' : 'l', cls: 'ik' });
  labs.add('ik', { text: 'IK target', side: 'r', cls: 'ik' });
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  labs.box.append(hud);
  hud.innerHTML = `
    <div class="rx-hud-row"><span style="color:var(--accent);font-weight:650">The plan, animated</span><b>never flown</b></div>
    <table class="num"><tbody>
      <tr><td>Bottle from the shoulder</td><td data-k="b"></td></tr>
      <tr><td>Shoulder q1</td><td data-k="q1"></td></tr>
      <tr><td>Elbow q2</td><td data-k="q2"></td></tr>
      <tr><td>Claw</td><td data-k="c"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  const KK = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { KK[k].textContent = t; shown[k] = t; } };

  // ---------------------------------------------------------------- the sequence as a function of u
  function drone(u) {
    if (u < 1) { const k = ease(seg(u, 0, 0.7)); return [lerp(A0[0], AMID[0], k), lerp(A0[1], AMID[1], k)]; }
    if (u < 2) { const k = ease(seg(u, 1.1, 1.85)); return [lerp(AMID[0], H[0], k), lerp(AMID[1], H[1], k)]; }
    if (u < 4) return [H[0], H[1]];
    const k = ease(seg(u, 4.1, 4.9)); return [H[0], H[1] + UP * k];
  }
  function armTarget(u) { // grip point target in the drone frame
    const L = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
    if (u < 2) return L(G, gHigh, ease(seg(u, 0, 0.45)));
    if (u < 3) return u < 2.52 ? L(gHigh, gPre, ease(seg(u, 2.08, 2.5))) : L(gPre, gGrasp, ease(seg(u, 2.55, 2.95)));
    if (u < 4) return gGrasp;
    return L(gGrasp, G, ease(seg(u, 4.1, 4.9)));
  }
  const claw = (u) => seg(u, 2.0, 2.2) - seg(u, 3.1, 3.6);

  // ---------------------------------------------------------------- views, framed once per stage shape on fixed regions
  const regions = { wide: new T.Mesh(new T.BoxGeometry(1, 1, 0.05)), close: new T.Mesh(new T.BoxGeometry(1, 1, 0.05)) };
  const sph = (v) => ({ t: v.target.clone(), s: new T.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    const a = stage.camera.aspect; // the stage's own (it follows a resize)
    if (!views || a !== aspect) {
      aspect = a;
      const tall = a < 1.25;
      // the drone's path and the table top (the table legs run off the bottom), and close on the grab
      regions.wide.scale.set(tall ? 1.3 : 1.72, tall ? 1.0 : 0.98, 1);
      regions.wide.position.set(tall ? 0.5 : 0.6, -0.13, ZP);
      regions.close.scale.set(tall ? 0.8 : 1.0, 0.56, 1);
      regions.close.position.set(tall ? 0.33 : 0.38, -0.12, ZP);
      views = {};
      for (const [k, r] of Object.entries(regions)) {
        r.updateMatrixWorld(true);
        views[k] = sph(stage.frame(r, { azimuth: k === 'wide' ? 16 : 22, elevation: k === 'wide' ? 8 : 10, pad: 1.0, apply: false, refresh: true }));
      }
      labs.resize();
    }
    return views;
  }
  const sp = new T.Spherical();
  function place(a, b, k, drift) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: new T.Vector3().setFromSpherical(sp).add(target), target });
  }

  const tmp = new T.Vector3();
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 4);
    const [fx, fy] = ctx.shift();
    const phone = el.clientWidth < 640;
    stage.setShift(fx, phone ? -0.1 : fy);
    const u = step + (reduced ? 0.999 : stepP);
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const v = viewsNow();
    place(v[VIEW_OF[prev]], v[VIEW_OF[step]], k, reduced ? 0 : (p - 0.5) * 0.12);

    const d = drone(u);
    model.position.set(d[0], d[1], 0);
    const [gx, gy] = armTarget(u);
    const r = ik(gx - S[0], gy - S[1]);
    rig.setJoints(r.q1, r.q2);
    rig.setClaw(claw(u));
    rig.spin(reduced ? 0 : u * 9);
    model.updateMatrixWorld(true);
    const held = u >= 3.6;
    if (held) bottle.matrix.copy(fore.matrixWorld).multiply(Lb); else bottle.matrix.copy(Tb);
    bottle.updateMatrixWorld(true);

    // IK overlay: from the reach until the claw has closed
    const ikA = smooth(2.0, 2.15, u) * (1 - smooth(3.75, 3.95, u));
    ikG.visible = ikA > 0.01;
    for (const [m, o] of ikMats) m.opacity = o * ikA;
    const { e, g } = fk(r.q1, r.q2);
    bones.geometry.attributes.position.array.set([S[0], S[1], ZP, e[0], e[1], ZP, g[0], g[1], ZP]);
    bones.geometry.attributes.position.needsUpdate = true;
    jE.position.set(e[0], e[1], ZP); jG.position.set(g[0], g[1], ZP); tDot.position.set(gx, gy, ZP);
    // camera and detection: from finding the bottle until the reach starts
    const camA = smooth(0.5, 0.7, u) * (1 - smooth(2.0, 2.2, u));
    const detA = smooth(0.7, 0.9, u) * (1 - smooth(2.0, 2.2, u));
    frustum.material.opacity = 0.9 * camA; frustum.visible = camA > 0.01;
    det.material.opacity = 0.95 * detA; det.visible = detA > 0.01;
    stage.invalidate();

    labs.point('table', new T.Vector3(tx + 0.25, tableY - 0.012, ZP + 0.18)); labs.alpha('table', 1);
    camPlan.getWorldPosition(tmp); labs.point('cam', tmp.clone()); labs.alpha('cam', camA * (1 - smooth(1.8, 2, u)));
    labs.point('det', new T.Vector3(bottleC.x + (narrow ? 1 : -1) * (bSize.x / 2 + 0.01), bottleC.y + bSize.y / 2 + (narrow ? 0.03 : 0), ZP)); labs.alpha('det', detA);
    labs.point('ik', new T.Vector3(gx + d[0], gy + d[1], ZP)); labs.alpha('ik', ikA);
    labs.update(stage.camera);

    const bu = (gripW.x - (S[0] + d[0])) * 1000, bv = (gripW.y - (S[1] + d[1])) * 1000;
    const c = claw(u), cs = c > 0.99 ? 'open' : c < 0.01 ? (held ? 'closed on the bottle' : 'closed') : u > 3 ? 'closing' : 'opening';
    put('b', held ? 'in the claw' : `${bu.toFixed(0)}, ${bv.toFixed(0)} mm`);
    put('q1', `${(r.q1 / DEG).toFixed(1)}°`); put('q2', `${(r.q2 / DEG).toFixed(1)}°`); put('c', cs);
    put('mini', `q1 ${(r.q1 / DEG).toFixed(1)}°, q2 ${(r.q2 / DEG).toFixed(1)}°, claw ${cs}`);
  }
  setProgress(0, 0, 0);

  return {
    setProgress,
    dispose() {
      labs.dispose();
      for (const o of [bones, reachRing, frustum, det]) { o.geometry.dispose(); o.material.dispose(); }
      dotGeo.dispose(); dotMat.dispose(); jMat.dispose(); legGeo.dispose(); topGeo.dispose(); wood.dispose();
      for (const r of Object.values(regions)) { r.geometry.dispose(); r.material.dispose(); }
      stage.dispose();
    },
  };
}
