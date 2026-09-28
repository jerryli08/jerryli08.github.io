// FTC CENTERSTAGE robot (S.T.A.T.I.C., FTC 18996), 2023-24. Rich page.
// There is no CAD file of this robot (Jerry's checklist: "CAD - dont have at the moment"), so there
// is no 3D and no stand-in geometry. The two scrollies are animated diagrams (2D, webgl: false),
// driven only by the scroll and built from the team's code:
//   indexer  the backdrop and the deposit's sideways stops, values from the code
//   auto     the autonomous path from the code's Road Runner poses
// Jerry, Sept 27, 21:12: the best scroll animation sits right below the hero, so "auto" comes first.
// Jerry, Sept 27: real footage plays as video ("the scrolling should only advance CAD animations"),
// so "One cycle, start to finish" is text with the real clips beside it (the frame-by-frame cycle
// scrolly and its stills were removed; cycle-lift-place.mp4 is the last 3.5 s of hero-auto-backdrop).
// The season timeline slideshow was removed (scrolling through separate photos is awkward): every
// one of its photos is already on the page beside its own text, and its results are in "How the
// season went" and "Official results". The two calculations use only constants from the public
// code and the REV encoder's published counts per turn.
// Copy uses only what Jerry stated (projects.mjs, his checklist, answers.md), what the media plainly
// shows, the public code (github.com/CMP-18996/STATIC-CENTERSTAGE, described as the team's code) and
// the official FIRST results for 18996 (phase A counted the records from the match scores).
// Left out until Jerry answers (see /home/claude/work/ftc-23-24/questions.md): who designed each
// subsystem and wrote the code, why intake 1 was replaced, what fixed the transfer, the cracked
// pulley's place and fix, the hang fix, whose CNC router it was, and every "next time" item.
// Not repeated: projects.mjs says the robot was "only finished in time for the last competition";
// the official results show it scoring from the third event on (see projects-patch.md).
const REPO = 'https://github.com/CMP-18996/STATIC-CENTERSTAGE';
const RESULTS = 'https://ftc-events.firstinspires.org/2023/team/18996';

