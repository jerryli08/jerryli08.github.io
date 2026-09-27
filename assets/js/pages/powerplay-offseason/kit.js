// Shared bits for the PowerPlay off-season robot page. There is no CAD of this robot, so every
// scrolly on the page is a slideshow of the real media: photos, CAD screenshots, and real test clips
// stepped frame by frame (WebP frame sequences cut from the page's own clips, in
// /assets/models/powerplay-offseason/frames/<clip>/NNN.webp). No stand-in geometry, nothing drawn to
// look like the robot. Every picture is a pure function of the scroll; nothing plays by itself.
// Pictures are drawn on one 2D canvas per block, so the scroll only ever repaints one canvas.
const BASE = `
.pp { position: absolute; inset: 0; color: var(--text); font-family: inherit; }
.pp *, .pp *::before, .pp *::after { box-sizing: border-box; }
.pp-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.pp-chip { position: absolute; z-index: 3; display: inline-flex; align-items: center; gap: 8px; margin: 0; padding: 5px 11px; border-radius: 999px; background: rgba(10, 8, 7, 0.8); border: 1px solid rgba(255, 255, 255, 0.14); font-size: 13px; line-height: 1.35; color: var(--text-2); white-space: nowrap; }
.pp-chip b { color: var(--text); font-weight: 650; }
.pp-chip i { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.pp-cap { position: absolute; z-index: 3; margin: 0; padding: 7px 13px 8px; border-radius: 12px; background: rgba(10, 8, 7, 0.86); border: 1px solid rgba(255, 255, 255, 0.12); font-size: 14px; line-height: 1.4; color: var(--text-2); text-align: center; }
.pp-cap .d { color: var(--accent); font-weight: 650; }
.pp-bar { position: absolute; z-index: 3; height: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.16); overflow: hidden; }
.pp-bar i { display: block; height: 100%; width: 100%; transform-origin: 0 50%; background: var(--accent); }
.pp [hidden] { display: none !important; }
@media (max-width: 640px) {
  .pp-chip { font-size: 11.5px; padding: 3px 9px; }
  .pp-cap { font-size: 12px; padding: 5px 10px 6px; text-align: left; }
}
`;

export function css(id, text) {
  if (!document.getElementById('pp-css')) {
    const s = document.createElement('style'); s.id = 'pp-css'; s.textContent = BASE; document.head.appendChild(s);
  }
  if (id && !document.getElementById(id)) {
    const s = document.createElement('style'); s.id = id; s.textContent = text; document.head.appendChild(s);
  }
}

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Writes a style or text only when it changes.
export function setter() {
  const seen = new WeakMap();
  const memo = (el) => { let m = seen.get(el); if (!m) { m = {}; seen.set(el, m); } return m; };
  return {
    style(el, k, v) { const m = memo(el); if (m[k] !== v) { m[k] = v; el.style[k] = v; } },
    text(el, v) { const m = memo(el); if (m.$t !== v) { m.$t = v; el.textContent = v; } },
    hide(el, v) { const m = memo(el); if (m.$h !== v) { m.$h = v; el.hidden = v; } },
    // returns true when the caption changed (so the caller measures it again)
    cap(el, date, text) {
      const m = memo(el), key = `${date}|${text}`;
      if (m.$c === key) return false;
      m.$c = key;
      el.replaceChildren();
      if (date) el.append(h('span', 'd', `${date}  `));
      el.append(document.createTextNode(text || ''));
      return true;
    },
  };
}

// URLs of this page's files, content-hashed through ctx.asset.
export function urls(ctx) {
  const M = `/assets/media/${ctx.slug}`;
  const F = `/assets/models/${ctx.slug}/frames`;
  return {
    // a photo (name.webp), or a clip's poster (name.mp4 -> name.jpg); small: the 800 px copy
    media: (name, small) => {
      let n = name.replace(/\.mp4$/, '.jpg');
      if (small && /\.webp$/.test(n)) n = n.replace(/\.webp$/, '-s.webp');
      return ctx.asset(`${M}/${n}`);
    },
    frame: (clip, i) => ctx.asset(`${F}/${clip}/${String(i).padStart(3, '0')}.webp`),
    // a tiny pre-blurred copy of a photo or clip, for the backdrop
    bg: (name) => ctx.asset(`${F}/bg/${name.replace(/\.(mp4|webp|jpg)$/, '')}.webp`),
  };
}

