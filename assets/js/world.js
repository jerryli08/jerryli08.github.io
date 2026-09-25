// Mars world for jerryli.design. Shared by the landing background (fixed camera, the drone
// flies in and docks on every load, then the rover wanders) and /drive (rover only, driven
// with the keyboard or touch, chase camera).
//
// Everything visible is either Jerry's own CAD (assets/models, tessellated from his Fusion 360
// STEP exports, shapes unchanged) or real captured data:
//   ground   Poly Haven CC0 scans "gravelly_sand" and "red_sand"
//   rocks    Poly Haven CC0 photogrammetry "rock_09", "moon_rock_03", "namaqualand_boulder_05"
//   horizon  NASA/JPL-Caltech/ASU PIA24264, Perseverance Mastcam-Z 360 panorama, Jezero Crater
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/addons/libs/meshopt_decoder.module.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/addons/postprocessing/ShaderPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { GTAOPass } from '../vendor/addons/postprocessing/GTAOPass.js';

const asset = (p) => new URL(`../${p}`, import.meta.url).href;
const TAU = Math.PI * 2;
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

// ------------------------------------------------------------------ colour management
// The composer renders linear HDR and OutputPass applies ACES + sRGB. Photo pixels (the NASA
// horizon) and matched colours (fog, sky) are pushed through the exact inverse first, so they
// land on screen as the photo's own colours.
const EXPOSURE = 1.32;   // renderer exposure
const MATCH_EXPOSURE = 1.0; // photo colours are inverted at this exposure, so they brighten with the scene
const ACES_IN = new THREE.Matrix3().set(0.59719, 0.35458, 0.04823, 0.07600, 0.90834, 0.01566, 0.02840, 0.13383, 0.83777);
const ACES_OUT = new THREE.Matrix3().set(1.60475, -0.53108, -0.07367, -0.10208, 1.10813, -0.00605, -0.00327, -0.07276, 1.07602);
const ACES_IN_INV = ACES_IN.clone().invert();
const ACES_OUT_INV = ACES_OUT.clone().invert();
function invFit(y) {
  const a = 0.0245786, b = 0.000090537, c = 0.983729, d = 0.4329510, e = 0.238081;
  const A = y * c - 1, B = y * d - a, C = y * e + b;
  if (Math.abs(A) < 1e-6) return -C / B;
  const disc = Math.max(0, B * B - 4 * A * C);
  return (-B - Math.sqrt(disc)) / (2 * A);
}
function inverseACES(srgbHex) {
  const c = new THREE.Color(srgbHex); // converted to linear by three
  const v = new THREE.Vector3(c.r, c.g, c.b).applyMatrix3(ACES_OUT_INV);
  v.set(invFit(clamp(v.x, 0, 0.995)), invFit(clamp(v.y, 0, 0.995)), invFit(clamp(v.z, 0, 0.995))).applyMatrix3(ACES_IN_INV);
  v.multiplyScalar(0.6 / MATCH_EXPOSURE);
  return new THREE.Color(Math.max(0, v.x), Math.max(0, v.y), Math.max(0, v.z));
}
const GLSL_INV_ACES = /* glsl */`
  uniform mat3 uAcesOutInv; uniform mat3 uAcesInInv;
  float invFit(float y) {
    y = clamp(y, 0.0, 0.995);
    float A = y * 0.983729 - 1.0, B = y * 0.4329510 - 0.0245786, C = y * 0.238081 + 0.000090537;
    return (-B - sqrt(max(0.0, B * B - 4.0 * A * C))) / (2.0 * A);
  }
  vec3 inverseACES(vec3 lin) {
    vec3 v = uAcesOutInv * lin;
    v = vec3(invFit(v.x), invFit(v.y), invFit(v.z));
    return max(uAcesInInv * v * (0.6 / ${MATCH_EXPOSURE.toFixed(3)}), 0.0);
  }`;
const acesUniforms = () => ({ uAcesOutInv: { value: ACES_OUT_INV }, uAcesInInv: { value: ACES_IN_INV } });

// Colours sampled from the Mastcam-Z panorama
const SKY_LOW = '#b6966d', SKY_HIGH = '#8f6a50', ZENITH = '#5d4136', FAR_GROUND = '#553b28';

// ------------------------------------------------------------------ noise + terrain height
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
const CRATERS = [
  { x: 6.5, z: -9, r: 1.6, d: 0.22 }, { x: -9, z: -14, r: 3.2, d: 0.45 }, { x: 13, z: 5, r: 1.1, d: 0.14 },
  { x: -5, z: 9, r: 0.8, d: 0.1 }, { x: 22, z: -26, r: 6, d: 0.8 }, { x: -30, z: 18, r: 7.5, d: 0.9 }, { x: 3, z: -24, r: 2.4, d: 0.3 },
];
export function heightAt(x, z) {
  // gentle plains: long swells, low bumps and a few shallow craters, like the Jezero floor
  let h = fbm(x * 0.03 + 1.7, z * 0.03 - 4.2, 4) * 0.9;
  h += fbm(x * 0.22 + 7.3, z * 0.22 - 2.1, 3) * 0.07;
  h += fbm(x * 1.3, z * 1.3 + 3.3, 2) * 0.012;
  for (const c of CRATERS) {
    const dx = x - c.x, dz = z - c.z, d2 = (dx * dx + dz * dz) / (c.r * c.r);
    if (d2 < 2.6) { const d = Math.sqrt(d2); h += (d < 1 ? -(1 - d2) * c.d : 0) + Math.exp(-Math.pow((d - 1) * 3.4, 2)) * c.d * 0.32; }
  }
  return h;
}

// ------------------------------------------------------------------ textures
function tex(loader, file, srgb, repeat = true) {
  const t = loader.load(asset(`world/${file}`));
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}
function noiseTexture() {
  const s = 128, data = new Uint8Array(s * s * 4);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const i = (y * s + x) * 4;
    const f = (a, b, o) => { let v = 0, amp = 0.5, n = 0, fr = 1; for (let k = 0; k < o; k++) { v += amp * vnoise((x * fr) / a + k * 9.7 + b, (y * fr) / a - k * 3.1 + b); n += amp; amp *= 0.5; fr *= 2; } return v / n; };
    // tileable enough at this scale: the texture is sampled at very low frequency
    data[i] = clamp(128 + f(16, 0, 4) * 150, 0, 255);
    data[i + 1] = clamp(128 + f(24, 50, 3) * 150, 0, 255);
    data[i + 2] = clamp(128 + f(8, 90, 3) * 150, 0, 255);
    data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, s, s);
  t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// ------------------------------------------------------------------ terrain material
function terrainMaterial(T, msaa) {
  const m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, alphaToCoverage: msaa });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, {
      tA: { value: T.aDiff }, nA: { value: T.aNor }, rA: { value: T.aRough },
      tB: { value: T.bDiff }, nB: { value: T.bNor }, rB: { value: T.bRough }, tN: { value: T.noise }, uFade: { value: T.fade },
    });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        varying vec3 vWPos; varying vec3 vWNrm;
        uniform sampler2D tA, nA, rA, tB, nB, rB, tN; uniform vec2 uFade;
        vec2 rot(vec2 p, float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }
        float gMask; vec2 gUA, gUA2, gUB; float gFar;`)
      .replace('#include <map_fragment>', `
        vec2 wp = vWPos.xz;
        vec3 nz = texture2D(tN, wp / 23.0).rgb;
        gUA = wp / 1.15; gUA2 = rot(wp, 0.9) / 3.3; gUB = rot(wp, 2.1) / 1.9;
        gMask = smoothstep(0.42, 0.66, texture2D(tN, wp / 57.0 + 0.37).g + (nz.b - 0.5) * 0.25);
        gFar = smoothstep(6.0, 40.0, length(vWPos - cameraPosition));
        // Earth scans graded to the colour ratios of Jezero regolith measured from the
        // Mastcam-Z panorama (linear R:G:B = 1 : 0.45 : 0.20)
        vec3 cA = mix(texture2D(tA, gUA).rgb, texture2D(tA, gUA2).rgb, 0.38 + 0.3 * gFar) * vec3(1.0, 0.81, 0.77);
        vec3 cB = texture2D(tB, gUB).rgb * vec3(1.3, 1.25, 0.92);
        vec3 alb = mix(cA, cB, gMask * 0.8);
        alb *= (0.7 + 0.55 * nz.r) * 0.88;
        alb = mix(alb, alb * vec3(0.8, 0.86, 0.95), smoothstep(0.55, 0.8, nz.b));
        diffuseColor.rgb *= alb;`)
      .replace('#include <alphatest_fragment>', `
        // the ground dissolves into the real panorama beyond ~25 m
        float fadeD = length(vWPos.xz - cameraPosition.xz);
        diffuseColor.a = 1.0 - smoothstep(uFade.x, uFade.y, fadeD);
        #ifndef ALPHA_TO_COVERAGE
          float dith = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          if (diffuseColor.a < dith) discard;
        #endif`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness * mix(mix(texture2D(rA, gUA).r, 1.0, 0.25), texture2D(rB, gUB).r, gMask);`)
      .replace('#include <normal_fragment_maps>', `
        vec3 tnA = normalize(mix(texture2D(nA, gUA).xyz * 2.0 - 1.0, texture2D(nA, gUA2).xyz * 2.0 - 1.0, 0.35));
        vec3 tnB = texture2D(nB, gUB).xyz * 2.0 - 1.0;
        vec3 tn = normalize(mix(tnA, tnB, gMask));
        tn.xy *= mix(1.15, 0.45, gFar);
        vec3 N0 = normalize(vWNrm);
        vec3 Tw = normalize(vec3(1.0, 0.0, 0.0) - N0 * N0.x);
        vec3 Bw = normalize(cross(N0, Tw)) * -1.0;
        vec3 Nw = normalize(Tw * tn.x + Bw * tn.y + N0 * tn.z);
        normal = normalize((viewMatrix * vec4(Nw, 0.0)).xyz);`);
  };
  return m;
}

