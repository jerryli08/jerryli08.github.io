// iPhone 11 Pro Voronoi Case: a small page, the CAD turned by the scroll.
// Held back until Jerry answers (questions.md Q8): whether it was printed, and a photo if so.
export default {
  summary: {
    text: [
      'Made for an iPhone 11 Pro: in the CAD it is 77 by 147 mm and 12 mm deep, with the camera opening cut through the back.',
    ],
  },
  hero: null,
  sections: [
    {
      type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', length: '140vh',
      h: 'The CAD',
      p: ['The case from my CAD, standing upright, starting from the back. The Voronoi pattern is recessed into it, around the camera opening.'],
      caption: 'The case, from my CAD',
      poster: '/assets/media/iphone-voronoi-case/cad-case.webp',
      data: { models: [{ label: 'Case', src: '/assets/models/iphone-voronoi-case/case.glb' }], azimuth: 0, elevation: 10, spin: 360 },
    },
  ],
};
