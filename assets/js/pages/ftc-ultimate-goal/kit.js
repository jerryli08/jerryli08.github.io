// Shared bits for the FTC ULTIMATE GOAL page's scroll-driven slideshows. There is no CAD of this
// robot (Jerry's checklist: "CAD (N/A)"), so every scrolly here is built from real photos and real
// footage only (webgl: false, no stand-in geometry). Every picture is a pure function of the scroll
// position: nothing plays, nothing animates on its own, and there is nothing to click or drag.
// Styles are scoped to .ug-* and injected once per page. The one playful extra on this page is a
// marker font (Permanent Marker, Google Fonts) for date stamps and doodles, loaded only when a
// scrolly mounts.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const easeOut = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return 1 - (1 - t) ** 3; };
export const lerp = (a, b, t) => a + (b - a) * t;

const BASE = `
.ug { position: absolute; inset: 0; overflow: hidden; color: var(--text); font-family: inherit; }
.ug *, .ug *::before, .ug *::after { box-sizing: border-box; }
.ug [hidden] { display: none !important; }
.ug-marker { font-family: 'Permanent Marker', 'Comic Sans MS', 'Chalkboard SE', cursive; font-weight: 400; letter-spacing: 0.02em; }
.ug-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px; border-radius: 999px; background: rgba(10, 8, 7, 0.78); border: 1px solid rgba(255, 255, 255, 0.14); font-size: 13px; line-height: 1.35; color: var(--text-2); white-space: nowrap; }
.ug-chip b { color: var(--text); font-weight: 650; font-variant-numeric: tabular-nums; }
.ug-doodle { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.ug-doodle path { fill: none; stroke: var(--accent); stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; }
.ug-note { position: absolute; transform: translate(-50%, -50%); color: var(--accent); font-size: clamp(15px, 1.5vw, 22px); line-height: 1; white-space: nowrap; text-shadow: 0 1px 2px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.55); pointer-events: none; }
.ug-rings { display: inline-flex; gap: 6px; align-items: center; }
.ug-rings svg { width: 26px; height: 26px; display: block; }
.ug-rings circle { fill: none; stroke: rgba(255, 107, 53, 0.35); stroke-width: 5; }
.ug-rings .on circle { stroke: #ff7a2e; }
@media (max-width: 900px) { .ug-rings svg { width: 20px; height: 20px; } .ug-chip { font-size: 12px; padding: 4px 9px; } }
`;

export function css(id, text) {
  if (!document.getElementById('ug-css')) {
    const st = document.createElement('style'); st.id = 'ug-css'; st.textContent = BASE; document.head.appendChild(st);
  }
  if (id && !document.getElementById(id)) {
    const st = document.createElement('style'); st.id = id; st.textContent = text; document.head.appendChild(st);
  }
}

