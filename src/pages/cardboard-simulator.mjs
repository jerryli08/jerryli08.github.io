// Cardboard Racing Simulator (2020). Archive page, light on purpose (Jerry's checklist: "it
// shouldn't be too serious because I only have two videos for this project. One is of me driving
// it, and one is of my friend driving").
// There is no CAD (checklist: "CAD (N/A)"), so there is no 3D and no stand-in geometry. Jerry,
// Sept 27: a scroll slideshow of separate pictures is awkward, so the two versions are normal
// pictures: a still from the day-one clip and the day-two clip, both cropped to the simulator.
// Faces: which driver is Jerry and which is his friend is still open (phase A questions.md 1), so
// no face is shown anywhere. The day-one clip shows a clear profile, so only a still cropped to
// x <= 66 % of the frame is on the page (day-one-wheel.webp). The day-two clip shows part of a
// profile at the right edge, so only a copy cropped to x <= 80 % is on the page (day-two-setup.mp4;
// checked on frames every half second). The uncropped clips and stills were removed from the site.
// Calculation: the Makey Makey's pull-up (its maker's figure) and USB's 5 V, as the current a
// contact carries.
// Copy uses only projects.mjs (age 11; cardboard, duct tape, conductive tape, alligator clips, a
// Makey Makey keyboard emulator), the checklist, and what the clips plainly show. The capture
// dates (Jan 28 and 29, 2020) give "a day apart"; the month is not on the page until Jerry picks
// between the files and projects.mjs (questions.md 2).
// Held back pending Jerry (questions.md): why the second version changed (3), where the tape
// touches, which keys and which board is the Makey Makey, and whether the steering was only left
// or right (4), what he would do differently (5), and the name of the game (6).
export default {
  summary: {
    stats: [
      { v: '11', l: 'My age when I built it' },
      { v: '2 versions', l: 'Filmed a day apart' },
      { v: '1 Makey Makey', l: 'A board that shows up as a keyboard' },
    ],
    text: [
      'When I was 11, I built a racing simulator out of cardboard. The wheel and the pedals are **cardboard, duct tape and conductive tape**, wired with alligator clips to a **Makey Makey**, a small board that plugs in over USB and shows up as a keyboard. To the racing game on the screen, my cardboard wheel was just someone pressing keys.',
      'I have two videos of it, filmed a day apart, and they caught two versions: a bare cardboard wheel on a stand in the driver\'s lap, then a taped wheel on the desk with pedals on the floor. One is me driving, the other is a friend.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { i: 'still-wheel-mount.webp', c: 'The second version: a duct-taped cardboard wheel on a cardboard stand, with alligator clips running to the board on the desk' },
      { i: 'still-pedals.webp', c: 'A cardboard pedal on the floor, with the clip leads running down to it from the desk' },
    ],
  },
  sections: [
    { type: 'prose', id: 'how', h: 'How cardboard types on a keyboard', p: [
      'A Makey Makey plugs into a computer over USB, and the computer sees a keyboard. Each input on the board stands for a key: close the circuit on that input and the board types the key.',
      'So the whole simulator is contacts. Conductive tape on the cardboard makes them, and alligator clips carry each one back to an input on the Makey Makey. Turn the wheel or press a pedal, a circuit closes, and the game sees a key press, the same as if someone hit the key on the keyboard sitting right behind the wheel.',
      { calc: 'How much current runs through the cardboard?',
        given: [
          ['Supply', '5 V', '[USB power](https://en.wikipedia.org/wiki/USB_hardware#Power)'],
          ['Pull-up resistor on each Makey Makey input', '10 to 50 MΩ', '[Eric Rosenbaum, one of its makers, on Hackaday](https://hackaday.com/2012/05/25/review-and-a-build-makey-makey-a-banana-piano-and-mario/)'],
        ],
        work: [
          'Open contact: the pull-up holds the input at 5 V, no key',
          'Closed contact: tape and clips are metal, so the input is pulled down to about 0 V: key pressed',
          'Current when closed: at most 5 V / 10 MΩ = 0.5 µA',
        ],
        result: 'Every key press on the wheel and pedals is half a microamp or less: two strips of tape touching is a clean switch, and nothing on the cardboard carries anything you could feel.',
        note: 'Worst case with the smallest pull-up; rounded.' },
    ] },

    { type: 'prose', id: 'two-days', h: 'Two days, two versions', p: [
      'The two clips are a day apart, and the simulator changed between them. On day one the wheel was a piece of cardboard on a taped hub, fixed through a **slanted cardboard stand** that sat in the driver\'s lap. The race is on the left monitor.',
      'A day later the wheel was wrapped in **black duct tape** and moved up onto a cardboard stand on the desk, right in front of the keyboard. **Cardboard pedals** went on the floor, and a bundle of alligator clips in four colors ran between them and the desk. Up close (the two pictures at the top of the page), the clips gather at a small board on the desk beside the wheel, one lead per contact, and a pedal is cardboard, tape and a clip, nothing more.',
    ], media: [
      { i: 'day-one-wheel.webp', c: 'Day one: the cardboard wheel on its slanted stand in the driver\'s lap, the race on the left monitor (cropped to the simulator)' },
      { v: 'day-two-setup.mp4', c: 'Day two: the taped wheel on its stand on the desk, the clip leads running down to the pedals under it (cropped to the simulator)' },
    ] },
  ],
};
