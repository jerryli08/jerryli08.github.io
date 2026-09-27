// Version 1 (CAD only) against version 2 (built), both from Jerry's CAD at the same scale. The
// dimension marks and the numbers in the readout are measured on his two STEP files: plate to
// plate, how far the wheels stand past the plates, the frame parts, fasteners and the blades.
// "What changed" steps through the differences and lights up the parts involved.
import { createStage } from '/assets/js/lib/stage.js';
import { readout, segmented, button } from '/assets/js/lib/ui.js';
import { loadRobot, LIFT, TIP_R } from './rig.js';
import { createLabels } from './labels.js';

const GAP = 0.125;            // each robot's centre from the middle when both are shown
const WHEEL_TOP = 0.048575;   // wheel radius 28.575 mm about the axle at 20 mm (GLB y, before the lift)
const DIMS = {                // measured on the STEP files (GLB y of the outer plate faces, before the lift)
  v1: { bot: -0.004, top: 0.044, stack: '48.0 mm', proud: '4.6 mm', bladeY: 0.021 },
  v2: { bot: 0.0014, top: 0.0386, stack: '37.2 mm', proud: '10.0 mm', bladeY: 0.019 },
};
const STEPS = [
  { h: 'Frame', t: 'Version 1 held its plates with five parts: a centre frame, two wheel guards and two motor clamps. Version 2 replaces all five with one TPU part.', parts: (a, b) => [...a.center, ...a.guards, ...a.clamps, ...b.tpu] },
  { h: 'Height', t: 'Version 1 stacked its plates on the frame; version 2 sets them into it. Plate to plate drops from 48.0 to 37.2 mm with the same 57 mm wheels.', parts: (a, b) => [...a.top, ...a.bottom, ...b.top, ...b.bottom] },
  { h: 'Blade', t: 'Two teeth and 18 mm thick became one tooth with a counterweight, 16 mm thick. Both sweep the same 112 mm circle.', parts: (a, b) => [...a.blade, ...b.blade] },
  { h: 'Switch', t: 'Version 2 adds a REV power switch at the back of the frame.', parts: (a, b) => [...b.switch] },
];

