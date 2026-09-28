// A generic Z axis, spindle and end mill for the router page. NOT part of Jerry's CAD: his CAD stops at
// the X and Y axes. Jerry (Sept 27, 2026) asked for "a super simple z-axis model (doesn't have to work;
// can literally be a COTS ball screw next to linear rail, like a CNC z-axis COTS unit)" and a CNC end
// mill, so the toolpath reads as milling, and the page says it is not in his CAD.
//
// What it is: the shape of a common off-the-shelf Z unit, sized to the gantry. A 10 mm back plate
// bolted to the front of the four X carriage blocks from the CAD, two vertical 15 mm profile rails with
// a block each, a 12 mm ball screw between them on a support at each end, a NEMA 17 on top, a moving
// plate on the blocks with the ball nut behind it, a clamp for a 52 mm spindle, the spindle with an
// ER11 collet nut, and a 1/8 in (3.175 mm) two-flute end mill. Plain boxes and cylinders.
//
// Model frame (metres, Y up) at the CAD pose (X = Y = 0), measured from the CAD: the four X carriage
// blocks' front faces are at z = -376.8 mm (x -24.3 to 15.1 and 41.1 to 80.5, y 158.8 to 192.8 and
// 244.5 to 278.5), centred on x = 28.05 mm, and the X ball nut's housing stands 4.8 mm proud of them,
// to z = -372.0. So the back plate sits on 4.8 mm pads on the blocks, its back face flush with the nut
// housing at z -372.0, and the spindle axis is 82 mm in front of that, at x 28.05, z -290.0 mm. `fixed` rides with the
// carriage; `slide` (the moving plate, blocks, nut, clamp and spindle) also moves up and down with
// setTip(); `spin` (the collet nut and the end mill) turns about the spindle axis with setSpin().
// Ranges are chosen so nothing touches the CAD's parts along the page's toolpath: fully up (tip at
// y = 132 mm) the collet nut clears the top of the side extrusions (149.8 mm), and the back plate stays
// above the Y carriage blocks (154.1 mm) and inside the gantry's end plates.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const Z = {
  x: 28.05, face: -372.0, axisZ: -290.0, // mm
  tipUp: 132, // mm, tool tip height at home (fully up)
  D: 3.175, flute: 12, stick: 20, // end mill: diameter, flute length, stick-out below the collet nut
};

