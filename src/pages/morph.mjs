// Morph (Hack the North 2026). Sources: Jerry's checklist and answers (work/answers.md, Sep 26), facts.md,
// projects.mjs, the team's summary (work/morph-htn-2026/PROJECT.md) and the public team repo
// github.com/AydanLing/Hack-The-North (planner code, URDF, fold library, intent model, git history).
// Numbers from the repo are named as such; nothing here is estimated.
//
// Held back: who wrote the fold planner (Jerry lists it in his role; the repo history shows Justin Rui
// committing the planner core and Jerry adding the torque gate, path audit and 17-cube library), so the
// planner is "our planner" and the parts his commits show are "I" (flagged for Jerry in the page report).

const REPO = 'https://github.com/AydanLing/Hack-The-North';

const booth = {
  label: 'Diagram: from a text message to a fold, as it ran at the booth',
  minBox: 170,
  boxes: [
    { t: "Visitor's phone", s: 'texts anything: a shape, a joke, a name' },
    { t: 'Linq', s: 'iMessage API', edge: 'text' },
    { t: 'Cloudflare tunnel', s: 'public URL to our laptop', edge: 'webhook' },
    { t: 'Bridge', s: 'webhook service on the laptop; checks the signature, drops repeats', edge: '' },
    { t: 'Rules', s: 'help = the shape list. "straight line" or "home" = every joint to 0. Nothing else runs.', edge: 'text, as data', accent: true },
    { t: 'MiniLM', s: 'int8 MiniLM + TF-IDF into one softmax head, on the laptop, a few ms', edge: 'no rule matched', accent: true,
      branch: { t: 'GPT-4o-mini', s: 'only when MiniLM is unsure, only onto the same shape list, and it may answer "none"', edge: 'unsure', back: 1, backEdge: 'a shape, or ask again' } },
    { t: 'Shape library', s: 'one planned path per name, 88 at the booth; nothing else can reach the motors', edge: 'label', accent: true },
    { t: 'Planned path', s: 'moves, sides, silhouette, torque', edge: 'look up', accent: true },
    { t: 'Servos and MuJoCo', s: 'the same plan drives the servo bus and a MuJoCo mirror; unplugged, it plays in simulation only', edge: 'moves', accent: true },
    { t: 'Reply', s: 'back over iMessage: "Folding into a heart, with love. 11 moves, about 22s."', edge: 'done or error', accent: true },
  ],
  note: 'Inbound text is data, never a command. The only thing that can reach the motors is a shape already in the library.',
};

const discovery = {
  label: 'Diagram: how a drawing becomes a playable shape',
  boxes: [
    { t: 'Draw', s: '17-cell drawings (27 for the full chain), several per concept; about 8,000 generated with Claude', accent: true },
    { t: 'Gate', s: 'A path with two ends and no branches? Does our roll word thread it exactly? Tens of milliseconds.', edge: 'each drawing', accent: true,
      branch: { t: 'Rejected', s: 'not a path, or the roll word cannot thread it', edge: 'fails', tone: 'reject' } },
    { t: 'Blind judge', s: 'names every threadable drawing without seeing the concept list', edge: 'threadable', accent: true,
      branch: { t: 'Rejected', s: 'the judge named something else', edge: 'misread', tone: 'reject' } },
    { t: 'Fold search', s: 'signed moves under the hard checks, about a minute per drawing', edge: 'recognizable', accent: true,
      branch: { t: 'Rejected', s: 'no legal fold in budget', edge: 'fails', tone: 'reject' } },
    { t: 'Audit', s: 'no more than 1.5 times the minimum steps; no joint bent only to come back', edge: 'legal folds', accent: true,
      branch: { t: 'Rejected', s: 'the path thrashes', edge: 'fails', tone: 'reject' } },
    { t: 'Library', s: 'path, silhouette, renders, moves; 88 playable names at the booth', edge: 'export', accent: true },
  ],
  tally: { title: 'One library run: 282 everyday concepts', rows: [
    { l: 'Drawings', v: 1383, at: 0 },
    { l: 'Threadable', v: 865, at: 1 },
    { l: 'Named by the blind judge', v: 81, at: 2 },
    { l: 'Folded and passed', v: 66, at: 4 },
  ] },
};