// ------------------------------------------------------------------ chunked terrain
const CHUNK = 8, HALF = 8; // 16 x 16 chunks of 8 m = 128 m square around the origin
function lodFor(d) { return d < 9 ? 128 : d < 20 ? 48 : d < 40 ? 16 : 6; }
const indexCache = new Map();
function chunkIndex(n) {
  if (indexCache.has(n)) return indexCache.get(n);
  const idx = [], row = n + 1, base = row * row;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  // skirts hide cracks between neighbours at different detail levels
  const edge = [];
  for (let i = 0; i <= n; i++) edge.push(i);
  for (let j = 1; j <= n; j++) edge.push(j * row + n);
  for (let i = n - 1; i >= 0; i--) edge.push(n * row + i);
  for (let j = n - 1; j >= 1; j--) edge.push(j * row);
  for (let k = 0; k < edge.length; k++) {
    const a = edge[k], b = edge[(k + 1) % edge.length], sa = base + k, sb = base + ((k + 1) % edge.length);
    idx.push(a, b, sa, b, sb, sa);
  }
  const res = { idx: new Uint32Array(idx), edge };
  indexCache.set(n, res);
  return res;
}
function buildChunkGeometry(cx, cz, n) {
  const x0 = cx * CHUNK, z0 = cz * CHUNK, s = CHUNK / n, row = n + 1;
  const hs = new Float32Array((n + 3) * (n + 3));
  for (let j = -1; j <= n + 1; j++) for (let i = -1; i <= n + 1; i++) hs[(j + 1) * (n + 3) + (i + 1)] = heightAt(x0 + i * s, z0 + j * s);
  const H = (i, j) => hs[(j + 1) * (n + 3) + (i + 1)];
  const { idx, edge } = chunkIndex(n);
  const count = row * row + edge.length;
  const pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3);
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const k = j * row + i;
    pos[k * 3] = x0 + i * s; pos[k * 3 + 1] = H(i, j); pos[k * 3 + 2] = z0 + j * s;
    const dx = (H(i + 1, j) - H(i - 1, j)) / (2 * s), dz = (H(i, j + 1) - H(i, j - 1)) / (2 * s);
    const l = Math.hypot(dx, 1, dz);
    nrm[k * 3] = -dx / l; nrm[k * 3 + 1] = 1 / l; nrm[k * 3 + 2] = -dz / l;
  }
  const drop = s * 2 + 0.05;
  for (let e = 0; e < edge.length; e++) {
    const src = edge[e], k = row * row + e;
    pos[k * 3] = pos[src * 3]; pos[k * 3 + 1] = pos[src * 3 + 1] - drop; pos[k * 3 + 2] = pos[src * 3 + 2];
    nrm[k * 3] = nrm[src * 3]; nrm[k * 3 + 1] = nrm[src * 3 + 1]; nrm[k * 3 + 2] = nrm[src * 3 + 2];
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}
class Terrain {
  constructor(material) {
    this.group = new THREE.Group();
    this.material = material;
    this.chunks = new Map();
    for (let cz = -HALF; cz < HALF; cz++) for (let cx = -HALF; cx < HALF; cx++) this.chunks.set(`${cx},${cz}`, { cx, cz, lod: 0, mesh: null });
    // coarse far ring out to the horizon, sunk slightly so the chunks win where they overlap
    const ringR = [];
    for (let r = 58; r < 900; r *= 1.07) ringR.push(r);
    const seg = 160, pos = [], idx = [];
    ringR.forEach((r) => { for (let j = 0; j < seg; j++) { const a = (j / seg) * TAU, x = Math.cos(a) * r, z = Math.sin(a) * r; pos.push(x, heightAt(x, z) * smooth(400, 120, r) - 0.12 - r * 0.0006, z); } });
    for (let i = 0; i < ringR.length - 1; i++) for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    this.far = new THREE.Mesh(g, material);
    this.far.receiveShadow = true;
    this.group.add(this.far);
  }
  // Rebuild chunks whose level of detail changed; limited work per call to avoid hitches.
  // focus: one or more {x, z} points; detail follows the nearest one.
  update(focus, budget = Infinity) {
    const want = [], pts = Array.isArray(focus) ? focus : [focus];
    for (const c of this.chunks.values()) {
      const cx = (c.cx + 0.5) * CHUNK, cz = (c.cz + 0.5) * CHUNK;
      let near = Infinity;
      for (const p of pts) near = Math.min(near, Math.hypot(cx - p.x, cz - p.z));
      const d = Math.max(0, near - CHUNK * 0.7);
      const lod = lodFor(d);
      if (lod !== c.lod) want.push({ c, lod, d });
    }
    want.sort((a, b) => a.d - b.d);
    let cost = 0;
    for (const { c, lod } of want) {
      if (cost > budget) break;
      const g = buildChunkGeometry(c.cx, c.cz, lod);
      if (c.mesh) { c.mesh.geometry.dispose(); c.mesh.geometry = g; }
      else { c.mesh = new THREE.Mesh(g, this.material); c.mesh.receiveShadow = true; this.group.add(c.mesh); }
      c.lod = lod; cost += lod * lod;
    }
    return want.length;
  }
}

