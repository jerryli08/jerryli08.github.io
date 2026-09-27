// Size, triangle count, draw calls and materials of the GLBs a rich page loads, with a flag on any
// model that is too heavy for smooth scrolling on an ordinary laptop.
//   node tools/pages/models.mjs                      every GLB under assets/models
//   node tools/pages/models.mjs electric-bike        one page's folder
//   node tools/pages/models.mjs path/to/x.glb -v     one file, with its materials
// Heavy: more than 400k triangles, 4 MB on disk, or 400 draw calls (primitives) in one model.
// The fix is never a new shape: drop screws, bolts, nuts and PCBs (tools/optimize-cad.mjs), or
// merge static parts by material (they are merged unless listed in KEEP).
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const verbose = args.includes('-v');
const target = args.find((a) => !a.startsWith('-'));
const LIMITS = { tris: 400_000, bytes: 4 * 1024 * 1024, calls: 400 };

function glbs(dir) {
  const out = [];
  for (const n of readdirSync(dir)) {
    const f = join(dir, n);
    if (statSync(f).isDirectory()) out.push(...glbs(f));
    else if (n.endsWith('.glb')) out.push(f);
  }
  return out;
}
let files;
if (!target) files = glbs(join(ROOT, 'assets/models'));
else if (target.endsWith('.glb')) files = [resolve(target)];
else files = glbs(existsSync(join(ROOT, 'assets/models', target)) ? join(ROOT, 'assets/models', target) : resolve(target));

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const rows = [];
for (const f of files.sort()) {
  const doc = await io.read(f);
  const root = doc.getRoot();
  let tris = 0, calls = 0, verts = 0, named = 0;
  const mats = new Map();
  const instances = new Map();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    instances.set(mesh, (instances.get(mesh) || 0) + 1);
    if (/^anim_/.test(node.getName())) named++;
  }
  for (const [mesh, n] of instances) {
    for (const prim of mesh.listPrimitives()) {
      const idx = prim.getIndices();
      const pos = prim.getAttribute('POSITION');
      const count = idx ? idx.getCount() : pos ? pos.getCount() : 0;
      if (prim.getMode() === 4) tris += (count / 3) * n;
      verts += (pos ? pos.getCount() : 0) * n;
      calls += n;
      const m = prim.getMaterial();
      const c = m ? m.getBaseColorFactor().slice(0, 3).map((x) => Math.round(Math.pow(x, 1 / 2.2) * 255)) : null;
      const k = m ? `${m.getName() || '(unnamed)'} rgb(${c})` : '(none)';
      const e = mats.get(k) || { calls: 0, tris: 0, color: c };
      e.calls += n; e.tris += prim.getMode() === 4 ? (count / 3) * n : 0;
      mats.set(k, e);
    }
  }
  const bytes = statSync(f).size;
  const heavy = [];
  if (tris > LIMITS.tris) heavy.push(`${Math.round(tris / 1000)}k triangles`);
  if (bytes > LIMITS.bytes) heavy.push(`${(bytes / 1048576).toFixed(1)} MB`);
  if (calls > LIMITS.calls) heavy.push(`${calls} draw calls`);
  rows.push({ file: relative(ROOT, f), mb: (bytes / 1048576).toFixed(2), tris: Math.round(tris), verts, calls, named, mats: mats.size, heavy });
  if (verbose) {
    console.log(`\n${relative(ROOT, f)}`);
    for (const [k, e] of [...mats].sort((a, b) => b[1].tris - a[1].tris)) console.log(`  ${k.padEnd(40)} ${String(e.calls).padStart(5)} calls ${String(Math.round(e.tris)).padStart(8)} tris`);
  }
}
const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${pad('model', 64)} ${pad('MB', 6)} ${pad('triangles', 10)} ${pad('draws', 6)} ${pad('named', 6)} mats`);
for (const r of rows) console.log(`${pad(r.file, 64)} ${pad(r.mb, 6)} ${pad(r.tris.toLocaleString('en-US'), 10)} ${pad(r.calls, 6)} ${pad(r.named, 6)} ${r.mats}${r.heavy.length ? `   HEAVY: ${r.heavy.join(', ')}` : ''}`);