export function buildZ(THREE) {
  const mm = (v) => v / 1000;
  const mats = [];
  const mat = (color, metalness, roughness) => { const m = new THREE.MeshStandardMaterial({ color, metalness, roughness }); mats.push(m); return m; };
  const ALU = mat('#c9cdd2', 0.85, 0.36), STEEL = mat('#a2a8ae', 0.9, 0.28), BLOCK = mat('#b9bec4', 0.85, 0.32);
  const BLACK = mat('#26282c', 0.45, 0.45), MOTOR = mat('#1c1d20', 0.35, 0.5), CAP = mat('#9ba1a7', 0.8, 0.35);
  const BODY = mat('#3a3e44', 0.6, 0.34), BRIGHT = mat('#d3d7db', 0.95, 0.2), CARBIDE = mat('#aeb2b7', 0.9, 0.24);
  const box = (m, x0, x1, y0, y1, z0, z1) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(mm(x1 - x0), mm(y1 - y0), mm(z1 - z0)), m);
    o.position.set(mm((x0 + x1) / 2), mm((y0 + y1) / 2), mm((z0 + z1) / 2));
    return o;
  };
  const cylY = (m, r, y0, y1, x, z, seg = 32) => {
    const o = new THREE.Mesh(new THREE.CylinderGeometry(mm(r), mm(r), mm(y1 - y0), seg), m);
    o.position.set(mm(x), mm((y0 + y1) / 2), mm(z));
    return o;
  };
  const { x: CX, face: F, axisZ: AZ } = Z;
  const SZ = F + 24; // ball screw axis, between the back plate and the moving plate

  // ------------------------------------------------ fixed to the X carriage
  const fixed = new THREE.Group(); fixed.name = 'zaxis-fixed (generic, not in the CAD)';
  const motor = box(MOTOR, CX - 21.15, CX + 21.15, 348, 384, SZ - 21.15, SZ + 21.15);
  fixed.add(
    box(ALU, CX - 58, CX + 58, 156, 338, F, F + 10),                   // back plate
    box(ALU, -24.3, 15.1, 158.8, 192.8, -376.8, F), box(ALU, 41.1, 80.5, 158.8, 192.8, -376.8, F), // pads on the
    box(ALU, -24.3, 15.1, 244.5, 278.5, -376.8, F), box(ALU, 41.1, 80.5, 244.5, 278.5, -376.8, F), // carriage blocks
    box(STEEL, CX - 47.5, CX - 32.5, 158, 302, F + 10, F + 25),        // rails
    box(STEEL, CX + 32.5, CX + 47.5, 158, 302, F + 10, F + 25),
    box(BLACK, CX - 27, CX + 27, 160, 180, F + 10, F + 36),            // screw supports
    box(BLACK, CX - 30, CX + 30, 296, 316, F + 10, F + 36),
    cylY(STEEL, 6, 166, 322, CX, SZ),                                   // 12 mm ball screw
    cylY(CAP, 9, 316, 338, CX, SZ),                                     // coupler
    box(ALU, CX - 24, CX + 24, 338, 346, F, F + 46),                   // motor plate
    motor,                                                              // NEMA 17
    box(CAP, CX - 21.15, CX + 21.15, 346, 348, SZ - 21.15, SZ + 21.15),
    box(CAP, CX - 21.15, CX + 21.15, 384, 388, SZ - 21.15, SZ + 21.15),
  );

  // ------------------------------------------------ moves with Z (positions for the tip at y = 0; setTip lifts it)
  const slide = new THREE.Group(); slide.name = 'zaxis-slide (generic, not in the CAD)';
  // spindle clamp: an 80 x 65 mm block with a 52 mm bore, from the moving plate forward
  const clampShape = new THREE.Shape();
  const cz0 = F + 48 - AZ, cz1 = F + 116 - AZ; // clamp front and back, relative to the spindle axis
  clampShape.moveTo(mm(-40), mm(cz0)); clampShape.lineTo(mm(40), mm(cz0)); clampShape.lineTo(mm(40), mm(cz1)); clampShape.lineTo(mm(-40), mm(cz1)); clampShape.closePath();
  const bore = new THREE.Path(); bore.absarc(0, 0, mm(26.2), 0, Math.PI * 2, true); clampShape.holes.push(bore);
  const clampGeo = new THREE.ExtrudeGeometry(clampShape, { depth: mm(65), bevelEnabled: false, curveSegments: 40 });
  clampGeo.rotateX(Math.PI / 2); // shape (x, z) -> extruded down along -y from 0
  const clamp = new THREE.Mesh(clampGeo, ALU);
  clamp.position.set(mm(CX), mm(160), mm(AZ)); // y from 95 to 160 above the tip
  slide.add(
    box(ALU, CX - 50, CX + 50, 85, 205, F + 38, F + 48),               // moving plate
    box(BLOCK, CX - 57, CX - 23, 107.5, 168.5, F + 14.3, F + 38),      // rail blocks
    box(BLOCK, CX + 23, CX + 57, 107.5, 168.5, F + 14.3, F + 38),
    cylY(BLOCK, 11, 130, 160, CX, SZ),                                  // ball nut
    box(BLOCK, CX - 16, CX + 16, 130, 160, SZ, F + 38),                // nut bracket
    clamp,
    cylY(BODY, 26, 37, 197, CX, AZ, 48),                                // spindle body, 52 mm
    cylY(CAP, 16, 197, 207, CX, AZ),                                    // top cap
    cylY(BLACK, 6, 207, 215, CX, AZ, 16),                               // cable connector
    cylY(BRIGHT, 12, 31, 37, CX, AZ),                                   // nose
  );

  // ------------------------------------------------ spins: collet nut and end mill, about the spindle axis
  const spin = new THREE.Group(); spin.name = 'zaxis-spin (generic, not in the CAD)';
  spin.position.set(mm(CX), 0, mm(AZ));
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(mm(9.5), mm(9.5), mm(11), 6), BRIGHT);
  nut.position.y = mm(Z.stick + 5.5);
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(mm(Z.D / 2), mm(Z.D / 2), mm(Z.stick - Z.flute), 20), CARBIDE);
  shank.position.y = mm((Z.stick + Z.flute) / 2);
  spin.add(nut, shank, new THREE.Mesh(fluteGeometry(THREE, Z.D / 2, Z.flute), CARBIDE));
  slide.add(spin);

  // fewer draw calls: the plain parts of each group merged into one mesh per material (the motor stays
  // separate as the label's anchor, the spinning parts stay in their own group)
  mergeByMaterial(THREE, fixed, [motor]);
  mergeByMaterial(THREE, slide, [spin]);
  mergeByMaterial(THREE, spin, []);
  const all = [fixed, slide];
  for (const g of all) g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  let tipNow = NaN, spinNow = NaN;
  return {
    fixed, slide, spin, motor,
    /** tool tip height, mm (model y); returns true when it changed */
    setTip(y) { if (y === tipNow) return false; tipNow = y; slide.position.y = mm(y); return true; },
    setSpin(a) { if (a === spinNow) return false; spinNow = a; spin.rotation.y = a; return true; },
    dispose() { for (const g of all) g.traverse((o) => o.geometry?.dispose()); for (const m of mats) m.dispose(); },
  };
}

function mergeByMaterial(THREE, group, keep) {
  const by = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh || keep.includes(o)) continue;
    o.updateMatrix();
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrix);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!by.has(o.material)) by.set(o.material, []);
    by.get(o.material).push(g);
    o.geometry.dispose();
    group.remove(o);
  }
  for (const [m, gs] of by) {
    const merged = mergeGeometries(gs, false);
    for (const g of gs) g.dispose();
    group.add(new THREE.Mesh(merged, m));
  }
}

// A two-flute end mill's cutting part: a round bar with two helical flutes (30 degree helix), flat at
// the tip, so its spin shows. Radius r and length L in mm; y runs 0 (tip) to L.
function fluteGeometry(THREE, r, L) {
  const NA = 48, NY = 24, twist = (L * Math.tan((30 * Math.PI) / 180)) / r; // radians over the length
  const pos = [], idx = [];
  const rad = (a) => r * (1 - 0.34 * Math.pow(Math.max(0, Math.cos(2 * a)), 6)); // two grooves
  for (let j = 0; j <= NY; j++) {
    const y = (L * j) / NY, t = (twist * j) / NY;
    for (let i = 0; i < NA; i++) { const a = (2 * Math.PI * i) / NA, rr = rad(a); pos.push((rr * Math.cos(a + t)) / 1000, y / 1000, (rr * Math.sin(a + t)) / 1000); }
  }
  for (let j = 0; j < NY; j++) for (let i = 0; i < NA; i++) {
    const a = j * NA + i, b = j * NA + ((i + 1) % NA), c = a + NA, d = b + NA;
    idx.push(a, c, b, b, c, d);
  }
  const c0 = pos.length / 3; pos.push(0, 0, 0); // flat tip
  for (let i = 0; i < NA; i++) idx.push(c0, i, (i + 1) % NA);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
