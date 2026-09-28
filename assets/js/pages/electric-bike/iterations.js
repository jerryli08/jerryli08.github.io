// "Iteration: the chain idler": my two CAD versions, turned by the scroll, with the V1 idler flange
// folding under the chain load in the "idler mount bent" step (Jerry asked for that animation, Sept 27).
//
// It works like the built-in @turntable (same `data.models` and per-step `view`s: version, focus,
// azimuth, elevation, pad, labels), plus a `bend` step: the reader scrolls and the load on the upper
// jockey climbs to its full-torque value; once the folding moment passes what starts to yield the
// flange, the part of the flange beyond its press-brake bend turns about the bend axis, and both
// jockeys, their shoulder screws and spacers ride with it.
//
// What is real and what is drawn:
//  - the shapes are the real V1 CAD; the flange mesh is only turned about its bend (vertices past the
//    bend's tangent line turn rigidly, the ones on the bend's arc by their share of the arc)
//  - the bend axis, its radii and the flange zone are measured from the V1 STEP (OCP, notes in
//    /home/claude/work/ebike/r3/idler-calc-notes.md): axis along (0.276, 0, 0.961) through
//    (54.3, 30.7, -178.3) mm, STEP frame (x to the rear wheel, y to the drive side, z up)
//  - the load numbers are the page's calculation (#idler-load): 100 N·m at the sprocket (stated),
//    2,460 N of chain pull, 4,300 N on the upper jockey along 28.8 deg in the chain plane, 32 N·m
//    folding the flange; it starts to yield at 18 N·m (57 N·m at the sprocket) and folds over at
//    27 N·m (85 N·m)
//  - the fold angle is illustrative and drawn larger than life (FOLD below); the real angle was not
//    measured. The direction is the one the load turns it (the flange tip swings to the drive side)
//  - the chain is not in the CAD: its pitch line is drawn in (level top run from the rear cog, 122 deg
//    around the 11T upper jockey, the internal tangent to the 20T sprocket, over the sprocket's top)
// Every picture is a pure function of (step, stepP); nothing moves on its own.
import { createStage, cad } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { blendIn, smoother } from '/assets/js/lib/ease.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const rx = (s) => (s instanceof RegExp ? s : s ? new RegExp(s, 'i') : null);
const DEG = Math.PI / 180;
const FINISH_FIELDS = ['carbon', 'rubber', 'printed', 'moulded', 'smooth', 'anodized', 'metal', 'plain'];

// ---- the V1 idler, in STEP millimetres (measured from the V1 STEP)
const BEND_P = [54.3, 30.7, -178.3];
const BEND_W = [0.276, 0, 0.961];
const INTO_FLANGE = [-0.961, 0, 0.276]; // in the flange plane, at right angles to the bend, away from it
const R_IN = 4.0, R_OUT = 8.75; // bend radii
const W_RANGE = [-188.3, -124.5]; // the bend's length, as p · w
const FLANGE_BOX = { x: [-16.5, 64], y: [34.0, 40.3], z: [-210, -140] }; // the flat jockey flange
const JOCKEY_UP = [45.89, 47.5, -153.17]; // upper jockey centre (in the chain plane, y 47.5)
const JOCKEY_R = 22.54; // 11T, 1/2 in pitch
const SPROCKET = [8.285, 47.5, -94.54], SPROCKET_R = 40.59; // 20T, 1/2 in pitch
const F_DIR = [0.876, 0, 0.482]; // load on the upper jockey, 28.8 deg above +x in the chain plane
// ---- the load (the page's calculation)
const PEAK = 100, PULL = 2460, LOAD = 4300, MOMENT = 31.7, YIELD = 18.1, FOLDOVER = 27.2;
const FOLD = 12 * DEG; // illustrative: drawn larger than life
const MOVING = /Jockey_Wheel|91273A403|uxcell_Steel_Spacer_6_2mm_Bore_x_15mm_OD_x_4mm_Length_1[23]/;

