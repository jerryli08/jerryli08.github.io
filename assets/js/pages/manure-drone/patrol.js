// "How it would work" (scroll-driven): the manure drone concept on a pasture. The drone is Jerry's
// CAD at real scale; its twelve props turn about their real hub axes, each lower prop the opposite
// way to the one above it. Scrolling runs the mission: spin up, take off and scan the field with a
// downward camera, drop low over three pats and vacuum them through the nozzle while the canister
// fills, fly back and empty it into a digester, land. Everything is a pure function of a scripted
// time t, and t is a pure function of (step, progress through the step): scrolling back runs it
// backwards. Nothing moves on its own.
//
// Real (from the CAD, model metres, Y up, forward = -z):
//  - prop hub axes (x, z), all vertical: the bolt-circle centres of each prop in the STEP file
//    (tools/cad-axes.py on youth_energy_summit_manure_drone_manure_collection_drone.step)
//  - nozzle mouth: the bottom of Component130, a 264 x 42 mm slot centred at x -13.5, y -158.9, z 227.5 mm
//  - lower canister bottom: y -158.4 mm; landed, the lowest point is the landing gear at y -190.5 mm
// Illustrative (drawn for the animation, not CAD, and labelled so): the pasture, the pats, the digester,
// the camera footprint (no camera is modelled), the particle streams, the fill level and the prop discs.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import * as THREE from 'three';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const fract = (x) => x - Math.floor(x);
const TAU = Math.PI * 2;
const GROUND = -0.1905; // landed: the bottom of the landing gear
const ORANGE = '#ff6b35', BLUE = '#27c7ff', YELLOW = '#ffd23f';

// props: [pair, hub x, hub z] in mm, and the order they sit around the hexagon (for alternating spin)
const HUBS = { 1: [-18.5, -549.1], 2: [549.2, -254.5], 3: [-16.5, 732.5], 4: [-578.2, -270.0], 5: [-543.5, 533.0], 6: [511.7, 528.0] };
const HUB_Y = { T: { 1: 298.0, 2: 311.3, 3: 323.6, 4: 311.1, 5: 339.2, 6: 339.3 }, B: { 1: 132.2, 2: 118.9, 3: 106.5, 4: 119.1, 5: 91.0, 6: 90.9 } };
const AROUND = [1, 2, 6, 3, 5, 4];
const SPIN_SIGN = Object.fromEntries(AROUND.map((n, i) => [n, i % 2 ? -1 : 1]));
const MOUTH = [-0.0135, -0.1589, 0.2275];
const CAN_BOTTOM = [-0.012, -0.1584, -0.043];
const CAMERA_AT = [-0.0176, -0.080, -0.0267]; // just under the Terrain Radar at the front

// ---------------------------------------------------------------- the world (metres)
const PAD = [0, 0];
const TANK = { x: -6.0, z: 0.4, r: 2.0, h: 2.2 };
const HOPPER = { x: -3.35, z: 0.4, top: 1.6 };
const GEN = { x: -7.6, z: 3.4 };
const STORE = { x: -3.6, z: 3.7 };
const PATS = [[15.0, 2.2], [12.2, -1.8], [9.0, 1.3], [6.2, -2.6], [3.8, 2.4], [16.4, -2.9]]; // the first three are collected
const SCAN_ALT = 4, CRUISE = 1.5, HOVER = 0.075;

