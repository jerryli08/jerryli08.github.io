// "The flight", scroll-driven: the drone takes off over a fixed LED course and flies one lap past two
// hoops and a reflection as the reader scrolls. It replaces the drag-the-course sandbox; there is
// nothing to click.
//
// What is real and what is drawn for the page:
//  - the drone is Jerry's CAD (screws left out); its props turn about the motor shafts from the STEP
//    (drone-common.js), by an angle that is a function of the scroll
//  - every command, error and camera frame comes from the JavaScript port of our line follower
//    (line-core.js): flight-data.js is one lap of it, flown ahead of time on this course, and
//    flight-path.js gives the pose at any moment as a pure function of the scroll
//  - the inset redoes the script's vision on the frame of the latest control tick (the same noise,
//    so the same result as the lap), shown as Raw, Mask or Fit depending on the step
//  - drawn for the page: the course, the LED rope, the hoops, the reflection and the climb in step 0;
//    the hoop reaction is an illustrative stand-in, labelled on the stage (our repo has no
//    forward-camera code)
// Every picture is a pure function of (step, progress through it). Views of fixed regions of the
// course are framed once and blended; the camera never follows the drone.
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { SCRIPT, SIM, buildCourse, makeCamera, makeWorkspace, renderDown, detect, toFloor, hoopSegment, DEFAULT_COURSE, DEFAULT_HOOPS, DEFAULT_GLARE } from './line-core.js';
import { TICKS, F, LAP, timeAt, altAt, tickAt, poseAt, smooth, GEAR } from './flight-path.js';
import { loadDrone, css } from './drone-common.js';

const { W, H } = SCRIPT;
const CX = W / 2, CY = H / 2;
const FLOOR = { x0: -3.7, x1: 3.7, z0: -2.25, z1: 2.25 };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

// per step: what the inset shows and which fixed view of the course the camera holds
const STEPS = [
  { mode: 'raw', view: 'start' },
  { mode: 'raw', view: 'leg' },
  { mode: 'mask', view: 'leg' },
  { mode: 'fit', view: 'leg' },
  { mode: 'fit', view: 'hoop' },
  { mode: 'fit', view: 'all' },
  { mode: 'blobs', view: 'glare' },
];
// fixed regions of the course ([x0, x1, y0, y1, z0, z1], metres), each framed once; shift moves the
// picture left of the readout and the inset on a desktop
const VIEWS = {
  start: { box: [-3.05, -2.3, 0, 1.12, -1.25, -0.55], azimuth: -60, elevation: 28, pad: 1.18, shift: [-0.07, 0.02] },
  leg: { box: [-3.05, -1.25, 0, 1.1, -1.85, -0.55], azimuth: 14, elevation: 34, pad: 1.08, shift: [-0.07, 0.02] },
  hoop: { box: [-1.9, 1.6, 0, 1.45, -2.05, -0.75], azimuth: 4, elevation: 30, pad: 1.06, shift: [-0.07, 0.02] },
  all: { box: [-3.2, 3.3, 0, 1.1, -1.9, 1.9], azimuth: 90, elevation: 58, pad: 1.13, shift: [-0.17, 0.05] },
  glare: { box: [-3.3, -1.6, 0, 1.1, -1.3, 1.85], azimuth: 55, elevation: 50, pad: 1.06, shift: [-0.08, 0.02] },
};
const CAPS = {
  raw: 'Downward camera, the raw frame. The nose is at the bottom; the LED bulbs are separate dots.',
  mask: 'After dilate 30 x 30, erode 20 x 20 and inRange 250 to 255: the dots merge into one bar.',
  fit: 'Green: cv2.fitLine on the kept blob. Orange: the point 100 px ahead along it, and the error from the image centre.',
  blobs: 'Two blobs survive the threshold. White: the one kept, with the longest side. Grey: ignored.',
};
const TAG = { raw: 'Raw', mask: 'Mask', fit: 'Fit', blobs: 'Mask' };

