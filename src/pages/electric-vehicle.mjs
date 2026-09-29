// Science Olympiad Electric Vehicle (2024-25): rich page. Facts are Jerry's (src/projects.mjs,
// /home/claude/work/facts.md, his checklist and /home/claude/work/answers.md) or plainly shown by
// the media; tooth counts, ratios, dimensions and the torsion numbers are computed from his CAD and
// his code (github.com/jerryli08/sciolyEv) and say so. The torsion FEA uses assumed G10 values,
// labelled on the page.
// Every animation is a scrolly driven only by the scroll (Jerry, Sept 26): mechanisms.js (the
// final CAD, one step per mechanism), encoder-loop.js (2D: why the encoder was geared down),
// versions.js (V1 to V2 in CAD), torsion.js (the FEA re-run, twisting with the scroll) and
// stop-profile.js (2D: each sketch's power command as the car runs in). rig.js is shared.
// Held back until Jerry answers (/home/claude/work/scioly-ev-2025/questions.md): every "next time"
// item, why version one had two motors and version two one, which sketch ran at which
// tournament, the regional's name for the competition clips, whether IMG_8414 shows the chassis
// being twisted (it sits in the gallery until then), the real HDF thickness (so the FEA compares
// the lattice with a solid G10 plate only), and the site dates (projects.mjs keeps its own).
const M = '/assets/models/electric-vehicle';
const REPO = 'https://github.com/jerryli08/sciolyEv';

// datasheets and sources linked from the worked calculations
const MT = '[MagnTek MT6701 datasheet](https://www.magntek.com.cn/upload/pdf/202407/MT6701_Rev.1.8.pdf)';

