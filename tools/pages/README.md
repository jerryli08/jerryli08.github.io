# Rich project pages

Every project can have a rich page: videos and photos, interactive 3D from the real CAD,
scroll-driven animations, mechanism demos with sliders, an iteration timeline and a deep
technical write-up. A page is one data file plus, if it has demos, a folder of small modules.
Pages are written independently: **a page writer only touches their own files**.

| You write | What it is |
|---|---|
| `src/pages/<slug>.mjs` | the page: data only, no HTML |
| `assets/js/pages/<slug>/*.js` | the page's demo and scrolly modules (only if it has any) |
| `assets/media/<slug>/` | web media from `tools/ingest/cut.py`: `name.mp4` + `name.jpg` poster, `name.webp` + `name-s.webp` |
| `assets/models/<slug>/` | GLBs from `tools/cad/step2glb.py` then `tools/optimize-cad.mjs` |

Shared files (do not edit them for one page; ask for a framework change instead):
`tools/build.mjs`, `tools/rich.mjs`, `assets/js/project.js`, `assets/js/lib/stage.js`,
`assets/js/lib/ui.js`, `assets/js/lib/demos/*`, `assets/css/site.css`.

`src/pages/_example.mjs` uses every section type; preview it at `/projects/_example`.

## Quick start

1. Create `src/pages/<slug>.mjs` with `export default { summary, hero, sections: [...] }`. The slug
   must match the project in `src/projects.mjs`, which still supplies the title, dates, facts card,
   links and CAD link.
2. Put media in `assets/media/<slug>/` and refer to it by file name: `{ v: 'latch-test.mp4', c: 'Caption' }`.
3. For a 3D demo, add `assets/js/pages/<slug>/<name>.js` exporting `mount(el, ctx)` and a section
   `{ type: 'demo', id: 'latch', module: '<name>' }`. For plain CAD with version tabs use
   `module: '@viewer'` and write no JavaScript.
4. `PREVIEW=1 node tools/build.mjs`, then open `http://localhost:8123/projects/<slug>.html`
   (`python3 -m http.server 8123` from the repo root). Read the build's `! <slug>:` warnings.
5. Check it at 1440x900 and 390x844 (see Checking) before handing it in.

No page module means the project keeps its simple page. A module that fails to import or render
is reported and the project falls back to the simple page, so a broken page never breaks the build.
Pages whose file name starts with `_` are built in preview only, at `/projects/_name`, and take their
title and facts from a `meta: { title, subtitle, short, org, role, tools, links }` object.

## The page module

```js
// src/pages/electric-bike.mjs
export default {
  summary: {                                   // optional; shown under the title
    stats: [{ v: '5.3 kW', l: 'Mid-drive' }],  // replaces the project's stats row
    text: ['Two or three sentences a reader needs before scrolling.'],  // beside the facts card
  },
  hero: { layout: 'row', items: [{ v: 'riding.mp4', c: 'Riding' }, { v: 'max-speed.mp4', c: 'Max speed test' }] },
  sections: [
    { type: 'prose', h: 'Why a mid-drive', p: ['First paragraph.', 'Second paragraph.'] },
    { type: 'media', layout: 'grid', items: [{ i: 'parts.webp', c: 'Custom parts' }] },
    { type: 'demo', id: 'belt', module: 'belt', h: 'Two belt stages', p: ['...'], aside: 'left' },
  ],
  assets: ['/assets/models/hybrid-vehicle/'],  // optional: other folders or files your modules load
};
```

`hero` is optional: without it the page shows the project's first `media` item; `hero: null` shows none.
`layout: 'row'` puts several items side by side at one height; `'single'` shows one large item.

### Sections

| type | fields |
|---|---|
| `prose` | `h`, `p` |
| `media` | `layout: 'grid' \| 'row' \| 'wide' \| 'collage'`, `items`, `h?`, `p?`, `cols?: 3` (grid only) |
| `demo` | `id`, `module`, `h?`, `p?`, `caption?`, `height?`, `poster?`, `aside?: 'left' \| 'right'`, `data?`, `webgl?: false` (a 2D demo that must not wait for WebGL) |
| `scrolly` | `id`, `module`, `steps: [{ h, p }]`, `h?`, `p?`, `stepHeight?` (default `'80vh'`), `poster?`, `data?` |
| `split` | `items: [{ h, p, module? \| media?, data?, height?, poster?, caption?, id? }]`, `h?` |
| `iterations` | `items: [{ label, title, p, media: [...] }]`, `h?` |
| `callout` | `h`, `p` |
| `stats` | `items: [{ v, l }]`, `h?` |

