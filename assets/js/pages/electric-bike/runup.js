// "Rev it up", scroll-driven: the bike on its repair stand with the rear wheel off the ground, the
// way I tested it. Scrolling opens the thumb throttle; both motors, both jackshaft axles, the belts
// and the chain sprocket spin up about their real axes in the CAD (bike.js), each at the speed its
// tooth counts give it, and the readout follows speed and torque through the reduction. It replaces
// the throttle slider; there is nothing to click.
//
// What is real and what is a model (as on the old demo):
//  - motor speed ceiling: SKP 6465, 150 KV (stated), on the 48 V pack (stated): 150 x 48 = 7,200 rpm,
//    the nominal no-load speed
//  - speed ratios: tooth counts in the CAD (16T to 72T, then 20T to 72T: 4.5, 3.6, 16.2 overall)
//  - torque: full throttle is the stated 100 N·m at the sprocket, split back through the ratios with
//    no losses; half throttle is half of it; it fades to zero as the motors near their no-load speed
//  - how fast it spins up is a simple illustration: speed is a smooth function of the scroll
//  - road speed is an estimate: a 27 in rim with a standard tire (Jerry's numbers), taken as 694 mm
//    across, in the 18T cog of the stock cassette of a 2019 Trek Dual Sport 2 (Shimano HG31, 11-32,
//    8 speed), because the cassette on the bike is not confirmed
// Every picture is a pure function of the scroll position (step + progress through it).
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadBike, AXES, STAGE1, STAGE2, TOTAL, R72, T } from './bike.js';

