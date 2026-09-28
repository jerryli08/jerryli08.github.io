// Why the encoder had to be geared down: scroll-driven, 2D (no WebGL).
// The car's code reads the MT6701's absolute angle once per loop and adds up the change, taking
// the shorter way around the circle (the +-180 degree fold in angleDifference). That only works
// while the magnet turns less than half a turn between two reads. The dial shows one loop: how far
// the magnet really turned (dashed) and which way the code reads it (solid); the bars show what the
// code would count over an 8.3 m run.
//   C = 2.875 in x 25.4 x pi = 229.4 mm of travel per wheel turn
//   travel per encoder turn = C / ratio: 38.2 mm on the motor (6.0), 191.2 mm geared (1.2)
//   true turn per loop = 360 x v x T / (C / ratio) degrees; the code reads ((d + 180) mod 360) - 180
// Speed is the run's average, 8.3 m in 2.97 s = 2.8 m/s, held constant with no noise. The loop
// times are swept by the scroll to show the limit; they are not measured.
// Steps (u = step + progress through it):
//   0 one loop, encoder on the motor, 4 ms        3 the geared encoder, one loop at 9 ms
//   1 on the motor, the loop time grows to 6.8 ms 4 geared, the loop time grows to 34 ms
//   2 on the motor, past half a turn (9 ms)
// Every picture is a pure function of (step, stepP).
import { hud, clamp, smooth, lerp } from './rig.js';

const C = 2.875 * 25.4 * Math.PI; // mm
const RUN = 8.3; // m
const V = RUN / 2.97; // m/s, the run's average
const COL = { text: '#eee9e3', muted: '#8c847b', line: 'rgba(237,232,226,0.16)', ok: '#4cc38a', bad: '#ff5d5d', lost: '#9aa0a6', magnet: '#a78bfa' };
const fold = (d) => ((((d + 180) % 360) + 360) % 360) - 180;

// the state each scroll position shows: encoder ratio, loop time (ms), how far through the loop the
// magnet has turned (0..1) and how strongly the code's reading shows (0..1)
function stateAt(step, sp) {
  if (step <= 0) return { ratio: 6, T: 4, f: smooth(0.08, 0.55, sp), read: smooth(0.55, 0.7, sp) };
  if (step === 1) return { ratio: 6, T: lerp(4, 6.8, smooth(0.08, 0.85, sp)), f: 1, read: 1 };
  if (step === 2) return { ratio: 6, T: lerp(6.8, 9, smooth(0.05, 0.7, sp)), f: 1, read: 1 };
  if (step === 3) return { ratio: 1.2, T: 9, f: smooth(0.08, 0.55, sp), read: smooth(0.55, 0.7, sp) };
  return { ratio: 1.2, T: lerp(9, 34, smooth(0.08, 0.85, sp)), f: 1, read: 1 };
}
function calc({ ratio, T }) {
  const perTurn = C / ratio; // mm per encoder turn
  const dTrue = (360 * V * T) / perTurn; // degrees per loop (V m/s x T ms = mm)
  const dRead = fold(dTrue);
  const loops = (RUN * 1000) / (V * T);
  const counted = ((loops * dRead) / 360) * perTurn / 1000; // m
  return { perTurn, dTrue, dRead, counted, tMax: (0.5 * perTurn) / V };
}

