// The differential PTO: the reader drives the two intake motors and sees which output moves.
// Every gear, carrier, spider, pulley and link turns about its real axis in the CAD, at speeds from
// the tooth counts (rig.js train()). Speeds are slowed 50 times on screen; the readout gives the
// real no-load numbers for goBILDA 5000 motors at 5,800 RPM.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, button, segmented } from '/assets/js/lib/ui.js';
import * as THREE from 'three';
import { loadRobot, rigRobot, train, fade, beltDots, mm, AX, DEG, THETA0, THETA_LEFT, THETA_RIGHT, MOTOR_RPM, F_RATIO, SPIDER_Z, WORM, solve } from './rig.js';
import { createLabels } from './labels.js';

const SLOW = 50;
const C1 = '#ff6b35', C2 = '#27c7ff';
const fmt = (v) => Math.round(v).toLocaleString('en-US');

export async function mount(el, ctx) {
  const stage = createStage(el, { fov: 30, shadow: false });
  const { model, P } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: true });
  const { piv } = rig;
  // only the intake: everything around it is hidden
  fade([P.shell, P.sidewheels, P.walls, P.plates, P.ramps, P.bottom, P.top, P.turret, P.ring, P.armL, P.armR, P.wheel0, P.wheel1, P.wheel2, P.wheel3], 0);
  stage.fitGround();
  // seen from the front with the front drive pod cut away: keep z <= -118 mm
  stage.sectionPlane([0, 0, -1], -0.118);
  stage.setCapColor('#8f867c', '#766e65');

  // the moving belts carry dots (annotation) so the roller path reads as running
  const dots = {
    belt1: beltDots('belt1', model, C2), belt2: beltDots('belt2', piv.linkP, C2), belt3: beltDots('belt3', piv.linkP, C2),
    belt4: beltDots('belt4', piv.cplr, C2), belt5: beltDots('belt5', piv.cplr, C2), beltP: beltDots('beltP', model, '#ffd166'),
  };

  // camera: three-quarter from above the front, on the gearbox and the 4-bar
  const mkBox = (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz)); m.position.set(x, y, z); m.updateMatrixWorld(); return m; };
  const boxes = { whole: mkBox(0.2, 0.25, 0.17, 0.235, 0.125, -0.205), cut: mkBox(0.11, 0.04, 0.115, 0.258, 0.03, -0.206) };
  const views = {
    whole: { azimuth: 22, elevation: 16, pad: 1.0 },
    cut: { azimuth: 0, elevation: 80, pad: 0.92 },
  };
  stage.frame(boxes.whole, views.whole);

  const labels = createLabels(el);
  const at = (x, y, z) => mm(x, y, z);
  const moving = (x, y, z) => () => { // a point on the coupler, placed like the coupler
    const k = rig.kin, c = Math.cos(k.phi), s = Math.sin(k.phi);
    const dx = x - AX.C0[0], dy = y - AX.C0[1];
    return mm(k.C[0] + c * dx - s * dy, k.C[1] + s * dx + c * dy, z);
  };
  function onCarrier1(x, z) { // a point on carrier 1 (at the axis height), turned with it
    const a = train(st.a1, st.a2).car1, c = Math.cos(a), sn = Math.sin(a), dx = x - AX.P1[0];
    return mm(AX.P1[0] + c * dx, AX.P1[1] + sn * dx, z);
  }
  labels.set([
    { key: 'm1', text: 'Motor 1', p: at(255.2, 97, -176), side: 'r' },
    { key: 'm2', text: 'Motor 2', p: at(213.9, 104, -236), side: 'l' },
    { key: 'd1', text: 'Differential 1', p: at(231.1, 20, -170), side: 'l', color: C1 },
    { key: 'd2', text: 'Differential 2', p: at(285.1, 20, -172), side: 'r', color: C2 },
    { key: 'worm', text: 'Worm', p: at(183.6, 36, -151.4), side: 'l', color: C1 },
    { key: 'bar', text: '4-bar', p: () => { const k = rig.kin; return mm((AX.A[0] + k.C[0]) / 2, (AX.A[1] + k.C[1]) / 2, -138); }, side: 'l', color: C1 },
    { key: 'roll', text: 'Roller drive', p: moving(AX.F[0] + 12, AX.F[1], -407), side: 'r', color: C2 },
    // shown only with the differentials cut open: parts of differential 1, and carrier 2's pulleys
    { key: 'side', text: '14T side gears', p: at(AX.P1[0] - 9, 36, -227.4), side: 'l' },
    { key: 'spider', text: '28T spider', p: () => onCarrier1(242.0 + 3, -203.5), side: 'r' },
    { key: 'carrier', text: 'Carrier', p: () => onCarrier1(212.5, -196), side: 'l', color: C1 },
    { key: 'bevel', text: '28T bevel, to the worm', p: at(AX.P1[0] - 16, 36, -161.7), side: 'l', color: C1 },
    { key: 'pul', text: '48T and 52T pulleys', p: at(AX.P2[0] + 17, 36, -258), side: 'r', color: C2 },
  ]);
  const CUTKEYS = ['side', 'spider', 'carrier', 'bevel', 'pul'], WHOLEKEYS = ['m1', 'm2', 'bar', 'roll', 'd1', 'd2'];
  for (const k of CUTKEYS) labels.show(k, false);
  const relabel = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', relabel);
  const ro = new ResizeObserver(() => requestAnimationFrame(relabel));
  ro.observe(el);

  // path colours: carrier 1 drives the 4-bar, carrier 2 the rollers
  const path1 = [P.car1, P.wormsh, P.linkA];
  const path2 = [P.car2, P.Bpul, P.idler, P.Dpul, P.Epul, P.Fpul, P.belt1, P.belt2, P.belt3, P.belt4, P.belt5];
  let lit = [null, null];
  function paint(on1, on2) {
    const key = `${on1}|${on2}`;
    if (paint.key === key) return; paint.key = key;
    lit.forEach((f) => f?.());
    lit = [stage.highlight(path1, C1, { intensity: on1 ? 0.6 : 0.16 }), stage.highlight(path2, C2, { intensity: on2 ? 0.6 : 0.16 })];
    for (const d of Object.values(dots)) d.mesh.visible = true;
  }
  paint(false, false);

  // state
  const st = { s1: 0, s2: 0, a1: 0, a2: 0, playing: false, limit: '' };
  let rates = { w1: 0, w2: 0 };
  function pose() {
    const t = train(st.a1, st.a2);
    for (const k of ['pin1', 'pin2', 'idl1', 'idl2', 'chA', 'chB', 'p1f', 'p1b', 'p2f', 'p2b', 'car1', 'car2', 'wormsh']) piv[k].setAngle(t[k]);
    piv.spd1.setAngle(t.spd1); piv.spd2.setAngle(t.spd2);
    rig.setFourbar(THETA0 + t.fourbar);
    rig.setRollerPath(t.car2);
    // belt dots: distance along each belt, in the frame of the link that carries it
    const k = rig.kin, b = 4 * t.car2;
    dots.belt1.set(t.car2 * dots.belt1.r1);
    dots.belt2.set((b - k.psi) * dots.belt2.r1);
    dots.belt3.set((b - k.psi) * dots.belt3.r1);
    dots.belt4.set((b - k.phi) * dots.belt4.r1);
    dots.belt5.set((b - k.phi) * dots.belt5.r1);
    dots.beltP.set(t.p1b * dots.beltP.r1);
    relabel();
  }

  // effective motor speeds (rad/s of real motor), with the 4-bar's end stops
  function effective() {
    let w1 = st.s1 * MOTOR_RPM, w2 = st.s2 * MOTOR_RPM; // rpm
    const th = THETA0 + train(st.a1, st.a2).fourbar;
    const dth = (9 / 48) * (w2 - w1) / 14; // 4-bar rpm, sign: + toward the left side
    st.limit = '';
    if ((th >= THETA_LEFT - 1e-4 && dth > 0) || (th <= THETA_RIGHT + 1e-4 && dth < 0)) {
      const m = (w1 + w2) / 2; w1 = m; w2 = m; st.limit = th >= THETA_LEFT - 1e-4 ? 'left' : 'right';
    }
    return { w1, w2 };
  }
  const R = readout(ctx.panel, { rows: [
    { key: 'm1', label: 'Motor 1', unit: 'RPM', format: fmt, value: 0 },
    { key: 'm2', label: 'Motor 2', unit: 'RPM', format: fmt, value: 0 },
    { key: 'c1', label: 'Carrier 1, 4-bar', unit: 'RPM', format: fmt, value: 0 },
    { key: 'c2', label: 'Carrier 2, rollers', unit: 'RPM', format: fmt, value: 0 },
    { key: 'bar', label: '4-bar', value: '' },
    { key: 'f', label: 'Roller drive at F', unit: 'RPM', format: fmt, value: 0 },
  ] });
  function show() {
    rates = effective();
    const c1 = (9 / 48) * (rates.w2 - rates.w1), c2 = (9 / 48) * (rates.w1 + rates.w2);
    const th = THETA0 + train(st.a1, st.a2).fourbar;
    const s = th <= THETA0 ? (THETA0 - th) / (THETA0 - THETA_RIGHT) : -(th - THETA0) / (THETA_LEFT - THETA0);
    const where = Math.abs(s) < 0.03 ? 'transfer' : s > 0 ? `${Math.round(s * 100)}% right` : `${Math.round(-s * 100)}% left`;
    const barRate = (c1 / 14) * 6; // deg/s
    R.set({ m1: rates.w1, m2: rates.w2, c1, c2, f: c2 * F_RATIO,
      bar: st.limit ? `end of travel, ${st.limit}` : `${where}${Math.abs(barRate) > 0.5 ? `, ${fmt(Math.abs(barRate))}°/s` : ''}` });
    paint(Math.abs(c1) > 1 && !!st.playing, Math.abs(c2) > 1 && !!st.playing);
  }

  let stop = null;
  function play(on) {
    st.playing = on;
    if (on && !stop) {
      stop = stage.onFrame((dt) => {
        const { w1, w2 } = effective();
        const k = (2 * Math.PI) / 60 / SLOW;
        st.a1 += w1 * k * dt; st.a2 += w2 * k * dt;
        // never step past an end stop
        const th = THETA0 + train(st.a1, st.a2).fourbar;
        if (th > THETA_LEFT || th < THETA_RIGHT) {
          const lim = th > THETA_LEFT ? THETA_LEFT : THETA_RIGHT;
          const d = ((lim - THETA0) * 14 * 48) / 9; // a2 - a1 that puts the 4-bar exactly on the stop
          const m = (st.a1 + st.a2) / 2; st.a1 = m - d / 2; st.a2 = m + d / 2;
        }
        pose(); show();
      });
    } else if (!on && stop) { stop(); stop = null; }
    tog.set(on, { silent: true });
    show();
  }

  const s1 = slider(ctx.panel, { label: 'Motor 1', min: -100, max: 100, step: 1, value: 0, unit: '%', format: (v) => (v > 0 ? `+${v}` : `${v}`),
    onInput: (v) => { st.s1 = v / 100; if (!st.playing && v) play(true); show(); } });
  const s2 = slider(ctx.panel, { label: 'Motor 2', min: -100, max: 100, step: 1, value: 0, unit: '%', format: (v) => (v > 0 ? `+${v}` : `${v}`),
    onInput: (v) => { st.s2 = v / 100; if (!st.playing && v) play(true); show(); } });
  const preset = (a, b) => () => { s1.set(a, { silent: true }); s2.set(b, { silent: true }); st.s1 = a / 100; st.s2 = b / 100; play(a !== 0 || b !== 0); };
  button(ctx.panel, { label: 'Same way', onClick: preset(60, 60) });
  button(ctx.panel, { label: 'Opposite ways', onClick: () => {
    // swing toward whichever side has more room left (motor 2 ahead of motor 1 swings it left)
    const th = THETA0 + train(st.a1, st.a2).fourbar;
    return th > (THETA_LEFT + THETA_RIGHT) / 2 ? preset(60, -60)() : preset(-60, 60)();
  } });
  button(ctx.panel, { label: 'Stop', onClick: preset(0, 0) });
  const tog = playToggle(ctx.panel, { playing: false, onChange: (on) => play(on) });
  let cut = null;
  segmented(ctx.panel, { label: 'View', options: [{ value: 'whole', label: 'Whole intake' }, { value: 'cut', label: 'Cut open the differentials' }], value: 'whole',
    onChange: (v) => {
      if (v === 'cut') {
        if (!cut) cut = stage.sectionPlane([0, -1, 0], 0.0365); else cut.enable(true);
        for (const k of WHOLEKEYS) labels.show(k, false);
        for (const k of CUTKEYS) labels.show(k, true);
      } else {
        cut?.enable(false);
        for (const k of WHOLEKEYS) labels.show(k, true);
        for (const k of CUTKEYS) labels.show(k, false);
      }
      stage.frame(boxes[v], { ...views[v], duration: 0.8 });
      const stopL = stage.onFrame(relabel); setTimeout(stopL, 1400);
    } });

  pose(); show();
  requestAnimationFrame(relabel);
  return {
    dispose() {
      stop?.(); ro.disconnect(); labels.dispose();
      stage.controls?.removeEventListener('change', relabel);
      for (const d of Object.values(dots)) d.dispose();
      stage.dispose();
    },
  };
}
