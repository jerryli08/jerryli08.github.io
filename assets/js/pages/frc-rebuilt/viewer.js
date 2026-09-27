// Interactive CAD of the final FRC REBUILT robot: orbit it, light up one mechanism at a time,
// cut a section through any of the three lanes, see the polycarbonate clear or solid, stow and
// deploy the intake, and run the roller, the transfer and the flywheels about their real axes
// (rig.js). Only one CAD version exists (the final robot, unchanged since the Feb 18 model); the
// earlier versions survive only as screenshots on the page.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented, playToggle } from '/assets/js/lib/ui.js';
import { loadRobot, G, LANES, STOW } from './rig.js';

const PRESETS = {
  all: { label: 'Whole robot', parts: null, az: 42, el: 20 },
  drive: { label: 'Drive', parts: ['swerve', 'bumpers'], az: 42, el: 9, frame: 'all' },
  intake: { label: 'Intake', parts: ['roller', 'rollerBelt', 'motorBelt', 'motorPulley', 'pivotShaft', 'armPlates', 'gearbox', 'chain', 'gearboxSprocket', 'pivotSprocket', 'encoder', 'encSprocket', 'rollerMotor', 'hopperFront'], az: 62, el: 16 },
  transfer: { label: 'Transfer', parts: ['feeders', 'lower', 'upper', 'tBelt', 'tMotors', 'ramps', 'dividers'], az: 96, el: 8, lane: 1 },
  shooters: { label: 'Shooters', parts: ['fly', 'hoods', 'krakens'], az: 148, el: 24 },
};

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: true });
  const rig = await loadRobot(stage);
  const { model } = rig;
  stage.frame(model, { azimuth: 42, elevation: 20, pad: 1.06, refresh: true });

  const cut = stage.sectionPlane([-1, 0, 0], 1000); // parked: cuts nothing
  rig.fixClear();

  let unlight = null, lane = -1, preset = 'all';
  const partsOf = (keys) => [...new Set(keys.flatMap((k) => (k === 'swerve' ? rig.swerve : rig.parts(G[k]))))];
  function setLane(i, { move = true } = {}) {
    lane = i;
    laneCtl.set(String(i), { silent: true });
    cut.set(i < 0 ? 1000 : LANES[i]); // keeps x <= lane centre, seen from the +X side
    if (i >= 0 && move) {
      // turn to the side that shows the cut face if the camera is on the other side
      const d = stage.camera.position.clone().sub(stage.controls.target);
      if (d.x < 0.2 * d.length()) stage.frame(model, { azimuth: 90, elevation: 8, pad: 1.02, duration: 0.8 });
    }
  }
  function show(key) {
    preset = key;
    const p = PRESETS[key];
    unlight?.(); unlight = null;
    if (p.parts) { unlight = stage.highlight(partsOf(p.parts), '#ff6b35', { intensity: 0.5 }); rig.fixClear(); }
    if (p.lane != null) setLane(p.lane, { move: false }); else if (lane >= 0 && key !== 'all') setLane(-1);
    const target = p.parts && p.frame !== 'all' ? partsOf(p.parts) : model;
    stage.frame(target, { azimuth: p.az, elevation: p.el, pad: p.parts && p.frame !== 'all' ? 1.35 : 1.06, duration: 0.8 });
  }

  segmented(ctx.panel, {
    label: 'Show',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    value: 'all',
    onChange: show,
  });
  const laneCtl = segmented(ctx.panel, {
    label: 'Section',
    options: [{ value: '-1', label: 'Off' }, { value: '0', label: 'Left lane' }, { value: '1', label: 'Middle' }, { value: '2', label: 'Right lane' }],
    value: '-1',
    onChange: (v) => setLane(+v),
  });
  segmented(ctx.panel, {
    label: 'Polycarbonate',
    options: [{ value: 'clear', label: 'Clear' }, { value: 'solid', label: 'Solid' }],
    value: 'clear',
    onChange: (v) => rig.setClear(v === 'clear'),
  });

  // Intake: stowed (the start of a match) or deployed, tweened about the real pivot axis
  let armGoal = 0, stopArm = null;
  segmented(ctx.panel, {
    label: 'Intake',
    options: [{ value: 'down', label: 'Deployed' }, { value: 'up', label: 'Stowed' }],
    value: 'down',
    onChange(v) {
      armGoal = v === 'up' ? STOW : 0;
      stopArm?.(); stopArm = null;
      if (ctx.reducedMotion) { rig.setArm(armGoal); return; }
      stopArm = stage.onFrame((dt) => {
        const a = rig.armAngle, step = Math.sign(armGoal - a) * Math.min(Math.abs(armGoal - a), dt * 1.6);
        rig.setArm(a + step);
        if (Math.abs(armGoal - rig.armAngle) < 1e-4) { stopArm?.(); stopArm = null; }
      });
    },
  });

  // Run: roller, transfer and flywheels spin the way the fuel path needs (positive about +X).
  // Visual speeds only. Nothing moves until the reader presses it.
  let stop = null;
  playToggle(ctx.panel, {
    playing: false,
    labels: ['Run mechanisms', 'Stop'],
    onChange(on) {
      stop?.(); stop = null;
      if (!on) return;
      stop = stage.onFrame((dt) => {
        const s = rig.state;
        rig.setRoller(s.roller + dt * 6);
        rig.setTransfer(s.transfer + dt * 5);
        rig.setFly(s.fly + dt * 14);
      });
    },
  });

  return { dispose() { stop?.(); stopArm?.(); unlight?.(); stage.dispose(); } };
}
