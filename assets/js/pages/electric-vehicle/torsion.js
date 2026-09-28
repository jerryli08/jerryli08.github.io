// The torsion FEA, re-run, scroll-driven: the chassis twists as the reader scrolls, first the G10
// lattice plate from the final CAD, then a solid plate of the same outline at the same twist.
// The fields come from torsion.json, computed offline: a Kirchhoff plate model (ACM rectangles,
// 1 mm elements) of one main plate, rasterised from the plate's top face in the CAD. The plate is
// held where the pillow blocks and their beams bolt through it (x 127.7 to 138.7 mm either side,
// +-28 mm about each axle line): the rear pair is fixed and the front pair turns 1 degree about the
// car's long axis. Assumed material (typical datasheet values, not measured): G10, E = 18 GPa,
// nu = 0.12, isotropic, 1.5 mm thick. Everything is linear, so the fields scale with the twist.
// The bending and the front axle's tilt are drawn 3x so the twist reads; the readouts are not scaled.
// The real plate meshes are bent by the solved deflection w(x, z) and coloured by the surface
// bending stress; the solid comparison plate is generated from the plate's outline and labelled.
// Steps: 0 at rest, 1 the lattice twists to 4 degrees, 2 the solid plate at the same twist, 3 the
// lattice twists back through zero to -4 degrees (the other front wheel). Every picture is a pure
// function of (step, stepP); the view is framed once, at rest.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { M, AXES, TRACK, partsOf, blendViews, hud, clamp, smooth, lerp } from './rig.js';

const SMAX = 6; // MPa at the top of the colour scale
const EXAG = 3; // deflection and axle tilt drawn 3x (the numbers are not)
const TW = 4; // degrees of twist the scroll reaches
const DEG = Math.PI / 180;
const STOPS = [[0, [0.14, 0.15, 0.17]], [0.22, [0.2, 0.4, 0.85]], [0.6, [1, 0.42, 0.21]], [1, [1, 0.9, 0.66]]];
const cmap = (t) => {
  t = Math.min(1, Math.max(0, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i], k = (t - a) / (b - a);
      return ca.map((v, j) => v + (cb[j] - v) * k);
    }
  }
  return STOPS[STOPS.length - 1][1];
};
const b64 = (s, T) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new T(u.buffer); };

