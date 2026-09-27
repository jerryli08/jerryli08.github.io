// The path of one command, from a downward-camera frame to the motors, as the flight script and the
// CAD have it. A 2D scrolly (SVG, no WebGL): each step lights the boxes it is about, and a dot runs
// along the arrows as the reader scrolls. Every picture is a pure function of (step, progress).
const NODES = {
  down: ['Downward camera', 'Pi Camera Module 3'],
  pic: ['Picamera2', 'one frame per loop'],
  cv: ['OpenCV + NumPy', 'find the line'],
  pd: ['PD control', 'pixels to m/s and °/s'],
  mav: ['MAVSDK-Python', 'gRPC to mavsdk_server'],
  fc: ['Flight controller', 'Offboard mode'],
  motors: ['4 motors', '2216, 880 KV'],
  fwd: ['Forward camera', 'Pi Camera Module 3'],
  flow: ['ARK Flow', 'optical flow + distance'],
  rc: ['RC transmitter', 'manual takeover'],
};
// [x, y, w] per box (height BH), the Pi's frame [x, y, w, h], and the arrows [from, to, dashed]
const WIDE = {
  vb: [820, 600], bh: 58, t1: 15, t2: 12,
  box: { down: [30, 20, 160], fwd: [630, 20, 160], pic: [30, 160, 160], cv: [230, 160, 160], pd: [430, 160, 160], mav: [630, 160, 160],
    flow: [30, 390, 180], fc: [290, 390, 240], rc: [610, 390, 180], motors: [330, 522, 160] },
  pi: [14, 128, 792, 128], piLabel: 'Raspberry Pi 5: Python 3 with asyncio',
  link: { at: [614, 310], lines: ['MAVLink over UART', '/dev/ttyAMA0, 57,600 baud'] },
  fwdNote: { at: [622, 108], text: 'obstacles: hoops with AprilTags', anchor: 'end' },
};
const NARROW = {
  vb: [360, 466], bh: 50, t1: 13.5, t2: 11,
  box: { down: [8, 6, 166], fwd: [186, 6, 166], pic: [20, 100, 150], cv: [190, 100, 150], pd: [190, 186, 150], mav: [20, 186, 150],
    flow: [8, 322, 100], fc: [120, 322, 120], rc: [252, 322, 100], motors: [120, 410, 120] },
  pi: [8, 76, 344, 196], piLabel: 'Raspberry Pi 5, Python 3',
  link: { at: [14, 300], lines: ['MAVLink, UART'] },
  fwdNote: null,
};
const ARROWS = [['down', 'pic'], ['pic', 'cv'], ['cv', 'pd'], ['pd', 'mav'], ['mav', 'fc'], ['fc', 'motors'], ['fwd', 'pi', true], ['flow', 'fc'], ['rc', 'fc']];
// per step: the boxes it is about, and the arrows a dot runs along (each inner list one after another)
const STEPS = [
  { lit: ['down', 'pic'], run: [['down-pic']] },
  { lit: ['cv'], run: [['pic-cv']] },
  { lit: ['pd'], run: [['cv-pd']] },
  { lit: ['mav', 'fc'], run: [['pd-mav', 'mav-fc']], link: true },
  { lit: ['fc', 'motors'], run: [['fc-motors']] },
  { lit: ['fwd', 'flow', 'rc'], run: [['fwd-pi'], ['flow-fc'], ['rc-fc']] },
];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const NS = 'http://www.w3.org/2000/svg';

