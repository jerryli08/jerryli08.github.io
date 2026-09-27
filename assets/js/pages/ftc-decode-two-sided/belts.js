// The roller belt path: five GT2 belt stages from carrier 2 up the passive side of the moving 4-bar
// to the top of the coupler, drawn in magenta. The belts and pulleys are the CAD's; the running
// dots are an annotation on each belt's pitch line. The 4-bar slider shows that no belt changes
// length as the linkage moves, and the stage buttons pick out one stage at a time.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, segmented } from '/assets/js/lib/ui.js';
import * as THREE from 'three';
import { loadRobot, rigRobot, fade, beltDots, mm, AX, DEG, sToTheta, F_RATIO } from './rig.js';
import { createLabels } from './labels.js';

const MAG = '#ff2bd6';
const STAGES = [
  { key: 'belt1', from: 'Carrier 2, 48T', to: 'B, 12T', ratio: '4 : 1 up', where: 'both on the frame' },
  { key: 'belt2', from: 'B, 12T', to: 'Idler, 12T', ratio: '1 : 1', where: 'rides on the passive link' },
  { key: 'belt3', from: 'Idler, 12T', to: 'D, 12T', ratio: '1 : 1', where: 'rides on the passive link' },
  { key: 'belt4', from: 'D, 12T', to: 'E, 12T', ratio: '1 : 1', where: 'rides on the coupler' },
  { key: 'belt5', from: 'E, 12T', to: 'F, 38T', ratio: '12 : 38', where: 'rides on the coupler' },
];
const PUL = { belt1: ['car2', 'Bpul'], belt2: ['Bpul', 'idler'], belt3: ['idler', 'Dpul'], belt4: ['Dpul', 'Epul'], belt5: ['Epul', 'Fpul'] };

