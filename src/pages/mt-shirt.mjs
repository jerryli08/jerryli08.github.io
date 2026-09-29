// Monkeytype Shirt: rich page. Facts are Jerry's (src/projects.mjs, his checklist entry in
// /home/claude/work/checklist.txt) or plainly shown by the photos. Tooth counts, centre distances,
// link lengths and sizes are measured from his CAD (monkeytype merch v22) and say so. The two
// calculation blocks use only those CAD measurements (axes in assets/js/pages/mt-shirt/rig.js:
// pulley axes 59.95 mm apart, spur axes 29.99 mm apart).
// Jerry (Sept 27, 21:12): the rail block pushes the keycap on the switch to the end of the switch's
// travel and back; the plate on the block meets the keycap's top face 33.02 mm past the CAD pose
// (measured on the STEP), and the press uses Cherry's published 4 mm total travel (rig.js).
// The "from the angle of the print" still is rendered from the camera fitted to the print (az -25.5,
// el 43.5, nearly orthographic), checked by overlaying the print's lines on the render.
// Held back until Jerry answers /home/claude/work/monkeytype-merch/questions.md:
//  - how the shirt came about and how the line art was made from the CAD (Q3)
//  - servo model: the copy uses his "Axon Max Plus"; the CAD part is named Axon_MINI (Q4)
//  - whether the mechanism was ever built or run (Q5): the copy only says it was designed in CAD
//  - problems, fixes and next-time items (Q6): none stated, so no red / green / blue blocks yet
const M = '/assets/models/mt-shirt';
const STORE = 'https://monkeytype.store/products/deconstructed-t-shirt-printed';
const ACCENT = '#ff6b35';

