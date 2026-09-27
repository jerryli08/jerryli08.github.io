// "Follow the line": the drone flies an LED line past hoops, steered by the vision and control code
// of our line-following flight script (line-core.js has the port and every constant). Drag the white
// handles to reshape the course, drag the hoops or the glare spot, double-click the line to add a
// handle, right-click (or long-press) a handle to remove it. The inset shows what the downward camera
// sees and what the code does to that picture, every control tick.
//
// The drone is Jerry's CAD (the screws left out); its props turn about their motor shafts from the
// STEP file (Z axis through each motor, STEP mm): (241.1, -65.3), (594.8, -65.3), (241.1, 288.4),
// (594.8, 288.4). Diagonal pairs turn opposite ways, as on any quadcopter.
// Simulation assumptions are listed in line-core.js and in the section caption.
import * as THREE from 'three';
import { createStage, cad } from '/assets/js/lib/stage.js';
import { playToggle, segmented, button, readout } from '/assets/js/lib/ui.js';
import { SCRIPT, SIM, buildCourse, createSim, detect, control, toFloor, hoopSegment, nearest, DEFAULT_COURSE, DEFAULT_HOOPS, DEFAULT_GLARE } from './line-core.js';
import { MODEL, loadDrone, css } from './drone-common.js';

const FLOOR = { x0: -3.7, x1: 3.7, z0: -2.25, z1: 2.25 };
const MAX_HOOPS = 5;
const GEAR = 0.0826; // landing gear feet below the top plate, from the CAD
const { W, H } = SCRIPT;

const CSS = `
.adr-lf .rx-hint { display: none; }
.adr-lf canvas.rx-canvas { cursor: default; }
.adr-hud { position: absolute; z-index: 4; left: 12px; top: 12px; right: 12px; display: flex; flex-wrap: wrap; gap: 6px; pointer-events: none; }
.adr-chip { padding: 5px 11px; border-radius: 999px; font-size: 12.5px; font-weight: 620; line-height: 1.3; color: var(--text); background: rgba(12, 10, 9, .74);
  border: 1px solid rgba(255, 255, 255, .12); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.adr-chip.warn { color: #1a0b04; background: #ffb454; border-color: #ffb454; }
.adr-chip.bad { color: #fff; background: #c9372c; border-color: #c9372c; }
.adr-chip.illus { color: var(--text-2); font-weight: 550; }
.adr-inset { position: absolute; z-index: 4; right: 12px; bottom: 12px; width: min(36%, 336px); margin: 0; border-radius: 12px; overflow: hidden;
  background: #000; border: 1px solid rgba(255, 255, 255, .16); box-shadow: 0 8px 28px rgba(0, 0, 0, .45); }
.adr-inset canvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; }
.adr-inset figcaption { padding: 5px 10px 6px; font-size: 11.5px; line-height: 1.35; color: var(--text-2); background: rgba(20, 18, 16, .92); }
.rx-panel .adr-inset { position: static; width: 100%; flex: 1 1 100%; box-shadow: none; }
.adr-help { flex: 1 1 100%; margin: 0; font-size: 12.5px; line-height: 1.45; color: var(--muted); }
.adr-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; flex: 1 1 100%; }
.adr-lf .rx-readout { flex: 1 1 100%; }
`;