export async function mount(el, ctx) {
  const stage = createStage(el, {});
  const T = stage.THREE;
  const g1 = new T.Group(), g2 = new T.Group();
  g1.position.y = LIFT; g2.position.y = LIFT;
  stage.root.add(g1, g2);
  const [r1, r2] = await Promise.all([loadRobot(stage, 'v1', { add: false }), loadRobot(stage, 'v2', { add: false })]);
  g1.add(r1.model); g2.add(r2.model);
  stage.fitGround();
  const a = r1.p, b = r2.p;

  // ------------------------------------------------------------ dimension marks (annotations)
  const lineMat = new T.LineBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true });
  const ringMat = new T.LineBasicMaterial({ color: '#ff6b35', depthTest: false, transparent: true, opacity: 0.8 });
  const marks = new T.Group(); stage.scene.add(marks);
  const labels = createLabels(el);
  function seg(pts, mat = lineMat) {
    const l = new T.Line(new T.BufferGeometry().setFromPoints(pts.map((q) => new T.Vector3(...q))), mat);
    l.renderOrder = 10; marks.add(l); return l;
  }
  function ring(x, y, z) {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2; pts.push([x + TIP_R * Math.cos(t), y, z + TIP_R * Math.sin(t)]); }
    return seg(pts, ringMat);
  }

  // ------------------------------------------------------------ state
  let mode = 'both', show = 'robot', stepI = -1, restore = null;
  const isPortrait = () => el.clientHeight > el.clientWidth * 1.05;
  let wasPortrait = isPortrait();
  function layout() {
    const blades = show === 'blades', portrait = isPortrait();
    wasPortrait = portrait;
    g1.visible = mode !== 'v2'; g2.visible = mode !== 'v1';
    // side by side on a wide stage; stacked on a tall one (blades: one above the other as seen from the top)
    g1.position.set(0, LIFT, 0); g2.position.set(0, LIFT, 0);
    if (mode === 'both') {
      if (!portrait) { g1.position.x = GAP; g2.position.x = -GAP; }
      else if (blades) { g1.position.z = -0.09; g2.position.z = 0.09; }
      else g1.position.y = LIFT + 0.09;
    }
    for (const [grp, p] of [[g1, a], [g2, b]]) {
      grp.traverse((o) => { if (o.isMesh) o.visible = !blades; });
      for (const x of p.blade) x.traverse((o) => { if (o.isMesh) o.visible = true; });
    }
    // marks and labels
    for (const c of [...marks.children]) { c.geometry.dispose(); marks.remove(c); }
    const lab = [];
    for (const [v, grp] of [['v1', g1], ['v2', g2]]) {
      if (!grp.visible) continue;
      const d = DIMS[v], { x: ox, y: oy, z: oz } = grp.position, name = v === 'v1' ? 'Version 1' : 'Version 2';
      if (blades) {
        ring(ox, d.bladeY + oy, -0.076 + oz);
        lab.push({ text: v === 'v1' ? 'Two teeth, 18 mm thick' : 'One tooth, 16 mm thick', p: [ox, d.bladeY + oy, -0.076 + oz + TIP_R + 0.012], plain: true });
        lab.push({ text: `${name}: 112 mm swing`, p: [ox, d.bladeY + oy, -0.076 + oz - TIP_R - 0.012], plain: true });
        continue;
      }
      // seen from the front, +X is on the left of the screen
      const side = mode === 'both' && !portrait ? (v === 'v1' ? 1 : -1) : portrait ? -1 : 1;
      const labSide = mode === 'both' && !portrait ? (v === 'v1' ? 'l' : 'r') : portrait ? 'l' : 'r';
      const x = ox + side * 0.112, z = -0.045 + oz, y0 = d.bot + oy, y1 = d.top + oy, tk = 0.006 * side;
      seg([[x, y0, z], [x, y1, z]]);
      seg([[x - tk, y0, z], [x + tk, y0, z]]); seg([[x - tk, y1, z], [x + tk, y1, z]]);
      lab.push({ text: d.stack, p: [x + (labSide === 'l' ? 0.004 : -0.004), (y0 + y1) / 2, z], side: labSide });
      // how far the outer wheel stands past the top plate
      const wx = ox + side * 0.0711, wz = -0.03 + oz, wy = WHEEL_TOP + oy;
      seg([[wx, y1, wz], [wx, wy, wz]]);
      seg([[wx - 0.012, y1, wz], [wx + 0.012, y1, wz]]); seg([[wx - 0.006, wy, wz], [wx + 0.006, wy, wz]]);
      lab.push({ text: `Wheel +${d.proud}`, p: [wx, wy + 0.012, wz], plain: true });
      lab.push({ text: v === 'v1' ? 'Version 1 (CAD only)' : 'Version 2 (built)', p: [ox, oy - LIFT, -0.13 + oz], plain: true });
    }
    labels.set(lab);
    stage.fitGround();
    frame();
  }
  function frame() {
    const objs = show === 'blades' ? [...(g1.visible ? a.blade : []), ...(g2.visible ? b.blade : [])] : [g1.visible && g1, g2.visible && g2].filter(Boolean);
    const portrait = isPortrait();
    if (show === 'blades') stage.frame(objs, { azimuth: 0, elevation: 88, pad: 1.45, refresh: true });
    else if (mode === 'both') stage.frame(objs, { azimuth: 172, elevation: 10, pad: portrait ? 1.3 : 1.22, refresh: true });
    else stage.frame(objs, { azimuth: 145, elevation: 22, pad: 1.3, refresh: true });
    sync();
  }
  const sync = () => labels.update(stage.camera);
  stage.controls?.addEventListener('change', sync);
  const ro = new ResizeObserver(() => requestAnimationFrame(() => { if (isPortrait() !== wasPortrait) layout(); else sync(); }));
  ro.observe(el);

  // ------------------------------------------------------------ controls
  segmented(ctx.panel, { label: 'Version', options: [{ value: 'v1', label: 'Version 1' }, { value: 'v2', label: 'Version 2' }, { value: 'both', label: 'Both' }], value: mode,
    onChange: (v) => { mode = v; layout(); } });
  segmented(ctx.panel, { label: 'Show', options: [{ value: 'robot', label: 'Robot' }, { value: 'blades', label: 'Blades only' }], value: show,
    onChange: (v) => { show = v; layout(); } });
  const stepBtn = button(ctx.panel, { label: 'What changed (1 of 4)', onClick: () => {
    restore?.(); restore = null;
    stepI = stepI + 1 >= STEPS.length ? -1 : stepI + 1;
    if (stepI >= 0) {
      const s = STEPS[stepI];
      if (s.h === 'Blade' && show !== 'blades') { /* blades read fine in the robot view too */ }
      restore = stage.highlight(s.parts(a, b), '#ff6b35', { intensity: 0.55 });
      note.innerHTML = '';
      const strong = document.createElement('strong'); strong.textContent = `${s.h}. `;
      note.append(strong, document.createTextNode(s.t));
    } else note.textContent = 'Step through the four changes, or turn the models to compare them.';
    stepBtn.textContent = stepI + 1 >= STEPS.length ? 'Clear' : `What changed (${stepI + 2} of 4)`;
  } });
  const cols = document.createElement('div');
  cols.style.cssText = 'display:flex;flex-wrap:wrap;gap:14px 28px;flex-basis:100%';
  const rows = [
    { key: 'stack', label: 'Plate to plate' }, { key: 'proud', label: 'Wheels past each plate' }, { key: 'frame', label: 'Frame parts' },
    { key: 'fast', label: 'Screws, nuts' }, { key: 'blade', label: 'Blade' },
  ];
  const ro1 = readout(cols, { title: 'Version 1 (CAD only)', rows });
  const ro2 = readout(cols, { title: 'Version 2 (built)', rows });
  ro1.set({ stack: '48.0 mm', proud: '4.6 mm', frame: '5', fast: '22, 14', blade: '2 teeth, 18 mm' });
  ro2.set({ stack: '37.2 mm', proud: '10.0 mm', frame: '1 (TPU)', fast: '12, 4', blade: '1 tooth, 16 mm' });
  const note = document.createElement('p');
  note.className = 'rx-cap';
  note.style.cssText = 'flex-basis:100%;margin:0;min-height:2.9em';
  note.textContent = 'Step through the four changes, or turn the models to compare them.';
  note.setAttribute('aria-live', 'polite');
  ctx.panel.append(note, cols);

  layout();
  requestAnimationFrame(sync);
  return { dispose() { ro.disconnect(); labels.dispose(); for (const c of marks.children) c.geometry.dispose(); stage.dispose(); } };
}
