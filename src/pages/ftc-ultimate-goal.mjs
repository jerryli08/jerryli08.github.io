// FTC ULTIMATE GOAL robot (team 18996), 2020-21: rich page.
// Jerry's checklist: "There's no CAD for this, only pictures and videos, so you can have a bit of
// fun with this one ... a bit more fun and juvenile because this was like 2020". So: the same page
// system, a lighter voice, "Level" section names, a scrapbook of prints with marker stamps and
// doodles, and a bloopers strip. No CAD exists, so there is no 3D and no stand-in geometry: the four
// scroll-driven blocks (webgl: false) step through real photos and real footage cut into frames
// (assets/models/ftc-ultimate-goal/frames/, cut from our own clips).
// Facts: Jerry's (projects.mjs: first FTC season, the team's only programmer) and what the media
// plainly shows (ring times, the ring leaving the bottom of the stack, the encoder counts and the
// program names were read frame by frame off the clips). Photo days are counted from the first
// photo in the album (file dates).
// Held back until Jerry answers (/home/claude/work/ftc-20-21/questions.md): the team name and the
// season dates (they conflict with FIRST's own page; the page says only "team 18996"), any results,
// whether the run was autonomous, how the shooter works beyond what the footage shows, whether the
// robot had an intake, how the wobble goal is held, what he wrote the code in, and every "next time".
// Nobody is named, and every photo is cropped to hands and hardware.
const F = '/assets/models/ftc-ultimate-goal/frames';

