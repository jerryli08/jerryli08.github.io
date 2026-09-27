# Rich project pages

Every project can have a rich page: videos and photos, 3D from the real CAD, scroll-driven
animations of the mechanisms, an iteration story and a deep technical write-up. A page is one data
file plus, if it has animations, a folder of small modules.
Pages are written independently: **a page writer only touches their own files**.

## Jerry's rules for every page (Sept 26, 2026)

- **Every animation is a scrolly, driven only by the scroll.** The reader scrolls and the mechanism
  actuates. No sliders, buttons, drag handles, text boxes or play toggles unless Jerry asks for one.
  Nothing animates on its own. `setProgress(p, step, stepP)` must be a pure function of those three
  numbers (scrolling back plays it backwards).
- **Big.** Scrollies are `width: 'full'` (the whole screen, text cards over the left) or
  `width: 'wide'` (about three quarters, text beside it). Alternate them down a page.
- **Pictures spread evenly through the text.** No stretch of text longer than about a screen without
  a picture: give prose sections `media: [...]` (pictures beside the runs of text) or put a media
  section between. The build warns when a page breaks this.
- **Use the space, comfortably.** Text sits in the centred reading column or beside a picture, never
  crammed to one side of an empty screen. Do not crowd: one idea per step card.
- **Never re-frame the camera on moving parts every frame.** Frame each view once with the mechanism
  at rest (`stage.frame(..., { apply: false })`, cached), then blend between cached views. Framing a
  moving part's bounds makes the picture shake.
- Scroll step text is 22 px (1.4x, set in site.css); keep it in new layouts.

| You write | What it is |
|---|---|
| `src/pages/<slug>.mjs` | the page: data only, no HTML |
| `assets/js/pages/<slug>/*.js` | the page's demo and scrolly modules (only if it has any) |
| `assets/media/<slug>/` | web media from `tools/ingest/cut.py`: `name.mp4` + `name.jpg` poster, `name.webp` + `name-s.webp` |
| `assets/models/<slug>/` | GLBs from `tools/cad/step2glb.py` then `tools/optimize-cad.mjs` |

Shared files (do not edit them for one page; ask for a framework change instead):
`tools/build.mjs`, `tools/rich.mjs`, `assets/js/project.js`, `assets/js/lib/stage.js`,
`assets/js/lib/labels.js`, `assets/js/lib/ui.js`, `assets/js/lib/demos/*`, `assets/css/site.css`.

`src/pages/_example.mjs` uses every section type; preview it at `/projects/_example`.

## Quick start

1. Create `src/pages/<slug>.mjs` with `export default { summary, hero, sections: [...] }`. The slug
   must match the project in `src/projects.mjs`, which still supplies the title, dates, facts card,
   links and CAD link.
2. Put media in `assets/media/<slug>/` and refer to it by file name: `{ v: 'latch-test.mp4', c: 'Caption' }`.
3. For a mechanism, add `assets/js/pages/<slug>/<name>.js` exporting `mount(el, ctx)` that returns
   `setProgress`, and a section `{ type: 'scrolly', id: 'latch', module: '<name>', steps: [...] }`.
   For the CAD itself (turning, versions, exploded, cut) use `module: '@turntable'` and write no
   JavaScript.
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
| `prose` | `h`, `p`, `media?: [item or [items]]` (pictures beside the text), `side?: 'left'` (pictures on the left) |
| `media` | `layout: 'grid' \| 'row' \| 'wide' \| 'collage'`, `items`, `h?`, `p?`, `cols?: 3` (grid only) |
| `scrolly` | `id`, `module`, `steps?: [{ h, p, view? }]`, `width?: 'full' \| 'wide'`, `side?: 'left' \| 'right'` (wide: which side the text is on), `h?`, `p?`, `caption?`, `stepHeight?` (default `'80vh'`), `length?` (no steps: how long it stays pinned, default `'180vh'`), `poster?`, `data?` |
| `demo` | legacy (interactive; do not add new ones): `id`, `module`, `h?`, `p?`, `caption?`, `height?`, `poster?`, `aside?`, `data?`, `webgl?: false`. A demo with `module: '@viewer'` is built as a wide `@turntable` scrolly |
| `split` | `items: [{ h, p, module? \| media?, data?, height?, poster?, caption?, id? }]`, `h?` |
| `iterations` | `items: [{ label, title, p, media: [...] }]`, `h?` |
| `callout` | `h`, `p` |
| `stats` | `items: [{ v, l }]`, `h?` |

