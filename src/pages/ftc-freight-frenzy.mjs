// FTC FREIGHT FRENZY robot (S.T.A.T.I.C., FTC 18996), 2021-22. Archive page.
// Jerry's checklist: "Just show the videos and stuff, mainly i think you should just explain the
// mechanisms and stuff because the videos are already pretty isolated in terms of mechanisms".
// There is no CAD (checklist: "CAD (N/A)"; none in cad_src or cad_glb), so no 3D and no stand-in
// geometry. The `mechanisms` scrolly (reel.js) is a slideshow of the real clips: each step is one
// mechanism, and its clip is scrubbed by the scroll (it never plays), with the clip's own stills
// standing in until the video can show a frame.
// Copy uses projects.mjs (not finished in time, did not compete), the official FIRST page for team
// 18996 in the 2021 season (no events), the game itself, and what the clips plainly show. Credit is
// "we" (who designed and built what is not stated).
// Held back pending Jerry (phase A questions.md): when and how the clips were filmed relative to the
// season (1), his role (2), what the gear train beside a rack and the spring-loaded slide move, and
// what lifts the claw (3: those two clips are not on the page), why the robot was not finished and
// what he would do differently (4: no "next time" block yet), the driver clip (5: not used), and
// what the spinner's strips are made of and what drives it (6).
export default {
  summary: {
    stats: [
      { v: 'Mecanum', l: 'Drive' },
      { v: '2 jaws', l: 'A claw that grips boxes with rubber bands' },
      { v: '1 spinner', l: 'A wheel ringed with strips, for the duck carousel' },
      { v: '0 events', l: 'Not finished in time to compete' },
    ],
    text: [
      'FREIGHT FRENZY was the 2021-22 FIRST Tech Challenge game. Robots collect freight (boxes, some of them weighted, and balls) from the warehouse, deliver it to the shipping hubs, and spin a carousel to drop rubber ducks onto the field.',
      'Our robot drove on **mecanum wheels**, picked boxes up with a **two-jaw claw** and turned the carousel with a **wheel ringed with strips**. The clips each show one mechanism by itself, so this page walks through them one at a time. We did not get the robot finished in time, so we did not compete that season.',
    ],
  },
  hero: { layout: 'single', items: [
    { v: 'hero-grab-lift.mp4', c: 'The claw closes on a freight box and lifts it clear of the floor' },
  ] },
  sections: [
    { type: 'scrolly', id: 'mechanisms', module: 'reel', webgl: false, width: 'full', stepHeight: '90vh', poster: 'claw-holding-box.webp',
      h: 'The mechanisms, one at a time',
      p: ['Each step is one of our clips. Scroll, and the clip moves with you: grip, linkage, lift, then the carousel spinner.'],
      caption: 'Our clips, advanced by the scroll instead of playing on their own. Scrolling back plays them backwards.',
      steps: [
        { h: 'Grip', p: [
          'The claw grips a box from the sides. The jaw you see here is a perforated aluminum plate with **green rubber bands** stretched across it in an X, so the bands are what touch the box.',
        ], view: { short: 'Grip', shots: [
          { v: 'claw-closeup.mp4', from: 0, to: 3, size: [1280, 960], stills: [{ i: 'claw-closeup.jpg', at: 0 }], c: 'Up close: the banded jaw squeezes the box' },
        ] } },
        { h: 'One servo, one linkage', p: [
          'A **servo** sits on top of the claw. As it turns, a short linkage swings the moving jaw in against the box.',
        ], view: { short: 'Linkage', shots: [
          { v: 'claw-servo-linkage.mp4', from: 0, to: 3, size: [1280, 960], stills: [{ i: 'claw-servo-linkage.jpg', at: 0 }, { i: 'still-claw-servo.webp', at: 2 }], c: 'The servo at the top turns, and its linkage swings the jaw' },
        ] } },
        { h: 'Lift', p: [
          'With the box held, the claw lifts it clear of the floor. The boxes are not all the same: some carry metal weights in their cells, so the same grip has to hold a light box and a heavy one.',
        ], view: { short: 'Lift', shots: [
          { v: 'hero-grab-lift.mp4', from: 0, to: 5.5, size: [1280, 960], stills: [{ i: 'hero-grab-lift.jpg', at: 0 }, { i: 'still-box-lifted.webp', at: 5 }], c: 'From the front, at floor level: grip, then lift' },
        ] } },
        { h: 'The carousel spinner', p: [
          'Ducks score when the carousel is turned and they drop off it onto the field, in autonomous and in the end game. Our spinner is a **sprocket ringed with strips**: the strips press on the carousel\'s rim, and spinning the wheel turns the carousel.',
        ], view: { short: 'Spinner', shots: [
          { v: 'carousel-wheel-spin.mp4', from: 0, to: 3, size: [1280, 960], stills: [{ i: 'still-carousel-wheel.webp', at: 0 }], c: 'The spinner: a sprocket ringed with strips, from rest to spinning' },
        ] } },
        { h: 'Ducks off', p: [
          'From above, the wheel sits against the carousel\'s rim. Turned fast, the carousel carries the ducks round until they come off it.',
        ], view: { short: 'Ducks', shots: [
          { i: 'still-carousel-top.webp', size: [1080, 1440], zoom: [1, 1.05], focus: [0.62, 0.12], until: 0.4, c: 'From above: the strip wheel against the carousel\'s rim, at the top' },
          { v: 'carousel-ducks-spin.mp4', from: 0, to: 2, size: [1280, 960], stills: [{ i: 'carousel-ducks-spin.jpg', at: 0 }], c: 'The carousel spinning: the ducks ride round and drop off' },
        ] } },
      ],
      data: { aria: 'The FREIGHT FRENZY robot\'s mechanisms in our clips: the claw gripping and lifting a box, then the carousel spinner' } },

    { type: 'prose', id: 'claw', h: 'The claw', media: [
      { v: 'claw-grab-side.mp4', c: 'From the side, at floor level: the banded jaw grips the box, then the claw lifts it' },
      [
        { i: 'claw-holding-box.webp', c: 'Holding a weighted box: the rubber bands grip its side' },
        { i: 'still-box-lifted.webp', c: 'From the front, lifted clear of the floor' },
      ],
    ], p: [
      'The claw hangs from the front of the robot and closes on a box from both sides. The rubber bands on the jaw are what touch the box, and a servo on top of the claw closes it through a short linkage.',
      'Freight is not all one weight: some boxes carry metal weights in their cells. With the box held, the claw lifts it clear of the floor.',
    ] },
    { type: 'prose', id: 'spinner', h: 'The carousel spinner', side: 'left', media: [
      { v: 'carousel-wheel-spin.mp4', c: 'The spinner at rest, then spinning' },
      { v: 'carousel-ducks-spin.mp4', c: 'The carousel spinning under the wheel: the ducks ride round and drop off' },
    ], p: [
      'The carousel is a turntable at the edge of the field loaded with rubber ducks. Turn it, and the ducks come off onto the field, where they score, in autonomous and in the end game.',
      'Our spinner is a sprocket with a ring of strips around it. The strips press on the carousel\'s rim, and spinning the wheel turns the carousel.',
    ] },
    { type: 'prose', id: 'season', h: 'How the season went', media: [
      { i: 'freight-on-field.webp', c: 'FREIGHT FRENZY freight: boxes, some with metal weights in their cells, and balls' },
    ], p: [
      { problem: 'We did not get the robot finished in time for a competition, so the team did not compete in 2021-22: our record on FIRST\'s event pages for that season is empty.', title: 'Not finished in time' },
      'The clips on this page show what the robot could do: the claw gripping and lifting a box, and the spinner turning the carousel.',
    ] },
  ],
};
