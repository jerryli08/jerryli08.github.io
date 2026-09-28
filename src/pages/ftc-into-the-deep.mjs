// FTC INTO THE DEEP robot (S.T.A.T.I.C., FTC 18996), 2024-25. Rich page.
// There is no CAD for this season (Jerry's checklist: "CAD (dont have at the moment)"), so there is
// no 3D model and no stand-in geometry. One 2D scrolly (webgl: false), driven only by the scroll:
// the Sep 12 and Sep 17 renders with the width marks drawing in ("My part of the robot": Jerry,
// Sept 27, keep it exactly as it is).
// Jerry, Sept 27: the season timeline slideshow was awkward, and then (21:12) a 3x3 grid was too
// basic, so "The season at a glance" is a plain vertical timeline in date order (an iterations
// section: a line with a dated node per picture, no scroll animation), and the five intake versions
// are normal pictures (the iterations). The extension scrolly sits right below the hero (21:12:
// the best scroll animation first). Real footage
// plays as video ("the scrolling should only advance CAD animations"), so the frame-by-frame hand
// off became the two bench clips, clean and failed, side by side. still-lift-at-basket was cut from
// the page's own clips.
// Copy uses only what Jerry stated (checklist, projects.mjs), what the media plainly shows, and the
// 18996 results on the official FIRST event pages (an award winner is listed there without a place,
// so the Think Award is the 1st place award, as projects.mjs says).
// Held back until Jerry answers (phase A questions.md): why the extension was narrowed, how the
// slide is driven and its stroke, the "third axis" of the final intake and how its wheels are
// driven on the robot, what the January rework changed and which approach angle won, which parts
// besides the extension he designed, what went wrong at the first event, whether he wrote any of the
// code, and every "next time" item. No teammate faces; no other team of Jerry's is mentioned.
// Version 5's pick-up clip (intake-v5-pick-close): its first second is a wide shot with a person in
// the background, so the clip on the page is re-cut from 1.0 s on (field and robot only).
// Hero (Jerry, Sept 28): the old IMG_9301 clip showed the autonomous missing its samples; the hero
// is now IMG_9293 (Mar 2, 2025, 10:11, venue practice field; the team counts specimens in the
// audio), 2.3 to 11.5 s, left 23% cropped so the human player's face never shows.
// Calculation: the stated 15 in and 3 in widths against the game manual's 18 in starting size
// (R101). Nothing else about the slide or intake (motor, ratio, stroke) is stated.
export default {
  summary: {
    stats: [
      { v: '15 in to 3 in', l: 'Width of my horizontal extension, first design to final' },
      { v: '5', l: 'Intake versions in one season' },
      { v: '1st place', l: 'Think Award, FIRST Chesapeake Championship' },
      { v: 'Semifinalist', l: 'Division playoffs' },
    ],
    text: [
      'INTO THE DEEP was the 2024-25 FIRST Tech Challenge game, and I captained S.T.A.T.I.C., team 18996, through it. My part of the robot was the **horizontal extension**: the slide that carries the intake out across the floor and in under the submersible to pick up game pieces. From the first design to the one we kept, I cut its width from **15 in to 3 in**.',
      'The intake at the end of it went through **five versions** in one season, from two sideways spinners to the two top-down spinners we finished with. It was our most successful season: the 1st place Think Award at the FIRST Chesapeake Championship and the division semifinals.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-auto-samples-venue.mp4', c: 'Mar 2, 2025, a practice field at the FIRST Chesapeake Championship: our specimen autonomous, start to finish. The star-wheel intake picks up all three blue samples and passes them to the observation zone for the human player, then the robot cycles specimens' },
      { v: 'hero-extension-full-reach.mp4', c: 'February 2025, a specimen autonomous test: the extension runs out to its full length for a sample by the wall' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ the extension (right below the hero)
    { type: 'scrolly', id: 'extension', module: 'width', webgl: false, stepHeight: '85vh', poster: 'cad-sep12-two-rail-extension.webp',
      h: 'The horizontal extension: 15 in to 3 in',
      steps: [
        { h: 'My part of the robot', p: ['The samples start inside the submersible, so the robot parks beside it and pushes its intake in under the rail on a horizontal slide. That slide was my part of the robot.'] },
        { h: 'First design: a slide on each side', p: ['In the first CAD of the robot, on Sep 12, 2024, the extension ran on two slides, one on top of each side of the chassis. Across the two slides it was **15 in** wide.'] },
        { h: 'Five days later: one slide, 3 in wide', p: ['By Sep 17 it was a single slide inside the chassis, between the drive pods: **3 in** wide instead of 15.'] },
        { h: 'One narrow slide from then on', p: ['Up close, the new slide sits inside the chassis beside a drive pod. From then on the extension stayed one narrow slide for the rest of the season, through every intake that rode on it.'] },
      ],
      caption: 'Four real renders of the robot from my CAD, five days apart; they are from different camera angles, so they follow each other rather than line up. The orange marks are drawn over the renders to pick out the extension; the widths are mine.',
      data: {
        aria: 'Renders of the extension: two slides on Sep 12, 2024, then one slide on Sep 17, 2024',
        meterTitle: 'Extension width',
        slides: [
          { img: 'cad-sep12-two-rail-extension.webp', w: 1600, h: 856, date: 'Sep 12, 2024', note: 'first CAD, shown extended' },
          { img: 'cad-sep12-two-rail-front.webp', w: 1600, h: 1040, date: 'Sep 12, 2024', note: 'first CAD', short: 'Sep 12',
            inches: 15, width: '15 in', chipText: 'Two slides, one on each side',
            marks: [{ pts: [[150, 388], [332, 512]], w: 30 }, { pts: [[614, 372], [1150, 486]], w: 26 }],
            chip: [700, 250], leads: [[240, 450], [880, 429]] },
          { img: 'cad-sep17-center-slide.webp', w: 1600, h: 828, date: 'Sep 17, 2024', note: 'five days later', short: 'Sep 17',
            inches: 3, width: '3 in', chipText: 'One slide inside the chassis',
            marks: [{ pts: [[388, 404], [700, 474], [1488, 648]], w: 30 }],
            chip: [1090, 330], leads: [[1060, 553]] },
          { img: 'cad-sep17-slide-closeup.webp', w: 1600, h: 1055, date: 'Sep 17, 2024', note: 'the new slide up close, beside a drive pod' },
        ],
      } },
    // ------------------------------------------------------------------ the game and the season
    { type: 'prose', id: 'game', h: 'The game, and my part of the robot', p: [
      'In INTO THE DEEP, game pieces called samples start in a pile inside the submersible, a metal frame in the middle of the field. Robots reach in under its rails, pull samples out, and either score them in the baskets or bring them to the human player, who turns them into specimens that the robot clips onto the chambers.',
      'I was the team captain. On the robot, my part was the horizontal extension: the slide that pushes the intake out across the floor and in under the submersible rail. This page follows that slide and the intake at its tip through the season, using our photos, renders and videos from kickoff on Sep 7, 2024 to the Chesapeake Championship on Mar 2, 2025. The timeline below puts the season\'s dated photos, renders and results in order; each one comes back further down the page, next to its part of the story.',
    ] },
    { type: 'iterations', id: 'season', h: 'The season at a glance',
      items: [
        { label: 'Sep 12, 2024', title: 'First CAD: two slides, 15 in wide', p: [], media: [
          { i: 'cad-sep12-two-rail-extension.webp', c: 'The first CAD of the robot: the extension runs on two slides, one on each side of the chassis' }] },
        { label: 'Sep 14, 2024', title: 'Intake version 1, sketched', p: [], media: [
          { i: 'sketch-intake-v1-spinners.webp', c: 'The first intake sketch: two spinners geared through a small gear and a big gear' }] },
        { label: 'Sep 17, 2024', title: 'One slide, 3 in wide', p: [], media: [
          { i: 'cad-sep17-center-slide.webp', c: 'Five days after the first CAD: one slide inside the chassis' }] },
        { label: 'Oct 12, 2024', title: 'Intake version 1, printed', p: [], media: [
          { i: 'intake-v1-printed.webp', c: 'Version 1 printed, with two servos wired in' }] },
        { label: 'Oct 20, 2024', title: 'The whole robot in CAD', p: [], media: [
          { i: 'cad-oct20-robot-extended.webp', c: 'The first full robot in CAD, with the extension all the way out' }] },
        { label: 'Dec 12, 2024', title: 'The slide, built', p: [], media: [
          { i: 'extension-slide-belt-carrier.webp', c: 'The built slide, with its belt and cable carrier' }] },
        { label: 'Dec 13, 2024', title: 'Intake version 2', p: [], media: [
          { i: 'intake-v2-compliant-wheels.webp', c: 'Two days before our first event: version 2, with surgical-tubing flaps on the roller' }] },
        { label: 'Dec 15, 2024 · Glen Allen VA #2 Qualifier', title: 'First event: 5-0 and the Innovate Award', p: ['5-0 in qualification matches, captain of the finalist alliance, and the Innovate Award.'], media: [
          { i: 'result-playoff-150-149.webp', c: 'The livestream result card for playoff match 9: our alliance 150, the other 149' }] },
        { label: 'Jan 25, 2025 · Moorefield WV 1 Qualifier', title: 'The reworked intake: Innovate Award again', p: [], media: [
          { i: 'intake-v4-at-moorefield.webp', c: 'At the Moorefield qualifier, with the reworked intake' }] },
        { label: 'Feb 3, 2025', title: 'Intake version 4', p: [], media: [
          { i: 'intake-v4-green-pivot.webp', c: 'A green intake housing on its pivot arm' }] },
        { label: 'Feb 22, 2025', title: 'Intake version 5, built', p: [], media: [
          { i: 'intake-v5-built.webp', c: 'Ten days after its first hand-held prototype' }] },
        { label: 'Mar 2, 2025 · FIRST Chesapeake Championship', title: '1st place Think Award', p: [], media: [
          { i: 'still-extension-out-venue.webp', c: 'Fully extended on a practice field at the championship' }] },
      ] },

    { type: 'prose', id: 'extension-built', h: 'From CAD to the robot', p: [
      { calc: 'How much of the robot\'s width did the extension take?',
        given: [
          ['Largest robot at the start of a match', '18 in wide, 18 in long, 18 in high', '[INTO THE DEEP game manual, rule R101](https://ftc-resources.firstinspires.org/ftc/archive/2025/game/manual-12)'],
          ['Extension, first design (two slides)', '15 in across', 'my CAD, Sep 12, 2024'],
          ['Extension, one slide', '3 in', 'my CAD, Sep 17, 2024'],
        ],
        work: [
          'Two slides: 15 in / 18 in = 83 % of the widest robot allowed',
          'One slide: 3 in / 18 in = 17 %',
          'Width handed back to the rest of the robot: 15 in - 3 in = 12 in, two thirds of the 18 in',
        ],
        result: 'The single slide takes a sixth of the robot\'s width instead of five sixths, leaving 12 in more for the drive pods and everything else.',
        note: 'Measured against the 18 in limit, not our chassis, whose width is not on this page; rounded.' },
      'By Oct 20 the first full robot was in CAD. The slide reaches out of the front of the chassis with the intake at its tip, and a long link from the back of the chassis stretches out along it. Pulled in, the intake sits right beside the blue transfer bucket at the bottom of the lift.',
      'On the built robot the slide has a timing belt along its rails and runs beside a cable carrier, the plastic chain that keeps the intake\'s wires from tangling as it moves in and out. In early November we filmed one of its first full cycles on the robot: reach out, grab a sample, pull back and drop it into the transfer bucket.',
    ], media: [
      { i: 'cad-oct20-robot-extended.webp', c: 'Oct 20, 2024: the first full robot in CAD, with the extension all the way out and intake version 1 at its tip' },
      { i: 'extension-slide-belt-carrier.webp', c: 'Dec 12, 2024: the built slide, with a timing belt along its rails and the cable carrier above it' },
    ] },
    { type: 'media', layout: 'grid', items: [
      { v: 'extension-v1-grab-transfer.mp4', c: 'Early November 2024, from above: the extension reaches out to a sample, grabs it, pulls back and drops it into the blue transfer bucket', tall: true },
      { i: 'cad-oct20-intake-and-bucket.webp', c: 'Oct 20, 2024: pulled in, the intake sits beside the blue transfer bucket, which holds a sample' },
      { i: 'extension-topdown-feb.webp', c: 'Feb 7, 2025, from above: the carriage, servo and cable carrier fit in one narrow strip, with that month\'s intake at the tip' },
    ] },
    { type: 'prose', id: 'rail', h: 'Catching on the rail', p: [
      { problem: [
        'Reaching in under the submersible rail is the extension\'s whole job, and the rail is where it got stuck. In a December practice run the intake hung up on the rail ("it\'s stuck on the rail right now"). On the practice field at the Moorefield qualifier in January, a teammate had to reach in and free it by hand.',
        'In a February test beside the submersible, the diagnosis was the intake\'s width: "the issue is the width ... this can still get caught there."',
      ], title: 'The intake caught on the submersible rail' },
      { fix: 'Intake version 5 (below) replaced the head at the tip. Tried at the submersible in February, it looked "a lot more tolerant", and in the later tests the extension reaches in from several sides of the submersible and all the way out to the wall.', title: 'A new head at the tip' },
      'In the specimen autonomous at the top of this page, the robot works from the chamber and sends the extension across the field to fetch a sample by the wall.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'still-extension-out-venue.webp', c: 'Mar 2, 2025: fully extended on a practice field at the FIRST Chesapeake Championship' },
    ] },

    // ------------------------------------------------------------------ the intake
    { type: 'prose', id: 'intake', h: 'The intake: five versions', p: [
      'The intake rides at the tip of the extension. It has to pick a sample up off the floor, often out of a pile under the submersible rail, and hold on to it while the extension pulls back. We went through five versions in one season, from two sideways spinners to the two top-down spinners we finished with.',
    ] },
    { type: 'iterations', id: 'versions', items: [
      { label: 'Version 1 · Sep to Nov 2024', title: 'Two sideways spinners', p: [
        'The first idea is a page of sketches from Sep 14: two star-shaped spinners on either side of a funnel, one powered and the other free to roll. The next sketch gears them through a small gear and a big gear, and the note says why: the "difference in speed will turn the sample." It was in CAD the same day, and a printed prototype got its first test spun by a cordless drill. By Oct 12 the printed version had two servos wired in.',
        { problem: 'The first sketches already marked a case where a sample "can get stuck". By late November, with the intake on the robot, the drive team put it plainly: "because it\'s side roller; if it wasn\'t side rollers you\'d be good."', title: 'Side rollers were picky about how the sample was lying' },
        { fix: 'Version 2 dropped the side rollers for vertical spinners.' },
      ], media: [
        { i: 'sketch-intake-v1-jam.webp', c: 'Sep 14, 2024: a small gear and a big gear, so the "difference in speed will turn the sample", and a red note where a sample "can get stuck"' },
        { i: 'intake-v1-printed.webp', c: 'Oct 12, 2024: version 1 printed, with two servos wired in and a star spinner on each side' },
        { v: 'intake-v1-drill-test.mp4', c: 'Sep 2024: the first prototype, spun by a cordless drill' },
      ] },
      { label: 'Version 2 · Dec 2024', title: 'Vertical spinners', p: [
        'Version 2 grabs with spinning rollers that carry flaps of surgical tubing. Once it has the sample, the intake flips back and hands it to the bucket at the bottom of the lift.',
        { problem: 'In bench tests in the days before our first event, some samples flipped and fell out during the hand off, and the bucket arm and the intake ran into each other ("this is colliding again").', title: 'The hand off dropped samples, and parts collided' },
        { fix: 'We ran the hand off on the bench over and over: more than a dozen tests filmed from the same spot over those days. Within days the robot was running the whole sample autonomous: extend, grab, hand off, lift, score, and go again (the clip under [Software on the robot](#software)).', title: 'Test the hand off until it holds' },
      ], media: [
        { i: 'intake-v2-compliant-wheels.webp', c: 'Dec 13, 2024, two days before our first event: version 2 up close, with surgical-tubing flaps on the roller' },
        { v: 'intake-v2-vertical-spinners.mp4', c: 'Dec 2024: rollers with surgical-tubing flaps spinning in front of a sample' },
      ] },
    ] },
    { type: 'media', id: 'handoff', layout: 'row', h: 'The hand off, clean and failed',
      p: ['Two of those bench tests, filmed from the same spot: one clean, one failed. In both the sample starts in the intake with the bucket beside it, and the intake flips back to carry it over the top. Watch the failed one: the sample ends up lying flat across the top of the bucket instead of dropping in, then tips and falls out.'],
      items: [
        { v: 'transfer-test-clean.mp4', c: 'The clean hand off: the sample goes over the top and drops into the bucket' },
        { v: 'transfer-test-fail.mp4', c: 'The failed hand off: the sample ends up lying flat across the top, then tips and falls out' },
      ] },
    { type: 'iterations', id: 'versions-2', items: [
      { label: 'Step 3 · Dec 15, 2024', title: 'Competing with it', p: [
        'Version 2 is the intake we ran at our first event, the Glen Allen VA #2 Qualifier. The robot went 5-0 in qualification matches and ranked 2nd of 34, we captained the finalist alliance, and we won the Innovate Award sponsored by RTX. One playoff match we won 150 to 149.',
      ], media: [
        { i: 'result-playoff-150-149.webp', c: 'Dec 15, 2024, the livestream result card for playoff match 9 at Glen Allen: our alliance (18996 and 11112) 150, the other 149' },
      ] },
      { label: 'Version 4 · Jan to early Feb 2025', title: 'Reworking the vertical spinners', p: [
        'We kept vertical spinners and reworked them. In January a hand-held prototype with white side plates pulled a sample in straight on. The intake we ran at the Moorefield qualifier on Jan 25 had green side plates and surgical-tubing flaps. In early February we held a new green prototype over a sample at different angles, from about 45 degrees to straight down, to see how the approach angle changed the pick up.',
        { problem: 'After a full test session on Feb 7 the whiteboard read: sample deposit backdoor is bad, intake belt skip, rejecting less powerful, specimen servo mount blocking intake for transfer. Two of those are the intake: the belt in its drive was skipping, and spitting out a sample of the wrong color was not strong enough.', title: 'The list after testing' },
        { fix: 'Five days later, on Feb 12, we had the first prototype of a new layout in hand: version 5.', title: 'A new layout' },
      ], media: [
        { i: 'intake-v4-at-moorefield.webp', c: 'Jan 25, 2025, at the Moorefield qualifier: the reworked intake, with green side plates and surgical-tubing flaps' },
        { i: 'whiteboard-problem-list.webp', c: 'Feb 7, 2025: the to do list after testing, next to the loop we worked in: integration and system tests, then continuous improvement' },
        { v: 'intake-v4-angle-test.mp4', c: 'Feb 2025: holding a new prototype over a sample at different angles' },
      ] },
      { label: 'Version 5 · Feb 12 to Mar 2025', title: 'Two top-down spinners', p: [
        'The last version uses two star wheels side by side that come down on the sample from above and pull it up between them. It went from a hand-held prototype on Feb 12 to the championship on Mar 2. On the robot, at the end of the extension, the head drops onto a sample, picks it and swings to release it. The rows below go through it up close.',
      ], media: [
        { v: 'intake-v5-pick-close.mp4', c: 'Mar 2025, at the end of the extension: the head drops onto a sample, picks it up between the two star wheels, and swings to release it' },
      ] },
    ] },
    { type: 'split', id: 'v5', items: [
      { media: [
        { v: 'intake-v5-first-grab.mp4', c: 'Feb 12, 2025: the first hand-held prototype pulls a sample up off the floor' },
        { i: 'still-intake-v5-crossed-belts.webp', c: 'The same prototype from above: the O-ring belts cross between the wheels' },
      ], h: 'The first prototype', p: [
        'The first version 5 was held in the hand and pressed down onto a sample on the floor. Its two star wheels were driven through orange O-ring belts that cross over. Crossing a belt reverses the direction it turns the wheel, so the two wheels spin opposite ways and both pull the sample up into the middle.',
      ] },
      { media: [
        { i: 'still-intake-v5-cad-linkage.webp', c: 'Version 5 in Fusion 360: a disc on the servo and two links that swing the wheel arms' },
        { i: 'cad-intake-v5-front.webp', c: 'Feb 21, 2025: version 5 in CAD from the front, two compliant star wheels under the printed frame' },
      ], h: 'The linkage, in CAD', p: [
        'In the CAD, a disc on a servo drives two links that swing the wheel arms apart and back together, over a V-shaped funnel. From the front, the two compliant star wheels sit side by side under the printed frame.',
      ] },
      { media: [
        { i: 'intake-v5-built.webp', c: 'Feb 22, 2025: version 5 built, two compliant star wheels on aluminum hubs beside a servo in a printed frame' },
        { i: 'intake-v5-on-extension.webp', c: 'Feb 27, 2025: version 5 on the end of the extension, with the cable carrier alongside' },
      ], h: 'Built and mounted', p: [
        'The assembled head is from Feb 22. By Feb 27 it was mounted on the end of the extension, three days before the championship. On the robot the whole head rides on a wrist at the tip of the extension.',
      ] },
      { media: { v: 'intake-v5-color-reject.mp4', c: 'Bench test, Feb 2025: a red sample, the wrong color for this test, goes in and the wheels throw it straight back out' }, h: 'Spitting out the wrong color', p: [
        { fix: '"Rejecting less powerful" had been on the whiteboard. In a bench test of version 5 we fed it a red sample on purpose, and the wheels threw it straight back out.', title: 'Rejection that works' },
        'This is the intake in the footage at the top of the page, on a practice field at the Chesapeake Championship.',
      ] },
    ] },

    // ------------------------------------------------------------------ the rest of the robot
    { type: 'prose', id: 'robot', h: 'The rest of the robot', p: [
      'The extension and intake feed everything else, which changed around them over the season:',
      { ul: [
        '**Lift and outtake.** In October the lift was a multi-stage slide with a printed bucket. In December it became a black band that unrolls from a drum into a rising tube, with a bucket on a printed truss arm at the top. In January the bucket became a scoop on a taller truss arm.',
        '**Specimens.** A claw on a truss arm clips specimens onto the high chamber.',
        '**Climb.** In December the robot hooked the low rung and lifted itself off the floor. At Glen Allen the livestream called a level two climb.',
      ] },
    ], media: [
      { i: 'still-lift-at-basket.webp', c: 'Dec 2024, in the sample autonomous: the lift raised at the high basket' },
    ] },
    { type: 'prose', id: 'software', h: 'Software on the robot', p: [
      'The robot\'s code is not in a public repository, so there is nothing to link. What the footage shows it doing:',
      { ul: [
        '**A sample autonomous** (December, in this clip): reach out to each yellow sample on the spike marks, hand it off, lift and score in the high basket, then go again. At Glen Allen the livestream commentator counted all four samples in the high basket in one autonomous period.',
        '**A specimen autonomous** (February and March): the robot works from the chamber and sends the extension across the field to fetch samples for the human player.',
        '**Color sensing.** A color sensor sits at the intake. On a test day we read its raw red, green, blue and alpha values on the Driver Hub against each sample color, and the final intake throws a sample of the wrong color back out.',
      ] },
    ], media: [
      { v: 'hero-sample-auto-dec.mp4', c: 'Dec 2024: the sample autonomous with version 2: extend, grab, hand off, lift and score, then go again' },
    ], side: 'left' },

    // ------------------------------------------------------------------ results
    { type: 'prose', id: 'results', h: 'Results', p: [
      'This was S.T.A.T.I.C.\'s most successful season: three official events, 12-12 overall, and an award at every one.',
      { table: {
        head: ['', 'Glen Allen VA #2 Qualifier', 'Moorefield WV 1 Qualifier', 'FIRST Chesapeake Championship, Dulaman Division'],
        rows: [
          ['Date', 'Dec 15, 2024', 'Jan 25, 2025', 'Mar 2, 2025'],
          ['Rank', '2 of 34', '21 of 27', '8 of 27'],
          ['Qualification', '5-0', '1-4', '3-2'],
          ['Playoffs', '2-2, captain of the finalist alliance', '0-2', '1-2, division semifinalist'],
          ['Award', 'Innovate Award sponsored by RTX', 'Innovate Award sponsored by RTX', '**Think Award, 1st place**'],
        ],
        caption: 'From the official FIRST event pages. Qualification records are counted from the match tables.',
      } },
      { quote: 'This team really shocked the judges with their innovative robot design.', by: 'From the judges\' script for the Innovate Award at Glen Allen, Dec 15, 2024' },
      { note: 'Source: [FIRST Tech Challenge event results for team 18996, 2024-25 season](https://ftc-events.firstinspires.org/2024/team/18996).' },
    ] },
  ],
};
