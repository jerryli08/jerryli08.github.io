import { NodeIO } from '@gltf-transform/core';
const io = new NodeIO();
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f);
  const root = doc.getRoot();
  const agg = new Map();
  let total = 0;
  for (const node of root.listNodes()) {
    const m = node.getMesh(); if (!m) continue;
    let tris = 0;
    for (const p of m.listPrimitives()) { const idx = p.getIndices(); tris += (idx ? idx.getCount() : p.getAttribute('POSITION').getCount()) / 3; }
    const key = (node.getName() || m.getName() || '?').replace(/[:_ ]\d+$/, '');
    const a = agg.get(key) || { tris: 0, n: 0 }; a.tris += tris; a.n++; agg.set(key, a); total += tris;
  }
  console.log(`\n== ${f}  total tris ${total}`);
  [...agg.entries()].sort((a, b) => b[1].tris - a[1].tris).slice(0, 45).forEach(([k, v]) => console.log(String(v.tris).padStart(9), String(v.n).padStart(4), k));
}
