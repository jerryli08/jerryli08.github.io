// Cardboard Racing Simulator (2020). Archive page, light on purpose (Jerry's checklist: "it
// shouldn't be too serious because I only have two videos for this project. One is of me driving
// it, and one is of my friend driving").
// There is no CAD (checklist: "CAD (N/A)"), so there is no 3D and no stand-in geometry. Jerry,
// Sept 26: projects without CAD are scroll-based, and scrolling advances a slideshow of the real
// media. The `two-days` scrolly (reel.js) steps through both versions: stills from the two clips,
// and the day-two clip scrubbed by the scroll.
// Faces: which driver is Jerry and which is his friend is still open (phase A questions.md 1), so
// no face is shown anywhere. The day-one clip shows a clear profile and is not on the page; its
// still is cropped in the slideshow to the wheel, the desk and the monitors. The day-two clip and
// its full-frame still show part of a profile at the right edge, so they only appear cropped
// (x <= 82 % of the frame; checked on every quarter second of the clip). Neither clip is in the
// hero and the full-frame stills are not used as figures.
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
      { v: '0', l: 'Real racing-wheel parts' },
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
    ] },

    { type: 'scrolly', id: 'two-days', module: 'reel', webgl: false, width: 'full', stepHeight: '90vh', poster: 'still-wheel-mount.webp',
      h: 'Two days, two versions',
      p: ['The two clips are a day apart, and the simulator changed between them. Scroll through both days, then in on the second version\'s wheel and pedals.'],
      caption: 'Stills and footage from my two clips, cropped to the simulator. The day-two footage follows your scroll.',
      steps: [
        { h: 'Day one', p: [
          'The first wheel was a piece of cardboard on a taped hub, fixed through a **slanted cardboard stand** that sat in the driver\'s lap. The race is on the left monitor.',
        ], view: { short: 'Day one', shots: [
          { i: 'still-handheld-wheel.webp', size: [1600, 900], crop: [0, 0.12, 0.715, 0.88], zoom: [1, 1.03], focus: [0.8, 0.7], c: 'Day one: the wheel on its slanted stand, the race on the left monitor' },
          { i: 'still-handheld-wheel.webp', size: [1600, 900], crop: [0.39, 0.5, 0.325, 0.5], zoom: [1, 1.05], focus: [0.6, 0.45], until: 1, c: 'Closer: a cardboard wheel on a taped hub, through the slanted stand' },
        ] } },
        { h: 'Day two', p: [
          'A day later the wheel was wrapped in **black duct tape** and moved up onto a cardboard stand on the desk, right in front of the keyboard. **Cardboard pedals** went on the floor, and a bundle of alligator clips in four colors ran between them and the desk. The clip follows your scroll.',
        ], view: { short: 'Day two', shots: [
          { v: 'hero-wheel-and-pedals.mp4', from: 0, to: 11.9, size: [406, 720], crop: [0, 0, 0.82, 1],
            stills: [{ i: 'hero-wheel-and-pedals.jpg', at: 0 }, { i: 'still-full-setup.webp', at: 6 }],
            c: 'Day two: the taped wheel on its stand, the pedals under the desk' },
        ] } },
        { h: 'The wheel', p: [
          'Up close, the second wheel is cardboard under black duct tape, held on a cardboard stand. The alligator clips gather at a small board on the desk beside it, one lead per contact.',
        ], view: { short: 'Wheel', shots: [
          { i: 'still-wheel-mount.webp', size: [800, 700], zoom: [1, 1.08], focus: [0.72, 0.4], c: 'The taped wheel on its stand, and the clips on the desk' },
        ] } },
        { h: 'The pedals', p: [
          'Down on the floor, a cardboard pedal sits under the driver\'s foot, with the leads running down to it from the desk. Cardboard, tape and a clip: that is the whole pedal.',
        ], view: { short: 'Pedals', shots: [
          { i: 'still-pedals.webp', size: [760, 760], zoom: [1, 1.08], focus: [0.36, 0.5], c: 'A cardboard pedal, clipped in' },
        ] } },
      ],
      data: { aria: 'The cardboard racing simulator on two days a day apart: the first wheel on a stand in the lap, then the taped wheel on the desk with pedals' } },
  ],
};