const checks = {
  label: 'Diagram: one step of the fold search',
  boxes: [
    { t: 'Pop', s: 'the queued step with the fewest 120 degree steps left, then the fewest detours' },
    { t: 'Pick a side', s: 'the side with the smaller gravity moment swings: out = the tail, in = the base side', edge: 'joint j, +1 or -1' },
    { t: 'Hard checks', s: 'still 17 distinct cells\nswept CAD within tolerance\ntether keep-out clear\nno dig into the table past the limit\ntorque under 10.6 N·m', edge: 'new pose', accent: true,
      branch: { t: 'Prune', s: 'any check fails: drop this step', edge: 'fails', tone: 'reject' } },
    { t: 'Goal?', s: 'every joint at its target state', edge: 'all pass',
      branch: { t: 'Queue it', s: 'not there yet: its next steps go into the queue unchecked', edge: 'no' } },
    { t: 'Recheck', s: 'the whole path replayed through a fresh checker', edge: 'yes', accent: true },
    { t: 'Rank', s: 'up to 8 passing plans; fewest moves first', edge: 'passes', accent: true },
  ],
  chips: ['Reached the goal?', 'Passed the hard checks?', 'Searched everything, or ran out of budget?'],
  note: 'The planner records those three facts separately for every result. "Loose" is the working gate; the "strict" result is always reported next to it and never silently replaces a loose pass.',
};

const servo = {
  label: 'Diagram: from a joint state to a 120 degree turn',
  minBox: 150,
  boxes: [
    { t: 'Plan', s: 'joint j to state -1, 0 or +1' },
    { t: 'Target', s: 'home + state × 5,461 counts × sign', edge: 'per joint', accent: true,
      branch: { t: 'Software zero', s: 'the straight chain at the start of a session is home', edge: 'home', into: true } },
    { t: 'STS3215', s: 'one serial bus for every servo, on a CH343 USB adapter', edge: 'command', accent: true,
      branch: { t: 'Poll the bus', s: 'until the joint arrives; re-drive any joint that sagged more than 150 counts', edge: 'feedback' } },
    { t: 'Servo shaft', s: '480° per step', edge: '', accent: true },
    { t: '4:1 reduction', s: 'to the moving half', edge: '', accent: true },
    { t: 'Joint', s: '120° per step, planned at 2 s', edge: '', accent: true },
  ],
};

