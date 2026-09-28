// Why the pivot broke, on Jerry's real CAD, driven only by the scroll. Seven steps:
//  0  the arm swings from just off the floor to the up preset with the slides in; the readout is
//     TestTeleop.java's own math at each angle (P term, gravity feedforward, their sum)
//  1  back down, then the slides run all the way out; two lines from the pivot axis to the claw
//     body's centre show the lever arm growing from 0.44 m to 1.42 m (from the CAD)
//  2  the load path at the pivot: the two motors' hubs turn the 72 mm U-channel, the slide kit's
//     1-hole U-channel sits on it, the low-side U-channel that carries the slides sits on that
//  3  the up preset pressed from rest with the slides out: both 43 rpm motors at stall, and the
//     low-side channel coloured by my FEA's von Mises stress as the load comes on
//  4  pivot after pivot: every start up and every start down reverses the stress at the side-wall
//     hole, and a crack grows from it (an illustration)
//  5  the crack runs through and the channel snaps cleanly: the slides and claw drop, the stub on
//     the pivot swings up (an illustration)
//  6  rewind, and the interlock Jerry would add: the slides come in first, and only then the pivot
// The stress colours are the FEA's (CalculiX on Jerry's CAD parts, /home/claude/work/hcls-2024-ftc-
// offseason-bot/fea): fea-lowside.glb is the low-side channel's surface as the FEA meshed it, with
// each vertex's von Mises stress at the up start and the down start as a fraction of 6061-T6's
// typical yield. The crack path and the snap are drawn, not simulated: the crack runs along the row
// of holes where the FEA peak is (STEP y -32.25 mm, 8 mm past the 1-hole channel), which is where
// Jerry says it cracked (between the 1-hole U-channel and the slide mount).
// The picture is a pure function of (step, progress through the step). Views are framed once with
// the robot at rest and cached; reduced motion cuts to each step's end.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { blendIn, smoother } from '/assets/js/lib/ease.js';
import { rigRobot, PIVOT, CLAW_C, PHI_UP, TRAVEL, FLOOR, TICKS_PER_DEG } from './rig.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = smoother; // quintic: every motion starts and stops with zero speed and acceleration
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const PHI_REST = 4; // just off the floor, slides in
const PHI_FLOOR = 0.8; // claw on the floor, slides out
const RED = '#ff4d4d', GREEN = '#3ddc84', ORANGE = '#ff6b35';
const FEA_MODEL = '/assets/models/centerstage-offseason-robot/fea-lowside.glb';

// ---- FEA results (fea/r10r, checked by r10rr: 6061-T6 channel, slides out), rounded as on the page
const FEA = {
  torque: 36.3, // N m, both 43 rpm motors at stall (goBILDA: 185 kg.cm each), direct drive
  hold: 190, // MPa von Mises at the side-wall hole, arm held flat (gravity only)
  up: 560, // MPa at the same point, the up preset pressed from rest
  syyUp: 600, syyDown: -570, // MPa along the channel at that point, up start and down start
  yield: 276, // MPa, 6061-T6 typical
  fatigue: 97, // MPa, 6061-T6 fatigue limit, 5e8 reversed cycles
};
const ZC = 0.03225; // the crack's plane across the channel (model frame z; STEP y -32.25 mm)
const HOLE = [-0.048, 0.1502, ZC]; // the side-wall hole where the peak is (model frame)

// TestTeleop.java: power = -kP (target - ticks) + kG cos(angle + 110 deg), angle = -360 ticks / 3895.9
const KP = 0.001, KG = 0.18, TARGET_UP = 50;
const ticksAt = (phi) => 1190.4 - phi * TICKS_PER_DEG;
function control(phi) {
  const t = ticksAt(phi);
  const angle = (-360 * t) / 3895.9;
  const P = -KP * (TARGET_UP - t);
  const Gr = KG * Math.cos((angle + 110) * DEG);
  return { t, P, Gr, out: clamp(P + Gr, -1, 1) };
}
// lever arm from the pivot axis to the claw body's centre, in the arm's own plane (y, z)
const R1 = Math.hypot(CLAW_C[1] - PIVOT[1], CLAW_C[2]); // 1.416 m, slides out
const R0 = Math.hypot(CLAW_C[1] - PIVOT[1], CLAW_C[2] - TRAVEL); // 0.438 m, slides in

