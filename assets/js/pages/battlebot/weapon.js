// The weapon stack, cut open through the spin axis (Jerry's version 2 CAD). The section plane
// runs through the SunnySky V4006's axis, so the stator seated on the bottom plate, the bell
// around it, the blade screwed to the bell and the shaft running up into the 4 mm bearing in the
// top plate all show at once. Cut faces are hatched in one colour per part: orange for what spins
// (blade, bell and blade screws), neutral for what does not. "Spin up" turns the spinning parts
// about the real axis from the STEP.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, segmented, button } from '/assets/js/lib/ui.js';
import { loadRobot, rig, blurDisc, RPM_MAX, W_MAX, tipOf, fmtInt, spinTo, drawnSpeed } from './rig.js';
import { createLabels } from './labels.js';

// hatch colours for the cut faces [a, b] per part group
const CAPS = {
  spin: ['#ff8a57', '#d9642f'], stator: ['#ece6da', '#cfc7b8'], bearing: ['#c9ced6', '#a7adb6'],
  plate: ['#4a4e55', '#383b41'], frame: ['#2cc0b1', '#1c9489'], other: ['#8c847b', '#6f6860'],
};

export async function mount(el, ctx) {
  const stage = createStage(el, {});
  const T = stage.THREE;
  const { model, p } = await loadRobot(stage, 'v2');
  const pv = rig(stage, p);
  const spinning = [...p.blade, ...p.rotor, ...p.screws];

  // our own cut, so each part group can have its own hatch colour
  const plane = new T.Plane(new T.Vector3(-1, 0, 0), 0); // keeps x <= 0
  stage.renderer.localClippingEnabled = true;
  const groupOf = new Map();
  const tag = (objs, g) => { for (const o of objs) o.traverse((m) => { if (m.isMesh) groupOf.set(m, g); }); };
  tag(spinning, 'spin'); tag(p.stator, 'stator'); tag([...p.motorBearings, ...p.topBearing, ...p.spacer], 'bearing');
  tag([...p.top, ...p.bottom], 'plate'); tag(p.tpu, 'frame');
  const made = new Map(), spinMats = [];
  model.traverse((m) => {
    if (!m.isMesh) return;
    const g = groupOf.get(m) || 'other';
    const fix = (mat) => {
      const key = `${mat.uuid}|${g}`;
      if (made.has(key)) return made.get(key);
      const c = mat.clone();
      const a = { value: new T.Color(CAPS[g][0]) }, b = { value: new T.Color(CAPS[g][1]) };
      c.clippingPlanes = [plane]; c.clipShadows = true; c.side = T.DoubleSide;
      c.onBeforeCompile = (sh) => {
        sh.uniforms.bbCapA = a; sh.uniforms.bbCapB = b;
        sh.fragmentShader = `uniform vec3 bbCapA; uniform vec3 bbCapB;\n${sh.fragmentShader.replace('#include <tonemapping_fragment>', `#include <tonemapping_fragment>
          if (!gl_FrontFacing) gl_FragColor.rgb = mod(gl_FragCoord.x + gl_FragCoord.y, 9.0) < 4.5 ? bbCapA : bbCapB;`)}`;
      };
      c.customProgramCacheKey = () => `bbcap-${g}`;
      made.set(key, c);
      if (g === 'spin') spinMats.push(c);
      return c;
    };
    m.material = Array.isArray(m.material) ? m.material.map(fix) : fix(m.material);
  });

  const disc = blurDisc(T, '#ff9b6e');
  disc.position.set(0, 0.019, -0.076);
  disc.material.clippingPlanes = [plane];
  stage.scene.add(disc);

  // frame a box around the weapon stack: from the plate noses back past the bell, floor to top plate
  const focus = new T.Mesh(new T.BoxGeometry(0.03, 0.046, 0.12));
  focus.position.set(-0.015, 0.018, -0.079);
  focus.updateMatrixWorld();
  const view = () => {
    const portrait = el.clientHeight > el.clientWidth;
    stage.frame(focus, { azimuth: 90, elevation: 8, pad: portrait ? 1.0 : 1.06 });
  };
  view();

  const labels = createLabels(el);
  const LONG = [
    { text: '4 mm bearing in the top plate', p: [0, 0.0316, -0.076], side: 'l' },
    { text: 'Bell (spins)', p: [0, 0.018, -0.0545], side: 'l' },
    { text: 'Stator, bolted to the bottom plate', p: [0, 0.0105, -0.0665], side: 'l' },
    { text: 'Blade screws: 4 x M3 x 6 mm', p: [0, 0.0262, -0.082], side: 'r' },
    { text: 'Blade (spins)', p: [0, 0.0195, -0.118], side: 'r' },
  ];
  const SHORT = [
    { text: 'Top bearing', p: [0, 0.0316, -0.076], side: 'l' },
    { text: 'Bell', p: [0, 0.018, -0.0545], side: 'l' },
    { text: 'Stator', p: [0, 0.0105, -0.0665], side: 'l' },
    { text: 'Screws', p: [0, 0.0262, -0.082], side: 'r' },
    { text: 'Blade', p: [0, 0.0195, -0.118], side: 'r' },
  ];
  const setLabels = () => labels.set(el.clientWidth < 620 ? SHORT : LONG);
  setLabels();
  const syncLabels = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', syncLabels);
  const ro = new ResizeObserver(() => requestAnimationFrame(() => { setLabels(); syncLabels(); }));
  ro.observe(el);

  // ------------------------------------------------------------ controls
  let w = 0, target = W_MAX, playing = false, angle = 0, loop = null;
  const info = readout(null, { rows: [
    { key: 'rpm', label: 'Weapon', unit: 'rpm', format: fmtInt },
    { key: 'fts', label: 'Blade tip', unit: 'ft/s', format: (v) => v.toFixed(0) },
    { key: 'mph', label: 'Blade tip', unit: 'mph', format: (v) => v.toFixed(1) },
  ] });
  playToggle(ctx.panel, { labels: ['Spin up', 'Stop'], onChange: (on) => { playing = on; wake(); } });
  slider(ctx.panel, { label: 'Target speed', min: 0, max: RPM_MAX, step: 1, value: RPM_MAX, unit: ' rpm', format: fmtInt,
    onInput: (rpm) => { target = (rpm * 2 * Math.PI) / 60; if (playing) wake(); } });
  segmented(ctx.panel, { label: 'View', options: [{ value: 'cut', label: 'Cut' }, { value: 'whole', label: 'Whole' }], value: 'cut',
    onChange: (v) => { plane.constant = v === 'cut' ? 0 : 10; labels.show(v === 'cut'); stage.invalidate(); syncLabels(); } });
  let glowT = 0;
  button(ctx.panel, { label: 'Show what spins', onClick: () => {
    for (const m of spinMats) { m.emissive?.set('#ff6b35'); m.emissiveIntensity = 0.65; }
    stage.invalidate();
    clearTimeout(glowT);
    glowT = setTimeout(() => { for (const m of spinMats) m.emissive?.set('#000000'); stage.invalidate(); }, 1600);
  } });
  ctx.panel.append(info.el);

  const show = () => { const t = tipOf(w); info.set({ rpm: t.rpm, fts: t.fts, mph: t.mph }); };
  function wake() { if (!loop) loop = stage.onFrame(tick); }
  function tick(dt) {
    w = spinTo(w, playing ? target : 0, dt);
    angle -= drawnSpeed(w) * dt;
    pv.weapon.setAngle(angle);
    disc.setSpeed(w);
    show();
    if (!playing && w === 0) { loop(); loop = null; }
  }
  show();
  requestAnimationFrame(syncLabels);

  return {
    dispose() {
      clearTimeout(glowT);
      ro.disconnect();
      labels.dispose();
      focus.geometry.dispose(); focus.material.dispose();
      for (const m of made.values()) m.dispose();
      stage.dispose();
    },
  };
}
