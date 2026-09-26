// Built-in demo "@viewer": an orbitable CAD model, with a version switcher when there are
// several. Use it from a page module without writing any JavaScript:
//   { type: 'demo', id: 'cad', module: '@viewer', h: 'The CAD', data: {
//       models: [{ label: 'V1', src: '/assets/models/<slug>/v1.glb' }, { label: 'V2', src: '/assets/models/<slug>/v2.glb' }],
//       azimuth: 35, elevation: 22, label: 'Version' } }
// data.src (one model) works too. Each version loads the first time it is picked.
import { createStage } from '../stage.js';
import { segmented } from '../ui.js';

export async function mount(el, ctx) {
  const d = ctx.data || {};
  const models = d.models || (d.src ? [{ src: d.src, label: d.label || 'Model' }] : []);
  if (!models.length) throw new Error('@viewer needs data.models or data.src');
  const stage = createStage(el, { controls: true, ao: d.ao });
  const loaded = new Map();
  let current = -1, req = 0;
  async function show(i, first = false) {
    const token = ++req;
    const m = models[i];
    let obj = loaded.get(i);
    if (!obj) { obj = await stage.load(m.src, { add: false }); loaded.set(i, obj); }
    if (token !== req) return; // a newer pick won
    if (current >= 0) stage.root.remove(loaded.get(current));
    stage.root.add(obj);
    current = i;
    stage.fitGround();
    stage.frame(obj, { azimuth: m.azimuth ?? d.azimuth, elevation: m.elevation ?? d.elevation, pad: m.pad ?? d.pad, duration: first ? 0 : 0.7 });
  }
  if (models.length > 1) {
    segmented(ctx.panel, { label: d.label || 'Version', options: models.map((m, i) => ({ value: i, label: m.label || `V${i + 1}` })), value: 0, onChange: (i) => show(i).catch((e) => console.error(e)) });
  }
  await show(0, true);
  return {
    dispose() {
      for (const o of loaded.values()) if (!o.parent) stage.root.add(o); // so dispose() frees every version
      stage.dispose();
    },
  };
}