// ------------------------------------------------------------------ small drawing helpers
function ribbon(pts, closed, width, y) {
  // flat strip along a polyline on the floor: pts [[x, z], ...]
  const n = pts.length, m = closed ? n + 1 : n;
  const pos = new Float32Array(m * 2 * 3), uv = new Float32Array(m * 2 * 2), idx = [];
  let len = 0;
  for (let k = 0; k < m; k++) {
    const i = k % n;
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    if (k > 0) { const p = pts[(k - 1) % n]; len += Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]); }
    const nx = -tz * width / 2, nz = tx * width / 2;
    pos.set([pts[i][0] + nx, y, pts[i][1] + nz, pts[i][0] - nx, y, pts[i][1] - nz], k * 6);
    uv.set([len, 0, len, 1], k * 4);
    if (k < m - 1) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const glowTex = () => canvasTex(4, 64, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
const radialTex = () => canvasTex(128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
// generic square fiducial for the hoops (the family is not confirmed, so not a real tag pattern)
const tagTex = () => canvasTex(64, 64, (g) => {
  g.fillStyle = '#fff'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#000'; g.fillRect(6, 6, 52, 52);
  g.fillStyle = '#fff';
  const bits = [0b1011, 0b0110, 0b1100, 0b0101];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if ((bits[r] >> c) & 1) g.fillRect(14 + c * 9, 14 + r * 9, 9, 9);
});
const stripeTex = () => canvasTex(256, 8, (g, w, h) => {
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#141414' : '#f2c21b'; g.fillRect((i * w) / 16, 0, w / 16 + 1, h); }
});
const gridTex = () => canvasTex(512, 512, (g, w) => {
  g.fillStyle = '#1b1c1f'; g.fillRect(0, 0, w, w);
  let s = 11;
  for (let i = 0; i < 900; i++) { // faint floor speckle
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const x = s % w; s = (s * 1103515245 + 12345) & 0x7fffffff; const y = s % w;
    g.fillStyle = `rgba(255,255,255,${0.025 + (s % 7) * 0.006})`; g.fillRect(x, y, 2, 2);
  }
  g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, w - 2);
});

// ------------------------------------------------------------------ mount
export async function mount(el, ctx) {
  css('adr-lf-css', CSS);
  el.classList.add('adr-lf');
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false, fov: 28 });
  const { camera, canvas } = stage;
  canvas.style.pointerEvents = 'auto';
  canvas.style.touchAction = 'pan-y';

  // ---------------------------------------------------------------- floor, course, hoops, glare
  const world = new THREE.Group(); world.name = 'course-world';
  stage.root.add(world);
  const fw = FLOOR.x1 - FLOOR.x0, fd = FLOOR.z1 - FLOOR.z0;
  const ftex = gridTex(); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(fw, fd); // one tile per metre
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.94, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((FLOOR.x0 + FLOOR.x1) / 2, 0, (FLOOR.z0 + FLOOR.z1) / 2);
  floor.receiveShadow = true; floor.name = 'floor';
  world.add(floor);

  const lineCoreMat = new THREE.MeshBasicMaterial({ color: '#fffdf6', toneMapped: false, side: THREE.DoubleSide });
  const lineGlowMat = new THREE.MeshBasicMaterial({ map: glowTex(), color: '#fff1d6', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const lineCore = new THREE.Mesh(new THREE.BufferGeometry(), lineCoreMat); lineCore.position.y = 0.004;
  const lineGlow = new THREE.Mesh(new THREE.BufferGeometry(), lineGlowMat); lineGlow.position.y = 0.003;
  lineCore.renderOrder = 2; lineGlow.renderOrder = 1;
  world.add(lineGlow, lineCore);

  const handleGeo = new THREE.CircleGeometry(0.058, 28).rotateX(-Math.PI / 2);
  const handleRing = new THREE.RingGeometry(0.058, 0.082, 28).rotateX(-Math.PI / 2);
  const handleMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });
  const handleHot = new THREE.MeshBasicMaterial({ color: '#ff6b35', toneMapped: false });
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ff6b35', toneMapped: false });
  const handles = new THREE.Group(); handles.name = 'handles'; world.add(handles);

  const glareMat = new THREE.MeshBasicMaterial({ map: radialTex(), color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const glareMesh = new THREE.Mesh(new THREE.PlaneGeometry(SIM.GLARE_R * 5, SIM.GLARE_R * 5).rotateX(-Math.PI / 2), glareMat);
  glareMesh.position.y = 0.006; glareMesh.visible = false; world.add(glareMesh);

  const stripes = stripeTex(); stripes.wrapS = THREE.RepeatWrapping;
  const ringGeo = new THREE.TorusGeometry(SIM.HOOP_D / 2, 0.022, 10, 72);
  const tagGeo = new THREE.PlaneGeometry(0.11, 0.11);
  const tagTexture = tagTex();
  const postGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 8);
  const hoopMeshes = new Map();
  function makeHoop(hp) {
    const g = new THREE.Group(); g.name = 'hoop';
    const ringMatH = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5, metalness: 0, emissive: '#000000' });
    const ring = new THREE.Mesh(ringGeo, ringMatH); ring.castShadow = true; ring.position.y = SIM.ALT;
    g.add(ring);
    const tagMat = new THREE.MeshBasicMaterial({ map: tagTexture, toneMapped: false, color: '#dddddd', side: THREE.DoubleSide });
    for (let k = 0; k < 4; k++) { // tags at 12, 3, 6 and 9 o'clock, like the race hoops
      const a = (k * Math.PI) / 2, r = SIM.HOOP_D / 2 + 0.075;
      const t = new THREE.Mesh(tagGeo, tagMat); t.position.set(Math.sin(a) * r, SIM.ALT + Math.cos(a) * r, 0);
      g.add(t);
    }
    const r = SIM.HOOP_D / 2, a = r * 0.72, top = SIM.ALT - Math.sqrt(r * r - a * a);
    for (const sx of [-1, 1]) { // two thin stands from the floor up to the ring
      const post = new THREE.Mesh(postGeo, ringMatH);
      post.scale.y = top; post.position.set(sx * a, top / 2, 0); post.castShadow = true;
      g.add(post);
    }
    g.userData = { ringMat: ringMatH, tagMat };
    world.add(g);
    hoopMeshes.set(hp, g);
    return g;
  }

  // ---------------------------------------------------------------- overlays (annotations)
  const annot = new THREE.Group(); annot.name = 'annotations'; world.add(annot);
  const footMat = new THREE.MeshBasicMaterial({ color: '#ff9a62', transparent: true, opacity: 0.9, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const foot = new THREE.Mesh(new THREE.BufferGeometry(), footMat); foot.position.y = 0.008; foot.renderOrder = 3; annot.add(foot);
  const footFillMat = new THREE.MeshBasicMaterial({ color: '#ff9a62', transparent: true, opacity: 0.07, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const footFill = new THREE.Mesh(new THREE.BufferGeometry(), footFillMat); footFill.position.y = 0.007; annot.add(footFill);
  const fitMat = new THREE.MeshBasicMaterial({ color: '#3ddc84', toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const fitMesh = new THREE.Mesh(new THREE.BufferGeometry(), fitMat); fitMesh.position.y = 0.011; fitMesh.renderOrder = 4; annot.add(fitMesh);
  // where the drone is over the floor: a thin plumb line and a ring on the floor (annotation)
  const plumb = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, toneMapped: false, depthWrite: false }));
  const plumbRing = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }));
  plumbRing.position.y = 0.012; annot.add(plumb, plumbRing);
  const tgt = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff6b35', toneMapped: false, depthWrite: false }));
  tgt.position.y = 0.013; tgt.renderOrder = 5; annot.add(tgt);
  const wedgeMat = new THREE.MeshBasicMaterial({ color: '#7cc4ff', transparent: true, opacity: 0.04, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const wedge = new THREE.Mesh(new THREE.BufferGeometry(), wedgeMat); wedge.position.y = 0.009; annot.add(wedge);
  const wedgeEdgeMat = new THREE.MeshBasicMaterial({ color: '#7cc4ff', transparent: true, opacity: 0.45, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const wedgeEdge = new THREE.Mesh(new THREE.BufferGeometry(), wedgeEdgeMat); wedgeEdge.position.y = 0.01; annot.add(wedgeEdge);

  // ---------------------------------------------------------------- the drone (real CAD)
  const drone = new THREE.Group(); drone.name = 'drone';
  const D = await loadDrone(stage, { add: false });
  drone.add(D.wrap);
  world.add(drone);
  stage.fitGround();
  stage.ground.visible = false; // the floor takes the shadow

  // ---------------------------------------------------------------- simulation state
  let course = buildCourse(DEFAULT_COURSE.map((p) => p.slice()));
  const sim = createSim({ course, hoops: DEFAULT_HOOPS.map((h) => ({ ...h })), glare: null });
  let glareOn = false;
  const glarePos = { ...DEFAULT_GLARE };

  function rebuildCourse(ctrl) {
    course = buildCourse(ctrl);
    sim.course = course;
    sim.refreshHoops();
    const pts = []; for (let i = 0; i < course.n; i++) pts.push([course.xs[i], course.zs[i]]);
    lineCore.geometry.dispose(); lineCore.geometry = ribbon(pts, true, 0.024, 0);
    lineGlow.geometry.dispose(); lineGlow.geometry = ribbon(pts, true, 0.2, 0);
    // handles
    while (handles.children.length > course.ctrl.length) handles.remove(handles.children[handles.children.length - 1]);
    while (handles.children.length < course.ctrl.length) {
      const h = new THREE.Group();
      const dot = new THREE.Mesh(handleGeo, handleMat); const rim = new THREE.Mesh(handleRing, ringMat);
      dot.renderOrder = 6; rim.renderOrder = 6; h.add(rim, dot); h.position.y = 0.016;
      handles.add(h);
    }
    course.ctrl.forEach((p, i) => handles.children[i].position.set(p[0], 0.016, p[1]));
    placeHoops();
  }
  function placeHoops() {
    for (const [hp, g] of hoopMeshes) if (!sim.hoops.includes(hp)) { world.remove(g); g.userData.ringMat.dispose(); g.userData.tagMat.dispose(); hoopMeshes.delete(hp); }
    sim.hoops.forEach((hp, i) => {
      const g = hoopMeshes.get(hp) || makeHoop(hp);
      const sg = sim.segs[i] || hoopSegment(course, hp);
      g.position.set(hp.x, 0, hp.z);
      g.rotation.y = Math.atan2(-sg.tz, sg.tx); // ring plane along the rope (stand-in)
    });
  }
  function placeGlare() {
    glareMesh.visible = glareOn;
    glareMesh.position.set(glarePos.x, 0.006, glarePos.z);
    sim.glare = glareOn ? glarePos : null;
  }
  rebuildCourse(course.ctrl);
  placeGlare();

  // ---------------------------------------------------------------- camera framing
  let portrait = null;
  function frameView(force) {
    const p = el.clientHeight > el.clientWidth * 1.05;
    if (!force && p === portrait) return;
    portrait = p;
    stage.frame(floor, { azimuth: p ? 90 : 0, elevation: p ? 60 : 56, pad: 1.0 });
  }
  frameView(true);

  // ---------------------------------------------------------------- HUD, inset, panel
  const hud = document.createElement('div'); hud.className = 'adr-hud';
  const chipState = document.createElement('span'); chipState.className = 'adr-chip';
  const chipIllus = document.createElement('span'); chipIllus.className = 'adr-chip illus'; chipIllus.textContent = 'Hoop reaction: illustrative stand-in';
  hud.append(chipState, chipIllus);
  el.appendChild(hud);

  const inset = document.createElement('figure'); inset.className = 'adr-inset';
  const ic = document.createElement('canvas'); ic.width = W; ic.height = H;
  ic.setAttribute('role', 'img'); ic.setAttribute('aria-label', 'What the downward camera sees, and the line the code finds in it');
  const icap = document.createElement('figcaption');
  inset.append(ic, icap);
  const g2 = ic.getContext('2d');
  const img = g2.createImageData(W, H);

  const panel = ctx.panel;
  const row1 = document.createElement('div'); row1.className = 'adr-row';
  const row2 = document.createElement('div'); row2.className = 'adr-row';
  panel.append(row1, row2);

  let playing = false, speed = 5, view = 'fit';
  let play = null;
  if (!reduced) {
    play = playToggle(row1, { playing: false, labels: ['Fly', 'Pause'], onChange: (on) => setPlaying(on) });
  } else {
    button(row1, { label: 'Step 0.5 s', onClick: () => advance(0.5) });
    button(row1, { label: 'Step 5 s', onClick: () => advance(5) });
  }
  const speedSeg = segmented(row1, { label: 'Speed', options: [{ value: 1, label: '1x' }, { value: 5, label: '5x' }, { value: 20, label: '20x' }], value: 5, onChange: (v) => { speed = v; } });
  if (reduced) speedSeg.el.style.display = 'none';
  segmented(row1, { label: 'Camera', options: [{ value: 'raw', label: 'Raw' }, { value: 'mask', label: 'Mask' }, { value: 'fit', label: 'Fit' }], value: view, onChange: (v) => { view = v; drawInset(); } });
  const glareSeg = segmented(row2, { label: 'Glare spot', options: [{ value: false, label: 'Off' }, { value: true, label: 'On' }], value: false, onChange: (v) => { glareOn = v; placeGlare(); preview(); } });
  const addHoopBtn = button(row2, { label: 'Add hoop', onClick: () => addHoop() });
  const relaunchBtn = button(row2, { label: 'Put it back over the line', onClick: () => { sim.relaunch(); lastLook = null; preview(); sync(); } });
  button(row2, { label: 'Reset', onClick: () => resetAll() });
  const ro = readout(panel, { title: 'Commands sent to the flight controller (body frame)', rows: [
    { key: 'fwd', label: 'Forward', unit: 'm/s', format: (v) => v.toFixed(3) },
    { key: 'right', label: 'Right', unit: 'm/s', format: (v) => v.toFixed(3) },
    { key: 'yaw', label: 'Yaw rate', unit: '°/s', format: (v) => v.toFixed(1) },
    { key: 'err', label: 'Pixel error x, y', format: (v) => v },
    { key: 'ang', label: 'Angle error', unit: '°', format: (v) => (typeof v === 'number' ? v.toFixed(1) : v) },
    { key: 'miss', label: 'Frames with no line', format: (v) => v },
    { key: 't', label: 'Time', unit: 's', format: (v) => v.toFixed(1) },
  ] });
  const help = document.createElement('p'); help.className = 'adr-help';
  help.textContent = ctx.isTouch
    ? 'Drag a white handle, a hoop or the glare spot. Double-tap the line to add a handle; press and hold a handle to remove it. Drag a hoop off the floor to remove it.'
    : 'Drag a white handle, a hoop or the glare spot. Double-click the line to add a handle; right-click a handle to remove it. Drag a hoop off the floor to remove it.';
  panel.appendChild(help);

  function placeInset() {
    const narrow = el.clientWidth < 620;
    if (narrow && inset.parentNode !== panel) panel.insertBefore(inset, panel.firstChild);
    else if (!narrow && inset.parentNode !== el) el.appendChild(inset);
  }
  placeInset();

  // ---------------------------------------------------------------- inset drawing
  let lastLook = null; // { vision, control result, pose } of the latest frame
  let peek = null; // errors of the latest look while paused (nothing is sent)
  function look() {
    // what the camera sees right now, without advancing the simulation (for a paused drone)
    const gray = sim.look();
    const v = detect(gray, sim.ws);
    lastLook = { v, u: null, pose: { ...sim.pose } };
    return lastLook;
  }
  function drawInset() {
    const L = lastLook; if (!L) return;
    const gray = sim.cam.gray, lab = sim.ws.label, d = img.data;
    const v = L.v, keepId = v.found ? v.comps[v.keep].id : -1;
    if (view === 'raw') {
      for (let i = 0, j = 0; i < W * H; i++, j += 4) { const g = gray[i]; d[j] = g; d[j + 1] = g; d[j + 2] = g; d[j + 3] = 255; }
    } else {
      for (let i = 0, j = 0; i < W * H; i++, j += 4) {
        const id = lab[i];
        const g = id === 0 ? (view === 'fit' ? gray[i] * 0.35 : 8) : id === keepId ? 255 : 110;
        d[j] = g; d[j + 1] = g; d[j + 2] = id && id !== keepId ? g * 0.85 : g; d[j + 3] = 255;
      }
    }
    g2.putImageData(img, 0, 0);
    const G = g2;
    G.save();
    G.lineWidth = 3; G.font = '600 20px system-ui, sans-serif';
    if (view === 'fit' && v.found) {
      const c = v.comps[v.keep];
      G.strokeStyle = 'rgba(124,196,255,.9)'; G.setLineDash([8, 6]);
      G.beginPath(); c.rect.corners.forEach((p, i) => (i ? G.lineTo(p[0], p[1]) : G.moveTo(p[0], p[1]))); G.closePath(); G.stroke();
      G.setLineDash([]);
      const u = L.u || { dx: v.vx, dy: v.vy, tx: v.x + 100 * v.vx, ty: v.y + 100 * v.vy };
      G.strokeStyle = '#3ddc84'; G.lineWidth = 4;
      G.beginPath(); G.moveTo(v.x - u.dx * 900, v.y - u.dy * 900); G.lineTo(v.x + u.dx * 900, v.y + u.dy * 900); G.stroke();
      G.strokeStyle = '#ff6b35'; G.lineWidth = 3; G.setLineDash([10, 7]);
      G.beginPath(); G.moveTo(W / 2, H / 2); G.lineTo(u.tx, u.ty); G.stroke(); G.setLineDash([]);
      G.fillStyle = '#ff6b35'; G.beginPath(); G.arc(u.tx, u.ty, 9, 0, Math.PI * 2); G.fill();
      G.fillStyle = '#3ddc84'; G.beginPath(); G.arc(v.x, v.y, 6, 0, Math.PI * 2); G.fill();
    }
    // image centre (treated as the drone's centre by the script) and the nose direction
    G.strokeStyle = '#fff'; G.lineWidth = 3;
    G.beginPath(); G.moveTo(W / 2 - 14, H / 2); G.lineTo(W / 2 + 14, H / 2); G.moveTo(W / 2, H / 2 - 14); G.lineTo(W / 2, H / 2 + 14); G.stroke();
    G.fillStyle = 'rgba(255,255,255,.85)'; G.textAlign = 'center';
    G.fillText('nose ↓', W / 2, H - 12);
    G.textAlign = 'left'; G.fillText('640 x 360', 12, 26);
    if (!v.found) { G.fillStyle = '#ffb454'; G.textAlign = 'center'; G.font = '700 28px system-ui, sans-serif'; G.fillText('no line in this frame', W / 2, H / 2 - 30); }
    G.restore();
    icap.textContent = view === 'raw' ? 'Downward camera: the raw frame. The LED bulbs are separate dots.'
      : view === 'mask' ? 'After dilate 30 x 30, erode 20 x 20 and inRange 250 to 255. White: the blob kept (longest side). Grey: blobs ignored.'
      : 'Green: cv2.fitLine on the kept blob. Orange: the point 100 px ahead along it, and the error from the image centre.';
  }

  // ---------------------------------------------------------------- 3D overlays from the sim
  const tmpA = {}, tmpB = {};
  function syncOverlays() {
    const p = sim.pose;
    // downward camera footprint (image corners on the floor)
    const cs = [[0, 0], [W, 0], [W, H], [0, H]].map(([u, v]) => { toFloor(p, u, v, tmpA); return [tmpA.x, tmpA.z]; });
    foot.geometry.dispose(); foot.geometry = ribbon(cs, true, 0.02, 0);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array([cs[0][0], 0, cs[0][1], cs[1][0], 0, cs[1][1], cs[2][0], 0, cs[2][1], cs[3][0], 0, cs[3][1]]), 3));
    fg.setIndex([0, 2, 1, 0, 3, 2]);
    footFill.geometry.dispose(); footFill.geometry = fg;
    // fitted line and look-ahead point, where the last frame was taken
    const L = lastLook;
    if (L && L.v.found && !sim.landed) {
      const v = L.v, dx = L.u ? L.u.dx : v.vx, dy = L.u ? L.u.dy : v.vy;
      toFloor(L.pose, v.x - dx * 170, v.y - dy * 170, tmpA); toFloor(L.pose, v.x + dx * 170, v.y + dy * 170, tmpB);
      fitMesh.geometry.dispose(); fitMesh.geometry = ribbon([[tmpA.x, tmpA.z], [tmpB.x, tmpB.z]], false, 0.018, 0);
      fitMesh.visible = true;
      toFloor(L.pose, L.u ? L.u.tx : v.x + 100 * dx, L.u ? L.u.ty : v.y + 100 * dy, tmpA);
      tgt.position.set(tmpA.x, 0.013, tmpA.z); tgt.visible = true;
    } else { fitMesh.visible = false; tgt.visible = false; }
    // forward camera view, 66 degrees wide, 2.5 m (the stand-in's range)
    const c = Math.cos(p.h), s = Math.sin(p.h), ox = p.x + SIM.FWD_AHEAD * c, oz = p.z + SIM.FWD_AHEAD * s;
    const half = (SIM.HFOV / 2) * Math.PI / 180, R = SIM.FWD_RANGE;
    const arc = [[ox, oz]];
    for (let k = 0; k <= 12; k++) { const a = p.h - half + (2 * half * k) / 12; arc.push([ox + Math.cos(a) * R, oz + Math.sin(a) * R]); }
    const wpos = new Float32Array(arc.length * 3); arc.forEach((q, i) => wpos.set([q[0], 0, q[1]], i * 3));
    const wi = []; for (let k = 1; k < arc.length - 1; k++) wi.push(0, k, k + 1);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.BufferAttribute(wpos, 3)); wg.setIndex(wi);
    wedge.geometry.dispose(); wedge.geometry = wg;
    wedgeEdge.geometry.dispose(); wedgeEdge.geometry = ribbon([arc[1], arc[0], arc[arc.length - 1]], false, 0.012, 0);
    wedge.visible = wedgeEdge.visible = !sim.landed && sim.hoops.length > 0;
    // hoops: tags light up while the forward camera sees them; the ring glows while it is avoided
    for (const [hp, g] of hoopMeshes) {
      const seen = sim.mem.has(hp) && sim.t - sim.mem.get(hp) < 0.6;
      g.userData.tagMat.color.set(seen ? '#9dffb8' : '#dddddd');
      const hitThis = sim.hitNow && sim.hitHoop === hp;
      g.userData.ringMat.emissive.set(hitThis ? '#ff2a1a' : sim.avoid && sim.avoid.hoop === hp ? '#ff6b35' : '#000000');
      g.userData.ringMat.emissiveIntensity = hitThis ? 0.9 : 0.5;
    }
  }
  function syncDrone(dt) {
    const p = sim.pose;
    drone.position.set(p.x, Math.max(p.alt + D.camDrop, GEAR), p.z); // landed: resting on the printed landing gear
    drone.rotation.y = Math.PI - p.h; // the model's nose is -X
    plumb.scale.y = Math.max(0.001, p.alt); plumb.position.set(p.x, p.alt / 2, p.z); plumb.visible = p.alt > 0.02;
    plumbRing.position.set(p.x, 0.012, p.z);
    if (dt && playing && !reduced && !sim.landed) D.spin(dt);
  }
  function sync(dt = 0) {
    syncDrone(dt);
    syncOverlays();
    const l = playing || !peek ? sim.last || peek : peek, st = sim;
    ro.set({
      fwd: sim.cmd.f, right: sim.cmd.r, yaw: sim.cmd.w,
      err: l && l.found ? `${l.ex.toFixed(0)}, ${l.ey.toFixed(0)} px` : 'none',
      ang: l && l.found ? l.ang : 'none',
      miss: `${st.misses} of ${SCRIPT.MAX_MISSES}`, t: st.t,
    });
    let text, cls = '';
    if (sim.landed) { text = `Landed: ${SCRIPT.MAX_MISSES} frames with no line`; cls = 'bad'; }
    else if (sim.landing) { text = 'No line: landing'; cls = 'bad'; }
    else if (sim.hitNow) { text = 'Props touching a hoop'; cls = 'bad'; }
    else if (l && !l.found) { text = playing ? `Line lost: ${sim.misses} of ${SCRIPT.MAX_MISSES}` : 'No line under the camera'; cls = 'warn'; }
    else if (sim.avoid) { text = 'Hoop ahead: stepping aside'; cls = 'warn'; }
    else if (!playing) text = reduced ? 'Paused: use Step' : 'Paused: press Fly';
    else text = `Following the line at ${speed}x`;
    chipState.textContent = text; chipState.className = `adr-chip ${cls}`;
    chipIllus.style.display = sim.hoops.length ? '' : 'none';
    relaunchBtn.style.display = sim.landed || sim.landing ? '' : 'none';
    addHoopBtn.disabled = sim.hoops.length >= MAX_HOOPS;
    stage.invalidate();
  }
  sim.onTick = () => {
    lastLook = { v: sim.lastVision, u: sim.last && sim.last.found ? sim.last : null, pose: { ...sim.pose } };
    insetDirty = true;
  };
  let insetDirty = false;
  function preview() {
    look();
    lastLook.u = lastLook.v.found ? control(lastLook.v, { ...sim.prev }) : null;
    peek = lastLook.u ? { found: true, ...lastLook.u } : { found: false };
    drawInset(); sync();
  }


  // ---------------------------------------------------------------- running
  let stopFrame = null;
  function setPlaying(on) {
    playing = on;
    if (on && !stopFrame) stopFrame = stage.onFrame((dt) => {
      sim.step(dt * speed);
      if (insetDirty) { insetDirty = false; drawInset(); }
      sync(dt);
      if (sim.landed) { play?.set(false, { silent: true }); setPlaying(false); } // on the floor: stop until relaunched
    });
    else if (!on && stopFrame) { stopFrame(); stopFrame = null; }
    sync();
  }
  function advance(sec) {
    sim.step(sec);
    if (insetDirty) { insetDirty = false; drawInset(); }
    sync();
  }
  function resetAll() {
    play?.set(false); setPlaying(false);
    sim.hoops.length = 0; DEFAULT_HOOPS.forEach((h) => sim.hoops.push({ ...h }));
    Object.assign(glarePos, DEFAULT_GLARE); glareOn = false; glareSeg.set(false, { silent: true }); placeGlare();
    rebuildCourse(DEFAULT_COURSE.map((p) => p.slice()));
    sim.t = 0; sim.hits = 0; sim.reset(0);
    sim.last = null; preview();
  }
  function addHoop() {
    if (sim.hoops.length >= MAX_HOOPS) return;
    // on the line, 2.5 m ahead of the drone
    const nr = nearest(course, sim.pose.x, sim.pose.z);
    let s = (nr.s + 2.5) % course.L, i = 0;
    while (i < course.n - 1 && course.cum[i + 1] < s) i++;
    sim.hoops.push({ x: course.xs[i] + 0.05, z: course.zs[i] + 0.05 });
    sim.refreshHoops(); placeHoops(); sync();
  }

  // ---------------------------------------------------------------- dragging
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  const proj = new THREE.Vector3();
  function floorAt(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? { x: hit.x, z: hit.z } : null;
  }
  function screenOf(x, y, z) {
    proj.set(x, y, z).project(camera);
    const r = canvas.getBoundingClientRect();
    return [(proj.x * 0.5 + 0.5) * r.width + r.left, (-proj.y * 0.5 + 0.5) * r.height + r.top];
  }
  function pick(e) {
    const tol = e.pointerType === 'touch' || ctx.isTouch ? 26 : 16;
    let best = null;
    const test = (kind, ref, sx, sy, extra = 0) => { const d = Math.hypot(sx - e.clientX, sy - e.clientY) - extra; if (d < tol && (!best || d < best.d)) best = { kind, ref, d }; };
    course.ctrl.forEach((p, i) => { const [sx, sy] = screenOf(p[0], 0, p[1]); test('handle', i, sx, sy); });
    sim.hoops.forEach((hp) => {
      const [ax, ay] = screenOf(hp.x, SIM.ALT, hp.z), [bx, by] = screenOf(hp.x, 0, hp.z);
      const [rx] = screenOf(hp.x + SIM.HOOP_D / 2, SIM.ALT, hp.z);
      const rad = Math.abs(rx - ax) * 0.8;
      test('hoop', hp, ax, ay, rad); test('hoop', hp, bx, by);
    });
    if (glareOn) { const [sx, sy] = screenOf(glarePos.x, 0, glarePos.z); test('glare', glarePos, sx, sy, 6); }
    return best;
  }
  let drag = null, lastTap = null, longTimer = 0, hover = null;
  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (pick({ clientX: t.clientX, clientY: t.clientY, pointerType: 'touch' })) e.preventDefault(); // drag this, do not scroll
  };
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  const onDown = (e) => {
    if (e.button === 2) return;
    const p = pick(e);
    if (!p) {
      // double-tap on the line adds a handle (touch)
      if (e.pointerType === 'touch') {
        const now = performance.now();
        if (lastTap && now - lastTap.t < 320 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) { addPointAt(e); lastTap = null; }
        else lastTap = { t: now, x: e.clientX, y: e.clientY };
      }
      return;
    }
    e.preventDefault();
    drag = { ...p, id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false };
    canvas.setPointerCapture?.(e.pointerId);
    if (p.kind === 'handle' && e.pointerType === 'touch') {
      clearTimeout(longTimer);
      longTimer = setTimeout(() => { if (drag && !drag.moved && drag.kind === 'handle') { removePoint(drag.ref); drag = null; } }, 650);
    }
    setHot(p);
  };
  const onMove = (e) => {
    if (!drag) {
      if (e.pointerType === 'mouse') { const p = pick(e); canvas.style.cursor = p ? 'grab' : 'default'; setHot(p); }
      return;
    }
    if (e.pointerId !== drag.id) return;
    if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 4) drag.moved = true;
    canvas.style.cursor = 'grabbing';
    const f = floorAt(e); if (!f) return;
    const cx = Math.min(FLOOR.x1 - 0.15, Math.max(FLOOR.x0 + 0.15, f.x)), cz = Math.min(FLOOR.z1 - 0.15, Math.max(FLOOR.z0 + 0.15, f.z));
    if (drag.kind === 'handle') { course.ctrl[drag.ref][0] = cx; course.ctrl[drag.ref][1] = cz; rebuildCourse(course.ctrl); }
    else if (drag.kind === 'hoop') {
      drag.ref.x = f.x; drag.ref.z = f.z;
      drag.off = f.x < FLOOR.x0 || f.x > FLOOR.x1 || f.z < FLOOR.z0 || f.z > FLOOR.z1;
      const g = hoopMeshes.get(drag.ref); if (g) g.visible = !drag.off;
      sim.refreshHoops(); placeHoops();
    } else if (drag.kind === 'glare') { glarePos.x = cx; glarePos.z = cz; placeGlare(); }
    if (!playing) preview(); else sync();
  };
  const onUp = (e) => {
    clearTimeout(longTimer);
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.kind === 'hoop' && drag.off) { sim.hoops.splice(sim.hoops.indexOf(drag.ref), 1); sim.refreshHoops(); placeHoops(); }
    drag = null; canvas.style.cursor = 'default'; setHot(null);
    if (!playing) preview(); else sync();
  };
  const onDbl = (e) => { if (!pick(e)) addPointAt(e); };
  const onCtx = (e) => { const p = pick(e); if (p && p.kind === 'handle') { e.preventDefault(); removePoint(p.ref); } };
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('dblclick', onDbl);
  canvas.addEventListener('contextmenu', onCtx);
  function setHot(p) {
    const k = p && p.kind === 'handle' ? p.ref : -1;
    if (hover === k) return; hover = k;
    handles.children.forEach((h, i) => { h.children[1].material = i === k ? handleHot : handleMat; });
    stage.invalidate();
  }
  function addPointAt(e) {
    const f = floorAt(e); if (!f) return;
    const nr = nearest(course, f.x, f.z);
    if (nr.d > 0.35) return;
    const seg = course.seg[nr.i];
    course.ctrl.splice(seg + 1, 0, [nr.x, nr.z]);
    rebuildCourse(course.ctrl);
    if (!playing) preview(); else sync();
  }
  function removePoint(i) {
    if (course.ctrl.length <= 4) return;
    course.ctrl.splice(i, 1);
    rebuildCourse(course.ctrl);
    setHot(null);
    if (!playing) preview(); else sync();
  }

  // ---------------------------------------------------------------- resize, first picture
  const onResize = new ResizeObserver(() => { frameView(false); placeInset(); });
  onResize.observe(el);
  preview();

  return {
    dispose() {
      stopFrame?.(); onResize.disconnect(); clearTimeout(longTimer);
      canvas.removeEventListener('touchstart', onTouchStart);
      inset.remove(); hud.remove();
      stage.dispose();
    },
  };
}
export { MODEL };
