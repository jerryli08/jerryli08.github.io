// Braille Printer (PennApps XXV): rich page. Facts are Jerry's (src/projects.mjs, his checklist
// entry: "I designed the gantry", "I rigged the y axis with dental floss") or plainly shown by the
// media. Dimensions and angles come from the team's CAD and say so; the photo times are the photos'
// own time stamps.
// Held back until Jerry answers (/home/claude/work/pennapps-braille-printer/questions.md): whether
// it embossed paper by the end (no photo or video shows embossed paper, so nothing here claims a
// print), the electronics and code (no public repo), who designed the head and the die, whether the
// code mirrored each line, how the floss loop was wound, why the die groups cells in threes, the
// pin's reach, and anything he would change next time.
const M = '/assets/models/braille-printer';

export default {
  summary: {
    stats: [
      { v: '36 h', l: 'PennApps XXV, team of four' },
      { v: '2 axes', l: 'X on a GT2 belt, Y on dental floss' },
      { v: '4,050', l: 'Dimples in the die, from our CAD' },
      { v: '3.3°', l: 'Servo swing to press one dot, from our CAD' },
    ],
    text: [
      'In 36 hours at PennApps XXV, my team of four built a prototype braille printer. I designed the gantry: a frame of 2020 aluminum extrusion with stepper-driven X and Y axes. The X axis runs on a GT2 timing belt. We ran out of belt for the Y axis, so I rigged it with dental floss wound on spools.',
      'A servo on the X carriage swings a round-nosed pin down onto paper lying on a die plate with 4,050 dimples, one for every dot position on the page. The pin presses the paper into a dimple, and the dot stands up on the other side.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-finished-machine.mp4', c: 'The prototype on Sunday morning: the gantry beam, the red servo on its carriage and paper under the frame' },
      { i: 'finished-machine-desk.webp', c: 'The whole machine with its electronics and laptop, Sunday 10 a.m.' },
    ],
  },
  sections: [
    { type: 'prose', id: 'how', h: 'How it works', p: [
      'The paper lies on the die, a plate covered in small dimples, one for every dot position on the page. The gantry carries the pin over one dimple at a time: the Y axis slides the whole gantry beam along the frame, and the X axis slides a carriage along the beam. At each dot a servo swings the pin down and presses the paper into the dimple, so a dot stands up on the other side of the sheet.',
      { h: 'The gantry' },
      'I designed the gantry. Four 400 mm lengths of 2020 aluminum extrusion make the frame. Each side rail carries a carriage plate on four V-wheels, and the gantry beam, a fifth 400 mm extrusion, bolts across the top of both side carriages. A third carriage runs along the beam and carries the servo.',
      'Three steppers drive it: one at the end of the beam for X, and one at the end of each side rail for Y, so both ends of the beam are pulled at once.',
    ],
      media: [
        [{ i: 'still-frame-top-view.webp', c: 'The assembled gantry from above: two Y motors at the far end, the beam across the side rails and the red servo on its carriage. The floss runs along both side rails' },
          { i: 'still-servo-carriage.webp', c: 'The red servo on the X carriage, on the gantry beam' }],
      ] },

    { type: 'scrolly', id: 'emboss', module: 'emboss', stepHeight: '95vh', poster: `${M}/poster-emboss.webp`,
      h: 'How it writes, dot by dot',
      p: ['Our CAD, writing a word as you scroll: the gantry moves on its belt and floss, the servo swings the pin down its real arc, and the page comes out at the end to be read.'],
      steps: [
        { h: 'A word', p: [
          'Braille writes each letter as a cell of six dot positions, two columns of three. As you scroll, the word types itself and each letter becomes its cell.',
          'Capital letters take a capital sign, dot 6, in front. *PennApps* is 10 cells and 28 dots.',
        ] },
        { h: 'Written from the back', p: [
          'The pin pushes the paper down into the die, so every dot stands up on the far side of the sheet, the side you read once the page is turned over.',
          'So a line has to be embossed as its mirror image: the first cell goes on the right, and the two columns of every cell swap. The orange rings mark where the 28 dots will go.',
        ] },
        { h: 'Line up on the first dot', p: [
          'Two axes carry the pin. **Y** slides the whole gantry beam along the side rails, pulled by floss wound on a spool at each side. **X** slides the servo carriage along the beam on a GT2 belt.',
          'The pin stops about 4 mm to one side of the dot, because it does not come straight down.',
        ] },
        { h: 'Row one: an arc, not a plunge', p: [
          'At each dot the servo turns 3.3°. The arm pivots on the servo shaft 86 mm from the pin\'s nose, so the nose comes down on an arc: it drops 2.9 mm and moves 4 mm sideways, 0.9 mm of that inside the dimple. It presses the paper in and swings back up.',
        ] },
        { h: 'Row two, on the way back', p: [
          'This path writes one row of dots across the whole line, steps Y by 2.34 mm and comes back. Y moves the entire gantry, so it moves only three times per line, while X, which moves only the small carriage, does the running.',
        ] },
        { h: 'Row three', p: [
          'The last row holds dots 3 and 6, including both capital signs. Every dot lands on one of the die\'s dimples: 2.34 mm apart inside a cell, 6.22 mm from cell to cell.',
        ] },
        { h: 'Turn it over', p: [
          'Out of the printer and turned over, the dots stand up and the word reads left to right.',
        ] },
      ],
      caption: 'My team\'s real CAD: the gantry, both drives, the servo arm and pin on their real arc, and the die grid the dots land on. The word, the path, the speeds, the paper and its dots are the animation\'s, and so is the floss, which is not in the CAD (the photos show it). The swing starts from the arm\'s position in the CAD, 2.3 mm above the page, and the animation stays inside the area the pin reaches in the CAD. Angles and distances are computed from the CAD, ignoring the paper\'s thickness.' },

    { type: 'prose', id: 'floss', h: 'Out of belt: dental floss', p: [
      { problem: 'We ran out of timing belt. The X axis had its GT2 belt, but there was not enough left to run the Y axis the same way.', title: 'Out of belt' },
      { fix: [
        'I rigged the Y axis with dental floss instead. Each side rail has its own stepper with a spool on its shaft, so both ends of the gantry beam are pulled at once.',
        'The spool has two grooves, each 4 mm wide, on a 15.5 mm radius drum between 20 mm flanges: about 97 mm of travel per turn (computed from the CAD). Small holes through the flanges tie the floss off. At the far end of the rail, two 7 mm rollers sit one above the other, level with the top and the bottom of the drum.',
      ] },
      'In the photos of the assembled machine, the floss shows as a thin white line along both side rails.',
    ],
      media: [
        { i: 'last-of-the-belt.webp', c: 'Saturday, 11:55 p.m.: a short length of timing belt' },
        { i: 'still-electronics.webp', c: 'The electronics inside the frame: a microcontroller board, red driver boards and a nest of jumper wires' },
      ] },

    { type: 'scrolly', id: 'gantry', module: 'gantry', width: 'wide', stepHeight: '90vh', poster: `${M}/poster-gantry.webp`,
      h: 'The gantry, axis by axis',
      p: ['Our CAD moving along its real axes. The motor shafts, the belt pulley, the floss spools and the idler rollers turn with the travel they drive.'],
      steps: [
        { h: 'The frame', p: [
          'Four 400 mm lengths of 2020 extrusion on a base sheet. The beam rides on two side carriages, each on four V-wheels, and the servo carriage runs along the beam.',
        ] },
        { h: 'Y: the whole beam, on floss', p: [
          'Scroll and the Y axis runs. A stepper at each side winds dental floss on a spool, and the floss pulls the gantry beam, with everything on it, along the side rails.',
          'Two motors, one per side, pull both ends of the beam together.',
        ] },
        { h: 'The spool', p: [
          'Cut through the spool\'s axis: two grooves, each 4 mm wide, on a 15.5 mm radius drum between 20 mm flanges. One turn is about 97 mm of travel. Small holes through the flanges tie the floss off.',
          'At the far end of the rail, two 7 mm rollers sit one above the other, level with the top and the bottom of the drum, so a run of floss leaving either side of the drum stays level along the rail.',
        ] },
        { h: 'X: the carriage, on a belt', p: [
          'The X motor sits at the end of the beam and rides with it. It drives a GT2 timing belt through a 20-tooth pulley, 40 mm of travel per motor turn, with idler bearings at both ends of the beam.',
        ] },
        { h: 'Both together', p: [
          'Y picks the line and the row of dots, X the dot along it. Here the carriage runs a rectangle, Y first, then X, and the orange line traces the pin over the die.',
        ] },
      ],
      caption: 'My team\'s CAD on its real axes. Travel per turn is computed from the CAD: 20 teeth of 2 mm for the belt pulley, a 15.47 mm drum radius for the spools. The floss (white) and the trace (orange) are drawn; the floss and the belt are not in the CAD.' },

    { type: 'scrolly', id: 'head', module: 'head', stepHeight: '90vh', poster: `${M}/poster-head.webp`,
      h: 'The embossing head and the die',
      p: ['A servo, an arm and a pin, and a plate full of dimples. Scroll to swing the pin into one of them.'],
      steps: [
        { h: 'The head', p: [
          'A servo lies on its side on the X carriage (a DS3225MG in our CAD). An arm bolted to its horn carries the pin, whose tip is a round nose 1.6 mm across, the same size as a dimple at the surface.',
        ] },
        { h: 'Down on an arc', p: [
          'The cut runs through the pin and one row of dimples. As you scroll, the servo turns the arm. From 2.3 mm above the die, the nose touches the surface at 2.6° and reaches the bottom of the dimple at 3.3°.',
        ] },
        { h: 'Four millimetres sideways', p: [
          'The arm pivots 86 mm from the nose, so the nose moves 4.05 mm along the die on the way down, 0.9 mm of it inside the dimple. To land on a dot, the pin has to start that far to one side of it.',
        ] },
        { h: 'The die', p: [
          'The die in our CAD is a 1.6 mm plate, 206 by 249 mm, with 4,050 dimples: 25 lines of 27 cells, six dots per cell. Each dimple is 1.6 mm across and 0.6 mm deep.',
          'Dots are 2.34 mm apart both ways and lines 10 mm apart. Cells are 6.22 mm apart in groups of three, and the groups repeat every 21 mm, so from the last cell of one group to the first of the next is 8.56 mm.',
        ] },
      ],
      caption: 'My team\'s CAD, cut through the pin\'s plane; the arm turns about the servo\'s real shaft axis. The orange arc, the dimension lines and the labels are drawn, and every number is computed from the CAD.' },

    { type: 'prose', id: 'die', h: 'Laying out the die', p: [
      'Saturday night the die went into Fusion 360 under the gantry. The screenshots show the whole grid of dimples dimensioned to the frame on every side, with the gantry beam and the servo carriage plate over it.',
      'The grid in the CAD groups its cells in threes, 21 mm apart, which shows as the wider gaps between every third cell in the screenshots.',
    ],
      media: [
        [{ i: 'cad-screen-die-grid.webp', c: 'Saturday 10 p.m.: the die\'s dimple grid under the gantry in Fusion 360' }, { i: 'cad-screen-die-closeup.webp', c: 'Dimensioning the grid to the frame, 10:32 p.m.' }],
      ] },

    { type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', stepHeight: '85vh', poster: `${M}/poster-cad.webp`,
      h: 'The CAD',
      p: ['Our CAD of the whole printer, turned by the scroll.'],
      data: {
        models: [{ label: 'Prototype', src: `${M}/printer.glb` }],
      },
      steps: [
        { h: 'The whole printer', view: { azimuth: 214, elevation: 28, pad: 1.05 }, p: [
          'The frame, the gantry, the head and the die, as we modelled them in Fusion 360.',
        ] },
        { h: 'The die', view: { focus: '^anim_bp_18_', azimuth: 200, elevation: 52, pad: 1.1, highlight: [{ parts: '^anim_bp_18_', color: '#ff6b35', intensity: 0.1 }] }, p: [
          'The die plate: 4,050 dimples in 25 lines of 27 cells.',
        ] },
        { h: 'The head', view: { focus: '^anim_bp_(20|21|22|23|24)_', azimuth: 232, elevation: 14, pad: 1.5 }, p: [
          'The servo, the arm and the pin on the X carriage.',
        ] },
      ],
      caption: 'My team\'s CAD; screws dropped for the web, shapes unchanged.' },

    { type: 'iterations', id: 'timeline', h: '36 hours', items: [
      { label: 'Sat 2 a.m.', title: 'The frame on the floor', p: [
        'The 2020 extrusions laid out on the carpet with calipers and a box of hardware, the frame sketch open on the laptop. Six minutes later, three sides were bolted up.',
      ], media: [{ i: 'frame-parts-on-floor.webp', c: 'Early Saturday: extrusion, calipers and the frame sketch on the laptop' }, { i: 'frame-going-together.webp', c: 'Three sides of the frame bolted up, with the gantry CAD on the laptop' }] },
      { label: 'Sat 4 a.m.', title: 'Printing parts', p: [
        'Parts on the printer in the middle of the night.',
      ], media: [{ i: 'printing-parts-overnight.webp', c: '4:21 a.m. Saturday: printing parts' }] },
      { label: 'Bench test', title: 'One axis on its own', p: [
        'We also ran a single axis on its own on the table: one extrusion, a stepper at one end and a carriage plate on its V-wheels, with a laptop and a nest of wiring beside it.',
      ], media: [{ v: 'axis-bench-test.mp4', c: 'One axis on the bench: the carriage runs along the extrusion' }, { v: 'axis-speed-test.mp4', c: 'Another run of the bench axis' }] },
      { label: 'Sat 10 p.m.', title: 'The die in CAD', p: [
        'The dimple grid laid out under the gantry in Fusion 360.',
      ], media: [{ i: 'cad-screen-top-view.webp', c: 'The whole machine from above in Fusion 360, with the dimple grid under the gantry' }] },
      { label: 'Assembled', title: 'On the floor', p: [
        'The gantry together on the carpet: both Y motors at the far end, the beam across the side rails, the servo on its carriage, and floss along both rails.',
      ], media: [{ i: 'still-frame-top-view-2.webp', c: 'The assembled gantry on the floor' }] },
      { label: 'Sun 10 a.m.', title: 'Wired up on the desk', p: [
        'The machine on a classroom desk with paper under the gantry, a microcontroller board, red driver boards and a lot of jumper wires beside the frame.',
      ], media: [{ v: 'electronics-sweep.mp4', c: 'From the gantry down to the boards and wiring' }, { v: 'finished-machine-high.mp4', c: 'The machine from above the electronics end' }] },
    ] },
  ],
  assets: [`${M}/`],
};