const CYCLES = 3; // pivots drawn in step 4
const SWING = 16; // degrees each drawn pivot swings (the real up preset is 105; kept in frame)
const SNAP_P = 0.45; // where in step 5 the channel lets go
const FALL = -2.2; // degrees the broken arm turns about the claw's floor contact
const STUB = 38; // degrees the unloaded stub swings up after the snap

// the state at (step, stepP): arm pitch, extension, stress (k: +1 up start, -1 down start),
// crack length (0..1 of its path), snap (0..1: pieces apart), overlay on, rewind
function state(step, sp, reduced) {
  const m = (a, b) => (reduced ? 1 : smooth(a, b, sp));
  const s = { phi: PHI_FLOOR, e: 1, k: 0, crack: 0, snap: 0, fea: false };
  if (step === 0) return { ...s, phi: lerp(PHI_REST, PHI_UP, m(0.08, 0.9)), e: 0 };
  if (step === 1) return { ...s, phi: lerp(PHI_UP, PHI_REST, m(0.05, 0.4)), e: m(0.45, 0.95) };
  if (step === 2) return { ...s, phi: lerp(PHI_REST, PHI_FLOOR, m(0.05, 0.35)) };
  if (step === 3) return { ...s, fea: true, k: m(0.2, 0.75) };
  if (step === 4) {
    // three pivots: the stress peaks at every start (k = cos psi: +1 at the bottom, -1 at the top)
    const psi = reduced ? 0 : 2 * Math.PI * CYCLES * sp;
    return { ...s, fea: true, phi: PHI_FLOOR + SWING * (1 - Math.cos(psi)) / 2, k: Math.cos(psi), crack: reduced ? 0.7 : 0.7 * smooth(0.02, 0.98, sp) };
  }
  if (step === 5) {
    const snap = reduced ? 1 : smooth(SNAP_P, 0.8, sp);
    return { ...s, fea: true, crack: reduced ? 1 : lerp(0.7, 1, smooth(0.15, SNAP_P, sp)), snap, k: 1 - (reduced ? 1 : smooth(SNAP_P, 0.56, sp)),
      phi: PHI_FLOOR + STUB * (reduced ? 1 : smooth(SNAP_P, 0.95, sp)) };
  }
  // step 6: rewind (pieces back together, crack gone), then the interlock: slides in, then pivot
  const back = reduced ? 1 : smooth(0.02, 0.3, sp);
  const inn = m(0.36, 0.62), up = m(0.68, 0.96);
  return { ...s, fea: back < 1, crack: 1 - back, snap: 1 - back, phi: back < 1 ? PHI_FLOOR + STUB * (1 - back) : lerp(PHI_FLOOR, PHI_UP, up), e: 1 - inn };
}
const VIEW = ['sideUp', 'sideAll', 'base', 'base', 'base', 'snap', 'sideAll'];

