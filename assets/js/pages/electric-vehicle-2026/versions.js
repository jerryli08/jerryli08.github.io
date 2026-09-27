// Both versions of the car from my CAD, orbitable, with a version switcher. The same as the
// built-in @viewer, plus straighten() (bake.js) so each model sits on its shadow and fills the
// frame. Version 2 (the final car) shows first; version 1 loads the first time it is picked.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented } from '/assets/js/lib/ui.js';
import { straighten } from './bake.js';

const M = '/assets/models/electric-vehicle-2026';
const VERSIONS = [
  { label: 'Version 2: caliper steering', src: `${M}/v2-caliper.glb`, azimuth: 344, elevation: 24, pad: 1.04 },
  { label: 'Version 1: servo steering', src: `${M}/v1-servo.glb`, azimuth: 330, elevation: 24, pad: 1.1 },
];

export async function mount(el, ctx) {
  const stage = createStage(el);
  const loaded = new Map();
  let cur = null, req = 0;
  async function show(i, first = false) {
    const token = ++req, v = VERSIONS[i];
    if (!loaded.has(i)) {
      const m = await stage.load(v.src, { add: false });
      straighten(m, stage.THREE);
      loaded.set(i, m);
    }
    if (token !== req) return; // a newer pick won
    if (cur) stage.root.remove(cur);
    cur = loaded.get(i);
    stage.root.add(cur);
    stage.fitGround();
    stage.frame(cur, { azimuth: v.azimuth, elevation: v.elevation, pad: v.pad, duration: first ? 0 : 0.7, refresh: true });
  }
  segmented(ctx.panel, {
    label: 'Version', value: 0,
    options: VERSIONS.map((v, i) => ({ value: i, label: v.label })),
    onChange: (i) => show(i).catch((e) => console.error(e)),
  });
  await show(0, true);
  return {
    dispose() {
      for (const m of loaded.values()) if (!m.parent) stage.root.add(m); // so dispose() frees every version
      stage.dispose();
    },
  };
}
