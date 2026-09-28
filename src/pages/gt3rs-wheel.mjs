// GT3 RS Wheel Replica: a small page. Its one animation rolls the real CAD three turns about its
// axle as you scroll, then pans around it (Jerry, Sept 27). Jerry, Sept 27, 21:12: no ruler, tick
// marks or mark on the wheel, and no "upright like on a car" in the copy.
// Facts from Jerry (21:12): printed in ABS on a Bambu Lab H2D, 275 mm radius, vapor smoothed (the
// solvent is not stated, so it is not named). He remembered the car's wheels as 20 in front and 21 in
// rear: Porsche's technical data confirms 10 J x 20 front and 13 J x 21 rear. The CAD's bead seats
// (about 507 mm across, a circle fitted to the barrel) and depth (264 mm) match the front wheel.
// His 275 mm against the CAD's 272.5 mm lip radius: both are given, and the numbers use the CAD.
// Held back (questions.md Q2): how a 550 mm wheel was printed on the H2D (in pieces? at what scale?),
// how the smoothing came out, and photos of the print.
const PORSCHE = 'https://newsroom.porsche.com/dam/jcr:1d390f77-93c3-49c0-89c7-634f5f02b26a/S22_3515_en.pdf';
export default {
  summary: {
    text: [
      'A replica of the Porsche 911 GT3 RS front wheel, which I printed in ABS on a Bambu Lab H2D and then vapor smoothed. By my number it is 275 mm in radius; measured in my CAD, the lips come to 272.5 mm (545 mm across), within 1 % of that, and the wheel is 264 mm deep: split spokes running out from a single centre bore to a deep barrel.',
    ],
  },
  hero: null,
  sections: [
    {
      type: 'scrolly', id: 'roll', module: 'roll', stepHeight: '125vh',
      h: 'Rolling it',
      p: ['The wheel from my CAD. Scroll and it rolls three full turns about its axle, then the view swings around it to show every side.'],
      caption: 'The wheel, from my CAD, rolling as you scroll',
      poster: '/assets/media/gt3rs-wheel/cad-wheel.webp',
      steps: [
        { h: 'Rolling', p: ['It turns about its axle as you scroll. At 545 mm across, each turn rolls 1.71 m of lip along the ground.'] },
        { h: 'Three turns', p: ['Three turns: 5.14 m on the bare lips. On the car, the 700 mm front tyre would carry it 6.60 m.'] },
        { h: 'The face', p: ['Seven spokes leave the centre bore, and each splits in two before the rim: 14 arms meet the lip (counted in the CAD).'] },
        { h: 'Side on', p: ['From the side, the barrel runs 264 mm from the face to the back lip.'] },
        { h: 'The back', p: ['From behind: the inside of the barrel, the backs of the spokes and the bore through the hub.'] },
        { h: 'From above', p: ['Both lips are 545 mm across; between them the barrel narrows to 453 mm (measured from the CAD).'] },
      ],
    },
    {
      type: 'prose', id: 'which', h: 'Which wheel it is',
      p: [
        'The GT3 RS runs a 20 in wheel at the front and a 21 in wheel at the rear. My replica is the front one:',
        { calc: 'Front or rear?',
          given: [
            ['Front wheel', '10 J x 20 (20 in rim, 10 in wide), 275/35 ZR 20 tyre', `[Porsche, 911 GT3 RS technical data, 08/2022](${PORSCHE})`],
            ['Rear wheel', '13 J x 21 (21 in rim, 13 in wide)', `[Porsche, 911 GT3 RS technical data](${PORSCHE})`],
            ['Barrel just inside the lips (bead seats)', 'about 507 mm across', 'measured from the CAD'],
            ['Depth, face lip to back lip', '264 mm', 'measured from the CAD'],
          ],
          work: [
            'A rim\'s size in inches is the diameter of its bead seats: 20 in = 508 mm, 21 in = 533 mm',
            'CAD: 507 mm, 1 mm from 20 in and 26 mm short of 21 in',
            'Width: 10 in = 254 mm, 13 in = 330 mm. The CAD is 264 mm lip to lip, lips included, so its rim width is under 264 mm: 10 in, not 13 in',
          ],
          result: 'Both the diameter and the width match the 20 in front wheel, 10 J x 20.',
          note: 'The J width is measured between the inside faces of the lips, so a real rim is a little wider than its J number lip to lip; rounded.' },
        { calc: 'How fast the front wheel turns on the car',
          given: [
            ['Front tyre', '275/35 ZR 20', `[Porsche technical data](${PORSCHE})`],
            ['Top speed', '296 km/h', `[Porsche technical data](${PORSCHE})`],
          ],
          work: [
            'Sidewall: 35 % of 275 mm = 96.3 mm',
            'Tyre diameter: 508 mm + 2 × 96.3 mm = 700.5 mm, so one turn = π × 0.7005 m = 2.20 m',
            '296 km/h = 82.2 m/s; 82.2 m/s / 2.20 m = 37.4 turns a second',
          ],
          result: 'At top speed the front wheel turns about 37 times a second, about 2,240 rpm. Rolling on its bare lips, my replica covers 1.71 m a turn (π × 545 mm).',
          note: 'Nominal tyre size, ignoring tyre growth and squash under load; rounded.' },
      ],
      media: [{ i: '/assets/media/gt3rs-wheel/cad-wheel-tight.webp', c: 'The wheel, rendered from my CAD' }],
    },
  ],
};