export default {
  summary: {
    stats: [
      { v: '0-5 to 3-2', l: 'Qualification record, first event to last' },
      { v: '208-151', l: 'Our alliance\'s best score, at the Chesapeake Championship' },
      { v: '7th of 27', l: 'Rank in our Chesapeake Championship division' },
      { v: '6 awards', l: 'Judged awards in 4 events, including Inspire 2nd Place' },
    ],
    text: [
      'CENTERSTAGE was the 2023-24 FIRST Tech Challenge game, and this is the robot my team, S.T.A.T.I.C. (FTC 18996), built for it. It was our first season with CAD, and I was overly ambitious with the design: a flap intake, two cradles with color sensors, an arm that swings back into the robot to grab both pixels at once, a two-motor lift, a deposit that shifts sideways to line up with the backdrop, a drone launcher and hooks for hanging.',
      'The robot came together over the season. We lost every qualification match at our first two events, then went **3-2 at both of the last two**, won the **Inspire Award 2nd Place** at the Laurel 2 Qualifier, and ranked **7th of 27** in our division at the Chesapeake Championship.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-auto-backdrop.mp4', c: 'The finished robot running its autonomous on our home field: it leaves one pixel by the red team prop, drives to the backdrop and swings its arm up to place the other' },
      { v: 'hero-floor-to-deposit.mp4', c: 'Jan 19, 2024: the flaps pull a white and a purple pixel in off the floor, and the arm lifts both out of the robot together' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ the autonomous (right below the hero)
    { type: 'scrolly', id: 'auto', module: 'auto', webgl: false, stepHeight: '80vh', poster: 'auto-purple-pixel.jpg',
      h: 'The autonomous, from the code',
      p: ['Each match opens with an autonomous period, when the robot drives itself. Ours finds the team prop with the camera, leaves the purple pixel on the matching spike mark and places the yellow one on the backdrop. This is our red close routine with the prop on the left, drawn from the Road Runner poses in our code (inches, heading in degrees).'],
      steps: [
        { h: 'Find the prop', p: ['While the robot waits for the start, the camera thresholds each frame in HSV for red, finds the largest blob and votes by where its center falls: left of 100 px, left of 437.5 px, or further right. It decides after 15 votes; here, LEFT.'] },
        { h: 'Purple pixel on the spike', p: ['From the start pose (12, -61), facing into the field, the robot drives to (15, -41) and turns 30 degrees toward the left spike mark on one line, and the arm leaves the purple pixel there.'] },
        { h: 'To the backdrop', p: ['One more line takes it to (42, -36), turning back to 0 degrees to square up to the backdrop. With the prop on the right it first detours through (36, -57).'] },
        { h: 'Line up on the tag', p: ['The camera reads the center AprilTag, and the code splines to a pose 5.5 in short of it along the measured range, shifted 8.5 in to the left for a left prop (6.5 in to the right for a right one), then pauses 0.25 s.'] },
        { h: 'Yellow pixel', p: ['The lift goes to its first height, 100 ticks, the arm tips to its drop angle and both grabbers open: the yellow pixel lands on the left side of the backdrop.'] },
        { h: 'Back for more', p: ['The four official autonomous programs in the code stop there, with two pixels. An experimental routine goes on: reversed splines under the truss through (27, -6) and (-40, -6) to the stacks at (-62, -17), with the intake on and its front bar at the third stack height, then back to the backdrop.'] },
      ],
      caption: 'Robot poses, headings, offsets and thresholds are from our code; the robot is an 18 in footprint. Field elements are placed approximately, splines are drawn through the code\'s waypoints, and the tag step assumes the camera sees the center tag straight ahead, since the real pose comes from what it measures.' },

    // ------------------------------------------------------------------ the game
    { type: 'prose', id: 'game', h: 'The game, and the robot', p: [
      'In CENTERSTAGE, robots pick up hexagonal game pieces called pixels, from the floor or from stacks, carry them under the truss and place them on the backdrop, a slanted board of staggered rows. Three touching colored pixels, all one color or all different, score extra as a mosaic. Each match starts with an autonomous period and ends with launching a paper airplane drone and hanging from the rigging.',
      '2023-24 was our first season with CAD, and we drew the whole robot in Fusion 360. This page follows two pixels through it, then goes through each mechanism, the code, and how the season went. I do not have the CAD file of this robot at the moment, so everything here is built from our photos, clips, renders and code.',
    ], media: [{ i: 'robot-final-side.webp', c: 'Feb 17, 2024: the finished robot at a backdrop, lift and arm up, the flap intake at the front' }] },

    // ------------------------------------------------------------------ one cycle
    { type: 'prose', id: 'cycle', h: 'One cycle, start to finish', p: [
      'The robot scores with one loop, and each stage of it is a few lines of our code. The clips beside the text are the real robot; the numbers in brackets are servo positions from the code, on the 0 to 1 scale a servo is commanded on.',
      '**1. Intake.** A roller of rubber tubing flaps at the front pulls pixels in off the floor. The driver runs it on the right trigger, and two servos set the height of the front bar: one position for the floor (0.008) and four more, 0.015 to 0.042, for taking pixels off the top of a stack. While the intake runs, the code turns the drive controls around, so the intake side is the front for the driver.',
      '**2. Cradles and color sensors.** The two pixels land side by side in two printed cradles shaped like the pixel, each with a color sensor under it ([how it reads the colors](#cradles)). As soon as both cradles read a pixel, both controllers rumble for 0.3 s, the roller runs backward for 0.6 s, and the Driver Station shows both colors.',
      '**3. Transfer.** The code opens both grabbers and the intake cover, drives the lift down to its limit switch and parks the arm (0.24), then swings the arm back into the robot onto the pixels (0.11). Both grabbers close, open for 60 ms and close again, and the arm lifts out with both pixels at once.',
      '**4. Lift and arm.** The arm swings up and out toward the backdrop (0.71), and the wrist servo turns the grabbers to the placing angle (0.37). Two motors run the lift up its two slide packs; our final teleop steps it through ten heights on the D-pad, from 100 to 1,900 encoder ticks.',
      '**5. Place.** Each grabber opens on its own (open 0.75, closed 0.25), one on each bumper of the second controller, so the two pixels can go to two different spots. In autonomous the arm tips to its drop angle (0.73) and both open. Then one button sends everything back for the next two: lift down to its limit switch, deposit to the center of its rail, arm folded, cover closed.',
    ], media: [
      { v: 'color-sensor-telemetry.mp4', c: 'Jan 19, 2024: intake and cradles. Pixels go in, and the Driver Station reads "Slot One: Green, Slot Two: Purple"' },
      { v: 'transfer-fixed-two-pixels.mp4', c: 'Jan 19, 2024: the transfer. The arm comes down, grips, and lifts out with both pixels' },
      { v: 'cycle-lift-place.mp4', c: 'Lift, arm and place, at the end of the autonomous run at the top of the page: the arm swings up to the backdrop' },
    ], side: 'left' },

    // ------------------------------------------------------------------ designing it
    { type: 'prose', id: 'design', h: 'Designing it: our first season in CAD', p: [
      'We drew the whole robot in Fusion 360, and its parts came out of it three ways: 3D printed, laser cut in aluminum by Fabworks, and, from late December, machined on a benchtop CNC router.',
      { h: 'The arm link' },
      'The arm link is a good example. It started as a sketch in Fusion with the cutouts drawn in, and was laser cut in 6061-T6 aluminum by Fabworks with a pattern of triangular truss cutouts.',
    ], media: [
      { i: 'cad-render-dec8.webp', c: 'Dec 8, 2023: the whole robot in Fusion 360: lattice-cut sheet chassis, two angled slide packs, the first intake at the front' },
      [{ i: 'cad-arm-link-drawing.webp', c: 'Nov 28, 2023: the bent arm link sketched in Fusion, cutouts drawn in' }, { i: 'arm-link-cut.webp', c: 'The arm link as cut, with triangular truss cutouts' }],
    ] },
    { type: 'prose', id: 'hubs', p: [
      'Fabworks cut our sheet parts. A box on Nov 18 held a lattice-cut plate like the chassis sides, and a later order lists the arm link, the intake arms, a lift mount and an intake motor side plate in the same aluminum, plus mounts for MGN rail blocks in 1008 steel, all laser cut with hole operations.',
      { problem: 'On my POWERPLAY off-season robot earlier in 2023, my first project in CAD, I printed the bores straight into the pulleys, and they stripped out completely on the 5 mm hex shafts.', title: 'Printed bores strip' },
      { fix: 'Aluminum hubs bolted into the 3D-printed pulleys. I never made that mistake again: on this robot the printed pulleys and spools are built around aluminum hubs, so the hex shaft drives metal instead of plastic.', title: 'Aluminum hubs inside printed pulleys' },
      'Printed parts still had their limits. On Jan 12, the night before our second qualifier, a printed pulley cracked through beside its aluminum hub.',
    ], media: [
      [{ i: 'fabworks-sheet-parts.webp', c: 'Nov 18, 2023: laser-cut parts from Fabworks: a perforated plate, a lattice-cut side plate and small brackets' }, { i: 'still-fabworks-order.webp', c: 'Our Fabworks order: the curved arm link in 6061-T6 aluminum and MGN rail block mounts in 1008 steel' }],
      [{ i: 'pulley-aluminum-hub.webp', c: 'Nov 17, 2023: a printed spool built around a bolted-in aluminum hub' }, { i: 'pulley-broken.webp', c: 'Jan 12, 2024: a printed pulley cracked beside its aluminum hub' }],
    ], side: 'left' },
    { type: 'prose', id: 'cnc', p: [
      'From late December we also machined aluminum on a benchtop CNC router. On Dec 29 it engraved and drilled a plate with our STATIC logo, held down with green printed clamps.',
    ], media: [[{ v: 'cnc-first-plate.mp4', c: 'Dec 29, 2023: the router engraving and drilling an aluminum plate held in green printed clamps' }, { i: 'cnc-static-plate.webp', c: 'The finished plate, STATIC engraved' }]] },

    // ------------------------------------------------------------------ chassis
    { type: 'prose', id: 'chassis', h: 'Chassis and drive', p: [
      'The chassis is two laser-cut aluminum side plates with lattice cutouts, with the mecanum wheels running inside them and the control hubs standing on edge on printed towers. The drive constants in our code are for 435 RPM motors.',
      'For position the code uses three unpowered tracking wheels instead of the drive wheels: two parallel wheels 12.59 in apart and one sideways wheel 6 in ahead of center, each on an 8,192-count encoder.',
      { calc: 'How fine is one tick of a tracking wheel?',
        given: [
          ['Tracking wheel radius', '0.73 in', `[our code](${REPO}/blob/main/TeamCode/src/main/java/org/firstinspires/ftc/teamcode/common/drive/StandardTrackingWheelLocalizer.java)`],
          ['Counts per turn of the encoder', '8,192', '[REV Through Bore Encoder](https://www.revrobotics.com/rev-11-1271/)'],
          ['Distance between the two parallel wheels', '12.59 in', 'our code'],
        ],
        work: [
          'One turn of a wheel: 2π × 0.73 in = 4.59 in of travel',
          'One tick: 4.59 in / 8,192 = 0.00056 in (0.014 mm)',
          'Heading: one tick of difference between the two parallel wheels is 0.00056 in / 12.59 in = 0.000044 rad = 0.0026 degrees',
        ],
        result: 'One tick is about half a thousandth of an inch of travel and about 0.003 degrees of heading.',
        note: 'From the constants in our code, before its tuned X and Y multipliers (about 0.955); rounded.' },
      'We tuned the drive\'s feedforward on FTC Dashboard in mid January by comparing target and measured velocity. The final values in the code are kV 0.01375, kA 0.00427 and kStatic 0.01675, with paths limited to 45 in/s.',
      { calc: 'How fast does the first move of the autonomous get?',
        given: [
          ['kV and kStatic, tuned', '0.01375 per in/s, 0.01675', `[our code](${REPO}/blob/main/TeamCode/src/main/java/org/firstinspires/ftc/teamcode/common/drive/DriveConstants.java)`],
          ['Path speed and acceleration limits', '45 in/s, 25 in/s²', 'our code'],
          ['Start pose to the left spike mark (red, close)', '(12, -61) to (15, -41), in', 'our code'],
        ],
        work: [
          'Full power, from the tuned feedforward: v = (1 - 0.01675) / 0.01375 = 71.5 in/s, so the 45 in/s limit is 63 % of it',
          'Reaching 45 in/s at 25 in/s² takes 45 / 25 = 1.8 s and 45² / (2 × 25) = 40.5 in; with the same distance to slow down, a move has to be over 81 in long to touch the limit',
          'The first move: √(3² + 20²) = 20.2 in, so it peaks at v = √(25 × 20.2) = 22.5 in/s',
          'Its time: 2 × 22.5 / 25 = 1.8 s',
        ],
        result: 'The spike mark move peaks at about 22.5 in/s, half the path limit, and takes about 1.8 s: on moves this short the acceleration limit, not the speed limit, sets the time.',
        note: 'Estimate: a straight line on a trapezoidal speed profile, leaving out the 30 degree turn made on the same move; the feedforward line ignores kA and battery voltage.' },
    ], media: [
      { i: 'chassis-side-lattice.webp', c: 'Jan 4, 2024: the side plate, lattice-cut aluminum with the mecanum wheels inside and a control hub on its printed tower' },
      { i: 'drive-tuning-velocity.webp', c: 'Jan 18, 2024: target and measured drive velocity on FTC Dashboard while tuning' },
    ] },

    // ------------------------------------------------------------------ intake
    { type: 'iterations', id: 'intake', h: 'The intake: two versions', items: [
      { label: 'Version 1 · Dec 2023', title: 'Star wheels and a roller drum', p: [
        'The first intake used star wheels and a drum of compliant rollers feeding a printed ramp into a two-pocket tray under a curved cover. It was still being put together on Dec 15, the day before our first event, and we replaced it after that event.',
      ], media: [
        { i: 'intake-v1-built.webp', c: 'Dec 15, 2023: the first intake, star wheels on a belt drive' },
        { v: 'intake-v1-walkaround.mp4', c: 'The first intake: star wheels, the roller drum, and the two-pocket tray under the cover' },
      ] },
      { label: 'Version 2 in CAD · Dec 26, 2023', title: 'Rubber tubing flaps', p: [
        'Ten days after the first event the second intake was in CAD: rows of rubber tubing flaps held on aluminum tubes, driven by a belt from the side, with a printed cradle for the pixels behind the roller.',
      ], media: [
        { i: 'intake-v2-cad.webp', c: 'Dec 26, 2023: the flap intake in Fusion 360' },
        { v: 'cad-intake-render.mp4', c: 'Our render of the flap intake, pulled apart: side plate, flap roller, belt and pulleys, and the pixel cradle' },
      ] },
      { label: 'Version 2 built · Jan 2, 2024', title: 'Floor and stack', p: [
        'By Jan 2 it was built and running. The flaps pull pixels in off the floor, and with the front bar raised they knock the top pixels off a stack of five one at a time. This is the intake we ran for the rest of the season.',
      ], media: [
        { i: 'intake-v2-tubing-flaps.webp', c: 'Jan 2, 2024: the built intake, rubber tubing flaps on gold aluminum tubes, held with zip ties' },
        { v: 'intake-v2-stack.mp4', c: 'Jan 2, 2024: the flaps take the top pixels off a stack of five, one at a time' },
      ] },
    ] },

    // ------------------------------------------------------------------ cradles and colors
    { type: 'prose', id: 'cradles', h: 'Cradles and color sensing', p: [
      'Behind the roller the two pixels land in two printed cradles shaped like the pixel, under a shaft of foam wheels. A color sensor under each cradle tells the code what is there, sorted by which of its red, green and blue readings is strongest.',
      { table: {
        head: ['Reading', 'Reads as'],
        rows: [
          ['Red, green and blue all under 200', 'Empty'],
          ['Blue, then green, then red', 'Purple'],
          ['Green, then red, then blue', 'Yellow'],
          ['Green, then blue, then red', 'Green, or white when blue is over 2,500 (slot 1) or 2,000 (slot 2)'],
        ],
        caption: 'From `IntakeSubsystem.identifyColor` in our code.',
      } },
      'The colors go to the Driver Station, and the drivers need them: a mosaic takes three colored pixels that are all one color or all different.',
    ], media: [
      { i: 'two-slot-tray.webp', c: 'Jan 11, 2024: two pixels in the cradles, cover lifted' },
      { i: 'transfer-foam-wheels.webp', c: 'Jan 12, 2024: the foam wheels above the two cradles' },
    ] },

    // ------------------------------------------------------------------ transfer
    { type: 'prose', id: 'transfer', h: 'The transfer', p: [
      'For the transfer the lift drives down to its limit switch, the arm swings back into the robot over the cradles, and two grabbers close on the two pixels. A wrist servo turns the grabbers between the pick-up angle and the placing angle, and each grabber opens on its own.',
      { problem: 'Through mid January the arm came down, gripped both cradles and lifted out with only one pixel. We have it on video on Jan 13, the morning of our second qualifier, and again on Jan 17 and Jan 18.', title: 'The arm left with one pixel of two' },
      { fix: 'By Jan 19 the arm lifted both pixels out in all five clips we recorded that day, like the [transfer clip above](#cycle).', title: 'Both pixels by Jan 19', label: 'Result' },
    ], media: [
      { v: 'transfer-miss-one-pixel.mp4', c: 'Jan 13, 2024: the arm grips both cradles and leaves with only the purple pixel' },
    ] },

    // ------------------------------------------------------------------ lift
    { type: 'prose', id: 'lift', h: 'The lift', p: [
      'Two motors drive two angled slide packs. The code holds the lift at a target height with a proportional term plus a constant push in the direction of the error, limits how hard it can drive down to half power, and re-zeroes on a limit switch at the bottom every time the robot goes back for pixels.',
      { pre: 'power = 0.005 × error\n      + 0.07 × sign(error)\nlimited to -0.5 ... 1' },
      'Both motors get the same power, worked out from one motor\'s encoder. In the touchpad teleop each row of the backdrop is 200 ticks above the one below.',
    ], media: [{ v: 'slides-extend-by-hand.mp4', c: 'One slide pack pulled to full extension by hand' }], side: 'left' },

    // ------------------------------------------------------------------ sideways axis
    { type: 'prose', id: 'sideways', h: 'A sideways axis for the backdrop', p: [
      'The backdrop\'s rows are staggered by half a pixel, so the spot under the deposit shifts from row to row. Instead of moving the whole robot, the arm\'s pivot rides a carriage on two short rails across the top of the lift, and a servo shifts the arm and the deposit sideways.',
      'In the code the rail has a center position and stops 0.067 of servo travel apart: five stops for one kind of row, and six, offset by half a stop, for the other. The rail was first driven by a DC motor with an encoder and was changed to a servo; the code still carries the motor version, commented out.',
      'Every servo on the deposit rides up and down with the lift, so their wiring runs through a breakout board and a coiled cable that stretches as the lift extends.',
    ], media: [
      { i: 'deposit-x-axis.webp', c: 'Jan 13, 2024: the top of the lift. The arm\'s servo and pivot ride a carriage on two short sideways rails, with a belt between them' },
      { i: 'coiled-cable-deposit.webp', c: 'Jan 27, 2024: fitting the breakout board and coiled cable that carry the deposit\'s servo wiring up the lift' },
    ] },
    { type: 'scrolly', id: 'indexer', module: 'indexer', webgl: false, width: 'full', stepHeight: '80vh', poster: 'deposit-x-axis.webp',
      h: 'Two pixels, two rows',
      p: ['A schematic of the backdrop and the deposit, with the lift targets and servo values from our touchpad teleop.'],
      steps: [
        { h: 'Two pixels, two places', p: ['The deposit carries two pixels side by side, one in each grabber. Say the yellow one goes in row 3 and the purple one in row 4, half a pixel further right. In our touchpad teleop the second driver picks both spots on the PS4 controller\'s touchpad and presses one button.'] },
        { h: 'Up to row 3', p: ['The arm swings up (0.71) and the lift runs to row 3\'s target, 500 encoder ticks; each row is 200 ticks above the one below. On this row the pair lines up with one of the five whole-pixel stops, so the rail stays on the center stop, C, at 0.740.'] },
        { h: 'Left grabber opens', p: ['The arm tips to its drop angle (0.73), the left grabber opens (0.75), and the yellow pixel stays on the backdrop. The arm comes back up and the left grabber closes again.'] },
        { h: 'Half a pixel over', p: ['The lift climbs to row 4, 700 ticks. This row is offset by half a pixel, so the rail moves to upper stop D at 0.7065, half a stop from where it was. The right grabber opens and the purple pixel lands.'] },
        { h: 'Back to stasis', p: [
          'One more command sends the lift down to its limit switch, the rail back to center stop C and the arm back into the robot.',
          'Our final teleop did this by hand instead: the D-pad steps the lift through ten heights and the rail in half-stop steps, and the bumpers release each pixel.',
        ] },
      ],
      caption: 'Schematic, not to scale: hexagons are pixels, the blue bar is the deposit with its two grabbers, and the line under it is the sideways rail with its stops, drawn in the code\'s order with A on the left. One stop of rail travel is drawn as one pixel width. Lift targets, servo values and the order of moves are from our touchpad teleop.' },

    // ------------------------------------------------------------------ endgame
    { type: 'prose', id: 'endgame', h: 'Drone launcher and hang', p: [
      'The drone launcher is a motor with two wheels that flings the paper airplane; one button spins it for 2 s. It was printed as one piece together with a servo mount, and the first print did not line up: a screw hit the launcher and the holes were off.',
      'For the hang, printed C-shaped hooks sit on top of both slide packs. The lift runs up to its hang height, 1,800 ticks, the hooks go over the rigging, and the lift pulls the robot up.',
      { problem: 'On Jan 11 the robot hung from our practice rigging, then dropped as soon as the motors were unpowered.', title: 'The hang only held while powered' },
    ], media: [{ v: 'hang-drops-unpowered.mp4', c: 'Jan 11, 2024: the robot hangs on its hooks from our practice rigging, then drops' }], side: 'left' },

    // ------------------------------------------------------------------ the code
    { type: 'prose', id: 'code', h: 'The code', p: [
      `Our robot code is public: [STATIC-CENTERSTAGE on GitHub](${REPO}). It is Java on FTCLib's command-based framework, with Road Runner for the autonomous paths.`,
      { ul: [
        '**Structure.** Each mechanism is a subsystem (intake, deposit, lift, and one for the drone and hang), and each driver button schedules a short sequence of commands, so a whole transfer, or a whole return to stasis, is one button press.',
        '**Autonomous.** Before the start the camera looks for our team prop and votes left, middle or right. The robot pushes the purple pixel onto the matching spike mark, drives to the backdrop on a Road Runner path, and uses the center AprilTag on the backdrop to correct its final position before placing the yellow pixel. It is drawn [at the top of this page](#auto).',
        '**Touchpad placement.** One teleop lets the second driver pick a row and column for each pixel on the PS4 touchpad, shows the choice on a small LED display on the robot, and runs the lift, arm and sideways rail to both spots with one button.',
        '**Driver feel.** Our final teleop scales each stick to 87/95 of its input and adds a constant 0.08 in the direction it is pushed, the same idea as the lift\'s constant push. While intaking it turns the controls around, so the intake is the front.',
      ] },
    ], media: [{ i: 'portfolio-touchpad.webp', c: 'The touchpad subsystem as it appeared in our engineering portfolio' }] },
    { type: 'media', layout: 'row', items: [
      { v: 'auto-purple-pixel.mp4', c: 'Jan 27, 2024, from above: the robot turns toward the red team prop and the arm reaches out to leave a pixel on its spike mark, then it heads for the backdrop' },
      { v: 'hero-stack-cycle.mp4', c: 'An autonomous run under the truss to the pixel stacks at the far wall' },
    ] },

    // ------------------------------------------------------------------ the season
    { type: 'prose', id: 'story', h: 'How the season went', p: [
      { problem: 'Two days before our first qualifier the lift had just been mounted, and the first intake was still being put together the day before. At the Mount St Joseph Qualifier on Dec 16 we lost all five qualification matches and ranked 21st of 21.', title: 'Not ready for the first event' },
      { fix: 'In the four weeks after, the deposit reached the top of the backdrop and the flap intake replaced the first one. The second qualifier on Jan 13 still went 0-5, with the transfer grabbing only one pixel of two. With both pixels transferring and a week of drive and autonomous tuning, we went 3-2 at the Laurel 2 Qualifier on Jan 28, ranked 9th of 25, and were picked by the first-seeded alliance.', title: 'Rebuild between events' },
      'At the Chesapeake FTC Championship on Feb 3 we went 3-2 again and ranked 7th of 27 in the Stage Right Division. In our first match our alliance scored 100 points in autonomous and won 208-151, our best score of the season. As part of the fourth-seeded alliance we reached the semifinal and lost it 1-2.',
    ], media: [
      [{ i: 'chassis-dec12.webp', c: 'Dec 12, 2023, four days before the first qualifier: the chassis wired on the floor' }, { i: 'pits-first-qualifier.webp', c: 'Dec 16, 2023: in the pits at the Mount St Joseph Qualifier' }],
      [{ i: 'still-result-q15-186-45.webp', c: 'Laurel 2 Qualifier, Qualification 15: our alliance wins 186-45' }, { i: 'award-inspire-2nd.webp', c: 'Laurel 2 Qualifier: Inspire Award, 2nd Place' }],
      { i: 'still-result-champ-q7-208-151.webp', c: 'Chesapeake Championship, Qualification 7: 208-151, with 100 points in autonomous' },
    ] },
    { type: 'prose', id: 'results', h: 'Official results', p: [
      { ul: [
        '**Mount St Joseph Qualifier**, Dec 16, 2023: rank 21 of 21, 0-5 in qualification matches, did not advance. Motivate Award 3rd Place.',
        '**Garrett County Qualifier**, Jan 13, 2024: rank 25 of 25, 0-5, did not advance. Innovate Award sponsored by RTX 3rd Place, and the Judges\' Choice Award.',
        '**APL Laurel 2 Qualifier**, Jan 28, 2024: rank 9 of 25, 3-2. Picked by the first seed; lost the semifinal 0-2 (120 to 148, 142 to 148). Inspire Award 2nd Place, Think Award 2nd Place and Control Award 2nd Place.',
        '**Chesapeake FTC Championship, Stage Right Division**, Feb 3, 2024: rank 7 of 27, 3-2. On the fourth-seeded alliance; lost the semifinal 1-2 (211 to 229, 225 to 138, 207 to 243).',
      ] },
      { note: `Team 18996, 2023 season. Season record 7-18-0: 6-14-0 in qualification matches and 1-4 in playoffs. Source: [FIRST Tech Challenge event results](${RESULTS}).` },
    ] },
  ],
};
