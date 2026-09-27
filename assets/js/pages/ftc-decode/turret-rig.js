// V2 turret mechanism on the Worlds CAD. Sliders turn the turret (the two 90T gears that mesh
// with its 150T ring counter-rotate 150/90 as far) and roll the hood along its toothed arc (the
// 40T pinion turns 7.65x as far the other way). "Feed a ball" runs the four TPU spinners and
// sends the top stored ball up through the turret bearing's bore, under the hood and out, along
// the geometry of the CAD. Nothing moves until the reader asks.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, button, segmented } from '/assets/js/lib/ui.js';
import { loadParts, rigTurret, restCentre, placeBall, dropMouthBall, DEG, V2, RING_T, SERVO_T, HOOD_RACK_R, PINION_R, lerp, smooth, mix3 } from './rig.js';

export async function mount(el, ctx) {
  const stage = createStage(el, { exposure: 1.15, hint: ctx.isTouch ? 'Swipe sideways to turn' : 'Drag to rotate' });
  const { chassis, top } = await loadParts(stage, 'v2');
  dropMouthBall(stage, top);
  const rig = rigTurret(stage, chassis, top);

  // camera on the turret, from the front left
  const focus = [...rig.ring, ...rig.gears, ...rig.hoodParts];
  const views = { whole: { azimuth: 38, elevation: 24 }, cut: { azimuth: -76, elevation: 10 } };
  let view = 'whole';
  const reframe = (dur = 0) => stage.frame(focus, { ...views[view], pad: 1.3, offset: [0, -0.06, 0], duration: dur });
  reframe();

  // ------------------------------------------------------------ readouts
  const info = readout(null, { rows: [
    { key: 't', label: 'Turret', unit: '°', format: (v) => v.toFixed(0) },
    { key: 's', label: 'Each 90T gear (150:90)', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'h', label: 'Hood end, about the axle', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'p', label: '40T pinion', unit: '°', format: (v) => v.toFixed(0) },
    { key: 'l', label: 'Ball leaves at', format: (v) => `about ${v.toFixed(0)}° up` },
  ] });
  const paint = () => info.set({
    t: rig.turret / DEG, s: (-RING_T / SERVO_T) * rig.turret / DEG,
    h: rig.hoodEnd, p: -(V2.hoodEnd - rig.hoodEnd) * (HOOD_RACK_R / PINION_R), l: 90 - rig.hoodEnd,
  });

  // glow the parts a control moves, briefly
  let unlight = null, lightTimer = 0;
  const glow = (parts) => {
    unlight?.(); unlight = stage.highlight(parts, '#ff6b35', { intensity: 0.55 });
    clearTimeout(lightTimer); lightTimer = setTimeout(() => { unlight?.(); unlight = null; }, 900);
  };

  slider(ctx.panel, { label: 'Turret', min: -90, max: 90, step: 1, value: 0, unit: '°', format: (v) => v.toFixed(0),
    onInput: (v) => { rig.setTurret(v * DEG); glow([...rig.ring, ...rig.gears]); paint(); } });
  slider(ctx.panel, { label: 'Hood', min: 26, max: 54, step: 0.5, value: V2.hoodEnd, unit: '°', format: (v) => v.toFixed(0),
    onInput: (v) => { rig.setHood(v); glow(rig.hoodParts); paint(); } });

  // ------------------------------------------------------------ flywheel
  let spin = null;
  const flyBtn = playToggle(ctx.panel, { playing: false, labels: ['Spin flywheel', 'Stop flywheel'], onChange(on) {
    spin?.(); spin = null;
    if (on) spin = stage.onFrame((dt) => rig.setFly(rig.flyAngle - dt * 14));
  } });

  // ------------------------------------------------------------ section through the ball path
  let cut = null; // keeps x >= -0.036, the robot's left half; made when the reader first asks
  const setCut = (on) => { if (on && !cut) cut = stage.sectionPlane([1, 0, 0], 0.036); else cut?.enable(on); };

  // ------------------------------------------------------------ feed a ball
  const b = rig.balls;
  const rest = { top: restCentre(stage, b.top), mid: restCentre(stage, b.mid), low: restCentre(stage, b.low) };
  const startTh = Math.atan2(rest.top[1] - V2.fly.y, rest.top[2] - V2.fly.z) / DEG; // about -21 degrees
  let feed = null;
  function ballAt(t) {
    // 0..0.25 rise out of the bore onto the wheel, 0.25..0.7 ride under the hood, 0.7..1 fly out
    const endTh = rig.hoodEnd;
    if (t < 0.25) {
      const k = smooth(0, 0.25, t);
      return mix3(rest.top, rig.onTurret(rig.hoodPoint(startTh)), k);
    }
    if (t < 0.7) return rig.onTurret(rig.hoodPoint(lerp(startTh, endTh, (t - 0.25) / 0.45)));
    const p0 = rig.onTurret(rig.hoodPoint(endTh)), d = rig.launchDir();
    const s = (t - 0.7) / 0.3, dist = 0.9 * s;
    return [p0[0] + d[0] * dist, p0[1] + d[1] * dist - 4.9 * (s * 0.35) ** 2, p0[2] + d[2] * dist];
  }
  function runFeed() {
    if (feed) return;
    let t = 0;
    const wasSpinning = flyBtn.playing;
    if (!wasSpinning) flyBtn.set(true);
    feed = stage.onFrame((dt) => {
      t = Math.min(1.35, t + dt / 1.6);
      const k = Math.min(1, t);
      placeBall(stage, b.top, ballAt(k));
      b.top.visible = t < 1;
      if (t < 0.75) rig.setSpin(rig.spinAngle - dt * 9); // the spinners push the stack up the ramp
      const up = smooth(0.1, 0.6, t);
      placeBall(stage, b.mid, mix3(rest.mid, rest.top, up));
      placeBall(stage, b.low, mix3(rest.low, rest.mid, up));
      if (t >= 1.35) {
        feed(); feed = null;
        for (const k2 of ['top', 'mid', 'low']) { placeBall(stage, b[k2], rest[k2]); b[k2].visible = true; }
        if (!wasSpinning) flyBtn.set(false);
        stage.invalidate();
      }
    });
  }
  button(ctx.panel, { label: 'Feed a ball', onClick: runFeed });
  segmented(ctx.panel, { label: 'View', options: [{ value: 'whole', label: 'Whole' }, { value: 'cut', label: 'Cut in half' }], value: 'whole', onChange(v) {
    view = v; setCut(v === 'cut'); reframe(0.8);
  } });
  ctx.panel.append(info.el);
  paint();

  return {
    dispose() { clearTimeout(lightTimer); spin?.(); feed?.(); stage.dispose(); },
  };
}
