// Horizontal Extension Intake for Cryptic (FTC CENTERSTAGE, 2023-24; concept, never built).
// Rich page, scroll-first (Sept 27, 2026). There are no photos or videos: every picture is Jerry's
// CAD, rendered, and the only file is one Fusion 360 assembly of the whole robot with the intake.
// Copy uses only facts Jerry stated (his checklist entry, projects.mjs) and numbers measured on
// the CAD (said so on the page). The pixels in the animations are added annotations.
// Held back until Jerry answers (/home/claude/work/ftc-23-24-cryptic-extendo-concept/questions.md):
//  - who designed the rest of the robot in the file (Q2): the page only claims the intake and
//    its slides, and calls the rest "the robot";
//  - when he designed it (Q3), what drives the slides, rollers and fold (Q5), whether the CAD pose
//    is the folded-up position and how far the arm folds (Q6), what he would change (Q7);
//  - the travel and the retracted position (Q1): the animation retracts the intake 960.6 mm, where
//    the CAD shows it was modelled, but the page states no travel number and does not raise the
//    slide lengths; "all the teams that won Worlds had one" (his hedge, Q4) is left out.
const M = '/assets/models/cryptic-extendo/';
const ORANGE = '#ff6b35', BLUE = '#27c7ff';
const INTAKE = '^anim_cx_(carriage|ramp|omni|arm|rollF|rollP|rollR|rollC|gear40)$';

