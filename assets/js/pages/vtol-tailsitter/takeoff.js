// "Take-off", scroll-driven: the real tailsitter CAD stands on its tail on a pad, spools up, climbs
// straight up, hovers, pitches over and flies away on its wing. The reader's scroll is the clock.
// It replaces the slider Jerry first asked for ("vertical climb, then the transition to horizontal
// flight at x seconds"); nothing moves unless the page scrolls, and scrolling back flies it backwards.
//
// What is real and what is illustration:
//  - the aircraft, its pitch pivot and the rotation axes of the props, rotors and elevons are the CAD
//    (rig.js)
//  - the flight itself (times, heights, speeds, angles, elevon deflections) is a scripted
//    illustration, not flight data: nothing was built or flown. The HUD and the caption say so.
//  - the prop disc, the propwash column and the span bars are annotations, not parts
// Every picture is a pure function of (step, progress through it).
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadCraft, rig, PROP_R, SPAN } from './rig.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const smoother = (x) => { x = clamp(x, 0, 1); return x * x * x * (x * (x * 6 - 15) + 10); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const ACCENT = '#ff6b35';

// ---------------------------------------------------------------- the scripted flight (sim seconds)
// step boundaries: on the pad, climb, hover, transition, forward flight
const T = [0, 1, 3, 4, 6, 7.5];
const H1 = 1.0, H2 = 1.2; // m: hover height, height after the transition
const V = 1.6; // m/s forward at the end of the transition (slowed down so the camera can follow)
const alt = (t) => (t < 1 ? 0 : t < 3 ? H1 * smoother((t - 1) / 2) : t < 4 ? H1 : t < 6 ? H1 + (H2 - H1) * smoother((t - 4) / 2) : H2);
// forward distance: speed ramps up with a smoothstep over the transition, then holds
const fwd = (t) => {
  if (t < 4) return 0;
  if (t < 6) { const x = (t - 4) / 2; return V * 2 * (x * x * x - (x * x * x * x) / 2); }
  return V + V * (t - 6);
};
const pitch = (t) => (t < 4 ? 90 : t < 6 ? 90 - 80 * smoother((t - 4) / 2) : 10); // deg, nose above the horizon
const spinAt = (t) => smooth(0.05, 0.9, t); // prop speed, 0..1 of full
// elevons (deg, + = trailing edge down): a pitch-over command early in the transition, then a small trim
function elevonAt(t, step, stepP) {
  if (step === 2) return 16 * Math.sin(2 * Math.PI * clamp((stepP - 0.2) / 0.65, 0, 1)); // hover: shows it swinging in the wash
  if (t < 3.9) return 0;
  if (t < 4.4) return 20 * smooth(3.9, 4.4, t);
  if (t < 6) return lerp(20, 3, smooth(4.4, 6, t));
  return 3;
}
const PHASE = (t) => (t < 1 ? 'On the pad, spooling up' : t < 3 ? 'Vertical climb' : t < 4 ? 'Hover' : t < 6 ? 'Transition' : 'Forward flight');
// scroll position (u = step + progress) to sim time: each step plays its stretch of the flight
function timeAt(step, stepP, reduced) {
  const a = T[step], b = T[step + 1];
  if (reduced) return b; // held poses only
  return lerp(a, b, clamp((stepP - 0.04) / 0.88, 0, 1));
}
// prop angle: the integral of prop speed over the scroll, tabulated once (a pure function of u)
const TURNS = 5; // prop turns per step of scrolling at full speed (the picture is slowed down)
const N = 1000, U = 5, table = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) {
  const u = ((i - 0.5) / N) * U, s = Math.min(4, Math.floor(u));
  table[i] = table[i - 1] + spinAt(timeAt(s, u - s, false)) * (U / N) * TURNS * 2 * Math.PI;
}
const angleAt = (u) => { const x = clamp(u / U, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return lerp(table[i], table[i + 1], x - i); };

// camera per step: which pose it was framed in, from where, and what it frames
const VIEWS = [
  { theta: 90, focus: null, azimuth: 330, elevation: 13, pad: 1.7 },    // on the pad
  { theta: 90, focus: null, azimuth: 315, elevation: 26, pad: 2.5 },    // climbing: wide, the ground below
  { theta: 90, focus: 'close', azimuth: 22, elevation: 8, pad: 1.75 },  // hover: the right prop and elevon
  { theta: 50, focus: null, azimuth: 100, elevation: 10, pad: 2.3 },    // pitching over, seen side on
  { theta: 10, focus: null, azimuth: 148, elevation: 20, pad: 2.1 },    // flying away
];

// a faint ground grid that fades out around the aircraft (an annotation for motion, not terrain)
const gridVS = 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const gridFS = `uniform vec3 uC; uniform float uR; varying vec3 vW;
float grid(vec2 p, float s) { vec2 q = p / s; vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q); return 1.0 - min(min(g.x, g.y), 1.0); }
void main() {
  float d = length(vW.xz - uC.xz);
  float fade = 1.0 - smoothstep(uR * 0.25, uR, d);
  float a = (grid(vW.xz, 0.25) * 0.09 + grid(vW.xz, 1.0) * 0.2) * fade;
  gl_FragColor = vec4(0.93, 0.9, 0.86, a);
}`;

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const craft = await loadCraft(stage, { add: false });
  const { model, parts } = craft;

  // the aircraft hangs from its pitch point (the middle of its length) inside `body`
  const body = new THREE.Group(); body.name = 'aircraft';
  stage.root.add(body);
  body.add(model);
  model.position.set(0, 0, 0.00906); // the model's bounding-box centre (nose -88 mm, tail +69.9 mm) at the pivot
  const pv = rig(stage, craft);

  // Counter-rotating props (Jerry, Sept 27). Both shafts run along the model's z (rig.js). The CAD
  // puts the same DALPROP T3045 on both motors, one hand: measured on its blades, each section's
  // leading edge (the end nearer the nose) is at the smaller angle about +z, so it pulls the
  // aircraft forward when it turns the negative way about +z. The right prop keeps that part and
  // that direction. The left prop is drawn as its mirror image, the opposite-hand prop, mirrored in
  // the plane through its own shaft axis, and turns the positive way: it still pushes air back over
  // the wing, and the two reaction torques cancel.
  const mirrorL = new THREE.Group(); mirrorL.name = 'prop_L, opposite hand';
  mirrorL.scale.x = -1; // pv.spinL's origin is on the left shaft axis, its x the model's x
  pv.spinL.add(mirrorL);
  for (const p of parts.propL) mirrorL.add(p); // local transforms kept, so mirrored about the shaft axis
  const SPIN = { R: -1, L: 1 };

  // hover pose on the pad: where the tail touches the ground
  body.rotation.x = 90 * DEG;
  body.updateMatrixWorld(true);
  const onPad = -stage.bounds(model, true).box.min.y;
  const REF = new THREE.Vector3(0, onPad, 0); // the aircraft's pivot on the pad: views are framed here
  body.position.copy(REF);
  body.updateMatrixWorld(true);
  stage.fitGround(); // ground, key shadow and contact shadow fitted on the pad

  // the elevons get their own materials so they can light up
  const elevMats = [];
  for (const p of [...parts.elevR, ...parts.elevL]) p.traverse((o) => { if (o.isMesh) { o.material = stage.cloneMaterial(o.material); elevMats.push(o.material); } });
  // the prop blades fade toward a disc at speed
  const propMats = new Set();
  // (moulded, so without the printed layer-line detail the stage gives plastics)
  for (const p of [...parts.propR, ...parts.propL]) p.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material = stage.cloneMaterial(o.material);
    m.transparent = true; m.bumpMap = null; m.roughnessMap = null; m.roughness = 0.4; m.needsUpdate = true;
    propMats.add(m);
  });

  // ---------------------------------------------------------------- annotations (not parts)
  const notes = new THREE.Group(); notes.name = 'annotations';
  model.add(notes); // model frame: metres, the CAD's own axes
  const propBox = new THREE.Box3();
  model.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  for (const p of parts.propR) { const b = new THREE.Box3().setFromObject(p).applyMatrix4(inv); propBox.union(b); }
  const propZ = (propBox.min.z + propBox.max.z) / 2;
  const discMat = new THREE.MeshBasicMaterial({ color: '#ffe2c8', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const discGeo = new THREE.CircleGeometry(PROP_R, 64);
  const discs = [0.07676, -0.07674].map((x) => { const d = new THREE.Mesh(discGeo, discMat); d.position.set(x, 0, propZ); notes.add(d); return d; });
  // spin arrows: an arc just outside each prop disc, its head on the side the prop turns toward
  const arrowMat = new THREE.MeshBasicMaterial({ color: '#fff1e2', transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const ARC = 1.3 * Math.PI, AR = PROP_R + 0.0075;
  const arcGeo = new THREE.TorusGeometry(AR, 0.0017, 6, 72, ARC);
  const headGeo = new THREE.ConeGeometry(0.0055, 0.014, 14);
  const spinArrow = (x, sign, a0) => {
    const g = new THREE.Group();
    const arc = new THREE.Mesh(arcGeo, arrowMat); arc.rotation.z = a0; g.add(arc);
    const end = sign > 0 ? a0 + ARC : a0;
    const head = new THREE.Mesh(headGeo, arrowMat);
    head.position.set(AR * Math.cos(end), AR * Math.sin(end), 0);
    head.rotation.z = end + (sign > 0 ? 0 : Math.PI); // the cone's +y turned onto the direction of travel
    g.add(head);
    g.position.set(x, 0, propZ - 0.002);
    notes.add(g);
    return g;
  };
  // mirror images of each other: both heads on the outboard side
  const arrows = [spinArrow(0.07676, SPIN.R, 0), spinArrow(-0.07674, SPIN.L, Math.PI - ARC)];
  // the column of air the right prop pushes back over its elevon
  const washLen = 0.095 - propZ;
  const washMat = new THREE.MeshBasicMaterial({ color: '#9fd0ff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const wash = new THREE.Mesh(new THREE.CylinderGeometry(PROP_R, PROP_R, washLen, 48, 1, true), washMat);
  wash.rotation.x = Math.PI / 2; wash.position.set(0.07676, 0, propZ + washLen / 2);
  notes.add(wash);
  // span bars just behind the trailing edge: the prop disc (blue) and the elevon (orange), right side
  const bar = (x0, x1, z, color) => {
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
    const g = new THREE.Group();
    const len = x1 - x0, t = 0.0014;
    const main = new THREE.Mesh(new THREE.BoxGeometry(len, t, t), m); main.position.set((x0 + x1) / 2, 0, z);
    const tick = new THREE.BoxGeometry(t, 0.012, t);
    const a = new THREE.Mesh(tick, m); a.position.set(x0, 0, z);
    const b = new THREE.Mesh(tick, m); b.position.set(x1, 0, z);
    g.add(main, a, b); notes.add(g);
    m.userData.group = g;
    return m;
  };
  const barDisc = bar(SPAN.discIn, SPAN.discOut, SPAN.tail + 0.012, '#9fd0ff');
  const barElev = bar(SPAN.elevonIn, SPAN.elevonOut, SPAN.tail + 0.024, ACCENT);
  // anchors that labels follow
  const anchor = (x, y, z) => { const o = new THREE.Object3D(); o.position.set(x, y, z); notes.add(o); return o; };
  const A = {
    tail: anchor(0.03, 0, SPAN.tail),
    disc: anchor(SPAN.discIn, 0, SPAN.tail + 0.012),
    elev: anchor(SPAN.elevonOut, 0, SPAN.tail + 0.024),
    elevTE: anchor(0.09, 0, 0.066),
    wing: anchor(-0.15, 0, -0.01),
  };

  // the pad, the grid and the flight path, on the ground (world)
  const world = new THREE.Group(); world.name = 'ground marks';
  stage.scene.add(world);
  const ringMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.145, 0.152, 96), ringMat);
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.0005; world.add(ring);
  const gridMat = new THREE.ShaderMaterial({ vertexShader: gridVS, fragmentShader: gridFS, transparent: true, depthWrite: false, uniforms: { uC: { value: new THREE.Vector3() }, uR: { value: 3.2 } } });
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), gridMat);
  grid.rotation.x = -Math.PI / 2; grid.renderOrder = -2; world.add(grid);
  const NP = 240;
  const path = new Float32Array(NP * 3);
  for (let i = 0; i < NP; i++) { const t = (i / (NP - 1)) * T[5]; path[i * 3] = 0; path[i * 3 + 1] = onPad + alt(t); path[i * 3 + 2] = -fwd(t); }
  const pathGeo = new THREE.BufferGeometry(); pathGeo.setAttribute('position', new THREE.BufferAttribute(path, 3));
  const trail = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false }));
  trail.frustumCulled = false; world.add(trail);
  const shadowMat = stage.ground.material, shadowBase = shadowMat.opacity;
  const contactMat = stage.ground.children[0]?.material, contactBase = contactMat?.opacity ?? 0;

  // ---------------------------------------------------------------- the aircraft at time t
  const setDeg = (p, d) => p.setAngle(d * DEG);
  let posed = '';
  function pose(t, elevDeg, spin) {
    const key = `${t.toFixed(5)}|${elevDeg.toFixed(3)}|${spin.toFixed(4)}`;
    if (key === posed) return;
    posed = key;
    body.rotation.x = pitch(t) * DEG;
    body.position.set(0, onPad + alt(t), -fwd(t));
    setDeg(pv.elevR, elevDeg); setDeg(pv.elevL, elevDeg);
    pv.spinR.setAngle(SPIN.R * spin); pv.spinL.setAngle(SPIN.L * spin); // counter-rotating
    stage.invalidate();
  }

  // views, framed once with the aircraft at rest at the pad, cached per stage shape
  const sph = (v, ref) => { const t = v.target.clone().sub(ref); const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t, s }; };
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const keep = { rx: body.rotation.x, pos: body.position.clone(), eR: pv.elevR.angle, eL: pv.elevL.angle, sR: pv.spinR.angle, sL: pv.spinL.angle };
    notes.visible = false;
    pv.elevR.setAngle(0); pv.elevL.setAngle(0); pv.spinR.setAngle(0); pv.spinL.setAngle(0);
    views = VIEWS.map((v) => {
      body.rotation.x = v.theta * DEG; body.position.copy(REF); body.updateMatrixWorld(true);
      const target = v.focus === 'close' ? [...parts.propR, ...parts.elevR] : model;
      return sph(stage.frame(target, { azimuth: v.azimuth, elevation: v.elevation, pad: v.pad, apply: false, refresh: true }), REF);
    });
    body.rotation.x = keep.rx; body.position.copy(keep.pos);
    pv.elevR.setAngle(keep.eR); pv.elevL.setAngle(keep.eL); pv.spinR.setAngle(keep.sR); pv.spinL.setAngle(keep.sL);
    notes.visible = true;
    body.updateMatrixWorld(true);
    return views;
  }
  const sp = new THREE.Spherical(), camPos = new THREE.Vector3(), camTarget = new THREE.Vector3();
  function place(a, b, k, follow) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    camTarget.copy(a.t).lerp(b.t, k).add(REF).add(follow);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    camPos.setFromSpherical(sp).add(camTarget);
    stage.setView({ pos: camPos, target: camTarget });
  }

  // ---------------------------------------------------------------- labels and the readout
  const ov = labelLayer(stage);
  const L = {
    tail: ov.label('Stands on its flat tail: fin tips and wing root', [0, 0, 0], { color: '#fff1e2', minW: 560 }),
    disc: ov.label('Prop disc: 76 mm', [0, 0, 0], { color: '#9fd0ff', side: 'l' }),
    elev: ov.label('Elevon: 90 mm', [0, 0, 0], { color: ACCENT }),
    te: ov.label('Elevons: trailing edge down', [0, 0, 0], { color: ACCENT, minW: 560 }),
  };
  const labelAt = { tail: A.tail, disc: A.disc, elev: A.elev, te: A.elevTE };
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  ov.layer.append(hud);
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Illustrative flight, not data</span><b data-k="phase"></b></div>
    <div class="rx-hud-row rx-hud-big"><span>Time</span><b class="num" data-k="t"></b><i><em data-k="tBar"></em></i></div>
    <table class="num"><tbody>
      <tr><td>Transition starts</td><td>4.0 s</td></tr>
      <tr><td>Pitch <small>nose above the horizon</small></td><td data-k="pitch"></td></tr>
      <tr><td>Elevons <small>+ is trailing edge down</small></td><td data-k="elev"></td></tr>
      <tr><td>Props <small>share of full speed</small></td><td data-k="spin"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  const barW = (k, f) => { const w = `${(f * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } };

  const follow = new THREE.Vector3(), wp = new THREE.Vector3();
  let lastNote = '';
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, VIEWS.length - 1);
    stepP = clamp(stepP, 0, 1);
    const phone = el.clientWidth < 640;
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, phone ? -0.07 : sy);
    const t = timeAt(step, stepP, reduced);
    const u = step + stepP;
    const s = spinAt(t);
    const e = reduced ? (step === 3 ? 20 : step === 4 ? 3 : 0) : elevonAt(t, step, stepP);
    pose(t, e, reduced ? 0 : angleAt(u));
    // the camera: blend the step's cached view in from the last one, riding along with the aircraft
    const v = viewsNow();
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    follow.set(0, alt(t), -fwd(t));
    place(v[prev], v[step], k, follow);
    // blades fade toward a disc at speed
    const blur = reduced ? 0 : smooth(0.35, 1, s);
    for (const m of propMats) { const o = 1 - 0.72 * blur; if (m.opacity !== o) { m.opacity = o; m.depthWrite = o > 0.95; } }
    discMat.opacity = 0.2 * blur;
    for (const d of discs) d.visible = discMat.opacity > 0.005;
    // the spin arrows: from spool-up until the pitch-over starts
    arrowMat.opacity = 0.9 * smooth(0.25, 0.7, s) * (1 - smooth(4.1, 4.6, t));
    for (const a of arrows) a.visible = arrowMat.opacity > 0.005;
    // hover close-up: the wash and the span bars
    const close = step === 2 ? k : step === 3 ? 1 - smooth(0, 0.3, stepP) : 0;
    washMat.opacity = 0.12 * close; wash.visible = close > 0.01;
    for (const m of [barDisc, barElev]) { m.opacity = 0.9 * close; m.userData.group.visible = close > 0.01; }
    // the elevons light up while they are the subject
    const lit = close * 0.6 + (step === 3 ? (1 - smooth(0.6, 1, stepP)) * smooth(0, 0.2, stepP) * 0.6 : 0);
    for (const m of elevMats) m.emissive.set(ACCENT).multiplyScalar(0.42 * lit);
    // shadows fade as it leaves the ground (the stage's ground was fitted on the pad)
    const low = 1 - smooth(0.02, 0.3, alt(t));
    shadowMat.opacity = shadowBase * low;
    if (contactMat) contactMat.opacity = contactBase * low;
    gridMat.uniforms.uC.value.set(0, 0, -fwd(t));
    // the path flown so far
    trail.geometry.setDrawRange(0, Math.max(0, Math.round((t / T[5]) * (NP - 1)) + 1));
    trail.visible = t > 1.02;
    // labels
    body.updateMatrixWorld(true);
    for (const [name, a] of Object.entries(labelAt)) L[name].p.copy(a.getWorldPosition(wp));
    L.tail.a = step === 0 ? 1 - smooth(0.55, 0.9, stepP) : 0;
    L.disc.a = step === 2 ? smooth(0.35, 0.6, k) : 0;
    L.elev.a = step === 2 ? smooth(0.35, 0.6, k) : 0;
    L.te.a = step === 3 ? smooth(0.05, 0.2, stepP) * (1 - smooth(0.55, 0.75, stepP)) : 0;
    // the readout
    put('phase', PHASE(t));
    put('t', `${t.toFixed(1)} s`); barW('tBar', t / T[5]);
    put('pitch', `${Math.round(pitch(t))}°`);
    put('elev', `${e >= 0.5 ? '+' : ''}${Math.round(e)}°`);
    put('spin', `${Math.round(s * 100)} %`);
    const note = `${t.toFixed(1)} s, pitch ${Math.round(pitch(t))}°`;
    if (note !== lastNote) { put('mini', note); lastNote = note; }
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } }; // the stage frees everything in its scene
}
