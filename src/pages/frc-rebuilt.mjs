// FRC REBUILT robot (team 2856, Planetary Drive), 2026. Rich page.
// Copy: facts Jerry stated (facts.md, his checklist, and his answers of Sept 26, 2026 in
// /home/claude/work/answers.md, which override the older notes), what the photos and the match
// video plainly show, and numbers measured or counted in his final Fusion 360 model (marked
// "in the CAD"). The stow angle is computed from the CAD with Jerry's rule (the whole arm inside the
// inner edge of the bumper wood). Held back: the Kraken to flywheel ratio (the coupling is not in
// the CAD export). Demos: assets/js/pages/frc-rebuilt/.
const M = '/assets/models/frc-rebuilt'; // the web model and the demo posters (stills of the live demos)

export default {
  summary: {
    stats: [
      { v: 'Solo', l: 'Robot design, done remotely' },
      { v: '3', l: 'Independent shooters' },
      { v: '21 of 46', l: 'Qualification rank' },
      { v: 'Round 2', l: 'Playoffs, 7th alliance' },
    ],
    text: [
      'I designed this whole robot by myself for FRC team 2856, Planetary Drive, from Paul Laurence Dunbar High School in Lexington, Kentucky. I had a friend on the team, and the team had never used CAD. It was my first FRC season, and I did all of it from Maryland.',
      'It has a pivoting roller intake that carries the front of the hopper with it, three independent shooters and a swerve drive, and it stands 22.0 in tall so it drives under the trench. I planned small test iterations the team could actually do, and the robot basically worked on the first try. At the 2026 Smoky Mountains Regional we ranked 21st of 46, were picked onto the 7th alliance and went out in the second round of the playoffs.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { i: 'robot-regional-crop.webp', c: 'The robot at the 2026 Smoky Mountains Regional, with fuel in the hopper' },
      { i: 'cad-v3-feb18.webp', c: 'My CAD of it, as of Feb 18. Nothing changed after this model.' },
    ],
  },
  sections: [
    {
      type: 'scrolly', id: 'story', module: 'story', stepHeight: '90vh', poster: `${M}/poster-story.webp`,
      h: 'The robot, driven by your scroll',
      p: ['This is my real CAD of the competition robot. Scroll and it starts a match folded up, drives to the fuel, drops its intake, picks the fuel up and runs it through the transfer and the three shooters. Only the fuel, the floor and the labels are drawn in.'],
      steps: [
        { h: 'Start of a match', p: ['REBUILT is played with 5.91 in foam balls called fuel. The fuel is on the left. The robot starts folded up: the intake arm is swung back until all of it is inside the inner edge of the wooden bumper frame, which is what makes the starting position legal.'] },
        { h: 'Swerve drive', p: ['Four REV MAXSwerve modules, one in each corner of a 26.5 in square frame. Each wheel steers on its own, so the robot can drive any direction without turning first. We used MAXSwerve because the team already had the modules.'] },
        { h: 'Intake pivot', p: ['A NEO on a 25:1 MAXPlanetary turns a 12 tooth sprocket, and #25 chain runs up to a 40 tooth sprocket on the arm: 83.3:1 in total, counted from the CAD. The arm swings 132 degrees down to intake. The front of the hopper rides on the arm, and its sprung top panel unfolds on the way.'] },
        { h: 'Intake', p: ['A full-width roller pulls the fuel in. The NEO 2.0 that spins it sits on the frame and drives it through two belts: 12 to 24 teeth up to a pulley on the pivot axis, then 24 to 24 teeth out to the roller. The side plates are cut away here so both belts show.'] },
        { h: 'Into the hopper, toward the hub', p: ['The fuel collects in the hopper. Its floor peaks at the intake pivot and slopes down toward the back, and two divider plates split it into three lanes, one per shooter.'] },
        { h: 'Transfer', p: ['A section through the middle lane. At the bottom of each lane two stacked sets of 1.625 in flex wheels lift the fuel up a curved polycarbonate backing. Each set is on one 1/2 in hex shaft across the whole robot, a belt ties the two shafts 1:1, and a NEO 2.0 sits at each end.'] },
        { h: 'Three shooters', p: ['Each lane ends in its own shooter: a Kraken X60 and two 4 in wheels that squeeze the fuel against a 3D printed hood. The hood curls forward at the top, so the fuel leaves up and forward, over the robot. The arcs are drawn, not measured.'] },
        { h: '22 inches', p: ['The opening under each trench is 22.25 in. The robot is 22.0 in tall in the CAD, so it drives under the trench, and it did.'] },
      ],
    },

    { type: 'prose', id: 'job', h: 'Designing a robot from another state', p: [
      'Planetary Drive had never used CAD. I had a friend on the team, so I designed the whole robot for them in Fusion 360, in my first FRC season. WestCoast Products’ open 2026 robot was my initial inspiration, and what the two have in common is three separate shooters.',
      { problem: 'I was in Maryland for the whole season and the team was in Kentucky. I could never stand next to the robot, and the team had never used CAD.', title: 'Remote, with a team new to CAD' },
      { fix: 'I shared the model through Fusion 360 links, so anyone on the team could open it, and sent DXF files for the flat parts. Bill, a machinist in the shop, waterjet cut all of the aluminum plates from them. Some of the build happened over video calls, like the one in the first photo below.' },
      { problem: 'The team was not very competitive, and syncing a timeline for design iterations was hard.', title: 'No shared schedule' },
      { fix: 'I asked how much time they actually had and planned small test iterations they could really do in it. Through those small iterations I essentially got the design in one shot: the robot basically worked on the first try.' },
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'build-pulley-call.webp', c: 'Mar 10, a screenshot from a video call with the shop: the intake pivot sprocket and its chain going on beside an upright' },
      { i: 'build-shooter-plate.webp', c: 'Feb 13: a shooter side plate waterjet cut from my DXF, with the triangle pockets and PLANETARY DRIVE cut through' },
    ] },

    {
      type: 'demo', id: 'cad', module: 'viewer', height: 'clamp(460px, 74vh, 760px)', poster: `${M}/poster-cad.webp`,
      h: 'Take the CAD apart',
      p: ['The final robot, from my Fusion 360 model with the fasteners left out. Pick a mechanism to light it up, cut a section through any of the three lanes, stow the intake, or run the rollers and wheels.'],
      caption: 'Drag to turn the model. Polycarbonate is drawn clear, as on the real robot. Spin directions follow the fuel path; speeds are not to scale.',
    },

    { type: 'prose', id: 'decisions', h: 'The big decisions', p: [
      'The intake is at the front, the shooters are at the back, and everything between them is hopper. Four choices shaped the rest of the robot.',
      { h: 'Three independent shooters, no turret' },
      { problem: 'The shooter had to be something this team could build and keep running.', title: 'What shooter' },
      { fix: 'Three independent shooters, one per lane. I thought three separate shooters would be more reliable than one big full-width shooter, a single set of wheels across the whole robot. The team was not experienced, so a turret was out.' },
      { next: 'In hindsight the best teams used the full-width shooter, and we did not have time to test enough to find that out ourselves. Next time I would take out the separators between the shooters, because they cause jams, and run one big bar all the way across.' },
      { h: '22.0 inches tall' },
      'The opening under each trench on the REBUILT field is 22.25 in. I kept the whole robot to 22.0 in so it could drive under the trench, and it did.',
      { h: 'MAXSwerve' },
      'Four REV MAXSwerve modules with 3 in wheels and the medium speed gearing, each with a NEO to drive and a NEO 550 to steer. We used them because the team had them.',
      { h: 'No climber' },
      'The robot has no climber for the tower. We ran out of time.',
    ] },

    { type: 'prose', id: 'drive', h: 'Frame and drivetrain', p: [
      'The frame is 26.5 in square in 2x1 in pre-drilled aluminum box tube: 19.5 in rails between the four MAXSwerve modules, joined by gussets, with a triangle-pocketed aluminum belly pan. The roboRIO, the power distribution panel and the battery sit on the pan. Over the bumpers the robot is 33.0 in square, and the wheelbase is 23.0 in.',
      'The modules were wired up on a wooden test frame first. The aluminum frame and pan show up in the build photos a week later.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'build-wood-test-frame.webp', c: 'Feb 7: the four swerve modules wired up on a wooden test frame' },
      { i: 'build-frame-bellypan.webp', c: 'Feb 13: the aluminum frame and the triangle-pocketed belly pan with the modules in' },
    ] },

    { type: 'prose', id: 'intake', h: 'The intake and its pivot', p: [
      'The roller is a 22.6 in polycarbonate tube with a silicone sleeve, on a 1/2 in hex live axle. It sits at the end of an arm made of two 3/8 in polycarbonate plates, 12.0 in from the pivot.',
      { problem: 'The roller rides on a swinging arm, and it has to keep spinning at every arm angle.', title: 'Driving a roller on a moving arm' },
      { fix: 'The NEO 2.0 that spins the roller sits on the frame. Its belt climbs 12 to 24 teeth to a pulley on the pivot axis, and a second belt runs 24 to 24 teeth from that axis out to the roller, 2:1 overall. With the middle pulley on the pivot axis, both belts keep fixed centres wherever the arm is: 244.8 mm for the first (motor and pivot are both on the frame) and 304.4 mm for the second (pivot and roller are both on the arm).' },
      'The arm is driven on the other side. A NEO on a 25:1 MAXPlanetary turns a 12 tooth sprocket, and #25 chain runs to a 40 tooth sprocket bolted to the arm, 83.3:1 in total. A REV Through Bore Encoder sits on a 24 tooth sprocket that rides on the same chain, so it turns 40/24 = 1.67 times as far as the arm. Tooth counts are from the CAD.',
    ] },
    {
      type: 'demo', id: 'pivot', module: 'pivot', aside: 'left', height: '560px', poster: `${M}/poster-pivot.webp`,
      h: 'Stowed for the start, deployed to play',
      p: [
        'Deployed, the front of the intake and hopper reaches 8.6 in past the front bumper in the CAD. To start a match legally all of it has to fold back inside the robot, so the pivot swings the arm up and back until it is completely inside the inner edge of the wooden bumper frame. In the CAD that is a 132 degree swing, which is 220 degrees at the encoder: still less than one turn.',
        'The front of the hopper, its side panels and front panels, is bolted to the arm and swings with it, so the hopper is bigger whenever the intake is down. Its top panel pivots on a single bolt at each lower corner. A spring runs from the one hole at its top corner to a row of holes along the top of the side panel, which sets the tension, so the panel starts the match folded inward and unfolds.',
        'Drag the slider and watch the two belt lengths: they do not change.',
      ],
      caption: 'Side view from the roller motor side, with the parts outside the belts cut away. The arm turns about its real pivot axis from the CAD; the dashed line is the inner edge of the bumper wood.',
    },
    { type: 'media', layout: 'row', items: [
      { i: 'cad-v1-roller-belts.webp', c: 'The same two-belt roller drive in my first model (Jan 31): a NEO, a belt up to a shared pulley, and a second belt down to the roller' },
      { i: 'cad-v1-sprocket-detail.webp', c: 'The first model’s large sprocket and chain beside a pre-drilled upright' },
    ] },

    { type: 'prose', id: 'transfer', h: 'Hopper and transfer', p: [
      'The hopper walls are 0.177 in polycarbonate. Its floor peaks at the intake pivot and slopes down toward the back, so the fuel rolls to the shooters on its own, and two divider plates split it into three lanes. Each lane is 6.5 in wide for 5.91 in fuel, measured between the shooter plates in the CAD.',
      'At the back of each lane the fuel meets two stacked sets of 1.625 in, 60A flex wheels, four low and three high. They push it up a bent polycarbonate backing that curves from the floor up into the shooter. The lower and upper sets each sit on one 1/2 in hex shaft that runs the full width of the robot; an HTD belt on 92 mm centres links them 1:1, and a NEO 2.0 sits at each end.',
      { next: 'Put the hopper on a linear system, so it can retract and force the fuel through the shooters.' },
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'build-kraken-rollers.webp', c: 'Early March: a Kraken X60 next to the flex-wheel transfer rollers on the real robot' },
      { i: 'build-assembled-rear.webp', c: 'Mar 7: the assembled robot from the back, three lanes with the bent backing and the flex wheels across all three' },
    ] },

    { type: 'prose', id: 'shooters', h: 'Three shooters', p: [
      'Three shooters sit side by side, one per lane. Each is a Kraken X60 and a short 1/2 in hex shaft carrying two 4 in wheels, with a 3D printed hood behind them. In the CAD the hood sits 133 mm from the wheels, so each 150 mm ball is squeezed by about 17 mm as it goes through. The hood curls forward at the top, so the fuel leaves up and forward over the robot.',
      'The shooter side plates are aluminum with triangular pockets and the team name cut through them. The Feb 11 model still had solid plates with a few holes; by Feb 13 the cut plates had the pockets and the lettering.',
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'cad-v2-three-shooters.webp', c: 'Feb 11: the three shooter bays in the model, each with its own motor, between solid side plates' },
      { i: 'robot-regional.webp', c: 'The finished robot at the regional, orange flywheels at the back and the hopper full of fuel' },
    ] },

    { type: 'prose', id: 'numbers', h: 'By the numbers', p: [
      { table: {
        head: ['', 'In the CAD'],
        rows: [
          ['Frame', '26.5 in square, 33.0 in over the bumpers'],
          ['Wheelbase', '23.0 in square'],
          ['Height', '22.0 in (trench opening 22.25 in)'],
          ['Intake roller', '22.6 in long, NEO 2.0, 2:1 through two HTD belts'],
          ['Intake arm', '12.0 in pivot to roller, 3/8 in polycarbonate'],
          ['Intake pivot', 'NEO, 25:1 MAXPlanetary, 12 to 40 tooth #25 chain: 83.3:1'],
          ['Stow swing', '132 degrees, until the whole arm is inside the bumper wood'],
          ['Pivot encoder', 'REV Through Bore Encoder on a 24 tooth chain sprocket, 1.67 turns per arm turn'],
          ['Lanes', '3, each 6.5 in wide'],
          ['Transfer', '21 flex wheels, 1.625 in, on two full-width shafts, two NEO 2.0s'],
          ['Shooters', '3, each a Kraken X60 and two 4 in wheels, 17 mm squeeze on the fuel'],
          ['Motors', '15: 8 in the swerve modules, 3 Kraken X60, 3 NEO 2.0, 1 NEO'],
          ['Camera', 'Arducam on a 3D printed mount at the top rear'],
        ],
        caption: 'Measured from my final Fusion 360 model or read from its part names. The stow swing and the squeeze are computed from the model.',
      } },
    ] },

    {
      type: 'iterations', id: 'iterations', h: 'How the design changed',
      items: [
        { label: 'Jan 31', title: 'First model', p: ['Swerve drive, the intake arm, a clear hopper wall at the front and two tall uprights. No shooter yet. The two-belt roller drive is already there.'],
          media: [{ i: 'cad-v1-jan31.webp', c: 'The first model: swerve corners, the intake arm and a clear front hopper wall' }] },
        { label: 'Feb 4', title: 'Fuel path', p: ['The fuel path sketched over a side view of the model in the Fusion viewer: up off the floor at the front and into the robot.'],
          media: [{ i: 'sketch-fuel-path.webp', c: 'The fuel path marked up over a side view of the model' }] },
        { label: 'Feb 7', title: 'Drivetrain on wood', p: ['The four swerve modules wired up on a wooden test frame.'],
          media: [{ i: 'build-wood-test-frame.webp', c: 'Swerve modules on the wooden test frame' }] },
        { label: 'Feb 11', title: 'Three shooters', p: ['Three shooter bays with orange wheels and a motor under each, between solid side plates with a few holes.'],
          media: [{ i: 'cad-v2-three-shooters.webp', c: 'Three shooter bays in the model, solid side plates' }] },
        { label: 'Feb 13', title: 'First cut parts', p: ['The shooter side plates are now pocketed with triangles and carry the team name, and the pocketed belly pan is cut. Bill waterjet cut the aluminum plates from my DXFs.'],
          media: [{ i: 'build-shooter-plate.webp', c: 'A cut shooter side plate' }, { i: 'build-frame-bellypan.webp', c: 'The frame and belly pan with the modules in' }] },
        { label: 'Feb 18', title: 'Final design', p: ['Pocketed shooter plates in the model and a frame over the shooters. Nothing changed between this model and the final CAD.'],
          media: [{ i: 'cad-v3-feb18.webp', c: 'The Feb 18 model' }] },
        { label: 'Mar 5 to 10', title: 'Built', p: ['The robot assembled from the model, wiring in progress. On Mar 10 the intake pivot sprocket went on while I was on a video call with the shop.'],
          media: [{ i: 'build-assembled-rear.webp', c: 'The assembled robot from the back' }, { i: 'build-pulley-call.webp', c: 'The intake pivot sprocket going on, seen over a video call' }] },
        { label: 'Mar 19', title: 'Competition', p: ['At the Smoky Mountains Regional. It basically worked on the first try.'],
          media: [{ i: 'robot-regional.webp', c: 'The robot at the regional, with the team behind it' }] },
      ],
    },

    { type: 'prose', id: 'results', h: 'At the Smoky Mountains Regional', p: [
      'We ranked 21st of 46 in qualifications and were picked onto the 7th alliance. We went out in the second round of the playoffs, in a lower bracket match the 6th alliance won 134 to 110.',
    ] },
    { type: 'media', layout: 'row', items: [
      { v: 'hero-playoff-auto.mp4', c: 'Autonomous in that match, from the event broadcast. We were Alliance 7, in red.' },
      { v: 'playoff-final-seconds.mp4', c: 'The last seconds of the match' },
    ] },
    { type: 'media', layout: 'row', items: [
      { i: 'still-playoff-title.webp', c: 'Match 6, the second round of the playoffs' },
      { i: 'still-playoff-result.webp', c: 'Final score: 6th alliance 134, 7th alliance 110' },
    ] },

    { type: 'callout', id: 'next', h: 'What I would change', p: [
      { next: 'Take out the separators between the three shooters, which cause jams, and run one big full-width shooter bar all the way across.' },
      { next: 'Put the hopper on a linear system so it can retract and force the fuel through the shooter.' },
      'Open the full model in Fusion 360: [a360.co/4lvYOTs](https://a360.co/4lvYOTs).',
    ] },
  ],
  assets: ['/assets/models/frc-rebuilt/'],
};
