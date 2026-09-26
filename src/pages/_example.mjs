// Framework example: every section type once. Preview builds render it to
// /projects/_example (linked from nowhere); production builds leave it out.
// The media and CAD are real files already on the site, reused with their existing captions;
// the text only describes the framework. Copy on a real page uses only facts Jerry has stated.
export default {
  // meta is only for _ pages; real pages take title, dates, facts and links from src/projects.mjs
  meta: {
    title: 'Rich page example',
    subtitle: 'Every section type of the project page framework',
    short: 'A test page for the page-module framework, built from media and CAD already on the site.',
    org: 'Framework test',
    role: 'Reference for page writers',
    tools: ['src/pages/<slug>.mjs', 'assets/js/lib/stage.js', 'assets/js/lib/ui.js'],
    links: [{ label: 'How to write a page', href: '#how' }],
  },
  summary: {
    stats: [
      { v: '8', l: 'Section types' },
      { v: '3', l: 'Interactive blocks on this page' },
      { v: '**0**', l: 'Shared files a page writer edits' },
    ],
    text: [
      'The summary sits beside the facts card. Keep it to the two or three sentences a reader needs before deciding to scroll: what the project is, what was hard, and what came out of it.',
      'Text fields take **bold**, *italic*, `code` and [links](#how).',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: '/assets/media/hybrid-vehicle-flight.mp4', c: 'UAV carrying the UGV' },
      { v: '/assets/media/hybrid-vehicle-driving.mp4', c: 'UGV carrying the UAV' },
      { v: '/assets/media/hybrid-vehicle-detached.mp4', c: 'Operating separately on the course' },
    ],
  },
  sections: [
    { type: 'prose', id: 'how', h: 'Prose', p: [
      'A prose section is a heading and paragraphs. Paragraphs are strings; a few object shapes cover the rest of a technical write-up:',
      { ul: ['`{ h }` a subheading', '`{ ul }` / `{ ol }` lists', '`{ table: { head, rows, caption } }`', '`{ quote, by }`, `{ note }` and `{ pre }`'] },
      { h: 'A subheading' },
      { table: { head: ['Shape', 'Renders as'], rows: [['string', 'paragraph'], ['{ ul: [...] }', 'bulleted list'], ['{ table }', 'scrollable table']], caption: 'Tables scroll sideways on a phone instead of widening the page.' } },
      { note: 'A note: small, muted text for sources and caveats.' },
      { h: 'Problems, fixes and next time' },
      'Jerry wants every problem marked red, its fix green, and what he would do better next time blue:',
      { problem: 'The first gears were too small and skipped under load.', title: 'Gears skipped' },
      { fix: ['Bigger teeth. That added backlash, which I accepted because skipping could not be fixed any other way.', 'A second paragraph is fine too.'] },
      { next: 'Add flanges so the gears cannot walk off each other.' },
    ] },
    { type: 'media', h: 'Media: grid', layout: 'grid', items: [
      { v: '/assets/media/replac3d-demo-4x.mp4', c: 'A full cycle at 4x speed', tall: true },
      { i: 'images/replac3d-mid-build.jpg', c: 'Mid-build: steppers on a CNC aluminum mount, stood off from the laser-cut steel base plate' },
      { i: '/assets/media/replac3d-perfboard.webp', c: 'Custom perfboard: two TMC2209 stepper drivers on an Arduino Uno' },
    ] },
    { type: 'media', h: 'Media: row', layout: 'row', items: [
      { v: '/assets/media/ebike-close-up.mp4', c: 'Close-up on the belt reductions' },
      { i: '/assets/media/ebike-nondrive-side.webp', c: 'Non-drive side' },
    ] },
    { type: 'media', h: 'Media: wide', layout: 'wide', items: [
      { i: '/assets/media/ebike-parts.webp', c: 'Custom parts: bent and powder-coated 5052 aluminum, CNC carbon fiber and laser-cut stainless' },
    ] },
    { type: 'media', h: 'Media: collage', layout: 'collage', items: [
      { i: '/assets/media/replac3d-finished.webp', c: 'The finished robot' },
      { i: '/assets/media/ebike-build-progress.webp', c: 'Mid-build: drive mounted, mocking up the first belt stage' },
      { i: '/assets/media/sciolyev-v2-mid-build.webp', c: 'Mid-rebuild with the 1.5 mm G10 fiberglass plates' },
      { i: '/assets/media/battlebot-weighing.webp' },
      { i: '/assets/media/ebike-vesc-config.webp', c: 'Configuring the throttle in VESC Tool' },
    ] },
    { type: 'demo', id: 'wheels', module: 'wheels', aside: 'left', h: 'Demo with text beside it',
      p: [
        'A demo is a canvas the page mounts only when it scrolls near, from a module in `assets/js/pages/<slug>/`. This one loads the rover CAD, pivots the four wheels about their axles and drives them from the slider.',
        'The controls under the canvas come from `ui.js`: a slider, a play toggle and a readout.',
      ],
      caption: 'Drag to turn the model. The readout is computed from the wheel size in the CAD.' },
    { type: 'scrolly', id: 'section', module: 'section', h: 'Scrolly: the camera follows the scroll',
      p: ['A sticky full-width stage; each step card scrolls over it and the module gets the progress.'],
      steps: [
        { h: 'The whole vehicle', p: ['At the top of the section the module frames the full model.'] },
        { h: 'An orbit', p: ['Scrolling turns the camera once around the rover. Scroll back and it turns back: the picture is a function of the scroll position.'] },
        { h: 'A section plane', p: ['A cut sweeps in through the docking latch. Cut faces are capped with a hatch so solid parts read as solid.'] },
        { h: 'The mechanism', p: ['The camera closes in on the latch and its parts light up, picked out of the CAD by their names.'] },
      ] },
    { type: 'split', h: 'Split: alternating rows', items: [
      { module: '@viewer', data: { models: [{ label: 'Rover', src: '/assets/models/rover.glb' }, { label: 'Drone', src: '/assets/models/drone.glb' }], label: 'Model' }, height: '420px',
        h: 'A built-in viewer', p: ['`module: \'@viewer\'` shows one or more GLBs with a version switcher, with no JavaScript to write. Use it for "V1, V2, V3" CAD.'] },
      { media: { v: '/assets/media/hybrid-vehicle-detached.mp4', c: 'Operating separately on the course' },
        h: 'Or a photo or video', p: ['Rows alternate sides. On a phone the picture always comes first.'] },
    ] },
    { type: 'iterations', h: 'Iterations', items: [
      { label: 'Version 1', title: 'A version timeline', p: ['Each item has a label, a title, text and a row of media.'],
        media: [{ v: '/assets/media/sciolyev-v1-test.mp4', c: 'First ground test on the HDF plates: too heavy, and the ESC was not tuned yet' }] },
      { label: 'Version 2', title: 'What changed and why', p: ['Say what the previous version got wrong and what the change fixed.'],
        media: [{ i: '/assets/media/sciolyev-v2-mid-build.webp', c: 'Mid-rebuild with the 1.5 mm G10 fiberglass plates' }, { v: '/assets/media/sciolyev-motor-test.mp4', c: 'Integrated test of the brushless motor and MT6701 encoder' }] },
    ] },
    { type: 'callout', h: 'Callout', p: ['A highlighted note for the one thing a skimming reader must not miss.'] },
    { type: 'stats', h: 'Stats', items: [{ v: '4', l: 'Wheels on the rover, each pivoted about its axle' }, { v: '1', l: 'Section plane in the scrolly' }, { v: '2', l: 'Models in the viewer' }] },
  ],
};
