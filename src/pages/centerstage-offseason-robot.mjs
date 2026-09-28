// FTC CENTERSTAGE Offseason Robot (was "STEAM Carnival Pitching Robot"; Jerry renamed it Sept 27, 2026):
// rich page. Built for Jerry's internship with the Howard County Library System, Jul to Aug 2024, to
// demo at the library system's STEAM Carnival.
// Facts are Jerry's (his checklist, src/projects.mjs, /home/claude/work/answers.md and the orchestrator's
// answers of Sept 27), his public repo github.com/jerryli08/newftccad (README, TestTeleop.java and the
// dated build notes in buildproof/), or plainly shown by the media. Numbers marked "from my CAD" were
// measured on his CAD (the STEP, and the FBX he exported on Sept 27, which has the same coordinates;
// see /home/claude/work/hcls-2024-ftc-offseason-bot/demos.md); numbers marked "from the code" are
// computed from the constants in TestTeleop.java. Dates are the photos' capture dates.
// The 3D model is robot.glb, from that FBX (prep-robot.mjs in the notes folder, then
// tools/optimize-cad.mjs with tools/cad/configs/centerstage-offseason-robot-robot.json).
// Answered: the robot picked pixels up in front and scored over the back. Sept 28, 03:53: "less than
// a week" is right; the extension figure he once gave is wrong and is never used (the page uses the
// CAD's 979 mm of travel and 1.49 m of reach); at the carnival a bunch of kids from the community and
// even some adults drove it; he was tasked with making a cool-looking robot to recruit for the library
// system's FTC class, which was overbooked and which he taught (no kids' faces or names).
// Sept 28, 07:04 to 07:42: the pivot needed as low a motor speed as possible for the most torque (312 rpm
// at first, then 223 rpm borrowed from a friend, then the 43 rpm motors that had been ordered); the
// low-side U-channel holding the slides cracked between the 1-hole U-channel and the slide mount after
// several pivots fully extended, then snapped cleanly; a student picked the robot up by an acrylic
// sideplate and broke it. The FEA behind the failure section is in /home/claude/work/hcls-2024-ftc-
// offseason-bot/fea (README-like header in each script; results r10r, convergence r10rr). Still held
// back (questions.md): what he would cut the sideplates from next time, who else built or drove, close
// shots of children, the classroom photo, and whether the Aug 7 photo pivot-after-event shows the crack.
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
      'For my internship with the Howard County Library System, I was tasked with building an eye-catching FIRST Tech Challenge robot to demo at the STEAM Carnival the library system hosts, to recruit for the library system\'s FTC class, which I taught. Inspired by the FTC team KookyBotz, I designed a pitching claw robot for the CENTERSTAGE game: four-stage belt-driven Viper-Slides on a pivot, so one mechanism reaches out along the floor to grab two pixels, then swings up over the back of the robot to score them. I had less than a week for everything, so I used as many off-the-shelf goBILDA parts as I could.',
      `It ran at the carnival on Aug 3, 2024, where visitors from the community, children and adults, drove it. Two things broke. The low-side U-channel that carries the slides cracked just past the pivot and then snapped, after the arm had pivoted several times with the slides all the way out; my FEA of it is [below](#broke). And in the weeks after the demo, a student picked the robot up by one of the laser-cut acrylic sideplates and broke it. The code is [on GitHub](${REPO}).`,
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
    { type: 'scrolly', id: 'cycle', module: 'cycle', stepHeight: '85vh', poster: `${M}/poster-cycle.webp`,
      h: 'One full cycle',
      p: ['Scroll to run one cycle on my real CAD, in the order the robot works: reach out, grab two pixels, pull in, pitch over the back, reach again and drop them on the backdrop.'],
      steps: [
        { h: '1. Stowed', p: ['Slides in, arm just off the floor: the claw sits 0.44 m out from the pivot (from my CAD). Two pixels wait where it lands at full reach.'] },
        { h: '2. Reach', p: ['One 435 rpm motor drives a single belt through all four slide stages at once: 245 mm each, **979 mm** in all (from my CAD).'] },
        { h: '3. Grab', p: ['Each finger has its own servo and its own bumper on the second gamepad; the right trigger moves both. Two pixels, side by side.'] },
        { h: '4. Pull in', p: ['The slides come back in with both pixels before the arm moves. The code never enforced that order: see [what broke](#broke).'] },
        { h: '5. Pitch', p: ['Two 43 rpm motors swing the arm about 109 degrees to the up preset, 15 degrees past vertical over the back (from the code). The same button turns the wrist so the pixels lie parallel to the backdrop\'s 60 degree face.'] },
        { h: '6. Reach again', p: ['The driver runs the slides out on the second gamepad\'s left stick until the pixels are over the backdrop\'s bottom row. Open loop: the code never knows how far out they are.'] },
        { h: '7. Drop', p: ['The fingers open and both pixels drop, still parallel to the face, into the notches of the bottom row. Then slides in, arm down, and the next pair.'] },
      ],
      caption: 'My real CAD, rigged about its real axes: the arm turns about the line through both pivot motor shafts, the four slide stages run along the arm (each ball carriage at half its stage\'s speed, as in a real Viper-Slide), and the wrist and each finger turn about their servo output splines. The pixels and the floor are added for the animation. The backdrop is the official CENTERSTAGE backdrop from the field CAD (AndyMark am-5103), placed just behind the robot; in step 6 a cut through the middle of the claw shows a held pixel parallel to its face. The CAD has the belt only fully in and fully out, so it is hidden while the slides move.' },

    // ------------------------------------------------------------------ the brief
    { type: 'prose', id: 'brief', h: 'The brief', p: [
      'The Howard County Library System hosts a STEAM Carnival, and as part of my internship there as a STEM instructor and youth peer intern, I was tasked with making an eye-catching FIRST Tech Challenge robot to demo at it, to recruit for the library system\'s FTC class. I had less than a week for everything, so the plan was to use as many commercial off-the-shelf parts as possible and design only what I had to.',
      'The game was CENTERSTAGE, the 2023-24 FTC game: robots pick up hexagonal pixels and place them on the backdrop, a slanted board. I started from an older goBILDA robot, a Strafer chassis with cable-driven Viper-Slides, a claw and a wrist, took it apart and rebuilt it around a pitching arm, inspired by the FTC team KookyBotz. The slides rotate for horizontal extension and for height, so one mechanism reaches out across the floor for pixels and also lifts them to the backdrop. The claw in my CAD is still called "kooky claw v2".',
      { problem: 'The layout needed goBILDA dual blocks to put channels in the right places, and I did not have any.', title: 'No dual blocks' },
      { fix: 'I improvised the same positions from U-channels and quad blocks I had on hand.' },
    ], media: [
      [{ i: 'build-teardown-old-robot.webp', c: 'Jul 29: the old robot coming apart: Control Hub, cable-driven Viper-Slides and wiring' },
        { i: 'build-before-sideplates.webp', c: 'Aug 1: the rebuilt robot from above before the sideplates, with the pivot motors and the slides stowed' }],
    ] },

    // ------------------------------------------------------------------ how it works (CAD tour)
    { type: 'scrolly', id: 'tour', module: '@turntable', stepHeight: '90vh', poster: `${M}/poster-tour.webp`,
      h: 'How it works',
      p: ['My CAD of the finished robot, posed the way I designed it: arm flat, slides all the way out.'],
      data: {
        models: [{ label: 'Final CAD', src: `${M}/robot.glb`, hide: 'BELT_RET' }],
        drift: 10,
      },
      steps: [
        { h: 'The whole robot', p: ['430 mm across the sideplates, 456 mm long with the bumpers (from my CAD). Arm, slides and claw all sit on one pivot in the middle; at full reach the claw tip is 1.49 m out from it.'],
          view: { azimuth: 35, elevation: 22, pad: 1.1 } },
        { h: 'Drive', p: [
          'A goBILDA Strafer chassis: four 312 rpm motors along the side channels, each turning a 96 mm mecanum wheel through 1:1 bevel gears. Free speed: 312 rpm × π × 96 mm = about 1.6 m/s.',
          'The code is standard mecanum mixing, strafe scaled by 1.1 "to counteract imperfect strafing".',
        ], view: { focus: 'G_WHEELS|G_DRIVE_MOTORS|G_BEVELS|G_CHASSIS', azimuth: 138, elevation: 52, pad: 1.1,
          // cut just above the wheel axles, so the motors and bevel gears inside the side channels show
          cut: { normal: [0, -1, 0], at: 0.66 },
          highlight: [{ parts: 'G_DRIVE_MOTORS', color: '#ffb000' }, { parts: 'G_BEVELS', color: '#ff6b35' }],
          labels: [{ text: '312 rpm motor', at: [0.108, 0.012, -0.08] }, { text: 'Bevel gears, 1:1', at: [0.121, 0.012, -0.168] }] } },
        { h: 'Pivot', p: ['Two 43 rpm motors face each other on one axis, 94 mm above the floor, each on its own 72 mm U-channel tower. Their hubs bolt to a third 72 mm U-channel; the slide kit\'s 1-hole U-channel and low-side U-channel stack on it and carry the slides. Direct drive, load shared.'],
          view: { focus: 'G_PIVOT_MOTORS|G_PIVOT_CH|G_TOWERS', azimuth: 28, elevation: 16, pad: 1.7,
            highlight: [{ parts: 'G_PIVOT_MOTORS', color: '#ffb000' }, { parts: 'G_PIVOT_CH', color: '#ff6b35' }],
            labels: [{ text: '43 rpm, one each side', at: [0.1, 0.066, 0] }, { text: 'Arm channel, 72 mm', at: [-0.024, 0.095, 0.01], side: 'l' }] } },
        { h: 'Slides', p: ['A goBILDA belt-driven four-stage Viper-Slide kit, 336 mm slides. One 435 rpm motor at the base of the arm pulls one belt, and all four stages move together: 245 mm each, 979 mm in all. The motor pivots with the arm.'],
          view: { focus: 'G_STAGE|G_SLIDE_BASE|G_SLIDE_MOTOR', azimuth: 62, elevation: 24, pad: 1.05,
            highlight: [{ parts: 'G_STAGE_[13]', color: '#9fd3ff' }, { parts: 'G_STAGE_[24]', color: '#4aa3ff' }, { parts: 'G_SLIDE_MOTOR', color: '#ffb000' }],
            labels: [{ text: '4 stages × 245 mm', part: 'G_STAGE_4' }, { text: '435 rpm slide motor', part: 'G_SLIDE_MOTOR', side: 'l' }] } },
        { h: 'Claw and wrist', p: ['A servo at the end of the slides pitches the whole claw (the wrist). Two red fingers, each on its own servo, hold two pixels side by side. Printed body and mounts; a LEGO ball caster under it (not in the CAD).'],
          view: { focus: 'G_WRIST|G_FINGER|G_CLAW', azimuth: 145, elevation: 22, pad: 1.5,
            highlight: [{ parts: 'G_FINGER', color: '#ff2d2d', intensity: 0.3 }],
            labels: [{ text: 'Wrist servo', part: 'G_WRIST_SERVO' }, { text: 'One servo per finger', part: 'G_FINGER_R' }] } },
        { h: 'Sideplates and back plate', p: ['Red acrylic truss sideplates, about 3 mm thick and 432 mm long, on eight printed 56 mm standoffs. The printed back plate spells HOWARD COUNTY LIBRARY SYSTEM in 25 red letters beside the library\'s logo.'],
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
        'I printed the wrist and claw parts at home in the morning, then ran the slides for the first time: straight up, then flat along the floor. The pivot needed as much torque as I could get, which meant as low a motor speed as possible, and at first I only had 312 rpm motors. That night at home I swapped in 223 rpm motors borrowed from a friend, with new D-bore hubs, and tested the pivot with the claw on.',
        { problem: 'One of the 223 rpm motors had a damaged JST-PH connector.' },
        { fix: 'I soldered the motor\'s leads to a JST-PH connector and heat-shrank the joints.' },
      ], media: [{ v: 'test-first-vertical-extension.mp4', c: 'Jul 31: the first extension test, slides straight up on the bare chassis' }, { v: 'test-first-floor-extension.mp4', c: 'Jul 31: the slides lying flat, running out across the tiles' }, { v: 'test-pivot-first.mp4', c: 'Jul 31, at home: the first pivot test with the printed wrist and claw' }] },
      { label: 'Aug 1', title: 'Claw, final pivot motors, sideplates', p: ['The two-finger claw went on in the morning. The 43 rpm motors that had been ordered arrived, so the pivot changed motors a final time, with new 8 mm REX hubs, and I tuned its controller. In the afternoon I laser cut the truss sideplates from red acrylic, and that night I printed the letters and the logo for the back plate.'],
        media: [{ i: 'claw-v2-red-fingers.webp', c: 'Aug 1: the two-pixel claw with its two red fingers' }, { v: 'build-laser-cut-sideplate.mp4', c: 'Aug 1: the laser cutter tracing a truss sideplate in red acrylic' }] },
      { label: 'Aug 2', title: 'Finished', p: ['Sideplates and the lettered back plate on, then drive tests with the finished robot.'],
        media: [{ i: 'finished-robot.webp', c: 'Aug 2: the finished robot, red truss sideplates and the lettered back plate' }] },
    ] },

    // ------------------------------------------------------------------ the code
    { type: 'prose', id: 'code', h: 'Holding a long arm steady', p: [
      'The pivot is the hard part of a pitching robot. Gravity pulls hardest on the arm when it lies flat and not at all when it stands straight up, and the slides make the arm longer or shorter on top of that. A plain proportional controller has to build up error before it pushes back, so the arm would sag below its target by an amount that changes with the angle.',
      'So the pivot runs a proportional term plus a gravity feedforward term. The feedforward gives the motors the power gravity needs at the current angle, and the proportional term only has to close what is left:',
      { pre: 'angle      = -360 * position / 3895.9       (degrees)\ngravity    = 0.18 * cos(angle + 110°)\npitchPower = -0.001 * (target - position) + gravity' },
      'The motors drive the arm directly, with no gears or belts between them and the arm, so their gearboxes set the torque. I needed as much torque as possible, which meant as low a speed as possible: I started with the 312 rpm motors I had, moved to 223 rpm motors borrowed from a friend, and ended on the 43 rpm motors that had been ordered.',
      { calc: 'Which pivot motors could hold the arm out?',
        given: [
          ['Gravity moment about the pivot, arm flat, slides in', '4.1 N·m', 'my CAD (masses and positions of every part on the arm)'],
          ['The same, slides all the way out', '12.4 N·m', 'my CAD'],
          ['Stall torque, 312 rpm motor', '24.3 kg·cm = 2.38 N·m', '[goBILDA 5203, 19.2:1](https://www.gobilda.com/5203-series-yellow-jacket-planetary-gear-motor-19-2-1-ratio-24mm-length-8mm-rex-shaft-312-rpm-3-3-5v-encoder/)'],
          ['Stall torque, 223 rpm motor', '38.0 kg·cm = 3.73 N·m', '[goBILDA 5203, 26.9:1](https://www.gobilda.com/5203-series-yellow-jacket-planetary-gear-motor-26-9-1-ratio-24mm-length-8mm-rex-shaft-223-rpm-3-3-5v-encoder/)'],
          ['Stall torque, 43 rpm motor', '185 kg·cm = 18.1 N·m', '[goBILDA 5203, 139:1](https://www.gobilda.com/5203-series-yellow-jacket-planetary-gear-motor-139-1-ratio-24mm-length-8mm-rex-shaft-43-rpm-3-3-5v-encoder/)'],
          ['Pivot motors', '2, direct drive', 'my CAD'],
        ],
        work: [
          '312 rpm pair: 2 × 2.38 = 4.8 N·m, barely above 4.1 with the slides in and well under 12.4 with them out',
          '223 rpm pair: 2 × 3.73 = 7.5 N·m, 1.8 times the load with the slides in, still under 12.4',
          '43 rpm pair: 2 × 18.1 = 36.3 N·m, 2.9 times the load with the slides out',
        ],
        result: 'Only the 43 rpm pair can hold the arm flat with the slides out, and stall torque is the most a motor gives, at zero speed: neither faster pair could have lifted the full reach at all.',
        note: 'Estimate: stall torque at 12 V; the arm weighs 1.98 kg in my CAD, with the printed claw parts taken as solid plastic, so the loads are an upper bound.' },
      'With the 43 rpm goBILDA gearmotors on the arm directly, 3,895.9 encoder ticks are one turn of the arm, about 10.8 ticks per degree. Both motors get the same power, and only one encoder is read. The driver has two presets on the second gamepad\'s D-pad, up (50 ticks) and down (1,225 ticks), about 109 degrees apart, and each preset also moves the wrist, so the claw points the right way at both ends. I tuned it on the robot, with the target and the measured position on the Driver Station screen.',
      { calc: 'Why the gravity term: how far would P alone sag?',
        given: [
          ['Proportional gain kP', '0.001 power per tick', '`TestTeleop.java`'],
          ['Gravity gain kG', '0.18 power, arm flat', '`TestTeleop.java`'],
          ['Encoder at the arm', '3,895.9 ticks per turn', `[goBILDA 5203, 139:1](https://www.gobilda.com/5203-series-yellow-jacket-planetary-gear-motor-139-1-ratio-24mm-length-8mm-rex-shaft-43-rpm-3-3-5v-encoder/)`],
          ['Stall torque, 43 rpm motor', '185 kg·cm = 18.1 N·m', `[goBILDA 5203, 139:1](https://www.gobilda.com/5203-series-yellow-jacket-planetary-gear-motor-139-1-ratio-24mm-length-8mm-rex-shaft-43-rpm-3-3-5v-encoder/)`],
          ['Pivot motors', '2, direct drive', 'my CAD'],
        ],
        work: [
          'Ticks per degree = 3,895.9 / 360 = 10.8',
          'Flat, the arm needs about 0.18 power just to hold still; the gravity term supplies it',
          'P alone gives 0.18 only at an error of 0.18 / 0.001 = 180 ticks = 180 / 10.8 = 16.6°',
          'Torque at 0.18 power, stalled: 2 × 0.18 × 18.1 N·m = 6.5 N·m',
          'Up preset, 105° from flat: 0.18 × cos 105° = -0.05, a light push back toward vertical',
        ],
        result: 'Without the cosine term the arm would sit about 17 degrees below its target at flat before P pushed as hard as gravity pulls. With it, the motors hold about 6.5 N·m at flat, and P only closes what is left.',
        note: 'Estimate: assumes 0.18 balances the arm at flat, a stalled motor\'s torque in proportion to its power, and no friction; the load also changes with how far out the slides are.' },
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
    { type: 'scrolly', id: 'pivot', module: 'pivot', stepHeight: '85vh', poster: `${M}/poster-pivot.webp`,
      h: 'Why the pivot broke',
      p: ['The same arm and the same controller, first with the slides in, then all the way out, and then what that did to the channel that carries the slides.'],
      steps: [
        { h: 'Two presets, one controller', p: ['Slides in, the arm swings up past vertical. The readout is the code\'s own math: the P term fades near the target; the gravity term falls from 0.18 at flat to zero at vertical and turns negative past it.'] },
        { h: 'The same arm, slides out', p: ['The claw goes from 0.44 m to 1.42 m from the pivot (from my CAD): 3.2 times its torque, and about 10 times its inertia every time the arm starts or stops.'] },
        { h: 'Where the load goes', p: ['The motor hubs turn a 72 mm U-channel. The slide kit\'s 1-hole U-channel sits on it, and the low-side U-channel carrying the slides sits on that. For the first 16 mm past the 1-hole channel, that 12 mm tall channel and one small steel bracket carry the whole arm.'] },
        { h: 'Every full-power start', p: ['Pressing the up preset from rest puts both motors at stall: 36.3 N·m. My FEA puts **560 MPa** at the side-wall hole 8 mm past the 1-hole channel, against 276 MPa yield: a safety factor of **0.49**.'] },
        { h: 'Pivot after pivot', p: ['The down preset starts at stall the other way, so every pivot swings the stress at that hole from +600 to -570 MPa: past yield both ways, six times the fatigue limit. A crack starts at the hole and grows.'] },
        { h: 'The snap', p: ['The crack ran across the channel and it snapped cleanly: the slides and the claw fell, and the stub left on the pivot swung up. The crack and the snap are drawn, not simulated.'] },
        { h: 'The rule I would add', p: ['Slides in first, then pivot. With the slides out the pivot stays locked; only fully retracted may it move.'] },
      ],
      caption: 'Steps 1 and 2: the readout is computed from the constants in TestTeleop.java at each angle, with the target set to the up preset; the torque and inertia ratios compare the claw at its two distances from the pivot and count the claw only. Steps 4 to 6: the colours are my FEA\'s von Mises stress on the low-side U-channel at the up start and at the down start, on a scale that ends at 6061-T6\'s 276 MPa yield (dark red is past it). The crack follows the row of holes where the FEA peak is, and it and the snap are an illustration of the failure; the drawn pivots swing 16 degrees to stay in frame, where the real up preset is 105.' },

    // ------------------------------------------------------------------ what broke
    { type: 'prose', id: 'broke', h: 'What broke, and what I would change', p: [
      { problem: 'The low-side U-channel that holds the slides cracked between the 1-hole U-channel and the slide mount. With the whole extension out, the slides put a large load on it, and so does the 1-hole U-channel under it, which the two 43 rpm motors drive through the 72 mm channel. The arm pivoted several times fully extended; every pivot deformed the channel a little more, until it snapped cleanly.', title: 'The low-side U-channel snapped' },
      'To see why, I ran a finite element analysis on my CAD: the low-side, 1-hole and 72 mm U-channels, the steel angle bracket beside them and the slide\'s fixed outer rail, joined where the kit\'s screws are and held where the motor hubs bolt on. The rest of the arm, 1.98 kg in my CAD, goes in as its weight and inertia at its real place.',
      { fig: { i: 'fea-path.webp', c: 'My FEA at the worst moment: the up preset pressed from rest with the slides all the way out, both motors at stall. Von Mises stress on my CAD\'s parts, from the left and above; dark red is past 6061-T6\'s typical yield.' }, wide: true },
      { calc: 'Safety factor of the low-side U-channel at a full-power start, slides out',
        given: [
          ['Motor torque, preset pressed from rest', '2 × 185 kg·cm = 36.3 N·m (stall)', `[goBILDA 5203, 139:1](https://www.gobilda.com/5203-series-yellow-jacket-planetary-gear-motor-139-1-ratio-24mm-length-8mm-rex-shaft-43-rpm-3-3-5v-encoder/); direct drive, my CAD`],
          ['Arm inertia about the pivot, slides out', '1.50 kg·m²', 'my CAD'],
          ['Gravity moment, arm flat, slides out', '12.4 N·m', 'my CAD'],
          ['Low-side U-channel', 'goBILDA 1121-0015-0384, aluminium, 130 g', '[goBILDA](https://www.gobilda.com/1121-series-low-side-u-channel-15-hole-384mm-length/); 6061 (Jerry)'],
          ['6061-T6 yield strength', '276 MPa typical, 240 MPa minimum', '[6061 aluminium alloy](https://en.wikipedia.org/wiki/6061_aluminium_alloy)'],
        ],
        work: [
          'Angular acceleration at the start: (36.3 - 12.4) / 1.50 = 15.9 rad/s²',
          'Nearly all of the arm is past the crack, so nearly all of the 36.3 N·m goes through the channel there: 29 N·m in the channel itself, the rest through the bracket beside it (FEA)',
          'FEA peak, von Mises, at the side-wall hole 8 mm past the 1-hole channel: 560 MPa; just holding the arm flat: 190 MPa',
          'Safety factor = 276 / 560 = 0.49 (0.43 on the 240 MPa minimum); holding still: 276 / 190 = 1.45',
        ],
        result: 'Below 1: every full-power start with the slides out pushes the metal at that hole past yield. Holding the arm out was fine; starting and stopping it was not.',
        note: 'Linear FEA (CalculiX, 10-node tetrahedra, about 800,000 unknowns) on my CAD\'s parts; above yield the real stress is capped by plasticity, so the number means the metal deforms there. The peak moved 1% when the elements at the hole went from 0.45 to 0.25 mm. Estimate: rigid arm, stall torque at 12 V, the printed claw parts taken as solid plastic.' },
      { fig: { i: 'fea-wall.webp', c: 'The same moment, the low-side U-channel\'s left side wall seen from the left: the metal past yield runs along the top of the wall over the 1-hole channel and peaks at the hole 8 mm past it, before the slide\'s first screws.' }, wide: true },
      'Why the extension mattered: with the slides out the arm is 8.5 times harder to spin up, so at every start the motors stay above 80% of stall about ten times longer (about 70 ms, against 6 ms with the slides in, from a simulation of the code\'s controller), and gravity alone already takes 190 of the channel\'s 276 MPa at that hole.',
      { calc: 'Why it cracked, then snapped',
        given: [
          ['Stress along the channel at the hole, up start', '+600 MPa (tension)', 'my FEA'],
          ['The same, down start (both motors at stall the other way)', '-570 MPa (compression)', 'my FEA'],
          ['6061-T6 fatigue limit', '97 MPa for 5 × 10⁸ fully reversed cycles', '[6061 aluminium alloy](https://en.wikipedia.org/wiki/6061_aluminium_alloy)'],
          ['6061-T6 yield strength', '276 MPa typical', '[6061 aluminium alloy](https://en.wikipedia.org/wiki/6061_aluminium_alloy)'],
        ],
        work: [
          'Each pivot, up then back down, is one cycle: amplitude (600 + 570) / 2 = 585 MPa, mean +15 MPa, so fully reversed',
          '585 / 97 = 6 times the fatigue limit, and past yield in both directions',
        ],
        result: `Every pivot bent the metal at the hole past yield, one way going up and the other way coming down. That is [low-cycle fatigue](https://en.wikipedia.org/wiki/Low-cycle_fatigue): plastic deformation in each cycle, and a low number of cycles to failure. A crack started at the hole, grew with each pivot, and the channel finally snapped cleanly across.`,
        note: 'The code starts both moves at full power: pressing a preset from the other one gives a P term over 1 (0.001 × 1,175 ticks), which is clipped to full power (TestTeleop.java). The amplitude is the elastic FEA value at the edge of the hole; the real one is capped by plasticity, which is what makes each cycle a small permanent deformation.' },
      { next: 'Reinforce the pivot.' },
      { problem: 'Nothing stopped the arm from pivoting at full extension. The pivot presets never checked the slides, and the slides ran open loop, so the code did not even know how far out they were.', title: 'No interlock in the code' },
      { next: [
        'Hard states that keep the arm from pivoting unless the slides are fully retracted.',
        'That needs the code to know where the slides are, from the slide motor\'s encoder or a switch at full retraction, and then a small state machine: retract, pivot, extend.',
      ] },
    ] },
    { type: 'prose', id: 'sideplates', h: 'The sideplates', p: [
      { problem: 'I laser cut the sideplates from acrylic because it was the only material I had access to. In the weeks after the demo, a student picked the robot up by one of them, and it broke.', title: 'Acrylic sideplates' },
    ], media: [
      [{ i: 'build-glowforge-sheet.webp', c: 'Aug 1: a truss sideplate cut from red acrylic on the laser cutter bed' },
        { i: 'build-sideplate-mounted.webp', c: 'Aug 2: a sideplate bolted to the robot' }],
    ] },

    // ------------------------------------------------------------------ the carnival
    { type: 'media', id: 'carnival', layout: 'row', h: 'At the STEAM Carnival',
      p: ['On Aug 3, 2024 the robot ran on a field with CENTERSTAGE backdrops and pixels, set up under a tent at the STEAM Carnival. Visitors from the community, children and adults, drove it.', 'It was there to recruit for the library system\'s FTC class, which I taught, and the class was overbooked. As part of the same internship I also wrote and taught a robotics curriculum.'],
      items: [
        { v: 'hero-carnival-field.mp4', c: 'At the carnival: the robot on the field with its arm up' },
        { i: 'carnival-field-wide.webp', c: 'Aug 3: the robot on the field, the backdrop behind it' },
      ] },
    { type: 'media', layout: 'row', items: [
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
