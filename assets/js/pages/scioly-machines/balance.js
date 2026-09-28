// Scrolly: balancing two masses on the real device, driven only by the scroll. Mass A is hung on
// the upper (class 1) lever, then mass B on the lower (class 2) lever; the levers tip toward the
// heavy side about their real fulcrums (rig.js); B slides out along its ruler until the device
// levels, and the readout gives m_A / m_B = b / (5a). The last step swaps the masses: with the
// heavier one on the class 1 lever there is no balance point on the rulers.
//
// What is real and what is drawn:
//  - the levers, the link, their fulcrums and the 375 / 75 = 5 link ratio are from the CAD
//  - the rulers run 65.0 to 315.8 mm from each fulcrum (CAD)
//  - the balance is ideal: the weights of the beams and the link, and bearing friction, are left out
//  - 100 g and 350 g are example masses, not the official test masses
//  - the device counts as level within 0.5% of the moment; how far it leans while it is not level is
//    a drawing (it leans fully against a visual stop until it is close); the stops are not in the CAD
//  - the masses and strings are drawn in; they are not part of the CAD
// Every picture is a pure function of (step, progress through it).
import { createStage } from '/assets/js/lib/stage.js';
import { loadRig, labels, clamp, K, RULER, STOP, G, P1, P2, X_UP, X_LO, ARM_UP } from './rig.js';

const LIGHT = 100, HEAVY = 350;       // grams: example masses
const A_AT = 200;                     // mm, where mass A hangs on the upper lever
const B_LEVEL = (K * A_AT * LIGHT) / HEAVY; // 285.7 mm: where B balances it
const BAND = 0.005;                   // level within 0.5% of the moment
const STRING = { a: 0.012, b: 0.085 }; // m, drawn string lengths (A stays clear above the lower beam)
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