Every section may have an `id` (a letter, then letters, digits, `-` or `_`) for linking (`#id`). Demo and scrolly ids
should be set and unique on the page. Unknown types and bad fields are build warnings; in preview
builds the broken section shows a yellow box, in production it is left out.

- **media layouts.** `grid`: two columns (`cols: 3` for three) of 4:3 tiles, cropped to fill; put
  `tall: true` on a portrait item to span two rows. `row`: one line of items at the same height,
  nothing cropped; on a phone a row of wide items stacks. `wide`: each item full width. `collage`:
  small prints as tilted photo cards. Photos open in a lightbox (arrows, Esc, swipe).
- **demo** `height` is any CSS length (default about 62% of the screen). `aside: 'left'` puts the
  `h` and `p` to the left of the canvas, `'right'` to the right; on a phone the text comes first.
  `poster` is an image shown until the demo is live and kept if it fails (use one: a still of the model).
- **scrolly** is a sticky full-width stage; the step cards scroll over its left side (the bottom on a
  phone). The module gets the section's scroll progress.
- **split** rows alternate sides; each has a demo (`module`) or `media` (one item, or an array for a row).

### Text

`h`, `p`, captions, labels and stats accept `**bold**`, `*italic*`, `` `code` `` and `[label](url)`
(http(s), `/path` or `#anchor` only). Everything else is escaped, so write plain characters (`<`, `&`).
`p` is a string or an array; each entry is a paragraph, or one of:

```js
{ h: 'Subheading' }
{ ul: ['item', 'item'] }            { ol: ['step', 'step'] }
{ table: { head: ['Part', 'Material'], rows: [['...', '...']], caption: 'Optional caption' } }
{ quote: 'Words someone said', by: 'Who' }
{ note: 'Small muted text: sources, caveats' }
{ pre: 'Preformatted text, such as a formula or code' }
```

**Copy uses only facts Jerry has stated.** No invented numbers, dates, placements or reasons.
Numbers a demo computes from the CAD (a wheel radius, a gear ratio from tooth counts) are fine; say so.

### Media

`v` is a video, `i` a photo. A bare file name resolves to `assets/media/<slug>/`; an absolute
`/assets/...` path is used as is. Videos need their `name.jpg` poster next to them; photos use
`name-s.webp` (800 px) for small screens when it exists. Give every item a caption `c` (it is also
the alt text; override with `alt`). Videos are muted loops that load and play only while on screen;
with reduced motion or data saver they show controls instead. Missing files are build warnings.

## Demo modules

A demo, split module or scrolly points at `assets/js/pages/<slug>/<module>.js` (`module: 'belt'`),
an absolute path, or a built-in (`'@viewer'`). The page imports it when the block comes within
about 400 px of the screen and calls:

```js
export async function mount(el, ctx) {   // may be async
  // el: the block's stage, already sized. Put the canvas in it (createStage does).
  return { dispose() {}, setProgress(p, step, stepP) {} };   // both optional
}
```

`ctx`:

| field | |
|---|---|
| `panel` | element under the canvas for controls (`null` in a scrolly) |
| `data` | the section's `data` object, as JSON |
| `asset(path)` | content-hashed URL for any `/assets/...` path (`stage.load` does this for you) |
| `reducedMotion` | true when the reader asked for less motion: never start animations yourself |
| `isTouch` | phone or tablet |
| `id`, `slug`, `kind` | block id, page slug, `'demo'` or `'scrolly'` |

Lifecycle: the poster shows until `mount` resolves; if WebGL is off, the import fails or `mount`
throws, the poster stays with a short note and anything the module added is removed. Only about six
WebGL canvases can live at once, so a live demo far off screen may be unmounted (`dispose()`) and
mounted again when the reader comes back: keep state you care about in the module, not the DOM.
A stage made by `createStage` is freed automatically on unmount even without `dispose`, but
return `dispose()` anyway if you start anything else (timers, listeners on `window`).

Scrolly: `setProgress(p, step, stepP)` is called every frame the scroll moves: `p` is 0 at the
top of the section and 1 at the end, `step` is the active step index, `stepP` is 0..1 through that
step. Make the picture a pure function of these (so scrolling back works) and do not animate on
your own.

Import shared code by absolute path, exactly like this: the page's import map turns these into
content-hashed URLs, so an updated module is never served stale from the month-long cache.

```js
import { createStage, cad } from '/assets/js/lib/stage.js';
import { slider, playToggle, readout, segmented, button } from '/assets/js/lib/ui.js';
import * as THREE from 'three';                       // if you need more than stage.THREE
import { Something } from 'three/addons/...';          // only files vendored in assets/vendor/addons/
import { helper } from './helper.js';                 // your own files in the same folder
```

