// 5-Bar Pen Plotter: rich page. Facts are Jerry's (src/projects.mjs, his checklist, /home/claude/work/
// answers.md), his public code (github.com/jerryli08/5bar) and CAD, or what the media plainly shows.
// Numbers computed from the CAD's link lengths and the code's constants say so on the page.
// Held back until Jerry answers (/home/claude/work/5-bar/questions.md): whether the filmed square
// ran cartesianTest (Q1), what caused and fixed the missed corner in IMG_5340 (Q2), why the arms
// went from slots to trusses (Q3), the second perfboard (Q4), IMG_0009 (Q5), every "next time"
// idea (Q6: none are his yet, so there are no Next time blocks), the motor-limit model of rounded
// corners (Q7), and how the name's path was made (Q8).
const M = '/assets/models/pen-plotter';
const GH = 'https://github.com/jerryli08/5bar';

export default {
  summary: {
    stats: [
      { v: '100 mm', l: 'Every link, and the motor spacing' },
      { v: '0.1125°', l: 'Per microstep: 3,200 per motor turn' },
      { v: '2 motors, 5 joints', l: 'A parallel robot with two degrees of freedom' },
      { v: '40 waypoints', l: '"Jerry Li" in 9.9 s of program time' },
    ],
    text: [
      'I built a 5-bar pen plotter to learn how the linear algebra behind robot arms turns into motion. Two NEMA 17 steppers on TMC2209 drivers turn two 3D printed arms, two more links join them at the pen, and an Arduino Nano turns every x-y point into two motor angles with inverse kinematics, solved again on every pass through the loop so the pen follows straight lines.',
      'I designed it in Fusion 360, printed it, wired it on perfboard and wrote the code in C++, from single-motor tests up to a program that writes my name. The code is [on my GitHub](https://github.com/jerryli08/5bar).',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-writes-jerry-li.mp4', c: 'Writing "Jerry Li" from a list of x-y points' },
      { v: 'hero-draws-square.mp4', c: 'Drawing a square' },
    ],
  },
  sections: [
    { type: 'prose', id: 'five-bar', h: 'What a 5-bar is', p: [
      'A 5-bar linkage has five links counting the base: the two motor arms, the two forearms, and the fixed distance between the motors. The motors sit side by side and each turns one arm. Each forearm hangs off the end of an arm, and the two forearms meet at the pen.',
      'With both motors held still the loop is rigid, so two motor angles give exactly one pen position for a given way the loop is folded. That makes it a parallel robot: both motors share the job of placing one point, and neither motor rides on the other, so the only moving parts are four thin plates.',
      'In the CAD the two motor shafts are 100 mm apart and all four links are 100 mm hole to hole. My code uses the same two constants, `BASE_SEPARATION = 100` and `ARM_LENGTH = 100`. Equal links make each side of the robot an isosceles triangle, which keeps the inverse kinematics down to a few lines of trigonometry.',
    ],
      media: [
        { i: 'still-linkage-top-down.webp', c: 'From above: two motors, four links, five joints' },
        { v: 'linkage-top-down.mp4', c: 'Both motors reshape the pentagon; the pen joint is where the two forearms meet' },
      ] },

    { type: 'scrolly', id: 'plotter', module: 'plotter', stepHeight: '100vh', poster: `${M}/poster-plotter.webp`,
      h: 'The real linkage, writing my name',
      p: ['My CAD, turning about its real pivots. Scrolling is the program clock: at every moment the pen target is what my final sketch computes, my inverse kinematics turns it into two motor angles, and the ink follows the pen. The readout shows the numbers the Arduino works with.'],
      steps: [
        { h: 'Home', p: [
          'Two NEMA 17s, 100 mm apart, each turn a 100 mm arm, and two 100 mm forearms meet at the pen. The code has no homing: when the program starts it calls this pose home, both arms straight out at 90° and the pen at (50, 186.6) mm, so the arms have to start here.',
          'The faint dashed line is the path the program will follow. The blue dashed line is the fold line, where the two forearms fall into one straight line. It matters later.',
        ] },
        { h: 'J and e', p: [
          'From home the pen travels to the start of the J. The pen never lifts, so that travel is drawn too. Every stroke of the name takes 200 ms: on each pass through the loop the program works out how far through the stroke it is, puts the target that far along the straight line, solves the inverse kinematics and sends both motors there.',
        ] },
        { h: 'r and r', p: [
          'With no pen lift the whole name is one continuous line. Every letter starts and ends on the baseline at y = 130 mm, and strokes like the arm of each r go out and back over themselves.',
        ] },
        { h: 'y', p: [
          'The tail of the y goes down to y = 100 mm, the closest the name comes to the fold line. Watch the pen travel per microstep in the readout: about 0.2 mm in the letters, up to 0.7 mm at the bottom of the y.',
        ] },
        { h: 'L, i and home', p: [
          '40 path entries and 9.9 s of program time: a name 140 mm wide with 20 mm letters. The last move takes the pen home in 1.5 s.',
        ] },
        { h: 'The test square', p: [
          'Next, the 75 mm square from my first x-y program, run here through the final loop: straight lines in x and y, inverse kinematics on every pass. Its bottom edge, at y = 75 mm, lies just past the fold line.',
        ] },
        { h: 'Through the fold line', p: [
          'Coming down the right edge, the pen crosses the fold line at y = 76.3 mm. There the two forearms lie in one straight line (lit blue) and the motors no longer pin the pen down: the closer it gets, the further one microstep moves the pen.',
          'Past the line, the pen joint sits on the motors\' side of the elbows. The linkage has folded through.',
        ] },
        { h: 'Along the bottom and home', p: [
          'The whole bottom edge runs 1.3 to 11.6 mm past the fold line, and the left edge folds back through it at y = 76.3 mm on the way up. The math stays smooth the whole way. How far one step moves the pen does not.',
          { note: 'Computed from my CAD\'s link lengths and my code. How my first program drew this square is [further down](#lines).' },
        ] },
      ],
      caption: 'The linkage is my Fusion CAD with its real 100 mm links and pivot axes; the motion is my code\'s inverse kinematics, motor limits and path timing, with the scroll as the clock. The grid is 10 mm. The pen, paper and board are not in the CAD, so the ink is drawn on the table under the pen.' },

    { type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', stepHeight: '90vh', poster: `${M}/poster-cad.webp`,
      h: 'The CAD',
      p: ['My Fusion 360 model, in the pose it was saved in. Screws are left out.'],
      data: {
        models: [{ label: 'Pen plotter', src: `${M}/plotter.glb` }],
        explode: [
          { parts: 'mounting_hub', dir: [0, 1, 0], dist: 0.01 },
          { parts: 'base_arm', dir: [0, 1, 0], dist: 0.022 },
          { parts: 'spacer', dir: [0, 1, 0], dist: 0.034 },
          { parts: 'right_forearm', dir: [0, 1, 0], dist: 0.046 },
        ],
        drift: 10,
      },
      steps: [
        { h: 'Two motors, four links', view: { azimuth: 128, elevation: 30, pad: 1.08,
          labels: [{ text: 'Left motor arm', part: 'left_base_arm' }, { text: 'Right motor arm', part: 'right_base_arm', side: 'l' }, { text: 'Pen forearm', part: 'left_pencil_forearm' }, { text: 'Right forearm', part: 'right_forearm' }] },
          p: ['Both NEMA 17s sit in one printed housing. Each turns a 3 mm printed arm, and the two forearms meet at the pen joint. Every link is 100 mm between its pivots.'] },
        { h: 'Three levels', view: { azimuth: 100, elevation: 22, pad: 1.6, explode: 1,
          labels: [{ text: 'Right forearm, top', part: 'right_forearm' }, { text: 'Spacer', part: 'spacer', side: 'l' }, { text: 'Motor arms, middle', part: 'right_base_arm' }, { text: 'Pen forearm, bottom', part: 'left_pencil_forearm', side: 'l' }] },
          p: ['Pulled apart along the joint axes, in their real order. The 3 mm plates sit on three levels: both motor arms in the middle, the pen forearm under its arm, and the right forearm on top of its arm. A 3 mm spacer fills the gap between the two forearms at the pen joint.'] },
        { h: 'The pen is on the joint axis', view: { azimuth: 262, elevation: 10, pad: 3.2, focus: 'spacer', cut: { normal: [1, 0, 0], at: 0.029 },
          highlight: [{ parts: 'spacer', color: '#7fd4ff', intensity: 0.5 }],
          labels: [{ text: 'Pen tube', at: [-0.151, 0.044, -0.0217] }, { text: 'Spacer', part: 'spacer', side: 'l' }, { text: 'Pen forearm', at: [-0.1457, 0.0525, -0.0157], side: 'l' }, { text: 'Right forearm', at: [-0.1469, 0.0585, -0.0286] }] },
          p: ['Cut through the pen joint. The pen tube hangs under the pen forearm, and its 6.4 mm bore is concentric with the joint. So the pen tip is exactly the point the inverse kinematics solves for, with no offset to correct.'] },
        { h: 'Direct drive', view: { azimuth: 150, elevation: 16, pad: 2.6, focus: 'mounting_hub_1',
          highlight: [{ parts: 'mounting_hub', color: '#ff6b35', intensity: 0.5 }] },
          p: ['Each motor arm bolts to a flange hub on the 5 mm motor shaft, with three screws. There are no belts or gears, so the arm turns exactly as far as the motor: 0.1125° per microstep, about 0.2 mm at the elbow (computed).'] },
        { h: 'One part sets the spacing', view: { azimuth: 60, elevation: 26, pad: 1.1,
          highlight: [{ parts: '_0_1_1_15_', color: '#ff6b35', intensity: 0.45 }] },
          p: ['Both motors sit in one printed housing with lattice sides, so the 100 mm between the motor shafts, the number all of the math depends on, is set by a single part.'] },
      ] },

    { type: 'prose', id: 'build', h: 'Building it', p: [
      'I 3D printed the housing, the arms and the forearms. The housing holds both motors shafts up, and the flange hubs sit on the shafts under the arms.',
      'The first design in Fusion had arms with long slot cutouts. The final arms are 3 mm plates with triangular cutouts.',
    ],
      media: [
        [{ i: 'printing-motor-housing.webp', c: 'Printing the motor housing' }, { i: 'printed-motor-housing.webp', c: 'The housing off the printer, with lattice sides' }],
        [{ i: 'motors-in-housing.webp', c: 'Both motors in the housing, shafts up' }, { i: 'printed-parts-laid-out.webp', c: 'Printed arms and a motor plate' }],
      ] },

    { type: 'scrolly', id: 'ik', module: 'ik', width: 'wide', side: 'left', stepHeight: '85vh',
      h: 'Inverse kinematics: two triangles',
      steps: [
        { h: 'Cartesian in, two angles out', p: [
          'Put the left motor at (0, 0) and the right motor at (100, 0), in mm, with y pointing away from the motors. The program is given a pen point (x, y) and has to find the two motor angles that put the pen there.',
        ] },
        { h: 'The left triangle', p: [
          'The left arm, the pen forearm and the line from the left motor to the pen make a triangle with two 100 mm sides. Call that line D1. It points at atan2(y, x), and because the triangle is isosceles the arm sits acos(D1 / 200) to one side of it.',
        ] },
        { h: 'The right triangle', p: [
          'The same on the right, measured from (100, 0): the angle of D2, minus its own half-angle. Two lines of trigonometry per arm, and nothing else.',
        ] },
        { h: 'Two answers per arm', p: [
          'Each triangle folds either way, so every reachable point has two whole-robot solutions: both elbows out, or both in. My code builds both, throws out any that break a motor limit (left arm 15° to 270°, right arm −90° to 165°) and keeps the one with the larger left minus right angle: the arms spread widest.',
        ] },
        { h: 'Out of reach', p: [
          'If either D is more than 200 mm, the two 100 mm links cannot reach. The code then holds both motors where they are, so the pen stops at the edge of the workspace while the target keeps going.',
        ] },
      ],
      caption: 'Top view, drawn to scale. The numbers are computed live by a copy of my `computeAll5BarSolutions` and `selectBestSolution`.' },

    { type: 'prose', id: 'code', h: 'The code, built up one sketch at a time', p: [
      `The [repo](${GH}) is five Arduino sketches in C++, each one step further than the last. All of them drive the two TMC2209s through the AccelStepper library in step and direction mode, at 3,200 microsteps per revolution, a 4,000 steps/s speed limit and 8,000 steps/s² acceleration: 450°/s and 900°/s² at the arm (computed).`,
      { ol: [
        '`stepperSetupTest`: enable both drivers and move one motor at a time, 320 microsteps on the left and 640 on the right, and back.',
        '`simultaneousTest`: the same moves, but calling each motor\'s `run()` inside `loop()` instead of blocking, so both motors move at once.',
        '`stepperTimedTest`: moves written as joint angles with a duration. Each loop works out how far through the move it is and sets both targets that far along, so both arms arrive together.',
        '`cartesianTest`: the first x-y program. It solves the inverse kinematics for each corner of a 75 mm square, printing both solutions to the serial monitor, then moves between the corners with the timed joint moves from the step before.',
        '`cartesianPathing`, the final one: every pass through `loop()` finds the point on the current line segment for the elapsed time, solves the inverse kinematics for that point, and sends both motors there. This is the program that writes "Jerry Li".',
      ] },
      'A path is an array of x, y and a duration in ms for each move. The final loop, in order:',
      { pre: 'progress = elapsed / duration                    (0 to 1 along this segment)\nx = start.x + (end.x - start.x) * progress\ny = start.y + (end.y - start.y) * progress\ncomputeAll5BarSolutions(x, y)                    both solutions, degrees\nidx = selectBestSolution(sols)                   legal, arms spread widest; none: hold\nleftMotor.moveTo(degToSteps(left))               degrees to microsteps\nrightMotor.moveTo(degToSteps(right))\nleftMotor.run(); rightMotor.run()                AccelStepper steps toward the targets\nelapsed >= duration: next segment' },
    ],
      media: [
        { v: 'motor-test-joint-moves.mp4', c: 'An early motor test: the arms start straight out and one swings wide' },
        { v: 'motor-test-sweep.mp4', c: 'The arms sweeping through poses, with the pen holder empty' },
      ] },

    { type: 'scrolly', id: 'lines', module: 'lines', width: 'wide', side: 'right', stepHeight: '90vh',
      h: 'Straight on paper is not straight in motor angles',
      steps: [
        { h: 'Two corners', p: [
          'The top edge of the 75 mm square from `cartesianTest`, from (12.5, 150) to (87.5, 150). The inverse kinematics gives both motor angles at each corner.',
        ] },
        { h: 'The first program', p: [
          { problem: '`cartesianTest` solved the inverse kinematics only at the corners, then moved both motor angles in a straight line between them. For a 5-bar a straight line in motor angles is a curve on paper: with my link lengths the top edge bows about 4 mm.', title: 'Straight in motor angles is curved on paper' },
        ] },
        { h: 'The final program', p: [
          { fix: '`cartesianPathing` moves the target in a straight x-y line and solves the inverse kinematics again on every pass through the loop, so every short move of the motors heads for a point on the straight edge.' },
        ] },
        { h: 'Worse near the fold line', p: [
          'Both bottom corners sit just past the fold line. Moving the motor angles in a straight line between them asks for elbow positions up to 205.4 mm apart, further than two 100 mm forearms can reach: no pose of the real linkage matches those angles. The final program\'s straight x-y line takes the same edge without trouble, as in the drawing run at the top of the page.',
          { note: 'Computed from my code and my CAD\'s link lengths: angles from the inverse kinematics at the corners, pen positions from the forward kinematics of the in-between angles.' },
        ] },
      ] },

    { type: 'prose', id: 'ink', h: 'Getting ink on paper', p: [
      'The plotter stands on a stack of books and the paper lies on notebooks in front of it. The pen sits in the tube on the pen joint, pointing straight down.',
      { problem: 'On the first run the arms traced the square in the air, and the pen left no line.', title: 'The pen never touched the paper' },
      { fix: 'One more notebook under the paper brought it up to the pen, and the next run drew.' },
      { problem: 'There are only two motors, so the pen is down for the whole program, and anything drawn is one continuous line, including the moves to and from home.', title: 'No way to lift the pen' },
      { fix: 'The name\'s path works with that: every letter starts and ends on the baseline, and strokes like the arm of each r go out and back over themselves.' },
    ],
      media: [
        { v: 'first-run-no-contact.mp4', c: 'First run: the right motion, but no line' },
        { v: 'run-on-raised-paper.mp4', c: 'Paper raised one notebook: now the pen draws' },
        [{ i: 'still-jerry-li-result.webp', c: 'One continuous line: the joins run along the baseline' }, { v: 'run-hand-holds-paper.mp4', c: 'The paper is loose, so a hand keeps it still' }],
      ] },

    { type: 'scrolly', id: 'library', module: 'library', stepHeight: '95vh', poster: `${M}/poster-library.webp`,
      h: 'A library of shapes',
      p: ['The same linkage and the same loop, running a library of drawings. The chips at the top of the readout are the library: my name and the square are the exact paths from my code (drawn above); the other five are new, drawn the same way as one continuous line and placed in the stiff middle of the workspace.'],
      steps: [
        { h: 'Circle', p: ['A 60 mm circle as 72 short straight moves of 40 ms. Between two entries the loop still interpolates in x and y, so the pen follows the polygon exactly; at this spacing it reads as a circle.'] },
        { h: 'Heart', p: ['Two lobes from one parametric curve, starting and ending at the dip in the top so the travel from home joins it cleanly.'] },
        { h: 'Triangle', p: ['An equilateral triangle with 60 mm sides: three straight x-y lines, each with the inverse kinematics solved on every pass.'] },
        { h: 'House', p: ['One stroke: the roof, the walls, a door drawn up from the floor line, and the line under the roof last.'] },
        { h: 'UIUC', p: ['Block letters 30 mm tall in the style of my name: joined along the baseline, with strokes that retrace themselves.'] },
      ],
      caption: 'New drawings (circle, heart, triangle, house, UIUC) are paths in the same format as my code: x, y and a duration per move, from home and back. Every point of every path solves with the arms-spread-wide solution, inside the motor limits.' },

    { type: 'scrolly', id: 'fold', module: 'fold', width: 'wide', side: 'left', stepHeight: '90vh',
      h: 'Where the linkage is weak',
      steps: [
        { h: 'One microstep, everywhere', p: [
          'The map shows how far one microstep of one motor moves the pen at each point it can reach. Brighter means further. Most of my name sits in the dark, stiff middle, where one step moves the pen 0.14 to 0.27 mm.',
        ] },
        { h: 'In the letters', p: [
          'At the top corner of the square the pen moves about 0.2 mm per step, close to the 0.2 mm the elbow moves. Here both motors pin the pen down well.',
        ] },
        { h: 'Toward the fold line', p: [
          'Down the square\'s right edge the forearms turn toward one straight line, and a step moves the pen further and further: 3 mm at y = 80, and without limit at y = 76.3, where they line up. There the pen can slide across that line (the blue arrows) with both motors standing still.',
        ] },
        { h: 'Past it', p: [
          'Past the line the pen joint opens beyond 180°: the linkage has folded through. At the square\'s bottom corners one microstep moves the pen about 8 mm, and the whole bottom edge lies in this band. My name never comes closer than y = 100 mm.',
          { note: 'Computed from my CAD\'s link lengths and the 0.1125° microstep, with the velocity equations of the loop. Nothing here was measured on the plotter.' },
        ] },
      ] },

    { type: 'prose', id: 'electronics', h: 'Electronics', p: [
      'An Arduino Nano and two TMC2209 stepper drivers sit on a perfboard, with screw terminals for the motor leads. Each driver takes step, direction and enable from the Nano: pins 9, 8 and 10 for the left motor, and 3, 2 and 4 for the right. The drivers run 1/16 microstepping, which turns the motors\' 200 full steps per revolution into 3,200. Both drivers are enabled (EN held low) from the start of the program to the end.',
    ],
      media: [
        [{ i: 'perfboard-nano-drivers.webp', c: 'The Arduino Nano and two stepper drivers on perfboard' }, { i: 'perfboard-wiring.webp', c: 'Wired up, with screw terminals for the motors' }],
      ] },

    { type: 'iterations', id: 'timeline', h: 'How it came together', items: [
      { label: 'May 21, 2025', title: 'CAD and the first print', p: ['The first design in Fusion 360, with slotted arms. The motor housing went on the printer the same evening.'],
        media: [{ i: 'cad-render-slotted-arms.webp', c: 'My first render, May 21' }] },
      { label: 'May 23', title: 'First assembly', p: ['Both motors in the housing and the whole linkage together for the first time. The perfboard with the Nano and both drivers followed on May 27 and 28.'],
        media: [{ i: 'first-assembly.webp', c: 'First full assembly, May 23' }] },
      { label: 'Tests', title: 'Moving the motors', p: ['The test sketches go from one motor at a time, to both together, to timed joint moves, before any x-y math.'],
        media: [{ i: 'still-arm-swung-out.webp', c: 'An early motor test: the left arm swung out' }] },
      { label: 'Drawing', title: 'Ink on paper', p: ['The first run missed the paper, and one more notebook fixed it. Then the square and, with the final sketch, my name. The code is in the repo\'s one commit, on June 13, 2025.'],
        media: [{ i: 'still-setup-on-books.webp', c: 'The setup: the plotter on a stack of books, the paper in front of it' }] },
    ] },

    { type: 'media', id: 'results', h: 'Results', p: ['The plotter draws whatever it is given as x-y points. The final program writes "Jerry Li", 140 mm wide with 20 mm letters, from 40 waypoints in 9.9 s of program time.'], layout: 'row', items: [
      { v: 'jerry-li-side-angle.mp4', c: 'Writing my name, from the side' },
      { i: 'still-square-result.webp', c: 'The square after a run: the edges are not straight, and a line trails off one corner' },
    ] },
  ],
  assets: [`${M}/`],
};
