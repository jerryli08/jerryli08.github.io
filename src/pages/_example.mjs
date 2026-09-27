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
    tools: ['src/pages/<slug>.mjs', 'assets/js/lib/stage.js', 'assets/js/lib/labels.js'],
    links: [{ label: 'How to write a page', href: '#how' }],
  },
  summary: {
    stats: [
      { v: '8', l: 'Section types' },
      { v: '3', l: 'Scroll-driven 3D blocks on this page' },
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
    { type: 'prose', id: 'prose-media', h: 'Prose with pictures beside it', p: [
      'Give a prose section `media: [...]` and the paragraphs are cut into as many runs as there are items, of about the same length, each with its picture beside it. A picture stays pinned while its run is read, so no stretch of text goes by without one.',
      'The cut never falls right after a subheading or between a problem and its fix. An item can be an array: those show side by side.',
      { h: 'On a phone' },
      'Each picture follows its run of text, so pictures still come every few paragraphs.',
      'Jerry\'s rule: no stretch of text longer than about a screen without a picture. The build warns when a page breaks it.',
    ], media: [
      { i: '/assets/media/replac3d-perfboard.webp', c: 'Custom perfboard: two TMC2209 stepper drivers on an Arduino Uno' },
      [{ i: '/assets/media/ebike-nondrive-side.webp', c: 'Non-drive side' }, { i: '/assets/media/replac3d-finished.webp', c: 'The finished robot' }],
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
    { type: 'scrolly', id: 'wheels', module: 'wheels', width: 'wide', h: 'Wide scrolly with the text beside it',
      p: [
        'A scrolly is a stage the page pins while the reader scrolls, from a module in `assets/js/pages/<slug>/`. This one loads the rover CAD, pivots the four wheels about their axles and turns them with the scroll: two turns over the section.',
        'Without steps it stays pinned for `length` of scrolling, and its heading and text stay beside it. The readout is computed from the wheel size in the CAD.',
      ] },
    { type: 'scrolly', id: 'section', module: 'section', h: 'Full-width scrolly: the camera follows the scroll',
      p: ['A sticky full-width stage; each step card scrolls over it and the module gets the progress.'],
      steps: [
        { h: 'The whole vehicle', p: ['At the top of the section the module frames the full model.'] },
        { h: 'An orbit', p: ['Scrolling turns the camera once around the rover. Scroll back and it turns back: the picture is a function of the scroll position.'] },
        { h: 'A section plane', p: ['A cut sweeps in through the docking latch. Cut faces are capped with a hatch so solid parts read as solid.'] },
        { h: 'The mechanism', p: ['The camera closes in on the latch and its parts light up, picked out of the CAD by their names.'] },
      ] },
    { type: 'scrolly', id: 'turntable', module: '@turntable', width: 'wide', side: 'right', h: 'The built-in turntable',
      p: ['`module: \'@turntable\'` turns the real CAD with the scroll, with no JavaScript to write. Each step\'s `view` says what it shows.'],
      data: { models: [{ label: 'Rover', src: '/assets/models/rover.glb' }, { label: 'Drone', src: '/assets/models/drone.glb' }] },
      steps: [
        { h: 'A model', p: ['The first model, turning slowly as you scroll.'], view: { version: 0, azimuth: 35, elevation: 20 } },
        { h: 'Focus on parts', p: ['`focus` frames some parts by their CAD names; `highlight` lights them.'], view: { version: 0, focus: 'Wheels', azimuth: 120, elevation: 12, pad: 1.3, highlight: [{ parts: 'Wheels', color: '#ff6b35' }] } },
        { h: 'A section cut', p: ['`cut` sweeps a section plane in; cut faces are capped and hatched.'], view: { version: 0, azimuth: 70, elevation: 25, cut: { normal: [-1, 0, 0], at: 0.5 } } },
        { h: 'The next version', p: ['`version` dissolves to another model. Use it for V1, V2, V3; a version that exists only as a render takes `image`.'], view: { version: 1, azimuth: 35, elevation: 22 } },
      ] },
    { type: 'split', h: 'Split: alternating rows', items: [
      { media: { v: '/assets/media/hybrid-vehicle-detached.mp4', c: 'Operating separately on the course' },
        h: 'A photo or video beside text', p: ['Rows alternate sides. On a phone the picture always comes first.'] },
      { media: { i: '/assets/media/ebike-parts.webp', c: 'Custom parts: bent and powder-coated 5052 aluminum, CNC carbon fiber and laser-cut stainless' },
        h: 'And another', p: ['Use split for a few pictures that each need a paragraph.'] },
    ] },
    { type: 'iterations', h: 'Iterations', items: [
      { label: 'Version 1', title: 'A version timeline', p: ['Each item has a label, a title, text and a row of media.'],
        media: [{ v: '/assets/media/sciolyev-v1-test.mp4', c: 'First ground test on the HDF plates: too heavy, and the ESC was not tuned yet' }] },
      { label: 'Version 2', title: 'What changed and why', p: ['Say what the previous version got wrong and what the change fixed.'],
        media: [{ i: '/assets/media/sciolyev-v2-mid-build.webp', c: 'Mid-rebuild with the 1.5 mm G10 fiberglass plates' }, { v: '/assets/media/sciolyev-motor-test.mp4', c: 'Integrated test of the brushless motor and MT6701 encoder' }] },
    ] },
    { type: 'callout', h: 'Callout', p: ['A highlighted note for the one thing a skimming reader must not miss.'] },
    { type: 'stats', h: 'Stats', items: [{ v: '4', l: 'Wheels on the rover, each pivoted about its axle' }, { v: '1', l: 'Section plane in the scrolly' }, { v: '2', l: 'Models in the turntable' }] },
  ],
};
