// STEAM Carnival Pitching Robot: rich page. Built for Jerry's internship with the Howard County
// Library System, Jul to Aug 2024.
// Facts are Jerry's (his checklist, src/projects.mjs, /home/claude/work/answers.md and the orchestrator's
// answers of Sept 27), his public repo github.com/jerryli08/newftccad (README, TestTeleop.java and the
// dated build notes in buildproof/), or plainly shown by the media. Numbers marked "from my CAD" were
// measured on his STEP (see /home/claude/work/hcls-2024-ftc-offseason-bot/demos.md); numbers marked
// "from the code" are computed from the constants in TestTeleop.java. Dates are the photos' capture dates.
// Answered: the robot picked pixels up in front and scored over the back. Held back until Jerry
// answers (questions.md): the "6 feet of extension" figure (the page uses the CAD's 979 mm of travel
// and 1.49 m of reach instead), "4 days" (the page uses his checklist's "less than a week"), why each
// pivot motor change was needed, which of the pivot's U-channels cracked and when (no photo of it is
// shown), how the sideplates broke and what he would cut them from next time, who else built or drove,
// close shots of children, and the classroom photo.
const M = '/assets/models/centerstage-offseason-robot';
const REPO = 'https://github.com/jerryli08/newftccad';

export default {
  summary: {
    stats: [
      { v: 'Less than a week', l: 'For everything, so off-the-shelf goBILDA parts wherever I could' },
      { v: '979 mm', l: 'Of slide travel: four stages of 245 mm (from my CAD)' },
      { v: '1.49 m', l: 'From the pivot to the claw tip at full reach (from my CAD)' },
      { v: 'About 109°', l: 'Between the arm\'s two presets, held by P control plus gravity feedforward' },
    ],
    text: [
      'For my internship with the Howard County Library System, I was tasked with building a FIRST Tech Challenge robot to demo at the STEAM Carnival the library system hosts. Inspired by the FTC team KookyBotz, I designed a pitching claw robot for the CENTERSTAGE game: four-stage belt-driven Viper-Slides on a pivot, so one mechanism reaches out along the floor to grab two pixels, then swings up over the back of the robot to score them. I had less than a week for everything, so I used as many off-the-shelf goBILDA parts as I could.',
      `It ran at the carnival on Aug 3, 2024. Two things broke: the small aluminum U-channel at the pivot, because the arm pivoted a few times at full extension, and the laser-cut acrylic sideplates, in the weeks after the demo. The code is [on GitHub](${REPO}).`,
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-finished-reach.mp4', c: 'The finished robot: the slides run out along the floor, then the arm pitches up' },
      { v: 'hero-grab-and-pivot.mp4', c: 'Before the sideplates went on: the claw out at two pixels, then the arm pivots up and back down' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ one full cycle
    { type: 'scrolly', id: 'cycle', module: 'cycle', width: 'full', stepHeight: '85vh', poster: `${M}/poster-cycle.webp`,
      h: 'One full cycle',
      p: ['Scroll to run one cycle on my real CAD, in the order the robot works: reach out, grab two pixels, pull in, pitch over, reach again and drop them on the backdrop.'],
      steps: [
        { h: '1. Stowed', p: ['The arm lies forward along the robot with the slides pulled in. Two pixels wait on the floor ahead, right where the claw lands at full reach.'] },
        { h: '2. Reach', p: ['One motor at the base of the arm drives a single belt through all four slide stages at once, and the claw runs out along the floor: **979 mm** of travel, 245 mm per stage (from my CAD).'] },
        { h: '3. Grab', p: ['Each finger has its own servo and its own bumper on the second gamepad, and the right trigger moves both together. The claw is built to take two pixels at once, side by side.'] },
        { h: '4. Pull in', p: ['The slides pull back in with both pixels before the arm moves. That order is the lesson of this robot, and the code did not enforce it: see [what broke](#broke).'] },
        { h: '5. Pitch', p: ['Two motors swing the whole arm about the pivot, about 109 degrees from the down preset to the up preset, until it leans about 15 degrees past vertical over the back of the robot (from the code\'s constants). The same button sets the wrist, so the claw turns to face the backdrop.'] },
        { h: '6. Reach again', p: ['The slides run out again, this time up toward the backdrop, until the claw is over it.'] },
        { h: '7. Drop', p: ['The fingers open and the pixels drop onto the backdrop. Then the slides come in and the arm swings back down for the next pair.'] },
      ],
      caption: 'My real CAD, rigged about its real axes: the arm turns about the line through both pivot motor shafts, the four slide stages run along the arm (each ball carriage at half its stage\'s speed, as in a real Viper-Slide), and the wrist and each finger turn about their servo hubs. The pixels, the floor and the backdrop are added for the animation; they are not in the CAD. The CAD has the belt only fully in and fully out, so it is hidden while the slides move.' },

    // ------------------------------------------------------------------ the brief
    { type: 'prose', id: 'brief', h: 'The brief', p: [
      'The Howard County Library System hosts a STEAM Carnival, and as part of my internship there as a STEM instructor and youth peer intern, I was tasked with building a FIRST Tech Challenge robot to demo at it. I had less than a week for everything, so the plan was to use as many commercial off-the-shelf parts as possible and design only what I had to.',
      'The game was CENTERSTAGE, the 2023-24 FTC game: robots pick up hexagonal pixels and place them on the backdrop, a slanted board. I started from an older goBILDA robot, a Strafer chassis with cable-driven Viper-Slides, a claw and a wrist, took it apart and rebuilt it around a pitching arm, inspired by the FTC team KookyBotz. The slides rotate for horizontal extension and for height, so one mechanism reaches out across the floor for pixels and also lifts them to the backdrop. The claw in my CAD is still called "kooky claw v2".',
      { problem: 'The layout needed goBILDA dual blocks to put channels in the right places, and I did not have any.', title: 'No dual blocks' },
      { fix: 'I improvised the same positions from U-channels and quad blocks I had on hand.' },
    ], media: [
      [{ i: 'build-teardown-old-robot.webp', c: 'Jul 29: the old robot coming apart: Control Hub, cable-driven Viper-Slides and wiring' },
        { i: 'build-before-sideplates.webp', c: 'Aug 1: the rebuilt robot from above before the sideplates, with the pivot motors and the slides stowed' }],
    ] },

    // ------------------------------------------------------------------ how it works (CAD tour)
    { type: 'scrolly', id: 'tour', module: '@turntable', width: 'wide', side: 'right', stepHeight: '90vh', poster: `${M}/poster-tour.webp`,
      h: 'How it works',
      p: ['My CAD of the finished robot, posed the way I designed it: arm flat, slides all the way out, claw on the floor.'],
      data: {
        models: [{ label: 'Final CAD', src: `${M}/robot.glb`, hide: 'BELT_RET' }],
        drift: 10,
      },
      steps: [
        { h: 'The whole robot', p: ['The robot is 430 mm across the sideplates and 456 mm long with the bumpers (from my CAD). The arm, the slides and the claw all sit on one pivot in the middle of the robot, and at full reach the claw tip is 1.49 m out from it.'],
          view: { azimuth: 35, elevation: 22, pad: 1.1 } },
        { h: 'Drive', p: [
          'A goBILDA Strafer chassis: four 312 rpm motors lie along the side channels, each turning its 96 mm mecanum wheel through a pair of bevel gears. That is about 1.6 m/s of free speed (computed from 312 rpm on a 96 mm wheel through 1:1 bevels).',
          'The drive code is standard mecanum mixing, with the strafe input scaled by 1.1 "to counteract imperfect strafing", in its own comment.',
        ], view: { focus: 'G_WHEELS|G_DRIVE_MOTORS|G_BEVELS|G_CHASSIS', azimuth: 125, elevation: 30, pad: 1.15,
          highlight: [{ parts: 'G_DRIVE_MOTORS', color: '#ffb000' }, { parts: 'G_BEVELS', color: '#ff6b35' }],
          labels: [{ text: '312 rpm motor', part: 'G_DRIVE_MOTORS' }, { text: 'Bevel gears to the wheel', part: 'G_BEVELS' }] } },
        { h: 'Pivot', p: ['Two 43 rpm motors face each other on one axis, 94 mm above the floor, each bolted to its own short 72 mm U-channel tower. Their hubs bolt to a third 72 mm U-channel between them, and the slides bolt on top of that, so the motors drive the arm directly and share its load.'],
          view: { focus: 'G_PIVOT_MOTORS|G_PIVOT_CH|G_TOWERS', azimuth: 28, elevation: 16, pad: 1.7,
            highlight: [{ parts: 'G_PIVOT_MOTORS', color: '#ffb000' }, { parts: 'G_PIVOT_CH', color: '#ff6b35' }],
            labels: [{ text: '43 rpm, one each side', part: 'G_PIVOT_MOTORS' }, { text: 'Arm channel, 72 mm', part: 'G_PIVOT_CH' }] } },
        { h: 'Slides', p: ['A goBILDA four-stage Viper-Slide kit with 336 mm slides, driven by a belt. One 435 rpm motor at the base of the arm drives the single belt, and all four stages move together: 245 mm each, 979 mm in all (from my CAD). The motor rides on the arm, so it pivots with the slides.'],
          view: { focus: 'G_STAGE|G_SLIDE_BASE|G_SLIDE_MOTOR', azimuth: 62, elevation: 24, pad: 1.05,
            highlight: [{ parts: 'G_STAGE_[13]', color: '#9fd3ff' }, { parts: 'G_STAGE_[24]', color: '#4aa3ff' }, { parts: 'G_SLIDE_MOTOR', color: '#ffb000' }],
            labels: [{ text: '4 stages x 245 mm', part: 'G_STAGE_4' }, { text: '435 rpm slide motor', part: 'G_SLIDE_MOTOR' }] } },
        { h: 'Claw and wrist', p: ['A servo at the end of the slides pitches the whole claw: that is the wrist. The claw has two red fingers, each on its own servo, so it holds two pixels side by side. The claw body and its mounts are 3D printed, and a LEGO ball caster (not in the CAD) sits under the claw.'],
          view: { focus: 'G_WRIST|G_FINGER|G_CLAW', azimuth: 145, elevation: 22, pad: 1.5,
            highlight: [{ parts: 'G_FINGER', color: '#ff2d2d', intensity: 0.3 }],
            labels: [{ text: 'Wrist servo', part: 'G_WRIST_SERVO' }, { text: 'One servo per finger', part: 'G_FINGER_R' }] } },
        { h: 'Sideplates and back plate', p: ['Red acrylic truss sideplates, 3 mm thick and 432 mm long (from my CAD), stand off the drive channels on eight printed 56 mm standoffs. The black printed back plate spells out HOWARD COUNTY LIBRARY SYSTEM in 25 red printed letters pressed into it, beside the library\'s logo.'],
          view: { focus: 'G_SIDEPLATES|G_BACKPLATE', azimuth: 212, elevation: 18, pad: 1.15,
            highlight: [{ parts: 'G_SIDEPLATES', color: '#ff3b3b', intensity: 0.25 }] } },
      ] },

    // ------------------------------------------------------------------ the build, day by day
    { type: 'iterations', id: 'build', h: 'The build, day by day', items: [
      { label: 'Jul 25', title: 'First layout in CAD', p: ['The first layout in Fusion 360: the slides reaching far out past a Strafer chassis, on a pivot in the middle of the robot.'],
        media: [{ i: 'cad-early-jul25.webp', c: 'Jul 25: the first layout in Fusion 360, slides far out past the chassis' }] },
      { label: 'Jul 29', title: 'Teardown and a new frame', p: ['I took the old robot apart and started the new frame from its parts. The drive stayed the Strafer\'s: four 312 rpm motors, each turning a 96 mm mecanum wheel through a pair of bevel gears.'],
        media: [{ i: 'build-strafer-bevel-gears.webp', c: 'Jul 29: the bevel gears inside a drive channel of the Strafer chassis' }] },
      { label: 'Jul 30', title: 'The slides go from cable to belt', p: ['I took the old cable-driven slides apart and converted them to belt drive: bearing idlers, end stops and pulleys on each stage, then the belt routed through them. That evening I rendered the whole robot in its red and black.'],
        media: [{ i: 'build-slides-stacked.webp', c: 'Jul 30: the four-stage slide assembled after the belt conversion' }, { i: 'cad-render-jul30.webp', c: 'Jul 30: my render of the robot, slides out with the claw' }] },
      { label: 'Jul 31', title: 'First motion, and a new pivot motor', p: [
        'I printed the wrist and claw parts at home in the morning, then ran the slides for the first time: straight up, then flat along the floor. That night at home I swapped the pivot motors from 312 rpm to 223 rpm, with new D-bore hubs, and tested the pivot with the claw on.',
        { problem: 'One of the 223 rpm motors had a damaged JST-PH connector.' },
        { fix: 'I soldered the motor\'s leads to a JST-PH connector and heat-shrank the joints.' },
      ], media: [{ v: 'test-first-vertical-extension.mp4', c: 'Jul 31: the first extension test, slides straight up on the bare chassis' }, { v: 'test-first-floor-extension.mp4', c: 'Jul 31: the slides lying flat, running out across the tiles' }, { v: 'test-pivot-first.mp4', c: 'Jul 31, at home: the first pivot test with the printed wrist and claw' }] },
      { label: 'Aug 1', title: 'Claw, final pivot motors, sideplates', p: ['The two-finger claw went on in the morning. The pivot changed motors again, to 43 rpm with new 8 mm REX hubs, and I tuned its controller. In the afternoon I laser cut the truss sideplates from red acrylic, and that night I printed the letters and the logo for the back plate.'],
        media: [{ i: 'claw-v2-red-fingers.webp', c: 'Aug 1: the two-pixel claw with its two red fingers' }, { v: 'build-laser-cut-sideplate.mp4', c: 'Aug 1: the laser cutter tracing a truss sideplate in red acrylic' }] },
      { label: 'Aug 2', title: 'Finished', p: ['Sideplates and the lettered back plate on, then drive tests with the finished robot.'],
        media: [{ i: 'finished-robot.webp', c: 'Aug 2: the finished robot, red truss sideplates and the lettered back plate' }] },
    ] },

    // ------------------------------------------------------------------ the code
    { type: 'prose', id: 'code', h: 'Holding a long arm steady', p: [
      'The pivot is the hard part of a pitching robot. Gravity pulls hardest on the arm when it lies flat and not at all when it stands straight up, and the slides make the arm longer or shorter on top of that. A plain proportional controller has to build up error before it pushes back, so the arm would sag below its target by an amount that changes with the angle.',
      'So the pivot runs a proportional term plus a gravity feedforward term. The feedforward gives the motors the power gravity needs at the current angle, and the proportional term only has to close what is left:',
      { pre: 'angle      = -360 * position / 3895.9       (degrees)\ngravity    = 0.18 * cos(angle + 110°)\npitchPower = -0.001 * (target - position) + gravity' },
      'The pivot motors are 43 rpm goBILDA gearmotors driving the arm directly, so 3,895.9 encoder ticks are one turn of the arm, about 10.8 ticks per degree. Both motors get the same power, and only one encoder is read. The driver has two presets on the second gamepad\'s D-pad, up (50 ticks) and down (1,225 ticks), about 109 degrees apart, and each preset also moves the wrist, so the claw points the right way at both ends. I tuned it on the robot, with the target and the measured position on the Driver Station screen.',
      { h: 'The rest of the code' },
      'The whole robot runs from one TeleOp OpMode: a single loop that reads both gamepads, mixes the mecanum drive, runs the pivot controller and sets the slides and servos on every pass.',
      { table: {
        head: ['Output', 'Hardware', 'Control'],
        rows: [
          ['Drive', '4 goBILDA motors, 312 rpm, mecanum', 'Mecanum mixing on gamepad 1, strafe x 1.1'],
          ['Pivot', '2 goBILDA motors, 43 rpm, direct drive', 'P plus gravity feedforward, two presets'],
          ['Slides', '1 goBILDA motor, 435 rpm, one belt', 'Open loop on the left stick of gamepad 2'],
          ['Wrist', '1 servo', 'Set by each pivot preset'],
          ['Fingers', '2 servos', 'A bumper each; the right trigger moves both'],
        ],
        caption: 'Motor speeds from the part numbers in my CAD; everything else from TestTeleop.java.',
      } },
      'The slides run open loop: the stick sets the slide motor\'s power directly, and when it is let go the motor still gets a small holding power, a different one in each pivot preset. The code never knows how far out the slides are, which matters in the next section.',
      { note: `Code: \`TestTeleop.java\` in [github.com/jerryli08/newftccad](${REPO}). The angles and the 109 degrees are computed from its constants.` },
    ], media: [
      { i: 'code-feedforward-screen.webp', c: 'Aug 1, mid-tuning: TestTeleop on my laptop with the gravity feedforward lines. The down preset was still 1,280 ticks here; the final code uses 1,225' },
      { i: 'still-pivot-telemetry.webp', c: 'Aug 1: the Driver Station while tuning; the two telemetry lines are the pivot\'s target and its measured position' },
      { v: 'test-pivot-tuning.mp4', c: 'Aug 1: the arm pitching up under the P plus feedforward controller' },
    ] },

    // ------------------------------------------------------------------ why the pivot broke
    { type: 'scrolly', id: 'pivot', module: 'pivot', width: 'full', stepHeight: '85vh', poster: `${M}/poster-pivot.webp`,
      h: 'Why the pivot broke',
      p: ['The same arm and the same controller, first with the slides in, then all the way out.'],
      steps: [
        { h: 'Two presets, one controller', p: ['With the slides in, the arm swings from the down preset up past vertical. The readout is the code\'s own math at each angle: the P term fades as the arm nears its target, and the gravity term fades to zero at vertical and turns negative past it, holding the arm back as it leans over the back.'] },
        { h: 'The same arm, slides out', p: ['With the slides in, the claw is 0.44 m from the pivot. At full reach it is 1.42 m: 3.2 times the torque from the claw and its pixels, and about 10 times their inertia every time the arm starts or stops (computed from my CAD, claw only; the slides\' own mass adds more).'] },
        { h: 'Where it broke', p: ['The pivot is built from three short 72 mm aluminum U-channels (from my CAD): a tower for each motor, and one between the motor hubs that carries the whole arm. The small U-channel at the pivot broke, because the arm pivoted a few times at full extension.'] },
        { h: 'The rule I would add', p: ['Pull the slides in first, then pivot. With the slides out, the pivot stays locked; with them all the way in, it is free to move.'] },
      ],
      caption: 'The readout is computed from the constants in TestTeleop.java at each angle, with the target set to the up preset. The torque and inertia ratios compare the claw at its two distances from the pivot and count the claw only.' },

    // ------------------------------------------------------------------ what broke
    { type: 'prose', id: 'broke', h: 'What broke, and what I would change', p: [
      { problem: [
        'The small aluminum U-channel at the pivot broke, because the arm pivoted a few times at full extension.',
        'At full reach the claw is 1.42 m from the pivot, against 0.44 m with the slides in (from my CAD). That is 3.2 times the moment from the claw and its pixels, and about 10 times the rotational inertia every time the arm starts or stops, and all of it goes through the short channels at the pivot.',
      ], title: 'The pivot broke' },
      { next: 'Reinforce the pivot.' },
      { problem: 'Nothing stopped the arm from pivoting at full extension. The pivot presets never checked the slides, and the slides ran open loop, so the code did not even know how far out they were.', title: 'No interlock in the code' },
      { next: [
        'Hard states that keep the arm from pivoting unless the slides are fully retracted.',
        'That needs the code to know where the slides are, from the slide motor\'s encoder or a switch at full retraction, and then a small state machine: retract, pivot, extend.',
      ] },
      { problem: 'I laser cut the sideplates from acrylic because it was the only material I had access to, and they broke in the weeks after the demo.', title: 'Acrylic sideplates' },
    ], media: [
      { i: 'build-glowforge-sheet.webp', c: 'Aug 1: a truss sideplate cut from red acrylic on the laser cutter bed' },
      { i: 'build-sideplate-mounted.webp', c: 'Aug 2: a sideplate bolted to the robot' },
    ] },

    // ------------------------------------------------------------------ the carnival
    { type: 'media', id: 'carnival', layout: 'row', h: 'At the STEAM Carnival',
      p: ['On Aug 3, 2024 the robot ran on a field with CENTERSTAGE backdrops and pixels, set up under a tent at the STEAM Carnival. As part of the same internship I also wrote and taught a robotics curriculum.'],
      items: [
        { v: 'hero-carnival-field.mp4', c: 'The field under the tent at the carnival, the robot at the backdrop with its arm up' },
        { i: 'carnival-field-wide.webp', c: 'Aug 3: the field under the tent, with the robot on it' },
      ] },
    { type: 'media', layout: 'grid', cols: 3, items: [
      { i: 'carnival-reach-topdown.webp', c: 'Aug 3: the slides reaching far out across the field tiles' },
      { i: 'still-carnival-slides-out.webp', c: 'Aug 3: the slides lying all the way out across the field' },
      { i: 'still-carnival-robot.webp', c: 'Aug 3: the robot at the carnival, HOWARD COUNTY LIBRARY SYSTEM on its back plate' },
    ] },

    // ------------------------------------------------------------------ more from the build
    { type: 'media', id: 'more', layout: 'grid', cols: 3, h: 'More from the build', items: [
      { i: 'build-first-assembly.webp', c: 'Jul 31, late: the first full assembly, arm up' },
      { v: 'test-pivot-swing.mp4', c: 'Jul 31: the pivot swinging forward to vertical and back' },
      { i: 'claw-ball-caster.webp', c: 'Jul 31: the claw with the LEGO ball caster under it' },
      { v: 'test-claw-v2.mp4', c: 'Aug 1: the red fingers driven from the Driver Station' },
      { i: 'build-sideplate-cut.webp', c: 'Aug 1: the cut truss sideplate lifted out' },
      { v: 'build-print-logo.mp4', c: 'Aug 1: printing the red logo and letters for the back plate' },
      { i: 'cad-render-backplate.webp', c: 'Aug 1: my render of the lettered back plate and the truss sideplates' },
      { i: 'build-backplate-letters.webp', c: 'Aug 2: the printed back plate with the red letters pressed in' },
      { i: 'pivot-two-motors.webp', c: 'Jul 31: the pivot with its two motors' },
    ] },

    { type: 'callout', id: 'links', h: 'Code and more', p: [
      `The code and my dated build notes are on GitHub: [jerryli08/newftccad](${REPO}). During the season itself, my team built [a different CENTERSTAGE robot](/projects/ftc-centerstage).`,
    ] },
  ],
};