export async function mount(el, ctx) {
  const d = ctx.data || {};
  const defs = d.models || [];
  const steps = Array.isArray(d.steps) && d.steps.length ? d.steps : [{}];
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const ov = labelLayer(stage);
  const bendStep = steps.findIndex((s) => s.bend);
  // the outline of the unbent flange: always drawn on top, faint
  const ghostMat = new THREE.LineBasicMaterial({ color: '#fff1e2', transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false });
  const ghostSkin = new THREE.MeshBasicMaterial({ color: '#fff1e2', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });

  // ---------------------------------------------------------------- models (as @turntable)
  const models = defs.map(() => null);
  const loading = defs.map(() => null);
  let ready = false, lastArgs = [0, 0, 0];
  function get(i) {
    loading[i] ||= (async () => {
      const def = defs[i];
      const fin = { finish: def.finish ?? d.finish };
      for (const f of FINISH_FIELDS) if (def[f]) fin[f] = rx(def[f]);
      const obj = await stage.load(def.src, { add: true, ...fin });
      obj.visible = false;
      const hide = rx(def.hide);
      if (hide) for (const p of stage.part(hide, obj)) p.removeFromParent();
      const mats = [];
      obj.traverse((o) => {
        if (!o.isMesh) return;
        o.material = [].concat(o.material).map((m) => { const c = stage.cloneMaterial(m); mats.push(c); return c; });
        if (o.material.length === 1) o.material = o.material[0];
      });
      const ghosts = new Set();
      const ghost = rx(def.ghost);
      if (ghost) for (const p of stage.part(ghost, obj)) p.traverse((o) => { if (o.isMesh) [].concat(o.material).forEach((m) => ghosts.add(m)); });
      for (const m of mats) {
        if (ghosts.has(m)) { m.transparent = true; m.depthWrite = false; m.userData.base = 0.28; }
        else { m.alphaHash = true; m.userData.base = 1; }
        m.needsUpdate = true;
      }
      for (const h of def.highlight || []) {
        const c = new THREE.Color(h.color || '#ff6b35').multiplyScalar(h.intensity ?? 0.5);
        for (const p of stage.part(rx(h.parts), obj)) p.traverse((o) => { if (o.isMesh) for (const m of [].concat(o.material)) if (m.emissive) { m.emissive.copy(c); m.userData.tint = c.clone(); } });
      }
      stage.fitGround();
      const m = { obj, mats, fade: -1, fold: null };
      if (def.bend) m.fold = rigFold(obj);
      models[i] = m;
      views.clear();
      if (ready) setProgress(...lastArgs);
      return m;
    })();
    return loading[i];
  }
  function setFade(i, f) {
    const m = models[i];
    if (!m || Math.abs(m.fade - f) < 0.002) return;
    m.fade = f;
    m.obj.visible = f > 0.004;
    for (const x of m.mats) x.opacity = x.userData.base * f;
    stage.invalidate();
  }

  // ---------------------------------------------------------------- the fold (V1 only)
  const v3 = (a) => new THREE.Vector3(...a);
  const P = (a) => v3(cad.point(a)), D = (a) => v3(cad.dir(a)).normalize();
  function rigFold(obj) {
    obj.updateWorldMatrix(true, true);
    const toModel = new THREE.Matrix4().copy(obj.matrixWorld).invert();
    const Am = P(BEND_P), Wm = D(BEND_W);
    // the flange mesh: every vertex gets its share of the fold (0 on the web, 1 past the bend)
    const meshes = [];
    for (const part of stage.part(/seat_tube_mount/, obj)) part.traverse((o) => { if (o.isMesh) meshes.push(o); });
    const bent = [], ghosts = [];
    const wS = v3(BEND_W).normalize(), uS = v3(INTO_FLANGE).normalize(), aS = v3(BEND_P);
    const q = new THREE.Vector3(), s = new THREE.Vector3(), dS = new THREE.Vector3();
    for (const mesh of meshes) {
      const g = mesh.geometry;
      const pos = g.attributes.position, nrm = g.attributes.normal;
      const n = pos.count;
      const M = new THREE.Matrix4().multiplyMatrices(toModel, mesh.matrixWorld); // mesh -> model
      const Minv = M.clone().invert();
      const share = new Float32Array(n);
      let any = 0;
      for (let i = 0; i < n; i++) {
        q.fromBufferAttribute(pos, i).applyMatrix4(M); // model metres, Y up
        s.set(q.x * 1000, -q.z * 1000, q.y * 1000); // STEP mm
        dS.copy(s).sub(aS);
        const a = dS.dot(uS), b = dS.y, w = s.dot(wS);
        const inFlange = s.x >= FLANGE_BOX.x[0] && s.x <= FLANGE_BOX.x[1] && s.y >= FLANGE_BOX.y[0] && s.y <= FLANGE_BOX.y[1] && s.z >= FLANGE_BOX.z[0] && s.z <= FLANGE_BOX.z[1];
        const r = Math.hypot(a, b);
        if (inFlange && a >= -0.05) share[i] = 1;
        else if (a < 0 && b > 0 && r >= R_IN - 0.5 && r <= R_OUT + 0.75 && w >= W_RANGE[0] - 1.2 && w <= W_RANGE[1] + 1.2) share[i] = 1 - Math.atan2(-a, b) / (Math.PI / 2);
        if (share[i] > 0) any++;
      }
      if (!any) continue;
      // float copies the fold can write into (the file's are quantized)
      const p0 = new Float32Array(n * 3), n0 = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { p0[3 * i] = pos.getX(i); p0[3 * i + 1] = pos.getY(i); p0[3 * i + 2] = pos.getZ(i); }
      if (nrm) for (let i = 0; i < n; i++) { n0[3 * i] = nrm.getX(i); n0[3 * i + 1] = nrm.getY(i); n0[3 * i + 2] = nrm.getZ(i); }
      const posA = new THREE.BufferAttribute(p0.slice(), 3), nrmA = nrm ? new THREE.BufferAttribute(n0.slice(), 3) : null;
      g.setAttribute('position', posA);
      if (nrmA) g.setAttribute('normal', nrmA);
      const idx = [];
      for (let i = 0; i < n; i++) if (share[i] > 0) idx.push(i);
      // the bend axis in the mesh's own frame (uniform scale, so angles carry over)
      const aL = Am.clone().applyMatrix4(Minv), wL = Wm.clone().transformDirection(Minv);
      bent.push({ g, posA, nrmA, p0, n0, share, idx: Int32Array.from(idx), aL, wL });
      // a faint outline of the flange where it was, so the fold reads against it
      const tri = [], ix = g.index;
      const nt = ix ? ix.count / 3 : n / 3;
      for (let t = 0; t < nt; t++) {
        const a0 = ix ? ix.getX(3 * t) : 3 * t, a1 = ix ? ix.getX(3 * t + 1) : 3 * t + 1, a2 = ix ? ix.getX(3 * t + 2) : 3 * t + 2;
        if (share[a0] > 0 && share[a1] > 0 && share[a2] > 0) tri.push(a0, a1, a2);
      }
      const shell = new THREE.BufferGeometry();
      shell.setAttribute('position', new THREE.BufferAttribute(p0.slice(), 3));
      shell.setIndex(tri);
      const line = new THREE.LineSegments(new THREE.EdgesGeometry(shell, 25), ghostMat);
      const skin = new THREE.Mesh(shell, ghostSkin); // hidden where the real flange still covers it
      for (const o of [line, skin]) { o.renderOrder = 19; o.raycast = () => {}; o.castShadow = false; o.receiveShadow = false; mesh.add(o); ghosts.push(o); }
    }
    // the jockeys, their shoulder screws and spacers turn with the flange as one
    const moving = stage.part(MOVING, obj);
    const pivot = moving.length ? stage.pivot(moving, Am.toArray(), Wm.toArray()) : null;
    let angle = 0;
    const qr = new THREE.Quaternion(), t = new THREE.Vector3();
    return {
      axis: { p: Am, w: Wm },
      angle: () => angle,
      set(a) {
        if (Math.abs(a - angle) < 1e-5) return;
        angle = a;
        for (const b of bent) {
          const P0 = b.p0, N0 = b.n0, pa = b.posA.array, na = b.nrmA && b.nrmA.array;
          for (const i of b.idx) {
            qr.setFromAxisAngle(b.wL, -a * b.share[i]);
            t.set(P0[3 * i], P0[3 * i + 1], P0[3 * i + 2]).sub(b.aL).applyQuaternion(qr).add(b.aL);
            pa[3 * i] = t.x; pa[3 * i + 1] = t.y; pa[3 * i + 2] = t.z;
            if (na) { t.set(N0[3 * i], N0[3 * i + 1], N0[3 * i + 2]).applyQuaternion(qr); na[3 * i] = t.x; na[3 * i + 1] = t.y; na[3 * i + 2] = t.z; }
          }
          b.posA.needsUpdate = true;
          if (b.nrmA) b.nrmA.needsUpdate = true;
          b.g.computeBoundingSphere();
        }
        if (pivot) pivot.setAngle(-a);
        for (const l of ghosts) l.visible = a > 1e-4;
        stage.invalidate();
      },
    };
  }
  // where a point of the V1 model that rides with the flange ends up, in model metres
  const turned = (m, stepPoint, a) => {
    const p = P(stepPoint);
    if (!m.fold || !a) return p;
    return p.sub(m.fold.axis.p).applyAxisAngle(m.fold.axis.w, -a).add(m.fold.axis.p);
  };

  // ---------------------------------------------------------------- load arrow, chain line, readout
  const overlay = new THREE.Group();
  overlay.visible = false;
  stage.scene.add(overlay); // not a model: kept out of the ground fit and the framing
  stage.noClip([overlay]);
  const onTop = (color, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false, toneMapped: false });
  const arrowMat = onTop('#ffcf4a'), chainMat = onTop('#e9e2d8', 0.9);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 1, 12), arrowMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.0048, 0.013, 18), arrowMat);
  const arrow = new THREE.Group();
  arrow.add(shaft, head);
  const chain = new THREE.Mesh(new THREE.BufferGeometry(), chainMat);
  for (const o of [shaft, head, chain]) { o.renderOrder = 20; o.castShadow = false; o.receiveShadow = false; }
  overlay.add(arrow, chain);
  // the bend line the flange folds about (its axis, the length of the bend): a thin rod on top
  const hingeMat = onTop('#ffb08a');
  const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.0009, 1, 10), hingeMat);
  hinge.renderOrder = 21;
  overlay.add(hinge);
  let hingeSet = false;
  function placeHinge(m) {
    if (hingeSet) return;
    hingeSet = true;
    const w = v3(BEND_W).normalize(), a = v3(BEND_P), mid = (W_RANGE[0] + W_RANGE[1]) / 2 - a.dot(w), half = (W_RANGE[1] - W_RANGE[0]) / 2;
    const [e0, e1] = [-half, half].map((t) => world(m, P(a.clone().addScaledVector(w, mid + t).toArray())));
    hinge.position.copy(e0).lerp(e1, 0.5);
    hinge.scale.set(1, e0.distanceTo(e1), 1);
    hinge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e1.clone().sub(e0).normalize());
  }
  const loadLabel = ov.label('', [0, 0, 0], { color: '#ffcf4a' }); // follows the arrow's tip
  const fDir = new THREE.Vector3();
  const yAxis = new THREE.Vector3(0, 1, 0);
  // model metres to the scene (the models sit in stage.root)
  const world = (m, p) => p.applyMatrix4(m.obj.matrixWorld);
  function placeArrow(m, from, len) {
    m.obj.updateWorldMatrix(true, false);
    fDir.copy(D(F_DIR)).transformDirection(m.obj.matrixWorld);
    world(m, from);
    const L = Math.max(0.0001, len);
    const hl = Math.min(0.013, L * 0.45);
    shaft.scale.set(1, Math.max(0.0001, L - hl), 1);
    shaft.position.set(0, (L - hl) / 2, 0);
    head.scale.setScalar(hl / 0.013);
    head.position.set(0, L - hl / 2, 0);
    arrow.position.copy(from);
    arrow.quaternion.setFromUnitVectors(yAxis, fDir);
    loadLabel.p.copy(from).addScaledVector(fDir, L + 0.006);
  }
  // the chain's pitch line in the chain plane (STEP x, z at y = 47.5), from the rear cog forward;
  // `ride` is how much a point follows the fold (1 on the jockey, 0 on the sprocket and the far run)
  function chainPoints(m, a) {
    const J = JOCKEY_UP, S = SPROCKET, pts = [];
    for (let i = 0; i <= 8; i++) pts.push({ x: J[0] + 110 * (1 - i / 8), z: J[2] - JOCKEY_R, ride: i / 8 });
    let dep = null;
    for (let i = 1; i <= 18; i++) {
      const f = (-90 - (122.3 * i) / 18) * DEG;
      dep = { x: J[0] + JOCKEY_R * Math.cos(f), z: J[2] + JOCKEY_R * Math.sin(f), ride: 1 };
      pts.push(dep);
    }
    const s0 = Math.atan2(-0.53, 0.848); // tangent point on the sprocket, seen from its centre
    const t0 = { x: S[0] + SPROCKET_R * Math.cos(s0), z: S[2] + SPROCKET_R * Math.sin(s0) };
    for (let i = 1; i < 10; i++) pts.push({ x: lerp(dep.x, t0.x, i / 10), z: lerp(dep.z, t0.z, i / 10), ride: 1 - i / 10 });
    for (let i = 0; i <= 26; i++) { const f = s0 + (230 * DEG * i) / 26; pts.push({ x: S[0] + SPROCKET_R * Math.cos(f), z: S[2] + SPROCKET_R * Math.sin(f), ride: 0 }); }
    return pts.map((q) => {
      const fixed = P([q.x, J[1], q.z]);
      const p = q.ride ? fixed.clone().lerp(turned(m, [q.x, J[1], q.z], a), q.ride) : fixed;
      return world(m, p);
    });
  }
  let chainKey = '';
  function setChain(m, a) {
    const key = a.toFixed(5);
    if (key === chainKey) return;
    chainKey = key;
    const curve = new THREE.CatmullRomCurve3(chainPoints(m, a), false, 'centripetal');
    const g = new THREE.TubeGeometry(curve, 160, 0.0014, 6, false);
    chain.geometry.dispose();
    chain.geometry = g;
  }

  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.style.opacity = '0';
  hud.style.pointerEvents = 'none';
  ov.layer.append(hud);
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Torque at the sprocket</span><b class="num" data-k="t"></b><i><em data-k="tBar"></em></i></div>
    <table class="num"><tbody>
      <tr class="rx-hud-x"><td>Chain pull</td><td data-k="pull"></td></tr>
      <tr><td>Load on the upper jockey</td><td data-k="load"></td></tr>
      <tr><td>Moment folding the flange <small>yields at 18 N·m, folds over at 27</small></td><td data-k="m"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span data-k="state"></span></div>
    <p class="rx-hud-x" style="margin:8px 0 0;font-size:var(--rx-ov-small);color:var(--muted)">Fold drawn larger than life. The chain is drawn in; it is not in my CAD.</p>`;
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  const num = (v, step = 10) => (Math.round(v / step) * step).toLocaleString('en-US');
  function readout(tau) {
    const T = PEAK * tau, Mo = MOMENT * tau;
    put('t', `${Math.round(T)} N·m`);
    const w = `${(tau * 100).toFixed(1)}%`;
    if (shown.tBar !== w) { K.tBar.style.width = w; shown.tBar = w; }
    put('pull', `${num(PULL * tau)} N`);
    put('load', `${num(LOAD * tau)} N`);
    put('m', `${Mo.toFixed(0)} N·m`);
    put('mini', `Upper jockey ${num(LOAD * tau)} N, ${Mo.toFixed(0)} N·m on the bend`);
    put('state', Mo < YIELD ? 'The flange holds' : Mo < FOLDOVER ? 'Past yield: the flange starts to bend' : 'Past its folding moment: it folds over');
    loadLabel.setText(tau > 0.02 ? `${num(LOAD * tau, 100)} N` : '');
  }

  // ---------------------------------------------------------------- views (framed once, at rest)
  const views = new Map();
  let aspect = 0;
  const sph = (v) => { const sp = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), r: sp.radius, phi: sp.phi, theta: sp.theta }; };
  function viewOf(i) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (a !== aspect) { aspect = a; views.clear(); }
    if (views.has(i)) return views.get(i);
    const o = steps[i] || {};
    const version = o.version ?? 0;
    const m = models[version] || models.find(Boolean);
    // framed with the flange at rest
    const V1 = models.find((x) => x && x.fold);
    const was = V1 ? V1.fold.angle() : 0;
    if (was) V1.fold.set(0);
    const focus = rx(o.focus);
    const parts = focus ? stage.part(focus, m.obj) : [];
    const def = defs[version] || {};
    const v = sph(stage.frame(parts.length ? parts : m.obj, {
      azimuth: o.azimuth ?? def.azimuth ?? 35, elevation: o.elevation ?? def.elevation ?? 20, pad: o.pad ?? def.pad ?? 1.1, apply: false, refresh: true,
    }));
    if (was) V1.fold.set(was);
    if (models[version]) views.set(i, v);
    return v;
  }
  const sA = new THREE.Spherical();
  function place(a, b, k, extraTheta = 0) {
    let dT = b.theta - a.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sA.set(lerp(a.r, b.r, k), clamp(lerp(a.phi, b.phi, k), 0.05, Math.PI - 0.05), a.theta + dT * k + extraTheta);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sA).add(target), target });
  }

  // ---------------------------------------------------------------- labels and highlights per step
  const stepLabels = steps.map((s, i) => (s.labels || []).map((l) => ({ def: l, i, el: null })));
  function labelOf(x) {
    if (x.el) return x.el;
    const m = models[steps[x.i].version ?? 0];
    if (!m) return null;
    const target = x.def.part ? stage.part(rx(x.def.part), m.obj)[0] : null;
    x.el = ov.label(x.def.text, target || (x.def.at || [0, 0, 0]), { color: x.def.color, side: x.def.side, minW: x.def.minW });
    return x.el;
  }

  // ---------------------------------------------------------------- the picture, from the scroll
  // the load climbs over the bend step; the fold starts once the moment passes yield
  const tauAt = (stepP) => smoother(0.32, 0.94, stepP);
  const foldAt = (tau) => FOLD * smooth(YIELD / MOMENT, 1, tau);
  function setProgress(p, step, stepP) {
    lastArgs = [p, step, stepP];
    step = clamp(step | 0, 0, steps.length - 1);
    const prev = Math.max(0, step - 1);
    const S = steps[step], Pv = steps[prev];
    const k = step === 0 || reduced ? 1 : blendIn(stepP); // as @turntable: eased over the first 60 %
    const vi = S.version ?? 0, vp = Pv.version ?? 0;
    if (!models[vi]) get(vi);
    if (steps[step + 1] && !models[steps[step + 1].version ?? 0]) get(steps[step + 1].version ?? 0);
    for (let j = 0; j < defs.length; j++) setFade(j, j === vi && j === vp ? 1 : j === vi ? (models[vp] ? k : 1) : j === vp ? (models[vi] ? 1 - k : 1) : 0);
    const drift = (reduced ? 0 : d.drift ?? 14) * DEG;
    place(viewOf(prev), viewOf(step), k, step === 0 ? drift * stepP : lerp(drift, drift * stepP, k));

    // the fold: none before the bend step, climbing through it, held after it
    const tau = bendStep < 0 ? 0 : step < bendStep ? 0 : step === bendStep ? (reduced ? 1 : tauAt(stepP)) : 1;
    const angle = foldAt(tau);
    const V1 = models.find((m) => m && m.fold);
    if (V1) {
      V1.fold.set(angle);
      const go = Math.min(1, angle / (FOLD * 0.25)) * Math.max(0, V1.fade);
      if (Math.abs(0.75 * go - ghostMat.opacity) > 1e-3) { ghostMat.opacity = 0.75 * go; ghostSkin.opacity = 0.2 * go; stage.invalidate(); }
    }
    // arrow, chain and readout: in on the bend step, out as the next one blends in
    const show = bendStep < 0 ? 0 : step === bendStep ? (step === 0 ? 1 : smooth(0.2, 0.6, k)) : step === bendStep + 1 ? 1 - smooth(0, 0.6, k) : 0;
    // on a phone the readout runs across the top of the stage: move the picture down under it
    const [sx, sy] = ctx.shift ? ctx.shift() : [0, 0];
    stage.setShift(sx, sy - (el.clientWidth < 640 ? 0.08 * show : 0));
    overlay.visible = show > 0.01 && !!V1;
    if (overlay.visible) {
      arrowMat.opacity = show; chainMat.opacity = 0.9 * show; hingeMat.opacity = show;
      placeHinge(V1);
      placeArrow(V1, turned(V1, JOCKEY_UP, angle), 0.012 + 0.058 * tau);
      setChain(V1, angle);
      stage.invalidate();
    }
    loadLabel.a = show * smooth(0.02, 0.1, tau);
    const op = show.toFixed(3);
    if (shown.op !== op) { hud.style.opacity = op; shown.op = op; }
    readout(tau);

    stepLabels.forEach((ls, i) => {
      const s = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === prev && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
      for (const x of ls) { const l = s > 0 ? labelOf(x) : x.el; if (l) l.a = s; }
    });
    ov.update();
  }

  const first = steps[0].version ?? 0;
  await get(first);
  ready = true;
  setProgress(0, 0, 0);
  (async () => { for (let i = 0; i < defs.length; i++) if (i !== first) { try { await get(i); } catch (e) { console.warn('iterations: could not load', defs[i].src, e); } } })();
  return {
    setProgress,
    dispose() { ov.dispose(); ghostMat.dispose(); ghostSkin.dispose(); hinge.geometry.dispose(); hingeMat.dispose(); chain.geometry.dispose(); shaft.geometry.dispose(); head.geometry.dispose(); arrowMat.dispose(); chainMat.dispose(); stage.dispose(); },
  };
}