### Complete minimal demo

A GLB loaded, one part rotated about its real axis by a slider:

```js
// assets/js/pages/hybrid-vehicle/latch.js     section: { type: 'demo', id: 'latch', module: 'latch', poster: 'latch.webp' }
import { createStage, cad } from '/assets/js/lib/stage.js';
import { slider } from '/assets/js/lib/ui.js';

export async function mount(el, ctx) {
  const stage = createStage(el);
  const model = await stage.load('/assets/models/rover.glb');
  stage.frame(model, { azimuth: 60, elevation: 25 });

  // The latch's servo gear, by its CAD name. Its pin axis, from tools/cad-axes.py on the STEP,
  // runs along STEP X at y = 86.7 mm, z = -111.05 mm (millimetres, Z up); cad.point / cad.dir
  // convert STEP coordinates to the model's metres, Y up.
  const gear = stage.part(/Spur_Gear/);
  const axle = stage.pivot(gear, cad.point([417, 86.7, -111.05]), cad.dir([1, 0, 0]));

  slider(ctx.panel, {
    label: 'Servo', min: 0, max: 90, value: 0, unit: '°',
    onInput: (deg) => axle.setAngle((deg * Math.PI) / 180),
  });
  return { dispose: () => stage.dispose() };
}
```

(This is the axis `assets/js/world.js` rigs the same gear on.) `setAngle` redraws by itself.
For something that moves continuously, register `stage.onFrame(fn)` and remove it when done:

```js
const stop = stage.onFrame((dt) => axle.setAngle(axle.angle + dt));  // renders every frame while registered
stop();
```

### Scrolly module

```js
// assets/js/pages/<slug>/cutaway.js      section: { type: 'scrolly', id: 'cutaway', module: 'cutaway', steps: [...] }
import { createStage } from '/assets/js/lib/stage.js';
export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });   // the scroll drives the camera
  const model = await stage.load('/assets/models/<slug>/assembly.glb');
  const { box } = stage.bounds(model);
  const cut = stage.sectionPlane([-1, 0, 0], box.max.x + 0.01);   // parked just outside: nothing cut yet
  function setProgress(p, step) {
    const portrait = el.clientHeight > el.clientWidth;
    stage.setShift(portrait ? 0 : 0.14, portrait ? 0.18 : 0);   // clear of the step cards
    stage.frame(model, { azimuth: 30 + 300 * p, elevation: 20 });
    cut.set(box.max.x - (box.max.x - box.min.x) * 0.5 * Math.min(1, p * 2));
  }
  setProgress(0, 0);
  return { setProgress, dispose: () => stage.dispose() };
}
```

`assets/js/pages/_example/section.js` is a fuller one (orbit, cut, zoom onto a sub-assembly, highlight).

## `stage.js`

`createStage(el, opts)` fills `el` with a canvas and returns the stage. It renders only while on
screen and only when something changed; you never call render yourself.

| opts | default | |
|---|---|---|
| `controls` | `true` | drag to orbit; pinch or ctrl/cmd + wheel zooms (a plain wheel scrolls the page); on touch, vertical swipes scroll the page. `false` for scroll-driven stages |
| `background` | `'transparent'` | or a CSS colour |
| `shadow` | `true` | soft shadow on an invisible ground under the models |
| `hint` | auto | the "Drag to rotate" chip text, or `false` |
| `fov` | `32` | vertical field of view, degrees |
| `exposure` | `1` | tone mapping exposure |
| `ao` | `false` | ambient occlusion (desktop only; heavier) |
| `pixelRatio` | `1.75` | cap on device pixel ratio |

