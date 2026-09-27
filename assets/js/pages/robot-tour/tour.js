// "A run through the example track", scroll-driven. A top-down map of the example track from the
// 2025 Robot Tour C rules, and Jerry's final coded route through it (route.js): as the reader
// scrolls, the robot drives the 45 moves and the panel shows what the robot knows, computed with the
// code's own formulas: the OTOS reading (reset after every move), the distance and heading targets
// and errors, the two controller outputs, the wheel commands after the deadband offsets and the
// 0.2 cap, and the servo values written. The robot is a top-down render of the real CAD.
// Drawn on a 2D canvas (no WebGL): the static track is drawn once per size, then each scroll frame
// blits it and draws the trail and the robot. Nothing moves on its own.
import { TRACK, START, TARGET, GATES, OBSTACLES, ROBOT, START_POSE, MOVES, simulate, state, at, drifted, enumOf } from './route.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const DEG = Math.PI / 180;
const ORANGE = '#ff6b35', GREEN = '#22c55e', RED = '#ef4444', WOOD = '#d9a441';
// the sprite: a straight-down render of the CAD, cropped to the frame's footprint (142.0 x 162.7 mm);
// the turning point is at the middle across and 86.2 mm down from the front edge (from the CAD)
const SPRITE = { src: '/assets/models/robot-tour/sprite-top.webp', w: 14.2, h: 16.27, cy: 8.62 };
// scroll steps: 0 the track, 1..4 the route in four parts, 5 the drift illustration
const PARTS = [[0, 0], [0, 11], [11, 25], [25, 36], [36, 45], [45, 45]];
// the map shows x from -20 to 206 cm (the robot starts outside the left edge) and y from -6 to 256
const EXT = { x0: -20, x1: 206, y0: -6, y1: 256 };

