// PowerPlay off-season robot (S.T.A.T.I.C., FTC 18996), April to August 2023. Rich page.
// There is no CAD file of this robot (Jerry's checklist: "no cad for now, would need to find"), so the
// page has no 3D and no stand-in geometry. Jerry, Sept 27: real footage plays as video ("the
// scrolling should only advance CAD animations"), and a scroll slideshow of separate photos is
// awkward. So the three frame-by-frame scrollies (cycle, lift, arm) became the test clips themselves,
// playing normally beside their text, and the dated CAD-to-robot timeline is normal pictures.
// No calculation block: the rigging (continuous or cascade), the spool size, the slide length, the
// motors and the arm's gear teeth are not stated, and the lift's loads are unknown.
// Copy uses only what Jerry stated (checklist: first CAD project, string-driven drawer slides, belted
// virtual four bar, the printed bores, the string, the REV planetary stages; projects.mjs) and what
// the media plainly shows, with dates from the files (clip dates from the photo numbering around
// them).
// Held back until Jerry answers (phase A questions.md): whether it ever scored a cone, went to an
// event or demo, or became parts for the 2023-24 robot (Q1: the page claims none); which pulleys
// stripped and whether the 5 mm shafts were hex or REX (Q2: "5 mm shafts" only); continuous or
// cascade rigging, what brings the slides down, which string frayed (Q3); whether the pivot pulley
// is fixed with equal pulleys, tooth counts, one servo or two (Q4: the virtual four bar is explained
// as the principle only, no ratio); what the long forward slides in the May 22 render are (Q5:
// captioned as seen); who built it (Q6: "I" for the design, "we" only in Jerry's own words); why the
// pockets changed, plate material and cutting, whether the odometry pods were built (Q7); which
// motors carried the REV stages and the lift ratio (Q8). No faces (IMG_0794, 0798, 0799, 1982 are
// never used) and no car photo (IMG_2042).