export async function mount(el, ctx) {
  const stage = createStage(el, { fov: 28, shadow: false });
  const { model, P, body } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: true });
  const { piv } = rig;
  fade([P.shell, P.sidewheels, P.walls, P.plates, P.ramps, P.bottom, P.top, P.turret, P.ring, P.wheel0, P.wheel1, P.wheel2, P.wheel3], 0);
  fade([P.armL, P.armR], 0.2);
  fade([P.cplr, P.linkA, P.linkP], 0.45);
  // the frame and gearbox behind the belts, see-through
  fade([...body, P.car1, P.p1f, P.p1b, P.p2f, P.p2b, P.chA, P.chB, P.idl1, P.idl2, P.pin1, P.pin2, P.wormsh, P.spd1, P.spd2, P.beltP, P.beltS, P.Gpul], 0.16);
  stage.fitGround();

  const dots = {
    belt1: beltDots('belt1', model, MAG), belt2: beltDots('belt2', piv.linkP, MAG), belt3: beltDots('belt3', piv.linkP, MAG),
    belt4: beltDots('belt4', piv.cplr, MAG), belt5: beltDots('belt5', piv.cplr, MAG),
  };
  let lit = null;
  function light(sel) {
    lit?.();
    const all = STAGES.map((s) => s.key);
    const on = sel === 'all' ? all : [sel];
    const parts = [];
    for (const k of on) { parts.push(P[k]); for (const p of PUL[k]) parts.push(P[p]); }
    lit = stage.highlight(parts, MAG, { intensity: 0.7 });
    for (const k of all) dots[k].mesh.visible = sel === 'all' || k === sel;
  }

  // from behind the robot, nearly square on to the belts (they all run in planes across the robot)
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.16));
  box.position.set(0.255, 0.125, -0.33);
  box.updateMatrixWorld();
  const view = { azimuth: 162, elevation: 12, pad: 1.0 };
  stage.frame(box, view);

  const labels = createLabels(el);
  const onCoupler = (x, y, z) => () => {
    const k = rig.kin, c = Math.cos(k.phi), s = Math.sin(k.phi), dx = x - AX.C0[0], dy = y - AX.C0[1];
    return mm(k.C[0] + c * dx - s * dy, k.C[1] + s * dx + c * dy, z);
  };
  const onLinkP = (x, y, z) => () => {
    const a = rig.kin.psi, c = Math.cos(a), s = Math.sin(a), dx = x - AX.B[0], dy = y - AX.B[1];
    return mm(AX.B[0] + c * dx - s * dy, AX.B[1] + s * dx + c * dy, z);
  };
  labels.set([
    { key: 'c2', text: 'Carrier 2', p: mm(AX.P2[0] + 18, AX.P2[1], -262), side: 'r', color: MAG },
    { key: 'B', text: 'B', p: mm(AX.B[0] + 8, AX.B[1], -289), side: 'r', color: MAG },
    { key: 'idl', text: 'Idler', p: onLinkP(AX.IDL[0] - 6, AX.IDL[1], -291), side: 'l', color: MAG },
    { key: 'D', text: 'D', p: onCoupler(AX.D0[0] + 6, AX.D0[1], -287), side: 'r', color: MAG },
    { key: 'E', text: 'E', p: onCoupler(AX.E[0] + 8, AX.E[1] + 4, -294), side: 'r', color: MAG },
    { key: 'F', text: 'F, roller drive', p: onCoupler(AX.F[0], AX.F[1] + 14, -407), side: 'l', color: MAG },
  ]);
  const relabel = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', relabel);
  const ro = new ResizeObserver(() => requestAnimationFrame(relabel));
  ro.observe(el);

  const R = readout(ctx.panel, { rows: [
    { key: 'st', label: 'Stage', value: 'All five' },
    { key: 'pul', label: 'Pulleys', value: '48T to 12T, then 12T to the top' },
    { key: 'ratio', label: 'Ratio', value: '' },
    { key: 'f', label: 'F per turn of carrier 2', value: `${F_RATIO.toFixed(3)} turns` },
  ] });

  // state: carrier 2 angle (the rollers' drive), 4-bar position
  const st = { car2: 0, s: 0 };
  function pose() {
    const k = rig.setFourbar(sToTheta(st.s));
    rig.setRollerPath(st.car2);
    piv.car2.setAngle(st.car2);
    const b = 4 * st.car2;
    dots.belt1.set(st.car2 * dots.belt1.r1);
    dots.belt2.set((b - k.psi) * dots.belt2.r1);
    dots.belt3.set((b - k.psi) * dots.belt3.r1);
    dots.belt4.set((b - k.phi) * dots.belt4.r1);
    dots.belt5.set((b - k.phi) * dots.belt5.r1);
    relabel();
  }
  let sel = 'all';
  function info() {
    if (sel === 'all') R.set({ st: 'All five', pul: '48T to 12T, then 12T through both joints, 12T to 38T', ratio: '4 x 12/38' });
    else { const s = STAGES.find((x) => x.key === sel); R.set({ st: `${STAGES.indexOf(s) + 1}: ${s.where}`, pul: `${s.from} to ${s.to}`, ratio: s.ratio }); }
  }
  segmented(ctx.panel, { label: 'Stage', value: 'all',
    options: [{ value: 'all', label: 'All' }, ...STAGES.map((s, i) => ({ value: s.key, label: String(i + 1) }))],
    onChange: (v) => { sel = v; light(v); info(); } });
  slider(ctx.panel, { label: '4-bar', min: -1, max: 1, step: 0.01, value: 0,
    format: (v) => (Math.abs(v) < 0.02 ? 'transfer' : v > 0 ? `right ${Math.round(v * 100)}%` : `left ${Math.round(-v * 100)}%`),
    onInput: (v) => { st.s = v; pose(); } });
  let stop = null;
  playToggle(ctx.panel, { playing: false, labels: ['Run the rollers', 'Stop'], onChange: (on) => {
    if (on && !stop) stop = stage.onFrame((dt) => { st.car2 += dt * 0.9; pose(); });
    else if (!on && stop) { stop(); stop = null; }
  } });

  light('all'); info(); pose();
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