export default {
  summary: {
    stats: [
      { v: '1st', l: 'FTC season' },
      { v: '1', l: 'Programmer on the team: me' },
      { v: '3', l: 'Rings stacked in the shooter\'s cup' },
      { v: '1.3 s', l: 'Between shots in the run at the top (measured from the video)' },
    ],
    text: [
      'ULTIMATE GOAL was the 2020-21 FIRST Tech Challenge game: shoot orange foam rings at goals, and carry wobble goals around the field. It was my first FTC season, on team 18996, and I was the team\'s **only programmer**.',
      'It was also the COVID season. Everything here happened on a homemade field, with a cardboard box for a goal. There is no CAD of this robot, so this page runs on our photos and phone videos: scroll, and they play.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-three-rings-and-wobble.mp4', c: 'Three rings, 1.3 s apart, toward the cardboard box on the right, then a lap of the field with a wobble goal on board' },
      { v: 'hero-magazine-empties.mp4', c: 'Watch the white cup: three rings, then two, then one. Each shot takes the bottom ring' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ level 1
    { type: 'prose', id: 'field', h: 'Level 1: the home field', media: [
      { i: 'still-cardboard-goal.webp', c: 'Official goal? No. A Home Depot box with an opening cut in it, taped at the corners? Yes.' },
    ], p: [
      'In ULTIMATE GOAL, robots shoot orange foam rings at goals on the far wall, and carry **wobble goals**, poles with a black dome on top, into taped target zones.',
      'Our practice field was homemade: plywood walls, gray foam floor tiles, red tape for the target zones and white tape for the lines. The goal was a cardboard box with an opening cut in the front.',
    ] },

    // ------------------------------------------------------------------ level 2
    { type: 'scrolly', id: 'build', module: 'scrapbook', webgl: false, stepHeight: '85vh', poster: 'tube-arcs-on-table.webp',
      h: 'Level 2: the build, in twenty days of photos',
      caption: 'Our photos, in the order they were taken, cropped to hands and hardware. Days are counted from the first photo in the album.',
      steps: [
        { h: 'Day 1: the agenda', p: ['Five lines on a whiteboard. *Work faster* got crossed out and fixed to *work smarter*, and the last two lines are the plan: an **intake** and a **conveyor**.'] },
        { h: 'Day 1: the options', p: ['The conveyor, split into two jobs: **A**, floor to vertical, and **B**, vertical to magazine. Then four numbered ideas: a fast beater, a slow beater or a vertical belt sandwich, a small shooter, and a belt with a tab. In the corner, a sketch of a ring\'s path up from the floor into a box.'] },
        { h: 'Day 10: cardboard tubes', p: ['Arcs cut from a cardboard concrete-form tube, the round kind used to pour concrete posts, next to a plywood plate with curved slots cut into it.'] },
        { h: 'Day 10: wires everywhere', p: ['A laptop, a gamepad, and motors and servos wired up loose on the field floor, next to a plywood deck with a motor in each corner.'] },
        { h: 'Day 11: two prototypes', p: ['A tube arc standing in a curved slot in plywood, with a ring held up to it. And a tall hardboard tower with timing belts running up its walls.'] },
        { h: 'Day 18: the shooter plate', p: ['The shooter comes together on the carpet, off the robot: a black wheel, a white cup with a ring in it, and a curved rail around the edge of the plate.'] },
        { h: 'Day 20: a whole robot', p: ['Number plate on, a phone screen glowing on the deck, wires in every direction. It is a robot!'] },
      ],
      data: {
        aria: 'Our build photos landing on a pile one by one, from the whiteboard agenda to the finished robot',
        prints: [
          [{ i: 'whiteboard-agenda.webp', ar: 0.75, stamp: 'DAY 1', tilt: -3, dx: -0.02, alt: 'Whiteboard: Agenda, work faster crossed out and changed to smarter, organize, intake, conveyor',
            doodles: [{ ring: [0.5, 0.4, 0.165, 0.045] }, { line: [[0.2, 0.668], [0.56, 0.656]] }, { line: [[0.21, 0.772], [0.77, 0.756]] }],
            notes: [{ text: 'the plan', x: 80, y: 60, rot: -8 }] }],
          [{ i: 'whiteboard-intake-ideas.webp', ar: 0.9925, stamp: 'DAY 1', tilt: 2.5, dx: 0.03, dy: -0.01, alt: 'Whiteboard: conveyor A floor to vertical, B vertical to magazine, four numbered ideas and a sketch of the ring path',
            doodles: [{ line: [[0.6, 0.49], [0.635, 0.505], [0.635, 0.655], [0.668, 0.675], [0.635, 0.695], [0.635, 0.845], [0.6, 0.86]] }],
            notes: [{ text: '4 ideas', x: 79, y: 67.5, rot: -6 }] }],
          [{ i: 'tube-arcs-on-table.webp', ar: 1.985, stamp: 'DAY 10', tilt: -2, dx: -0.01, dy: 0.01, alt: 'Arcs cut from a cardboard tube on a table, next to plywood with curved slots',
            doodles: [{ arrow: [[0.41, 0.3], [0.32, 0.37]] }],
            notes: [{ text: 'concrete tube!', x: 50, y: 25, rot: -5 }] }],
          [{ i: 'code-before-chassis.webp', ar: 1.843, stamp: 'DAY 10', tilt: 3, dx: 0.02, alt: 'A laptop, a gamepad and loose motors and servos wired up on the field floor beside a plywood deck',
            doodles: [{ ring: [0.165, 0.615, 0.08, 0.16] }],
            notes: [{ text: 'loose motors', x: 13, y: 88, rot: -4 }] }],
          [{ i: 'rail-prototype-ring.webp', ar: 1.387, stamp: 'DAY 11', tilt: -4, alt: 'A cardboard tube arc standing in a curved slot in plywood, a ring held up to it',
            doodles: [{ arrow: [[0.46, 0.46], [0.345, 0.25]] }],
            notes: [{ text: 'ring vs. curve', x: 55, y: 53, rot: -5 }] },
           { i: 'conveyor-prototype.webp', ar: 0.419, stamp: 'DAY 11', tilt: 3.5, alt: 'A tall hardboard tower with timing belts running up its walls, a ring beside it' }],
          [{ i: 'shooter-module-loading.webp', ar: 1.397, stamp: 'DAY 18', tilt: -1.5, dx: 0.01, alt: 'The shooter plate on the carpet: black wheel, white cup with a ring in it, curved rail',
            doodles: [{ ring: [0.315, 0.155, 0.1, 0.15] }, { arrow: [[0.76, 0.44], [0.635, 0.36]] }],
            notes: [{ text: 'wheel', x: 16, y: 38, rot: -6 }, { text: 'rail', x: 81, y: 50, rot: 4 }] }],
          [{ i: 'robot-18996-finished.webp', ar: 0.816, stamp: 'DAY 20', tilt: 2, dx: -0.01, alt: 'The finished robot with its 18996 number plate, wired up, a phone on the deck',
            doodles: [{ star: [0.31, 0.8, 0.035] }] }],
        ],
      } },

    // ------------------------------------------------------------------ level 3
    { type: 'prose', id: 'shooter', h: 'Level 3: the ring shooter', media: [
      { v: 'shooter-plate-top.mp4', c: 'Over the top of the shooter plate: the black wheel, the white cup, and the curved rail at the edge' },
    ], p: [
      'The shooter is a tilted plywood plate standing on threaded rods above the drive base. On it: a black wheel lying flat, a white cup that holds a stack of three rings lying flat, a curved rail along the edge of the plate, and a small servo on a bracket beside the cup.',
      'The close-up below shows how the stack feeds. Each shot takes the **bottom** ring: it slides out from under the cup and leaves between the wheel and the curved rail, fast enough to be an orange blur in a single frame. The rings above it drop down by one.',
    ] },
    { type: 'scrolly', id: 'magazine', module: 'reel', webgl: false, width: 'wide', side: 'left', stepHeight: '80vh', poster: 'still-magazine-full.webp',
      caption: 'Frames from our video, ten per second, cropped around the cup. The count changes on the frame where each ring first shows outside the cup.',
      steps: [
        { h: 'What\'s on the plate', p: ['From above: the **wheel**, the **cup**, the **servo** on its bracket, and the **curved rail** at the edge of the plate.'] },
        { h: 'Three rings', p: ['Three rings stacked flat in the cup. Keep an eye on the bottom of the stack.'] },
        { h: 'Two', p: ['The bottom ring slides out from under the cup, toward the rail, and is gone. The stack drops by one.'] },
        { h: 'One', p: ['Again: the bottom ring goes, and the one above it takes its place.'] },
        { h: 'Empty', p: ['The last ring slides out and shoots off between the wheel and the rail: that orange blur. Reload!'] },
      ],
      data: {
        aria: 'The shooter\'s cup emptying one ring at a time, from three rings to none',
        aspect: 800 / 560, frames: `${F}/mag/`, framesSmall: `${F}/mag-s/`, count: 120, fps: 10,
        counter: { label: 'In the cup', max: 3, start: 3, at: [[4.75, 2], [8.25, 1], [11.75, 0]] },
        steps: [
          { image: 'still-shooter-top.webp', ar: 16 / 9, chip: 'The shooter plate from above', alt: 'The shooter plate from above: wheel, cup, servo and curved rail',
            doodles: [{ ring: [0.235, 0.5, 0.1, 0.17] }, { arrow: [[0.33, 0.17], [0.385, 0.32]] }, { arrow: [[0.25, 0.855], [0.345, 0.95]] }],
            notes: [{ text: 'wheel', x: 20, y: 27, rot: -6 }, { text: 'cup: 3 rings', x: 47, y: 63, rot: -4 }, { text: 'servo', x: 30, y: 11, rot: -5 }, { text: 'curved rail', x: 22, y: 82, rot: -4 }] },
          { from: 0, to: 4.6, still: 2 },
          { from: 4.6, to: 8.1, still: 6.5 },
          { from: 8.1, to: 11.6, still: 10 },
          { from: 11.6, to: 11.95, still: 11.9 },
        ],
      } },
    { type: 'media', layout: 'grid', cols: 3, items: [
      { v: 'cutting-the-tube-rail.mp4', c: 'Cutting a cardboard concrete-form tube with a power tool: "TUBE" is printed right on the side' },
      { i: 'shooter-module-side.webp', c: 'The shooter plate from the side, before it went on the robot: the white cup, the threaded rods and a servo on its bracket' },
      { i: 'shooter-plate-tipped.webp', c: 'The robot tipped up for work, shooter plate toward the camera: wheel at the top, rings in the cup, the servo beside it' },
    ] },

    // ------------------------------------------------------------------ level 4
    { type: 'scrolly', id: 'run', module: 'reel', webgl: false, width: 'wide', side: 'right', stepHeight: '80vh', poster: 'still-ring-in-flight.webp',
      h: 'Level 4: the run',
      p: ['The run from the top of the page, one scroll step per move.'],
      caption: 'Our video, ten frames per second. Ring times are the frames where each ring first shows in the air, measured on the 4K original.',
      steps: [
        { h: 'Ring one', p: ['The robot sits at the bottom left of the field. The first ring is in the air at **0.4 s**, headed for the cardboard box on the right.'] },
        { h: 'Ring two', p: ['Second ring at **1.7 s**: **1.3 s** after the first.'] },
        { h: 'Ring three', p: ['Third ring at **3.0 s**, another 1.3 s later. Three rings out.'] },
        { h: 'Wobble goal on board', p: ['Now it turns and heads up the field with the wobble goal, the black-domed pole, riding upright on its side.'] },
        { h: 'Ring four?', p: ['On the way back it rolls over a ring lying on the field, and half a second later there is a ring in the white cup.'] },
        { h: 'Parked', p: ['It ends the clip among the taped squares near the camera, the wobble goal still on board.'] },
      ],
      data: {
        aria: 'The robot shooting three rings, then driving the field with a wobble goal, frame by frame',
        aspect: 16 / 9, frames: `${F}/run/`, framesSmall: `${F}/run-s/`, count: 127, fps: 10,
        counter: { label: 'Rings launched', max: 3, start: 0, at: [[0.41, 1], [1.71, 2], [3.01, 3]] },
        event: { at: 10.5, text: 'A ring in the cup' },
        steps: [
          { from: 0, to: 1.3, still: 0.6 },
          { from: 1.3, to: 2.6, still: 1.9 },
          { from: 2.6, to: 4.6, still: 3.1 },
          { from: 4.6, to: 8.4, still: 6.5 },
          { from: 8.4, to: 10.9, still: 10.7 },
          { from: 10.9, to: 12.65, still: 12.3 },
        ],
      } },
    { type: 'media', layout: 'row', items: [
      { v: 'drive-and-shoot.mp4', c: 'Another run: the robot turns, then sends rings toward the box on the right' },
      { i: 'still-robot-front-low.webp', c: 'From the floor: the tilted plate on its threaded rods, the motors under it, and the drive base' },
    ] },

    // ------------------------------------------------------------------ level 5
    { type: 'prose', id: 'code', h: 'Level 5: the part I did (code)', p: [
      'I was the team\'s only programmer. On the Driver Station phone, the list of autonomous programs is a stack of numbered test versions, from TestAutoV2 up to TestAutoV12, with a TurnLeft and a TurnRight version of V12.',
      'The one below is TestAutoV12TurnLeft. While it runs, it prints all four drive encoder counts to the screen.',
    ] },
    { type: 'scrolly', id: 'ds', module: 'reel', webgl: false, stepHeight: '80vh', poster: 'still-opmode-list.webp',
      caption: 'Frames from our video of the Driver Station, ten per second. The numbers under it are re-typed from the screen, only where they can be read.',
      steps: [
        { h: 'Pick a version', p: ['The list of autonomous programs: version after version, from V2 to V12.'] },
        { h: 'Press play', p: ['TestAutoV12TurnLeft is loaded. *Mode: waiting*, a tap on play, then *Mode: running*.'] },
        { h: 'Four wheels, one number', p: ['The four encoder counts climb together: **407, 411, 412, 411**, then **1,936, 1,938, 1,934, 1,935** about two and a half seconds later. In every reading I can make out on the screen, from 20 up to 2,395, the four are within 7 counts of each other.'] },
        { h: 'And then they split', p: ['Then all four start over near zero, and this time they part ways: **leftFront** counts down, to -68, while **rightFront** counts up, to 108.'] },
      ],
      data: {
        aria: 'The Driver Station phone running a test autonomous, with the four drive encoder counts climbing together',
        aspect: 16 / 9, frames: `${F}/ds/`, framesSmall: `${F}/ds-s/`, count: 80, fps: 10,
        // every value was read off the screen, frame by frame: [time of the first frame showing it, values];
        // the 6.1 s reading is left out because one digit cannot be read
        readout: {
          title: 'Read off the screen at', names: ['leftFront', 'rightFront', 'leftRear', 'rightRear'], max: 2500,
          waiting: 'Encoder counts on the screen', until: 6.55, after: 'Counts start over',
          at: [
            [2.3, [20, 23, 26, 23]], [2.5, [113, 118, 120, 118]], [2.8, [262, 266, 267, 266]], [3.0, [407, 411, 412, 411]],
            [3.3, [553, 557, 560, 557]], [3.5, [703, 707, 708, 706]], [3.8, [856, 860, 860, 859]], [4.0, [1011, 1014, 1014, 1012]],
            [4.3, [1157, 1159, 1160, 1157]], [4.6, [1318, 1320, 1319, 1319]], [4.8, [1471, 1474, 1472, 1470]], [5.1, [1619, 1621, 1620, 1619]],
            [5.3, [1780, 1782, 1779, 1777]], [5.6, [1936, 1938, 1934, 1935]], [5.8, [2089, 2090, 2087, 2087]], [6.4, [2395, 2395, 2392, 2395]],
          ],
        },
        steps: [
          { image: 'still-opmode-list.webp', ar: 16 / 9, chip: 'Driver Station: pick an autonomous', alt: 'The Driver Station list of autonomous programs, TestAutoV2 to TestAutoV12',
            doodles: [{ arrow: [[0.7, 0.24], [0.54, 0.34]] }],
            notes: [{ text: 'V2 to V12!', x: 77, y: 18, rot: -8 }] },
          { from: 0, to: 2.3, still: 2.1 },
          { from: 2.3, to: 6.5, still: 5.6 },
          { from: 6.5, to: 7.9, still: 7.5 },
        ],
      } },

    // ------------------------------------------------------------------ bloopers
    { type: 'prose', id: 'bloopers', h: 'Bloopers', media: [
      { v: 'blooper-camera-hit.mp4', c: 'The robot found the camera.' },
    ], p: [
      'Not every test was a clean run. Here the camera is sitting on the field floor. The robot rolls past it, and a few seconds later comes right at it.',
    ] },
  ],
};
