// Demo: the telescoping arm. The carriage runs out along the real slide direction (-Z of the
// turntable); each SAR340 slide's three members and two ball rows move at their own rates.
// "Cut the slides" puts a horizontal section plane through the upper ball rows (y 41 mm in the
// CAD) and looks down on the right-hand slide, so the members and balls show in section.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, segmented } from '/assets/js/lib/ui.js';
import { loadRig, STROKE, EXT_PITCH_R } from './rig.js';

export async function mount(el, ctx) {
  const stage = createStage(el);
  const rig = await loadRig(stage);
  const { P } = rig;
  // the arm alone: everything below and behind it is hidden
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'STOCK', 'UNO', 'PERF', 'PI', 'PSU', 'TERM', 'BUCK', 'MOS1', 'MOS2', 'BAY_L', 'BAY_R',
    'BASE', 'NEMA23', 'TPUL', 'BELT', 'MIDPLATE', 'RING', 'THR_UP', 'THR_LO', 'MR106']) P[n].visible = false;
  const arm = [P.ROT, P.EXT, P.MAG];

  // the whole arm at full reach, framed once so the view does not jump as it moves
  rig.set({ s: STROKE }); rig.turret.updateMatrixWorld(true);
  const whole = stage.frame(arm, { azimuth: 68, elevation: 28, pad: 1.02, apply: false, refresh: true });
  rig.set({ s: 0 });
  stage.setView(whole);

  const cut = stage.sectionPlane([0, -1, 0], 0.041); // keeps y <= 41 mm: through the upper ball rows
  cut.enable(false);
  // in section the camera follows the two ball rows (their centres sit at z 79.5 mm - 0.75 s and
  // 79.5 mm - 0.25 s), looking down from outside the right-hand slide
  let mode = 'whole';
  const T = stage.THREE;
  const closeView = (s) => {
    const target = new T.Vector3(0.123, 0.041, 0.0795 - 0.5 * s);
    return { pos: target.clone().add(new T.Vector3(0.07, 0.17, 0.0)), target };
  };

  const info = readout(null, { rows: [
    { key: 'c', label: 'Carriage, inner member', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 'm', label: 'Middle member', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 'bi', label: 'Inner ball row', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 'bo', label: 'Outer ball row', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 't', label: 'Motor turns (80 T in CAD)', format: (v) => v.toFixed(2) },
  ] });
  const set = (mm) => {
    const s = mm / 1000;
    rig.set({ s });
    if (mode === 'cut' && !tweening) stage.setView(closeView(s));
    info.set({ c: mm, m: mm / 2, bi: 0.75 * mm, bo: 0.25 * mm, t: s / (2 * Math.PI * EXT_PITCH_R) });
  };
  const s = slider(ctx.panel, { label: 'Reach', min: 0, max: 355, step: 1, value: 0, unit: ' mm', format: (v) => v.toFixed(0), onInput: set });

  let stop = null, dir = 1, tweening = false;
  playToggle(ctx.panel, {
    playing: false,
    onChange(on) {
      stop?.(); stop = null;
      if (!on) return;
      stop = stage.onFrame((dt) => {
        let v = s.value + dir * dt * 150; // 150 mm/s, illustrative
        if (v >= 355) { v = 355; dir = -1; } else if (v <= 0) { v = 0; dir = 1; }
        s.set(v);
      });
    },
  });
  segmented(ctx.panel, {
    label: 'View', value: 'whole',
    options: [{ value: 'whole', label: 'Whole arm' }, { value: 'cut', label: 'Cut the slides' }],
    onChange(v) {
      mode = v;
      cut.enable(v === 'cut');
      tweening = true;
      stage.tweenCamera(v === 'cut' ? closeView(s.value / 1000) : whole, 0.9).then(() => { tweening = false; });
    },
  });
  ctx.panel.append(info.el);
  set(0);
  return { dispose() { stop?.(); stage.dispose(); } };
}
