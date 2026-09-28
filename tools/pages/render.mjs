// Render a GLB to an image for card thumbnails and posters (software WebGL, so give it time).
//
// usage: node tools/pages/render.mjs <src> <out> [az] [el] [w] [h] [bg] [pad] [--key=value ...]
//   src   /assets/models/<slug>/<name>.glb, or '-' with --module
//   out   .png, or .webp / .jpg (encoded here); w x h is the output size in pixels
//   bg    a CSS colour behind the model, or 'studio' for the product look (see render.html)
//
// Options (--key=value):
//   --ss=2          supersampling: the page is drawn at ss times the output size and downsampled
//                   (Lanczos), which is the anti-aliasing. Default 2 with bg studio, else 1.
//   --hide=re       parts left out (a regex on CAD part names), as a page's `hide`
//   --module=path   render a page's scrolly module instead of a bare GLB, posed at --u=step+progress
//                   (e.g. /assets/js/pages/drone-arm/grab.js --u=3.97); --view=page keeps the
//                   module's own camera, else az / el / pad frame it; --hideobj=re hides scene
//                   objects the module adds by name
//   --fit=re / --nofit=re   frame only the parts matching fit / everything but nofit
//   --sx, --sy      move the framed picture (fractions of the frame, +y up)
//   --exposure, --env, --key, --fov   exposure, environment strength, key light factor, field of view
//   --soft          key shadow softness (studio; default 9), --shadow ground shadow opacity (0.5)
//   --ao=0.85       studio ambient occlusion strength (0 = none), --aoradius=0.06 (of the model's radius)
//   --bg0, --bg1, --bg2   studio sweep colours (middle, mid, corners); --floor floor colour
//   --q=82          webp / jpg quality
import { chromium } from 'playwright';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const named = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, ...v] = a.slice(2).split('='); return [k, v.length ? v.join('=') : '1']; }));
const [src, out, az = 35, el = 22, w = 1600, h = 1000, bg = '#0b0b0c', pad = 1.1] = argv.filter((a) => !a.startsWith('--'));
if (!src || !out) { console.error('usage: node tools/pages/render.mjs <src> <out> [az] [el] [w] [h] [bg] [pad] [--key=value ...]'); process.exit(2); }
const studio = bg === 'studio';
const ss = +(named.ss || (studio ? 2 : 1));
const quality = +(named.q || 82);
delete named.ss; delete named.q;

await (await import('./pwlock.mjs')).acquire(); // wait for a free browser slot
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: ss });
  page.on('pageerror', (e) => console.error('page error', e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('console', m.text()); });
  const u = new URL('http://localhost:8123/tools/pages/render.html');
  const params = { src, az, el, pad, dpr: ss, ...named };
  if (studio) params.look = 'studio'; else params.bg = bg;
  Object.entries(params).forEach(([k, val]) => u.searchParams.set(k, val));
  await page.goto(u.href);
  await page.waitForSelector('body[data-ready="1"]', { timeout: 300000, state: 'attached' });
  let shot = await page.screenshot({ timeout: 240000 });
  // studio: ambient occlusion, drawn as its own grey pass and multiplied in at strength --ao (0 to 1)
  const aoK = studio ? +(named.ao ?? 0.85) : 0;
  if (aoK > 0) {
    await page.evaluate(() => globalThis.__renderAO());
    const ao = await page.screenshot({ timeout: 240000 });
    const soft = await sharp(ao).removeAlpha().linear(aoK, 255 * (1 - aoK)).toBuffer(); // 1 - k (1 - ao)
    shot = await sharp(shot).removeAlpha().composite([{ input: soft, blend: 'multiply' }]).png().toBuffer();
    if (named.keepao) await sharp(ao).toFile(out.replace(/\.\w+$/, '-ao.png'));
  }
  let img = sharp(shot);
  if (ss !== 1) img = img.resize(+w, +h, { kernel: 'lanczos3' });
  if (/\.webp$/i.test(out)) img = img.webp({ quality, effort: 6, smartSubsample: true });
  else if (/\.jpe?g$/i.test(out)) img = img.jpeg({ quality, mozjpeg: true });
  else img = img.png();
  await img.toFile(out);
  console.log('wrote', out);
} finally {
  await browser.close();
}