Every section may have an `id` (a letter, then letters, digits, `-` or `_`) for linking (`#id`). Demo and scrolly ids
should be set and unique on the page. Unknown types and bad fields are build warnings; in preview
builds the broken section shows a yellow box, in production it is left out.

- **prose with `media`.** The paragraphs are cut into as many runs as there are media items, of
  about the same length (never right after a subheading, never between a `problem` and its `fix`),
  and each run gets its item beside it, pinned while the run is read. An item may be an array: those
  show side by side. With no `media`, prose sits in the centred reading column. A paragraph may also
  be `{ fig: item or [items], wide: true? }`: a picture in the flow of the text (`wide` breaks out
  of the column).
- **media layouts.** `grid`: two columns (`cols: 3` for three) of 4:3 tiles, cropped to fill; put
  `tall: true` on a portrait item to span two rows. `row`: one line of items at the same height,
  nothing cropped; on a phone a row of wide items stacks. `wide`: each item full width. `collage`:
  small prints as tilted photo cards. Photos open in a lightbox (arrows, Esc, swipe).
- **demo** `height` is any CSS length (default about 62% of the screen). `aside: 'left'` puts the
  `h` and `p` to the left of the canvas, `'right'` to the right; on a phone the text comes first.
  `poster` is an image shown until the demo is live and kept if it fails (use one: a still of the model).