// the twist (degrees) and how much of the solid plate shows (0..1), from the scroll
function stateAt(step, sp, reduced) {
  const t = reduced ? 1 : sp;
  if (step <= 0) return { deg: 0, solid: 0 };
  if (step === 1) return { deg: TW * smooth(0.08, 0.8, t), solid: 0 };
  if (step === 2) return { deg: TW, solid: reduced ? 1 : smooth(0.05, 0.45, t) };
  return { deg: TW * (1 - 2 * smooth(0.15, 0.85, t)), solid: reduced ? 0 : 1 - smooth(0, 0.3, t) };
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const blend = blendViews(stage);
  const [model, data] = await Promise.all([
    stage.load(`${M}/final.glb`),
    fetch(ctx.asset(`${M}/torsion.json`)).then((r) => { if (!r.ok) throw new Error(`torsion.json ${r.status}`); return r.json(); }),
  ]);
  const parts = partsOf(stage, model);

  // decode the fields: w (mm at 1 degree) on a 4 mm node grid, stress (MPa at 1 degree) on 2 mm cells
  const F = {};
  for (const [name, c] of Object.entries(data.cases)) {
    F[name] = {
      w: { ...c.w, a: b64(c.w.data, Int16Array), k: c.w.scale / 32767 },
      s: { ...c.vm, a: b64(c.vm.data, Uint8Array), k: c.vm.scale / 255 },
      torque: c.torque, area: c.area_cm2, peak: c.vmPeak,
    };
  }
  const wAt = (f, x, z) => { // bilinear, mm
    const g = f.w, fx = Math.min(g.nx - 1.001, Math.max(0, (x - data.x0) / g.step)), fz = Math.min(g.nz - 1.001, Math.max(0, (z - data.z0) / g.step));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, a = g.a, n = g.nx;
    return ((a[j * n + i] * (1 - u) + a[j * n + i + 1] * u) * (1 - v) + (a[(j + 1) * n + i] * (1 - u) + a[(j + 1) * n + i + 1] * u) * v) * g.k;
  };

  // only the plates and the two axle assemblies stay; nothing else is part of the plate model
  const onAxles = [...parts.axles, ...parts.wheels, ...parts.hubs, ...parts.collars, ...parts.pulleys, ...parts.spacers, ...parts.gear48];
  const keep = new Set([...parts.plates, ...onAxles]);
  for (const c of model.children) c.visible = keep.has(c);
  const front = stage.pivot(onAxles.filter((o) => stage.bounds(o).center.z < 0), AXES.front, [0, 0, 1]);

  // stress colour textures (one per case), repainted when the twist changes
  const tex = {};
  for (const [name, f] of Object.entries(F)) {
    const t = new THREE.DataTexture(new Uint8Array(f.s.nx * f.s.nz * 4), f.s.nx, f.s.nz, THREE.RGBAFormat);
    t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.generateMipmaps = false;
    tex[name] = t;
  }
  const paint = (name, deg) => {
    const f = F[name].s, t = tex[name], px = t.image.data, a = Math.abs(deg);
    for (let i = 0; i < f.a.length; i++) {
      const c = cmap((f.a[i] * f.k * a) / SMAX);
      px[i * 4] = c[0] * 255; px[i * 4 + 1] = c[1] * 255; px[i * 4 + 2] = c[2] * 255; px[i * 4 + 3] = 255;
    }
    t.needsUpdate = true;
  };
  const uvOf = (name, x, z) => { const s = F[name].s; return [(x - data.x0) / (s.nx * s.step), (z - data.z0) / (s.nz * s.step)]; };
  const mats = {};
  for (const name of Object.keys(F)) mats[name] = new THREE.MeshStandardMaterial({ map: tex[name], roughness: 0.5, metalness: 0, side: THREE.DoubleSide, alphaHash: true });

  // the real plates from the CAD: copy their vertices so they can bend
  const bendables = [];
  const addBendable = (mesh, name, worldIsLocal) => {
    mesh.updateWorldMatrix(true, false);
    const src = mesh.geometry, pos = src.attributes.position, n = pos.count;
    const base = new Float32Array(n * 3), world = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    const v = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, i); base.set([v.x, v.y, v.z], i * 3);
      if (!worldIsLocal) v.applyMatrix4(mesh.matrixWorld);
      world.set([v.x, v.y, v.z], i * 3);
      uv.set(uvOf(name, v.x * 1000, v.z * 1000), i * 2);
    }
    const geo = new THREE.BufferGeometry();
    const live = new THREE.BufferAttribute(base.slice(), 3);
    geo.setAttribute('position', live);
    if (src.attributes.normal) geo.setAttribute('normal', src.attributes.normal);
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (src.index) geo.setIndex(src.index);
    mesh.geometry = geo;
    mesh.material = mats[name];
    mesh.frustumCulled = false;
    const inv = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().copy(mesh.matrixWorld).invert());
    const up = worldIsLocal ? [0, 1, 0] : [inv.elements[3], inv.elements[4], inv.elements[5]];
    bendables.push({ mesh, name, base, world, live, up, own: geo });
  };
  for (const p of parts.plates) p.traverse((m) => { if (m.isMesh) addBendable(m, 'lattice', false); });

  // the comparison plate: the same outline, solid (generated; not a CAD part)
  const solidGroup = new THREE.Group();
  solidGroup.name = 'comparison-plate';
  const mkSolid = (y0, y1) => {
    const rows = data.outline, NC = 24, P = [], I = [];
    const face = (pts, w, h) => { // grid of w x h points (row-major), two triangles per cell
      const o = P.length / 3;
      P.push(...pts);
      for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
        const a = o + j * w + i, b = a + 1, c = a + w, d = c + 1;
        I.push(a, c, b, b, c, d);
      }
    };
    for (const y of [y1, y0]) {
      const pts = [];
      for (const [z, lo, hi] of rows) for (let c = 0; c <= NC; c++) pts.push((lo + ((hi - lo) * c) / NC) / 1000, y, z / 1000);
      face(pts, NC + 1, rows.length);
    }
    for (const side of [1, 2]) { // the two long edges
      const pts = [];
      for (const r of rows) pts.push(r[side] / 1000, y1, r[0] / 1000, r[side] / 1000, y0, r[0] / 1000);
      face(pts, 2, rows.length);
    }
    for (const r of [rows[0], rows[rows.length - 1]]) { // the two ends
      const pts = [];
      for (let c = 0; c <= NC; c++) { const x = (r[1] + ((r[2] - r[1]) * c) / NC) / 1000; pts.push(x, y1, r[0] / 1000, x, y0, r[0] / 1000); }
      face(pts, 2, NC + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setIndex(I);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mats.solid);
    mesh.castShadow = mesh.receiveShadow = true;
    solidGroup.add(mesh);
    addBendable(mesh, 'solid', true);
  };
  for (const b of parts.plates.map((p) => stage.bounds(p).box)) mkSolid(b.min.y, b.max.y);
  model.add(solidGroup);
  solidGroup.visible = false;

  // the view, framed once at rest
  let views = null, aspect = 0;
  const framed = [...parts.plates, ...onAxles];
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const V = (o) => stage.frame(framed, { ...o, apply: false, refresh: true });
    views = [V({ azimuth: 205, elevation: 20, pad: 1.28 }), V({ azimuth: 214, elevation: 15, pad: 1.24 })];
    return views;
  }

  // overlays: the readout and the colour scale
  const ov = labelLayer(stage);
  const H = hud(ov.layer, `
    <div class="rx-hud-row"><span data-k="plate"></span></div>
    <table class="num"><tbody>
      <tr><td>Twist <small>drawn 3x larger</small></td><td data-k="deg"></td></tr>
      <tr><td>Torque, one plate</td><td data-k="tq"></td></tr>
      <tr><td>Stiffness, one plate</td><td data-k="k"></td></tr>
      <tr><td>Lattice vs solid</td><td data-k="ratio"></td></tr>
      <tr><td>Same twist as a bump of</td><td data-k="bump"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`);
  const legend = ov.card({ corner: 'br' });
  const grad = STOPS.map(([t, c]) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')}) ${t * 100}%`).join(', ');
  legend.innerHTML = `<div style="font-size:var(--rx-ov-small);letter-spacing:.04em;color:#b8b0a7;margin-bottom:6px">Bending stress at the surface</div>
    <div style="height:10px;border-radius:5px;width:200px;max-width:100%;background:linear-gradient(90deg, ${grad})"></div>
    <div style="display:flex;justify-content:space-between;font-size:var(--rx-ov-small);color:#b8b0a7;margin-top:4px"><span>0</span><span>${SMAX} MPa</span></div>`;
  legend.style.opacity = '1';
  const kL = F.lattice.torque, kS = F.solid.torque;

  const last = { lattice: NaN, solid: NaN };
  function bend(name, deg) {
    if (last[name] === deg) return;
    last[name] = deg;
    const f = F[name];
    for (const b of bendables) {
      if (b.name !== name) continue;
      const a = b.live.array, n = b.base.length / 3;
      for (let i = 0; i < n; i++) {
        const w = (wAt(f, b.world[i * 3] * 1000, b.world[i * 3 + 2] * 1000) * deg * EXAG) / 1000; // m, drawn 3x
        a[i * 3] = b.base[i * 3] + w * b.up[0]; a[i * 3 + 1] = b.base[i * 3 + 1] + w * b.up[1]; a[i * 3 + 2] = b.base[i * 3 + 2] + w * b.up[2];
      }
      b.live.needsUpdate = true;
    }
    paint(name, deg);
    stage.invalidate();
  }
  const shown = { L: -1, S: -1 };
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 3);
    const sp = clamp(stepP, 0, 1);
    const { deg, solid } = stateAt(step, sp, reduced);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const [sx, sy] = ctx.shift();
    stage.setShift(sx, sy - 0.07); // a little down, clear of the readout across the top
    const [a, b] = viewsNow();
    const drift = reduced ? 0 : 5 * DEG * (step + sp);
    stage.setView(step === 0 ? blend(a, a, 0, drift) : blend(a, b, step === 1 ? k : 1, drift));
    // the plates: the lattice from the CAD dissolves into the generated solid plate and back
    const aL = 1 - solid, aS = solid;
    if (aL !== shown.L) { shown.L = aL; mats.lattice.opacity = aL; for (const pl of parts.plates) pl.visible = aL > 0.004; stage.invalidate(); }
    if (aS !== shown.S) { shown.S = aS; mats.solid.opacity = aS; solidGroup.visible = aS > 0.004; stage.invalidate(); }
    if (aL > 0.004) bend('lattice', deg);
    if (aS > 0.004) bend('solid', deg);
    front.setAngle(deg * EXAG * DEG);
    // readout: the plate that shows most
    const f = solid > 0.5 ? F.solid : F.lattice;
    H.put('plate', solid > 0.5 ? 'Comparison plate: my outline, solid. Generated, not a CAD part' : 'My G10 lattice plate, from the CAD');
    H.put('deg', `${deg.toFixed(1)}°`);
    H.put('tq', `${(f.torque * Math.abs(deg)).toFixed(1)} N·mm`);
    H.put('k', `${f.torque.toFixed(1)} N·mm/°`);
    H.put('ratio', `${((100 * kL) / kS).toFixed(0)} %`);
    H.put('bump', `${(TRACK * 1000 * Math.tan(Math.abs(deg) * DEG)).toFixed(1)} mm`);
    H.put('mini', `Twist ${deg.toFixed(1)}°, ${(f.torque * Math.abs(deg)).toFixed(1)} N·mm, ${f.torque.toFixed(1)} N·mm/°`);
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() {
      ov.dispose();
      for (const b of bendables) b.own.dispose();
      Object.values(tex).forEach((x) => x.dispose()); Object.values(mats).forEach((m) => m.dispose());
      stage.dispose();
    },
  };
}
