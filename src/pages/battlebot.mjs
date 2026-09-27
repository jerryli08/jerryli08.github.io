// 1 lb Combat Robot: rich page. Facts are Jerry's (src/projects.mjs, his checklist, the README of
// his public antweight repo) or plainly shown by the media; sizes, fastener counts and blade
// shapes are measured on his two STEP files and say so. The weapon speeds are his own calculator.
// Held back until Jerry answers (see /home/claude/work/battlebot/questions.md): the robot's name,
// which blade fought, whether anything mechanical broke at the event, what he fixed in the pits,
// the unlabelled donor motors, the computed blade moment of inertia, and every next-time idea.
// No livestream or event-floor footage: every clip of the matches shows spectators' faces (a
// floor-only recut is requested in /home/claude/work/battlebot/media-requests.md).
// Every demo is scroll-driven (Jerry, Sept 26): arena, weapon, versions and teardown are scrollies.
const M = '/assets/models/battlebot';

export default {
  summary: {
    stats: [
      { v: '4 days', l: 'First CAD to competition' },
      { v: '15.5 oz', l: 'On the scale with the battery, under the 16 oz limit' },
      { v: '8,214 rpm', l: 'No-load weapon speed: 740 KV on 11.1 V, direct drive' },
      { v: '37.2 mm', l: 'Plate to plate in version 2, down from 48.0 mm (my CAD)' },
    ],
    text: [
      'In four days I designed, printed and wired a 1 lb horizontal spinner and took it to my first combat robotics event, MACRO\'s Ides of July. The first version never left CAD: I ran a design review and redrew it thinner, with a one-piece TPU frame and an asymmetrical blade.',
      'What knocked me out was electrical: a contact inside one of the N20 drive motors broke off because I had crammed the wiring in around it. I placed in the middle, which I am happy with for a first event.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-table-spin.mp4', c: 'Finished, Jul 11: weapon spinning, then turning in place on a table' },
      { v: 'hero-weapon-first-spin.mp4', c: 'The first weapon spin test, in a cardboard box the night the parts came off the printer' },
    ],
  },
  sections: [
    // ---------------------------------------------------------------- 1. the arena
    { type: 'scrolly', id: 'arena', module: 'arena', stepHeight: '90vh', poster: `${M}/poster-arena.webp`,
      h: 'In the arena',
      p: ['My CAD of the finished robot in a small prop arena. As you scroll it spins the weapon up, drives in and hits three cardboard boxes, and the readout follows the blade.'],
      steps: [
        { h: 'The robot and the arena', p: ['This is my CAD of the finished robot. The blade, the motor\'s bell and both wheels turn about their real axes from the STEP. The arena and the cardboard boxes are props for this page.'] },
        { h: 'Spin up', p: ['The weapon comes up to its full no-load speed, **8,214 rpm**. That is the same math as my weapon calculator: 740 rpm per volt times 11.1 V, with the blade bolted straight to the motor. On the 4.409 in (112 mm) blade the tip then moves at **158 ft/s** (107.7 mph).'] },
        { h: 'Drive in', p: ['It drives straight at the first box. The hit throws the box, takes speed off the blade, and the motor has to bring it back up.'] },
        { h: 'Turn in place', p: ['Two wheels and tank steering: driving them in opposite directions turns the robot on the spot, so it can point the blade at the next box and go again.'] },
        { h: 'And again', p: ['A third box. The readout shows the modelled blade speed at each moment: the drop on every hit, then the climb back toward 8,214 rpm.'] },
      ],
      caption: 'The robot, blade and wheels are my CAD, turning about their real axes. The arena and the boxes are props, and the run is a simple physics model written for this page and worked out ahead of time, so the hits, the flips and the spin-up times are illustrative; the speeds come from my weapon calculator. The blade is drawn far slower than it really turns: 8,214 rpm is 137 turns a second.' },

    // ---------------------------------------------------------------- 2. at a glance
    { type: 'prose', id: 'glance', h: 'The robot at a glance', p: [
      'A 1 lb (454 g) plastic antweight: a horizontal spinner on a two-wheel, tank-steered base.',
      { table: {
        head: ['Part', 'What it is', 'Notes'],
        rows: [
          ['Weapon motor', 'SunnySky V4006, 740 KV brushless outrunner', 'The blade bolts straight to the spinning bell: no belt, no gears'],
          ['Blade', 'One tooth and a counterweight, 112 mm swing, 16 mm thick', 'Spins between the two plates'],
          ['Drive', 'Two Pololu N20 gearmotors', 'Each one drives its wheel directly'],
          ['Wheels', 'FingerTech foam wheels, 57 mm (2.25 in), on Twist hubs', 'Stand 10 mm past both plates'],
          ['Frame', 'One TPU part, 196 x 103 x 37 mm', 'Wraps the whole robot'],
          ['Plates', 'Two printed plates, 174 x 151 mm', 'Four M4 bolts clamp the stack'],
          ['Power', 'LiPo and a REV power switch', 'ON and OFF printed into the frame'],
        ],
        caption: 'Version 2 as it stands in my final CAD; sizes and part counts measured there.',
      } },
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'finished-front.webp', c: 'Finished, Jul 11: printed plates, the teal TPU frame and the blade under the nose' },
      { i: 'finished-quarter.webp', c: 'The other side' },
    ] },

    // ---------------------------------------------------------------- 3. weapon
    { type: 'prose', id: 'weapon-text', h: 'The weapon', p: [
      { h: 'Direct drive' },
      'The blade bolts straight to the face of the SunnySky V4006\'s spinning bell with four M3 x 6 mm button-head screws, so it turns at motor speed. I wrote the screw size on a photo while I was working out the stack.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'blade-bolt-note.webp', c: 'Working out the blade fasteners: 6 mm M3 button heads into the motor bell' },
      { i: 'blade-on-v4006.webp', c: 'The first blade on the V4006, seen from the stator side' },
      { i: 'weapon-under-top-plate.webp', c: 'Motor and blade bolted to a printed plate, Jul 10' },
    ] },
    { type: 'split', id: 'speed', items: [{ h: 'How fast', media: { i: 'weapon-calculator.webp', c: 'My weapon calculator: 11.1 V, a 4.409 in blade, 740 KV, no reduction' }, p: [
      'A brushless motor\'s no-load speed is its KV times the voltage, and with no reduction the blade turns at that speed. I checked the numbers in a weapon calculator:',
      { table: {
        head: ['', ''],
        rows: [
          ['No-load speed', '740 KV x 11.1 V = **8,214 rpm**'],
          ['Blade diameter', '4.409 in (112 mm), the swing of both blades in my CAD'],
          ['Tip speed', '**158 ft/s** (107.7 mph)'],
        ],
      } },
      'These are no-load numbers; every hit takes speed off the blade and the motor has to bring it back up.',
    ] }] },
    { type: 'scrolly', id: 'weapon', module: 'weapon', width: 'wide', stepHeight: '85vh', poster: `${M}/poster-weapon.webp`,
      h: 'Between the plates',
      steps: [
        { h: 'The motor between the plates', p: ['The motor sits between the two plates instead of hanging off one of them. Its stator bolts to the bottom plate with four M3 screws.'] },
        { h: 'Cut through the spin axis', p: ['My CAD, cut through the weapon\'s spin axis. The top plate carries a 4 mm bore bearing on that axis, over the end of the motor shaft, with a small spacer in between.'] },
        { h: 'What spins', p: ['The blade, the motor\'s bell and the four M3 x 6 mm button-head screws that hold the blade to the bell turn together, lit orange. The stator, the bearings and the plates stay still.'] },
        { h: 'Spin up', p: ['With no reduction the blade turns at motor speed, up to **8,214 rpm** with no load. At that speed the tip of the 112 mm blade moves at **158 ft/s**.'] },
      ],
      caption: 'Section through the weapon axis of my CAD. The readout uses my calculator\'s numbers; the spin-up is illustrative, and the blade is drawn far slower than it really turns.' },

    // ---------------------------------------------------------------- 4. two versions
    { type: 'scrolly', id: 'versions', module: 'versions', width: 'wide', side: 'right', stepHeight: '85vh', poster: `${M}/poster-versions.webp`,
      h: 'Two versions in four days',
      p: ['Both versions of my CAD at the same scale: version 1 in the blue of my own render, version 2 in the colours it was printed in.'],
      steps: [
        { h: 'Thinner', p: ['Version 2 drops the plates into the frame instead of stacking them on it. With the same 57 mm wheels, plate to plate goes from **48.0 mm** to **37.2 mm**, and the wheels now stand 10 mm past both plates instead of 4.6 mm.'] },
        { h: 'One frame part', p: ['The TPU frame is a single print that wraps the whole robot. It replaces version 1\'s centre frame, both wheel guards, both motor clamps and the eight 35 mm bolts that held the guards on. The drive motors now sit in cradles printed into the bottom plate.'] },
        { h: 'Asymmetrical blade', p: ['I made the weapon asymmetrical to increase its moment of inertia: one long tooth, balanced by a wide fan-shaped counterweight on the other side, in place of two teeth. It is 16 mm thick instead of 18 and sweeps the same 112 mm circle, and its centre of mass sits on the spin axis (from the CAD), so it runs balanced with one tooth.'] },
        { h: 'A power switch', p: ['Version 2 adds a REV power switch at the back of the frame.'] },
      ],
      caption: 'Dimensions and part counts measured on my two STEP files.' },
    { type: 'prose', id: 'versions-text', p: [
      { problem: 'Version 1 was thick: 48.0 mm from plate to plate, with the plates stacked on top of and under a frame made of five parts, and a symmetrical two-tooth blade. I never built it.', title: 'Version 1 was thick' },
      { fix: 'I ran a design review and came out of it with a list of things I could improve, then redrew the robot. Version 2 is 10.8 mm thinner, its frame is one TPU part, and I made the blade asymmetrical to increase its moment of inertia.' },
      { table: {
        head: ['', 'Version 1 (CAD only)', 'Version 2 (built)'],
        rows: [
          ['Plate to plate', '48.0 mm', '**37.2 mm**'],
          ['Wheels past each plate', '4.6 mm', '**10.0 mm**'],
          ['Plates', '184 x 157 mm, stacked on the frame', '174 x 151 mm, set into the frame'],
          ['Frame', 'Centre frame, 2 wheel guards, 2 motor clamps', '**1 TPU part**'],
          ['Fasteners', '22 screws, 14 nuts', '**12 screws, 4 nuts**'],
          ['Blade', 'Two teeth, 18 mm thick', '**One tooth and a counterweight, 16 mm thick**'],
          ['Blade swing', '112 mm', '112 mm'],
          ['Power switch', 'None', 'REV switch at the back'],
        ],
        caption: 'Measured on my two STEP files.',
      } },
    ],
      media: [
        { i: 'review-markup.webp', c: 'A marked-up render of version 1, Jul 10' },
        [{ i: 'blade-two-tooth-printed.webp', c: 'The first blade off the printer, Jul 10: two teeth' }, { i: 'blade-one-tooth-fan.webp', c: 'Jul 12: the grey one-tooth blade, its counterweight showing under the plate' }],
      ] },

    // ---------------------------------------------------------------- 5. frame and drive
    { type: 'prose', id: 'frame', h: 'Frame and drive', p: [
      { h: 'One flexible frame' },
      'The frame is a single print in TPU, a flexible filament, and it wraps the whole robot. The printed plates close it top and bottom and four M4 bolts clamp the stack together. ON and OFF are printed into the back of it, beside the holes for the switch.',
      { h: 'Tank drive' },
      'Two Pololu N20 gearmotors sit in cradles printed into the bottom plate, and each one drives a 57 mm FingerTech foam wheel through a Twist hub on its output shaft. The robot steers like a tank.',
      { h: 'Either way up' },
      'The wheels stand 10 mm past the top plate and 10 mm past the bottom plate, and the blade\'s mid-plane sits 1 mm below the axle line. So whichever side it lands on, the wheels still reach the floor and the blade stays within 2 mm of the same height (from the CAD).',
      { h: 'Packing it' },
      'Everything else lives in the space between the wheels: the LiPo, the ESCs and all of the wiring. That is the part that caught up with me at the event.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'tpu-frame-flex.webp', c: 'The TPU frame bending in my hand' },
      { i: 'side-on-off-switch.webp', c: 'The back of the frame: ON and OFF printed beside the two switch holes, and the wheels standing past the plates' },
      { i: 'electronics-top-view.webp', c: 'Plate off: LiPo, ESCs and wiring packed between the two wheels' },
      { i: 'electronics-packed.webp', c: 'Packed in, with the plate and blade set aside' },
    ] },
    { type: 'scrolly', id: 'teardown', module: 'teardown', stepHeight: '85vh', poster: `${M}/poster-teardown.webp`,
      h: 'Taking it apart',
      p: ['My CAD of the finished robot, taken apart one layer at a time, then put back together and turned over.'],
      steps: [
        { h: 'The finished robot', p: ['196 mm wide, 37.2 mm from plate to plate, and under a pound with the battery.'] },
        { h: 'Top plate', p: ['It carries a 4 mm bore bearing on the weapon\'s spin axis, over the end of the motor shaft, with a small spacer under it.'] },
        { h: 'Weapon', p: ['The blade bolts to the motor\'s spinning bell; the stator underneath it bolts to the bottom plate.'] },
        { h: 'Drive', p: ['Two N20 gearmotors, each driving a 57 mm foam wheel on its own shaft. They slide out along the axle line.'] },
        { h: 'Switch', p: ['A REV power switch at the back, reached through the holes beside the printed ON and OFF.'] },
        { h: 'Frame', p: ['One TPU part that wraps everything, with windows for the wheels.'] },
        { h: 'Bottom plate', p: ['Cradles for the two drive motors, and the seat for the weapon stator.'] },
        { h: 'Either way up', p: ['Back together and turned over about the axle height: the wheels still reach the floor, and the blade is within 2 mm of the same height.'] },
      ] },

    // ---------------------------------------------------------------- 6. four days
    { type: 'iterations', id: 'timeline', h: 'Four days', items: [
      { label: 'Jul 8 to 10', title: 'Research, then version 1 in CAD', p: [
        'I looked up the event\'s weight classes, batteries and connectors. In the CAD, the first saved versions hold just the wheels and the N20 drive motors; the weapon motor, the plates and the blade came next.',
      ], media: [] },
      { label: 'Jul 10', title: 'Design review, first prints, first spin', p: [
        'I ran a design review on version 1 and redrew the robot. That evening I printed the first blade and a plate, bolted the weapon on and spun it up inside a cardboard box.',
      ], media: [
        { i: 'top-plate-38g.webp', c: 'A printed plate on the scale: 38 g' },
        { i: 'still-spin-test-setup.webp', c: 'The spin test rig: plate, motor, blade and ESCs, in a cardboard box' },
      ] },
      { label: 'Jul 11', title: 'Frame, wiring, first drive', p: [
        'I printed the TPU frame, packed the electronics, closed it up, and drove it on a foam mat and on the table.',
      ], media: [
        { i: 'frame-test-fit.webp', c: 'First test fit of the TPU frame on a plate, with the two-tooth blade' },
        { v: 'test-drive-mat.mp4', c: 'The first drive test, on a foam mat' },
      ] },
      { label: 'Jul 12', title: 'New blade, rewiring', p: [
        'The one-tooth blade shows up in my photos. That evening and into the night I rewired the electronics.',
      ], media: [
        { i: 'rewire-helping-hands.webp', c: 'Rewiring with helping hands' },
        { i: 'still-receiver-pads.webp', c: 'Leads soldered straight onto a board\'s pads, after midnight' },
      ] },
      { label: 'Jul 13, 2 AM', title: 'Weigh-in', p: [
        '15.5 oz on my scale with the battery sitting on top: half an ounce under the 1 lb limit.',
      ], media: [
        { i: 'weigh-in-15-5-oz.webp', c: 'The scale reads 0 lb 15.5 oz with the LiPo on top' },
      ] },
    ] },

    // ---------------------------------------------------------------- 7. the event
    { type: 'prose', id: 'event', h: 'Ides of July', p: [
      'MACRO, the Maryland Area Combat Robotics Organization, ran Ides of July in Severn, Maryland on July 13, 2024. My robot fought in the plastic antweight class.',
      { problem: 'My robot was knocked out by its electronics. The Pololu N20 drive motors have small tabs on the back for their leads, and I had crammed all of the wiring into the frame around them. A contact broke off inside one of the motors.', title: 'A contact broke inside a drive motor' },
      'I placed in the middle. For my first event, with a robot I designed and built in four days, I am happy with that.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'n20-leads-soldered.webp', c: 'Jul 11: an N20\'s leads soldered straight onto its back tabs, with the wiring packed around it' },
      { i: 'event-n20-repair.webp', c: 'At the event: an N20 drive motor in the frame, leads on its back tabs' },
      { i: 'event-pits-one-tooth-blade.webp', c: 'At the event: top plate lifted and the wiring out' },
    ] },

    // ---------------------------------------------------------------- 8. files
    { type: 'prose', id: 'files', h: 'CAD history', p: [
      'The whole design history is public on GitHub at [github.com/jerryli08/antweight](https://github.com/jerryli08/antweight): Fusion files and STEP exports for 19 saved versions of the robot (v2 to v37) and two versions of the asymmetrical blade test, with a README listing the motors and wheels. There is no code in it; it is the CAD.',
      'Opened in order, the versions show how the robot came together: the wheels and drive motors first (v3, v4), then the weapon motor (v8), the plates (v10), the first blade and the wheel guards (v12), the bolts and the top bearing (v14, v15), the power switch (v27), the asymmetrical blade (v31), and finally the one-piece TPU frame that replaced the guards and clamps (v37).',
    ] },
  ],
  assets: ['/assets/models/battlebot/'],
};