export default {
  summary: {
    stats: [
      { v: '1st', l: 'Robot I designed in CAD' },
      { v: '2 x 3', l: 'Lift towers, each three drawer slides pulled up by string' },
      { v: 'Apr to Aug', l: '2023, from the first drivetrain CAD to the lift at a junction pole' },
      { v: '3', l: 'Lessons: printed bores, string, stacked gearbox stages' },
    ],
    text: [
      'This was the **first robot I ever designed in CAD**: an off-season robot for my FTC team, S.T.A.T.I.C. (FTC 18996), after the 2022-23 POWERPLAY season. It lifts with **two towers of string-driven drawer slides** and swings the cone with a **belted virtual four bar** on top of them.',
      'It went from my first drivetrain CAD in April 2023 to the lift moving beside a junction pole on Aug 29. Most of what I learned came from what went wrong: printed pulley bores that stripped, string that frayed and broke, and planetary gearbox stages with a lot of friction. I never printed a bore into a pulley again.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-arm-swing.mp4', c: 'Aug 25 to 26, 2023: the belted arm swinging from folded back to out in front under servo power, driven from a handheld servo tester' },
      { v: 'hero-lift-junction.mp4', c: 'Aug 29, 2023: the lift coming down and rising again beside a junction pole' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ the game
    { type: 'prose', id: 'game', h: 'POWERPLAY, and a robot in the off-season', p: [
      'In POWERPLAY, the 2022-23 FIRST Tech Challenge game, robots pick up plastic cones and drop them over poles called junctions; the high junctions are the tallest. 2022-23 was my first season as captain of S.T.A.T.I.C., and the first time our team advanced to regionals ([that season\'s robot](/projects/ftc-powerplay)).',
      'After the season I designed a new robot for the same game, my first project in CAD, in Fusion 360. This page follows it from the first drivetrain screenshots in April 2023 to the lift moving beside a junction pole at the end of August, using my CAD screenshots, photos and test clips.',
    ] },

    // ------------------------------------------------------------------ one cycle, from footage
    { type: 'prose', id: 'cycle', h: 'One cycle, from real test clips', p: [
      'A POWERPLAY cycle goes: grab a cone, lift, swing it out over the pole, drop it, come back. Here one plays out in my test clips from Aug 25 to 29, 2023, put in that order. They are separate tests, and they stop short of dropping a cone on a pole.',
    ] },
    { type: 'split', id: 'cycle-clips', items: [
      { h: 'Grab, then lift', media: { v: 'arm-lift-cone.mp4', c: 'Aug 25, 2023: the arm lifting a cone off the robot, moved by hand' }, p: [
        'The claw\'s curved printed jaws wrap around the body of the cone. In this test the arm is lifted by hand, with a cone in the claw.',
        'Then two towers of drawer slides, pulled up by string, raise the arm. The second clip at the top of the page is the lift rising beside a junction pole on our practice field, on Aug 29.',
      ] },
      { h: 'Swing over, and reach', media: { v: 'arm-cone-reach.mp4', c: 'Aug 25, 2023: checking the reach by hand with a cone in the claw, up to the cone high above the field wall' }, p: [
        'A servo swings the belted arm from folded back over the chassis, over the top, to out in front: the first clip at the top of the page, driven from a handheld servo tester.',
        'At full reach the cone is held high above the field wall. This check was by hand: flip the arm over and hold it up to see where the cone ends up.',
      ] },
      { h: 'Come back', media: { v: 'arm-swing-back.mp4', c: 'Aug 25 to 26, 2023: out in front to folded back, on the servo tester' }, p: [
        'The arm swings back to fold over the chassis and the lift comes down, ready for the next cone. Here the arm runs on the servo tester, from out in front to folded back.',
      ] },
    ] },

    // ------------------------------------------------------------------ drivetrain
    { type: 'prose', id: 'drivetrain', h: 'Learning CAD on the drivetrain', p: [
      'The first CAD in my photos is the drivetrain. In April 2023 there is a drive module between two plates with its motors, and a dead-wheel odometry pod: a small unpowered wheel on a pivot, hanging from the side plate between the drive wheels, that measures how far the robot has moved over the floor.',
      'By May the chassis was a box of aluminum channel on mecanum wheels, with a custom side plate over the wheels on each side. Those side plates went through several pocket layouts: a sketch of pockets drawn over a solid plate on Apr 30, the plain plate on May 4, a triangulated pattern on May 12, and a new layout drawn over the plate in red on Jun 1.',
    ], media: [
      [{ i: 'cad-drive-module.webp', c: 'Apr 26, 2023: an early drive module in Fusion 360, two motors between two plates' },
        { i: 'cad-odometry-pod.webp', c: 'April 2023: the dead-wheel odometry pod (blue) hanging from the side plate' }],
      { i: 'cad-chassis-side.webp', c: 'May 7, 2023: the chassis side in CAD, with the mecanum wheels and the odometry pod' },
    ] },

    { type: 'iterations', id: 'pockets', h: 'The side plate, layout by layout', items: [
      { label: 'Apr 30, 2023', title: 'A sketch over the solid plate', p: ['The first pocket pattern, sketched in white straight over the side plate, with the wheels and the odometry pod behind it.'],
        media: [{ i: 'cad-plate-pocket-sketch.webp', c: 'Apr 30, 2023: the first pocket sketch over the side plate' }] },
      { label: 'May 4, 2023', title: 'The plain plate', p: ['The side plate with no pockets at all, with the wheels and the odometry pod behind it.'],
        media: [{ i: 'cad-plate-plain.webp', c: 'May 4, 2023: the plain side plate, with the wheels and the pod' }] },
      { label: 'May 12, 2023', title: 'Triangulated pockets', p: ['A layout of triangulated pockets between thin webs, cut through the whole plate.'],
        media: [{ i: 'cad-plate-pocketed.webp', c: 'May 12, 2023: a triangulated pocket layout' }] },
      { label: 'Jun 1, 2023', title: 'The next layout, in red', p: ['A new layout drawn by hand in red over the plate.'],
        media: [{ i: 'cad-plate-markup.webp', c: 'Jun 1, 2023: the next layout, drawn over the plate in red' }] },
      { label: 'Jul 29, 2023', title: 'Built', p: ['The finished plate on the robot, with the mecanum wheels and gears showing through the pockets. The drivetrain was built by early August and driving on our practice field by Aug 15, before the lift went on.'],
        media: [{ i: 'plate-built-mecanum.webp', c: 'Jul 29, 2023: a finished pocketed side plate over the mecanum wheels' }] },
    ] },
    { type: 'media', id: 'drive', layout: 'row', items: [
      { i: 'chassis-both-sides.webp', c: 'Aug 5, 2023: both halves of the drivetrain' },
      { v: 'drive-test.mp4', c: 'Aug 15, 2023: drive test of the bare drivetrain on our practice field' },
    ] },

    // ------------------------------------------------------------------ the lift
    { type: 'prose', id: 'lift-build', h: 'The lift: string-driven drawer slides', p: [
      'Slides show up in the CAD in May: an early render on May 22 has long slide stacks drawn out, two up and two forward.',
      'The lift is two towers, one on each side of the robot. Each tower is a stack of three drawer slides with printed caps on top.',
      'A printed spool on a motor at the base winds in string. The string runs up the stages and turns over printed pulleys at their tops, so winding it in pulls the stages up. The spool in the photo sits on a gearbox built from stacked planetary stages.',
      'On Aug 29 the lift was being strung. Pulled up by hand, the stages rise with the string running up beside them and over a printed pulley block at the top of each stage, until the tower stands at full height.',
    ], media: [
      { i: 'cad-slides-render.webp', c: 'May 22, 2023: an early render with long slide stacks drawn out, two up and two forward' },
      { i: 'slides-tower.webp', c: 'Aug 22, 2023: one lift tower, three drawer slides with printed caps' },
      { i: 'lift-spool-motor.webp', c: 'Aug 23, 2023: a printed spool wound with string, on a motor with a gearbox of stacked planetary stages' },
      [
        { v: 'lift-string-extend.mp4', c: 'Aug 29, 2023: the stages pulled up by hand, the string running up beside them and over the pulley blocks, to full height' },
        { v: 'lift-stringing-base.mp4', c: 'Aug 29, 2023: stringing the lift at its base, with the first stage pulled up by hand' },
      ],
    ] },

    { type: 'prose', id: 'lift-problems', h: 'What went wrong in the lift', p: [
      { problem: 'I printed the bores straight into the pulleys, and they stripped out completely on the 5 mm shafts.', title: 'Printed bores stripped' },
      { fix: 'Aluminum hubs bolted into the printed pulleys. I never made this mistake again: on [my 2023-24 robot](/projects/ftc-centerstage#hubs) the printed spools are built around aluminum hubs, so the shaft drives metal instead of plastic.', title: 'Aluminum hubs', label: 'Fixed on later robots' },
      { problem: 'I was really bad at stringing it, our tensioning was really bad, and the string we used was bad: it frayed and broke.', title: 'String, stringing and tension' },
      { fix: 'Belt. In my later FTC seasons I used belt instead of string.', title: 'Belt instead of string', label: 'Changed on later robots' },
      { problem: 'I used REV planetary gearboxes, and they had a lot of friction. They are individual stages that you assemble into a gearbox yourself, and doing that with REV stages has the potential to go badly.', title: 'Friction in the planetary gearboxes' },
      { next: 'Go with goBILDA gearboxes, which do not come as individual stages you assemble.' },
    ], media: [
      { i: 'still-dyneema-spool.webp', c: 'Aug 23, 2023, while stringing the lift: a spool of 1.0 mm Dyneema whipping twine' },
    ] },

    // ------------------------------------------------------------------ the arm
    { type: 'prose', id: 'arm-build', h: 'The arm: a belted virtual four bar', p: [
      'On top of the lift sits the arm that carries the cone out over the pole. It is a belted virtual four bar. A parallel four bar uses two equal links so the end keeps its angle as the arm swings; a virtual four bar gets the same effect from one arm and a belt, which runs along the arm from a pulley at the pivot to a pulley at the claw end.',
      'The arm swings from folded back over the chassis, over the top, to out in front. Its pivot is driven by a servo through a gear reduction: a small pinion on the servo turns a large aluminum gear on the pivot shaft. Threaded rods tie the tops of the two towers together.',
    ], media: [
      { v: 'arm-bench-swing.mp4', c: 'Aug 25, 2023: the arm off the robot, swung by hand through its range, the belt running from the pivot pulley to the pulley at the claw end' },
      [
        { i: 'arm-servo-gear.webp', c: 'Aug 24, 2023: the arm servo with its pinion and the large aluminum gear, on a printed mount' },
        { v: 'servo-gear-closeup.mp4', c: 'Aug 25 to 26, 2023: the same drive on top of a tower as the arm is moved by hand' },
      ],
    ] },

    // ------------------------------------------------------------------ the claw and the robot
    { type: 'media', id: 'claw', layout: 'row', h: 'The claw',
      p: ['The claw closes curved printed jaws around the body of the cone, driven by a servo through a gear stage. By Aug 17 it was in CAD, drawn around a cone; by Aug 25 the parts were printed and it held a cone on the robot.'],
      items: [
        { i: 'cad-claw-render.webp', c: 'Aug 17, 2023: the claw around a cone in CAD, its gear stage circled in blue' },
        { i: 'claw-printed-parts.webp', c: 'Aug 25, 2023: the printed claw parts, with the curved jaws in purple' },
        { i: 'still-claw-cone.webp', c: 'Aug 25, 2023: the claw gripping a cone' },
      ] },
    { type: 'media', id: 'robot', layout: 'row', h: 'The whole robot',
      p: ['By Aug 21 the whole robot was in CAD: two lift towers on the pocketed drivetrain, with the arm drive on top. Five days later it stood on our practice field with its lift and arm up, and on Aug 29 the lift went down and back up beside a junction pole.'],
      items: [
        { i: 'cad-full-robot.webp', c: 'Aug 21, 2023: the whole robot in Fusion 360, two lift towers on the pocketed drivetrain' },
        { i: 'robot-standing.webp', c: 'Aug 26, 2023: the robot standing on our practice field, lift and arm up' },
        { i: 'still-lift-junction.webp', c: 'Aug 29, 2023: beside a junction pole, arm straight up' },
      ] },

    // ------------------------------------------------------------------ lessons
    { type: 'prose', id: 'next', h: 'What I would do differently', p: [
      { next: 'Bolt aluminum hubs into every printed pulley and spool instead of printing the bore.' },
      { next: 'Use belt instead of string for the lift.' },
      { next: 'Use goBILDA gearboxes instead of REV planetary stages assembled by hand.' },
      { h: 'What carried forward' },
      'This robot is where I learned CAD, and its failures set habits I kept. The printed spools on [my 2023-24 robot](/projects/ftc-centerstage#hubs) are built around aluminum hubs, and in later seasons I used belt instead of string.',
    ], media: [
      { i: 'robot-in-tote.webp', c: 'Aug 29, 2023: packed in a tote, with the arm drive on top of the towers' },
    ] },
  ],
};
