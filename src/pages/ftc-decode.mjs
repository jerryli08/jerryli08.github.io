// FTC DECODE robots (Alphabots, FTC 26115), 2025-26. Rich page.
// Copy uses only facts Jerry stated (facts.md, checklist, answers.md of Sept 26, 2026), what the
// photos and videos plainly show, and numbers read from his two CAD files (marked "in the CAD").
// Rules from answers.md: never name the student who modelled the V2 shooter; never state robot
// performance at the World Championship (only the Sustain Award); the team code is private, so
// it is described but never linked and no file or class names are quoted.
// Every animation is a scrolly driven only by the scroll (Jerry, Sept 26): versions.js (V1 to V2),
// v1.js (a ball through V1's intake and shooter), turret-rig.js (the turret's gearing and a ball
// through it) and drive.js (a scripted drive on a stand-in field, aiming from the pose).
// Held back pending Jerry: how the Tekin T180 servo (on the turret in the CAD) couples to the
// 150T ring; the turret's real travel range; whether the April 13 servo-mount failure had its own
// fix; how far the V1 gate and flap swing (the animated swings are illustrative).
const M = '/assets/models/ftc-decode';

// datasheets and sources linked from the worked calculations
const YJ435 = '[goBILDA 435 rpm Yellow Jacket](https://www.gobilda.com/5203-series-yellow-jacket-planetary-gear-motor-13-7-1-ratio-24mm-length-8mm-rex-shaft-435-rpm-3-3-5v-encoder/)';
const YJ6000 = '[goBILDA 6,000 rpm Yellow Jacket](https://www.gobilda.com/5203-series-yellow-jacket-motor-1-1-ratio-24mm-length-8mm-rex-shaft-6000-rpm-3-3-5v-encoder/)';
const MITER = '[goBILDA miter gears](https://www.gobilda.com/clamping-steel-miter-gear-8mm-rex-bore-24-tooth-mod-1/)';

