// Voronoi Pencil Holder: a small page. Its one animation (drawers.js) slides the two pencil inserts
// out of the body one after the other and back in together as you scroll (Jerry, Sept 27, 21:12).
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
      type: 'scrolly', id: 'cad', module: 'drawers', length: '140vh',
      h: 'The CAD',
      p: ['The body and its two inserts, one for each pencil, from my CAD. Scroll and the inserts slide out of the end like drawers, first the OHTO, then the Orenz, and back in together.'],
      caption: 'The holder and its two inserts, from my CAD. Each insert slides out about 80% of its length: about 130 mm of its 162 mm',
      poster: '/assets/media/voronoi-pencil-holder/cad-pencil-holder.webp',
    },
  ],
};
