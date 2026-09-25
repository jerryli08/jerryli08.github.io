// Landing scene: Jerry's hybrid UAV-UGV on Mars, using his own CAD (assets/models/*.glb,
// tessellated from the Fusion 360 STEP exports with no shape changes).
// First visit in a session: the drone flies in and docks onto the rover.
// After that the rover wanders the terrain with the drone docked, indefinitely.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/addons/libs/meshopt_decoder.module.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

// ------------------------------------------------------------------ noise + terrain
function hash2(x, y) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
function fbm(x, y, oct) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f + i * 17.3, y * f - i * 9.1); n += amp; amp *= 0.5; f *= 2.03; }
  return s / n;
}
function ridge(x, y, oct) {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { const r = 1 - Math.abs(vnoise(x * f + i * 5.7, y * f + i * 3.3)); s += amp * r * r; n += amp; amp *= 0.5; f *= 2.1; }
  return s / n;
}
const CRATERS = [
  { x: 9, z: -7, r: 2.6, d: 0.45 }, { x: -13, z: -15, r: 4.5, d: 0.9 }, { x: 16, z: 11, r: 1.8, d: 0.3 },
  { x: -7, z: 13, r: 1.3, d: 0.22 }, { x: 34, z: -30, r: 8, d: 1.6 }, { x: -40, z: 22, r: 10, d: 1.8 },
];
const WANDER_R = 4.2;
function terrainHeight(x, z) {
  const r = Math.hypot(x, z);
  let h = fbm(x * 0.05, z * 0.05, 4) * 2.2 * smooth(3, 26, r);
  h += fbm(x * 0.35 + 3.1, z * 0.35 - 1.7, 3) * 0.06;
  h += (ridge(x * 0.012 + 4, z * 0.012 - 2, 4) - 0.35) * 34 * smooth(55, 150, r);
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1.6) h += (d < 1 ? -(1 - d * d) * c.d : 0) + Math.exp(-Math.pow((d - 1) * 3.2, 2)) * c.d * 0.35;
  }
  return h;
}

