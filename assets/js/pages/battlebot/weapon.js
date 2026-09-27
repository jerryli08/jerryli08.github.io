// The weapon stack, scroll-driven (Jerry's version 2 CAD). Scrolling cuts the robot open through
// the SunnySky V4006's spin axis, so the stator seated on the bottom plate, the bell around it, the
// blade screwed to the bell and the shaft running up into the 4 mm bearing in the top plate all
// show at once; then it lights the parts that spin (blade, bell and blade screws) and spins them
// up about the real axis from the STEP while the readout climbs to the no-load speed.
// The readout is Jerry's weapon calculator: 740 KV x 11.1 V = 8,214 rpm, tip speed on the 112 mm
// blade. The spin-up curve itself is a simple illustration, and the blade is drawn far slower
// than it really turns. Every picture is a pure function of the scroll position.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, rig, blurDisc, W_MAX, tipOf, fmtInt } from './rig.js';
import { clamp, smooth, lerp, toSph, blend, frameBox, viewCache } from './views.js';

const ACCENT = '#ff6b35';
const TURNS = 7; // drawn blade turns per step of scrolling at full speed (the numbers are the real speeds)
// blade speed through the last step, as a fraction of the no-load speed (u = progress through it)
const speedAt = (u) => 1 - (1 - smooth(0, 0.8, u)) ** 2;
const N = 400, table = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) table[i] = table[i - 1] + speedAt((i - 0.5) / N) * (1 / N) * TURNS * 2 * Math.PI;
const angleAt = (u) => { const x = clamp(u, 0, 1) * N, i = Math.min(N - 1, Math.floor(x)); return lerp(table[i], table[i + 1], x - i); };

// per step: how far the cut has gone in (0 = nothing cut, 1 = through the spin axis), whether the
// labels show, how strongly the spinning parts are lit, and which view
const STEPS = [
  { cut: 0, labels: 0, lit: 0, view: 0 },
  { cut: 1, labels: 1, lit: 0, view: 1 },
  { cut: 1, labels: 1, lit: 1, view: 1 },
  { cut: 1, labels: 0, lit: 0.6, view: 1 },
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const reduced = ctx.reducedMotion;
  const { model, p } = await loadRobot(stage, 'v2');
  const pv = rig(stage, p);
  const spinning = [...p.blade, ...p.rotor, ...p.screws];
  const { box } = stage.bounds(model);

  // the cut: keeps x <= c, seen from +X. Parked just outside the model, then moved to the spin axis (x = 0).
  const cut = stage.sectionPlane([-1, 0, 0], box.max.x + 0.01);
  const disc = blurDisc(T, '#ff9b6e');
  disc.position.set(0, 0.019, -0.076);
  disc.material.clippingPlanes = [cut.plane];
  stage.scene.add(disc);

  const views = viewCache(el, (aspect) => {
    const portrait = aspect < 1;
    const whole = stage.frame(model, { azimuth: 138, elevation: 24, pad: portrait ? 1.2 : 1.1, apply: false });
    // the weapon stack from the side: plate noses back past the bell, floor to top plate
    const side = frameBox(stage, [-0.03, -0.006, -0.139], [0, 0.041, -0.019], { azimuth: 90, elevation: 8, pad: portrait ? 1.02 : 1.08 });
    return [whole, side].map((v) => toSph(T, v));
  });

  // labels on the cut face
  const ov = labelLayer(stage);
  const L = (text, at, side, color = '#fff1e2') => ov.label(text, at, { side, color });
  const long = [
    L('4 mm bearing in the top plate', [0, 0.0316, -0.076], 'l'),
    L('Bell', [0, 0.018, -0.0545], 'l', ACCENT),
    L('Stator, bolted to the bottom plate', [0, 0.0105, -0.0665], 'l'),
    L('Blade screws: 4 x M3 x 6 mm', [0, 0.0262, -0.082], 'r', ACCENT),
    L('Blade', [0, 0.0195, -0.118], 'r', ACCENT),
  ];
  const short = [
    L('Top bearing', [0, 0.0316, -0.076], 'l'),
    L('Bell', [0, 0.018, -0.0545], 'l', ACCENT),
    L('Stator', [0, 0.0105, -0.0665], 'l'),
    L('Screws', [0, 0.0262, -0.082], 'r', ACCENT),
    L('Blade', [0, 0.0195, -0.118], 'r', ACCENT),
  ];

  // readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Weapon</span><b class="num" data-k="rpm"></b><i><em data-k="bar"></em></i></div>
    <div class="rx-hud-row rx-hud-big"><span>Blade tip</span><b class="num" data-k="fts"></b></div>
    <div class="rx-hud-row rx-hud-x"><span></span><b class="num" data-k="mph"></b></div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };

  let litNow = -1;
  function setProgress(prog, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const A = STEPS[Math.max(0, step - 1)], B = STEPS[step];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const [fx, fy] = ctx.shift();
    const phone = el.clientWidth < 640;
    stage.setShift(fx, phone ? -0.1 : fy - 0.03);
    // the cut slides in from outside the model to the spin axis
    const c = lerp(A.cut, B.cut, step === 1 && !reduced ? smooth(0, 0.7, stepP) : k);
    cut.set(lerp(box.max.x + 0.01, 0, c));
    // what spins, lit orange (the cut faces glow with it)
    const lit = Math.round(lerp(A.lit, B.lit, k) * 100) / 100;
    if (lit !== litNow) { stage.highlight(spinning, ACCENT, { intensity: 0.7 * lit }); litNow = lit; }
    // spin-up in the last step
    const last = step === STEPS.length - 1;
    const s = last ? (reduced ? 1 : speedAt(stepP)) : 0;
    pv.weapon.setAngle(last && !reduced ? -angleAt(stepP) : 0);
    disc.setSpeed(reduced ? 0 : s * W_MAX);
    const t = tipOf(s * W_MAX);
    put('rpm', `${fmtInt(t.rpm)} rpm`);
    const bw = `${(s * 100).toFixed(1)}%`;
    if (shown.bar !== bw) { K.bar.style.width = bw; shown.bar = bw; }
    put('fts', `${Math.round(t.fts)} ft/s`);
    put('mph', `${t.mph.toFixed(1)} mph`);
    const ha = String(step >= 3 ? 1 : step === 2 ? Math.round(smooth(0.6, 1, stepP) * 100) / 100 : 0);
    if (shown.ha !== ha) { hud.style.opacity = ha; shown.ha = ha; }
    // camera: framed once at rest, blended by the scroll
    const v = views();
    blend(stage, v[A.view], v[B.view], k, reduced ? 0 : 0.03 * (step + stepP - 2));
    const la = lerp(A.labels, B.labels, step === 1 ? smooth(0.55, 0.9, stepP) : k);
    const narrow = el.clientWidth < 620;
    for (const l of long) l.a = narrow ? 0 : la;
    for (const l of short) l.a = narrow ? la : 0;
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
