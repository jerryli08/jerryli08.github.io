// Drone Grabber Arm (concept, Jul 2025). Page text from the phase A write-up for this project,
// trimmed to what Jerry has stated, what the
// photos plainly show and what is measured or computed from his CAD. Framed as part of MIT Beaver
// Works Summer Institute (Jerry, Sept 27: full name, never the abbreviation); Drone on Wheels, linked
// from here, stays MIT Lincoln Laboratory research and is not re-framed. Held back until Jerry answers
// questions.md: the servo model (the CAD and Jerry disagree, so no model is named), who designed the
// claw, whether the joint hubs and bearings were parts from his other robots, any powered test,
// the camera, and what he would change.
// Scrollies: assets/js/pages/drone-arm/ (rig.js has the axes from the STEP and the IK). Jerry (Sept 27,
// 21:12): the CAD turntable is removed and the grab scrolly takes its place, right after the idea.
// The servo-load calculation uses rig.js's axis points (S, E, G) and the CAD's 500 ml bottle; no
// servo rating is compared because the servo model is held back. cad-side-bottle.webp is a render of
// the real CAD (tools/pages/render.mjs, azimuth 0).
const M = '/assets/models/drone-arm';

export default {
  summary: {
    stats: [
      { v: '2 joints', l: 'A servo at each, driving the next link directly' },
      { v: '514 mm', l: 'Reach from the shoulder (CAD)' },
      { v: '1 servo', l: 'Closes both claw jaws, geared together' },
      { v: 'Carbon', l: 'Links made from spare drone arms' },
    ],
    text: [
      'An arm that hangs under a quadcopter and grabs things, like a bottle of water off a table. The idea was a drone that could fetch household items in a place like a senior home, because a drone is more flexible than a ground robot.',
      'I designed it in CAD and built the whole arm as part of the MIT Beaver Works Summer Institute: two servo joints driving the links directly, links made from spare carbon fiber drone arms, and a 3D-printed claw. It was almost ready to go on the drone when we pivoted, and the same team went on to build [Drone on Wheels](/projects/hybrid-vehicle).',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { i: 'arm-assembled.webp', c: 'The arm assembled: shoulder mount and servo, the first carbon link, the elbow and the second link' },
      { i: 'arm-joint-block-in-hand.webp', c: 'The shoulder mount with its servo, on the first link' },
    ],
  },
  sections: [
    { type: 'prose', id: 'idea', h: 'The idea', p: [
      'That summer at the MIT Beaver Works Summer Institute, our main objective was software only, and I wanted to do an additional hardware project with my team. I already had the idea of an arm on a drone that could grab things. My teammates took it further: a drone that could work in a place like a senior home and fetch household items, because a drone is more flexible than a ground robot.',
      { problem: 'A drone with spinning propellers flying around people is an obvious safety concern.', title: 'Safety' },
      { fix: 'Drones with propeller guards already exist, so it could be made safe. And the idea is not limited to senior homes: a drone that can carry household items generalizes to other jobs.', label: 'Answer' },
    ] },

    { type: 'scrolly', id: 'grab', module: 'grab', width: 'full', stepHeight: '90vh',
      poster: `${M}/poster-grab.webp`, h: 'How it would pick up a bottle',
      p: ['This is the plan for a grab, animated on the real CAD. None of it ran: we pivoted before the arm went on the drone.'],
      steps: [
        { h: '1. Find the bottle', p: ['The drone flies in with the arm raised. A camera on the end of the arm finds the bottle and works out where it is relative to the drone.'] },
        { h: '2. Close in and hold position', p: ['The drone flies closer and holds its position.'] },
        { h: '3. Reach it with inverse kinematics', p: ['The claw opens, and the arm uses inverse kinematics to move it to the bottle: the IK target in orange, the two links in blue.'] },
        { h: '4. Close the claw', p: ['The claw closes around the bottle. One servo turns both jaws, geared to each other at their pivots.'] },
        { h: '5. Lift off with it', p: ['The drone lifts off with it, and the arm folds back to its pose in the CAD, holding the bottle under the middle of the drone.'] },
      ],
      caption: 'The plan, animated: none of it ran, because we pivoted before the arm went on the drone. The table, the camera, its view and the detection box are drawn in; they are not in the CAD. The hover point, the path and the 25° jaw opening are choices for this animation.' },

    { type: 'prose', id: 'arm', h: 'The arm', p: [
      { h: 'Links from spare drone arms' },
      'The two links are spare carbon fiber arms for the X500, the same frame the arm hangs from. Each one keeps the blue motor mount on its end, and that mount becomes the joint: a 3D-printed adapter plate bolts a servo hub onto the motor mount’s bolt pattern. Apart from the carbon links, the servos, the hubs and the bearings, every piece of the arm, claw included, is 3D printed.',
      { h: 'Direct drive, no gearing' },
      'Each joint is a servo attached directly to the next link, with no gearing in between. On the other side of each joint the link turns on a ball bearing around a printed shaft (14 mm bore at the shoulder, 6 mm at the elbow), so each link is held on both sides of its joint.',
      { h: 'The claw' },
      'The claw is 3D printed, with two curved jaws that wrap around a bottle. The jaws pivot 35 mm apart and are geared to each other right at their pivots, so a single servo closes both of them as mirror images.',
      { h: 'Mounting it' },
      'A printed wedge bolts under the drone’s center plate and carries the shoulder. Folded as in the CAD, the arm holds the bottle under the middle of the drone.',
    ] },

    { type: 'prose', id: 'loads', p: [
      { calc: 'What the servos hold with a bottle',
        given: [
          ['A 500 ml bottle of water', 'about 0.5 kg', 'the bottle in the CAD; water is 1 g per ml ([USGS](https://www.usgs.gov/water-science-school/science/water-density))'],
          ['Shoulder axis to grip point, across', '97.5 mm', 'measured from the CAD, in its pose'],
          ['Elbow axis to grip point, across', '278.7 mm', 'measured from the CAD, in its pose'],
          ['Full reach, L1 + L2', '514.3 mm', 'measured from the CAD'],
        ],
        work: [
          'Weight: 0.5 kg × 9.81 m/s² = 4.9 N',
          'Shoulder, folded as in the CAD: 4.9 N × 0.0975 m = 0.48 N·m (4.9 kg·cm)',
          'Shoulder, reaching straight out level: 4.9 N × 0.5143 m = 2.5 N·m (25.7 kg·cm)',
          'Elbow, folded as in the CAD: 4.9 N × 0.2787 m = 1.37 N·m (13.9 kg·cm). The forearm is almost level in that pose, so this is close to the most the bottle can ever ask of the elbow',
        ],
        result: 'Folded, the shoulder carries about a fifth of the load it would with the bottle straight out. The elbow is the busier joint: with the forearm almost level it holds about 14 kg·cm, folded or reaching out.',
        note: 'Estimate: static, with the bottle as 0.5 kg at the grip point. The links, the claw and the bottle itself are left out, so the real loads are higher. Nothing here was measured on the arm.' },
    ],
      media: [
        { i: 'cad-side-bottle.webp', c: 'The CAD from the side, in the pose it was saved in: the arm folded under the drone with the bottle in the claw, 97.5 mm across from the shoulder axis' },
      ] },

    { type: 'prose', id: 'ik-math', h: 'The inverse kinematics', p: [
      'The arm moves in one vertical plane under the drone, so finding the joint angles for a target is the classic two-link problem. Put the shoulder at the origin, call the link lengths L1 = 235.4 mm (shoulder to elbow) and L2 = 278.9 mm (elbow to the middle of the claw), both measured in the CAD, and aim the claw at a target (u, v):',
      { pre: 'd  = sqrt(u^2 + v^2)\nq2 = -acos((d^2 - L1^2 - L2^2) / (2 L1 L2))\nq1 = atan2(v, u)\n     - atan2(L2 sin q2, L1 + L2 cos q2)' },
      'q1 is the shoulder angle and q2 the elbow angle, both measured counterclockwise in the arm’s plane.',
      'The minus sign on q2 picks the elbow-out solution the CAD is drawn in. Plugging in the claw’s position from the CAD gives back the CAD’s own joint angles, q1 = -39.7° and q2 = -142.3°, which checks the geometry. The claw can reach anywhere from 43.5 mm to 514.3 mm from the shoulder.',
    ] },

    { type: 'scrolly', id: 'ik', module: 'ik', width: 'wide', side: 'left', stepHeight: '90vh',
      poster: `${M}/poster-ik.webp`, h: 'Reaching with two joints',
      steps: [
        { h: 'Two joints, one plane', p: ['The shoulder and the elbow turn about their real axes in the CAD. Here the arm is in its CAD pose: q1 = -39.7° and q2 = -142.3°, with L1 = 235.4 mm and L2 = 278.9 mm.'] },
        { h: 'Out to full reach', p: ['The orange target moves out, and the inverse kinematics turns the shoulder and the elbow to keep the claw on it. Almost straight, the arm reaches just over 500 mm here; the full reach is L1 + L2 = 514.3 mm.'] },
        { h: 'Everywhere it can reach', p: ['The shaded ring is everywhere the claw can reach, from 43.5 mm to 514.3 mm from the shoulder. The target runs around its edge under the drone.'] },
        { h: 'No wrist', p: [
          'The claw is fixed to the forearm, so its angle is whatever q1 + q2 makes it. It is level, as in the CAD, only along one arc: a circle of radius L1 around a point L2 behind the shoulder. Along the dashed arc the claw’s tilt stays at 0°, all the way back to the pose in the CAD.',
          'In the grab above, the drone holds where the bottle sits on that arc, so the drone’s position does the job a wrist joint would.',
        ] },
      ],
      caption: 'The planned control, worked out on the CAD; it never ran on the arm. The joint limits here only keep the arm under the drone; the real ones are not in the CAD. The near half of the drone is cut away so the arm reads in profile.' },

    { type: 'iterations', id: 'timeline', h: 'What happened', items: [
      { label: 'Jul 7, 2025', title: 'The drone', p: ['The lab’s X500 quadcopter, the frame the arm is designed around. Dates are from the photos.'],
        media: [{ i: 'lab-drone-x500.webp', c: 'The X500 quadcopter on a desk in the lab' }] },
      { label: 'Jul 14, 2025', title: 'Joints and links', p: ['The shoulder wedge with its servo, the carbon links and the elbow, assembled into the arm.'],
        media: [{ i: 'arm-joint-block-in-hand.webp', c: 'The shoulder mount and servo on the first link, with the elbow below' }, { i: 'arm-assembled-on-bed.webp', c: 'The assembled arm: the red shoulder wedge and servo, a carbon link, the elbow and the second link' }] },
      { label: 'Jul 15, 2025', title: 'More links and the claw parts', p: ['Spare drone arms with their motor mounts, and the printed claw parts on the desk behind them.'],
        media: [{ i: 'arm-links-drone-arms.webp', c: 'Spare carbon drone arms with their blue motor mounts, and red printed claw parts behind' }] },
      { label: 'Then', title: 'We pivoted', p: ['The whole arm was built and almost ready to go on the drone when we pivoted to a new idea: [Drone on Wheels](/projects/hybrid-vehicle), a drone and a ground rover that dock together, so each one can carry the other. We felt it was the better idea because it would have more applications, and it was the surer bet in the time we had left, less than two weeks. The same team went on to build it.'] },
    ] },
  ],
};
