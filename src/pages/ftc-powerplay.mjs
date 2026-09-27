// FTC POWERPLAY robot (S.T.A.T.I.C., FTC 18996), 2022-23. Rich page.
// There is no CAD of this robot (Jerry's checklist: "CAD (n/a)", "just dive into all of the
// mechanisms using the pictures and videos"), so there is no 3D and no stand-in geometry. Jerry,
// Sept 27: projects without CAD are scroll-based too. The five scrollies are 2D (webgl: false) and
// driven only by the scroll: one stationary cycle and the stack pick up are WebP frame sequences cut
// from our own clips (assets/models/ftc-powerplay/frames, never a seeked video), the arm and the
// claws are our photos with outlines drawn over them, and the season is a chart of the official
// results.
// Copy uses only what Jerry stated (projects.mjs: my first season as captain, the team's first time
// advancing to regionals), what the media plainly shows, and the official FIRST event pages for 18996
// (2022 season), read from the raw pages: records counted from the match scores, Scarlet Division
// Q14 marked there as a surrogate match. Times and counts in the scrubs were read off the frames.
// Held back until Jerry answers (phase A questions.md): who designed, built and programmed each part,
// what each of the six servos drives, what the chain and the springs do, the gear ratios, why each
// claw was replaced and which ran at each event, whether parking and stacking was the plan from the
// start, whether the full run is the autonomous program, what changed between Jan 21 and Jan 28, what
// went wrong at the Championship, what the Feb 7 and Feb 8 measurements were for, and every "next
// time" item. IMG_4509 (team 7393's robot) is never used. "We" throughout; "I" only as captain.
const F = '/assets/models/ftc-powerplay/frames';
const RESULTS = 'https://ftc-events.firstinspires.org/2022/team/18996';

// clip times (s) of the frames cut from hero-stationary-cycles.mp4 (12 fps, near-duplicates dropped)
const CY = [1.4, 1.483, 1.567, 1.65, 1.733, 1.817, 1.9, 1.983, 2.067, 2.15, 2.233, 2.317, 2.4, 2.483, 2.567, 2.65, 2.733, 2.9, 2.983, 3.067, 3.233, 3.4, 3.65, 3.817, 4.067, 4.233, 4.317, 4.4, 4.483, 4.567, 4.65, 4.733, 4.817, 4.9, 4.983, 5.067, 5.15, 5.233, 5.317, 5.4, 5.483, 5.567, 5.65, 5.733, 5.817, 5.983, 6.067, 6.15, 6.233, 6.317, 6.4, 6.483, 6.567, 6.65, 6.733, 6.817, 6.9, 6.983, 7.067, 7.15, 7.233, 7.317, 7.4, 7.483, 7.567, 7.733, 7.9, 7.983, 8.067, 8.233, 8.317, 8.483, 8.65, 8.817, 8.9, 8.983, 9.067, 9.15, 9.233, 9.317, 9.4, 9.483, 9.567, 9.65, 9.733, 9.817, 9.9, 9.983, 10.067, 10.15, 10.233, 10.317, 10.4, 10.483, 10.65, 10.9, 11.067, 11.233, 11.317, 11.4, 11.483, 11.567, 11.65, 11.733, 11.817, 11.9];
// and from hero-stack-five.mp4, only the three pick ups (the still stretches between are left out)
const ST = [0.25, 0.333, 0.417, 0.5, 0.583, 0.667, 0.75, 0.833, 0.917, 1.0, 1.083, 1.167, 1.25, 1.333, 1.5, 1.667, 1.75, 1.833, 1.917, 2.0, 2.083, 2.167, 2.25, 2.333, 2.417, 4.5, 4.583, 4.667, 4.75, 4.833, 4.917, 5.0, 5.083, 5.167, 5.25, 5.333, 5.5, 5.583, 5.667, 6.0, 6.083, 6.167, 6.25, 6.333, 6.417, 6.5, 6.583, 6.667, 6.75, 9.167, 9.25, 9.333, 9.417, 9.5, 9.583, 9.667, 9.75, 9.833, 9.917, 10.0, 10.167, 10.333, 10.417, 10.5, 10.583, 10.667, 10.75, 10.833, 10.917, 11.0, 11.083, 11.167, 11.25, 11.333, 11.417, 11.5, 11.667, 11.833];

