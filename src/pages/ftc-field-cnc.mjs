// Upcycled CNC Router (concept, CAD only). Rich page, scroll-first (Sept 27, 2026).
// Copy uses only facts Jerry stated (his checklist entry, projects.mjs, the orchestrator's brief:
// "the frame is six 2 ft 1 x 1 in field extrusions"), the part numbers in his CAD, and numbers
// measured or computed from the CAD (said so where used). Motor data is StepperOnline's published
// spec for the part number in the CAD (23HS30-2804S).
// There are no photos or videos: every picture is his CAD. The cursor-following view he asked for
// became a scroll-driven toolpath under his Sept 26 scroll-only rule; the page says nothing of a cursor.
// Held back until Jerry answers (/home/claude/work/upcycled-cnc-router/questions.md): when he designed
// it (Q1, no date on the page), which field the extrusion came from (Q2), the left Y ball screw, which
// is flipped end for end and not connected to the gantry in the CAD (Q3, not mentioned), what he would
// change (Q4, no "next time" block), what it was for and which spindle (Q5), and why ball screws and
// profile rails (Q6: the page says what they do, not why he chose them). No problem or fix is stated
// for this project, so none is invented.
const M = '/assets/models/ftc-field-cnc/';
const ORANGE = '#ff6b35', BLUE = '#27c7ff';
const MOTOR = 'https://www.omc-stepperonline.com/nema-23-bipolar-1-8deg-1-9nm-269oz-in-2-8a-3-2v-57x57x76mm-4-wires-23hs30-2804s';

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
      'I did not build it: I got busy, and I realized I would not have a use for a CNC soon because I was going to college in a year. What exists is the X and Y gantry in CAD, and on this page it moves about its real axes as you scroll.',
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
    { type: 'scrolly', id: 'trace', module: 'trace', width: 'full', stepHeight: '90vh', poster: `${M}poster-trace.webp`,
      h: 'The machine, drawing',
      p: ['The CAD traces the outline of a CENTERSTAGE pixel, the game piece of the field its frame comes from. The gantry, the carriage and all three ball screws move about their real axes as you scroll.'],
      steps: [
        { h: 'Two axes', p: ['The whole gantry, the bridge across the machine, moves front to back: that is Y. The carriage on the gantry moves side to side: that is X. Every move is a ball screw turned by a stepper motor.', 'The dashed box is the travel the rails and screws allow in the CAD: about 417 mm in X and 460 mm in Y.'] },
        { h: 'Y: two screws, two motors', p: ['The gantry moves forward on its own first. Each side has its own ball screw and NEMA 23, and both screws turn together, so the gantry is pushed at both ends while its four carriage blocks slide along the two 600 mm rails.'] },
        { h: 'X: one screw, riding on the gantry', p: ['Then the carriage moves on its own. The X screw, its motor, its BK12 support and its two 550 mm rails all ride on the gantry, so the whole X axis travels with every Y move.'] },
        { h: 'The hole', p: ['Now both axes move at once and cut the hole in the middle of the pixel. Every point on the path is a pair of screw positions: each screw turns once for every 5 mm its axis moves.'] },
        { h: 'The outline', p: ['A rapid move out, then the outside of the pixel, 352 mm across its corners: scaled up to fill the travel.'] },
        { h: 'Back home', p: ['One turn of a screw is 5 mm of travel. A 1.8° stepper takes 200 full steps per turn, so one full step moves an axis 0.025 mm (computed from the part numbers, before any microstepping).'] },
      ],
      caption: 'My CAD, moved about its real screw axes (read from the STEP file). There is no Z axis or spindle in the CAD yet, so the path follows a point just in front of the X carriage, drawn on the top of the lower frame extrusions. Solid orange is cutting, dashed blue is a rapid move; the path, the pointer and the travel box are overlays, not parts.' },

    // ------------------------------------------------------------------ what it is built from
    { type: 'scrolly', id: 'parts', module: '@turntable', width: 'wide', side: 'right', stepHeight: '85vh', poster: `${M}poster-parts.webp`,
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
    { type: 'scrolly', id: 'screw', module: 'screw', width: 'wide', side: 'left', stepHeight: '90vh', poster: `${M}poster-screw.webp`,
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
