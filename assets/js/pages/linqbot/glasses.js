// A model of the AR glasses LinqBot's operator wore: Xreal One Pro with the Xreal Eye camera.
// NOT CAD. Jerry asked for it (Sept 28, 2026: "show the display in a 3D model of AR glasses, not
// just two squares"), so this is a clean procedural model in the product's look: a glossy black
// sunglasses-style front with a thick brow, two large tinted lenses, the small Eye camera module
// at the top of the bridge, open temples and nose pads. Proportions are approximate.
//
// Local frame (metres): the glasses look along +Z (so Object3D.lookAt aims them), +Y up, the
// centre of the front at the origin. The wearer's right is local -X.
//
// Each lens has three layers, drawn in a fixed order: a tint (how dark the glass is), a display
// (what the glasses show; a texture, faded in to go opaque) and a shine (the glass's reflection,
// added on top). setLens({ tint, display }) sets both lenses.
import * as THREE from 'three';

const MM = 0.001;
const WRAP_R = 0.26; // the front curves back around a 260 mm radius: the ends sit about 11 mm back

// ------------------------------------------------------------------ outlines (mm, symmetric in x)
// Outer outline of the front, right half from the top centre round to the nose, [x, y, fillet r]
const OUTER_R = [[0, 22.5, 0], [73, 22, 9], [76, -9, 16], [62, -27.5, 16], [17, -27.5, 12], [8.5, -7, 6], [0, -7.5, 7]];
// Lens opening (right lens, x > 0), [x, y, fillet r]
const HOLE = [[11, 16.5, 6], [66, 16.5, 8], [68, -8.5, 13], [57, -23, 13], [20, -23, 11], [12, -6, 6]];

/** Polygon with a fillet of radius r at each corner, as a list of Vector2 (in metres). */
function fillet(pts, seg = 7) {
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [px, py, r0] = pts[i], [ax, ay] = pts[(i + n - 1) % n], [bx, by] = pts[(i + 1) % n];
    if (!r0) { out.push(new THREE.Vector2(px * MM, py * MM)); continue; }
    const la = Math.hypot(ax - px, ay - py), lb = Math.hypot(bx - px, by - py);
    const ua = [(ax - px) / la, (ay - py) / la], ub = [(bx - px) / lb, (by - py) / lb];
    const cos = Math.max(-1, Math.min(1, ua[0] * ub[0] + ua[1] * ub[1]));
    const half = Math.acos(cos) / 2;
    let t = r0 / Math.tan(half);
    const tMax = 0.48 * Math.min(la, lb);
    const r = t > tMax ? tMax * Math.tan(half) : r0;
    t = Math.min(t, tMax);
    const t1 = [px + ua[0] * t, py + ua[1] * t], t2 = [px + ub[0] * t, py + ub[1] * t];
    const bis = [ua[0] + ub[0], ua[1] + ub[1]], bl = Math.hypot(bis[0], bis[1]) || 1;
    const d = r / Math.sin(half);
    const c = [px + (bis[0] / bl) * d, py + (bis[1] / bl) * d];
    let a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]), a2 = Math.atan2(t2[1] - c[1], t2[0] - c[0]);
    let da = a2 - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= seg; k++) {
      const a = a1 + (da * k) / seg;
      out.push(new THREE.Vector2((c[0] + r * Math.cos(a)) * MM, (c[1] + r * Math.sin(a)) * MM));
    }
  }
  return out;
}
const mirror = (half) => [...half, ...half.slice(1, -1).reverse().map(([x, y, r]) => [-x, y, r])];
const flipX = (pts) => pts.map(([x, y, r]) => [-x, y, r]).reverse();

/** Curve the front back around a vertical axis: z -= x^2 / 2R, normals turned to match. */
function wrap(geo, zOff = 0) {
  const p = geo.attributes.position, nrm = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, p.getZ(i) + zOff - (x * x) / (2 * WRAP_R));
    if (nrm) {
      const f = Math.atan(x / WRAP_R), c = Math.cos(f), s = Math.sin(f);
      const nx = nrm.getX(i), nz = nrm.getZ(i);
      nrm.setXYZ(i, nx * c + nz * s, nrm.getY(i), -nx * s + nz * c);
    }
  }
  p.needsUpdate = true;
  if (nrm) nrm.needsUpdate = true;
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}
export const wrapZ = (x) => -(x * x) / (2 * WRAP_R);