/** everything the picture shows, from u = step + progress through it (0..5) */
function stateAt(u) {
  const step = Math.min(4, Math.floor(u)), s = u - step;
  const S = { mA: LIGHT, mB: HEAVY, hA: 1, hB: 1, a: A_AT, b: RULER[0], swapped: false };
  if (step === 0) { S.hA = smooth(0.15, 0.6, s); S.hB = 0; }
  else if (step === 1) S.hB = smooth(0.15, 0.6, s);
  else if (step === 2) S.b = lerp(RULER[0], B_LEVEL, smooth(0.1, 0.85, s));
  else if (step === 3) S.b = B_LEVEL;
  else {
    // lift both off, hang them the other way round, then slide A in and B out as far as they go
    S.b = B_LEVEL;
    const off = smooth(0.04, 0.24, s), on = smooth(0.3, 0.48, s);
    if (s < 0.27) { S.hA = S.hB = 1 - off; }
    else {
      S.swapped = true; S.mA = HEAVY; S.mB = LIGHT; S.hA = S.hB = on;
      S.a = lerp(A_AT, RULER[0], smooth(0.52, 0.72, s));
      S.b = lerp(B_LEVEL, RULER[1], smooth(0.72, 0.94, s));
    }
  }
  // moments on the upper lever (g mm): A's side against what B sends up the link
  const mA = S.mA * S.hA * S.a, mB = (S.mB * S.hB * S.b) / K;
  const ref = Math.max(mA, mB);
  S.off = ref > 1e-9 ? (mA - mB) / ref : 0; // > 0: A's side is heavy
  S.level = Math.abs(S.off) <= BAND;
  // lean: fully against the stop while clearly off, easing level close to balance (a drawing)
  // (and it only leans as far as the masses are hung)
  S.tip = S.level ? 0 : -Math.sign(S.off) * STOP * smooth(BAND, 0.15, Math.abs(S.off)) * smooth(0, 0.8, Math.max(S.hA, S.hB));
  return S;
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const reduced = ctx.reducedMotion;
  stage.bounds(rig.model); // at rest: the views are framed on these bounds once

  // ---------------------------------------------------------------- the masses (annotations, not CAD)
  const annot = new T.Group();
  annot.name = 'annotations';
  stage.scene.add(annot); // outside stage.root: not part of the CAD
  const massMat = {
    a: new T.MeshStandardMaterial({ color: '#ff6b35', roughness: 0.45, metalness: 0.15, transparent: true }),
    b: new T.MeshStandardMaterial({ color: '#58b0ff', roughness: 0.45, metalness: 0.15, transparent: true }),
  };
  const strMat = new T.MeshBasicMaterial({ color: '#d8d0c6', transparent: true });
  const cyl = new T.CylinderGeometry(1, 1, 1, 40);
  const thin = new T.CylinderGeometry(1, 1, 1, 6);
  const mk = (k) => {
    const body = new T.Mesh(cyl, massMat[k]);
    body.castShadow = true;
    const str = new T.Mesh(thin, strMat);
    annot.add(body, str);
    return { body, str };
  };
  const mass = { a: mk('a'), b: mk('b') };

  // lever-arm dimension lines along each beam
  const lineMat = (c) => new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0.95, depthTest: false });
  const dimGeo = () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(18), 3)); return g; };
  const dims = {
    a: new T.LineSegments(dimGeo(), lineMat('#ff6b35')), u: new T.LineSegments(dimGeo(), lineMat('#eee9e3')),
    b: new T.LineSegments(dimGeo(), lineMat('#58b0ff')), l: new T.LineSegments(dimGeo(), lineMat('#eee9e3')),
  };
  for (const d of Object.values(dims)) { d.renderOrder = 5; d.frustumCulled = false; annot.add(d); }
  function setDim(line, p, q, up, a) {
    const t = 0.009, arr = line.geometry.attributes.position.array;
    const pts = [p, q, p.clone().addScaledVector(up, -t), p.clone().addScaledVector(up, t), q.clone().addScaledVector(up, -t), q.clone().addScaledVector(up, t)];
    pts.forEach((v, i) => { arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; });
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.material.opacity = 0.95 * a;
    line.visible = a > 0.01;
  }

  // ---------------------------------------------------------------- tags
  const labs = labels(el);
  labs.add('f1', { text: 'Fulcrum', side: 'l' });
  labs.add('f2', { text: 'Fulcrum', side: 'r' });
  labs.add('link', { text: 'Rigid link', side: 'r' });
  labs.add('da', { text: 'a', side: 'c', cls: 'a dimtag' });
  labs.add('du', { text: '75 mm', side: 'c', cls: 'dimtag' });
  labs.add('db', { text: 'b', side: 'u', cls: 'b dimtag' });
  labs.add('dl', { text: '375 mm', side: 'u', cls: 'dimtag' });
  labs.add('A', { text: 'A', side: 'r', cls: 'mass a' });
  labs.add('B', { text: 'B', side: 'r', cls: 'mass b' });

  // ---------------------------------------------------------------- readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  labs.box.append(hud);
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Device</span><b data-k="st"></b></div>
    <table class="num"><thead><tr><th></th><th>Mass</th><th>From fulcrum</th></tr></thead><tbody>
      <tr><td>A <small>class 1, upper</small></td><td data-k="mA"></td><td data-k="a"></td></tr>
      <tr><td>B <small>class 2, lower</small></td><td data-k="mB"></td><td data-k="b"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>m<sub>A</sub> / m<sub>B</sub> = b / 5a</span><b class="num" data-k="r"></b></div>
    <div class="rx-hud-row rx-hud-x" style="margin-top:8px"><span>Link force</span><b class="num" data-k="t"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Error if each ruler is off 1 mm</span><b class="num" data-k="e"></b></div>
    <div style="margin-top:8px;font-size:var(--rx-ov-small);color:var(--muted)">Ideal balance, example masses (not the official ones)</div>`;
  const KK = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { KK[k].textContent = t; shown[k] = t; } };
  // the readout sits in the bottom right on a desktop (the top right holds the upper lever's fulcrum
  // and the link), across the top on a phone (site.css)
  let hudAt = '';
  const hudPlace = (phone) => { const w = phone ? 'top' : 'bottom'; if (w !== hudAt) { hudAt = w; hud.style.top = phone ? '' : 'auto'; hud.style.bottom = phone ? '' : '14px'; } };
  const tone = (k, c) => { if (shown[`${k}c`] !== c) { KK[k].style.color = c; shown[`${k}c`] = c; } };

  // ---------------------------------------------------------------- camera: framed once at rest per stage shape
  let view = null, aspect = 0;
  function viewNow() {
    const a = stage.camera.aspect; // the stage's own (it follows a resize)
    if (!view || a !== aspect) {
      aspect = a;
      // a tall stage gets a flatter side view so the device fills it
      const o = a < 1.1 ? { azimuth: -84, elevation: 9, pad: 0.97 } : { azimuth: -72, elevation: 14, pad: 1.16 };
      const v = stage.frame(rig.model, { ...o, apply: false });
      view = { t: v.target.clone(), s: new T.Spherical().setFromVector3(v.pos.clone().sub(v.target)) };
      labs.resize();
    }
    return view;
  }
  const sp = new T.Spherical();
  const up = new T.Vector3(0, 1, 0), xAxis = new T.Vector3(1, 0, 0), right = new T.Vector3();
  const size = (m) => 0.022 * Math.cbrt(m / 100); // diameter: the same density for every mass

  function hang(ms, pHang, m, h, len) {
    const d = size(m) * lerp(0.35, 1, h), hh = d * 0.85, L = len * h;
    ms.str.position.set(pHang.x, pHang.y - L / 2, pHang.z);
    ms.str.scale.set(0.0005, Math.max(1e-4, L), 0.0005);
    ms.body.position.set(pHang.x, pHang.y - L - hh / 2, pHang.z);
    ms.body.scale.set(d / 2, hh, d / 2);
    ms.body.visible = ms.str.visible = h > 0.01;
    return ms.body.position;
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, 4);
    // clear of the step cards on a full-width desktop stage, and of the readout (bottom right; across the top on a phone)
    const [fx, fy] = ctx.shift();
    const phone = el.clientWidth < 640;
    hudPlace(phone);
    stage.setShift(fx, phone ? -0.14 : fy + 0.03);
    const S = stateAt(step + (reduced ? 0.999 : stepP));
    const v = viewNow();
    sp.set(v.s.radius, v.s.phi, v.s.theta + (reduced ? 0 : (p - 0.5) * 0.1));
    stage.setView({ pos: new T.Vector3().setFromSpherical(sp).add(v.t), target: v.t });
    rig.set(S.tip);

    // masses: A on the upper lever, B on the lower; their colours follow the lever, not the value
    const hA = rig.upperPoint(S.a, 0.010), hB = rig.lowerPoint(S.b, 0.010);
    const cA = hang(mass.a, hA, S.mA, S.hA, STRING.a), cB = hang(mass.b, hB, S.mB, S.hB, STRING.b);
    massMat.a.opacity = S.hA; massMat.b.opacity = S.hB;

    // dimension lines: a and 75 mm above the upper beam, b and 375 mm under the lower beam
    const lift = 0.028, drop = 0.038;
    const n1 = up.clone().applyAxisAngle(xAxis, rig.a1), n2 = up.clone().applyAxisAngle(xAxis, rig.a2);
    const f1 = rig.upperPoint(0, -lift), pa = rig.upperPoint(S.a, -lift);
    const pu = rig.pinU().addScaledVector(n1, lift);
    const f2 = rig.lowerPoint(0, drop), pb = rig.lowerPoint(S.b, drop);
    const pl = rig.pinL().addScaledVector(n2, -drop);
    const f2b = f2.clone().addScaledVector(n2, -0.024), pl2 = pl.clone().addScaledVector(n2, -0.024);
    const showB = smooth(0.5, 1, S.hB);
    setDim(dims.a, f1, pa, n1, S.hA); setDim(dims.u, f1, pu, n1, S.hA);
    setDim(dims.b, f2, pb, n2, showB); setDim(dims.l, f2b, pl2, n2, showB);
    stage.invalidate();

    // tags
    right.setFromMatrixColumn(stage.camera.matrixWorld, 0);
    const narrow = el.clientWidth < 520; // phones: keep the tags that matter
    labs.point('A', cA.clone().addScaledVector(right, mass.a.body.scale.x + 0.003));
    labs.point('B', cB.clone().addScaledVector(right, mass.b.body.scale.x + 0.003));
    labs.text('A', `A  ${S.mA} g`); labs.text('B', `B  ${S.mB} g`);
    labs.alpha('A', smooth(0.5, 1, S.hA)); labs.alpha('B', showB);
    labs.point('f1', new T.Vector3(X_UP, P1[0], P1[1])); labs.alpha('f1', 1);
    labs.point('f2', new T.Vector3(X_LO, P2[0], P2[1])); labs.alpha('f2', 1);
    const u = rig.pinU(), l = rig.pinL();
    labs.point('link', new T.Vector3(0.05, (u.y + l.y) / 2, (u.z + l.z) / 2 + 0.012)); labs.alpha('link', narrow ? 0 : 1);
    labs.point('da', pa.clone().lerp(f1, 0.5).addScaledVector(n1, 0.004)); labs.text('da', `a = ${S.a.toFixed(1)} mm`); labs.alpha('da', S.hA);
    labs.point('du', pu.clone().lerp(f1, 0.5).addScaledVector(n1, 0.004)); labs.alpha('du', narrow ? 0 : S.hA);
    labs.point('db', pb.clone().lerp(f2, 0.5).addScaledVector(n2, -0.004)); labs.text('db', `b = ${S.b.toFixed(1)} mm`); labs.alpha('db', showB);
    labs.point('dl', pl2.clone().lerp(f2b, 0.8).addScaledVector(n2, -0.004)); labs.alpha('dl', narrow ? 0 : showB);
    labs.update(stage.camera);

    // readout
    const hungA = S.hA > 0.5, hungB = S.hB > 0.5;
    put('mA', hungA ? `${S.mA} g` : 'not hung'); put('a', hungA ? `${S.a.toFixed(1)} mm` : '');
    put('mB', hungB ? `${S.mB} g` : 'not hung'); put('b', hungB ? `${S.b.toFixed(1)} mm` : '');
    put('mini', `A ${hungA ? `${S.mA} g at ${S.a.toFixed(1)} mm` : 'not hung'}, B ${hungB ? `${S.mB} g at ${S.b.toFixed(1)} mm` : 'not hung'}`);
    const both = hungA && hungB;
    const need = (K * S.a * S.mA) / S.mB; // where B would have to hang to balance A
    let st, c;
    if (!hungA && !hungB) { st = 'Nothing hung'; c = ''; }
    else if (S.level && both) { st = 'Level'; c = '#9be39b'; }
    else if (S.swapped && both && need > RULER[1]) { st = `No balance: B would need ${Math.round(need).toLocaleString('en-US')} mm`; c = '#ffb38a'; }
    else { st = S.off > 0 ? 'A side is heavy' : 'B side is heavy'; c = '#ffb38a'; }
    put('st', st); tone('st', c);
    const read = S.level && both;
    put('r', read ? (S.b / (K * S.a)).toFixed(3) : 'not level yet');
    put('t', read ? `${(((S.mA / 1000) * G * S.a) / ARM_UP).toFixed(2)} N` : 'not level yet');
    put('e', both ? `±${(100 * (1 / S.a + 1 / S.b)).toFixed(1)} %` : '');
  }
  setProgress(0, 0, 0);

  return {
    setProgress,
    dispose() {
      labs.dispose();
      for (const d of Object.values(dims)) { d.geometry.dispose(); d.material.dispose(); }
      cyl.dispose(); thin.dispose(); massMat.a.dispose(); massMat.b.dispose(); strMat.dispose();
      stage.scene.remove(annot);
      stage.dispose();
    },
  };
}
