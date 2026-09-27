// FTC DECODE robots (Alphabots, FTC 26115), 2025-26. Rich page.
// Copy uses only facts Jerry stated (facts.md, checklist, answers.md of Sept 26, 2026), what the
// photos and videos plainly show, and numbers read from his two CAD files (marked "in the CAD").
// Rules from answers.md: never name the student who modelled the V2 shooter; never state robot
// performance at the World Championship (only the Sustain Award); the team code is private, so
// it is described but never linked and no file or class names are quoted.
// Held back pending Jerry: how the Tekin T180 servo (on the turret in the CAD) couples to the
// 150T ring; the turret's real travel range; whether the April 13 servo-mount failure had its own
// fix; how far the V1 gate and flap swing (the demo swings are illustrative).
export default {
  summary: {
    stats: [
      { v: '1st place', l: 'Sustain Award, FIRST World Championship' },
      { v: '8,000+', l: 'FTC teams worldwide' },
      { v: '$100,000+', l: 'Raised through a Legislative Bond Initiative' },
      { v: '50,000+', l: 'Views on our build content' },
    ],
    text: [
      'I captained Alphabots, FTC team 26115, through the 2025-26 season, DECODE. I designed our first robot entirely by myself: a mecanum chassis, a full-width intake, a ramp that stores three balls and a fixed flywheel shooter.',
      'For the World Championship we kept that chassis and put a turret shooter on top that aims from the robot\'s odometry pose, so it can shoot from anywhere on the field. The engineering decisions were mine; a student who had never used CAD did the modelling while I guided him through every step. Our team of 11 went from not qualifying for regionals to the 1st place Sustain Award at the FIRST World Championship.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-worlds-robot-orbit.mp4', c: 'V2, the World Championship robot: a turret shooter on the chassis I designed for V1' },
      { v: 'hero-turret-tracking-test.mp4', c: 'The first turret tracking test, April 27, 2026: the robot is turned on the floor while the turret tries to stay on the target' },
    ],
  },
  sections: [
    { type: 'prose', id: 'overview', h: 'Two robots, one chassis', p: [
      'DECODE is the 2025-26 FIRST Tech Challenge game. Robots pick up purple and green balls, 5 in across (127 mm in the CAD), and shoot them into their alliance\'s goal. I was the team captain.',
      'We ran two robots on one chassis. I designed V1 entirely by myself in the fall of 2025, and it played our four events in January and February 2026. For the World Championship we replaced its fixed shooter with a turret. I made the engineering decisions for the new shooter; a student who had never used CAD before did the modelling, and I guided him through every step.',
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

    { type: 'demo', id: 'cad', module: 'versions', height: 'clamp(340px, 60vh, 640px)', poster: '/assets/models/ftc-decode/poster-versions.webp',
      h: 'The CAD: what changed from V1 to V2',
      p: [
        'Both robots from my CAD files. Parts that are identical in both files stay where they are; **Robot** swaps only the parts that differ, found by comparing the two files body by body. **What changed** tints those parts: the shooter, the top of the ramp and some of the plates.',
        '**Cut in half** puts a section down the middle of the robot. In V1 the top ball waits under a gate in front of a fixed flywheel. In V2 it waits in the bore of the turret bearing, right under the new shooter.',
      ],
      caption: 'Drag to turn. Screws and circuit boards are left out; every other part is the CAD as modelled.' },

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
    ] },
    { type: 'media', layout: 'grid', items: [
      { i: 'v1-shot-layout-sketch.webp', c: 'The 2D layout I built V1 around, September 2025: the ball, the 96 mm flywheel, the hood arc and the 40° ramp' },
      { i: 'v1-cad-render.webp', c: 'V1 in CAD: carbon fiber plates, teal printed parts and the curved hood over the flywheel' },
      { i: 'v1-cad-render-front.webp', c: 'V1 in CAD from the front: the intake roller row, balls in the ramp and the hood above' },
      { i: 'v1-cad-top-three-balls.webp', c: 'From above: the stored balls line up down the middle, between the drive motors' },
    ] },
    { type: 'demo', id: 'v1-demo', module: 'v1', height: 'clamp(340px, 58vh, 620px)', poster: '/assets/models/ftc-decode/poster-v1.webp',
      h: 'Try V1\'s mechanisms',
      p: [
        'The V1 CAD with its moving parts rigged about their real axes: the flywheel axle, the gate and flap servos, the two feed wheel servos and the intake shaft.',
        '**Intake gearing** runs the roller at the two speeds we used, slowed 25 times so you can see it. **Hood flap** moves the flap between its two positions. **Shoot a ball** opens the gate, lifts the top ball into the flywheel and sends it out along the hood, and the next two balls move up behind it. **Cut in half** shows the ball path.',
      ],
      caption: 'The gate and flap turn about their servos\' axes in the CAD; how far they swing here is illustrative. Surface speed uses the 48 mm intake wheels in the CAD.' },
    { type: 'media', h: 'Building V1', layout: 'grid', cols: 3, items: [
      { i: 'v1-intake-front.webp', c: 'The intake: eight compliant wheels on one shaft across the front, with two balls against it' },
      { v: 'v1-three-ball-channel.mp4', c: 'Looking down the ramp from the intake end as balls are loaded in', tall: true },
      { i: 'v1-gate-ball-staged.webp', c: 'From behind: a ball waits under the teal gate, just past the flywheel pair' },
      { i: 'v1-dual-motor-flywheel.webp', c: 'Wiring V1: the flywheel pair with a motor on each end of the axle' },
      { i: 'v1-transfer-packaging.webp', c: 'Reaching into the ramp past the X-cut carbon fiber inner plate: there is little room to spare between the plates' },
      { i: 'v1-portrait-field.webp', c: 'V1 from the back: the flywheel with a motor on each end, and the Limelight below it' },
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
      'We planned to fuse the Limelight\'s AprilTag readings with odometry, but odometry was very good on its own. The Limelight was only there to relocalize the robot after a minute or more, with a button or with a mode that relocalizes on the next AprilTag it sees. In practice we did not use it: our software lead did not get relocalization working in time.',
    ] },
    { type: 'demo', id: 'turret', module: 'turret-rig', height: 'clamp(340px, 58vh, 620px)', poster: '/assets/models/ftc-decode/poster-turret.webp',
      h: 'Turn the turret',
      p: [
        'The Worlds CAD. **Turret** turns the turret on its bearing, and the two 90-tooth gears under it counter-rotate 150/90 as far. **Hood** rolls the hood along its toothed arc while the 40-tooth pinion turns 7.65 times as far the other way.',
        '**Feed a ball** runs the four spinners and sends the top ball up through the bearing\'s bore, under the hood and out. **Cut in half** shows that path.',
      ],
      caption: 'Tooth counts and pitch radii from the CAD. The turret stops at 90° each way here, which is not the robot\'s real travel limit; the hood range is where the pinion stays on the arc in the CAD.' },
    { type: 'media', h: 'Building V2', layout: 'grid', cols: 3, items: [
      { v: 'v2-turret-turned-by-hand.mp4', c: 'The turret mounted on the chassis, turned by hand on its bearing', tall: true },
      { i: 'still-v2-turret-gear-mesh.webp', c: 'A black 90-tooth gear on the chassis against the turret\'s ring gear' },
      { i: 'v2-three-quarter.webp', c: 'V2 on the bench: the turret shooter on top, its ring gear underneath and a 90-tooth gear at the left' },
      { v: 'v2-turret-closeup-orbit.mp4', c: 'Around the turret up close: the flywheel shroud, the hood and the motors', tall: true },
      { i: 'v2-front.webp', c: 'V2 from the front: the Limelight rides on the turret, above the intake' },
      { i: 'v2-transfer-spinners-top.webp', c: 'The ramp from above, marked up in yellow and blue: TPU spinners sit on both sides of the ball path' },
      { i: 'v2-top-down-turret.webp', c: 'V2 from straight above on April 30, during the World Championship' },
    ] },

    // ------------------------------------------------------------------ code
    { type: 'prose', id: 'code', h: 'The code', p: [
      'Our robot code is Java on the FTC SDK. The repository is private, so there is no link here, but this is how it is put together.',
      { ul: [
        '**Localization.** A goBILDA Pinpoint odometry computer reads the two odometry pods and keeps the robot\'s pose: x, y and heading on the field.',
        '**Autonomous.** Pedro Pathing follows chains of Bezier lines and curves, and a numbered state machine steps through the routine: drive to the launch zone and fire the three preloaded balls, drive through a row of three with the intake running, go back and shoot, and repeat for the next row. To fire, it opens the gate and runs the feed wheels for about a second.',
        '**Flywheel.** A PIDF loop on the average speed of the two motors\' encoders, with a feedforward term proportional to the target speed. The output is multiplied by 13 V over the measured battery voltage, so the wheel gets the same drive as the battery sags, and the voltage is only read every half second to keep the loop fast. The driver switches between two speed presets with the bumpers.',
        '**Turret (V2).** It aims from the odometry pose, as above. A centering routine on the Driver Hub sets the servo position for a centered turret.',
      ] },
    ] },
    { type: 'media', layout: 'row', items: [
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
      { label: 'Apr 2026', title: 'V2: the turret', p: ['The new turret shooter went onto the same chassis in April. The first tracking test was on April 27.'],
        media: [{ v: 'v2-turret-assembly-in-hand.mp4', c: 'The turret before it was mounted: the turntable bearing, the printed turret body and the flywheel shroud' }] },
      { label: 'Apr 29 to May 2, 2026', title: 'The World Championship', p: ['Jackson Division. A printed servo mount broke and I reprinted it overnight. The team won the 1st place Sustain Award.'],
        media: [
          { i: 'v2-inspection-worlds.webp', c: 'V2 at inspection at the World Championship' },
          { v: '/assets/media/ftc-decode-worlds-match.mp4', c: 'A qualification match in the Jackson Division at the World Championship, from the event broadcast. We are 26115 on the red alliance' },
        ] },
    ] },

    // ------------------------------------------------------------------ failures
    { type: 'prose', id: 'failures', h: 'Failures and fixes', p: [
      { h: 'An intake that would not take a ball' },
      { problem: 'On the first intake test, on November 8, 2025, a ball pushed into the roller row stalled against the spinning wheels and did not come in.', title: 'Intake stall' },
      { fix: [
        'I changed the intake gearing from 1,620 rpm to 1,150 rpm. A week later, on November 15, the intake swallowed two balls side by side and sent them up the ramp.',
        'Gearing down trades speed for torque: 1,620 / 1,150 = 1.41 times the torque at the roller, for about 29% less speed. With the 48 mm wheels in the CAD, the roller\'s surface speed drops from about 4.1 m/s to 2.9 m/s.',
      ] },
    ] },
    { type: 'media', layout: 'row', items: [
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
      { h: 'The first turret tracking test' },
      { problem: 'On April 27 we ran the turret tracker for the first time and turned the robot on the floor (the second video at the top of this page). The turret tried to stay on target, but its range was off: the servo covered much more angle than the code expected.', title: 'Tracking range' },
      { fix: 'That night the code got a centering routine on the Driver Hub: turn the turret until it is physically centered, note the servo position, and write it into the tracker code as the center.', label: 'Calibration' },
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

    // ------------------------------------------------------------------ drive demo
    { type: 'demo', id: 'drive', module: 'drive', height: 'clamp(320px, 56vw, 600px)', poster: '/assets/models/ftc-decode/poster-drive.webp',
      h: 'Drive the Worlds robot',
      p: [
        'Move your cursor over the field and the robot drives there; on a phone, tap where it should go. The heading slider turns the chassis, and the turret keeps the shooter on the goal whichever way the robot faces. Like the real turret, it aims from the robot\'s pose alone: where the robot is and which way it points.',
        'The magenta arc is the ball\'s path. Press and hold **Hold to shoot** to fire.',
      ],
      caption: 'Only the robot is CAD. The field, walls and goals are simplified stand-ins, the arc is a plain projectile with no drag or spin leaving the hood at its modelled 40° launch angle, and the turret has no travel limit here.' },

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
    { type: 'callout', h: 'The Sustain Award', p: [
      'The Sustain Award is a team award, not a robot award: it recognizes building a program that outlasts its founders. We won it, 1st place, at the FIRST World Championship in May 2026. FTC has more than 8,000 teams worldwide.',
      'We are a team of 11 that went from not qualifying for regionals to a 1st place award at Worlds. Our build content reached more than 50,000 views across Instagram, YouTube and TikTok, and we raised more than $100,000 through a Legislative Bond Initiative for the team and its organization.',
    ] },

    // ------------------------------------------------------------------ next time
    { type: 'prose', id: 'next', h: 'What I would change', p: [
      'V2 is the robot we finished the season with, so this is about V2.',
      { next: 'Add flanges to the gears so they cannot skip. At Worlds we were pushing down on a printed mount to keep them in mesh, and that is where it broke.', title: 'Gear flanges' },
      { next: 'Take over the software myself sooner. The turret code went weeks with a problem that nobody found.', title: 'Own the software earlier' },
    ] },
  ],
  assets: ['/assets/models/ftc-decode/'],
};
