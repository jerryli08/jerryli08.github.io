// Upcycled CNC Router (concept, CAD only). Rich page, scroll-first (Sept 27, 2026).
// Copy uses only facts Jerry stated (his checklist entry, projects.mjs, the orchestrator's brief:
// "the frame is six 2 ft 1 x 1 in field extrusions"), the part numbers in his CAD, and numbers
// measured or computed from the CAD (said so where used). Motor data is StepperOnline's published
// spec for the part number in the CAD (23HS30-2804S).
// There are no photos or videos of the router: every picture of it is his CAD. The cursor-following view
// he asked for became a scroll-driven toolpath under his Sept 26 scroll-only rule.
// Sept 27: Jerry asked for the router to cut "a relatively complex part like one of the sideplates of my
// ebike (the shorter one)" instead of the earlier simple shape. The part is `drivetrain-side plate:1` from
// ebike_full_ebike_asm.step (186.9 mm tall against 285.2 mm for the non-drive-side plate), its exact
// outline and holes read from the STEP B-rep (assets/models/ftc-field-cnc/ebike-drive-plate.json), at
// real size. The toolpath order (round holes, then the slot and pockets, then the outline) is ours, for
// the page; the copy never says Jerry made or cut it on this router.
// Held back until Jerry answers (/home/claude/work/upcycled-cnc-router/questions.md): when he designed
// it (Q1, answered Sept 27: Nov 2024, set in src/projects.mjs), which field the extrusion came from (Q2), the left Y ball screw, which
// is flipped end for end and not connected to the gantry in the CAD (Q3, not mentioned), what he would
// change (Q4, no "next time" block), what it was for and which spindle (Q5), and why ball screws and
// profile rails (Q6: the page says what they do, not why he chose them). No problem or fix is stated
// for this project, so none is invented.
const M = '/assets/models/ftc-field-cnc/';
const ORANGE = '#ff6b35', BLUE = '#27c7ff';
const MOTOR = 'https://www.omc-stepperonline.com/nema-23-bipolar-1-8deg-1-9nm-269oz-in-2-8a-3-2v-57x57x76mm-4-wires-23hs30-2804s';
const EBIKE = '/projects/electric-bike';

