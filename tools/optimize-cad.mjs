// Optimizes the tessellated CAD for the web without altering any part's shape:
//  - removes fasteners (screws, nuts) and SMD capacitors, which Jerry allowed
//  - drops exact duplicate instances (same mesh at the same world transform)
//  - merges static parts by material to cut draw calls; moving parts stay separate
//  - bakes every static part's placement into its vertices, so the merged mesh sits under an
//    identity node (a rotated node would make three.js's quick bounds far too big: bad framing,
//    a floating ground)
//  - quantizes (sub-0.05 mm) and meshopt-compresses the buffers
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, weld, flatten, join, quantize, meshopt, reorder, simplify, clearNodeTransform } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import { readFileSync } from 'node:fs';

// usage: node optimize-cad.mjs in.glb out.glb rover|drone            (the landing-scene models)
//        node optimize-cad.mjs in.glb out.glb --config cfg.json       (any other model)
// cfg.json: { "prefix": "frc",                    anim node name prefix: anim_<prefix>_<n>_<name>
//             "remove": ["^GB70-", ...],          node-name regexes to drop (fasteners, PCBs only)
//             "keep": ["^Intake Pivot", ...],     node-name regexes that stay separate (moving parts)
//             "keepIndices": [123, 456],          glTF node indices to keep separate (duplicate names)
//             "carbon": ["^cf plate"],            node-name regexes shaded as carbon fiber
//             "split": [{ "node": "^NAUO1$", "parts": { "elevon_L": [0, 23], "centre": [251, 338] } }],
//                                                 cut one node's mesh into named child nodes by
//                                                 primitive index ranges (inclusive): one CAD part
//                                                 exported with several bodies. Names can then be kept.
//             "colors": { "^elevon_": "#c3cad4" }, base colour (sRGB hex) for every primitive under
//                                                 matching nodes, for exports that carry no colours
//             "finish": { "^prop_": "moulded" },  finish for matching nodes, written into the
//                                                 material (extras.finish); stage.js honours it:
//                                                 printed, moulded, anodized, plain, rubber, carbon, metal
//             "simplify": 0.0002 }                optional max error (fraction of model size); keep tiny
// Split, colours and finishes run first, on the input's names, before anything is merged.
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
const FINISHES = ['printed', 'moulded', 'anodized', 'plain', 'rubber', 'carbon', 'metal'];

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(input);
const root = doc.getRoot();

// node indices as in the input file, before anything is removed or added (for keepIndices)
const inputIndex = new Map(root.listNodes().map((n, i) => [n, i]));

