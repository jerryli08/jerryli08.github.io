// "Rev it up": a thumb throttle drives the real drivetrain CAD, as if the bike were on its repair
// stand with the rear wheel off the ground (the way I tested it, see the videos). Both motors,
// both belts, every pulley, the idlers and the chain sprocket turn about their real axes in the
// CAD (bike.js), each at the speed its tooth counts give it. The table reads out speed and torque
// at every stage of the reduction, and the gauge turns the sprocket speed into road speed.
//
// What is real and what is a model:
//  - motor speed ceiling: SKP 6465 motors, 150 KV (stated), on the 48 V pack (stated):
//    150 x 48 = 7,200 rpm, the nominal no-load speed
//  - speed ratios: tooth counts in the CAD (16T to 72T, then 20T to 72T: 4.5, 3.6, 16.2 overall)
//  - torque: the VESC runs the throttle as a current (torque) command; full throttle is modeled as
//    the stated 100 N·m peak at the sprocket, split back through the ratios with no losses, and it
//    fades to zero as the motors near their no-load speed (the pack's voltage runs out)
//  - how fast it spins up and coasts down on the stand is a simple illustration
//  - road speed is an estimate: a 27 in rim with a standard tire (Jerry's numbers), taken as 694 mm
//    across (ISO 630 rim plus a standard 27 x 1-1/4 in tire), and the stock cassette of a 2019 Trek
//    Dual Sport 2 (Shimano HG31, 11-32, 8 speed), because the cassette on the bike is not confirmed
import { createStage } from '/assets/js/lib/stage.js';
import { slider, segmented, button } from '/assets/js/lib/ui.js';
import { loadBike, STAGE1, STAGE2, TOTAL, R72, T } from './bike.js';

const KV = 150, VOLTS = 48;
const NOLOAD = KV * VOLTS; // 7,200 rpm at the motors
const PEAK = 100; // N·m at the output sprocket (stated)
const VIS = 1.5; // the animation turns the motors 1.5 times a second at 7,200 rpm (120 a second): 80 times slower
const COGS = [11, 13, 15, 18, 21, 24, 28, 32]; // Shimano HG31 11-32, 8 speed (assumed, see above)
const WHEEL_D = 0.694; // m across the tire (estimate)
const MPH = 2.2369363;