// the overlay's shader: stress ramp (the FEA figure's), the crack line, the colours only where loaded
function feaMaterial(THREE, uniforms) {
  const mat = new THREE.MeshStandardMaterial({ color: '#c9cac8', metalness: 0.55, roughness: 0.42, flatShading: true,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        attribute float _up; attribute float _down; uniform mat4 uLocal;
        varying float vUp; varying float vDown; varying vec3 vModel;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vUp = _up; vDown = _down; vModel = (uLocal * vec4(position, 1.0)).xyz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uK; uniform float uCrack; uniform float uZc;
        varying float vUp; varying float vDown; varying vec3 vModel;
        vec3 ramp(float v) {
          vec3 c0 = vec3(0.863, 0.863, 0.847), c1 = vec3(0.953, 0.890, 0.639), c2 = vec3(0.965, 0.769, 0.325);
          vec3 c3 = vec3(0.953, 0.573, 0.216), c4 = vec3(0.894, 0.341, 0.180), c5 = vec3(0.784, 0.114, 0.145);
          if (v >= 0.995) return vec3(0.45, 0.02, 0.10);
          float t = clamp(v, 0.0, 1.0) * 5.0;
          if (t < 1.0) return mix(c0, c1, t);
          if (t < 2.0) return mix(c1, c2, t - 1.0);
          if (t < 3.0) return mix(c2, c3, t - 2.0);
          if (t < 4.0) return mix(c3, c4, t - 3.0);
          return mix(c4, c5, t - 4.0);
        }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float sv = abs(uK) * (uK >= 0.0 ? vUp : vDown);
        diffuseColor.rgb = mix(diffuseColor.rgb, ramp(sv), smoothstep(0.03, 0.14, sv));
        // the crack: from the side-wall hole up and down its wall, across the web, up the far wall
        float d = vModel.x < -0.0455 ? abs(vModel.y - 0.1502) : vModel.x > -0.0025 ? 0.056 + (vModel.y - 0.14225) : 0.008 + (vModel.x + 0.048);
        float jag = 0.00035 * sin(vModel.x * 1900.0 + vModel.y * 1300.0) + 0.0002 * sin(vModel.x * 5200.0 - vModel.y * 3100.0);
        float line = 1.0 - smoothstep(0.00028, 0.00062, abs(vModel.z - uZc - jag));
        float grow = 1.0 - smoothstep(uCrack * 0.068 - 0.0015, uCrack * 0.068, d);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.06, 0.035, 0.035), line * grow * step(0.001, uCrack));
        float glow = smoothstep(0.45, 1.0, sv) * (1.0 - line * grow * step(0.001, uCrack));`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += ramp(sv) * 0.55 * glow;`);
  };
  mat.customProgramCacheKey = () => 'rx-fea-lowside';
  return mat;
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const R = await rigRobot(stage);
  const { model, arm } = R;
  const reduced = ctx.reducedMotion;

  // ---- the slide base, split into its CAD bodies by connected component (it is one merged mesh per
  // material): the low-side channel (swapped for the FEA surface while it is loaded), the slide's
  // fixed outer rail and the idlers bolted to the channel past the crack (they fall with the slides),
  // the 1-hole channel (lit in step 2), and the rest (the motor mount, bracket and pulleys that stay)
  R.pose({ phi: 0, e: 1, wrist: 0, grip: [0, 0] });
  model.updateMatrixWorld(true);
  const toModel = new THREE.Matrix4();
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const within = (b, x0, x1, y0, y1, z0, z1, t = 0.0006) => b.min.x > x0 - t && b.max.x < x1 + t && b.min.y > y0 - t && b.max.y < y1 + t && b.min.z > z0 - t && b.max.z < z1 + t;
  function classOf(b) {
    // the rail first (its top face touches the channel's web), then anything inside the channel's
    // bounds is the channel (its mesh comes in several pieces: web, walls, hole walls)
    const c = b.getCenter(new THREE.Vector3());
    if (within(b, -0.0455, -0.0185, 0.1337, 0.14226, 0.0242, 0.36026, 0.0002)) return 'rail';
    if (within(b, -0.048, 0, 0.14225, 0.15425, -0.02375, 0.36025, 0.0003)) return 'low';
    if (within(b, -0.048, 0, 0.09425, 0.14225, -0.02425, 0.02375) && b.max.x - b.min.x > 0.04) return 'one';
    if (c.z > 0.04 && c.x < -0.048) return 'idl';
    return 'base';
  }
  const sub = { low: [], rail: [], one: [], idl: [], base: [] };
  const baseMeshes = [];
  for (const node of R.part('G_SLIDE_BASE')) node.traverse((o) => { if (o.isMesh && o.geometry.index) baseMeshes.push(o); });
  for (const mesh of baseMeshes) {
    {
      const g = mesh.geometry, pos = g.getAttribute('position'), idx = g.index.array;
      toModel.multiplyMatrices(inv, mesh.matrixWorld);
      // union-find over shared vertices
      const par = new Int32Array(pos.count); for (let i = 0; i < par.length; i++) par[i] = i;
      const find = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
      for (let t = 0; t < idx.length; t += 3) {
        const a = find(idx[t]), b = find(idx[t + 1]), c = find(idx[t + 2]);
        if (a !== b) par[b] = a; const a2 = find(a); if (a2 !== c) par[c] = a2;
      }
      const boxes = new Map(), v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        const r = find(i); v.fromBufferAttribute(pos, i).applyMatrix4(toModel);
        if (!boxes.has(r)) boxes.set(r, new THREE.Box3()); boxes.get(r).expandByPoint(v);
      }
      const cls = new Map(); for (const [r, b] of boxes) cls.set(r, classOf(b));
      const lists = { low: [], rail: [], one: [], idl: [], base: [] };
      for (let t = 0; t < idx.length; t += 3) lists[cls.get(find(idx[t]))].push(idx[t], idx[t + 1], idx[t + 2]);
      for (const [k, list] of Object.entries(lists)) {
        if (!list.length) continue;
        const sg = new THREE.BufferGeometry();
        for (const [n, a] of Object.entries(g.attributes)) sg.setAttribute(n, a);
        sg.setIndex(new THREE.BufferAttribute(pos.count > 65535 ? new Uint32Array(list) : new Uint16Array(list), 1));
        const sm = new THREE.Mesh(sg, mesh.material);
        sm.name = `${mesh.name}-${k}`; sm.castShadow = mesh.castShadow; sm.receiveShadow = mesh.receiveShadow;
        sm.position.copy(mesh.position); sm.quaternion.copy(mesh.quaternion); sm.scale.copy(mesh.scale);
        mesh.parent.add(sm); sub[k].push(sm);
      }
      mesh.visible = false;
    }
  }

  // ---- the FEA surface of the low-side channel, twice (the two sides of the break), in the arm's frame
  const uni = { uK: { value: 0 }, uCrack: { value: 0 }, uZc: { value: ZC }, uLocal: { value: new THREE.Matrix4() } };
  const feaRoot = await stage.load(FEA_MODEL, { add: false });
  let feaMesh = null; feaRoot.traverse((o) => { if (o.isMesh) feaMesh = o; });
  // the mesh's own transform (its quantization scale and offset) up to the file's root: the model frame
  feaRoot.updateMatrixWorld(true);
  uni.uLocal.value.copy(feaRoot.matrixWorld).invert().multiply(feaMesh.matrixWorld);
  const feaMat = [feaMaterial(THREE, uni), feaMaterial(THREE, uni)];
  const planes = [new THREE.Plane(), new THREE.Plane()];
  feaMat.forEach((mt, i) => { mt.clippingPlanes = [planes[i]]; });
  const feaCopy = feaRoot.clone(true); // cloned before either is moved into the arm's frame
  const pieces = [0, 1].map((i) => {
    const r = i === 0 ? feaRoot : feaCopy;
    r.traverse((o) => { if (o.isMesh) { o.material = feaMat[i]; o.castShadow = true; o.receiveShadow = true; } });
    r.userData.rxNoClip = true; r.visible = false;
    model.add(r); arm.attach(r); return r;
  });
  stage.renderer.localClippingEnabled = true;

  // ---- the part that falls when the channel snaps: slides, carriages, claw, outer rail, idlers, far piece
  const hinge = new THREE.Group(); hinge.name = 'rig-snap'; hinge.matrixAutoUpdate = false;
  arm.add(hinge);
  for (const o of [...R.stages, ...R.cars, R.claw, ...sub.rail, ...sub.idl, pieces[1]]) hinge.attach(o);
  // the claw's floor contact at the down preset: the broken arm turns about it
  R.pose({ phi: PHI_FLOOR, e: 1, wrist: 0, grip: [0, 0] });
  model.updateMatrixWorld(true);
  const cb = new THREE.Box3().setFromObject(R.claw);
  const hingePt = model.worldToLocal(new THREE.Vector3(0, cb.min.y, (cb.min.z + cb.max.z) / 2));
  const Mx = (deg) => new THREE.Matrix4().makeRotationX(deg * DEG);
  const Tv = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
  const piv = new THREE.Vector3(...PIVOT);
  function setSnap(amount, phi) {
    if (amount <= 0) { if (!hinge.matrix.equals(new THREE.Matrix4())) { hinge.matrix.identity(); hinge.matrixWorldNeedsUpdate = true; } return; }
    // outboard child c (arm frame) -> model: F(pivot + R(-phiSnap) c); the arm group is at R(-phi)
    const h = hingePt, th = FALL * amount;
    const m = Mx(phi).multiply(Tv(h.x - piv.x, h.y - piv.y, h.z - piv.z)).multiply(Mx(th)).multiply(Tv(piv.x - h.x, piv.y - h.y, piv.z - h.z)).multiply(Mx(-PHI_FLOOR));
    hinge.matrix.copy(m); hinge.matrixWorldNeedsUpdate = true;
  }

  const belts = R.part('G_BELT_EXT');
  R.pose({ phi: PHI_REST, e: 0, wrist: 0, grip: [0, 0] });
  model.updateMatrixWorld(true);
  stage.fitGround();

  // ---- views, framed once at rest
  const boxOf = (x0, x1, y0, y1, z0, z1) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.updateMatrixWorld(true); return b;
  };
  const place = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    // keyed on the camera's own aspect, the one stage.frame fits to (the stage updates it from a
    // ResizeObserver, a moment after the element changes size)
    const a = stage.camera.aspect;
    if (views && a === aspect) return views;
    aspect = a;
    const portrait = a < 0.9, narrow = el.clientWidth < 600;
    const fr = (obj, azimuth, elevation, pad) => place(stage.frame(obj, { azimuth, elevation, pad, apply: false, refresh: true }));
    views = {
      // from the robot's left (-X): the arm reaches to the right, away from the step cards
      sideUp: fr(boxOf(-0.24, 0.19, FLOOR, 0.62, -0.3, 0.55), -90, 8, narrow ? 1.2 : 1.1),
      sideAll: fr(boxOf(-0.24, 0.19, FLOOR, 0.62, -0.3, 1.5), -90, 14, portrait ? 1.0 : 1.04),
      // the pivot and the first 12 cm of the slides, from the left, in front and above
      base: fr(boxOf(-0.065, 0.0, 0.12, 0.185, -0.025, 0.09), -90, 40, portrait ? 1.25 : 1.1),
      // the robot and the first 70 cm of the slides, for the snap
      snap: fr(boxOf(-0.24, 0.19, FLOOR, 0.36, -0.2, 0.42), -90, 12, portrait ? 1.1 : 1.08),
    };
    return views;
  }
  const sph = new THREE.Spherical();
  function mix(a, b, k) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    return { t: a.t.clone().lerp(b.t, k), s: new THREE.Spherical(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k) };
  }
  function apply(v) {
    sph.copy(v.s);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sph).add(v.t), target: v.t });
  }

  // ---- lever-arm lines: annotations drawn just outside the robot's -x side, over the model
  const LX = -0.26;
  const lineMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
  const mkLine = (color, opacity) => {
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, lineMat(color, opacity)); l.renderOrder = 10; l.frustumCulled = false; l.visible = false;
    model.add(l); return l;
  };
  const lineIn = mkLine('#e8e2da', 0.9), lineOut = mkLine(ORANGE, 1);
  const setLine = (l, a, b) => { const p = l.geometry.attributes.position; p.setXYZ(0, ...a); p.setXYZ(1, ...b); p.needsUpdate = true; };
  const clawAt = (phi, e) => {
    const dz = CLAW_C[2] - TRAVEL * (1 - e), dy = CLAW_C[1] - PIVOT[1];
    const c = Math.cos(phi * DEG), s = Math.sin(phi * DEG);
    return [LX, PIVOT[1] + dy * c + dz * s, dz * c - dy * s];
  };

  // ---- overlays: the readouts and labels
  const ov = labelLayer(stage);
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div data-k="ctl">
      <div class="rx-hud-row"><span>From TestTeleop.java</span><b class="num" data-k="tick"></b></div>
      <table class="num"><tbody>
        <tr><td>P term <small>-0.001 x (50 - ticks)</small></td><td data-k="P"></td></tr>
        <tr><td>Gravity term <small>0.18 cos(angle + 110°)</small></td><td data-k="G"></td></tr>
      </tbody></table>
      <div class="rx-hud-mini num" data-k="mini"></div>
      <div class="rx-hud-row rx-hud-big"><span>Motor power</span><b class="num" data-k="out"></b><i><em data-k="outBar"></em></i></div>
    </div>
    <div data-k="lev" style="display:none">
      <div class="rx-hud-row"><span>Claw from the pivot</span><b class="num" data-k="r"></b></div>
      <div class="rx-hud-row rx-hud-big"><span>Torque from the claw</span><b class="num" data-k="tq"></b><i><em data-k="tqBar"></em></i></div>
      <div class="rx-hud-row" style="margin-top:8px"><span>Inertia of the claw</span><b class="num" data-k="in"></b><i><em data-k="inBar"></em></i></div>
    </div>
    <div data-k="fea" style="display:none">
      <div class="rx-hud-row"><span>Both motors</span><b class="num" data-k="tqm"></b><i><em data-k="tqmBar"></em></i></div>
      <div class="rx-hud-row rx-hud-big"><span data-k="sLbl">Stress at the hole</span><b class="num" data-k="st"></b><i><em data-k="stBar"></em></i></div>
      <div class="rx-hud-row" data-k="sfRow"><span data-k="sfLbl">Safety factor on yield</span><b class="num" data-k="sf"></b></div>
      <div class="rx-hud-mini rx-hud-x" data-k="feaNote">FEA of my CAD, 6061-T6 yield 276 MPa. The crack and snap are an illustration.</div>
    </div>
    <div data-k="lock" style="display:none">
      <div class="rx-hud-row"><span>Slides out</span><b class="num" data-k="ext"></b></div>
      <div class="rx-hud-row rx-hud-big"><span data-k="lockTxt"></span><b data-k="lockDot" style="display:inline-block;width:14px;height:14px;border-radius:50%"></b></div>
    </div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { K[k].textContent = t; shown[k] = t; } };
  const css = (k, prop, v) => { const id = `${k}.${prop}`; if (shown[id] !== v) { K[k].style[prop] = v; shown[id] = v; } };
  const bar = (k, f) => css(k, 'width', `${(clamp(f, 0, 1) * 100).toFixed(1)}%`);
  const sgn = (v) => `${v < 0 ? '-' : '+'}${Math.abs(v).toFixed(3)}`;
  const LBL = {
    r0: ov.label('', [0, 0, 0], { color: '#e8e2da' }),
    r1: ov.label('', [0, 0, 0], { color: ORANGE, side: 'l' }),
    low: ov.label('Low-side U-channel', [0, 0, 0], { color: '#ffb000', side: 'l' }),
    one: ov.label('1-hole U-channel', [0, 0, 0], { color: '#9fd3ff' }),
    piv: ov.label('72 mm U-channel, driven by both motor hubs', [0, 0, 0], { color: ORANGE }),
    crack: ov.label('Cracked here', [0, 0, 0], { color: RED, side: 'l' }),
  };
  LBL.r0.setText(`Slides in: ${R0.toFixed(2)} m`);
  // label points in the arm's frame (model frame at pitch 0, minus the pivot)
  const armPts = {
    low: new THREE.Vector3(0, 0.1543, 0.075), one: new THREE.Vector3(-0.048, 0.125, -0.012),
    piv: new THREE.Vector3(-0.048, 0.075, -0.012), crack: new THREE.Vector3(...HOLE),
  };
  const tmp = new THREE.Vector3();
  const atArm = (p, obj = arm) => obj.localToWorld(tmp.copy(p).sub(piv)).clone(); // label points are in world metres

  let lit = 0, unlit = null;
  function setLit(want) {
    if (want === lit) return;
    lit = want;
    unlit?.(); unlit = null;
    if (lit > 0) {
      const offs = [
        stage.highlight(sub.low, '#ffb000', { intensity: 0.5 * lit }),
        stage.highlight(sub.one, '#4aa3ff', { intensity: 0.45 * lit }),
        stage.highlight(R.part('G_PIVOT_CH'), ORANGE, { intensity: 0.5 * lit }),
      ];
      unlit = () => offs.forEach((f) => f());
    }
  }
  // steps 2 to 5: the robot's left side cut away just outside the channel (keeps x > -0.075 m), so
  // the low-side channel's left wall, where it cracked, shows; the cut slides in and out
  let cut = null;
  function setCut(amount) {
    if (amount <= 0.001) { if (cut) cut.enable(false); return; }
    if (!cut) cut = stage.sectionPlane([1, 0, 0], 0.3);
    cut.enable(true);
    cut.set(lerp(0.3, 0.075, amount));
  }
  let feaOn = null;
  function setFea(on) {
    if (on === feaOn) return;
    feaOn = on;
    for (const p of pieces) p.visible = on;
    for (const m of sub.low) m.visible = !on;
    stage.invalidate();
  }
  // the two clip planes at the crack plane, following each piece (piece 0 keeps the pivot side)
  const pn = new THREE.Vector3(), pp = new THREE.Vector3(), nm = new THREE.Matrix3();
  function setPlanes() {
    [arm, hinge].forEach((obj, i) => {
      obj.updateMatrixWorld(true);
      // the plane z = ZC in the model frame at pitch 0 is z' = ZC - pivot.z in the arm's frame
      pp.set(0, 0, ZC - piv.z).applyMatrix4(obj.matrixWorld);
      nm.getNormalMatrix(obj.matrixWorld);
      pn.set(0, 0, i === 0 ? -1 : 1).applyMatrix3(nm).normalize();
      planes[i].setFromNormalAndCoplanarPoint(pn, pp);
    });
  }

  function setProgress(p, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, 6);
    const s = state(step, stepP, reduced);
    R.pose({ phi: s.phi, e: s.e, wrist: 0, grip: [0, 0] });
    setSnap(s.snap, s.phi);
    // the belt runs from the motor on the pivot out along the slides: it goes when the channel snaps
    const beltOn = s.e > 0.97 && s.snap <= 0;
    for (const b of belts) if (b.visible !== beltOn) { b.visible = beltOn; stage.invalidate(); }
    const vs = viewsNow();
    const k = step === 0 || reduced ? 1 : blendIn(stepP);
    let v = mix(vs[VIEW[Math.max(0, step - 1)]], vs[VIEW[step]], k);
    if (step === 6) v = mix(v, vs.sideUp, reduced ? 1 : smooth(0.62, 0.8, stepP));
    apply(v);
    stage.setShift(...ctx.shift());

    // stress overlay and crack
    setFea(!!s.fea);
    if (s.fea) {
      if (uni.uK.value !== s.k || uni.uCrack.value !== s.crack) { uni.uK.value = s.k; uni.uCrack.value = s.crack; stage.invalidate(); }
      setPlanes();
    }

    // which readout shows
    const mode = step === 0 ? 'ctl' : step === 1 ? 'lev' : step >= 3 && step <= 5 ? 'fea' : step === 6 ? (stepP > 0.3 ? 'lock' : 'fea') : '';
    for (const m of ['ctl', 'lev', 'fea', 'lock']) css(m, 'display', mode === m ? '' : 'none');
    hud.style.display = mode ? '' : 'none';
    if (mode === 'ctl') {
      const c = control(s.phi);
      put('tick', `${Math.round(c.t)} ticks, target 50`);
      put('P', sgn(c.P)); put('G', sgn(c.Gr));
      put('out', sgn(c.out)); bar('outBar', Math.abs(c.out));
      put('mini', `P ${sgn(c.P)}, gravity ${sgn(c.Gr)}`);
    }
    const r = Math.hypot(CLAW_C[1] - PIVOT[1], CLAW_C[2] - TRAVEL * (1 - s.e));
    if (mode === 'lev') {
      put('r', `${r.toFixed(2)} m`);
      put('tq', `${(r / R0).toFixed(1)}x`); bar('tqBar', r / R1);
      put('in', `${((r / R0) ** 2).toFixed(1)}x`); bar('inBar', (r / R1) ** 2);
    }
    if (mode === 'fea') {
      const kk = s.k, sig = kk >= 0 ? FEA.syyUp * kk : -FEA.syyDown * kk; // along the channel: + tension, - compression
      const tq = FEA.torque * kk;
      put('tqm', `${tq < -0.05 ? '-' : ''}${Math.abs(tq).toFixed(1)} N·m`); bar('tqmBar', Math.abs(kk));
      const vmv = Math.abs(kk) * FEA.up;
      if (step === 4) {
        put('sLbl', 'Stress along the channel'); put('st', `${sig < -0.5 ? '-' : sig > 0.5 ? '+' : ''}${Math.abs(sig).toFixed(0)} MPa`);
        put('sfLbl', 'Fatigue limit, 6061-T6'); put('sf', `${FEA.fatigue} MPa`);
      } else {
        put('sLbl', 'Von Mises at the hole'); put('st', `${vmv.toFixed(0)} MPa`);
        put('sfLbl', 'Safety factor on yield');
        put('sf', s.snap > 0 ? 'snapped' : vmv > 20 ? (FEA.yield / vmv).toFixed(2) : '');
      }
      const mag = Math.abs(step === 4 ? sig : vmv);
      bar('stBar', mag / (FEA.syyUp * 1.05));
      css('stBar', 'background', mag > FEA.yield ? RED : '');
    }
    if (mode === 'lock') {
      const locked = s.e > 0.02;
      put('ext', `${Math.round(s.e * TRAVEL * 1000)} mm`);
      put('lockTxt', locked ? 'Slides out: pivot locked' : 'Slides in: pivot free');
      css('lockDot', 'background', locked ? RED : GREEN);
    }

    // lever-arm lines, step 1 only
    const showLines = step === 1 ? (reduced ? 1 : smooth(0.3, 0.5, stepP)) : 0;
    lineIn.visible = lineOut.visible = showLines > 0;
    if (showLines > 0) {
      const pv = [LX, PIVOT[1], PIVOT[2]];
      setLine(lineIn, pv, clawAt(s.phi, 0));
      setLine(lineOut, pv, clawAt(s.phi, s.e));
      lineIn.material.opacity = 0.9 * showLines; lineOut.material.opacity = showLines;
      stage.invalidate();
    }
    const c0 = clawAt(s.phi, 0), c1 = clawAt(s.phi, s.e);
    LBL.r0.p.set(...c0); LBL.r1.p.set(c1[0], c1[1] + 0.08, c1[2]);
    const t1 = s.e > 0.98 ? `Slides out: ${r.toFixed(2)} m, 3.2x the torque` : `${r.toFixed(2)} m`;
    if (LBL.r1.t !== t1) { LBL.r1.t = t1; LBL.r1.setText(t1); }
    LBL.r0.a = showLines * (s.e > 0.12 ? 1 : 0);
    LBL.r1.a = showLines;

    // step 2: the load path lit and named; the crack's place named from step 2 to the snap
    const path = step === 2 ? (reduced ? 1 : smooth(0.3, 0.55, stepP)) : step === 3 ? 1 - (reduced ? 1 : smooth(0.05, 0.3, stepP)) : 0;
    setLit(Math.round(10 * path) / 10);
    for (const key of ['low', 'one', 'piv']) { LBL[key].p.copy(atArm(armPts[key])); LBL[key].a = path; }
    LBL.crack.p.copy(atArm(armPts.crack));
    LBL.crack.a = step === 2 ? (reduced ? 1 : smooth(0.55, 0.75, stepP)) : step === 3 || step === 4 ? 1 : step === 5 ? 1 - (reduced ? 1 : smooth(0.1, 0.3, stepP)) : 0;
    const cutA = step === 2 ? (reduced ? 1 : smooth(0.05, 0.4, stepP)) : step >= 3 && step <= 5 ? 1 : step === 6 ? 1 - (reduced ? 1 : smooth(0.05, 0.3, stepP)) : 0;
    setCut(cutA);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { unlit?.(); ov.dispose(); stage.dispose(); } };
}
