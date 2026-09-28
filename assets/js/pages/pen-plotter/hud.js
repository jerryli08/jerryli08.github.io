// The live readout over the 3D plotter (Jerry's checklist: the Cartesian input for every loop, the
// motor angles and the angle of every joint). It shows what my final sketch computes at the
// current program time: the x-y target on the path, both motor angles from the IK and their step
// counts, the three passive joint angles, and a log of the last few passes through the loop.
import * as K from './kin.js';
import { COLORS } from './rig.js';

const CSS = `
.pp-hud { width: min(var(--rx-hud-w), calc(100% - 28px)); top: auto; bottom: 14px; padding-top: 10px; padding-bottom: 10px; }
.pp-hud .pp-joints { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,.08); }
.pp-hud .pp-joints div { display: flex; flex-direction: column; gap: 1px; font-size: var(--rx-ov-small); color: var(--muted); }
.pp-hud .pp-joints b { font-size: var(--rx-ov-text); color: var(--text); font-weight: 650; }
.pp-hud .pp-in { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,.12); }
.pp-hud .pp-in b { font-size: 19px; color: var(--text); font-weight: 650; }
.pp-hud table { margin-top: 2px; }
.pp-hud td, .pp-hud th { padding-top: 3px; padding-bottom: 3px; }
.pp-hud .pp-log { margin-top: 7px; font: 500 12.5px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: var(--muted); white-space: pre; }
.pp-hud .pp-log b { color: var(--text-2); font-weight: 600; }
.pp-hud .pp-stiff { margin-top: 6px; padding-top: 6px; }
.pp-hud .pp-stiff b { font-size: 21px; }
.pp-hud.pp-fold .pp-stiff b { color: ${COLORS.fold}; }
.pp-hud.pp-fold .pp-stiff i em { background: ${COLORS.fold}; }
.pp-hud .rx-hud-mini { white-space: pre-line; }
.pp-hud .pp-flag { display: none; margin-top: 5px; color: ${COLORS.fold}; font-weight: 600; }
.pp-hud.pp-fold .pp-flag { display: block; }
.pp-hud .pp-lib { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 5px; margin: 2px 0 9px; }
.pp-hud .pp-chip { display: flex; align-items: center; gap: 5px; padding: 3px 5px; border-radius: 8px; min-width: 0;
  border: 1px solid rgba(255,255,255,.1); color: var(--muted); font-size: 12.5px; line-height: 1.1; white-space: nowrap; }
.pp-hud .pp-chip svg { flex: none; width: 24px; height: 20px; overflow: visible; }
.pp-hud .pp-chip path { fill: none; stroke: currentColor; stroke-width: 1.4; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.pp-hud .pp-chip.on { color: var(--text); border-color: ${COLORS.ink}; background: rgba(255,107,53,.14); }
.pp-hud .pp-chip.on path { stroke: ${COLORS.ink}; }
.pp-hud .pp-chip.done { color: var(--text-2); }
@media (max-width: 640px) {
  .pp-hud { width: auto; top: 8px; bottom: auto; }
  .pp-hud .pp-in, .pp-hud .pp-log, .pp-hud .pp-stiff, .pp-hud .pp-joints { display: none; }
  .pp-hud .pp-lib { grid-template-columns: repeat(7, minmax(0, 1fr)); margin: 0 0 4px; gap: 3px; }
  .pp-hud .pp-chip { justify-content: center; font-size: 0; padding: 3px 1px; gap: 0; }
  .pp-hud .pp-chip svg { width: 24px; height: 18px; }
  .pp-hud .rx-hud-mini { font-size: 12.5px; line-height: 1.4; }
  .pp-hud.pp-fold .pp-flag { font-size: 12.5px; margin-top: 2px; }
}
`;
let styled = false;
const f1 = (v) => (Math.abs(v) < 0.05 ? 0 : v).toFixed(1);
const pad = (s, n) => String(s).padStart(n);