export async function mount(el, ctx) {
  const stage = createStage(el);
  const bike = await loadBike(stage);
  const G = bike.groups;

  const SIDES = {
    nd: { dir: [0.31, 0.15, 0.42], hide: ['frame', 'battery', 'plateND', 'retainer', 'brackets'] },
    d: { dir: [0.05, -0.08, -0.62], hide: ['frame', 'battery', 'batteryPlate', 'plateD', 'retainer', 'brackets', 'idlerMount'] },
  };
  const drive = ['pulley16', 'pulley72j', 'pulley72o', 'belt1', 'belt2', 'sprocket'].flatMap((g) => G[g] || []);
  let side = 'nd';
  function showSide(s, animate) {
    side = s;
    // the belts are black in the CAD; a light tint keeps them readable against the black plates
    for (const g of Object.keys(G)) bike.look(g, { opacity: SIDES[s].hide.includes(g) ? 0 : 1, tint: /^belt/.test(g) ? '#ff6b35' : null, tintI: 0.32 });
    bike.markers.belt1.setOpacity(s === 'nd' ? 0.9 : 0);
    bike.markers.belt2.setOpacity(s === 'd' ? 0.9 : 0.5);
    stage.frame(drive, { dir: SIDES[s].dir, pad: 1.1, duration: animate ? 0.8 : 0 });
  }
  showSide('nd', false);

  // ---- state: throttle t (0..1), motor speed s (0..1 of the 7,200 rpm no-load speed), motor angle
  let t = 0, s = 0, theta = 0, cog = 3, spring = true, springing = false, stop = null;
  // torque the motors can still make at speed s: full up to 85 % of no-load, then down to zero
  const room = (x) => Math.min(1, Math.max(0, (1 - x) / 0.15));
  const torque = () => t * PEAK * room(s); // at the sprocket, N·m

  // ---- controls
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;flex:1 1 100%';
  ctx.panel.append(row);
  const thr = slider(row, {
    label: 'Thumb throttle', min: 0, max: 100, step: 1, value: 0, unit: '%', format: (v) => v.toFixed(0),
    onInput: (v) => { springing = false; t = v / 100; wake(); },
  });
  const release = () => { if (spring && t > 0) { springing = true; wake(); } };
  thr.input.addEventListener('pointerup', release);
  thr.input.addEventListener('touchend', release);
  thr.input.addEventListener('keyup', release);
  segmented(row, {
    label: 'Let go and it', value: 'spring',
    options: [{ value: 'spring', label: 'springs back' }, { value: 'hold', label: 'holds' }],
    onChange: (v) => { spring = v === 'spring'; if (spring) release(); },
  });
  slider(row, {
    label: 'Rear cog', min: 0, max: COGS.length - 1, step: 1, value: cog, format: (i) => `${COGS[i]}T`,
    onInput: (i) => { cog = i; paint(true); },
  });
  segmented(row, {
    label: 'View', value: 'nd',
    options: [{ value: 'nd', label: 'Non-drive side' }, { value: 'd', label: 'Drive side' }],
    onChange: (v) => showSide(v, true),
  });
  button(row, { label: 'Reset view', onClick: () => showSide(side, true) });

  // ---- road speed gauge
  const gauge = document.createElement('div');
  gauge.style.cssText = 'flex:1 1 100%;display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;padding:12px 16px;border:1px solid var(--line);border-radius:12px';
  gauge.innerHTML = '<span style="font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">Road speed, estimate</span>'
    + '<b class="num" style="font-size:34px;line-height:1;color:var(--text)">0</b><span style="color:var(--text-2)">mph</span>'
    + '<span class="num" style="color:var(--muted);font-size:13.5px"></span>';
  const [, gNum, , gSub] = gauge.children;
  ctx.panel.append(gauge);

  // ---- telemetry table
  const wrap = document.createElement('div');
  wrap.className = 'rx-table';
  wrap.style.cssText = 'flex:1 1 100%';
  const table = document.createElement('table');
  table.innerHTML = '<thead><tr><th>Part</th><th>Speed</th><th>Torque</th></tr></thead><tbody></tbody>';
  wrap.append(table);
  ctx.panel.append(wrap);
  const tb = table.tBodies[0];
  const piv = bike.pivots;
  const partsOf = (id) => (piv[id] ? piv[id].children.slice() : []);
  // speed as a fraction of motor speed, torque from the sprocket torque
  const ROWS = [
    { key: 'm1', name: 'Motor 1', sub: 'SKP 6465, 150 KV, 16T pulley', ratio: 1, torque: (Tq) => Tq / TOTAL / 2, parts: () => partsOf('motor1') },
    { key: 'm2', name: 'Motor 2', sub: 'same belt, same speed', ratio: 1, torque: (Tq) => Tq / TOTAL / 2, parts: () => partsOf('motor2') },
    { key: 'a1', name: 'Jackshaft axle 1', sub: '72T pulley in, 20T pulley out', ratio: 1 / STAGE1, torque: (Tq) => Tq / STAGE2, parts: () => partsOf('jack') },
    { key: 'a2', name: 'Jackshaft axle 2', sub: '72T pulley in, chain sprocket out', ratio: 1 / TOTAL, torque: (Tq) => Tq, parts: () => partsOf('output') },
    { key: 'sp', name: 'Sprocket', sub: '20T, on axle 2, drives the bike chain', ratio: 1 / TOTAL, torque: (Tq) => Tq, parts: () => G.sprocket || [] },
    { key: 'wh', name: 'Rear wheel', sub: 'through the rear cog (estimate)', ratio: null, torque: (Tq) => (Tq * COGS[cog]) / T.chain, parts: () => [] },
  ];
  const cells = {};
  for (const r of ROWS) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b style="color:var(--text)">${r.name}</b><br><span style="font-size:12.5px;color:var(--muted)">${r.sub}</span></td><td class="num"></td><td class="num"></td>`;
    tb.append(tr);
    const [, sp, tq] = tr.children;
    cells[r.key] = { sp, tq };
    if (!r.parts().length) continue;
    // point at a row and its parts light up
    let undo = null;
    tr.addEventListener('pointerenter', () => { undo?.(); undo = stage.highlight(r.parts(), '#ff6b35', { intensity: 0.55 }); tr.style.background = 'rgba(255,107,53,.08)'; });
    tr.addEventListener('pointerleave', () => { undo?.(); undo = null; tr.style.background = ''; });
  }
  // belt pulls: effective tension = torque / pitch radius of the 72T pulley each belt drives
  const bars = document.createElement('div');
  bars.style.cssText = 'flex:1 1 100%;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 22px;font-size:13.5px';
  const mkBar = (name) => {
    const d = document.createElement('div');
    d.innerHTML = `<div style="display:flex;justify-content:space-between;gap:12px;color:var(--text-2)"><span>${name}</span><b class="num" style="color:var(--text)">0 N</b></div><div style="height:6px;margin-top:5px;border-radius:3px;background:rgba(128,128,128,.18)"><div style="height:100%;width:0;border-radius:3px;background:var(--accent)"></div></div>`;
    bars.append(d);
    return { n: d.querySelector('b'), fill: d.querySelector('div > div > div') };
  };
  const b1 = mkBar('Belt 1 pull (115 teeth)'), b2 = mkBar('Belt 2 pull (84 teeth)');
  ctx.panel.append(bars);
  const MAXPULL = PEAK / R72; // belt 2 at the 100 N·m peak, about 1,745 N

  const rpm = (v) => `${Math.round(v).toLocaleString('en-US')} rpm`;
  const nm = (v) => `${v < 10 ? v.toFixed(2) : v.toFixed(1)} N·m`;
  let lastPaint = 0;
  function paint(force) {
    const now = performance.now();
    if (!force && now - lastPaint < 90) return; // about 10 updates a second
    lastPaint = now;
    const Tq = torque();
    const motor = s * NOLOAD;
    const wheel = (motor / TOTAL) * (T.chain / COGS[cog]);
    for (const r of ROWS) {
      const c = cells[r.key];
      c.tq.textContent = nm(r.torque(Tq));
      c.sp.textContent = rpm(r.ratio == null ? wheel : motor * r.ratio);
    }
    const ms = (wheel / 60) * Math.PI * WHEEL_D;
    gNum.textContent = (ms * MPH).toFixed(0);
    gSub.textContent = `${(ms * 3.6).toFixed(0)} km/h in the ${COGS[cog]}T cog, wheel off the ground`;
    const p1 = Tq / STAGE2 / R72, p2 = Tq / R72;
    b1.n.textContent = `${Math.round(p1).toLocaleString('en-US')} N`; b1.fill.style.width = `${(p1 / MAXPULL) * 100}%`;
    b2.n.textContent = `${Math.round(p2).toLocaleString('en-US')} N`; b2.fill.style.width = `${(p2 / MAXPULL) * 100}%`;
  }

  // ---- motion: the throttle's torque against the stand's small drag (illustrative only)
  function step(dt) {
    dt = Math.min(dt, 0.05);
    if (springing) {
      t = Math.max(0, t - dt / 0.35);
      thr.set(Math.round(t * 100), { silent: true });
      if (t === 0) springing = false;
    }
    const drag = s > 0 ? 0.06 + 0.12 * s : 0;
    s = Math.max(0, s + (0.55 * t * room(s) - drag) * dt);
    if (s < 0.002 && t === 0) s = 0;
    theta += s * VIS * 2 * Math.PI * dt;
    bike.set(theta);
    paint();
    if (s === 0 && t === 0 && !springing) { paint(true); stop?.(); stop = null; }
  }
  function wake() {
    paint(true);
    if (!stop) stop = stage.onFrame(step);
  }
  paint(true);
  return { dispose() { stop?.(); stage.dispose(); } };
}