export default {
  summary: {
    stats: [
      { v: '6', l: '2 ft lengths of 1 x 1 in field extrusion make the frame' },
      { v: '3', l: 'SFU1605 ball screws, 5 mm per turn, each on its own NEMA 23' },
      { v: '4', l: 'HIWIN HGH15 profile rails, two carriage blocks each' },
      { v: '417 x 460 mm', l: 'X and Y travel, measured in the CAD' },
    ],
    text: [
      'A benchtop CNC router I designed to be made out of the aluminum extrusions from the CENTERSTAGE FTC game field. The whole gantry rides front to back on two profile rails, pushed by two ball screws with a stepper motor each, and the carriage runs side to side along the gantry on two more rails and a third ball screw.',
      `I did not build it: I got busy, and I realized I would not have a use for a CNC soon because I was going to college in a year. What exists is the X and Y gantry in CAD. On this page it moves about its real axes as you scroll, running a toolpath for a real part: the shorter side plate of my [electric bike](${EBIKE}).`,
    ],
  },
  hero: {
    layout: 'single',
    items: [{ i: 'cad-hero.webp', c: 'My CAD of the router: the field extrusion frame, the Y rails and ball screws along both sides, and the gantry with the X axis across the back, motors at the rear' }],
  },
  sections: [
    // ------------------------------------------------------------------ the idea
    { type: 'prose', id: 'idea', h: 'Built from a game field', p: [
      'The frame is six 2 ft lengths of 1 x 1 in aluminum extrusion from the CENTERSTAGE field: two stacked along each side, and one across each end. A 4.8 mm (3/16 in) side plate stands on the outside of each pair, and stacked end plates close off both ends; the pair at the back carries the two Y motors.',
      'The motion hardware is off the shelf and named by part number in the CAD: HIWIN HGH15 profile rails, SFU1605 ball screws on BK12 supports, NEMA 23 stepper motors with bore-reducer couplers, and 550 mm lengths of 2020 extrusion for the X beams. The plates that tie it all together are mine.',
    ] },

    // ------------------------------------------------------------------ the trace
    { type: 'scrolly', id: 'trace', module: 'trace', stepHeight: '90vh', poster: `${M}poster-trace.webp`,
      h: 'The machine, cutting a real part',
      p: [`The CAD runs a toolpath for the shorter of the two aluminum side plates of my [electric bike](${EBIKE}), at its real size, with every line and arc of its outline and holes taken from the e-bike CAD. The gantry, the carriage and all three ball screws move about their real axes as you scroll.`],
      steps: [
        { h: 'Two axes', p: ['The whole gantry, the bridge across the machine, moves front to back: that is Y. The carriage on the gantry moves side to side: that is X. Every move is a ball screw turned by a stepper motor.', 'The dashed box is the travel the rails and screws allow in the CAD: about 417 mm in X and 460 mm in Y. The e-bike plate, 287 x 187 mm, is drawn on a sheet of stock in the middle of it.'] },
        { h: 'Y: two screws, two motors', p: ['The gantry moves forward on its own first, out to the row of the first hole. Each side has its own ball screw and NEMA 23, and both screws turn together, so the gantry is pushed at both ends while its four carriage blocks slide along the two 600 mm rails.'] },
        { h: 'X: one screw, riding on the gantry', p: ['Then the carriage moves on its own, over to the first hole. The X screw, its motor, its BK12 support and its two 550 mm rails all ride on the gantry, so the whole X axis travels with every Y move.'] },
        { h: 'Round holes first', p: ['Now both axes move at once. The 14 round holes go first, each followed by the nearest one left: six 3.3 mm holes, six 6.2 mm holes and two 35.1 mm bores (measured from the CAD).', 'Every point on the path is a pair of screw positions: each screw turns once for every 5 mm its axis moves.'] },
        { h: 'Then the pockets', p: ['Next the slot and the 15 lattice pockets, nearest first again. Every inside corner of the pockets is a 3 mm radius arc in the CAD and the slot is 6.2 mm wide, so a cutter up to 6 mm across can follow them all the way around.'] },
        { h: 'The outline last', p: ['A rapid move out to the edge, then the outside of the plate, 804 mm around. Cutting the outline last keeps the plate held in the sheet while every hole and pocket is cut.'] },
        { h: 'Back home', p: ['Home again, and the plate lifts out of the sheet.', 'One turn of a screw is 5 mm of travel. A 1.8° stepper takes 200 full steps per turn, so one full step moves an axis 0.025 mm (computed from the part numbers, before any microstepping).'] },
      ],
      caption: 'My CNC CAD, moved about its real screw axes (read from the STEP file), running a toolpath made for this page on the exact outline and holes of the e-bike plate, unscaled. There is no Z axis, spindle or bed in the CAD yet, so the tool point is a pointer just in front of the X carriage and the stock lies at the height of the lower frame extrusions. With no cutter chosen, the path follows the plate\'s own edges. The stock, the pointer, the dark cut line, the dashed blue rapid moves and the travel box are overlays, not parts.' },

    // ------------------------------------------------------------------ the part, in numbers
    { type: 'prose', id: 'part', h: 'The part', p: [
      `The plate is the drive-side one of the two side plates on my [electric bike](${EBIKE}), and the shorter: 187 mm tall against 285 mm for the other side. On the bike it is powder-coated 5052 aluminum, 3.175 mm (1/8 in) thick in the CAD. Its outline is 16 lines and arcs, and inside it are 14 round holes, a slot and 15 lattice pockets: every edge a straight line or a circular arc, read here straight from the e-bike CAD.`,
      { calc: 'Does the plate fit the router?',
        given: [
          ['Plate, overall', '287.1 x 186.9 mm', 'measured from the e-bike CAD'],
          ['Travel, X x Y', '416.8 x 460.2 mm', 'measured from the CNC CAD'],
        ],
        work: [
          'Spare in X: 416.8 − 287.1 = 129.7 mm',
          'Spare in Y: 460.2 − 186.9 = 273.3 mm',
          'Area used: (287.1 × 186.9) / (416.8 × 460.2) = 53,660 / 191,810 mm² ≈ 28 %',
          'Turned 90°: 186.9 ≤ 416.8 and 287.1 ≤ 460.2, so it fits either way round',
        ],
        result: 'The plate fits at its real size, with about 130 mm to spare in X and 273 mm in Y, on a little over a quarter of the work area.',
        note: 'Bounding boxes only. A real toolpath runs one cutter radius outside the outline: at most 3 mm, since the 3 mm pocket corners need a cutter no wider than 6 mm.' },
      { calc: 'How far does the tool go?',
        given: [
          ['Outline, around', '803.9 mm', 'measured from the e-bike CAD'],
          ['14 round holes, around', '400.2 mm in all', 'measured from the e-bike CAD'],
          ['Slot and 15 pockets, around', '1,289.4 mm in all', 'measured from the e-bike CAD'],
          ['Ball screw lead', '5 mm per turn', 'SFU1605, the part number in the CNC CAD'],
          ['Full steps per turn', '200', `1.8° per step, [23HS30-2804S datasheet](${MOTOR})`],
        ],
        work: [
          'Cut length = 803.9 + 400.2 + 1,289.4 = 2,493.5 mm, about 2.5 m',
          'Rapid moves between them, in the order shown above: 1,873 mm',
          'X travel over the whole path, added up: 2,983 mm, so the X screw turns 2,983 / 5 ≈ 597 times, 119,300 full steps',
          'Y travel added up: 2,447 mm, so each Y screw turns 2,447 / 5 ≈ 489 times, 97,900 full steps',
        ],
        result: 'One plate is about 2.5 m of cutting: the X screw turns about 597 times and each Y screw about 489 times.',
        note: 'Along the plate\'s own edges, before any cutter offset or depth passes; path lengths computed from the CAD geometry.' },
    ], media: [
      { i: '/assets/media/electric-bike/finished-drive-side.webp', c: 'The drive side of my e-bike, the side this plate sits on' },
      { i: `${M}plate-profile.webp`, c: 'The plate as the toolpath uses it: 14 round holes first, then the slot and 15 pockets, the outline last. Every line and arc from my e-bike CAD' },
    ] },

    // ------------------------------------------------------------------ what it is built from
    { type: 'scrolly', id: 'parts', module: '@turntable', stepHeight: '85vh', poster: `${M}poster-parts.webp`,
      h: 'What it is built from',
      p: ['The CAD, part by part, turning as you scroll.'],
      data: {
        models: [{ label: 'Gantry', src: `${M}gantry.glb` }],
        azimuth: 35, elevation: 30, pad: 1.02, drift: 10,
      },
      steps: [
        { h: 'The frame', view: { azimuth: 35, elevation: 34, pad: 1.02, highlight: [{ parts: 'cnc_frame$', color: ORANGE, intensity: 0.35 }],
            labels: [{ text: '1 x 1 in field extrusion', part: 'cnc_frame$', color: ORANGE }] },
          p: ['Six 2 ft lengths of 1 x 1 in extrusion from the CENTERSTAGE field: two stacked along each side, one across each end.'] },
        { h: 'Y: two 600 mm rails', view: { focus: 'cnc_yrails$|cnc_yblocks$', azimuth: 62, elevation: 24, pad: 1.1,
            highlight: [{ parts: 'cnc_yblocks$', color: ORANGE, intensity: 0.35 }],
            labels: [{ text: 'Two carriage blocks per rail', at: [0.503, 0.156, -0.36], color: ORANGE }, { text: '600 mm rail', at: [0.494, 0.146, -0.1], side: 'l' }] },
          p: ['HIWIN HGH15 profile rails, 600 mm long, one on the outside of each side plate. Each rail has two carriage blocks, and the gantry rides on all four.'] },
        { h: 'X: two 550 mm rails', view: { focus: 'cnc_xbeams$|cnc_xblocks$', azimuth: 14, elevation: 22, pad: 1.45,
            highlight: [{ parts: 'cnc_xblocks$', color: ORANGE, intensity: 0.35 }],
            labels: [{ text: 'X carriage blocks', part: 'cnc_xblocks$', color: ORANGE, side: 'l' }] },
          p: ['Two more HGH15 rails, 550 mm long, each on a length of 2020 extrusion across the gantry, with two blocks each. The four blocks and the ball nut are the X carriage; the plate that would tie them together and carry a Z axis is not in the CAD yet.'] },
        { h: 'Ball screws', view: { focus: 'cnc_yscrew_R$|cnc_ybk12_R$', azimuth: 66, elevation: 16, pad: 1.35, cut: { normal: [-1, 0, 0], at: 0.089 },
            highlight: [{ parts: 'cnc_yscrew_R$', color: ORANGE, intensity: 0.3 }, { parts: 'cnc_ybk12_R$', color: BLUE, intensity: 0.3 }],
            labels: [{ text: 'SFU1605: 16 mm, 5 mm lead', at: [0.5164, 0.092, -0.2], color: ORANGE }, { text: 'BK12 fixed support', at: [0.5164, 0.114, -0.005], color: BLUE, side: 'l' }] },
          p: ['Three SFU1605 ball screws, 16 mm across with a 5 mm lead: two 600 mm screws for Y and a 550 mm screw for X. Each has a BK12 fixed support and a coupler from the motor\'s 6.35 mm shaft to the screw\'s 10 mm end.'] },
        { h: 'Dual-drive Y', view: { azimuth: 180, elevation: 22, pad: 1.0,
            highlight: [{ parts: 'cnc_ymotors$', color: ORANGE, intensity: 0.35 }, { parts: 'cnc_yscrew_(L|R)$', color: BLUE, intensity: 0.3 }],
            labels: [{ text: 'Left Y motor', at: [-0.042, 0.112, -0.62], color: ORANGE, side: 'l' }, { text: 'Right Y motor', at: [0.511, 0.112, -0.62], color: ORANGE }] },
          p: ['From the back: each Y screw has its own NEMA 23 ([23HS30-2804S](' + MOTOR + '), 1.8° per step, 1.9 N·m holding torque). The two turn together, so the gantry is pushed at both ends.'] },
        { h: 'The gantry', view: { focus: 'cnc_gantry$|cnc_spacers$|cnc_xbeams$', azimuth: 48, elevation: 20, pad: 1.4,
            highlight: [{ parts: 'cnc_spacers$', color: ORANGE, intensity: 0.4 }],
            labels: [{ text: 'Five spacer plates to the Y nut', at: [0.531, 0.114, -0.403], color: ORANGE, side: 'l' }] },
          p: ['The gantry is one 678 x 216 mm plate, 4.8 mm thick, with reinforcement plates front and back at each end. A stack of five spacer plates at each end steps out to the Y ball nut, and end plates carry the two X beams, the X motor on the left and the X screw\'s BK12 on the right.'] },
      ],
      caption: 'Screws and bolts are left out; every other part is my CAD as modelled. Sizes are measured in the CAD.' },

    // ------------------------------------------------------------------ one screw up close
    { type: 'scrolly', id: 'screw', module: 'screw', stepHeight: '90vh', poster: `${M}poster-screw.webp`,
      h: 'Five millimetres per turn',
      p: ['The right Y ball screw up close, cut through its own axis. Scroll to turn it.'],
      steps: [
        { h: 'Motor to screw', p: ['At the back of the machine the NEMA 23 drives the screw through a bore-reducer coupler: 6.35 mm on the motor side, 10 mm on the screw side, straight through with no belt or gears.'] },
        { h: 'Four turns, 20 mm', p: ['The screw is held in place and turns; the ball nut on it cannot, so it moves 5 mm along the screw for every turn. The nut is bolted to the gantry through the stack of five spacer plates, and the whole gantry moves with it while the carriage blocks slide along the rail.', 'Four turns of the motor, 800 full steps, move the gantry 20 mm.'] },
        { h: 'The fixed end', p: ['At the front, the screw\'s 12 mm journal sits in a BK12 support block, which holds the screw both along and across its axis.'] },
        { h: 'Both sides at once', p: ['The cut lifts away. Both Y screws turn together, each on its own motor at the back, and the gantry keeps moving square to the frame.'] },
      ],
      caption: 'Cut faces are hatched. The screw turns about its axis as read from the STEP file; the motor spec is StepperOnline\'s for the part number in the CAD. The push is computed from the holding torque and the lead, with a 90 % efficient screw assumed.' },

    // ------------------------------------------------------------------ numbers
    { type: 'prose', id: 'numbers', h: 'The numbers in the CAD', p: [
      'Everything in this table is read from the CAD, from the part numbers in it, or computed from them.',
      { table: {
        head: ['', 'X (side to side)', 'Y (front to back)'],
        rows: [
          ['What moves', 'The carriage: four blocks and the ball nut', 'The whole gantry, with the X axis on it'],
          ['Rails', 'Two HGH15, 550 mm, on 2020 extrusion', 'Two HGH15, 600 mm, on the side plates'],
          ['Ball screws', 'One SFU1605, 550 mm', 'Two SFU1605, 600 mm, one per side'],
          ['Motors', 'One NEMA 23', 'Two NEMA 23, turning together'],
          ['Travel in the CAD', 'About 417 mm', 'About 460 mm'],
          ['Per screw turn', '5 mm', '5 mm'],
          ['Per full motor step', '0.025 mm', '0.025 mm'],
        ],
        caption: 'Travel: X stops when the carriage blocks reach the end of their rails; Y stops when the gantry plates reach the Y motor plates at the back and when the carriage blocks reach the end of the rails at the front. Per step: 5 mm over 200 full steps of a 1.8° motor.',
      } },
      'Travel, lead and step size set the geometry of the machine. How fast and how hard it could cut would depend on the spindle, the motor drivers and the Z axis, and none of those are in the CAD yet.',
    ], media: [{ i: 'cad-gantry-front.webp', c: 'The gantry from the front in my CAD: the two X rails on 2020 extrusion, the X ball screw between them and the carriage at the left end, next to the X motor' }] },

    // ------------------------------------------------------------------ status
    { type: 'callout', id: 'status', h: 'Where it stopped', p: [
      'The CAD is the X and Y gantry only: there is no Z axis, spindle, bed or electronics yet. I did not build it because I got busy, and I realized I would not have a use for a CNC soon because I was going to college in a year.',
    ] },
  ],
};
