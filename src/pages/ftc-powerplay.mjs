// FTC POWERPLAY robot (S.T.A.T.I.C., FTC 18996), 2022-23. Rich page.
// There is no CAD of this robot (Jerry's checklist: "CAD (n/a)", "just dive into all of the
// mechanisms using the pictures and videos"), so there is no 3D and no stand-in geometry. Jerry,
// Sept 27: real footage plays as video ("the scrolling should only advance CAD animations"), and a
// scroll slideshow of separate photos is awkward. So the page has no scrollies: the stationary cycle
// and the stack pick up, which were scrubbed frame by frame, are their clips playing normally next to
// the text, and the arm, the claws and the season results are normal pictures. Those two clips were
// the hero; to avoid showing them twice in a row, the hero is now the run from the starting wall and
// the overhead view, which moved up from "A run from the starting wall".
// Calculation: the cycle time read off the video against the game's 2 minute driver-controlled
// period and published cone points (REV's POWERPLAY game breakdown). No gear tooth counts, servo
// models, motor or arm lengths are stated, so nothing about the arm itself is computed.
// Copy uses only what Jerry stated (projects.mjs: my first season as captain, the team's first time
// advancing to regionals), what the media plainly shows, and the official FIRST event pages for 18996
// (2022 season), read from the raw pages: records counted from the match scores, Scarlet Division
// Q14 marked there as a surrogate match. Times and counts in the clips were read off their frames.
// Held back until Jerry answers (phase A questions.md): who designed, built and programmed each part,
// what each of the six servos drives, what the chain and the springs do, the gear ratios, why each
// claw was replaced and which ran at each event, whether parking and stacking was the plan from the
// start, whether the full run is the autonomous program, what changed between Jan 21 and Jan 28, what
// went wrong at the Championship, what the Feb 7 and Feb 8 measurements were for, and every "next
// time" item. IMG_4509 (team 7393's robot) is never used. "We" throughout; "I" only as captain.
const RESULTS = 'https://ftc-events.firstinspires.org/2022/team/18996';

