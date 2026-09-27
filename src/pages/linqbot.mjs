// LinqBot: rich page. Copy uses only what Jerry has stated (projects.mjs, his checklist and answers),
// what the footage plainly shows, what the public repo github.com/amzoeee/soma-hackathon contains
// (quoted constants are from its code), and numbers measured on his CAD of the SO-101 (said so where used).
// "We" throughout: nothing yet says which parts were Jerry's own.
// Held back until Jerry answers (see /home/claude/work/linqbot/questions.md): teammates' names and
// who built what; what was ready before the hackathon versus built during it (so nothing here says
// "built in 6.5 hours"); whether the handoff ran as one loop at judging; how the top-down
// autonomous takes were driven; which text agent came first; how the gripper "FAILED" was handled
// on the day; what was done with the CAD the day before; any placement. Also left out: the phase A
// "[draft next]" items, the team selfie, the third-party Instagram reel, IMG_8898/8899/8904.
const M = '/assets/models/linqbot';
const REPO = 'https://github.com/amzoeee/soma-hackathon';

export default {
  summary: {
    stats: [
      { v: '3', l: 'Ways to drive one arm' },
      { v: '6.5 h', l: 'Hackathon, team of five' },
      { v: '21', l: 'Hand landmarks per frame, from a 4-bit grey camera' },
      { v: '4', l: 'Tools the text planner may call' },
    ],
    text: [
      'LinqBot is an SO-101 robot arm you can run three ways: on its own, with your hand through the camera on a pair of Xreal One Pro AR glasses, or by texting it over iMessage, where a language model turns the text into robot moves.',
      'The idea: autonomous robots stall on the odd case, like a can that is not where it should be, and a person somewhere else should be able to take over by hand or by text, then hand control back. We built it at the YC Startup School hackathon at Soma Capital, and all three modes ran on the real arm on the day. Below: drive our arm with your own hand, text it, and see where each mode broke and what we did about it.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-autonomous-pick.mp4', c: 'On its own: reach, grab, carry' },
      { v: 'hero-hand-control.mp4', c: 'By hand: the arm follows the operator wearing the AR glasses' },
      { v: 'hero-text-retry.mp4', c: 'By text: "Move forward 0.2 meters and close claw"' },
    ],
  },
  sections: [
    {
      type: 'demo', id: 'try', module: 'hand-teleop', height: 'clamp(460px, 72vh, 680px)', poster: `${M}/poster-teleop.webp`,
      h: 'Drive the arm with your hand',
      p: [
        'Press **Start camera** and your webcam stands in for the camera on the glasses. Open hand moves the gripper, a pinch closes the claw, and a fist is the clutch: it freezes the arm so you can move your hand back to a comfortable spot and carry on without the arm jumping. Try to pick up the can. No camera, or on a phone? Drag in the pad instead.',
        'Everything after the camera is our robot code, ported to the browser: the same hand tracker settings, the same filters and dead bands, the same fist clutch with its debounce, the same workspace box, and the same 5 degree limit on each joint per step. The camera is only asked for when you press the button, and the video never leaves your browser.',
      ],
      caption: 'A simulation on our CAD of the SO-101, not a recording; the table and the can are props. The glasses’ camera looked out from the operator’s head toward the arm, while a webcam looks back at you, so left, right and reach are mirrored here to feel natural. The hand tracker (MediaPipe, about 8 MB) loads only after you press Start camera.',
    },
    {
      type: 'prose', id: 'idea', h: 'The idea: a person on call for the odd case',
      p: [
        'Robots on a line run on their own until something odd happens: a part in the wrong place, a missed grasp, an object they do not expect. Today the fix is a person standing next to each robot. We wanted that person somewhere else, looking after many robots and only stepping in when one gets stuck.',
        'So the loop we set out to build is: the robot works on its own; when a step fails it stops and asks for help; a person takes over with their own hand through AR glasses, finishes the job, and hands control back. The three pieces that loop needs each ran on the arm at the hackathon. Wiring them into one automatic loop is still on our repo’s to-do list, so below it is an animation, not footage.',
      ],
    },
    {
      type: 'demo', id: 'vision', module: 'takeover-vision', height: 'clamp(460px, 70vh, 640px)', poster: `${M}/poster-vision.webp`,
      h: 'The plan, animated: autonomy fails, a human takes over',
      p: ['Press play. The arm starts a pick on its own, misses because the can is not where the plan expected, and pings an operator in the glasses. The operator takes over by hand, finishes the grasp, makes a fist to hand control back, and the robot finishes the job. The mode names across the top are the control modes in our repo’s product plan.'],
      caption: 'An animation on our CAD, not footage. The plan and the replies in the chat are illustrative.',
    },
    {
      type: 'split', id: 'autonomous', h: 'Mode 1: on its own',
      items: [{
        media: [
          { i: 'still-autonomous-grasp.webp', c: 'From above: the jaw closes on the can' },
          { v: 'autonomous-pick-second-take.mp4', c: 'Another take, another can (1.5x speed)' },
        ],
        p: ['The arm unfolds, reaches, closes on the can, swings it out of the way, lets go and folds back. We filmed these takes from above; two of them became the GIFs in our repo’s README.'],
      }],
    },
    {
      type: 'split', id: 'miss', h: 'The failure that makes the case',
      items: [{
        media: [
          { v: 'autonomous-miss-knocks-can.mp4', c: 'The same motion with the can off to the side: the jaw knocks it over (1.5x speed)' },
          { i: 'still-can-knocked-over.webp', c: 'The miss, frozen: the can on its side' },
        ],
        p: [
          { problem: 'Our autonomous motion is open loop: nothing in it looks at the can. With the can a few centimetres off to the side, the arm reaches for where the can should be and the jaw knocks it over.', title: 'Autonomy does not see the can' },
          { fix: 'That miss is the moment LinqBot is for. Instead of making one motion smarter, the failure goes to a person: text the arm a correction, or put on the glasses and do the grasp by hand.' },
          { next: 'Close the loop: detect the failed grasp automatically and page the operator. Our repo’s to-do list has exactly that ("Failure escalation to remote AR hand-tracking recovery"), plus a control-mode arbiter so only one controller can command the arm at a time.' },
        ],
      }],
    },
    {
      type: 'demo', id: 'paths', module: 'pipeline', webgl: false, height: '360px',
      h: 'Three ways in, one arm',
      p: ['Every mode ends in the same place: a target for the gripper, clamped into a safe box in front of the arm, turned into joint angles by inverse kinematics, and sent to the SO-101’s servos. Tap a box to see what that stage does in our code.'],
    },
    {
      type: 'prose', id: 'hardware', h: 'The hardware',
      p: [
        { ul: [
          '**Arm.** The open-source SO-101 follower arm from TheRobotStudio and Hugging Face’s LeRobot: six Feetech STS3215 serial bus servos for shoulder pan, shoulder lift, elbow, wrist flex, wrist roll and the gripper. The arm is not our design; our work is how it is controlled.',
          '**Glasses.** Xreal One Pro with the Eye: a small camera on the glasses that faces out, so it sees the operator’s hands. The glasses double as a second screen for our status overlay.',
          '**A laptop** drives both the glasses’ camera and the arm over USB, as a single host.',
        ] },
      ],
    },
    {
      type: 'demo', id: 'arm', module: 'arm-explorer', height: 'clamp(420px, 64vh, 600px)', poster: `${M}/poster-explorer.webp`,
      h: 'The arm, joint by joint',
      p: [
        'Our CAD of the SO-101, with each link turning about the axis of the servo it rides on. Move the joints, show the axes, or switch to **Workspace**: the box our text mode clamps targets into, drawn over a cloud of every point the tool point can reach.',
        'The box is a rectangle and the arm’s reach is not. On this model the four far corners of the box are out of reach by more than 2 cm, which is the same kind of failure as the "0.4 meters" text further down.',
      ],
      caption: 'Our CAD with the screws and the servo driver board hidden. Each joint turns about its servo’s axis, checked against the STEP file; carried into our repo’s URDF frame, the tool point lands within a millimetre of the URDF’s gripper frame.',
    },
    {
      type: 'media', layout: 'row',
      items: [
        { i: 'photo-workbench.webp', c: 'Around 4 pm: the SO-101 at the edge of the table, a camera on a tripod beside it, laptops everywhere' },
        { i: 'still-operator-in-glasses.webp', c: 'The operator in the Xreal glasses; the camera on them tracks his hand' },
      ],
    },
    {
      type: 'prose', id: 'hand', h: 'Mode 2: with your hand, through AR glasses',
      p: [
        'The operator wears the glasses, looks at the arm and moves a hand. The pipeline, at up to 30 frames a second:',
        { ol: [
          '**Camera.** Read a frame from the Eye camera on the glasses.',
          '**Clean it up.** Bilateral denoise, a gamma curve, local contrast (CLAHE), an unsharp mask, and a 2.5x upscale.',
          '**Track the hand.** One MediaPipe gesture recognizer finds 21 landmarks on the hand and labels a closed fist, in the same pass.',
          '**Map it.** Hand left and right, up and down move the gripper left and right, up and down. Hand size stands in for distance: bring the hand closer to the camera and it looks bigger. Pinching thumb and index closes the gripper, in proportion to the pinch.',
          '**Clutch.** A fist freezes the arm. Move your hand back to a comfortable spot, open it, and the arm carries on from where it stopped, with no jump: the motion is always measured from where the hand was when it opened.',
          '**Solve.** Inverse kinematics (ikpy on the arm’s URDF) turns the gripper target into shoulder, elbow and wrist angles, starting each solve from the arm’s real angles so the answer stays continuous. If a solve misses by more than 3 cm, the arm keeps the last good answer.',
          '**Limit and send.** No joint may move more than 5 degrees per step, and a joint that trails its command by more than 3 degrees for 10 frames is flagged as stalled. The status panel (clutch, hand found, gesture, frame rate, gripper target) shows on the glasses.',
        ] },
      ],
    },
    {
      type: 'media', layout: 'row',
      items: [
        { v: 'hand-control-eye-feed.mp4', poster: 'still-eye-feed-on-laptop.webp', c: 'The laptop shows what the glasses see, a grey image with the operator’s hand in it, while the arm on the box moves with the hand' },
        { v: 'hand-tracking-not-responding.mp4', c: '"Why is nothing changed?" Hand up, arm still: debugging the tracking on the grey feed' },
      ],
    },
    {
      type: 'prose', id: 'hand-problems', h: 'What broke, and what we changed',
      p: [
        { problem: 'The Eye camera does not show up as a camera at all. Its video comes over a virtual network link the glasses set up over USB-C, as a raw TCP stream, and only while the glasses are in Spatial Anchor mode, which switches itself off every time the glasses restart. With it off, the connection opens but no frames ever arrive.', title: 'The glasses’ camera is not a webcam' },
        { fix: [
          'We read the stream directly, building on a community toolkit for this reverse-engineered stream. Each 193,862-byte packet holds a 512 x 378 image at byte offset 0x140, 4 bits per pixel in the high half of each byte, which we scale back up to 0 to 255.',
          'Our reader waits for a real first frame and fails loudly ("Spatial Anchor is probably OFF") instead of hanging, the start-up retries ten times, and the reader reconnects on its own if the stream goes quiet for 4 seconds. A plain webcam path lets the rest of the pipeline run without the glasses.',
        ] },
      ],
    },
    {
      type: 'media', layout: 'row',
      items: [
        { i: `${M}/eye-raw.webp`, c: 'A raw frame from the Eye camera, saved in our repo: 512 x 378, 16 shades of grey' },
        { i: `${M}/eye-enhanced.webp`, c: 'The same frame through our clean-up step (run with the repo’s own function, without the upscale)' },
      ],
    },
    {
      type: 'prose',
      p: [
        { problem: 'MediaPipe’s hand models are trained on colour webcam images. On a dim, noisy 4-bit grey frame they barely register a hand, and the skeleton flickered and jumped around the frame.', title: 'The hand tracker could barely see the hand' },
        { fix: [
          'Four changes, all in the code. The clean-up chain above, tuned on the real feed. Detection thresholds lowered to 0.15. Hands smaller than 4% of the frame (wrist to middle knuckle) thrown out as false detections, and the last good hand held for up to 24 frames through dropouts.',
          'And one gesture recognizer in video mode, which keeps track of the hand from frame to frame, instead of a landmark model and a gesture model each re-detecting from scratch every frame. Our code notes that change as the fix for the flickering skeleton.',
        ] },
        { problem: 'The fist clutch kept switching on when the operator pinched or half-opened his hand, freezing the arm mid-move, and it flickered on and off.', title: 'The clutch fired on its own' },
        { fix: 'Hysteresis and a debounce. A fist only counts when the model labels it a closed fist with at least 0.60 confidence (a finger-curl check alone was too eager), and it lets go as soon as the hand is clearly open again (0.35). On top of that, 18 fist frames in a row to engage the clutch and 6 open frames to release it.' },
        { problem: 'Wrist roll, read from the angle across the knuckles, was the noisiest signal on the grey feed; landmark jitter alone was enough to twitch the wrist servo.', title: 'Twitching wrist' },
        { fix: 'First the heaviest filtering of any signal: slow smoothing, a 4 degree dead zone and a limit of 3 degrees per frame. In the final settings we locked the wrist roll. Position and pinch carry the task, and the roll stays fixed.' },
        { problem: 'One camera cannot measure distance. Our stand-in, the size of the hand in the image, is the noisiest of the three position axes.', title: 'Depth from one camera is rough' },
        { fix: 'It gets the heaviest smoothing (a filter weight of 0.08 against 0.15 for the other axes) and a wider dead band (0.010 against 0.006), so a still hand gives a still arm.' },
        { next: 'Put the robot’s view in the glasses. Today the operator looks at the arm itself; for a robot somewhere else, our product plan streams the robot’s camera to the glasses.' },
      ],
    },
    {
      type: 'prose', id: 'text', h: 'Mode 3: text it over iMessage',
      p: [
        'Linq, one of the hackathon’s sponsors, connects an iMessage conversation to a server: every text to the robot arrives at ours as a webhook.',
        { ol: [
          '**Receive.** A small FastAPI server gets the message from Linq’s webhook and checks its signature (HMAC, rejected if older than five minutes), so only Linq\u2019s signed messages get through.',
          '**Plan, once.** One call to a language model (Runware’s GPT-5.6 Luna) turns the whole message into an ordered list of robot tool calls. It may use four tools: move the gripper by an x, y, z offset, tilt or roll the wrist, open or close the gripper, and hold still. "Move right 0.2 meters and open claw" becomes two calls. A direction with no distance means 0.2 m.',
          '**Execute in order.** Each call runs to completion before the next; the first failure stops the rest.',
          '**Reply.** The text back is built from the tool results, not written by the model, so the operator reads exactly what the arm did: every step with [OK] or [FAILED], and the distance asked for next to the distance the arm moved.',
        ] },
        'Keeping the model in the planner’s seat and out of the replies is one of the lessons in our README: a reply cannot claim something the arm did not do.',
      ],
    },
    {
      type: 'media', layout: 'row',
      items: [
        { v: 'text-first-command.mp4', c: 'A text command: type, send, and the arm moves' },
        { i: 'still-laptop-replies.webp', c: 'Replies on a laptop: a move that was clamped, then a gripper step that failed and stopped the sequence' },
      ],
    },
    {
      type: 'demo', id: 'text-it', module: 'text-the-arm', height: 'clamp(480px, 74vh, 680px)', poster: `${M}/poster-text.webp`,
      h: 'Text the arm',
      p: [
        'Tap the messages we sent on the day, in order, or type your own. The arm starts low by the table, swung to its right, like the arm in our footage. "0.4 meters" fails and nothing moves; "0.2 meters" works; then grasp, lift, carry and let go.',
        'The **Gripper check** switch is the one change you can make to our rules: as built, a gripper step only counts if the jaw ends within 1% of fully closed, so closing on a can reports FAILED and stops the sequence, exactly as in our footage further down.',
      ],
      caption: 'A simulation on our CAD. A phrase parser stands in for the language model; the tool rules, clamps, IK check and reply wording are our code’s. Here "applied" is worked out from the commanded target, while on the robot it was measured from the servos.',
    },
    {
      type: 'prose', id: 'rails', h: 'Safety rails between the model and the motors',
      p: [
        'A plan can ask for anything; the arm does not have to do it.',
        { ul: [
          'Any single move is capped at 0.5 m, keeping its direction.',
          'The target is clamped into a box in front of the arm: 0.05 to 0.33 m forward, 0.20 m to either side, 0.02 to 0.35 m up.',
          'The inverse kinematics answer is checked with forward kinematics; if the gripper would end up more than 2 cm from the target, the step fails as "target unreachable" instead of moving somewhere else.',
          'Moves ramp over 2 seconds in 40 steps; wrist moves are held to the servo calibration.',
        ] },
        '"Move up 500 meters" came back as requested +500 m, applied +0.0315 m, "(safety/workspace limited)".',
      ],
    },
    {
      type: 'prose', id: 'text-problems', h: 'What broke in the text path',
      p: [
        { problem: 'The text agent’s arm code follows our move-to-target test script, and that script described its axes the wrong way round: it said x was left and right and y was reach. Following it, "forward" travels sideways.', title: '"Forward" went sideways' },
        { fix: 'We measured the axes on the loaded arm model instead: with every joint at zero the gripper sits at (0.391, 0, 0.227) m, straight out along +x, and the shoulder pan swings it along y. So +x is forward and +y is left. Texts use +x right, +y forward, +z up, and one function converts between the two.' },
        { problem: 'When the IK solver cannot reach a target, it quietly hands back its previous answer. The arm then does not move, and the reply would still say OK.', title: 'A silent "success"' },
        { fix: 'Every solution is checked with forward kinematics before the motors move. If the gripper would land more than 2 cm from the target, the step fails loudly and the result records the closest point the arm could reach.' },
        { problem: 'The arm’s folded rest pose sits outside the box. Clamping all three axes on every move would drag the gripper 4 cm backwards on a plain "move up".', title: '"Up" pulled the arm backwards' },
        { fix: 'Clamp only the axes a command actually moves.' },
        { problem: '"Move forward 0.4 meters and close claw" came back: "Robot sequence stopped at step 1 of 2; 0 actions were completed: [FAILED] Cartesian IK failed: target unreachable."', title: '"0.4 meters" was out of reach' },
        'The forward move is clamped to the front of the box, 0.33 m. But the box is a rectangle and the arm’s reach is not, and from where the arm was, the solver could not get the gripper within 2 cm of that point. The step failed and, because it failed, the gripper step after it never ran. That is the rule doing its job: nothing moved that should not have.',
        { fix: 'Ask for less. "Move forward 0.2 meters and close claw" worked.' },
        { problem: ['A gripper step only counts as OK if the jaw ends within 1% of fully open or fully closed, read right after its one-second ramp. On the day, a close came back "[FAILED] Gripper command failed ... \'goal\': 0.0, \'measured\': 66.16, \'moved\': True" and stopped the rest of the sequence. The next message in the thread was "Hold". In our carry clip below, the reply just above the next command is another of these FAILED closes (measured 68.52), and the can is in the jaws.'], title: 'A moving jaw reported as a failure' },
        { problem: 'Many replies ended in "(safety/workspace limited)" even for small moves inside the box: "Move down 0.1 meter" came back as applied -0.115 m. The applied distance is measured from the servos after the move and compared with the request to a tenth of a millimetre, so any difference, from the 2 cm IK tolerance or from the servos, trips the flag.', title: 'Replies said "limited" when nothing was limited' },
      ],
    },
    {
      type: 'media', layout: 'row',
      items: [
        { i: 'still-unreachable-then-retry.webp', c: '0.4 m: "target unreachable", nothing moves. Then the retry with 0.2 m' },
        { i: 'still-gripper-failed-reply.webp', c: 'The jaw moved from 98.62 to 66.16 (100 is open) but had not reached closed, so the step failed' },
        { i: 'still-limited-reply.webp', c: 'Asked for 0.1 m down, moved 0.115 m: "limited"' },
        { i: `${M}/imessage-clamps.webp`, c: 'From our repo: "Move up 500 meters" moved the gripper 3 cm; "Wrist tilt 90 degrees" stopped at the calibration limit' },
      ],
    },
    {
      type: 'media', id: 'text-grasp', layout: 'grid', cols: 3, h: 'Grasp, lift, carry, let go: all by text',
      items: [
        { v: 'text-close-claw-on-can.mp4', c: 'By text: the jaws close around the can' },
        { i: 'still-can-in-the-air.webp', c: 'The can in the jaws, by text' },
        { v: 'text-carry-and-release.mp4', c: 'By text: the arm carries the can and lets go' },
      ],
    },
    {
      type: 'iterations', id: 'day', h: 'The day',
      items: [
        { label: '10:45 am', title: 'Kickoff', p: ['Hacking ran until 5:15 pm. The submission was a recorded demo of at most two minutes and a public GitHub repo.'], media: [{ i: 'photo-rules-slide.webp', c: 'The kickoff slide: "Hackathon Sprint (ends at 5:15)"' }] },
        { label: 'Afternoon', title: 'Each mode on the real arm', p: ['The arm followed a hand seen by the glasses’ camera ("It’s working"), we filmed the top-down autonomous takes, and a text command moved the arm.'], media: [] },
        { label: 'Late afternoon', title: 'Debugging the hand tracking, then the text session', p: ['The hand tracking stopped responding on the grey feed and came back. The text session turned up the out-of-reach "0.4 meters", the "limited" replies and the gripper check, and included the arm grasping, lifting, carrying and letting go of a can by text.'], media: [] },
      ],
    },
    {
      type: 'prose', id: 'results', h: 'Results',
      p: [
        { ul: [
          'All three modes ran on the real arm: autonomous pick and place (two clean takes and one miss on camera), hand control through the glasses, and a grasp, lift, carry and release driven entirely by text.',
          'The safety rails held: an out-of-reach request failed without moving the arm, and "Move up 500 meters" moved it 3 cm.',
          'The automatic handoff between the modes, the loop animated above, is on our repo’s to-do list.',
        ] },
      ],
    },
    {
      type: 'prose', id: 'next', h: 'What comes next',
      p: [
        'From our repo’s to-do list:',
        { next: 'Automatic failure escalation into AR hand-tracking recovery, and a control-mode arbiter so only one controller (the planner, autonomy or a person) can command the arm at a time.' },
        { next: 'A human approval step before any robot motion: the operator sees the exact plan, tool by tool, and approves or rejects it by text; nothing moves before that.' },
        { next: 'Higher-level autonomy tools (navigate, find, pick, drop) and a mobile base, for an end-to-end factory demo, plus automated tests.' },
      ],
    },
    {
      type: 'prose', id: 'code', h: 'The code',
      p: [
        `All of it is public: [github.com/amzoeee/soma-hackathon](${REPO}) (Python).`,
        { ul: [
          '`agent/`: the text path. The FastAPI webhook for Linq, the single planning call, the four robot tools, the SO-101 adapter (calibration, IK, clamps, ramps) and the replies built from results. It also holds a second version of the text agent built on LangGraph (understand with Claude, validate, execute, respond), which runs in dry-run mode.',
          '`robot/`: the AR path. The Eye camera reader, the image clean-up, MediaPipe hand and gesture tracking, the relative mapping with the fist clutch, ikpy IK on the SO-101 URDF, the per-step joint limit and stall check, and the glasses overlay.',
          '`vendor/`: the [community Eye camera stream toolkit](https://github.com/Aloim/Grayscale-Feed-Xreal-One-Pro-Eye-Windows-Nebula-Beta-needed-) we built on, and an earlier hand-to-arm prototype.',
          '`docs/`: build briefs and the product plan for the handoff loop.',
        ] },
        { note: 'Stack: Python, FastAPI, Linq, Runware (GPT-5.6 Luna), LangGraph, MediaPipe, OpenCV, ikpy, LeRobot, Feetech STS3215 servos, Xreal One Pro and Eye, LocalTunnel.' },
      ],
    },
  ],
  assets: ['/assets/models/linqbot/'],
};
