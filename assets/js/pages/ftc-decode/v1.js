// V1, the robot Jerry designed, from his CAD. Three things a photo cannot show:
//  - the intake gearing change that fixed the stall (1,620 rpm to 1,150 rpm): the roller runs at
//    either speed (slowed down so it can be seen) and the readout gives the surface speed and the
//    torque ratio;
//  - the hood flap on its Swyft servo: up for the close zone, down for the far zone, and where
//    the ball leaves the hood in each case (the tangent where the hood ends, from the CAD);
//  - one shot: the gate swings open, the two feed wheels lift the top ball into the flywheel, the
//    ball rides the hood and leaves, and the stack indexes up behind it.
// The gate and flap swing about their servos' real axes; how far they swing is illustrative.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented, playToggle, readout, button } from '/assets/js/lib/ui.js';
import { loadParts, rigV1, restCentre, placeBall, DEG, V1, lerp, smooth, mix3 } from './rig.js';

const SLOW = 25; // the intake is shown at 1/25 of its real speed
const RPM = { old: 1620, new: 1150 };

export async function mount(el, ctx) {
  const stage = createStage(el, { exposure: 1.15, hint: ctx.isTouch ? 'Swipe sideways to turn' : 'Drag to rotate' });
  const { chassis, top } = await loadParts(stage, 'v1');
  const rig = rigV1(stage, chassis, top);

  const views = {
    whole: { azimuth: 150, elevation: 36, pad: 0.88 },
    cut: { azimuth: -90, elevation: 6, pad: 0.95 },
  };
  let view = 'whole';
  const reframe = (dur = 0) => stage.frame([chassis, top], { ...views[view], duration: dur });
  reframe();
  let cut = null; // keeps x >= -0.036, the robot's left half; made when the reader first asks
  const setCut = (on) => { if (on && !cut) cut = stage.sectionPlane([1, 0, 0], 0.036); else cut?.enable(on); };

  // ------------------------------------------------------------ readout
  let gearing = 'old';
  const info = readout(null, { rows: [
    { key: 'r', label: 'Intake roller', unit: ' rpm', format: (v) => v.toLocaleString('en-US') },
    { key: 'v', label: 'Roller surface speed', unit: ' m/s', format: (v) => v.toFixed(1) },
    { key: 'q', label: 'Torque at the roller', format: (v) => `${v.toFixed(2)}x` },
    { key: 'f', label: 'Hood flap', format: (v) => v },
    { key: 'l', label: 'Ball leaves the hood at', format: (v) => `about ${v.toFixed(0)}° up` },
  ] });
  const paint = () => {
    const rpm = RPM[gearing];
    info.set({ r: rpm, v: (Math.PI * V1.intakeWheelD * rpm) / 60, q: RPM.old / rpm, f: rig.flapUp ? 'Up: close zone' : 'Down: far zone', l: 90 - rig.hoodEnd });
  };

  // ------------------------------------------------------------ intake
  let intakeLoop = null;
  const runIntake = playToggle(ctx.panel, { playing: false, labels: ['Run intake', 'Stop intake'], onChange(on) {
    intakeLoop?.(); intakeLoop = null;
    if (on) intakeLoop = stage.onFrame((dt) => rig.setIntake(rig.intakeAngle + dt * ((RPM[gearing] / 60) * 2 * Math.PI) / SLOW));
  } });
  segmented(ctx.panel, { label: 'Intake gearing', options: [{ value: 'old', label: '1,620 rpm (Nov 8)' }, { value: 'new', label: '1,150 rpm (Nov 15)' }], value: 'old',
    onChange(v) { gearing = v; paint(); if (!runIntake.playing) runIntake.set(true); } });

  // ------------------------------------------------------------ hood flap
  let flapTween = null, flapK = 0;
  segmented(ctx.panel, { label: 'Hood flap', options: [{ value: 'down', label: 'Down: far zone' }, { value: 'up', label: 'Up: close zone' }], value: 'down',
    onChange(v) {
      rig.flapUp = v === 'up'; paint();
      const to = rig.flapUp ? 1 : 0;
      flapTween?.(); flapTween = null;
      if (ctx.reducedMotion) { flapK = to; rig.setFlap(flapK); return; }
      flapTween = stage.onFrame((dt) => {
        const step = dt * 3;
        flapK = Math.abs(to - flapK) <= step ? to : flapK + Math.sign(to - flapK) * step;
        rig.setFlap(flapK);
        if (flapK === to) { flapTween(); flapTween = null; }
      });
    } });

  // ------------------------------------------------------------ one shot
  const b = rig.balls;
  const rest = { top: restCentre(stage, b.top), mid: restCentre(stage, b.mid), low: restCentre(stage, b.low) };
  const r0 = Math.hypot(rest.top[1] - V1.fly.y, rest.top[2] - V1.fly.z);
  const th0 = Math.atan2(rest.top[1] - V1.fly.y, rest.top[2] - V1.fly.z) / DEG; // about -28 degrees: in front of the wheel
  function ballAt(t, endTh) {
    // 0..0.3 lifted by the feed wheels into the flywheel; 0.3..0.65 carried up under the hood; then free flight
    if (t < 0.3) {
      const k = smooth(0, 0.3, t);
      return rig.hoodPoint(lerp(th0, th0 + 10, k), lerp(r0, V1.ballPathR, k));
    }
    if (t < 0.65) return rig.hoodPoint(lerp(th0 + 10, endTh, (t - 0.3) / 0.35));
    const p0 = rig.hoodPoint(endTh), th = endTh * DEG;
    const s = (t - 0.65) / 0.35, d = 0.8 * s;
    return [p0[0], p0[1] + Math.cos(th) * d - 0.5 * 9.81 * (s * 0.3) ** 2, p0[2] - Math.sin(th) * d];
  }
  let shot = null, flyLoop = null;
  const spinFly = playToggle(ctx.panel, { playing: false, labels: ['Spin flywheel', 'Stop flywheel'], onChange(on) {
    flyLoop?.(); flyLoop = null;
    if (on) flyLoop = stage.onFrame((dt) => rig.setFly(rig.flyAngle - dt * 14));
  } });
  function shoot() {
    if (shot) return;
    const endTh = rig.hoodEnd;
    const wasSpinning = spinFly.playing;
    if (!wasSpinning) spinFly.set(true);
    let t = -0.25; // the gate opens first
    shot = stage.onFrame((dt) => {
      t = Math.min(1.5, t + dt / 1.5);
      rig.setGate(smooth(-0.25, -0.05, t) * (1 - smooth(1.05, 1.3, t)));
      if (t > -0.08 && t < 0.45) rig.setFeed(rig.feedAngle + dt * 10);
      const k = Math.max(0, Math.min(1, t));
      placeBall(stage, b.top, ballAt(k, endTh));
      b.top.visible = t < 1;
      const up = smooth(0.2, 0.9, t); // the next two balls index up behind it
      placeBall(stage, b.mid, mix3(rest.mid, rest.top, up));
      placeBall(stage, b.low, mix3(rest.low, rest.mid, up));
      if (t >= 1.5) {
        shot(); shot = null;
        for (const k2 of ['top', 'mid', 'low']) { placeBall(stage, b[k2], rest[k2]); b[k2].visible = true; }
        rig.setGate(0);
        if (!wasSpinning) spinFly.set(false);
        stage.invalidate();
      }
    });
  }
  button(ctx.panel, { label: 'Shoot a ball', onClick: shoot });
  segmented(ctx.panel, { label: 'View', options: [{ value: 'whole', label: 'Whole' }, { value: 'cut', label: 'Cut in half' }], value: 'whole',
    onChange(v) { view = v; setCut(v === 'cut'); reframe(0.7); } });
  ctx.panel.append(info.el);
  paint();

  return { dispose() { intakeLoop?.(); flyLoop?.(); flapTween?.(); shot?.(); stage.dispose(); } };
}
