// FTC ULTIMATE GOAL robot (team 18996), 2020-21: rich page.
// Jerry's checklist: "There's no CAD for this, only pictures and videos, so you can have a bit of
// fun with this one ... a bit more fun and juvenile because this was like 2020". So: the same page
// system, a lighter voice, "Level" section names, and a build diary of photos by day (Jerry, Sept 27,
// 21:12: the bloopers strip is removed). No CAD exists, so there is no 3D and no stand-in geometry. Jerry, Sept 27: real footage plays
// as video ("the scrolling should only advance CAD animations"), and a scroll slideshow of separate
// photos is awkward, so the three frame-by-frame blocks became the clips themselves (the cup close-up,
// the run, the Driver Station) and the build photos are normal pictures. magazine-closeup.mp4 is
// our shooter video cropped around the cup. Calculations use only what the footage shows: the
// ring times and the encoder counts on the screen (motors, wheels and counts per turn are not stated).
// Facts: Jerry's (projects.mjs: first FTC season, the team's only programmer) and what the media
// plainly shows (ring times, the ring leaving the bottom of the stack, the encoder counts and the
// program names were read frame by frame off the clips). Photo days are counted from the first
// photo in the album (file dates).
// Held back until Jerry answers (/home/claude/work/ftc-20-21/questions.md): the team name and the
// season dates (they conflict with FIRST's own page; the page says only "team 18996"), any results,
// whether the run was autonomous, how the shooter works beyond what the footage shows, whether the
// robot had an intake, how the wobble goal is held, what he wrote the code in, and every "next time".
// Nobody is named, and every photo is cropped to hands and hardware.
export default {
  summary: {
    stats: [
      { v: '1st', l: 'FTC season' },
      { v: '1', l: 'Programmer on the team (me)' },
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
    { type: 'prose', id: 'field', h: 'The home field', media: [
      { i: 'still-cardboard-goal.webp', c: 'The goal: a Home Depot box with an opening cut in it, taped at the corners' },
    ], p: [
      'In ULTIMATE GOAL, robots shoot orange foam rings at goals on the far wall, and carry **wobble goals**, poles with a black dome on top, into taped target zones.',
      'Our practice field was homemade: plywood walls, gray foam floor tiles, red tape for the target zones and white tape for the lines. The goal was a cardboard box with an opening cut in the front.',
    ] },

    // ------------------------------------------------------------------ level 2
    { type: 'split', id: 'build', h: 'The build, in twenty days of photos', items: [
      { h: 'Day 1: the agenda, and the options', media: [
        { i: 'whiteboard-agenda.webp', c: 'Day 1, the plan: *work faster* crossed out and fixed to *work smarter*, then intake and conveyor' },
        { i: 'whiteboard-intake-ideas.webp', c: 'Day 1: conveyor A and B, four numbered ideas, and a ring\'s path sketched in the corner' },
      ], p: [
        'Five lines on a whiteboard. *Work faster* got crossed out and fixed to *work smarter*, and the last two lines are the plan: an **intake** and a **conveyor**.',
        'Then the options. The conveyor, split into two jobs: **A**, floor to vertical, and **B**, vertical to magazine. Then four numbered ideas: a fast beater, a slow beater or a vertical belt sandwich, a small shooter, and a belt with a tab. In the corner, a sketch of a ring\'s path up from the floor into a box.',
        { note: 'Our photos, in the order they were taken, cropped to hands and hardware. Days are counted from the first photo in the album.' },
      ] },
      { h: 'Day 10: cardboard tubes, and wires everywhere', media: [
        { i: 'tube-arcs-on-table.webp', c: 'Day 10: arcs cut from a cardboard concrete-form tube, next to plywood with curved slots' },
        { i: 'code-before-chassis.webp', c: 'Day 10: loose motors and servos wired up on the field floor, with a laptop and a gamepad' },
      ], p: [
        'Arcs cut from a cardboard concrete-form tube, the round kind used to pour concrete posts, next to a plywood plate with curved slots cut into it.',
        'A laptop, a gamepad, and motors and servos wired up loose on the field floor, next to a plywood deck with a motor in each corner.',
      ] },
      { h: 'Day 11: two prototypes', media: [
        { i: 'rail-prototype-ring.webp', c: 'Day 11: a tube arc standing in a curved slot, a ring held up to it' },
        { i: 'conveyor-prototype.webp', c: 'Day 11: a hardboard tower with timing belts up its walls' },
      ], p: [
        'A tube arc standing in a curved slot in plywood, with a ring held up to it. And a tall hardboard tower with timing belts running up its walls.',
      ] },
      { h: 'Day 18: the shooter plate', media: { i: 'shooter-module-loading.webp', c: 'Day 18: the shooter plate on the carpet: the wheel, the white cup with a ring in it, and the curved rail' }, p: [
        'The shooter comes together on the carpet, off the robot: a black wheel, a white cup with a ring in it, and a curved rail around the edge of the plate.',
      ] },
      { h: 'Day 20: a whole robot', media: { i: 'robot-18996-finished.webp', c: 'Day 20: number plate on, wired up, a phone on the deck' }, p: [
        'Number plate on, a phone screen glowing on the deck, wires in every direction: the robot, assembled.',
      ] },
    ] },

    // ------------------------------------------------------------------ level 3
    { type: 'prose', id: 'shooter', h: 'The ring shooter', media: [
      { v: 'shooter-plate-top.mp4', c: 'Over the top of the shooter plate: the black wheel, the white cup, and the curved rail at the edge' },
    ], p: [
      'The shooter is a tilted plywood plate standing on threaded rods above the drive base. On it: a black wheel lying flat, a white cup that holds a stack of three rings lying flat, a curved rail along the edge of the plate, and a small servo on a bracket beside the cup.',
      'The close-up below shows how the stack feeds. Each shot takes the **bottom** ring: it slides out from under the cup and leaves between the wheel and the curved rail, fast enough to be an orange blur in a single frame. The rings above it drop down by one.',
    ] },
    { type: 'media', id: 'magazine', layout: 'row', items: [
      { i: 'still-shooter-top.webp', c: 'The shooter plate from above: the black wheel, the white cup with three rings in it, the servo on its bracket, and the curved rail along the edge' },
      { v: 'magazine-closeup.mp4', c: 'Close up on the cup: three rings, then two, then one, then empty. Each shot takes the bottom ring, and the last one leaves between the wheel and the rail as an orange blur' },
    ] },
    { type: 'media', layout: 'grid', cols: 3, items: [
      { v: 'cutting-the-tube-rail.mp4', c: 'Cutting a cardboard concrete-form tube with a power tool: "TUBE" is printed right on the side' },
      { i: 'shooter-module-side.webp', c: 'The shooter plate from the side, before it went on the robot: the white cup, the threaded rods and a servo on its bracket' },
      { i: 'shooter-plate-tipped.webp', c: 'The robot tipped up for work, shooter plate toward the camera: wheel at the top, rings in the cup, the servo beside it' },
    ] },

    // ------------------------------------------------------------------ level 4
    { type: 'prose', id: 'run', h: 'The run', media: [
      { v: 'hero-three-rings-and-wobble.mp4', c: 'The run from the top of the page: three rings toward the box on the right, then a lap with the wobble goal on board' },
    ], p: [
      'The run from the top of the page, move by move. Ring times are the frames where each ring first shows in the air, measured on the 4K original.',
      { ul: [
        '**0.4 s**: the robot sits at the bottom left of the field, and ring one is in the air, headed for the cardboard box on the right.',
        '**1.7 s**: ring two, 1.3 s after the first.',
        '**3.0 s**: ring three, another 1.3 s later. Three rings out.',
        'Then it turns and heads up the field with the wobble goal, the black-domed pole, riding upright on its side.',
        'On the way back it rolls over a ring lying on the field, and half a second later there is a ring in the white cup.',
        'It ends the clip among the taped squares near the camera, the wobble goal still on board.',
      ] },
      { calc: 'How fast does it empty the cup?',
        given: [
          ['Ring one in the air', '0.4 s', 'measured from our video, frame by frame'],
          ['Ring two', '1.7 s', 'same video'],
          ['Ring three', '3.0 s', 'same video'],
        ],
        work: [
          'Between shots: 1.7 s - 0.4 s = 1.3 s, and 3.0 s - 1.7 s = 1.3 s',
          'First ring to last: 3.0 s - 0.4 s = 2.6 s for three rings',
          'While it fires: 60 s / 1.3 s = about 46 rings a minute',
        ],
        result: 'A full cup of three rings is gone 2.6 s after the first one leaves, one ring every 1.3 s.',
        note: 'From one run on video, to the nearest tenth of a second; not a timed test.' },
    ] },
    { type: 'media', layout: 'row', items: [
      { v: 'drive-and-shoot.mp4', c: 'Another run: the robot turns, then sends rings toward the box on the right' },
      { i: 'still-robot-front-low.webp', c: 'From the floor: the tilted plate on its threaded rods, the motors under it, and the drive base' },
    ] },

    // ------------------------------------------------------------------ level 5
    { type: 'prose', id: 'code', h: 'My part: the code', media: [
      { i: 'still-opmode-list.webp', c: 'The Driver Station list of autonomous programs: TestAutoV2 to TestAutoV12, with a TurnLeft and a TurnRight version of V12' },
      { v: 'ds-encoder-telemetry.mp4', c: 'TestAutoV12TurnLeft running: *Mode: waiting*, play, *Mode: running*, and the four drive encoder counts climbing together' },
    ], p: [
      'I was the team\'s only programmer. On the Driver Station phone, the list of autonomous programs is a stack of numbered test versions, from TestAutoV2 up to TestAutoV12, with a TurnLeft and a TurnRight version of V12.',
      'The one in the clip is TestAutoV12TurnLeft. It is loaded, *Mode: waiting*, a tap on play, then *Mode: running*, and while it runs it prints all four drive encoder counts to the screen. They climb together. Then all four start over near zero, and this time they part ways: **leftFront** counts down, to -68, while **rightFront** counts up, to 108.',
      { table: {
        head: ['Time in the clip', 'leftFront', 'rightFront', 'leftRear', 'rightRear'],
        rows: [
          ['2.3 s', '20', '23', '26', '23'],
          ['3.0 s', '407', '411', '412', '411'],
          ['4.0 s', '1,011', '1,014', '1,014', '1,012'],
          ['5.1 s', '1,619', '1,621', '1,620', '1,619'],
          ['5.6 s', '1,936', '1,938', '1,934', '1,935'],
          ['6.4 s', '2,395', '2,395', '2,392', '2,395'],
        ],
        caption: 'Encoder counts re-typed from the screen in the clip, only where every digit can be read.',
      } },
      { calc: 'Did the four wheels turn together?',
        given: [
          ['Counts at 3.0 s', '407, 411, 412, 411', 'read off the Driver Station in our video'],
          ['Counts at 6.4 s', '2,395, 2,395, 2,392, 2,395', 'same video'],
          ['Widest gap in any readable reading (16 of them)', '7 counts', 'same video (at 2.5 s and 3.3 s)'],
        ],
        work: [
          'At 3.0 s: 412 - 407 = 5 counts apart, 5 / 411 = about 1.2 %',
          'At 6.4 s: 2,395 - 2,392 = 3 counts apart, 3 / 2,395 = about 0.1 %',
          'Count rate: (2,395 - 411) counts / (6.4 s - 3.0 s) = about 580 counts a second on each wheel',
        ],
        result: 'All four wheels stayed within 7 counts of each other, and the gap never grew as the counts climbed from 20 to 2,395: the four wheels turned together.',
        note: 'Counts are as the code printed them; the motors and their counts per turn are not known, so this is not converted to a speed.' },
    ] },
  ],
};
