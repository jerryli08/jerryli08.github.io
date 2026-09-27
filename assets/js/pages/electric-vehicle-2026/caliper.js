// "Caliper in, steering out": version 2's front end from my CAD, driven by one slider for the
// caliper's sliding jaw. Every moving part turns about a real axis from the STEP
// (tools/cad-axes.py on scioly_ev_2026_ev_caliper_steering_final_ver.step, millimetres, Z up):
//   steering: vertical axis through the 6202 bearing and the bearing holder bore, x -465.2, y 231.5
//   link:     its rear pin on the dynamic caliper ends, x -337.5, y 187.3, which slides along +x
// The slider-crank maths (50 mm arm, 89.4 mm link, 44.2 mm offset) is in geom.js. A rotation about
// STEP +Z is the same angle about model +Y, and STEP +x is model +x (cad.point), so the parts move
// by exactly the computed angles and travel.
import { createStage, cad } from '/assets/js/lib/stage.js';
import { slider, readout, segmented, button } from '/assets/js/lib/ui.js';
import * as G from './geom.js';
import { straighten } from './bake.js';

const DEG = Math.PI / 180;

export async function mount(el, ctx) {
  const stage = createStage(el);
  const model = await stage.load('/assets/models/electric-vehicle-2026/v2-caliper.glb');
  straighten(model, stage.THREE); // boxes that fit, so the ground and shadow sit under the wheels
  stage.fitGround();

  // parts, by their CAD names (tools/cad/configs/electric-vehicle-2026-v2-caliper.json keeps them separate)
  const steerParts = stage.part(/^anim_ev2_\d+_(front_wheel_holder_1|front_wheel_bearing_holder_1|front_axle_1|BaneBots_2_875_x0_8_30A_Wheel_4|BaneBots_12mm_T81_Wheel_Hub_4|_4x_5mm_12id_spacer_[24]|1603_0032_0012_assembly_[13])/);
  const clampParts = stage.part(/^anim_ev2_\d+_(bottom|top)_dynamic_caliper_end_1/);
  const headParts = stage.part(/^anim_ev2_\d+_Component2[345]_1/);
  const linkParts = stage.part(/^anim_ev2_\d+_caliper_linkage_1/);

  const steer = stage.pivot(steerParts, cad.point([-465.2, 231.5, 0]), [0, 1, 0]);
  const link = stage.pivot(linkParts, cad.point([-337.5, 187.3, 13.3]), [0, 1, 0]);
  const slide = stage.pivot([...headParts, ...clampParts], 'center', [0, 1, 0]); // translated only
  const linkX0 = link.position.x, slideX0 = slide.position.x;

  const focus = [...steerParts, ...linkParts, ...clampParts];
  const VIEWS = { angle: { azimuth: 306, elevation: 48, pad: 1.06 }, top: { azimuth: 90, elevation: 88, pad: 1.12 } };
  let view = 'angle';
  stage.frame(focus, VIEWS[view]);

  // the linkage (bearing holder with its arm, link, caliper clamp) is tinted so it reads against
  // the black prints; it glows brighter while the slider moves
  const linkage = [...stage.part(/^anim_ev2_\d+_front_wheel_bearing_holder_1/), ...linkParts, ...clampParts];
  const BASE = 0.16, LIVE = 0.42;
  stage.highlight(linkage, '#ff6b35', { intensity: BASE });
  let t = 0, tintTimer = 0;
  function tint() {
    stage.highlight(linkage, '#ff6b35', { intensity: LIVE });
    clearTimeout(tintTimer);
    tintTimer = setTimeout(() => stage.highlight(linkage, '#ff6b35', { intensity: BASE }), 900);
  }
  function apply(v, fromUser) {
    t = Math.max(-2, Math.min(4, v));
    const th = G.steerAt(t);
    steer.setAngle(th);
    link.setAngle(G.linkTurnAt(t));
    link.position.x = linkX0 + t / 1000;
    slide.position.x = slideX0 + t / 1000;
    stage.invalidate();
    if (fromUser) tint();
    const deg = th / DEG, sens = Math.abs(G.sensitivity(t));
    const R = Math.abs(th) < 1e-6 ? Infinity : G.WHEELBASE.v2 / Math.tan(Math.abs(th));
    out.set({
      steer: Math.abs(deg) < 0.005 ? 'Straight ahead' : `${Math.abs(deg).toFixed(2)}° ${deg > 0 ? 'left' : 'right'}`,
      radius: R === Infinity ? 'Straight' : `${R.toFixed(R < 10 ? 2 : 1)} m`,
      sens: `${sens.toFixed(2)}° per mm`,
      count: `${(sens * 0.01).toFixed(3)}°`,
    });
  }

  const P = ctx.panel;
  const s = slider(P, {
    label: 'Caliper travel', min: -2, max: 4, step: 0.01, value: 0, unit: ' mm',
    format: (v) => `${v > 0.004 ? '+' : v < -0.004 ? '−' : ''}${Math.abs(v).toFixed(2)}`,
    onInput: (v) => apply(v, true),
  });
  button(P, { label: '−0.01 mm', onClick: () => s.set(Math.round((t - 0.01) * 100) / 100) });
  button(P, { label: '+0.01 mm', onClick: () => s.set(Math.round((t + 0.01) * 100) / 100) });
  segmented(P, {
    label: 'View', options: [{ value: 'angle', label: '3D' }, { value: 'top', label: 'From above' }], value: view,
    onChange: (v) => { view = v; stage.frame(focus, { ...VIEWS[v], duration: 0.7 }); },
  });
  const out = readout(P, {
    rows: [
      { key: 'steer', label: 'Steering angle' },
      { key: 'radius', label: 'Turn radius' },
      { key: 'sens', label: 'Sensitivity here' },
      { key: 'count', label: 'One 0.01 mm count' },
    ],
  });
  apply(0, false);

  return { dispose() { clearTimeout(tintTimer); stage.dispose(); } };
}
