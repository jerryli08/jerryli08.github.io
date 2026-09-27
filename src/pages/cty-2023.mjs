// Breadboard Game Console (CTY, summer 2023). Archive page, short on purpose: Jerry's checklist
// says "So long ago i honestly forgot the details but on a breadboard we made a circuit with LCD
// display and we programmed it to run multiple different games, you had buttons to press that let
// you jump etc". So the footage carries the page; every screen message quoted here is read off the
// LCD in the clips. There is no CAD and no code for it in the folder or on GitHub.
// No CAD, so no 3D: the `console` scrolly (reel.js) is a slideshow of the real media advanced by
// the scroll, with two clips scrubbed by it.
// Names: other players' first names show on the LCD in some clips (phase A questions.md 3). Those
// clips (player-select-vs, win-tally) are not on the page, and every clip used was checked frame by
// frame at its ends: the only name on screen is Jerry's ("Jerry WINS"). No faces: the Run clip has
// hair at its top edge, so the slideshow crops it to the board.
// Held back pending Jerry: who wrote which game and whose the small first board was (1), the cause
// and fix of the display glitch (2: the page shows the problem only), whether the simulator was
// Tinkercad and whether the real board had the drawing's buzzer and LEDs (4), the later demo's date
// (5), and any course name or showcase (6).
export default {
  summary: {
    stats: [
      { v: '2 games', l: 'Run and Pong, on one board' },
      { v: '16 x 2', l: 'Characters on the whole screen' },
      { v: '1 Arduino Uno', l: 'Plus an LCD and push buttons' },
      { v: 'Summer 2023', l: 'At CTY' },
    ],
    text: [
      'At CTY in the summer of 2023 we built a game console on a breadboard: an **Arduino Uno**, a **16x2 character LCD** and push buttons. It runs two games: **Run**, where you press a button to jump over the blocks coming at you, and **Pong**, where two players each get a button and a ball crosses the screen between them.',
      'It was a long time ago and I have forgotten most of the details, so this page lets the footage do the talking.',
    ],
  },
  hero: {
    layout: 'row',
    items: [
      { v: 'hero-run-or-pong.mp4', c: 'Pick a game: "Run or Pong?", then Run: jump the blocks while the score counts up' },
      { v: 'hero-pong-game-over.mp4', c: 'The last rally of a game of Pong, then "GAME OVER" and "Jerry WINS"' },
    ],
  },
  sections: [
    { type: 'scrolly', id: 'console', module: 'reel', webgl: false, width: 'full', stepHeight: '90vh', poster: 'still-run-or-pong.webp',
      h: 'From a drawing to a console',
      p: ['Scroll through the build in the order it happened: the circuit drawn first, the breadboard, the first game, the first Pong, and the finished console.'],
      caption: 'Photos and clips from camp, in order. The two clips follow your scroll.',
      steps: [
        { h: 'Drawn first', p: [
          'Before wiring anything, we drew the circuit in a circuit simulator: the Arduino, the LCD, the buttons and their resistors. The drawing also has a buzzer and a row of LEDs.',
        ], view: { short: 'Drawing', shots: [
          { i: 'circuit-simulator.webp', size: [1561, 1600], zoom: [1, 1.06], focus: [0.5, 0.45], c: 'The circuit drawn in a simulator, Jul 31, 2023' },
        ] } },
        { h: 'Wired the same day', p: [
          'That evening it was on a full-size breadboard on a black base, with the Arduino Uno at one end and the LCD in the middle.',
        ], view: { short: 'Breadboard', shots: [
          { i: 'breadboard-build.webp', size: [1200, 1600], zoom: [1, 1.06], focus: [0.5, 0.35], c: 'The breadboard the same evening, with the LCD lit' },
        ] } },
        { h: 'Run', p: [
          'The first game. The player sits at the left edge of the screen, blocks come in from the right, and a button press makes the player jump. The score in the corner keeps counting.',
        ], view: { short: 'Run', shots: [
          { v: 'run-score-climbs.mp4', from: 0, to: 11.9, size: [406, 720], crop: [0, 0.3, 1, 0.7], stills: [{ i: 'run-score-climbs.jpg', at: 0 }],
            c: 'Run on the first, smaller board: the score in the corner climbs as the player jumps' },
        ] } },
        { h: 'The first Pong', p: [
          'Pong came next, on the bigger board: one button at each end, and a ball that crosses the screen. The first version just said PLAYER1 and PLAYER2 and showed the score between points.',
        ], view: { short: 'First Pong', shots: [
          { v: 'pong-v1-player1-player2.mp4', from: 0, to: 14.9, size: [406, 720], stills: [{ i: 'pong-v1-player1-player2.jpg', at: 0 }, { i: 'still-player1-player2.webp', at: 4 }],
            c: 'The first Pong: PLAYER1 0, PLAYER2 1, then a rally' },
        ] } },
        { h: 'One console, two games', p: [
          'The final version put both games on one board behind a menu: "Run or Pong?", then "Press Start" for Run, or "PING PONG, PRESS A BUTTON" for Pong.',
        ], view: { short: 'Menu', shots: [
          { i: 'still-run-or-pong.webp', size: [1600, 900], zoom: [1, 1.04], focus: [0.33, 0.62], c: 'The menu: "Run or Pong?"' },
          { i: 'still-run-in-play.webp', size: [1600, 900], zoom: [1, 1.04], focus: [0.36, 0.7], c: 'Run in play on the final board' },
          { i: 'still-ping-pong-start.webp', size: [1600, 900], zoom: [1, 1.04], focus: [0.36, 0.72], c: 'Pong: "PING PONG, PRESS A BUTTON"' },
        ] } },
        { h: 'Game over', p: [
          'Up close, a rally is one dot crossing 16 characters, with a thumb on the button. At the end the screen says who won.',
        ], view: { short: 'Game over', shots: [
          { v: 'pong-rally-close.mp4', from: 0, to: 13.9, size: [1280, 720], until: 0.7, stills: [{ i: 'pong-rally-close.jpg', at: 0 }], c: 'A rally, up close: the ball is a dot crossing the screen' },
          { i: 'still-game-over.webp', size: [1600, 900], zoom: [1, 1.05], focus: [0.4, 0.5], c: '"GAME OVER", "Jerry WINS"' },
        ] } },
      ],
      data: { aria: 'The breadboard game console from the circuit drawing to a finished game of Pong' } },

    { type: 'prose', id: 'run', h: 'Run', media: [
      [
        { i: 'still-press-start.webp', c: 'The first, smaller board: "Press Start"' },
        { i: 'still-run-in-play.webp', c: 'Run on the final board: the player and the blocks are character cells' },
      ],
    ], p: [
      'A 16x2 character LCD has no pixels to draw with: the whole screen is 32 character cells. So in Run the player and the blocks are drawn in those cells, the blocks scroll in from the right one cell at a time, and the score takes the last few cells of a line.',
      'The first version ran on a smaller breadboard. On the final board it sits behind the menu, next to Pong.',
    ] },
    { type: 'prose', id: 'pong', h: 'Pong', side: 'left', media: [
      { v: 'pong-v1-player1-player2.mp4', c: 'The first Pong: "PLAYER1" and "PLAYER2", one button at each end' },
      [
        { i: 'still-ping-pong-start.webp', c: 'Ready: "PING PONG, PRESS A BUTTON"' },
        { i: 'still-show-score.webp', c: '"Show Score?": the screen that lists every player\'s wins' },
      ],
    ], p: [
      'The first Pong just said PLAYER1 and PLAYER2. The final version turned it into a proper console. It opens on "Run or Pong?". For Pong, each player scrolls through a list of names and picks their own, the screen shows who is playing whom, and then "PING PONG, PRESS A BUTTON".',
      'After every point it shows the score, at the end it shows "GAME OVER" and the winner, and "Show Score?" then lists how many games each player has won, adding up from game to game.',
    ] },
    { type: 'prose', id: 'glitch', h: 'When it glitched', media: [
      { v: 'lcd-glitch.mp4', c: 'The screen filling up with blocks and random symbols' },
    ], p: [
      { problem: 'Sometimes the LCD filled up with blocks and random symbols instead of the game. It is the one failure we caught on film.', title: 'A scrambled screen' },
    ] },
  ],
};
