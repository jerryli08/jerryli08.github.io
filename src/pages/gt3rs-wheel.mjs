// GT3 RS Wheel Replica: a small page. Its one animation stands the real CAD upright as on a car,
// rolls it three turns along the ground as you scroll, then pans around it (Jerry, Sept 27).
// Held back until Jerry answers (questions.md Q2): what it was printed in, at what scale, what it
// was smoothed with and how it came out.
export default {
  summary: {
    text: [
      'In the CAD it is 545 mm across and 264 mm deep: split spokes running out from a single centre bore to a deep barrel.',
    ],
  },
  hero: null,
  sections: [
    {
      type: 'scrolly', id: 'roll', module: 'roll', stepHeight: '125vh',
      h: 'Rolling it',
      p: [
        'The wheel from my CAD, stood upright the way it sits on the car, with the axle level. Scroll and it rolls three full turns along a ruler on the ground, then the view swings around it to show every side.',
        { calc: 'How far one turn carries it',
          given: [['Outer diameter, across the lips', '545 mm', 'measured from the CAD']],
          work: [
            'Rolling without slipping, one turn lays the whole lip along the ground: distance per turn = π × D',
            'π × 0.545 m = 1.712 m per turn',
            'The three turns in the animation: 3 × 1.712 m = 5.14 m',
          ],
          result: 'Each turn carries the rim 1.71 m. The orange ticks on the ruler sit at exactly these distances, and the orange mark on the lip lands on one after every turn.',
          note: 'The CAD is the bare rim, so it rolls on its lips. On a car the tyre touches the road, and its larger diameter sets the distance per turn.' },
      ],
      caption: 'The wheel, from my CAD, rolled along the ground',
      poster: '/assets/media/gt3rs-wheel/cad-wheel.webp',
      steps: [
        { h: 'Upright, like on the car', p: ['Stood on its lips with the axle level, it rolls as you scroll: 545 mm across, so each turn carries it 1.71 m.'] },
        { h: 'Three turns, 5.14 m', p: ['The orange mark on the lip comes back down onto an orange tick after every turn: no slipping, one circumference per turn.'] },
        { h: 'The face', p: ['Seven spokes leave the centre bore, and each splits in two before the rim: 14 arms meet the lip (counted in the CAD).'] },
        { h: 'Side on', p: ['From the side, the barrel runs 264 mm from the face to the back lip.'] },
        { h: 'The back', p: ['From behind: the inside of the barrel, the backs of the spokes and the bore through the hub.'] },
        { h: 'From above', p: ['Both lips are 545 mm across; between them the barrel narrows to 453 mm (measured from the CAD).'] },
      ],
    },
  ],
};
