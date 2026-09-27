// FTC FREIGHT FRENZY robot (S.T.A.T.I.C., FTC 18996), 2021-22. Archive page.
// Jerry's checklist: "Just show the videos and stuff, mainly i think you should just explain the
// mechanisms and stuff because the videos are already pretty isolated in terms of mechanisms".
// There is no CAD (checklist: "CAD (N/A)"; none in cad_src or cad_glb), so no 3D and no stand-in
// geometry. Jerry, Sept 27: a scroll slideshow of separate clips is awkward, so each mechanism's
// clips are normal pictures beside its text.
// Calculation: the light and heavy box weights from REV's game elements page, as the friction the
// jaws must supply.
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
    { type: 'prose', id: 'claw', h: 'The claw', media: [
      { v: 'claw-closeup.mp4', c: 'Up close: the banded jaw squeezes the box' },
      { v: 'claw-servo-linkage.mp4', c: 'The servo at the top turns, and its linkage swings the jaw' },
      { i: 'claw-holding-box.webp', c: 'Holding a weighted box: the rubber bands grip its side' },
      [
        { v: 'claw-grab-side.mp4', c: 'From the side, at floor level: the banded jaw grips the box, then the claw lifts it' },
        { i: 'still-box-lifted.webp', c: 'From the front, lifted clear of the floor' },
      ],
    ], p: [
      'The claw hangs from the front of the robot and closes on a box from both sides. The jaw is a perforated aluminum plate with **green rubber bands** stretched across it in an X, so the bands are what touch the box.',
      'A **servo** sits on top of the claw. As it turns, a short linkage swings the moving jaw in against the box.',
      'Freight is not all one weight: some boxes carry metal weights in their cells, so the same grip has to hold a light box and a heavy one.',
      { calc: 'How much more does a heavy box ask of the grip?',
        given: [
          ['Box size', '2 x 2 x 2 in, polypropylene', '[REV, FREIGHT FRENZY game elements](https://docs.revrobotics.com/ftc-kickoff-concepts/freight-frenzy-2021-2022/game-piece)'],
          ['Light box', '0.9 oz', 'same page'],
          ['Heavy box', '4.8 oz', 'same page'],
        ],
        work: [
          'Heavy box: 4.8 oz x 28.35 g/oz = 136 g, and 0.136 kg x 9.81 m/s² = 1.33 N',
          'Light box: 0.9 oz = 26 g, 0.25 N',
          'Held from the sides, the box stays up only by friction at the jaws, so the jaws must supply 1.33 N of friction for a heavy box and 0.25 N for a light one',
          'Heavy / light: 4.8 / 0.9 = 5.3',
        ],
        result: 'The grip has to be set for the heavy box: that one needs 5.3 times the friction of a light box, which the same squeeze then holds with plenty to spare. That is the job of the rubber bands on the jaw.',
        note: 'Static hold only; lifting and driving add to it. Rounded.' },
      'With the box held, the claw lifts it clear of the floor.',
    ] },
    { type: 'prose', id: 'spinner', h: 'The carousel spinner', side: 'left', media: [
      { v: 'carousel-wheel-spin.mp4', c: 'The spinner: a sprocket ringed with strips, from rest to spinning' },
      { i: 'still-carousel-top.webp', c: 'From above: the strip wheel against the carousel\'s rim, at the top' },
      { v: 'carousel-ducks-spin.mp4', c: 'The carousel spinning under the wheel: the ducks ride round and drop off' },
    ], p: [
      'The carousel is a turntable at the edge of the field loaded with rubber ducks. Turn it, and the ducks come off onto the field, where they score, in autonomous and in the end game.',
      'Our spinner is a **sprocket ringed with strips**. From above, the wheel sits against the carousel\'s rim: the strips press on it, and spinning the wheel turns the carousel.',
      'Turned fast, the carousel carries the ducks round until they come off it.',
    ] },
    { type: 'prose', id: 'season', h: 'How the season went', media: [
      { i: 'freight-on-field.webp', c: 'FREIGHT FRENZY freight: boxes, some with metal weights in their cells, and balls' },
    ], p: [
      { problem: 'We did not get the robot finished in time for a competition, so the team did not compete in 2021-22: our record on FIRST\'s event pages for that season is empty.', title: 'Not finished in time' },
      'The clips on this page show what the robot could do: the claw gripping and lifting a box, and the spinner turning the carousel.',
    ] },
  ],
};