// The marker face, subset by Google Fonts to the characters the page uses (a few KB).
export function markerFont() {
  if (document.getElementById('ug-font')) return;
  const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 :.,!?+-/';
  const l = document.createElement('link');
  l.id = 'ug-font'; l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap&text=${encodeURIComponent(text)}`;
  document.head.appendChild(l);
}

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const NS = 'http://www.w3.org/2000/svg';
export function svg(parent, tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

// **bold** only; everything else as plain text (captions come from the page file)
export function rich(el, text) {
  el.replaceChildren();
  String(text).split(/(\*\*[^*]+\*\*)/).forEach((part) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) el.appendChild(h('b', null, part.slice(2, -2)));
    else if (part) el.appendChild(document.createTextNode(part));
  });
  return el;
}

// Writes a style, attribute or text only when it changed (scroll frames stay cheap).
export function setter() {
  const seen = new WeakMap();
  const memo = (n) => { let m = seen.get(n); if (!m) seen.set(n, (m = {})); return m; };
  return {
    style(n, k, v) { const m = memo(n); if (m['s' + k] !== v) { m['s' + k] = v; n.style[k] = v; } },
    prop(n, k, v) { const m = memo(n); if (m['p' + k] !== v) { m['p' + k] = v; n.style.setProperty(k, v); } },
    attr(n, k, v) { const m = memo(n); if (m['a' + k] !== v) { m['a' + k] = v; n.setAttribute(k, v); } },
    text(n, v) { const m = memo(n); if (m.t !== v) { m.t = v; n.textContent = v; } },
    cls(n, c, on) { const m = memo(n); if (m['c' + c] !== on) { m['c' + c] = on; n.classList.toggle(c, on); } },
  };
}

// A file in this page's media folder; `small` picks the 800 px copy (name-s.webp) of a photo.
export function mediaUrl(ctx, name, small = false) {
  let n = name.replace(/\.mp4$/, '.jpg');
  if (small && /\.webp$/.test(n) && !/-s\.webp$/.test(n)) n = n.replace(/\.webp$/, '-s.webp');
  return ctx.asset(n.startsWith('/') ? n : `/assets/media/${ctx.slug}/${n}`);
}

// On a full-width desktop scrolly the step cards cover the left of the stage: the free area starts
// right of them. Returns the left edge of the free area in stage pixels (0 elsewhere).
export function freeLeft(el, ctx) {
  if (ctx.shift()[0] <= 0) return 0;
  const card = el.closest('.rx-scrolly')?.querySelector('.rx-step-card');
  if (!card) return Math.round(el.clientWidth * 0.42);
  const r = card.getBoundingClientRect(), e = el.getBoundingClientRect();
  return Math.round(clamp(r.right - e.left + 28, 0, e.width * 0.55));
}

// Three ring outlines; the first n are lit.
export function ringMeter(n = 3) {
  const wrap = h('span', 'ug-rings');
  const rings = [];
  for (let i = 0; i < n; i++) {
    const s = svg(null, 'svg', { viewBox: '0 0 26 26', 'aria-hidden': 'true' });
    svg(s, 'circle', { cx: 13, cy: 13, r: 9.5 });
    wrap.appendChild(s);
    rings.push(s);
  }
  let last = -1;
  return {
    el: wrap,
    set(k) {
      if (k === last) return;
      last = k;
      rings.forEach((r, i) => r.classList.toggle('on', i < k));
    },
  };
}

// Clip time as 0:01.9
export const clock = (t) => `0:${String(Math.floor(t)).padStart(2, '0')}.${Math.floor((t % 1) * 10)}`;

// A frame sequence cut from one of our clips, drawn into a canvas by index. The frames load in
// coarse-to-fine order (every 8th first, then every 4th, ...) so scrolling on finds a near frame
// ready; draw(i) shows the nearest frame that has loaded. It draws only when the frame or the size
// changes, and never on its own.
// `url(i)` gives frame i's (hashed) URL.
export function frameSeq(canvas, { url, count }, onLoad) {
  const imgs = new Array(count).fill(null);
  const ok = new Array(count).fill(false);
  const order = [];
  const seen = new Set();
  for (const stride of [16, 8, 4, 2, 1]) for (let i = 0; i < count; i += stride) if (!seen.has(i)) { seen.add(i); order.push(i); }
  if (!seen.has(count - 1)) order.push(count - 1);
  let next = 0, inflight = 0, dead = false;
  const pump = () => {
    while (!dead && inflight < 6 && next < order.length) {
      const i = order[next++];
      const im = new Image();
      im.decoding = 'async';
      inflight++;
      im.onload = () => { inflight--; if (dead) return; imgs[i] = im; ok[i] = true; onLoad?.(i); pump(); };
      im.onerror = () => { inflight--; pump(); };
      im.src = url(i);
    }
  };
  pump();
  const g = canvas.getContext('2d');
  let shown = -1, sizeKey = '';
  function nearest(i) {
    if (ok[i]) return i;
    for (let d = 1; d < count; d++) {
      if (i - d >= 0 && ok[i - d]) return i - d;
      if (i + d < count && ok[i + d]) return i + d;
    }
    return -1;
  }
  return {
    // draw frame i into the canvas, which the caller has sized (css px w, h at ratio dpr)
    draw(i, force = false) {
      const k = nearest(clamp(Math.round(i), 0, count - 1));
      const key = `${canvas.width}x${canvas.height}`;
      if (k < 0 || (!force && k === shown && key === sizeKey)) return k >= 0;
      shown = k; sizeKey = key;
      g.drawImage(imgs[k], 0, 0, canvas.width, canvas.height);
      return true;
    },
    reset() { shown = -1; },
    dispose() { dead = true; imgs.fill(null); },
  };
}

// A marker doodle as an SVG path in a viewBox of (1000 * ar) x 1000, where ar is the picture's
// width / height. Doodles are given in the picture's own 0..1 box, placed against the final cut:
//   { ring: [cx, cy, rx, ry] }   a loop drawn round something (rx of the width, ry of the height)
//   { line: [[x, y], ...] }      an underline or a bracket
//   { arrow: [[x0, y0], [x1, y1]] } a slightly bent arrow with a head at the end
//   { star: [cx, cy, r] }        a five-pointed star, r of the height
export function doodle(d, ar) {
  const X = (x) => (x * 1000 * ar).toFixed(1), Y = (y) => (y * 1000).toFixed(1);
  if (d.ring) {
    const [cx, cy, rx, ry] = d.ring;
    const pts = [];
    // a hand-drawn loop: a bit more than one turn, radius wobbling so the ends overlap
    for (let i = 0; i <= 44; i++) {
      const a = -2.2 + (i / 40) * Math.PI * 2;
      const w = 1 + 0.06 * Math.sin(i * 0.9) + (i / 44) * 0.08;
      pts.push(`${X(cx + Math.cos(a) * rx * w)} ${Y(cy + Math.sin(a) * ry * w)}`);
    }
    return `M${pts.join(' L')}`;
  }
  if (d.line) return `M${d.line.map(([x, y]) => `${X(x)} ${Y(y)}`).join(' L')}`;
  if (d.arrow) {
    const [[x0, y0], [x1, y1]] = d.arrow;
    const px0 = x0 * ar, px1 = x1 * ar; // work in a square space so the head is not squashed
    const mx = (px0 + px1) / 2 - (y1 - y0) * 0.12, my = (y0 + y1) / 2 + (px1 - px0) * 0.12;
    const ang = Math.atan2(y1 - my, px1 - mx), L = Math.hypot(px1 - px0, y1 - y0) * 0.22;
    const hx = (a) => ((px1 - Math.cos(ang + a) * L) / ar), hy = (a) => (y1 - Math.sin(ang + a) * L);
    return `M${X(x0)} ${Y(y0)} Q${X(mx / ar)} ${Y(my)} ${X(x1)} ${Y(y1)} M${X(hx(0.5))} ${Y(hy(0.5))} L${X(x1)} ${Y(y1)} L${X(hx(-0.5))} ${Y(hy(-0.5))}`;
  }
  if (d.star) {
    const [cx, cy, r] = d.star;
    const pts = [];
    for (let i = 0; i <= 5; i++) {
      const a = -Math.PI / 2 + i * ((4 * Math.PI) / 5);
      pts.push(`${X(cx + (Math.cos(a) * r) / ar)} ${Y(cy + Math.sin(a) * r)}`);
    }
    return `M${pts.join(' L')}`;
  }
  return '';
}
