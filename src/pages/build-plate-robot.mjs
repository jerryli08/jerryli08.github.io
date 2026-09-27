// Replac3d (build-plate-robot). Page text from the phase A write-up (/home/claude/work/replac3d/),
// corrected against Jerry's answers of Sept 26, 2026, his public repo (github.com/jerryli08/replac3d:
// README, build log and final firmware) and his CAD. Numbers marked as CAD come from his Fusion
// assembly; the swap time was measured from the full-cycle video. Every animation is a scrolly driven
// only by the scroll (assets/js/pages/build-plate-robot/); the CAD is final.glb (no circuit boards,
// no fasteners) plus electronics.glb (the boards), which only the electronics section loads.
const M = '/assets/models/build-plate-robot';
const GH = 'https://github.com/jerryli08/replac3d';

export default {
  summary: {
    stats: [
      { v: '24 h', l: 'Printing a day, up from about 7' },
      { v: 'About 70 s', l: 'Per swap, timed from the video' },
      { v: 'Top 12', l: 'of 2,042 projects, Hack Club Arcade' },
      { v: '$300', l: 'Polymaker sponsorship' },
    ],
    text: [
      'My FTC team’s 3D printer sat idle every night, because someone had to be there to pull each finished print. Replac3d reaches into the printer, pulls the build plate out with four electromagnets, parks it on a holder and loads a fresh plate from a second holder, so the next job can start with nobody there.',
      'I built it alone from February to August 2024. It took our usable print time from about 7 hours a day to 24. It was my first personal technical project: I had no electronics experience going in and learned steppers, drivers, soldering and firmware on it.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-pull-used-plate.mp4', c: 'Reaching into the printer for the used plate' },
      { v: 'hero-load-printer.mp4', c: 'Driving the fresh plate into the printer' },
    ],
  },
  sections: [
    { type: 'prose', id: 'problem', h: 'Why take the whole plate out', p: [
      'We could only run the printer from 3 to 10 PM, because someone had to take each finished plate off and start the next job. A print that finished in the evening left the printer idle until the next afternoon. I wanted a machine that does that one human step.',
      { fig: { v: 'removal-side-view-2x.mp4', c: 'Pulling a custom plate out of the printer and setting it down beside the machine, at 2x (August 2024)' }, wide: true },
      'I researched how other people automate a printer, and none of the approaches fit mine, a Bambu Lab P1S:',
      { table: { head: ['Approach', 'Why I passed on it'], rows: [
        ['Push the print off with the toolhead', 'Fails on short prints, can damage the part and the toolhead, and the part has to be caught out of the air'],
        ['A conveyor of build plates', 'Only works on printers a plate can pass through, which rules out the P1S, and the plate still falls'],
        ['Scrape the print off', 'Can damage the print and the plate, large prints can tip over, and small things like brims get missed'],
        ['A plate changer that grips the plate at its edge', 'The one I found was far too large, and a plate held at its edge can bend under a heavy print and drop it'],
      ] } },
      'So Replac3d lifts the whole plate out, print and all, and puts a fresh one in. It holds the plate from above with four electromagnets, strong enough to beat the magnet in the printer’s bed.',
    ] },

    { type: 'scrolly', id: 'swap', module: 'swap', h: 'One swap, step by step', poster: 'cad-render-final-system.webp',
      p: ['Scroll to run a full swap on my CAD. Everything happens on two axes: a turntable, and an arm that rides on it and reaches out.'],
      steps: [
        { h: 'A print finishes', p: ['The printer sits behind the robot with a plate holder on each side: a fresh plate on the left, the right one empty. When a print is done the printer drops its bed all the way down, and the plate presses a button wired to the robot, which starts the swap.'] },
        { h: 'Reach in', p: ['Two NEMA 17 steppers pull belts that run the carriage 355 mm into the printer on a pair of telescoping ball slides. The printer goes see-through so you can watch.'] },
        { h: 'Grab', p: ['Four 5 V electromagnets, switched by two MOSFET modules, take hold of the steel plate from above.'] },
        { h: 'Slide it off the bed', p: ['The arm pulls back. The plate slides forward off the bed, print and all, and comes out with it.'] },
        { h: 'Turn to the empty holder', p: ['A NEMA 23 swings the whole arm 90° through a 3.6 : 1 belt reduction.'] },
        { h: 'Park the used plate', p: ['The arm reaches out over the holder, the magnets let go, and it pulls back empty.'] },
        { h: 'Turn to the fresh plate', p: ['180° to the other holder.'] },
        { h: 'Pick up a fresh plate', p: ['Reach out, magnets on, pull back with a clean plate.'] },
        { h: 'Turn back', p: ['90° back to the printer.'] },
        { h: 'Load it', p: ['The arm reaches in, sets the fresh plate on the bed, lets go and pulls back. The printer is ready for the next job.'] },
      ],
      caption: 'My CAD. The printer’s bed is not modeled, so only the plate moves with it. The readout names the function of my final sketch that each move belongs to.' },

    { type: 'media', id: 'video', layout: 'row', h: 'The real thing', items: [
      { v: 'full-cycle-4x.mp4', c: 'The complete swap in one take, at 4x speed (late August 2024)' },
      { v: 'hero-grab-fresh-plate.mp4', c: 'Turning to the holder with the fresh plate and reaching over it' },
    ] },
    { type: 'callout', id: 'layout', h: 'One reach, three stations', p: [
      'In my CAD the printer plate and both holder plates sit on one circle, 435 mm from the turntable axis. So a single 355 mm stroke of the arm reaches all three, and the turntable only ever stops at three angles: 0° and ±90°. Two simple axes do the whole job.',
      'A full swap takes about 70 seconds. I timed it from the video above: from flipping the power switch to the arm resting at home with the fresh plate loaded.',
    ] },

    { type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', length: '170vh', poster: 'cad-render-final-system.webp',
      h: 'The CAD',
      p: [
        'My full Fusion 360 assembly, turning as you scroll: the robot, the printer and both plate holders, laid out the way they stand.',
        'I also measured and modeled every board; they are in the electronics section below. Screws and nuts are left out to keep it light, and my first concept from February 2024 comes next.',
      ],
      data: { models: [{ label: 'Final machine (Aug 2024)', src: `${M}/final.glb` }], azimuth: 38, elevation: 30, pad: 0.84, spin: 240 } },

    { type: 'prose', id: 'rails', h: 'From linear rails to drawer slides', p: [
      'My first concept in February put the magnet plate on two MGN12 linear rails. The plate was bolted to the rails’ carriage blocks at its back end and reached forward over the printer plate. I ran FEA on the grasper plate in Fusion 360 before cutting anything.',
      { problem: 'Reach, footprint and cost. In the concept CAD, 450 mm rails carry the magnet plate 405 mm forward, and at full reach the plate hangs about 400 mm past the ends of the rails, held only at its back by two small blocks. Precision rails also cost a lot for accuracy this job does not need.', title: 'The rail concept' },
      { fix: 'Off-the-shelf telescoping drawer slides, one on each side of the carriage. They fold the reach back into the frame, they are cheap, and they are precise enough to set a plate down. By the time parts arrived in March the design had become a turntable carrying those slides, so one arm could serve the printer and two holders.' },
    ] },
    { type: 'scrolly', id: 'rails-demo', module: 'concept', poster: `${M}/poster-rails.webp`,
      steps: [
        { h: 'Side by side', p: ['My February concept on the left and the final arm on the right, both from my CAD at the same scale. The concept bolts the magnet plate to the carriage blocks of two 450 mm MGN12 rails. The final carriage rides a 400 mm telescoping slide on each side.'] },
        { h: 'The same job', p: ['Both reach out over the printer plate. The concept’s blocks and plate slide the full length of its rails, 405 mm; the final carriage runs its 355 mm stroke.'] },
        { h: 'Held at one end, or along both sides', p: ['At full reach the concept’s plate hangs about 400 mm past the ends of the rails, held only at its back by two small blocks (orange). The final carriage is carried by a slide on each side along its whole length (the slides’ middle members, blue).'] },
        { h: 'Folded back in', p: ['Pulled back, the final arm folds its whole reach into the frame, so it can turn between the printer and the two holders.'] },
      ],
      caption: 'Both from my CAD, at the same scale, run through their reach by the scroll.' },
    { type: 'media', layout: 'grid', cols: 3, items: [
      { i: 'concept-four-magnets.webp', c: 'The first CAD: four electromagnets over a stock build plate (Feb 8, 2024)' },
      { i: 'fea-grasper-0-063mm.webp', c: 'FEA on the U-shaped grasper plate in Fusion 360: 0.063 mm peak deflection (Feb 11, 2024)' },
      { i: 'fea-grasper-1-42mm.webp', c: 'FEA on a pocketed version: 1.42 mm peak deflection (Feb 11, 2024)' },
    ] },

    { type: 'scrolly', id: 'arm', module: 'extension', width: 'wide', side: 'left', stepHeight: '85vh', poster: `${M}/poster-arm.webp`,
      h: 'The telescoping arm',
      p: ['The arm has to reach 355 mm into the printer and fold back into a 400 mm frame so it can turn.'],
      steps: [
        { h: 'Folded into the frame', p: ['Each side of the carriage runs on a 400 mm, three-member telescoping ball slide (SAR340 in my CAD). The outer member is bolted to the side plate, the inner member to the carriage’s 2020 extrusion, and the middle member rides between them, so the carriage is carried on both sides at any reach.'] },
        { h: 'Inside a slide', p: ['Cut through the upper rows of balls, all three members show. Each row of balls rolls at the average speed of the two members it sits between: as the carriage moves out, the middle member goes half as far, and the two rows of balls three quarters and a quarter as far.'] },
        { h: 'Out to 355 mm on two belts', p: [
          'Each side has its own NEMA 17 on a motor plate at the back of the frame. Its belt runs over GoBILDA idlers at the front and back of the frame and is clamped to the back end of the carriage extrusion, so turning the motor drags the carriage in or out.',
          'In the CAD each motor has an 80-tooth GT2 pulley, which moves 160 mm of belt per turn: the full 355 mm stroke is about 2.2 motor turns.',
        ] },
        { h: 'Back in', p: ['The motors turn back and pull the carriage home, and the slides fold back into the frame.'] },
      ],
      caption: 'From my CAD. In a real slide the middle member floats between its stops; here it is drawn at half travel.' },
    { type: 'media', layout: 'row', items: [
      { v: 'extension-belt-by-hand.mp4', c: 'Turning the motor pulley by hand drags the belt and the carriage along (March 2024)' },
      { i: 'extension-belt-path.webp', c: 'The belt, printed clamps and idlers at the motor end (July 2024)' },
    ] },

    { type: 'prose', id: 'turntable', h: 'The turntable', p: [
      'The turntable carries the whole arm, both extension motors and a plate held up to 355 mm out, so its bearing takes a large tipping load as well as the weight. I designed it from small off-the-shelf bearings, shown below from my CAD.',
      { problem: 'The first time I tested the turntable it made a horrible grinding noise, and screws caught on each other because there was not enough room between the layers.', title: 'Grinding' },
      { fix: 'I rebuilt the bearing stack with new spacers and fastened the standoffs with different screws. After that it spun smoothly.' },
    ],
      media: [{ i: 'turntable-bearing-ring.webp', c: 'The eight bearing posts around the printed pulley disc (March 2024)' }] },
    { type: 'scrolly', id: 'turntable-demo', module: 'turntable', poster: `${M}/poster-turntable.webp`,
      steps: [
        { h: 'Seen from below', p: ['A NEMA 23 at the back of the base drives a printed pulley disc under the turntable, with an 80-tooth pulley and a GT2 belt.'] },
        { h: 'A quarter turn', p: ['The disc has 288 teeth on its rim. That is a 288 : 80 = 3.6 : 1 reduction (tooth counts from the CAD), so a quarter turn of the arm is 0.9 of a motor turn.'] },
        { h: 'The three stations', p: ['A swap only ever stops the turntable at 0° and ±90°. Going from one holder to the other is half a turn of the arm and 1.8 turns of the motor.'] },
        { h: 'Pull the stack apart', p: ['A fixed middle plate with a 210 mm hole in it. A printed pulley disc with 288 teeth on its rim sits under the hole, and the arm’s bottom plate sits above it. Eight standoffs through the hole tie the two together.'] },
        { h: 'Cut through one post', p: [
          'On each standoff, a GoBILDA thrust bearing above the plate and another below it clamp the plate between them: 16 thrust bearings carry the weight and the tipping load.',
          'Also on each standoff, an MR106 radial bearing rolls on the inside edge of the hole, which keeps the turntable centered.',
        ] },
      ],
      caption: 'From my CAD, seen from below, then close on one of the eight bearing posts. The motor pulley turns 3.6 times as far as the arm.' },
    { type: 'media', id: 'turntable-photos', layout: 'grid', cols: 3, items: [
      { i: 'turntable-disc-in-plate.webp', c: 'The disc dropped into the middle plate, the bearings riding the edge of the hole' },
      { i: 'turntable-pulley-teeth.webp', c: 'The 288 teeth printed on the disc’s rim' },
      { v: 'turntable-drive-underside.mp4', c: 'The turntable belt and motor pulley from below' },
    ] },

    { type: 'scrolly', id: 'electronics', module: 'electronics', width: 'wide', side: 'right', stepHeight: '75vh', poster: `${M}/poster-electronics.webp`,
      h: 'Electronics',
      p: ['Everything lives in two printed bays at the back of the base. I measured every board and the power supply with a ruler, modeled them in the CAD, and designed the bays around those models.'],
      steps: [
        { h: 'Two printed bays', p: ['The Arduino Uno, my driver perfboard and the Raspberry Pi sit in the left bay; the buck converter, the terminal block and the two MOSFET modules in the right one.'] },
        { h: 'Power', p: ['A 24 V, 250 W supply for the steppers and a 24 V to 5 V, 16 A buck converter for the 5 V side, shared out through a screw terminal block. One red rocker switch turns it all on.'] },
        { h: 'Magnets', p: ['Two MOSFET modules, each switching two of the four 5 V electromagnets on the carriage.'] },
        { h: 'Motion', p: ['An Arduino Uno and my own perfboard of TMC2209 stepper drivers: one for the turntable’s NEMA 23 and one for each extension NEMA 17.'] },
        { h: 'Raspberry Pi Zero 2 W', p: ['Meant to tell the Uno when a print is done. That part was never finished (more under the firmware).'] },
      ],
      caption: 'From my CAD. The stepper driver modules are not in it; the perfboard they plug into is. The tiny surface-mount parts on the boards are left out to keep it light.' },
    { type: 'prose', id: 'drivers', h: 'Stepper drivers', p: [
      { problem: 'I started with TMC5160 drivers and fried all of them with bad soldering.', title: 'Fried drivers' },
      { fix: 'I realized I did not need drivers that powerful and switched to TMC2209s. They also just take step and direction pulses, with no SPI setup, which made the code simpler.' },
      { problem: 'The two extension motors have to move exactly together. When I ran both from one driver it had problems I could not debug.', title: 'Two motors, one axis' },
      { fix: 'Each extension motor got its own TMC2209 (I added the third driver in August), and I wired both drivers to the same step and direction pins with separate enable pins, so the firmware drives them as one axis.' },
    ],
      media: [
        { i: 'drivers-v1-soldered.webp', c: 'The first drivers, TMC5160s, with power and motor wires soldered straight to the pins (May 2024)' },
        { i: 'perfboard-drivers-uno.webp', c: 'My perfboard: two TMC2209 drivers with pluggable motor terminals, next to the Uno (June 2024)' },
      ] },
    { type: 'media', id: 'bays', layout: 'grid', cols: 3, items: [
      { i: 'electronics-bay-pi.webp', c: 'The Raspberry Pi Zero 2 W on the left bay, with the driver board behind it' },
      { i: 'electronics-bay-power.webp', c: 'The right bay: buck converter, terminal block and the two MOSFET modules (July 2024)' },
      { v: 'drag-chains-by-hand.mp4', c: 'Checking both drag chains by hand: the shorter one follows the turntable, the longer one the arm (July 2024)' },
    ] },

    { type: 'prose', id: 'firmware', h: 'The firmware', p: [
      `The sketch that ran the swap in the video is one Arduino file, \`finalWorking08-23-2024.ino\`, [on GitHub](${GH}). It uses the AccelStepper library for two axes: \`panning\` for the turntable (up to 1,000 steps/s, 1,000 steps/s²) and \`extension\` for the arm (up to 3,000 steps/s, 1,000 steps/s²). A swap is four functions that follow one pattern: pull the arm in, turn, reach out, wait half a second, switch the magnets, wait, pull back.`,
      'The stations are hard-coded step targets: the turntable goes to -1,450, 0 or 1,440 steps and the arm to 0 or -14,000. `runToNewPosition()` blocks until each move is done, so only one axis moves at a time. That kept the code simple. It is also why the two extension motors are handled in hardware: both of their drivers listen to the same step and direction pins, and the sketch only switches their enable pins. The magnets are one output pin. In this version the whole sequence runs once from `setup()` when the board powers up.',
    ] },
    { type: 'scrolly', id: 'firmware-run', module: 'firmware', webgl: false, width: 'wide', side: 'left', stepHeight: '80vh',
      steps: [
        { h: 'Knowing when to start', p: [
          { problem: 'The printer knows when a print is done. My plan was for it to publish that over MQTT, with the Raspberry Pi subscribed and telling the Uno to start. I never finished it.', title: 'MQTT' },
          { fix: 'A hard-wired button instead. At the end of a print the printer lowers its bed all the way down, and the plate presses the button.' },
        ] },
        { h: 'The button', p: [
          { problem: 'In use, the plate often missed the button at the bottom. Knowing when to start was the main way the machine failed.', title: 'The button' },
        ] },
        { h: '`retrieve()`', p: ['At the printer: reach in, magnets on, pull out. The turntable is already at 0 steps, so only the arm moves.'] },
        { h: '`deposit()`', p: ['Turn to the right-hand holder at 1,440 steps, reach out, magnets off, pull back empty. Each move blocks until it is done, so the turntable and the arm never move at the same time.'] },
        { h: '`pickup()`', p: ['All the way across to the left-hand holder at -1,450 steps, reach out, magnets on, pull back with the fresh plate.'] },
        { h: '`replace()`', p: ['Back to the printer at 0, reach in, magnets off, pull back. The printer is ready for the next job, and `loop()` is empty.'] },
        { h: 'No homing', p: [
          { problem: 'There are no limit switches or other homing. I set both axes to zero by hand and ran conservative speeds and accelerations so the motors would never skip and lose count.', title: 'Homing' },
          { next: 'A real homing method, so a skipped step cannot put the arm in the wrong place.' },
        ] },
      ],
      caption: 'Step positions and the magnet pin as my final sketch drives them. Time runs left to right, worked out for ideal moves at the speed and acceleration limits set in the sketch.' },

    { type: 'prose', id: 'grip', h: 'The hard part: holding the plate', p: [
      'Getting the magnets to hold the plate every time was the hardest problem in the project. From the first magnet test in March to August, the grab was the weak point.',
      { problem: 'The stock Bambu plates were too thin, and their PEI coating sits between the steel and the magnets. An electromagnet’s rated pull (10 kg for each of mine) assumes thick steel pressed right against its face, and a thin sheet behind a plastic coating is far from that.', title: 'Stock plates' },
      { fix: 'I made my own build plates: 3 mm steel, laser cut by Fabworks in the same outline as the stock plate, so they fit the printer and my holders. The printer prints straight onto them, and pickup became 100% reliable.' },
      { problem: 'Once the magnets held, the steppers could not pull the plate out of the printer. They skipped.', title: 'Too much friction' },
      { fix: 'Thick, clear, rubbery tape under each plate, about 3 mm of it, cut the friction enough for the steppers to pull it out.' },
    ] },
    { type: 'media', layout: 'grid', cols: 3, items: [
      { i: 'custom-steel-plates.webp', c: 'One of my 3 mm steel build plates (Aug 14, 2024)' },
      { i: 'custom-plate-in-printer.webp', c: 'A custom plate on the printer’s bed' },
      { i: 'printing-on-custom-plate.webp', c: 'Printing on a custom plate: the printer at temperature, the bare steel plate on the bed (Aug 26, 2024)' },
    ] },

    { type: 'iterations', id: 'timeline', h: 'How it got here', items: [
      { label: 'Feb 2024', title: 'Concept', p: [
        'Four electromagnets over a plate, then the magnet plate on two rails, checked with FEA before I cut any metal.',
      ], media: [{ i: 'concept-rod-guided.webp', c: 'The rail concept in CAD (Feb 11, 2024)' }] },
      { label: 'Mar 2024', title: 'Frame, turntable and slides', p: [
        'I cut the triangular pockets in the aluminum side plates on a CNC router. By March 14 the frame, turntable and slides were assembled, with a piece of cardboard standing in for a plate, and the extension belts went on over the next few days.',
      ], media: [
        { v: 'cnc-pocketing.mp4', c: 'CNC pocketing a lattice side plate (Mar 8, 2024)' },
        { i: 'chassis-frame.webp', c: 'The lattice frame (Mar 13, 2024)' },
        { i: 'first-mechanical-assembly.webp', c: 'Frame, turntable and slides together for the first time (Mar 14, 2024)' },
      ] },
      { label: 'Mar to Apr 2024', title: 'Magnet tests', p: [
        'First magnet tests on a stock plate, then grab tests by hand inside the printer, before any motor drove the arm.',
        { problem: 'The stock plates would not hold reliably (see above). This stayed open until August.' },
      ], media: [{ v: 'stock-plate-magnet-test.mp4', c: 'An early magnet test on a stock plate, my hand underneath to catch it (Mar 28, 2024)' }] },
      { label: 'Apr to Jun 2024', title: 'Drivers and the first powered moves', p: [
        'The first drivers were TMC5160s, which I fried. By June I had two TMC2209s on my own perfboard, and the arm ran automatic sequences: turn, reach out, pull back, turn back.',
      ], media: [
        { v: 'two-axis-sequence-test-2x.mp4', c: 'An automatic turn, reach and retract sequence, at 2x (June 2024)' },
      ] },
      { label: 'Jul 2024', title: 'Wiring, bays and the printer', p: [
        'Drag chains for both axes, printed chain mounts, the printed electronics bays and the power switch. On July 29 the arm drove into the printer under its own power for the first time.',
      ], media: [
        { i: 'first-integration-at-printer.webp', c: 'The assembled robot in front of the printer (Jul 29, 2024)' },
        { v: 'first-reach-into-printer.mp4', c: 'Driving into the printer under its own power (Jul 29, 2024)' },
      ] },
      { label: 'Aug 2024', title: 'Custom plates, holders and the full swap', p: [
        'The steel plates, the tape, a third driver so each extension motor has its own, printed braces that tie the printer to the robot, and the two plate holders. The holders were too big for the print bed, so I split each one into printed pieces (five for the right-hand one) and bolted them together. In late August it ran the full swap.',
      ], media: [
        { i: 'custom-plate-on-grasper.webp', c: 'A custom plate held by the magnets after coming out of the printer, the firmware open on the laptop (August 2024)' },
        { v: 'custom-plate-into-holder.mp4', c: 'Seating a custom plate in a printed holder (Aug 21, 2024)' },
        { i: 'plate-holder-in-hand.webp', c: 'One of the printed plate holders' },
      ] },
    ] },

    { type: 'prose', id: 'results', h: 'Results', p: [
      'The full cycle runs with nobody there: reach in, grab, pull out, park the used plate, pick up a fresh one, load it. My team’s usable print time went from about 7 hours a day to 24. Replac3d finished in the top 12 of 2,042 projects worldwide in Hack Club Arcade (summer 2024) and won a $300 Polymaker sponsorship.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'final-setup.webp', c: 'The finished setup: printer, robot and both plate holders (Aug 22, 2024)' },
      { i: 'cad-render-final-system.webp', c: 'The same layout in my CAD' },
    ] },

    { type: 'prose', id: 'next', h: 'What I would change', p: [
      { next: 'Grab the plate instead of using electromagnets. I chose electromagnets partly because they were cool; gripping the plate, or hooking the two small holes it already has, would have been the better design.', title: 'Grip' },
      { next: 'Far less CNC. Almost none of these parts had any business being CNC machined.', title: 'Make it simpler' },
      { next: 'Build it much lighter. It is badly overbuilt: it could probably hold 1,000 lb.', title: 'Stop overbuilding' },
      { next: 'Find a better way to home both axes than setting them by hand.', title: 'Homing' },
    ] },
  ],
};