// ---------------------------------------------------------------- the script
const yawTo = (dx, dz) => Math.atan2(-dx, -dz); // yaw that points the nose (-z) along (dx, dz)
const rotY = (v, a) => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const KEYS = [];
const COLLECT = []; // [t0, t1] per collected pat
let DEPOSIT = [0, 0];
// step boundaries in scripted time (seconds, illustrative), filled in by the script below
const T = [0];
{
  let t = 0, pos = [0, 0, 0], yaw = yawTo(1, 0);
  const key = (dt, p, y = yaw) => { t += dt; pos = p; yaw = y; KEYS.push({ t, p: p.slice(), yaw }); };
  KEYS.push({ t: 0, p: pos.slice(), yaw });
  key(1.5, pos);                                 // on the pad, props spinning up
  T.push(t);
  key(0.6, [0, SCAN_ALT, 0]);                    // take off
  key(2.1, [17.5, SCAN_ALT, 0]);                 // the scan pass
  key(0.3, pos);
  T.push(t);
  for (let i = 0; i < 3; i++) {
    const [px, pz] = PATS[i];
    const dir = yawTo(px - pos[0], pz - pos[2]);
    const off = rotY(MOUTH, dir);
    const over = [px - off[0], CRUISE, pz - off[2]];
    key(i === 0 ? 0.62 : 0.45, over, dir);         // fly there (and down to cruise height)
    key(0.3, [over[0], HOVER, over[2]]);          // drop low over the pat
    const c0 = t; key(0.42, pos); COLLECT.push([c0, t]); // vacuum
    key(0.28, [over[0], CRUISE, over[2]]);        // climb
  }
  key(0.1, pos);
  T.push(t);
  // back to the digester's inlet hopper
  {
    const dir = yawTo(HOPPER.x - pos[0], HOPPER.z - pos[2]);
    const off = rotY(CAN_BOTTOM, dir);
    const yD = GROUND + HOPPER.top + 0.45 - CAN_BOTTOM[1];
    key(1.05, [HOPPER.x - off[0], yD, HOPPER.z - off[2]], dir);
    const d0 = t; key(0.8, pos); DEPOSIT = [d0, t];
  }
  key(0.15, pos);
  T.push(t);
  const dir = yawTo(PAD[0] - pos[0], PAD[1] - pos[2]);
  key(0.6, [PAD[0], 1.0, PAD[1]], dir);           // to the pad
  key(0.45, [PAD[0], 0, PAD[1]]);                  // land
  T.push(t + 1.2);                                 // props spin down while the digester runs
}
const SPIN_UP = [0.15, 1.2], SPIN_DOWN = [KEYS[KEYS.length - 1].t + 0.05, KEYS[KEYS.length - 1].t + 0.6];
const ENERGY = [T[4] + 0.1, T[5]];

function poseAt(t) {
  let i = 1; while (i < KEYS.length - 1 && KEYS[i].t < t) i++;
  const a = KEYS[i - 1], b = KEYS[i];
  const k = smooth(a.t, b.t, t);
  let dy = b.yaw - a.yaw; while (dy > Math.PI) dy -= TAU; while (dy < -Math.PI) dy += TAU;
  return { p: [lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k), lerp(a.p[2], b.p[2], k)], yaw: a.yaw + dy * k };
}
// prop angle: the integral of a speed that ramps up at the start and down after landing (turns)
function spinAt(t) {
  const up = (x) => { const [a, b] = SPIN_UP; return x <= a ? 0 : x < b ? ((x - a) ** 2) / (2 * (b - a)) : (b - a) / 2 + (x - b); };
  const [c, d] = SPIN_DOWN;
  const down = t <= c ? 0 : t < d ? ((t - c) ** 2) / (2 * (d - c)) : (d - c) / 2 + (t - d);
  return 0.6 * (up(t) - down); // 0.6 turns per second of script: slow enough to see which way each prop turns
}
const spinSpeed = (t) => smooth(SPIN_UP[0], SPIN_UP[1], t) * (1 - smooth(SPIN_DOWN[0], SPIN_DOWN[1], t));
// fill of the canister, 0..1
const fillAt = (t) => COLLECT.reduce((s, [a, b]) => s + smooth(a, b, t) / 3, 0) * (1 - smooth(DEPOSIT[0] + 0.1, DEPOSIT[1] - 0.05, t));
// when the camera footprint first covers each pat (sampled once)
const FOUND = PATS.map(([px, pz]) => {
  for (let t = T[1]; t <= T[2]; t += 0.01) {
    const { p } = poseAt(t);
    if (p[1] > SCAN_ALT * 0.8 && p[0] + 2.4 >= px && Math.abs(pz - p[2]) <= 3.3) return t;
  }
  return T[2];
});

