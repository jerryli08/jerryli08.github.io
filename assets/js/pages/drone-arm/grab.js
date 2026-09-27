// Demo: how the drone would pick up a bottle of water, animated on the real CAD. The plan: a camera
// on the end of the arm finds the bottle and its position relative to the drone, the drone closes
// in and holds position, and the arm uses inverse kinematics to reach the bottle and close the claw.
// None of this ran: the arm never flew. The table, the camera and its view are drawn in (they are
// not in the CAD). The whole sequence is a function of time t, so the scrubber can go both ways.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, segmented } from '/assets/js/lib/ui.js';
import { loadArm, ik, fk, labels, hud, S, G, ZP, RMAX, PHI_0, Q1_0, Q2_0, DEG, clamp, lerp, ease } from './rig.js';

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const T_END = 15;
const PHASES = [
  { t: 0, name: '1. Approach' },
  { t: 2.5, name: '2. The camera on the arm finds the bottle' },
  { t: 4.5, name: '3. Close in and hold position' },
  { t: 7.0, name: '4. Reach it with inverse kinematics' },
  { t: 10.0, name: '5. Close the claw' },
  { t: 11.0, name: '6. Lift off with it' },
  { t: 14.5, name: 'Done: back in the CAD pose, holding the bottle' },
];
const AMID = [0.33, 0.05], H = [0, 0], UP = 0.30;
const TILT = 18 * DEG; // the planned camera looks this far below the forearm (not in the CAD)
const CAM = [0.330, -0.120]; // planned camera, above the claw servo in the CAD pose (not in the CAD)
const INSET = [208, 156];

const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