- **scrolly** is a sticky stage driven by the scroll. `width: 'full'` (default): the stage fills the
  screen and the step cards scroll over its left side. `width: 'wide'`: the stage takes about three
  quarters of the screen, flush to one edge, with the step text beside it (`side`). Without `steps`
  it stays pinned for `length` of scrolling and the module plays through progress 0 to 1; a wide one
  pins its heading and text beside the stage. Up to 900 px wide (phones, small tablets) every
  scrolly pins its stage in the top half of the screen and the step text scrolls below it, never
  over the model (without steps: the text sits above the stage). A step becomes active when the top
  of its text comes up to 70 % of the screen (84 % on a phone). The module gets the scroll progress;
  a step's `view` object is passed to the module as `data.steps[i]` (for `@turntable`).
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
{ problem: 'What went wrong', title: 'Optional short title' }   // red "Problem" block
{ fix: 'How it was solved' }                                 // green "Fix" block
{ next: 'What I would do better next time' }                 // blue "Next time" block
```

**Jerry's rule for every page:** whenever the text describes a problem, mark it with a red
`{ problem }` block, its solution with a green `{ fix }` block right after it, and anything he would
do better next time with a blue `{ next }` block. Each takes a string or an array of paragraphs,
and an optional `title` (and `label` to override the pill text). They work anywhere `p` does:
prose, iterations, split rows, scrolly steps and callouts.

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
| `shift()` | `[fx, fy]` for `stage.setShift` that keeps the model clear of the step text on the current layout: `[0.15, 0]` on a full-width desktop scrolly (cards over the left), otherwise `[0, 0]` (wide: text beside; phone: text below). Call it in `setProgress` |
| `width` | `'full'` or `'wide'` |
| `panel` | legacy demos only: element under the canvas for controls (`null` in a scrolly) |
| `data` | the section's `data` object, as JSON |
| `asset(path)` | content-hashed URL for any `/assets/...` path (`stage.load` does this for you) |
| `reducedMotion` | true when the reader asked for less motion: never start animations yourself |
| `isTouch` | phone or tablet |
| `id`, `slug`, `kind` | block id, page slug, `'demo'` or `'scrolly'` |

Lifecycle: the poster shows until `mount` resolves; if WebGL is off, the import fails or `mount`
throws, the poster stays with a short note and anything the module added is removed. At most three
canvases (two on a phone) stay live; a block far off screen is unmounted (`dispose()`) and mounted
again when the reader comes back: keep state you care about in the module, not the DOM.
A stage made by `createStage` is freed automatically on unmount even without `dispose`, but
return `dispose()` anyway if you start anything else (timers, listeners on `window`).

Scrolly: `setProgress(p, step, stepP)` is called every frame the scroll moves, only while the block
is near the screen: `p` is 0 at the top of the section and 1 at the end, `step` is the active step
index, `stepP` is 0..1 through that step (without steps, `stepP` is `p`). Make the picture a pure
function of these (so scrolling back works) and do not animate on your own: no `onFrame`, no
timers, no CSS transitions on things the scroll drives. Right after `setProgress` the runtime draws
the stage in the same frame, so HTML labels and the canvas move together.

Patterns that keep it smooth and steady:

- Blend each step in from the previous one over the first ~45 % of the step
  (`k = smoothstep(0, 0.45, stepP)`), then hold, with at most a slow drift. Cut instead when
  `ctx.reducedMotion`.
- Frame views once, at rest, and cache them (recompute only when the stage's aspect changes).
- Spin mechanisms by an angle that is a function of the scroll (for a run-up, integrate a speed
  profile over the scroll once into a table), so faster parts visibly move faster as you scroll.
- Only write DOM when a value changes (`textContent` of readouts, label transforms).

Import shared code by absolute path, exactly like this: the page's import map turns these into
content-hashed URLs, so an updated module is never served stale from the month-long cache.

```js
import { createStage, cad } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';     // labels pinned to the model, cards
import * as THREE from 'three';                       // if you need more than stage.THREE
import { Something } from 'three/addons/...';          // only files vendored in assets/vendor/addons/
import { helper } from './helper.js';                 // your own files in the same folder
```

### Complete minimal scrolly

A GLB loaded, one part rotated about its real axis by the scroll:

```js
// assets/js/pages/hybrid-vehicle/latch.js
// section: { type: 'scrolly', id: 'latch', module: 'latch', width: 'wide', poster: 'latch.webp',
//            steps: [{ h: 'Open', p: ['...'] }, { h: 'Closing', p: ['...'] }, { h: 'Locked', p: ['...'] }] }
import { createStage, cad } from '/assets/js/lib/stage.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const model = await stage.load('/assets/models/rover.glb');

  // The latch's servo gear, by its CAD name. Its pin axis, from tools/cad-axes.py on the STEP,
  // runs along STEP X at y = 86.7 mm, z = -111.05 mm (millimetres, Z up); cad.point / cad.dir
  // convert STEP coordinates to the model's metres, Y up.
  const gear = stage.part(/Spur_Gear/);
  const axle = stage.pivot(gear, cad.point([417, 86.7, -111.05]), cad.dir([1, 0, 0]));

  const view = stage.frame(model, { azimuth: 60, elevation: 25, apply: false }); // framed once, at rest
  function setProgress(p, step, stepP) {
    stage.setShift(...ctx.shift());
    stage.setView(view);
    const deg = [0, 45 * smooth(0, 0.8, stepP), 45 + 45 * smooth(0, 0.6, stepP)][step] ?? 90;
    axle.setAngle((deg * Math.PI) / 180);   // setAngle redraws by itself
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose: () => stage.dispose() };
}
```

(This is the axis `assets/js/world.js` rigs the same gear on.)

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

`createStage(el, opts)` fills `el` with a canvas and returns the stage. You never call render
yourself: it draws only while on screen and only when something changed.

The look is a product render of the real CAD: a real studio HDRI (CC0, 79 KB, shared by every stage)
plus large soft light panels as the environment, a warm key light with soft shadows, a fill and a
rim light that ride with the camera, a baked contact shadow under the model, neutral tone mapping
(the CAD colours stay true), and finishes read from the STEP colours: brushed aluminium and steel,
carbon twill under clearcoat, printed plastic with faint layer lines, rubber, PCB. CAD meshes have no
UVs, so box-projected UVs are generated at load for that detail. Pure CAD black is lifted to a real
black (about 2 % reflectance) so black parts show their shape.

Performance: it draws only when something changed, and only while on screen. Shadows re-render
only when parts move, not when the camera does, and at most about ten times a second while they
keep moving. Frames drawn while scrolling get a budget of about 2.4 million pixels, and the pixel
ratio drops further (down to 0.8) while frames are slow. Once the picture has not changed for a
moment the stage draws one refined frame if it would look any different (full pixel ratio, exact
shadows, the contact shadow re-baked when the models moved, ambient occlusion if asked), and then
nothing until the next change.

| opts | default | |
|---|---|---|
| `controls` | `true` | drag to orbit (legacy demos). **`false` for scrollies** |
| `background` | `'transparent'` | or a CSS colour |
| `shadow` | `true` | soft key-light shadow and contact shadow under the models |
| `hint` | auto | the "Drag to rotate" chip text, or `false` |
| `fov` | `32` | vertical field of view, degrees |
| `exposure` | `1` | tone mapping exposure |
| `envIntensity` | `1` | strength of the studio environment |
| `ao` | `false` | ambient occlusion in the refined frame (desktop only) |
| `pixelRatio` | `1.75` | cap on device pixel ratio |
| `detail` | `true` (desktop) | surface detail textures; off on phones and tablets, where they cannot be seen |

| member | |
|---|---|
| `await load(url, { add, pbr, shadows, detail, carbon, rubber })` | loads a GLB (meshopt, hashed URL), adds it to `stage.root`, gives STEP colours real finishes and returns its scene. `carbon` / `rubber`: regexes on part names that get those finishes (parts named `*carbon*`, `cf_*`, or wheel, tire, belt get them anyway). `add: false` to add it yourself, `pbr: false` to keep the file's materials |
| `part(regex, within?)` | top-most nodes whose name matches (a mesh, or a group for a multi-material part). Moving parts keep their CAD names (`anim_<kind>_<n>_<Name>`, see the `KEEP` list in `tools/optimize-cad.mjs`); static parts are merged and unnamed |
| `pivot(parts, point, dir)` | a `Group` that turns the parts about an axis: `point` and `dir` in the model's frame (metres, Y up), or `point: 'center'` for the parts' bounding-box centre (only for parts round about the axis, like wheels and gears). Returns the group with `setAngle(rad)`, `.angle`, `.axis` |
| `frame(obj?, { azimuth, elevation, dir, pad, offset, duration, apply })` | fits `obj` (an object, an array of parts, or all models) in view. `azimuth` 0 looks from +Z, 90 from +X (degrees). `apply: false` only returns `{ pos, target }`: frame once at rest, cache, then `setView` |
| `setView({ pos, target })` | place the camera now (scrollies blend cached views and call this) |
| `setShift(fx, fy)` | move the picture on the canvas (fractions; +y up) without moving the camera; pass `...ctx.shift()` |
| `sectionPlane(normal, constant)` | a cut through all models, in world metres: keeps points where `dot(normal, p) + constant >= 0` (normal `[-1, 0, 0]`, constant `0.3` keeps x ≤ 0.3). Cut faces get a clean hatched cap tinted by each part's colour. Returns `{ plane, set(constant), setNormal(n), enable(bool), remove() }` |
| `highlight(parts, color = '#ff6b35', { intensity })` | tints parts; returns a function that restores them |
| `cloneMaterial(m)` | a copy of a material that keeps the section caps working (use it instead of `m.clone()` when a cut may exist) |
| `invalidate(scene = true)` | ask for a redraw after changing the scene yourself; `false` when only the camera moved (pivots, sections, frame, setView and highlight do it for you) |
| `bounds(obj?)` | `{ box, center, radius }` (cached per object) |
| `fitGround()` | re-fit the ground, shadows and contact shadow to the models; call it after adding or removing a model yourself (`load` does it) |
| `onFrame(fn(dt, t))` | legacy demos only: a per-frame callback. Scrollies never use it |
| `setCapColor(a, b)` | colours of the section hatch |
| `dispose()` | frees every GPU buffer and removes the canvas |
| `THREE`, `scene`, `camera`, `renderer`, `root`, `ground`, `light`, `lights`, `canvas`, `el` | the underlying objects |

Also exported: `cad.point([x, y, z])` and `cad.dir([x, y, z])` (STEP millimetres, Z up, to model
metres, Y up) and `assetUrl(path)`.

## `labels.js`

HTML labels pinned to the model and small cards on the stage:

```js
import { labelLayer } from '/assets/js/lib/labels.js';
const ov = labelLayer(stage);
const l = ov.label('72T pulley', [x, y, z], { color: '#fff1e2', side: 'l', minW: 520 }); // or an Object3D
l.a = 1;                // 0..1, set in setProgress
ov.update();            // after the camera moved; it only writes styles that changed
const card = ov.card({ corner: 'tr' }); card.append(ov.chip('#ff6b35', 'Printed spacers'));
```

For numbers that follow the scroll (speeds, torques), put a `<div class="rx-hud">` in `ov.layer`:
rows `.rx-hud-row` (label, `<b>` value, `<i><em>` bar), a `<table>`, `.rx-hud-big` for the headline
number, and `.rx-hud-x` on anything to hide on phones. `assets/js/pages/electric-bike/runup.js` is
the example.

## `ui.js`

Sliders, toggles, segmented buttons and readouts for the older interactive demos. **Do not use them
in new work** (Jerry: no controls unless he asks). They stay so older pages keep working.

## Built-in `@turntable`

The CAD, turned by the scroll: data only, no JavaScript. Without steps it is one slow orbit
(`data.spin` degrees over the whole scroll, default 300) and the versions follow each other, each
for an equal share, dissolving into the next:

```js
{ type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', h: 'The CAD', p: ['...'], poster: 'cad.webp',
  data: { models: [{ label: 'V1', src: '/assets/models/<slug>/v1.glb' }, { label: 'V2', src: '/assets/models/<slug>/v2.glb' }],
          azimuth: 35, elevation: 20 } }
