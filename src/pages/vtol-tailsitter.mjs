// VTOL Tailsitter (concept): rich page. Facts are Jerry's (his checklist, src/projects.mjs, the
// README of his public repo github.com/jerryli08/tailsitter) or plainly shown by his CAD and
// SolidWorks screenshots; every dimension is measured from the CAD and says so. Nothing was built or
// flown, so the take-off is labelled as an illustration.
// Held back until Jerry answers /home/claude/work/solidworks-vtol-tailsitter/questions.md: the project
// date and Hack Club context (Q1), why the part is seven bodies and how he would print it (Q2), the
// Feb 2025 screenshots' open nose (Q3), whether the motor and props were chosen or placeholders
// (Q4; the same-hand props are a CAD mix-up, Jerry, Sept 27: the take-off draws the left one mirrored), what he would do next (Q5), what exactly he took from MIT's aircraft (Q6),
// and his control plan (Q7).
// Models: assets/models/vtol-tailsitter/ (see assets/js/pages/vtol-tailsitter/rig.js and
// /home/claude/work/solidworks-vtol-tailsitter/prepass.mjs); demo posters live there too.
const M = '/assets/models/vtol-tailsitter';
const R = 0.07676; // right motor axis, model x (metres), from the STEP

export default {
  summary: {
    stats: [
      { v: '360 mm', l: 'Wingspan, flying wing (CAD)' },
      { v: '2 x DALPROP T3045', l: '3 in props, 4.5 in pitch, three blades' },
      { v: '22 x 13 mm', l: 'Stator of each brushless outrunner (CAD)' },
      { v: 'v1 to v7', l: 'Airframe versions, all kept in the repo' },
    ],
    text: [
      'A tailsitter stands on its tail, takes off straight up like a drone, then pitches over and flies on its wing like a plane. I designed this one in SolidWorks to learn the program, based on the tailsitter aircraft from MIT\'s 2023 research.',
      'It is a 360 mm flying wing with a round fuselage, two fins and two elevons, pulled by two brushless outrunners with 3 inch DALPROP T3045 props. It is a concept: I planned to 3D print it, and the CAD covers the airframe, the motors and the props.',
    ],
  },
  hero: {
    layout: 'single',
    items: [{ i: 'cad-hero.webp', c: 'My SolidWorks CAD of the tailsitter, rendered with the colours set by part: a white printed-plastic airframe, light grey elevons, red and black motors and orange props' }],
  },
  sections: [
    { type: 'scrolly', id: 'takeoff', module: 'takeoff', stepHeight: '95vh', poster: `${M}/poster-takeoff.webp`,
      h: 'Take-off, step by step',
      p: ['My CAD on a launch pad. Scroll to fly it: it spools up, climbs straight up, hovers, pitches over and flies away on its wing. The props, motor rotors and elevons turn about their real axes in the CAD, and the readout keeps the clock.'],
      steps: [
        { h: 'Standing on its tail', p: [
          'A tailsitter has no landing gear and no tilting motors. It stands nose up, props pointing at the sky.',
          'In my CAD the trailing edges of both fins and of the wing root end on one flat plane, so the aircraft can stand on them.',
        ] },
        { h: 'Straight up', p: [
          'Both props spin up and lift the whole aircraft like a two-rotor drone. It climbs with its nose at the sky and its wing edge-on to the ground.',
          'The two props turn in opposite directions (the arrows), so the reaction torques they put on the airframe cancel and it does not start to spin about its vertical axis.',
        ] },
        { h: 'Hovering: where the control comes from', p: [
          'In a hover there is no airspeed, so the only air moving over the wing is the propwash. Each elevon sits right behind a prop.',
          'The right prop disc covers 39 to 115 mm out from the centreline and the right elevon 30 to 120 mm (measured in the CAD), so the elevon sits in the wash across the whole disc. Swinging it bends that wash, which is how a tailsitter steers before it has any speed.',
        ] },
        { h: 'Pitching over', p: ['At 4 seconds in this illustration the transition starts. The elevons go trailing edge down and the nose tips toward the horizon. As it gains speed, the wing starts to carry the weight instead of the props.'] },
        { h: 'Flying on the wing', p: ['Now it is a flying wing. The wing carries the weight, the props only push it forward, and the same two elevons steer it.'] },
      ],
      caption: 'An illustration on my real CAD: the aircraft, its props, motor rotors and elevon hinges are the model, and each turns about its real axis. The flight itself (times, heights, speeds, angles and elevon deflections) is scripted to show the sequence. It is not flight data: this aircraft was never built or flown. The prop discs, the spin arrows, the air column and the span bars are drawn in.' },

    { type: 'prose', id: 'why', h: 'Why a tailsitter', p: [
      'I made this project to learn SolidWorks. I based it on the tailsitter aircraft from MIT\'s 2023 work on planning fast, acrobatic flight for tailsitters ([MIT News](https://news.mit.edu/2023/planning-algorithm-tailsitter-aircraft-0823)), and in my repo\'s README I called it "a VTOL Tailsitter I plan on 3D Printing".',
      'A tailsitter is one of the simplest ways to get a plane that takes off and lands vertically. There is no runway, no landing gear and no motor that tilts. The whole aircraft points its nose at the sky to take off and land, and tips over to fly forward. The same two props lift it in a hover and push it in forward flight, and the same two elevons steer it in both.',
      'The catch is that one airframe has to work in two very different regimes: hanging on its props at zero airspeed, and flying on its wing. In this layout the elevons sit directly behind the props, where there is moving air over them even in a hover.',
      { calc: 'How much of each elevon is behind its prop?',
        given: [
          ['Right prop disc, out from the centreline', '38.9 to 114.6 mm', 'measured from the CAD'],
          ['Right elevon, out from the centreline', '29.5 to 119.5 mm', 'measured from the CAD'],
        ],
        work: [
          'The disc lies inside the elevon\'s span: 29.5 < 38.9 and 114.6 < 119.5 mm',
          'Disc: 114.6 − 38.9 = 75.7 mm across. Elevon: 119.5 − 29.5 = 90.0 mm',
          'Share of the elevon\'s span straight behind the disc: 75.7 / 90.0 = **0.84**',
        ],
        result: 'About 84 % of each elevon\'s span sits straight behind its prop, so most of the surface that steers in a hover is in the propwash.' },
      { note: 'Geometry only: behind a real prop the wash narrows and swirls, so this is the share in line with the disc, not a measured airflow.' },
    ],
      media: [{ i: 'solidworks-render-aug-2024.webp', c: 'The assembly in SolidWorks, Aug 2024 (the image in my repo\'s README), with the colours I gave the motors and props there' }] },

    { type: 'scrolly', id: 'airframe', module: '@turntable', width: 'wide', side: 'right', stepHeight: '85vh', poster: `${M}/poster-airframe.webp`,
      h: 'The airframe',
      p: ['How the airframe is built, from the CAD. It turns slowly as you scroll.'],
      data: {
        models: [{ label: 'Assembly', src: `${M}/assembly.glb` }],
        explode: [
          { parts: 'outer_L', dir: [-1, 0, 0], dist: 0.045 }, { parts: 'outer_R', dir: [1, 0, 0], dist: 0.045 },
          { parts: 'inner_L|motor_L|prop_L', dir: [-1, 0, 0], dist: 0.02 }, { parts: 'inner_R|motor_R|prop_R', dir: [1, 0, 0], dist: 0.02 },
          { parts: 'elevon_L', dir: [-0.35, 0, 1], dist: 0.045 }, { parts: 'elevon_R', dir: [0.35, 0, 1], dist: 0.045 },
          { parts: 'centre', dir: [0, 0, -1], dist: 0.02 },
        ],
      },
      steps: [
        { h: 'Planform', p: ['A 360 mm span and 158 mm from nose to tail (CAD). The leading edge is straight, with rounded tips. The trailing edge sweeps forward about 11 degrees toward the tips, so the chord shrinks from 108 mm next to the fuselage to about 90 mm near the tips.'],
          view: { azimuth: 0, elevation: 80, pad: 1.08, labels: [
            { text: 'Span 360 mm', at: [0.172, 0.005, -0.02], side: 'l' },
            { text: 'Straight leading edge', at: [-0.1, 0.005, -0.04] },
            { text: 'Trailing edge swept forward', at: [-0.1, 0.005, 0.059] },
          ] } },
        { h: 'A flat-plate wing', p: ['The wing is a flat plate 8 mm thick with a fully rounded leading edge. Over the elevons and the outer trailing edge it tapers to a thin wedge. The cut here runs 50 mm right of the centreline, through the right inner panel and elevon.'],
          view: { azimuth: 272, elevation: 6, focus: 'elevon_R|inner_R|motor_R', pad: 1.32, cut: { normal: [1, 0, 0], at: 0.639 }, labels: [
            { text: '8 mm flat plate', at: [0.05, 0.004, -0.02], minW: 600 },
            { text: 'Rounded leading edge', at: [0.05, -0.004, -0.04], minW: 600 },
            { text: 'Hinge bore', at: [0.05, 0, 0.0157] },
            { text: 'Elevon tapers to a wedge', at: [0.05, 0.002, 0.058], minW: 600 },
          ] } },
        { h: 'Seven bodies', p: ['In SolidWorks the airframe is one part made of seven solid bodies: the fuselage with both fins and the wing root, two inner panels that carry the motor nacelles, two outer panels and two elevons.'],
          view: { explode: 1, azimuth: 322, elevation: 38, pad: 1.15, labels: [
            { text: 'Fuselage, fins and wing root', at: [0, 0.064, 0.05], side: 'l' },
            { text: 'Inner panel and nacelle', at: [-0.095, 0.015, -0.03], side: 'l' },
            { text: 'Outer panel', at: [-0.2, 0.004, -0.01], side: 'l' },
            { text: 'Elevon', at: [-0.095, 0.004, 0.083] },
          ] } },
        { h: 'The elevon hinge', p: [
          'Here the bodies are pulled apart a little. Each elevon has a rounded nose that turns inside a cove cut into the wing. A 2.7 mm bore runs 300 mm along the hinge line through the fuselage, the inner panels and the outer panels, and each elevon has a knuckle at each end with a 2.0 mm bore on the same line.',
          'The pin itself is not in the CAD.',
        ], view: { explode: 0.45, azimuth: 38, elevation: 30, focus: 'elevon_R|inner_R', pad: 1.55,
          highlight: [{ parts: 'elevon_R', color: '#ff6b35', intensity: 0.4 }], labels: [
            { text: 'Rounded nose', at: [0.082, 0.002, 0.031] },
            { text: 'Knuckle, 2.0 mm bore', at: [0.043, 0, 0.035], side: 'l' },
          ] } },
        { h: 'Fins', p: ['Two fins stand 64 mm above and below the wing, with 45 degree swept leading edges filleted into the fuselage. Their flat trailing edges end on the same plane as the wing root: the tail it stands on.'],
          view: { azimuth: 90, elevation: 2, pad: 1.12, labels: [
            { text: '64 mm above the wing', at: [0.004, 0.064, 0.069], side: 'l', minW: 600 },
            { text: '45 degree swept leading edge', at: [0.004, 0.045, 0.047], side: 'l', minW: 600 },
            { text: 'Flat tail', at: [0.004, -0.058, 0.0699], side: 'l' },
          ] } },
      ] },

    { type: 'prose', id: 'wing', h: 'The wing in numbers', p: [
      'Measured from above in the CAD, the outline gives the numbers a wing is usually described by: its area, its aspect ratio (how long and slender it is) and how much of it is control surface.',
      { calc: 'How big is the wing?',
        given: [
          ['Span', '360 mm', 'measured from the CAD'],
          ['Area seen from above (fuselage and nacelles in)', '35,970 mm²', 'measured from the CAD'],
          ['Both elevons, seen from above', '7,870 mm²', 'measured from the CAD'],
        ],
        work: [
          'Mean chord = area / span = 35,970 / 360 = **100 mm**',
          'Aspect ratio = span² / area = 360² / 35,970 = **3.6**',
          'Elevon share = 7,870 / 35,970 = **22 %** of the wing',
        ],
        result: 'A short, broad wing: aspect ratio about 3.6 and a mean chord of about 100 mm, with about a fifth of its area in the two elevons that steer it both in a hover and in forward flight.' },
      { note: 'Areas from the top-view outline of the airframe in the CAD, props and motors left out. The fins are edge-on from above and add nothing.' },
    ],
      media: [
        { i: 'solidworks-top-hinge-lines.webp', c: 'In SolidWorks, Feb 2025: the split lines between the bodies and the two elevon hinge lines, seen from behind the wing' },
        { i: 'solidworks-nacelle-fillets.webp', c: 'In SolidWorks, Feb 2025: close-up of the fillets that blend a motor nacelle into the wing' },
      ] },

    { type: 'scrolly', id: 'motor', module: '@turntable', stepHeight: '85vh', poster: `${M}/poster-motor.webp`,
      h: 'Motors and props',
      p: ['The propulsion in the CAD: two brushless outrunners, each with a three-blade prop.'],
      data: { models: [{ label: 'Assembly', src: `${M}/assembly.glb` }] },
      steps: [
        { h: 'Props: DALPROP T3045', p: ['The props are DALPROP T3045s: 3 inch diameter, 4.5 inch pitch, three blades. The CAD part carries the name, and its blades measure 75.7 mm tip to tip.'],
          view: { focus: 'prop_R|motor_R', azimuth: 205, elevation: 16, pad: 1.45, labels: [
            { text: 'DALPROP T3045', at: [R, 0.028, -0.0673] },
          ] } },
        { h: 'Inside the motor', p: [
          'The motors are a brushless outrunner model, cut here through the right motor\'s axis. The can with its 14 magnets spins around a 12-tooth stator, and the prop is fixed to the can. The stator measures 22 mm across and 13 mm tall, the can 28 mm across, and the shaft is 3 mm (all measured in the CAD).',
          'Outrunners are usually named by stator size, diameter then height, so in that naming this is a 2213-size motor.',
        ], view: { focus: 'motor_R', azimuth: 90, elevation: 8, pad: 1.5, cut: { normal: [-1, 0, 0], at: 0.2868 }, labels: [
          { text: '14 magnets on the can', at: [R, 0.0122, -0.052] },
          { text: 'Shaft, 3 mm', at: [R, 0, -0.041], minW: 600 },
          { text: '12-tooth stator', at: [R, -0.0075, -0.0515] },
        ] } },
        { h: 'Where they sit', p: ['The motor centres are 153.5 mm apart. Each prop spins about 27 mm ahead of the leading edge, and its tips pass 9 mm from the fuselage (CAD).'],
          view: { azimuth: 0, elevation: 80, pad: 1.35, labels: [
            { text: '9 mm tip gap', at: [0.034, 0.02, -0.0673], side: 'l' },
            { text: 'Leading edge', at: [0.1, 0.005, -0.04] },
          ] } },
      ] },

    { type: 'scrolly', id: 'versions', module: '@turntable', width: 'wide', side: 'left', stepHeight: '85vh', poster: 'sketch-v1.webp',
      h: 'Learning SolidWorks: v1 to v7',
      p: ['My repo keeps every version of the airframe part, so you can watch the design, and my SolidWorks, grow. The STEP files of v3 to v7 were exported on Aug 15 and 16, 2024.'],
      data: {
        models: [
          { label: 'v3', src: `${M}/v3.glb` }, { label: 'v4', src: `${M}/v4.glb` }, { label: 'v5', src: `${M}/v5.glb` }, { label: 'v6', src: `${M}/v6.glb` },
          { label: 'v7', src: `${M}/assembly.glb`, hide: 'motor_|prop_' },
          { label: 'Assembly', src: `${M}/assembly.glb` },
        ],
      },
      steps: [
        { h: 'v1: the first sketch', p: [
          { problem: 'In v1 the lines are not level or symmetric: the leading edge drifts about 6 mm across the span, and the two wingtips differ.', title: 'The first sketch was not square' },
          { fix: 'v2 redraws the same outline level and symmetric. The 360 x 158 mm outline it set stayed the same through every later version.' },
        ], view: { version: 0, image: 'sketch-v1.webp', alt: 'The v1 planform sketch from my DXF: a flying wing outline whose leading edge and tips are visibly not level or symmetric' } },
        { h: 'v2: redrawn', p: ['v2 is level and symmetric, with true arcs at the tips, boxes for the two motor nacelles, the nose and the lines where the elevons split off.'],
          view: { version: 0, image: 'sketch-v2.webp', alt: 'The v2 planform sketch from my DXF: the same outline redrawn level and symmetric, with motor nacelle boxes and the elevon split lines' } },
        { h: 'v3 (Aug 15): the first solid', p: ['The outline became solid bodies: the round fuselage, two inner panels with round nacelles, and flat 8 mm outer panels and elevons. No fins yet.'],
          view: { version: 0, azimuth: 215, elevation: 30, pad: 1.05 } },
        { h: 'v4: tapering the trailing edge', p: ['The trailing edge tapers to a wedge, on the right side first.'],
          view: { version: 1, azimuth: 45, elevation: 20, pad: 1.05 } },
        { h: 'v5: both sides, nacelles and fins', p: ['Both sides taper now, the nacelles blend into the wing with fillets, and the fins arrive as plain rectangular blocks 64 mm above and below the wing.'],
          view: { version: 2, azimuth: 215, elevation: 24, pad: 1.05 } },
        { h: 'v6: swept fins', p: ['The fins are cut to a 45 degree swept leading edge and filleted into the fuselage.'],
          view: { version: 3, azimuth: 100, elevation: 6, pad: 1.08 } },
        { h: 'v7 (Aug 16): the hinge', p: ['The elevons get their rounded noses, the coves they turn in, a knuckle at each end and the pin bores.'],
          view: { version: 4, focus: 'elevon_R|inner_R', azimuth: 20, elevation: 42, pad: 1.5, highlight: [{ parts: 'elevon_', color: '#ff6b35', intensity: 0.35 }] } },
        { h: 'The assembly', p: ['v7 with the two motors and props: the model the rest of this page is built on.'],
          view: { version: 5, azimuth: 215, elevation: 22, pad: 1.05 } },
      ] },

    { type: 'prose', id: 'status', h: 'Where it stands', p: [
      'The CAD stops at the airframe, the motors and the props. There are no servos or pushrods for the elevons, no battery, speed controllers or flight controller, and no hinge pins. In the repo\'s README I called it "very much a WIP (CAD not done)".',
      'My SolidWorks screenshots from February 2025 show the fuselage with an open, round front instead of the nose cone in the August 2024 files.',
      { h: 'Colours' },
      'The STEP export carries no colours, so every part here is coloured by what it is: the motors red and black and the props orange, as in my SolidWorks model, and the airframe a white printed plastic, since I planned to print it.',
      { note: 'Every dimension on this page is measured from my CAD. The CAD files, every airframe version from v1 to v7, are on [GitHub](https://github.com/jerryli08/tailsitter).' },
    ],
      media: [{ i: 'solidworks-front-right.webp', c: 'SolidWorks, Feb 2025: the airframe with its open, round front, the split lines of the bodies and the elevon hinge lines' }] },
  ],
  assets: [`${M}/`],
};
