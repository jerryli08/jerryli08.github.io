// FTC INTO THE DEEP robot (S.T.A.T.I.C., FTC 18996), 2024-25. Rich page.
// There is no CAD for this season (Jerry's checklist: "CAD (dont have at the moment)"), so there is
// no 3D model and no stand-in geometry. Every interactive block is built from real media only
// (webgl: false): a season timeline, a before/after switch between the Sep 12 and Sep 17 renders,
// a stepper through the five intake versions, and two hand off tests played in sync.
// Copy uses only what Jerry stated (checklist, projects.mjs), what the media plainly shows, and the
// 18996 results on the official FIRST event pages (an award winner is listed there without a place,
// so the Think Award is the 1st place award, as projects.mjs says).
// Held back until Jerry answers (phase A questions.md): why the extension was narrowed, how the
// slide is driven and its stroke, the "third axis" of the final intake and how its wheels are
// driven on the robot, what the January rework changed and which approach angle won, which parts
// besides the extension he designed, what went wrong at the first event, whether he wrote any of the
// code, and every "next time" item. No teammate faces; no other team of Jerry's is mentioned.
// The stepper's last clip starts at 1 s (start: 1): its first second is a wide shot with a person
// in the background, and its poster is that frame.
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
      { v: 'hero-final-intake-real-field.mp4', c: 'The final robot on a practice field at the FIRST Chesapeake Championship, March 2025: the extension reaches out along the floor and the star-wheel intake picks up a sample' },
      { v: 'hero-extension-full-reach.mp4', c: 'February 2025, a specimen autonomous test: the extension runs out to its full length for a sample by the wall' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ the game and the season
    { type: 'prose', id: 'game', h: 'The game, and my part of the robot', p: [
      'In INTO THE DEEP, game pieces called samples start in a pile inside the submersible, a metal frame in the middle of the field. Robots reach in under its rails, pull samples out, and either score them in the baskets or bring them to the human player, who turns them into specimens that the robot clips onto the chambers.',
      'I was the team captain. On the robot, my part was the horizontal extension: the slide that pushes the intake out across the floor and in under the submersible rail. This page follows that slide and the intake at its tip through the season, using our photos, renders and videos from kickoff on Sep 7, 2024 to the Chesapeake Championship on Mar 2, 2025.',
    ] },
    { type: 'demo', id: 'season', module: 'season', webgl: false, height: 'clamp(400px, min(62vh, 110vw), 600px)', poster: 'cad-sep12-two-rail-extension.webp',
      h: 'The season at a glance',
      p: ['The dated photos, renders and clips from this page, on one timeline. Drag the date or step through it to watch the robot change: the extension in the top lane, the intake in the middle (the number is its version), and our three events at the bottom.'],
      caption: 'Dates come from the files themselves and from the official FIRST event pages. Clips show a still here; they play further down the page.',
      data: {
        from: '2024-09-07', to: '2025-03-02', fromLabel: 'Kickoff',
        aria: 'The 2024-25 season on a timeline of photos, renders and clips',
        lanes: [{ key: 'ext', label: 'Extension' }, { key: 'intake', label: 'Intake' }, { key: 'event', label: 'Events' }],
        items: [
          { d: '2024-09-12', lane: 'ext', i: 'cad-sep12-two-rail-extension.webp', title: 'First CAD', c: 'First CAD of the robot: the extension on two slides, one on each side of the chassis. **15 in wide.**' },
          { d: '2024-09-14', lane: 'intake', n: 1, i: 'sketch-intake-v1-spinners.webp', title: 'First intake sketch', c: 'The first intake sketch: two spinners, geared through a small gear and a big gear.' },
          { d: '2024-09-17', lane: 'ext', i: 'cad-sep17-center-slide.webp', title: 'One slide', c: 'Five days later: one slide inside the chassis. **3 in wide.**' },
          { d: '2024-10-12', lane: 'intake', n: 1, i: 'intake-v1-printed.webp', title: 'Version 1 printed', c: 'Intake version 1 printed, with two servos wired in.' },
          { d: '2024-10-20', lane: 'ext', i: 'cad-oct20-robot-extended.webp', title: 'First full robot in CAD', c: 'The first full robot in CAD, with the extension all the way out.' },
          { d: '2024-11-06', lane: 'ext', v: 'extension-v1-grab-transfer.mp4', title: 'First grab and hand off', c: 'Early November: an early grab and hand off on the built robot.' },
          { d: '2024-12-12', lane: 'ext', i: 'extension-slide-belt-carrier.webp', title: 'The built slide', c: 'The built slide, with its belt and cable carrier.' },
          { d: '2024-12-13', lane: 'intake', n: 2, i: 'intake-v2-compliant-wheels.webp', title: 'Version 2', c: 'Intake version 2 up close, two days before our first event.' },
          { d: '2024-12-15', lane: 'event', i: 'result-playoff-150-149.webp', title: 'Glen Allen VA #2 Qualifier', c: '**Glen Allen VA #2 Qualifier**: 5-0 in qualification matches, finalist alliance captain, Innovate Award. This playoff match went 150 to 149.' },
          { d: '2025-01-25', lane: 'event', i: 'intake-v4-at-moorefield.webp', title: 'Moorefield WV 1 Qualifier', c: '**Moorefield WV 1 Qualifier**, with the reworked intake: Innovate Award.' },
          { d: '2025-02-03', lane: 'intake', n: 4, i: 'intake-v4-green-pivot.webp', title: 'Green intake on its pivot', c: 'A green intake housing on its pivot arm.' },
          { d: '2025-02-07', lane: 'ext', i: 'extension-topdown-feb.webp', title: 'The extension from above', c: 'The extension from above: carriage, servo and cable carrier in one narrow strip.' },
          { d: '2025-02-07', lane: 'intake', n: 4, i: 'whiteboard-problem-list.webp', title: 'The to do list', c: 'The to do list after a full test session.' },
          { d: '2025-02-12', lane: 'intake', n: 5, v: 'intake-v5-first-grab.mp4', title: 'Version 5 prototype', c: 'The first prototype of version 5 pulls a sample up off the floor.' },
          { d: '2025-02-22', lane: 'intake', n: 5, i: 'intake-v5-built.webp', title: 'Version 5 built', c: 'Intake version 5 built.' },
          { d: '2025-02-27', lane: 'ext', i: 'intake-v5-on-extension.webp', title: 'Version 5 on the extension', c: 'Version 5 mounted on the end of the extension.' },
          { d: '2025-03-02', lane: 'event', i: 'still-extension-out-venue.webp', title: 'FIRST Chesapeake Championship', c: '**FIRST Chesapeake Championship**, fully extended on a practice field: 1st place Think Award.' },
        ],
      } },

    // ------------------------------------------------------------------ the extension
    { type: 'prose', id: 'extension', h: 'The horizontal extension: 15 in to 3 in', p: [
      'The samples start inside the submersible, so the robot parks beside it and pushes its intake in under the rail on a horizontal slide. That slide was my part of the robot.',
      { h: 'First design: a slide on each side' },
      'In the first CAD of the robot, on Sep 12, 2024, the extension ran on two slides, one on top of each side of the chassis. Across the two slides it was 15 in wide.',
      { h: 'Five days later: one slide, 3 in wide' },
      'By Sep 17 it was a single slide inside the chassis, between the drive pods: 3 in wide instead of 15. From then on the extension stayed one narrow slide for the rest of the season, through every intake that rode on it.',
    ] },
    { type: 'demo', id: 'width', module: 'width', webgl: false, height: 'clamp(340px, min(54vh, 64vw), 560px)', poster: 'cad-sep12-two-rail-front.webp',
      caption: 'Two real renders of the robot from my CAD, five days apart; switch between them, or tap the picture. They are from different camera angles, so this is a switch, not an overlay. The orange marks are drawn over the renders to pick out the extension; the widths are mine.',
      data: {
        aria: 'The extension on Sep 12 (two slides) and Sep 17 (one slide)',
        switchLabel: 'Render', marksLabel: 'Mark the extension', meterTitle: 'Extension width',
        states: [
          { label: 'Sep 12: two slides', short: 'Sep 12', date: 'Sep 12, 2024', dateNote: 'first CAD', img: 'cad-sep12-two-rail-front.webp', w: 1600, h: 1040,
            alt: 'Render of the chassis from the front with a slide on top of each side', inches: 15, width: '15 in', chipText: 'Two slides, one on each side',
            marks: [{ pts: [[150, 388], [332, 512]], w: 30 }, { pts: [[614, 372], [1150, 486]], w: 26 }],
            chip: [700, 250], leads: [[240, 450], [880, 429]] },
          { label: 'Sep 17: one slide', short: 'Sep 17', date: 'Sep 17, 2024', dateNote: 'five days later', img: 'cad-sep17-center-slide.webp', w: 1600, h: 828,
            alt: 'Render of the chassis from above with one slide inside it, extended far out', inches: 3, width: '3 in', chipText: 'One slide inside the chassis',
            marks: [{ pts: [[388, 404], [700, 474], [1488, 648]], w: 30 }],
            chip: [1090, 330], leads: [[1060, 553]] },
        ],
      } },
    { type: 'media', layout: 'row', items: [
      { i: 'cad-sep12-two-rail-extension.webp', c: 'Sep 12, 2024: the first extension, one slide on top of each side of the chassis, shown extended' },
      { i: 'cad-sep17-slide-closeup.webp', c: 'Sep 17, 2024: the new single slide up close, inside the chassis beside a drive pod' },
    ] },
    { type: 'prose', id: 'extension-built', h: 'From CAD to the robot', p: [
      'By Oct 20 the first full robot was in CAD. The slide reaches out of the front of the chassis with the intake at its tip, and a long link from the back of the chassis stretches out along it. Pulled in, the intake sits right beside the blue transfer bucket at the bottom of the lift.',
      'On the built robot the slide has a timing belt along its rails and runs beside a cable carrier, the plastic chain that keeps the intake\'s wires from tangling as it moves in and out. In early November we filmed one of its first full cycles on the robot: reach out, grab a sample, pull back and drop it into the transfer bucket.',
    ] },
    { type: 'media', layout: 'grid', items: [
      { v: 'extension-v1-grab-transfer.mp4', c: 'Early November 2024, from above: the extension reaches out to a sample, grabs it, pulls back and drops it into the blue transfer bucket', tall: true },
      { i: 'cad-oct20-robot-extended.webp', c: 'Oct 20, 2024: the first full robot in CAD, with the extension all the way out and intake version 1 at its tip' },
      { i: 'cad-oct20-intake-and-bucket.webp', c: 'Oct 20, 2024: pulled in, the intake sits beside the blue transfer bucket, which holds a sample' },
      { i: 'extension-slide-belt-carrier.webp', c: 'Dec 12, 2024: the built slide, with a timing belt along its rails and the cable carrier above it' },
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
      'The intake rides at the tip of the extension. It has to pick a sample up off the floor, often out of a pile under the submersible rail, and hold on to it while the extension pulls back. We went through five versions in one season. Step through them here with their clips, then read each one below.',
    ] },
    { type: 'demo', id: 'steps', module: 'steps', webgl: false, height: 'clamp(560px, 70vh, 640px)', poster: 'intake-v1-drill-test.jpg',
      caption: 'Nothing plays until you press play; after that, each version plays its own clip. Arrow keys and swipes move between versions.',
      data: {
        aria: 'The five intake versions', kicker: 'Step',
        foot: 'Clips are muted. Dates come from the files.',
        steps: [
          { name: 'Two sideways spinners', short: 'Side', dates: 'Sep to Nov 2024', v: 'intake-v1-drill-test.mp4',
            c: 'Sep 2024: the first prototype, spun by a cordless drill',
            line: 'Two star-shaped spinners on the sides of a funnel, geared so they turn at different speeds and **the difference turns the sample** as it comes in.',
            flag: { type: 'problem', text: 'Picky about how the sample was lying: "because it\'s side roller; if it wasn\'t side rollers you\'d be good."' } },
          { name: 'Vertical spinners', short: 'Vertical', dates: 'Dec 2024', v: 'intake-v2-vertical-spinners.mp4',
            c: 'Rollers with surgical-tubing flaps spinning in front of a sample',
            line: 'Rollers with **surgical-tubing flaps** grab the sample, then the intake **flips back** and hands it to the bucket on the lift.',
            flag: { type: 'problem', text: 'In bench tests some hand offs dropped the sample, and the bucket arm and the intake ran into each other.' } },
          { name: 'Competing with it', short: 'Event', dates: 'Dec 15, 2024', v: 'hero-sample-auto-dec.mp4',
            c: 'Dec 2024: the sample autonomous with version 2: extend, grab, hand off, lift and score, then go again',
            line: 'We ran version 2 at our first event, the Glen Allen VA #2 Qualifier: **5-0** in qualification matches, **2nd of 34**, captain of the finalist alliance, and the **Innovate Award**.' },
          { name: 'Reworked vertical spinners', short: 'Rework', dates: 'Jan to early Feb 2025', v: 'intake-v4-angle-test.mp4',
            c: 'Feb 2025: holding a new prototype over a sample at different angles',
            line: 'Still vertical spinners, rebuilt: new side plates by the January qualifier, then a **bench test of approach angles** in February.',
            flag: { type: 'problem', text: 'The list after a Feb 7 test session: "intake belt skip" and "rejecting less powerful".' } },
          { name: 'Two top-down spinners', short: 'Top-down', dates: 'Feb 12 to Mar 2025', v: 'intake-v5-pick-close.mp4', start: 1,
            c: 'Mar 2025: at the end of the extension, the head drops onto a sample, picks it and swings to release it',
            line: 'Two star wheels come down on the sample **from above** and pull it up between them. This is the intake we finished the season with.',
            flag: { type: 'fix', text: 'Fed a wrong-color sample on purpose, it spits it straight back out.' } },
        ],
      } },
    { type: 'iterations', id: 'versions', items: [
      { label: 'Version 1 · Sep to Nov 2024', title: 'Two sideways spinners', p: [
        'The first idea is a page of sketches from Sep 14: two star-shaped spinners on either side of a funnel, one powered and the other free to roll. The next sketch gears them through a small gear and a big gear, and the note says why: the "difference in speed will turn the sample." It was in CAD the same day, and a printed prototype got its first test spun by a cordless drill. By Oct 12 the printed version had two servos wired in.',
        { problem: 'The first sketches already marked a case where a sample "can get stuck". By late November, with the intake on the robot, the drive team put it plainly: "because it\'s side roller; if it wasn\'t side rollers you\'d be good."', title: 'Side rollers were picky about how the sample was lying' },
        { fix: 'Version 2 dropped the side rollers for vertical spinners.' },
      ], media: [
        { i: 'sketch-intake-v1-jam.webp', c: 'Sep 14, 2024: a small gear and a big gear, so the "difference in speed will turn the sample", and a red note where a sample "can get stuck"' },
        { i: 'intake-v1-printed.webp', c: 'Oct 12, 2024: version 1 printed, with two servos wired in and a star spinner on each side' },
      ] },
      { label: 'Version 2 · Dec 2024', title: 'Vertical spinners', p: [
        'Version 2 grabs with spinning rollers that carry flaps of surgical tubing. Once it has the sample, the intake flips back and hands it to the bucket at the bottom of the lift.',
        { problem: 'In bench tests in the days before our first event, some samples flipped and fell out during the hand off, and the bucket arm and the intake ran into each other ("this is colliding again").', title: 'The hand off dropped samples, and parts collided' },
        { fix: 'We ran the hand off on the bench over and over: more than a dozen tests filmed from the same spot over those days. Within days the robot was running the whole sample autonomous: extend, grab, hand off, lift, score, and go again (step 3 in the stepper above).', title: 'Test the hand off until it holds' },
      ], media: [
        { i: 'intake-v2-compliant-wheels.webp', c: 'Dec 13, 2024, two days before our first event: version 2 up close, with surgical-tubing flaps on the roller' },
      ] },
    ] },
    { type: 'demo', id: 'handoff', module: 'handoff', webgl: false, height: 'clamp(400px, 30vw, 460px)', poster: 'transfer-test-clean.jpg',
      h: 'The hand off, in sync',
      p: [
        'Two of those bench tests, filmed from the same spot: one clean, one failed. They are lined up in time on the moment the intake starts to flip back, so one clock runs both. Drag the time or play them at quarter speed, and watch the failed sample: it ends up lying flat across the top instead of dropping into the bucket, then tips and falls out.',
      ],
      caption: 'Real clips, only shifted in time (lined up by eye, frame by frame). Nothing loads until you press play, drag the time or pick a moment.',
      data: {
        aria: 'A clean and a failed hand off, played in sync',
        span: 8,
        clips: [
          { v: 'transfer-test-clean.mp4', label: 'Clean hand off', off: 3.4 },
          { v: 'transfer-test-fail.mp4', label: 'Failed hand off', off: 1.0, bad: true },
        ],
        before: 'The sample sits in the intake',
        marks: [
          { t: 3.4, label: 'The intake starts to flip back', short: 'Flip starts' },
          { t: 4.8, label: 'The sample goes over the top', short: 'Over the top' },
          { t: 6.0, label: 'Into the bucket, or tipping out', short: 'Result' },
        ],
        startLabel: 'Load both clips',
      } },
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
      ] },
      { label: 'Version 5 · Feb 12 to Mar 2025', title: 'Two top-down spinners', p: [
        'The last version uses two star wheels side by side that come down on the sample from above and pull it up between them. It went from a hand-held prototype on Feb 12 to the championship on Mar 2. Up close:',
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
        '**Climb.** In December the robot hooked the low rung and lifted itself off the floor ("this is historic", on the video). At Glen Allen the livestream called a level two climb.',
      ] },
    ] },
    { type: 'prose', id: 'software', h: 'Software on the robot', p: [
      'The robot\'s code is not in a public repository, so there is nothing to link. What the footage shows it doing:',
      { ul: [
        '**A sample autonomous** (December, step 3 in the stepper): reach out to each yellow sample on the spike marks, hand it off, lift and score in the high basket, then go again. At Glen Allen the livestream commentator counted all four samples in the high basket in one autonomous period.',
        '**A specimen autonomous** (February and March): the robot works from the chamber and sends the extension across the field to fetch samples for the human player.',
        '**Color sensing.** A color sensor sits at the intake. On a test day we read its raw red, green, blue and alpha values on the Driver Hub against each sample color, and the final intake throws a sample of the wrong color back out.',
      ] },
    ] },

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
