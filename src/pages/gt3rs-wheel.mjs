// GT3 RS Wheel Replica: a small page, the CAD turned by the scroll.
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
      type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', length: '140vh',
      h: 'The CAD',
      p: ['The wheel from my CAD, lying face up: the spokes on top, the barrel below.'],
      caption: 'The wheel, from my CAD',
      poster: '/assets/media/gt3rs-wheel/cad-wheel.webp',
      data: { models: [{ label: 'Wheel', src: '/assets/models/gt3rs-wheel/wheel.glb' }], azimuth: 20, elevation: 30, spin: 360 },
    },
  ],
};
