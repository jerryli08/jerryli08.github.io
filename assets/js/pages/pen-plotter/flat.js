// Top-view diagrams of the linkage (no WebGL): an SVG in the plotter's own frame, seen from above
// with the motors at the bottom and +y up the screen, the way the 3D views look over the arms. The
// links are drawn as lines of their real lengths (100 mm); these are diagrams of the math, not
// models of the parts. Every picture is set by the scroll through setProgress; nothing moves by itself.
import * as K from './kin.js';
import { COLORS } from './rig.js';

const NS = 'http://www.w3.org/2000/svg';
const CSS = `
.pp-flat { position: absolute; inset: 0; overflow: hidden; font: 500 13px/1.3 var(--font, system-ui, sans-serif); color: #eee9e3; }
.pp-flat svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pp-flat canvas { position: absolute; left: 0; top: 0; }
.pp-flat .grid { stroke: rgba(238,233,227,.07); stroke-width: 1; }
.pp-flat .grid.major { stroke: rgba(238,233,227,.15); }
.pp-flat .axis { stroke: rgba(238,233,227,.45); stroke-width: 1.2; }
.pp-flat .base { stroke: rgba(238,233,227,.35); stroke-width: 2; stroke-dasharray: 5 5; }
.pp-flat .arm { stroke: #eee9e3; stroke-width: 6; stroke-linecap: round; fill: none; }
.pp-flat .fore { stroke: #b8b0a7; stroke-width: 5; stroke-linecap: round; fill: none; }
.pp-flat .ghost .arm, .pp-flat .ghost .fore { stroke: rgba(238,233,227,.38); stroke-width: 3.5; stroke-dasharray: 7 6; }
.pp-flat .ghost .joint { stroke: rgba(238,233,227,.45); }
.pp-flat .joint { fill: #0b0a09; stroke: #eee9e3; stroke-width: 2.2; }
.pp-flat .motor { fill: #26221f; stroke: #8c847b; stroke-width: 2; }
.pp-flat .pen { fill: ${COLORS.ink}; stroke: #0b0a09; stroke-width: 2; }
.pp-flat .tri-l { fill: rgba(255,107,53,.16); stroke: none; }
.pp-flat .tri-r { fill: rgba(127,212,255,.14); stroke: none; }
.pp-flat .dline { stroke-width: 2; stroke-dasharray: 6 5; fill: none; }
.pp-flat .dline.l { stroke: ${COLORS.ink}; } .pp-flat .dline.r { stroke: ${COLORS.fold}; }
.pp-flat .arc { fill: none; stroke-width: 2; }
.pp-flat .arc.l { stroke: ${COLORS.ink}; } .pp-flat .arc.r { stroke: ${COLORS.fold}; }
.pp-flat .arc.phi { stroke-dasharray: 3 3; }
.pp-flat .ink { fill: none; stroke: ${COLORS.ink}; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; }
.pp-flat .ink.good { stroke: #7be08f; }
.pp-flat .want { fill: none; stroke: rgba(238,233,227,.5); stroke-width: 1.5; stroke-dasharray: 4 4; }
.pp-flat .fold { fill: none; stroke: ${COLORS.fold}; stroke-width: 2; stroke-dasharray: 7 5; }
.pp-flat .reach { fill: rgba(238,233,227,.05); stroke: rgba(238,233,227,.3); stroke-width: 1.2; }
.pp-flat .gap { stroke: ${COLORS.warn}; stroke-width: 4; stroke-linecap: round; }
.pp-flat .hot .fore { stroke: ${COLORS.fold}; }
.pp-flat .slide { stroke: ${COLORS.fold}; stroke-width: 2.5; fill: none; }
.pp-flat .target { fill: none; stroke: rgba(238,233,227,.75); stroke-width: 2; }
.pp-flat .target.out { stroke: #8c847b; stroke-dasharray: 3 3; }
.pp-flat .lbl { position: absolute; left: 0; top: 0; white-space: nowrap; padding: 2px 8px; border-radius: 999px; font-size: 12.5px;
  background: rgba(10,8,7,.78); border: 1px solid rgba(255,255,255,.14); pointer-events: none; will-change: transform; }
.pp-flat .card { position: absolute; padding: 11px 14px; border-radius: 12px; background: rgba(10,8,7,.8); border: 1px solid rgba(255,255,255,.12);
  font: 500 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #b8b0a7; white-space: pre; pointer-events: none; }
.pp-flat .card b { color: #eee9e3; font-weight: 650; }
.pp-flat .card .l { color: ${COLORS.ink}; } .pp-flat .card .r { color: ${COLORS.fold}; } .pp-flat .card .w { color: ${COLORS.warn}; } .pp-flat .card .g { color: #7be08f; }
.pp-flat .card.tl { top: 14px; left: 14px; } .pp-flat .card.tr { top: 14px; right: 14px; }
.pp-flat .card.bl { bottom: 14px; left: 14px; } .pp-flat .card.br { bottom: 14px; right: 14px; }
@media (max-width: 640px) {
  .pp-flat .card { font-size: 10.5px; padding: 7px 9px; line-height: 1.45; }
  .pp-flat .card.tl, .pp-flat .card.tr { top: 8px; } .pp-flat .card.tl { left: 8px; } .pp-flat .card.tr { right: 8px; }
  .pp-flat .card.bl, .pp-flat .card.br { bottom: 8px; } .pp-flat .card.bl { left: 8px; } .pp-flat .card.br { right: 8px; }
  .pp-flat .lbl { font-size: 11px; }
  .pp-flat .arm { stroke-width: 4.5; } .pp-flat .fore { stroke-width: 3.5; }
}
`;
let styled = false;
let uid = 0;

