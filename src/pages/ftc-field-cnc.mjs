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
// Round 4 (Jerry, Sept 27, 21:12): the animation looked like laser cutting, so a simple generic Z axis,
// a spindle and a 1/8 in end mill were added to the trace (zaxis.js; an explicit exception to real CAD
// only, and the caption says they are not in his CAD); the end mill plunges and spins and the kerf is
// its width. "The part" section is gone (the router never cut that part: it is only an example); a
// pinned card links the e-bike instead. New facts from Jerry: the extrusion came from the trusses of
// the CENTERSTAGE game field; why he designed it and why he did not build it; ball screws and rails
// for the best stiffness and rigidity, the industry standard; what he would do next time.
// Still open (/home/claude/work/upcycled-cnc-router/questions.md): what he wanted to cut and with which
// spindle (Q5); the page names no material or spindle of his.
const M = '/assets/models/ftc-field-cnc/';
const ORANGE = '#ff6b35', BLUE = '#27c7ff';
const MOTOR = 'https://www.omc-stepperonline.com/nema-23-bipolar-1-8deg-1-9nm-269oz-in-2-8a-3-2v-57x57x76mm-4-wires-23hs30-2804s';
const EBIKE = '/projects/electric-bike';
const EFF = 'https://www.machinedesign.com/archive/article/21827028/ballscrews-vs-lead-screws';

