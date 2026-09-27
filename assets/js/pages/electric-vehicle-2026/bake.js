// Bounding-box fix for this page's models, used by versions.js and caliper.js.
//
// After tools/optimize-cad.mjs merges the static parts, a merged mesh can sit under a node whose
// transform is rotated (about 30 degrees here) as well as scaled for quantization. The stage sizes
// its ground, shadow and camera from each mesh's box turned into the model's frame, and the box of
// a long, thin chassis turned 30 degrees is several times taller than the car: the car ends up
// small in the frame, floating well above its shadow.
//
// straighten() rewrites those meshes' vertices in the model's own frame (same vertices, same
// shape: only the numbers describing where they are change) and gives the meshes an identity
// transform, so their boxes fit. Moving parts (anim_*) are left alone.
export function straighten(model, THREE) {
  model.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const toModel = new THREE.Matrix4();
  const meshes = [];
  model.traverse((o) => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    let anim = false;
    for (let p = o; p && p !== model; p = p.parent) if (/^anim_/.test(p.name)) anim = true;
    if (anim) continue;
    toModel.multiplyMatrices(inv, o.matrixWorld);
    const e = toModel.elements;
    if (Math.abs(e[1]) + Math.abs(e[2]) + Math.abs(e[4]) + Math.abs(e[6]) + Math.abs(e[8]) + Math.abs(e[9]) < 1e-9) continue;
    if (toModel.determinant() <= 0) continue; // a mirrored node would flip its faces; leave it
    const src = o.geometry, g = new THREE.BufferGeometry();
    if (src.index) g.setIndex(src.index);
    for (const [k, a] of Object.entries(src.attributes)) {
      if (k !== 'position' && k !== 'normal') { g.setAttribute(k, a); continue; }
      const f = new Float32Array(a.count * 3);
      for (let i = 0; i < a.count; i++) { f[3 * i] = a.getX(i); f[3 * i + 1] = a.getY(i); f[3 * i + 2] = a.getZ(i); }
      g.setAttribute(k, new THREE.BufferAttribute(f, 3));
    }
    for (const gr of src.groups) g.addGroup(gr.start, gr.count, gr.materialIndex);
    g.applyMatrix4(toModel);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    o.geometry = g;
    o.removeFromParent();
    o.position.set(0, 0, 0); o.quaternion.identity(); o.scale.set(1, 1, 1);
    model.add(o);
  }
  model.updateWorldMatrix(true, true);
}
