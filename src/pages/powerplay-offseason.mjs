// PowerPlay off-season robot (S.T.A.T.I.C., FTC 18996), April to August 2023. Rich page.
// There is no CAD file of this robot (Jerry's checklist: "no cad for now, would need to find"), so the
// page has no 3D and no stand-in geometry. Jerry, Sept 26: projects without CAD are scroll-based too,
// and scrolling advances a slideshow of the real media. So the four scrollies are 2D (webgl: false):
// real test clips stepped frame by frame (WebP frame sequences cut from the page's own clips into
// /assets/models/powerplay-offseason/frames/ by /home/claude/work/powerplay-offseason-robot/frames.sh),
// photos, and CAD screenshots, all driven only by the scroll.
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

// Frames per clip at 8 fps: frame i is clip time i / 8 s. n counts the whole clip; only the frames the
// scrollies use are on disk.
const FPS = 8;
const FRAMES = {
  'arm-lift-cone': { n: 60 },
  'hero-lift-junction': { n: 32 },
  'hero-arm-swing': { n: 32 },
  'arm-cone-reach': { n: 88 },
  'arm-swing-back': { n: 36 },
  'lift-string-extend': { n: 120 },
  'arm-bench-swing': { n: 72 },
  'servo-gear-closeup': { n: 56 },
};
const P = '/assets/models/powerplay-offseason';

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
    { type: 'scrolly', id: 'cycle', module: 'reel', webgl: false, width: 'full', poster: `${P}/poster-cycle.webp`,
      h: 'One cycle, from real test clips',
      p: ['A POWERPLAY cycle goes: grab a cone, lift, swing it out over the pole, drop it, come back. Scroll, and one plays out in my test clips from Aug 25 to 29, 2023, put in that order and stepped frame by frame. They are separate tests, and they stop short of dropping a cone on a pole.'],
      steps: [
        { h: 'Grab', p: ['The claw\'s curved printed jaws wrap around the body of the cone. In this test the arm is lifted by hand, with a cone in the claw.'],
          view: { shots: [{ clip: 'arm-lift-cone', from: 0, to: 7.5, date: 'Aug 25, 2023', c: 'The arm lifting a cone off the robot, moved by hand', tag: 'Moved by hand' }] } },
        { h: 'Lift', p: ['Two towers of drawer slides, pulled up by string, raise the arm. Here the lift rises beside a junction pole on our practice field.'],
          view: { shots: [
            { clip: 'hero-lift-junction', from: 2, to: 4, w: 3, date: 'Aug 29, 2023', c: 'The lift rising beside a junction pole', tag: 'Clip' },
            { i: 'still-lift-junction.webp', w: 1, date: 'Aug 29, 2023', c: 'The robot beside a junction pole, arm straight up', tag: 'Still from a clip' },
          ] } },
        { h: 'Swing over', p: ['A servo swings the belted arm from folded back over the chassis, over the top, to out in front. Here it is driven from a handheld servo tester.'],
          view: { shots: [{ clip: 'hero-arm-swing', from: 0, to: 4, date: 'Aug 25 to 26, 2023', c: 'Folded back to out in front, on a servo tester', tag: 'Servo power' }] } },
        { h: 'Reach', p: ['At full reach the cone is held high above the field wall. This check was by hand: flip the arm over and hold it up to see where the cone ends up.'],
          view: { shots: [
            { clip: 'arm-cone-reach', from: 2.5, to: 10.5, w: 3, date: 'Aug 25, 2023', c: 'Checking the reach by hand with a cone in the claw', tag: 'Moved by hand' },
            { i: 'still-arm-cone-high.webp', w: 1, date: 'Aug 25, 2023', c: 'The cone high above the field wall', tag: 'Still from a clip' },
          ] } },
        { h: 'Come back', p: ['The arm swings back to fold over the chassis and the lift comes down, ready for the next cone.'],
          view: { shots: [
            { clip: 'arm-swing-back', from: 0, to: 4.5, w: 2, date: 'Aug 25 to 26, 2023', c: 'Out in front to folded back, on the servo tester', tag: 'Servo power' },
            { clip: 'hero-lift-junction', from: 0, to: 2, w: 1, date: 'Aug 29, 2023', c: 'The lift coming down', tag: 'Clip' },
          ] } },
      ],
      caption: 'Real test clips from Aug 25 to 29, 2023, in the order of a cycle. In steps 1 and 4 the arm is moved by hand; in steps 3 and 5 it runs on a servo tester.',
      data: { aria: 'One POWERPLAY cycle told with real test clips', fps: FPS, frames: FRAMES } },

    // ------------------------------------------------------------------ drivetrain
    { type: 'prose', id: 'drivetrain', h: 'Learning CAD on the drivetrain', p: [
      'The first CAD in my photos is the drivetrain. In April 2023 there is a drive module between two plates with its motors, and a dead-wheel odometry pod: a small unpowered wheel on a pivot, hanging from the side plate between the drive wheels, that measures how far the robot has moved over the floor.',
      'By May the chassis was a box of aluminum channel on mecanum wheels, with a custom side plate over the wheels on each side. Those side plates went through several pocket layouts: a sketch of pockets drawn over a solid plate on Apr 30, the plain plate on May 4, a triangulated pattern on May 12, and a new layout drawn over the plate in red on Jun 1.',
    ], media: [
      [{ i: 'cad-drive-module.webp', c: 'Apr 26, 2023: an early drive module in Fusion 360, two motors between two plates' },
        { i: 'cad-odometry-pod.webp', c: 'April 2023: the dead-wheel odometry pod (blue) hanging from the side plate' }],
      { i: 'cad-chassis-side.webp', c: 'May 7, 2023: the chassis side in CAD, with the mecanum wheels and the odometry pod' },
    ] },

    { type: 'scrolly', id: 'timeline', module: 'timeline', webgl: false, width: 'wide', side: 'left', length: '480vh', poster: `${P}/poster-timeline.webp`,
      h: 'From CAD to robot',
      p: ['April to August 2023, one dated picture at a time: the CAD on the top band of the rail, the build on the bottom. Scroll, and the robot goes from Fusion 360 to the practice field.'],
      caption: 'Dates come from the photo files; clip stills are dated by the photos around them. The April pod video has no exact date.',
      data: {
        aria: 'The robot from CAD to the practice field, April to August 2023',
        from: '2023-04-01', to: '2023-08-31',
        items: [
          { d: '2023-04-15', when: 'April 2023', band: 'cad', i: 'cad-odometry-pod.webp', c: 'The dead-wheel odometry pod in CAD, turned on its pivot' },
          { d: '2023-04-26', band: 'cad', i: 'cad-drive-module.webp', c: 'A drive module between two plates, with two motors' },
          { d: '2023-04-30', band: 'cad', i: 'cad-plate-pocket-sketch.webp', c: 'The first sketch of pockets over the side plate' },
          { d: '2023-05-04', band: 'cad', i: 'cad-plate-plain.webp', c: 'The plain side plate, with the wheels and the pod' },
          { d: '2023-05-07', band: 'cad', i: 'cad-chassis-side.webp', c: 'The chassis side: mecanum wheels and the odometry pod' },
          { d: '2023-05-12', band: 'cad', i: 'cad-plate-pocketed.webp', c: 'A triangulated pocket layout' },
          { d: '2023-05-22', band: 'cad', i: 'cad-slides-render.webp', c: 'An early render with long slide stacks drawn out, two up and two forward' },
          { d: '2023-06-01', band: 'cad', i: 'cad-plate-markup.webp', c: 'The next pocket layout, drawn over the plate in red' },
          { d: '2023-07-29', band: 'build', i: 'plate-built-mecanum.webp', c: 'A finished pocketed side plate over the mecanum wheels' },
          { d: '2023-08-05', band: 'build', i: 'chassis-both-sides.webp', c: 'Both halves of the drivetrain' },
          { d: '2023-08-15', band: 'build', v: 'drive-test.mp4', c: 'Drive test of the bare drivetrain (a still from the clip)' },
          { d: '2023-08-17', band: 'cad', i: 'cad-claw-render.webp', c: 'The claw around a cone in CAD' },
          { d: '2023-08-21', band: 'cad', i: 'cad-full-robot.webp', c: 'The whole robot in CAD' },
          { d: '2023-08-22', band: 'build', i: 'slides-tower.webp', c: 'One lift tower: three drawer slides with printed caps' },
          { d: '2023-08-23', band: 'build', i: 'lift-spool-motor.webp', c: 'A printed spool wound with string on a lift motor' },
          { d: '2023-08-24', band: 'build', i: 'arm-servo-gear.webp', c: 'The arm servo with its pinion and the large aluminum gear' },
          { d: '2023-08-25', band: 'build', i: 'still-arm-bench.webp', c: 'The belted arm, off the robot' },
          { d: '2023-08-26', band: 'build', i: 'robot-standing.webp', c: 'The whole robot on our practice field, lift and arm up' },
          { d: '2023-08-29', band: 'build', i: 'still-lift-junction.webp', c: 'Beside a junction pole on the practice field, arm straight up' },
        ],
      } },

    { type: 'iterations', id: 'pockets', h: 'The side plate, layout by layout', items: [
      { label: 'Apr 30, 2023', title: 'A sketch over the solid plate', p: ['The first pocket pattern, sketched in white straight over the side plate, with the wheels and the odometry pod behind it.'],
        media: [{ i: 'cad-plate-pocket-sketch.webp', c: 'Apr 30, 2023: the first pocket sketch over the side plate' }] },
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
      'The lift is two towers, one on each side of the robot. Each tower is a stack of three drawer slides with printed caps on top.',
      'A printed spool on a motor at the base winds in string. The string runs up the stages and turns over printed pulleys at their tops, so winding it in pulls the stages up. The spool in the photo sits on a gearbox built from stacked planetary stages.',
    ], media: [
      { i: 'slides-tower.webp', c: 'Aug 22, 2023: one lift tower, three drawer slides with printed caps' },
      { i: 'lift-spool-motor.webp', c: 'Aug 23, 2023: a printed spool wound with string, on a motor with a gearbox of stacked planetary stages' },
    ] },

    { type: 'scrolly', id: 'lift', module: 'reel', webgl: false, width: 'full', poster: `${P}/poster-lift.webp`,
      steps: [
        { h: 'The spool', p: ['A printed spool on a lift motor winds the string in. The motor\'s gearbox is built from stacked planetary stages.'],
          view: { shots: [{ i: 'lift-spool-motor.webp', date: 'Aug 23, 2023', c: 'The printed spool, wound with string, on its motor', tag: 'Photo' }] } },
        { h: 'The stages', p: ['Each tower is three drawer slides, and the string pulls the stages up. Here they are pulled up by hand while the lift is strung.'],
          view: { shots: [{ clip: 'lift-string-extend', from: 0, to: 6, date: 'Aug 29, 2023', c: 'Pulling the stages up by hand, with the string running up beside them', tag: 'Moved by hand' }] } },
        { h: 'The pulleys', p: ['At the top of each stage the string turns over a printed pulley block.'],
          view: { shots: [{ clip: 'lift-string-extend', from: 11, to: 13, date: 'Aug 29, 2023', c: 'A printed pulley block at the top of a stage', tag: 'Moved by hand' }] } },
        { h: 'Full height', p: ['All three stages out: the tower at full height, and the whole robot with its lift up.'],
          view: { shots: [
            { clip: 'lift-string-extend', from: 13, to: 15, w: 2, date: 'Aug 29, 2023', c: 'Looking up the tower at full height', tag: 'Moved by hand' },
            { i: 'robot-standing.webp', w: 1, date: 'Aug 26, 2023', c: 'The whole robot with its lift and arm up', tag: 'Photo' },
          ] } },
      ],
      caption: 'Photos from Aug 23 and 26 and a clip from Aug 29, 2023, stepped frame by frame by the scroll. In the clip the stages are pulled up by hand while the lift is strung.',
      data: { aria: 'How the string lift is built, from a real photo and clip', fps: FPS, frames: FRAMES } },

    { type: 'prose', id: 'lift-problems', h: 'What went wrong in the lift', p: [
      { problem: 'I printed the bores straight into the pulleys, and they stripped out completely on the 5 mm shafts.', title: 'Printed bores stripped' },
      { fix: 'Aluminum hubs bolted into the printed pulleys. I never made this mistake again: on [my 2023-24 robot](/projects/ftc-centerstage#hubs) the printed spools are built around aluminum hubs, so the shaft drives metal instead of plastic.', title: 'Aluminum hubs', label: 'Fixed on later robots' },
      { problem: 'I was really bad at stringing it, our tensioning was really bad, and the string we used was bad: it frayed and broke.', title: 'String, stringing and tension' },
      { fix: 'Belt. In my later FTC seasons I used belt instead of string.', title: 'Belt instead of string', label: 'Changed on later robots' },
      { problem: 'I used REV planetary gearboxes, and they had a lot of friction. They are individual stages that you assemble into a gearbox yourself, and doing that with REV stages has the potential to go badly.', title: 'Friction in the planetary gearboxes' },
      { next: 'Go with goBILDA gearboxes, which do not come as individual stages you assemble.' },
    ], media: [
      { i: 'still-dyneema-spool.webp', c: 'Aug 23, 2023, while stringing the lift: a spool of 1.0 mm Dyneema whipping twine' },
      { v: 'lift-stringing-base.mp4', c: 'Aug 29, 2023: stringing the lift at its base, with the first stage pulled up by hand' },
    ] },

    // ------------------------------------------------------------------ the arm
    { type: 'prose', id: 'arm-build', h: 'The arm: a belted virtual four bar', p: [
      'On top of the lift sits the arm that carries the cone out over the pole. It is a belted virtual four bar. A parallel four bar uses two equal links so the end keeps its angle as the arm swings; a virtual four bar gets the same effect from one arm and a belt, which runs along the arm from a pulley at the pivot to a pulley at the claw end.',
      'The arm swings from folded back over the chassis, over the top, to out in front. Its pivot is driven by a servo through a gear reduction: a small pinion on the servo turns a large aluminum gear on the pivot shaft. Threaded rods tie the tops of the two towers together.',
    ], media: [
      { i: 'still-arm-bench.webp', c: 'Aug 25, 2023: the arm off the robot, with the belt running from the pivot pulley to the pulley at the claw end' },
      { i: 'arm-servo-gear.webp', c: 'Aug 24, 2023: the arm servo with its pinion and the large aluminum gear, on a printed mount' },
    ] },

    { type: 'scrolly', id: 'arm', module: 'reel', webgl: false, width: 'wide', side: 'right', poster: `${P}/poster-arm.webp`,
      steps: [
        { h: 'The belt', p: ['Off the robot, the arm is two bars with a belt running along them from the pulley at the pivot to the pulley at the claw end. Swinging it by hand shows its whole range.'],
          view: { shots: [{ clip: 'arm-bench-swing', from: 0, to: 9, date: 'Aug 25, 2023', c: 'The arm off the robot, swung by hand through its range', tag: 'Moved by hand' }] } },
        { h: 'The drive', p: ['A small pinion on the servo turns the large aluminum gear on the pivot shaft: a reduction that trades the servo\'s speed for torque at the arm.'],
          view: { shots: [
            { i: 'still-servo-gear.webp', date: 'Aug 25 to 26, 2023', c: 'The arm drive on top of a tower: servo, pinion and the large gear', tag: 'Still from a clip' },
            { clip: 'servo-gear-closeup', from: 0, to: 7, date: 'Aug 25 to 26, 2023', c: 'The arm drive as the arm is moved by hand', tag: 'Moved by hand' },
          ] } },
        { h: 'Out in front to folded back', p: ['Under servo power, driven from a handheld servo tester, the arm swings from out in front, over the top, to folded back over the chassis.'],
          view: { shots: [{ clip: 'arm-swing-back', from: 0, to: 4.5, date: 'Aug 25 to 26, 2023', c: 'Out in front to folded back, on the servo tester', tag: 'Servo power' }] } },
        { h: 'And back out', p: ['And from folded back, over the top, to out in front again.'],
          view: { shots: [{ clip: 'hero-arm-swing', from: 0, to: 4, date: 'Aug 25 to 26, 2023', c: 'Folded back to out in front, on the servo tester', tag: 'Servo power' }] } },
      ],
      caption: 'Real clips from Aug 25 to 26, 2023, stepped frame by frame by the scroll.',
      data: { aria: 'The belted arm and its drive, from real clips', fps: FPS, frames: FRAMES } },

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