```

With steps, each step's `view` says what it shows, and the text says why (all fields optional):

```js
steps: [
  { h: 'V1', p: ['...'], view: { version: 0, focus: 'Jockey_Wheel', azimuth: 156, elevation: -15, pad: 2.3 } },
  { h: 'Exploded', p: ['...'], view: { version: 1, explode: 1, azimuth: 40 } },
  { h: 'Inside', p: ['...'], view: { version: 1, cut: { normal: [1, 0, 0], at: 0.5 },
      highlight: [{ parts: 'Spur_Gear', color: '#ff6b35' }], labels: [{ text: 'Pinion, 7T', part: 'Pinion' }] } },
  { h: 'V3 (render only)', p: ['...'], view: { version: 1, image: 'render-v3.webp', alt: '...' } },
]
```

| `view` | |
|---|---|
| `azimuth`, `elevation`, `pad` | camera, degrees (azimuth 0 looks from +Z, 90 from +X) |
| `focus` | regex: frame these parts instead of the whole model |
| `version` | which model (index into `data.models`); dissolves from the previous step's |
| `explode` | 0..1: how far the `data.explode` groups have moved out |
| `cut` | `{ normal: [x, y, z], at }`: a section cut, `at` 0 = nothing cut, 1 = everything |
| `highlight` | `[{ parts: regex, color, intensity }]` |
| `labels` | `[{ text, at: [x, y, z] } \| { text, part: regex }]`, model metres, Y up; `side: 'l'` |
| `image`, `alt` | a still over the stage, for a version that exists only as a render or photo |

Each step blends in from the one before over its first 45 % and then turns slowly (`data.drift`
degrees per step, default 14). Per model: `src`, `label`, `hide` (regex: parts left out),
`ghost` (regex: see-through), `highlight`, `carbon` (regex: parts with the carbon finish),
`azimuth`, `elevation`, `pad`. `data.explode: [{ parts: regex, dir: [x, y, z], dist: metres, cad: true? }]`:
directions in the model frame (metres, Y up), or STEP directions with `cad: true`, read from the
CAD with `tools/cad-axes.py` (real axes, never guessed). A `demo` section with `module: '@viewer'`
is built as a wide turntable with no steps, so old pages convert without changes.

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

- `PREVIEW=1 node tools/build.mjs` must print no `! <slug>:` warnings for your page (including
  "words of text in a row with no picture").
- Screenshot desktop and phone, section by section, and look at every image:
  `node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug>` and
  `node tools/pages/shoot.mjs http://localhost:8123/projects/<slug>.html /tmp/shots/<slug>-phone 390 844`.
  It also prints console errors, missing files, blocks that did not go live, and sideways scrolling.
  (Software WebGL is slow here: a page with several demos takes a few minutes.)
- No horizontal scrolling at 390 px, captions on every item, nothing moving on its own with
  reduced motion, and the poster looks right if the 3D never loads.
- Models: `node tools/pages/models.mjs <slug>` lists size, triangles and draw calls and flags any
  model over 400k triangles, 4 MB or 400 draw calls. The fix is never a new shape: drop screws,
  nuts and PCBs, or merge more static parts (fewer names in `KEEP`).
- Smoothness: `node tools/pages/perf.mjs http://localhost:8123/projects/<slug>.html '#<scrolly-id>'`
  scrolls through a section and reports frames drawn, draw calls per frame, script time and long
  frames, plus the stage's own counters (`stage`: live frames, draw calls per live frame with the
  shadow passes, refined frames, shadow updates, contact bakes), then parks and confirms nothing
  renders while idle (`idle.rendered` must be 0).
  Software WebGL is slow here: compare runs with each other, not with a laptop.
- Videos never play more than two at once and none load before the page has; the hero should hold
  one or two videos, not three.
