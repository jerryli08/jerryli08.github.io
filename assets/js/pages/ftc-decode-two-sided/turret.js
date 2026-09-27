// The turret: the shooter turns on a 158-tooth internal ring gear (module 1.5) with four
// Melonbotics Super Servos standing inside it. The turret group (servos, hood, flywheel motors,
// number plates, 72 mm wheel and the top bearing plate) turns about the ring gear's centre; the
// ring gear and the plate under it stay with the robot.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout } from '/assets/js/lib/ui.js';
import { loadRobot, rigRobot, mm, AX, DEG } from './rig.js';
import { createLabels } from './labels.js';

const RING_T = 158;

export async function mount(el, ctx) {
  const stage = createStage(el, { fov: 30 });
  const { P } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: false, turret: true });
  const tp = rig.piv.turret;
  const unlight = stage.highlight(P.ring, '#ff6b35', { intensity: 0.5 });
  const view = { azimuth: -145, elevation: 38, pad: 1.05 };
  stage.frame([P.turret, P.ring, P.top], view);

  // the four servos' centres in the CAD, turned with the turret for their labels
  const servos = [[125.2, -348.4], [334.3, -341.5], [124.5, -259.6], [333.7, -252.7]];
  const labels = createLabels(el);
  const turn = ([x, z], y) => () => {
    const a = tp.angle, c = Math.cos(a), s = Math.sin(a), dx = x - AX.TURRET[0], dz = z - AX.TURRET[1];
    // rotation about +y: x' = c dx + s dz, z' = -s dx + c dz
    return mm(AX.TURRET[0] + c * dx + s * dz, y, AX.TURRET[1] - s * dx + c * dz);
  };
  labels.set([
    // the ring's edge nearest the default camera, and the servo tops
    { key: 'ring', text: 'Ring gear, 158 teeth', p: mm(AX.TURRET[0] - 73, 310, AX.TURRET[1] - 105), side: 'r', color: '#ff6b35' },
    ...servos.map((c, i) => ({ key: `s${i}`, text: i === 1 ? 'Four Super Servos' : '', p: turn(c, 378), side: 'r', color: '#27c7ff' })),
  ]);
  const relabel = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', relabel);
  const ro = new ResizeObserver(() => requestAnimationFrame(relabel));
  ro.observe(el);

  const R = readout(ctx.panel, { rows: [
    { key: 'a', label: 'Turret', unit: '°', format: (v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}` },
    { key: 't', label: 'Ring teeth passed', format: (v) => v.toFixed(1) },
  ] });
  const set = (deg) => { tp.setAngle(deg * DEG); R.set({ a: deg, t: (Math.abs(deg) / 360) * RING_T }); relabel(); };
  const sl = slider(ctx.panel, { label: 'Turret angle', min: -180, max: 180, step: 1, value: 0, unit: '°',
    onInput: (v) => { if (tog.playing) tog.set(false); set(v); } });
  let stop = null, t = 0;
  const tog = playToggle(ctx.panel, { playing: false, labels: ['Sweep', 'Pause'], onChange: (on) => {
    if (on && !stop) {
      t = Math.asin(Math.max(-1, Math.min(1, sl.value / 120)));
      stop = stage.onFrame((dt) => { t += dt * 0.45; const v = Math.round(120 * Math.sin(t)); sl.set(v, { silent: true }); set(v); });
    } else if (!on && stop) { stop(); stop = null; }
  } });
  set(0);
  requestAnimationFrame(relabel);
  return {
    dispose() { stop?.(); ro.disconnect(); labels.dispose(); unlight(); stage.controls?.removeEventListener('change', relabel); stage.dispose(); },
  };
}
