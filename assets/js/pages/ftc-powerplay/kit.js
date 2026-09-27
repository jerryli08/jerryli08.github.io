// Shared helpers for the FTC POWERPLAY page's scrollies. There is no CAD of this robot, so every
// scrolly here is 2D and built only from our real footage and photos: frame sequences cut from our
// clips, photos with outlines drawn over them as annotations, and a chart of the official results.
// Every picture is a pure function of the scroll: modules only draw or set styles inside
// setProgress (or when a frame they need finishes loading), never start timers or animations.
// Styles are scoped to .pp-* and injected once per page.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

const BASE = `
.pp { position: absolute; inset: 0; overflow: hidden; color: var(--text); font-family: inherit; }
.pp *, .pp *::before, .pp *::after { box-sizing: border-box; }
.pp [hidden] { display: none !important; }
.pp-chip { display: inline-flex; align-items: center; gap: 8px; margin: 0; padding: 5px 11px; border-radius: 999px; background: rgba(10, 8, 7, 0.8); border: 1px solid rgba(255, 255, 255, 0.14); font-size: 13px; line-height: 1.35; color: var(--text-2); white-space: nowrap; }
.pp-chip b { color: var(--text); font-weight: 650; }
.pp-kicker { margin: 0; font-size: 11px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.pp-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.pp-fade { position: absolute; top: 0; bottom: 0; left: 0; pointer-events: none; background: linear-gradient(90deg, rgba(11, 10, 9, 0.92), rgba(11, 10, 9, 0.55) 70%, rgba(11, 10, 9, 0)); }
@media (max-width: 640px) { .pp-chip { font-size: 11.5px; padding: 4px 9px; } }
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

const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) e.setAttribute(k, v);
  parent?.appendChild(e);
  return e;
}

// **bold** only, everything else as plain text (captions come from the page file)
export function rich(el, text) {
  el.replaceChildren();
  String(text).split(/(\*\*[^*]+\*\*)/).forEach((part) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) el.appendChild(h('b', null, part.slice(2, -2)));
    else if (part) el.appendChild(document.createTextNode(part));
  });
  return el;
}

/** Writes an attribute, style, text or class only when it changed. */
export function setter() {
  const seen = new WeakMap();
  const memo = (n) => { let m = seen.get(n); if (!m) seen.set(n, (m = {})); return m; };
  return {
    attr(n, k, v) { const m = memo(n); if (m[k] !== v) { m[k] = v; n.setAttribute(k, v); } },
    style(n, k, v) { const m = memo(n); const key = `s:${k}`; if (m[key] !== v) { m[key] = v; n.style[k] = v; } },
    text(n, v) { const m = memo(n); if (m.t !== v) { m.t = v; n.textContent = v; } },
    cls(n, c, on) { const m = memo(n); const key = `c:${c}`; if (m[key] !== on) { m[key] = on; n.classList.toggle(c, on); } },
  };
}

// A file in this page's media folder (a clip's name gives its poster). `small`: the 800 px copy
// (name-s.webp) when the stage is narrow.
export function mediaUrl(ctx, name, small = false) {
  let n = name.replace(/\.mp4$/, '.jpg');
  if (small && /\.webp$/.test(n)) n = n.replace(/\.webp$/, '-s.webp');
  return ctx.asset(n.startsWith('/') ? n : `/assets/media/${ctx.slug}/${n}`);
}

/**
 * How far the step cards cover the stage from the left, in px: on a full-width desktop scrolly the
 * cards sit over the left of the picture, so pictures are fitted to the right of them. 0 on a wide
 * scrolly (text beside) and on phones (text below).
 */
export function cardCover(el, ctx) {
  if (ctx.shift()[0] <= 0) return 0;
  const card = el.closest('.rx-scrolly')?.querySelector('.rx-step-card');
  if (!card) return 0;
  const r = card.getBoundingClientRect(), e = el.getBoundingClientRect();
  return clamp(r.right - e.left + 28, 0, e.width * 0.6);
}

/**
 * Fit an image of size (iw, ih) into the area so its `focus` rectangle ([x0, y0, x1, y1], 0..1 of
 * the image) is fully visible and as large as possible, centred in the area. The rest of the image
 * extends around it and is clipped by the stage (slid so it covers as much of the area as it can).
 */
export function fitFocus(area, iw, ih, focus = [0, 0, 1, 1]) {
  const [x0, y0, x1, y1] = focus;
  const fw = (x1 - x0) * iw, fh = (y1 - y0) * ih;
  const k = Math.min(area.w / fw, area.h / fh);
  const w = iw * k, hh = ih * k;
  // focus centre on the area centre, then slide to cover the area where the image allows it
  let x = area.x + area.w / 2 - ((x0 + x1) / 2) * w;
  let y = area.y + area.h / 2 - ((y0 + y1) / 2) * hh;
  if (w >= area.w) x = clamp(x, area.x + area.w - w, area.x); else x = area.x + (area.w - w) / 2;
  if (hh >= area.h) y = clamp(y, area.y + area.h - hh, area.y); else y = area.y + (area.h - hh) / 2;
  // never slide the focus out of the area
  x = clamp(x, area.x - x0 * w, area.x + area.w - x1 * w);
  y = clamp(y, area.y - y0 * hh, area.y + area.h - y1 * hh);
  return { x, y, w, h: hh, k };
}

/**
 * A sequence of still frames cut from one of our clips, drawn on a canvas. Frames load
 * coarse to fine (every 8th, then every 4th, ...) so a rough scrub works almost at once; until a
 * frame has loaded, the nearest loaded one is drawn. Only `show()` and a finished load of a closer
 * frame draw anything.
 *   seq.times  clip time (s) of each frame
 *   seq.url(i) its (hashed) URL
 */
export function frameSeq(ctx, { dir, prefix, times, w, h: ih, small = false }) {
  const n = times.length;
  const url = (i) => ctx.asset(`${dir}/${prefix}-${String(i).padStart(3, '0')}${small ? '-s' : ''}.webp`);
  const imgs = new Array(n).fill(null);
  const ready = new Uint8Array(n);
  let onReady = null;
  let started = false;
  const order = [];
  for (let step = 8; step >= 1; step >>= 1) for (let i = 0; i < n; i += step) if (!order.includes(i)) order.push(i);
  if (!order.includes(n - 1)) order.splice(1, 0, n - 1);
  let next = 0, inflight = 0;
  const MAX = 4;
  function pump() {
    while (inflight < MAX && next < order.length) {
      const i = order[next++];
      if (imgs[i]) continue;
      const im = new Image();
      im.decoding = 'async';
      inflight++;
      // decode off the main thread before the frame is used, so drawing it on scroll is cheap
      im.onload = () => {
        const done = () => { inflight--; ready[i] = 1; onReady?.(i); pump(); };
        if (im.decode) im.decode().then(done, done); else done();
      };
      im.onerror = () => { inflight--; pump(); };
      im.src = url(i);
      imgs[i] = im;
    }
  }
  // load the frames around i first (the reader arrived part way through)
  function prefer(i) {
    for (const j of [i, i + 1, i - 1, i + 2, i - 2]) {
      if (j < 0 || j >= n || imgs[j]) continue;
      const k = order.indexOf(j, next);
      if (k > next) { order.splice(k, 1); order.splice(next, 0, j); }
    }
  }
  return {
    n, times, w, h: ih,
    /** index of the frame for clip time t */
    at(t) {
      let lo = 0, hi = n - 1;
      if (t <= times[0]) return 0;
      if (t >= times[hi]) return hi;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (times[m] <= t) lo = m; else hi = m; }
      return t - times[lo] < times[hi] - t ? lo : hi;
    },
    /** the loaded frame nearest to i (or null) */
    nearest(i) {
      if (!started) { started = true; prefer(i); pump(); }
      for (let d = 0; d < n; d++) {
        if (i - d >= 0 && ready[i - d]) return { i: i - d, img: imgs[i - d] };
        if (i + d < n && ready[i + d]) return { i: i + d, img: imgs[i + d] };
      }
      return null;
    },
    want(i) { if (!started) { started = true; prefer(i); pump(); } else if (!imgs[i]) { prefer(i); pump(); } },
    set onReady(fn) { onReady = fn; },
    start() { if (!started) { started = true; pump(); } },
  };
}

/** A canvas that fills `parent` at the device pixel ratio (capped), redrawn by the caller. */
export function canvasLayer(parent) {
  const c = h('canvas', 'pp-canvas');
  c.setAttribute('aria-hidden', 'true');
  parent.appendChild(c);
  const g = c.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  return {
    c, g,
    size() {
      const r = parent.getBoundingClientRect();
      const d = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, Math.round(r.width)), hh = Math.max(1, Math.round(r.height));
      if (w !== W || hh !== H || d !== dpr) {
        W = w; H = hh; dpr = d;
        c.width = Math.round(w * d); c.height = Math.round(hh * d);
      }
      return { W, H, dpr };
    },
    get W() { return W; }, get H() { return H; }, get dpr() { return dpr; },
  };
}