export default {
  summary: {
    stats: [
      { v: 'Top 30', l: 'of 1,000+ hackers' },
      { v: '36 h', l: 'Build time' },
      { v: '17', l: 'Cubes, 16 joints that change the shape' },
      { v: '43,046,721', l: 'Joint words: 3^16' },
      { v: '88', l: 'Playable shapes at the booth' },
    ],
    text: [
      'Morph is a chain of 17 cubes. Each cube is cut in half across its body diagonal, and a servo turns one half against the other in 120 degree steps. You text it, a small language model picks a shape it knows, and the chain folds into that shape one planned move at a time.',
      'I built the software that turns a text into motion, and spent 8 hours soldering USB-C breakout boards for the motor controller drivers. Scroll down to watch five texts go through the booth\'s own classifier and fold plans.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { i: 'still-htn-letters.webp', c: 'h, t and n: three folds of the real chain, from our demo video' },
      { i: 'booth-standing-fold.webp', c: 'At the booth: a fold that stands up off the table' },
    ],
  },
  sections: [
    { type: 'prose', id: 'idea', h: 'A robot that is not one shape', p: [
      'Most robots commit to a body: a dog, an arm, a wheeled box. That commitment is also a ceiling. When we were picking what to build at Hack the North, we wanted a robot that did not conform to any one form.',
      'Morph is one open chain of identical cubes. Lying straight it is a line. After a handful of 120 degree turns it is a heart, a letter, a hook. The hardware never changes; the shape is the output.',
      'I built the path from a text message to motion: iMessage in through the Linq API, a MiniLM intent classifier running on our laptop with GPT-4o-mini as a fallback, torque limits on the fold plans, the executor that drives the servos, and MuJoCo validation of every plan before the real robot moves. On the hardware side, all of the wiring runs inside the modules, so I spent 8 hours soldering USB-C breakout boards for the motor controller drivers. My teammates were Daniel Ganjali, Aydan Ling and Justin Rui.',
    ] },
    { type: 'media', layout: 'row', items: [
      { v: 'hero-htn-letters.mp4', c: 'From our demo video: the real chain folding into h, t and n' },
      { v: 'hero-fold-sideview.mp4', c: 'The straight chain starting a fold, from the side' },
    ] },

    { type: 'scrolly', id: 'text', module: 'textfold', width: 'wide', side: 'left', stepHeight: '120vh', poster: 'still-column-standing.webp',
      h: 'Text it. It folds.',
      p: [
        'This is the booth without the phone network. Five texts go through the path the robot ran: the bridge\'s rules, then the booth\'s own MiniLM classifier, then a shape from our library, then that shape\'s planned moves, one 120 degree step at a time, on 17 copies of our module CAD.',
      ],
      data: { texts: ['show the judges some love', 'straight line', 'build a pyramid', 'yo whats good', 'curl up into a spiral'] },
      steps: [
        { h: '"show the judges some love"', p: ['No word in it says heart. The bridge\'s rules pass it on, and MiniLM, running on our laptop, puts **heart** first at 38.8%, far ahead of "none" at 2.8%. The bridge looks up the heart\'s planned path, texts back, and the chain folds: 11 moves, one 120 degree step at a time.'] },
        { h: '"straight line"', p: ['A home phrase. The bridge\'s rules catch it before any model runs, reply "Going back to a straight line (home).", and every joint goes back to 0. Here the heart\'s plan plays backwards; the robot drove every joint home at once.'] },
        { h: '"build a pyramid"', p: ['There is no pyramid in the library. MiniLM\'s best guess is **triangle** at 21.0%, just over the 20% it needs to act on its own. The triangle takes 5 moves and ends standing on edge.'] },
        { h: '"yo whats good"', p: ['Chitchat. MiniLM\'s top class is **none**, at 43.3%: the class trained on exactly this. Nothing folds, and the triangle stays. At the booth, GPT-4o-mini got a turn next, and it could only answer with a shape from the same list or "none", in which case the bot asked again. This page never calls it.'] },
        { h: '"curl up into a spiral"', p: ['MiniLM is surest here: **spiral** at 85.4%. The triangle unfolds first, backwards, then the spiral\'s 13 planned moves. The highest torque it asks of any joint is 5.0 N·m, against a 10.6 N·m stall cap.'] },
      ],
      caption: 'Blue outline: the wire end (power and the servo bus). Orange outline: the cube whose joint is turning. Joints are numbered from the wire end.' },
    { type: 'prose', id: 'text-notes', p: [
      { note: [
        'What is real here. The scores and replies: each text was run through the team\'s own Python pipeline ahead of time (the bridge\'s rules, then the int8 MiniLM and its fitted head from the repo), and the page shows what it returned. The shapes: the 20 fold plans that are public in the repo (the booth had 88), every move and side copied and replayed against the planner\'s own recorded poses. The cubes: our module CAD.',
        'What is not. GPT-4o-mini is never called; where the booth would ask it, the page says so. Between shapes the page unfolds the last plan backwards; the robot drove every joint home at once.',
      ].join(' ') },
    ] },

    { type: 'prose', id: 'joints', h: 'Seventeen cubes, sixteen joints', media: [
      { i: 'still-module-closeup.webp', c: 'The printed cubes up close: a green half and a black half each' },
    ], p: [
      'Each module is an 80 mm printed cube split along the plane through its center, normal to its body diagonal (the line between opposite corners). A Feetech STS3215 servo turns one half against the other about that diagonal through a 4:1 reduction, so one 120 degree step at the joint is 480 degrees, 5,461 encoder counts, at the servo.',
      'A 120 degree turn about the body diagonal maps a cube onto itself, but it moves the face the next cube is bolted to. So every joint has exactly three positions, -120, 0 and +120 degrees, and the chain always sits on a cubic grid, 82 mm from one cube center to the next. There is no ±240 degree winding: -120 to +120 is two steps through zero. The planner, the robot description (URDF) and the servo driver all share that contract.',
      'Our URDF has 17 revolute joints, one in every cube. The one in the cube at the tip turns a half with nothing mounted on it, and because the turn maps the cube onto itself, it never changes the shape. That leaves 16 joints that matter: 3^16 = 43,046,721 joint words. Most of them drive cubes through each other. The real question is which of the rest look like something.',
      { problem: 'We planned 27 modules. The servos were slip fit into PLA housings less than 2 mm thick, not screwed in, and under load the housings flexed and the gears skipped steps. The more cubes hanging off a joint, the worse it got: with the full chain the gears skipped, and 17 was the most the chain could carry.', title: '27 cubes was too many' },
      { fix: 'At about 5 AM on the last night we cut the robot to the first 17 modules of the 27-module design, with a 17-module URDF, planner config and MuJoCo scene. I switched the text bridge to a new 17-cube shape library and retired the 27-cube one, which had 138 planned folds. Everything at the booth ran on 17.' },
      { next: 'Much more robust modules, so all 27 can be chained.' },
    ] },
    { type: 'scrolly', id: 'module', module: 'module', stepHeight: '90vh', poster: 'still-module-cad-render.webp',
      h: 'One joint, three positions',
      p: ['One module from our CAD (my teammates designed it; the gear set was hidden when it was exported). The black half stays put and the green half turns against it about the dashed line, the cube\'s body diagonal.'],
      steps: [
        { h: 'At rest', p: ['The joint at 0. The blue arrow points out of the face the next cube is bolted to.'] },
        { h: 'Mid-turn: the sweep', p: ['Halfway through a step the green half leaves the cube\'s outline: at 60 degrees it reaches 22 mm into each of the three neighboring cells across its faces, and into no other cell. That sweep is what the planner has to keep clear.'] },
        { h: 'A full step: +120 degrees', p: ['Through the 4:1 reduction, one step at the joint is 480 degrees and 5,461 encoder counts at the servo. The cube is back inside its own outline, but the face the next cube mounts on now points another way.'] },
        { h: 'Three positions, three directions', p: ['With the next cube on, -120, 0 and +120 degrees send it into three different neighboring cells, each 82 mm from this cube\'s center. That is why the chain always sits on a cubic grid.'] },
      ],
      caption: 'The dashed line is the joint axis; the blue arrow points to where the next cube mounts. Servo angle and counts follow from the 4:1 reduction; the reach is measured on the CAD as it turns.' },

    { type: 'prose', id: 'roll', h: 'Why most drawings are impossible', media: [
      { i: 'chain-wave-floor.webp', c: 'The chain bent into a wave on the floor of our work room' },
    ], p: [
      'The shape is not a sculpted shell. It is the set of grid cells the 17 cubes occupy, each cube sharing a face with the next. A heart is 17 specific cells, visited in an order the chain can actually thread.',
      'The catch is the roll word: the quarter turn at which each module is mounted relative to the one before it, fixed when the chain is assembled. For our 17-cube chain it is `1200130013310123`. Each joint can only swing its own exit face among three directions, so the roll word decides which paths through the grid are reachable at all.',
      'What we learned about which drawings survive:',
      { ul: [
        '1-wide and 3-wide strokes thread; 2-wide strokes mostly do not.',
        'Long 45 degree diagonals do not thread.',
        'Closed rings need a gap, because 17 is odd: on a square grid a closed loop always has an even number of cells.',
        'A filled 2 x 2 x 2 block is impossible: a half-swing always reaches 22 mm into a neighboring cell. The same sweep is why the chain can never assemble or escape a 3 x 3 x 3 cube, even though the kinematics could thread one.',
        'The wire end carries the servo bus and power. Its cable leaves through a keep-out (an 82 x 40 mm box in the planner) that nothing may sweep through or crush into the table.',
      ] },
    ] },

    { type: 'scrolly', id: 'discovery', module: 'flow', webgl: false, width: 'wide', side: 'right', stepHeight: '85vh', data: discovery,
      h: 'Finding shapes worth folding',
      p: ['Recognizability is decided before mechanics, not scored afterwards. Checking whether a drawing can be threaded takes milliseconds; searching for a fold takes about a minute. So the funnel does the cheap tests first and spends fold time only on drawings a judge could already name.'],
      steps: [
        { h: 'Draw', p: ['Every shape starts as a drawing: 17 cells for our chain (27 for the full one), several per concept. We generated about 8,000 with Claude.'], view: { to: 0 } },
        { h: 'The cheap test first', p: ['Is it a path with two ends and no branches, and does our roll word thread it exactly? That takes tens of milliseconds. In one library run of 282 everyday concepts, 865 of 1,383 drawings passed.'], view: { to: 1 } },
        { h: 'A blind judge', p: ['A judge names every threadable drawing without seeing the concept list. Only drawings it names as what they were meant to be go on: 81 in that run.'], view: { to: 2 } },
        { h: 'Only then, the fold', p: ['The fold search spends about a minute per drawing under the hard checks, and the audit throws out paths that thrash. 66 folded and passed.'], view: { to: 4 } },
        { h: 'Into the library', p: ['Each survivor goes into the library with its path, silhouette, renders and moves. At the booth that was 88 playable names.'], view: { to: 5 } },
      ] },
    { type: 'prose', id: 'counts', p: [
      { table: { head: ['Stage', 'Count', 'Source'], rows: [
        ['Candidate drawings generated with Claude', 'about 8,000', 'my count; 3,330 drawn masks are committed in the repo'],
        ['One library run: 282 everyday concepts', '1,383 drawings, 865 threadable, 81 named by the blind judge, 66 folded and passed', '`cubot-v2/docs/LIBRARY-20260919.md`'],
        ['Planned folds for the 27-cube chain, Sep 19', '138 paths, 116 distinct shapes', 'the repo\'s 27-cube library before we switched to 17'],
        ['Playable at the booth on the 17-cube chain', '88 names', 'our booth library'],
        ['Public in the repo today', '20 shapes', '`cubot-v2/handoff-17`, the ones the demo above folds'],
      ] } },
      'Drawn masks threaded far more often than generated atlases: about 39% against about 1.6% in the 27-cube study. Not every name is a museum-quality drawing. Some are simply the best 17-cell path this roll word can thread.',
    ] },
    { type: 'media', layout: 'wide', items: [
      { i: 'shape-library-88.webp', c: 'The 88 playable shapes of the booth library, each as its cells seen from above' },
    ] },

    { type: 'scrolly', id: 'fold', module: 'fold', h: 'One fold, move by move', poster: 'still-booth-heart.webp',
      p: ['The heart from our public library: 11 moves, exactly as planned. Scroll to fold it.'],
      steps: [
        { h: 'Seventeen copies of one module', p: ['The chain starts straight on the table, every joint at 0. The blue outline is the wire end.'] },
        { h: 'Move 1: out', p: ['Joint 16, next to the tip, turns +120 degrees. An **out** move swings the tail: here, only cube 17. It is the cheapest move in the plan.'] },
        { h: 'Moves 2 to 6: in', p: ['Joints 5, 2, 3, 6 and 9. These are **in** moves: the long tail stays planted on the table and the short base side swings instead, the other way. Each one turns everything built so far. The planner picks the side with the smaller gravity moment about the joint, the one that is easier to lift.'] },
        { h: 'Moves 7 to 11: out', p: ['Joints 13, 10, 14, 11 and 12 finish the shape from the tail end. The highest torque the plan asks of any joint is 1.8 N·m, against a 10.6 N·m stall cap.'] },
        { h: 'Standing on edge', p: ['Because of the in moves, the finished heart stands on edge instead of lying flat, as the planner predicted before the robot ever moved. Its 17 cells match the drawing it started from.'] },
      ] },

    { type: 'scrolly', id: 'checks', module: 'flow', webgl: false, width: 'wide', side: 'left', length: '170vh', data: checks,
      h: 'How the planner searches',
      p: [
        'A move is one joint, one 120 degree step and a side. **Out** swings the tail. **In** swings the base side the other way and leaves the tail where it is, which re-orients everything already folded. The planner chooses the side with the smaller gravity moment about the joint, so the heavier side stays planted; when the two are close, it tries both.',
      ] },
    { type: 'prose', id: 'search', media: [
      { v: 'fold-column-stands.mp4', c: 'The end of a fold: a column of cubes stands up off the flat base' },
      { v: 'fold-frame.mp4', c: 'A fold into a rectangular frame, from the side' },
    ], p: [
      'The search runs over joint words from the straight chain. Its queue is ordered by the number of 120 degree steps still needed (the sum over joints of the distance to the target state, which never overestimates), then by detours taken (steps away from the goal, capped at 8 in the working profile), then by how badly the soft checks scored. Steps toward the goal are tried before detours; among them it first places a few joints far apart, near the ends of the chain, then grows runs of neighboring joints. A pose reached again at no lower cost is dropped.',
      'Checking a move against the real CAD is the expensive part, because the swing is sampled every 4 degrees. So new steps go into the queue unchecked and are only checked when they come out, and every finished plan is replayed through a fresh checker before it is reported. Up to 8 passing plans are kept and ranked: fewest moves first, then the soft scores.',
      'I had called it A*. It is close, but not textbook A*. A* orders by moves made plus moves left, and since every step here changes the distance by exactly one, that sum is the starting distance plus twice the detours. Our planner orders by moves left first, which makes it a greedy best-first search with a detour budget: it finds a legal fold fast, then keeps collecting candidates and ships the shortest.',
      { problem: 'The planner started from the servo\'s numbers: 2.94 N·m at the motor, times 4 for the reduction, times 0.9, is a 10.6 N·m stall cap. The printed gears skip well below that, and a joint that is only holding its angle skips just like one that is moving.', title: 'The gears skip before the servos stall' },
      { fix: 'Torque limits in the planner. The working profile scores any demand above 5.8 N·m down and rejects anything above 10.6 N·m. I added a stricter profile for the 27-cube library that also hard-gates the load on holding joints, deep table digs and large overhangs, then re-planned the demo shapes under it. On the robot, the executor re-checks every joint after each move and re-drives any that sagged more than 150 encoder counts. The highest peak demand in the 20 public paths is 5.76 N·m, for the A.' },
      { problem: 'Some planned paths thrashed: they spent far more moves than their goal needed, bending a joint only to bring it back to 0.', title: 'Paths that thrash' },
      { fix: 'I wrote an audit that rejects any path longer than 1.5 times the minimum number of steps its goal needs, or that bends a joint only to return it. Square, plus and C failed and came out of the booth library; C came back with a clean two-move path.' },
      { next: 'A better way to generate paths and shapes than drawing thousands of candidates and searching each one.' },
    ] },

    { type: 'scrolly', id: 'booth', module: 'flow', webgl: false, width: 'wide', side: 'right', stepHeight: '80vh', data: booth,
      h: 'Text it, it becomes that',
      p: ['At the booth anyone could text a phone number. The message went through Linq\'s iMessage API to a webhook on our laptop behind a Cloudflare tunnel. The bridge worked out which shape was meant, looked up its planned path, drove the servos and a MuJoCo mirror at the same time, and texted back.'],
      steps: [
        { h: 'A text arrives', p: ['Through Linq\'s iMessage API and a Cloudflare tunnel to the bridge on our laptop, which checks the signature and drops repeats.'], view: { to: 3 } },
        { h: 'Rules first', p: ['Help words get the shape list; "straight line" or "home" sends every joint back to zero. Nothing else runs for those.'], view: { to: 4 } },
        { h: 'MiniLM, then maybe GPT-4o-mini', p: ['MiniLM picks a label on the laptop in a few milliseconds. Only when it is unsure does GPT-4o-mini get a turn, and it can only pick from the same list or answer "none".'], view: { to: 5 } },
        { h: 'Only the library reaches the motors', p: ['A label looks up one planned path in the shape library: its moves, sides, silhouette and torque. Nothing else can reach the motors.'], view: { to: 7 } },
        { h: 'Fold and reply', p: ['The same plan drives the servo bus and a MuJoCo mirror, and the bridge texts back what it is doing, or what went wrong.'], view: { to: 9 } },
      ] },
    { type: 'prose', id: 'language', media: [
      { v: 'sim-fold-mujoco.mp4', c: 'MuJoCo replaying a fold after a text, from our demo video' },
      { i: 'imessage-to-mujoco.webp', c: 'Earlier, on the 27-cube chain: the bot\'s replies on the left, the MuJoCo joint panel on the right' },
    ], p: [
      { h: 'The language path' },
      { ol: [
        '**Rules first.** Help words get the shape list; "straight line" or "home" sends every joint back to zero. Nothing else runs for those.',
        '**MiniLM.** A frozen all-MiniLM-L6-v2 sentence encoder, quantized to int8 and committed to the repo (23 MB), plus TF-IDF word and character n-grams, feed one softmax head over 121 shape labels and an explicit "none" class trained on chitchat. "Show the judges some love" has no word in common with "heart" and is carried by the transformer; "d9" against "d6" is a spelling difference the transformer barely sees and the n-grams catch.',
        '**A fallback onto the same labels.** If MiniLM is unsure, GPT-4o-mini picks from the playable label list only, or answers "none" and the bot asks again. It cannot invent a fold, and it cannot fold a random glyph to fill silence.',
      ] },
      'The head is a linear softmax fitted in numpy on a 7,578-line corpus written for the robot\'s own vocabulary, with class-balanced weights so the demo shapes do not win just because they have more rows. Retraining it takes about two minutes on a laptop CPU; nothing in it wants a GPU.',
      { problem: 'Quantizing the encoder to int8 moved its embeddings a long way: a mean cosine of 0.958 against the float model when I measured it. A head fitted on float embeddings and served int8 ones would be quietly miscalibrated.', title: 'Int8 moves the embeddings' },
      { fix: 'Fit the head on the int8 embeddings, the same bytes that serve it. The drift is mostly a consistent transformation and a linear head absorbs it: held-out top-1 accuracy stayed at 93.4% either way, and the model went from 90 MB to 23 MB.' },
      { problem: 'Early on, when neither model could tell what someone meant, the bridge still folded something: a plus, a heart, a first letter. In front of judges, a wrong fold takes half a minute to undo.', title: 'Folding filler' },
      { fix: 'The bridge now asks again instead of inventing a shape, and a first letter is only folded when someone asks for a letter or names a person.' },
      { h: 'What it texted back' },
      'Replies from our test runs:',
      { quote: 'Folding into a square. 4 moves, about 8s. (deciphered using local MiniLM)' },
      { quote: 'Going back to a straight line (home).' },
      { quote: 'I worked out the checkmark fold but couldn\'t start it. Tell my operator.' },
      'The last one is the failure path doing its job: the fold was planned but could not start, and the sender got a plain answer instead of silence. When the USB adapter was unplugged, the same plan played in MuJoCo and the reply said the physical robot was not plugged in.',
    ] },

    { type: 'prose', id: 'code', h: 'The code', p: [
      `The code is public: [github.com/AydanLing/Hack-The-North](${REPO}).`,
      { table: { head: ['Folder', 'What it is'], rows: [
        ['`cubot-v2/`', 'The offline planner: lattice kinematics, roll threading, the fold search, CAD sweep and torque checks, shape discovery and export'],
        ['`cubot-v2/handoff-17/`', 'The 17-cube fold library the bridge plays: one `path.json` per shape with every move, side and check'],
        ['`cubot_urdf/n17/`', 'URDF and MuJoCo scene of the 17-cube chain'],
        ['`imessage/`', 'The Linq webhook bridge, the intent model and its training, the GPT fallback, the reply captions, the servo executor and the MuJoCo replay'],
      ] } },
      'My part, as the history shows it: `imessage/` (the bridge, the classifier and its corpus, the fallback, the hardware executor, the MuJoCo replay with the real servo timing), the planner\'s holding-load gate and stricter profile, the path-quality audit, and building the 17-cube library the booth played.',
      'Three things in it I would point an engineer at. The kinematics are integer lookups: 24 cube orientations, a table of where each joint state sends the next cube, and an independent floating-point check of the same thing. The fold search checks edges lazily, as above. And the bridge treats a text as data from start to finish: the only thing that can leave the language layer is one label from a fixed list.',
    ] },

    { type: 'scrolly', id: 'servos', module: 'flow', webgl: false, width: 'wide', side: 'left', length: '140vh', data: servo,
      h: 'Driving the servos',
      p: ['Every servo shares one serial bus on a CH343 USB adapter. The executor soft-zeros the chain lying straight, so a session starts from a known pose. If the chain is still bent from an earlier fold, it drives every joint home first. Then, for each planned move, it sends one joint to its target, polls the bus until it arrives, and re-drives any joint that has sagged.'] },
    { type: 'split', id: 'wiring', items: [
      { media: { i: 'bus-harness.webp', c: 'A connector with four leads soldered and heat-shrunk; every wire in the chain runs inside the modules' },
        h: 'Eight hours of soldering', p: [
          'All of the wiring runs inside the modules, so there was nowhere to hide a loose harness. I spent 8 hours soldering USB-C breakout boards for the motor controller drivers.',
        ] },
      { media: { v: 'sim-hardware-parity.mp4', c: 'The MuJoCo mirror on the laptop and the real chain behind it, folding the same plan' },
        h: 'The same plan, twice', p: [
          'Our MuJoCo replay plays any exported path with the real servo numbers: the 10.6 N·m stall as the force limit, and wall-clock pacing at about 65% of the commanded servo speed, which is how fast the chain really moved under load. The URDF is the first 17 modules of the 27-module design, with a free base and a floor, and in moves re-orient the base so standing shapes actually stand.',
          'Judges could watch every fold in the viewer, even when the bus was dark.',
        ] },
    ] },

    { type: 'iterations', id: 'build', h: 'Build and test, in order', items: [
      { label: 'Night 1', title: 'Soldering and a first stack', p: ['Soldering first, then a short stack of modules standing on a table in the middle of the night.'],
        media: [{ i: 'first-module-stack.webp', c: 'One of us testing the first short stack of modules at night' }] },
      { label: 'Day 1', title: 'Planner, text bridge, 27-cube library', p: ['The planner and the first demo paths landed early. I added the iMessage bridge and the classifier by midday and the GPT fallback after. By evening the 27-cube library had 135 planned folds and I had retrained the classifier on it.'],
        media: [{ i: 'module-halves-open.webp', c: 'Printed module parts on the build table' }, { i: 'chain-assembly.webp', c: 'Assembling modules into the chain' }, { i: 'chain-scale-person.webp', c: 'The chain next to one of us, for scale' }] },
      { label: 'Night 2', title: 'Bring-up and skipped steps', p: ['First runs on the floor: the base end lifts and flips, bends travel down the chain, and some steps skip. I had wired the executor to the bus with a MuJoCo mirror, so every fold on the floor also played on screen.'],
        media: [{ v: 'first-multijoint-test.mp4', c: 'An early multi-joint run on the floor' }, { i: 'mujoco-3am.webp', c: 'The chain in MuJoCo on the laptop at 3 AM' }] },
      { label: 'Day 2', title: '27 cubes become 17', p: ['At about 5 AM the gears were skipping with too many modules, so we cut the chain to 17 and I moved the bridge onto a 17-cube library, then kept adding shapes to it: h, t and n came from my own sketches. Full folds on the floor:'],
        media: [{ v: 'fold-topdown-start.mp4', c: 'From above: the straight chain starting to fold, one joint at a time' }, { v: 'fold-topdown-apple.mp4', c: 'The same fold finished: an apple' }, { v: 'fold-3d-coil.mp4', c: 'A fold that goes fully 3D: a loop lifts off the floor' }] },
      { label: 'Booth', title: 'In front of a crowd', p: ['A heart for a crowd, letters, and folds that stand up on the table.'],
        media: [{ v: 'booth-heart.mp4', c: 'At the booth: the heart forming in front of a crowd' }, { i: 'booth-flat-fold.webp', c: 'A flat fold on the booth table while visitors film it' }, { i: 'booth-sim-on-laptop.webp', c: 'Adjusting the chain on the table; the laptop shows it folded into h, t and n' }] },
    ] },

    { type: 'prose', id: 'results', h: 'Results', p: [
      { ul: [
        'Top 30 of 1,000+ hackers at Hack the North 2026, after 36 hours.',
        'A text-to-motion loop that ran at a public booth: a local language model, planned and checked folds, every servo on one bus, a live simulation mirror, and plain-English replies, including honest ones when something failed.',
        '88 playable shapes on the 17-cube chain, each one a planned path the robot and the simulator replay the same way.',
      ] },
    ] },
    { type: 'media', layout: 'grid', cols: 3, items: [
      { i: 'team-with-chain.webp', c: 'The four of us with the straight chain; the laptop shows it folded into h, t and n' },
      { i: 'still-booth-heart.webp', c: 'The finished heart at the booth' },
      { i: 'still-frame-with-can.webp', c: 'A can on top of the frame fold' },
    ] },

    { type: 'prose', id: 'next', h: 'What I would do next time', p: [
      { next: 'Much more robust modules, so the full 27 can be chained without the gears skipping.' },
      { next: 'A better way to generate paths and shapes than drawing thousands of candidates and searching each one.' },
      'Otherwise, it worked the way we imagined it.',
      'The limits we already know: the roll word, the odd length, the tethered wire end and one-cube-deep occupancy reject most drawings. Morph is not an unlimited shape printer.',
    ] },

    { type: 'media', id: 'later', h: 'After the hackathon', p: ['Later work, not part of what we showed at Hack the North: the chain crawling along a track in MuJoCo.'], layout: 'wide', items: [
      { v: 'later-crawl-mujoco.mp4', c: 'After the hackathon: the chain crawling along a track in MuJoCo, sped up 12 times' },
    ] },
  ],
};
