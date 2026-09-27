// Makes assets/models/studio-env.bin, the studio HDRI every 3D stage reflects (stage.js).
//   npm pack @pmndrs/assets@1.7.0 && tar xzf pmndrs-assets-1.7.0.tgz      (CC0 assets)
//   node tools/pages/mkenv.mjs package/hdri/studio.exr.js assets/models/studio-env.bin
// It decodes the EXR, halves it to 256 x 128 (a 2 x 2 box filter, so the light stays the same),
// and writes RGBE (8-bit mantissas and a shared exponent) as four planes with a left-neighbour
// delta per row, gzip'd, after a 16-byte header: 'RXE2', width u32, height u32, 4 reserved bytes.
// About 79 KB; stage.js decodes it with the browser's DecompressionStream.
// Run it from tools/ (it uses tools/node_modules/three).
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import * as THREE from 'three';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const [,, src, out, full] = process.argv;
if (!src || !out) { console.log('usage: node tools/pages/mkenv.mjs <hdri/name.exr.js or .exr> <out.bin> [full]'); process.exit(1); }
let buf = readFileSync(src);
if (src.endsWith('.js')) { const t = buf.toString('utf8'); buf = Buffer.from(t.slice(t.indexOf('base64,') + 7, t.lastIndexOf("'")), 'base64'); }
const l = new EXRLoader(); l.setDataType(THREE.FloatType);
let r = l.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
if (!full) { // 2 x 2 box downsample
  const w = r.width / 2, h = r.height / 2, d = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) {
    let s = 0;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) s += r.data[((2 * y + dy) * r.width + 2 * x + dx) * 4 + k];
    d[(y * w + x) * 4 + k] = s / 4;
  }
  r = { width: w, height: h, data: d };
}
const W = r.width, H = r.height, N = W * H;
const rgbe = Buffer.alloc(N * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = ((H - 1 - y) * W + x) * 4, o = (y * W + x) * 4; // EXR rows come bottom-up; store top-down
  const c = [0, 1, 2].map((k) => Math.max(0, r.data[i + k]));
  const m = Math.max(...c);
  if (m < 1e-32) continue;
  const e = Math.ceil(Math.log2(m) + 1e-9), f = 256 / Math.pow(2, e);
  for (let k = 0; k < 3; k++) rgbe[o + k] = Math.min(255, Math.floor(c[k] * f));
  rgbe[o + 3] = e + 128;
}
const pl = Buffer.alloc(16 + N * 4);
pl.write('RXE2', 0); pl.writeUInt32LE(W, 4); pl.writeUInt32LE(H, 8);
for (let ch = 0; ch < 4; ch++) for (let y = 0; y < H; y++) {
  let prev = 0;
  for (let x = 0; x < W; x++) { const v = rgbe[(y * W + x) * 4 + ch]; pl[16 + ch * N + y * W + x] = (v - prev) & 255; prev = v; }
}
const gz = gzipSync(pl, { level: 9 });
writeFileSync(out, gz);
console.log(`${W} x ${H}: ${gz.length} bytes -> ${out}`);
