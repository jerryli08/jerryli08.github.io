// Scrolly: the linkage in my CAD, driven only by the scroll. Step by step it lights the class 1
// lever, the class 2 lever and the rigid link, with each one's fulcrum, effort and load tagged;
// in the last step the upper lever tips back and forth and the link carries the lower lever with
// it, a fifth as far. Both levers turn about their real fulcrums (the 6202 bearing bores in the
// STEP, see rig.js). The tipping range is a visual limit, not a stop in the CAD.
// Every picture is a pure function of (step, progress through it).
import { createStage } from '/assets/js/lib/stage.js';
import { loadRig, labels, DEG, STOP, K, P1, P2, X_UP, X_LO, clamp } from './rig.js';

const COL = { upper: '#ff6b35', lower: '#58b0ff', link: '#f2c14e' };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const S = STOP / DEG; // degrees

// per step: the lit group, the tags shown and the camera view
const STEPS = [
  { lit: null, tags: ['nU', 'nL', 'nK'], view: 'three' },
  { lit: 'upper', tags: ['uF', 'uE', 'uL'], view: 'three' },
  { lit: 'lower', tags: ['lF', 'lL', 'lE'], view: 'three' },
  { lit: 'link', tags: ['kU', 'kL'], view: 'side' },
];
const VIEWS = { three: { azimuth: -52, elevation: 20, pad: 1.1 }, side: { azimuth: -76, elevation: 10, pad: 1.14 } };

// how far mass A's side of the upper lever is down (degrees), as a function of u = step + stepP
function tipAt(u) {
  if (u < 1) return 0;
  if (u < 3) return 0.6 * S * smooth(0.25, 0.85, u - 1); // class 1: the effort side goes down, the link side up
  // the link step: keyframes, eased between (A side down, B side down, A side down, level)
  const s = u - 3, keys = [[0, 0.6 * S], [0.33, -S], [0.66, S], [1, 0]];
  for (let i = 1; i < keys.length; i++) if (s <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], smooth(keys[i - 1][0], keys[i][0], s));
  return 0;
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const reduced = ctx.reducedMotion;
  stage.bounds(rig.model); // measured once, at rest: every view below is framed on these bounds

  // ---------------------------------------------------------------- tags
  const labs = labels(el);
  const tag = (id, text, side, cls) => labs.add(id, { text, side, cls });
  tag('nU', 'Class 1 lever', 'c', 'a'); tag('nL', 'Class 2 lever', 'u', 'b'); tag('nK', 'Rigid link', el.clientWidth < 520 ? 'l' : 'r', 'k'); // a phone: the text inside the stage
  tag('uF', 'Fulcrum', 'l'); tag('uE', 'Effort: mass A', 'c'); tag('uL', 'Load: the link', 'c');
  tag('lF', 'Fulcrum', 'r'); tag('lL', 'Load: mass B', 'u'); tag('lE', 'Effort: the link', 'r');
  tag('kU', 'Pin on the class 1 lever, 75 mm out', 'l'); tag('kL', 'Pin on the class 2 lever, 375 mm out', 'l');
  const at = {
    nU: () => rig.upperPoint(250, -0.014), nL: () => rig.lowerPoint(200, 0.012), nK: () => { const u = rig.pinU(), l = rig.pinL(); return new T.Vector3(0.05, (u.y + l.y) / 2, (u.z + l.z) / 2 + 0.012); },
    uF: () => new T.Vector3(X_UP, P1[0], P1[1]), uE: () => rig.upperPoint(190, -0.012), uL: () => rig.pinU().add(new T.Vector3(0, 0.012, 0)),
    lF: () => new T.Vector3(X_LO, P2[0], P2[1]), lL: () => rig.lowerPoint(190, 0.012), lE: () => rig.pinL().add(new T.Vector3(0, -0.02, 0)),
    kU: () => rig.pinU(), kL: () => rig.pinL(),
  };

  // ---------------------------------------------------------------- readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  labs.box.append(hud);
  hud.innerHTML = `
    <table class="num"><tbody>
      <tr><td>Class 1 lever <small>upper, 75 mm to the link</small></td><td data-k="a1"></td></tr>
      <tr><td>Class 2 lever <small>lower, 375 mm to the link</small></td><td data-k="a2"></td></tr>
      <tr class="rx-hud-x"><td>Each link pin moves</td><td data-k="d"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Angle ratio</span><b class="num" data-k="r"></b></div>`;
  const KK = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { KK[k].textContent = t; shown[k] = t; } };
  // the readout sits in the bottom right on a desktop (the top right holds the upper lever's fulcrum
  // and the link), across the top on a phone (site.css)
  let hudAt = '';
  const hudPlace = (phone) => { const w = phone ? 'top' : 'bottom'; if (w !== hudAt) { hudAt = w; hud.style.top = phone ? '' : 'auto'; hud.style.bottom = phone ? '' : '14px'; } };
  const deg = (v) => `${v >= 0 ? '' : '-'}${Math.abs(v).toFixed(2)}°`;

  // ---------------------------------------------------------------- views, framed once at rest per stage shape
  const sph = (v) => ({ t: v.target.clone(), s: new T.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    const a = stage.camera.aspect; // the stage's own (it follows a resize)
    if (!views || a !== aspect) {
      aspect = a;
      views = Object.fromEntries(Object.entries(VIEWS).map(([k, o]) => [k, sph(stage.frame(rig.model, { ...o, apply: false }))]));
      labs.resize();
    }
    return views;
  }
  const sp = new T.Spherical();
  function place(a, b, k, drift) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: new T.Vector3().setFromSpherical(sp).add(target), target });
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const phone = el.clientWidth < 640;
    hudPlace(phone);
    stage.setShift(phone ? 0 : -0.05, phone ? -0.07 : 0.03); // clear of the readout (bottom right; across the top on a phone)
    const prev = Math.max(0, step - 1), A = STEPS[prev], B = STEPS[step];
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    const u = step + (reduced ? (step === 3 ? 0.33 : 1) : stepP); // reduced motion: each step's own pose, no sweep
    const v = viewsNow();
    place(v[A.view], v[B.view], k, reduced ? 0 : (p - 0.5) * 0.14);
    rig.set(-tipAt(u) * DEG);
    for (const g of ['upper', 'lower', 'link']) rig.tint(g, COL[g], lerp(A.lit === g ? 1 : 0, B.lit === g ? 1 : 0, k));
    // tags: the old set leaves over the first part of the blend, the new one arrives after it
    for (const s of STEPS) for (const id of s.tags) {
      const inA = A.tags.includes(id) && prev !== step, inB = B.tags.includes(id);
      labs.alpha(id, inB ? smooth(0.35, 1, k) : inA ? 1 - smooth(0, 0.5, k) : 0);
      labs.point(id, at[id]());
    }
    labs.update(stage.camera);
    const a1 = -rig.a1 / DEG, a2 = -rig.a2 / DEG;
    put('a1', deg(a1)); put('a2', deg(a2));
    put('d', `${Math.abs(75 * Math.sin(rig.a1)).toFixed(1)} mm`);
    put('r', Math.abs(a1) < 0.01 ? `${K.toFixed(1)} : 1 (CAD)` : `${(a1 / a2).toFixed(2)} : 1`);
    put('mini', `Class 1 ${deg(a1)}, class 2 ${deg(a2)}`);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { labs.dispose(); stage.dispose(); } };
}