function grainTexture(renderer) {
  const s = 256, cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const g = cv.getContext('2d'), img = g.createImageData(s, s);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const n = 0.45 * vnoise(x / 3, y / 3) + 0.3 * vnoise(x / 1.3 + 40, y / 1.3) + 0.25 * (hash2(x, y) * 2 - 1);
    const v = clamp(226 + n * 28, 0, 255), i = (y * s + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function buildTerrain(renderer, lowPower) {
  const SEG = lowPower ? 200 : 300;
  const radii = [0];
  let r = 0, dr = 0.035;
  while (r < 320) { r += dr; radii.push(r); dr *= lowPower ? 1.045 : 1.034; }
  const rings = radii.length, count = 1 + (rings - 1) * SEG;
  const pos = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  pos[1] = terrainHeight(0, 0);
  let k = 1;
  for (let i = 1; i < rings; i++) for (let j = 0; j < SEG; j++) {
    const a = (j / SEG) * TAU + (i % 2) * (Math.PI / SEG);
    const x = Math.cos(a) * radii[i], z = Math.sin(a) * radii[i];
    pos[k * 3] = x; pos[k * 3 + 1] = terrainHeight(x, z); pos[k * 3 + 2] = z;
    uv[k * 2] = x * 2.4; uv[k * 2 + 1] = z * 2.4;
    k++;
  }
  const idx = [];
  for (let j = 0; j < SEG; j++) idx.push(0, 1 + ((j + 1) % SEG), 1 + j);
  for (let i = 1; i < rings - 1; i++) {
    const a0 = 1 + (i - 1) * SEG, b0 = 1 + i * SEG;
    for (let j = 0; j < SEG; j++) { const j1 = (j + 1) % SEG; idx.push(a0 + j, a0 + j1, b0 + j, a0 + j1, b0 + j1, b0 + j); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal.array, col = new Float32Array(count * 3);
  const base = new THREE.Color('#a4552f'), dust = new THREE.Color('#cf8a57'), dark = new THREE.Color('#5a2818'), basalt = new THREE.Color('#3e2219'), c = new THREE.Color();
  for (let v = 0; v < count; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2], slope = 1 - nrm[v * 3 + 1];
    const n1 = fbm(x * 0.2 + 11, z * 0.2, 3), n2 = fbm(x * 1.5, z * 1.5 - 5, 2);
    c.copy(base).lerp(dust, clamp(0.45 + n1 * 0.9 + n2 * 0.2, 0, 1));
    c.lerp(dark, clamp(slope * 5 - 0.1 + n2 * 0.15, 0, 0.85));
    c.lerp(basalt, clamp((fbm(x * 0.08 - 3, z * 0.08 + 8, 3) - 0.25) * 1.6, 0, 0.55));
    c.multiplyScalar(0.9 + clamp(y * 0.03, -0.1, 0.15));
    col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const grain = grainTexture(renderer);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: grain, bumpMap: grain, bumpScale: 0.25, roughness: 0.97, metalness: 0 }));
  mesh.receiveShadow = true;
  return mesh;
}

function buildSky(sunDir) {
  return new THREE.Mesh(new THREE.SphereGeometry(700, 48, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      sunDir: { value: sunDir.clone() }, horizon: { value: new THREE.Color('#d39570') }, mid: { value: new THREE.Color('#8a5347') },
      zenith: { value: new THREE.Color('#2a1a21') }, glow: { value: new THREE.Color('#ffd2a4') },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 sunDir, horizon, mid, zenith, glow; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 col = mix(horizon, mid, smoothstep(0.0, 0.18, h)); col = mix(col, zenith, smoothstep(0.15, 0.75, h));
        col = mix(col, horizon * 0.8, smoothstep(0.0, -0.08, h)); float s = max(dot(vDir, normalize(sunDir)), 0.0);
        col += glow * (pow(s, 6.0) * 0.28 + pow(s, 60.0) * 0.5 + pow(s, 900.0) * 2.5); gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  }));
}

function buildRocks(lowPower) {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    v.multiplyScalar(1 + 0.28 * vnoise(v.x * 2.1 + 3, v.y * 2.3 + v.z * 1.7)); v.y *= 0.72;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const specs = [
    { n: lowPower ? 500 : 1100, rMin: 0.3, rMax: 8, sMin: 0.004, sMax: 0.03 },
    { n: 260, rMin: 5.5, rMax: 32, sMin: 0.05, sMax: 0.4 },
    { n: 90, rMin: 20, rMax: 110, sMin: 0.6, sMax: 3 },
  ];
  const mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: true }), specs.reduce((a, s) => a + s.n, 0));
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), t = new THREE.Vector3(), e = new THREE.Euler(), col = new THREE.Color();
  let i = 0, seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (const sp of specs) for (let k = 0; k < sp.n; k++) {
    const a = rnd() * TAU, rr = Math.sqrt(lerp(sp.rMin * sp.rMin, sp.rMax * sp.rMax, rnd()));
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr, sc = lerp(sp.sMin, sp.sMax, Math.pow(rnd(), 2.2));
    // keep the rover's driving area clear of anything it would visibly clip through
    if (rr < WANDER_R + 1.2 && sc > 0.012) continue;
    t.set(x, terrainHeight(x, z) - sc * 0.3, z);
    e.set(rnd() * 0.6, rnd() * TAU, rnd() * 0.6); q.setFromEuler(e);
    s.set(sc * lerp(0.8, 1.4, rnd()), sc * lerp(0.6, 1.1, rnd()), sc * lerp(0.8, 1.3, rnd()));
    mesh.setMatrixAt(i, m.compose(t, q, s));
    mesh.setColorAt(i, col.setHSL(0.04 + rnd() * 0.02, 0.35 + rnd() * 0.2, 0.18 + rnd() * 0.12));
    i++;
  }
  mesh.count = i;
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

