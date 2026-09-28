// Autonomous Drone Racing: rich page. Base text from the phase A write-up
// (the phase A writeup.md for this project), tightened, and checked against Jerry’s checklist,
// facts.md and answers.md. Code facts come from the team's line-following flight script (the repo is
// read-only here; it is never linked or named on the page), numbers marked "from the CAD" from his
// CAD. The org line stays as src/projects.mjs has it.
// Every demo is scroll-driven (Jerry, Sept 26): the flight, the CAD tour, the software path and the
// vision steps all move only with the scroll.
// Held back until Jerry answers (see the phase A questions.md): which race clip is our winning run,
// how the drone handled the hoops, what caused the late-July runs that climbed into the cage net
// (left out: the drone in those clips is not clearly ours either), whether the repo's script is the
// version that raced, who wrote or designed which parts, and every "next time" item.
// Worked calculations (Sept 27): inputs are the script's constants, the Camera Module 3 product brief
// and the assumptions already named in the flight's caption (1.0 m height, full 66° lens).
const M = '/assets/models/autonomous-drone-racing';
const CAM3 = 'https://datasheets.raspberrypi.com/camera/camera-module-3-product-brief.pdf';

export default {
  summary: {
    stats: [
      { v: '1st', l: 'of 5 teams in the race' },
      { v: '52 s', l: 'Winning run, under half the second-best team’s time' },
      { v: 'Only team', l: 'to take off autonomously and finish the whole course in one run' },
      { v: '5', l: 'Person team, which I led' },
      { v: '5.3%', l: 'Acceptance rate, MIT Beaver Works Summer Institute (BWSI)' },
    ],
    text: [
      'This was the capstone of the Autonomous Air Vehicle Racing course at the MIT Beaver Works Summer Institute (BWSI), which has a 5.3% acceptance rate.',
      'I led a team of five writing the software for an autonomous drone race: a Holybro X500 quadcopter has to follow an LED line on the floor, past hoops, with nobody flying it. A downward camera finds the line in every frame with color segmentation and a least-squares line fit on a Raspberry Pi 5, and that becomes velocity commands for the flight controller. A forward camera is for obstacle avoidance: the hoops carry AprilTags.',
      'We won in 52 seconds, less than half the second-best team’s time, and we were the only team to take off autonomously and complete the whole course in one run. Below: our line follower flying a lap as you scroll, the drone from our CAD, and how the code turns a picture of the floor into a velocity command.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-line-following.mp4', c: 'On the LED line in the flight cage' },
      { v: 'hero-cage-lap.mp4', c: 'Along the practice straight toward the first corner' },
    ],
  },
  sections: [
    // ------------------------------------------------------------------ the flight (scroll-driven)
    {
      type: 'scrolly', id: 'flight', module: 'flight', width: 'wide', stepHeight: '85vh', poster: `${M}/poster-flight.webp`,
      h: 'Follow the line',
      p: ['Scroll to fly one lap. The drone runs the vision steps, constants and control law of our line-following script: every control tick it looks at the floor, finds the line again and sends a new velocity command. The inset is what the downward camera sees and what the code does to that picture; the readout is what the code sends.'],
      steps: [
        { h: 'Take off over the line', p: ['The drone starts on the LED line. The script arms it and starts Offboard mode with a slow climb; here it levels off at 1.0 m, the script’s take-off height. The orange box on the floor is the patch the downward camera sees, and it grows as the drone climbs.'] },
        { h: 'What the downward camera sees', p: ['Each time round the loop the script takes one 640 x 360 frame from the downward camera: the inset. The nose is at the bottom of the picture. Up close, the LED rope is a row of separate bright dots.'] },
        { h: 'Dots into one bar', p: ['Dilate 30 x 30, erode 20 x 20, then keep only pixels from 250 to 255 in all three channels. The dots merge into one solid bar: the mask in the inset.'] },
        { h: 'A line, and a point to chase', p: ['`cv2.fitLine` puts a straight line through the bar (green), and the script takes the point 100 px ahead along it (orange). That point’s offset from the image centre and the line’s angle become the forward, sideways and yaw-rate commands in the readout. One command, then the loop sleeps 0.5 s while the flight controller flies it.'] },
        { h: 'A hoop ahead', p: ['The forward camera, its view in blue, is for obstacle avoidance: the hoops carry AprilTags. What the drone does here is an illustrative stand-in, not our obstacle code: once it has seen the tags it adds a sideways push until it is past the hoop, and then the line pulls it back.'] },
        { h: 'Round the bends', p: ['Chasing a point ahead of the drone, not the nearest point, is what turns it into each bend before it gets there: the yaw rate follows the curves. The same law that centres it on the line also pushes it along, because on a straight the target is always ahead. The second hoop gets the same stand-in.'] },
        { h: 'A reflection on the floor', p: ['A round reflection comes into view, bright enough to pass the threshold, so the mask has two blobs. The script keeps the one with the longest side, the rope, and ignores the other. Then the drone is back over the start: one lap, with the line found in every frame.'] },
      ],
      caption: 'A simulation on our CAD, not a recording: a JavaScript port of our script flies the lap ahead of time, and the scroll picks the moment. From our script: the image processing, the gains and limits, the 0.5 s between commands and landing after 10 frames with no line. Assumed for the page: the drone holds 1.0 m (the script’s take-off height), the flight controller follows each command with a 0.3 s lag, and the camera has the 66° lens of a standard Camera Module 3. The course, the LED rope, the hoops, the reflection and the climb are drawn for the page, and the hoop reaction is an illustrative stand-in, not our obstacle code. Some steps cover more of the flight than others; that changes time only, and the readout is what the code sent at that moment.',
    },

    // ------------------------------------------------------------------ the race
    {
      type: 'prose', id: 'race', h: 'The race',
      p: [
        'The course was an LED rope laid on the dark floor of a large hall, in a loop with S-bends, and the drone had to follow it on its own. Along the course stood obstacles: hoops with AprilTags on them. Five teams raced.',
      ],
    },
    {
      type: 'media', layout: 'row', items: [
        { v: 'race-hall-run.mp4', c: 'The race hall: the LED loop and the hoop frames with their AprilTag boards' },
        { v: 'race-hoop-apriltags.mp4', c: 'A race hoop with AprilTags around its rim, above the LED line' },
      ],
    },
    {
      type: 'callout', id: 'result', h: '52 seconds, first of five',
      p: ['We won the race in 52 seconds, less than half the second-best team’s time. We were also the only team to take off autonomously and complete the whole course in one run.'],
    },

    // ------------------------------------------------------------------ the drone
    {
      type: 'scrolly', id: 'drone', module: '@turntable', stepHeight: '85vh', poster: `${M}/poster-drone.webp`,
      h: 'The drone',
      p: ['Our CAD, turned by the scroll, with the parts that make it autonomous lit up one group at a time.'],
      data: { models: [{ src: `${M}/drone.glb` }], azimuth: -32, elevation: 24, pad: 0.9, drift: 10 },
      steps: [
        { h: 'A Holybro X500 V2', view: { azimuth: -32, elevation: 24, pad: 0.88 },
          p: ['A carbon quadcopter with four 2216 880 KV motors, 500 mm apart on the diagonal, turning 10 x 4.5 in props on a 4S LiPo. What makes it autonomous sits on the nose.'] },
        { h: 'The Pi 5 and the forward camera', view: { focus: 'rpi5_rpicam3_mount|raspi_top_cover', azimuth: -62, elevation: 20, pad: 4.2,
            highlight: [{ parts: 'rpi5_rpicam3_mount|raspi_top_cover|Raspberry_Pi_5', color: '#3ddc84', intensity: 0.55 }, { parts: 'Raspberry_Pi_Camera_Module_3_2', color: '#3aa0ff', intensity: 0.9 }],
            labels: [{ text: 'Forward camera', at: [0.2745, -0.006, -0.1115], color: '#7cc4ff', side: 'l' }, { text: 'Raspberry Pi 5, under the printed cover', at: [0.33, 0.006, -0.1115], color: '#3ddc84', minW: 600 }] },
          p: ['A **Raspberry Pi 5** on the front payload plate, with the **forward camera** (a Raspberry Pi Camera Module 3) in the same printed mount, under a printed cover.'] },
        { h: 'Under the nose', view: { focus: 'optical_downwards_picam3_mount|ARK_Flow', azimuth: -48, elevation: -34, pad: 4.6,
            highlight: [{ parts: 'Raspberry_Pi_Camera_Module_3_3', color: '#3aa0ff', intensity: 0.9 }, { parts: 'ARK_Flow', color: '#b18cff', intensity: 0.9 }, { parts: 'optical_downwards_picam3_mount', color: '#ff6b35', intensity: 0.35 }],
            labels: [{ text: 'Downward camera', at: [0.279, -0.051, -0.1115], color: '#7cc4ff', side: 'l' }, { text: 'ARK Flow: optical flow + distance', at: [0.3136, -0.041, -0.1115], color: '#b18cff', minW: 600 }] },
          p: ['A second printed mount holds the **downward camera**, another Camera Module 3, next to an **ARK Flow** board: an optical flow camera and a distance sensor that look at the floor.'] },
        { h: 'Both cameras, 14 cm ahead', view: { azimuth: 180, elevation: 4, pad: 0.95,
            highlight: [{ parts: 'Raspberry_Pi_Camera_Module_3_', color: '#3aa0ff', intensity: 0.9 }],
            labels: [{ text: 'Forward camera', at: [0.2745, -0.006, -0.1115], color: '#7cc4ff' }, { text: 'Downward camera', at: [0.279, -0.051, -0.1115], color: '#7cc4ff' }, { text: 'Centre of the frame', at: [0.418, -0.003, -0.1115], color: '#fff1e2', side: 'l' }] },
          p: ['In the CAD both camera sensors sit on the centreline about 14 cm ahead of the centre of the frame. The forward one looks straight ahead at top-plate height; the downward one looks at the floor from 16 mm under the bottom plate.'] },
        { h: 'Power', view: { azimuth: 38, elevation: 30, pad: 0.92,
            highlight: [{ parts: 'Turnigy_3300mAh|top_battery_mount|PCBA_PM06', color: '#ffb454', intensity: 0.8 }],
            labels: [{ text: '4S LiPo', part: 'Turnigy', color: '#ffb454' }, { text: 'Power module', at: [0.408, -0.022, -0.1115], color: '#ffb454', side: 'l' }] },
          p: ['The 4S LiPo rides on top of the frame in printed mounts, over the power module.'] },
        { h: 'The printed parts', view: { azimuth: -135, elevation: 16, pad: 0.92,
            highlight: [{ parts: 'rpi5_rpicam3_mount|raspi_top_cover|optical_downwards_picam3_mount|top_battery_mount|new_landing_gear_mount', color: '#ff6b35', intensity: 0.6 }],
            labels: [{ text: 'Printed landing gear mount', part: 'new_landing_gear_mount_1', color: '#ff6b35', minW: 600 }, { text: 'Printed cover', part: 'raspi_top_cover', color: '#ff6b35', side: 'l' }] },
          p: ['Everything lit here is 3D printed: the mount and cover on the nose, the mount under it, the battery mounts and the landing gear mounts, which carry the frame low.'] },
      ],
      caption: 'Our CAD with the screws left out.',
    },
    {
      type: 'media', layout: 'grid', cols: 3, items: [
        { i: 'photo-x500-day-one.webp', c: 'Jul 7: the X500 early in the build' },
        { i: 'photo-wiring-flight-controller.webp', c: 'Jul 8: wiring the flight controller stack' },
        { i: 'photo-finished-drone.webp', c: 'Aug 2: the finished drone, the Pi and wiring inside the printed parts' },
      ],
    },

    // ------------------------------------------------------------------ software stack
    {
      type: 'prose', id: 'stack', h: 'The software stack',
      p: [
        'The line follower runs on the Raspberry Pi as one Python program:',
        { table: {
          head: ['Layer', 'What we used'],
          rows: [
            ['Cameras', 'Two Raspberry Pi Camera Module 3s; the downward one is read with the **Picamera2** library at 640 x 360'],
            ['Vision', '**OpenCV** and **NumPy**'],
            ['Control loop', '**Python 3** with **asyncio**'],
            ['Talking to the drone', '**MAVSDK-Python**, which talks over gRPC to `mavsdk_server` (the linux-arm64 build) running on the Pi'],
            ['Link to the flight controller', '**MAVLink** over the Pi’s UART (`/dev/ttyAMA0`, 57,600 baud in the line follower)'],
            ['Flight controller', '**Offboard** mode, taking body-frame velocity and yaw-rate setpoints'],
            ['Camera calibration', 'OpenCV chessboard calibration (below)'],
            ['Prototyping', 'Jupyter notebooks'],
          ],
        } },
      ],
    },
    {
      type: 'scrolly', id: 'stack-figure', module: 'stack', width: 'wide', side: 'right', webgl: false, stepHeight: '70vh',
      steps: [
        { h: 'One frame in', p: ['The downward camera looks at the floor under the nose. `camera.capture_array()` in Picamera2 hands the script a 640 x 360 image each time round the loop.'] },
        { h: 'Find the line', p: ['OpenCV and NumPy dilate, erode and threshold the frame, keep the longest blob and fit a line to it. The next section goes through each step.'] },
        { h: 'PD control', p: ['Pixel and angle errors in; forward, right and yaw-rate commands out, rotated from the camera frame to the drone and clamped.'] },
        { h: 'Over MAVLink', p: ['Our asyncio program sends one body-frame velocity and yaw-rate setpoint, then sleeps 0.5 s. MAVSDK-Python talks over gRPC to `mavsdk_server` (the linux-arm64 build) running on the Pi, which speaks MAVLink to the flight controller over the Pi’s UART.'] },
        { h: 'The flight controller flies it', p: ['The Pi does not fly the drone. The flight controller keeps it stable and holds whatever velocity it is told; our code decides that velocity: go forward this fast, slide right this fast, turn this fast. The flight controller stays in charge of the motors the whole time.'] },
        { h: 'From the side', p: ['The forward camera is for obstacle avoidance: the hoops on the course carry AprilTags. The ARK Flow board under the nose is an optical flow camera and a distance sensor looking at the floor. During test flights, teammates stood by with RC transmitters, ready to take over by hand.'] },
      ],
      caption: 'The path of one command, from a camera frame to the motors.',
    },

    // ------------------------------------------------------------------ vision, step by step
    {
      type: 'scrolly', id: 'pipeline', module: 'pipeline', poster: `${M}/poster-pipeline.webp`,
      h: 'Seeing the line, one step at a time',
      p: ['One downward-camera frame through every step of our script, computed live on this page with the same code as the flight at the top. The frame is drawn for the page: a bend in the rope and a wide round reflection.'],
      steps: [
        { h: 'The raw frame', p: ['The downward camera sees a 640 x 360 patch of floor under the nose. The nose is at the bottom of the picture. Up close, the LED rope is a row of separate bright dots.'] },
        { h: 'Dilate, 30 x 30', p: ['`cv2.dilate` gives every pixel the brightest value in the 30 x 30 square around it. Each bulb grows by 15 px each way, and neighbouring bulbs merge into one bar. The reflection grows too.'] },
        { h: 'Erode, 20 x 20', p: ['`cv2.erode` does the opposite with a 20 x 20 square and takes most of that growth back. The gaps between bulbs stay closed, and the rope is left as one solid bar about 10 px wider than a bulb.'] },
        { h: 'Threshold, 250 to 255', p: ['`cv2.inRange` keeps only pixels that are almost fully saturated in all three channels. The dim glow around the bulbs drops out; the rope and the reflection stay.'] },
        { h: 'Keep the longest blob', p: ['`cv2.findContours` outlines each blob, and the script sorts them by the long side of `cv2.minAreaRect`, the smallest rotated rectangle around each one. It keeps the **longest** blob, not the biggest: here the reflection has more area than the rope, but its long side is 122 px against the rope’s 557.'] },
        { h: 'Fit a line', p: ['`cv2.fitLine` with `DIST_L2` fits a straight line to the kept blob’s outline by least squares on perpendicular distance. It returns a direction and a point on the line, so a line running straight down the picture is no harder than any other.'] },
        { h: 'Look 100 px ahead', p: ['The script turns the direction to point down the picture, toward the nose, and takes the point 100 px ahead along it. The position error is the offset from the image centre to that point. The angle error is the angle between the line and straight down the picture, `atan2(-vx, vy)`.'] },
        { h: 'Velocity and yaw commands', p: ['Proportional-derivative control turns the errors into commands: 0.001 m/s per pixel of error and 0.2 °/s of yaw rate per degree. A fixed rotation takes them from the camera’s axes to the drone’s: forward is image y and right is minus image x. The previous errors here are the same as the current ones, so the derivative terms are zero and the numbers are the proportional terms.'] },
      ],
    },
    {
      type: 'prose', id: 'vision', h: 'What each step is there for',
      p: [
        { problem: 'Up close an LED rope is a row of separate bright dots with dark gaps between them. Thresholded as it is, the rope falls apart into dozens of small blobs, each one or two bulbs long.', title: 'The rope is not a line to a camera' },
        { fix: 'Dilate with a 30 x 30 kernel first, so neighbouring bulbs grow into each other, then erode with a 20 x 20 kernel to take most of the growth back. What is left is one solid bar along the rope.' },
        { problem: 'The rope is not the only bright thing a downward camera can see. A light reflected in the floor is bright too, and it can be bigger than the part of the rope in view.', title: 'Other bright things' },
        { fix: 'Two filters. The threshold keeps only pixels that are almost fully saturated in all three channels, and of the blobs that survive, the script keeps the one with the longest minimum-area rectangle, not the one with the most area. A reflection is round; the rope is long and thin. The flight at the top passes one near the end of its lap.' },
        { problem: ['In my computer vision coursework I fit the line as y = mx + b by least squares on the bright pixels:', { pre: 'm = (mean(x) * mean(y) - mean(x*y)) / (mean(x)^2 - mean(x^2))\nb = mean(y) - m * mean(x)' }, 'That form measures error vertically and needs a finite slope. On our drone the camera is mounted so that forward runs straight down the image, so when the drone is on the line, the line is vertical in the picture: the points barely vary in x, the denominator (minus the variance of x) goes to zero and the slope blows up.'], title: 'y = mx + b cannot follow a line straight ahead' },
        { fix: 'The flight script fits the line with `cv2.fitLine` and `DIST_L2` instead. It minimises the perpendicular distance from the points to the line and returns a unit direction and a point, not a slope, so it works the same at every angle, including straight ahead.' },
      ],
      media: [
        { i: 'photo-drone-on-led-rope.webp', c: 'Jul 30: sitting on the line before a run. Up close, the LED rope is a row of separate bulbs.' },
        { i: 'coursework-regression-grid.webp', c: 'From my coursework notebook: threshold, dilate and a y = mx + b fit (green) on downward-camera frames. Clean frames fit well; a small blob at the edge (downward_13) still gets a confident line, and an empty frame (downward_14) gets none.' },
      ],
    },

    // ------------------------------------------------------------------ steering
    {
      type: 'prose', id: 'steering', h: 'From a line to velocity commands',
      p: [
        'The fitted line becomes three numbers each control tick:',
        '**1. Pick a point to chase.** Turn the line’s direction so it points toward the nose, then take the point 100 px ahead along the line from the fitted point. Chasing a point ahead of the drone, not the nearest point, is what makes it turn into a bend.',
        { calc: 'How far ahead is 100 px?',
          given: [
            ['Camera height over the floor', '1.0 m', 'the script’s take-off height, assumed held (as in the flight above)'],
            ['Camera Module 3 field of view', '66° x 41°', `[Raspberry Pi product brief](${CAM3})`],
            ['Frame', '640 x 360 px', 'our script'],
          ],
          work: [
            'Floor in view: 2 × 1.0 m × tan(66° / 2) = 1.30 m across, and 2 × 1.0 m × tan(41° / 2) = 0.75 m from the nose side to the tail side',
            'Scale: 1.30 m / 640 px = 2.0 mm per pixel (0.75 m / 360 px = 2.1 mm the other way)',
            'Look-ahead: 100 px × 2.0 mm = 0.20 m along the line; the nose edge of the picture is 180 px = 0.37 m from the centre',
            'Dilate 30 x 30: each bulb grows 15 px, 3 cm, each way, so any gap up to 30 px, about 6 cm of rope, closes',
          ],
          result: 'The drone chases a point about 20 cm ahead, a little over half way to the edge of the floor it can see, and the dilation bridges any gap between bulbs shorter than about 6 cm.',
          note: 'Estimate: assumes the full field of view at 640 x 360 and the camera 1.0 m over a flat floor; at other heights every length scales with the height.' },
        '**2. Measure the error.** The pixel offset from the image centre to that point is the position error; the script treats the image centre as the drone’s centre. The angle between the line and the image’s forward axis is the heading error, zero when the line runs straight ahead.',
        '**3. PD control** on both, in the camera’s frame, with the derivatives taken over a fixed 0.1 s:',
        { pre: 'cx = 0.001 * ex + 0.00015 * (ex - ex_prev) / 0.1     # m/s per pixel\ncy = 0.001 * ey + 0.00015 * (ey - ey_prev) / 0.1\nwz = 0.2 * angle + 0.2 * (angle - angle_prev) / 0.1   # deg/s per deg' },
        '**4. Rotate into the drone’s frame and clamp.** The downward camera is turned on the drone: the bottom of the image is the nose and the right of the image is the drone’s left. One fixed rotation maps the commands: forward = cy, right = -cx, yaw rate = wz. Speeds are limited to 0.5 m/s and the turn rate to 90 °/s.',
        { pre: 'R_dc2bd = [[ 0, 1, 0],\n           [-1, 0, 0],\n           [ 0, 0, 1]]     # forward = image y, right = -image x, yaw unchanged' },
        '**5. Send and wait.** The result goes to the flight controller as one body-frame velocity and yaw-rate setpoint with zero vertical speed, so the drone holds its height. Then the loop sleeps 0.5 s, and the flight controller keeps flying that setpoint until the next one arrives.',
        'Because the look-ahead point sits 100 px ahead of the image centre, the same law that centres the drone on the line also pushes it along the line: on a straight the target is always ahead, so the drone keeps moving toward it.',
        'If a frame has no line in it, the script sends nothing new and captures again at once, counting the miss; it is written to land after 10 such frames. The **Frames with no line** row in the flight’s readout counts them.',
      ],
      media: [
        { v: 'corner-turn.mp4', c: 'Taking a 90° corner in the flight cage' },
        { v: 'diagonal-line-tracking.mp4', c: 'Tracking a diagonal leg back toward the camera' },
      ],
    },

    // ------------------------------------------------------------------ obstacles
    {
      type: 'split', id: 'obstacles', h: 'Obstacles: the forward camera and the AprilTags',
      items: [{
        media: { i: 'calibration-chessboards.webp', c: 'Six of the 70 chessboard photos in our calibration set' },
        p: [
          'The forward camera is for obstacle avoidance. The obstacles on the course are hoops with AprilTags on them: square markers whose four corners, seen by a calibrated camera, give the tag’s position and orientation.',
          'Calibration comes first, because a tag’s pixels only turn into metres once the camera’s focal length, optical centre and lens distortion are known. Our calibration script uses a printed chessboard with 7 x 7 inner corners and 25 mm squares, photographed 70 times at different angles. It finds the corners, refines each one to sub-pixel accuracy with `cv2.cornerSubPix`, and solves for the camera matrix and distortion coefficients with `cv2.calibrateCamera`.',
          { note: 'The hoop reaction in the flight at the top of the page is a stand-in to show the idea, not our obstacle code.' },
        ],
      }],
    },

    // ------------------------------------------------------------------ the code
    {
      type: 'prose', id: 'code', h: 'The code, program by program',
      p: [
        'The line follower is one asyncio program. It connects to the flight controller through `mavsdk_server` on the Pi’s UART, arms, starts Offboard mode with a slow-climb velocity setpoint, then loops: capture, detect the line, compute the velocity, send it, sleep 0.5 s. `detect_line()` holds the vision steps above, `get_velocity()` the look-ahead point and errors, and `pid()` the gains and the previous errors.',
        'Two smaller programs in the repo exercise the same path without the camera. An open-loop MAVSDK test takes off, switches to Offboard, flies forward at 1 m/s for 4 s, spins at 90 °/s for 4 s and lands, which checks the command path end to end. A ROS 2 node (rclpy) does the same Offboard handshake through MAVROS: it streams position setpoints, requests OFFBOARD mode and arming through the MAVROS services, and slides the setpoint forward.',
        'An earlier draft of the line follower is in the repo too, with the same structure and `pid()` and `get_velocity()` still empty. Between the draft and the line follower:',
        { table: {
          head: ['', 'Earlier draft', 'Line follower'],
          rows: [
            ['Speed limits', '1.0 m/s in x, y and z', '0.5 m/s'],
            ['Loop', 'one command per second', 'one every 0.5 s'],
            ['No line in a frame', 'land at once', 'keep going; land after 10 frames with no line'],
            ['Serial link', '921,600 baud', '57,600 baud'],
            ['Image', '640 x 380', '640 x 360'],
          ],
        } },
        { calc: 'How far can it fly on one command?',
          given: [
            ['Earlier draft: speed limit, time between commands', '1.0 m/s, 1 s', 'our earlier draft'],
            ['Line follower: speed limit, time between commands', '0.5 m/s, 0.5 s', 'our line-following script'],
            ['Floor seen ahead of the image centre', '0.37 m', 'the look-ahead calculation above'],
          ],
          work: [
            'Draft: 1.0 m/s × 1 s = up to 1.0 m between two looks at the floor',
            'Line follower: 0.5 m/s × 0.5 s = up to 0.25 m',
            'Against the floor in view: 1.0 / 0.37 = 2.7 times it; 0.25 / 0.37 = two thirds of it',
          ],
          result: 'At the draft’s limits one command could carry the drone almost three times past the floor the camera sees ahead of it before the next look; at the line follower’s limits it covers at most two thirds of it.',
          note: 'Upper bounds at the speed limit, ignoring the flight controller’s lag; the camera height is assumed as above.' },
      ],
      media: [
        { i: 'photo-bench-with-transmitter.webp', c: 'Jul 11: on the kit’s tall landing legs beside the flight cage, with a laptop and the RC transmitter' },
      ],
    },

    // ------------------------------------------------------------------ testing timeline
    {
      type: 'iterations', id: 'testing', h: 'From flying by hand to the race',
      items: [
        { label: 'Jul 7 to 11', title: 'Build it, fly it by hand',
          p: ['We assembled the X500 and flew it by hand in the flight cage before any autonomy.'],
          media: [{ v: 'first-manual-hover.mp4', c: 'Flying by hand in the flight cage, early July' }] },
        { label: 'Mid July', title: 'The vision and control groundwork',
          p: ['Coursework in image formation, OpenCV, linear regression on downward-camera frames, coordinate frames and feedback control, all in Jupyter notebooks. The line follower uses the same pieces: thresholding, morphology, a line fit and feedback control.'] },
        { label: 'Late July', title: 'The rebuild',
          p: ['The printed housing went on the nose for the Pi and the forward camera, the downward camera and the ARK Flow board went underneath, and the battery moved on top.'],
          media: [{ i: 'photo-rebuilt-with-housing.webp', c: 'Jul 26: the printed housing on the nose and the battery strapped on top' }, { i: 'photo-rebuilt-top-view.webp', c: 'The same build from above, low on the printed landing gear mounts' }] },
        { label: 'End of July', title: 'A rectangle of LED rope in the cage',
          p: ['An LED rope taped to the cage floor in a rectangle: lift off from the line, follow the straight, take a 90° corner, run the next side past the team tables, and reach the hoop in the far corner.'],
          media: [
            { i: 'photo-led-rope-course.webp', c: 'Jul 29: the practice course, LED rope taped to the cage floor' },
            { i: 'still-cage-hoop.webp', c: 'The ring hoops at the far end of the practice cage' },
            { v: 'liftoff-from-line.mp4', c: 'Lifting off from the line' },
          ] },
        { label: 'Start of August', title: 'A harder layout',
          p: ['The rope was laid again with diagonal legs and a zig-zag, and a gate went up over the line.'],
          media: [
            { i: 'still-new-cage-layout.webp', c: 'The new layout: diagonals and a zig-zag' },
            { v: 'practice-gate.mp4', c: 'A gate over the line in the cage' },
          ] },
        { label: 'Race day', title: '52 seconds, first of five',
          p: ['On the race course in the hall: the fastest run by more than a factor of two, and the only team to take off autonomously and finish the whole course in one run.'],
          media: [{ i: 'still-race-hall-course.webp', c: 'The race course: an LED loop with S-bends and the hoop frames' }] },
      ],
    },
  ],
  assets: ['/assets/models/autonomous-drone-racing/'],
};
