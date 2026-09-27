// The arena, scroll-driven: the finished robot (Jerry's version 2 CAD) spins its weapon up, drives
// across a small prop arena, hits a cardboard box, turns in place and hits two more. The robot, its
// blade and its wheels are his CAD, turning about the real axes from the STEP; the arena and the
// boxes are props drawn for the page, and the box physics is a small rigid-body model written for
// it (illustrative, not a simulation of real hits).
//
// The whole run is worked out once when the block mounts (run.js drives the model in physics.js
// on a fixed script and keeps every pose); the scroll then picks the moment to show. So every
// picture is a pure function of the scroll position (step + progress through it): scrolling back
// plays it backwards, and nothing moves while the page is still.
// The readout is the same math as Jerry's weapon calculator: 740 KV x 11.1 V = 8,214 rpm with no
// load, on a 4.409 in (112 mm) blade whose tip then moves at 158 ft/s. It shows the modelled blade
// speed at that moment of the run: the spin-up and the drop on each hit.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, rig, blurDisc, LIFT, W_MAX, tipOf, fmtInt } from './rig.js';
import { ARENA } from './physics.js';
import { recordRun } from './run.js';
import { clamp, smooth, lerp, toSph, blend, frameBox, viewCache, coverOf, frameFree } from './views.js';

const HX = ARENA.hx, HZ = ARENA.hz; // a 1.4 x 0.96 m prop
const WALL_H = 0.1;
const HOLD = 0.88; // each step plays its part of the run over this much of the step, then holds

const CSS = `
.rx-hud.bb-hud { top: auto; bottom: 14px; width: min(270px, calc(100% - 28px)); }
.bb-hud .bb-big b { font-size: 26px; line-height: 1; }
.bb-hud .bb-big { margin-bottom: 6px; }
.bb-hud .bb-note { margin-top: 8px; font-size: 11px; color: var(--muted); }
@media (max-width: 640px) {
  .rx-hud.bb-hud { top: 8px; bottom: auto; width: auto; }
  .bb-hud .bb-big b { font-size: 18px; }
  .bb-hud .bb-note { display: none; }
}`;
let styled = false;

