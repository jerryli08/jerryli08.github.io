// Demo: balance two masses on the real device. Mass A hangs on the upper (class 1) lever, mass B
// on the lower (class 2) lever; the rigid link between them gives 375 / 75 = 5. Slide either mass
// (drag its tag, or use the sliders) and the other one moves to keep the device level; in "Find
// it yourself" the levers tip about their real fulcrums until the reader finds the balance.
// The masses and strings are drawn in as annotations (they are not in the CAD).
import { createStage } from '/assets/js/lib/stage.js';
import { slider, readout, segmented, button } from '/assets/js/lib/ui.js';
import { loadRig, labels, status, clamp, DEG, K, RULER, STOP, G, P1, P2, X_UP, X_LO, ARM_UP } from './rig.js';

const M_MIN = 10, M_MAX = 500;  // grams: an ASSUMED range for the demo, not the official one
const BAND = 0.005;             // the demo calls it level within 0.5% of the moment
const STRING = { a: 0.012, b: 0.085 }; // m, drawn string lengths (A stays clear above the lower beam)

export async function mount(el, ctx) {
  const stage = createStage(el, { hint: ctx.isTouch ? 'Drag a mass tag, or swipe sideways to turn' : 'Drag a mass tag to slide it; drag the model to rotate' });
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const reduced = ctx.reducedMotion;

  // ---------------------------------------------------------------- the masses (annotations)
  const annot = new T.Group();
  annot.name = 'annotations';
  stage.scene.add(annot); // outside stage.root: not part of the CAD
  const massMat = { a: new T.MeshStandardMaterial({ color: '#ff6b35', roughness: 0.45, metalness: 0.15 }), b: new T.MeshStandardMaterial({ color: '#58b0ff', roughness: 0.45, metalness: 0.15 }) };
  const strMat = new T.MeshBasicMaterial({ color: '#d8d0c6' });
  const cyl = new T.CylinderGeometry(1, 1, 1, 40);
  const thin = new T.CylinderGeometry(1, 1, 1, 6);
  const mk = (k) => {
    const body = new T.Mesh(cyl, massMat[k]);
    body.castShadow = true;
    const str = new T.Mesh(thin, strMat);
    annot.add(body, str);
    return { body, str };
  };
  const massA = mk('a'), massB = mk('b');

  // lever-arm dimension lines, drawn just above each beam
  const lineMat = (c) => new T.LineBasicMaterial({ color: c, transparent: true, opacity: 0.95, depthTest: false });
  const dimGeo = () => { const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(new Float32Array(18), 3)); return g; };
  const dims = {
    a: new T.LineSegments(dimGeo(), lineMat('#ff6b35')), u: new T.LineSegments(dimGeo(), lineMat('#eee9e3')),
    b: new T.LineSegments(dimGeo(), lineMat('#58b0ff')), l: new T.LineSegments(dimGeo(), lineMat('#eee9e3')),
  };
  for (const d of Object.values(dims)) { d.renderOrder = 5; d.frustumCulled = false; annot.add(d); }
  function setDim(line, p, q, up) {
    // a line p..q with end ticks, both points already lifted above the beam; up = unit tick direction
    const t = 0.009, arr = line.geometry.attributes.position.array;
    const pts = [p, q, p.clone().addScaledVector(up, -t), p.clone().addScaledVector(up, t), q.clone().addScaledVector(up, -t), q.clone().addScaledVector(up, t)];
    pts.forEach((v, i) => { arr[i * 3] = v.x; arr[i * 3 + 1] = v.y; arr[i * 3 + 2] = v.z; });
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }

  // ---------------------------------------------------------------- labels
  const labs = labels(el);
  labs.add('f1', { text: 'Fulcrum', side: 'l' });
  labs.add('f2', { text: 'Fulcrum', side: 'r' });
  labs.add('link', { text: 'Rigid link', side: 'r' });
  labs.add('da', { text: 'a', side: 'c', cls: 'a dimtag' });
  labs.add('du', { text: '75 mm', side: 'c', cls: 'dimtag' });
  labs.add('db', { text: 'b', side: 'u', cls: 'b dimtag' });
  labs.add('dl', { text: '375 mm', side: 'u', cls: 'dimtag' });
  const tagA = labs.add('A', { text: 'A', side: 'r', cls: 'mass a', interactive: true });
  const tagB = labs.add('B', { text: 'B', side: 'r', cls: 'mass b', interactive: true });
  for (const [t, k] of [[tagA, 'a'], [tagB, 'b']]) {
    const b = t.d.querySelector('b');
    b.setAttribute('role', 'slider');
    b.setAttribute('aria-label', k === 'a' ? 'Mass A position, drag along the upper lever' : 'Mass B position, drag along the lower lever');
  }
  const stat = status(el);

  // ---------------------------------------------------------------- state
  const S = { mA: 100, mB: 350, a: 200, b: 0, mode: 'auto', lead: 'a', a1: 0, target: 0, v: 0 };
  S.b = (K * S.a * S.mA) / S.mB;
  const show = { a: S.a, b: S.b }; // drawn positions (glide toward S.a, S.b)

  function solveFollower() {
    // auto-balance: the mass not being slid moves to m_A a = m_B b / 5
    if (S.mode !== 'auto') return { ok: true };
    if (S.lead === 'a') {
      const need = (K * S.a * S.mA) / S.mB;
      S.b = clamp(need, RULER[0], RULER[1]);
      return { ok: need >= RULER[0] - 1e-9 && need <= RULER[1] + 1e-9, need, who: 'B' };
    }
    const need = (S.b * S.mB) / (K * S.mA);
    S.a = clamp(need, RULER[0], RULER[1]);
    return { ok: need >= RULER[0] - 1e-9 && need <= RULER[1] + 1e-9, need, who: 'A' };
  }
  const moment = () => S.mA * S.a - (S.mB * S.b) / K; // g mm on the upper lever; > 0: A's side goes down
  let fit = { ok: true };

  function evaluate() {
    fit = solveFollower();
    const m = moment(), ref = S.mA * S.a;
    const level = Math.abs(m) <= BAND * ref;
    S.target = level ? 0 : -Math.sign(m) * STOP;
    // sliders follow silently
    sA.set(S.a, { silent: true }); sB.set(S.b, { silent: true });
    wake();
  }

  // ---------------------------------------------------------------- drawing
  const up = new T.Vector3(0, 1, 0);
  function draw() {
    rig.set(S.a1);
    const size = (m) => 0.011 * Math.cbrt(m / 100) * 2; // diameter, same density for every mass
    const place = (mass, pHang, m, len) => {
      const d = size(m), h = d * 0.85;
      mass.str.position.set(pHang.x, pHang.y - len / 2, pHang.z);
      mass.str.scale.set(0.0005, len, 0.0005);
      mass.body.position.set(pHang.x, pHang.y - len - h / 2, pHang.z);
      mass.body.scale.set(d / 2, h, d / 2);
      return mass.body.position;
    };
    const hA = rig.upperPoint(show.a, 0.010), hB = rig.lowerPoint(show.b, 0.010);
    const cA = place(massA, hA, S.mA, STRING.a), cB = place(massB, hB, S.mB, STRING.b);

    // dimension lines 16 mm above the top of each beam (ruler top), on the beam's plane
    const lift = 0.028;
    const f1 = rig.upperPoint(0, -lift), pa = rig.upperPoint(show.a, -lift);
    const pu = rig.pinU().add(new T.Vector3(0, lift, 0).applyAxisAngle(new T.Vector3(1, 0, 0), rig.a1));
    // the lower lever's lines run under its beam (mass A hangs in the gap above it)
    const drop = 0.038;
    const f2 = rig.lowerPoint(0, drop), pb = rig.lowerPoint(show.b, drop);
    const pl = rig.pinL().add(new T.Vector3(0, -drop, 0).applyAxisAngle(new T.Vector3(1, 0, 0), rig.a2));
    const n1 = up.clone().applyAxisAngle(new T.Vector3(1, 0, 0), rig.a1), n2 = up.clone().applyAxisAngle(new T.Vector3(1, 0, 0), rig.a2);
    setDim(dims.a, f1, pa, n1); setDim(dims.u, f1, pu, n1);
    const f2b = f2.clone().addScaledVector(n2, -0.024), pl2 = pl.clone().addScaledVector(n2, -0.024); // the 375 mm line sits under the b line
    setDim(dims.b, f2, pb, n2); setDim(dims.l, f2b, pl2, n2);

    // tags sit just right of their mass (camera right), so they never cover it
    const right = new T.Vector3().setFromMatrixColumn(stage.camera.matrixWorld, 0);
    labs.point('A', cA.clone().addScaledVector(right, massA.body.scale.x + 0.003));
    labs.point('B', cB.clone().addScaledVector(right, massB.body.scale.x + 0.003));
    labs.text('A', `A  ${Math.round(S.mA)} g`);
    labs.text('B', `B  ${Math.round(S.mB)} g`);
    labs.point('f1', new T.Vector3(X_UP, P1[0], P1[1]));
    labs.point('f2', new T.Vector3(X_LO, P2[0], P2[1]));
    const u = rig.pinU(), l = rig.pinL();
    labs.point('link', new T.Vector3(0.05, (u.y + l.y) / 2, (u.z + l.z) / 2 + 0.012));
    labs.point('da', pa.clone().lerp(f1, 0.5).addScaledVector(n1, 0.004));
    labs.text('da', `a = ${show.a.toFixed(1)} mm`);
    labs.point('du', pu.clone().lerp(f1, 0.5).addScaledVector(n1, 0.004));
    labs.point('db', pb.clone().lerp(f2, 0.5).addScaledVector(n2, -0.004));
    labs.text('db', `b = ${show.b.toFixed(1)} mm`);
    labs.point('dl', pl2.clone().lerp(f2b, 0.8).addScaledVector(n2, -0.004));
    const narrow = el.clientWidth < 520; // phones: keep the tags that matter, drop the rest
    labs.show('du', !narrow); labs.show('dl', !narrow); labs.show('link', !narrow);
    labs.update(stage.camera);

    // status and readouts
    const m = moment(), ref = S.mA * S.a, off = m / ref;
    if (S.mode === 'auto' && !fit.ok) {
      stat.set(`Out of range: ${fit.who} would need ${fit.need.toFixed(0)} mm. Move the other mass, or swap them.`, 'warn');
    } else if (Math.abs(off) <= BAND) {
      stat.set(`Level. m_A / m_B = b / (5a) = ${(S.b / (K * S.a)).toFixed(3)}`, 'ok');
    } else {
      stat.set(m > 0 ? 'A side is heavy: slide A in or B out' : 'B side is heavy: slide B in or A out', 'warn');
    }
    const level = Math.abs(off) <= BAND && (S.mode !== 'auto' || fit.ok);
    info.set({
      ma: `${Math.round(S.mA)} g at ${S.a.toFixed(1)} mm`,
      mb: `${Math.round(S.mB)} g at ${S.b.toFixed(1)} mm`,
      r: level ? (S.b / (K * S.a)).toFixed(3) : 'not level yet',
      t: level ? `${(((S.mA / 1000) * G * S.a) / ARM_UP).toFixed(2)} N` : 'not level yet',
      e: 100 * (1 / S.a + 1 / S.b),
    });
  }

  // ---------------------------------------------------------------- motion (only in response to input)
  let stop = null;
  function wake() {
    if (reduced) { show.a = S.a; show.b = S.b; S.a1 = S.target; S.v = 0; draw(); return; }
    if (!stop) stop = stage.onFrame(step);
    draw();
  }
  function step(dt) {
    // positions glide; the levers swing to their target like a damped balance
    const k = 1 - Math.exp(-dt * 12);
    show.a += (S.a - show.a) * k; show.b += (S.b - show.b) * k;
    const w = 9, z = 0.55; // natural frequency (rad/s) and damping ratio of the drawn swing
    S.v += (-(w * w) * (S.a1 - S.target) - 2 * z * w * S.v) * dt;
    S.a1 += S.v * dt;
    if (S.a1 > STOP) { S.a1 = STOP; S.v = Math.min(0, S.v) * -0.25; }
    if (S.a1 < -STOP) { S.a1 = -STOP; S.v = Math.max(0, S.v) * -0.25; }
    const done = Math.abs(show.a - S.a) < 0.02 && Math.abs(show.b - S.b) < 0.02 && Math.abs(S.a1 - S.target) < 0.0005 && Math.abs(S.v) < 0.002;
    if (done) { show.a = S.a; show.b = S.b; S.a1 = S.target; S.v = 0; stop?.(); stop = null; }
    draw();
  }

  // ---------------------------------------------------------------- controls
  const panel = ctx.panel;
  const mode = segmented(panel, { label: 'Mode', options: [{ value: 'auto', label: 'Auto-balance' }, { value: 'free', label: 'Find it yourself' }], value: 'auto',
    onChange(v) { S.mode = v; if (v === 'auto') { S.lead = 'a'; } evaluate(); } });
  const fmtMm = (v) => v.toFixed(1);
  const mA = slider(panel, { label: 'Mass A', min: M_MIN, max: M_MAX, step: 1, value: S.mA, unit: ' g', format: (v) => v.toFixed(0), onInput(v) { S.mA = v; evaluate(); } });
  const mB = slider(panel, { label: 'Mass B', min: M_MIN, max: M_MAX, step: 1, value: S.mB, unit: ' g', format: (v) => v.toFixed(0), onInput(v) { S.mB = v; evaluate(); } });
  const sA = slider(panel, { label: 'A from fulcrum', min: RULER[0], max: RULER[1], step: 0.1, value: S.a, unit: ' mm', format: fmtMm, onInput(v) { S.a = v; S.lead = 'a'; evaluate(); } });
  const sB = slider(panel, { label: 'B from fulcrum', min: RULER[0], max: RULER[1], step: 0.1, value: S.b, unit: ' mm', format: fmtMm, onInput(v) { S.b = v; S.lead = 'b'; evaluate(); } });
  button(panel, { label: 'Swap masses', onClick() { const t = S.mA; S.mA = S.mB; S.mB = t; mA.set(S.mA, { silent: true }); mB.set(S.mB, { silent: true }); evaluate(); } });
  const info = readout(panel, { rows: [
    { key: 'ma', label: 'Mass A (upper)' },
    { key: 'mb', label: 'Mass B (lower)' },
    { key: 'r', label: 'm_A / m_B = b / 5a' },
    { key: 't', label: 'Link force' },
    { key: 'e', label: 'Error if each ruler is off 1 mm', unit: '%', format: (v) => `±${v.toFixed(1)}` },
  ] });

  // ---------------------------------------------------------------- drag a mass tag along its beam
  const v1 = new T.Vector3(), v2 = new T.Vector3();
  function screenOf(p) { p.project(stage.camera); return [((p.x + 1) / 2) * el.clientWidth, ((1 - p.y) / 2) * el.clientHeight]; }
  function beamParam(k, cx, cy) {
    // distance along the beam (mm from the fulcrum) under the pointer, from the ruler's two ends on screen
    const p = k === 'a' ? rig.upperPoint(RULER[0]) : rig.lowerPoint(RULER[0]);
    const q = k === 'a' ? rig.upperPoint(RULER[1]) : rig.lowerPoint(RULER[1]);
    const [px, py] = screenOf(v1.copy(p)), [qx, qy] = screenOf(v2.copy(q));
    const dx = qx - px, dy = qy - py, len2 = dx * dx + dy * dy || 1;
    const t = ((cx - px) * dx + (cy - py) * dy) / len2;
    return RULER[0] + (RULER[1] - RULER[0]) * clamp(t, 0, 1);
  }
  const drags = [];
  for (const [tag, k] of [[tagA, 'a'], [tagB, 'b']]) {
    const b = tag.d.querySelector('b');
    let on = false, grab = 0;
    const down = (e) => {
      e.preventDefault(); e.stopPropagation();
      on = true; tag.d.classList.add('drag');
      const r = el.getBoundingClientRect();
      grab = beamParam(k, e.clientX - r.left, e.clientY - r.top) - (k === 'a' ? S.a : S.b);
      b.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!on) return;
      const r = el.getBoundingClientRect();
      const d = clamp(beamParam(k, e.clientX - r.left, e.clientY - r.top) - grab, RULER[0], RULER[1]);
      if (k === 'a') { S.a = d; S.lead = 'a'; } else { S.b = d; S.lead = 'b'; }
      show[k] = d; // the dragged mass follows the pointer directly
      evaluate();
    };
    const up2 = () => { on = false; tag.d.classList.remove('drag'); };
    b.addEventListener('pointerdown', down);
    b.addEventListener('pointermove', move);
    b.addEventListener('pointerup', up2);
    b.addEventListener('pointercancel', up2);
    // keyboard: arrows slide the mass 1 mm (shift: 10 mm)
    b.tabIndex = 0;
    b.addEventListener('keydown', (e) => {
      const dir = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1 }[e.key];
      if (!dir) return;
      e.preventDefault();
      const d = (e.shiftKey ? 10 : 1) * dir;
      if (k === 'a') { S.a = clamp(S.a + d, RULER[0], RULER[1]); S.lead = 'a'; } else { S.b = clamp(S.b + d, RULER[0], RULER[1]); S.lead = 'b'; }
      evaluate();
    });
    drags.push(() => { b.removeEventListener('pointerdown', down); b.removeEventListener('pointermove', move); });
  }

  // ---------------------------------------------------------------- camera
  const place = () => {
    const narrow = el.clientWidth < el.clientHeight * 1.1;
    // the masses hang inside the model's box; a tall canvas gets a flatter side view so the device fills it
    stage.frame(rig.model, narrow ? { azimuth: -84, elevation: 9, pad: 0.97 } : { azimuth: -72, elevation: 14, pad: 1.08 });
    labs.update(stage.camera);
  };
  place();
  stage.controls?.addEventListener('change', () => labs.update(stage.camera));
  const ro = new ResizeObserver(() => labs.update(stage.camera));
  ro.observe(el);
  evaluate();
  // start exactly balanced and level, nothing moving
  show.a = S.a; show.b = S.b; S.a1 = S.target; S.v = 0; stop?.(); stop = null;
  draw();
  labs.update(stage.camera);

  return {
    dispose() {
      stop?.(); ro.disconnect(); drags.forEach((f) => f());
      labs.dispose(); stat.dispose();
      for (const d of Object.values(dims)) { d.geometry.dispose(); d.material.dispose(); }
      cyl.dispose(); thin.dispose(); massMat.a.dispose(); massMat.b.dispose(); strMat.dispose();
      stage.dispose();
    },
  };
}