export async function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  el.style.background = 'var(--bg-raise)';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:clamp(12px, 3%, 40px);box-sizing:border-box;';
  el.appendChild(wrap);

  let L = null, parts = null;
  function build() {
    const narrow = el.clientWidth < 560;
    const want = narrow ? NARROW : WIDE;
    if (L === want) return false;
    L = want;
    const [vw, vh] = L.vb, BH = L.bh;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Data path: downward camera, Picamera2, OpenCV and NumPy, PD control and MAVSDK on the Raspberry Pi 5, then MAVLink over UART to the flight controller in Offboard mode and the four motors; the forward camera, the ARK Flow sensor and the RC transmitter feed in from the side.');
    svg.style.cssText = 'width:100%;height:100%;max-width:100%;max-height:100%;font-family:inherit;overflow:visible;';
    const E = (tag, attrs, parent = svg) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
    const defs = E('defs', {});
    const mk = E('marker', { id: `adr-arrow-${ctx.id}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    E('path', { d: 'M0 0L10 5L0 10z', fill: '#ff9a62' }, mk);
    const [px, py, pw, ph] = L.pi;
    const piRect = E('rect', { x: px, y: py, width: pw, height: ph, rx: 14, fill: 'rgba(61,220,132,.05)', stroke: 'rgba(61,220,132,.55)', 'stroke-dasharray': '6 5' });
    const piText = E('text', { x: px + 12, y: py + ph - 10, fill: '#3ddc84', 'font-size': L.t2 + 1, 'font-weight': 650 });
    piText.textContent = L.piLabel;
    // box edges, for arrows between them
    const rectOf = (k) => (k === 'pi' ? [px, py, pw, ph] : [L.box[k][0], L.box[k][1], L.box[k][2], BH]);
    const edge = (k, toward) => {
      const [x, y, w, h] = rectOf(k), cx = x + w / 2, cy = y + h / 2, dx = toward[0] - cx, dy = toward[1] - cy;
      const s = Math.min(Math.abs(w / 2 / (dx || 1e-6)), Math.abs(h / 2 / (dy || 1e-6)));
      return [cx + dx * s, cy + dy * s];
    };
    const center = (k) => { const [x, y, w, h] = rectOf(k); return [x + w / 2, y + h / 2]; };
    const arrows = {};
    for (const [a, b, dashed] of ARROWS) {
      let p1, p2;
      if (b === 'pi') { const [x, y, w] = rectOf(a); p1 = [x + w / 2, y + BH]; p2 = [x + w / 2, py]; } // straight down into the Pi's frame
      else { p1 = edge(a, center(b)); p2 = edge(b, center(a)); }
      const line = E('line', { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1], stroke: '#ff9a62', 'stroke-width': 2, 'marker-end': `url(#adr-arrow-${ctx.id})`, ...(dashed ? { 'stroke-dasharray': '5 4' } : {}) });
      arrows[`${a}-${b}`] = { line, p1, p2, o: -1 };
    }
    const link = E('g', {});
    L.link.lines.forEach((t, i) => { const e = E('text', { x: L.link.at[0], y: L.link.at[1] + i * (L.t2 + 4), fill: i ? 'rgba(238,233,227,.6)' : 'rgba(238,233,227,.88)', 'font-size': i ? L.t2 - 0.5 : L.t2 }, link); e.textContent = t; });
    if (L.fwdNote) { const e = E('text', { x: L.fwdNote.at[0], y: L.fwdNote.at[1], 'text-anchor': L.fwdNote.anchor, fill: 'rgba(238,233,227,.7)', 'font-size': L.t2 }); e.textContent = L.fwdNote.text; }
    const boxes = {};
    for (const [k, [x, y, w]] of Object.entries(L.box)) {
      const g = E('g', {});
      const r = E('rect', { x, y, width: w, height: BH, rx: 10, fill: '#1b1714', stroke: 'rgba(238,233,227,.22)', 'stroke-width': 1.5 }, g);
      const t1 = E('text', { x: x + w / 2, y: y + BH * 0.44, 'text-anchor': 'middle', fill: '#eee9e3', 'font-size': L.t1, 'font-weight': 650 }, g); t1.textContent = NODES[k][0];
      const t2 = E('text', { x: x + w / 2, y: y + BH * 0.76, 'text-anchor': 'middle', fill: 'rgba(238,233,227,.62)', 'font-size': L.t2 }, g); t2.textContent = NODES[k][1];
      boxes[k] = { g, r, s: '' };
    }
    const dots = [0, 1, 2].map(() => E('circle', { r: narrow ? 5 : 6, fill: '#ff6b35', stroke: '#fff1e2', 'stroke-width': 1.5, opacity: 0 }));
    wrap.replaceChildren(svg);
    parts = { svg, boxes, arrows, dots, link, piRect, piText, linkO: -1 };
    return true;
  }

  // how lit each box is at a step: 1 now, 0.62 already covered, 0.34 still to come
  const firstLit = {};
  STEPS.forEach((s, i) => s.lit.forEach((b) => { if (!(b in firstLit)) firstLit[b] = i; }));
  const levelAt = (b, i) => (STEPS[i].lit.includes(b) ? 1 : firstLit[b] < i ? 0.62 : 0.34);
  const arrowAt = (a, i) => (STEPS[i].run.some((r) => r.includes(a)) ? 1 : STEPS.slice(0, i).some((s) => s.run.some((r) => r.includes(a))) ? 0.6 : 0.25);

  let last = [0, 0];
  function setProgress(p, step, stepP) {
    last = [step, stepP];
    build();
    step = clamp(step | 0, 0, STEPS.length - 1);
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    for (const [b, o] of Object.entries(parts.boxes)) {
      const lv = lerp(levelAt(b, prev), levelAt(b, step), k);
      const s = lv.toFixed(3);
      if (s === o.s) continue;
      o.s = s;
      o.g.setAttribute('opacity', String(0.25 + 0.75 * lv));
      const on = lv > 0.9;
      o.r.setAttribute('stroke', on ? '#ff6b35' : 'rgba(238,233,227,.22)');
      o.r.setAttribute('fill', on ? '#2a1b12' : '#1b1714');
    }
    for (const [a, o] of Object.entries(parts.arrows)) {
      const lv = lerp(arrowAt(a, prev), arrowAt(a, step), k).toFixed(3);
      if (lv !== o.o) { o.line.setAttribute('opacity', lv); o.o = lv; }
    }
    const lk = (lerp(STEPS[prev].link ? 1 : 0.55, STEPS[step].link ? 1 : 0.55, k)).toFixed(3);
    if (lk !== parts.linkO) { parts.link.setAttribute('opacity', lk); parts.linkO = lk; }
    // a dot runs along this step's arrows as the reader scrolls through it
    const runs = STEPS[step].run;
    parts.dots.forEach((d, i) => {
      const r = runs[i];
      if (!r || reduced) { d.setAttribute('opacity', '0'); return; }
      const f = smooth(0.12, 0.92, stepP) * r.length, j = Math.min(r.length - 1, Math.floor(f)), g = f - j;
      const { p1, p2 } = parts.arrows[r[j]];
      d.setAttribute('cx', lerp(p1[0], p2[0], g).toFixed(1));
      d.setAttribute('cy', lerp(p1[1], p2[1], g).toFixed(1));
      d.setAttribute('opacity', (smooth(0.04, 0.14, stepP) * (1 - smooth(0.93, 1, stepP))).toFixed(3));
    });
  }
  setProgress(0, 0, 0);
  const ro = new ResizeObserver(() => { if (build()) setProgress(0, last[0], last[1]); });
  ro.observe(el);
  return { setProgress, dispose() { ro.disconnect(); wrap.remove(); } };
}