export function createFlat(el, o = {}) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const root = document.createElement('div');
  root.className = 'pp-flat';
  root.setAttribute('role', 'img');
  if (o.label) root.setAttribute('aria-label', o.label);
  el.append(root);
  const canvas = o.canvas ? document.createElement('canvas') : null;
  if (canvas) root.append(canvas);
  const svg = document.createElementNS(NS, 'svg');
  const id = `pp${++uid}`;
  svg.innerHTML = `<defs>
    <marker id="${id}-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="rgba(238,233,227,.6)"/></marker>
    <marker id="${id}-b" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${COLORS.fold}"/></marker></defs>`;
  root.append(svg);
  const layers = {};
  const layer = (name) => { if (!layers[name]) { const g = document.createElementNS(NS, 'g'); svg.append(g); layers[name] = g; } return layers[name]; };
  const mk = (parent, tag, cls) => {
    const n = document.createElementNS(NS, tag);
    if (cls) n.setAttribute('class', cls);
    if (cls === 'axis') n.setAttribute('marker-end', `url(#${id}-a)`);
    if (cls === 'slide') { n.setAttribute('marker-start', `url(#${id}-b)`); n.setAttribute('marker-end', `url(#${id}-b)`); }
    parent.append(n);
    return n;
  };
  // set attributes only when they change
  const attr = (n, k, v) => { v = String(v); if (n.getAttribute(k) !== v) n.setAttribute(k, v); };
  const show = (n, on) => { const d = on ? '' : 'none'; if (n.style.display !== d) n.style.display = d; };

  // ---------------------------------------------------------------- mm to screen
  let W = 0, H = 0, s = 1, ox = 0, oy = 0, region = o.region || [-60, 160, -20, 200], margin = o.margin || [0.06, 0.06, 0.06, 0.06];
  const X = (x) => ox + x * s, Y = (y) => oy - y * s;
  const pt = (p) => `${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`;
  let onLayout = null;
  /** fit the region (code mm) with margins [top, right, bottom, left] as fractions of the stage */
  function layout(force) {
    const w = root.clientWidth, h = root.clientHeight;
    if (!force && w === W && h === H) return false;
    W = w; H = h;
    const m = typeof margin === 'function' ? margin(w, h) : margin;
    const r = typeof region === 'function' ? region(w, h) : region;
    const aw = w * (1 - m[1] - m[3]), ah = h * (1 - m[0] - m[2]);
    s = Math.min(aw / (r[1] - r[0]), ah / (r[3] - r[2]));
    ox = w * m[3] + (aw - (r[1] - r[0]) * s) / 2 - r[0] * s;
    oy = h * m[0] + (ah - (r[3] - r[2]) * s) / 2 + r[3] * s;
    if (canvas) { const dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.width = `${w}px`; canvas.style.height = `${h}px`; }
    onLayout?.();
    return true;
  }

  // ---------------------------------------------------------------- pieces
  function grid(x0, x1, y0, y1) {
    const g = layer('grid');
    const lines = [];
    for (let x = Math.ceil(x0 / 10) * 10; x <= x1; x += 10) lines.push([x % 50 ? 'grid' : 'grid major', [x, y0], [x, y1]]);
    for (let y = Math.ceil(y0 / 10) * 10; y <= y1; y += 10) lines.push([y % 50 ? 'grid' : 'grid major', [x0, y], [x1, y]]);
    const els = lines.map(([c]) => mk(g, 'line', c));
    return () => lines.forEach(([, a, b], i) => { attr(els[i], 'x1', X(a[0]).toFixed(1)); attr(els[i], 'y1', Y(a[1]).toFixed(1)); attr(els[i], 'x2', X(b[0]).toFixed(1)); attr(els[i], 'y2', Y(b[1]).toFixed(1)); });
  }
  /** a drawn linkage: set(pose, { ghost }) where pose has E1, E2, P (null P: the loop cannot close) */
  function linkage(parent, cls = '') {
    const g = mk(parent, 'g', cls);
    const armL = mk(g, 'line', 'arm'), armR = mk(g, 'line', 'arm'), foreL = mk(g, 'line', 'fore'), foreR = mk(g, 'line', 'fore');
    const gap = mk(g, 'line', 'gap');
    const jE1 = mk(g, 'circle', 'joint'), jE2 = mk(g, 'circle', 'joint'), jP = mk(g, 'circle', 'pen');
    const line = (n, a, b) => { attr(n, 'x1', X(a[0]).toFixed(1)); attr(n, 'y1', Y(a[1]).toFixed(1)); attr(n, 'x2', X(b[0]).toFixed(1)); attr(n, 'y2', Y(b[1]).toFixed(1)); };
    const dot = (n, p, r) => { attr(n, 'cx', X(p[0]).toFixed(1)); attr(n, 'cy', Y(p[1]).toFixed(1)); attr(n, 'r', r); };
    return {
      g,
      set(p) {
        show(g, !!p);
        if (!p) return;
        line(armL, [0, 0], p.E1); line(armR, [K.D, 0], p.E2);
        dot(jE1, p.E1, 5.5); dot(jE2, p.E2, 5.5);
        if (p.P) {
          line(foreL, p.E1, p.P); line(foreR, p.E2, p.P); dot(jP, p.P, 6.5);
          show(gap, false); show(jP, true);
        } else {
          // the loop cannot close: each forearm points at the other elbow, 100 mm long, with the gap between
          const u = [(p.E2[0] - p.E1[0]) / p.gap, (p.E2[1] - p.E1[1]) / p.gap];
          const a = [p.E1[0] + u[0] * K.L, p.E1[1] + u[1] * K.L], b = [p.E2[0] - u[0] * K.L, p.E2[1] - u[1] * K.L];
          line(foreL, p.E1, a); line(foreR, p.E2, b); line(gap, a, b);
          show(gap, true); show(jP, false);
        }
      },
      hot(on) { g.classList.toggle('hot', !!on); },
    };
  }
  function motors(parent) {
    const g = mk(parent, 'g');
    const base = mk(g, 'line', 'base');
    const m1 = mk(g, 'circle', 'motor'), m2 = mk(g, 'circle', 'motor');
    return () => {
      attr(base, 'x1', X(0)); attr(base, 'y1', Y(0)); attr(base, 'x2', X(K.D)); attr(base, 'y2', Y(0));
      for (const [n, x] of [[m1, 0], [m2, K.D]]) { attr(n, 'cx', X(x).toFixed(1)); attr(n, 'cy', Y(0).toFixed(1)); attr(n, 'r', Math.max(7, 21.5 * s).toFixed(1)); }
    };
  }
  function polyline(parent, cls) {
    const n = mk(parent, 'polyline', cls);
    let key = '';
    return { n, set(pts) { const k = pts.length ? pts.map(pt).join(' ') : ''; if (k !== key) { key = k; n.setAttribute('points', k); } } };
  }
  /** an arc of radius r (mm) about c from angle a0 to a1 (degrees, code sense) */
  function arcPath(c, r, a0, a1) {
    const D2R = Math.PI / 180, n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 4));
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = K.lerp(a0, a1, i / n) * D2R; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]); }
    return `M${pts.map(pt).join('L')}`;
  }
  // HTML labels pinned to points (code mm), and cards in the corners
  function label(text, cls = '') {
    const n = document.createElement('div');
    n.className = `lbl ${cls}`;
    n.textContent = text;
    root.append(n);
    let k = '';
    return {
      n,
      at(p, dx = 10, dy = -12, a = 1) {
        const t = `translate(${(X(p[0]) + dx).toFixed(1)}px, ${(Y(p[1]) + dy).toFixed(1)}px)`;
        if (t !== k) { k = t; n.style.transform = t; }
        const op = String(a);
        if (n.style.opacity !== op) n.style.opacity = op;
      },
      text(t) { if (n.textContent !== t) n.textContent = t; },
    };
  }
  function card(corner) {
    const n = document.createElement('div');
    n.className = `card ${corner}`;
    root.append(n);
    let h = '';
    return { n, html(t) { if (t !== h) { h = t; n.innerHTML = t; } }, show(on) { show(n, on); } };
  }
  return {
    root, svg, canvas, layer, mk, attr, show, X, Y, pt, grid, linkage, motors, polyline, arcPath, label, card, layout,
    get s() { return s; }, get W() { return W; }, get H() { return H; },
    setRegion(r, m) { region = r; if (m) margin = m; layout(true); },
    onLayout(fn) { onLayout = fn; },
    dispose() { root.remove(); },
  };
}

/** pose for two motor angles through forward kinematics (continuity with prev), in the same shape as kin.pose */
export function fkPose(l, r, prev) {
  const f = K.fk(l, r, prev);
  return { l, r, E1: f.E1, E2: f.E2, P: f.P, gap: f.gap };
}