export async function mount(el, ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const stage = createStage(el, { controls: false, hint: false, fov: 30 });
  const { THREE: T, scene, camera } = stage;
  const reduced = ctx.reducedMotion;

  // ------------------------------------------------------------ the robot (Jerry's CAD); the run is worked out while it loads
  const bot = new T.Group(); bot.name = 'robot';
  const inner = new T.Group(); inner.position.y = LIFT; bot.add(inner);
  stage.root.add(bot);
  const loading = loadRobot(stage, 'v2', { add: false });
  const recorded = recordRun(T, { yieldEvery: 8 }); // about 0.15 s of work, handed back to the page every 8 ms
  const { model, p } = await loading;
  const run = await recorded;
  inner.add(model);
  bot.updateWorldMatrix(true, true);
  const pv = rig(stage, p);
  const disc = blurDisc(T, '#9aa0a8');
  disc.position.set(0, 0.019, -0.076);
  model.add(disc);

  // ------------------------------------------------------------ the arena (a prop, not CAD)
  const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 960;
  const g2 = cv.getContext('2d');
  g2.fillStyle = '#2c2f34'; g2.fillRect(0, 0, 1400, 960);
  g2.strokeStyle = 'rgba(210,215,222,0.10)'; g2.lineWidth = 2;
  for (let i = 0; i <= 14; i++) { const q = i * 100; g2.beginPath(); g2.moveTo(q, 0); g2.lineTo(q, 960); g2.stroke(); }
  for (let i = 0; i <= 9; i++) { const q = 20 + i * 100; g2.beginPath(); g2.moveTo(0, q); g2.lineTo(1400, q); g2.stroke(); }
  g2.strokeStyle = 'rgba(255,107,53,0.35)'; g2.lineWidth = 6; g2.strokeRect(6, 6, 1388, 948);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const floor = new T.Mesh(new T.PlaneGeometry(2 * HX, 2 * HZ), new T.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'arena-floor';
  scene.add(floor);
  const wallMat = new T.MeshStandardMaterial({ color: '#a9bccf', roughness: 0.2, transparent: true, opacity: 0.12, depthWrite: false });
  const railMat = new T.MeshStandardMaterial({ color: '#3b3f46', roughness: 0.5, metalness: 0.6 });
  const props = [floor.geometry, floor.material, tex, wallMat, railMat];
  for (const [x, z, w, d] of [[0, -HZ, 2 * HX, 0.006], [0, HZ, 2 * HX, 0.006], [-HX, 0, 0.006, 2 * HZ], [HX, 0, 0.006, 2 * HZ]]) {
    const wg = new T.BoxGeometry(w, WALL_H, d), rg = new T.BoxGeometry(w + 0.012, 0.012, d + 0.012);
    const wall = new T.Mesh(wg, wallMat); wall.position.set(x, WALL_H / 2, z); scene.add(wall);
    const rail = new T.Mesh(rg, railMat); rail.position.set(x, WALL_H, z); rail.castShadow = true; scene.add(rail);
    props.push(wg, rg);
  }
  stage.ground.visible = false; // the arena floor takes the shadows

  // light: cover the whole arena with the key light's shadow
  const key = stage.light;
  key.position.set(-0.9, 2.0, 1.1); key.target.position.set(0, 0, 0);
  Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.2, far: 5 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.003;
  camera.near = 0.01; camera.far = 20; camera.updateProjectionMatrix();

  // ------------------------------------------------------------ cardboard boxes (props)
  const kraft = new T.MeshStandardMaterial({ color: '#b68a5a', roughness: 0.92, metalness: 0 });
  const tape = new T.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.35, metalness: 0, transparent: true, opacity: 0.8 });
  props.push(kraft, tape);
  const boxes = run.sizes.map(([w, h, d]) => {
    const bg = new T.BoxGeometry(w, h, d), sg = new T.BoxGeometry(w * 1.002, 0.0008, Math.min(0.018, d * 0.3));
    const mesh = new T.Mesh(bg, kraft);
    mesh.castShadow = true; mesh.receiveShadow = true;
    const strip = new T.Mesh(sg, tape); strip.position.y = h / 2 + 0.0003; mesh.add(strip);
    scene.add(mesh);
    props.push(bg, sg);
    return mesh;
  });

  // ------------------------------------------------------------ the run: sim time for each step
  const m = run.marks;
  // [from, to] seconds of the run per step: the arena at rest, spin-up, box A, turn and box B, box C
  const SEG = [[0, 0], [0, m.drive], [m.drive, m.turn1], [m.turn1, m.turn2], [m.turn2, m.end]];
  const timeAt = (step, stepP) => {
    const [a, b] = SEG[step];
    return reduced ? b : lerp(a, b, clamp(stepP / HOLD, 0, 1));
  };
  const qa = new T.Quaternion(), qb = new T.Quaternion();
  function pose(t) {
    const x = clamp(t * run.rate, 0, run.n - 1), i = Math.min(run.n - 2, Math.floor(x)), f = x - i;
    const R = run.robot, a = i * 6, b = a + 6;
    const L = (k) => lerp(R[a + k], R[b + k], f);
    bot.position.set(L(0), 0, L(1));
    bot.rotation.y = L(2);
    pv.wheelL.setAngle(reduced ? 0 : L(3)); pv.wheelR.setAngle(reduced ? 0 : L(4)); pv.weapon.setAngle(reduced ? 0 : L(5));
    const w = lerp(run.w[i], run.w[i + 1], f);
    disc.setSpeed(reduced ? 0 : w);
    const B = run.boxes, nb = run.nb;
    boxes.forEach((mesh, j) => {
      const o = (i * nb + j) * 7, o2 = ((i + 1) * nb + j) * 7;
      mesh.position.set(lerp(B[o], B[o2], f), lerp(B[o + 1], B[o2 + 1], f), lerp(B[o + 2], B[o2 + 2], f));
      qa.set(B[o + 3], B[o + 4], B[o + 5], B[o + 6]); qb.set(B[o2 + 3], B[o2 + 4], B[o2 + 5], B[o2 + 6]);
      mesh.quaternion.slerpQuaternions(qa, qb, f);
    });
    let hits = 0;
    for (const h of run.hits) if (t >= h) hits++;
    return { w, hits };
  }

  // ------------------------------------------------------------ views, framed once from the run's own extents
  // For each step: the region the robot and every box cover during that part of the run.
  function extent(t0, t1) {
    const min = [Infinity, 0, Infinity], max = [-Infinity, 0.06, -Infinity];
    const add = (x, z, r) => { min[0] = Math.min(min[0], x - r); max[0] = Math.max(max[0], x + r); min[2] = Math.min(min[2], z - r); max[2] = Math.max(max[2], z + r); };
    const i0 = Math.round(t0 * run.rate), i1 = Math.round(t1 * run.rate);
    for (let i = i0; i <= i1; i += 3) {
      add(run.robot[i * 6], run.robot[i * 6 + 1], 0.13);
      for (let j = 0; j < run.nb; j++) {
        const o = (i * run.nb + j) * 7, o0 = (i0 * run.nb + j) * 7;
        if (Math.hypot(run.boxes[o] - run.boxes[o0], run.boxes[o + 2] - run.boxes[o0 + 2]) > 0.01) add(run.boxes[o], run.boxes[o + 2], 0.05);
      }
    }
    return [min.map((v, k) => Math.max(v, [-HX, 0, -HZ][k])), max.map((v, k) => Math.min(v, [HX, 1, HZ][k]))];
  }
  const EXT = SEG.map(([a, b]) => extent(a, b));
  // On a full-width desktop the step cards cover the left of the stage: the views are framed into
  // the part they leave free, and the picture is moved into it (setShift below).
  let cover = 0;
  const views = viewCache(el, (aspect) => frameFree(stage, (cover = coverOf(el, ctx)), () => {
    const portrait = aspect < 0.95;
    const whole = stage.frame(floor, { azimuth: 8, elevation: 54, pad: portrait ? 0.92 : 1.02, apply: false });
    const near = frameBox(stage, [-0.14, 0, -0.44], [0.14, 0.05, -0.16], { azimuth: 14, elevation: 26, pad: portrait ? 1.3 : 1.2 });
    const at = (k, az, el) => frameBox(stage, EXT[k][0], EXT[k][1], { azimuth: az, elevation: el, pad: portrait ? 1.0 : 1.06 });
    return [whole, near, at(2, 12, 46), at(3, 6, 48), at(4, -6, 50)].map((v) => toSph(T, v));
  }));

  // ------------------------------------------------------------ the readout
  const ov = labelLayer(stage);
  const hud = document.createElement('div');
  hud.className = 'rx-hud bb-hud';
  hud.innerHTML = `
    <div class="rx-hud-row bb-big"><span>Weapon</span><b class="num" data-k="rpm"></b><i><em data-k="bar"></em></i></div>
    <div class="rx-hud-row"><span>Blade tip</span><b class="num" data-k="fts"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Boxes hit</span><b class="num" data-k="hits"></b></div>
    <div class="bb-note">No load: 740 KV x 11.1 V = 8,214 rpm, direct drive, 112 mm blade</div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  function readout({ w, hits }) {
    const t = tipOf(w);
    put('rpm', `${fmtInt(t.rpm)} rpm`);
    const bw = `${((w / W_MAX) * 100).toFixed(1)}%`;
    if (shown.bar !== bw) { K.bar.style.width = bw; shown.bar = bw; }
    put('fts', `${Math.round(t.fts)} ft/s, ${t.mph.toFixed(1)} mph`);
    put('hits', `${hits} of 3`);
  }

  function setProgress(prog, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, SEG.length - 1);
    const phone = el.clientWidth < 640;
    const v = views();
    stage.setShift(cover / 2, phone ? -0.08 : -0.02);
    readout(pose(timeAt(step, stepP)));
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    blend(stage, v[Math.max(0, step - 1)], v[step], k, reduced ? 0 : (step + stepP - 2.5) * 0.02);
    stage.invalidate();
    ov.update();
  }
  setProgress(0, 0, 0);

  return {
    setProgress,
    dispose() {
      ov.dispose();
      for (const x of props) x.dispose();
      stage.dispose();
    },
  };
}