// Loads images a few at a time, in the order asked, and calls onReady(url) when one is ready to draw.
// plan(list) replaces the wish list: images already loaded or loading stay, the rest queue in the
// new order, and loaded images no longer wanted are let go (the HTTP cache keeps their bytes).
export function loader(onReady, max = 6) {
  const imgs = new Map();
  let queue = [], busy = 0, dead = false;
  function pump() {
    while (!dead && busy < max && queue.length) {
      const url = queue.shift();
      const im = imgs.get(url);
      if (!im || im._s) continue;
      im._s = 1; busy++;
      im.onload = () => {
        const done = () => { busy--; if (dead) return; im._s = 2; onReady(url); pump(); };
        if (im.decode) im.decode().then(done, done); else done();
      };
      im.onerror = () => { busy--; im._s = 3; pump(); };
      im.src = url;
    }
  }
  return {
    get(url) { const im = url && imgs.get(url); return im && im._s === 2 ? im : null; },
    plan(list, keepAlso = []) {
      const want = new Set(list.concat(keepAlso).filter(Boolean));
      for (const [u, im] of imgs) if (!want.has(u) && im._s !== 1) { im.onload = im.onerror = null; imgs.delete(u); }
      queue = [];
      for (const u of list) {
        if (!u) continue;
        let im = imgs.get(u);
        if (!im) { im = new Image(); im.decoding = 'async'; imgs.set(u, im); }
        if (!im._s) queue.push(u);
      }
      pump();
    },
    dispose() { dead = true; for (const im of imgs.values()) { im.onload = im.onerror = null; if (im._s === 1) im.src = ''; } imgs.clear(); queue = []; },
  };
}

// Frame indices of a clip segment, coarse to fine (every 8th, then 4th, 2nd, the rest), so a slow
// connection gets a rough flip book first and fills it in.
export function coarseToFine(i0, i1) {
  const out = [], seen = new Set();
  for (const s of [8, 4, 2, 1]) for (let i = i0; i <= i1; i += s) if (!seen.has(i)) { seen.add(i); out.push(i); }
  if (!seen.has(i1)) out.push(i1);
  return out;
}

// One 2D canvas filling el. Draws pictures fitted inside a rectangle (contain, rounded corners) and
// the blurred backdrop (cover). Sizes itself to the element at up to 1.5x pixel density.
export function painter(el) {
  const cv = h('canvas', 'pp-cv');
  cv.setAttribute('aria-hidden', 'true');
  el.appendChild(cv);
  const g = cv.getContext('2d', { alpha: false });
  let W = 1, H = 1, dpr = 1;
  const api = {
    get W() { return W; }, get H() { return H; },
    size() {
      W = Math.max(1, el.clientWidth); H = Math.max(1, el.clientHeight);
      // the clip frames are 406 x 720, so more than 1.5x only costs fill rate
      dpr = Math.min(1.5, window.devicePixelRatio || 1);
      const w = Math.round(W * dpr), hh = Math.round(H * dpr);
      if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
    },
    clear(color = '#0d0b0a') {
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalAlpha = 1;
      g.fillStyle = color;
      g.fillRect(0, 0, W, H);
    },
    cover(img, alpha) {
      if (!img || alpha <= 0.002) return;
      const k = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.08;
      const w = img.naturalWidth * k, hh = img.naturalHeight * k;
      g.globalAlpha = alpha;
      // a 64 px blurred copy stretched over the stage: plain bilinear is all it needs
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'low';
      g.drawImage(img, (W - w) / 2, (H - hh) / 2, w, hh);
      g.globalAlpha = 1;
    },
    // where a picture of this aspect sits inside rect r
    fit(img, r) {
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const k = Math.min(r.w / iw, r.h / ih);
      const w = iw * k, hh = ih * k;
      return { x: r.x + (r.w - w) / 2, y: r.y + (r.h - hh) / 2, w, h: hh };
    },
    contain(img, r, alpha, radius = 12) {
      if (!img || alpha <= 0.002) return null;
      const f = api.fit(img, r);
      g.save();
      g.globalAlpha = alpha;
      g.beginPath();
      if (g.roundRect) g.roundRect(f.x, f.y, f.w, f.h, radius); else g.rect(f.x, f.y, f.w, f.h);
      g.clip();
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'medium';
      g.drawImage(img, f.x, f.y, f.w, f.h);
      g.restore();
      return f;
    },
    shade(alpha) { g.globalAlpha = alpha; g.fillStyle = '#0d0b0a'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; },
    canvas: cv,
  };
  return api;
}

// On a full-width desktop scrolly the step cards cover the left of the stage: the picture area
// starts right of them. Elsewhere (wide scrolly, phone) it is the whole stage.
export function cardEdge(el, ctx) {
  if (!(ctx.shift()[0] > 0)) return 0;
  const card = el.closest('.rx-scrolly')?.querySelector('.rx-step-card');
  if (!card) return Math.round(el.clientWidth * 0.42);
  const r = card.getBoundingClientRect(), e = el.getBoundingClientRect();
  return clamp(Math.round(r.right - e.left + 28), 0, Math.round(e.width * 0.55));
}