export default {
  summary: {
    stats: [
      { v: '6', l: '2 ft lengths of 1 x 1 in field extrusion make the frame' },
      { v: '3', l: 'SFU1605 ball screws, 5 mm per turn, each on its own NEMA 23' },
      { v: '4', l: 'HIWIN HGH15 profile rails, two carriage blocks each' },
      { v: '417 x 460 mm', l: 'X and Y travel, measured in the CAD' },
    ],
    text: [
      'A benchtop CNC router I designed to be made out of the aluminum extrusions from the trusses of the CENTERSTAGE FTC game field. The whole gantry rides front to back on two profile rails, pushed by two ball screws with a stepper motor each, and the carriage runs side to side along the gantry on two more rails and a third ball screw.',
      `I did not build it. What exists is the X and Y gantry in CAD. On this page it moves about its real axes as you scroll, with a simple Z axis and spindle added (they are not in my CAD), milling an example part: the shorter side plate of my [electric bike](${EBIKE}).`,
    ],
  },
  hero: {
    layout: 'single',
    items: [{ i: 'cad-hero.webp', c: 'My CAD of the router: the field extrusion frame, the Y rails and ball screws along both sides, and the gantry with the X axis across the back, motors at the rear' }],
  },
  sections: [
    // ------------------------------------------------------------------ the trace
    { type: 'scrolly', id: 'trace', module: 'trace', stepHeight: '90vh', poster: `${M}poster-trace.webp`,
      h: 'The machine, milling a real part',
      p: [`The CAD runs a toolpath for the shorter of the two aluminum side plates of my [electric bike](${EBIKE}), at its real size, with every line and arc of its outline and holes taken from the e-bike CAD. The gantry, the carriage and all three ball screws move about their real axes as you scroll. The Z axis and spindle are a simple stand-in: my CAD stops at X and Y.`],
      steps: [
        { h: 'Three axes', p: ['The whole gantry, the bridge across the machine, moves front to back: Y. The carriage on it moves side to side: X. Each is a ball screw turned by a stepper motor.', 'The dashed box is the X and Y travel in the CAD, about 417 x 460 mm. The e-bike plate, 287 x 187 mm, is drawn on a sheet in the middle of it.'] },
        { h: 'Y: two screws, two motors', p: ['The gantry moves forward on its own first, out to the row of the first hole. Each side has its own ball screw and NEMA 23, turning together, so the gantry is pushed at both ends while its four carriage blocks slide along the two 600 mm rails.'] },
        { h: 'X: one screw, riding on the gantry', p: ['Then the carriage moves on its own, over to the first hole. The X screw, its motor, its BK12 support and its two 550 mm rails all ride on the gantry, so the whole X axis travels with every Y move.'] },
        { h: 'Z: down to the stock', p: ['The spindle comes down 73 mm to 5 mm over the stock, spinning, and plunges through the 3.175 mm plate. The first hole is 3.3 mm, only about 0.15 mm wider than the 1/8 in (3.175 mm) end mill, so a plunge is all it takes.'] },
        { h: 'Round holes first', p: ['The 14 round holes go first, nearest next each time. The six 3.3 mm holes are plunges. The six 6.2 mm holes and the two 35.1 mm bores are cut around, with the end mill\'s centre 1.6 mm inside the edge, so the black kerf falls inside the hole.'] },
        { h: 'Then the pockets', p: ['Next the slot and the 15 lattice pockets, nearest first again. Their inside corners are 3 mm radius arcs and the slot is 6.2 mm wide (CAD), so the 3.175 mm end mill reaches into every corner.'] },
        { h: 'The outline last', p: ['Then the outside, 804 mm around, with the end mill 1.6 mm outside the edge. Cutting it last keeps the plate held in the sheet while every hole and pocket is cut.'] },
        { h: 'Back home', p: ['Z goes up, the machine goes home, and the plate lifts out of the sheet.', 'One screw turn is 5 mm. A 1.8° stepper takes 200 full steps per turn, so one full step moves an axis 0.025 mm (from the part numbers, before any microstepping).'] },
      ],
      caption: 'My CNC CAD, moved about its real screw axes (read from the STEP file), running a toolpath made for this page on the exact outline and holes of the e-bike plate, unscaled. The Z axis, the spindle and the end mill are not in my CAD: they are a simple generic unit (a plate, two rails, a ball screw, a small stepper and a spindle clamp) added so the toolpath reads as milling. The end mill\'s path runs half its width off the plate\'s edges, in one pass to full depth; a real job in aluminum would step down in several shallower passes. The stock, the black kerf (the end mill\'s full width), the dashed blue rapid moves and the travel box are overlays, not parts.' },

    // ------------------------------------------------------------------ the part is the e-bike's
    { type: 'media', id: 'plate', layout: 'collage', items: [
      { i: 'ebike-plate-card.webp', c: `This part is from my e-bike project! [Check it out here →](${EBIKE})`, alt: 'The shorter side plate of my e-bike, drawn from its CAD: a lattice of triangular pockets, two large bores and small holes' },
    ] },

    // ------------------------------------------------------------------ the idea
    { type: 'prose', id: 'idea', h: 'Built from a game field', p: [
      'The frame is six 2 ft lengths of 1 x 1 in aluminum extrusion from the trusses of the CENTERSTAGE game field: two stacked along each side, and one across each end. A 4.8 mm (3/16 in) side plate stands on the outside of each pair, and stacked end plates close off both ends; the pair at the back carries the two Y motors.',
      'The motion hardware is off the shelf and named by part number in the CAD: HIWIN HGH15 profile rails, SFU1605 ball screws on BK12 supports, NEMA 23 stepper motors with bore-reducer couplers, and 550 mm lengths of 2020 extrusion for the X beams. The plates that tie it all together are mine.',
    ] },

    // ------------------------------------------------------------------ why
    { type: 'prose', id: 'why', h: 'Why I designed it, and why it stayed in CAD', p: [
      { problem: 'I was making a lot of projects that needed CNC-cut parts, and having all of them cut for me adds up.', title: 'Outsourcing every CNC part' },
      { fix: 'Owning a CNC would save a lot compared with outsourcing, so I designed one around extrusion I could get for free: the trusses of the CENTERSTAGE game field.' },
      { problem: 'Then I realized that what I would put into building it would be more than everything I would spend on CNC-cut parts between finishing it and leaving for college, where I would have access to lots of manufacturing equipment.', title: 'It would not pay for itself in time' },
      { fix: 'So I did not build it. The design stops at the X and Y gantry in CAD.' },
    ], media: [{ i: 'field-trusses.webp', c: 'My team\'s CENTERSTAGE practice field: the trusses are the aluminum A-frames that hold up the rigging and the yellow stage door (a frame from a video of our robot)' }] },

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
          p: ['Six 2 ft lengths of 1 x 1 in extrusion from the trusses of the CENTERSTAGE game field: two stacked along each side, one across each end.'] },
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
      { h: 'Why ball screws and profile rails' },
      'I chose ball screws and profile rails because they give the best stiffness and rigidity, and they are the industry standard for CNC machines. A ball screw also turns a motor\'s torque into a large push along the axis.',
      { calc: 'How hard can one Y screw push the gantry?',
        given: [
          ['Motor holding torque', '1.9 N·m', `[23HS30-2804S datasheet](${MOTOR})`],
          ['Ball screw lead', '5 mm per turn', 'SFU1605, the part number in the CAD'],
          ['Ball screw efficiency', 'about 90 %', `[Machine Design](${EFF}): "usually above 90%"`],
        ],
        work: [
          'One turn moves the nut 5 mm, so F × 0.005 m = 2π × T × η',
          'F = 2π × 1.9 N·m × 0.9 / 0.005 m ≈ **2,150 N** per screw',
          'Two Y screws, turning together: about **4,300 N** on the gantry',
          'Resolution: 5 mm / 200 full steps = **0.025 mm** per step',
        ],
        result: 'At holding torque one Y screw can push with about 2.1 kN, and the pair about 4.3 kN, with 0.025 mm per full step.',
        note: 'Upper bound, static: a stepper\'s torque falls as it speeds up, and drivers rarely run it at its full holding torque. Rounded.' },
      'Travel, lead and step size set the geometry of the machine. How fast and how hard it could really cut would depend on the spindle, the motor drivers and a real Z axis, and none of those are in my CAD.',
    ], media: [{ i: 'cad-gantry-front.webp', c: 'The gantry from the front in my CAD: the two X rails on 2020 extrusion, the X ball screw between them and the carriage at the left end, next to the X motor' }] },

    // ------------------------------------------------------------------ status
    { type: 'callout', id: 'status', h: 'Where it stopped', p: [
      'The CAD is the X and Y gantry only: there is no Z axis, spindle, bed or electronics in it (the Z axis and spindle in the animation are a stand-in).',
      { next: 'Next time I would not use an aluminum frame. Either a steel frame for an industry-standard, very capable machine, or, for an upcycled one, cheaper parts: maybe lots of 3D-printed parts, maybe even my Ryobi rotary tool as the spindle.' },
    ] },
  ],
};
