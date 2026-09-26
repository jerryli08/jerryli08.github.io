// Shared 3D stage for rich project pages (see tools/pages/README.md).
//
//   import { createStage, cad } from '/assets/js/lib/stage.js';
//   const stage = createStage(el, { controls: true });
//   const rover = await stage.load('/assets/models/rover.glb');
//   stage.frame(rover);
//
// The look follows the landing scene: Jerry's CAD with the same material pass (aluminium,
// PCB, carbon and printed plastics read from the STEP colours), ACES tone mapping, sRGB output,
// a studio environment (RoomEnvironment) instead of Mars, one soft key light and a faint
// shadow on an invisible ground. It renders only while on screen and only when something
// changed, caps the pixel ratio at 1.75 and frees every GPU buffer on dispose().
import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../../vendor/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from '../../vendor/addons/controls/OrbitControls.js';
import { RoomEnvironment } from '../../vendor/addons/environments/RoomEnvironment.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const v3 = (a) => (a && a.isVector3 ? a.clone() : Array.isArray(a) ? new THREE.Vector3(a[0], a[1], a[2]) : new THREE.Vector3(a?.x || 0, a?.y || 0, a?.z || 0));

// ------------------------------------------------------------------ hashed asset URLs
// Assets are cached for a month, so every URL carries a content hash. The build writes the map
// into the page (data-assets); load() and assetUrl() look paths up in it.
let MAP = null;
function assetMap() {
  if (MAP) return MAP;
  try { MAP = JSON.parse(document.querySelector('[data-assets]')?.getAttribute('data-assets') || '{}'); } catch { MAP = {}; }
  return MAP;
}
/** '/assets/models/x.glb', 'assets/models/x.glb' or 'models/x.glb' -> the hashed URL (or the plain path if unknown). */
export function assetUrl(path) {
  if (typeof path !== 'string' || /^(https?:|data:|blob:)/.test(path) || /[?&]v=/.test(path)) return path;
  const key = path.startsWith('/') ? path : path.startsWith('assets/') ? `/${path}` : `/assets/${path.replace(/^\.?\//, '')}`;
  return assetMap()[key] || key;
}

// ------------------------------------------------------------------ CAD coordinates
// tools/cad-axes.py prints STEP coordinates: millimetres, Z up. The GLBs are metres, Y up
// (step2glb.py), so a STEP point (x, y, z) is (x, z, -y) / 1000 in the model's frame.
export const cad = {
  point: ([x, y, z]) => [x / 1000, z / 1000, -y / 1000],
  dir: ([x, y, z]) => [x, z, -y],
};

// ------------------------------------------------------------------ loading
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const fetches = new Map(); // one download per URL even when two stages load the same model
function fetchBuffer(url) {
  if (!fetches.has(url)) {
    fetches.set(url, fetch(url).then((r) => { if (!r.ok) throw new Error(`${r.status} loading ${url}`); return r.arrayBuffer(); })
      .catch((e) => { fetches.delete(url); throw e; }));
  }
  return fetches.get(url);
}

// The same material pass as world.js pbr(): STEP exports carry only a colour, so the colour
// decides the finish. Materials that already have textures are left alone.
const RUBBER = /wheel|tire|tyre|tread/i;
function nameChain(o) { let s = ''; for (let p = o; p; p = p.parent) s += `${p.name} `; return s; }
function cadMaterial(mat, rubber) {
  if (!mat || !mat.color || mat.map || mat.normalMap || mat.roughnessMap || mat.metalnessMap) return mat;
  const c = mat.color.clone(), hsl = {};
  c.getHSL(hsl, THREE.SRGBColorSpace);
  let m;
  if (mat.name === 'carbon' || mat.userData?.carbon) m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.09 });
  else if (rubber) m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0 }); // rubber / TPU wheels
  else if (hsl.s < 0.1 && hsl.l > 0.28 && hsl.l < 0.82) m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.34, metalness: 0.9 }); // aluminium, steel
  else if (hsl.h > 0.08 && hsl.h < 0.16 && hsl.s > 0.5 && hsl.l > 0.45) m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 1 }); // gold contacts
  else if (hsl.h > 0.25 && hsl.h < 0.5 && hsl.s > 0.3) m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 }); // PCB soldermask
  else if (hsl.l < 0.12) m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0 }); // black printed parts, nylon
  else if ((hsl.h < 0.04 || hsl.h > 0.96) && hsl.s > 0.6) m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.42, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.25, sheenRoughness: 0.6, sheenColor: c }); // red PLA
  else m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0 }); // other plastics
  m.name = mat.name; m.side = mat.side;
  if (mat.transparent) { m.transparent = true; m.opacity = mat.opacity; }
  return m;
}

