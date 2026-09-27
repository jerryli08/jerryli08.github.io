// The torsion FEA, re-run: twist the chassis and compare the G10 lattice plate from the final CAD
// with a solid plate of the same outline.
// The fields come from torsion.json, computed offline: a Kirchhoff plate model (ACM rectangles,
// 1 mm elements) of one main plate, rasterised from the plate's top face in the CAD. The plate is
// held where the pillow blocks and their beams bolt through it (x 127.7 to 138.7 mm either side,
// +-28 mm about each axle line): the rear pair is fixed and the front pair turns 1 degree about the
// car's long axis. Assumed material (typical datasheet values, not measured): G10, E = 18 GPa,
// nu = 0.12, isotropic, 1.5 mm thick. Everything is linear, so the fields scale with the twist.
// The bending and the front axle's tilt are drawn 3x so the twist reads; the readouts are not scaled.
// The real plate meshes are bent by the solved deflection w(x, z) and coloured by the surface
// bending stress; the solid comparison plate is generated from the plate's outline and labelled.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, segmented, playToggle, readout } from '/assets/js/lib/ui.js';
import { M, AXES, TRACK, partsOf, chip } from './rig.js';

const SMAX = 6; // MPa at the top of the colour scale
const EXAG = 3; // deflection and axle tilt drawn 3x (the numbers are not)
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

export async function mount(el, ctx) {
  const stage = createStage(el);
  const { THREE } = stage;
  const [model, data] = await Promise.all([
    stage.load(`${M}/final.glb`),
    fetch(ctx.asset(`${M}/torsion.json`)).then((r) => { if (!r.ok) throw new Error(`torsion.json ${r.status}`); return r.json(); }),
  ]);
  const parts = partsOf(stage, model);
  const reduced = ctx.reducedMotion;

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

  // stress colour textures (one per case), rebuilt when the twist changes
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
  for (const name of Object.keys(F)) mats[name] = new THREE.MeshStandardMaterial({ map: tex[name], roughness: 0.5, metalness: 0, side: THREE.DoubleSide });

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
  const plateY = parts.plates.map((p) => stage.bounds(p).box);
  for (const b of plateY) mkSolid(b.min.y, b.max.y);
  model.add(solidGroup);
  solidGroup.visible = false;

  // UI
  const st = { deg: 3, which: 'lattice' };
  const note = chip(el, { left: '14px', top: '14px' });
  const legend = document.createElement('div');
  legend.setAttribute('aria-hidden', 'true');
  const grad = STOPS.map(([t, c]) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')}) ${t * 100}%`).join(', ');
  legend.innerHTML = `<div style="font-size:11.5px;letter-spacing:.04em;color:#b8b0a7;margin-bottom:5px">Bending stress at the surface</div>
    <div style="height:8px;border-radius:4px;background:linear-gradient(90deg, ${grad})"></div>
    <div style="display:flex;justify-content:space-between;font-size:11.5px;color:#b8b0a7;margin-top:4px"><span>0</span><span>${SMAX} MPa</span></div>`;
  Object.assign(legend.style, { position: 'absolute', right: '14px', bottom: '14px', zIndex: '4', width: '170px', padding: '9px 12px', borderRadius: '12px',
    background: 'rgba(10,8,7,.66)', border: '1px solid rgba(255,255,255,.12)', backdropFilter: 'blur(10px)', font: '500 12px/1.3 var(--font, system-ui, sans-serif)' });
  el.append(legend);

  const info = readout(null, { rows: [
    { key: 'tq', label: 'Torque, one plate', unit: 'N·mm', format: (v) => v.toFixed(1) },
    { key: 'k', label: 'Stiffness, one plate', unit: 'N·mm/°', format: (v) => v.toFixed(1) },
    { key: 'ratio', label: 'Lattice vs solid', unit: '%', format: (v) => v.toFixed(0) },
    { key: 'bump', label: 'Same twist as a bump of', unit: 'mm', format: (v) => v.toFixed(1) },
  ] });

  function apply() {
    const f = F[st.which];
    for (const b of bendables) {
      if (b.name !== st.which) continue;
      const a = b.live.array, n = b.base.length / 3;
      for (let i = 0; i < n; i++) {
        const w = (wAt(f, b.world[i * 3] * 1000, b.world[i * 3 + 2] * 1000) * st.deg * EXAG) / 1000; // m, drawn 3x
        a[i * 3] = b.base[i * 3] + w * b.up[0]; a[i * 3 + 1] = b.base[i * 3 + 1] + w * b.up[1]; a[i * 3 + 2] = b.base[i * 3 + 2] + w * b.up[2];
      }
      b.live.needsUpdate = true;
    }
    paint(st.which, st.deg);
    front.setAngle((st.deg * EXAG * Math.PI) / 180);
    for (const p of parts.plates) p.visible = st.which === 'lattice';
    solidGroup.visible = st.which === 'solid';
    note.set(st.which === 'lattice' ? 'My G10 lattice plates, from the CAD. Twist drawn 3x' : 'Comparison plate: my outline, solid. Generated, not a CAD part. Twist drawn 3x');
    const kL = F.lattice.torque, kS = F.solid.torque;
    info.set({ tq: f.torque * Math.abs(st.deg), k: f.torque, ratio: (100 * kL) / kS, bump: TRACK * 1000 * Math.tan((Math.abs(st.deg) * Math.PI) / 180) });
    stage.invalidate();
  }

  segmented(ctx.panel, {
    label: 'Plate', value: 'lattice',
    options: [{ value: 'lattice', label: 'G10 lattice (V2)' }, { value: 'solid', label: 'Solid G10, same outline' }],
    onChange: (v) => { st.which = v; apply(); },
  });
  const tw = slider(ctx.panel, { label: 'Twist', min: -6, max: 6, step: 0.1, value: st.deg, unit: '°', format: (v) => v.toFixed(1), onInput: (v) => { st.deg = v; apply(); } });
  let stop = null, t = Math.asin(st.deg / 5);
  const tog = playToggle(ctx.panel, {
    playing: false, labels: ['Sweep', 'Pause'],
    onChange(on) {
      stop?.(); stop = null;
      if (on && reduced) { tog.set(false, { silent: true }); return; } // reduced motion: the slider only
      if (on) stop = stage.onFrame((dt) => { t += dt * 0.9; tw.set(+(5 * Math.sin(t)).toFixed(2)); });
    },
  });
  ctx.panel.append(info.el);

  apply();
  stage.frame(model, { azimuth: 212, elevation: 16, pad: 0.92 });
  return {
    dispose() {
      stop?.(); note.dispose(); legend.remove();
      for (const b of bendables) b.own.dispose();
      Object.values(tex).forEach((x) => x.dispose()); Object.values(mats).forEach((m) => m.dispose());
      stage.dispose();
    },
  };
}
