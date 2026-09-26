// Optimizes the tessellated CAD for the web without altering any part's shape:
//  - removes fasteners (screws, nuts) and SMD capacitors, which Jerry allowed
//  - drops exact duplicate instances (same mesh at the same world transform)
//  - merges static parts by material to cut draw calls; moving parts stay separate
//  - quantizes (sub-0.05 mm) and meshopt-compresses the buffers
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, flatten, join, quantize, meshopt, reorder, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { readFileSync } from 'node:fs';

// usage: node optimize-cad.mjs in.glb out.glb rover|drone            (the landing-scene models)
//        node optimize-cad.mjs in.glb out.glb --config cfg.json       (any other model)
// cfg.json: { "prefix": "frc",                    anim node name prefix: anim_<prefix>_<n>_<name>
//             "remove": ["^GB70-", ...],          node-name regexes to drop (fasteners, PCBs only)
//             "keep": ["^Intake Pivot", ...],     node-name regexes that stay separate (moving parts)
//             "keepIndices": [123, 456],          glTF node indices to keep separate (duplicate names)
//             "carbon": ["^cf plate"],            node-name regexes shaded as carbon fiber
//             "simplify": 0.0002 }                optional max error (fraction of model size); keep tiny
const [,, input, output, kindArg, cfgPath] = process.argv;
let kind = kindArg, CFG = null;
if (kindArg === '--config') { CFG = JSON.parse(readFileSync(cfgPath, 'utf8')); kind = CFG.prefix || 'part'; }
const rx = (a) => (a || []).map((s) => new RegExp(s));
const REMOVE = CFG ? rx(CFG.remove) : [/^GB70-/, /^ZSLM-M3/, /^M25-6-CHEN-LIU/, /^M3-14-PAN/, /^LM-M3/, /^DDJ-STDLOW-LUOSI/, /^0402_cap/];
if (kind === 'rover' && !CFG) REMOVE.push(/^Propeller/);
// moving parts stay separate: props, wheels, and the docking latch (servo gear, passive gear,
// the two geared arms on each side and the four passive doors they carry)
const KEEP = CFG ? rx(CFG.keep) : kind === 'drone' ? [/^Propeller/] : [/^Wheels v7/, /^Component9:/, /^Component8:1$/, /^passive latch doors:/, /^Spur Gear/, /^Component43:/, /^SERVO ARM HORN/];
const KEEP_IDX = new Set(CFG?.keepIndices || []);

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
const root = doc.getRoot();

// node indices as in the input file, before anything is removed (for keepIndices)
const inputIndex = new Map(root.listNodes().map((n, i) => [n, i]));
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
  if (KEEP.some((r) => r.test(n.getName())) || KEEP_IDX.has(inputIndex.get(n))) animated.push(n);
}
let tag = 0;
for (const n of animated) {
  const base = `anim_${kind}_${tag++}_${n.getName().replace(/[^A-Za-z0-9]+/g, '_')}`;
  n.setName(base);
  let k = 0;
  n.traverse((c) => { if (c !== n && c.getMesh()) c.setName(`${base}__${k++}`); });
}
// Carbon fiber tubes get their own material so they can be shaded as glossy carbon.
const CARBON = CFG ? rx(CFG.carbon) : [/^CARBON-FIBER-TUBE/, /^HMX5V-GUAN-DINGWEI/, /^GUAN-CHENG/];
let carbonMat = null, carbonN = 0;
for (const n of root.listNodes()) {
  if (!CARBON.some((r) => r.test(n.getName()))) continue;
  n.traverse((c) => {
    const m = c.getMesh(); if (!m) return;
    for (const prim of m.listPrimitives()) {
      if (!carbonMat) carbonMat = prim.getMaterial().clone().setName('carbon').setRoughnessFactor(0.21).setExtras({ carbon: true });
      prim.setMaterial(carbonMat); carbonN++;
    }
  });
}
if (carbonN) console.log(`${kind}: ${carbonN} carbon fiber primitives`);
// Everything else loses its name so join() can merge it by material.
const isAnim = (n) => { for (let p = n; p; p = p.getParentNode()) if (p.getName().startsWith('anim_')) return true; return false; };
for (const n of root.listNodes()) if (!isAnim(n)) n.setName('');
for (const m of root.listMeshes()) m.setName('');
for (const m of root.listMaterials()) if (m.getName() !== 'carbon') m.setName('');
await doc.transform(dedup(), weld(), flatten(), join({ keepNamed: true }), prune());
// flatten() re-parents named children too; re-group anim nodes' descendants is not needed since
// CAF wheel/prop nodes are leaves or small groups. Report.
const tris = root.listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
if (CFG?.simplify) { await MeshoptSimplifier.ready; await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, error: CFG.simplify, ratio: 0 })); }
await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 16, quantizeNormal: 10 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(output, doc);
console.log(`${kind}: removed ${removed} fastener nodes, ${dups} duplicate instances; ${root.listNodes().length} nodes, ${root.listMeshes().length} meshes, ${root.listMaterials().length} materials, ${Math.round(tris)} tris`);
console.log('anim nodes:', root.listNodes().filter((n) => n.getName().startsWith('anim_')).map((n) => n.getName()).join(', '));
console.log('materials:', root.listMaterials().map((m) => m.getName() + ':' + m.getBaseColorFactor().slice(0, 3).map((v) => Math.round(v * 255)).join('/')).join('  '));