export async function mount(el, ctx) {
  const stage = createStage(el, { hint: ctx.isTouch ? 'Swipe sideways to turn' : 'Drag to rotate' });
  const tallAtMount = el.clientHeight > el.clientWidth * 0.8;
  const A0 = tallAtMount ? [0.5, 0.12] : [0.75, 0.12]; // start of the approach; shorter on a tall (phone) canvas so the drone starts in frame
  const T = stage.THREE;
  const rig = await loadArm(stage);
  const { model, fore } = rig;
  const bottle = rig.parts.bottle;

  // ---------------------------------------------------------------- key poses (drone frame, metres)
  const pose = (q1) => ({ q1: q1 * DEG, q2: wrap(PHI_0 - q1 * DEG) }); // forearm at its CAD angle: claw level
  const GRASP = pose(-75), HIGH = pose(-12);
  const gGrasp = fk(GRASP.q1, GRASP.q2).g, gHigh = fk(HIGH.q1, HIGH.q2).g;
  const gPre = [gGrasp[0] + 0.14, gGrasp[1]];

  // bottle: its place in the claw (from the CAD), and where it stands on the table before the grab
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

  // ---------------------------------------------------------------- scene: a table (not CAD)
  const scene = new T.Group(); scene.name = 'scene (not CAD)';
  const wood = new T.MeshStandardMaterial({ color: '#5d5046', roughness: 0.85 });
  const top = new T.Mesh(new T.BoxGeometry(0.5, 0.025, 0.36), wood);
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

  // ---------------------------------------------------------------- IK overlay (drone frame) and the planned camera (forearm frame)
  const lineMat = (c, o = 1) => new T.LineBasicMaterial({ color: c, transparent: true, opacity: o, depthTest: false });
  const ikG = new T.Group(); ikG.renderOrder = 10;
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

  // planned camera: on top of the claw, looking along the forearm and TILT below it.
  // Placed in the CAD pose (drone at the origin), then hung on the forearm.
  const camPlan = new T.PerspectiveCamera(50, INSET[0] / INSET[1], 0.02, 4);
  {
    model.position.set(0, 0, 0);
    rig.setJoints(Q1_0, Q2_0);
    model.updateMatrixWorld(true);
    camPlan.position.set(CAM[0], CAM[1], ZP);
    const a = PHI_0 + TILT;
    camPlan.up.set(0, 1, 0);
    camPlan.lookAt(CAM[0] + Math.cos(a), CAM[1] + Math.sin(a), ZP);
    camPlan.updateMatrixWorld(true);
    fore.attach(camPlan);
  }
  const far = 0.26, hh = far * Math.tan(25 * DEG), hw = hh * (INSET[0] / INSET[1]);
  const fr = [[0, 0, 0], [-hw, -hh, -far], [0, 0, 0], [hw, -hh, -far], [0, 0, 0], [hw, hh, -far], [0, 0, 0], [-hw, hh, -far],
    [-hw, -hh, -far], [hw, -hh, -far], [hw, -hh, -far], [hw, hh, -far], [hw, hh, -far], [-hw, hh, -far], [-hw, hh, -far], [-hw, -hh, -far]];
  const frustum = new T.LineSegments(new T.BufferGeometry().setAttribute('position', new T.BufferAttribute(new Float32Array(fr.flat()), 3)), lineMat('#ffd27a', 0.9));
  frustum.renderOrder = 11; frustum.frustumCulled = false;
  camPlan.add(frustum);

  // ---------------------------------------------------------------- inset: what the planned camera would see
  const inset = document.createElement('div');
  inset.className = 'da-inset';
  inset.innerHTML = '<canvas></canvas><span>Planned camera view (simulated)</span>';
  const icv = inset.querySelector('canvas');
  icv.width = INSET[0]; icv.height = INSET[1];
  const ictx = icv.getContext('2d');
  const style = document.createElement('style');
  style.textContent = `.da-inset { position: absolute; right: 12px; top: 12px; z-index: 4; width: min(${INSET[0]}px, 34%); border-radius: 10px; overflow: hidden;
    border: 1px solid rgba(255,210,122,.55); background: #16130f; pointer-events: none; transition: opacity .25s; }
  .da-inset canvas { display: block; width: 100%; height: auto; }
  .da-inset span { position: absolute; left: 6px; bottom: 5px; font: 600 10.5px/1.2 var(--font, system-ui, sans-serif); color: #ffd27a; text-shadow: 0 1px 2px #000; }
  .da-inset[hidden] { display: none; }
  @media (prefers-reduced-motion: reduce) { .da-inset { transition: none; } }`;
  el.append(style, inset);
  const rt = new T.WebGLRenderTarget(INSET[0], INSET[1]);
  const px = new Uint8Array(INSET[0] * INSET[1] * 4);
  const img = ictx.createImageData(INSET[0], INSET[1]);
  const gam = new Uint8Array(256); for (let i = 0; i < 256; i++) gam[i] = Math.round(255 * Math.pow(i / 255, 1 / 2.2));
  const corners = Array.from({ length: 8 }, () => new T.Vector3());
  function renderInset() {
    const r = stage.renderer;
    const vis = [ikG.visible, frustum.visible];
    ikG.visible = false; frustum.visible = false;
    camPlan.updateMatrixWorld(true);
    const prev = r.getRenderTarget();
    r.setRenderTarget(rt);
    r.setClearColor(0x16130f, 1);
    r.clear();
    r.render(stage.scene, camPlan);
    r.readRenderTargetPixels(rt, 0, 0, INSET[0], INSET[1], px);
    r.setRenderTarget(prev);
    r.setClearColor(0x000000, 0);
    [ikG.visible, frustum.visible] = vis;
    const W = INSET[0], Hh = INSET[1], d = img.data;
    for (let y = 0; y < Hh; y++) {
      const src = (Hh - 1 - y) * W * 4, dst = y * W * 4;
      for (let x = 0; x < W * 4; x += 4) { d[dst + x] = gam[px[src + x]]; d[dst + x + 1] = gam[px[src + x + 1]]; d[dst + x + 2] = gam[px[src + x + 2]]; d[dst + x + 3] = 255; }
    }
    ictx.putImageData(img, 0, 0);
    // detection box around the bottle
    const b = new T.Box3().setFromObject(bottle);
    let i = 0;
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) corners[i++].set(x, y, z);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, ok = true;
    for (const c of corners) { c.project(camPlan); if (c.z > 1 || c.z < -1) ok = false; x0 = Math.min(x0, c.x); x1 = Math.max(x1, c.x); y0 = Math.min(y0, c.y); y1 = Math.max(y1, c.y); }
    if (ok && x1 > -1 && x0 < 1 && y1 > -1 && y0 < 1) {
      const X = (v) => ((v + 1) / 2) * W, Y = (v) => ((1 - v) / 2) * Hh;
      ictx.strokeStyle = '#7fd4ff'; ictx.lineWidth = 2;
      ictx.strokeRect(X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1));
      ictx.fillStyle = '#7fd4ff'; ictx.font = '600 11px system-ui, sans-serif';
      ictx.fillText('bottle', X(x0) + 2, Math.max(11, Y(y1) - 4));
    }
  }

  // ---------------------------------------------------------------- labels and HUD
  const labs = labels(el);
  labs.add('table', { text: 'Table: drawn in, not CAD', side: 'r', cls: 'scene' });
  labs.add('cam', { text: 'Planned camera', side: 'r', cls: 'cam' });
  labs.add('ik', { text: 'IK target', side: 'r', cls: 'ik' });
  const phaseHud = hud(el);

  // ---------------------------------------------------------------- the sequence as a function of t
  function drone(t) {
    let x, y;
    if (t < 2.5) { const k = ease(seg(t, 0, 2.5)); x = lerp(A0[0], AMID[0], k); y = lerp(A0[1], AMID[1], k); }
    else if (t < 4.5) { x = AMID[0]; y = AMID[1]; }
    else if (t < 7.0) { const k = ease(seg(t, 4.5, 7.0)); x = lerp(AMID[0], H[0], k); y = lerp(AMID[1], H[1], k); }
    else if (t < 11.0) { x = H[0]; y = H[1]; }
    else { const k = ease(seg(t, 11.0, 14.5)); x = H[0]; y = H[1] + UP * k; }
    // a small position-hold wobble while hovering, faded out around the grasp
    const w = Math.min(seg(t, 2.3, 2.8) - seg(t, 4.3, 4.6) + seg(t, 6.6, 7.2), 1) * (1 - seg(t, 9.0, 9.6) + seg(t, 11.2, 11.8));
    x += 0.004 * w * Math.sin(t * 4.4); y += 0.003 * w * Math.sin(t * 5.7 + 1);
    return [x, y];
  }
  function armTarget(t, d) {
    // drone-frame target for the grip point
    if (t < 7.0) { const k = ease(seg(t, 0, 1.2)); return [lerp(G[0], gHigh[0], k), lerp(G[1], gHigh[1], k)]; }
    if (t < 11.0) {
      const d7 = drone(7.0);
      const wHigh = [gHigh[0] + d7[0], gHigh[1] + d7[1]], wPre = [gPre[0] + H[0], gPre[1] + H[1]], wGr = [gGrasp[0] + H[0], gGrasp[1] + H[1]];
      let w;
      if (t < 8.8) { const k = ease(seg(t, 7.0, 8.8)); w = [lerp(wHigh[0], wPre[0], k), lerp(wHigh[1], wPre[1], k)]; }
      else if (t < 10.0) { const k = ease(seg(t, 8.8, 10.0)); w = [lerp(wPre[0], wGr[0], k), lerp(wPre[1], wGr[1], k)]; }
      else w = wGr;
      return [w[0] - d[0], w[1] - d[1]];
    }
    const k = ease(seg(t, 11.0, 14.5));
    return [lerp(gGrasp[0], G[0], k), lerp(gGrasp[1], G[1], k)];
  }
  const claw = (t) => seg(t, 7.0, 7.6) - seg(t, 10.0, 10.8);

  const info = readout(null, { rows: [
    { key: 'b', label: 'Bottle from the shoulder' },
    { key: 'q1', label: 'Shoulder q1', unit: '°', format: (v) => v.toFixed(1) },
    { key: 'q2', label: 'Elbow q2', unit: '°', format: (v) => v.toFixed(1) },
    { key: 'c', label: 'Claw' },
  ] });
  let showIK = true, t = 0;
  const tmp = new T.Vector3();
  function setTime(tt) {
    t = clamp(tt, 0, T_END);
    const d = drone(t);
    model.position.set(d[0], d[1], 0);
    const [gx, gy] = armTarget(t, d);
    const r = ik(gx - S[0], gy - S[1]);
    rig.setJoints(r.q1, r.q2);
    rig.setClaw(claw(t));
    rig.spin(t * 26);
    model.updateMatrixWorld(true);
    const held = t >= 10.8;
    if (held) bottle.matrix.copy(fore.matrixWorld).multiply(Lb); else bottle.matrix.copy(Tb);
    bottle.updateMatrixWorld(true);
    // IK overlay
    const { e, g } = fk(r.q1, r.q2);
    const pa = bones.geometry.attributes.position.array;
    pa.set([S[0], S[1], ZP, e[0], e[1], ZP, g[0], g[1], ZP]);
    bones.geometry.attributes.position.needsUpdate = true;
    jE.position.set(e[0], e[1], ZP); jG.position.set(g[0], g[1], ZP); tDot.position.set(gx, gy, ZP);
    ikG.visible = showIK && t >= 7.0 && t < 14.5;
    // camera: shown from detection until the claw closes
    const camOn = t >= 2.5 && t < 10.8;
    frustum.visible = camOn;
    inset.hidden = !camOn;
    if (camOn) renderInset();
    // labels and readouts
    const phase = PHASES.filter((p) => p.t <= t + 1e-6).pop();
    phaseHud.set(phase.name, t >= 14.5 ? 'ok' : '');
    labs.point('table', new T.Vector3(tx + 0.25, tableY - 0.012, ZP + 0.18));
    labs.show('cam', camOn && t < 7.0);
    camPlan.getWorldPosition(tmp); labs.point('cam', tmp.clone());
    labs.show('ik', ikG.visible);
    labs.point('ik', new T.Vector3(gx + d[0], gy + d[1], ZP));
    labs.update(stage.camera);
    const bu = (gripW.x - (S[0] + d[0])) * 1000, bv = (gripW.y - (S[1] + d[1])) * 1000;
    info.set({ b: held ? 'in the claw' : `${bu.toFixed(0)}, ${bv.toFixed(0)} mm`, q1: r.q1 / DEG, q2: r.q2 / DEG, c: claw(t) > 0.99 ? 'open' : claw(t) < 0.01 ? (held ? 'closed on the bottle' : 'closed') : 'moving' });
    scrub.set(t, { silent: true });
    stage.invalidate();
  }

  // ---------------------------------------------------------------- controls
  let playing = false, speed = 1, stopLoop = null;
  const play = playToggle(ctx.panel, { playing: false, labels: [ctx.reducedMotion ? 'Next step' : 'Play the plan', 'Pause'],
    onChange(on) {
      if (ctx.reducedMotion) {
        // no animation: jump to the end of the next step
        const next = PHASES.find((p) => p.t > t + 1e-3);
        setTime(next ? next.t : 0);
        play.set(false, { silent: true });
        return;
      }
      playing = on;
      stopLoop?.(); stopLoop = null;
      if (!on) return;
      if (t >= T_END - 1e-3) setTime(0);
      stopLoop = stage.onFrame((dt) => {
        setTime(t + dt * speed);
        if (t >= T_END) { play.set(false); }
      });
    } });
  const scrub = slider(ctx.panel, { label: 'Time', min: 0, max: T_END, step: 0.05, value: 0, unit: ' s', format: (v) => v.toFixed(1),
    onInput(v) { if (playing) play.set(false); setTime(v); } });
  if (!ctx.reducedMotion) segmented(ctx.panel, { label: 'Speed', options: [{ value: 0.5, label: '0.5x' }, { value: 1, label: '1x' }], value: 1, onChange: (v) => { speed = v; } });
  segmented(ctx.panel, { label: 'IK overlay', options: [{ value: 1, label: 'On' }, { value: 0, label: 'Off' }], value: 1, onChange: (v) => { showIK = !!v; setTime(t); } });
  ctx.panel.append(info.el);

  // ---------------------------------------------------------------- camera
  const region = new T.Mesh(new T.BoxGeometry(1, 1, 0.05));
  const frameIt = () => {
    const tall = el.clientHeight > el.clientWidth * 0.8;
    // the drone's path and the table top; the table legs run off the bottom
    region.scale.set(tall ? 1.3 : 1.72, tall ? 1.0 : 0.98, 1);
    region.position.set(tall ? 0.5 : 0.6, -0.13, ZP);
    region.updateMatrixWorld(true);
    stage.frame(region, { azimuth: 16, elevation: 8, pad: 1.0, refresh: true });
  };
  frameIt();
  stage.controls?.addEventListener('change', () => labs.update(stage.camera));
  const ro = new ResizeObserver(() => requestAnimationFrame(() => labs.update(stage.camera)));
  ro.observe(el);
  setTime(0);

  return {
    dispose() {
      stopLoop?.(); ro.disconnect(); labs.dispose(); phaseHud.dispose(); inset.remove(); style.remove(); rt.dispose();
      for (const o of [bones, reachRing, frustum]) { o.geometry.dispose(); o.material.dispose(); }
      dotGeo.dispose(); dotMat.dispose(); jMat.dispose(); legGeo.dispose(); wood.dispose(); top.geometry.dispose(); region.geometry.dispose(); region.material.dispose();
      stage.dispose();
    },
  };
}
