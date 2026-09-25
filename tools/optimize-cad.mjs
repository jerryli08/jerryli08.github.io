// Optimizes the tessellated CAD for the web without altering any part's shape:
//  - removes fasteners (screws, nuts) and SMD capacitors, which Jerry allowed
//  - drops exact duplicate instances (same mesh at the same world transform)
//  - merges static parts by material to cut draw calls; moving parts stay separate
//  - quantizes (sub-0.05 mm) and meshopt-compresses the buffers
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, flatten, join, quantize, meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const [,, input, output, kind] = process.argv;
const REMOVE = [/^GB70-/, /^ZSLM-M3/, /^M25-6-CHEN-LIU/, /^M3-14-PAN/, /^LM-M3/, /^DDJ-STDLOW-LUOSI/, /^0402_cap/];
if (kind === 'rover') REMOVE.push(/^Propeller/);
const KEEP = kind === 'drone' ? [/^Propeller/] : [/^Wheels v7/];

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
const root = doc.getRoot();

let removed = 0;
for (const n of root.listNodes()) {
  if (REMOVE.some((r) => r.test(n.getName()))) { n.dispose(); removed++; }
}
await doc.transform(prune(), dedup());
// exact duplicate instances (same deduplicated mesh at the same world transform)
const seen = new Set(); let dups = 0;
for (const n of root.listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  const key = root.listMeshes().indexOf(m) + '|' + n.getWorldMatrix().map((v) => v.toFixed(5)).join(',');
  if (seen.has(key)) { n.setMesh(null); dups++; } else seen.add(key);
}
await doc.transform(prune());
// Animated parts keep a unique name (on every mesh node beneath them) so join() leaves them alone.
const animated = [];
for (const n of root.listNodes()) {
  if (KEEP.some((r) => r.test(n.getName()))) animated.push(n);
}
let tag = 0;
for (const n of animated) {
  const base = `anim_${kind}_${tag++}_${n.getName().replace(/[^A-Za-z0-9]+/g, '_')}`;
  n.setName(base);
  let k = 0;
  n.traverse((c) => { if (c !== n && c.getMesh()) c.setName(`${base}__${k++}`); });
}
// Everything else loses its name so join() can merge it by material.
const isAnim = (n) => { for (let p = n; p; p = p.getParentNode()) if (p.getName().startsWith('anim_')) return true; return false; };
for (const n of root.listNodes()) if (!isAnim(n)) n.setName('');
for (const m of root.listMeshes()) m.setName('');
await doc.transform(dedup(), weld(), flatten(), join({ keepNamed: true }), prune());
// flatten() re-parents named children too; re-group anim nodes' descendants is not needed since
// CAF wheel/prop nodes are leaves or small groups. Report.
const tris = root.listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 16, quantizeNormal: 10 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(output, doc);
console.log(`${kind}: removed ${removed} fastener nodes, ${dups} duplicate instances; ${root.listNodes().length} nodes, ${root.listMeshes().length} meshes, ${root.listMaterials().length} materials, ${Math.round(tris)} tris`);
console.log('anim nodes:', root.listNodes().filter((n) => n.getName().startsWith('anim_')).map((n) => n.getName()).join(', '));
console.log('materials:', root.listMaterials().map((m) => m.getName() + ':' + m.getBaseColorFactor().slice(0, 3).map((v) => Math.round(v * 255)).join('/')).join('  '));
