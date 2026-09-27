// Why the encoder had to be geared down (2D, no WebGL).
// The car's code reads the MT6701's absolute angle once per loop and adds up the change, taking
// the shorter way around the circle (the +-180 degree fold in angleDifference). That only works
// while the magnet turns less than half a turn between two reads. This demo samples a magnet
// turning at constant speed and shows what the code would count.
//   C = 2.875 in x 25.4 x pi = 229.4 mm of travel per wheel turn
//   travel per encoder turn = C / ratio: 38.2 mm on the motor (6.0), 191.2 mm geared (1.2)
//   true turn per loop = 360 x v x T / (C / ratio) degrees; the code reads ((d + 180) mod 360) - 180
import { slider, segmented, playToggle, readout } from '/assets/js/lib/ui.js';

const C = 2.875 * 25.4 * Math.PI; // mm
const RUN = 8.3; // m
const COL = { text: '#eee9e3', muted: '#8c847b', line: 'rgba(237,232,226,0.16)', ok: '#4cc38a', bad: '#ff5d5d', lost: '#9aa0a6', magnet: '#a78bfa', accent: '#ff6b35' };
const fold = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

export function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const cv = document.createElement('canvas');
  cv.className = 'rx-canvas';
  cv.setAttribute('role', 'img');
  el.append(cv);
  const g = cv.getContext('2d');
  const st = { v: 2.8, T: 10, ratio: 6.0, phase: 0, playing: false };

  const calc = () => {
    const perTurn = C / st.ratio; // mm per encoder turn
    const dTrue = (360 * st.v * 1000 * (st.T / 1000)) / perTurn; // degrees per loop
    const dRead = fold(dTrue);
    const loops = RUN / (st.v * st.T / 1000);
    const counted = (loops * dRead / 360) * perTurn / 1000; // m
    return { perTurn, dTrue, dRead, loops, counted, vMax: (0.5 * perTurn) / st.T, tMax: (0.5 * perTurn) / st.v };
  };

  let W = 0, H = 0, dpr = 1;
  const size = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = el.clientWidth; H = el.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    draw();
  };

  function arc(cx, cy, r, a0, a1, color, width, dash) {
    // angles in degrees, counter-clockwise positive (screen y is down, so negate)
    g.beginPath();
    g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash || []);
    const s = (-a0 * Math.PI) / 180, e = (-a1 * Math.PI) / 180;
    g.arc(cx, cy, r, s, e, a1 > a0);
    g.stroke(); g.setLineDash([]);
  }
  function tick(cx, cy, r0, r1, a, color, w) {
    const t = (-a * Math.PI) / 180;
    g.beginPath(); g.strokeStyle = color; g.lineWidth = w;
    g.moveTo(cx + r0 * Math.cos(t), cy + r0 * Math.sin(t)); g.lineTo(cx + r1 * Math.cos(t), cy + r1 * Math.sin(t)); g.stroke();
  }
  function text(s, x, y, o = {}) {
    g.font = `${o.weight || 500} ${o.size || 13}px ${getComputedStyle(el).getPropertyValue('--font') || 'system-ui, sans-serif'}`;
    g.fillStyle = o.color || COL.text; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    g.fillText(s, x, y);
  }

  function draw() {
    if (!W || !H) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    const r = calc();
    const narrow = W < 620;
    const pad = narrow ? 16 : 28;
    // dial on the left (or top on a phone), bars on the right (or below)
    const dialBox = narrow ? { x: 0, y: 0, w: W, h: H * 0.6 } : { x: 0, y: 0, w: W * 0.46, h: H };
    const R = Math.max(40, Math.min(dialBox.w, dialBox.h) * (narrow ? 0.29 : 0.34));
    const cx = dialBox.x + dialBox.w / 2, cy = narrow ? R + 44 : dialBox.y + dialBox.h / 2;
    // magnet angle before this loop's read, and how far through the loop the animation is
    const a0 = 90; // previous read, drawn at the top
    const f = st.playing ? st.phase : 1;
    const shown = r.dTrue * f;
    const state = Math.abs(r.dTrue) < 180 ? 'ok' : r.dTrue < 360 ? 'bad' : 'lost';
    const col = COL[state];
    // dial face
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.strokeStyle = COL.line; g.lineWidth = 1.5; g.stroke();
    for (let k = 0; k < 12; k++) tick(cx, cy, R - 5, R, k * 30, COL.line, 1.5);
    // the true path of the magnet during one loop (can be more than one turn): dashed spiral-ish rings
    const turns = Math.floor(shown / 360);
    for (let k = 0; k < Math.min(turns, 6); k++) arc(cx, cy, R + 10 + k * 5, a0, a0 + 359.9, COL.lost, 2, [3, 4]);
    arc(cx, cy, R + 10 + Math.min(turns, 6) * 5, a0, a0 + (shown % 360), COL.muted, 2, [3, 4]);
    // what the code concludes: the short way from the old reading to the new one
    if (f >= 1 || !st.playing) {
      const read = r.dRead;
      arc(cx, cy, R * 0.72, a0, a0 + read, col, 7);
      // arrow head
      const e = ((-(a0 + read)) * Math.PI) / 180, dir = read >= 0 ? -1 : 1;
      const hx = cx + R * 0.72 * Math.cos(e), hy = cy + R * 0.72 * Math.sin(e);
      g.beginPath(); g.fillStyle = col;
      g.moveTo(hx + 9 * Math.cos(e + dir * Math.PI / 2), hy + 9 * Math.sin(e + dir * Math.PI / 2));
      g.lineTo(hx + 7 * Math.cos(e), hy + 7 * Math.sin(e)); g.lineTo(hx - 7 * Math.cos(e), hy - 7 * Math.sin(e)); g.fill();
    }
    // old and new readings
    tick(cx, cy, R * 0.25, R + 2, a0, COL.muted, 3);
    tick(cx, cy, R * 0.25, R + 2, a0 + shown, COL.magnet, 4);
    g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fillStyle = COL.magnet; g.fill();
    text('last read', cx, cy - R - 26, { align: 'center', color: COL.muted, size: 12 });
    const label = state === 'ok' ? 'reads the right way' : state === 'bad' ? 'reads backwards' : 'whole turns lost';
    text(`${r.dTrue.toFixed(0)}° turned, code reads ${r.dRead >= 0 ? '+' : ''}${r.dRead.toFixed(0)}°`, cx, cy + R + 32, { align: 'center', weight: 600, size: narrow ? 13 : 14 });
    text(label, cx, cy + R + 50, { align: 'center', color: col, size: 12.5, weight: 600 });

    // bars: true vs counted distance over an 8.3 m run
    const bx = narrow ? pad : dialBox.w + 10, bw = narrow ? W - 2 * pad : W - dialBox.w - 10 - pad;
    const by = narrow ? cy + R + 90 : H * 0.28;
    const lo = Math.min(0, r.counted) * 1.05, hi = Math.max(RUN, r.counted) * 1.05;
    const xOf = (v) => bx + ((v - lo) / (hi - lo)) * bw;
    const zero = xOf(0);
    const bar = (y, val, color, name) => {
      const x0 = Math.min(xOf(0), xOf(val)), w = Math.abs(xOf(val) - xOf(0));
      g.fillStyle = 'rgba(237,232,226,0.06)'; g.fillRect(bx, y, bw, 16);
      g.fillStyle = color; g.fillRect(x0, y, Math.max(2, w), 16);
      text(name, bx, y - 8, { color: COL.muted, size: 12, weight: 600 });
      text(`${val.toFixed(2)} m`, bx + bw, y - 8, { align: 'right', weight: 650, size: 13, color: color === COL.ok || color === COL.text ? COL.text : color });
    };
    const gap = narrow ? 44 : 56;
    bar(by, RUN, 'rgba(238,233,227,0.55)', 'True distance, 8.3 m run');
    const good = Math.abs(r.counted - RUN) < 0.005;
    bar(by + gap, r.counted, good ? COL.ok : COL.bad, 'What the code counts');
    g.fillStyle = COL.line; g.fillRect(zero, by - 2, 1, gap + 20);
    if (!narrow) {
      text(`${r.loops.toFixed(0)} loops of ${st.T} ms at ${st.v.toFixed(1)} m/s`, bx, by + gap + 48, { color: COL.muted, size: 12.5 });
      text(`One encoder turn = ${r.perTurn.toFixed(1)} mm of travel`, bx, by + gap + 68, { color: COL.muted, size: 12.5 });
      text('Dashed ring: how far the magnet really turned in one loop.', bx, by + gap + 104, { color: COL.muted, size: 12.5 });
      text('Solid arc: which way the code reads it, the short way round.', bx, by + gap + 124, { color: COL.muted, size: 12.5 });
    }
    else if (by + gap + 80 < H) {
      text('Dashed: how far the magnet really turned.', bx, by + gap + 48, { color: COL.muted, size: 12 });
      text('Solid: which way the code reads it.', bx, by + gap + 66, { color: COL.muted, size: 12 });
    }
    cv.setAttribute('aria-label', `Encoder ${st.ratio === 6 ? 'on the motor' : 'geared'}: the magnet turns ${r.dTrue.toFixed(0)} degrees per loop and the code reads ${r.dRead.toFixed(0)}; it counts ${r.counted.toFixed(2)} m of an 8.3 m run.`);
    info.set({ turn: r.dTrue, read: r.dRead, vmax: r.vMax, tmax: r.tMax });
  }

  // controls
  const info = readout(null, { rows: [
    { key: 'turn', label: 'Magnet turn per loop', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'read', label: 'Code reads', unit: '°', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}` },
    { key: 'vmax', label: 'Top speed this loop allows', unit: 'm/s', format: (v) => v.toFixed(2) },
    { key: 'tmax', label: 'Longest loop at this speed', unit: 'ms', format: (v) => v.toFixed(1) },
  ] });
  segmented(ctx.panel, {
    label: 'Encoder', value: 6,
    options: [{ value: 6, label: 'On the motor (V1, 6 turns per wheel turn)' }, { value: 1.2, label: 'Geared (V2, 1.2)' }],
    onChange: (v) => { st.ratio = v; draw(); },
  });
  slider(ctx.panel, { label: 'Car speed', min: 0.2, max: 5, step: 0.1, value: st.v, unit: ' m/s', onInput: (v) => { st.v = v; draw(); } });
  slider(ctx.panel, { label: 'Loop time (pick one)', min: 1, max: 40, step: 0.5, value: st.T, unit: ' ms', onInput: (v) => { st.T = v; draw(); } });
  let raf = 0, last = 0;
  const loop = (now) => {
    raf = 0;
    if (!st.playing) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    st.phase += dt / 1.4; // one loop of the code every 1.4 s, slowed down to be seen
    if (st.phase > 1.35) st.phase = 0;
    const keep = st.phase;
    st.phase = Math.min(1, keep);
    draw();
    st.phase = keep;
    raf = requestAnimationFrame(loop);
  };
  const tog = playToggle(ctx.panel, {
    playing: false, labels: ['Play one loop at a time', 'Pause'],
    onChange(on) {
      st.playing = on && !reduced ? true : false;
      if (on && reduced) { tog.set(false, { silent: true }); draw(); return; } // reduced motion: the still already shows the loop
      if (st.playing) { st.phase = 0; last = performance.now(); raf = requestAnimationFrame(loop); } else { cancelAnimationFrame(raf); raf = 0; draw(); }
    },
  });
  ctx.panel.append(info.el);

  const ro = new ResizeObserver(size);
  ro.observe(el);
  size();
  return { dispose() { cancelAnimationFrame(raf); ro.disconnect(); cv.remove(); } };
}