function disposeMaterial(m) {
  if (!m) return;
  for (const k of Object.keys(m)) { const t = m[k]; if (t && t.isTexture) t.dispose(); }
  m.dispose();
}
function disposeTree(root) {
  root.traverse((o) => {
    o.geometry?.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) disposeMaterial(m);
    if (o.userData.rxOrig) for (const m of [].concat(o.userData.rxOrig)) disposeMaterial(m);
  });
}

// ------------------------------------------------------------------ stage
/**
 * createStage(el, opts) mounts a WebGL canvas that fills `el` (give el a size in CSS).
 * opts:
 *   controls    true (default): drag to orbit, pinch or ctrl/cmd + wheel to zoom. false for scroll-driven stages.
 *   background  'transparent' (default; the page's panel shows through) or any CSS colour.
 *   shadow      true (default): faint shadow on an invisible ground under the models.
 *   hint        text of the "drag to rotate" chip, or false. Default depends on touch.
 *   fov         vertical field of view in degrees (default 32).
 *   exposure    tone mapping exposure (default 1).
 *   ao          true: ambient occlusion pass (GTAO, as on the landing scene). Heavier; off by default and on touch.
 *   pixelRatio  cap on devicePixelRatio (default 1.75).
 */
export function createStage(el, opts = {}) {
  if (!el) throw new Error('createStage: no element');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const transparent = !opts.background || opts.background === 'transparent';

  const canvas = document.createElement('canvas');
  canvas.className = 'rx-canvas';
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent, powerPreference: 'high-performance' });
  } catch (e) {
    throw new Error(`WebGL unavailable: ${e.message || e}`);
  }
  const dprCap = opts.pixelRatio || 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = opts.exposure ?? 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = opts.shadow !== false;
  renderer.shadowMap.type = THREE.PCFShadowMap; // PCF honours shadow.radius, which keeps the ground shadow soft
  if (transparent) renderer.setClearColor(0x000000, 0);
  else renderer.setClearColor(new THREE.Color(opts.background), 1);
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; // the canvas fills el
  el.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = opts.envIntensity ?? 0.85;

  const camera = new THREE.PerspectiveCamera(opts.fov || 32, 1, 0.01, 100);
  camera.position.set(1.2, 0.7, 1.4);
  const target = new THREE.Vector3();
  camera.lookAt(target);

  // soft key light from the upper front left; it also casts the ground shadow
  const key = new THREE.DirectionalLight('#fff3e6', 1.7);
  key.castShadow = opts.shadow !== false;
  key.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  key.shadow.radius = 4;
  const keyDir = new THREE.Vector3(-0.45, 1, 0.55).normalize();
  scene.add(key, key.target);

  const root = new THREE.Group(); // loaded models live here; section planes cut only these
  root.name = 'models';
  scene.add(root);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.28, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; ground.visible = false; ground.name = 'ground';
  ground.renderOrder = -1;
  scene.add(ground);

  // ---------------------------------------------------------------- controls
  let controls = null;
  if (opts.controls !== false) {
    controls = new OrbitControls(camera, canvas);
    controls.target = target; // one shared target: frame(), setView() and the controls agree
    controls.enableDamping = !reduced;
    controls.dampingFactor = 0.12;
    controls.enablePan = false;
    controls.enableZoom = touch; // set per event below: pinch, or ctrl/cmd + wheel, zooms; a plain wheel scrolls
    controls.rotateSpeed = 0.8;
    // A plain wheel scrolls the page; a trackpad pinch (ctrl + wheel) or ctrl/cmd + wheel zooms.
    el.addEventListener('wheel', (e) => { controls.enableZoom = e.ctrlKey || e.metaKey; }, { capture: true, passive: true });
    el.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') controls.enableZoom = true; }, { capture: true, passive: true });
    // Touch: vertical swipes keep scrolling the page, sideways swipes turn the model, two fingers zoom.
    if (touch) canvas.style.touchAction = 'pan-y';
    controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };
    controls.addEventListener('change', () => invalidate());
    controls.addEventListener('start', () => { hintEl?.classList.add('gone'); wake(); });
  } else {
    canvas.style.pointerEvents = 'none';
  }
  let hintEl = null;
  if (controls && opts.hint !== false) {
    hintEl = document.createElement('span');
    hintEl.className = 'rx-hint';
    hintEl.textContent = typeof opts.hint === 'string' ? opts.hint : touch ? 'Swipe sideways to turn' : 'Drag to rotate';
    el.appendChild(hintEl);
  }

  // ---------------------------------------------------------------- optional AO (landing-scene look)
  let composer = null;
  if (opts.ao && !touch) {
    Promise.all([
      import('../../vendor/addons/postprocessing/EffectComposer.js'),
      import('../../vendor/addons/postprocessing/RenderPass.js'),
      import('../../vendor/addons/postprocessing/GTAOPass.js'),
      import('../../vendor/addons/postprocessing/OutputPass.js'),
    ]).then(([{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }]) => {
      if (disposed) return;
      const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
      const c = new EffectComposer(renderer, rt);
      c.addPass(new RenderPass(scene, camera));
      const gtao = new GTAOPass(scene, camera, 2, 2);
      gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.8;
      c.addPass(gtao);
      c.addPass(new OutputPass());
      composer = c;
      aoRadius();
      resize();
    }).catch((e) => console.warn('stage: AO unavailable', e));
  }
  function aoRadius() {
    const g = composer?.passes.find((p) => p.gtaoMaterial);
    if (g) g.updateGtaoMaterial({ radius: Math.max(0.005, bounds.r * 0.12), distanceExponent: 2, thickness: 1.5, scale: 1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
  }

  // ---------------------------------------------------------------- render loop (on demand)
  let raf = 0, dirty = true, visible = false, disposed = false, last = 0, elapsed = 0;
  const frameFns = new Set();
  const tweens = new Set();
  function wake() {
    if (raf || disposed || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function invalidate() { dirty = true; wake(); }
  function render() {
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function tick(now) {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now; elapsed += dt;
    let busy = false;
    for (const tw of tweens) { busy = true; tw(dt); }
    for (const fn of frameFns) {
      busy = true;
      try { fn(dt, elapsed); } catch (e) { console.error('stage onFrame callback failed; removed', e); frameFns.delete(fn); }
    }
    if (controls) {
      if (controls.update(dt)) { dirty = true; busy = true; }
      if (controls.autoRotate && !reduced) busy = true;
    }
    if (dirty || busy) { dirty = false; render(); }
    if (busy) raf = requestAnimationFrame(tick);
  }
  const io = new IntersectionObserver((es) => {
    visible = es[es.length - 1].isIntersecting;
    if (visible) invalidate(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { rootMargin: '120px 0px' });
  io.observe(el);
  const onVis = () => { if (!document.hidden) invalidate(); };
  document.addEventListener('visibilitychange', onVis);

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    composer?.setPixelRatio?.(renderer.getPixelRatio());
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (shift.x || shift.y) applyShift();
    // keep the framed model fitting the new shape, seen from wherever the camera is now
    if (lastFrame) frame(lastFrame.obj, { ...lastFrame.opts, dir: camera.position.clone().sub(target), duration: 0 });
    invalidate();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(el);

  // ---------------------------------------------------------------- bounds, ground, shadow fit
  const bounds = { box: new THREE.Box3(), c: new THREE.Vector3(), r: 0.5 };
  const sphereCache = new WeakMap();
  function sphereOf(obj, refresh) {
    obj = obj || root;
    if (!refresh && sphereCache.has(obj)) return sphereCache.get(obj);
    const box = new THREE.Box3();
    for (const o of Array.isArray(obj) ? obj : [obj]) { o.updateWorldMatrix(true, true); box.expandByObject(o); }
    const s = { box, center: box.getCenter(new THREE.Vector3()), radius: Math.max(1e-4, box.getSize(new THREE.Vector3()).length() / 2) };
    if (box.isEmpty()) { box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(1, 1, 1)); s.center.set(0, 0, 0); s.radius = 0.5; }
    sphereCache.set(obj, s);
    return s;
  }
  function fitGround() {
    const s = sphereOf(root, true);
    bounds.box.copy(s.box); bounds.c.copy(s.center); bounds.r = s.radius;
    if (s.box.isEmpty()) return;
    const r = s.radius;
    ground.visible = opts.shadow !== false;
    ground.position.set(s.center.x, s.box.min.y - r * 0.002, s.center.z);
    ground.scale.setScalar(r * 8);
    key.position.copy(s.center).addScaledVector(keyDir, r * 4);
    key.target.position.copy(s.center);
    Object.assign(key.shadow.camera, { left: -r * 1.4, right: r * 1.4, top: r * 1.4, bottom: -r * 1.4, near: r * 0.5, far: r * 9 });
    key.shadow.camera.updateProjectionMatrix();
    key.shadow.bias = -0.0004; key.shadow.normalBias = r * 0.006;
    camera.near = r / 200; camera.far = r * 120; camera.updateProjectionMatrix();
    if (controls) { controls.minDistance = r * 0.35; controls.maxDistance = r * 14; }
    aoRadius();
  }

  // ---------------------------------------------------------------- section planes with caps
  // Cut faces show the parts' inside (their back faces). Those are painted a flat hatched cap
  // colour, so the cut reads like a solid CAD section rather than a hollow shell.
  const clipPlanes = [];
  // cream hatch: reads as "cut" against both dark parts and the red and orange prints
  const cap = { a: { value: new THREE.Color('#ebe4d9') }, b: { value: new THREE.Color('#cbc1b4') }, hatch: { value: 8 } };
  const capped = new WeakSet();
  function prepClip(m) {
    if (!m || capped.has(m) || !clipPlanes.length) return;
    capped.add(m);
    const prev = m.onBeforeCompile, prevKey = m.customProgramCacheKey;
    m.onBeforeCompile = (sh, r) => {
      prev?.call(m, sh, r);
      sh.uniforms.rxCapA = cap.a; sh.uniforms.rxCapB = cap.b; sh.uniforms.rxHatch = cap.hatch;
      sh.fragmentShader = `uniform vec3 rxCapA; uniform vec3 rxCapB; uniform float rxHatch;\n${sh.fragmentShader.replace('#include <tonemapping_fragment>', `#include <tonemapping_fragment>
        if (!gl_FrontFacing) gl_FragColor.rgb = mod(gl_FragCoord.x + gl_FragCoord.y, rxHatch) < rxHatch * 0.5 ? rxCapA : rxCapB;`)}`;
    };
    m.customProgramCacheKey = () => `${prevKey ? prevKey.call(m) : ''}|rxcap`;
    m.side = THREE.DoubleSide;
    m.clippingPlanes = clipPlanes;
    m.clipShadows = true;
    m.needsUpdate = true;
  }
  function prepAllClip() {
    root.traverse((o) => { if (o.isMesh) (Array.isArray(o.material) ? o.material : [o.material]).forEach(prepClip); });
  }
  function sectionPlane(normal = [1, 0, 0], constant = 0) {
    const plane = new THREE.Plane(v3(normal).normalize(), constant);
    let on = false;
    const enable = (yes) => {
      if (yes === on) return;
      on = yes;
      if (yes) { clipPlanes.push(plane); renderer.localClippingEnabled = true; prepAllClip(); }
      else { const i = clipPlanes.indexOf(plane); if (i >= 0) clipPlanes.splice(i, 1); }
      invalidate();
    };
    enable(true);
    return {
      plane,
      get constant() { return plane.constant; },
      /** move the cut: keeps points where dot(normal, p) + constant >= 0 */
      set(c) { plane.constant = c; invalidate(); },
      setNormal(n) { plane.normal.copy(v3(n).normalize()); invalidate(); },
      enable,
      get enabled() { return on; },
      remove() { enable(false); },
    };
  }
  cap.hatch.value = 8 * renderer.getPixelRatio();

  // ---------------------------------------------------------------- camera
  function setView(view) {
    if (view.pos) camera.position.copy(v3(view.pos));
    if (view.target) target.copy(v3(view.target));
    camera.lookAt(target);
    invalidate();
  }
  // Move the picture on the canvas without moving the camera, e.g. up out of the way of text
  // cards that cover the bottom of a phone screen. Fractions of the canvas; +y moves it up.
  const shift = { x: 0, y: 0 };
  function applyShift() {
    const w = el.clientWidth, h = el.clientHeight;
    if (w && h && (shift.x || shift.y)) camera.setViewOffset(w, h, -shift.x * w, shift.y * h, w, h);
    else { camera.clearViewOffset(); }
  }
  function setShift(fx = 0, fy = 0) { shift.x = fx; shift.y = fy; applyShift(); invalidate(); }
  function tweenCamera(view, seconds = 0.9) {
    const toPos = view.pos ? v3(view.pos) : camera.position.clone();
    const toTarget = view.target ? v3(view.target) : target.clone();
    if (reduced || seconds <= 0) { setView({ pos: toPos, target: toTarget }); return Promise.resolve(); }
    // orbit around the target rather than cutting straight through the model
    const s0 = new THREE.Spherical().setFromVector3(camera.position.clone().sub(target));
    const s1 = new THREE.Spherical().setFromVector3(toPos.clone().sub(toTarget));
    let dTheta = s1.theta - s0.theta;
    while (dTheta > Math.PI) dTheta -= Math.PI * 2;
    while (dTheta < -Math.PI) dTheta += Math.PI * 2;
    const t0 = target.clone(), sph = new THREE.Spherical();
    for (const tw of tweens) if (tw.camera) tweens.delete(tw); // a new move replaces the old one
    return new Promise((resolve) => {
      let t = 0;
      const tw = (dt) => {
        t = Math.min(1, t + dt / seconds);
        const k = easeInOut(t);
        target.lerpVectors(t0, toTarget, k);
        sph.set(s0.radius + (s1.radius - s0.radius) * k, s0.phi + (s1.phi - s0.phi) * k, s0.theta + dTheta * k);
        camera.position.setFromSpherical(sph).add(target);
        camera.lookAt(target);
        if (t >= 1) { tweens.delete(tw); resolve(); }
      };
      tw.camera = true;
      tweens.add(tw);
      wake();
    });
  }
  let lastFrame = null;
  /**
   * Fit obj (an Object3D or an array of them; default: every loaded model) in view. opts: pad (1.12), azimuth / elevation in
   * degrees (35 / 22; azimuth 0 looks from +Z, 90 from +X), or dir [x, y, z] from the model toward
   * the camera, duration in seconds (0 = jump), apply (false = only compute). Returns { pos, target }.
   */
  function frame(obj, o = {}) {
    const s = sphereOf(obj || root, o.refresh);
    let dir;
    if (o.dir) dir = v3(o.dir).normalize();
    else {
      const az = (o.azimuth ?? 35) * DEG, el = (o.elevation ?? 22) * DEG;
      dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    }
    const center = s.center.clone();
    if (o.offset) center.add(v3(o.offset));
    // tightest distance at which all eight corners of the bounding box fit the view
    const pad = o.pad ?? 1.12;
    const tv = Math.tan((camera.fov * DEG) / 2) / pad, th = (Math.tan((camera.fov * DEG) / 2) * camera.aspect) / pad;
    const fwd = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(fwd, Math.abs(dir.y) > 0.999 ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);
    let dist = s.radius * 0.25;
    const q = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      q.set(i & 1 ? s.box.max.x : s.box.min.x, i & 2 ? s.box.max.y : s.box.min.y, i & 4 ? s.box.max.z : s.box.min.z).sub(center);
      const z = q.dot(dir);
      dist = Math.max(dist, z + Math.abs(q.dot(right)) / th, z + Math.abs(q.dot(up)) / tv);
    }
    const view = { pos: center.clone().addScaledVector(dir, dist), target: center };
    if (o.apply === false) return view;
    lastFrame = o.track === false ? null : { obj, opts: o };
    if (o.duration > 0) tweenCamera(view, o.duration); else setView(view);
    return view;
  }

  // ---------------------------------------------------------------- models and parts
  async function load(url, o = {}) {
    const buf = await fetchBuffer(assetUrl(url));
    if (disposed) throw new Error('stage disposed while loading');
    const gltf = await loader.parseAsync(buf.slice(0), assetUrl(url).replace(/[^/]*$/, '').replace(/\?.*$/, ''));
    const obj = gltf.scene;
    obj.userData.rxModel = true;
    obj.userData.src = url;
    const cache = new Map();
    obj.traverse((m) => {
      if (!m.isMesh) return;
      m.castShadow = o.shadows !== false; m.receiveShadow = o.shadows !== false;
      if (o.pbr === false) return;
      const rubber = RUBBER.test(nameChain(m));
      const fix = (mat) => { const k = mat.uuid + (rubber ? 'r' : ''); if (!cache.has(k)) cache.set(k, cadMaterial(mat, rubber)); return cache.get(k); };
      m.material = Array.isArray(m.material) ? m.material.map(fix) : fix(m.material);
    });
    if (o.add !== false) root.add(obj);
    prepAllClip();
    fitGround();
    invalidate();
    return obj;
  }
  /** Top-most nodes whose name matches re (meshes, or groups for parts with several materials). */
  function part(re, within = root) {
    const rx = re instanceof RegExp ? new RegExp(re.source, re.flags.replace(/[gy]/g, '')) : new RegExp(String(re)); // no stateful g/y
    const out = [];
    const walk = (o) => {
      if (o !== within && rx.test(o.name)) { out.push(o); return; }
      for (const c of o.children) walk(c);
    };
    walk(within);
    return out;
  }
  function modelRootOf(o) { for (let p = o; p; p = p.parent) if (p.userData?.rxModel) return p; return null; }
  /**
   * Group that rotates objs about a real axis. point and dir are in the model's own frame
   * (metres, Y up: the GLB's coordinates; convert cad-axes.py output with cad.point / cad.dir).
   * point 'center' uses the parts' bounding-box centre (only for parts that are round about the
   * axis, like wheels and gears). Returns a THREE.Group with setAngle(radians) and .axis.
   */
  function pivot(objs, point = 'center', dir = [0, 0, 1], o = {}) {
    const list = (Array.isArray(objs) ? objs : [objs]).filter(Boolean);
    if (!list.length) throw new Error('pivot: no parts (check the part() pattern)');
    const first = list[0], parent = first.parent;
    const frameObj = o.frame || modelRootOf(first) || scene;
    frameObj.updateWorldMatrix(true, false);
    parent.updateWorldMatrix(true, false);
    let worldPoint;
    if (point === 'center' || point == null) {
      const box = new THREE.Box3();
      for (const x of list) box.expandByObject(x);
      worldPoint = box.getCenter(new THREE.Vector3());
    } else worldPoint = frameObj.localToWorld(v3(point));
    const worldDir = v3(dir).normalize().transformDirection(frameObj.matrixWorld);
    const inv = new THREE.Matrix4().copy(parent.matrixWorld).invert();
    const g = new THREE.Group();
    g.name = `pivot:${first.name}`;
    g.position.copy(worldPoint).applyMatrix4(inv);
    parent.add(g);
    g.updateWorldMatrix(true, false);
    for (const x of list) g.attach(x);
    const axis = worldDir.clone().transformDirection(inv).normalize();
    const q0 = g.quaternion.clone();
    let angle = 0;
    g.axis = axis;
    g.setAngle = (a) => { angle = a; g.quaternion.setFromAxisAngle(axis, a).premultiply(q0); invalidate(); return g; };
    Object.defineProperty(g, 'angle', { get: () => angle });
    return g;
  }
  /** Light parts up (emissive tint). Returns a function that restores them. color null clears. */
  function highlight(objs, color = '#ff6b35', o = {}) {
    const meshes = [];
    for (const x of (Array.isArray(objs) ? objs : [objs]).filter(Boolean)) x.traverse((m) => { if (m.isMesh) meshes.push(m); });
    const clear = () => {
      for (const m of meshes) {
        if (!m.userData.rxOrig) continue;
        for (const x of Array.isArray(m.material) ? m.material : [m.material]) disposeMaterial(x);
        m.material = m.userData.rxOrig;
        delete m.userData.rxOrig;
      }
      invalidate();
    };
    if (color == null) { clear(); return () => {}; }
    for (const m of meshes) {
      if (!m.userData.rxOrig) {
        m.userData.rxOrig = m.material;
        m.material = Array.isArray(m.material) ? m.material.map((x) => x.clone()) : m.material.clone();
      }
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        if (mat.emissive) { mat.emissive.set(color); mat.emissiveIntensity = o.intensity ?? 0.45; }
        prepClip(mat);
      }
    }
    invalidate();
    return clear;
  }

  // ---------------------------------------------------------------- lifecycle
  function onFrame(fn) {
    frameFns.add(fn);
    wake();
    return () => { frameFns.delete(fn); invalidate(); };
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    el.removeEventListener('rx:unmount', dispose);
    if (raf) cancelAnimationFrame(raf);
    frameFns.clear(); tweens.clear();
    io.disconnect(); ro.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    controls?.dispose();
    disposeTree(scene);
    envTex.dispose();
    key.shadow.map?.dispose();
    composer?.renderTarget1?.dispose(); composer?.renderTarget2?.dispose();
    composer?.passes.forEach((p) => p.dispose?.());
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove(); hintEl?.remove();
  }

  // the page runtime (project.js) sends rx:unmount when it unmounts a block or its module fails,
  // so a stage is freed even if the module forgot to return dispose()
  el.addEventListener('rx:unmount', dispose, { once: true });

  resize();
  return {
    THREE, scene, camera, renderer, controls, root, el, canvas, ground, light: key, reducedMotion: reduced, isTouch: touch,
    load, frame, setView, tweenCamera, setShift, onFrame, invalidate, render: () => { render(); dirty = false; },
    highlight, sectionPlane, part, pivot, dispose,
    bounds: (obj, refresh) => sphereOf(obj || root, refresh),
    fitGround,
    /** colours of the section cap (CSS colours) */
    setCapColor(a, b = a) { cap.a.value.set(a); cap.b.value.set(b); invalidate(); },
  };
}
