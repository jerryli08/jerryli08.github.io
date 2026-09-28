// Science Olympiad Robot Tour (2024-25): rich page. Facts are Jerry's (src/projects.mjs, his
// checklist, /home/claude/work/answers.md), the code (github.com/jerryli08/sciolyRoTo), the 2025 Robot
// Tour C rules (the event and the example track), or plainly shown by the media. Tooth counts, ratios
// and dimensions come from his two CAD files and say so.
// Held back until Jerry answers (see /home/claude/work/scioly-robot-tour/questions.md): results (Q1),
// what the first angle signal came from and why he moved to the OTOS (Q2), his own next-time lines
// beyond "the OTOS was bad and caused a lot of drift" (Q3), a drift number from a real run and the
// OTOS scale factors in the code (Q5), whether the hero runs are the example-track route (Q6), where
// the last move ends relative to the target (Q7: no distance-to-target readout), and why the first
// move is 33 cm (Q8a: the page states the move and the rules, not the reason).
const M = '/assets/models/robot-tour';
// the two drive modules of either version, for the exploded view (the right one is the mirrored copy)
const MOD = 'DDJ|1910|3217|3421|3422|T61H|2101|1601|22mm|Wheel|1mm|Spur_Gear|Hub_disc|Belt|Pulley';

export default {
  summary: {
    stats: [
      { v: '3 : 1 → 2.5 : 1', l: 'GT2 belts, then spur gears, on the same 33 mm centres (from my CAD)' },
      { v: '45 moves', l: 'My final coded route: 23 turns and 13.8 m of straight driving' },
      { v: '1.5 mm, 0.5°', l: 'When a straight move and a turn count as done' },
      { v: '30.3 mm', l: 'The OTOS offset from the wheel axis, set in the code' },
    ],
    text: [
      'I built this robot by myself for the 2024-25 Science Olympiad Robot Tour event, where a robot finds its own way around a 2 by 2.5 m track, through gate zones and around wooden 2x4s, to a target point. Two Axon MINI servos drive it through a 2.5 : 1 spur gear stage, a SparkFun optical tracking odometry sensor (OTOS) underneath tells it where it is, and an Arduino Mega runs the route as a list of moves, each closed with distance and heading control that carries the last move\'s leftover error into the next.',
      'The first version drove the wheels with belts, which had a lot of friction in the printed frame, so I rebuilt the drive with gears on the same centres. The weak link in the end was the OTOS: it drifted, and the robot\'s idea of where it was slowly pulled away from where it really was.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-full-run.mp4', c: 'A long run on my taped practice grid at home' },
      { v: 'hero-grid-run.mp4', c: 'Driving out and turning on the practice grid' },
    ],
  },
  sections: [
    { type: 'scrolly', id: 'cad', module: '@turntable', stepHeight: '85vh', poster: `${M}/poster-cad.webp`,
      h: 'The robot in 3D',
      p: ['Both versions of my CAD, turned by the scroll.'],
      data: {
        models: [{ label: 'Version 1', src: `${M}/belted.glb` }, { label: 'Version 2', src: `${M}/geared.glb` }],
        azimuth: 35, elevation: 22, pad: 1.12,
        // real axes: the modules come apart along the axle axis (X); the deck, the dowel, the OTOS
        // and the casters along the vertical screw axis (Y)
        explode: [
          { parts: `^anim_rt[bg]_\\d+_(${MOD})(?!.*Mirror)`, dir: [1, 0, 0], dist: 0.055 },
          { parts: `^anim_rt[bg]_\\d+_(${MOD}).*Mirror`, dir: [-1, 0, 0], dist: 0.055 },
          { parts: 'Arduino_Mega', dir: [0, 1, 0], dist: 0.05 },
          { parts: 'dowel', dir: [0, 1, 0], dist: 0.07 },
          { parts: 'sparkfun_otos', dir: [0, -1, 0], dist: 0.035 },
          { parts: 'pololu', dir: [0, -1, 0], dist: 0.025 },
        ],
      },
      steps: [
        { h: 'Version 1: belts, December 2024', view: { version: 0, azimuth: 35, elevation: 22 }, p: [
          'About 14 by 16 cm on a 3D-printed frame (from the CAD): lattice side and end plates, a bottom plate, and a deck for the Arduino Mega, tied together by four goBILDA beams. Each wheel is driven through a GT2 belt from an Axon MINI servo.',
        ] },
        { h: 'Version 2: gears, March 2025', view: { version: 1, azimuth: 35, elevation: 22 }, p: [
          'The same servos, axles and wheels, with spur gears in place of the belts, and a pointed nose on the bottom plate that holds the dowel, the point the judges measure from. In version 1 the dowel stands in front of the frame with no holder.',
        ] },
        { h: 'Taken apart', view: { version: 1, explode: 1, azimuth: 32, elevation: 28, pad: 1.85,
          labels: [
            { text: 'Left drive module', part: 'rtg_\\d+_DDJ_STDLOW2_M2H_CNC_1', side: 'l' },
            { text: 'Right drive module', part: 'Wheel_T61P_14NBN_v2_Mirror' },
            { text: 'Arduino Mega', part: 'Arduino_Mega' },
            { text: 'SparkFun OTOS', part: 'sparkfun_otos', side: 'l' },
          ] }, p: [
          'The two drive modules are mirror images: servo, gear pair, axle, two bearings and a wheel each. The OTOS sits under the middle, with a ball caster ahead of the wheels and one behind, all on the centre line.',
        ] },
      ] },

    { type: 'prose', id: 'event', h: 'The event', p: [
      'Robot Tour gives each team a 2 m by 2.5 m track, split by tape into twenty 50 cm zones, with up to ten wooden 2x4s on the lines as obstacles. The robot starts with its dowel over the start point, drives through gate zones, one of them marked "Last", and stops on a target point, as close as it can to a target time between 55 and 85 seconds. It runs by itself: no remote control.',
      'Low scores win. Every centimetre between the dowel and the target point costs 2 points, missing the target time costs points, each gate zone the dowel fully enters takes 15 off, and entering the "Last" zone last takes off 30 more. The layout, the gates and the target time are only announced at the event, so the route is reprogrammed on the spot during a 10-minute setup.',
      { note: 'From the 2025 Robot Tour C rules.' },
    ], media: [{ i: 'photo-v2-floor.webp', c: 'The finished robot, version 2' }] },

    { type: 'media', id: 'build', h: 'Building version 1', layout: 'grid',
      p: ['I had version 1 in Fusion 360 by December 23, 2024, printed the plates the next day and had the frame together that night. By December 29 it was wired to the Arduino Mega and driving on foam tiles.'],
      items: [
        { i: 'photo-cad-on-laptop.webp', c: 'Version 1 in Fusion 360, Dec 23, 2024' },
        { i: 'photo-printed-plates.webp', c: 'The printed side and end plates, Dec 24' },
        { i: 'photo-frame-next-to-cad.webp', c: 'The frame together that night, next to the CAD' },
        { i: 'photo-arduino-shield.webp', c: 'The Arduino Mega and my soldered perfboard shield, Dec 29' },
      ] },

    { type: 'scrolly', id: 'drive', module: 'drive', stepHeight: '90vh', poster: `${M}/poster-drive.webp`,
      h: 'How the drive works',
      p: ['My final CAD, with every gear, axle and wheel turning about its real axis as you scroll.'],
      steps: [
        { h: 'Two mirrored drive modules', p: [
          'Each side of the robot is a self-contained drive module, and the two are mirror images. The wheels sit in the middle of the robot\'s length, 120 mm apart, with a ball caster ahead of them and one behind (from the CAD).',
        ] },
        { h: 'One module: 2.5 to 1', p: [
          'An Axon MINI servo, run as a continuous-rotation motor, turns a 40-tooth spur gear on its output hub. That drives a 16-tooth gear on a 6 mm axle, so the wheel turns 2.5 times for every turn of the servo. The wheel is a 1-3/8 in BaneBots wheel on a BaneBots hub.',
        ] },
        { h: 'The axle', p: [
          'Cut along the axle: the 6 mm axle runs in two flanged ball bearings, one in the outer side plate just outside the wheel and one inboard of the 16-tooth gear. The wheel and the gear both sit between the two supports instead of hanging off the end of a shaft, and the wheel turns inside a window in the side plate (from the CAD).',
        ] },
        { h: 'Turning in place', p: [
          'Both wheels the same way drive straight. Opposite ways, the robot turns in place about the middle of the axle, the point my code steers. A quarter turn is each wheel rolling 94 mm, a quarter of the circle through both wheels (from the CAD).',
        ] },
      ] },

    { type: 'iterations', id: 'iterations', h: 'Iterations', items: [
      { label: 'Dec 2024', title: 'Version 1: belted', p: [
        'In Fusion 360 by December 23, printed and assembled on the 24th, wired and driving on foam tiles by the 29th. GT2 belts at 3 : 1. My first code measured each wheel\'s distance from an angle signal on each drive.',
      ], media: [
        { i: 'render-v1-belted-front.webp', c: 'My render of version 1 from the front' },
        { i: 'still-v1-belted-front.webp', c: 'Version 1 from the front, Dec 29: both servos and their belts' },
        { i: 'photo-v1-underside.webp', c: 'Version 1 from below: both casters, the wheels, the small pulleys through the slot, and the square window for the OTOS, still empty' },
      ] },
      { label: 'Mar 2025', title: 'Version 2: geared', p: [
        'Spur gears at 2.5 : 1 on the same centres, and a pointed nose on the bottom plate that holds the dowel. The OTOS is in both CADs, and its window is already in the version 1 bottom plate; by the end of March it was installed and running.',
      ], media: [
        { i: 'still-v2-gears.webp', c: 'Version 2: the gear drive, under the battery cells' },
        { i: 'photo-v2-wheel-window.webp', c: 'Version 2: a wheel in its window in the side plate' },
        { i: 'photo-v2-side.webp', c: 'Version 2' },
      ] },
      { label: 'Dec 2024 to Apr 2025', title: 'Software', p: [
        'First, wheel-by-wheel distance control from the angle signals. Then position and heading from the OTOS. Then a route of chained moves that carries each move\'s leftover error into the next.',
      ], media: [
        { i: 'still-heading-drift-end.webp', c: 'Bringing up the OTOS: its position in inches and its heading on the Serial Monitor' },
      ] },
    ] },

    { type: 'scrolly', id: 'versions', module: 'versions', stepHeight: '95vh', poster: `${M}/poster-versions.webp`,
      h: 'Belts to gears',
      p: ['Version 1 and version 2 of my CAD on one stage. They share one frame of reference, so everything that did not change stays exactly where it was.'],
      steps: [
        { h: 'Version 1: belts', p: [
          'My first version drove each wheel with a GT2 belt: a 60-tooth pulley on the servo hub, a 20-tooth pulley on the axle and a 150 mm belt between them, so the wheel turned 3 times per servo turn. I chose belts because I thought they would have less backlash than gears.',
        ] },
        { h: 'The problem', p: [
          { problem: 'The belts had a lot of friction. The frame was all 3D printed, so the pulleys were not perfectly aligned with each other, and that caused problems.', title: 'Friction in a printed frame' },
          'The centres were fixed at 33 mm with no tensioner, and each 60-tooth pulley turned on a short shaft that ran in a third bearing in the printed frame (from the CAD).',
        ] },
        { h: 'Gears on the same centres', p: [
          { fix: 'I converted the drive to spur gears: a 40-tooth gear on the servo hub driving a 16-tooth gear on the axle, 2.5 : 1.', title: 'Spur gears' },
          'The gears have a module of about 1.18 mm (49.5 mm across the tips of 40 teeth), which puts 40 and 16 teeth exactly on the belt\'s 33 mm (from the CAD). The servos, the axles and their bearings stayed where they were; only the parts between them changed, and the third bearing and the pulley shaft are gone.',
        ] },
        { h: 'What changed at the wheel', p: [
          'Here both servos turn exactly once. Version 1\'s wheels turn 3 times and version 2\'s 2.5 times: for the same servo speed the geared drive is 17% slower at the wheel and gives 20% more torque (from the tooth counts). In the code it is one constant, `gearRatio`, which went from 3.0 to 2.5.',
        ] },
      ],
      caption: 'Both versions are my CAD, drawn in the same place. Wheel turns and distances follow from the tooth counts and the 1-3/8 in wheel.' },

    { type: 'scrolly', id: 'sensors', module: 'sensors', stepHeight: '95vh', poster: `${M}/poster-sensors.webp`,
      h: 'What the robot knows',
      p: ['How the robot measured where it was: first by counting wheel turns, then with an optical sensor looking at the floor.'],
      steps: [
        { h: 'First: counting wheel turns', p: [
          'My first code measured distance from an analog angle signal on each drive, read on the Arduino\'s A0 and A1: 0 to 3.3 V for one turn, on the servo side of the gears. The code multiplies the angle by the gear ratio, handles the jump from 360° back to 0°, and adds up the distance each wheel has rolled. A turn was each wheel rolling 8 cm in opposite directions (a comment in the code says it started at 9.58 cm).',
        ] },
        { h: 'Then: the OTOS', p: [
          'The final robot knows where it is from a SparkFun Optical Tracking Odometry Sensor on its underside. It watches the floor like an optical mouse, combines that with its own gyro, and reports x, y and heading directly, instead of the code working them out from wheel turns. It is already in the version 1 CAD, and the version 1 bottom plate has its square window. It sits on the centre line, 11.5 mm above the floor (from the CAD).',
        ] },
        { h: 'Its offset', p: [
          'The OTOS sits about 30 mm ahead of the wheel axis, turned 90°. When the robot turns in place it spins about the middle of the axle, so the sensor swings around a circle, and the dowel, 80 mm ahead, around a bigger one. The code tells the sensor both numbers, `setOffset({0, 0.0303 m, -90°})`, so what it reports is the position of the turning point, not of the sensor.',
        ] },
      ] },

    { type: 'prose', id: 'code', h: 'The code', p: [
      'The code is on [GitHub](https://github.com/jerryli08/sciolyRoTo): 23 Arduino sketches, from the first servo test to the final route.',
      { h: 'A route is a list of moves' },
      'The track layout is only announced at the event, and the program can be changed during setup. So my route is a list of simple moves, `FORWARD_50`, `TURN_LEFT`, `FORWARD_100` and so on, with comments for the gate zones. A state machine runs them one at a time and moves on when a move reports that it is done.',
      { h: 'Distance and heading control' },
      'In the final version each forward move runs two controllers off the OTOS: one on the distance left to go, one on the heading error. The wheel commands are the distance output plus and minus seven times the heading output, so the robot steers while it drives; in the last centimetre it stops steering. Turns use the heading controller alone, with the wheels turning opposite ways. A straight move is done within 1.5 mm and a turn within 0.5°, and the wheel commands are capped at 20% of full speed. Both controllers are PID controllers with only the proportional gain set; earlier versions also used a small derivative gain.',
      { h: 'Servo deadband' },
      'A continuous-rotation servo does not move until its command is a little way past stop, and each of mine needed a different amount in each direction. The code adds an offset per wheel and per direction to every non-zero command: in the final version 2.1% and 4.3% of full command for the left servo forward and backward, 0% and 6.5% for the right.',
      { problem: 'Every move ends a little off, up to the code\'s tolerances of 1.5 mm and 0.5°. If each move just started from wherever the last one stopped, those errors would add up over 45 moves.', title: 'Small errors add up' },
      { fix: 'When a move finishes, the code works out where the robot is relative to where it should have ended: the sideways error, the along-track error and the heading error. It resets the OTOS so that its origin is the point where the robot should be, and its reading is the robot\'s error from that point. The next forward move aims straight at its ideal end point from wherever the robot actually is: its distance target is the straight-line distance there, and its heading target is the direction to it. Every waypoint is measured from where the robot should be, not from where it happened to stop.', title: 'Carry the error into the next move' },
      { calc: 'How big could the errors get if they were not carried forward?',
        given: [
          ['Turn done within', '0.5°', 'my code'],
          ['Straight move done within', '1.5 mm', 'my code'],
          ['Final route', '45 moves: 23 turns and 22 straight moves', 'my code'],
          ['Distance Score', '2 points per cm', 'the 2025 Robot Tour C rules'],
        ],
        work: [
          'Worst case, every turn off the same way: 23 × 0.5° = 11.5° of heading error by the end',
          'One 50 cm leg driven 11.5° off: 50 cm × sin 11.5° = 10 cm to the side',
          'Every straight move short the same way: 22 × 1.5 mm = 3.3 cm along the route',
        ],
        result: 'Left alone, errors the code accepts as done could stack to about 10 cm to the side over a single 50 cm leg, 20 points. Carrying each error into the next move keeps them from stacking.',
        note: 'Worst case with every error the same way; real errors partly cancel.' },
      { h: 'Forward only' },
      'My first route, on the angle-signal code, backed out of gate zones and drove some legs in reverse: 8 of its 38 moves were reversing. The final route never reverses. It turns around in place instead, and the backward move is marked "DO NOT USE" in the final code.',
    ], media: [
      { i: 'photo-compensation-code.webp', c: 'The move code on my laptop: the distance target measured from the leftover error of the last move' },
      { i: 'photo-v2-electronics-top.webp', c: 'Version 2 from above: the battery cells, the Arduino Mega and my soldered shield' },
      { i: 'photo-telemetry-serial.webp', c: 'The Serial Monitor during a run: "Executing moveForward", "Linear action completed", then X, Y and heading' },
    ] },

    { type: 'scrolly', id: 'tour', module: 'tour', webgl: false, stepHeight: '140vh', poster: `${M}/poster-tour.webp`,
      h: 'A run through the example track',
      p: ['The example track printed in the 2025 rules, and my final coded route through it. As you scroll the robot drives the route, and the panel shows what it knows at each moment, worked out with my code\'s own formulas.'],
      steps: [
        { h: 'The track', p: [
          'Twenty 50 cm zones, ten 2x4s, gate zones A to D with B marked "Last", and the target point. The robot starts outside the left edge with its dowel over the start point. My final code has a route for this track: 45 moves, 23 turns and 13.83 m of straight driving.',
        ] },
        { h: 'Moves 1 to 11: gate zone A', p: [
          'The robot drives 33 cm into the track, then works its way around the 2x4s and up to gate zone A in the top left corner.',
          'The panel shows the move the code is on; what the OTOS reads, reset after every move so Y climbs from zero along each leg; the errors each controller sees; and the two wheel commands after the deadband offsets and the 20% cap, with the servo values the code writes.',
        ] },
        { h: 'Moves 12 to 25: gate zones C and D', p: [
          'Across the top, through the target cell, down through gate zone C and over to the bottom right corner. Gate zone D is a dead end: the route drives 25 cm toward it, which puts the dowel, 8 cm ahead of the wheels, inside the zone, and turns around. The rules count only the dowel.',
        ] },
        { h: 'Moves 26 to 36: gate zone B, "Last"', p: [
          'Back along the bottom rows and into gate zone B from the side, after the other three, which is what the "Last" bonus asks for.',
        ] },
        { h: 'Moves 37 to 45: the target', p: [
          'Out of B, along the second row from the bottom, and up through C again. The last move is the one my code labels "to target".',
        ] },
        { h: 'What the robot does not know', p: [
          'Everything on the panel is the robot\'s own estimate. Carrying the error forward keeps that estimate on the route, but it can only correct what the OTOS reports. If the sensor drifts, the robot follows its wrong estimate perfectly and ends up somewhere else. The grey path shows that, exaggerated so it is visible.',
        ] },
      ],
      caption: 'Simulated from my final code: the route, the gains, the tolerances, the deadband offsets and the speed cap are from the code, and the track is the example in the 2025 rules. The motion is a simple model: the pacing follows the gains (full speed at the cap, then slowing in proportion), and each move ends with a small made-up error inside the code\'s tolerances. The robot is a top-down render of my CAD. The grey path in the last step is an illustration, not a measurement.' },

    { type: 'media', id: 'testing', h: 'Testing', layout: 'grid', cols: 3,
      p: ['I tested on a taped practice grid on the hardwood floor at home, with a sticky note marked "START". I filmed single moves from above (one cell forward, a quarter turn, a straight lane) and whole chained routes.'],
      items: [
        { v: 'clip-one-cell.mp4', c: 'One cell forward, from above' },
        { v: 'clip-quarter-turn.mp4', c: 'A quarter turn in place, from above' },
        { v: 'clip-straight-lane.mp4', c: 'Straight down a lane, from behind' },
        { v: 'clip-desk-turn-test.mp4', c: 'A turn test on my desk, tethered to the laptop' },
        { v: 'clip-landscape-run.mp4', c: 'A run with turns on the practice grid' },
        { v: 'clip-follow-run.mp4', c: 'Short legs and turns, filmed from above' },
      ] },

    { type: 'prose', id: 'drift', h: 'The drift', p: [
      { problem: 'The OTOS was not accurate enough. Its readings drifted over time, and the accumulated error pulled the robot\'s position estimate away from where it actually was. Carrying the error forward could not help with that: it cancels the robot\'s own mistakes only as well as the sensor sees them. A sensor that drifts sends the robot, confidently, to the wrong place.', title: 'The OTOS drifted' },
      'In my recording of the robot sitting still, the position holds at 0.19 and -0.06 inches while the heading reading creeps from -9.41° to -9.53° over 21 seconds.',
      { calc: 'What does the OTOS\'s rated error cost on a track?',
        given: [
          ['OTOS error', 'typically 3 to 5 % out of the box, under 1 % calibrated', '[SparkFun OTOS](https://www.sparkfun.com/sparkfun-optical-tracking-odometry-sensor-paa5160e1-qwiic.html)'],
          ['Start point to target point, example track', '175 cm across, 50 cm up', 'the 2025 Robot Tour C rules'],
          ['Distance Score', '2 points per cm', 'the 2025 Robot Tour C rules'],
        ],
        work: [
          'A sensor that reads every distance a fixed fraction long or short puts the end point off by that fraction of the straight line from start to finish, however long the route: √(175² + 50²) = 182 cm',
          '3 to 5 %: 5.5 to 9.1 cm off, 11 to 18 points',
          'Under 1 %: under 1.8 cm, under 4 points',
        ],
        result: 'A scale error alone costs 11 to 18 points on this track out of the box, and under 4 once calibrated; heading drift adds to it, and its cost grows with every leg driven.',
        note: 'Estimate: a uniform scale error with the heading exact. The rated figures are SparkFun\'s, not measured on this robot.' },
      { next: 'The OTOS sensor was bad and caused a lot of drift. It is the part of this robot I would improve.', title: 'Future improvement: the sensor' },
    ], media: [{ v: 'clip-heading-drift.mp4', c: 'Sitting still, the heading reading creeps while the position holds' }] },

    { type: 'callout', id: 'after', h: 'After the season', p: [
      'The two Axon MINI servos and their hubs went on to drive the rover in my [Drone on Wheels](/projects/hybrid-vehicle) research project.',
    ] },

    { type: 'media', id: 'gallery', h: 'More pictures', layout: 'grid', cols: 3, items: [
      { i: 'photo-v2-dowel.webp', c: 'Version 2 with its dowel at the front' },
      { i: 'photo-v2-rear.webp', c: 'Version 2 from the back' },
      { i: 'photo-otos-underside.webp', c: 'The underside: the red OTOS between the gears and the front caster' },
      { i: 'photo-v1-belt-side.webp', c: 'Version 1 in my hand, Dec 29: a servo and its belt' },
      { i: 'render-v1-rear.webp', c: 'My render of version 1 from the back' },
      { i: 'render-v1-top.webp', c: 'My render of version 1 from above: the Arduino Mega deck' },
    ] },
  ],
  assets: [`${M}/`],
};