// ------------------------------------------------------------------ sky, horizon photo, environment
function buildSky(sunDir) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      ...acesUniforms(), sunDir: { value: sunDir },
      cLow: { value: new THREE.Color(SKY_LOW) }, cHigh: { value: new THREE.Color(SKY_HIGH) }, cZen: { value: new THREE.Color(ZENITH) }, cGround: { value: new THREE.Color(FAR_GROUND) },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `${GLSL_INV_ACES}
      uniform vec3 sunDir, cLow, cHigh, cZen, cGround; varying vec3 vDir;
      void main() {
        float e = asin(clamp(vDir.y, -1.0, 1.0)) * 57.2958;
        vec3 c = mix(cLow, cHigh, smoothstep(8.0, 30.0, e));
        c = mix(c, cZen, smoothstep(30.0, 85.0, e));
        c = mix(c, cGround, smoothstep(0.0, -3.0, e));
        float s = max(dot(vDir, normalize(sunDir)), 0.0);
        c += vec3(1.0, 0.93, 0.8) * (pow(s, 8.0) * 0.12 + pow(s, 90.0) * 0.35) + vec3(1.0, 0.97, 0.92) * smoothstep(0.99985, 0.99995, s) * 1.2;
        gl_FragColor = vec4(inverseACES(min(c, vec3(0.99))), 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -10;
  return mesh;
}
// The Mastcam-Z band spans +8.2 deg (sky) to -2.3 deg (far ground) around the horizon.
const BAND_TOP = 8.2 * DEG, BAND_BOT = -2.3 * DEG;
function buildHorizon(bandTex, u0) {
  const R = 950, seg = 256;
  const g = new THREE.CylinderGeometry(R, R, 1, seg, 1, true);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const top = pos.getY(i) > 0;
    pos.setY(i, top ? R * Math.tan(BAND_TOP) : R * Math.tan(BAND_BOT));
    uv.setXY(i, uv.getX(i) + u0, top ? 1 : 0);
  }
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, transparent: true, depthWrite: false, fog: false,
    uniforms: { ...acesUniforms(), map: { value: bandTex } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
    fragmentShader: `${GLSL_INV_ACES}
      uniform sampler2D map; varying vec2 vUv;
      void main() {
        vec3 c = texture2D(map, vec2(1.0 - vUv.x, vUv.y)).rgb;
        float a = 1.0 - smoothstep(0.62, 0.96, vUv.y);
        gl_FragColor = vec4(inverseACES(c), a);
      }`,
  });
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false; mesh.renderOrder = -9;
  return mesh;
}
// Equirectangular environment: sky gradient, the real horizon band, regolith below.
function buildEnvironment(renderer, bandImage, u0, sunDir) {
  const W = 1024, H = 512, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const yOf = (deg) => (0.5 - deg / 180) * H;
  const sky = g.createLinearGradient(0, 0, 0, yOf(0));
  sky.addColorStop(0, ZENITH); sky.addColorStop(0.55, SKY_HIGH); sky.addColorStop(0.92, SKY_LOW); sky.addColorStop(1, SKY_LOW);
  g.fillStyle = sky; g.fillRect(0, 0, W, yOf(0));
  g.fillStyle = FAR_GROUND; g.fillRect(0, yOf(0), W, H);
  const ground = g.createLinearGradient(0, yOf(-3), 0, H);
  ground.addColorStop(0, FAR_GROUND); ground.addColorStop(1, '#3a261a');
  g.fillStyle = ground; g.fillRect(0, yOf(-3), W, H);
  if (bandImage) {
    const top = yOf(8.2), bot = yOf(-2.3), sx = Math.round(((u0 % 1) + 1) % 1 * bandImage.width);
    g.drawImage(bandImage, sx, 0, bandImage.width - sx, bandImage.height, 0, top, W * (1 - sx / bandImage.width), bot - top);
    g.drawImage(bandImage, 0, 0, sx, bandImage.height, W * (1 - sx / bandImage.width), top, W * (sx / bandImage.width), bot - top);
  }
  // sun
  const el = Math.asin(sunDir.y) / DEG;
  const sxp = (Math.atan2(sunDir.z, sunDir.x) / TAU + 0.5) * W, syp = yOf(el);
  const sun = g.createRadialGradient(sxp, syp, 0, sxp, syp, 60);
  sun.addColorStop(0, 'rgba(255,248,235,1)'); sun.addColorStop(0.08, 'rgba(255,236,205,0.9)'); sun.addColorStop(1, 'rgba(255,220,180,0)');
  g.fillStyle = sun; g.fillRect(sxp - 60, syp - 60, 120, 120);
  const t = new THREE.CanvasTexture(cv);
  t.mapping = THREE.EquirectangularReflectionMapping;
  t.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose(); t.dispose();
  return env;
}

// ------------------------------------------------------------------ rocks
function rockMaterial(src, tint, slab = false) {
  const m = src.clone();
  m.color = new THREE.Color(tint);
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWN;')
      .replace('#include <defaultnormal_vertex>', '#include <defaultnormal_vertex>\nvWN = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWN;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        // Martian dust settles on the upward faces of every rock
        float dust = smoothstep(0.35, 0.92, normalize(vWN).y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.3, 0.14, 0.065), dust * ${slab ? '0.25' : '0.5'});`);
  };
  m.customProgramCacheKey = () => `rock-${slab}`;
  return m;
}
function scatterRocks(rocksGltf, opts) {
  const { lowPower, keepOut, center, extent } = opts;
  const byName = {};
  for (const sc of rocksGltf.scenes) sc.traverse((o) => { if (o.isMesh) byName[o.name.replace(/_\d+$/, '')] = o; });
  const group = new THREE.Group();
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const placed = [];
  const kinds = [
    // name, lod, count, radius range (m), size range (m), tint, flatten
    ['rock_09', 'lo', lowPower ? 1400 : 3200, [0.15, 7], [0.006, 0.03], '#6f5c52', 1],
    ['moon_rock_03', 'lo', lowPower ? 700 : 1600, [0.15, 7], [0.006, 0.028], '#5c4a40', 1],
    ['rock_09', 'lo', lowPower ? 500 : 1100, [7, 16], [0.01, 0.04], '#6f5c52', 1],
    ['moon_rock_03', 'mid', 120, [0.9, 12], [0.12, 0.55], '#c2a286', 0.2],   // pale, flat bedrock slabs
    ['rock_09', 'mid', 140, [1.2, extent], [0.05, 0.28], '#9c8272', 1],
    ['moon_rock_03', 'mid', 110, [1.2, extent], [0.05, 0.26], '#6a5448', 1],
    ['namaqualand_boulder_05', 'mid', 26, [12, 30], [0.3, 1.2], '#8a6a58', 1],
    ['rock_09', 'hi', 16, [7, 28], [0.4, 1.1], '#9c8272', 1],
  ];
  for (const [name, lod, count, [r0, r1], [s0, s1], tint, flat] of kinds) {
    const srcMesh = byName[`${name}_${lod}`];
    if (!srcMesh) continue;
    const mat = rockMaterial(srcMesh.material, tint, flat < 1);
    const inst = new THREE.InstancedMesh(srcMesh.geometry, mat, count);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
    const bbox = srcMesh.geometry.boundingBox || (srcMesh.geometry.computeBoundingBox(), srcMesh.geometry.boundingBox);
    const size = bbox.getSize(new THREE.Vector3()), baseR = Math.max(size.x, size.z) / 2;
    let n = 0;
    for (let k = 0; k < count * 3 && n < count; k++) {
      const a = rnd() * TAU, rr = Math.sqrt(lerp(r0 * r0, r1 * r1, rnd()));
      const x = center.x + Math.cos(a) * rr, z = center.z + Math.sin(a) * rr;
      const sc = lerp(s0, s1, Math.pow(rnd(), 2.3)) / Math.max(size.x, size.y, size.z);
      const worldR = baseR * sc;
      if (keepOut(x, z, worldR)) continue;
      p.set(x, heightAt(x, z) - bbox.min.y * sc * flat - size.y * sc * flat * (flat < 1 ? 0.5 : 0.28), z);
      e.set((rnd() - 0.5) * 0.5 * flat, rnd() * TAU, (rnd() - 0.5) * 0.5 * flat); q.setFromEuler(e);
      s.set(sc * lerp(0.85, 1.2, rnd()), sc * lerp(0.7, 1.1, rnd()) * flat, sc * lerp(0.85, 1.2, rnd()));
      inst.setMatrixAt(n, m4.compose(p, q, s));
      inst.setColorAt(n, col.setScalar(lerp(0.75, 1.1, rnd())));
      if (worldR > 0.05) placed.push({ x, z, r: worldR * 0.9 });
      n++;
    }
    inst.count = n;
    inst.castShadow = lod !== 'lo'; inst.receiveShadow = true;
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    group.add(inst);
  }
  return { group, obstacles: placed };
}

// ------------------------------------------------------------------ CAD: materials + rig
function pbr(mat, mesh) {
  const c = mat.color.clone();
  const hsl = {}; c.getHSL(hsl, THREE.SRGBColorSpace);
  const isCarbon = mat.name === 'carbon' || mat.userData?.carbon;
  let m;
  if (isCarbon) {
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.09 });
  } else if (/^anim_rover_/.test(mesh.name)) {
    m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0 }); // rubber / TPU wheels
  } else if (hsl.s < 0.1 && hsl.l > 0.28 && hsl.l < 0.82) {
    m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.34, metalness: 0.9 }); // aluminium, steel
  } else if (hsl.h > 0.08 && hsl.h < 0.16 && hsl.s > 0.5 && hsl.l > 0.45) {
    m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.25, metalness: 1 }); // gold contacts
  } else if (hsl.h > 0.25 && hsl.h < 0.5 && hsl.s > 0.3) {
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2 }); // PCB soldermask
  } else if (hsl.l < 0.12) {
    m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0 }); // black printed parts, nylon
  } else if ((hsl.h < 0.04 || hsl.h > 0.96) && hsl.s > 0.6) {
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.42, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.5, sheen: 0.25, sheenRoughness: 0.6, sheenColor: c }); // red PLA
  } else {
    m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0 }); // other plastics
  }
  m.side = mat.side;
  return m;
}
function prepCAD(root) {
  const cache = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = true;
    const key = o.material.uuid + (/^anim_rover_/.test(o.name) ? 'w' : '');
    if (!cache.has(key)) cache.set(key, pbr(o.material, o));
    o.material = cache.get(key);
  });
}
function pivotize(mesh) {
  const parent = mesh.parent;
  mesh.updateWorldMatrix(true, false);
  const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
  const pivot = new THREE.Group();
  parent.add(pivot); parent.updateWorldMatrix(true, false);
  pivot.position.copy(parent.worldToLocal(c.clone())); pivot.updateWorldMatrix(true, false);
  pivot.attach(mesh);
  return pivot;
}
function rigVehicles(droneGltf, roverGltf) {
  const roverRoot = roverGltf.scene, droneRoot = droneGltf?.scene;
  prepCAD(roverRoot); if (droneRoot) prepCAD(droneRoot);
  roverRoot.updateMatrixWorld(true); droneRoot?.updateMatrixWorld(true);
  const wheels = [], props = [];
  roverRoot.traverse((o) => { if (o.isMesh && /^anim_rover_/.test(o.name)) wheels.push(o); });
  droneRoot?.traverse((o) => { if (o.isMesh && /^anim_drone_/.test(o.name)) props.push(o); });
  const centers = wheels.map((w) => new THREE.Box3().setFromObject(w).getCenter(new THREE.Vector3()));
  const wsize = new THREE.Box3().setFromObject(wheels[0]).getSize(new THREE.Vector3());
  const mid = centers.reduce((a, c) => a.add(c), new THREE.Vector3()).multiplyScalar(1 / centers.length);
  const wheelRadius = Math.max(wsize.x, wsize.y) / 2;
  const xs = centers.map((c) => c.x), zs = centers.map((c) => c.z);
  const wheelbase = Math.max(...xs) - Math.min(...xs), track = Math.max(...zs) - Math.min(...zs);
  // CAD front (latch mount, AprilTag end) is -X; rotate so the vehicle faces +Z
  const toFrame = new THREE.Matrix4().makeRotationY(Math.PI / 2).multiply(new THREE.Matrix4().makeTranslation(-mid.x, -(mid.y - wheelRadius), -mid.z));
  const wrap = (root) => { const g = new THREE.Group(), inner = new THREE.Group(); inner.matrixAutoUpdate = false; inner.matrix.copy(toFrame); g.add(inner); inner.add(root); g.updateMatrixWorld(true); return g; };
  const rover = wrap(roverRoot), drone = droneRoot ? wrap(droneRoot) : null;
  const wheelPivots = wheels.map((w, i) => { const p = pivotize(w); p.userData.left = centers[i].z > mid.z; /* CAD +Z ends up on the vehicle's left */ return p; });
  const propPivots = props.map((p, i) => { const pv = pivotize(p); pv.userData.dir = i % 2 ? 1 : -1; return pv; });
  return {
    rover, drone, wheelRadius, wheelbase, track,
    setWheels(aL, aR) { for (const p of wheelPivots) p.rotation.z = p.userData.left ? aL : aR; },
    setProps(a) { for (const p of propPivots) p.rotation.y = a * p.userData.dir; },
  };
}

