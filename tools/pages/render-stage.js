// Stand-in for /assets/js/lib/stage.js inside tools/pages/render.html only (the render page's
// import map points that URL here). It is the real stage (imported under another URL, so the map
// does not send it back here) with the render's options laid over every createStage call, so a
// page's own scrolly module renders at the render's pixel ratio, with ambient occlusion, and so on.
// Every stage made is kept in globalThis.__stages for render.html to finish the picture.
import { createStage as realCreateStage } from '/assets/js/lib/stage.js?render';
export * from '/assets/js/lib/stage.js?render';

export function createStage(el, opts = {}) {
  const o = { ...opts, ...(globalThis.__renderOpts || {}) };
  const stage = realCreateStage(el, o);
  // a finer, softer key shadow than the pages use; set before the stage's first frame draws its map
  const key = stage.lights.key;
  if (o.shadowMapSize) key.shadow.mapSize.set(o.shadowMapSize, o.shadowMapSize);
  if (o.shadowRadius) key.shadow.radius = o.shadowRadius;
  (globalThis.__stages ||= []).push(stage);
  return stage;
}
