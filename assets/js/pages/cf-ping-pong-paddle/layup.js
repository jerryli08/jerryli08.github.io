// Scrolly "layup": the wet layup I planned for the carbon fiber paddle, in the mold from my CAD.
// Scrolling keys the two mold blocks together, lays plies of carbon cloth into the cavity and wets
// each one with resin, then the mold gives way to the paddle.
//
// Geometry (GLB frame, metres, Y up), measured from the mold CAD:
//  - the mold is two separate solids: the handle block (x < -25 mm) and the head block
//  - the handle block's two pins (8.8 mm) end at x -39.8 mm; the head block's holes (9.0 mm) start
//    at its end face, x -8.3 mm, and go 13.7 mm deep. Sliding the handle block +45.0 mm along x
//    puts its end face on the head block's and each pin 0.2 mm short of the bottom of its hole.
//  - a ply is the mold's own cavity floor (its up-facing faces 1.6 to 1.8 mm below the parting
//    face, the head and the neck; the deep handle channel is left out) as a thin sheet, stacked
//    0.25 mm apart. The number of plies and their fibre angles are for illustration only.
// The paddle model is not drawn inside the mold (the two files are in different frames and the
// mold's head cavity is smaller than the paddle's head), so the last step crossfades to it.
// Everything is a pure function of (step, stepP); nothing moves on its own.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const MM = 0.001;
const JOIN = 45.0 * MM; // handle block travel along x, from the CAD
const PLY_T = 0.25 * MM; // ply spacing in the stack
const DROP = 40 * MM; // plies come down from this high
const ANGLES = [0, 90, 45, -45]; // weave direction of each ply (illustration)
const TILE = 16 * MM; // one repeat of the weave texture: 8 tows of 2 mm

// When each ply comes down and gets wet, on the global scroll time g = step + stepP (0..5).
// Step 2 lays the first ply, step 3 the other three.
const PLY_T0 = [2.3, 3.03, 3.36, 3.69];
const PLY_DROP = [0.32, 0.17, 0.17, 0.17];
const PLY_WET = [0.26, 0.11, 0.11, 0.11];