// ---------------------------------------------------------------- textures drawn once
function grassTextures(THREE_, tiles) {
  // a small tileable patch of grass (repeated across the field) and a radial fade (not repeated)
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  g.fillStyle = '#5a7040'; g.fillRect(0, 0, n, n);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5200; i++) {
    const x = rnd() * n, y = rnd() * n, w = 1 + rnd() * 1.6, h = 2 + rnd() * 3;
    g.fillStyle = `hsla(${80 + rnd() * 26}, ${24 + rnd() * 16}%, ${28 + rnd() * 16}%, ${0.25 + rnd() * 0.3})`;
    for (const [dx, dy] of [[0, 0], [n, 0], [0, n], [n, n], [-n, 0], [0, -n]]) g.fillRect(x + dx, y + dy, w, h);
  }
  const map = new THREE_.CanvasTexture(c);
  map.colorSpace = THREE_.SRGBColorSpace; map.anisotropy = 4;
  map.wrapS = map.wrapT = THREE_.RepeatWrapping; map.repeat.set(tiles, tiles);
  const a = document.createElement('canvas'); a.width = a.height = n;
  const o = a.getContext('2d');
  const rg = o.createRadialGradient(n / 2, n / 2, n * 0.28, n / 2, n / 2, n * 0.5);
  rg.addColorStop(0, '#fff'); rg.addColorStop(1, '#000');
  o.fillStyle = rg; o.fillRect(0, 0, n, n);
  const alphaMap = new THREE_.CanvasTexture(a);
  return { map, alphaMap };
}
function blobTexture(THREE_) {
  const n = 128, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
  rg.addColorStop(0, 'rgba(0,0,0,0.75)'); rg.addColorStop(0.6, 'rgba(0,0,0,0.35)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, n, n);
  return new THREE_.CanvasTexture(c);
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, shadow: false });
  const model = await stage.load('/assets/models/manure-drone/final.glb');
  const reduced = ctx.reducedMotion;
  const part = (re) => { const p = stage.part(re); if (!p.length) throw new Error(`manure-drone: no part ${re}`); return p[0]; };

  // ------------------------------------------------ props about their real axes
  const props = [];
  for (const layer of ['T', 'B']) for (const n of [1, 2, 3, 4, 5, 6]) {
    const [hx, hz] = HUBS[n];
    const g = stage.pivot(part(new RegExp(`_md_prop${layer}${n}$`)), [hx / 1000, HUB_Y[layer][n] / 1000, hz / 1000], [0, 1, 0], { frame: model });
    props.push({ g, sign: SPIN_SIGN[n] * (layer === 'T' ? 1 : -1) });
  }
  // translucent discs where the blades sweep (motion blur, an overlay), children of the model so they fly with it
  const discMat = new THREE.MeshBasicMaterial({ color: '#cfd6dd', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const discGeo = new THREE.RingGeometry(0.03, 0.2925, 48).rotateX(-Math.PI / 2);
  for (const layer of ['T', 'B']) for (const n of [1, 2, 3, 4, 5, 6]) {
    const d = new THREE.Mesh(discGeo, discMat);
    d.position.set(HUBS[n][0] / 1000, HUB_Y[layer][n] / 1000 + (layer === 'T' ? 0.008 : -0.004), HUBS[n][1] / 1000);
    d.renderOrder = 2;
    model.add(d);
  }

  // ------------------------------------------------ canister: see-through while it fills
  const canister = part(/_md_canister_low$/);
  const canMats = [];
  canister.traverse((m) => { if (!m.isMesh) return; m.material = [].concat(m.material).map((x) => { const c = stage.cloneMaterial(x); canMats.push(c); return c; }); if (m.material.length === 1) m.material = m.material[0]; });
  let canO = 1;
  const setCanister = (o) => {
    o = Math.round(o * 50) / 50;
    if (o === canO) return;
    const wasT = canO < 1, isT = o < 1;
    canO = o;
    for (const m of canMats) { m.opacity = o; m.transparent = isT; m.depthWrite = !isT; if (wasT !== isT) m.needsUpdate = true; }
  };
  const fillMesh = new THREE.Mesh(new THREE.BoxGeometry(0.27, 1, 0.3), new THREE.MeshStandardMaterial({ color: '#5b3f26', roughness: 0.85 }));
  fillMesh.geometry.translate(0, 0.5, 0);
  fillMesh.position.set(-0.0176, -0.148, 0.01);
  fillMesh.visible = false;
  fillMesh.scale.y = 0.001;
  model.add(fillMesh);

  // ------------------------------------------------ the pasture and the depot (illustrative)
  const world = new THREE.Group();
  stage.scene.add(world);
  const FIELD_R = 24, FIELD_C = [5.5, 0];
  const grass = new THREE.Mesh(new THREE.CircleGeometry(FIELD_R, 96).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ ...grassTextures(THREE, (FIELD_R * 2) / 2.4), transparent: true, roughness: 1, metalness: 0 }));
  grass.position.set(FIELD_C[0], GROUND - 0.002, FIELD_C[1]);
  grass.renderOrder = -1;
  world.add(grass);
  const std = (color, roughness = 0.8, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  // pats: low domes of manure
  const patGeo = new THREE.SphereGeometry(0.17, 28, 12, 0, TAU, 0, Math.PI / 2).scale(1, 0.2, 1);
  const patMat = std('#4a3322', 0.95);
  const pats = PATS.map(([x, z], i) => {
    const m = new THREE.Mesh(patGeo, patMat);
    m.position.set(x, GROUND, z);
    m.rotation.y = i * 1.3;
    m.scale.set(1 + 0.25 * Math.sin(i * 2.1), 1, 1 + 0.2 * Math.cos(i * 1.7));
    world.add(m);
    return m;
  });
  // detection boxes: thin outlines on the ground around each pat
  const boxMat = new THREE.MeshBasicMaterial({ color: YELLOW, transparent: true, opacity: 0, depthWrite: false });
  const boxes = PATS.map(([x, z]) => {
    const g = new THREE.Group();
    const s = 0.62, w = 0.03;
    for (const [dx, dz, sx, sz] of [[0, -s / 2, s, w], [0, s / 2, s, w], [-s / 2, 0, w, s], [s / 2, 0, w, s]]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(sx, sz).rotateX(-Math.PI / 2), boxMat);
      b.position.set(dx, 0.004, dz);
      g.add(b);
    }
    g.position.set(x, GROUND, z);
    world.add(g);
    return g;
  });
  // landing pad
  const pad = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 2.2), std('#3a3a3d', 0.7));
  pad.position.set(PAD[0], GROUND - 0.02, PAD[1]);
  world.add(pad);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.8, 64).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#e8e2d8' }));
  ring.position.set(PAD[0], GROUND + 0.002, PAD[1]);
  world.add(ring);
  // digester: a round tank with a gas dome, an inlet hopper, a gas line to a generator, a digestate tank
  const tankMat = std('#8f8b84', 0.9);
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(TANK.r, TANK.r, TANK.h, 64), tankMat);
  tank.position.set(TANK.x, GROUND + TANK.h / 2, TANK.z);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(TANK.r * 0.98, 48, 16, 0, TAU, 0, Math.PI / 2).scale(1, 0.42, 1), std('#d7d1c6', 0.6));
  dome.position.set(TANK.x, GROUND + TANK.h, TANK.z);
  const hopper = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.32, 0.8, 4, 1, true).rotateY(Math.PI / 4), new THREE.MeshStandardMaterial({ color: '#6c6f73', roughness: 0.6, metalness: 0.3, side: THREE.DoubleSide }));
  hopper.position.set(HOPPER.x, GROUND + HOPPER.top - 0.4, HOPPER.z);
  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, HOPPER.top - 0.8, 8);
  const legs = [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]].map(([dx, dz]) => { const l = new THREE.Mesh(legGeo, std('#55585c', 0.6, 0.3)); l.position.set(HOPPER.x + dx, GROUND + (HOPPER.top - 0.8) / 2, HOPPER.z + dz); return l; });
  const chute = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, HOPPER.x - (TANK.x + TANK.r) + 0.3, 16).rotateZ(Math.PI / 2), std('#55585c', 0.6, 0.3));
  chute.position.set((HOPPER.x + TANK.x + TANK.r) / 2, GROUND + 0.75, HOPPER.z);
  const gen = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.8), std('#3f5a4a', 0.6, 0.2));
  gen.position.set(GEN.x, GROUND + 0.5, GEN.z);
  // gas line: dome top -> over -> down to the generator
  const gasPath = [[TANK.x, GROUND + TANK.h + TANK.r * 0.42, TANK.z], [TANK.x, GROUND + TANK.h + TANK.r * 0.42 + 0.35, TANK.z], [GEN.x, GROUND + TANK.h + TANK.r * 0.42 + 0.35, GEN.z], [GEN.x, GROUND + 1.0, GEN.z]];
  const pipeMat = std('#c9a227', 0.5, 0.4);
  const pipes = [];
  const pipeAlong = (path, r, mat) => {
    for (let i = 1; i < path.length; i++) {
      const a = new THREE.Vector3(...path[i - 1]), b = new THREE.Vector3(...path[i]);
      const len = a.distanceTo(b);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), mat);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      pipes.push(m);
    }
  };
  pipeAlong(gasPath, 0.06, pipeMat);
  // digestate: from the tank base out to a low storage tank
  const outPath = [[TANK.x + 1.1, GROUND + 0.35, TANK.z + 1.55], [STORE.x - 0.75, GROUND + 0.35, STORE.z - 0.55]];
  pipeAlong(outPath, 0.08, std('#55585c', 0.6, 0.3));
  const store = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.6, 48), std('#6f675c', 0.9));
  store.position.set(STORE.x, GROUND + 0.3, STORE.z);
  world.add(tank, dome, hopper, ...legs, chute, gen, store, ...pipes);

  // ------------------------------------------------ particles: manure streams, biogas, digestate
  const dotGeo = new THREE.SphereGeometry(1, 10, 6);
  const N_M = 40, N_G = 14, N_D = 8;
  const manure = new THREE.InstancedMesh(dotGeo, std('#5b3f26', 0.9), N_M);
  const gas = new THREE.InstancedMesh(dotGeo, new THREE.MeshBasicMaterial({ color: YELLOW }), N_G);
  const dig = new THREE.InstancedMesh(dotGeo, std('#4a3322', 0.9), N_D);
  for (const im of [manure, gas, dig]) { im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); world.add(im); }
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), Vp = new THREE.Vector3(), Vs = new THREE.Vector3();
  const put = (im, i, x, y, z, s) => { M4.compose(Vp.set(x, y, z), Q, Vs.set(s, s, s)); im.setMatrixAt(i, M4); };
  const along = (path, u) => {
    const seg = []; let L = 0;
    for (let i = 1; i < path.length; i++) { const l = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1], path[i][2] - path[i - 1][2]); seg.push(l); L += l; }
    let s = u * L, i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
    const k = s / seg[i];
    return [0, 1, 2].map((j) => lerp(path[i][j], path[i + 1][j], k));
  };

  // ------------------------------------------------ the camera footprint (no camera is in the CAD)
  const fpGeo = new THREE.BufferGeometry();
  const fpPos = new Float32Array(5 * 3);
  fpGeo.setAttribute('position', new THREE.BufferAttribute(fpPos, 3));
  fpGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1, 1, 3, 2, 1, 4, 3]);
  const fpMat = new THREE.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  const footprint = new THREE.Mesh(fpGeo, fpMat);
  footprint.frustumCulled = false;
  world.add(footprint);
  // soft shadow under the drone
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTexture(THREE), transparent: true, depthWrite: false }));
  world.add(blob);

  // ------------------------------------------------ views
  const helper = (x0, y0, z0, x1, y1, z1) => { const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0)); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); m.updateMatrixWorld(true); return m; };
  const rest = stage.bounds(model, true).box.clone(); // the drone at rest on the pad
  const H_PAD = helper(rest.min.x, rest.min.y, rest.min.z, rest.max.x, rest.max.y, rest.max.z);
  const H_FIELD = helper(-1.5, GROUND, -3.6, 18.5, SCAN_ALT + 0.8, 3.6);
  const H_DEPOT = helper(-8.8, GROUND, -1.8, 1.4, 3.3, 4.9);
  const H_ENERGY = helper(-12.0, GROUND, -1.8, 1.8, 3.3, 4.9); // wider to the left, so the depot sits clear of the step text
  let cached = null, key = '';
  const sph = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { target: v.target.clone(), s }; };
  function statics() {
    const k = `${(el.clientWidth / Math.max(1, el.clientHeight)).toFixed(3)}`;
    if (cached && k === key) return cached;
    key = k;
    const portrait = el.clientHeight > el.clientWidth;
    cached = {
      pad: sph(stage.frame(H_PAD, { azimuth: 212, elevation: 12, pad: portrait ? 1.05 : 1.2, apply: false, refresh: true })),
      field: sph(stage.frame(H_FIELD, { azimuth: 8, elevation: 30, pad: portrait ? 0.7 : 1.0, apply: false })),
      depot: sph(stage.frame(H_DEPOT, { azimuth: 26, elevation: 20, pad: portrait ? 0.78 : 1.0, apply: false })),
      energy: sph(stage.frame(portrait ? H_DEPOT : H_ENERGY, { azimuth: 16, elevation: 26, pad: portrait ? 0.8 : 1.0, apply: false })),
    };
    return cached;
  }
  // the chase view: a fixed offset from the scripted drone position (not framed on the moving model)
  const chase = (p) => ({ target: new THREE.Vector3(p[0], p[1] + 0.05, p[2]), s: new THREE.Spherical(4.4, THREE.MathUtils.degToRad(90 - 20), THREE.MathUtils.degToRad(28)) });
  const viewOf = (name, p) => (name === 'chase' ? chase(p) : statics()[name]);
  const STEP_VIEW = ['pad', 'field', 'chase', 'depot', 'energy'];
  const camPos = new THREE.Vector3(), camTarget = new THREE.Vector3(), sp = new THREE.Spherical();
  let lastView = '';
  function place(a, b, k) {
    let dT = b.s.theta - a.s.theta; while (dT > Math.PI) dT -= TAU; while (dT < -Math.PI) dT += TAU;
    camTarget.copy(a.target).lerp(b.target, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    camPos.setFromSpherical(sp).add(camTarget);
    const k2 = `${camPos.x.toFixed(5)},${camPos.y.toFixed(5)},${camPos.z.toFixed(5)},${camTarget.x.toFixed(5)},${camTarget.y.toFixed(5)},${camTarget.z.toFixed(5)}`;
    if (k2 === lastView) return; // only redraw when the camera really moved
    lastView = k2;
    stage.setView({ pos: camPos, target: camTarget });
  }

  // ------------------------------------------------ labels and readout
  const ov = labelLayer(stage);
  const L = {
    top: ov.label('Upper prop', [HUBS[2][0] / 1000, HUB_Y.T[2] / 1000 + 0.02, HUBS[2][1] / 1000], { color: ORANGE, minW: 440 }),
    bot: ov.label('Lower prop: turns the other way', [HUBS[4][0] / 1000, HUB_Y.B[4] / 1000 - 0.01, HUBS[4][1] / 1000], { color: BLUE, side: 'l', minW: 440 }),
    cam: ov.label('Camera (planned; not in the CAD)', [0, 0, 0], { color: BLUE, minW: 600 }),
    nozzle: ov.label('Nozzle', [0, 0, 0], { color: ORANGE, minW: 440 }),
    fill: ov.label('Canister filling', [0, 0, 0], { side: 'l', minW: 440 }),
    tank: ov.label('Digester (illustrative)', [TANK.x, GROUND + TANK.h + 0.3, TANK.z - TANK.r * 0.6], { minW: 440 }),
    hopper: ov.label('Inlet', [HOPPER.x + 0.5, GROUND + HOPPER.top, HOPPER.z], { minW: 440 }),
    gas: ov.label('Biogas: mostly methane and CO2', gasPath[2], { color: YELLOW, minW: 440 }),
    gen: ov.label('Generator: electricity and heat', [GEN.x - 0.6, GROUND + 1.0, GEN.z], { side: 'l', minW: 440 }),
    dig: ov.label('Digestate: fertilizer for the fields', [STORE.x + 0.5, GROUND + 0.6, STORE.z], { minW: 440 }),
    field: ov.label('Pasture (illustrative)', [16, GROUND, 3.4], { minW: 700 }),
  };
  const found = PATS.map(([x, z]) => ov.label('Manure', [x, GROUND + 0.05, z + 0.35], { color: YELLOW, minW: 700 }));

  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Phase</span><b data-k="phase"></b></div>
    <div class="rx-hud-row" data-r="lift"><span>Rated takeoff weight</span><b class="num">36 to 60 kg</b></div>
    <div class="rx-hud-x" data-r="lift" style="font-size:11.5px;color:var(--muted)">12 motors x 3 to 5 kg each, Hobbywing X6 spec, before the loss from stacking props</div>
    <div class="rx-hud-row" data-r="found"><span>Pats found</span><b class="num" data-k="found"></b></div>
    <div class="rx-hud-row" data-r="fill"><span>Canister</span><b class="num" data-k="fill"></b><i><em data-k="fillBar"></em></i></div>
    <div class="rx-hud-x" data-r="fill" style="font-size:11.5px;color:var(--muted)">Full, taking the half below the arms: about 26 L, about 26 kg (volume from the CAD, density 990 kg/m³ from ASAE D384.1)</div>
    <div class="rx-hud-row" data-r="cow"><span>Manure, one dairy cow</span><b class="num">38 kg a day</b></div>
    <div class="rx-hud-x" data-r="cow" style="font-size:11.5px;color:var(--muted)">Feces only, a 640 kg cow; ASAE D384.1</div>
    <div class="rx-hud-row" data-r="cow"><span>Methane, at most</span><b class="num">1.3 m³ a day</b></div>
    <div class="rx-hud-x" data-r="cow" style="font-size:11.5px;color:var(--muted)">About 13 kWh; IPCC 2006, dairy cow, North America</div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const RW = {}; for (const r of hud.querySelectorAll('[data-r]')) (RW[r.dataset.r] ||= []).push(r);
  const shown = {}, rowOn = {};
  const putK = (k, v) => { if (shown[k] !== v) { if (k === 'fillBar') K[k].style.width = v; else K[k].textContent = v; shown[k] = v; } };
  const rows = (on) => { for (const r of Object.keys(RW)) { const v = on.includes(r); if (rowOn[r] !== v) { RW[r].forEach((e) => { e.style.display = v ? '' : 'none'; }); rowOn[r] = v; } } };
  const PHASE = ['Spinning up', 'Scanning', 'Vacuuming', 'Emptying at the digester', 'Landed'];
  const ROWS = [['lift'], ['found'], ['fill'], ['fill'], ['cow']];

  const tmp = new THREE.Vector3();
  let lastT = -1, lastStep = -1;
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, T.length - 2);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy);
    const run = reduced ? 1 : clamp((stepP - 0.03) / (step === T.length - 2 ? 0.6 : 0.82), 0, 1);
    const t = lerp(T[step], T[step + 1], run);
    const kv = reduced || step === 0 ? 1 : smooth(0, 0.45, stepP);

    if (t !== lastT) {
      lastT = t;
      // drone pose, with a nose-down tilt that follows its speed
      const { p: P, yaw } = poseAt(t);
      const ahead = poseAt(t + 0.04).p, behind = poseAt(t - 0.04).p;
      const vx = (ahead[0] - behind[0]) / 0.08, vz = (ahead[2] - behind[2]) / 0.08;
      const fwd = vx * -Math.sin(yaw) + vz * -Math.cos(yaw) || 0; // speed along the nose (-z)
      const side = vx * Math.cos(yaw) - vz * Math.sin(yaw) || 0;  // speed to the right (+x)
      model.position.set(P[0], P[1], P[2]);
      // nose down into forward flight, bank into sideways flight (up to 8 degrees)
      model.rotation.set(clamp(-fwd * 0.012, -0.14, 0.14), yaw, clamp(-side * 0.012, -0.14, 0.14), 'YXZ');
      model.updateMatrixWorld(true);
      // props
      const turns = spinAt(t), sp1 = spinSpeed(t);
      for (const pr of props) pr.g.setAngle(pr.sign * turns * TAU);
      discMat.opacity = 0.16 * sp1;
      // canister fill and see-through while the reader watches it fill
      const fill = fillAt(t);
      fillMesh.visible = fill > 0.004;
      fillMesh.scale.y = Math.max(0.001, fill * 0.29);
      const ghost = (step === 2 || step === 3) ? (step === 2 ? kv : 1 - smooth(DEPOSIT[1], DEPOSIT[1] + 0.3, t)) : 0;
      setCanister(1 - 0.72 * ghost);
      // pats: found, then collected
      pats.forEach((m, i) => {
        const c = COLLECT[i];
        const s = c ? 1 - smooth(c[0] + 0.05, c[1], t) : 1;
        m.visible = s > 0.01;
        m.scale.y = s;
      });
      const seen = FOUND.map((ft) => t >= ft);
      boxMat.opacity = 0.9 * (1 - smooth(T[2] + 0.2, T[2] + 1.0, t));
      boxes.forEach((b, i) => { b.visible = seen[i] && (!COLLECT[i] || t < COLLECT[i][0]); });
      // manure streams: into the nozzle while vacuuming, out of the canister over the hopper
      const mouth = tmp.set(...MOUTH).applyMatrix4(model.matrixWorld).clone();
      const bottom = new THREE.Vector3(...CAN_BOTTOM).applyMatrix4(model.matrixWorld);
      let n = 0;
      for (let i = 0; i < COLLECT.length; i++) {
        const [a, b] = COLLECT[i];
        const on = smooth(a - 0.02, a + 0.06, t) * (1 - smooth(b - 0.08, b, t));
        if (on <= 0.01) continue;
        const [px, pz] = PATS[i];
        for (let j = 0; j < 20 && n < N_M; j++, n++) {
          const u = fract(t * 2.6 + j / 20), ang = j * 2.39996, rr = 0.1 * Math.sqrt(fract(j * 0.618));
          const x0 = px + Math.cos(ang) * rr, z0 = pz + Math.sin(ang) * rr;
          const k2 = u * u;
          put(manure, n, lerp(x0, mouth.x, k2), lerp(GROUND + 0.03, mouth.y, u), lerp(z0, mouth.z, k2), 0.016 * on);
        }
      }
      {
        const [a, b] = DEPOSIT;
        const on = smooth(a, a + 0.08, t) * (1 - smooth(b - 0.1, b, t));
        if (on > 0.01) for (let j = 0; j < 20 && n < N_M; j++, n++) {
          const u = fract(t * 2.2 + j / 20), ang = j * 2.39996, rr = 0.07 * Math.sqrt(fract(j * 0.618));
          put(manure, n, bottom.x + Math.cos(ang) * rr, lerp(bottom.y, GROUND + HOPPER.top - 0.3, u), bottom.z + Math.sin(ang) * rr, 0.02 * on);
        }
      }
      for (; n < N_M; n++) put(manure, n, 0, -50, 0, 0);
      manure.instanceMatrix.needsUpdate = true;
      // biogas to the generator, digestate out to storage (only once the drone is home)
      const e = smooth(ENERGY[0], ENERGY[0] + 0.3, t);
      for (let j = 0; j < N_G; j++) { const q = along(gasPath, fract(t * 0.55 + j / N_G)); put(gas, j, q[0], q[1], q[2], 0.07 * e); }
      for (let j = 0; j < N_D; j++) { const q = along(outPath, fract(t * 0.35 + j / N_D)); put(dig, j, q[0], q[1] + 0.12, q[2], 0.09 * e); }
      gas.instanceMatrix.needsUpdate = true; dig.instanceMatrix.needsUpdate = true;
      // camera footprint while scanning: from under the front of the drone down to the grass
      const alt = P[1] - GROUND;
      const fpOn = (step === 1 ? 1 : 0) * smooth(1.2, 2.5, alt) * (1 - smooth(T[2] - 0.35, T[2], t));
      fpMat.opacity = 0.16 * fpOn;
      footprint.visible = fpOn > 0.01;
      if (footprint.visible) {
        const apex = new THREE.Vector3(...CAMERA_AT).applyMatrix4(model.matrixWorld);
        const hw = 3.3 * (alt / SCAN_ALT), hl = 2.0 * (alt / SCAN_ALT), cx = apex.x + 0.4, cz = apex.z;
        fpPos.set([apex.x, apex.y, apex.z, cx - hl, GROUND + 0.01, cz - hw, cx + hl, GROUND + 0.01, cz - hw, cx + hl, GROUND + 0.01, cz + hw, cx - hl, GROUND + 0.01, cz + hw]);
        fpGeo.attributes.position.needsUpdate = true;
        fpGeo.computeBoundingSphere();
        L.cam.p.copy(apex);
      }
      L.cam.a = fpOn;
      // shadow under the drone
      blob.position.set(P[0], GROUND + 0.003, P[2]);
      blob.scale.setScalar(1 + alt * 0.12);
      blob.material.opacity = 0.9 * clamp(1 - alt / 7, 0.15, 1);
      // labels that ride on the drone
      L.nozzle.p.copy(mouth);
      L.fill.p.set(-0.2, -0.02, 0.0).applyMatrix4(model.matrixWorld);
      found.forEach((l, i) => { l.a = (step === 1 && seen[i]) ? 1 : 0; });
      // readout
      putK('phase', PHASE[step]);
      putK('found', `${seen.filter(Boolean).length} of ${PATS.length}`);
      putK('fill', `${Math.round(fill * 100)} %`);
      putK('fillBar', `${(fill * 100).toFixed(1)}%`);
      stage.invalidate();
    }
    if (step !== lastStep) { lastStep = step; rows(ROWS[step]); }
    L.top.a = L.bot.a = step === 0 ? 1 : 0;
    L.nozzle.a = step === 2 ? kv : 0;
    L.fill.a = step === 2 ? kv : 0;
    for (const k of ['tank', 'hopper']) L[k].a = step >= 3 ? 1 : 0;
    for (const k of ['gas', 'gen', 'dig']) L[k].a = step === 4 ? smooth(0.2, 0.5, stepP) : 0;
    L.field.a = step === 1 ? 1 : 0;
    // camera: blend from the previous step's view (the chase view is evaluated at the current time)
    const { p: P } = poseAt(t);
    place(viewOf(STEP_VIEW[Math.max(0, step - 1)], P), viewOf(STEP_VIEW[step], P), kv);
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() {
      ov.dispose?.();
      world.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); [].concat(m.material).forEach((x) => { x.map?.dispose(); x.dispose(); }); } });
      world.removeFromParent();
      stage.dispose();
    },
  };
}