| member | |
|---|---|
| `await load(url, { add, pbr, shadows })` | loads a GLB (meshopt, hashed URL), adds it to `stage.root`, gives STEP colours real finishes (aluminium, PCB, carbon, printed plastic, rubber for parts named wheel/tire) and returns its scene. `add: false` to add it yourself, `pbr: false` to keep the file's materials |
| `part(regex, within?)` | top-most nodes whose name matches (a mesh, or a group for a multi-material part). Moving parts keep their CAD names (`anim_<kind>_<n>_<Name>`, see the `KEEP` list in `tools/optimize-cad.mjs`); static parts are merged and unnamed |
| `pivot(parts, point, dir)` | a `Group` that turns the parts about an axis: `point` and `dir` in the model's frame (metres, Y up), or `point: 'center'` for the parts' bounding-box centre (only for parts round about the axis, like wheels and gears). Returns the group with `setAngle(rad)`, `.angle`, `.axis` |
| `frame(obj?, { azimuth, elevation, dir, pad, offset, duration, apply })` | fits `obj` (an object, an array of parts, or all models) in view. `azimuth` 0 looks from +Z, 90 from +X (degrees). `duration` > 0 animates; `apply: false` only returns `{ pos, target }` |
| `setView({ pos, target })` / `tweenCamera(view, seconds)` | place the camera now / animate it (orbiting the target); reduced motion jumps |
| `setShift(fx, fy)` | move the picture on the canvas (fractions; +y up) without moving the camera, e.g. clear of text cards |
| `sectionPlane(normal, constant)` | a cut through all models, in world metres: keeps points where `dot(normal, p) + constant >= 0` (normal `[-1, 0, 0]`, constant `0.3` keeps x ≤ 0.3). Cut faces get a hatched cap. Returns `{ plane, set(constant), setNormal(n), enable(bool), remove() }` |
| `highlight(parts, color = '#ff6b35', { intensity })` | tints parts; returns a function that restores them |
| `onFrame(fn(dt, t))` | per-frame callback while on screen; returns a remover. Nothing else animates |
| `bounds(obj?)` | `{ box, center, radius }` (cached per object) |
| `fitGround()` | re-fit the ground, shadow and zoom limits to the models; call it after adding or removing a model yourself (`load` does it) |
| `invalidate()` | ask for a redraw after changing the scene yourself (pivots, sections, frame and highlight do it for you) |
| `setCapColor(a, b)` | colours of the section hatch |
| `dispose()` | frees every GPU buffer and removes the canvas |
| `THREE`, `scene`, `camera`, `renderer`, `controls`, `root`, `ground`, `light`, `canvas`, `el` | the underlying objects |

Also exported: `cad.point([x, y, z])` and `cad.dir([x, y, z])` (STEP millimetres, Z up, to model
metres, Y up) and `assetUrl(path)`.

## `ui.js`

Each takes a parent element (usually `ctx.panel`; `null` to place it yourself via `.el`) and options.

| | options | returns |
|---|---|---|
| `slider(parent, o)` | `label, min, max, step, value, unit, format(v), onInput(v)` | `{ el, input, value, set(v, { silent }) }` |
| `playToggle(parent, o)` | `playing, onChange(playing), labels: ['Play', 'Pause']` | `{ el, playing, set(on, { silent }) }` |
| `readout(parent, o)` | `title?, rows: [{ key, label, unit, format, value }]` | `{ el, set({ key: value }) }` |
| `segmented(parent, o)` | `label?, options: [{ value, label }], value, onChange(v)` | `{ el, value, set(v, { silent }) }` |
| `button(parent, o)` | `label, onClick` | the button |

Start with `playing: false`: nothing on a page moves until the reader asks.

## Built-in `@viewer`

Orbitable CAD, with version tabs when there are several (each loads when first picked):

```js
{ type: 'demo', id: 'cad', module: '@viewer', h: 'The CAD', poster: 'cad.webp', data: {
  models: [{ label: 'V1', src: '/assets/models/<slug>/v1.glb' }, { label: 'V2', src: '/assets/models/<slug>/v2.glb' }],
  azimuth: 35, elevation: 22, label: 'Version' } }
```

`data.src` for a single model. Per model: `azimuth`, `elevation`, `pad`.

## CAD rules

- Jerry's real CAD only, shapes unchanged. Simplifying means dropping screws or PCBs, nothing more.
  No stand-in models: if a project has no CAD, say so instead of modelling it.
- Motion follows real axes. Get pin and bore axes from the STEP with
  `python3 tools/cad-axes.py file.step "PartName"` and convert with `cad.point` / `cad.dir`.
  `'center'` is only for parts that are round about their axis.
- Keep a part separate (so it can move) by adding it to the `KEEP` list when running
  `tools/optimize-cad.mjs`; everything else is merged by material.
- Models must stay small: meshopt-compressed GLBs, a few MB at most per page.

## Checking

- `PREVIEW=1 node tools/build.mjs` must print no `! <slug>:` warnings for your page.
- Screenshot desktop and phone, section by section, and look at every image:
  `node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug>` and
  `node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug>-phone 390 844`.
  It also prints console errors, missing files, blocks that did not go live, and sideways scrolling.
  (Software WebGL is slow here: a page with several demos takes a few minutes.)
- No horizontal scrolling at 390 px, captions on every item, nothing moving on its own with
  reduced motion, and the poster looks right if the 3D never loads.
