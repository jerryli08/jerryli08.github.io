// Golden Retriever: rich page. Copy uses only what Jerry has stated (facts.md, projects.mjs and his
// answers of Sept 26, 2026), what the footage plainly shows, what the public repo
// (github.com/jerryli08/corgi-hackathon) contains, and numbers measured from his CAD (said so where used).
// "We" everywhere except the soldering, which Jerry did.
// Held back (see the phase A folder): the ACT training step count (the submission video says 20,000,
// the checkpoint in the repo is step 15,000 of a 50,000-step run), where the depth planner's code lives,
// whether the item rode in the clear bin on the way back, and the take that ends with the bottle on the floor.
// Every animation is a scrolly driven by the scroll (Sept 26 direction): the fetch, the drive, the
// lift and the arm, each on the rigged CAD (assets/js/pages/golden-retriever/).
const M = '/assets/models/golden-retriever';
const REPO = 'https://github.com/jerryli08/corgi-hackathon';

export default {
  summary: {
    stats: [
      { v: '2nd', l: 'of 250+ teams, 1,500+ hackers' },
      { v: '10.5 h', l: 'Build time, team of four' },
      { v: '40', l: 'Demonstrations to train the grasp' },
      { v: '3', l: 'Webcams, one laptop running everything' },
    ],
    text: [
      'Golden Retriever is a fetch robot for people with limited leg mobility. You text it what you need; it drives to the shelf on depth estimated from a single webcam, finds the item with a second one, picks it up with an SO-101 arm running a policy we trained on 40 of our own demonstrations, and brings it back.',
      'Four of us built it overnight in 10.5 hours at the Corgi hackathon in San Francisco. At judging the whole loop ran end to end, and we took 2nd of 250+ teams. Below: one errand on our CAD as you scroll, the drive, the lift and the arm moving about their real axes, how each stage works, and what did not work well.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-2-drives-to-shelf.mp4', c: 'Drive: heading across the room to the shelf' },
      { v: 'hero-3-act-grasp.mp4', c: 'Grasp: the learned policy reaches out and closes on the bottle' },
    ],
  },
  sections: [
    {
      type: 'scrolly', id: 'fetch', module: 'fetch', stepHeight: '95vh', poster: `${M}/poster-fetch.webp`,
      h: 'Text it, and it goes and gets it',
      p: ['One errand on our CAD, as you scroll. A text asks for the pill bottle, one of three things on the shelf, and the robot drives there, finds it, raises its arm, grabs it and brings it back. The replies in the thread are the lines our robot sent at the hackathon, word for word from our code, and the robot is our CAD: the wheels, the winch, the carriage and all six arm joints turn about the axes in that CAD.'],
      steps: [
        { h: '1. Ask', p: ['A text over iMessage, or the same chat on our web page, names the item. Claude works out which item you mean, and the robot confirms right away: "Okay. Going to get the pill bottle now."'] },
        { h: '2. Drive on depth from one webcam', p: [
          'The drive camera feeds a monocular depth model: no depth sensor, just one image and a network that estimates how far away everything is. The robot marks floor cells as free or blocked and plans a path through the free ones, and the laptop on the robot drew exactly that: a floor grid over the camera image, green where the floor is clear, red where it is not, and the path on top.',
          'Ask what it is doing on the way and it answers in the same thread: "Still working on the pill bottle. Looking for the pill bottle."',
        ] },
        { h: '3. Find it with the side camera', p: ['A second webcam, low on the side and angled up at the shelf, runs HSV colour detection, so the item is found by its colour. It watches while the robot drives along the shelf, and it looks the same way the arm reaches, so the robot parks with the item right beside the arm.'] },
        { h: '4. Lift the arm to the shelf', p: ['A servo at the top of the mast winds the winch line in, and the carriage carries the whole arm up its rails to the item\'s height, 112 mm for every turn of the winch pulley.'] },
        { h: '5. Grab it with a learned policy', p: ['The SO-101 runs an ACT policy (Action Chunking with Transformers) that we trained on about 40 teleoperated demonstrations. Its only view is a third webcam on the claw. At each step it predicts a chunk of upcoming motion, 100 joint targets, instead of a single command.', 'The dots ahead of the gripper sketch that idea; they are not recorded policy output.'] },
        { h: '6. Bring it back', p: ['It drives back and says so in the thread: "Here\'s the pill bottle." If it cannot find the item it says that too, instead of failing silently: "I couldn\'t find the pill bottle. Is it somewhere else?"'] },
      ],
      caption: 'A simulation on our CAD, not a recording. The room, the three items and their shelf heights are props for this page. The path comes from A* on a map of the room, where the real robot built its grid from the depth camera as it drove, and the arm plays fixed keyframes, where the real grasp came from the learned policy.',
    },
    {
      type: 'split', id: 'problem', h: 'The problem',
      items: [{
        media: { i: 'pitch-deck-make-it-feel-human.webp', c: 'A slide from the hackathon brief, under the Corgi, Merge and Photon logos: build something personal, not generic' },
        p: [
          'Our pitch opened with a number: 15 million people worldwide live with a spinal cord injury. Water, a phone, pills: things most people grab without thinking can mean waiting for someone else to be in the room.',
          'Golden Retriever lets the person ask by text instead, in the Messages app they already use. We wrote its replies like a person talking, not a machine log: "Okay. Going to get the water bottle." and then "Here\'s the water bottle."',
        ],
      }],
    },
    {
      type: 'prose', id: 'robot', h: 'The robot',
      p: [
        { h: 'Frame' },
        'A box frame of goBILDA low-side U-channel and goRAIL, 349 by 384 mm, with the top deck about 73 cm off the floor. The deck carries the laptop and a clear bin. One corner post is a 1,008 mm channel that runs on above the deck as the mast for the lift.',
        { h: 'Arm placement' },
        'The SO-101 faces sideways, not forward. The robot drives up alongside the shelf and parks with the item beside it, the arm reaches out to the side, and the detection camera looks the same way.',
        { h: 'Three webcams, one laptop' },
        'All three cameras are Logitech C920 webcams, and each has one job. One looks where the robot drives and feeds the depth model. One sits low on the side, angled up, and finds the item. One rides on the SO-101\'s claw, and it is the only camera the grasp policy sees. Everything ran on the one laptop on the top deck: the cameras, the depth model, detection, the policy and the messaging. The cameras and the laptop are not in the CAD.',
        { table: {
          head: ['From the CAD', 'Value'],
          rows: [
            ['Footprint (frame)', '349 x 384 mm'],
            ['Deck height / mast top', 'about 0.73 m / 1.02 m'],
            ['Track (driven wheels) / wheelbase', '397 mm / 322 mm'],
            ['Wheel travel per turn (72 mm wheel)', '226 mm'],
            ['Lift rails / carriage travel', '2 x 600 mm MGN9 / about 56 cm'],
            ['Arm height above the floor (grid plate)', '0.17 to 0.73 m'],
            ['Winch pulley', '112 mm of line per turn (17.8 mm radius)'],
          ],
          caption: 'Measured from our CAD.',
        } },
      ],
      media: [
        { i: 'build-frame-bin-arm.webp', c: '9:44 pm: frame done, clear bin on the top deck, arm on the side' },
        { i: 'still-overhead-at-shelf.webp', c: 'Parked alongside the shelf with the bottle beside the arm' },
      ],
    },
    {
      type: 'scrolly', id: 'drive', module: 'drive', width: 'wide', stepHeight: '90vh', poster: `${M}/poster-drive.webp`,
      h: 'Drive: servos, not motors',
      p: ['Our CAD on a floor grid that slides under it as you scroll. The two driven wheels are lit orange, and the yellow line is the path it is on at that moment.'],
      steps: [
        { h: 'Two servos, two wheels', p: ['Two Axon MAX MK2 servos drive two 72 mm Rhino wheels directly, through 25T low-profile servo hubs, with no gearbox in between. The other two wheels run free on 8 mm REX shafts in flanged bearings. The driven wheels sit 397 mm apart and the axles 322 mm apart.'] },
        { h: 'No motor driver', p: [
          'We used the Axon MAX servos because we had them, and because a servo needs no external motor driver: an Arduino Mega 2560 Pro sends each one a standard PWM pulse (1,500 µs is stop, 1,000 and 2,000 µs are full speed each way) and the electronics inside the servo do the rest. With one night to build, that was a driver board and its wiring we did not need. I did all of the soldering.',
          'The drive code in our repo caps the pulse at 300 µs either side of stop, out of the 500 the servos accept, so the robot moves deliberately next to a person. Here both sides get that 1,800 µs, and it drives straight.',
        ] },
        { h: 'Steering by speed', p: ['It steers by running the two sides at different speeds. Slow the arm side to 1,650 µs and the robot curves toward it; the readout gives the radius of that curve from the 397 mm track.'] },
        { h: 'Turning in place', p: ['Run the two sides in opposite directions and it turns in place. The free wheels are on fixed axles, so a turn drags them sideways a little.'] },
      ],
      caption: 'Wheel speed is taken as proportional to the pulse\'s offset from 1,500 µs, and the floor moves at an illustrative pace: the robot\'s real top speed is not known. The wheels turn about their axles in the CAD by the distance each side rolls.',
    },
    {
      type: 'scrolly', id: 'lift', module: 'lift', stepHeight: '90vh', poster: `${M}/poster-lift.webp`,
      h: 'The lift: a winch on the mast',
      p: ['The carriage runs on its rails in our CAD as you scroll, the winch pulley turns by the line it winds, and the line shortens with it.'],
      steps: [
        { h: 'A carriage on two rails', p: ['The arm does not sit on the frame. It stands on a 136 by 232 mm grid plate on a carriage with two MGN9H blocks riding two 600 mm MGN9 rails on the side of the frame.'] },
        { h: 'A winch at the top', p: ['A continuous-rotation servo at the top of the mast winds a 1 mm synthetic line onto a hub-mount winch pulley with a 112 mm circumference, so one turn of the pulley moves the arm 112 mm.'] },
        { h: 'Paying out line to let it down', p: ['The line runs only from the top: the winch pulls the carriage up and pays out line to let it down. In the CAD the carriage has about 56 cm of travel, and the grid plate the arm stands on goes from 0.17 to 0.73 m above the floor.'] },
        { h: 'Five turns for the full stroke', p: [
          { problem: 'The lift worked, but slowly. The winch drum is small: a 112 mm circumference is a 17.8 mm radius (from the CAD), so a full 56 cm stroke is five turns of the servo. And that one servo carries the whole SO-101 and the carriage on a single line, which is a heavy load for it and slows it down further.', title: 'The lift was slow' },
        ] },
      ],
      caption: 'The carriage stops where its blocks reach the ends of the rails in the CAD. The servo\'s real speed is not known, so the lift moves with your scroll, not in real time.',
    },
    {
      type: 'media', id: 'build', layout: 'row', h: 'Built in one night',
      items: [
        { v: 'drive-base-first-test.mp4', c: 'First drive test, with the battery and wiring still on the floor on long leads' },
        { i: 'still-mast-rail-carriage.webp', c: 'The lift: the mast, the winch line and pulley at the top, and the arm on its grid-plate carriage, with a webcam beside the arm base' },
        { v: 'grasp-wide-mast.mp4', c: 'The whole side of the robot while the arm holds the bottle' },
      ],
    },
    {
      type: 'scrolly', id: 'arm', module: 'arm', width: 'wide', side: 'right', stepHeight: '85vh', poster: `${M}/poster-arm.webp`,
      h: 'Six joints on the SO-101',
      p: ['Our CAD\'s arm, joint by joint as you scroll. Orange lines are the joint axes; the readout follows each angle.'],
      steps: [
        { h: 'One solid, seven links', p: ['The arm is one solid in the CAD export. For this page it was split into its seven printed links, and each joint turns about the axis of its servo horn, checked against the STEP file. All six joints at zero is the pose in the CAD: folded, with the jaw wide open.'] },
        { h: 'Shoulder pan and lift', p: ['The shoulder pan turns the whole arm about a vertical axis; the shoulder lift stands the upper arm up. The arm faces sideways, out of the side of the robot, toward the shelf.'] },
        { h: 'Elbow and wrist flex', p: ['The elbow brings the forearm level and out over the shelf, and the wrist flex tips the gripper up and down at the end of it.'] },
        { h: 'Wrist roll and gripper', p: ['In these poses the wrist roll turns the jaws so they close sideways around a standing bottle, and the gripper is the sixth joint: one moving jaw against a fixed one.'] },
        { h: 'Carry', p: ['The carry pose on this page tucks the arm in, clear of the mast. On the real robot, fixed keyframes took over after the grip every time; only the grip itself was learned (see [the grasp](#grasp)).'] },
      ],
      caption: 'Our CAD with the screws, nuts and the servo board left out. The poses here are for the page; on the robot the policy chose the reach.',
    },
    {
      type: 'split', id: 'asking', h: 'Asking for things',
      items: [{
        media: { v: 'hero-1-text-request.mp4', c: 'Text: asking for the pill bottle in our web app' },
        p: [
          'Requests come in as text. An iMessage reaches the robot through Photon, one of the hackathon\'s sponsor APIs, and our web page ("Text me what you need") posts to the same handler. The text then goes through Merge Gateway, the other sponsor API, to Claude, which works out which item you want.',
          'The robot keeps you posted in the same thread:',
          { ul: [
            '"Okay. Going to get the pill bottle now." when it starts',
            '"Still working on the pill bottle. Looking for the pill bottle." if you ask what it is doing mid-task',
            '"Here\'s the water bottle." when it delivers',
            '"I couldn\'t find the pill bottle. Is it somewhere else?" when it can\'t find it',
          ] },
          'The page also has a **Walk with me** panel with Forward, Back, Left and Right buttons. The idea behind it was a walker that senses your pace and assists you, the way a pedal-assist e-bike does. We ran out of time to build it.',
        ],
      }, {
        media: { i: 'still-chat-cant-find.webp', c: 'When it can\'t find the item, it asks instead of failing silently' },
        p: ['The last reply is not hypothetical. In one of our takes the robot came back with "I couldn\'t find the pill bottle. Is it somewhere else?", and we asked again.'],
      }],
    },
    {
      type: 'prose', id: 'depth', h: 'Getting there: depth from one webcam',
      p: [
        'Navigation runs on one ordinary webcam. A monocular depth model estimates how far away everything in its view is, and the planner works on the floor in front of the robot.',
        'The laptop on the top deck shows what the planner sees, in a window titled "Depth + SegFormer Safe Path" with four panels: the floor and path camera with a grid of floor cells drawn over it (free cells green, blocked cells red, the chosen path on top), a depth clearance map, a floor mask, and the target camera. A status line under the grid shows the left and right servo commands, and the header shows the current drive command, like FORWARD.',
      ],
      media: [
        { v: 'drive-with-depth-view.mp4', c: 'From our submission video: the drive, with the laptop view inset' },
        { v: 'perception-ui-finds-bottle.mp4', c: 'The live view on the robot\'s laptop. Top right, the target camera reads NO BOTTLE, then finds the bottle' },
      ],
    },
    {
      type: 'prose', id: 'find', h: 'Finding the item: the side camera',
      p: [
        'The second webcam sits low on the side of the robot, angled up at the shelf, and watches while the robot drives. It runs HSV colour detection: each frame is converted from RGB to hue, saturation and value, pixels inside a calibrated band for the item\'s colour become a mask, and the biggest blob in the mask is the item. Hue separates colour from brightness, which makes it more tolerant of uneven light than thresholding RGB directly. The pill bottle is bright amber on a black shelf, close to the easiest case for colour.',
        'The target camera panel reads NO BOTTLE until the bottle comes into view, then BOTTLE with a distance and a pixel offset from the image centre: 49 cm and x -261 px in the frame beside this.',
      ],
      media: [
        { i: 'still-perception-ui.webp', c: 'The target camera panel (top right) has found the bottle: BOTTLE 49cm x:-261px' },
      ],
      side: 'left',
    },
    {
      type: 'prose', id: 'grasp', h: 'Grabbing it: ACT on an SO-101',
      p: [
        'The grasp is learned, not scripted. We recorded about 40 demonstrations by teleoperation: a teammate moved a leader SO-101 by hand over the shelf, the follower arm on the robot copied it, and every frame stored the claw camera image and the six joint positions, 30 times a second. Our recording plan ended each demonstration as soon as the jaws were firmly closed, so the policy only learns the hard part: see the bottle, reach, grip. The dataset in our repo is 40 episodes and 10,282 frames, about 8.6 seconds per demonstration.',
        'We trained ACT (Action Chunking with Transformers) on it. The policy gets one 640 by 480 image from the claw camera plus the six joint angles, encodes the image with a ResNet-18, and a transformer outputs the next 100 joint targets at once, 3.3 seconds of motion at 30 Hz. Committing to a chunk instead of one command per frame means small errors get fewer chances to compound, which is why a few dozen demonstrations can be enough.',
        { problem: 'A learned policy can do anything its network outputs, and after the grip the arm is holding the bottle.', label: 'Risk', title: 'An unpredictable arm next to a person' },
        { fix: 'Only the grip is learned. Our run script trusts the policy until it sees a grip: the policy is commanding the jaws shut but the measured jaw stalls more than 3 units short of the command for 8 frames in a row. Then fixed keyframes take over with the gripper pinned shut, so the retract is the same every time.' },
        { problem: ['The grasp depends on the light. It was reliable in good lighting, but during the demo it worked just barely half the time. The claw camera is the policy\'s only view of the world, so whatever the room\'s lighting does to that image, the policy has to cope with. Our training config also had image augmentation (random brightness and contrast) switched off, so it only ever saw the light it was recorded in.'], title: 'Half the grasps at the demo' },
        { next: 'Put an LED at the end of the arm, next to the claw camera, so the policy sees the bottle lit the same way in any room.' },
      ],
      media: [
        { v: 'teleop-demonstrations.mp4', c: 'Recording demonstrations with the leader arm over the shelf' },
        { v: 'grasp-close-up.mp4', c: 'The policy running: reach and grasp' },
        { i: 'still-grasp-closed.webp', c: 'Jaws closed on the pill bottle' },
      ],
    },
    {
      type: 'prose', id: 'code', h: 'The code',
      p: [
        `Our code is public: [github.com/jerryli08/corgi-hackathon](${REPO}). The robot runs one Python server (FastAPI) on its laptop, plus an Arduino sketch for the drive. The main pieces:`,
        { ul: [
          '`robot/messaging.py`: iMessage in and out through Photon, behind an outbox that rate-limits and de-duplicates texts.',
          '`robot/brain.py`: free text in, one typed intent out (fetch, come, walk, stop, status, help or chat). A fast Claude model answers first through Merge Gateway; a stronger one gets a turn only when the fast one is less than 65% sure, and a keyword router is the fallback when the network fails.',
          '`robot/concierge.py`: the seam between the phone and the robot. Every sentence the robot sends is a constant in this one file, so its voice stays consistent.',
          '`robot/skills.py`: an errand as a state machine (search, approach, grasp, stow, return, present), one skill at a time, reporting each phase on an event bus that the web page and the texts listen to.',
          '`robot/drive.py` and `firmware/drivebase/drivebase.ino`: velocity commands in, servo pulses out.',
          '`datasets/` and `scripts/run_grasp_policy.py`: the 40 demonstrations, the trained ACT policy and the script that runs it on the arm.',
        ] },
        { problem: 'The drive is open loop: no encoders. If the laptop stalls in the middle of a command, the servos keep turning at the last pulse they were sent.', label: 'Risk', title: 'A stalled laptop keeps the wheels turning' },
        { fix: 'Two watchdogs. Every velocity command carries a duration, and the host stops the wheels itself if the next one is late. The Arduino has its own: if no command arrives for 1.5 s, it stops both servos, which covers the host program dying outright.' },
        { problem: 'The language model is the least trustworthy part of the system, and missing a "stop" from someone who needs the robot to stop is the worst failure it can have.', label: 'Risk', title: 'A model that misses "stop"' },
        { fix: 'The keyword router runs on every message even when Claude answered. If the keywords hear stop or help and the model did not, the keywords win, and the override is logged.' },
        { problem: 'One errand passes through a dozen phases. Texting each one would bury the person in messages.', label: 'Risk', title: 'Nine texts about one water bottle' },
        { fix: 'Only a handful of milestones can send a text (delivered, needs help, could not find it), each keyed on the errand and phase so it can never send twice, with a minimum gap between routine texts and a daily cap on top. A normal errand is two texts: "Okay. Going to get the pill bottle now." and "Here\'s the pill bottle."' },
        { note: 'The depth planner that drew the floor grid on the laptop is not in this repository. The repo\'s skills module has a simpler camera-only approach instead: turn until the item is in view, then take one short step per camera frame until the item sits at a calibrated spot in the image, and play a fixed grasp from there.' },
      ],
      media: [
        { i: 'overnight-laptop.webp', c: '3:20 am: code on the laptop, with a webcam hanging off its cable' },
        { i: 'still-web-app-request.webp', c: 'Our web app right after the request: "Okay. Going to get the pill bottle now."' },
      ],
    },
    {
      type: 'iterations', id: 'night', h: 'The night, by the photo timestamps',
      items: [
        { label: '8:35 pm', title: 'The frame goes together on the floor', p: ['About an hour after kickoff at 7:24 pm, the channel frame is being bolted up.'], media: [{ i: 'build-frame-assembly.webp', c: '8:35 pm: assembling the frame' }] },
        { label: 'Later that night', title: 'First drive test', p: ['The base drives with the battery and a board still on the floor on long leads.'], media: [{ i: 'still-bare-drive-base.webp', c: 'The bare drive base during its first test, battery and board on the floor' }] },
        { label: '3:10 am', title: 'Recording demonstrations', p: ['Grasp demonstrations for the ACT policy, recorded with the leader arm over the shelf.'], media: [{ i: 'teleop-leader-arm.webp', c: '3:10 am: recording demonstrations with the leader arm' }] },
        { label: '3:20 to 6 am', title: 'Everything at once', p: ['Frame, drive, lift, arm, three cameras, the planner, the policy and the messaging all had to work together, and overnight there were a lot of moving variables. We got it done, and filmed takes for the submission video until about 6 am.'], media: [{ i: 'still-robot-beside-shelf.webp', c: 'One of the takes: beside the shelf, with the planner view on the laptop' }] },
        { label: 'Morning', title: '2nd place', p: ['At judging the whole loop ran end to end. Golden Retriever took 2nd of 250+ teams (1,500+ hackers).'], media: [{ v: 'award-second-place.mp4', c: 'The announcement at the awards' }] },
      ],
    },
    {
      type: 'callout', id: 'result', h: 'Result',
      p: [
        '2nd place of 250+ teams (1,500+ hackers) at the Corgi hackathon in San Francisco, after 10.5 hours of building. At judging the whole loop worked end to end: text it, it drives to the shelf, finds the item, grasps it and brings it back. The lift worked, slowly, and the grasp was the weak link in the demo lighting.',
        'Team: Tarun Malarvasan, Ryker Kollmyer, Andrew Wang and me.',
      ],
    },
    {
      type: 'prose', id: 'next', h: 'What I would build next',
      p: [
        { next: ['Light the claw camera with an LED at the end of the arm (see [the grasp](#grasp)), so the one camera the policy sees gives it the same picture in any room.', 'Build Walk with me: a walker that senses your pace and assists you like a pedal-assist e-bike. It was part of the idea from the start, and the one piece we ran out of time for.'] },
      ],
    },
  ],
  assets: [M],
};