class Tracks {
  constructor(n, width) {
    this.n = n; this.w = width; this.pts = [];
    this.pos = new Float32Array(n * 6); this.col = new Float32Array(n * 8);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
    const idx = [];
    for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setIndex(idx); this.geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
  }
  push(x, z, dx, dz) {
    const l = Math.hypot(dx, dz) || 1;
    this.pts.push([x, z, -dz / l, dx / l]);
    if (this.pts.length > this.n) this.pts.shift();
    const P = this.pts, len = P.length, hw = this.w / 2;
    for (let i = 0; i < len; i++) {
      const [px, pz, sx, sz] = P[i], y = terrainHeight(px, pz) + 0.002, o = i * 6, c = i * 8;
      this.pos[o] = px + sx * hw; this.pos[o + 1] = y; this.pos[o + 2] = pz + sz * hw;
      this.pos[o + 3] = px - sx * hw; this.pos[o + 4] = y; this.pos[o + 5] = pz - sz * hw;
      const a = 0.4 * (1 - Math.pow(1 - i / len, 1.6)) * smooth(0, 6, i);
      for (let s = 0; s < 2; s++) { this.col[c + s * 4] = 0.22; this.col[c + s * 4 + 1] = 0.1; this.col[c + s * 4 + 2] = 0.06; this.col[c + s * 4 + 3] = a; }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (len - 1) * 6));
  }
}

// ------------------------------------------------------------------ CAD rigging
// Both STEP files share the docked assembly frame, so docking = identity between them.
function prepMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const m = o.material;
    if (m && m.isMeshStandardMaterial) { m.metalness = Math.min(m.metalness, 0.15); m.roughness = Math.max(0.45, Math.min(m.roughness, 0.8)); }
  });
}
// Wrap a mesh in a pivot at its bounding-box center, preserving its world placement.
function pivotize(mesh, parent) {
  mesh.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(mesh);
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const pivot = new THREE.Group();
  parent.add(pivot);
  parent.updateWorldMatrix(true, false);
  pivot.position.copy(parent.worldToLocal(c.clone()));
  pivot.updateWorldMatrix(true, false);
  pivot.attach(mesh);
  return { pivot, size };
}

function rig(droneGltf, roverGltf) {
  // vehicle frame: origin on the ground under the rover's wheel centers, +Z forward
  const roverRoot = roverGltf.scene, droneRoot = droneGltf.scene;
  prepMaterials(roverRoot); prepMaterials(droneRoot);
  roverRoot.updateMatrixWorld(true); droneRoot.updateMatrixWorld(true);
  const wheels = [];
  roverRoot.traverse((o) => { if (o.isMesh && /^anim_rover_/.test(o.name)) wheels.push(o); });
  const props = [];
  droneRoot.traverse((o) => { if (o.isMesh && /^anim_drone_/.test(o.name)) props.push(o); });

  const centers = wheels.map((w) => new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3()));
  const sizes = wheels.map((w) => new THREE.Box3().setFromObject(w).getSize(new THREE.Vector3()));
  const mid = centers.reduce((a, c) => a.add(c), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, centers.length));
  const wheelRadius = sizes.length ? Math.max(sizes[0].x, sizes[0].y) / 2 : 0.035;
  const xs = centers.map((c) => c.x), zs = centers.map((c) => c.z);
  const wheelbase = Math.max(...xs) - Math.min(...xs) || 0.14; // CAD X is the rover's long axis
  const track = Math.max(...zs) - Math.min(...zs) || 0.13;
  // The CAD's front (latch mount, AprilTag end) is toward -X. Rotate so it faces +Z.
  const toFrame = new THREE.Matrix4().makeRotationY(Math.PI / 2).multiply(new THREE.Matrix4().makeTranslation(-mid.x, -(mid.y - wheelRadius), -mid.z));

  const rover = new THREE.Group(); rover.name = 'rover';
  const roverInner = new THREE.Group(); roverInner.matrixAutoUpdate = false; roverInner.matrix.copy(toFrame);
  rover.add(roverInner); roverInner.add(roverRoot);
  const drone = new THREE.Group(); drone.name = 'drone';
  const droneInner = new THREE.Group(); droneInner.matrixAutoUpdate = false; droneInner.matrix.copy(toFrame);
  drone.add(droneInner); droneInner.add(droneRoot);
  rover.updateMatrixWorld(true); drone.updateMatrixWorld(true);

  // wheel pivots spin about the axle, which is CAD Z (lateral)
  const wheelPivots = wheels.map((w, i) => { const { pivot } = pivotize(w, w.parent); pivot.userData.left = centers[i].z < mid.z; return pivot; });
  const propPivots = props.map((p, i) => { const { pivot } = pivotize(p, p.parent); pivot.userData.dir = i % 2 ? 1 : -1; return pivot; });

  // how far the landing gear sits below the drone's docked origin, for the descent
  const dBox = new THREE.Box3().setFromObject(drone);
  return {
    rover, drone, wheelRadius, wheelbase, track,
    droneBottom: dBox.min.y, droneTop: dBox.max.y,
    setWheels(aL, aR) { for (const p of wheelPivots) p.rotation.z = p.userData.left ? aL : aR; },
    setProps(angle) { for (const p of propPivots) p.rotation.y = angle * p.userData.dir; },
  };
}