// ---------------------------------------------------------------- split, colours, finishes
for (const s of CFG?.split || []) {
  const re = new RegExp(s.node);
  const hits = root.listNodes().filter((n) => re.test(n.getName()) && n.getMesh());
  if (hits.length !== 1) throw new Error(`split: "${s.node}" matches ${hits.length} mesh nodes (needs exactly one)`);
  const node = hits[0], src = node.getMesh(), prims = src.listPrimitives();
  const taken = new Set();
  for (const [name, [a, b]] of Object.entries(s.parts || {})) {
    if (!(a >= 0 && b >= a && b < prims.length)) throw new Error(`split ${name}: range ${a}..${b} is outside 0..${prims.length - 1}`);
    const mesh = doc.createMesh(name);
    for (let i = a; i <= b; i++) {
      if (taken.has(i)) throw new Error(`split ${name}: primitive ${i} is already in another part`);
      taken.add(i);
      mesh.addPrimitive(src.listParents().filter((p) => p.propertyType === 'Node').length > 1 ? prims[i].clone() : prims[i]);
    }
    node.addChild(doc.createNode(name).setMesh(mesh)); // same place: identity under the old node
  }
  const rest = prims.filter((_, i) => !taken.has(i));
  if (src.listParents().filter((p) => p.propertyType === 'Node').length > 1) node.setMesh(rest.length ? src.clone() : null);
  const own = node.getMesh();
  if (own) for (const [i, p] of prims.entries()) if (taken.has(i)) own.removePrimitive(p);
  if (own && !own.listPrimitives().length) node.setMesh(null);
  console.log(`split ${node.getName()}: ${Object.keys(s.parts || {}).length} parts, ${rest.length} primitives left on it`);
}
const srgbToLinear = (hex) => {
  const c = parseInt(String(hex).replace('#', ''), 16);
  return [16, 8, 0].map((sh) => { const v = ((c >> sh) & 255) / 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
};
// every primitive under the nodes matching re gets a copy of its material, changed by edit (one
// copy per original material, so parts that shared a material still share the new one)
function restyle(re, key, edit) {
  const copies = new Map();
  let n = 0;
  for (const node of root.listNodes()) {
    if (!re.test(node.getName())) continue;
    node.traverse((c) => {
      const mesh = c.getMesh(); if (!mesh) return;
      // a mesh shared with nodes that do not match gets its own copy first
      if (mesh.listParents().some((p) => p.propertyType === 'Node' && p !== c)) c.setMesh(mesh.clone());
      const own = c.getMesh();
      for (const prim of own.listPrimitives()) {
        const p = prim.listParents().some((x) => x.propertyType === 'Mesh' && x !== own) ? prim.clone() : prim;
        if (p !== prim) { own.removePrimitive(prim); own.addPrimitive(p); }
        const m = p.getMaterial() || doc.createMaterial('');
        const k = `${key}|${root.listMaterials().indexOf(m)}`;
        if (!copies.has(k)) copies.set(k, edit(m.clone()));
        p.setMaterial(copies.get(k)); n++;
      }
    });
  }
  return n;
}
for (const [re, hex] of Object.entries(CFG?.colors || {})) {
  const n = restyle(new RegExp(re), `c${hex}`, (m) => m.setBaseColorFactor([...srgbToLinear(hex), m.getBaseColorFactor()[3]]));
  console.log(`colour ${hex}: ${n} primitives under /${re}/`);
}
for (const [re, finish] of Object.entries(CFG?.finish || {})) {
  if (!FINISHES.includes(finish)) throw new Error(`finish "${finish}" (use ${FINISHES.join(', ')})`);
  const n = restyle(new RegExp(re), `f${finish}`, (m) => m.setExtras({ ...m.getExtras(), finish }));
  console.log(`finish ${finish}: ${n} primitives under /${re}/`);
}

// ---------------------------------------------------------------- fasteners and duplicates
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
await doc.transform(dedup(), weld(), flatten());
// Static parts: bake each node's placement into its vertices (same vertices, same world positions)
// so join() merges them under an identity node instead of the first part's rotated frame. Moving
// parts keep their nodes as they are, since page modules may turn them about their own frames.
let baked = 0;
for (const n of root.listNodes()) {
  const mesh = n.getMesh();
  if (!mesh || n.getName()) continue;
  if (mesh.listParents().some((p) => p.propertyType === 'Node' && p !== n)) n.setMesh(mesh.clone()); // an instance: its own copy
  clearNodeTransform(n); baked++;
}
await doc.transform(join({ keepNamed: true }), prune());
// join() gives nodes that shared a mesh shallow copies of it, so several meshes can still hold the
// same primitive; quantize() would then quantize it once per mesh, each time with that mesh's own
// scale, and throw parts far off the model. Every mesh gets primitives (and vertex data) of its own.
let unshared = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (!prim.listParents().some((p) => p.propertyType === 'Mesh' && p !== mesh)) continue;
    const c = prim.clone();
    for (const sem of c.listSemantics()) c.setAttribute(sem, c.getAttribute(sem).clone());
    if (c.getIndices()) c.setIndices(c.getIndices().clone());
    mesh.removePrimitive(prim); mesh.addPrimitive(c); unshared++;
  }
}
if (unshared) console.log(`${kind}: ${unshared} shared primitives copied before quantizing`);
const tris = root.listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + (p.getIndices()?.getCount() ?? 0) / 3, 0), 0);
if (CFG?.simplify) { await MeshoptSimplifier.ready; await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, error: CFG.simplify, ratio: 0 })); }
await doc.transform(reorder({ encoder: MeshoptEncoder }), quantize({ quantizePosition: 16, quantizeNormal: 10 }), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write(output, doc);
console.log(`${kind}: removed ${removed} fastener nodes, ${dups} duplicate instances; baked ${baked} static placements; ${root.listNodes().length} nodes, ${root.listMeshes().length} meshes, ${root.listMaterials().length} materials, ${Math.round(tris)} tris`);
console.log('anim nodes:', root.listNodes().filter((n) => n.getName().startsWith('anim_')).map((n) => n.getName()).join(', '));
console.log('materials:', root.listMaterials().map((m) => m.getName() + ':' + m.getBaseColorFactor().slice(0, 3).map((v) => Math.round(v * 255)).join('/') + (m.getExtras().finish ? `(${m.getExtras().finish})` : '')).join('  '));
