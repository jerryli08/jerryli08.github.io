// Shared helpers for the FTC CENTERSTAGE page's 2D scrollies (no WebGL: there is no CAD of this
// robot). Every picture here is a pure function of the scroll: modules only set styles in
// setProgress, never start timers or animations of their own.

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;

export const PIXEL = { white: '#f1ede6', green: '#52c46a', purple: '#a784e6', yellow: '#f3c23c' };
export const INK = { text: '#eee9e3', text2: '#b8b0a7', muted: '#8c847b', accent: '#ff6b35', line: 'rgba(237,232,226,0.14)', red: '#e5484d', blue: '#3d8bff' };

/** Injects a stylesheet once per page. */
export function css(id, text) {
  if (document.getElementById(id)) return;
  const s = document.createElement('style');
  s.id = id;
  s.textContent = text;
  document.head.appendChild(s);
}

/** h('div', 'cls', { attr: v }, ...children) */
export function h(tag, cls, attrs, ...kids) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const k of kids) if (k != null) e.append(k);
  return e;
}

const NS = 'http://www.w3.org/2000/svg';
/** s(parent, 'rect', { x: 1 }) makes an SVG element and appends it. */
export function s(parent, tag, attrs = {}) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}
export function svgRoot(cls) {
  const e = document.createElementNS(NS, 'svg');
  if (cls) e.setAttribute('class', cls);
  return e;
}

/** Writes an attribute or style only when its value changed (scroll frames are cheap that way). */
export function setter() {
  const seen = new WeakMap();
  const memo = (node) => { let m = seen.get(node); if (!m) seen.set(node, (m = {})); return m; };
  return {
    attr(node, k, v) { const m = memo(node); if (m[k] !== v) { m[k] = v; node.setAttribute(k, v); } },
    style(node, k, v) { const m = memo(node); const key = `s:${k}`; if (m[key] !== v) { m[key] = v; node.style[k] = v; } },
    text(node, v) { const m = memo(node); if (m.t !== v) { m.t = v; node.textContent = v; } },
    cls(node, c, on) { const m = memo(node); const key = `c:${c}`; if (m[key] !== on) { m[key] = on; node.classList.toggle(c, on); } },
  };
}

/** A pointy-top hexagon (a pixel as it sits on the backdrop), across flats = w. */
export function hexPoints(cx, cy, w) {
  const r = w / Math.sqrt(3); // centre to corner
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

/** The instrument panel used on every stage (site.css styles .rx-hud). */
export function hud(parent, html, cls = '') {
  const el = h('div', `rx-hud${cls ? ` ${cls}` : ''}`);
  el.innerHTML = html;
  parent.append(el);
  const K = Object.fromEntries([...el.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const set = (key, v, fn) => { if (shown[key] !== v) { shown[key] = v; fn(v); } };
  return {
    el,
    put: (k, text) => set(k, text, (v) => { K[k].textContent = v; }),
    html: (k, markup) => set(`${k}:h`, markup, (v) => { K[k].innerHTML = v; }),
    show: (k, on) => set(`${k}:d`, on ? '' : 'none', (v) => { K[k].style.display = v; }),
    cls: (k, c, on) => set(`${k}:${c}`, on, (v) => { K[k].classList.toggle(c, v); }),
  };
}

/** Escapes text for innerHTML. */
export const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Where the step cards leave the stage free on a full-width desktop scrolly (px from the left). */
export function freeLeft(el, ctx) {
  const W = el.clientWidth;
  if (ctx.shift()[0] === 0) return 0; // wide scrolly or phone: nothing covers the stage
  const gutter = Math.min(56, Math.max(20, innerWidth * 0.032));
  const container = Math.max(gutter, (innerWidth - 1180) / 2);
  return Math.min(W * 0.56, container + 540 + 36);
}