const CSS = `
.adr-fl .rx-hud { width: min(300px, calc(100% - 28px)); }
.adr-fl .adr-state { color: var(--text); font-weight: 650; }
.adr-fl .adr-state.warn { color: #ffb454; }
.adr-fl .adr-state.illus::after { content: 'illustrative stand-in'; display: block; margin-top: 2px; font-size: 11px; font-weight: 550; color: var(--muted); }
.adr-fl tr.adr-off td { opacity: .45; }
.adr-inset { position: absolute; right: 14px; bottom: 14px; width: min(40%, 380px); margin: 0; border-radius: 12px; overflow: hidden;
  background: #000; border: 1px solid rgba(255, 255, 255, .16); box-shadow: 0 10px 30px rgba(0, 0, 0, .5); }
.adr-inset canvas { display: block; width: 100%; height: auto; aspect-ratio: 16 / 9; }
.adr-inset figcaption { padding: 6px 10px 7px; font-size: 11.5px; line-height: 1.35; color: var(--text-2); background: rgba(20, 18, 16, .94); }
@media (max-width: 640px) {
  .adr-inset { right: 8px; bottom: 8px; width: 46%; border-radius: 9px; }
  .adr-inset figcaption { display: none; }
}
`;

// ------------------------------------------------------------------ drawing helpers
/** A flat strip along a polyline on the floor, rewritten in place: set([[x, z], ...]). */
function strip(n, closed, width, mat, y) {
  const m = closed ? n + 1 : n;
  const pos = new Float32Array(m * 6), idx = [];
  for (let k = 0; k < m - 1; k++) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = y; mesh.frustumCulled = false;
  mesh.set = (pts) => {
    for (let k = 0; k < m; k++) {
      const i = k % n;
      const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], tz = b[1] - a[1];
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const nx = (-tz * width) / 2, nz = (tx * width) / 2;
      pos.set([pts[i][0] + nx, 0, pts[i][1] + nz, pts[i][0] - nx, 0, pts[i][1] - nz], k * 6);
    }
    g.attributes.position.needsUpdate = true;
  };
  return mesh;
}
/** A static strip (the LED rope and its glow). */
function ribbon(pts, width, y, mat) {
  const s = strip(pts.length, true, width, mat, y);
  s.set(pts);
  s.frustumCulled = true; s.geometry.computeBoundingSphere();
  return s;
}
/** A flat fan of triangles from pts[0], rewritten in place (the forward camera's view, a quad). */
function fan(n, mat, y) {
  const pos = new Float32Array(n * 3), idx = [];
  for (let k = 1; k < n - 1; k++) idx.push(0, k, k + 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.y = y; mesh.frustumCulled = false;
  mesh.set = (pts) => { pts.forEach((p, i) => pos.set([p[0], 0, p[1]], i * 3)); g.attributes.position.needsUpdate = true; };
  return mesh;
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
// a generic square fiducial for the hoops (the tag family is not confirmed, so not a real tag)
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
  css('adr-fl-css', CSS);
  el.classList.add('adr-fl');
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false, fov: 28 });

  // ---------------------------------------------------------------- the course (drawn for the page)
  const world = new THREE.Group(); world.name = 'course';
  stage.root.add(world);
  const course = buildCourse(DEFAULT_COURSE.map((p) => p.slice()));
  const glare = { ...DEFAULT_GLARE };
  const fw = FLOOR.x1 - FLOOR.x0, fd = FLOOR.z1 - FLOOR.z0;
  const ftex = gridTex(); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(fw, fd); // one tile per metre
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(fw, fd), new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.94, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set((FLOOR.x0 + FLOOR.x1) / 2, 0, (FLOOR.z0 + FLOOR.z1) / 2);
  floor.receiveShadow = true; floor.name = 'floor';
  world.add(floor);
  const rope = []; for (let i = 0; i < course.n; i++) rope.push([course.xs[i], course.zs[i]]);
  const coreMat = new THREE.MeshBasicMaterial({ color: '#fffdf6', toneMapped: false, side: THREE.DoubleSide });
  const glowMat = new THREE.MeshBasicMaterial({ map: glowTex(), color: '#fff1d6', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide });
  const core = ribbon(rope, 0.024, 0.004, coreMat); core.renderOrder = 2;
  const glow = ribbon(rope, 0.2, 0.003, glowMat); glow.renderOrder = 1;
  world.add(glow, core);
  const glareMesh = new THREE.Mesh(new THREE.PlaneGeometry(SIM.GLARE_R * 5, SIM.GLARE_R * 5).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: radialTex(), color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  glareMesh.position.set(glare.x, 0.006, glare.z); world.add(glareMesh);

  const stripes = stripeTex(); stripes.wrapS = THREE.RepeatWrapping;
  const ringGeo = new THREE.TorusGeometry(SIM.HOOP_D / 2, 0.022, 10, 72);
  const tagGeo = new THREE.PlaneGeometry(0.11, 0.11);
  const tagTexture = tagTex();
  const postGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 8);
  const hoops = DEFAULT_HOOPS.map((hp) => {
    const g = new THREE.Group(); g.name = 'hoop';
    const ringMat = new THREE.MeshStandardMaterial({ map: stripes, roughness: 0.5, metalness: 0, emissive: '#000000', emissiveIntensity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.castShadow = true; ring.position.y = SIM.ALT;
    g.add(ring);
    const tagMat = new THREE.MeshBasicMaterial({ map: tagTexture, toneMapped: false, color: '#dddddd', side: THREE.DoubleSide });
    for (let k = 0; k < 4; k++) { // tags at 12, 3, 6 and 9 o'clock, like the race hoops
      const a = (k * Math.PI) / 2, r = SIM.HOOP_D / 2 + 0.075;
      const t = new THREE.Mesh(tagGeo, tagMat); t.position.set(Math.sin(a) * r, SIM.ALT + Math.cos(a) * r, 0);
      g.add(t);
    }
    const r = SIM.HOOP_D / 2, a = r * 0.72, top = SIM.ALT - Math.sqrt(r * r - a * a);
    for (const sx of [-1, 1]) { // two thin stands from the floor up to the ring
      const post = new THREE.Mesh(postGeo, ringMat);
      post.scale.y = top; post.position.set(sx * a, top / 2, 0); post.castShadow = true;
      g.add(post);
    }
    const sg = hoopSegment(course, hp);
    g.position.set(hp.x, 0, hp.z);
    g.rotation.y = Math.atan2(-sg.tz, sg.tx); // ring plane along the rope (as in the simulation)
    world.add(g);
    return { g, ringMat, tagMat, lit: -1, hot: -1 };
  });

  // ---------------------------------------------------------------- annotations (not parts)
  const annot = new THREE.Group(); annot.name = 'annotations'; world.add(annot);
  const basic = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
  const footMat = basic('#ff9a62', 0.9), footFillMat = basic('#ff9a62', 0.08);
  const foot = strip(4, true, 0.02, footMat, 0.008); foot.renderOrder = 3;
  const footFill = fan(4, footFillMat, 0.007);
  const fitMat = basic('#3ddc84', 1);
  const fitLine = strip(2, false, 0.018, fitMat, 0.011); fitLine.renderOrder = 4;
  const tgtMat = basic('#ff6b35', 1);
  const tgt = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20).rotateX(-Math.PI / 2), tgtMat); tgt.position.y = 0.013; tgt.renderOrder = 5;
  const wedgeMat = basic('#7cc4ff', 0.06), wedgeEdgeMat = basic('#7cc4ff', 0.5);
  const WEDGE_N = 14;
  const wedge = fan(WEDGE_N, wedgeMat, 0.009);
  const wedgeEdge = strip(3, false, 0.012, wedgeEdgeMat, 0.01);
  const plumbMat = basic('#ffffff', 0.35), plumbRingMat = basic('#ffffff', 0.55);
  const plumb = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 6), plumbMat);
  const plumbRing = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.065, 24).rotateX(-Math.PI / 2), plumbRingMat); plumbRing.position.y = 0.012;
  annot.add(foot, footFill, fitLine, tgt, wedge, wedgeEdge, plumb, plumbRing);

  // ---------------------------------------------------------------- the drone (real CAD)
  const drone = new THREE.Group(); drone.name = 'drone';
  const D = await loadDrone(stage, { add: false });
  drone.add(D.wrap);
  world.add(drone);
  stage.fitGround();
  stage.ground.visible = false; // the floor takes the shadow

  // ---------------------------------------------------------------- views, framed once
  const regions = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => {
    const [x0, x1, y0, y1, z0, z1] = v.box;
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    return [k, m];
  }));
  const sph = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), s }; };
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      views = Object.fromEntries(Object.entries(VIEWS).map(([k, v]) => [k, sph(stage.frame(regions[k], { azimuth: v.azimuth, elevation: v.elevation, pad: v.pad, apply: false, refresh: true }))]));
    }
    return views;
  }
  const sp = new THREE.Spherical();
  function place(a, b, k) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sp).add(target), target });
  }

  // ---------------------------------------------------------------- labels, readout, inset
  const ov = labelLayer(stage);
  const behind = Math.max(0, course.cum.findIndex((c) => c >= course.L - 0.45)); // 0.45 m before the start
  const L = {
    line: ov.label('LED line', [course.xs[behind], 0, course.zs[behind]], { color: '#fff1e2', side: 'l', minW: 520 }),
    foot: ov.label('What the downward camera sees', [0, 0, 0], { color: '#ff9a62', side: 'l', minW: 520 }),
    fit: ov.label('Fitted line', [0, 0, 0], { color: '#3ddc84', side: 'l', minW: 520 }),
    tgt: ov.label('100 px ahead', [0, 0, 0], { color: '#ff6b35', minW: 520 }),
    fwd: ov.label('Forward camera', [0, 0, 0], { color: '#7cc4ff', minW: 520 }),
    hoop: ov.label('Hoop with AprilTags', [DEFAULT_HOOPS[0].x, SIM.ALT + SIM.HOOP_D / 2 + 0.16, DEFAULT_HOOPS[0].z], { color: '#f2c21b', side: 'l', minW: 520 }),
    glare: ov.label('Reflection', [glare.x, 0, glare.z], { color: '#ffffff', minW: 520 }),
  };
  // which steps show each label
  const LSTEPS = { line: [0], foot: [0, 1, 2], fit: [3], tgt: [3], fwd: [4], hoop: [4], glare: [6] };

  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div class="adr-state" data-k="state"></div>
    <table class="num"><thead><tr><th></th><th>Sent</th></tr></thead><tbody>
      <tr><td>Forward</td><td data-k="f"></td></tr>
      <tr><td>Right</td><td data-k="r"></td></tr>
      <tr><td>Yaw rate</td><td data-k="w"></td></tr>
      <tr class="rx-hud-x"><td>Pixel error <small>x, y from the image centre</small></td><td data-k="e"></td></tr>
      <tr class="rx-hud-x"><td>Angle error</td><td data-k="a"></td></tr>
      <tr class="rx-hud-x" data-k="pushRow"><td>Hoop stand-in <small>illustrative, part of Right</small></td><td data-k="push"></td></tr>
      <tr class="rx-hud-x"><td>Frames with no line</td><td data-k="miss"></td></tr>
      <tr class="rx-hud-x"><td>Commands sent <small>one every 0.5 s</small></td><td data-k="n"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  const cls = (k, c) => { if (shown[`c:${k}`] !== c) { K[k].className = c; shown[`c:${k}`] = c; } };

  const inset = document.createElement('figure'); inset.className = 'adr-inset';
  const ic = document.createElement('canvas'); ic.width = W; ic.height = H;
  ic.setAttribute('role', 'img'); ic.setAttribute('aria-label', 'What the downward camera sees, and what the line follower does with it');
  const icap = document.createElement('figcaption');
  inset.append(ic, icap);
  ov.layer.append(inset);
  const g2 = ic.getContext('2d');

  // ---------------------------------------------------------------- the inset: the script's vision
  const cam = makeCamera();
  const ws = makeWorkspace();
  const off = {}, offCtx = {};
  for (const m of ['raw', 'mask', 'fit', 'blobs']) { off[m] = document.createElement('canvas'); off[m].width = W; off[m].height = H; offCtx[m] = off[m].getContext('2d'); }
  const img = g2.createImageData(W, H);
  let frameKey = null, vis = null, done = {};
  function capture(key, pose, frameNo) {
    if (key === frameKey) return;
    frameKey = key; vis = null; done = {};
    cam.frame = frameNo; // the same floor noise as that tick of the lap
    renderDown(cam, course, pose, glare);
  }
  function paint(mode) {
    if (done[mode]) return;
    if (mode !== 'raw' && !vis) vis = detect(cam.gray, ws);
    const gray = cam.gray, lab = ws.label, d = img.data;
    const keepId = vis && vis.found ? vis.comps[vis.keep].id : -1;
    for (let i = 0, j = 0; i < W * H; i++, j += 4) {
      let r, g, b;
      if (mode === 'raw') { r = g = b = gray[i]; } else {
        const id = lab[i];
        if (id === 0) r = g = b = mode === 'fit' ? gray[i] * 0.35 : 8;
        else if (id === keepId) r = g = b = 255;
        else { r = g = 112; b = 118; }
      }
      d[j] = r; d[j + 1] = g; d[j + 2] = b; d[j + 3] = 255;
    }
    offCtx[mode].putImageData(img, 0, 0);
    done[mode] = true;
  }
  function overlay(mode, a, rec, small) {
    if (a <= 0.01) return;
    const G = g2, z = small ? 2 : 1;
    G.save(); G.globalAlpha = a; G.lineWidth = 3 * z; G.font = '600 20px system-ui, sans-serif';
    if (mode === 'fit' && rec) {
      if (vis && vis.found) {
        const c = vis.comps[vis.keep];
        G.strokeStyle = 'rgba(124,196,255,.9)'; G.setLineDash([8 * z, 6 * z]);
        G.beginPath(); c.rect.corners.forEach((p, i) => (i ? G.lineTo(p[0], p[1]) : G.moveTo(p[0], p[1]))); G.closePath(); G.stroke();
        G.setLineDash([]);
      }
      const { lx, ly, dx, dy, tx, ty } = rec;
      G.strokeStyle = '#3ddc84'; G.lineWidth = 4 * z;
      G.beginPath(); G.moveTo(lx - dx * 900, ly - dy * 900); G.lineTo(lx + dx * 900, ly + dy * 900); G.stroke();
      G.strokeStyle = '#ff6b35'; G.lineWidth = 3 * z; G.setLineDash([10 * z, 7 * z]);
      G.beginPath(); G.moveTo(CX, CY); G.lineTo(tx, ty); G.stroke(); G.setLineDash([]);
      G.fillStyle = '#ff6b35'; G.beginPath(); G.arc(tx, ty, 9 * z, 0, Math.PI * 2); G.fill();
      G.fillStyle = '#3ddc84'; G.beginPath(); G.arc(lx, ly, 6 * z, 0, Math.PI * 2); G.fill();
    }
    if (mode === 'blobs' && vis) {
      const keepId = vis.found ? vis.comps[vis.keep].id : -1;
      for (const c of vis.comps) {
        const keep = c.id === keepId;
        G.strokeStyle = keep ? '#7cc4ff' : '#ffb454'; G.setLineDash([8 * z, 6 * z]); G.lineWidth = 3 * z;
        G.beginPath(); c.rect.corners.forEach((p, i) => (i ? G.lineTo(p[0], p[1]) : G.moveTo(p[0], p[1]))); G.closePath(); G.stroke();
        G.setLineDash([]);
        const text = small ? `${keep ? 'kept' : 'ignored'} ${Math.round(c.long)} px` : `${keep ? 'kept' : 'ignored'}: long side ${Math.round(c.long)} px`;
        G.font = `650 ${22 * z}px system-ui, sans-serif`;
        const tw = G.measureText(text).width;
        // kept: bottom left, clear of the nose mark; ignored: under its blob, or over it near the bottom
        const bottom = Math.max(...c.rect.corners.map((q) => q[1])), top = Math.min(...c.rect.corners.map((q) => q[1]));
        const x = keep ? 12 : clamp(c.rect.cx - tw / 2, 10, W - tw - 10);
        const y = keep ? H - 50 * z : bottom + 30 * z < H - 60 * z ? Math.max(72 * z, bottom + 30 * z) : Math.max(72 * z, top - 12);
        G.fillStyle = 'rgba(0,0,0,.72)'; G.fillRect(x - 6, y - 21 * z, tw + 12, 29 * z);
        G.fillStyle = keep ? '#7cc4ff' : '#ffb454'; G.fillText(text, x, y);
      }
    }
    G.restore();
  }
  let insetKey = '';
  function drawInset(tk, pose, mA, mB, k, small) {
    const key = `${tk < 0 ? `c${pose.alt.toFixed(4)}` : tk}|${mA}|${mB}|${k.toFixed(3)}|${small}`;
    if (key === insetKey) return;
    insetKey = key;
    if (tk < 0) capture(`c${pose.alt.toFixed(4)}`, pose, 0);
    else { const T = TICKS[tk]; capture(tk, { x: T[F.x], z: T[F.z], h: T[F.h], alt: SIM.ALT }, tk); }
    const rec = tk >= 0 ? recOf(tk) : null;
    const aA = mA === mB ? 1 : 1 - k, aB = mA === mB ? 0 : k;
    paint(mA); g2.globalAlpha = 1; g2.drawImage(off[mA], 0, 0);
    if (aB > 0) { paint(mB); g2.globalAlpha = aB; g2.drawImage(off[mB], 0, 0); g2.globalAlpha = 1; }
    overlay(mA, aA, rec, small); overlay(mB, aB, rec, small);
    // the image centre (the script takes it as the drone's centre) and the nose
    const G = g2, z = small ? 2 : 1;
    G.save();
    G.strokeStyle = '#fff'; G.lineWidth = 3 * z;
    G.beginPath(); G.moveTo(CX - 14 * z, CY); G.lineTo(CX + 14 * z, CY); G.moveTo(CX, CY - 14 * z); G.lineTo(CX, CY + 14 * z); G.stroke();
    G.font = `650 ${22 * z}px system-ui, sans-serif`;
    // during the climb the tag says how high the camera is: up close the bulbs are big
    const mode = TAG[k > 0.5 ? mB : mA];
    const tag = small ? `${mode}${tk < 0 ? `, ${pose.alt.toFixed(2)} m up` : ''}` : `${mode}  640 x 360${tk < 0 ? `, camera ${pose.alt.toFixed(2)} m up` : ''}`;
    G.fillStyle = 'rgba(0,0,0,.62)'; G.fillRect(0, 0, G.measureText(tag).width + 24, 40 * z);
    G.fillStyle = '#fff'; G.textAlign = 'left';
    G.fillText(tag, 12, 28 * z);
    G.textAlign = 'center'; G.fillStyle = 'rgba(255,255,255,.85)'; G.font = `600 ${20 * z}px system-ui, sans-serif`;
    G.fillText('nose ↓', CX, H - 12);
    if (rec && !rec.found) { G.fillStyle = '#ffb454'; G.font = `700 ${28 * z}px system-ui, sans-serif`; G.fillText('no line in this frame', CX, CY - 30); }
    G.restore();
    const cap = CAPS[k > 0.5 ? mB : mA];
    if (shown.cap !== cap) { icap.textContent = cap; shown.cap = cap; }
  }

  // a tick's line fit in image pixels, from its errors: the look-ahead point is the error from the
  // image centre, the direction comes from the angle (atan2(-dx, dy)), and the fitted point is 100 px
  // back along it
  const recs = new Map();
  function recOf(tk) {
    if (recs.has(tk)) return recs.get(tk);
    const T = TICKS[tk];
    const a = (T[F.ang] * Math.PI) / 180, dx = -Math.sin(a), dy = Math.cos(a);
    const tx = CX + T[F.ex], ty = CY + T[F.ey];
    const r = { found: !!T[F.found], dx, dy, tx, ty, lx: tx - SCRIPT.EXTEND * dx, ly: ty - SCRIPT.EXTEND * dy };
    recs.set(tk, r);
    return r;
  }

  // ---------------------------------------------------------------- the readout
  const fmt = (v, d, unit) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(d)} ${unit}`;
  function readout(u, tk, t) {
    if (tk < 0) {
      put('state', u < 0.9 ? 'Taking off' : 'At 1.0 m, first frame next'); cls('state', 'adr-state');
      for (const k of ['f', 'r', 'w', 'e', 'a', 'push']) put(k, 'none yet');
      put('miss', `0 of ${SCRIPT.MAX_MISSES}`); put('n', '0');
      put('mini', 'Climbing to 1.0 m, no command yet');
      cls('pushRow', 'rx-hud-x adr-off');
      return;
    }
    const T = TICKS[tk];
    const avoid = T[F.avoid] >= 0, two = T[F.blobs] > 1, lapDone = t > LAP - 0.3;
    put('state', lapDone ? 'One lap: back over the start' : !T[F.found] ? 'No line in this frame' : avoid ? 'Hoop ahead: stepping aside' : two ? 'Two blobs: keeping the longest' : 'Following the line');
    cls('state', `adr-state${avoid && !lapDone ? ' warn illus' : two ? ' warn' : ''}`);
    put('f', fmt(T[F.cf], 3, 'm/s')); put('r', fmt(T[F.cr], 3, 'm/s')); put('w', fmt(T[F.cw], 1, '°/s'));
    put('e', T[F.found] ? `x ${T[F.ex].toFixed(0)}, y ${T[F.ey].toFixed(0)} px`.replace(/-/g, '−') : 'none');
    put('a', T[F.found] ? fmt(T[F.ang], 1, '°') : 'none');
    put('push', avoid ? fmt(T[F.push], 3, 'm/s') : 'none');
    cls('pushRow', `rx-hud-x${avoid ? '' : ' adr-off'}`);
    put('miss', `${T[F.misses]} of ${SCRIPT.MAX_MISSES}`);
    put('n', String(tk + 1));
    put('mini', `Forward ${T[F.cf].toFixed(2)}, right ${T[F.cr].toFixed(2)} m/s, yaw ${T[F.cw].toFixed(1)}°/s`.replace(/-/g, '−'));
  }

  // ---------------------------------------------------------------- the picture, from the scroll
  const pose = { x: 0, z: 0, h: 0, alt: SIM.ALT };
  const q = {}, q2 = {};
  const footPts = [[0, 0], [0, 0], [0, 0], [0, 0]], wedgePts = Array.from({ length: WEDGE_N }, () => [0, 0]);
  const tintOn = new THREE.Color('#ff6b35'), tagLit = new THREE.Color('#9dffb8'), tagOff = new THREE.Color('#dddddd'), black = new THREE.Color(0);
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const u = step + stepP;
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const phone = el.clientWidth < 640;
    const [sx, sy] = ctx.shift();
    const sa = VIEWS[STEPS[prev].view].shift, sb = VIEWS[STEPS[step].view].shift;
    stage.setShift(sx + (phone ? 0 : lerp(sa[0], sb[0], k)), sy + (phone ? -0.02 : lerp(sa[1], sb[1], k)));
    const v = viewsNow();
    place(v[STEPS[prev].view], v[STEPS[step].view], k);

    // the drone: the climb in step 0, then the lap
    const t = timeAt(u);
    poseAt(t, pose);
    pose.alt = u < 1 ? altAt(u) : SIM.ALT;
    const tk = u < 1 ? -1 : tickAt(t);
    drone.position.set(pose.x, Math.max(pose.alt + D.camDrop, GEAR), pose.z);
    drone.rotation.y = Math.PI - pose.h; // the model's nose is -X
    D.setProps(reduced ? 0 : 2 * Math.PI * 2.5 * Math.max(0, u - 0.3));
    plumb.scale.y = Math.max(0.001, pose.alt); plumb.position.set(pose.x, pose.alt / 2, pose.z); plumb.visible = pose.alt > 0.05;
    plumbRing.position.set(pose.x, 0.012, pose.z);

    // what the downward camera sees, on the floor
    [[0, 0], [W, 0], [W, H], [0, H]].forEach(([iu, iv], i) => { toFloor(pose, iu, iv, q); footPts[i][0] = q.x; footPts[i][1] = q.z; });
    foot.set(footPts); footFill.set(footPts);
    toFloor(pose, W * 0.62, 0, q); L.foot.p.set(q.x, 0, q.z);
    // the latest tick's line and look-ahead point, where that frame was taken
    const fitA = tk >= 0 && step >= 3 ? (step === 3 ? k : 1) : 0;
    const rec = tk >= 0 ? recOf(tk) : null;
    fitLine.visible = tgt.visible = fitA > 0.01 && rec.found;
    if (fitLine.visible) {
      const T = TICKS[tk], tp = { x: T[F.x], z: T[F.z], h: T[F.h], alt: SIM.ALT };
      toFloor(tp, rec.lx - rec.dx * 170, rec.ly - rec.dy * 170, q); toFloor(tp, rec.lx + rec.dx * 170, rec.ly + rec.dy * 170, q2);
      fitLine.set([[q.x, q.z], [q2.x, q2.z]]);
      L.fit.p.set(q.x, 0, q.z);
      toFloor(tp, rec.tx, rec.ty, q); tgt.position.set(q.x, 0.013, q.z); L.tgt.p.set(q.x, 0, q.z);
      fitMat.opacity = tgtMat.opacity = fitA;
    }
    // the forward camera's view: 66 degrees wide, drawn to 2.5 m (the stand-in's range), from step 4
    const fwdA = step >= 4 ? (step === 4 ? k : 1) : 0;
    wedge.visible = wedgeEdge.visible = fwdA > 0.01;
    if (wedge.visible) {
      const c = Math.cos(pose.h), s = Math.sin(pose.h), ox = pose.x + SIM.FWD_AHEAD * c, oz = pose.z + SIM.FWD_AHEAD * s;
      const half = (SIM.HFOV / 2) * Math.PI / 180, R = SIM.FWD_RANGE;
      wedgePts[0][0] = ox; wedgePts[0][1] = oz;
      for (let i = 1; i < WEDGE_N; i++) { const a = pose.h - half + (2 * half * (i - 1)) / (WEDGE_N - 2); wedgePts[i][0] = ox + Math.cos(a) * R; wedgePts[i][1] = oz + Math.sin(a) * R; }
      wedge.set(wedgePts); wedgeEdge.set([wedgePts[1], wedgePts[0], wedgePts[WEDGE_N - 1]]);
      wedgeMat.opacity = 0.06 * fwdA; wedgeEdgeMat.opacity = 0.5 * fwdA;
      L.fwd.p.set(ox + c * 1.7, 0, oz + s * 1.7);
    }
    // hoops: tags light up while the forward camera sees them; the ring glows while it is avoided
    hoops.forEach((hp, i) => {
      const T = tk >= 0 ? TICKS[tk] : null;
      const lit = T && fwdA > 0 && ((T[F.seen] >> i) & 1 || T[F.avoid] === i) ? 1 : 0;
      const hot = T && fwdA > 0 && T[F.avoid] === i ? 1 : 0;
      if (lit !== hp.lit) { hp.tagMat.color.copy(lit ? tagLit : tagOff); hp.lit = lit; }
      if (hot !== hp.hot) { hp.ringMat.emissive.copy(hot ? tintOn : black); hp.hot = hot; }
    });

    // labels hand over between steps: the old ones leave before the new ones arrive
    for (const [name, steps] of Object.entries(LSTEPS)) {
      const a = steps.includes(step) ? (step === 0 || steps.includes(prev) ? 1 : smooth(0.5, 1, k)) : steps.includes(prev) && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
      L[name].a = name === 'fit' || name === 'tgt' ? (fitLine.visible ? a : 0) : name === 'foot' ? a * smooth(0.2, 0.5, pose.alt) : a;
    }

    readout(u, tk, t);
    drawInset(tk, pose, STEPS[prev].mode, STEPS[step].mode, step === prev ? 0 : k, phone);
    stage.invalidate();
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
