// Hexagonal Napkin Holder: a small photo page. No CAD file for this one.
// Held back: whether he modeled it himself (questions.md Q4).
export default {
  summary: {
    text: [
      'It printed with a lot of supports: the pile next to it is what came out of it.',
    ],
  },
  hero: { layout: 'single', items: [{ i: '/assets/media/prints/napkin-holder-supports.webp', c: 'The holder and the support material that came out of it' }] },
  sections: [
    { type: 'media', id: 'turn', layout: 'row', items: [
      { v: '/assets/media/prints/napkin-holder-turn.mp4', c: 'Turning it over: the lattice walls and floor' },
      { i: '/assets/media/prints/still-napkin-holder-bottom.webp', c: 'The lattice floor' },
    ] },
  ],
};
