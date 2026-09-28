// Drivetrain scrolly (`drivetrain`): zoomed in on Jerry's CAD, one push of the servo runs through
// every stage (bevel pair, belt, 36T:12T spur pair, offset slider-crank) and runs the carriage along
// its MGN7 rail until its plate has pressed the keycap to the end of the switch's travel. Each step frames one stage and lights it; in every step the whole mechanism does
// one push and comes back, so the reader sees what that stage does to the motion. The last step
// pushes the key all the way in, holds it there, and lets it back out (Jerry, Sept 27).
//
// Everything turns about its real axis from the CAD (rig.js). The mechanism runs in the CAD pose,
// the shirt pose the reader just saw, with the lid, frame and logo lifted away. The keycap stays
// where the CAD has it until the carriage plate reaches its top face; the plate then presses keycap
// and stem the switch's 4 mm (rig.js has the measurements).
//
// A pure function of the scroll (step, progress through it). Views are framed once with the
// mechanism at rest and cached; the camera only blends between them. Reduced motion: no pushes
// until the last step, and the views cut.
import { createStage, cad } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { blendIn } from '/assets/js/lib/ease.js';
import { loadMechanism, rigDrivetrain, linkage, travel, clamp, smooth, sph, place, STROKE_DEG, PHI_CAD, TRAVEL, KEY_TRAVEL, AX } from './rig.js';

const ACCENT = '#ff6b35';
const HIDE = ['lidScrews', 'logo', 'web', 'bars', 'barScrews', 'lidRing', 'guides'];

