// Packs Poly Haven rock scans (CC0) into one GLB with three LODs per rock:
// <rock>_hi, <rock>_mid, <rock>_lo meshes sharing 512px WebP textures; meshopt compressed.
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTTextureWebP } from '@gltf-transform/extensions';
import { simplify, weld, prune, dedup, quantize, meshopt, mergeDocuments, unpartition } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer';
import { readFileSync } from 'node:fs';
await MeshoptEncoder.ready; await MeshoptSimplifier.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const src = '/home/claude/assets-src/dl';
const tris = (doc) => doc.getRoot().listMeshes().reduce((a, m) => a + m.listPrimitives().reduce((b, p) => b + p.getIndices().getCount() / 3, 0), 0);
const target = new Document();
const LODS = { rock_09: { hi: [0.5, 0.002], mid: [0.12, 0.01], lo: [0.02, 0.05] }, moon_rock_03: { hi: [0.6, 0.002], mid: [0.25, 0.01], lo: [0.04, 0.05] }, namaqualand_boulder_05: { hi: [0.12, 0.004], mid: [0.03, 0.01], lo: [0.004, 0.05] } };
for (const [rock, lods] of Object.entries(LODS)) {
  for (const [lod, [ratio, error]] of Object.entries(lods)) {
    const doc = await io.read(`${src}/${rock}/${rock}.gltf`);
    await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio, error, lockBorder: false }), prune());
    for (const m of doc.getRoot().listMeshes()) m.setName(`${rock}_${lod}`);
    for (const n of doc.getRoot().listNodes()) n.setName(`${rock}_${lod}`);
    for (const t of doc.getRoot().listTextures()) {
      const kind = /nor_gl/.test(t.getURI()) ? 'nor_gl' : /arm/.test(t.getURI()) ? 'arm' : 'diff';
      t.setImage(new Uint8Array(readFileSync(`${src}/${rock}/textures/${rock}_${kind}_512.webp`))).setMimeType('image/webp').setURI(`${rock}_${kind}.webp`);
    }
    console.log(rock, lod, tris(doc), 'tris');
    mergeDocuments(target, doc);
  }
}
target.createExtension(EXTTextureWebP).setRequired(true);
// one scene holding every rock node
const [scene0, ...others] = target.getRoot().listScenes();
for (const sc of others) { for (const n of sc.listChildren()) scene0.addChild(n); sc.dispose(); }
target.getRoot().setDefaultScene(scene0);
await target.transform(dedup(), unpartition(), prune(), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'high' }));
await io.write('../assets/world/rocks.glb', target);
console.log('textures', target.getRoot().listTextures().length, 'materials', target.getRoot().listMaterials().length, 'scenes', target.getRoot().listScenes().length);