const KV = 150, VOLTS = 48;
const NOLOAD = KV * VOLTS; // 7,200 rpm at the motors
const PEAK = 100; // N·m at the output sprocket (stated)
const COG = 18; // rear cog for the road-speed estimate (assumed cassette, see above)
const WHEEL_D = 0.694; // m across the tire (estimate)
const MPH = 2.2369363;
const TURNS = 4; // motor turns per step of scrolling at full speed (the picture is slowed; the numbers are real)

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// u = step + progress through it, 0..4. Throttle: closed, half, full, full.
const throttleAt = (u) => 0.5 * smooth(0.85, 1.2, u) + 0.5 * smooth(1.85, 2.2, u);
// motor speed as a fraction of the no-load speed
const speedAt = (u) => 0.3 * smooth(1.05, 2, u) + 0.55 * smooth(2.05, 3, u) + 0.15 * smooth(3, 3.7, u);
// torque the motors can still make at speed s: full up to 85 % of no-load, then down to zero
const room = (s) => clamp((1 - s) / 0.15, 0, 1);
// motor angle: the integral of speed over the scroll, tabulated once so it is a pure function of u
const N = 800, U = 4, table = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) { const u = ((i - 0.5) / N) * U; table[i] = table[i - 1] + speedAt(u) * (U / N) * TURNS * 2 * Math.PI; }
const angleAt = (u) => { const x = clamp(u / U, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return lerp(table[i], table[i + 1], x - i); };

const ACCENT = '#ff6b35';
// the two sides (from the old demo): what each hides, and where it looks from
const SIDES = {
  nd: { dir: [0.31, 0.15, 0.42], hide: ['frame', 'battery', 'plateND', 'retainer', 'brackets'] },
  d: { dir: [0.05, -0.08, -0.62], hide: ['frame', 'battery', 'batteryPlate', 'plateD', 'retainer', 'brackets', 'idlerMount'] },
};
// per step: which side, and which parts are lit (the stage of the reduction the text is about)
const STEPS = [
  { side: 'nd', lit: [] },
  { side: 'nd', lit: ['rotor', 'magnets', 'pulley16'] },
  { side: 'd', lit: ['pulley72j', 'pulley20', 'pulley72o', 'hub'] },
  { side: 'd', lit: ['sprocket'] },
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const bike = await loadBike(stage);
  const G = bike.groups;
  const reduced = ctx.reducedMotion;
  const drive = ['pulley16', 'pulley72j', 'pulley72o', 'belt1', 'belt2', 'sprocket'].flatMap((g) => G[g] || []);

  // views, framed once with the drive at rest
  const sph = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), s }; };
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      views = Object.fromEntries(Object.entries(SIDES).map(([k, s]) => [k, sph(stage.frame(drive, { dir: s.dir, pad: 1.4, apply: false, refresh: true }))]));
    }
    return views;
  }
  const sp = new THREE.Spherical();
  function place(a, b, k, drift) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sp).add(target), target });
  }

  // labels at the shafts, on the side that faces the camera
  const ov = labelLayer(stage);
  const at = (ax, z) => [ax.p[0], ax.p[1], z];
  const L = {
    nd: [ov.label('Motor 1', at(AXES.motor1, 0.056), { color: '#fff1e2', side: 'l' }), ov.label('Motor 2', at(AXES.motor2, 0.056), { color: '#fff1e2' }), ov.label('Axle 1', at(AXES.jack, 0.05), { color: '#fff1e2', side: 'l' })],
    d: [ov.label('Axle 1', at(AXES.jack, -0.03), { color: '#fff1e2' }), ov.label('Axle 2', at(AXES.output, -0.03), { color: '#fff1e2', side: 'l', minW: 520 }), ov.label('Chain sprocket, 20T', [AXES.output.p[0] + 0.05, AXES.output.p[1] - 0.02, -0.05], { color: ACCENT })],
  };

  // the readout: a small instrument panel on the stage
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  ov.layer.append(hud);
  hud.innerHTML = `
    <div class="rx-hud-row rx-hud-thr"><span>Thumb throttle</span><b class="num" data-k="thr"></b><i><em data-k="thrBar"></em></i></div>
    <table class="num"><thead><tr><th></th><th>Speed</th><th>Torque</th></tr></thead><tbody>
      <tr><td>Each motor <small>150 KV, 16T</small></td><td data-k="m"></td><td data-k="mT"></td></tr>
      <tr class="rx-hud-x"><td>Axle 1 <small>72T in, 20T out</small></td><td data-k="a1"></td><td data-k="a1T"></td></tr>
      <tr><td>Axle 2 + sprocket <small>72T in, 20T out</small></td><td data-k="a2"></td><td data-k="a2T"></td></tr>
      <tr class="rx-hud-x"><td>Rear wheel <small>18T cog, estimate</small></td><td data-k="w"></td><td data-k="wT"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Road speed, estimate</span><b class="num" data-k="mph"></b></div>
    <div class="rx-hud-x rx-hud-bars"><div><span>Belt 1 pull</span><b class="num" data-k="b1"></b><i><em data-k="b1Bar"></em></i></div><div><span>Belt 2 pull</span><b class="num" data-k="b2"></b><i><em data-k="b2Bar"></em></i></div></div>`;
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  const bar = (k, f) => { const w = `${(f * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } };
  const rpm = (v) => `${Math.round(v).toLocaleString('en-US')} rpm`;
  const nm = (v) => `${v < 10 ? v.toFixed(2) : v.toFixed(1)} N·m`;
  const MAXPULL = PEAK / R72; // belt 2 at the 100 N·m peak, about 1,745 N
  function readout(u) {
    const t = throttleAt(u), s = speedAt(u);
    const Tq = t * PEAK * room(s); // at the sprocket
    const motor = s * NOLOAD, wheel = (motor / TOTAL) * (T.chain / COG);
    put('thr', `${Math.round(t * 100)} %`); bar('thrBar', t);
    put('m', rpm(motor)); put('mT', nm(Tq / TOTAL / 2));
    put('a1', rpm(motor / STAGE1)); put('a1T', nm(Tq / STAGE2));
    put('a2', rpm(motor / TOTAL)); put('a2T', nm(Tq));
    put('w', rpm(wheel)); put('wT', nm((Tq * COG) / T.chain));
    put('mph', `${Math.round((wheel / 60) * Math.PI * WHEEL_D * MPH)} mph`);
    put('mini', `Motors ${rpm(motor)}, sprocket ${rpm(motor / TOTAL)}`);
    const p1 = Tq / STAGE2 / R72, p2 = Tq / R72;
    put('b1', `${Math.round(p1).toLocaleString('en-US')} N`); bar('b1Bar', p1 / MAXPULL);
    put('b2', `${Math.round(p2).toLocaleString('en-US')} N`); bar('b2Bar', p2 / MAXPULL);
  }

  const tintC = new THREE.Color(), lit55 = new THREE.Color(ACCENT).multiplyScalar(0.42);
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    // keep the drive clear of the readout: it sits top right on a desktop, across the top on a phone
    const phone = el.clientWidth < 640;
    stage.setShift(phone ? 0 : -0.11, phone ? -0.06 : -0.03);
    const u = step + stepP;
    const prev = Math.max(0, step - 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const A = STEPS[prev], B = STEPS[step];
    // what shows: blend the two sides' hidden sets; belts keep a light tint to read on black plates
    for (const g of Object.keys(G)) {
      const oa = SIDES[A.side].hide.includes(g) ? 0 : 1, ob = SIDES[B.side].hide.includes(g) ? 0 : 1;
      const la = A.lit.includes(g) ? 1 : 0, lb = B.lit.includes(g) ? 1 : 0;
      const lit = step === prev ? lb : lerp(la, lb, k);
      tintC.set(0);
      if (/^belt/.test(g)) tintC.set(ACCENT).multiplyScalar(0.16);
      if (lit > 0) tintC.lerp(lit55, lit);
      bike.look(g, { opacity: lerp(oa, ob, k), emissive: tintC });
    }
    const nd = lerp(A.side === 'nd' ? 1 : 0, B.side === 'nd' ? 1 : 0, k);
    bike.markers.belt1.setOpacity(0.9 * nd);
    bike.markers.belt2.setOpacity(0.9 * (1 - nd) + 0.4 * nd);
    const v = viewsNow();
    place(v[A.side], v[B.side], k, reduced ? 0 : (u - 2) * 0.06);
    bike.set(reduced ? 0 : angleAt(u));
    for (const l of L.nd) l.a = smooth(0.55, 1, nd);
    for (const l of L.d) l.a = smooth(0.55, 1, 1 - nd);
    readout(u);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
