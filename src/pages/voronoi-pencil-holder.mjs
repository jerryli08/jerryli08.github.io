// Voronoi Pencil Holder: a small page, the CAD turned by the scroll.
// Held back until Jerry answers (questions.md Q4, Q8): whether he modeled it himself, and whether
// it was printed.
export default {
  summary: {
    text: [
      'An OHTO MS01 and a Pentel Orenz each sit in their own insert, and my name runs along one end of the body. In the CAD it is 162 mm long.',
    ],
  },
  hero: null,
  sections: [
    {
      type: 'scrolly', id: 'cad', module: '@turntable', width: 'wide', side: 'right', length: '140vh',
      h: 'The CAD',
      p: ['The body and its two inserts, one for each pencil, from my CAD.'],
      caption: 'The holder and its two inserts, from my CAD',
      poster: '/assets/media/voronoi-pencil-holder/cad-pencil-holder.webp',
      data: { models: [{ label: 'Holder', src: '/assets/models/voronoi-pencil-holder/holder.glb' }], azimuth: 30, elevation: 35, spin: 360 },
    },
  ],
};