// qualification matches from the official event pages: our alliance's score first
const W = (m, score) => ({ m, score, w: true });
const L = (m, score) => ({ m, score, w: false });

export default {
  summary: {
    stats: [
      { v: '5-0', l: 'Qualification record at the Union Bridge Qualifier, ranked 3rd of 35' },
      { v: '157', l: 'Our alliance\'s best qualification score of the season, twice at Union Bridge' },
      { v: '3', l: 'Judged awards, including the Inspire Award 3rd Place' },
      { v: 'About 5 s', l: 'Per cone on our practice field, wheels still (timed from the video)' },
    ],
    text: [
      'POWERPLAY was the 2022-23 FIRST Tech Challenge game: robots pick up plastic cones and drop them over poles called junctions. It was my first season as captain of S.T.A.T.I.C. (FTC 18996), and the idea behind our robot shows in every clip on this page: **park beside the cones, keep the wheels still, and let a two-link arm carry each cone up and over the robot onto a pole.**',
      'We went 1-4 and 2-3 in qualification matches at our first two events, then **5-0** at the Union Bridge Qualifier a week later, ranked **3rd of 35** and won the **Inspire Award 3rd Place**. It was the team\'s first season advancing to the Chesapeake Championship.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-stationary-cycles.mp4', c: 'On our practice field the wheels never move: the arm reaches down to the cones at the wall, swings up and over the robot, and drops each one on the pole' },
      { v: 'hero-stack-five.mp4', c: 'Taking the last three cones off a five-cone stack, each one from a little lower than the one before' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ the game and the idea
    { type: 'prose', id: 'game', h: 'The game, and our idea', p: [
      'In POWERPLAY, robots pick up plastic cones and drop them over poles called junctions, which stand in a grid across the field. Cones come from the human player at the side of the field and from stacks of five against the field wall.',
      '2022-23 was my first season as captain. The idea behind our robot is simple to say: park next to the cones and a pole, and let the arm do the travelling instead of the wheels. One cycle is: reach down to the cone, close the claw, lift, swing up and over the top of the robot, let go over the pole, and swing back.',
    ], media: [{ i: 'robot-jan25-side.webp', c: 'January 25, 2023: the arm folded back over the chassis, with the green C-band claw at one end' }] },

    // ------------------------------------------------------------------ one cycle, scrubbed
    { type: 'scrolly', id: 'cycle', module: 'scrub', webgl: false, stepHeight: '85vh', poster: `${F}/cy-000.webp`,
      h: 'One cycle, frame by frame',
      p: ['A clip from our practice field, stepped through by your scroll. Scroll back and it plays backwards.'],
      steps: [
        { h: 'Parked', p: ['The robot sits on a square of blue tape between the cones stacked at the wall and a pole. It stays on that square for the whole clip: only the arm moves.'] },
        { h: 'Grab', p: ['The arm comes down over the side of the robot, and the claw drops over the top of a cone at the wall and closes on it.'] },
        { h: 'Up and over', p: ['Both links swing up past vertical, carrying the cone over the top of the robot to the other side.'] },
        { h: 'Drop', p: ['Over the pole the claw lets go, and the cone slides down the pole onto the ones already there.'] },
        { h: 'Back, and again', p: ['The arm swings back down to the cones and the next cycle starts. In this clip one cone takes about **5 seconds**, drop to drop (timed from the video).'] },
      ],
      caption: 'Real footage, not a model: every scroll position shows one frame of the clip at the top of this page. There is no CAD of this robot.',
      data: {
        aria: 'Our robot on the practice field: the arm takes a cone from the wall and drops it on a pole while the wheels stay still',
        frames: { dir: F, prefix: 'cy', w: 820, h: 695, times: CY },
        focus: [0, 0, 1, 1],
        source: 'Our practice field',
        segs: [
          { from: 1.4, to: 2.55, label: 'Parked' },
          { from: 2.55, to: 4.25, label: 'Grab' },
          { from: 4.25, to: 5.65, label: 'Up and over' },
          { from: 5.65, to: 6.45, label: 'Drop' },
          { from: 6.45, to: 11.9, label: 'Back, and again' },
        ],
      } },

    // ------------------------------------------------------------------ in a match
    { type: 'prose', id: 'match', h: 'It held up in a match', p: [
      'At the CHS-MD Union Bridge Qualifier on January 28, 2023, the stream commentator picked it out in our fifth qualification match of the day:',
      { quote: 'Blue\'s got a mechanism that\'s running without moving any wheels right now, just straight up stacking cones... cap after cap after cap.', by: 'Stream commentator, Union Bridge Qualifier, qualification 38' },
      'We won that match 157-106, our fifth win in five qualification matches that day. Right after it, a junction near our robot held a tall stack of blue cones.',
    ], media: [
      { v: 'match-q38-stream.mp4', c: 'Union Bridge Qualifier, qualification 38, on the event stream (we are blue, with 10719): the stretch where the commentator describes blue stacking cones without moving its wheels. We won 157-106.' },
      { i: 'cone-stack-after-q38.webp', c: 'Right after qualification 38: a junction near our robot (18996 on the arm) holding a tall stack of blue cones' },
    ] },

    // ------------------------------------------------------------------ chassis
    { type: 'media', id: 'chassis', layout: 'row', h: 'The chassis', p: [
      'The robot drives on four mecanum wheels under a frame of aluminum channel, with a REV Control Hub and the wiring on top. Folded, the arm lies along the whole length of the chassis.',
    ], items: [
      { i: 'robot-top-down.webp', c: 'January 31, 2023, from above: the arm folded along the chassis, the claw open at one end, and a stack of cones against the wall' },
      { i: 'chassis-corner.webp', c: 'February 3: a corner of the chassis, with aluminum channel, a motor and a mecanum wheel' },
    ] },

    // ------------------------------------------------------------------ the arm, annotated
    { type: 'scrolly', id: 'arm', module: 'photos', webgl: false, width: 'wide', side: 'right', stepHeight: '85vh', poster: 'still-arm-full-reach.webp',
      h: 'The arm, part by part',
      steps: [
        { h: 'Two links', p: ['The arm has two links. The short lower link, with our 18996 number plate on it, pivots low on the chassis. The long upper link carries the claw at its tip; here both stand straight up, with the claw at the very top.'] },
        { h: 'Folded over the chassis', p: ['Stowed, the arm folds back on itself: the long link lies at an angle over the top of the robot, and the claw ends up above one end of the chassis.'] },
        { h: 'Geared joints', p: ['The joints are geared. At the base of the arm a servo turns a small brass pinion, which meshes with a much larger aluminum gear beside a big aluminum tube hub.'] },
        { h: 'On the arm too', p: ['Another servo does the same on the arm itself: a brass gear on the servo meshes with a large aluminum gear, next to the sprocket where a roller chain starts up the link.'] },
        { h: 'Chain and tensioner', p: ['The roller chain runs up the long link. A small roller on a plate presses on it as a tensioner, to take up the slack.'] },
        { h: 'Six servos', p: ['Our Driver Hub names six servos, each with its position: **Rotator**, **Extender**, **Cone**, **Popper**, **Release** and **Elbow**.'] },
      ],
      caption: 'Our photos; the orange outlines are drawn over them to point out each part.',
      data: {
        slides: [
          { img: 'still-arm-full-reach.webp', w: 1280, h: 720, focus: [0.42, 0, 1, 1],
            c: 'Both links straight up, on our practice field',
            alt: 'The robot on our practice field with both links of the arm straight up; the 18996 plate is on the lower link',
            marks: [
              { pts: [[0.683, 0.455], [0.752, 0.455], [0.742, 0.84], [0.672, 0.84]], label: 'Lower link', at: [0.84, 0.66] },
              { pts: [[0.712, 0.005], [0.768, 0.005], [0.75, 0.47], [0.685, 0.47]], label: 'Upper link', at: [0.84, 0.24] },
            ] },
          { img: 'still-arm-stowed.webp', w: 406, h: 720, focus: [0, 0.3, 1, 0.85],
            c: 'Folded, with the green C-band claw',
            alt: 'The arm folded back over the chassis, with the claw above one end of the robot',
            marks: [
              { pts: [[0.319, 0.447], [0.949, 0.617], [0.911, 0.663], [0.281, 0.493]], label: 'Upper link, folded', at: [0.52, 0.42] },
              { box: [0.17, 0.385, 0.41, 0.545], shape: 'ellipse', label: 'Claw', at: [0.29, 0.345] },
            ] },
          { img: 'base-gear-stage.webp', w: 1600, h: 1200, date: 'Feb 8, 2023', focus: [0.15, 0, 1, 0.8],
            c: 'At the base of the arm',
            alt: 'Close-up at the base of the arm: a servo with a brass pinion meshing with a large aluminum gear',
            marks: [
              { box: [0.464, 0.24, 0.53, 0.327], shape: 'ellipse', label: 'Brass pinion on the servo', at: [0.47, 0.185] },
              { box: [0.381, 0.308, 0.65, 0.667], shape: 'ellipse', label: 'Large aluminum gear', at: [0.52, 0.73] },
            ] },
          { img: 'joint-servo-gear-chain.webp', w: 1600, h: 1200, date: 'Feb 7, 2023', focus: [0, 0.1, 0.75, 0.85],
            c: 'A geared joint on the arm',
            alt: 'A servo with a brass gear meshing with a large aluminum gear, next to a chain sprocket',
            marks: [
              { box: [0.163, 0.395, 0.287, 0.565], shape: 'ellipse', label: 'Brass gear on the servo', at: [0.22, 0.64] },
              { box: [0, 0.17, 0.19, 0.44], shape: 'ellipse', label: 'Large aluminum gear', at: [0.11, 0.5] },
              { box: [0.34, 0.56, 0.48, 0.746], shape: 'ellipse', label: 'Chain sprocket', at: [0.6, 0.66] },
            ] },
          { img: 'chain-tensioner.webp', w: 1600, h: 1200, date: 'Feb 7, 2023', focus: [0, 0.35, 1, 1],
            c: 'The chain along the long link',
            alt: 'Roller chain along the long link with a small tensioner roller on a plate',
            marks: [
              { pts: [[0.022, 0.607], [0.278, 0.726], [0.5, 0.83], [0.622, 0.889], [0.778, 0.926], [0.989, 0.933]], closed: false, label: 'Roller chain', at: [0.2, 0.84] },
              { box: [0.545, 0.715, 0.735, 0.915], label: 'Tensioner roller on a plate', at: [0.78, 0.66] },
            ] },
          { img: 'driver-hub-servos.webp', w: 1200, h: 853, date: 'Feb 8, 2023', focus: [0.08, 0.05, 0.82, 0.78], solo: true,
            c: 'Our Driver Hub, listing the six servos',
            alt: 'The Driver Hub screen listing six servos: Rotator, Extender, Cone, Popper, Release and Elbow, with their positions',
            marks: [
              { box: [0.14, 0.395, 0.73, 0.447] },
              { box: [0.14, 0.445, 0.73, 0.497] },
              { box: [0.14, 0.494, 0.73, 0.546] },
              { box: [0.14, 0.543, 0.73, 0.595] },
              { box: [0.14, 0.592, 0.73, 0.644] },
              { box: [0.14, 0.641, 0.73, 0.693] },
            ] },
        ],
      } },
    { type: 'media', id: 'reach', layout: 'row', h: 'How far it reaches', p: [
      'In this close-up from late January the arm unfolds from its stowed pose: the lower link stands up, the long link swings up until both are straight, and then the arm folds back down again. Straight up, the claw reaches well above the robot; at a demo at school on February 2 it held a cone high over the carpet.',
      'Every joint we photographed works the same way, a small gear on a servo driving a much larger aluminum gear. On one, under a plate, a servo\'s brass gear meshes with a large gear that sits on a round bearing housing.',
    ], items: [
      { v: 'arm-unfold-first-claw.mp4', c: 'Late January, with the green C-band claw: the arm unfolds from its stowed pose until both links stand straight up, then folds back' },
      { i: 'classroom-reach.webp', c: 'February 2, 2023, a demo at school: both links nearly straight up, holding a blue cone high' },
      { i: 'hitec-servo-gear.webp', c: 'February 8: under a plate, a servo\'s brass gear meshes with a large gear on a round bearing housing' },
    ] },

    // ------------------------------------------------------------------ the claw
    { type: 'scrolly', id: 'claws', module: 'photos', webgl: false, width: 'wide', side: 'left', stepHeight: '85vh', poster: 'robot-early-claw.webp',
      h: 'The claw: three versions',
      steps: [
        { h: 'By early January: a funnel with a ring', p: ['Our first claw was a black funnel with a closed teal ring, at the front corner of the robot.'] },
        { h: 'Late January: two green C bands', p: ['By late January the claw at the tip of the arm was two green C-shaped bands, stacked one above the other.'] },
        { h: 'From January 31: a split funnel', p: ['From January 31 on, the claw is two black half-funnels with teal rims, on black mounting plates that carry a small servo.'] },
        { h: 'Open and closed', p: ['The servo swings the two halves apart to open and back together to close. Closed, they make one funnel that drops over the tip of a cone.'] },
        { h: 'On a cone', p: ['Here the closed funnel sits over the top cone of a full stack of five.'] },
      ],
      caption: 'Our photos, in date order; the outlines are drawn over them to point out the claw.',
      data: {
        slides: [
          { img: 'robot-early-claw.webp', w: 1600, h: 1200, date: 'By Jan 4, 2023', focus: [0, 0.15, 0.85, 1],
            c: 'The first claw: a funnel with a teal ring',
            alt: 'The robot from above with the 18996 plate and the first claw, a black funnel with a teal ring, at the front corner',
            marks: [{ box: [0.135, 0.465, 0.385, 0.735], shape: 'ellipse', label: 'Funnel with a teal ring', at: [0.26, 0.41] }] },
          { img: 'still-arm-stowed.webp', w: 406, h: 720, date: 'Late Jan 2023', focus: [0, 0.22, 1, 0.78],
            c: 'Two green C-shaped bands',
            alt: 'The claw at the tip of the folded arm: two green C-shaped bands, one above the other',
            marks: [{ box: [0.15, 0.37, 0.43, 0.56], shape: 'ellipse', label: 'Two green C bands', at: [0.36, 0.33] }] },
          { img: 'claw-closed.webp', w: 900, h: 1200, date: 'Feb 4, 2023', focus: [0.05, 0.08, 0.95, 0.95],
            c: 'The split funnel, closed',
            alt: 'The final claw closed: two black half-funnels with teal rims forming one ring' },
          { img: 'claw-closed.webp', to: 'claw-open.webp', w: 900, h: 1200, date: 'Feb 4, 2023', focus: [0.05, 0.08, 0.95, 0.95],
            c: 'Closed, then open: the halves swing apart',
            alt: 'The final claw with its two half-funnels swung apart', toAlt: 'The final claw open' },
          { img: 'still-claw-over-stack.webp', w: 1280, h: 720, focus: [0.2, 0, 1, 1],
            c: 'Closed over the top cone of a stack of five',
            alt: 'The closed funnel claw over the top cone of a full five-cone stack at the wall' },
        ],
      } },

    // ------------------------------------------------------------------ the stack, scrubbed
    { type: 'scrolly', id: 'stack', module: 'scrub', webgl: false, stepHeight: '85vh', poster: 'still-claw-over-stack.webp',
      h: 'Five cones, five heights',
      p: ['Cones against the wall come in stacks of five, and each cone in a stack sits at a different height, so the arm has to come in a little lower on every pass.'],
      steps: [
        { h: 'Five cones', p: ['The funnel closes over the top cone of a full stack.'] },
        { h: 'The top cone', p: ['This clip picks up with three cones left. The funnel comes down over the top one and lifts it clear.'] },
        { h: 'A little lower', p: ['The arm comes back about four and a half seconds later and reaches a little lower for the next one.'] },
        { h: 'The last cone', p: ['The last cone sits on the floor, the lowest pose of all.'] },
        { h: 'Stack gone', p: ['In the full clip the arm takes all five cones off the stack in about **20 seconds** (timed from the video).'] },
      ],
      caption: 'Real footage, stepped through by the scroll: first a still from the test just before, then one frame per scroll position from the second clip at the top of this page. The count was read off the frames.',
      data: {
        aria: 'The arm taking cones off a stack at the wall one at a time, with a count of the cones left',
        frames: { dir: F, prefix: 'st', w: 900, h: 506, times: ST },
        focus: [0.3, 0, 1, 1],
        source: 'Stack test',
        counter: { title: 'Cones left on the stack', max: 5, marks: [{ t: 0, n: 3 }, { t: 1.8, n: 2 }, { t: 6.2, n: 1 }, { t: 10.75, n: 0 }] },
        segs: [
          { img: 'still-claw-over-stack.webp', w: 1280, h: 720, focus: [0.3, 0, 1, 1], label: 'Five', tag: 'Still from the test before', count: 5 },
          { from: 0.3, to: 2.4, label: 'Three left' },
          { from: 4.55, to: 6.75, label: 'Two left' },
          { from: 9.2, to: 11.1, label: 'One left' },
          { from: 11.1, to: 11.83, label: 'None' },
        ],
      } },
    { type: 'prose', id: 'stack-tests', h: 'Getting the stack right', p: [
      { problem: 'Stack pick up did not work at first. In one early test the claw came down over the top cone of a full stack and lifted it, and the other four cones tipped over and fell to the floor.', title: 'The stack tipped over' },
      { problem: 'In another, filmed from above, someone behind the camera says it plainly: "It\'s too slow right now though."', title: 'Too slow' },
      'In later clips, the scroll-through above among them, the arm takes the stack apart without knocking it over, one cone about every four and a half seconds (timed from the video).',
    ], media: [
      { v: 'claw-on-stack.mp4', c: 'An early stack test: the claw lifts the top cone off a full stack of five, and the other four tip over and fall' },
      { v: 'stack-pickup-overhead.mp4', c: 'The test where someone says it is too slow, filmed from above with the phone on its side: the funnel comes down over the top cone and takes it' },
    ] },

    // ------------------------------------------------------------------ full run
    { type: 'prose', id: 'run', h: 'A run from the starting wall', p: [
      'In this test the robot starts against the field wall with a cone already in the claw, drives across the field, turns onto its square of tape beside a pole, and raises the cone to the top of it. From there it stays put and cycles cones from the wall to the pole.',
      'Filmed from straight above, the arm swings out over the side of the robot to the cones and back up over the chassis, while the chassis stays in one place.',
      'From higher up in the corner of the field you can see the whole loop at once: the stack at the wall, the pole on the other side, and our laptop and Driver Hub on the field floor.',
    ], media: [
      { v: 'hero-run-from-start.mp4', c: 'From the starting wall: the robot drives across the field with a cone in the claw, turns onto its tape square and raises the cone to the top of the pole beside it' },
      { v: 'reach-top-down.mp4', c: 'Straight down on the robot, with the phone on its side: the arm swings out to the cones and back up over the chassis' },
      { v: 'stationary-cycles-overhead.mp4', c: 'From above the field corner: parked on the tape, the arm takes cones from the stack at the wall over to the pole on the left' },
    ] },

    // ------------------------------------------------------------------ measuring the arm
    { type: 'prose', id: 'measuring', h: 'Measuring the arm, the week of the Championship', p: [
      'Four days before the Chesapeake Championship we measured the arm. On February 7 we set a digital angle gauge on the arm\'s links and on the chassis and photographed each reading: more than 50 photos in twenty minutes.',
      'The next day we held the Driver Hub up next to the arm and read off every servo\'s position, pose by pose. The screen lists the six servos by name, on the hub\'s network, 18996-RC.',
      'In this side view from the same week the arm reaches down to the floor on one side of the robot, then both links go straight up.',
    ], media: [
      { i: 'angle-gauge.webp', c: 'February 7: the digital angle gauge on the robot reading 17.8, one of more than 50 readings' },
      { i: 'arm-pose-with-hub.webp', c: 'February 8: the Driver Hub held up in front of the arm, with the servo positions on screen' },
      { v: 'arm-side-plate.mp4', c: 'Low side view, with 18996 on the lower link: the arm reaches down to the floor on one side, then both links go straight up' },
    ] },

    // ------------------------------------------------------------------ the season
    { type: 'scrolly', id: 'season', module: 'season', webgl: false, width: 'wide', side: 'right', stepHeight: '85vh',
      h: 'The season in the official results',
      steps: [
        { h: 'Glen Allen, December 11', p: ['Our first event, the CHS-VA Glen Allen Qualifier: 1-4 in qualification matches and 20th of 24. We won the **Think Award 3rd Place**.'] },
        { h: 'Harrisonburg, January 21', p: ['The CHS-VA Harrisonburg Qualifier 1: 2-3 and 26th of 37. After two events we had won 3 of our 10 qualification matches.'] },
        { h: 'Union Bridge, January 28', p: [
          'One week later, at the CHS-MD Union Bridge Qualifier, we won all five qualification matches and ranked **3rd of 35**, with the **Inspire Award 3rd Place** and the **Think Award 3rd Place**.',
          'In the semifinal, with G-FORCE (2818), ranked 1st, and Lions (12718), we won one of three matches, 186-177, and went out.',
        ] },
        { h: 'Chesapeake Championship, February 11', p: ['Our first Chesapeake Championship, in the Scarlet Division. Of our six matches, one was a surrogate match that did not count; in the five that counted we went 1-4 and finished 23rd of 26. The closest loss was the last one, 142-148.'] },
      ],
      caption: `Official results from the [FIRST Tech Challenge event pages for team 18996](${RESULTS}), 2022 season. Scores are our alliance's first.`,
      data: {
        aria: 'Our 2022-23 season in the official results',
        title: 'Where we finished at each event',
        sub: 'Top of the chart is 1st place, the baseline is last',
        source: 'Official results: ftc-events.firstinspires.org',
        shots: [
          { i: 'score-q3.webp', c: 'Q3 result screen' },
          { i: 'score-q10.webp', c: 'Q10 result screen' },
          { i: 'score-q20.webp', c: 'Q20 result screen' },
          { i: 'score-q29.webp', c: 'Q29 result screen' },
          { i: 'score-q38.webp', c: 'Q38 result screen' },
        ],
        events: [
          { name: 'CHS-VA Glen Allen Qualifier', short: 'Glen Allen', date: 'Dec 11', long: 'December 11, 2022', rank: 20, teams: 24, quals: '1-4',
            matches: [L('Q4', '70-72'), L('Q8', '99-112'), W('Q13', '88-64'), L('Q19', '78-93'), L('Q26', '46-243')],
            awards: ['Think Award 3rd Place'] },
          { name: 'CHS-VA Harrisonburg Qualifier 1', short: 'Harrisonburg', date: 'Jan 21', long: 'January 21, 2023', rank: 26, teams: 37, quals: '2-3',
            matches: [L('Q2', '39-46'), W('Q13', '87-35'), L('Q22', '61-134'), W('Q32', '100-74'), L('Q45', '43-108')] },
          { name: 'CHS-MD Union Bridge Qualifier', short: 'Union Bridge', date: 'Jan 28', long: 'January 28, 2023', rank: 3, teams: 35, quals: '5-0', playoffs: '1-2',
            matches: [W('Q3', '97-43'), W('Q10', '133-48'), W('Q20', '125-101'), W('Q29', '157-87'), W('Q38', '157-106')],
            awards: ['Inspire Award 3rd Place', 'Think Award 3rd Place'],
            note: 'Semifinal with G-FORCE (2818) and Lions (12718): 131-181, 186-177, 134-166',
            shots: true },
          { name: 'Chesapeake FTC Championship, Scarlet Division', short: 'Championship', date: 'Feb 11', long: 'February 11, 2023', rank: 23, teams: 26, quals: '1-4',
            matches: [L('Q3', '81-123'), W('Q9', '138-118'), { m: 'Q14', score: '119-67', w: true, s: true }, L('Q21', '125-264'), L('Q28', '127-228'), L('Q33', '142-148')] },
        ],
      } },
    { type: 'prose', id: 'results', h: 'Results', p: [
      { table: {
        head: ['Event', 'Date', 'Rank', 'Record', 'Awards and playoffs'],
        rows: [
          ['Glen Allen Qualifier, VA', 'Dec 11, 2022', '20 of 24', '1-4', 'Think Award 3rd Place'],
          ['Harrisonburg Qualifier 1, VA', 'Jan 21, 2023', '26 of 37', '2-3', ''],
          ['Union Bridge Qualifier, MD', 'Jan 28, 2023', '3 of 35', '5-0', 'Inspire Award 3rd Place, Think Award 3rd Place, semifinal (1-2)'],
          ['Chesapeake Championship, Scarlet Division', 'Feb 11, 2023', '23 of 26', '1-4', ''],
        ],
        caption: 'Record is qualification matches. Season record 10-13-0: qualification 9-11-0, playoffs 1-2.',
      } },
      { problem: 'Our first two qualifiers went badly: 20th of 24 and 26th of 37, with 3 wins in 10 qualification matches.', title: 'A slow start' },
      'A week after the second one we went 5-0 at Union Bridge, and this was the team\'s first season advancing to the Chesapeake Championship.',
      { problem: 'At the Championship two weeks later we won one of our five counted matches and finished 23rd of 26 in our division.', title: 'The Championship' },
      { note: `Source: the [official FIRST event pages for team 18996](${RESULTS}). Team: S.T.A.T.I.C., FTC 18996; 2022-23 was my first season as captain.` },
    ] },
  ],
};
