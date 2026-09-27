// One 4-bar, two sides: the linkage from Jerry's CAD, cut just behind its front links and seen
// straight down the robot's length. The slider sets the driven link's angle; the passive link and
// the coupler follow from the pin positions in the CAD (rig.js solve()). The range stops 4 degrees
// short of where the wheels on the arms would reach the 48 mm wheels at the robot's sides.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout } from '/assets/js/lib/ui.js';
import * as THREE from 'three';
import { loadRobot, rigRobot, fade, mm, AX, DEG, sToTheta } from './rig.js';
import { createLabels } from './labels.js';

const BALL_R = 63.5; // 5 in DECODE ball, mm

export async function mount(el, ctx) {
  const stage = createStage(el, { fov: 14, shadow: false });
  const { model, P } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: false });
  fade([P.shell, P.plates, P.turret, P.ring, P.top], 0);
  fade([P.walls], 0.3);
  stage.highlight([P.linkA, P.linkP], '#ff6b35', { intensity: 0.35 });

  // game pieces for scale (not robot CAD): three balls along each side, on the floor outside the frame
  const balls = new THREE.Group();
  balls.name = 'game pieces';
  const geo = new THREE.SphereGeometry(BALL_R / 1000, 40, 24);
  const mats = [new THREE.MeshStandardMaterial({ color: '#7d4bd8', roughness: 0.55 }), new THREE.MeshStandardMaterial({ color: '#3fb96a', roughness: 0.55 })];
  [-150, -277, -404].forEach((z, i) => { // behind the section, at the depth of the linkage
    for (const x of [-BALL_R - 12, 457.2 + BALL_R + 12]) {
      const b = new THREE.Mesh(geo, mats[(i + (x > 0 ? 1 : 0)) % 2]);
      b.position.set(...mm(x, BALL_R, z)); b.castShadow = true;
      balls.add(b);
    }
  });
  stage.scene.add(balls); // outside stage.root, so the section below does not cut them

  // section just behind the front links: everything in front of z = -120 mm is cut away
  const cutZ = -0.120;
  stage.sectionPlane([0, 0, -1], cutZ);
  stage.setCapColor('#3a3631', '#2c2925');

  // on a narrow (phone) canvas, frame the linkage and let the balls run off the sides
  const narrow = el.clientWidth < el.clientHeight * 1.3;
  const box = new THREE.Mesh(new THREE.BoxGeometry(narrow ? 0.5 : 0.74, 0.32, 0.05));
  box.position.set(0.2286, 0.16, -0.13);
  box.updateMatrixWorld();
  const view = { azimuth: 0, elevation: 4, pad: 1.04 };
  stage.frame(box, view);

  const labels = createLabels(el);
  const pin = (n) => () => {
    const k = rig.kin;
    const p = { A: AX.A, B: AX.B, C: k.C, D: k.D }[n];
    return mm(p[0], p[1], -118);
  };
  labels.set([
    { key: 'A', text: 'A', p: pin('A'), side: 'l' },
    { key: 'B', text: 'B', p: pin('B'), side: 'r' },
    { key: 'C', text: 'C', p: pin('C'), side: 'l' },
    { key: 'D', text: 'D', p: pin('D'), side: 'r' },
    { key: 'balls', text: 'Game pieces, for scale', p: mm(457.2 + BALL_R + 12, 2 * BALL_R + 8, -150), side: 'l', color: '#3fb96a' },
  ]);
  const relabel = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', relabel);
  const ro = new ResizeObserver(() => requestAnimationFrame(relabel));
  ro.observe(el);

  const R = readout(ctx.panel, { rows: [
    { key: 'th', label: 'Driven link', unit: '°', format: (v) => v.toFixed(1) },
    { key: 'dx', label: 'Coupler sideways', unit: 'mm', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}` },
    { key: 'dy', label: 'Coupler height', unit: 'mm', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}` },
    { key: 'tilt', label: 'Coupler tilt', unit: '°', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}` },
  ] });
  const mid0 = [(AX.C0[0] + AX.D0[0]) / 2, (AX.C0[1] + AX.D0[1]) / 2];
  function setS(s) {
    const k = rig.setFourbar(sToTheta(s));
    const mid = [(k.C[0] + k.D[0]) / 2, (k.C[1] + k.D[1]) / 2];
    R.set({ th: rig.theta / DEG, dx: mid[0] - mid0[0], dy: mid[1] - mid0[1], tilt: k.phi / DEG });
    relabel();
  }
  const sl = slider(ctx.panel, { label: 'Left side, transfer, right side', min: -1, max: 1, step: 0.01, value: 0,
    format: (v) => (Math.abs(v) < 0.02 ? 'transfer' : v > 0 ? `right ${Math.round(v * 100)}%` : `left ${Math.round(-v * 100)}%`),
    onInput: (v) => { if (tog.playing) tog.set(false); setS(v); } });

  // play: left side, back to transfer, right side, back to transfer (8 s)
  let stop = null, t = 0;
  const cycle = (u) => { const x = (u % 1) * 4; return x < 1 ? -x : x < 2 ? -(2 - x) : x < 3 ? x - 2 : 4 - x; };
  const ease = (s) => Math.sign(s) * (0.5 - 0.5 * Math.cos(Math.abs(s) * Math.PI));
  const tog = playToggle(ctx.panel, { playing: false, onChange: (on) => {
    if (on && !stop) {
      stop = stage.onFrame((dt) => { t += dt / 8; const s = ease(cycle(t)); sl.set(s, { silent: true }); setS(s); });
    } else if (!on && stop) { stop(); stop = null; }
  } });
  setS(0);
  requestAnimationFrame(relabel);
  return {
    dispose() {
      stop?.(); ro.disconnect(); labels.dispose();
      stage.controls?.removeEventListener('change', relabel);
      balls.removeFromParent(); geo.dispose(); mats.forEach((m) => m.dispose());
      stage.dispose();
    },
  };
}