export default {
  summary: {
    stats: [
      { v: '1st of 48', l: 'East Maryland Regional' },
      { v: '2nd of 72', l: 'UPenn Invitational, behind the Nationals winner' },
      { v: '8.3 m in 2.97 s', l: 'Stopped 1.1 cm (0.13%) from the target' },
      { v: '73% lightened', l: 'Chassis plates: 738 g to 198 g' },
    ],
    text: [
      'I designed and built this car by myself for the 2024-25 Science Olympiad Electric Vehicle event, which scores a car on how quickly it covers a set distance and how close to the target it stops. One brushless motor drives all four wheels through a 6 : 1 printed gear pair and two GT2 belts, a geared magnetic encoder measures the distance, and an Arduino schedules the power on distance so the car slows as it closes on the target.',
      'The chassis is two 1.5 mm G10 fiberglass plates with a lattice I designed with FEA so the car can twist over bumps in the floor. It covered 8.3 m in 2.97 s and stopped 1.1 cm from the target, and took 1st of 48 at the East Maryland Regional.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-regional-run.mp4', c: 'A competition run, filmed from behind the start line' },
      { v: 'hero-home-stop.mp4', c: 'Testing at home on January 17, 2025: the car runs down the hallway and stops with its front on the tape mark' },
    ],
  },
  sections: [
    { type: 'scrolly', id: 'mechanisms', module: 'mechanisms', stepHeight: '90vh', poster: `${M}/poster-mechanisms.webp`,
      h: 'How it works',
      p: ['Five views of my final CAD, one per mechanism. The top plate fades away while the gears are on screen and comes back for the buttons. The drivetrain turns as you scroll, every part at the speed its tooth count gives it.'],
      steps: [
        { h: '1. The geared drivetrain', p: [
          'One D2830 brushless outrunner sits on a printed mount at the back of the car; the label on the real motor reads 850KV. Its 8-tooth pinion drives a 48-tooth gear on the rear axle, a **6 : 1** reduction.',
          'The gears are 3D printed. In the CAD their centres are 28 mm apart, which is (8 + 48) / 2: module 1. The axle is a 12 mm carbon fiber tube in goBILDA pillow blocks, with 2.875 in BaneBots wheels on the ends.',
        ] },
        { h: '2. The geared encoder', p: [
          'The same pinion also drives a 40-tooth gear on its own short shaft, and an MT6701 magnetic encoder reads that shaft\'s angle. It turns at a fifth of motor speed: **1.2 turns per wheel turn** (48 / 40; the code uses the same 1.2).',
          'On my first version the encoder read the motor shaft directly, 6 turns per wheel turn. I had to gear it down because of loop times; [the section below](#encoder) shows why.',
        ] },
        { h: '3. The belts to the front', p: [
          'Two 1140 mm GT2 belts run the length of the car on 47-tooth pulleys, one on each side, from the rear axle to the front axle. At **1 : 1** the front wheels turn exactly with the back wheels, so all four wheels drive. That decreases wheel slip and increases speed.',
          'Slip matters twice on this car: the encoder is geared to the drivetrain, so it counts wheel turns, not ground covered. The spacers on the axles are printed honeycomb tubes.',
          { note: 'Belt check from the CAD: 2 x 523.1 mm between the axles + pi x 29.92 mm pitch diameter = 1140 mm.' },
        ] },
        { h: '4. Two buttons', p: [
          'Two buttons sit in a printed plate on top, at the back. The **left** one toggles the laser pointer on the front of the car. The **right** one starts the run.',
          'In the code they are debounced inputs on pins 7 and 4, read at the top of every loop.',
        ] },
        { h: '5. The whole car', p: [
          'Two 287 x 590 mm G10 plates, 1.5 mm thick, 40 mm apart on goBILDA beams, with the electronics between them. The wheelbase is 523 mm and the track 320 mm (CAD): about 30 by 60 cm overall.',
        ] },
      ] },

    { type: 'media', layout: 'row', items: [
      { v: 'hero-launch.mp4', c: 'Launching from a standstill on tile' },
      { i: 'still-v2-drivetrain-gears.webp', c: 'The real drivetrain: the printed gears, the purple D2830 and a honeycomb spacer on the carbon axle' },
      { i: 'still-buttons.webp', c: 'Through the top plate: the gearbox, the 48T gear and the two buttons' },
    ] },

    { type: 'scrolly', id: 'encoder', module: 'encoder-loop', webgl: false, stepHeight: '85vh',
      h: 'Why the encoder had to be geared down',
      p: ['The Arduino reads the MT6701\'s absolute angle once per loop and adds the change since the last read to a running distance. It decides which way the magnet moved by taking the shorter way around the circle, which only works if the magnet turned less than half a turn between two reads.'],
      steps: [
        { h: 'One loop of the code', p: [
          'Between two reads the magnet turns (the dashed ring). The code only sees the new angle and takes the short way round from the last one (the solid arc).',
          'The speed here is the car\'s average over 8.3 m in 2.97 s: 2.8 m/s. With a short loop the magnet turns a little between reads, and the count is right.',
        ] },
        { h: 'Version one: the encoder on the motor shaft', p: [
          { problem: [
            'On version one the MT6701 read the motor shaft, so it turned 6 times for every turn of the wheels. Half a turn of the magnet was only **19.1 mm** of travel.',
            'At 2.8 m/s the loop would have had to finish in under **6.8 ms**, every time, and faster still at top speed.',
          ], title: 'The encoder on the motor shaft' },
        ] },
        { h: 'Past half a turn', p: [
          'Miss that and the code reads the magnet turning the wrong way, and the distance count goes wrong. Past half a turn the code reads it backwards, and the distance it counts for an 8.3 m run falls apart.',
        ] },
        { h: 'Version two: gear it down', p: [
          { fix: 'In version two the encoder rides on a 40-tooth gear driven by the motor pinion, **1.2 turns** per wheel turn. Half a turn is now **95.6 mm** of travel.', title: 'Gear the encoder down' },
        ] },
        { h: 'Five times the headroom', p: [
          'The same 2.8 m/s leaves **34 ms** per loop: five times the headroom. In the code the change is one constant, `gearRatio`, from 6.0 to 1.2.',
          { note: 'Numbers from the wheel size (2.875 in, 229.4 mm around) and the tooth counts.' },
        ] },
      ],
      caption: 'Constant speed and no noise: this shows the sampling limit only. The loop times are swept to show the limit; they are not measured from my code.' },

    { type: 'prose', id: 'versions', h: 'Version one to version two', p: [
      'Version one used CNC-cut HDF plates. They were heavy, and too stiff: I knew the chassis needed to flex over floor bumps. The G10 plates arrived on January 9, 2025, and I started rebuilding the car on them the same day.',
      { problem: [
        'Each HDF plate weighed 369 g on my scale. And the chassis was too stiff: a car that cannot twist sits on three wheels as soon as the floor is uneven, and with every wheel driven, an unloaded wheel is lost drive.',
      ], title: 'Heavy and too stiff' },
      { fix: [
        'I used Fusion 360 FEA to design a lattice into 1.5 mm G10 fiberglass plates that gives the chassis torsional flexibility, so the car passively absorbs bumps in the floor. The wide ends of each plate are open, irregular cells; the narrow spine between them is a row of hexagons between two rails, tied across.',
        'Each G10 plate weighs 99 g. The two main plates went from 738 g to 198 g, **73% lighter**, and the run time dropped from about 15 s to 2.9 s.',
      ], title: 'An FEA-designed G10 lattice' },
      { calc: 'What does the lighter car buy?',
        given: [
          ['Whole car on my scale, version one', '1,645 g', 'my scale photo'],
          ['Whole car on my scale, version two', '1,394 g', 'my scale photo'],
        ],
        work: [
          '1,645 g - 1,394 g = 251 g lighter, 15 %',
          'For the same drive force, acceleration goes as 1 / mass: 1,645 / 1,394 = 1.18',
        ],
        result: 'With the same push from the motor, version two would accelerate about 18 % harder, with 15 % less mass to stop at the target.',
        note: 'Same force assumed; version two also changed its motors and drivetrain, so this is only the weight\'s share.' },
    ],
      media: [
        { i: 'photo-hdf-plate-scale.webp', c: 'One HDF plate from version one: 369 g' },
        { i: 'photo-g10-plate-scale.webp', c: 'One G10 lattice plate on the same scale: 99 g' },
      ] },
    { type: 'scrolly', id: 'versions-cad', module: 'versions', stepHeight: '90vh', poster: `${M}/poster-versions.webp`,
      h: 'Both versions in CAD',
      p: ['My two CAD files, one after the other. Version one\'s plates are tinted brown like the real HDF. Screws are left out of both models, and so is version one\'s STM32 board.'],
      steps: [
        { h: 'Version one: HDF plates', p: ['CNC-cut HDF plates, 287 x 690 mm, with a 623 mm wheelbase (CAD).'] },
        { h: 'Two motors', p: ['Between the plates: one D2830 geared to each axle, and the encoder on the rear motor\'s shaft, 6 turns per wheel turn. The controls were an STM32 Nucleo board, a 16x2 LCD and three buttons.'] },
        { h: 'Version two: one motor and belts', p: ['One D2830 drives all four wheels, the rear axle through the gears and the front axle through two GT2 belts. The encoder rides on a 40T gear, 1.2 turns per wheel turn, and an Arduino Nano with two buttons replaced the STM32 board and the LCD.'] },
        { h: 'The same car, 100 mm shorter', p: ['Version one as a ghost over version two: the same car with 50 mm more at each end. The plate outline went from 287 x 690 mm to 287 x 590 mm and the wheelbase from 623 mm to 523 mm.'] },
        { h: 'The G10 lattice', p: ['From above, with the top plate back on. The wide ends of each plate are open, irregular cells; the narrow spine between them is a row of hexagons between two rails, tied across.'] },
      ] },
    { type: 'prose', id: 'changes', p: [
      { table: {
        head: ['', 'Version one', 'Version two'],
        rows: [
          ['Main plates', 'HDF, solid, CNC cut', '1.5 mm G10 fiberglass, lattice'],
          ['One plate on my scale', '369 g', '99 g'],
          ['Plate outline (CAD)', '287 x 690 mm', '287 x 590 mm'],
          ['Wheelbase (CAD)', '623 mm', '523 mm'],
          ['Motors (CAD)', 'Two D2830s, one geared to each axle', 'One D2830, belts to the front axle'],
          ['Encoder (CAD)', 'On the motor shaft: 6 turns per wheel turn', 'On a 40T gear: 1.2 turns per wheel turn'],
          ['Controls (CAD and code)', 'STM32 Nucleo board, 16x2 LCD, three buttons', 'Arduino Nano, two buttons'],
        ],
        caption: 'Plate weights from my scale photos; everything marked CAD is measured in my two CAD files.',
      } },
    ] },

    { type: 'scrolly', id: 'torsion', module: 'torsion', stepHeight: '85vh', poster: `${M}/poster-torsion.webp`,
      h: 'The torsion FEA, re-run',
      p: ['A new run of the torsion study, on the plate from my final CAD, next to a solid plate with the same outline.'],
      steps: [
        { h: 'Held at the pillow blocks', p: ['Each plate is held where the pillow blocks bolt through it. The rear pair stays put and the front pair turns about the car\'s long axis.'] },
        { h: 'One front wheel over a bump', p: ['That is the way the chassis twists when one front wheel rides over a bump. The colour is the bending stress at the surface.'] },
        { h: 'A solid plate, same outline', p: ['The lattice keeps **34%** of the plate\'s material (322 of 944 cm²) and **28%** of its torsional stiffness: 10.6 N·mm per degree of twist against 38.0 for the solid plate.'] },
        { h: 'Flexible, without piling up stress', p: ['At the same twist, the highest bending stress is nearly the same in both, about 1.3 MPa per degree, so the lattice gives up stiffness without piling stress into its rails.'] },
      ],
      caption: 'Plate model (Kirchhoff plate, 1 mm elements) of one main plate, with assumed typical values for G10: E = 18 GPa, Poisson\'s ratio 0.12, isotropic. E sets the absolute numbers; the lattice-to-solid ratio does not depend on it. Both plates twist together, so the chassis is at least twice one plate; the beams tying the two plates make it stiffer than that, and this model leaves them out. The solid plate is generated from my outline, not a CAD part. The bending and the front axle\'s tilt are drawn 3 times larger than real; the readouts are not.' },

    { type: 'iterations', id: 'iterations', h: 'Iterations', items: [
      { label: 'Version one', title: 'HDF plates, two motors (December 2024)',
        p: [
          'CNC-cut HDF plates, one D2830 geared to each axle, and the encoder reading the rear motor\'s shaft. My first code for it ran on an STM32 Nucleo board; those sketches are in the repo\'s `deprecated` folder. The first ground test ran the rear half on a cable.',
          'On my scale the whole car read 1,645 g in this photo, with the plates alone 738 g of it.',
        ],
        media: [
          { i: 'photo-v1-car.webp', c: 'Version one on HDF plates, on my scale: 1,645 g' },
          { v: 'clip-v1-gear-mesh.mp4', c: 'The printed 48T gear turning on the carbon axle' },
          { v: 'clip-v1-ground-test.mp4', c: 'Version one\'s rear half on the carpet, driven on a cable' },
        ] },
      { label: 'Version two', title: 'G10 lattice, one motor and belts (January 2025)',
        p: [
          'The FEA-designed G10 plates, 100 mm shorter, one motor driving all four wheels through the gears and two GT2 belts, and the encoder geared down to 1.2 turns per wheel turn. The finished car read 1,394 g on the same scale.',
        ],
        media: [
          { i: 'photo-g10-raw-plate.webp', c: 'A G10 plate, the day the plates arrived' },
          { i: 'photo-rebuild-old-vs-new.webp', c: 'The same day: the car rebuilt on G10, with an old HDF plate behind it' },
          { i: 'photo-v2-finished.webp', c: 'Version two, finished, on my scale: 1,394 g' },
        ] },
    ] },

    { type: 'prose', id: 'code', h: 'The code', p: [
      `All of the car's code is on GitHub: [github.com/jerryli08/sciolyEv](${REPO}). It is one Arduino sketch per stage of the project, from the first motor test to the final distance profiles.`,
      { h: 'One polling loop' },
      'Everything runs in one loop on the Arduino Nano. Each pass it:',
      { ol: [
        'reads the two buttons, debounced over 30 ms: the left one toggles the laser, the right one starts and stops the run;',
        'reads the MT6701\'s absolute angle over I2C and adds the change since the last pass to a running distance, taking the shorter way around the circle (the step that forced the geared encoder);',
        'converts angle to distance with the wheel\'s circumference (2.875 in wheels) divided by the encoder ratio (1.2);',
        'picks a power command from the distance travelled;',
        'sends it to the ESC as a servo pulse: 1500 µs is neutral, 2000 µs is full forward and below 1500 µs is reverse, so the same number can drive or brake;',
        'prints power, distance and target over serial at 500,000 baud, which I plotted live while tuning.',
      ] },
      { calc: 'How fine is one count of the encoder?',
        given: [
          ['MT6701 angle over I2C', '14 bits: 16,384 steps per turn', MT],
          ['Wheel', '2.875 in: 229.4 mm around', 'BaneBots wheel, in the CAD'],
          ['Encoder turns per wheel turn', '1.2', 'the CAD and my code'],
          ['The run', '8.3 m in 2.97 s, stopped 1.1 cm from the target', 'my result'],
        ],
        work: [
          'Travel per encoder turn: 229.4 mm / 1.2 = 191.2 mm',
          'Travel per step: 191.2 mm / 16,384 = 0.012 mm',
          'The 1.1 cm stop error is 11 / 0.012 = about 940 steps',
          'At the run\'s average speed, 8.3 m / 2.97 s = 2.8 m/s, the car covers 1.1 cm in 11 mm / 2.8 m/s = 4 ms',
        ],
        result: 'The encoder resolves about a hundredth of a millimetre, a thousand times finer than the stop, so its resolution is not what sets the stop. At full speed the car crosses 1.1 cm in about 4 ms, and every sketch slows the car before the target.',
        note: 'Resolution only: wheel slip and tyre squash change how far the car really goes per wheel turn.' },
      { h: 'The speed profile is scheduled on distance, not time' },
      'In `SOUPCode` and `PUSOCode` the car ramps power up over the first 1.8 m, runs at full power, and 3 m before the target hands over to a PID controller (ArduPID) whose setpoint is the target distance. It only uses the proportional term, 0.002 per cm of distance left, plus a constant feedforward of 0.08 while the command is positive. Its output can go negative: if the car passes the target, the motor reverses and pulls it back.',
      '`regionalsCode` ramps the power down on a fixed schedule over the last 3 m instead, and creeps the final 20 cm at a constant 0.08. In every sketch the target is a single constant at the top of the file.',
    ],
      media: [
        { i: 'photo-v1-encoder-on-motor.webp', c: 'Version one: the MT6701 board facing the end of the motor shaft, on the D2830 850KV' },
        { i: 'photo-pid-code.webp', c: 'Tuning the PID: the serial monitor prints power, distance and target on every loop' },
      ] },
    { type: 'scrolly', id: 'stop-profile', module: 'stop-profile', webgl: false, stepHeight: '80vh',
      h: 'How each sketch brings the car in',
      p: ['The power command each sketch sends, against the distance the encoder has counted, over the last 4 m before its target, oldest sketch first. The car runs in as you scroll, and the readout shows the command and the ESC pulse where it is.'],
      steps: [
        { h: '`fullEvCode`', p: ['My first closed loop, forward only: power proportional to the distance left (gain 12.5, so it stays at full until the end), cut 60 cm before the target, then the car coasts in.'] },
        { h: '`AWDGearedEncoderCode`', p: ['An earlier test with the geared encoder: full power until 2 m out, proportional to 50 cm, then a slow creep. The small offsets after the clamp push the command just past full.'] },
        { h: '`regionalsCode`', p: ['Full power, then from 3 m out the power ramps down on a fixed schedule, creeps the last 20 cm at 0.08 and stops at the target.'] },
        { h: '`SOUPCode` and `PUSOCode`', p: ['Full power, then from 3 m out a P controller on position (Kp 0.002 per cm) plus 0.08 feedforward while it drives forward. Past the target the command goes negative: the motor reverses. The two are the same sketch with a different target, 823 and 888 cm.'] },
      ],
      caption: `Transcribed from the sketches in [the repo](${REPO}); no physics. Each sketch is drawn against its own target: 700 cm in fullEvCode, 495.7 cm in AWDGearedEncoderCode and 823 cm in the last two. The distance comes from the encoder: angle change x 229.4 mm / 1.2 per turn (6.0 in fullEvCode).` },
    { type: 'prose', id: 'code-history', p: [
      { h: 'How it got there' },
      'The repo keeps every stage as its own sketch:',
      { ul: [
        '`deprecated/`: my first motor tests, on the STM32 Nucleo.',
        '`MT6701Test` and `integratedDriveCode`: reading the encoder, then a first closed loop that cut power in proportion to the distance left.',
        '`fullEvCode`: the full run, with a correction factor on the wheel circumference, stopping the motor 60 cm early and coasting in.',
        '`frontWheelDriveTest`, `AWDcode`: the ESC set up for both directions (1500 µs neutral), front-wheel drive and then all-wheel drive, still with the encoder on the motor (ratio 6.0).',
        '`AWDGearedEncoderCode`: the geared encoder, ratio 1.2.',
        '`AWD_PIDTest`, then `regionalsCode`, `SOUPCode` and `PUSOCode`: the distance-scheduled profiles above.',
      ] },
      { problem: 'My first closed loop could only drive forward. It cut the motor 60 cm before the target, a constant the code calls `overshoot`, and let the car coast in, so where it stopped depended on its momentum.', title: 'Coasting onto the target' },
      { fix: 'I set the ESC up for both directions, with 1500 µs as neutral, so the approach could become a controller on position whose output goes negative: past the target, the motor reverses and pulls the car back.', title: 'Let the controller brake' },
    ],
      media: [{ i: 'photo-stm32.webp', c: 'The first electronics: STM32CubeIDE and the Nucleo board, before I moved to an Arduino' }] },

    { type: 'prose', id: 'electronics', h: 'Electronics', p: [
      'An Arduino Nano reads the MT6701 magnetic absolute encoder over I2C and drives the motor\'s ESC with a servo pulse. The ESC is an AIKON AK32 35A, as its label reads, tuned in BLHeli_32 Suite. The electronics sit on perfboard between the two plates.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'photo-esc.webp', c: 'The AIKON AK32 35A ESC next to the perfboard' },
      { i: 'still-perfboard.webp', c: 'The perfboard, wired into the chassis' },
    ] },

    { type: 'prose', id: 'testing', h: 'Testing', p: [
      'I tested in long hallways: at home on wood and tile, then in two school hallways with tape marks for the target, running the same distance again and again with the laptop on the floor between runs.',
    ] },
    { type: 'media', layout: 'grid', cols: 3, items: [
      { v: 'clip-school-launch.mp4', c: 'Launching down a school hallway', tall: true },
      { v: 'clip-school-full-run.mp4', c: 'A whole run at school, filmed from the target end', tall: true },
      { v: 'clip-overshoot.mp4', c: 'Tuning at school: a run that went past the tape', tall: true },
    ] },

    { type: 'prose', id: 'results', h: 'Results', p: [
      '1st of 48 at the East Maryland Regional, 2nd of 28 at the Maryland State Championship, 2nd of 72 at the UPenn Invitational (behind the team that went on to win nationals), and 4th of 57 at the Princeton Invitational.',
      'It covered 8.3 m in 2.97 s and stopped 1.1 cm (0.13%) from the target.',
    ] },
    { type: 'media', layout: 'row', items: [
      { v: 'clip-regional-align.mp4', c: 'Lining the car up on the start line at a competition' },
      { v: 'clip-regional-run1.mp4', c: 'Another competition run, from behind the start line' },
    ] },

    { type: 'media', id: 'gallery', h: 'More pictures', layout: 'grid', cols: 3, items: [
      { i: 'still-car-standing.webp', c: 'The finished chassis, stood on end', tall: true },
      { i: 'photo-first-g10-assembly.webp', c: 'First assembly on the G10 plates' },
      { i: 'photo-honeycomb-spacers.webp', c: 'A handful of the printed honeycomb spacers' },
      { i: 'photo-gear-on-axle.webp', c: 'The printed 48T gear on the carbon axle' },
      { v: 'clip-chassis-twist.mp4', c: 'The finished chassis, in hand' },
      { i: 'still-regional-rear.webp', c: 'Before a run at a tournament: the rear of the car' },
      { i: 'still-v1-buttons-laser.webp', c: 'Wiring version one\'s top HDF plate' },
      { i: 'still-v2-motor-belt.webp', c: 'From above: the motor, the printed gearbox and a GT2 belt running through the lattice', tall: true },
    ] },
  ],
  assets: [`${M}/`],
};
