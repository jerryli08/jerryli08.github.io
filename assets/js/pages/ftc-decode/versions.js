// Both robots in Jerry's CAD on one stage. The shared chassis (drive, intake, ramp) is one model
// and stays put; the version buttons swap only the parts that differ, so the reader sees exactly
// what changed between the robot he designed (V1) and the Worlds robot (V2). "Cut in half" puts
// a section plane down the robot's centreline to show each version's ball path. Nothing moves
// until the reader picks something.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented, readout } from '/assets/js/lib/ui.js';
import { MODELS, dropMouthBall } from './rig.js';

const INFO = {
  v1: { s: 'Fixed to the chassis', w: '2 x 96 mm, a motor on each end', a: 'Turn the whole robot', h: 'Fixed, with a 2-position flap' },
  v2: { s: 'On a turret', w: '1 x 72 mm, 2 motors through bevels', a: 'Turret, from the odometry pose', h: 'Geared, adjustable' },
};

export async function mount(el, ctx) {
  const stage = createStage(el, { exposure: 1.15, hint: ctx.isTouch ? 'Swipe sideways to turn' : 'Drag to rotate' });
  const [chassis, v1] = await Promise.all([
    stage.load(MODELS + 'chassis.glb'),
    stage.load(MODELS + 'v1top.glb'),
  ]);
  const tops = { v1, v2: null };
  let version = 'v1', view = 'whole', lit = null, lightOn = false, req = 0;

  const views = {
    whole: { azimuth: 38, elevation: 20, pad: 0.92 },
    cut: { azimuth: -90, elevation: 8, pad: 0.95 },
  };
  const reframe = (dur) => stage.frame([chassis, tops[version]], { ...views[view], duration: dur });
  reframe(0);

  // section plane down the centreline (x = -0.036): keeps the robot's left half. Made on the
  // first request, so the materials stay as they are until the reader asks for a cut.
  let cut = null;
  const setCut = (on) => {
    if (on && !cut) cut = stage.sectionPlane([1, 0, 0], 0.036);
    else cut?.enable(on);
  };

  const info = readout(null, { rows: [
    { key: 's', label: 'Shooter' },
    { key: 'w', label: 'Flywheel' },
    { key: 'a', label: 'Aiming' },
    { key: 'h', label: 'Hood' },
  ] });
  const paint = () => info.set(INFO[version]);

  function relight() {
    lit?.(); lit = null;
    if (lightOn && tops[version]) lit = stage.highlight(tops[version], '#ff6b35', { intensity: 0.5 });
  }

  async function show(v) {
    const token = ++req;
    if (!tops[v]) {
      const m = await stage.load(MODELS + `${v}top.glb`); // added to the root, so a live section cuts it too
      if (v === 'v2') dropMouthBall(stage, m);
      tops[v] = m;
      stage.root.remove(m);
    }
    if (token !== req) return;
    lit?.(); lit = null;
    stage.root.remove(tops[version]);
    version = v;
    stage.root.add(tops[v]);
    if (cut?.enabled) { cut.enable(false); cut.enable(true); } // make sure this version's materials are clipped
    stage.fitGround();
    relight();
    paint();
    reframe(0.6);
  }

  segmented(ctx.panel, { label: 'Robot', options: [{ value: 'v1', label: 'V1, Nov 2025' }, { value: 'v2', label: 'V2, Worlds' }], value: 'v1',
    onChange: (v) => show(v).catch((e) => console.error(e)) });
  segmented(ctx.panel, { label: 'View', options: [{ value: 'whole', label: 'Whole' }, { value: 'cut', label: 'Cut in half' }], value: 'whole',
    onChange(v) { view = v; setCut(v === 'cut'); reframe(0.6); } });
  segmented(ctx.panel, { label: 'Tint', options: [{ value: 'off', label: 'Off' }, { value: 'on', label: 'What changed' }], value: 'off',
    onChange(v) { lightOn = v === 'on'; relight(); } });
  ctx.panel.append(info.el);
  paint();

  return {
    dispose() {
      for (const m of Object.values(tops)) if (m && !m.parent) stage.root.add(m); // so dispose() frees both versions
      stage.dispose();
    },
  };
}