// ------------------------------------------------------------------ tracks + dust
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
    this.mesh = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 1;
  }
  push(x, z, dx, dz, t) {
    const l = Math.hypot(dx, dz) || 1;
    this.pts.push([x, z, -dz / l, dx / l, t, heightAt(x, z) + 0.0025, this.gap ? 0 : 1]);
    this.gap = false;
    if (this.pts.length > this.n) this.pts.shift();
  }
  // the vehicle left the ground: end the strip here so it does not stretch to the landing spot
  lift() {
    const p = this.pts[this.pts.length - 1];
    if (p) { this.pts.push([...p.slice(0, 6), 0]); if (this.pts.length > this.n) this.pts.shift(); }
    this.gap = true;
  }
  update(now, life) {
    const P = this.pts, len = P.length, hw = this.w / 2;
    for (let i = 0; i < len; i++) {
      const [px, pz, sx, sz, t, y, vis] = P[i], o = i * 6, c = i * 8;
      this.pos[o] = px + sx * hw; this.pos[o + 1] = y; this.pos[o + 2] = pz + sz * hw;
      this.pos[o + 3] = px - sx * hw; this.pos[o + 4] = y; this.pos[o + 5] = pz - sz * hw;
      const a = 0.33 * vis * (1 - smooth(life * 0.5, life, now - t)) * (len - 1 - i < 2 ? 0 : 1);
      for (let s = 0; s < 2; s++) { this.col[c + s * 4] = 0.11; this.col[c + s * 4 + 1] = 0.05; this.col[c + s * 4 + 2] = 0.03; this.col[c + s * 4 + 3] = a; }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.color.needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (len - 1) * 6));
  }
}
function dustSprite() {
  const s = 64, cv = document.createElement('canvas'); cv.width = cv.height = s;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(cv);
}
class Dust {
  constructor(n = 220) {
    this.n = n; this.i = 0;
    this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.age = new Float32Array(n).fill(99); this.life = new Float32Array(n).fill(1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAge', new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage));
    this.points = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { map: { value: dustSprite() }, color: { value: new THREE.Color('#c08a62') }, scale: { value: 600 } },
      vertexShader: 'attribute float aAge; varying float vA; uniform float scale; void main(){ vA = aAge; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = scale * (0.02 + 0.09 * aAge) / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; uniform vec3 color; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a * (1.0 - vA) * 0.22 * step(vA, 0.999); gl_FragColor = vec4(color * 0.5, a); }',
    }));
    this.points.frustumCulled = false;
  }
  emit(x, y, z, vx, vz) {
    const i = this.i; this.i = (this.i + 1) % this.n;
    this.p[i * 3] = x; this.p[i * 3 + 1] = y; this.p[i * 3 + 2] = z;
    this.v[i * 3] = vx + (Math.random() - 0.5) * 0.08; this.v[i * 3 + 1] = 0.04 + Math.random() * 0.06; this.v[i * 3 + 2] = vz + (Math.random() - 0.5) * 0.08;
    this.age[i] = 0; this.life[i] = 1.2 + Math.random() * 1.2;
  }
  update(dt) {
    const ages = this.points.geometry.attributes.aAge.array;
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) { ages[i] = 1; continue; }
      this.age[i] += dt;
      const k = i * 3;
      this.v[k] *= 0.96; this.v[k + 2] *= 0.96; this.v[k + 1] *= 0.98;
      this.p[k] += (this.v[k] + 0.03) * dt; this.p[k + 1] += this.v[k + 1] * dt; this.p[k + 2] += this.v[k + 2] * dt;
      ages[i] = Math.min(1, this.age[i] / this.life[i]);
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aAge.needsUpdate = true;
  }
}