/** a tiny drawing of a path (for the library chips) */
function thumb(path) {
  const xs = path.slice(1, -1).map((e) => e[0]), ys = path.slice(1, -1).map((e) => e[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const s = Math.max(x1 - x0, (y1 - y0) * 1.25) || 1;
  const d = path.slice(1, -1).map((e, i) => `${i ? 'L' : 'M'}${(((e[0] - x0) / s) * 30 + (30 - ((x1 - x0) / s) * 30) / 2).toFixed(1)},${(24 - ((e[1] - y0) / s) * 30 - (24 - ((y1 - y0) / s) * 30) / 2).toFixed(1)}`).join('');
  return `<svg viewBox="0 0 30 24" aria-hidden="true"><path d="${d}"/></svg>`;
}

/**
 * telemetry(parent, { library: [shapes] }) -> { show(tl, t), chips(active, done) }.
 * show() takes a timeline (kin.timeline) and the program time in ms.
 */
export function telemetry(parent, o = {}) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const hud = document.createElement('div');
  hud.className = 'rx-hud pp-hud';
  const lib = o.library || null;
  hud.innerHTML = `
    ${lib ? `<div class="pp-lib">${lib.map((s) => `<div class="pp-chip" data-id="${s.id}">${thumb(s.path)}<span>${s.name}</span></div>`).join('')}</div>` : ''}
    <div class="rx-hud-row"><span>Program time</span><b class="num" data-k="t"></b></div>
    <div class="pp-in"><span>Cartesian input</span><b class="num" data-k="xy"></b></div>
    <table class="num"><thead><tr><th></th><th>Angle</th><th>Steps</th></tr></thead><tbody>
      <tr><td>Left motor</td><td data-k="l"></td><td data-k="ls"></td></tr>
      <tr><td>Right motor</td><td data-k="r"></td><td data-k="rs"></td></tr>
    </tbody></table>
    <div class="pp-joints num"><div><span>Left elbow</span><b data-k="e1"></b></div><div><span>Pen joint</span><b data-k="pj"></b></div><div><span>Right elbow</span><b data-k="e2"></b></div></div>
    <div class="pp-log num" data-k="log"></div>
    <div class="rx-hud-row rx-hud-big pp-stiff"><span>Pen travel per microstep</span><b class="num" data-k="ps"></b><i><em data-k="psBar"></em></i></div>
    <div class="pp-flag">Near the fold line: the forearms are lining up</div>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  parent.append(hud);
  const Kx = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const chipEls = lib ? Object.fromEntries([...hud.querySelectorAll('.pp-chip')].map((n) => [n.dataset.id, n])) : {};
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { Kx[k].textContent = text; shown[k] = text; } };
  const html = (k, text) => { if (shown[k] !== text) { Kx[k].innerHTML = text; shown[k] = text; } };
  let foldOn = null;

  function show(tl, t, over) {
    const a = tl.at(t);
    const p = over || K.pose(a.x, a.y);
    put('t', `${(a.t / 1000).toFixed(3)} s of ${(tl.total / 1000).toFixed(1)} s, move ${a.seg} of ${a.of}`);
    put('xy', `x ${f1(a.x)}   y ${f1(a.y)} mm`);
    if (!p) return;
    put('l', `${p.l.toFixed(2)}°`); put('ls', `${K.steps(p.l)}`);
    put('r', `${p.r.toFixed(2)}°`); put('rs', `${K.steps(p.r)}`);
    const j = p.joints.a;
    put('e1', `${j[1].toFixed(1)}°`); put('pj', `${j[2].toFixed(1)}°`); put('e2', `${j[3].toFixed(1)}°`);
    // the last few passes through the loop, one row per 5 ms of program time
    const rows = [' t ms      x       y      left    right'];
    const t0 = Math.floor(a.t / 5) * 5;
    for (let i = 0; i < 3; i++) {
      const ti = t0 - i * 5;
      if (ti < 0) { rows.push(''); continue; }
      const b = tl.at(ti), q = K.ik(b.x, b.y);
      const row = `${pad(ti, 5)} ${pad(b.x.toFixed(1), 7)} ${pad(b.y.toFixed(1), 7)} ${pad(q ? q.l.toFixed(2) : '-', 8)} ${pad(q ? q.r.toFixed(2) : '-', 8)}`;
      rows.push(i === 0 ? `<b>${row}</b>` : row);
    }
    html('log', rows.join('\n'));
    const ps = K.perStep(p);
    put('ps', ps > 99 ? 'unbounded' : `${ps < 1 ? ps.toFixed(2) : ps.toFixed(1)} mm`);
    const w = `${(K.clamp(Math.log10(Math.max(ps, 0.1) / 0.1) / 2, 0, 1) * 100).toFixed(1)}%`;
    if (shown.psBar !== w) { Kx.psBar.style.width = w; shown.psBar = w; }
    const fold = ps > 2;
    if (fold !== foldOn) { hud.classList.toggle('pp-fold', fold); foldOn = fold; }
    put('mini', `x ${f1(a.x)}, y ${f1(a.y)} mm → L ${p.l.toFixed(1)}°, R ${p.r.toFixed(1)}°\nelbows ${j[1].toFixed(0)}° / ${j[3].toFixed(0)}°, pen joint ${j[2].toFixed(0)}°, ${ps > 99 ? 'unbounded' : ps.toFixed(2) + ' mm'} per step`);
  }
  function chips(active, done = []) {
    for (const [id, n] of Object.entries(chipEls)) {
      const on = id === active, dn = !on && done.includes(id);
      if (n.classList.contains('on') !== on) n.classList.toggle('on', on);
      if (n.classList.contains('done') !== dn) n.classList.toggle('done', dn);
    }
  }
  return { el: hud, show, chips };
}