export default {
  summary: {
    stats: [
      { v: '1st / 8,000+ teams worldwide', l: 'Sustain Award, FIRST World Championship' },
      { v: '$100,000+', l: 'Raised through a Legislative Bond Initiative' },
      { v: '50,000+', l: 'Views on our build content' },
    ],
    text: [
      'I captained Alphabots, FTC team 26115, through the 2025-26 season, DECODE. I designed our first robot myself: a mecanum chassis, a full-width intake, a ramp that stores three balls and a fixed flywheel shooter.',
      'For the World Championship we kept that chassis and put a turret shooter on top that aims from the robot\'s odometry pose, so it can shoot from anywhere on the field. The engineering decisions were mine; a student who had never used CAD did the modelling while I guided him through every step. Our team of 11 went from not qualifying for regionals to the 1st place Sustain Award at the FIRST World Championship.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-worlds-match.mp4', c: 'A qualification match at the FIRST World Championship, Jackson Division, from the top-down broadcast camera. We are 26115, the dark robot on the red alliance' },
      { v: 'hero-turret-tracking.mp4', c: 'The turret tracking on our practice field, April 18, 2026: the chassis drives and turns under it while the turret stays pointed at the goal' },
    ],
  },
  sections: [
    { type: 'scrolly', id: 'cad', module: 'versions', stepHeight: '85vh', poster: `${M}/poster-versions.webp`,
      h: 'The CAD: what changed from V1 to V2',
      p: ['V1 is the robot I designed and played our first four events with; V2 is the World Championship robot, the same chassis with a turret shooter on top. Here are both, from my CAD files, on one stage. Parts that are identical in both files stay where they are, and only the parts that differ swap, found by comparing the two files body by body.'],
      steps: [
        { h: 'V1, November 2025', p: ['The robot I designed: a mecanum chassis, a full-width intake, a ramp that stores three balls and a fixed flywheel shooter at the back.'] },
        { h: 'Cut in half', p: ['A section down the middle of the robot shows the ball path. In V1 the top ball waits under a gate in front of a fixed flywheel.'] },
        { h: 'What changed', p: ['Tinted: the V1 parts that are not in the Worlds CAD. The shooter, the top of the ramp and some of the plates.'] },
        { h: 'V2, the Worlds robot', p: ['The same chassis, intake and ramp, with a turret shooter on top. Its new parts are tinted as they come in.'] },
        { h: 'Cut in half again', p: ['In V2 the top ball waits in the bore of the turret bearing, right under the new shooter.'] },
      ],
      caption: 'Screws and circuit boards are left out; every other part is the CAD as modelled.' },

    { type: 'prose', id: 'overview', h: 'Two robots, one chassis', p: [
      'DECODE is the 2025-26 FIRST Tech Challenge game. Robots pick up purple and green balls, 5 in across (127 mm in the CAD), and shoot them into their alliance\'s goal. I was the team captain.',
      'We ran two robots on one chassis. I designed V1 myself in the fall of 2025, and it played our four events in January and February 2026. For the World Championship we replaced its fixed shooter with a turret. I made the engineering decisions for the new shooter; a student who had never used CAD before did the modelling, and I guided him through every step.',
      { fig: [
        { i: 'v1-portrait-field.webp', c: 'V1 from the back: the flywheel with a motor on each end, and the Limelight below it' },
        { i: 'v2-three-quarter.webp', c: 'V2 on the bench: the turret shooter on top, its ring gear underneath and a 90-tooth gear at the left' },
      ] },
      { table: {
        head: ['', 'V1: the barebones robot', 'V2: the Worlds robot'],
        rows: [
          ['Designed', 'Entirely by me, Sep to Nov 2025', 'My engineering decisions, modelled by a student I guided, Apr 2026'],
          ['Drive, intake, ramp', 'Mecanum drive, 8-wheel intake, 3-ball ramp', 'The same, plus four TPU spinners along the ramp'],
          ['Shooter', 'Fixed: two 96 mm wheels on one axle, a motor on each end', 'On a turret: one 72 mm wheel, two motors through bevel gears'],
          ['Hood', 'Fixed arc, with a two-position flap on a Swyft servo', 'A toothed arc, rolled by a servo and a 40-tooth pinion'],
          ['Aiming', 'Point the back of the robot at the goal', 'The turret aims from the odometry pose'],
          ['Competed', 'Four events, Jan to Feb 2026', 'FIRST World Championship, Apr 29 to May 2, 2026'],
        ],
        caption: 'Part sizes, tooth counts and dimensions on this page are read from the CAD unless a source is given.',
      } },
    ] },

    // ------------------------------------------------------------------ V1
    { type: 'prose', id: 'v1', h: 'V1: the robot I designed', p: [
      { h: 'Start from the shot' },
      'Early in the season I drew the shooter\'s side view as a dimensioned 2D sketch: the ball, a 96 mm flywheel, the hood arc and a 40° ramp from the intake up to the wheel. That sketch fixed the path a ball takes from the floor to the flywheel, and I built the rest of the robot around it.',
      'The result is one straight path down the middle of the robot. The intake is at the front, three stored balls sit in a line climbing toward the back, and the flywheel is at the back, up top. The shot leaves backward and up, over the rear of the robot.',
      { h: 'Chassis' },
      { ul: [
        'Four goBILDA 104 mm mecanum wheels, so the robot can strafe and line up without turning.',
        'Each drive motor turns its wheel through a right-angle bevel pair, so the motors stand up or lie along the sides and the middle of the chassis stays clear for the ramp.',
        'Carbon fiber side and inner plates with 3D printed brackets.',
        'Two odometry pods and a goBILDA Pinpoint odometry computer track where the robot is.',
        'In the CAD it is 15.5 in by 18.0 in in plan and about 18 in tall, inside the 18 in starting cube.',
      ] },
      { h: 'Intake and ramp' },
      'The intake is one shaft of eight 48 mm compliant wheels across almost the full width of the robot, driven by one motor through a 36-tooth to 36-tooth belt. Behind it the ramp holds three balls in a line, and a second motor turns compliant wheels inside the ramp that push them up toward the shooter. The first version of the intake stalled; the fix is in [Failures and fixes](#failures).',
      { h: 'Gate, feed wheels and flywheel' },
      'The top ball stops under a gate on a Swyft servo. To shoot, the gate swings open and two 96 mm roller wheels on servos, one on each side of the ball, lift it into the flywheel.',
      'The flywheel is two 96 mm wheels side by side on one axle, driven directly from both ends by two goBILDA Yellow Jacket motors, the 1:1, 6,000 rpm version, with no belt or gears in between. The ball is pinched between the wheel and the hood and carried up the front of the wheel. In the CAD the hood\'s inner surface is 170 mm from the axle, so the 127 mm ball is squeezed about 5 mm against the 96 mm wheel.',
      'Because the shooter is fixed to the chassis, our drivers aimed V1 by pointing the back of the robot at the goal.',
      { h: 'A hood with two positions' },
      'The end of the hood is a flap on a Swyft servo with two positions: high for the close zone, low for the far zone. Measured around the flywheel axle from the robot\'s front, the fixed hood ends about 32° up. With the flap down, as modelled, it carries the same arc on to 52°. With the flap up, the arc stops at 32°.',
      'A ball leaves roughly along the tangent where the hood ends. From the CAD that is about 38° above horizontal with the flap down and about 58° with it up: a flatter shot for the far zone and a steeper one for the close zone, from one fixed shooter.',
      { note: 'Launch angles on this page are geometry only: the tangent where the hood ends in the CAD, ignoring spin and slip.' },
    ],
      media: [
        { i: 'v1-shot-layout-sketch.webp', c: 'The 2D layout I built V1 around, September 2025: the ball, the 96 mm flywheel, the hood arc and the 40° ramp' },
        [{ i: 'v1-cad-top-three-balls.webp', c: 'From above: the stored balls line up down the middle, between the drive motors' }, { i: 'v1-transfer-packaging.webp', c: 'Reaching into the ramp past the X-cut carbon fiber inner plate: there is little room to spare between the plates' }],
        [{ i: 'v1-gate-ball-staged.webp', c: 'From behind: a ball waits under the teal gate, just past the flywheel pair' }, { v: 'v1-three-ball-channel.mp4', c: 'Looking down the ramp from the intake end as balls are loaded in' }],
        { i: 'v1-dual-motor-flywheel.webp', c: 'Wiring V1: the flywheel pair with a motor on each end of the axle' },
        { i: 'v1-cad-render.webp', c: 'V1 in CAD: carbon fiber plates, teal printed parts and the curved hood over the flywheel' },
      ] },
    { type: 'scrolly', id: 'v1-demo', module: 'v1', stepHeight: '95vh', poster: `${M}/poster-v1.webp`,
      h: 'A ball through V1',
      p: ['The V1 CAD cut down the middle, with its moving parts rigged about their real axes: the intake shaft, the gate and flap servos, the two feed wheel servos and the flywheel axle. A ball travels the whole path as you scroll.'],
      steps: [
        { h: 'One straight path', p: ['The intake is at the front, the ramp climbs toward the back and the flywheel sits at the back, up top. The ramp stores three balls in a line: here two are loaded and a third waits in front of the intake.'] },
        { h: 'The first intake: 1,620 rpm', p: ['The intake is one shaft of eight 48 mm compliant wheels, driven by one motor through a 36-tooth to 36-tooth belt. As first built it turned at 1,620 rpm, and on its first test, on November 8, 2025, a ball pushed into the roller row stalled against the spinning wheels ([Failures and fixes](#failures)).'] },
        { h: 'Geared down: 1,150 rpm', p: ['I changed the intake gearing to 1,150 rpm: 1.41 times the torque at the roller, for about 29% less speed. A week later the intake swallowed balls and sent them up the ramp.'] },
        { h: 'Flap up: the close zone', p: ['With the flap up, the hood stops at 32° around the flywheel axle and the ball leaves about 58° above horizontal. To shoot, the gate swings open and the two 96 mm feed wheels lift the top ball into the flywheel, which carries it up the front of the wheel under the hood. The next two balls move up behind it.'] },
        { h: 'Flap down: the far zone', p: ['With the flap down, as modelled, the hood\'s arc carries on to 52° and the ball leaves about 38° above horizontal: a flatter shot for the far zone, from the same fixed shooter.'] },
      ],
      caption: 'The gate and flap turn about their servos\' axes in the CAD; how far they swing here is illustrative. The roller turns with the scroll at speeds in the ratio of the two gearings, and the readout gives the real speeds; surface speed uses the 48 mm intake wheels in the CAD. The stall is shown as it was filmed: the ball stops at the roller.' },
    { type: 'media', h: 'Building V1', layout: 'row', items: [
      { i: 'v1-intake-front.webp', c: 'The intake: eight compliant wheels on one shaft across the front, with two balls against it' },
      { i: 'v1-cad-render-front.webp', c: 'V1 in CAD from the front: the intake roller row, balls in the ramp and the hood above' },
    ] },

    // ------------------------------------------------------------------ V2
    { type: 'prose', id: 'v2', h: 'V2: a turret for the World Championship', p: [
      { h: 'Why a turret' },
      'V1 had to point its back at the goal to shoot. For Worlds I wanted a robot that could shoot from anywhere on the field, whichever way it was facing. The World Championship deadline was close, so we kept V1\'s chassis, intake and ramp and replaced only the shooter.',
      'The engineering decisions on the new shooter were mine. A student on the team who had never used CAD before did the modelling, and I guided him through every step of it.',
      { h: 'Turret' },
      { ul: [
        'The turret rides on an AndyMark turntable bearing with a 145 mm bore and a 203 mm outside diameter.',
        'A 150-tooth ring gear on the turret meshes with two 90-tooth gears on the chassis, so each of those gears turns 1.67 times as far as the turret. A Tekin T180 servo, mounted next to the Limelight, rotates the turret.',
        'The ramp ends under the bearing. The top ball sits in the 145 mm bore and balls feed straight up through the middle of the turret, with 9 mm to spare on each side of a 127 mm ball. Nothing has to reach around the part that turns.',
        'A Limelight 3A rides on the turret, facing the same way as the shot.',
      ] },
      { h: 'Shooter and hood' },
      { ul: [
        'One 72 mm wheel on a cross axle, driven by two 1:1 motors through right-angle bevel gears, so both motors lie along the sides of the turret.',
        'The hood\'s outer edge is a toothed arc centred on the flywheel axle, and a servo with a 40-tooth pinion rolls the hood along it. The arc\'s pitch radius is 180.5 mm and the pinion\'s 23.6 mm, so the pinion turns 7.65 times as far as the hood.',
        'Rolling the hood moves the point where the ball leaves the wheel, which sets the launch angle.',
      ] },
      { h: 'Transfer' },
      'V2 adds four TPU spinners along the sides of the ramp, on continuous rotation servos, that push the balls up into the turret.',
      { h: 'Aiming from the odometry pose' },
      'The turret aims from the robot\'s odometry pose alone. The odometry computer knows where the robot is on the field and which way it faces, so the code works out the direction to the goal, subtracts the robot\'s heading and turns the turret to that angle.',
      'We planned to fuse the Limelight\'s AprilTag readings with odometry, but odometry was very good on its own. The Limelight was only there to relocalize the robot after a minute or more, with a button or with a mode that relocalizes on the next AprilTag it sees. In practice we did not use it, because relocalization was not working in time.',
    ],
      media: [
        { v: 'hero-worlds-robot-orbit.mp4', c: 'V2, the World Championship robot: a turret shooter on the chassis I designed for V1' },
        { i: 'v2-top-down-turret.webp', c: 'V2 from straight above on April 30, during the World Championship' },
        [{ i: 'still-v2-turret-gear-mesh.webp', c: 'A black 90-tooth gear on the chassis against the turret\'s ring gear' }, { v: 'v2-turret-turned-by-hand.mp4', c: 'The turret mounted on the chassis, turned by hand on its bearing' }],
        [{ v: 'v2-turret-closeup-orbit.mp4', c: 'Around the turret up close: the flywheel shroud, the hood and the motors' }, { i: 'v2-transfer-spinners-top.webp', c: 'The ramp from above, marked up in yellow and blue: TPU spinners sit on both sides of the ball path' }],
        { i: 'v2-front.webp', c: 'V2 from the front: the Limelight rides on the turret to track the AprilTag' },
      ] },
    { type: 'scrolly', id: 'turret', module: 'turret-rig', stepHeight: '95vh', poster: `${M}/poster-turret.webp`,
      h: 'The turret, in the Worlds CAD',
      p: ['The V2 CAD with its moving parts rigged about their real axes: the turret on its bearing, the two 90-tooth gears, the hood on its toothed arc and its 40-tooth pinion, the flywheel and the four TPU spinners.'],
      steps: [
        { h: 'On a turntable bearing', p: ['The turret rides on an AndyMark turntable bearing with a 145 mm bore and a 203 mm outside diameter. A 150-tooth ring gear on the turret meshes with two 90-tooth gears on the chassis.'] },
        { h: 'Turning the turret', p: ['Each 90-tooth gear turns 150/90, 1.67 times as far as the turret, the other way. Turned 60° here, the turret turns each gear 100°.'] },
        { h: 'Rolling the hood', p: ['A servo with a 40-tooth pinion rolls the hood along its toothed arc, centred on the flywheel axle. The arc\'s pitch radius is 180.5 mm and the pinion\'s 23.6 mm, so the pinion turns 7.65 times as far as the hood, the other way: rolled 20° here, the hood turns it 153°.', 'Rolling the hood moves the point where the ball leaves the wheel, which sets the launch angle.'] },
        { h: 'Feeding a ball', p: ['The four TPU spinners along the sides of the ramp push the balls up. The top ball waits in the bearing\'s bore, with 9 mm to spare on each side, and feeds straight up onto the 72 mm flywheel, under the hood and out. Nothing has to reach around the part that turns.'] },
      ],
      caption: 'Tooth counts and pitch radii from the CAD. How far the turret turns here is illustrative, not the robot\'s real travel limit; the hood rolls only where the pinion stays on the arc in the CAD. Launch angles are geometry only.' },

    // ------------------------------------------------------------------ code
    { type: 'prose', id: 'code', h: 'The code', p: [
      'Our robot code is Java on the FTC SDK. The repository is private, so there is no link here, but this is how it is put together.',
      { ul: [
        '**Localization.** A goBILDA Pinpoint odometry computer reads the two odometry pods and keeps the robot\'s pose: x, y and heading on the field.',
        '**Autonomous.** Pedro Pathing follows chains of Bezier lines and curves, and a numbered state machine steps through the routine: drive to the launch zone and fire the three preloaded balls, drive through a row of three with the intake running, go back and shoot, and repeat for the next row. To fire, it opens the gate and runs the feed wheels for about a second.',
        '**Flywheel.** A PIDF loop on the average speed of the two motors\' encoders, with a feedforward term proportional to the target speed. The output is multiplied by 13 V over the measured battery voltage, so the wheel gets the same drive as the battery sags, and the voltage is only read every half second to keep the loop fast. The driver switches between two speed presets with the bumpers.',
        '**Turret (V2).** It aims from the odometry pose, as above. A centering routine on the Driver Hub sets the servo position for a centered turret.',
      ] },
      { calc: 'What do the two flywheel presets mean at the ball?',
        given: [
          ['V1 flywheel', '96 mm, driven directly by two 6,000 rpm motors', `measured from the CAD; ${YJ6000}`],
          ['Presets', '2,300 and 4,000 rpm', 'our Driver Hub readout'],
        ],
        work: [
          'Wheel surface speed: π × 0.096 m × 2,300 / 60 = 11.6 m/s, and π × 0.096 m × 4,000 / 60 = 20.1 m/s',
          'The ball rolls between the moving wheel and the still hood, so with no slip its centre moves at half the surface speed: about 5.8 and 10 m/s',
          'Headroom: 4,000 rpm is 4,000 / 6,000 = 67 % of the motors\' free speed, 2,300 rpm is 38 %',
        ],
        result: 'The presets launch a ball at roughly 6 and 10 m/s, and even the high one leaves the motors a third of their free speed to pull the wheel back up to speed after each shot.',
        note: 'Estimate: no slip and no squeeze losses, so real launch speeds are lower.' },
    ],
      media: [
        { v: 'hero-v1-autonomous.mp4', c: 'V1 running a full autonomous routine on our practice field, December 21, 2025' },
        { i: 'still-v1-flywheel-telemetry.webp', c: 'The Driver Hub readout: presets of 2,300 and 4,000 rpm, the wheel at 4,071 rpm against a 4,000 rpm target, 28 shots counted' },
      ] },

    // ------------------------------------------------------------------ timeline
    { type: 'iterations', id: 'timeline', h: 'How the season went', items: [
      { label: 'Sep 2025', title: 'The shot first', p: ['I drew the ball path in 2D before modelling anything else, then built all of V1\'s CAD around it.'] },
      { label: 'Nov 2025', title: 'V1 built', p: ['The carbon fiber side plates went together in early November. The intake stalled on its first test on November 8; a week later, geared down, it took in two balls at once. By late November V1 was shooting into the goal.'],
        media: [{ i: 'v1-cf-sideplate-subassembly.webp', c: 'November 7: a carbon fiber side plate with its drive motor and number plate, before it went on the robot' }] },
      { label: 'Dec 2025 to Jan 2026', title: 'Autonomous and consistent shots', p: ['Full autonomous routines on our practice field, and a long chase for consistent shots: first the shooter\'s stiffness, then the flywheel\'s inertia.'] },
      { label: 'Jan to Feb 2026', title: 'Four events with V1', p: ['The Moorefield, WV and Laurel, MD qualifiers and the Chesapeake Championship: Inspire Award 2nd and 3rd place and a Reach Award.'],
        media: [{ i: 'v1-at-event.webp', c: 'V1 on event day at the Moorefield, WV Qualifier II, January 11, 2026' }] },
      { label: 'Apr 2026', title: 'V2: the turret', p: ['The new turret shooter went onto the same chassis in April. By April 18 the turret was tracking the goal on our practice field (the second video at the top of this page), and on April 27 a test showed its range was off.'],
        media: [{ v: 'v2-turret-assembly-in-hand.mp4', c: 'The turret before it was mounted: the turntable bearing, the printed turret body and the flywheel shroud' }] },
      { label: 'Apr 29 to May 2, 2026', title: 'The World Championship', p: ['Jackson Division. A printed servo mount broke and I reprinted it overnight. The team won the 1st place Sustain Award.'],
        media: [{ i: 'v2-inspection-worlds.webp', c: 'V2 at inspection at the World Championship' }] },
    ] },

    // ------------------------------------------------------------------ failures
    { type: 'prose', id: 'failures', h: 'Failures and fixes', p: [
      { h: 'An intake that would not take a ball' },
      { problem: 'On the first intake test, on November 8, 2025, a ball pushed into the roller row stalled against the spinning wheels and did not come in.', title: 'Intake stall' },
      { fix: 'I changed the intake gearing from 1,620 rpm to 1,150 rpm. A week later, on November 15, the intake swallowed two balls side by side and sent them up the ramp.' },
      { calc: 'What did gearing down cost?',
        given: [
          ['Intake speed, before and after', '1,620 rpm, then 1,150 rpm', 'the gearing I changed'],
          ['Intake wheels', '48 mm, on the intake shaft through a 36 to 36 tooth belt', 'measured from the CAD'],
          ['Drive motors and wheels', '435 rpm through 1 : 1 miter gears to 104 mm mecanum wheels', `${YJ435}, ${MITER}, CAD`],
        ],
        work: [
          'Torque at the roller: 1,620 / 1,150 = 1.41 times as much, for 29 % less speed',
          'Roller surface speed: π × 0.048 m × 1,620 / 60 = 4.1 m/s before, π × 0.048 m × 1,150 / 60 = 2.9 m/s after',
          'Chassis top speed, driving straight: π × 0.104 m × 435 / 60 = 2.4 m/s',
        ],
        result: 'Geared down, the roller has 41 % more torque and its surface still runs about 1.2 times the chassis\'s top speed (it was 1.7 times): it still outruns the robot driving into a ball.',
        note: 'Free speeds from the datasheets, no load; a loaded motor runs slower.' },
    ],
      media: [
        { v: 'v1-intake-ball-stalls.mp4', c: 'November 8: the ball stalls at the rollers' },
        { v: 'v1-intake-swallows-two.mp4', c: 'November 15, geared down: a green and a purple ball taken in together' },
      ] },
    { type: 'prose', id: 'shots', p: [
      { h: 'Inconsistent shots' },
      { problem: [
        'Our shots were not consistent. In December you can hear it in our test videos ("the flywheel lost its RPM"), and the Driver Hub readout shows the wheel speed swinging around its target while we fire.',
        'We traced it to two things. The first was the stiffness of the shooter assembly. The second showed up once the shooter was stiff: balls still left differently from shot to shot, and that came down to the flywheel\'s inertia.',
      ], title: 'Shot consistency' },
      { fix: [
        'We stiffened the shooter assembly.',
        'For inertia, we first packed the flywheel hub with steel nuts. That helped somewhat. Real steel flywheels helped much more and made our shots much more consistent.',
        'Why inertia matters: every ball takes energy out of the spinning wheel, whose energy is ½Iω². The bigger the moment of inertia *I*, the smaller the drop in speed for the same energy, so the next ball leaves at closer to the same speed.',
      ] },
    ] },
    { type: 'media', layout: 'row', items: [
      { v: 'v1-flywheel-telemetry-recovery.mp4', c: 'Firing at the 2,300 rpm preset: the wheel speed swings around its target, the shot count climbs and the recovery flag comes on' },
      { v: 'v1-flywheel-tread-wear.mp4', c: 'Late January: the flywheel tread worn white along the seam between the two wheels' },
      { v: 'v1-flywheel-packed-with-nuts.mp4', c: 'Late January: the flywheel off the robot, one wheel opened to show the steel nuts inside' },
      { i: 'v1-flywheel-nuts-photo.webp', c: 'The flywheel hub packed with steel nuts, January 30' },
    ] },
    { type: 'prose', id: 'tracking', p: [
      { h: 'A turret test with the range off' },
      { problem: 'On April 27 we turned the robot on the floor with the tracker running (the video here). The turret tried to stay on target, but its range was off: the servo covered much more angle than the code expected.', title: 'Tracking range' },
      { fix: 'That night the code got a centering routine on the Driver Hub: turn the turret until it is physically centered, note the servo position, and write it into the tracker code as the center.', label: 'Calibration' },
    ],
      media: [{ v: 'hero-turret-tracking-test.mp4', c: 'April 27, 2026: the robot is turned on the floor while the turret tries to stay on the target' }] },
    { type: 'prose', id: 'mount', p: [
      { h: 'A servo mount at the World Championship' },
      { problem: [
        'At the World Championship a printed servo mount on the new shooter broke.',
        'I had told the student to add another attachment point, which made the mount stiffer. When we adjusted the gears they still skipped at times, so we pushed down on the mount to keep them in mesh. The mount was missing a fillet, which left an extremely sharp inside corner. A sharp corner concentrates stress, and it broke right there.',
      ], title: 'Broken servo mount' },
      { fix: 'I reprinted the mount overnight.' },
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'v2-overnight-reprint.webp', c: 'The servo mount I reprinted overnight during the World Championship' },
      { i: 'v2-servo-mount-failure.webp', c: 'April 13, during the V2 build: an earlier printed servo mount, torn open along its layers at a screw' },
    ] },

    // ------------------------------------------------------------------ drive scrolly
    { type: 'scrolly', id: 'drive', module: 'drive', stepHeight: '95vh', poster: `${M}/poster-drive.webp`,
      h: 'Aiming from the pose',
      p: ['The Worlds robot on a field, driving a scripted path. Like the real turret, it aims from the robot\'s pose alone: where the robot is and which way it points. The magenta arc is the ball\'s path.'],
      steps: [
        { h: 'The pose', p: ['The odometry computer knows where the robot is on the field and which way it faces. From that pose the code works out the direction to the goal, subtracts the robot\'s heading and turns the turret to that angle.'] },
        { h: 'Drive and turn', p: ['The chassis drives across the field and turns a quarter turn. The turret turns the other way as it goes, so the shooter stays on the goal whichever way the robot faces.'] },
        { h: 'Shoot from here', p: ['Stopped, the robot fires along the magenta arc: a plain projectile from the hood to the goal at the hood\'s modelled launch angle.'] },
        { h: 'Strafe to the far side', p: ['Mecanum wheels let the chassis slide sideways and turn at the same time. The turret angle comes from the pose alone the whole way.'] },
        { h: 'From farther away', p: ['Farther from the goal, the same launch angle needs a faster ball: the readout gives the speed a plain projectile would need from each spot.'] },
      ],
      caption: 'Only the robot is CAD. The field, walls and goals are simplified stand-ins and the path is scripted. The arc is a plain projectile with no drag or spin, leaving the hood at its modelled 40° launch angle, and the turret\'s real travel limit is not modelled.' },

    // ------------------------------------------------------------------ results
    { type: 'prose', id: 'results', h: 'Results', p: [
      { table: {
        head: ['Event', 'Dates', 'Robot', 'Result'],
        rows: [
          ['Moorefield, WV Qualifier II', 'Jan 11, 2026', 'V1', 'Rank 14 of 34; 3-1-1; playoffs 1-2'],
          ['Laurel, MD Qualifier I', 'Jan 31, 2026', 'V1', 'Rank 13 of 35; 3-0-2; **Inspire Award 2nd Place**'],
          ['Laurel, MD Qualifier 2', 'Feb 1, 2026', 'V1', 'Rank 6 of 28; 5-0 in qualifications; playoffs 3-2; **Inspire Award 3rd Place**'],
          ['Chesapeake Championship, Blue Crab Division', 'Feb 6 to 8, 2026', 'V1', 'Rank 15 of 48; 5-0-2; playoffs 1-2; **Reach Award**'],
          ['FIRST World Championship, Jackson Division', 'Apr 29 to May 2, 2026', 'V2', '**Sustain Award, 1st place**'],
        ],
        caption: 'From the official FIRST event pages. Records are wins, losses and ties.',
      } },
      { quote: 'One of the most efficient shooters all day.', by: 'The event caster, on V1 in playoff match 4 at the Moorefield, WV Qualifier II' },
    ] },
    { type: 'media', layout: 'row', items: [
      { v: 'v1-moorefield-playoff-caster.mp4', c: 'Moorefield, WV Qualifier II, playoff match 4, from the event livestream. We are 26115 on the red alliance with 9073' },
      { i: 'team-practice-field.webp', c: 'The team with the robot on our practice field, April 2026' },
    ] },
    { type: 'callout', h: '1st place Sustain Award, Jackson Division', p: [
      'The Sustain Award is a team award: it recognizes building a program that outlasts its founders. We won it, 1st place, at the FIRST World Championship in May 2026. FTC has more than 8,000 teams worldwide.',
      'We are a team of 11 that went from not qualifying for regionals to a 1st place award at Worlds. Our build content reached more than 50,000 views across Instagram, YouTube and TikTok, and we raised more than $100,000 through a Legislative Bond Initiative for the team and its organization.',
    ] },

    // ------------------------------------------------------------------ next time
    { type: 'prose', id: 'next', h: 'What I would change', p: [
      'V2 is the robot we finished the season with, so this is about V2.',
      { next: 'Add flanges to the gears so they cannot skip. At Worlds we were pushing down on a printed mount to keep them in mesh, and that is where it broke.', title: 'Gear flanges' },
      { next: 'Take on the software myself sooner. The turret code had a problem that went unfound for weeks.', title: 'Own the software earlier' },
    ] },
  ],
  assets: ['/assets/models/ftc-decode/'],
};
