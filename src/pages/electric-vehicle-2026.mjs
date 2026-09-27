// Science Olympiad Electric Vehicle 2026. Page text from the phase A write-up
// (/home/claude/work/scioly-ev-2026/writeup.md), checked against Jerry's checklist, answers.md,
// his CAD and his public code (github.com/jerryli08/sciolyev2026). Numbers marked "computed" come
// from the rules' track layout and the CAD geometry (assets/js/pages/electric-vehicle-2026/geom.js).
// Held back until Jerry answers (see projects-patch.md in the phase A folder): results and
// placements, the servo's actual play, which caliper reading meant straight, why the wheelbase
// grew, the cause of the long runs, and any "next time" items he has not stated.
const M = '/assets/models/electric-vehicle-2026';

export default {
  summary: {
    stats: [
      { v: '2', l: 'Versions: servo steering, then caliper steering' },
      { v: 'Under 1 day', l: 'To design version 1' },
      { v: '2.0° per mm', l: 'Caliper travel to steering, near straight ahead (computed from my CAD)' },
      { v: '142 to 452 mm', l: 'Wheelbase, version 1 to version 2 (in my CAD)' },
    ],
    text: [
      'My second Science Olympiad electric vehicle. For 2025-26 the event stopped rewarding speed: a run is scored on how close the car stops to the target, how close it comes to a target time of 10 to 20 seconds, and a new bonus for driving between two cans set about a meter off the straight line. Earning that bonus means driving a curve, so this car came down to steering precisely.',
      'It went through two versions. I designed the first in less than a day, just to have something for competition; it steered with a servo, and the backlash in the servo made the steering horribly inaccurate. For the second I chose caliper steering: a linkage on a digital caliper sets the steering angle quite precisely.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-v2-competition-run.mp4', c: 'Version 2 at a competition, driving its curve out to the two cans on the bonus line' },
      { v: 'hero-caliper-steers-wheel.mp4', c: 'The caliper steering by hand: sliding the jaw turns the front wheel through the printed link' },
    ],
  },
  sections: [
    { type: 'prose', id: 'rules', h: 'The rule change', p: [
      'My [2024-25 car](/projects/electric-vehicle) was built for speed. That event scored a car on how quickly it covered a set distance and how close to the target it stopped, and it covered 8.3 m in 2.97 s. For 2025-26 the rules changed in two ways that decided this design:',
      { ul: [
        '**Time is a target now.** The event supervisor picks a target time between 10.0 and 20.0 s, in half-second steps, and the Time Score is the gap between that and the run time. Fast is no longer better; accurate is.',
        '**The can bonus.** Two cans stand on a bonus line halfway between the start and the target. The outer can’s inside edge is 100 cm from the straight line between them, and we place the inner can anywhere from 0 to 100 cm inside it. The bonus is −0.5 × (110 − the gap in cm), and it only counts if every part of the car passes between the cans. The closer the cans, the bigger the bonus.',
      ] },
      'The other rules that shaped the car: a target distance of 7 to 10 m, a Distance Score of 2 points for every centimeter the car stops from the target, at most eight AA batteries, no more than 70 cm from the front of the front wheel to the back of the rear wheels, no wider than 35 cm, and a start by pressing the car with an unsharpened pencil.',
      'My car is 13 cm wide (in my CAD). Through a 20 cm gap the bonus is worth 45 points, the same as stopping 22.5 cm closer to the target (computed from the rules).',
    ] },

    { type: 'prose', id: 'curve', h: 'Why a curve needs precise steering', p: [
      'The car sets its steering once before a run and holds it, so it drives a circular arc. To swing out between the cans and still finish on the target, the arc has to pass the bonus line at the right distance off the line and come back. That fixes its radius, and the wheelbase turns the radius into a steering angle: steering angle = atan(wheelbase ÷ radius).',
      { table: {
        head: ['Track length', 'Arc radius', 'Version 1, 142 mm wheelbase', 'Version 2, 452 mm wheelbase'],
        rows: [
          ['7 m', '7.26 m', '1.12° ± 0.04°', '3.57° ± 0.14°'],
          ['8.5 m', '10.48 m', '0.78° ± 0.03°', '2.47° ± 0.10°'],
          ['10 m', '14.34 m', '0.57° ± 0.02°', '1.81° ± 0.07°'],
        ],
        caption: 'Steering to pass through the middle of a 20 cm gap, 90 cm off the line. The ± is how far the steering can be off before the 13 cm wide car touches a can, with the aim held. Computed from the rules’ track layout and the wheelbases in my CAD, with a simple bicycle model and no wheel slip.',
      } },
      'Every setting the can bonus needs is a few degrees at most. On version 1 it is about a degree, and it has to be right to a few hundredths of a degree.',
    ] },

    { type: 'demo', id: 'cad', module: 'versions', h: 'Both versions in my CAD', poster: `${M}/poster-cad.webp`,
      height: 'clamp(300px, 34vw, 480px)',
      p: ['The rear drive, electronics and battery are the same in both. The front end is where they differ: a servo right on the fork in version 1, and a bearing, a link and a digital caliper on a long aluminum spine in version 2.'],
      caption: 'My CAD of both versions, with only the four motor screws left out. Version 1 still has the two slotted sight plates standing at the back, the ones that never went on the car ([Aiming](#aiming)). Drag to turn it.' },

    { type: 'prose', id: 'version-1', h: 'Version 1: servo steering', p: [
      'I designed version 1 in less than a day, just to have something for the competition. It is two modules on a short 3D printed chassis. The rear module carries the brushless motor and the driven rear axle. The front module is a printed fork holding one wheel, and the fork bolts straight to the horn of a 25 kg servo (a DS3225MG in my CAD), so the servo’s output shaft is the steering axis. The eight AA batteries ride on top. Wheelbase 142 mm, width 130 mm (in my CAD).',
      'In the code the steering setting is a whole number of degrees, written to the servo once at startup, with 90 as straight ahead.',
      { problem: 'The backlash in the servo made the steering horribly inaccurate. That play sits right on the steering axis, and on a 142 mm wheelbase the settings the can bonus needs run from about half a degree to a degree, each with a few hundredths of a degree to spare (computed, table above). Whole degrees were too coarse as well: 1° is already an 8.1 m radius and 2° is 4.1 m (computed).', title: 'Backlash in the servo' },
      { fix: 'Version 2 takes the servo out of the steering completely and sets the angle with a caliper and a linkage.' },
    ] },
    { type: 'media', id: 'version-1-media', layout: 'row', items: [
      { i: 'render-v1-modules.webp', c: 'The two modules in my CAD: servo steering at the front, motor and gears at the rear' },
      { i: 'render-v1-servo-front.webp', c: 'The fork bolts directly to the servo, so the servo’s shaft is the steering axis' },
      { i: 'still-v1-servo-front.webp', c: 'The red servo sitting right on the printed fork' },
      { i: 'still-v1-top.webp', c: 'Version 1 finished, from above' },
    ] },

    { type: 'demo', id: 'servo-play', module: 'servo-play', webgl: false, h: 'Set a steering angle',
      height: 'clamp(380px, calc(610px - 12.5vw), 580px)',
      p: [
        'Pick a car, a track length and a can gap, set the steering, and press **Run**. The dashed arc is where that setting should take the car. The shaded band is everywhere it can end up if the steering is off by the play, and each run picks an error inside the play.',
        'The play is an assumption: set it yourself. Even a quarter of a degree either way moves version 1’s stop about a meter on an 8 m track, and version 2’s about 30 cm (computed). Switch version 1 to **Whole degrees** to see the other half of the problem: the setting my code could send often cannot put the arc through the gap at all.',
      ],
      caption: 'Top view of a track, to scale. Computed from the rules’ track layout and the wheelbases in my CAD, with a simple model: the steering is set once and held, the car is aimed so the planned arc ends on the target and drives the planned arc length, and the wheels do not slip. **Aim for the gap** sets the steering for the middle of the gap (whole degrees on version 1 when that is on, 0.01 mm steps on the caliper).' },

    { type: 'media', id: 'version-1-runs', layout: 'row', p: ['Version 1 did run at competition before version 2 existed.'], items: [
      { v: 'v1-competition-hallway.mp4', c: 'Version 1 at a competition, heading down the lane toward the cans' },
      { v: 'v1-competition-cans.mp4', c: 'Version 1 at a competition, reaching the cans on the bonus line' },
    ] },

    { type: 'prose', id: 'version-2', h: 'Version 2: caliper steering', p: [
      'For version 2 I chose caliper steering. A digital caliper sits along the car’s spine, and a linkage turns the position of its sliding jaw into a steering angle. It let us change the steering angle quite precisely. How it works, from my CAD:',
      { ol: [
        '**Same fork, new pivot.** I kept version 1’s printed fork, wheel and axle. Where the fork’s four screws went into the servo horn, they now go into a printed bearing holder that turns on a 6202 ball bearing (14 mm bore, 35 mm outside, per the part in my CAD). The steering axis is a bearing now instead of the servo’s gearbox.',
        '**Arm, link, slider.** The bearing holder has a 50 mm arm pointing back along the car. A printed link, 89.4 mm between its pins, joins the end of that arm to a clamp on the caliper’s sliding jaw. The clamp’s pin slides along a line 44.2 mm to one side of the steering axis.',
        '**Travel to angle.** Sliding the jaw back pulls the link and swings the arm, which steers the wheel right; sliding it forward steers left. Near straight ahead, 1 mm of jaw travel is about 2.0° of steering, so one 0.01 mm count on the caliper is about 0.02° (computed from my CAD).',
        '**A longer car.** The front wheel moved about 310 mm forward onto a spine of two 2020 T-slot aluminum extrusions (184.5 mm and 88.5 mm long), for a 452 mm wheelbase. The rear drive, electronics and battery stayed where they were. The car is 525 mm from the front of the front wheel to the back of the rear wheels, inside the 70 cm limit.',
      ] },
      'The longer wheelbase changes the math on its own: the same arc needs a bigger steering angle, so a fixed error in the angle moves the car about 3.2 times less than on version 1 (computed).',
    ] },

    { type: 'demo', id: 'caliper-steering', module: 'caliper', aside: 'left', h: 'Caliper in, steering out', poster: `${M}/poster-caliper.webp`,
      height: 'clamp(360px, 64vh, 600px)',
      p: [
        'Drag the slider to move the caliper’s jaw, measured from where the wheel points straight ahead. The link and the fork turn about the real pivot axes in my CAD, and the readout is the geometry of those pivots.',
        'The linkage is a slider and crank. Around straight ahead its response is close to linear, about 2.0° per millimeter, and it gets steeper as the link and the arm come into line, which in my CAD happens at about 4.5 mm of opening (computed). The settings a track needs, about 1 to 2 mm either way, sit in the gentle part. Nudge it by 0.01 mm, one count on the caliper, and the wheel turns about 0.02°. The table above gives version 2 between ±0.07° and ±0.14° of room, so several counts.',
      ],
      caption: 'My CAD of version 2. The slider moves the caliper’s jaw; the link and the fork follow the real pivot axes. Angles and radii are computed from the linkage in my CAD (50 mm arm, 89.4 mm link, 44.2 mm offset) and the 452 mm wheelbase, with zero at the CAD pose.' },

    { type: 'media', id: 'version-2-media', layout: 'row',
      p: [
        { problem: 'The linkage bar was 3D printed, so it was not that accurate.', title: 'A printed link' },
        'It was still way better than the servo.',
      ],
      items: [
        { i: 'photo-v2-caliper-link.webp', c: 'The caliper, with the printed link bar hanging from its jaw' },
        { i: 'still-v2-linkage-top.webp', c: 'The front end from above: fork, bearing holder arm, link and caliper clamp' },
        { i: 'photo-v2-finished.webp', c: 'Version 2 finished' },
      ] },

    { type: 'media', id: 'tuning', layout: 'row', h: 'Tuning it',
      p: ['I tuned it on the floor at home: set the caliper, line the car up against a tape measure on the floor, press start, see where it stops, change the setting, and go again.'],
      items: [
        { v: 'v2-tuning-run-2x.mp4', c: 'One tuning run: caliper set to 2.40, car lined up on the tape, start (2x speed)' },
        { i: 'still-caliper-reading.webp', c: 'Setting the caliper before a run' },
        { i: 'photo-v2-aimed-on-tape.webp', c: 'Lined up at an angle against the tape for a test' },
      ] },

    { type: 'prose', id: 'drive', h: 'Drive and electronics', p: [
      { ul: [
        'A D2830 brushless motor (1000 KV, per the part in my CAD) drives the rear axle through an 8 tooth pinion. The code counts 6 turns of the encoder for every turn of the wheels.',
        'An MT6701 magnetic encoder, read over I2C, sits at the end of the pinion shaft (in my CAD).',
        '2.875 in BaneBots wheels.',
        'An Arduino Nano Every runs everything. The motor’s speed controller takes standard servo pulses: 1500 µs is stop and 2000 µs is full power.',
        'Eight AA batteries in a removable pack (below).',
      ] },
      'The electronics module comes straight from my 2025 car (the CAD part is still named for 2024-25), and so do the motor, the encoder mount, the wheels and the pinion.',
    ] },
    { type: 'media', id: 'drive-media', layout: 'row', items: [
      { i: 'render-drive-gears.webp', c: 'The rear drive in my CAD: brushless motor, pinion and the big gear on the rear axle' },
      { i: 'photo-soldering.webp', c: 'Soldering the power leads' },
    ] },

    { type: 'prose', id: 'code', h: 'The code', p: [
      'The code is on GitHub: [github.com/jerryli08/sciolyev2026](https://github.com/jerryli08/sciolyev2026). It is four Arduino sketches. `code.ino` is my 2025 car’s control loop with a steering servo added and the encoder ratio changed. `targetTimeCode.ino`, `fairfaxCompCode.ino` and `finalCompCode.ino` share one target-time loop and differ in their track settings and speed-controller gains.',
      'Every loop of the target-time code:',
      { ol: [
        'Debounce two buttons. One toggles a laser output; the other starts and stops the run.',
        'Read the MT6701’s angle, unwrap it across 0 and 360 degrees, and turn the change into distance: change in angle ÷ 360 × wheel circumference ÷ 6.',
        'Work out speed from that distance and the loop time.',
        'Until 5 cm before the target distance, a speed controller holds the car at target distance ÷ target time.',
        'In the last 5 cm, a position controller brings the car to the target distance.',
        'Add a fixed 0.08 to any forward command, and send it to the motor’s speed controller as a pulse from 1500 to 2000 µs.',
      ] },
      { pre: 'distance += -(Δangle / 360) × (π × 2.875 in) / 6        the encoder counts backwards\nif distance < targetDist - 5 cm:\n    power = speedPID(targetDist / targetTime - speed)\nelse:\n    power = positionPID(targetDist - distance)\nesc pulse = 1500 µs + 500 µs × (power + 0.08 if power > 0)' },
      'The settings that change for each track sit together at the top of the file under ADJUSTABLE PARAMETERS (EASY ACCESS): the target distance, the target time and, for version 1, the steering angle. In `finalCompCode.ino` a comment says the servo isn’t used anymore; on version 2 the caliper sets the steering.',
      { problem: 'Set to 15 s, a run might take 16. In the final code I left a note that the timing did not work that well, and that maybe our battery was just low at Penn.', title: 'Runs came out long' },
      { fix: 'We corrected by hand: if a layout needed 15 s, enter 14. I also suggested keeping a spreadsheet of track layouts, each with the can’s sideways offset and the distance, and the settings that worked.' },
    ] },
    { type: 'media', id: 'code-media', layout: 'row', items: [
      { i: 'still-code-parameters.webp', c: 'The settings block at the top of the competition code' },
      { v: 'v1-target-time-test-2x.mp4', c: 'A slow target-time test run with version 1 on carpet (2x speed)' },
    ] },

    { type: 'prose', id: 'competition', h: 'Running it at competition', p: [
      'I filmed short how-to videos for running the car at a competition: loading the batteries, fitting the pack, uploading the code from the Arduino IDE, changing the settings, impound, and starting a run with a pencil.',
      { h: 'A battery pack that comes off in one piece' },
      'At impound the batteries have to be off the car. The eight cells live in one pack: it slides into a slot on the car, a hand-tightened nut holds it, and one plug connects it, so the whole pack comes off with the cells still in it.',
      { problem: 'I made that connector myself, and it was fragile.', title: 'A fragile plug' },
      { fix: 'Handle it gently. The impound how-to says exactly that: unplug it gently, slide the pack out, keep the cells in it, and bag it with the nut.', label: 'Workaround' },
    ] },
    { type: 'media', id: 'battery-media', layout: 'row', items: [
      { v: 'battery-pack-slot-in.mp4', c: 'The pack slides into its slot and a nut holds it' },
      { i: 'still-battery-pack-out.webp', c: 'Off the car for impound, cells still in the pack' },
    ] },
    { type: 'prose', id: 'aiming', h: 'Aiming', p: [
      { problem: 'I designed a sight for aiming the car: two slotted plates to look along. I did not realize the battery was going to be in the way, so it never went on.', title: 'The sight did not fit' },
      { fix: 'We aimed by eye, and at a competition on January 17 we lined the car up with a protractor at the start.' },
    ] },
    { type: 'media', id: 'aiming-media', layout: 'row', items: [
      { i: 'cad-v1-sight-plates.webp', c: 'The sight in my CAD: two slotted plates' },
      { i: 'still-sight-plate.webp', c: 'The printed sight plate that could not go on, next to the battery pack' },
      { i: 'photo-aiming-protractor.webp', c: 'Lining version 1 up with a protractor at the start, January 17' },
    ] },

    { type: 'iterations', id: 'timeline', h: 'Timeline', items: [
      { label: 'Jan 6, 2026', title: 'Starting from the 2025 car',
        p: ['The evening I started designing version 1. The drive, the encoder mount and the electronics came from my 2024-25 car.'],
        media: [{ i: 'photo-2025-car.webp', c: 'My 2025 car, January 6' }] },
      { label: 'Jan 7 to 8', title: 'Version 1 in CAD, then printed and wired',
        p: ['The finished CAD by the evening of January 7; soldering, the printed chassis and the servo on January 8.'],
        media: [
          { i: 'render-v1-car.webp', c: 'Version 1 in my CAD, with the battery holders on top' },
          { i: 'photo-v1-chassis.webp', c: 'The printed chassis with its electronics' },
          { i: 'photo-v1-servo-in-hand.webp', c: 'The servo in hand, the front module’s CAD behind it' },
        ] },
      { label: 'Jan 17', title: 'Version 1 at a competition',
        p: ['Aimed with a protractor at the start and run out toward the cans (both above).'] },
      { label: 'Feb 13 to 14', title: 'Version 2: caliper steering, then tuning',
        p: ['The caliper and the printed link on February 13, the finished car that night, and tuning runs on the floor right after.'] },
      { label: 'Later', title: 'Version 2 at a competition',
        p: ['Started with a pencil and out to the cans on the bonus line (the first video at the top of this page).'],
        media: [{ i: 'still-v2-at-cans.webp', c: 'Version 2 at the can line during a competition run' }] },
    ] },

    { type: 'prose', id: 'from-2025', h: 'From the 2025 car', p: [
      { table: {
        head: ['', '2024-25 car', '2025-26 car'],
        rows: [
          ['Scoring', 'How quickly it covers the distance, and how close to the target it stops', 'Target time (10 to 20 s), stop distance and a can bonus'],
          ['Layout', 'Four wheels, all-wheel drive', 'Three wheels: a driven rear axle and one steered front wheel'],
          ['Chassis', '1.5 mm G10 fiberglass lattice plates, designed with FEA', '3D printed (version 1); 2020 aluminum extrusion spine (version 2)'],
          ['Steering', 'None', 'Servo (version 1); caliper and linkage (version 2)'],
          ['Encoder', 'MT6701; 1.2 encoder turns per wheel turn in the code', 'Same encoder mount; 6 encoder turns per wheel turn'],
          ['Control', 'Ramp up, full power, then position control to the target', 'Hold distance ÷ time, then position control to the target'],
        ],
        caption: 'From my CAD and code for both cars.',
      } },
      '[See the 2024-25 car](/projects/electric-vehicle).',
    ] },
  ],
  assets: [`${M}/`],
};