// per step: what the camera frames (regex on CAD names, at rest), from where, and what lights up;
// `wide` is extra padding for a long, low subject when the picture is pushed right of the step cards
const STEPS = [
  { frame: null, az: 30, el: 38, pad: 1.02, lit: /_DDJ_STDLOW2_|_DDJ_STDLOW_GEAR6_|_Body_1$/ },
  { frame: /_2317_4008_0024_|_DDJ_STDLOW_GEAR6_/, az: -15, el: 8, pad: 1.7, lit: /_2317_4008_0024_/ },
  { frame: /_3422_|_monkeybelt_/, az: 20, el: 55, pad: 1.15, lit: /_3422_|_monkeybelt_/ },
  { frame: /_Spur_Gear_/, az: 0, el: 50, pad: 1.2, lit: /_Spur_Gear_/ },
  { frame: /_Spur_Gear_12_|_Component69_1$|_Component52_1$/, az: -10, el: 62, pad: 1.25, lit: /_Spur_Gear_12_|_Component69_1$/ },
  { frame: /_LS_MGN7_|_Component52_1$|_Component38_1$|_Bottom_1$|_Top_1$/, az: 28, el: 34, pad: 1.18, lit: /_LS_MGN7_Block_|_Component52_1$/ },
  // the keycap step, close up from the front so the press reads as a push along the rail: framed on
  // the keycap and switch, with the centre moved 10 mm back along the rail (STEP -X) so the plate is
  // in view from where it meets the keycap
  { frame: /_Component38_1$|_Bottom_1$|_Top_1$/, az: 12, el: 30, pad: 1.1, off: [-0.01, 0, 0], lit: /_Component38_1$/ },
];
const P = (x, y, z) => cad.point([x, y, z]);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const mech = await loadMechanism(stage);
  const { model, parts } = mech;
  const reduced = ctx.reducedMotion;
  for (const k of HIDE) for (const o of parts[k]) o.visible = false;
  stage.fitGround();
  // parts for each step, found before the rig adds its pivot groups (whose names would match too)
  const find = (re) => stage.part(re, model);
  const visible = model.children.filter((o) => o.visible);
  const lit = STEPS.map((s) => find(s.lit));
  const framed = STEPS.map((s) => (s.frame ? find(s.frame) : visible));
  const rig = rigDrivetrain(stage, mech);

  // views, framed once with the mechanism at rest (the CAD pose)
  let views = null, key = '';
  function viewsNow(fx) {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && key === `${a}|${fx}`) return views;
    key = `${a}|${fx}`;
    // a narrower readout on wide stages; phones keep the full-width strip from site.css
    hud.style.width = el.clientWidth >= 640 ? 'min(270px, calc(100% - 28px))' : '';
    rig.set(PHI_CAD);
    views = STEPS.map((s, i) => sph(THREE, stage.frame(framed[i], { azimuth: s.az, elevation: s.el, pad: s.pad * (fx > 0 ? s.wide || 1 : 1), offset: s.off, apply: false, refresh: true })));
    return views;
  }

  // labels on the parts of the active step (points in STEP mm; the moving ones follow the linkage)
  const ov = labelLayer(stage);
  const C = { color: '#fff1e2' };
  const L = [
    [ov.label('Servo', P(8, -16, -4.3), C), ov.label('4xAA battery holder', P(-112, -13, -45.7), { ...C, minW: 560 })],
    [ov.label('Bevel gears, 1 : 1', P(-15, -26.4, -27), C)],
    [ov.label('20T', P(-19.2, -26.4, -25), C), ov.label('20T', P(-71.1, 3.6, -25), { ...C, side: 'l' }), ov.label('Belt, 80T', P(-41.4, -4.9, -26.5), { ...C, minW: 480 })],
    [ov.label('36T', P(-71.1, 22, -59), C), ov.label('12T', P(-73.4, -30, -57), { ...C, side: 'l' })],
    [ov.label('Crank, 32 mm', [0, 0, 0], { ...C, side: 'l' }), ov.label('Link, 33 mm', [0, 0, 0], C)],
    [ov.label('MGN7 rail, 70 mm', P(-72, -50.4, -62.5), { ...C, side: 'l' }), ov.label('Carriage', [0, 0, 0], C)],
    [ov.label('Keycap', P(-3.7, -50.5, -40.3), C), ov.label('Cherry MX switch', P(8.5, -50.5, -41.9), { ...C, minW: 480 })],
  ];
  const crankL = L[4][0], linkL = L[4][1], carL = L[5][1], keyL = L[6][0];

  // the readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div class="rx-hud-row rx-hud-x"><span>Servo</span><b class="num" data-k="servo"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Crank, 3 : 1 on the servo</span><b class="num" data-k="crank"></b></div>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row"><span>Keycap pressed</span><b class="num" data-k="key"></b></div>
    <div class="rx-hud-row rx-hud-big"><span>Carriage travel</span><b class="num" data-k="travel"></b><i><em data-k="bar"></em></i></div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { K[k].textContent = t; shown[k] = t; } };

  const lightOn = new Map(); // step -> intensity applied
  function light(i, a) {
    const q = Math.round(a * 20) / 20;
    if ((lightOn.get(i) ?? 0) === q) return;
    lightOn.set(i, q);
    stage.highlight(lit[i], q > 0 ? ACCENT : null, { intensity: 0.32 * q });
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    // clear of the step cards (ctx.shift) and a little lower, clear of the readout at the top right
    const [fx, fy] = ctx.shift();
    stage.setShift(fx, fx > 0 ? fy - 0.04 : fy);
    const v = viewsNow(fx);
    const last = step === STEPS.length - 1;
    // one push and back per step once the camera has arrived; the last step pushes the key all the
    // way in, holds it at the bottom of its travel, and lets it back out
    const t = clamp((stepP - 0.34) / 0.64, 0, 1);
    const phi = reduced ? (last ? STROKE_DEG : 0)
      : last ? STROKE_DEG * (smooth(0, 0.42, t) - smooth(0.62, 1, t)) : STROKE_DEG * Math.sin(Math.PI * t) ** 2;
    const k = rig.set(phi);
    const prev = Math.max(0, step - 1);
    const b = step === 0 || reduced ? 1 : blendIn(stepP, 0.5);
    const drift = reduced ? 0 : (stepP - 0.5) * 3;
    place(stage, v[prev], v[step], b, drift, 0);
    // highlights and labels follow the active step
    for (let i = 0; i < STEPS.length; i++) light(i, i === step ? b : i === prev && step !== prev ? 1 - b : 0);
    L.forEach((ls, i) => ls.forEach((l) => { l.a = i === step ? smooth(0.5, 1, b) : 0; }));
    // the moving labels: crank at the middle of the crank arm, link at the middle of the coupler
    const dx = k.sx - linkage(PHI_CAD).sx;
    const tr = travel(k);
    crankL.p.set(...P((AX.spur12.p[0] + k.px) / 2, (AX.spur12.p[1] + k.py) / 2, -57));
    linkL.p.set(...P((k.px + k.sx) / 2, (k.py - 50.3) / 2, -54));
    carL.p.set(...P(-49 + dx, -50.4, -46.5));
    keyL.p.set(...P(-3.7 + tr.key, -50.5, -40.3));
    ov.update();
    put('servo', `${phi.toFixed(1)}°`);
    put('crank', `${(3 * phi).toFixed(1)}°`);
    put('travel', `${Math.max(0, tr.car).toFixed(1)} mm`);
    put('key', `${tr.key.toFixed(1)} of ${KEY_TRAVEL.toFixed(1)} mm`);
    put('mini', `Servo ${phi.toFixed(1)}°, crank ${(3 * phi).toFixed(1)}°`);
    const w = `${(clamp(tr.car / TRAVEL, 0, 1) * 100).toFixed(1)}%`;
    if (shown.bar !== w) { K.bar.style.width = w; shown.bar = w; }
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