export default {
  summary: {
    stats: [
      { v: '5-0', l: 'Qualification record at the Union Bridge Qualifier, ranked 3rd of 35' },
      { v: '157', l: 'Our alliance\'s best qualification score of the season, twice at Union Bridge' },
      { v: '3', l: 'Judged awards, including the Inspire Award 3rd Place' },
      { v: 'About 5 s', l: 'Per cone on our practice field, wheels still (timed from the video)' },
    ],
    text: [
      'POWERPLAY was the 2022-23 FIRST Tech Challenge game: robots pick up plastic cones and drop them over poles called junctions. It was my first season as captain of S.T.A.T.I.C. (FTC 18996), and the idea behind our robot shows in every clip on this page: **park beside the cones, keep the wheels still, and let a two-link arm carry each cone up and over the robot onto a pole.**',
      'We went 1-4 and 2-3 in qualification matches at our first two events, then **5-0** at the Union Bridge Qualifier a week later, ranked **3rd of 35** and won the **Inspire Award 3rd Place**. It was the team\'s first season advancing to the Chesapeake Championship.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-run-from-start.mp4', c: 'From the starting wall: the robot drives across the field with a cone in the claw, turns onto its tape square and raises the cone to the top of the pole beside it' },
      { v: 'stationary-cycles-overhead.mp4', c: 'From above the field corner: parked on the tape, the arm takes cones from the stack at the wall over to the pole on the left while the wheels stay still' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ the game and the idea
    { type: 'prose', id: 'game', h: 'The game, and our idea', p: [
      'In POWERPLAY, robots pick up plastic cones and drop them over poles called junctions, which stand in a grid across the field. Cones come from the human player at the side of the field and from stacks of five against the field wall.',
      '2022-23 was my first season as captain. The idea behind our robot is simple to say: park next to the cones and a pole, and let the arm do the travelling instead of the wheels. One cycle is: reach down to the cone, close the claw, lift, swing up and over the top of the robot, let go over the pole, and swing back.',
    ], media: [{ i: 'robot-jan25-side.webp', c: 'January 25, 2023: the arm folded back over the chassis, with the green C-band claw at one end' }] },

    // ------------------------------------------------------------------ one cycle
    { type: 'prose', id: 'cycle', h: 'One cycle', side: 'left', p: [
      'The robot sits on a square of blue tape between the cones stacked at the wall and a pole, and stays on that square for the whole clip: only the arm moves.',
      'The arm comes down over the side of the robot, and the claw drops over the top of a cone at the wall and closes on it. Both links swing up past vertical, carrying the cone over the top of the robot to the other side. Over the pole the claw lets go, and the cone slides down the pole onto the ones already there. Then the arm swings back down to the cones and the next cycle starts.',
      'In this clip one cone takes about **5 seconds**, drop to drop (timed from the video).',
      { calc: 'What does 5 seconds a cone add up to?',
        given: [
          ['One cone, drop to drop', 'about 5 s', 'timed from the clip beside this text'],
          ['Driver-controlled period', '2 min = 120 s', '[REV, POWERPLAY game breakdown](https://docs.revrobotics.com/ftc-kickoff-concepts/powerplay-2022-2023/game-breakdown)'],
          ['Points for a cone on a junction', '2 (ground), 3 (low), 4 (medium), 5 (high)', 'same source'],
        ],
        work: [
          'Cones in the driver-controlled period: 120 s / 5 s = 24',
          'Points: 24 × 2 = 48 on ground junctions, up to 24 × 5 = 120 on high junctions',
        ],
        result: 'At this pace, a robot that never moved its wheels could place about 24 cones in the driver-controlled period, worth 48 to 120 points depending on the junction.',
        note: 'An upper bound, not a match result: it assumes a cone is always there to take, and leaves out the end game and any driving.' },
    ], media: [
      { v: 'hero-stationary-cycles.mp4', c: 'On our practice field the wheels never move: the arm reaches down to the cones at the wall, swings up and over the robot, and drops each one on the pole' },
    ] },

    // ------------------------------------------------------------------ in a match
    { type: 'prose', id: 'match', h: 'It held up in a match', p: [
      'At the CHS-MD Union Bridge Qualifier on January 28, 2023, the stream commentator picked it out in our fifth qualification match of the day:',
      { quote: 'Blue\'s got a mechanism that\'s running without moving any wheels right now, just straight up stacking cones... cap after cap after cap.', by: 'Stream commentator, Union Bridge Qualifier, qualification 38' },
      'We won that match 157-106, our fifth win in five qualification matches that day. Right after it, a junction near our robot held a tall stack of blue cones.',
    ], media: [
      { v: 'match-q38-stream.mp4', c: 'Union Bridge Qualifier, qualification 38, on the event stream (we are blue, with 10719): the stretch where the commentator describes blue stacking cones without moving its wheels. We won 157-106.' },
      { i: 'cone-stack-after-q38.webp', c: 'Right after qualification 38: a junction near our robot (18996 on the arm) holding a tall stack of blue cones' },
    ] },

    // ------------------------------------------------------------------ chassis
    { type: 'media', id: 'chassis', layout: 'row', h: 'The chassis', p: [
      'The robot drives on four mecanum wheels under a frame of aluminum channel, with a REV Control Hub and the wiring on top. Folded, the arm lies along the whole length of the chassis.',
    ], items: [
      { i: 'robot-top-down.webp', c: 'January 31, 2023, from above: the arm folded along the chassis, the claw open at one end, and a stack of cones against the wall' },
      { i: 'chassis-corner.webp', c: 'February 3: a corner of the chassis, with aluminum channel, a motor and a mecanum wheel' },
    ] },

    // ------------------------------------------------------------------ the arm, annotated
    { type: 'split', id: 'arm', h: 'The arm, part by part', items: [
      { h: 'Two links', media: { i: 'still-arm-full-reach.webp', c: 'Both links straight up on our practice field, with the claw at the very top; the 18996 plate is on the short lower link' }, p: [
        'The arm has two links. The short lower link, with our 18996 number plate on it, pivots low on the chassis. The long upper link carries the claw at its tip; here both stand straight up, with the claw at the very top.',
        'Stowed, the arm folds back on itself: the long link lies at an angle over the top of the robot, and the claw ends up above one end of the chassis, as in the photo at the top of this page.',
      ] },
      { h: 'Geared joints', media: [
        { i: 'base-gear-stage.webp', c: 'Feb 8, 2023, at the base of the arm: a servo with a brass pinion meshing with a large aluminum gear' },
        { i: 'joint-servo-gear-chain.webp', c: 'Feb 7, 2023, on the arm: a brass gear on a servo meshing with a large aluminum gear, next to a chain sprocket' },
      ], p: [
        'The joints are geared. At the base of the arm a servo turns a small brass pinion, which meshes with a much larger aluminum gear beside a big aluminum tube hub.',
        'Another servo does the same on the arm itself: a brass gear on the servo meshes with a large aluminum gear, next to the sprocket where a roller chain starts up the link.',
      ] },
      { h: 'Chain, tensioner and six servos', media: [
        { i: 'chain-tensioner.webp', c: 'Feb 7, 2023: the roller chain along the long link, with a small tensioner roller on a plate' },
        { i: 'driver-hub-servos.webp', c: 'Feb 8, 2023: our Driver Hub listing the six servos: Rotator, Extender, Cone, Popper, Release and Elbow, with their positions' },
      ], p: [
        'The roller chain runs up the long link. A small roller on a plate presses on it as a tensioner, to take up the slack.',
        'Our Driver Hub names six servos, each with its position: **Rotator**, **Extender**, **Cone**, **Popper**, **Release** and **Elbow**.',
      ] },
    ] },
    { type: 'media', id: 'reach', layout: 'row', h: 'How far it reaches', p: [
      'In this close-up from late January the arm unfolds from its stowed pose: the lower link stands up, the long link swings up until both are straight, and then the arm folds back down again. Straight up, the claw reaches well above the robot; at a demo at school on February 2 it held a cone high over the carpet.',
      'Every joint we photographed works the same way, a small gear on a servo driving a much larger aluminum gear. On one, under a plate, a servo\'s brass gear meshes with a large gear that sits on a round bearing housing.',
    ], items: [
      { v: 'arm-unfold-first-claw.mp4', c: 'Late January, with the green C-band claw: the arm unfolds from its stowed pose until both links stand straight up, then folds back' },
      { i: 'classroom-reach.webp', c: 'February 2, 2023, a demo at school: both links nearly straight up, holding a blue cone high' },
      { i: 'hitec-servo-gear.webp', c: 'February 8: under a plate, a servo\'s brass gear meshes with a large gear on a round bearing housing' },
    ] },

    // ------------------------------------------------------------------ the claw
    { type: 'iterations', id: 'claws', h: 'The claw: three versions', items: [
      { label: 'By Jan 4, 2023', title: 'A funnel with a ring', p: [
        'Our first claw was a black funnel with a closed teal ring, at the front corner of the robot.',
      ], media: [{ i: 'robot-early-claw.webp', c: 'By Jan 4, 2023: the robot from above with the 18996 plate and the first claw, a black funnel with a teal ring, at the front corner' }] },
      { label: 'Late January 2023', title: 'Two green C bands', p: [
        'By late January the claw at the tip of the arm was two green C-shaped bands, stacked one above the other.',
      ], media: [{ i: 'still-arm-stowed.webp', c: 'Late January 2023: the claw at the tip of the folded arm, two green C-shaped bands one above the other' }] },
      { label: 'From January 31, 2023', title: 'A split funnel', p: [
        'From January 31 on, the claw is two black half-funnels with teal rims, on black mounting plates that carry a small servo.',
        'The servo swings the two halves apart to open and back together to close. Closed, they make one funnel that drops over the tip of a cone, as it does over the top cone of a full stack of five at the start of the next section.',
      ], media: [
        { i: 'claw-closed.webp', c: 'Feb 4, 2023: the split funnel closed, two black half-funnels with teal rims forming one ring' },
        { i: 'claw-open.webp', c: 'Feb 4, 2023: open, the two halves swung apart' },
      ] },
    ] },

    // ------------------------------------------------------------------ the stack
    { type: 'prose', id: 'stack', h: 'Five cones, five heights', side: 'left', p: [
      'Cones against the wall come in stacks of five, and each cone in a stack sits at a different height, so the arm has to come in a little lower on every pass. The funnel closes over the top cone of a full stack.',
      'The clip picks up with three cones left. The funnel comes down over the top one and lifts it clear; the arm comes back about four and a half seconds later and reaches a little lower for the next one. The last cone sits on the floor, the lowest pose of all.',
      'In the full clip the arm takes all five cones off the stack in about **20 seconds** (timed from the video).',
    ], media: [
      { i: 'still-claw-over-stack.webp', c: 'The funnel closed over the top cone of a full stack of five' },
      { v: 'hero-stack-five.mp4', c: 'Taking the last three cones off a five-cone stack, each one from a little lower than the one before' },
    ] },
    { type: 'prose', id: 'stack-tests', h: 'Getting the stack right', p: [
      { problem: 'Stack pick up did not work at first. In one early test the claw came down over the top cone of a full stack and lifted it, and the other four cones tipped over and fell to the floor.', title: 'The stack tipped over' },
      { problem: 'In another test, filmed from above, the mechanism worked but was too slow.', title: 'Too slow' },
      'In later clips, the one above among them, the arm takes the stack apart without knocking it over, one cone about every four and a half seconds (timed from the video).',
    ], media: [
      { v: 'claw-on-stack.mp4', c: 'An early stack test: the claw lifts the top cone off a full stack of five, and the other four tip over and fall' },
      { v: 'stack-pickup-overhead.mp4', c: 'The test where someone says it is too slow, filmed from above: the funnel comes down over the top cone and takes it' },
    ] },

    // ------------------------------------------------------------------ full run
    { type: 'prose', id: 'run', h: 'A run from the starting wall', p: [
      'The first clip at the top of this page is a test from the starting wall: the robot starts against the field wall with a cone already in the claw, drives across the field, turns onto its square of tape beside a pole, and raises the cone to the top of it. From there it stays put and cycles cones from the wall to the pole.',
      'The second clip at the top shows that loop from higher up in the corner of the field: the stack at the wall, the pole on the other side, and our laptop and Driver Hub on the field floor. Filmed from straight above, the arm swings out over the side of the robot to the cones and back up over the chassis, while the chassis stays in one place.',
    ], media: [
      { v: 'reach-top-down.mp4', c: 'Straight down on the robot, with the phone on its side: the arm swings out to the cones and back up over the chassis' },
    ] },

    // ------------------------------------------------------------------ measuring the arm
    { type: 'prose', id: 'measuring', h: 'Measuring the arm, the week of the Championship', p: [
      'Four days before the Chesapeake Championship we measured the arm. On February 7 we set a digital angle gauge on the arm\'s links and on the chassis and photographed each reading: more than 50 photos in twenty minutes.',
      'The next day we held the Driver Hub up next to the arm and read off every servo\'s position, pose by pose. The screen lists the six servos by name, on the hub\'s network, 18996-RC.',
      'In this side view from the same week the arm reaches down to the floor on one side of the robot, then both links go straight up.',
    ], media: [
      { i: 'angle-gauge.webp', c: 'February 7: the digital angle gauge on the robot reading 17.8, one of more than 50 readings' },
      { i: 'arm-pose-with-hub.webp', c: 'February 8: the Driver Hub held up in front of the arm, with the servo positions on screen' },
      { v: 'arm-side-plate.mp4', c: 'Low side view, with 18996 on the lower link: the arm reaches down to the floor on one side, then both links go straight up' },
    ] },

    // ------------------------------------------------------------------ the season
    { type: 'prose', id: 'results', h: 'The season in the official results', p: [
      { table: {
        head: ['Event', 'Date', 'Rank', 'Record', 'Awards and playoffs'],
        rows: [
          ['Glen Allen Qualifier, VA', 'Dec 11, 2022', '20 of 24', '1-4', 'Think Award 3rd Place'],
          ['Harrisonburg Qualifier 1, VA', 'Jan 21, 2023', '26 of 37', '2-3', ''],
          ['Union Bridge Qualifier, MD', 'Jan 28, 2023', '3 of 35', '5-0', 'Inspire Award 3rd Place, Think Award 3rd Place, semifinal (1-2)'],
          ['Chesapeake Championship, Scarlet Division', 'Feb 11, 2023', '23 of 26', '1-4', ''],
        ],
        caption: 'Record is qualification matches. Season record 10-13-0: qualification 9-11-0, playoffs 1-2.',
      } },
      { problem: 'Our first two qualifiers went badly: 20th of 24 and 26th of 37, with 3 wins in 10 qualification matches.', title: 'A slow start' },
      'A week after the second one we went 5-0 at the CHS-MD Union Bridge Qualifier and ranked 3rd of 35, and this was the team\'s first season advancing to the Chesapeake Championship. We photographed the result screen after each of our five qualification matches that day:',
      { fig: [
        { i: 'score-q3.webp', c: 'Union Bridge, qualification 3: 97-43' },
        { i: 'score-q10.webp', c: 'Qualification 10: 133-48' },
        { i: 'score-q20.webp', c: 'Qualification 20: 125-101' },
      ], wide: true },
      { fig: [
        { i: 'score-q29.webp', c: 'Qualification 29: 157-87' },
        { i: 'score-q38.webp', c: 'Qualification 38: 157-106' },
      ], wide: true },
      'In the semifinal, with G-FORCE (2818), ranked 1st, and Lions (12718), we won one of three matches, 186-177, and went out (131-181, 186-177, 134-166).',
      { problem: 'At the Championship two weeks later we won one of our five counted matches and finished 23rd of 26 in our division. One of our six matches there was a surrogate match that did not count, and the closest loss was the last one, 142-148.', title: 'The Championship' },
      { table: {
        head: ['Event', 'Qualification matches, our alliance\'s score first'],
        rows: [
          ['Glen Allen', 'Q4 70-72, Q8 99-112, **Q13 88-64**, Q19 78-93, Q26 46-243'],
          ['Harrisonburg', 'Q2 39-46, **Q13 87-35**, Q22 61-134, **Q32 100-74**, Q45 43-108'],
          ['Union Bridge', '**Q3 97-43**, **Q10 133-48**, **Q20 125-101**, **Q29 157-87**, **Q38 157-106**'],
          ['Championship', 'Q3 81-123, **Q9 138-118**, Q14 119-67 (surrogate, did not count), Q21 125-264, Q28 127-228, Q33 142-148'],
        ],
        caption: 'Wins in bold.',
      } },
      { note: `Source: the [official FIRST event pages for team 18996](${RESULTS}), 2022 season. Team: S.T.A.T.I.C., FTC 18996; 2022-23 was my first season as captain.` },
    ] },
  ],
};
