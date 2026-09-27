// Demo: the February 2024 rail concept next to the final arm, both from my CAD, run through the
// same reach. Concept (replac3d_original_mgn_rail_concept): two MGN12 rails, 450 mm, with one
// carriage block each; the magnet plate is bolted to the blocks at its back end, so the blocks
// and plate travel 405 mm along the rails (-Z), which puts the magnets over the target plate.
// Final: the carriage on two three-member telescoping slides, 355 mm.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout } from '/assets/js/lib/ui.js';
import { loadRig, STROKE, labels } from './rig.js';

const CONCEPT = '/assets/models/build-plate-robot/concept.glb';
const C_STROKE = 0.405;   // m: blocks from z 687 to 282 mm, the front end of the rails
const C_SHIFT = [-0.42, 0, -0.402]; // place the concept beside the final arm, rail fronts level with the frame front

export async function mount(el, ctx) {
  const stage = createStage(el);
  const T = stage.THREE;
  const rig = await loadRig(stage);
  const { P } = rig;
  for (const n of ['PRINTER', 'HOLDERS', 'PLATE_L', 'PLATE_R', 'PLATE_C', 'UNO', 'PERF', 'PI', 'PSU', 'TERM', 'BUCK', 'MOS1', 'MOS2', 'BAY_L', 'BAY_R', 'BASE', 'NEMA23', 'TPUL', 'BELT', 'MIDPLATE', 'RING', 'THR_UP', 'THR_LO', 'MR106']) P[n].visible = false;
  // the stock plate stays: it marks the printer plate the final arm reaches

  const concept = await stage.load(CONCEPT);
  concept.position.set(...C_SHIFT);
  concept.updateMatrixWorld(true);
  const moving = stage.part(/_G_MOVE$/, concept);   // the magnet plate and both carriage blocks
  const carried = stage.part(/_G_CARRIED$/, concept); // the plate under the magnets
  carried.forEach((o) => { o.visible = false; });
  const slideC = new T.Group();
  concept.add(slideC);
  for (const o of moving) slideC.attach(o);
  stage.fitGround();

  // both at full reach, framed from the side
  const all = [concept, P.ROT, P.EXT, P.STOCK];
  rig.set({ s: STROKE }); slideC.position.z = -C_STROKE; rig.turret.updateMatrixWorld(true); concept.updateMatrixWorld(true);
  const view = stage.frame(all, { azimuth: 38, elevation: 34, pad: 1.0, apply: false, refresh: true });
  stage.setView(view);

  const labs = labels(el);
  const place = () => {
    const bc = stage.bounds(concept, true).box, bf = stage.bounds([P.ROT], true).box;
    labs.set([
      { text: 'Feb 2024: MGN12 rails', p: new T.Vector3((bc.min.x + bc.max.x) / 2, bc.max.y, bc.max.z - 0.03), side: 'r' },
      { text: 'Final: telescoping slides', p: new T.Vector3(bf.max.x, bf.max.y, bf.max.z - 0.05), side: 'r' },
    ]);
    labs.update(stage.camera);
  };

  const info = readout(null, { rows: [
    { key: 'c', label: 'Concept reach', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 'co', label: 'Concept plate past the rail ends', unit: 'mm', format: (v) => v.toFixed(0) },
    { key: 'f', label: 'Final reach', unit: 'mm', format: (v) => v.toFixed(0) },
  ] });
  const set = (pct) => {
    const k = pct / 100;
    slideC.position.z = -C_STROKE * k;
    rig.set({ s: STROKE * k });
    // magnet plate front starts at z 284 mm, rail front at 282 mm
    info.set({ c: C_STROKE * k * 1000, co: Math.max(0, C_STROKE * k * 1000 - 2), f: STROKE * k * 1000 });
    stage.invalidate();
    labs.update(stage.camera);
  };
  const sl = slider(ctx.panel, { label: 'Reach', min: 0, max: 100, step: 1, value: 0, unit: '%', format: (v) => v.toFixed(0), onInput: set });
  let stop = null, dir = 1;
  playToggle(ctx.panel, {
    playing: false,
    onChange(on) {
      stop?.(); stop = null;
      if (!on) return;
      stop = stage.onFrame((dt) => {
        let v = sl.value + dir * dt * 40;
        if (v >= 100) { v = 100; dir = -1; } else if (v <= 0) { v = 0; dir = 1; }
        sl.set(v);
      });
    },
  });
  ctx.panel.append(info.el);
  stage.controls?.addEventListener('change', () => labs.update(stage.camera));
  const ro = new ResizeObserver(() => labs.update(stage.camera)); ro.observe(el);
  set(0);
  place();
  return { dispose() { stop?.(); ro.disconnect(); stage.dispose(); } };
}
