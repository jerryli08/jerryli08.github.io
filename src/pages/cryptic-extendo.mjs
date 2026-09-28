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
//  - the slide lengths (Q1): the page does not raise that the 700 mm members stick out behind the
//    robot when closed; "all the teams that won Worlds had one" (his hedge, Q4) is left out.
// Retracted pose (Jerry, Sept 27, 21:12: "all of the backs and fronts should be aligned when stowed").
// Each side is three Misumi SAR330 slides in a cascade, every slide three bodies of 300.0 mm (the
// last round took each whole slide, extended, for one member of 460.6 or 700 mm). Retracted, all
// nine bodies on a side line up front and back, inside the robot; fully out every part is where
// the CAD has it: 960.6 mm of travel for the intake (the same 960.6 mm where the CAD's in-place
// copies put the retracted intake). Travel per body in rig.js.
// Outcome (Jerry, Sept 27, 21:12): the Worlds deadline was fast approaching and it added too much
// risk for the reward, but it was a fun design challenge.
const M = '/assets/models/cryptic-extendo/';
const ORANGE = '#ff6b35', BLUE = '#27c7ff';
const INTAKE = '^anim_cx_(carriage|ramp|omni|arm|rollF|rollP|rollR|rollC|gear40)$';

export default {
  summary: {
    stats: [
      { v: 'About 1 m', l: 'Reach past the front of the drivetrain, measured in the CAD' },
      { v: '3 x 3', l: 'Slides a side, three 300 mm bodies each, all in line when stowed' },
      { v: '6', l: 'TPU star rollers, 103 mm across' },
      { v: '40T : 15T', l: 'Servo gear to counter roller: 2.67 times the servo\'s speed' },
    ],
    text: [
      'After my FTC season ended and team Cryptic advanced to the World Championship, I proposed a horizontal extension intake for their robot, since it was a clear edge that year, and designed it.',
      'Three slides on each side, opening one after another, push the intake about a metre out in front of the robot. Its front rollers fold down to the tiles, star rollers and a counter roller pull pixels up a ramp, and when the slides pull it back in, the ramp lines up with the robot\'s 4-bar dumper for the handoff. It stayed a concept: with Worlds coming up fast, it added too much risk for the reward.',
    ],
  },
  hero: {
    layout: 'single',
    items: [{ i: 'hero-cad.webp', c: 'The extension intake fully out, rendered from my CAD: three slides on each side carry it about a metre past the front of the robot' }],
  },
  sections: [
    // ------------------------------------------------------------------ the cycle
    { type: 'scrolly', id: 'cycle', module: 'cycle', width: 'full', stepHeight: '85vh', poster: `${M}poster-cycle.webp`,
      h: 'One intake cycle',
      p: ['The real CAD, moved by your scroll. The slides, the fold-down arm and every roller move along or about their own axes in the model.'],
      steps: [
        { h: 'Stowed', p: ['From the side, with the outer drive plate hidden: each side has three slides of three 300 mm bodies each. Stowed, all nine sit in line, front and back, inside the robot.'] },
        { h: 'Extend', p: ['The slides open one after another: the first by 160.6 mm, the next two by 400 mm each. That carries the intake 960.6 mm, about a metre past the front of the drivetrain.'] },
        { h: 'Fold down', p: ['The three front star rollers ride on a 114 mm arm that pivots on the intake\'s main hex shaft. The arm folds down, bringing them down to the tiles.'] },
        { h: 'Roll in', p: ['The star rollers sweep the pixels back. The counter roller at the lip of the ramp turns the other way and lifts each one onto the ramp, and they ride up until the first sits on top, under the rear rollers.'] },
        { h: 'Fold up', p: ['The arm folds back up with both pixels on board.'] },
        { h: 'Retract', p: ['The slides close up again, all nine bodies on each side back in line inside the robot, and the intake sits between the two sides of the drivetrain.'] },
        { h: 'Transfer', p: ['Pulled in, the top of the ramp sits just in front of the robot\'s 4-bar dumper, on the same centreline and at about the same width. The rollers push the pixels off the back of the ramp and into the dumper.'] },
      ],
      caption: 'Seen from the side with the outer drive plate hidden, then cut through the ramp (cut faces are hatched). The pixels are added to show the path; they are not part of the CAD. The rollers are slowed down, and their speeds are not from the CAD, which does not include the motors and servos that would drive the slides, the rollers and the fold.' },

    // ------------------------------------------------------------------ why
    { type: 'prose', id: 'why', h: 'Why an extension intake', p: [
      'In CENTERSTAGE, the 2023-24 FTC game, robots pick up pixels, flat hexagons 3 in across and half an inch thick, and score them on a backdrop.',
      'An intake on horizontal slides reaches out for pixels while the robot stays where it is, then pulls them back inside in one motion. I thought that was a clear edge that season, so after my own season ended and Cryptic advanced to Worlds, I proposed one for their robot and designed it.',
      'It was never built, so every picture on this page is my CAD. The CAD holds the whole robot with the intake built in; the intake and its slides are my design. The pixels in the animations are added to show their path and are not part of the CAD.',
    ],
      media: [{ i: 'still-stowed.webp', c: 'Stowed, rendered from the CAD: the slides closed up inside the robot along both sides of the drivetrain, and the intake inside its front, between them' }] },

    // ------------------------------------------------------------------ how it works
    { type: 'prose', id: 'how', h: 'How the intake works', p: [
      { h: 'Slides and frame' },
      'The intake rides on six Misumi SAR330 slides, three on each side of the robot, and every slide is three 300 mm bodies: an outer, a middle and an inner one. On each side the first slide\'s outer body stays with the robot, against the outer drive plate. Its inner body is joined back to back to the second slide\'s outer body by two V-groove blocks, the second slide\'s inner body to the third\'s outer body the same way, and the third slide\'s inner body carries the intake. The intake is built between two triangular side plates that hang from those inner bodies to just above the tiles, with two 1.5 in omni wheels under it, a few millimetres off them.',
      { calc: 'How far do the slides carry the intake?',
        given: [
          ['Slides on each side', '3, bolted in a row', 'from the CAD'],
          ['Bodies in each slide', '3, each 300.0 mm long', 'measured from the CAD'],
          ['First slide, fully out as modelled', 'inner body 160.6 mm out', 'measured from the CAD'],
          ['Second and third slides', 'middle 200 mm past outer, inner 200 mm past middle', 'measured from the CAD'],
          ['Stowed', 'all nine bodies in line, front and back', 'Jerry'],
        ],
        work: [
          'Intake travel = 160.6 + (200 + 200) + (200 + 200) = **960.6 mm**',
          'Stowed, a side packs into one body length, **300 mm**, while the robot is 455 mm from front to back (measured from the CAD)',
          'Fully out, each body of the second and third slides still overlaps the one it rides on by 300 − 200 = **100 mm**',
          'The front rollers then sit 999 mm past the front of the drivetrain (measured from the CAD)',
        ],
        result: 'Nine 300 mm bodies on each side give 0.96 m of travel, and stowed they all sit inside the robot: front ends about 2 mm behind its front, back ends about 150 mm ahead of its back.' },
      { note: 'Measured along the slide axis on the levelled CAD. The CAD has no motor or string for the slides, so there is no speed to work out.' },
      { h: 'Rollers' },
      'Three TPU star rollers, 103 mm across, sit on the intake\'s 312 mm hex shaft, and three more on a front shaft that the fold-down arm carries 114 mm ahead of it. Both shafts carry the same sprocket on one side, for a chain between them (the chain is not in the CAD), so the front and middle rollers turn together.',
      'Behind them, two 60 mm TPU rollers sit over the flat top of the ramp. Their tips come within about 10 mm of it, less than a pixel\'s 12.7 mm, so a pixel on top is pinched between them and the ramp.',
      { problem: 'A pixel is a flat hexagon, only 12.7 mm thick, lying on the tiles, and the intake has to lift it about 70 mm to the top of its ramp.', title: 'Getting a flat pixel off the tiles' },
      { fix: 'The front star rollers are on an arm that folds down, so they come down to a pixel on the tiles and sweep it back. At the lip of the ramp a 16 mm counter roller, turning the other way, lifts the pixel\'s edge onto the ramp, and the middle star rollers carry it up to the rear rollers.' },
      { h: 'The counter roller drive' },
      'A 40-tooth servo gear drives the counter roller through a 15-tooth gear on its shaft, so the roller spins 2.67 times as fast as the servo (40 / 15). The two gears sit 22.0 mm apart, exactly right for module 0.8 gears.',
      { calc: 'Do the counter roller gears mesh?',
        given: [
          ['Servo gear (goBILDA 2305-0025-0040)', '40 teeth, module 0.8', 'part number in the CAD; [goBILDA](https://www.gobilda.com/2305-series-brass-mod-0-8-servo-gear-25-tooth-spline-40-tooth/)'],
          ['Gear on the counter roller', '15 teeth', 'counted in the CAD'],
          ['Shaft centres apart', '22.0 mm', 'measured from the CAD'],
        ],
        work: [
          'Speed: 40 / 15 = **2.67** turns of the counter roller for every turn of the servo',
          'Centre distance for a module 0.8 pair: 0.8 × (40 + 15) / 2 = **22.0 mm**',
        ],
        result: 'The spacing in the CAD is exactly the centre distance of a module 0.8 pair, so the two gears mesh as modelled, and the counter roller runs 2.67 times as fast as the servo.' },
      { note: 'Spur gears: centre distance = module × (teeth on both gears) / 2.' },
      { problem: 'Once the intake is back inside the robot, the pixels still have to get from the intake into the outtake.', title: 'The handoff' },
      { fix: 'Pulled in, the top of the ramp sits just in front of the robot\'s 4-bar dumper, on the same centreline, at the same width (102 mm for the ramp, 106 mm for the dumper\'s tray) and about 25 mm above the tray\'s front edge. The rollers push the pixels off the back of the ramp straight into the dumper.' },
      { note: 'Every dimension here is measured on the CAD: roller sizes from their meshes, the gear spacing between the shaft centres, the ramp and tray widths and heights with the model levelled on its wheels.' },
    ],
      media: [
        { i: 'still-stowed-side.webp', c: 'Stowed, seen from the side with the outer drive plate hidden (rendered from the CAD): the slide bodies on this side all end in line, front and back, inside the robot' },
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
    { type: 'prose', id: 'outcome', h: 'This remained just a concept', p: [
      'Cryptic did not use it. The Worlds deadline was coming up fast, and a new intake added too much risk for the reward, so they put their time into other parts of their robot, mainly its reliability. It was still a fun design challenge.',
      '[See my own team\'s 2023-24 robot](/projects/ftc-centerstage)',
    ] },
  ],
  assets: ['/assets/models/cryptic-extendo/'],
};