export async function mount(el, ctx) {
  const sim = simulate();
  const moves = sim.moves;
  const drift = drifted(sim, -0.4, 1.03); // an illustration: see route.js
  // when the dowel first fully enters each gate zone (the rules score the dowel only)
  const gateAt = {};
  for (let t = 0; t <= sim.total; t += sim.total / 6000) {
    const { m, u } = at(sim, t);
    const s = state(m, u);
    const dx = s.P[0] + ROBOT.dowel * Math.cos(s.th), dy = s.P[1] + ROBOT.dowel * Math.sin(s.th), r = ROBOT.dowelR;
    for (const g of GATES) if (gateAt[g.id] == null && dx - r > g.x0 && dx + r < g.x1 && dy - r > g.y0 && dy + r < g.y1) gateAt[g.id] = t;
  }
  const straight = moves.filter((m) => !m.turn).reduce((a, m) => a + m.d, 0);

  const img = new Image();
  img.decoding = 'async';
  img.src = ctx.asset(SPRITE.src);
  await img.decode().catch(() => {});

  const wrap = document.createElement('div');
  Object.assign(wrap.style, { position: 'absolute', inset: '0', overflow: 'hidden' });
  const canvas = document.createElement('canvas');
  canvas.className = 'rx-canvas';
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0' });
  wrap.append(canvas);
  el.appendChild(wrap);
  const g = canvas.getContext('2d');
  const stat = document.createElement('canvas');
  const font = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';

  // ---------------------------------------------------------------- the panel
  const hud = document.createElement('div');
  hud.className = 'rx-hud rt-hud';
  hud.innerHTML = `
    <style>
      .rt-hud{position:absolute;right:auto;bottom:auto;box-sizing:border-box;padding:11px 14px 12px}
      .rt-hud .rt-g{display:grid;grid-template-columns:0.95fr 1fr 1.15fr;gap:4px 18px}
      .rt-hud .rt-h{font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:#8c847b;margin-bottom:3px}
      .rt-hud .rx-hud-row{margin-top:1px}
      .rt-hud .rt-mono{font:11.5px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;color:#eee9e3}
      .rt-hud .rt-note{color:#8c847b}
      .rt-hud .rt-big{font-size:21px;font-weight:650;color:#eee9e3;line-height:1.1}
      .rt-hud .rt-chips{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}
      .rt-hud .rt-chip{font-size:11px;font-weight:650;padding:1px 7px;border-radius:999px;border:1px solid rgba(255,255,255,.18);color:#8c847b}
      .rt-hud .rt-chip.on{background:rgba(34,197,94,.2);border-color:#22c55e;color:#bbf7d0}
      .rt-hud .rt-w{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;margin-top:1px}
      .rt-hud .rt-w b{color:#eee9e3;font-weight:650;min-width:3.4em;text-align:right}
      .rt-hud .rt-bar{position:relative;height:6px;border-radius:3px;background:rgba(255,255,255,.12)}
      .rt-hud .rt-bar em{position:absolute;top:0;bottom:0;left:50%;border-radius:3px;background:#ff6b35}
      .rt-hud .rt-bar::after{content:"";position:absolute;left:50%;top:-2px;bottom:-2px;width:1px;background:rgba(255,255,255,.35)}
      .rt-hud .rt-log{margin-top:6px;padding-top:5px;border-top:1px solid rgba(255,255,255,.1);white-space:pre;overflow:hidden;color:#b8b0a7;font-size:11px}
      .rt-hud .ok{color:#86efac}
      .rt-hud .dim{color:#8c847b;font-weight:500}
      .rt-hud.rt-compact{padding:7px 10px 8px}
      .rt-hud.rt-compact .rt-g{grid-template-columns:auto 1fr;gap:2px 14px}
      .rt-hud.rt-compact .rt-x{display:none}
      .rt-hud.rt-compact .rt-big{font-size:16px}
      .rt-hud.rt-compact .rt-chips{margin-top:3px}
    </style>
    <div class="rt-g">
      <div>
        <div class="rt-h">Move</div>
        <div class="rt-big num"><span data-k="n"></span><span style="font-size:13px;color:#8c847b"> / 45</span></div>
        <div class="rt-mono" data-k="name"></div>
        <div class="rt-mono rt-note rt-x" data-k="note"></div>
        <div class="rt-chips" data-k="chips"></div>
        <div class="rx-hud-row rt-x" style="margin-top:5px"><span>Driven</span><b class="num" data-k="dist"></b></div>
      </div>
      <div>
        <div class="rt-h">OTOS, this move</div>
        <div class="rx-hud-row"><span>X</span><b class="num" data-k="x"></b></div>
        <div class="rx-hud-row"><span>Y</span><b class="num" data-k="y"></b></div>
        <div class="rx-hud-row"><span>Heading</span><b class="num" data-k="h"></b></div>
        <div class="rx-hud-row rt-x"><span data-k="tl">Target</span><b class="num" data-k="tv"></b></div>
        <div class="rt-log rt-mono rt-x" data-k="log"></div>
      </div>
      <div class="rt-x">
        <div class="rt-h">Control</div>
        <div class="rx-hud-row"><span>Distance to go</span><b class="num" data-k="le"></b></div>
        <div class="rx-hud-row"><span>Heading error</span><b class="num" data-k="he"></b></div>
        <div class="rt-w"><span>Left wheel</span><div class="rt-bar"><em data-k="lb"></em></div><b class="num" data-k="lw"></b></div>
        <div class="rt-w"><span>Right wheel</span><div class="rt-bar"><em data-k="rb"></em></div><b class="num" data-k="rw"></b></div>
        <div class="rx-hud-row"><span>Servo writes</span><b class="num" data-k="sw"></b></div>
      </div>
    </div>`;
  wrap.appendChild(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, v) => { if (shown[k] !== v) { K[k].textContent = v; shown[k] = v; } };
  const css = (k, prop, v) => { const key = `${k}.${prop}`; if (shown[key] !== v) { K[k].style[prop] = v; shown[key] = v; } };
  const chips = GATES.map((gz) => { const c = document.createElement('span'); c.className = 'rt-chip'; c.textContent = gz.last ? `${gz.id}, Last` : gz.id; K.chips.append(c); return c; });

  // the drift note (step 5)
  const note = document.createElement('div');
  Object.assign(note.style, { position: 'absolute', padding: '6px 10px', borderRadius: '12px', background: 'rgba(10,8,7,.8)', border: '1px solid rgba(255,255,255,.14)', font: `500 12.5px/1.3 ${font}`, color: '#eee9e3', opacity: '0', pointerEvents: 'none', boxSizing: 'border-box' });
  note.textContent = 'Illustration: the drift is exaggerated, not measured';
  wrap.appendChild(note);

  // ---------------------------------------------------------------- layout
  let Lo = null;
  function layout() {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const phone = innerWidth <= 900;
    let rx, ry, rw, rh; // the free region, clear of the step text
    if (!phone) {
      const gut = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 40;
      const cardR = Math.max(gut, (W - 1180) / 2) + 540 + 28;
      rx = cardR; ry = 18; rw = W - cardR - 20; rh = H - 36;
    } else { rx = 10; ry = 8; rw = W - 20; rh = H - 16; }
    const compact = rw < 520;
    hud.classList.toggle('rt-compact', compact);
    Object.assign(hud.style, { left: `${rx}px`, top: `${ry}px`, width: `${rw}px` });
    const hh = hud.offsetHeight + 12;
    const nh = rw < 520 ? 46 : 30; // room under the map for the note in the last step (two lines when narrow)
    const mw = rw, mh = rh - hh - nh;
    const s = Math.min(mw / (EXT.x1 - EXT.x0), mh / (EXT.y1 - EXT.y0));
    const w = (EXT.x1 - EXT.x0) * s, h = (EXT.y1 - EXT.y0) * s;
    const ox = rx + (mw - w) / 2, oy = ry + hh + (mh - h) / 2;
    Lo = { W, H, dpr, s, ox, oy, phone };
    // map cm (y up) to canvas px
    Lo.X = (x) => ox + (x - EXT.x0) * s;
    Lo.Y = (y) => oy + (EXT.y1 - y) * s;
    const nl = Math.round(Lo.X(-2.5));
    Object.assign(note.style, { left: `${nl}px`, top: `${Math.round(oy + h + 4)}px`, maxWidth: `${W - nl - 10}px` });
    drawStatic();
    return true;
  }

  function drawStatic() {
    const { dpr, s, X, Y } = Lo;
    stat.width = canvas.width; stat.height = canvas.height;
    const c = stat.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, Lo.W, Lo.H);
    const rect = (x0, y0, x1, y1) => c.fillRect(X(x0), Y(y1), (x1 - x0) * s, (y1 - y0) * s);
    // the floor, then the outer boundary tape (2.5 cm, outside the track)
    c.fillStyle = '#1b1814'; rect(-2.5, -2.5, TRACK.w + 2.5, TRACK.h + 2.5);
    c.fillStyle = '#26221d'; rect(0, 0, TRACK.w, TRACK.h);
    c.fillStyle = 'rgba(238,233,227,.82)';
    rect(-2.5, -2.5, TRACK.w + 2.5, 0); rect(-2.5, TRACK.h, TRACK.w + 2.5, TRACK.h + 2.5);
    rect(-2.5, 0, 0, TRACK.h); rect(TRACK.w, 0, TRACK.w + 2.5, TRACK.h);
    // the imaginary grid lines (1/4 in tape)
    c.fillStyle = 'rgba(238,233,227,.2)';
    for (let x = 50; x < TRACK.w; x += 50) rect(x - 0.32, 0, x + 0.32, TRACK.h);
    for (let y = 50; y < TRACK.h; y += 50) rect(0, y - 0.32, TRACK.w, y + 0.32);
    // gate zones: 2.5 cm tape on the inside of the zone
    for (const gz of GATES) {
      c.fillStyle = 'rgba(34,197,94,.9)';
      rect(gz.x0, gz.y0, gz.x1, gz.y0 + 2.5); rect(gz.x0, gz.y1 - 2.5, gz.x1, gz.y1);
      rect(gz.x0, gz.y0, gz.x0 + 2.5, gz.y1); rect(gz.x1 - 2.5, gz.y0, gz.x1, gz.y1);
      c.fillStyle = 'rgba(134,239,172,.9)';
      c.font = `650 ${Math.max(11, 7 * s)}px ${font}`;
      c.textAlign = 'center'; c.textBaseline = 'middle';
      const cx = X((gz.x0 + gz.x1) / 2), cy = Y((gz.y0 + gz.y1) / 2);
      c.fillText(gz.id, cx + (gz.id === 'A' || gz.id === 'B' ? 0 : 0), cy - (gz.last ? 5 * s : 0));
      if (gz.last) { c.font = `650 ${Math.max(9, 4 * s)}px ${font}`; c.fillText('LAST', cx, cy + 5 * s); }
    }
    // the 2x4s
    c.fillStyle = WOOD;
    for (const o of OBSTACLES) rect(o.x0, o.y0, o.x1, o.y1);
    // start and target
    c.fillStyle = GREEN; c.beginPath(); c.arc(X(START[0]), Y(START[1]), Math.max(3, 1.8 * s), 0, 2 * Math.PI); c.fill();
    c.fillStyle = RED; c.fillRect(X(TARGET[0] - 1.25), Y(TARGET[1] + 1.25), 2.5 * s, 2.5 * s);
    c.fillStyle = '#b8b0a7';
    c.font = `500 ${Math.max(10, 3.8 * s)}px ${font}`;
    c.textAlign = 'right'; c.textBaseline = 'middle';
    c.fillText('Start', X(-3.5), Y(START[1] + 9));
    c.textAlign = 'left';
    c.fillText('Target', X(TARGET[0] - 12), Y(TARGET[1] + 7));
    // the planned route, faint
    c.strokeStyle = 'rgba(255,107,53,.28)'; c.lineWidth = Math.max(1, 0.5 * s); c.setLineDash([2 * s, 2 * s]);
    c.beginPath(); c.moveTo(X(START_POSE[0]), Y(START_POSE[1]));
    for (const m of moves) if (!m.turn) { const p = m.toWorld(0, m.d); c.lineTo(X(p[0]), Y(p[1])); }
    c.stroke(); c.setLineDash([]);
  }

  // ---------------------------------------------------------------- the picture, from the scroll
  let lastArgs = [0, 0, 0];
  function robotAt(P, th, alpha = 1, grey = false) {
    const { s, X, Y } = Lo;
    g.save();
    g.translate(X(P[0]), Y(P[1]));
    g.rotate(Math.PI / 2 - th);
    g.globalAlpha = alpha;
    if (grey) g.filter = 'grayscale(1) brightness(1.3)';
    g.drawImage(img, -SPRITE.w / 2 * s, -SPRITE.cy * s, SPRITE.w * s, SPRITE.h * s);
    g.restore();
  }
  function draw(t, driftK) {
    const { dpr, s, X, Y } = Lo;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(stat, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { m, u } = at(sim, t);
    const st = state(m, u);
    // the trail of where the robot believes it has been
    g.strokeStyle = ORANGE; g.lineWidth = Math.max(1.5, 0.8 * s); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(X(START_POSE[0]), Y(START_POSE[1]));
    for (let i = 0; i < m.i; i++) { const e = moves[i].endWorld; g.lineTo(X(e[0]), Y(e[1])); }
    g.lineTo(X(st.P[0]), Y(st.P[1]));
    g.stroke();
    // ticks at the waypoints reached, a ring at the one it is driving to
    g.fillStyle = ORANGE;
    for (let i = 0; i < m.i; i++) if (!moves[i].turn) { const e = moves[i].endWorld; g.beginPath(); g.arc(X(e[0]), Y(e[1]), Math.max(1.5, 0.7 * s), 0, 2 * Math.PI); g.fill(); }
    if (!m.turn && t > 0 && !st.done) {
      const q = m.toWorld(0, m.d);
      g.strokeStyle = 'rgba(255,241,226,.85)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(X(q[0]), Y(q[1]), Math.max(4, 2.2 * s), 0, 2 * Math.PI); g.stroke();
    }
    // the drift illustration: the path the robot really drives if its sensor drifts
    let ghostEnd = null;
    if (driftK > 0) {
      const pts = drift.pts, n = (pts.length - 1) * driftK;
      g.strokeStyle = 'rgba(190,205,225,.9)'; g.lineWidth = Math.max(1.5, 0.75 * s); g.setLineDash([3 * s, 1.8 * s]);
      g.beginPath(); g.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (let i = 1; i <= Math.floor(n); i++) g.lineTo(X(pts[i][0]), Y(pts[i][1]));
      const i0 = Math.floor(n), f = n - i0;
      if (i0 < pts.length - 1) { const e = [pts[i0][0] + (pts[i0 + 1][0] - pts[i0][0]) * f, pts[i0][1] + (pts[i0 + 1][1] - pts[i0][1]) * f]; g.lineTo(X(e[0]), Y(e[1])); }
      g.stroke(); g.setLineDash([]);
      const ga = smooth(0.9, 1, driftK);
      if (ga > 0) { ghostEnd = pts[pts.length - 1]; robotAt(ghostEnd, drift.heading, 0.6 * ga, true); }
    }
    robotAt(st.P, st.th);
    // the dowel: the point the judges measure
    const dx = st.P[0] + ROBOT.dowel * Math.cos(st.th), dy = st.P[1] + ROBOT.dowel * Math.sin(st.th);
    g.fillStyle = '#f4e3c3'; g.strokeStyle = 'rgba(10,8,7,.8)'; g.lineWidth = 1;
    g.beginPath(); g.arc(X(dx), Y(dy), Math.max(2, ROBOT.dowelR * 1.6 * s), 0, 2 * Math.PI); g.fill(); g.stroke();
    if (ghostEnd) {
      const la = smooth(0.95, 1, driftK);
      g.globalAlpha = la;
      g.font = `600 ${Math.max(11, 4 * s)}px ${font}`; g.textBaseline = 'middle';
      const tag = (text, x, y, col, align) => {
        g.textAlign = align;
        const w = g.measureText(text).width, px = align === 'right' ? x - w - 6 : x - 6;
        g.fillStyle = 'rgba(10,8,7,.8)'; g.fillRect(px, y - 9, w + 12, 18);
        g.fillStyle = col; g.fillText(text, x, y);
      };
      tag('Where it thinks it is', X(st.P[0]) + 12 * s, Y(st.P[1]) + 11 * s, '#ffd2bf', 'right');
      tag('Where it really is', X(ghostEnd[0]) - 11 * s, Y(ghostEnd[1]) - 2 * s, '#dbe4f0', 'right');
      g.globalAlpha = 1;
    }
    return { m, u, st };
  }

  const fmt = (v, d = 2) => (Math.abs(v) < 0.5 * 10 ** -d ? 0 : v).toFixed(d);
  const DONE_W = 0.004; // the last sliver of a move shows its completion
  function panel(t, m, u, st) {
    const started = t > 0;
    put('n', String(m.n));
    put('name', m.name);
    put('note', m.note ? `// ${m.note}` : ' ');
    const driven = moves.slice(0, m.i).reduce((a, x) => a + (x.turn ? 0 : x.d), 0) + (m.turn ? 0 : Math.hypot(st.x - m.start[0], st.y - m.start[1]));
    put('dist', `${(driven / 100).toFixed(2)} of ${(straight / 100).toFixed(2)} m`);
    put('x', `${fmt(st.x)} cm`); put('y', `${fmt(st.y)} cm`); put('h', `${fmt(st.h, 3)}°`);
    if (m.turn) { put('tl', 'Turn target'); put('tv', `${m.hTarget}°`); } else { put('tl', 'Leg length'); put('tv', `${fmt(m.linTarget)} cm`); }
    const doneNow = st.done || (started && u > 1 - DONE_W);
    put('le', m.turn ? 'not used' : `${fmt(st.linError * 100)} cm`);
    K.le.classList.toggle('dim', m.turn);
    const steering = m.turn || (st.linError != null && st.linError > 0.01);
    put('he', steering && !(doneNow && m.i === moves.length - 1) ? `${fmt(st.headingError)}°` : 'not used');
    K.he.classList.toggle('dim', !steering);
    const L = started && !doneNow ? st.left : 0, R = started && !doneNow ? st.right : 0;
    put('lw', fmt(L, 3)); put('rw', fmt(R, 3));
    const bar = (k, v) => { const f = clamp(v / 0.2, -1, 1) * 50; css(k, 'left', `${f < 0 ? 50 + f : 50}%`); css(k, 'width', `${Math.abs(f).toFixed(1)}%`); };
    bar('lb', L); bar('rb', R);
    put('sw', `${Math.trunc(90 - L * 90)}, ${Math.trunc(90 - R * 90)}`);
    K.le.classList.toggle('ok', !m.turn && started && Math.abs(st.linError) < 0.0015);
    K.he.classList.toggle('ok', m.turn && started && Math.abs(st.headingError) < 0.5);
    GATES.forEach((gz, i) => chips[i].classList.toggle('on', gateAt[gz.id] != null && t >= gateAt[gz.id]));
    // the serial log: the lines the code prints at these moments
    const lines = [];
    if (m.i > 0) {
      const pm = moves[m.i - 1];
      lines.push(pm.turn ? 'Heading action completed' : 'Linear action completed');
      lines.push(`Transitioned to state: ${enumOf(m.name)}`);
    } else lines.push('OTOS connected!', 'Calibrating IMU...');
    lines.push(started ? `Executing ${m.turn ? (m.name === 'TURN_LEFT' ? 'turnLeft' : 'turnRight') : 'moveForward'}` : `Initial state: ${enumOf(MOVES[0])}`);
    if (doneNow && m.i === moves.length - 1) lines.push('Robot has stopped.');
    put('log', lines.slice(-3).join('\n'));
  }

  function setProgress(p, step, stepP) {
    lastArgs = [p, step, stepP];
    if (!Lo) return;
    step = clamp(step | 0, 0, PARTS.length - 1);
    const [a, b] = PARTS[step];
    let t;
    if (step === 0) t = 0;
    else if (step === PARTS.length - 1) t = sim.total;
    else {
      const t0 = moves[a].t0, t1 = moves[b - 1].t0 + moves[b - 1].time;
      t = t0 + (t1 - t0) * clamp((stepP - 0.05) / 0.9, 0, 1);
    }
    const driftK = step === PARTS.length - 1 ? smooth(0.1, 0.8, stepP) : 0;
    const { m, u, st } = draw(t, driftK);
    panel(t, m, u, st);
    const na = step === PARTS.length - 1 ? smooth(0.05, 0.25, stepP) : 0;
    const nv = String(Math.round(na * 100) / 100);
    if (shown.note !== nv) { note.style.opacity = nv; shown.note = nv; }
  }

  const ro = new ResizeObserver(() => { if (layout()) setProgress(...lastArgs); });
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); wrap.remove(); } };
}