/** Planar UVs over the lens, mirrored so the picture reads right way round from the wearer's side. */
function lensUV(geo, box) {
  const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (box.max.x - p.getX(i)) / (box.max.x - box.min.x);
    uv[i * 2 + 1] = (p.getY(i) - box.min.y) / (box.max.y - box.min.y);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** A soft diagonal highlight, the reflection of a window in glossy glass (added on top of the lens). */
function streak() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 128, 128, 0);
  gr.addColorStop(0, '#000'); gr.addColorStop(0.3, '#050505'); gr.addColorStop(0.42, '#3a3a3a'); gr.addColorStop(0.5, '#141414');
  gr.addColorStop(0.58, '#262626'); gr.addColorStop(0.66, '#050505'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeGlasses() {
  const group = new THREE.Group();
  group.name = 'xreal-one-pro-model';

  // glossy black shell: a clear coat over a near-black base, as on the real frames
  const shell = new THREE.MeshPhysicalMaterial({ color: '#161619', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 2.2 });
  const satin = new THREE.MeshPhysicalMaterial({ color: '#232327', roughness: 0.5, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25 });
  const pad = new THREE.MeshPhysicalMaterial({ color: '#8a8c92', roughness: 0.4, metalness: 0, transparent: true, opacity: 0.45, depthWrite: false });
  const ring = new THREE.MeshStandardMaterial({ color: '#8b8d92', roughness: 0.35, metalness: 1 });
  const camGlass = new THREE.MeshPhysicalMaterial({ color: '#05070c', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.6, iridescenceIOR: 1.6, envMapIntensity: 2 });

  // ---------------------------------------------------------------- front
  const outer = new THREE.Shape(fillet(mirror(OUTER_R)));
  const holeR = fillet(HOLE), holeL = fillet(flipX(HOLE));
  outer.holes.push(new THREE.Path(holeR), new THREE.Path(holeL));
  const DEPTH = 6 * MM, BEV = 1.1 * MM;
  const frontGeo = new THREE.ExtrudeGeometry(outer, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEV, bevelSize: 1.0 * MM, bevelSegments: 4, curveSegments: 8 });
  frontGeo.translate(0, 0, -DEPTH); // front face at z = 0 (+ the bevel), back face at z = -6 mm
  wrap(frontGeo);
  const front = new THREE.Mesh(frontGeo, shell);
  front.name = 'front';
  group.add(front);

  // ---------------------------------------------------------------- lenses: tint, display, shine
  const tint = new THREE.MeshBasicMaterial({ color: '#06080b', transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide });
  const display = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  // the coated glass: reflections only (added on top), with the faint colour shift of an anti-reflection coating
  const shine = new THREE.MeshPhysicalMaterial({ color: '#000000', roughness: 0.05, metalness: 0, envMapIntensity: 6, iridescence: 0.4, iridescenceIOR: 1.35, iridescenceThicknessRange: [240, 480],
    emissive: '#ffffff', emissiveMap: streak(), emissiveIntensity: 0.3, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const LZ = -1.8 * MM; // the glass sits just behind the front face
  const lenses = [];
  for (const [side, pts] of [['right', holeL], ['left', holeR]]) { // the wearer's right lens is at -x
    const box = new THREE.Box2().setFromPoints(pts);
    // the glass runs a little under the frame all round, so no untinted sliver shows at the edge
    const c = box.getCenter(new THREE.Vector2()), sz = box.getSize(new THREE.Vector2());
    const shape = new THREE.Shape(pts.map((q) => new THREE.Vector2(c.x + ((q.x - c.x) * (sz.x + 3.5 * MM)) / sz.x, c.y + ((q.y - c.y) * (sz.y + 3.5 * MM)) / sz.y)));
    const layer = (mat, dz, order) => {
      const g = new THREE.ShapeGeometry(shape, 8);
      lensUV(g, box);
      wrap(g, LZ + dz);
      const m = new THREE.Mesh(g, mat);
      m.renderOrder = order;
      group.add(m);
      return m;
    };
    const lens = {
      side,
      tint: layer(tint, 0.3 * MM, 10),
      display: layer(display, -0.2 * MM, 11),
      shine: layer(shine, 0.6 * MM, 12),
      // centre of the lens opening and its size, in the glasses' frame
      center: new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, LZ + wrapZ((box.min.x + box.max.x) / 2)),
      size: box.getSize(new THREE.Vector2()),
      outline: pts.map((q) => new THREE.Vector3(q.x, q.y, LZ + wrapZ(q.x))),
    };
    lens.tint.name = `${side}-lens`;
    lenses.push(lens);
  }

  // ---------------------------------------------------------------- the Eye camera, top of the bridge
  const eye = new THREE.Group();
  eye.name = 'eye-camera';
  const body = new THREE.Mesh(new THREE.BoxGeometry(12.5 * MM, 7.5 * MM, 4 * MM), satin);
  // round off the module with a capsule-like profile: a rounded box from an extruded rounded rect
  body.geometry.dispose();
  const eyeShape = new THREE.Shape(fillet([[-6.5, -3.8, 3.2], [6.5, -3.8, 3.2], [6.5, 3.8, 3.2], [-6.5, 3.8, 3.2]], 6));
  body.geometry = new THREE.ExtrudeGeometry(eyeShape, { depth: 2.6 * MM, bevelEnabled: true, bevelThickness: 0.8 * MM, bevelSize: 0.7 * MM, bevelSegments: 3 });
  eye.add(body);
  const ringM = new THREE.Mesh(new THREE.TorusGeometry(2.25 * MM, 0.45 * MM, 10, 32), ring);
  ringM.position.set(0, 0, 3.55 * MM);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(2.0 * MM, 32), camGlass);
  glass.position.set(0, 0, 3.6 * MM);
  eye.add(ringM, glass);
  eye.position.set(0, 16.5 * MM, 0.2 * MM);
  group.add(eye);

  // ---------------------------------------------------------------- temples (open), with a slight outward splay
  const T = [[-1, 11, 2], [-45, 10.5, 14], [-118, 6.5, 22], [-146, 1, 9], [-151, -6, 3], [-145, -9.5, 4], [-116, -2.5, 20], [-45, -4, 12], [-1, -5.5, 2]];
  const tShape = new THREE.Shape(fillet(T, 6));
  for (const s of [1, -1]) {
    const g = new THREE.ExtrudeGeometry(tShape, { depth: 4.6 * MM, bevelEnabled: true, bevelThickness: 0.9 * MM, bevelSize: 0.9 * MM, bevelSegments: 3, curveSegments: 6 });
    // shape (u, v) = (z, y), extruded along its z: map to x' = -z, y' = y, z' = u (a proper rotation)
    g.rotateY(-Math.PI / 2);
    g.translate(s > 0 ? 0 : 4.6 * MM, 0, 0);
    const m = new THREE.Mesh(g, shell);
    const hx = s * 71.5 * MM;
    m.position.set(hx, 2 * MM, -DEPTH + wrapZ(hx) + 1 * MM);
    m.rotation.y = s * -0.05; // splayed out a little
    m.name = s > 0 ? 'temple-left' : 'temple-right';
    group.add(m);
  }

  // ---------------------------------------------------------------- nose pads
  for (const s of [1, -1]) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), pad);
    m.scale.set(2.2 * MM, 5 * MM, 1.4 * MM);
    m.position.set(s * 9.5 * MM, -15 * MM, -DEPTH - 3.5 * MM);
    m.rotation.z = s * 0.45;
    group.add(m);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * MM, 0.5 * MM, 7 * MM, 8), ring);
    arm.position.set(s * 8.5 * MM, -12.5 * MM, -DEPTH - 1.5 * MM);
    arm.rotation.x = Math.PI / 2.4;
    group.add(arm);
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  // the glasses' own box (front and open temples), for framing them tightly at any angle
  const obb = new THREE.Box3(new THREE.Vector3(-80 * MM, -29 * MM, -172 * MM), new THREE.Vector3(80 * MM, 24 * MM, 4 * MM));

  let shownTint = -1, shownDisp = -1;
  return {
    group, lenses, eye, obb,
    right: lenses[0], left: lenses[1],
    /** tint: 0..1 how dark the glass is; display: 0..1 how opaque the display layer is */
    setLens({ tint: t, display: d }) {
      if (t != null && t !== shownTint) { tint.opacity = t; shownTint = t; }
      if (d != null && d !== shownDisp) {
        display.opacity = d; shownDisp = d;
        for (const l of lenses) l.display.visible = d > 0.001;
      }
    },
    /** how strongly the window-like highlight shows on the glass (stronger from outside) */
    setShine(k) { if (shine.emissiveIntensity !== k) shine.emissiveIntensity = k; },
    setDisplayMap(tex) { display.map = tex; display.needsUpdate = true; },
    materials: { shell, satin, pad, ring, camGlass, tint, display, shine },
    dispose() {
      group.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
      for (const m of [shell, satin, pad, ring, camGlass, tint, display, shine]) m.dispose();
      shine.emissiveMap?.dispose();
    },
  };
}
