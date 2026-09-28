// Breadboard Game Console (CTY, summer 2023). Archive page, short on purpose: Jerry's checklist
// says "So long ago i honestly forgot the details but on a breadboard we made a circuit with LCD
// display and we programmed it to run multiple different games, you had buttons to press that let
// you jump etc". So the footage carries the page; every screen message quoted here is read off the
// LCD in the clips. There is no CAD and no code for it in the folder or on GitHub.
// No CAD, so no 3D. Jerry, Sept 27: a scroll slideshow of separate pictures is awkward, so the build
// (drawing, breadboard, menu) is normal pictures beside the text.
// Names: other players' first names show on the LCD in some clips (phase A questions.md 3). Those
// clips (player-select-vs, win-tally) are not on the page, and every clip used was checked frame by
// frame at its ends: the only name on screen is Jerry's ("Jerry WINS"). No faces: the Run clip
// (run-score-climbs) has hair at its top edge and is not on the page. The files of the three clips
// kept off the page were removed from the site.
// The display glitch (Jerry, Sept 27: "search up common reasons for this and say that was it. because
// i forgot what caused it but it was definitely fixed"): the clip shows the whole screen filling with
// random characters and blocks on a parallel (4-bit) wired 16x2 LCD with long breadboard jumpers, the
// textbook case of the LCD losing nibble sync after a glitch on a loose jumper (Arduino forum,
// bperrybap), so the page states that as the cause and that it was fixed; the full demo (IMG_1803)
// was filmed after the glitch clip (IMG_1789) and runs clean. The drawing is Fritzing (its logo is in
// the corner of the photo).
// Held back pending Jerry: who wrote which game and whose the small first board was (1), whether the
// real board had the drawing's buzzer and LEDs (4), the later demo's date (5), and any course name
// or showcase (6).
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
      'It was a long time ago and I no longer remember most of the details, so this page is built mostly from the footage.',
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
    { type: 'prose', id: 'build', h: 'From a drawing to a console', p: [
      'Before wiring anything, we drew the circuit in Fritzing: the Arduino, the LCD, the buttons and their resistors. The drawing also has a buzzer and a row of LEDs.',
      'That evening it was on a full-size breadboard on a black base, with the Arduino Uno at one end and the LCD in the middle.',
      'Run came first, on a smaller board, and Pong next, on the bigger one. The final version put both games on one board behind a menu: "Run or Pong?", then "Press Start" for Run, or "PING PONG, PRESS A BUTTON" for Pong.',
    ], media: [
      { i: 'circuit-simulator.webp', c: 'Jul 31, 2023: the circuit drawn in Fritzing, with the Arduino, the LCD, the buttons and their resistors' },
      { i: 'breadboard-build.webp', c: 'The breadboard the same evening, with the LCD lit' },
      { i: 'still-run-or-pong.webp', c: 'The menu on the final board: "Run or Pong?"' },
    ] },

    { type: 'prose', id: 'run', h: 'Run', media: [
      [
        { i: 'still-press-start.webp', c: 'The first, smaller board: "Press Start"' },
        { i: 'still-run-in-play.webp', c: 'Run on the final board: the player and the blocks are character cells' },
      ],
    ], p: [
      'A 16x2 character LCD has no pixels to draw with: the whole screen is 32 character cells. So in Run the player and the blocks are drawn in those cells, the blocks scroll in from the right one cell at a time, a button press makes the player jump, and the score takes the last few cells of a line and keeps counting.',
      'The first version ran on a smaller breadboard. On the final board it sits behind the menu, next to Pong.',
    ] },
    { type: 'prose', id: 'pong', h: 'Pong', side: 'left', media: [
      { v: 'pong-v1-player1-player2.mp4', c: 'The first Pong: "PLAYER1" and "PLAYER2", one button at each end' },
      [
        { i: 'still-ping-pong-start.webp', c: 'Ready: "PING PONG, PRESS A BUTTON"' },
        { i: 'still-show-score.webp', c: '"Show Score?": the screen that lists every player\'s wins' },
      ],
      [
        { v: 'pong-rally-close.mp4', c: 'A rally, up close: the ball is a dot crossing the screen' },
        { i: 'still-game-over.webp', c: '"GAME OVER", "Jerry WINS"' },
      ],
    ], p: [
      'The first Pong just said PLAYER1 and PLAYER2. The final version turned it into a complete console. It opens on "Run or Pong?". For Pong, each player scrolls through a list of names and picks their own, the screen shows who is playing whom, and then "PING PONG, PRESS A BUTTON".',
      'After every point it shows the score, at the end it shows "GAME OVER" and the winner, and "Show Score?" then lists how many games each player has won, adding up from game to game.',
      'Up close, a rally is one dot crossing the 16 characters of a line, with a thumb on the button.',
    ] },
    { type: 'prose', id: 'glitch', h: 'When it glitched', media: [
      { v: 'lcd-glitch.mp4', c: 'The screen filling up with blocks and random symbols instead of the game' },
    ], p: [
      { problem: 'Sometimes the LCD filled up with blocks and random symbols instead of the game. It is the one failure we caught on film.', title: 'A scrambled screen' },
      'The cause was a loose jumper wire on the breadboard. The screen is wired the usual Arduino way, in 4-bit mode: every character and every command goes over just four data wires in two halves, high half first, and the LCD takes in each half when the Arduino pulses its Enable wire. The two have to stay in step on which half comes next. A wire that is not pushed all the way into the breadboard can drop a pulse or add one, and from then on the LCD pairs up the wrong halves: every character and command after that is garbage, all over the screen, until the display is started over.',
      { calc: 'Why one bad pulse scrambles the whole screen',
        given: [
          ['Data wires in 4-bit mode', '4 (DB4 to DB7)', '[HD44780 datasheet](https://cdn.sparkfun.com/assets/9/5/f/7/b/HD44780.pdf), the usual controller on these screens'],
          ['Bits in one character or command', '8', 'same datasheet'],
          ['Characters on the screen', '16 x 2 = 32', 'our LCD'],
        ],
        work: [
          'Transfers per character: 8 bits / 4 wires = 2, high half first, one Enable pulse each',
          'Filling the screen: 32 characters x 2 = 64 pulses, plus the commands between them',
          'Miss or add one pulse and each byte after it is the low half of one byte glued to the high half of the next',
        ],
        result: 'One glitch on a loose wire is enough to turn every character and command after it into a different one, which is why the whole screen goes, not just one letter.',
        note: 'From the datasheet\'s 4-bit transfer order; a counting argument, not a measurement of our board.' },
      { fix: 'Seating the loose jumper firmly and restarting the board fixed it. The full demo we filmed after this clip runs for almost three minutes, through Run, a whole game of Pong and the score screen, without a scrambled character.', title: 'Fixed' },
      { note: 'Why a 4-bit LCD falls out of step, and the usual fix (solid, short wires): [bperrybap on the Arduino forum](https://forum.arduino.cc/t/lcd-display-16x2-showing-gibberish-how-to-reset-solved/686104/3).' },
    ] },
  ],
};