export function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const cv = document.createElement('canvas');
  cv.className = 'rx-canvas';
  cv.setAttribute('role', 'img');
  Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'block' });
  el.append(cv);
  const g = cv.getContext('2d');
  const font = getComputedStyle(el).getPropertyValue('--font') || 'system-ui, sans-serif';

  const H = hud(el, `
    <div class="rx-hud-row"><span data-k="name"></span><b class="num" data-k="ratio"></b></div>
    <table class="num"><tbody>
      <tr><td>Loop time <small>swept to show the limit</small></td><td data-k="T"></td></tr>
      <tr><td>Magnet turn per loop</td><td data-k="turn"></td></tr>
      <tr><td>Code reads</td><td data-k="read"></td></tr>
      <tr><td>Longest loop at 2.8 m/s</td><td data-k="tmax"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`);
  H.el.style.zIndex = '2';

  let W = 0, Hh = 0, dpr = 1, last = [0, 0];
  function size() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = el.clientWidth; Hh = el.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(Hh * dpr);
    draw(...last);
  }
  function arc(cx, cy, r, a0, a1, color, width, dash) { // degrees, counter-clockwise positive
    g.beginPath();
    g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash || []);
    g.arc(cx, cy, r, (-a0 * Math.PI) / 180, (-a1 * Math.PI) / 180, a1 > a0);
    g.stroke(); g.setLineDash([]);
  }
  function tick(cx, cy, r0, r1, a, color, w) {
    const t = (-a * Math.PI) / 180;
    g.beginPath(); g.strokeStyle = color; g.lineWidth = w;
    g.moveTo(cx + r0 * Math.cos(t), cy + r0 * Math.sin(t)); g.lineTo(cx + r1 * Math.cos(t), cy + r1 * Math.sin(t)); g.stroke();
  }
  function text(s, x, y, o = {}) {
    g.font = `${o.weight || 500} ${Math.max(12.5, o.size || 13)}px ${font}`; // the site.css overlay floor
    g.fillStyle = o.color || COL.text; g.textAlign = o.align || 'left'; g.textBaseline = o.base || 'alphabetic';
    g.fillText(s, x, y);
  }

  function draw(step, sp) {
    if (!W || !Hh) return;
    const st = stateAt(step, reduced ? 1 : sp);
    const r = calc(st);
    const shown = r.dTrue * st.f;
    const state = Math.abs(r.dTrue) < 180 ? 'ok' : r.dTrue < 360 ? 'bad' : 'lost';
    const col = COL[state];
    // readout
    H.put('name', st.ratio === 6 ? 'Version one: encoder on the motor shaft' : 'Version two: encoder geared down');
    H.put('ratio', `${st.ratio.toFixed(1)} turns per wheel turn`);
    H.put('T', `${st.T.toFixed(1)} ms`);
    H.put('turn', `${shown.toFixed(0)}°`);
    H.put('read', st.read >= 0.5 ? `${r.dRead >= 0 ? '+' : ''}${r.dRead.toFixed(0)}°` : '...');
    H.color('read', st.read >= 0.5 ? col : COL.text);
    H.put('tmax', `${r.tMax.toFixed(1)} ms`);
    H.put('mini', `Loop ${st.T.toFixed(1)} ms, magnet turns ${shown.toFixed(0)}°, limit ${r.tMax.toFixed(1)} ms`);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, Hh);
    const narrow = W < 640;
    const hudH = narrow ? H.el.offsetHeight + 16 : 0;
    const pad = narrow ? 16 : 32;
    // desktop: dial on the left, bars under the readout on the right; phone: readout, dial, bars
    const dial = narrow ? { x: 0, y: hudH, w: W, h: (Hh - hudH) * 0.66 } : { x: 0, y: 0, w: W * 0.5, h: Hh };
    const R = Math.max(40, Math.min(dial.w * 0.36, (dial.h - 90) / 2));
    const cx = dial.x + dial.w / 2, cy = dial.y + dial.h / 2 - (narrow ? 12 : 0);
    const a0 = 90; // the last read, drawn at the top
    // dial face
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.strokeStyle = COL.line; g.lineWidth = 1.5; g.stroke();
    for (let k = 0; k < 12; k++) tick(cx, cy, R - 5, R, k * 30, COL.line, 1.5);
    // half a turn from the last read: the limit, as a faint line through the centre
    g.setLineDash([2, 5]); tick(cx, cy, 0, R + 4, a0 + 180, 'rgba(255,93,93,0.45)', 1.5); g.setLineDash([]);
    // how far the magnet really turned during this loop (whole turns as extra rings)
    const turns = Math.floor(shown / 360);
    for (let k = 0; k < Math.min(turns, 6); k++) arc(cx, cy, R + 10 + k * 5, a0, a0 + 359.9, COL.lost, 2, [3, 4]);
    if (shown % 360 > 0.5) arc(cx, cy, R + 10 + Math.min(turns, 6) * 5, a0, a0 + (shown % 360), COL.muted, 2, [3, 4]);
    // what the code concludes: the short way from the old reading to the new one
    if (st.read > 0.01) {
      g.globalAlpha = st.read;
      const read = r.dRead;
      arc(cx, cy, R * 0.72, a0, a0 + read, col, 7);
      const e = (-(a0 + read) * Math.PI) / 180, dir = read >= 0 ? -1 : 1;
      const hx = cx + R * 0.72 * Math.cos(e), hy = cy + R * 0.72 * Math.sin(e);
      g.beginPath(); g.fillStyle = col;
      g.moveTo(hx + 9 * Math.cos(e + (dir * Math.PI) / 2), hy + 9 * Math.sin(e + (dir * Math.PI) / 2));
      g.lineTo(hx + 7 * Math.cos(e), hy + 7 * Math.sin(e)); g.lineTo(hx - 7 * Math.cos(e), hy - 7 * Math.sin(e)); g.fill();
      g.globalAlpha = 1;
    }
    // old and new readings
    tick(cx, cy, R * 0.25, R + 2, a0, COL.muted, 3);
    tick(cx, cy, R * 0.25, R + 2, a0 + shown, COL.magnet, 4);
    g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fillStyle = COL.magnet; g.fill();
    text('last read', cx, cy - R - 16, { align: 'center', color: COL.muted, size: 12 });
    text('half a turn', cx + 7, cy + R - 12, { color: 'rgba(255,93,93,0.75)', size: 11.5 });
    const label = st.read < 0.5 ? 'the magnet turns during one loop' : state === 'ok' ? 'reads the right way' : state === 'bad' ? 'reads backwards' : 'whole turns lost';
    text(`${shown.toFixed(0)}° turned${st.read >= 0.5 ? `, code reads ${r.dRead >= 0 ? '+' : ''}${r.dRead.toFixed(0)}°` : ''}`, cx, cy + R + 34, { align: 'center', weight: 600, size: narrow ? 13 : 15 });
    text(label, cx, cy + R + 52, { align: 'center', color: st.read < 0.5 ? COL.muted : col, size: 12.5, weight: 600 });

    // bars: true vs counted distance over an 8.3 m run, on a fixed scale with zero in the middle
    const bx = narrow ? pad : W * 0.5 + 8, bw = narrow ? W - 2 * pad : W * 0.5 - 8 - pad;
    const by = narrow ? dial.y + dial.h + 22 : Math.max(H.el.offsetTop + H.el.offsetHeight + 56, Hh * 0.52);
    const lim = RUN * 1.08, xOf = (v) => bx + ((v + lim) / (2 * lim)) * bw, zero = xOf(0);
    const gap = narrow ? 42 : 58;
    const bar = (y, val, color, name) => {
      const x0 = Math.min(zero, xOf(val)), w = Math.abs(xOf(val) - zero);
      g.fillStyle = 'rgba(237,232,226,0.06)'; g.fillRect(bx, y, bw, 16);
      g.fillStyle = color; g.fillRect(x0, y, Math.max(2, w), 16);
      text(name, bx, y - 8, { color: COL.muted, size: 12, weight: 600 });
      text(`${val.toFixed(2)} m`, bx + bw, y - 8, { align: 'right', weight: 650, size: 13, color: color === COL.bad ? COL.bad : COL.text });
    };
    bar(by, RUN, 'rgba(238,233,227,0.55)', 'True distance');
    const counted = st.read >= 0.5 ? r.counted : RUN;
    bar(by + gap, counted, Math.abs(counted - RUN) < 0.005 ? COL.ok : COL.bad, 'What the code counts');
    g.fillStyle = 'rgba(237,232,226,0.4)'; g.fillRect(zero, by - 3, 1, gap + 22);
    text('0', zero, by + gap + 34, { align: 'center', color: COL.muted, size: 11 });
    if (!narrow) {
      text('Dashed ring: how far the magnet really turned in one loop.', bx, by + gap + 64, { color: COL.muted, size: 12.5 });
      text('Solid arc: which way the code reads it, the short way round.', bx, by + gap + 84, { color: COL.muted, size: 12.5 });
    }
    cv.setAttribute('aria-label', `Encoder ${st.ratio === 6 ? 'on the motor shaft' : 'geared down'}, ${st.T.toFixed(1)} ms loop at 2.8 m/s: the magnet turns ${r.dTrue.toFixed(0)} degrees per loop and the code reads ${r.dRead.toFixed(0)}; it counts ${r.counted.toFixed(2)} m of an 8.3 m run.`);

  }

  function setProgress(p, step, stepP) {
    last = [clamp(step | 0, 0, 4), clamp(stepP, 0, 1)];
    draw(...last);
  }
  const ro = new ResizeObserver(size);
  ro.observe(el);
  size();
  return { setProgress, dispose() { ro.disconnect(); cv.remove(); H.el.remove(); } };
}