// 2x2 twill as a colour map and bump: tows alternate direction on a diagonal staircase
function weaveTexture(THREE) {
  const n = 256, cells = 8, cs = n / cells;
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  const img = g.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const cx = Math.floor(x / cs), cy = Math.floor(y / cs);
    const alongX = ((cx + cy) & 3) < 2;
    const w = ((alongX ? y : x) % cs) / cs;
    const bulge = Math.sin(Math.PI * w);
    const fibre = 0.5 + 0.5 * Math.sin((alongX ? y : x) * 2.1);
    const v = clamp(0.55 * bulge + 0.2 * fibre + (alongX ? 0.25 : 0.08), 0, 1);
    const k = (y * n + x) * 4, b = Math.round(55 + 200 * v);
    img.data[k] = img.data[k + 1] = img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const [mold, paddle] = await Promise.all([
    stage.load('/assets/models/cf-ping-pong-paddle/mold.glb'),
    stage.load('/assets/models/cf-ping-pong-paddle/paddle.glb', { rubber: /rubber/, carbon: /carbon/ }),
  ]);
  const handle = stage.part(/handle_block/, mold)[0];
  const head = stage.part(/head_block/, mold)[0];
  const blade = stage.part(/carbon_blade/, paddle);
  const rubbers = stage.part(/rubber/, paddle);
  const handleX = handle.position.x;

  // every model material gets its own copy that can fade; it is only transparent while it fades
  // (opaque otherwise, so the section cut's caps and the sorting stay clean)
  function fader(objs) {
    const mats = [];
    for (const o of [].concat(objs)) o.traverse((m) => {
      if (!m.isMesh) return;
      m.material = [].concat(m.material).map((x) => { const c = stage.cloneMaterial(x); mats.push(c); return c; });
      if (m.material.length === 1) m.material = m.material[0];
    });
    return { objs: [].concat(objs), mats, f: -1 };
  }
  const fMold = fader(mold), fBlade = fader(blade), fRubber = fader(rubbers);
  function setFade(F, f) {
    if (Math.abs(F.f - f) < 0.002) return;
    F.f = f;
    for (const o of F.objs) o.visible = f > 0.004;
    const tr = f < 0.999;
    for (const m of F.mats) { m.opacity = f; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } }
    stage.invalidate();
  }

  // ------------------------------------------------ plies from the mold's cavity floor
  mold.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(mold.matrixWorld).invert();
  const floor = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  for (const [blk, dx] of [[head, 0], [handle, JOIN]]) blk.traverse((m) => {
    if (!m.isMesh) return;
    const M = new THREE.Matrix4().copy(inv).multiply(m.matrixWorld);
    const pos = m.geometry.attributes.position, idx = m.geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let i = 0; i < count; i += 3) {
      const ia = idx ? idx.getX(i) : i, ib = idx ? idx.getX(i + 1) : i + 1, ic = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, ia).applyMatrix4(M); b.fromBufferAttribute(pos, ib).applyMatrix4(M); c.fromBufferAttribute(pos, ic).applyMatrix4(M);
      n.crossVectors(e1.subVectors(b, a), e2.subVectors(c, a)).normalize();
      const lo = -2.45 * MM, hi = -1.0 * MM;
      if (n.y < 0.9 || [a, b, c].some((p) => p.y < lo || p.y > hi)) continue;
      for (const p of [a, b, c]) floor.push(p.x + dx, p.y, p.z);
    }
  });
  const weave = weaveTexture(THREE);
  const plies = new THREE.Group();
  plies.name = 'plies';
  stage.root.add(plies);
  let minX = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < floor.length; i += 3) { minX = Math.min(minX, floor[i]); maxX = Math.max(maxX, floor[i]); maxZ = Math.max(maxZ, floor[i + 2]); }
  const ov = labelLayer(stage);
  const ply = ANGLES.map((deg, k) => {
    const g = new THREE.BufferGeometry();
    const P = new Float32Array(floor), N = new Float32Array(floor.length), UV = new Float32Array((floor.length / 3) * 2);
    const cs = Math.cos((deg * Math.PI) / 180), sn = Math.sin((deg * Math.PI) / 180);
    for (let i = 0, j = 0; i < P.length; i += 3, j += 2) {
      P[i + 1] += PLY_T * (k + 1);
      N[i + 1] = 1;
      UV[j] = (P[i] * cs + P[i + 2] * sn) / TILE; UV[j + 1] = (-P[i] * sn + P[i + 2] * cs) / TILE;
    }
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#9a9aa0'), map: weave, bumpMap: weave, bumpScale: 0.5,
      roughness: 0.72, metalness: 0, clearcoat: 0, clearcoatRoughness: 0.06, transparent: true, side: THREE.DoubleSide,
    });
    mat.map.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(g, mat);
    mesh.castShadow = true; mesh.receiveShadow = true;
    mesh.visible = false;
    plies.add(mesh);
    // the label rides on the ply, near its far edge
    const anchor = new THREE.Object3D();
    anchor.position.set(minX + (maxX - minX) * (0.55 + 0.1 * k), -2.1 * MM + PLY_T * (k + 1), maxZ - 12 * MM);
    mesh.add(anchor);
    const label = ov.label(`Ply ${k + 1}`, anchor, { color: '#c9c9cf' });
    return { mesh, mat, label, last: '' };
  });
  stage.fitGround();

  // dry cloth is a silvery grey with a soft sheen; wet with resin it goes near black and glossy
  const dry = new THREE.Color('#9a9aa0'), wet = new THREE.Color('#2a2a2e');
  function setPly(k, drop, wetK, show) {
    const p = ply[k];
    const key = `${drop.toFixed(4)}|${wetK.toFixed(4)}|${show}`;
    if (key === p.last) return;
    p.last = key;
    p.mesh.visible = drop > 0.001 && show > 0.004;
    p.mesh.position.y = DROP * (1 - drop);
    p.mat.opacity = Math.min(smooth(0, 0.35, drop), show);
    p.mat.color.copy(dry).lerp(wet, wetK);
    p.mat.roughness = 0.72 - 0.58 * wetK;
    p.mat.clearcoat = wetK;
    p.mat.bumpScale = 0.5 - 0.3 * wetK;
    stage.invalidate();
  }

  // ------------------------------------------------ views, framed once at rest and cached
  let views = null, aspect = 0;
  function frameViews() {
    const moved = handle.position.x;
    handle.position.x = handleX;
    const apart = stage.frame(mold, { azimuth: 25, elevation: 40, pad: 1.08, apply: false, refresh: true });
    handle.position.x = handleX + JOIN;
    const joined = stage.frame(mold, { azimuth: 25, elevation: 40, pad: 1.12, apply: false, refresh: true });
    const cavity = stage.frame(head, { azimuth: 20, elevation: 55, pad: 1.05, apply: false, refresh: true });
    const blade = stage.frame(paddle, { azimuth: 30, elevation: 35, pad: 1.12, apply: false, refresh: true });
    handle.position.x = moved;
    handle.updateMatrixWorld(true);
    return [apart, joined, cavity, cavity, blade];
  }
  function viewsNow() {
    const asp = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || Math.abs(asp - aspect) > 1e-3) { aspect = asp; views = frameViews(); }
    return views;
  }
  const pos = new THREE.Vector3(), tgt = new THREE.Vector3();
  function place(A, B, k) {
    stage.setView({ pos: pos.copy(A.pos).lerp(B.pos, k), target: tgt.copy(A.target).lerp(B.target, k) });
  }

  // ------------------------------------------------ the picture, from the scroll
  let lastJoin = -1, lastCut = -1;
  // keeps y <= constant (model metres): from just above the parting face down to the pin axis
  const CUT_TOP = 1 * MM, PIN_Y = -7.6 * MM;
  const cut = stage.sectionPlane([0, -1, 0], 1, { enabled: false });
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 4);
    stepP = clamp(stepP || 0, 0, 1);
    stage.setShift(...ctx.shift());
    const g = reduced ? step + 0.999 : step + stepP; // reduced motion: each step's end pose, cut between them
    const V = viewsNow();
    place(V[Math.max(0, step - 1)], V[step], step === 0 || reduced ? 1 : smooth(0, 0.45, stepP));

    // the handle block slides onto the head block's pins
    const j = smooth(1.1, 1.8, g);
    if (Math.abs(j - lastJoin) > 1e-5) { lastJoin = j; handle.position.x = handleX + JOIN * j; stage.invalidate(); }

    // the mold and plies give way to the paddle: blade first, then the rubber on both faces
    const out = smooth(4.03, 4.3, g);
    setFade(fMold, 1 - out);
    setFade(fBlade, smooth(4.1, 4.35, g));
    setFade(fRubber, smooth(4.4, 4.62, g));

    // cut open at the pins' centreline while the blocks close, so the pins can be seen going in
    const c = smooth(1.02, 1.2, g) * (1 - smooth(1.86, 1.98, g));
    if (Math.abs(c - lastCut) > 1e-5) {
      lastCut = c;
      if (c > 0.001) { cut.enable(true); cut.set(CUT_TOP + (PIN_Y - CUT_TOP) * c); } else cut.enable(false);
      stage.invalidate();
    }

    for (let k = 0; k < ply.length; k++) {
      const t0 = PLY_T0[k], drop = smooth(t0, t0 + PLY_DROP[k], g);
      const wetK = smooth(t0 + PLY_DROP[k] + 0.02, t0 + PLY_DROP[k] + 0.02 + PLY_WET[k], g);
      setPly(k, drop, wetK, 1 - out);
      const next = k + 1 < ply.length ? PLY_T0[k + 1] : 3.98;
      ply[k].label.a = smooth(t0, t0 + 0.06, g) * (1 - smooth(next, next + 0.05, g));
    }
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); weave.dispose(); for (const p of ply) { p.mesh.geometry.dispose(); p.mat.dispose(); } stage.dispose(); } };
}
