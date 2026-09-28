// Drone on Wheels (hybrid UAV-UGV). Page text from the phase A write-up for this project,
// corrected against Jerry's answers of Sept 26, 2026 (/home/claude/work/answers.md). Facts only from
// Jerry, his poster and his CAD. Every animation is scroll-driven (Jerry, Sept 26): the modules in
// assets/js/pages/hybrid-vehicle/ reuse the landing scene's models (assets/models/rover.glb,
// drone.glb) and rig them about the real axes in the CAD; demo posters live in M.
const M = '/assets/models/hybrid-vehicle';

// datasheets and sources linked from the worked calculations
const HOLY = '[Holybro X500 V2 specs](https://docs.holybro.com/drone-development-kit/px4-development-kit-x500v2)';

export default {
  summary: {
    stats: [
      { v: '10 DOF', l: 'Latch linkage driven by one servo' },
      { v: '27.3 N', l: 'Held per latch in a vertical pull test' },
      { v: 'Co-first author', l: 'Poster at IEEE MIT URTC 2025' },
      { v: '7', l: 'Person team' },
    ],
    text: [
      'A drone and a ground rover that lock together, so either one can carry the other. I came up with the project, recruited and led a team of seven, and designed and fabricated all of the hardware.',
      'The core of it is a latch on the rover that catches the drone’s landing tubes with no power and lets go on command: a linkage geartrain with 10 degrees of freedom, driven by a single servo. On the course run the drone carried the rover, let go of it with the servo and flew on alone. I presented the work as co-first author at the IEEE MIT Undergraduate Research Technology Conference.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-drone-carries-rover.mp4', c: 'The drone carrying the rover' },
      { v: 'hero-rover-carries-drone.mp4', c: 'The rover carrying the drone' },
    ],
  },
  sections: [
    // Jerry (Sept 27, 21:12): the best CAD scroll animation sits right below the hero.
    { type: 'scrolly', id: 'model', module: 'system', stepHeight: '90vh', poster: `${M}/poster-model.webp`,
      h: 'One full cycle, on my CAD',
      p: ['Both vehicles from my CAD. Scroll to see what is where, cut the rover open, and run a whole cycle: the drone carries the rover, lets go with the servo, and comes back to a latch that catches it with no power.'],
      steps: [
        { h: 'Two vehicles, one system', p: ['The drone sits on the rover with its two landing tubes held in the rover’s two latches. Docked, the rover can carry the drone across open ground, and the drone can lift the rover over what the rover cannot drive.'] },
        { h: 'What is where', p: ['The drone’s printed landing gear holds a pair of 16 mm tubes 110 mm apart. The two latches sit on the rover’s deck, one per tube, with an AprilTag in front of them for the drone’s downward camera.'] },
        { h: 'Inside the rover', p: ['A cut along the centreline takes the rover’s left half off; hollow dots mark parts inside the chassis. The latch servo, a Feetech FT5325M, sits under the deck between the two latches. A Raspberry Pi 5 and an Arduino Mega ride in the middle, powered from a 2S 2200 mAh LiPo, and two Axon MINI drive servos sit inboard of the rear wheels.'] },
        { h: 'The drone carries the rover', p: ['Latched, the rover hangs from the drone’s tubes. The doors hold them without the servo doing anything: pulling up only presses the tubes into the undersides of the doors. In the flight cage the drone lifted the rover and flew it across the cage.'] },
        { h: 'Let go on command', p: ['The servo turns 11.8 degrees, the geartrain swings every arm 42 degrees, and the doors ride out on the arm tips, clear of the tubes. The drone lifts straight out and the latch closes behind it. On the course run, the servo let the rover go this way and the drone flew the course alone.'] },
        { h: 'Coming back: a catch with no power', p: ['As the drone comes down, its tubes push the four doors down and out of the way. Once the tubes are down in their cradles, elastic pulls the doors back up over them, and the pair is latched again with no help from the servo. The next sections go inside each of these mechanisms.'] },
      ],
      caption: 'The latch angles are from my CAD, and the door angles during the catch come from a section of the real door turned against the tube. How high the vehicles lift is an illustration. The elastic is drawn in; it is not in the CAD. The doors are shown as modelled, before I cut them to overlap (see the iterations below).' },

    { type: 'prose', id: 'idea', h: 'Why dock a drone to a rover', p: [
      'Drones get somewhere fast and see from above. Ground robots last longer on a charge and work at ground level. Each one is weak exactly where the other is strong, so I wanted one system that could be either.',
      { problem: 'A drone’s battery runs out quickly, and a ground robot gets stuck on terrain it cannot drive over.', title: 'Two weak spots' },
      { fix: 'Dock them. The rover carries the drone across open ground so the drone saves its battery. When the rover reaches something it cannot cross, or we need a view from above, the drone lifts off, on its own or carrying the rover with it.' },
      'We framed it as a cooperative multi-agent system for search and rescue and data collection.',
      'The drone is a Holybro X500 V2 quadcopter on a 5000 mAh battery. I designed new 3D-printed landing gear for it: two mounts that hold a pair of 16 mm tubes 110 mm apart, and those tubes are what the rover grabs. The rover is a 3D-printed truss chassis, 327 mm long and about 1.23 kg, with two latches on its deck, one per tube, and an AprilTag in front of them for the drone’s downward camera.',
    ],
      media: [
        { v: 'hero-operating-separately.mp4', c: 'Working separately: the drone flies the course while the rover waits' },
        { i: 'airborne-docked.webp', c: 'Docked and airborne: the drone carrying the rover in a low hover (Figure 1 of our poster)' },
      ] },

    { type: 'stats', id: 'size', items: [
      { v: '327 mm', l: 'Rover length' },
      { v: '234 mm', l: 'Height, docked' },
      { v: '534 mm', l: 'Drone span' },
      { v: '1.23 kg', l: 'Rover weight' },
    ] },

    { type: 'prose', id: 'latch-design', h: 'The latch: one servo, ten degrees of freedom', p: [
      'The latch has two jobs: catch the drone by itself, and let go on command.',
      { problem: 'Every gram of latch is a gram the drone has to lift when it carries the rover, and a latch with a motor per arm or per door would be heavy.', title: 'Weight' },
      { fix: 'I built both jobs into one linkage geartrain with 10 degrees of freedom, 6 active and 4 passive, all driven by a single servo.' },
      { calc: 'How heavy is the rover for this drone?',
        given: [
          ['Rover weight', '1.23 kg', 'weighed on a scale'],
          ['Holybro’s rated maximum payload for the X500 V2', 'about 1 kg, with a 4S 5000 mAh battery at 70 % throttle', HOLY],
        ],
        work: [
          '1.23 kg / 1 kg = 1.23',
          '1.23 kg - 1 kg = 0.23 kg over the rating',
        ],
        result: 'The rover alone is about 1.2 times the payload Holybro rates the X500 V2 for, so carrying it means flying above the 70 % throttle that rating assumes. Every gram in the latch adds to that.',
        note: 'Holybro’s figure is for its stock kit, not our drone with its printed landing gear.' },
      'Each latch has two arms that stand up on either side of a landing tube, with a door hinged on the tip of each arm. Front and back cradle brackets with a 17 mm bore locate the 16 mm tube before the doors ever close over it.',
      'The geartrain drives all four arms from one Feetech FT5325M servo:',
      { ol: [
        'The servo turns a **25-tooth** gear.',
        'That gear drives a **25-tooth idler** and the **7-tooth pinion** on one arm of the first latch.',
        'The idler turns the other way and drives the 7-tooth pinion on one arm of the second latch, so the two latches open as mirror images.',
        'On each latch the two arms mesh through their 7-tooth pinions **1:1**, so they swing apart like a V.',
      ] },
      'Going from 25 teeth down to 7 multiplies the motion by 25/7, about 3.6, so 11.8 degrees at the servo swings every arm **42 degrees**, far enough to carry the doors clear of the tubes. The six active degrees of freedom are the servo gear, the idler and the four arms. The four doors are the passive ones.',
      { table: {
        head: ['Part', 'Teeth', 'At full open'],
        rows: [
          ['Servo gear (on the servo horn)', '25', '11.8°'],
          ['Idler, on two F693ZZ bearings', '25', '11.8°, the other way'],
          ['Arm pinions (4)', '7', '42°'],
        ],
        caption: 'Tooth counts from my CAD. Centre distances in the CAD are 50.0 mm (25 to 25 teeth), 32.0 mm (25 to 7) and 14.0 mm (7 to 7), all consistent with module 2.',
      } },
      'The same step up that gives the arms their swing has a cost: a little play at a 7-tooth pinion becomes a lot of play at the doors. That is the story of the iterations further down.',
    ],
      media: [
        { v: 'latch-doors-by-hand.mp4', c: 'The finished latches worked by hand: pushing one arm open swings all four arms through the gears, then the doors are pressed down and spring back' },
        { i: 'landing-gear-latched.webp', c: 'The printed landing-gear mounts and tubes held in both latches, off the drone' },
      ] },

    { type: 'scrolly', id: 'latch', module: 'latch', poster: `${M}/poster-latch.webp`,
      h: 'Inside the latch',
      p: ['A section through the middle of both latches, and the geartrain running as you scroll.'],
      steps: [
        { h: 'Two latches, one per tube', p: ['The drone sits on the rover with its two landing tubes in the two latches. The whole latch mechanism sits in one block behind the AprilTag.'] },
        { h: 'A cut through the middle', p: ['The section runs through the middle of the arms. The tubes sit in the latches with the doors closed above them, and the geartrain is underneath.'] },
        { h: 'One servo drives everything', p: ['The servo turns the 25-tooth gear. It meshes with the idler and with the 7-tooth pinion of one arm on the first latch. The idler drives one arm on the second latch, and each pair of arms is geared together 1:1.'] },
        { h: '11.8 degrees in, 42 out', p: ['The step from 25 teeth to 7 turns 11.8 degrees at the servo into 42 degrees at every arm. The arms swing apart like a V and carry the doors out past the tubes. The idler reverses the direction, so the two latches open as mirror images.'] },
        { h: 'Let go', p: ['With the arms open nothing holds the tubes, and the drone lifts straight out. Carrying the rover, it is the same motion the other way round: the servo opens the arms and the rover drops out of the latch.'] },
        { h: 'Six active, four passive', p: ['The servo closes the arms again, ready for the next landing. The servo gear, the idler and the four arms are the six active degrees of freedom. The four doors on the arm tips are the passive ones, and they are what catches the drone.'] },
      ] },

    { type: 'scrolly', id: 'passive', module: 'passive', poster: `${M}/poster-passive.webp`,
      h: 'Passive latching: elastic on the knobs',
      p: ['The four doors do the catching, with no power. Here is the first latch in section as the drone comes down onto it.'],
      steps: [
        { h: 'Doors held up by elastic', p: ['Each door hangs on the pin at the tip of its arm. Elastic stretched between a knob on the door and a knob on the arm holds the door up. The drone starts 32 mm above its docked position.'] },
        { h: 'The tubes push the doors down', p: ['When the drone comes down, its tubes meet the tips of the doors about 24 mm above the docked position (in my CAD) and push them down and out of the way, stretching the elastic. A door has to swing about 42 degrees to let a tube past.'] },
        { h: 'Past the doors, they snap shut', p: ['About 2 mm before the drone is fully down, the tube is past the doors, and the elastic pulls them back up over it. The drone is now held without the servo doing anything.'] },
        { h: 'Pulling up only holds it tighter', p: ['Pulling up only presses the tubes into the undersides of the doors. In my CAD the drone can rise about 7 mm before the tubes meet them, and from there it is held.'] },
        { h: 'Let go', p: ['To let go, the servo swings the arms out and the doors go with them, so nothing is left over the tube and the drone lifts straight out. Then the arms close again, ready for the next landing.'] },
      ],
      caption: 'Door angles come from my CAD: a section of the real door turned on its pin against the 16 mm tube. The elastic is drawn in; it is not in the CAD. The doors are shown as modelled, before I cut them to overlap (see the iterations below).' },

    { type: 'scrolly', id: 'drive', module: 'drive', poster: `${M}/poster-drive.webp`,
      h: 'The belt drivetrain',
      p: ['The rover’s left side, cut open along the outside of the belt. The wheels turn as you scroll.'],
      steps: [
        { h: 'Skid steered, one servo per side', p: ['The rover is skid steered. Two Axon MINI servos, one per side, sit inboard of the rear wheels and drive them through printed hubs. I reused the servos and hubs from my [Science Olympiad Robot Tour robot](/projects/robot-tour).'] },
        { h: 'One belt per side, 1 : 1', p: ['Each rear wheel has a 35-tooth HTD 3M pulley built into it, and a 384 mm long, 12 mm wide belt carries the drive to the same pulley inside the front wheel, about 140 mm ahead. Both wheels on a side turn together, 1:1. The wheels are 70 mm across.'] },
        { h: 'Steering by speed', p: ['There is no steering linkage: the rover turns by running one side slower than the other. Here the left side runs at 30\u00a0% and the right at 70\u00a0%, so it arcs to the left. The inset is ideal skid steering, with no slip.'] },
        { h: 'Turning in place', p: ['Run the two sides in opposite directions and it turns on the spot. The terrain tests further down measured how fast it turns on six surfaces.'] },
      ],
      caption: 'The belt in my CAD is one solid part, so its motion is shown with marks drawn on it, one per tooth. The speeds are for the picture; the inset is a diagram, not CAD.' },

    { type: 'prose', id: 'electronics', h: 'Electronics and drive code', p: [
      'The electronics ride in the middle of the chassis: a Raspberry Pi 5 and an Arduino Mega, powered from a 2S 2200 mAh LiPo through an LM2596 buck converter. The latch servo sits under the deck, between the two latches.',
      'The drive code on the Arduino Mega is a small state machine: an array of states (drive forward, turn left, stop) that it steps through, driving the left and right wheel servos for each one and printing every transition to the serial monitor. In the first bench test the turns were commented out of the sequence and the chassis was stood on end: forward, then stop.',
    ],
      media: [
        { i: 'drivetrain-top-view.webp', c: 'Top plate off, Aug 1: both belt runs, the two drive servos between the wheels, and the first (module 1) latch gears in the middle' },
        [{ v: 'drivetrain-bench-test.mp4', c: 'Bench test with the chassis on end: one side’s wheels turning together on the belt, then the state sequence and serial monitor on the laptop' }, { v: 'rover-first-drive.mp4', c: 'First drive test on the foam mats: driving and turning' }],
      ] },

    { type: 'iterations', id: 'iterations', h: 'Fixing the latch', items: [
      { label: 'Version 1', title: 'Module 1 gears: the teeth skipped',
        p: [
          'My first geartrain used fine red gears at module 1. I modelled it and drove the joints in Fusion to check that the arms swung the way I wanted, then printed it.',
          { problem: 'The module was way too small. Once printed, the gears skipped.', title: 'Gears skipped' },
          { fix: 'Much bigger teeth: version 2 is the black coarse gear. The gears in my final CAD measure module 2, twice the tooth size of version 1.' },
        ],
        media: [
          { i: 'cad-latch-gear-v1.webp', c: 'Version 1 in Fusion: the fine-pitch servo gear, Jul 25' },
          { v: 'latch-v1-cad-joint-drive.mp4', c: 'Driving the version 1 geartrain in Fusion to check the arm motion' },
          { i: 'still-first-gear-on-servo.webp', c: 'The first printed module 1 gear on the servo' },
        ] },
      { label: 'Version 2', title: 'Module 2 gears: no skipping, but backlash',
        p: [
          'I went into this change knowing what the bigger teeth would cost. Each arm hangs off a 7-tooth pinion, so a little play at the pinions becomes a lot of play at the doors on the arm tips. But backlash was something I could mitigate, and within our constraints there was no other way to stop the skipping. So I took the trade on purpose.',
          { problem: 'As expected, a lot of backlash, and it showed up at the doors: with that much play, they could not be counted on to close over the tube.', title: 'Backlash at the doors' },
          { fix: 'I dealt with it in the doors instead of the gears: I cut the doors so they would overlap each other.' },
          { calc: 'How much play lets a door slip off the tube?',
            given: [
              ['Arm pinion', '7 teeth, module 2: 7 mm pitch radius', 'measured from the CAD'],
              ['Pinion axis to the outer door’s finger tip', '35.8 mm', 'measured from the CAD'],
              ['How far each finger reaches past the tube’s edge', '3.7 mm', 'measured from the CAD'],
              ['Meshes from the servo gear to the outer arm of the first latch', '2', 'counted from the CAD'],
            ],
            work: [
              'When the arm turns, its finger tip moves 35.8 / 7 = 5.1 times as far as its pinion’s pitch circle',
              'For the finger to swing 3.7 mm off the tube: 3.7 mm / 5.1 = 0.72 mm of free travel at the pinion',
              'Play adds up along the chain: with play p at each mesh, the outer arm can drift p / 2 per mesh either way, p over two meshes. So p = 0.72 mm',
              'A module 2 tooth repeats every π × 2 mm = 6.3 mm, so that is about a ninth of a tooth',
            ],
            result: 'About 0.7 mm of play at each mesh, a ninth of a tooth, is enough to let the outer finger swing off the tube. The small pinion is the multiplier: on a 25-tooth gear (25 mm pitch radius) the finger would need 25 / 7 = 3.6 times as much play.',
            note: 'Geometry only, from the final CAD with the doors as modelled, before the overlap cut; the play in the real gears was not measured. The backlash section below shows the same numbers on the model.' },
        ],
        media: [
          { i: 'latch-gears-fine-vs-coarse.webp', c: 'Version 1 (red, module 1) next to version 2 (black, module 2), each gear with an arm and its pinion, Aug 1' },
          { i: 'latch-assemblies.webp', c: 'Latch assemblies, black arms and red doors, laid out next to the rover, Aug 1' },
        ] },
      { label: 'The fix', title: 'Doors cut to overlap',
        p: [
          { fix: 'On one latch the cut doors now overlap. On the other, because of the backlash, they barely close, but that is enough to close the latch around the tube.' },
          { note: 'The cut is not in my CAD, so the 3D on this page shows the doors as modelled, with a gap between them. The photos show the real, cut doors.' },
        ],
        media: [
          { i: 'rover-on-scale.webp', c: 'Weighing the rover, Aug 10: about 1.23 kg. Stood on end, it shows both latches: the left one’s cut doors overlap, the right one’s barely close' },
          { i: 'rover-latch-closeup-outdoors.webp', c: 'The latches on Aug 2, with the rough cut edges on the doors' },
        ] },
    ] },

    { type: 'scrolly', id: 'backlash', module: 'backlash', poster: `${M}/poster-backlash.webp`,
      h: 'Why backlash hurts this latch',
      p: ['The first latch in section, on the final CAD, with the doors as modelled (before the cut). The ghosts show each arm at both ends of its free play.'],
      steps: [
        { h: 'Play at a 7-tooth pinion', p: ['Play at a mesh, measured along the pitch circle, turns a 7-tooth pinion by the play divided by its 7 mm pitch radius. So 1 mm of play is 8.2 degrees at the arm, and a door’s finger tip sits about 36 mm from its arm’s pinion: about 5 mm at the tip.'] },
        { h: 'Half a millimetre at each mesh', p: ['The ghosts are each arm at both ends of its free play, with 0.5 mm of play at each mesh. The arms can rock anywhere between them, and the doors ride along on the arm tips.'] },
        { h: 'Play stacks up', p: [
          { problem: 'The play also adds up along the chain. On the first latch the inner arm is one mesh from the servo gear and the outer arm is two. On the second latch the arms sit behind the idler, two and three meshes out. And in the CAD each door finger reaches only about 3.7 mm past the edge of the tube: about three quarters of a millimetre of play at each mesh is enough to swing the outer finger that far.', title: 'Play stacks up' },
        ] },
        { h: 'The fix went into the doors', p: [
          { fix: 'The overlap cut on the real doors is what closes the latch around the tube despite the play: on one latch the doors overlap, on the other they barely close, and that is enough.' },
          { note: 'The cut is not in my CAD, so it is not shown here; the photos in the iterations above show the real doors.' },
        ] },
      ],
      caption: 'The numbers are computed from the CAD geometry, not measured.' },

    { type: 'media', layout: 'collage', id: 'build-log', h: 'Build log', p: ['The project was self-initiated and went beyond the curriculum, using the lab’s drones and 3D printers. Dates are from the photos.'], items: [
      { i: 'cad-docking-concept.webp', c: 'Jul 24: first CAD of the docking interface under the drone' },
      { i: 'build-night-soldering.webp', c: 'Jul 27: me soldering while my teammate and friend Ryker blows the solder fumes out the window with a hair dryer' },
      { i: 'chassis-printed-frames.webp', c: 'Jul 30: the first printed truss side frames' },
      { i: 'chassis-belts-going-in.webp', c: 'Jul 30: belts and drive servos going into the first printed chassis' },
      { i: 'first-fit-under-drone.webp', c: 'Jul 30: first fit of the rover under the drone' },
      { i: 'cad-in-the-hallway.webp', c: 'Jul 30: CADing the rover frame in the hallway' },
      { i: 'electronics-and-latch-gear.webp', c: 'Jul 31: Raspberry Pi and Arduino in, latch gears going on' },
      { i: 'docking-by-hand.webp', c: 'Aug 1: me connecting the ground rover to power in the flight cage' },
    ] },

    { type: 'prose', id: 'results', h: 'Testing and results', p: [
      'In the flight cage the drone lifted the rover and flew it across the cage, and the rover drove and turned with the drone riding on top: the two videos at the top of this page.',
      'On the course run, the docked pair lifted off together and the drone carried the rover onto the course. Then the servo opened the latch and let the rover go, and the drone flew the course on its own, through the gate, and came back down beside the rover.',
    ] },
    { type: 'media', layout: 'row', items: [
      { v: 'final-run-liftoff.mp4', c: 'The course run: lifting off docked and carrying the rover out over the course' },
      { v: 'final-run-gate.mp4', c: 'After the release: the drone flies through the gate while the rover waits on the course' },
      { v: 'final-run-lands-beside-rover.mp4', c: 'The drone comes back and lands beside the rover' },
    ] },

    { type: 'scrolly', id: 'terrain', module: 'terrain', webgl: false, stepHeight: '85vh',
      h: 'Six terrains',
      p: ['We then tested the rover on six surfaces at a constant 8.0 V, three trials each. We timed straight runs over a meterstick with a stopwatch, and turns with a protractor and a timer.'],
      steps: [
        { h: 'Straight-line speed', p: ['In a straight line the surface hardly mattered: on every surface the rover could drive, it averaged between 0.57 and 0.63 m/s.'] },
        { h: 'Concrete was the fastest', p: ['Concrete was the fastest in a straight line, at 0.63 m/s.'] },
        { h: 'Turning: foam and concrete', p: ['Turning is where the surfaces split apart. The rover turned fastest on foam (4.20 rad/s) and concrete (4.05 rad/s). Those two are synthetic surfaces, so our poster’s text leaves them out and names sand as the fastest turning surface; the chart has all six.'] },
        { h: 'Sand', p: ['On sand it turned at 3.40 rad/s, the fastest of the natural surfaces.'] },
        { h: 'Forest floor', p: ['On forest floor the rover kept most of its straight-line speed but turned at 1.25 rad/s, less than a third of its rate on foam.'] },
        { h: 'Grass', p: [
          { problem: 'The rover could not cross grass at all.', title: 'Grass' },
          { fix: 'This is where the drone takes over: on terrain the rover cannot drive, the drone flies, alone or carrying the rover.' },
          'The data points to terrain-aware mission planning: on low-mobility surfaces like forest floor and mulch, deploy the drone more often; on smooth, fast ones like concrete, let the rover carry it.',
        ] },
      ],
      caption: 'Averages of three trials per surface, from Table 1 of our poster: straight-line speed (m/s) and turning speed (rad/s). Foam 0.62 and 4.20, concrete 0.63 and 4.05, grass could not cross, mulch 0.57 and 1.88, sand 0.60 and 3.40, forest floor 0.59 and 1.25.' },

    { type: 'prose', id: 'turning', h: 'Why turning split the surfaces', p: [
      'A skid-steered rover has no steering linkage: to turn in place, one side drives forward and the other backward, and all four wheels have to scrub sideways over the ground. How easily they scrub depends on the surface.',
      { calc: 'How close to a perfect turn did the rover get?',
        given: [
          ['Track width, wheel centre to wheel centre', '135.2 mm', 'measured from the CAD'],
          ['Straight-line and turning speeds per surface', 'Table 1', '[our poster](/assets/docs/drone-on-wheels-poster.pdf)'],
          ['Each side’s wheel speed while turning', 'the same as in a straight line', 'assumed (same 8.0 V)'],
        ],
        work: [
          'With no slip, turning in place with each side at speed v gives ω = 2v / 135.2 mm',
          'Foam: 2 × 0.623 / 0.1352 = 9.22 rad/s possible, 4.20 measured: 46 %',
          'Concrete: 9.28 possible, 4.05 measured: 44 %',
          'Sand: 8.85 possible, 3.40 measured: 38 %',
          'Mulch: 8.50 possible, 1.88 measured: 22 %',
          'Forest floor: 8.66 possible, 1.25 measured: 14 %',
        ],
        result: 'Even on foam the rover turned at under half of the no-slip rate, and on forest floor at about a seventh. Straight-line speed barely changed between surfaces, so where they differ is mostly in how easily the wheels scrub sideways.',
        note: 'Estimate: ideal skid steering with no slip is an upper bound; the measured rates are the poster’s averages of three trials.' },
    ],
      media: [{ i: 'terrain-forest-floor.webp', c: 'Forest floor, one of the six test surfaces (Figure 4 of our poster)' }] },

    { type: 'callout', id: 'strength', h: '27.28 N per latch', p: [
      'We loaded the docked latches with weights, adding them until the latches let go. On average they held 4,337 g of weights plus the 1.23 kg rover: 5,564 g in all, or 54.57 N. That is 27.28 N per latch, and about four and a half times the rover’s own weight.',
      { calc: 'How much margin does each latch have when the drone carries the rover?',
        given: [
          ['Load the two latches held before letting go', '5,564 g, rover included', '[our poster](/assets/docs/drone-on-wheels-poster.pdf), Table 2'],
          ['Rover weight', '1.23 kg', 'weighed on a scale'],
          ['g', '9.81 m/s²', ''],
        ],
        work: [
          'Held: 5.564 kg × 9.81 = 54.57 N, or 27.28 N per latch',
          'Carrying the rover: 1.23 kg × 9.81 = 12.07 N, or 6.03 N per latch',
          '27.28 N / 6.03 N = 4.5',
        ],
        result: 'In a straight vertical pull each latch holds about 4.5 times its share of the rover hanging still.',
        note: 'From the pull test, which pulled straight up. Accelerating, tilting or an off-center rover all eat into that margin.' },
      { problem: 'That is with a perfectly vertical pull. With the rover off-center or the drone rolling, it unlatches more easily.', title: 'Off-axis loads' },
    ] },

    { type: 'media', layout: 'row', items: [
      { i: 'still-carry-flight-cage.webp', c: 'Carrying the rover across the flight cage' },
      { i: 'rover-on-foam.webp', c: 'The finished rover on the foam mats' },
    ] },

    { type: 'prose', id: 'research', h: 'Research', p: [
      'After the summer we ran more tests, collected more data and wrote the work up. I presented the poster “Drone on Wheels: A Hybrid UAV-UGV System for Precision Course Navigation” as co-first author at the IEEE MIT Undergraduate Research Technology Conference (URTC), October 10 to 12, 2025.',
      'Authors: Jerry Li and Mihika Sakharpe (co-first), Zoe Zhao, Katherine Zhang, William Kollmyer, Shashwat Pandya, and Chris Rincon (PI). [Read the poster (PDF)](/assets/docs/drone-on-wheels-poster.pdf).',
      { note: 'The poster’s data is on this page: the terrain speeds (Table 1), the latch strength (Table 2), its photos of the docked pair in the air and the rover on forest floor, and the overall dimensions from its side view.' },
    ] },
    { type: 'media', layout: 'row', id: 'urtc', items: [
      { i: 'urtc-with-poster.webp', c: 'Me with the docked pair at our poster, IEEE MIT URTC, Oct 12' },
      { i: 'urtc-both-vehicles.webp', c: 'Ryker and me presenting the poster at URTC, with the drone and the rover undocked' },
      { i: 'urtc-presenting.webp', c: 'Showing the vehicles to visitors at the poster session' },
    ] },

    { type: 'prose', id: 'next', h: 'What comes next', p: [
      { next: 'The rover could not cross grass, and our poster calls for better wheels on the ground vehicle alongside sending the drone over dense vegetation.', title: 'Better wheels' },
      { next: 'The AprilTag is already on the rover for the drone’s downward camera. Closing that loop, so the drone finds the rover and docks on its own, was the next step we identified.', title: 'Autonomous docking' },
      { next: 'Coordinating the two vehicles as a team (multi-agent integration), and SLAM so they can map together, were the other next steps we identified.', title: 'Working as a team' },
    ] },
  ],
  assets: [`${M}/`],
};