export default {
  summary: {
    stats: [
      { v: 'About 1 m', l: 'Reach past the front of the drivetrain, measured in the CAD' },
      { v: '6', l: 'TPU star rollers, 103 mm across' },
      { v: '114 mm', l: 'Fold-down arm that carries the front rollers' },
      { v: '40T : 15T', l: 'Servo gear to counter roller: 2.67 times the servo\'s speed' },
    ],
    text: [
      'After my FTC season ended and team Cryptic advanced to the World Championship, I proposed a horizontal extension intake for their robot, since it was a clear edge that year, and designed it.',
      'Two-stage slides push the intake about a metre out in front of the robot. Its front rollers fold down to the tiles, star rollers and a counter roller pull pixels up a ramp, and when the slides pull it back in, the ramp lines up with the robot\'s 4-bar dumper for the handoff. Cryptic did not use it: they chose to improve other parts of their robot, mainly its reliability.',
    ],
  },
  hero: {
    layout: 'single',
    items: [{ i: 'hero-cad.webp', c: 'The extension intake fully out, rendered from my CAD: a two-stage slide on each side carries it about a metre past the front of the robot' }],
  },
  sections: [
    // ------------------------------------------------------------------ why
    { type: 'prose', id: 'why', h: 'Why an extension intake', p: [
      'In CENTERSTAGE, the 2023-24 FTC game, robots pick up pixels, flat hexagons 3 in across and half an inch thick, and score them on a backdrop.',
      'An intake on horizontal slides reaches out for pixels while the robot stays where it is, then pulls them back inside in one motion. I thought that was a clear edge that season, so after my own season ended and Cryptic advanced to Worlds, I proposed one for their robot and designed it.',
      'It was never built, so every picture on this page is my CAD. The CAD holds the whole robot with the intake built in; the intake and its two slides are my design. The pixels in the animations are added to show their path and are not part of the CAD.',
    ],
      media: [{ i: 'still-stowed.webp', c: 'Pulled in, the intake sits inside the front of the robot, between the two sides of the drivetrain (rendered from the CAD)' }] },

    // ------------------------------------------------------------------ the cycle
    { type: 'scrolly', id: 'cycle', module: 'cycle', width: 'full', stepHeight: '85vh', poster: `${M}poster-cycle.webp`,
      h: 'One intake cycle',
      p: ['The real CAD, moved by your scroll. The slides, the fold-down arm and every roller move along or about their own axes in the model.'],
      steps: [
        { h: 'Stowed', p: ['The intake sits inside the front of the robot. Two pixels lie on the tiles about a metre ahead.'] },
        { h: 'Extend', p: ['A two-stage slide on each side of the robot pushes the whole intake forward, about a metre past the front of the drivetrain.'] },
        { h: 'Fold down', p: ['The three front star rollers ride on a 114 mm arm that pivots on the intake\'s main hex shaft. The arm folds down, bringing them down to the tiles.'] },
        { h: 'Roll in', p: ['The star rollers sweep the pixels back. The counter roller at the lip of the ramp turns the other way and lifts each one onto the ramp, and they ride up until the first sits on top, under the rear rollers.'] },
        { h: 'Fold up', p: ['The arm folds back up with both pixels on board.'] },
        { h: 'Retract', p: ['The slides pull the intake back inside the robot.'] },
        { h: 'Transfer', p: ['Pulled in, the top of the ramp sits just in front of the robot\'s 4-bar dumper, on the same centreline and at about the same width. The rollers push the pixels off the back of the ramp and into the dumper.'] },
      ],
      caption: 'Seen whole, then cut through the ramp (cut faces are hatched). The pixels are added to show the path; they are not part of the CAD. The rollers are slowed down, and their speeds are not from the CAD, which does not include the motors and servos that would drive the slides, the rollers and the fold.' },

    // ------------------------------------------------------------------ how it works
    { type: 'prose', id: 'how', h: 'How the intake works', p: [
      { h: 'Slides and frame' },
      'The intake rides on two Misumi SAR330 two-stage slides, one on each side of the robot, bolted to two triangular side plates that hang down to just above the tiles. Fully out, the front of the intake is about a metre past the front of the drivetrain. Two 1.5 in omni wheels sit under it, a few millimetres off the tiles.',
      { h: 'Rollers' },
      'Three TPU star rollers, 103 mm across, sit on the intake\'s 312 mm hex shaft, and three more on a front shaft that the fold-down arm carries 114 mm ahead of it. Both shafts carry the same sprocket on one side, for a chain between them (the chain is not in the CAD), so the front and middle rollers turn together.',
      'Behind them, two 60 mm TPU rollers sit over the flat top of the ramp. Their tips come within about 10 mm of it, less than a pixel\'s 12.7 mm, so a pixel on top is pinched between them and the ramp.',
      { problem: 'A pixel is a flat hexagon, only 12.7 mm thick, lying on the tiles, and the intake has to lift it about 70 mm to the top of its ramp.', title: 'Getting a flat pixel off the tiles' },
      { fix: 'The front star rollers are on an arm that folds down, so they come down to a pixel on the tiles and sweep it back. At the lip of the ramp a 16 mm counter roller, turning the other way, lifts the pixel\'s edge onto the ramp, and the middle star rollers carry it up to the rear rollers.' },
      { h: 'The counter roller drive' },
      'A 40-tooth servo gear drives the counter roller through a 15-tooth gear on its shaft, so the roller spins 2.67 times as fast as the servo (40 / 15). The two gears sit 22.0 mm apart, exactly right for module 0.8 gears.',
      { problem: 'Once the intake is back inside the robot, the pixels still have to get from the intake into the outtake.', title: 'The handoff' },
      { fix: 'Pulled in, the top of the ramp sits just in front of the robot\'s 4-bar dumper, on the same centreline, at the same width (102 mm for the ramp, 106 mm for the dumper\'s tray) and about 25 mm above the tray\'s front edge. The rollers push the pixels off the back of the ramp straight into the dumper.' },
      { note: 'Every dimension here is measured on the CAD: roller sizes from their meshes, the gear spacing between the shaft centres, the ramp and tray widths and heights with the model levelled on its wheels.' },
    ],
      media: [
        { i: 'still-intake.webp', c: 'The intake from the front, rendered from the CAD: star rollers on the main shaft and on the fold-down arm, the ramp between the side plates and the counter roller at its lip' },
        { i: 'still-section.webp', c: 'Cut just off the centreline with the arm folded down: the counter roller at the lip, the ramp rising to its flat top under the rear rollers, and two pixels on board (added for scale)' },
        { i: 'still-gears.webp', c: 'The counter roller drive in the CAD: the 40-tooth servo gear above the 15-tooth gear on the counter roller\'s shaft, behind the side plate' },
        { i: 'still-transfer.webp', c: 'Pulled in and cut just off the centreline, with the lift above cut away: the ramp on the right, the 4-bar dumper\'s tray on the left, and two pixels handed over (added for scale)' },
      ] },

    // ------------------------------------------------------------------ the CAD
    { type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', stepHeight: '85vh', poster: `${M}poster-cad.webp`,
      h: 'The design in CAD',
      p: ['My CAD, turned by your scroll.'],
      data: {
        models: [{ label: 'Intake out', src: `${M}robot.glb` }],
        azimuth: 35, elevation: 22, pad: 1.0, drift: 10,
      },
      steps: [
        { h: 'The whole robot', view: { azimuth: 35, elevation: 22, pad: 1.0 },
          p: ['The intake fully out on its slides. Behind it is the rest of the robot in the file: a mecanum drivetrain, an angled lift and the 4-bar dumper that the intake feeds.'] },
        { h: 'Rollers and ramp', view: { focus: INTAKE, azimuth: 50, elevation: 24, pad: 1.2,
            labels: [{ text: 'Star rollers (TPU)', at: [0.042, 0.15, 1.032], color: ORANGE }, { text: 'Ramp', at: [-0.03, 0.062, 1.04], color: BLUE, side: 'l' }, { text: 'Counter roller', at: [0.035, 0.0163, 1.098], color: BLUE }, { text: '1.5 in omni wheel', at: [0.069, 0.026, 0.993], side: 'l', minW: 520 }] },
          p: ['Six star rollers in two rows over a ramp one pixel wide, with the counter roller at the ramp\'s lip.'] },
        { h: 'The chain side', view: { focus: INTAKE, azimuth: -70, elevation: 14, pad: 1.15,
            labels: [{ text: 'Sprocket, main shaft', at: [-0.1, 0.124, 1.032], color: ORANGE, side: 'l' }, { text: 'Sprocket, front shaft', at: [-0.1, 0.124, 1.146], color: ORANGE }] },
          p: ['The same sprocket on the main shaft and on the front shaft of the fold-down arm, for a chain between them, so both rows of star rollers turn together.'] },
        { h: 'The gear side', view: { focus: '^anim_cx_(rollC|gear40)$', azimuth: 85, elevation: 6, pad: 2.6, cut: { normal: [-1, 0, 0], at: 0.314 },
            labels: [{ text: '40T servo gear', at: [0.069, 0.0383, 1.0979], color: ORANGE }, { text: '15T gear', at: [0.066, 0.0163, 1.098], color: BLUE, side: 'l' }] },
          p: ['On the other side, cut just inside the ramp\'s side wall: the 40-tooth servo gear drives the 15-tooth gear on the counter roller\'s shaft.'] },
      ],
      caption: 'Cut faces are hatched. Screws, nuts and e-clips are left out, and so are seven stray copies of robot parts that sat inside the intake\'s component in the file. Every other part is the CAD as modelled.' },

    // ------------------------------------------------------------------ outcome
    { type: 'prose', id: 'outcome', h: 'Why Cryptic did not use it', p: [
      'Cryptic did not use it. They wanted to improve other parts of their robot for Worlds, mainly its reliability.',
      '[See my own team\'s 2023-24 robot](/projects/ftc-centerstage)',
    ] },
  ],
  assets: ['/assets/models/cryptic-extendo/'],
};