// ------------------------------------------------------------------ main
export async function initHero(canvas, opts = {}) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, powerPreference: 'high-performance' });
  } catch (err) { opts.onFail?.(err); return null; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = lowPower ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const models = opts.models || { drone: '/assets/models/drone.glb', rover: '/assets/models/rover.glb' };
  const [droneGltf, roverGltf] = await Promise.all([loader.loadAsync(models.drone), loader.loadAsync(models.rover)]);
  const V = rig(droneGltf, roverGltf);

  const scene = new THREE.Scene();
  const fogColor = new THREE.Color('#b27658');
  scene.fog = new THREE.FogExp2(fogColor, 0.017);
  scene.background = fogColor;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.02, 900);

  const sunDir = new THREE.Vector3(-0.7, 0.3, -0.45).normalize();
  scene.add(buildSky(sunDir));
  scene.add(new THREE.HemisphereLight('#ffd6b6', '#3a1a10', 1.0));
  const sun = new THREE.DirectionalLight('#ffd9ae', 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.5, far: 30 });
  sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.004;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#9fb2ff', 0.45);
  fill.position.set(0.6, 0.5, 0.8);
  scene.add(fill);

  scene.add(buildTerrain(renderer, lowPower));
  scene.add(buildRocks(lowPower));
  const tw = 0.03;
  const tracksL = new Tracks(700, tw), tracksR = new Tracks(700, tw);
  scene.add(tracksL.mesh, tracksR.mesh);
  scene.add(V.rover, V.drone);

  // ---------------------------------------------------------------- rover motion
  const R = { x: 0, z: 0, yaw: 0, v: 0, w: 0, pitch: 0, roll: 0, y: 0, wL: 0, wR: 0, target: null, pause: 0, last: null };
  let seed = (Date.now() % 100000) + 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pickTarget = () => {
    for (let i = 0; i < 30; i++) {
      const a = rnd() * TAU, rr = 0.8 + rnd() * (WANDER_R - 0.8);
      const tx = Math.cos(a) * rr, tz = Math.sin(a) * rr;
      if (Math.hypot(tx - R.x, tz - R.z) > 1.6) { R.target = { x: tx, z: tz }; return; }
    }
    R.target = { x: -R.x * 0.5, z: -R.z * 0.5 };
  };
  function placeRover(dt, snap) {
    const fx = Math.sin(R.yaw), fz = Math.cos(R.yaw), rx = fz, rz = -fx;
    const L = V.wheelbase / 2, W = V.track / 2;
    const h = (a, b) => terrainHeight(R.x + fx * a + rx * b, R.z + fz * a + rz * b);
    const fl = h(L, -W), fr = h(L, W), bl = h(-L, -W), br = h(-L, W);
    const y = (fl + fr + bl + br) / 4;
    const pitch = Math.atan2((bl + br - fl - fr) / 2, V.wheelbase);
    const roll = Math.atan2((fr + br - fl - bl) / 2, V.track);
    if (snap) { R.y = y; R.pitch = pitch; R.roll = roll; }
    else { R.y = damp(R.y, y, 18, dt); R.pitch = damp(R.pitch, pitch, 10, dt); R.roll = damp(R.roll, roll, 10, dt); }
    V.rover.position.set(R.x, R.y, R.z);
    V.rover.rotation.set(0, 0, 0);
    V.rover.rotateY(R.yaw); V.rover.rotateX(R.pitch); V.rover.rotateZ(R.roll);
  }
  function wander(dt) {
    if (R.pause > 0) {
      R.pause -= dt; R.v = damp(R.v, 0, 4, dt); R.w = damp(R.w, 0, 4, dt);
    } else {
      if (!R.target) pickTarget();
      const dx = R.target.x - R.x, dz = R.target.z - R.z, dist = Math.hypot(dx, dz);
      if (dist < 0.45) { R.target = null; if (rnd() < 0.35) R.pause = 1.2 + rnd() * 2.4; }
      else {
        const err = wrapAngle(Math.atan2(dx, dz) - R.yaw);
        R.w = damp(R.w, clamp(err * 1.3, -0.8, 0.8), 3, dt);
        R.v = damp(R.v, 0.28 * (1 - Math.min(Math.abs(err) / 1.6, 0.8)) * smooth(0.2, 1.0, dist), 1.6, dt);
      }
    }
    R.yaw += R.w * dt;
    R.x += Math.sin(R.yaw) * R.v * dt;
    R.z += Math.cos(R.yaw) * R.v * dt;
  }
  function spinWheels(dt) {
    const half = V.track / 2;
    R.wL += ((R.v + R.w * half) / V.wheelRadius) * dt;
    R.wR += ((R.v - R.w * half) / V.wheelRadius) * dt;
    V.setWheels(R.wL, R.wR);
  }
  function dropTracks() {
    const fx = Math.sin(R.yaw), fz = Math.cos(R.yaw), rx = fz, rz = -fx, W = V.track / 2;
    if (!R.last) { R.last = { x: R.x, z: R.z }; return; }
    const dx = R.x - R.last.x, dz = R.z - R.last.z;
    if (Math.hypot(dx, dz) < 0.03) return;
    tracksL.push(R.x - rx * W, R.z - rz * W, dx, dz);
    tracksR.push(R.x + rx * W, R.z + rz * W, dx, dz);
    R.last = { x: R.x, z: R.z };
  }

  // ---------------------------------------------------------------- docking intro
  const docked0 = (() => { try { return sessionStorage.getItem('jl_docked') === '1'; } catch { return false; } })();
  const skipIntro = docked0 || reduced || opts.skipIntro;
  const T = { flyStart: 0.3, hoverAt: 3.6, descend: 4.3, touch: 5.5, spinDown: 7.0, resume: 7.2 };
  const HOVER = 0.34;
  let clock = 0, phase = skipIntro ? 'wander' : 'intro', docked = skipIntro;
  const intro = { start: new THREE.Vector3(), mid: new THREE.Vector3(), yaw0: 0 };
  const up = new THREE.Vector3(0, 1, 0);
  const P = new THREE.Vector3(), prevP = new THREE.Vector3(), prevV = new THREE.Vector3(), curV = new THREE.Vector3(), acc = new THREE.Vector3();
  const tQ = new THREE.Quaternion(), yQ = new THREE.Quaternion(), dockQ = new THREE.Quaternion(), dockP = new THREE.Vector3(), hoverP = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function bez(a, b, c, d, t, out) {
    const u = 1 - t;
    return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t);
  }
  function attach() {
    V.rover.add(V.drone);
    V.drone.position.set(0, 0, 0);
    V.drone.quaternion.identity();
    docked = true;
    try { sessionStorage.setItem('jl_docked', '1'); } catch { /* storage unavailable */ }
  }
  function fly(t, dt) {
    V.rover.updateMatrixWorld(true);
    dockP.setFromMatrixPosition(V.rover.matrixWorld);
    V.rover.getWorldQuaternion(dockQ);
    hoverP.copy(up).applyQuaternion(dockQ).multiplyScalar(HOVER).add(dockP);
    if (t < T.hoverAt) {
      const k = easeInOut(clamp((t - T.flyStart) / (T.hoverAt - T.flyStart), 0, 1));
      tmp.lerpVectors(intro.mid, hoverP, 0.55).y += 0.25;
      bez(intro.start, intro.mid, tmp, hoverP, k, P);
    } else if (t < T.descend) {
      const k = (t - T.hoverAt) / (T.descend - T.hoverAt);
      P.copy(hoverP).add(tmp.set(Math.sin(k * 9) * 0.01 * (1 - k), Math.sin(k * 6) * 0.006, Math.cos(k * 7) * 0.01 * (1 - k)));
    } else {
      P.lerpVectors(hoverP, dockP, easeOut(clamp((t - T.descend) / (T.touch - T.descend), 0, 1)));
    }
    V.drone.position.copy(P);
    if (dt > 0) { curV.subVectors(P, prevP).divideScalar(dt); acc.subVectors(curV, prevV).divideScalar(dt).clampLength(0, 5); }
    prevP.copy(P); prevV.copy(curV);
    // body tilts toward its acceleration like a real quad; yaw aligns to the rover before descent
    const align = smooth(T.flyStart, T.hoverAt, t);
    const yaw = lerp(intro.yaw0, intro.yaw0 + wrapAngle(R.yaw - intro.yaw0), align);
    const lean = t < T.descend ? 0.5 : 0.5 * (1 - smooth(T.descend, T.descend + 0.5, t));
    tQ.setFromUnitVectors(up, tmp.copy(acc).multiplyScalar(lean).add(new THREE.Vector3(0, 9.81, 0)).normalize());
    yQ.setFromAxisAngle(up, yaw);
    tQ.multiply(yQ);
    // in the final descent, lock onto the rover's exact orientation so the gear drops into the latches
    if (t >= T.descend) tQ.slerp(dockQ, smooth(T.descend, T.descend + 0.6, t));
    V.drone.quaternion.slerp(tQ, 1 - Math.exp(-10 * dt));
    if (t >= T.descend + 0.6) V.drone.quaternion.copy(dockQ);
  }
  function setupIntro() {
    R.x = -1.3; R.z = -0.7; R.yaw = 0.95; R.v = 0.26;
    placeRover(0, true);
    updateCamera(0, true, 1);
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const camUp = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    const fwd = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).negate();
    const stopDist = 0.26 * 3.2 * 0.5;
    const stop = new THREE.Vector3(R.x + Math.sin(R.yaw) * stopDist, 0, R.z + Math.cos(R.yaw) * stopDist);
    stop.y = terrainHeight(stop.x, stop.z);
    intro.start.copy(camera.position).addScaledVector(fwd, 2.6).addScaledVector(right, 2.0).addScaledVector(camUp, 1.1);
    intro.mid.copy(stop).addScaledVector(right, 0.9).addScaledVector(fwd, -0.25).add(tmp.set(0, 0.9, 0));
    intro.yaw0 = R.yaw + 1.2;
    V.drone.position.copy(intro.start);
    prevP.copy(intro.start);
  }
  function introRover(t, dt) {
    R.v = t < T.resume ? 0.26 * (1 - easeOut(clamp(t / 3.2, 0, 1))) : R.v;
    R.w = 0;
    R.x += Math.sin(R.yaw) * R.v * dt;
    R.z += Math.cos(R.yaw) * R.v * dt;
  }

  // ---------------------------------------------------------------- camera
  const cam = { az: 0, tx: 0, ty: 0, tz: 0, px: 0, py: 0 };
  const pointer = { x: 0, y: 0 };
  addEventListener('pointermove', (e) => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });
  function updateCamera(dt, snap, introK = 0) {
    const lam = snap ? 1e6 : 2.2, d = dt || 1;
    cam.tx = damp(cam.tx, R.x, lam, d); cam.ty = damp(cam.ty, R.y + 0.1, lam, d); cam.tz = damp(cam.tz, R.z, lam, d);
    if (!reduced) cam.az += (dt || 0) * 0.04;
    cam.px = damp(cam.px, pointer.x, 2, d); cam.py = damp(cam.py, pointer.y, 2, d);
    const aspect = camera.aspect || 1;
    const dist = (aspect < 0.9 ? 2.15 : aspect < 1.2 ? 1.85 : 1.6) + introK * 1.2;
    const el = 0.16 + introK * 0.1 - cam.py * 0.035;
    const az = cam.az + cam.px * 0.12 - 2.3;
    const cx = cam.tx + Math.sin(az) * Math.cos(el) * dist, cz = cam.tz + Math.cos(az) * Math.cos(el) * dist;
    const cy = Math.max(cam.ty + Math.sin(el) * dist, terrainHeight(cx, cz) + 0.15);
    camera.position.set(cx, cy, cz);
    camera.lookAt(cam.tx, cam.ty - 0.07 + introK * 0.3, cam.tz);
    camera.updateMatrixWorld(true);
  }

  // ---------------------------------------------------------------- loop
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  if (skipIntro) {
    R.x = 0.5; R.z = -0.3; R.yaw = 2.2;
    placeRover(0, true); attach(); V.setProps(0); updateCamera(0, true, 0);
  } else setupIntro();

  let propAngle = 0, propRate = skipIntro ? 0 : 1;
  function tick(dt) {
    clock += dt;
    let introK = 0;
    if (phase === 'intro') {
      introRover(clock, dt);
      placeRover(dt, false);
      if (!docked) fly(clock, dt);
      if (clock >= T.touch && !docked) attach();
      propRate = 1 - smooth(T.touch, T.spinDown, clock);
      introK = 1 - easeInOut(clamp((clock - 0.4) / (T.touch + 0.4), 0, 1));
      if (clock >= T.resume) { phase = 'wander'; R.pause = 0.8; opts.onDocked?.(); }
    } else if (!reduced) { wander(dt); placeRover(dt, false); }
    if (!reduced) { spinWheels(dt); dropTracks(); }
    propAngle += dt * 42 * propRate;
    V.setProps(propAngle);
    updateCamera(dt, false, introK);
    sun.position.copy(V.rover.position).addScaledVector(sunDir, 12);
    sun.target.position.copy(V.rover.position);
  }

  let paused = false, visible = true, last = performance.now(), running = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; last = performance.now(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (paused || document.hidden || !visible) { last = now; return; }
    const dt = clamp((now - last) / 1000, 0, 0.05);
    last = now;
    tick(dt);
    renderer.render(scene, camera);
  }
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  if (opts.debug) {
    running = false;
    window.__heroStep = (s) => { const n = Math.round(s * 60); for (let i = 0; i < n; i++) tick(1 / 60); renderer.render(scene, camera); return clock; };
  } else if (!reduced) requestAnimationFrame(frame);
  opts.onReady?.({ docked: skipIntro });
  return {
    setPaused(p) { paused = p; last = performance.now(); },
    stop() { running = false; renderer.dispose(); },
  };
}