export default {
  summary: {
    stats: [
      { v: '13M+', l: 'Visits a month to Monkeytype, the typing test the shirt is for' },
      { v: '5 stages', l: 'From one servo to the keycap: bevel gears, belt, spur gears, crank, rail' },
      { v: '3 : 1', l: 'Step-up in the spur stage, 36 teeth driving 12 (from my CAD)' },
      { v: '1 servo', l: 'Drives the whole chain' },
    ],
    text: [
      `I designed the Deconstructed T-Shirt on the [official Monkeytype store](${STORE}). The print is an exploded view of a small machine I designed in CAD, whose whole job is to push a keycap on a keyboard switch all the way in.`,
      'One servo drives a bevel gear pair, a belt, a spur gear pair and a crank linkage that runs a carriage along a miniature linear rail. I made it far more complex than the job needs, on purpose, so the drawing has more to look at.',
    ],
  },
  hero: null,
  sections: [
    { type: 'scrolly', id: 'hero-explode', module: 'explode', width: 'full', stepHeight: '85vh', poster: `${M}/poster-closed.webp`,
      steps: [
        { h: 'Closed', p: ['The machine closed up as one box: a tub, a white lid ring and the Monkeytype "mt" logo on top. Everything that moves is inside.'] },
        { h: 'Opening', p: ['The four corner screws back out along their guide lines, then the logo, the top frame and the lid ring lift off, like a step in an assembly manual.'] },
        { h: 'The mechanism', p: ['Every stage rises to its own height so nothing hides behind anything else: the servo, the bevel gears, the belt, the spur gears, the linkage and the rail all show at once.'] },
        { h: 'This is the shirt', p: ['This exact pose, seen from this angle, is the drawing on the shirt.'] },
      ],
      caption: 'My CAD, exported in its exploded pose. The closed box is the same parts with each layer lowered straight back down, along the explode axis, onto the part it mounts to.' },

    { type: 'media', layout: 'row', items: [
      { i: 'shirt-full.webp', c: 'The printed shirt: the same exploded view as white line art' },
      { i: 'store-product.webp', c: 'On sale on monkeytype.store as the Deconstructed T-Shirt (Printed)' },
    ] },

    { type: 'scrolly', id: 'drivetrain', module: 'drivetrain', width: 'full', stepHeight: '95vh', poster: `${M}/poster-drivetrain.webp`,
      h: 'One keycap, five stages',
      p: ['The machine has one job: push a keycap on a keyboard switch all the way in, and let it back out. Instead of doing that directly, I sent the servo\'s motion through a chain of different mechanisms, on purpose, for visual interest. Each one is one more thing to look at in the drawing. Here it runs in the exploded pose from the shirt, with the lid and the top frame lifted away.'],
      steps: [
        { h: '1. The servo', p: ['An Axon Max Plus servo is the only actuator, wired to a 4xAA battery holder at the other end of the box. Its output shaft lies flat, pointing along the box.', 'In every step the servo makes one push and comes back, so each stage can be watched doing its part.'] },
        { h: '2. Bevel gears', p: ['Two identical bevel gears turn the servo\'s horizontal shaft into a vertical one at 1 : 1. From here on, every shaft stands straight up from the floor of the box.', 'In the exploded pose the pair is drawn apart along the explode axis like every other layer, so here they turn without touching.'] },
        { h: '3. Belt', p: ['A 20-tooth pulley on the bevel shaft drives a second 20-tooth pulley 60 mm away through an 80-tooth belt with a 2 mm pitch. Equal pulleys, so it is still 1 : 1: the belt is there to carry the motion across the box.', 'One push turns both pulleys 38.8 degrees, which moves the belt 4.3 mm around its loop, just over two teeth.'] },
        { h: '4. Spur gears', p: ['The second pulley shares its shaft with a 36-tooth gear, which drives a 12-tooth gear, module 1.25, with their centres 30 mm apart. That is a 3 : 1 step-up: the 12-tooth gear turns the opposite way to the 36-tooth gear and three times as far, so three times as far as the servo.'] },
        { h: '5. Crank', p: ['The 12-tooth gear carries a 32 mm crank arm. A 33 mm link joins the crank to the carriage and turns the crank\'s rotation into a straight push.', 'The crank axis sits 24 mm off the line of the rail, so this is an offset slider-crank. The 116 degrees the crank turns in one push move the carriage 55.9 mm.'] },
        { h: '6. Linear rail', p: ['The carriage rides a 70 mm MGN7 miniature linear guide, so the push stays straight. The push starts with the block at the back end of the rail and runs it 55.9 mm, until the plate on the block has pressed the keycap all the way in.'] },
        { h: '7. The keycap', p: ['The whole chain is there for this: a keycap on a Cherry MX switch, lying on its side at the end of the rail. The plate on the block meets the keycap 33 mm past where the CAD has the carriage, pushes it the switch\'s full 4 mm of travel to the bottom, then backs off and lets the key spring back out.'] },
      ],
      caption: 'Tooth counts, centre distances, link lengths and the 33 mm from the plate to the keycap are measured from my CAD. One push here is 38.8 degrees at the servo: through the 3 : 1 spur stage that is 116 degrees at the crank, which runs the carriage 55.9 mm, from the back end of its rail to the bottom of the key\'s travel. The switch in the CAD is a simplified model with no working stop, so the press uses Cherry\'s published 4 mm of total travel.' },

    { type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', stepHeight: '90vh', poster: `${M}/poster-parts.webp`,
      h: 'What is in the box',
      data: { models: [{ label: 'CAD', src: `${M}/mechanism.glb` }], azimuth: 35, elevation: 30, drift: 12 },
      steps: [
        { h: 'The whole machine', p: ['My CAD as exported, in the pose on the shirt. The mechanism sits in a stadium-shaped tub, 163 by 101 mm, and every layer above it is lifted straight up.'],
          view: { azimuth: 35, elevation: 30, pad: 1.1 } },
        { h: 'The frame', p: ['Six 24 mm hex standoffs stand on the tub floor. On top of them a 1 mm web plate ties the eight top screw points together, clamped under 5 mm bars by eight countersunk M4 screws.'],
          view: { azimuth: 130, elevation: 24, pad: 1.05,
            highlight: [{ parts: '1501_0006_0240|_Component68_1$|_Component(56|57|60|61|62)_1$', color: ACCENT, intensity: 0.4 }],
            labels: [{ text: 'Standoffs, 24 mm', part: '_1501_0006_0240_v1_3$' }, { text: 'Web plate', part: '_Component68_1$' }] } },
        { h: 'The lid and the logo', p: ['A white lid ring sits on the tub rim, and the Monkeytype "mt" logo, 10 mm thick, sits on the web plate between the bars.', 'Four more countersunk screws go through the lid ring into the corners of the tub. In the exploded CAD each one floats above its hole on a thin guide line, the way an assembly drawing shows where a screw goes.'],
          view: { azimuth: 20, elevation: 36, pad: 1.05,
            highlight: [{ parts: '_Component6[4-7]_1$|_M4_x_10_csk_machine_screw_v1_(9|1[0-2])$', color: ACCENT, intensity: 0.5 }],
            labels: [{ text: 'Lid ring', part: '_Component59_1$' }, { text: '"mt" logo', part: '_Component58_1$' }] } },
      ] },

    { type: 'prose', id: 'parts', h: 'The parts', p: [
      'Power goes one way through the box: servo, bevel pair, vertical shaft, first pulley, belt, second pulley, 36-tooth gear, 12-tooth gear with its crank, link, carriage on the rail, and finally the keycap.',
      { table: {
        head: ['Stage', 'Parts in the CAD', 'From the CAD'],
        rows: [
          ['Power', 'Axon Max Plus servo, 4xAA battery holder, two wires', 'Output shaft horizontal, along the box'],
          ['Bevel', 'Two identical bevel gears', '1 : 1, turns the motion 90 degrees'],
          ['Belt', 'Two 20-tooth pulleys, an 80-tooth belt', '2 mm pitch, 60 mm between centres, 1 : 1'],
          ['Spur', '36-tooth and 12-tooth gears', 'Module 1.25, 30 mm between centres, 3 : 1 step-up'],
          ['Linkage', 'Crank arm on the 12-tooth gear, a link to the carriage', '32 mm crank, 33 mm link, 24 mm offset'],
          ['Rail', 'MGN7 rail and block, a carriage plate', '70 mm rail'],
          ['Output', 'Cherry MX switch and keycap', 'Switch on its side, facing the carriage'],
          ['Housing', 'Tub, lid ring, six standoffs, web plate, top bars, the "mt" logo, 12 countersunk M4 screws', 'Tub 163 x 101 mm, standoffs 24 mm'],
        ],
        caption: 'Measured from my CAD.',
      } },
      { calc: 'Does the 80-tooth belt fit two 20-tooth pulleys 60 mm apart?',
        given: [
          ['Pulleys', '20 teeth each, 2 mm pitch', 'measured from the CAD'],
          ['Distance between the pulley axes', '60 mm', 'measured from the CAD'],
          ['Belt', '80 teeth, 2 mm pitch', 'measured from the CAD'],
        ],
        work: [
          'Pitch diameter of each pulley: 20 × 2 mm / π = 12.73 mm',
          'Equal pulleys, so the belt is two straight runs plus half a wrap round each: L = 2 × 60 mm + π × 12.73 mm = 120 mm + 40 mm = 160 mm',
          'In teeth: 160 mm / 2 mm = 80',
        ],
        result: 'Exactly 80 teeth: the 60 mm between the pulley axes is the distance an 80-tooth, 2 mm pitch belt needs.',
        note: 'Lengths along the belt\'s pitch line.' },
      { calc: 'Why 30 mm between the spur gears, and what 3 : 1 does',
        given: [
          ['Gears', '36 and 12 teeth, module 1.25', 'measured from the CAD'],
          ['Crank turn for one push, from the back end of the rail to the bottom of the key\'s travel', '116.4 degrees', 'the linkage below, measured from the CAD'],
        ],
        work: [
          'Pitch diameters: 1.25 × 36 = 45 mm and 1.25 × 12 = 15 mm',
          'Meshing distance: (45 mm + 15 mm) / 2 = 30 mm, the distance between the two gear axes in the CAD',
          'Ratio: 36 / 12 = 3, so the 12-tooth gear and its crank turn 3 degrees for every degree of the 36-tooth gear, which turns with the servo (1 : 1 through the bevels and the belt)',
          'Servo turn for one push: 116.4 / 3 = 38.8 degrees',
        ],
        result: 'Module 1.25 gears with 36 and 12 teeth mesh at exactly 30 mm, and the 3 : 1 step-up lets 38.8 degrees at the servo swing the crank the 116 degrees one push needs.',
        note: 'Pitch circles; the backlash allowance in the CAD, if any, is left out.' },
      { calc: 'Can the crank push the key all the way in?',
        given: [
          ['Crank, link, and the crank axis\'s offset from the rail line', '32.0 mm, 33.1 mm, 24.0 mm', 'measured from the CAD'],
          ['Carriage pin ahead of the crank axis, in the CAD pose', '19.0 mm', 'measured from the CAD'],
          ['Plate on the block to the keycap\'s top face, in the CAD pose', '33.0 mm', 'measured from the CAD'],
          ['Cherry MX total travel', '4 mm', '[Cherry](https://www.cherry.de/en-us/product/mx2a-red)'],
        ],
        work: [
          'Carriage pin ahead of the crank axis with the key at the bottom: 19.0 + 33.0 + 4 = 56.0 mm',
          'Furthest the pin can get, with crank and link in line: √((32.0 + 33.1)² − 24.0²) = √(4238 − 576) = 60.5 mm',
          'Crank angle at the bottom of the press: −44.0 degrees; in line (the dead point): −21.6 degrees',
          'Link angle to the rail at the bottom: about 3 degrees',
        ],
        result: 'The press bottoms out 4.5 mm short of the linkage\'s dead point, with 22 degrees of crank to spare, and at the bottom the link pushes almost straight along the rail.',
        note: 'Geometry only; crank angles from STEP +X about the 12-tooth axis.' },
    ],
      media: [
        { i: `${M}/still-top.webp`, c: 'The layout from above, with the lid, top frame and logo hidden: servo at the right, battery holder at the left, the belt and the gears between them, and the rail and keycap along the front' },
        { i: `${M}/poster-drivetrain.webp`, c: 'My CAD in the exploded pose, servo and battery holder lit: the bevel pair beside the servo, the belt across the box, and the spur gears under it' },
      ] },

    { type: 'prose', id: 'shirt', h: 'From CAD to a shirt', p: [
      'The drawing on the shirt is the CAD itself: the same parts in the same exploded pose, seen from the front left and above. In the CAD every layer is lifted to its own height and the corner screws have guide lines down to their holes, so the whole mechanism reads in one white line drawing.',
    ],
      media: [[{ i: `${M}/still-shirt-angle.webp`, c: 'My CAD, from the angle of the print' }, { i: 'shirt-print.webp', c: 'The print on the shirt' }]] },

    { type: 'callout', id: 'store', h: 'Buy the shirt', p: [
      `It is on the official Monkeytype store as the [Deconstructed T-Shirt (Printed)](${STORE}). Monkeytype is a typing test website with more than 13 million visits a month.`,
    ] },
  ],
};
