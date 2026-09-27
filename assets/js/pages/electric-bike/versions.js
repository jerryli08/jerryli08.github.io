// The two CAD versions, orbitable, with the chain idler change picked out. V1 is the initial CAD
// ("initial version w alu mounted idler"); V2 is the full assembly as built. Diffing every part's
// position between the two files shows that only the chain idler area changed:
//   V1: two 11T jockey wheels at (-5.1, -182.1) and (45.9, -153.2) mm, 47.5 mm to the drive side
//       of the frame's center plane, each on a 91273A403 shoulder screw with a 4 mm spacer. The
//       screws thread into a flange of "seat tube mount (1)", the bent aluminum bracket along the
//       seat tube (the flange sits at 34.7 to 39.5 mm, measured on the mesh around each screw).
//       Jerry: that flange, bent from a flat pattern on a press brake, bent out of shape under the
//       drive's power (about 6 kW).
//   V2: one jockey, the one at (45.9, -153.2), 4 mm further out (51.5 mm), carried from outboard by a
//       tall "polycarb idler mount 3dp"; a "polycarb battery plate adapter" is added and the
//       drive-side battery plate moves out 6 mm to make room. V2 also adds a rough frame mockup
//       (hidden here so the two match).
import { createStage } from '/assets/js/lib/stage.js';
import { segmented, readout } from '/assets/js/lib/ui.js';
import { MODEL, MODEL_V1, liftBlacks } from './bike.js';

// the part that carries the jockey wheel(s) in each version
const MOUNTS = { v1: /seat_tube_mount/, v2: /polycarb_idler_mount/ };
const INFO = {
  v1: { jockeys: '2', offset: '47.5 mm', mount: 'Press-brake flange on the aluminum seat tube bracket' },
  v2: { jockeys: '1', offset: '51.5 mm', mount: 'Tall 3D-printed polycarbonate mount' },
};

export async function mount(el, ctx) {
  const stage = createStage(el);
  const models = {};
  let which = 'v2', focus = 'idler', busy = null;

  async function get(v) {
    if (models[v]) return models[v];
    const m = await stage.load(v === 'v1' ? MODEL_V1 : MODEL);
    liftBlacks(m);
    for (const f of stage.part(/rough_bike_frame_mockup/, m)) f.visible = false;
    const mount = stage.part(MOUNTS[v], m);
    const jockeys = stage.part(/Jockey_Wheel/, m);
    stage.highlight(mount, '#ff6b35', { intensity: 0.6 });
    stage.highlight(jockeys, '#3d8bff', { intensity: 0.35 });
    // the printed mount sits outboard of its jockey; see-through, it shows the jockey it carries
    const ghost = (on) => {
      if (v !== 'v2') return;
      for (const p of mount) p.traverse((o) => {
        if (!o.isMesh) return;
        for (const mt of [].concat(o.material)) {
          if (mt.transparent !== on) { mt.transparent = on; mt.needsUpdate = true; }
          mt.opacity = on ? 0.28 : 1; mt.depthWrite = !on;
          if (mt.emissive) mt.emissiveIntensity = on ? 0.35 : 0.6;
        }
      });
      stage.invalidate();
    };
    models[v] = { m, mount, jockeys, ghost };
    return models[v];
  }

  const info = readout(null, { rows: [
    { key: 'jockeys', label: 'Jockey wheels' },
    { key: 'offset', label: 'Jockey, out from the frame center' },
    { key: 'mount', label: 'Held by' },
  ] });

  async function show(v, animate) {
    which = v;
    const job = (busy = get(v));
    await job;
    if (busy !== job) return; // a newer pick won
    for (const [k, x] of Object.entries(models)) x.m.visible = k === v;
    info.set(INFO[v]);
    frame(animate);
  }
  function frame(animate) {
    const cur = models[which];
    if (!cur) return;
    const d = animate ? 0.8 : 0;
    cur.ghost(focus === 'idler');
    // from the drive side, a little behind and below the jockeys: V1's two jockeys, V2's jockey
    // with the whole tall mount that carries it
    if (focus === 'idler') {
      if (which === 'v1') stage.frame(cur.jockeys, { dir: [0.45, -0.3, -1], pad: 2.3, duration: d });
      else stage.frame([...cur.jockeys, ...cur.mount], { dir: [0.45, -0.3, -1], pad: 1.2, duration: d });
    }
    else stage.frame(cur.m, { azimuth: 200, elevation: 16, pad: 1.05, duration: d });
  }

  segmented(ctx.panel, {
    label: 'Version', value: 'v2',
    options: [{ value: 'v1', label: 'V1: two jockeys' }, { value: 'v2', label: 'V2, as built: one jockey' }],
    onChange: (v) => show(v, true),
  });
  segmented(ctx.panel, {
    label: 'Look at', value: 'idler',
    options: [{ value: 'idler', label: 'Chain idler' }, { value: 'all', label: 'Whole unit' }],
    onChange: (v) => { focus = v; frame(true); },
  });
  ctx.panel.append(info.el);
  await show('v2', false);
  return { dispose() { stage.dispose(); } };
}