// ------------------------------------------------------------------ film finish
const FinishShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, grain: { value: 0.035 }, vignette: { value: 0.28 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time, grain, vignette; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5; c.rgb *= 1.0 - vignette * smoothstep(0.35, 0.85, length(d * vec2(1.0, 0.8)));
      c.rgb += (h(vUv * 1000.0 + fract(time * 13.0)) - 0.5) * grain;
      gl_FragColor = c;
    }`,
};

// ================================================================== main
export async function initWorld(canvas, opts = {}) {
  const mode = opts.mode === 'drive' ? 'drive' : 'landing';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ---------------------------------------------------------------- load
  const tl = new THREE.TextureLoader();
  const T = {
    aDiff: tex(tl, 'gravelly_sand_diff.webp', true), aNor: tex(tl, 'gravelly_sand_nor_gl.webp', false), aRough: tex(tl, 'gravelly_sand_rough.webp', false),
    bDiff: tex(tl, 'red_sand_diff.webp', true), bNor: tex(tl, 'red_sand_nor_gl.webp', false), bRough: tex(tl, 'red_sand_rough.webp', false),
    noise: noiseTexture(), fade: mode === 'drive' ? new THREE.Vector2(55, 95) : new THREE.Vector2(30, 60),
  };
  const gl = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const band = await new Promise((res, rej) => tl.load(asset('world/horizon.webp'), res, undefined, rej));
  band.colorSpace = THREE.SRGBColorSpace; band.wrapS = THREE.RepeatWrapping; band.anisotropy = 8;
  const [droneGltf, roverGltf, rocksGltf] = await Promise.all([
    mode === 'landing' ? gl.loadAsync(asset('models/drone.glb')) : Promise.resolve(null),
    gl.loadAsync(asset('models/rover.glb')),
    gl.loadAsync(asset('world/rocks.glb')),
  ]);
  const V = rigVehicles(droneGltf, roverGltf);

  // ---------------------------------------------------------------- scene
  const scene = new THREE.Scene();
  const sunDir = new THREE.Vector3(-0.55, 0.62, -0.56).normalize();
  const U0 = 0.2; // which part of the 360 degree panorama sits behind the camera's view
  scene.environment = buildEnvironment(renderer, band.image, U0, sunDir);
  scene.environmentIntensity = 0.95;
  scene.fog = new THREE.FogExp2(inverseACES(FAR_GROUND), 0.026);
  const sky = buildSky(sunDir);
  const horizon = buildHorizon(band, U0);
  scene.add(sky, horizon);

  const sun = new THREE.DirectionalLight('#ffe4c4', 3.0);
  sun.castShadow = true;
  const smap = lowPower ? 1024 : 4096;
  sun.shadow.mapSize.set(smap, smap);
  Object.assign(sun.shadow.camera, { left: -2.4, right: 2.4, top: 2.4, bottom: -2.4, near: 1, far: 40 });
  sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.012; sun.shadow.radius = 3;
  scene.add(sun, sun.target);

  const terrain = new Terrain(terrainMaterial(T, !lowPower));
  scene.add(terrain.group);

  // ---------------------------------------------------------------- layout of the landing shot
  // The vehicle docks at START. After the fly-in the camera holds a high bird's-eye view over
  // LOOK; CAMDIR sets which way that view faces and where the drone comes in from.
  const START = { x: 0.12, z: 0.05 };
  const LOOK = new THREE.Vector3(0, heightAt(0, 0) + 0.1, 0);
  const CAMDIR = new THREE.Vector3(0.5, 0, 2.6).normalize();
  const keepOutLanding = (x, z, r) => Math.hypot(x - START.x, z - START.z) < 0.75 + r && r > 0.02; // a clear pad to land on
  const ARENA = 50;
  const keepOutDrive = (x, z, r) => Math.hypot(x, z) < 1.2 + r && r > 0.012;
  const rocks = scatterRocks(rocksGltf, { lowPower, center: mode === 'landing' ? { x: 0.25, z: 0.8 } : { x: 0, z: 0 }, extent: mode === 'landing' ? 30 : ARENA, keepOut: mode === 'landing' ? keepOutLanding : keepOutDrive });
  scene.add(rocks.group);

  const tracksL = new Tracks(2400, 0.034), tracksR = new Tracks(2400, 0.034);
  scene.add(tracksL.mesh, tracksR.mesh);
  const dust = new Dust(lowPower ? 120 : 260);
  scene.add(dust.points);
  scene.add(V.rover);
  if (V.drone) scene.add(V.drone);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.03, 2000);

  // ---------------------------------------------------------------- post-processing
  const target = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: lowPower ? 0 : 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!lowPower) {
    gtao = new GTAOPass(scene, camera, 2, 2);
    gtao.output = GTAOPass.OUTPUT.Default;
    gtao.blendIntensity = 0.9;
    gtao.updateGtaoMaterial({ radius: 0.12, distanceExponent: 2, thickness: 1.5, scale: 1, samples: 12, distanceFallOff: 1, screenSpaceRadius: false });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  composer.addPass(new OutputPass());
  const finish = new ShaderPass(FinishShader);
  composer.addPass(finish);

  // ---------------------------------------------------------------- vehicle state
  const R = { x: 0, z: 0, yaw: 0, v: 0, w: 0, pitch: 0, roll: 0, y: 0, wL: 0, wR: 0, goal: null, pause: 0, last: null, best: 0, bestAt: 0 };
  const AIR = { on: false, spin: 0, vx: 0, vy: 0, vz: 0 }; // the drone carrying the rover
  function placeRover(dt, snap) {
    const fx = Math.sin(R.yaw), fz = Math.cos(R.yaw), rx = fz, rz = -fx, L = V.wheelbase / 2, W = V.track / 2;
    const h = (a, b) => heightAt(R.x + fx * a + rx * b, R.z + fz * a + rz * b);
    const fl = h(L, -W), fr = h(L, W), bl = h(-L, -W), br = h(-L, W);
    const y = (fl + fr + bl + br) / 4, pitch = Math.atan2((bl + br - fl - fr) / 2, V.wheelbase), roll = Math.atan2((fr + br - fl - bl) / 2, V.track);
    if (snap) { R.y = y; R.pitch = pitch; R.roll = roll; } else { R.y = damp(R.y, y, 20, dt); R.pitch = damp(R.pitch, pitch, 12, dt); R.roll = damp(R.roll, roll, 12, dt); }
    V.rover.position.set(R.x, R.y, R.z);
    V.rover.rotation.set(0, 0, 0); V.rover.rotateY(R.yaw); V.rover.rotateX(R.pitch); V.rover.rotateZ(R.roll);
  }
  let clock = 0;
  function spinWheelsTracksDust(dt) {
    const half = V.track / 2;
    // positive yaw rate turns left, so the left side rolls slower
    R.wL += ((R.v - R.w * half) / V.wheelRadius) * dt; R.wR += ((R.v + R.w * half) / V.wheelRadius) * dt;
    V.setWheels(R.wL, R.wR);
    const fx = Math.sin(R.yaw), fz = Math.cos(R.yaw), rx = fz, rz = -fx, W = V.track / 2;
    if (AIR.on) return;
    if (!R.last) R.last = { x: R.x, z: R.z };
    const dx = R.x - R.last.x, dz = R.z - R.last.z;
    if (Math.hypot(dx, dz) > 0.02) {
      tracksL.push(R.x - rx * W, R.z - rz * W, dx, dz, clock); tracksR.push(R.x + rx * W, R.z + rz * W, dx, dz, clock);
      R.last = { x: R.x, z: R.z };
    }
    const speed = Math.abs(R.v) + Math.abs(R.w) * half;
    if (speed > 0.03 && Math.random() < speed * (mode === 'drive' ? 2.2 : 1.6)) {
      const side = Math.random() < 0.5 ? -1 : 1, back = -Math.sign(R.v || 1) * V.wheelbase * 0.5;
      const ex = R.x + fx * back + rx * W * side, ez = R.z + fz * back + rz * W * side;
      dust.emit(ex, heightAt(ex, ez) + 0.01, ez, -fx * R.v * 0.3, -fz * R.v * 0.3);
    }
  }

  // ---------------------------------------------------------------- landing: fly-in, then follow the cursor
  // Seconds from the moment the 3D goes live. The drone cruises in, hovers, settles onto the
  // rover; the camera rides with it and then pulls out to a bird's-eye view.
  const T0 = { hoverAt: 2.17, descend: 2.48, touch: 3.29, spinDown: 4.4, resume: 3.75, cam0: 2.75, cam1: 4.75 };
  const HOVER = 0.34;
  let phase = mode === 'landing' ? (reduced ? 'live' : 'intro') : 'drive';
  let docked = mode !== 'landing' || reduced;
  let propAngle = 0, propRate = docked ? 0 : 1;
  const up = new THREE.Vector3(0, 1, 0);
  const P = new THREE.Vector3(), prevP = new THREE.Vector3(), curV = new THREE.Vector3(), velS = new THREE.Vector3(), accS = new THREE.Vector3(), tmp = new THREE.Vector3(), tilt = new THREE.Vector3(), hit = new THREE.Vector3();
  const tQ = new THREE.Quaternion(), yQ = new THREE.Quaternion(), dockQ = new THREE.Quaternion(), dockP = new THREE.Vector3(), hoverP = new THREE.Vector3();
  const path = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), yaw0: 0 };
  let seed = (Date.now() % 100000) + 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // The rover drives to wherever the cursor points on the ground (a tap does the same on touch
  // screens). If the spot is too far to drive, the drone lifts the rover, flies it over and
  // lands. With no cursor around for a while it picks its own spots in view.
  const FLY_DIST = 1.8, DRIVE_V = 0.85, WANDER_V = 0.3;
  const pointer = { x: 0, y: 0, at: -1e9, fresh: false };
  function setPointer(e) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    pointer.x = (e.clientX - r.left) / r.width; pointer.y = (e.clientY - r.top) / r.height;
    pointer.at = clock; pointer.fresh = true;
  }
  if (mode === 'landing' && !reduced) {
    addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') setPointer(e); }, { passive: true });
    addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !e.target.closest?.('a,button,input,label,summary')) setPointer(e); }, { passive: true });
  }
  function setGoal(x, z, src) {
    // never aim into a rock
    for (const o of rocks.obstacles) {
      const dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz), min = o.r + 0.18;
      if (d < min) { const k = d > 1e-4 ? min / d : 0; x = o.x + (d > 1e-4 ? dx * k : min); z = o.z + dz * k; }
    }
    const dist = Math.hypot(x - R.x, z - R.z);
    if (dist < 0.08 && !AIR.on) return;
    R.goal = { x, z, src }; R.pause = 0; R.best = dist; R.bestAt = clock;
    if (!AIR.on && dist > FLY_DIST) takeoff();
  }
  function pickWander() {
    const A = frame.wide ? [0.52, 0.94, 0.47, 0.86] : [0.12, 0.88, 0.3, 0.44]; // clear of the text and the project card
    const hopper = rnd() < 0.25; // now and then it flies instead of driving
    for (let i = 0; i < 24; i++) {
      const g = groundAt(lerp(A[0], A[1], rnd()), lerp(A[2], A[3], rnd()), hit);
      if (!g) continue;
      const d = Math.hypot(g.x - R.x, g.z - R.z);
      if (hopper ? d > FLY_DIST + 0.3 : d > 0.5 && d < FLY_DIST - 0.2) { setGoal(g.x, g.z, 'wander'); return; }
    }
    R.pause = 1;
  }
  function takeoff() { AIR.on = true; AIR.spin = 0.56; AIR.vx = AIR.vy = AIR.vz = 0; R.v = R.w = 0; tracksL.lift(); tracksR.lift(); }
  function land() {
    AIR.on = false; R.pitch = 0; R.roll = 0; R.last = null; R.v = R.w = 0;
    R.goal = null; R.pause = 0.5;
  }
  function downwash(p) {
    const agl = p.y - heightAt(p.x, p.z);
    if (agl < 0.9 && Math.random() < (0.9 - agl) * 2.5) {
      const a = rnd() * TAU, r = 0.12 + rnd() * 0.25;
      dust.emit(p.x + Math.cos(a) * r, heightAt(p.x, p.z) + 0.01, p.z + Math.sin(a) * r, Math.cos(a) * 0.35, Math.sin(a) * 0.35);
    }
  }
  function driveTo(dt) {
    if (R.pause > 0 || !R.goal) { R.pause -= dt; R.v = damp(R.v, 0, 4, dt); R.w = damp(R.w, 0, 4, dt); }
    else {
      const dx = R.goal.x - R.x, dz = R.goal.z - R.z, dist = Math.hypot(dx, dz);
      const vmax = R.goal.src === 'wander' ? WANDER_V : DRIVE_V;
      if (dist < 0.1) { const w = R.goal.src === 'wander'; R.goal = null; R.pause = w ? 1.2 + rnd() * 3 : 0; }
      else {
        const err = wrapAngle(Math.atan2(dx, dz) - R.yaw);
        R.w = damp(R.w, clamp(err * 2.2, -1.6, 1.6), 5, dt);
        // skid-steer: turn in place first when the goal is off to the side or behind
        R.v = damp(R.v, vmax * clamp(1 - Math.abs(err) / 1.1, 0, 1) * smooth(0.05, 0.5, dist), 3, dt);
        // wedged against a rock: hop over instead
        if (dist < R.best - 0.05) { R.best = dist; R.bestAt = clock; }
        else if (clock - R.bestAt > 2.5 && dist > 0.25) takeoff();
      }
    }
    R.yaw += R.w * dt;
    let nx = R.x + Math.sin(R.yaw) * R.v * dt, nz = R.z + Math.cos(R.yaw) * R.v * dt;
    for (const o of rocks.obstacles) {
      const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz), min = o.r + 0.16;
      if (d < min && d > 1e-4) { nx = o.x + (dx / d) * min; nz = o.z + (dz / d) * min; R.v *= 0.9; }
    }
    R.x = nx; R.z = nz;
  }
  function flyTo(dt) {
    if (AIR.spin > 0) { AIR.spin -= dt; return; } // props spin up before it lifts
    const g = R.goal || R, dx = g.x - R.x, dz = g.z - R.z, dist = Math.hypot(dx, dz);
    const agl = R.y - heightAt(R.x, R.z);
    // horizontal: head for the goal once clear of the ground, speed and acceleration capped
    const liftK = smooth(0.1, 0.4, agl);
    let wx = dx * 1.76, wz = dz * 1.76;
    const wm = Math.hypot(wx, wz); if (wm > 2.4) { wx *= 2.4 / wm; wz *= 2.4 / wm; }
    let ax = (wx * liftK - AIR.vx) * 3.2, az = (wz * liftK - AIR.vz) * 3.2;
    const am = Math.hypot(ax, az); if (am > 3.84) { ax *= 3.84 / am; az *= 3.84 / am; }
    AIR.vx += ax * dt; AIR.vz += az * dt;
    // vertical: climb to a cruise height that grows with the hop, then settle down gently
    const landing = dist < 0.3 && Math.hypot(AIR.vx, AIR.vz) < 0.32;
    const cruise = clamp(0.5 + dist * 0.3, 0.7, 1.5);
    const vyWant = landing ? -clamp(agl * 1.76, 0.1, 0.8) : clamp((cruise - agl) * 2.0, -0.8, 1.12);
    AIR.vy += clamp((vyWant - AIR.vy) * 4.8, -5.1, 5.1) * dt;
    R.x += AIR.vx * dt; R.z += AIR.vz * dt; R.y += AIR.vy * dt;
    const floor = heightAt(R.x, R.z);
    if (R.y <= floor) { R.y = floor; if (landing) { land(); return; } AIR.vy = Math.max(0, AIR.vy); }
    const sp = Math.hypot(AIR.vx, AIR.vz);
    if (sp > 0.25) R.yaw += clamp(wrapAngle(Math.atan2(AIR.vx, AIR.vz) - R.yaw) * 2.4, -1.9, 1.9) * dt;
    // lean into the acceleration and against drag, like any quad
    tilt.set(ax * 0.25 + AIR.vx * 0.3, 9.81, az * 0.25 + AIR.vz * 0.3).normalize();
    tQ.setFromUnitVectors(up, tilt); yQ.setFromAxisAngle(up, R.yaw); tQ.multiply(yQ);
    V.rover.position.set(R.x, R.y, R.z);
    V.rover.quaternion.slerp(tQ, 1 - Math.exp(-6.4 * dt));
    downwash(V.rover.position);
  }
  function live(dt) {
    if (pointer.fresh) {
      pointer.fresh = false;
      const g = groundAt(clamp(pointer.x, 0.04, 0.96), clamp(pointer.y, 0.12, 0.94), hit);
      if (g) setGoal(g.x, g.z, 'user');
    }
    if (!R.goal && !AIR.on && R.pause <= 0 && clock - pointer.at > 8) pickWander();
    if (AIR.on) flyTo(dt);
    else { driveTo(dt); placeRover(dt, false); }
    propRate = damp(propRate, AIR.on ? 1 : 0, AIR.on ? 6 : 1.2, dt);
  }
  function bez(a, b, c, d, t, out) { const u = 1 - t; return out.set(0, 0, 0).addScaledVector(a, u * u * u).addScaledVector(b, 3 * u * u * t).addScaledVector(c, 3 * u * t * t).addScaledVector(d, t * t * t); }
  function attach() {
    V.rover.add(V.drone); V.drone.position.set(0, 0, 0); V.drone.quaternion.identity(); docked = true;
  }
  function dockPoints() {
    V.rover.updateMatrixWorld(true);
    dockP.setFromMatrixPosition(V.rover.matrixWorld); V.rover.getWorldQuaternion(dockQ);
    hoverP.copy(up).applyQuaternion(dockQ).multiplyScalar(HOVER).add(dockP);
  }
  // Cruise curve: leaves at speed (no standing start), slows into the hover.
  function flightPos(t, out) {
    const u = clamp(t / T0.hoverAt, -0.05, 1), k = 1.2 * u + 0.6 * u * u - 0.8 * u * u * u;
    return bez(path.a, path.b, path.c, hoverP, k, out);
  }
  function fly(t, dt) {
    dockPoints();
    if (t < T0.hoverAt) flightPos(t, P);
    else if (t < T0.descend) {
      const k = (t - T0.hoverAt) / (T0.descend - T0.hoverAt);
      P.copy(hoverP).add(tmp.set(Math.sin(k * 9) * 0.008 * (1 - k), Math.sin(k * 6) * 0.005, Math.cos(k * 7) * 0.008 * (1 - k)));
    } else P.lerpVectors(hoverP, dockP, easeOut(clamp((t - T0.descend) / (T0.touch - T0.descend), 0, 1)));
    V.drone.position.copy(P);
    if (dt > 0) {
      curV.subVectors(P, prevP).divideScalar(dt);
      tmp.subVectors(curV, velS).divideScalar(dt).clampLength(0, 6);
      accS.lerp(tmp, 1 - Math.exp(-6 * dt));
      velS.lerp(curV, 1 - Math.exp(-12 * dt));
    }
    prevP.copy(P);
    // a quad leans into its acceleration and, while cruising, forward against drag
    const settle = t < T0.descend ? 1 : 1 - smooth(T0.descend, T0.descend + 0.62, t);
    tilt.copy(accS).multiplyScalar(0.4).addScaledVector(velS, 0.8).setY(0).multiplyScalar(settle).add(tmp.set(0, 9.81, 0)).normalize();
    tQ.setFromUnitVectors(up, tilt);
    const yaw = path.yaw0 + wrapAngle(R.yaw - path.yaw0) * smooth(T0.hoverAt * 0.35, T0.hoverAt, t);
    yQ.setFromAxisAngle(up, yaw); tQ.multiply(yQ);
    if (t >= T0.descend) tQ.slerp(dockQ, smooth(T0.descend, T0.descend + 0.75, t));
    V.drone.quaternion.slerp(tQ, 1 - Math.exp(-8 * dt));
    if (t >= T0.descend + 0.75) V.drone.quaternion.copy(dockQ);
    downwash(P); // rotor downwash kicks up dust as the drone comes down over the ground
  }

  // ---------------------------------------------------------------- camera
  // The projection is shifted so the subject sits right of centre, clear of the page text.
  const frame = { fx: 0.5, fy: 0.5, wide: true };
  const camFinal = new THREE.Vector3(), fin = { az: 0, el: 0, dist: 1 }, finalCam = new THREE.PerspectiveCamera();
  const shadowBox = { c: new THREE.Vector3(), half: 5 };
  const chaseCam = { on: false, look: new THREE.Vector3(), vel: new THREE.Vector3(), L: new THREE.Vector3(), c: new THREE.Vector3(), prev: new THREE.Vector3(), tv: new THREE.Vector3(), aim: new THREE.Vector3() };
  // ride-along: starts high above the drone, eases down to a still-high 40 degrees for the
  // landing while swinging around it, and never closes in below ~2.6 m
  const RIDE = { el0: 58 * DEG, el1: 40 * DEG, az0: -0.9, az1: 0.25, d0: 4.0, d1: 2.7 };
  // final bird's-eye view over LOOK
  const BIRD = { wide: { el: 50 * DEG, dist: 8.5 }, narrow: { el: 55 * DEG, dist: 7 } };
  function layoutCamera() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    if (mode === 'landing') {
      const wide = w >= 960;
      frame.wide = wide;
      frame.fx = wide ? 0.73 : 0.52; frame.fy = wide ? 0.65 : 0.36;
      const F = wide ? 30 : 44; // visible vertical field of view
      const W2 = frame.fx >= 0.5 ? 2 * frame.fx * w : 2 * (1 - frame.fx) * w;
      const H2 = frame.fy >= 0.5 ? 2 * frame.fy * h : 2 * (1 - frame.fy) * h;
      const ox = frame.fx >= 0.5 ? 0 : W2 - w, oy = frame.fy >= 0.5 ? 0 : H2 - h;
      camera.fov = 2 * Math.atan(Math.tan((F * DEG) / 2) * (H2 / h)) / DEG;
      camera.aspect = W2 / H2;
      camera.setViewOffset(W2, H2, ox, oy, w, h);
      const B = wide ? BIRD.wide : BIRD.narrow;
      fin.az = Math.atan2(CAMDIR.x, CAMDIR.z); fin.el = B.el; fin.dist = B.dist;
      camFinal.set(LOOK.x + Math.sin(fin.az) * Math.cos(fin.el) * fin.dist, LOOK.y + Math.sin(fin.el) * fin.dist, LOOK.z + Math.cos(fin.az) * Math.cos(fin.el) * fin.dist);
    }
    camera.updateProjectionMatrix();
    if (mode === 'landing') {
      // a copy of the final view, for turning screen points into ground points
      finalCam.copy(camera); finalCam.position.copy(camFinal); finalCam.lookAt(LOOK); finalCam.updateMatrixWorld(true);
      if (!chaseCam.on) { camera.position.copy(camFinal); camera.lookAt(LOOK); }
      // one fixed shadow box over everything in view, so rock shadows never pop as the rover moves
      const pts = [[0, 0.08], [1, 0.08], [0, 1], [1, 1]].map(([x, y]) => groundAt(x, y, new THREE.Vector3())).filter(Boolean);
      if (pts.length) {
        shadowBox.c.set(0, 0, 0); pts.forEach((q) => shadowBox.c.add(q)); shadowBox.c.multiplyScalar(1 / pts.length);
        shadowBox.half = Math.min(9, Math.max(...pts.map((q) => Math.hypot(q.x - shadowBox.c.x, q.z - shadowBox.c.z))) + 1);
        shadowBox.c.y = heightAt(shadowBox.c.x, shadowBox.c.z);
      }
    }
  }
  // Where a point on screen (0..1 across and down) lands on the ground, seen from the final view.
  const ray = { o: new THREE.Vector3(), d: new THREE.Vector3() };
  function groundAt(sx, sy, out) {
    ray.o.copy(finalCam.position);
    ray.d.set(sx * 2 - 1, 1 - sy * 2, 0.5).unproject(finalCam).sub(ray.o).normalize();
    if (ray.d.y > -0.02) return null;
    const y = (t) => ray.o.y + ray.d.y * t - heightAt(ray.o.x + ray.d.x * t, ray.o.z + ray.d.z * t);
    let t0 = 0, t1 = 0;
    for (let t = 0.4; t < 160; t += 0.4) { if (y(t) < 0) { t1 = t; break; } t0 = t; }
    if (!t1) return null;
    for (let i = 0; i < 16; i++) { const m = (t0 + t1) / 2; if (y(m) < 0) t1 = m; else t0 = m; }
    return out.copy(ray.d).multiplyScalar(t1).add(ray.o);
  }
  new ResizeObserver(layoutCamera).observe(canvas);
  layoutCamera();

  const droneCentre = new THREE.Vector3();
  function droneFocus(out) { V.rover.updateMatrixWorld(true); V.drone.updateMatrixWorld(true); return V.drone.localToWorld(out.copy(droneCentre)); }
  function rideCamera(t, dt) {
    // Aim at the drone, sliding down toward the rover as the two meet so both stay in frame.
    // The look point tracks that aim on a critically damped spring that also matches its
    // velocity: no lag while cruising, a little drift when the drone speeds up or brakes.
    const D = droneFocus(chaseCam.aim);
    const near = smooth(2.5, 0.6, D.distanceTo(hoverP));
    D.y = lerp(D.y, dockP.y + 0.12, 0.2 * near); // only drop the aim; sliding it sideways pushes the drone off frame
    const w0 = 4.5;
    if (dt > 0) {
      chaseCam.tv.subVectors(D, chaseCam.prev).divideScalar(dt);
      const ax = tmp.subVectors(D, chaseCam.look).multiplyScalar(w0 * w0).addScaledVector(chaseCam.vel, -2 * w0).addScaledVector(chaseCam.tv, 2 * w0);
      chaseCam.vel.addScaledVector(ax, dt);
      chaseCam.look.addScaledVector(chaseCam.vel, dt);
    }
    chaseCam.prev.copy(D);
    const s = easeInOut(clamp((t - T0.cam0) / (T0.cam1 - T0.cam0), 0, 1));
    const f = smooth(0, T0.descend, t), scale = frame.wide ? 1 : 1.5;
    const az = fin.az + lerp(lerp(RIDE.az0, RIDE.az1, f), 0, s);
    const el = lerp(lerp(RIDE.el0, RIDE.el1, smooth(0.2, T0.descend, t)), fin.el, s);
    const d = lerp(lerp(RIDE.d0, RIDE.d1, f) * scale, fin.dist, s);
    const L = chaseCam.L.lerpVectors(chaseCam.look, LOOK, s);
    const c = chaseCam.c.set(L.x + Math.sin(az) * Math.cos(el) * d, L.y + Math.sin(el) * d, L.z + Math.cos(az) * Math.cos(el) * d);
    c.y = Math.max(c.y, heightAt(c.x, c.z) + 0.2);
    camera.position.copy(c); camera.lookAt(L);
    if (t >= T0.cam1) { chaseCam.on = false; camera.position.copy(camFinal); camera.lookAt(LOOK); }
  }

  // ---------------------------------------------------------------- drive controls + chase camera
  const keys = new Set();
  const chase = { yaw: 0, dist: 1.35, height: 0.5, drag: null, orbit: 0, zoom: 1 };
  if (mode === 'drive') {
    const map = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
    addEventListener('keydown', (e) => { if (map[e.code]) { keys.add(map[e.code]); e.preventDefault(); } });
    addEventListener('keyup', (e) => { if (map[e.code]) keys.delete(map[e.code]); });
    addEventListener('blur', () => keys.clear());
    document.querySelectorAll('[data-touch] [data-k]').forEach((b) => {
      const k = b.dataset.k;
      const on = (e) => { e.preventDefault(); keys.add(k); b.classList.add('on'); };
      const off = (e) => { e.preventDefault(); keys.delete(k); b.classList.remove('on'); };
      b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
    canvas.addEventListener('pointerdown', (e) => { chase.drag = { x: e.clientX, o: chase.orbit }; canvas.setPointerCapture(e.pointerId); });
    canvas.addEventListener('pointermove', (e) => { if (chase.drag) chase.orbit = chase.drag.o - (e.clientX - chase.drag.x) * 0.006; });
    canvas.addEventListener('pointerup', () => { chase.drag = null; });
    canvas.addEventListener('wheel', (e) => { chase.zoom = clamp(chase.zoom * (1 + e.deltaY * 0.001), 0.55, 2.6); e.preventDefault(); }, { passive: false });
    R.x = 0; R.z = 0; R.yaw = 0.4;
    chase.yaw = R.yaw;
  }
  function drive(dt) {
    const th = (keys.has('up') ? 1 : 0) - (keys.has('down') ? 1 : 0);
    const st = (keys.has('left') ? 1 : 0) - (keys.has('right') ? 1 : 0); // +yaw is a left turn
    const vT = th > 0 ? 1.1 : th < 0 ? -0.5 : 0;
    R.v = damp(R.v, vT, th ? 2.2 : 3.5, dt);
    R.w = damp(R.w, st * (1.5 - Math.min(Math.abs(R.v), 1) * 0.6), 6, dt);
    R.yaw += R.w * dt;
    let nx = R.x + Math.sin(R.yaw) * R.v * dt, nz = R.z + Math.cos(R.yaw) * R.v * dt;
    // rocks bigger than the wheels stop the rover; slide along them
    for (const o of rocks.obstacles) {
      const dx = nx - o.x, dz = nz - o.z, d = Math.hypot(dx, dz), min = o.r + 0.16;
      if (d < min && d > 1e-4) { nx = o.x + (dx / d) * min; nz = o.z + (dz / d) * min; R.v *= 0.9; }
    }
    const r = Math.hypot(nx, nz);
    if (r > ARENA) { nx *= ARENA / r; nz *= ARENA / r; R.v *= 0.8; }
    R.x = nx; R.z = nz;
    opts.onSpeed?.(R.v);
  }
  function chaseCamera(dt, snap) {
    chase.yaw = snap ? R.yaw : chase.yaw + wrapAngle(R.yaw - chase.yaw) * (1 - Math.exp(-2.5 * dt));
    if (!chase.drag) chase.orbit = damp(chase.orbit, 0, 0.6, dt);
    const a = chase.yaw + Math.PI + chase.orbit, d = chase.dist * chase.zoom;
    const tx = R.x + Math.sin(a) * d, tz = R.z + Math.cos(a) * d;
    const ty = Math.max(R.y + chase.height * chase.zoom, heightAt(tx, tz) + 0.12);
    if (snap) camera.position.set(tx, ty, tz);
    else camera.position.set(damp(camera.position.x, tx, 6, dt), damp(camera.position.y, ty, 6, dt), damp(camera.position.z, tz, 6, dt));
    camera.lookAt(R.x + Math.sin(R.yaw) * 0.35, R.y + 0.12, R.z + Math.cos(R.yaw) * 0.35);
  }

  // ---------------------------------------------------------------- boot
  const detail = [];
  if (mode === 'landing') {
    R.x = START.x; R.z = START.z; R.yaw = 2.35;
    placeRover(0, true);
    V.drone.updateMatrixWorld(true);
    new THREE.Box3().setFromObject(V.drone).getCenter(droneCentre); V.drone.worldToLocal(droneCentre);
    if (docked) { attach(); V.setProps(0); R.pause = 0.5; phase = 'live'; }
    else {
      // come in high from behind the final camera position, cruising toward the rover
      dockPoints();
      const back = CAMDIR, side = new THREE.Vector3(-back.z, 0, back.x); // screen right in the final shot
      path.a.copy(LOOK).addScaledVector(back, 8.5).addScaledVector(side, -2.0).add(tmp.set(0, 3.2, 0));
      path.b.copy(path.a).addScaledVector(back, -3.2).addScaledVector(side, 0.5).add(tmp.set(0, -0.4, 0));
      path.c.copy(hoverP).addScaledVector(back, 1.8).addScaledVector(side, 0.8).add(tmp.set(0, 0.6, 0));
      // the approach is two thirds of that: shrink the curve toward the hover point
      const K = 2 / 3;
      path.b.sub(path.a).multiplyScalar(K);
      path.a.sub(hoverP).multiplyScalar(K).add(hoverP);
      path.b.add(path.a);
      path.c.sub(hoverP).multiplyScalar(K).add(hoverP);
      path.yaw0 = Math.atan2(path.b.x - path.a.x, path.b.z - path.a.z);
      flightPos(0, P); flightPos(1 / 60, tmp);
      velS.subVectors(tmp, P).multiplyScalar(60); prevP.copy(P).addScaledVector(velS, -1 / 60);
      V.drone.position.copy(P);
      V.drone.quaternion.setFromAxisAngle(up, path.yaw0);
      tilt.copy(velS).multiplyScalar(0.8).setY(0).add(tmp.set(0, 9.81, 0)).normalize();
      V.drone.quaternion.premultiply(tQ.setFromUnitVectors(up, tilt));
      chaseCam.on = true;
      droneFocus(chaseCam.look); chaseCam.prev.copy(chaseCam.look); chaseCam.vel.copy(velS);
      rideCamera(0, 0);
      for (let i = 0; i <= 8; i++) detail.push(flightPos((i / 8) * T0.hoverAt, new THREE.Vector3()));
    }
    detail.push(camFinal.clone(), LOOK.clone());
  } else { placeRover(0, true); chaseCamera(0, true); detail.push(V.rover.position.clone()); }
  terrain.update(detail);
  let detailSettled = mode !== 'landing' || docked;

  function tick(dt) {
    clock += dt;
    if (phase === 'intro') {
      placeRover(dt, false);
      if (!docked) fly(clock, dt);
      if (clock >= T0.touch && !docked) attach();
      if (clock >= T0.resume) { phase = 'live'; R.pause = 0.3; if (pointer.at > -1e9) pointer.fresh = true; }
    } else if (phase === 'live') {
      if (!reduced) live(dt); else placeRover(dt, false);
      // once the camera has settled, drop the extra terrain detail laid along the flight path
      if (!detailSettled && !chaseCam.on) detailSettled = terrain.update([camFinal, LOOK], 3000) === 0;
    }
    else { drive(dt); placeRover(dt, false); chaseCamera(dt, false); terrain.update(V.rover.position, 20000); }
    if (chaseCam.on) rideCamera(clock, dt);
    spinWheelsTracksDust(dt);
    tracksL.update(clock, mode === 'drive' ? 120 : 45); tracksR.update(clock, mode === 'drive' ? 120 : 45);
    dust.update(dt);
    propAngle += dt * 44 * propRate; V.setProps(propAngle);
    if (phase === 'intro') propRate = 1 - smooth(T0.touch, T0.spinDown, clock);
    // shadows follow the vehicle
    const f = V.rover.position;
    if (!docked && V.drone) {
      // frame both the rover and the spot where the drone's shadow lands
      const D = V.drone.position, agl = Math.max(0, D.y - heightAt(D.x, D.z));
      const sx = D.x - (sunDir.x / sunDir.y) * agl, sz = D.z - (sunDir.z / sunDir.y) * agl;
      const cx = (sx + f.x) / 2, cz = (sz + f.z) / 2, half = Math.max(2.4, Math.hypot(sx - f.x, sz - f.z) / 2 + 0.9);
      tmp.set(cx, heightAt(cx, cz), cz);
      sun.position.copy(tmp).addScaledVector(sunDir, 12); sun.target.position.copy(tmp);
      Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half });
      sun.shadow.camera.updateProjectionMatrix();
    } else if (mode === 'landing') {
      const h = shadowBox.half;
      if (sun.shadow.camera.right !== h) { Object.assign(sun.shadow.camera, { left: -h, right: h, top: h, bottom: -h }); sun.shadow.camera.updateProjectionMatrix(); }
      sun.position.copy(shadowBox.c).addScaledVector(sunDir, 14); sun.target.position.copy(shadowBox.c);
    } else {
      sun.position.copy(f).addScaledVector(sunDir, 12); sun.target.position.copy(f);
    }
    sky.position.copy(camera.position); horizon.position.copy(camera.position);
    finish.uniforms.time.value = clock;
  }

  // ---------------------------------------------------------------- loop with adaptive quality
  let running = true, visible = true, last = performance.now(), frames = 0, slowTime = 0, degraded = 0;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; last = performance.now(); }).observe(canvas);
  document.addEventListener('visibilitychange', () => { last = performance.now(); });
  function degrade() {
    degraded++;
    if (degraded === 1 && gtao) { gtao.enabled = false; }
    else if (degraded === 2) { renderer.setPixelRatio(1); layoutCamera(); }
    else if (degraded === 3) { sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  }
  function loop(now) {
    if (!running) return;
    requestAnimationFrame(loop);
    if (document.hidden || !visible) { last = now; return; }
    const raw = (now - last) / 1000, dt = clamp(raw, 0, 0.05);
    last = now;
    frames++;
    if (frames > 30 && raw > 0 && raw < 0.5) { slowTime = raw > 1 / 38 ? slowTime + 1 : Math.max(0, slowTime - 1); if (slowTime > 45 && degraded < 3) { degrade(); slowTime = 0; } }
    tick(dt);
    composer.render(dt);
  }
  renderer.compile(scene, camera);
  composer.render(0);
  if (opts.debug) {
    running = false;
    window.__worldStep = (s) => { const n = Math.round(s * 60); for (let i = 0; i < n; i++) tick(1 / 60); composer.render(1 / 60); return clock; };
    window.__world = { camera, V, R, AIR, scene, point: (x, y) => { pointer.x = x; pointer.y = y; pointer.at = clock; pointer.fresh = true; } };
  } else if (!reduced || mode === 'drive') requestAnimationFrame(loop);
  opts.onReady?.();
  return { stop() { running = false; renderer.dispose(); } };
}
