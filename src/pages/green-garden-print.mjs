// Green Garden, Remade in Print: a small photo page. No CAD file for this one.
export default {
  summary: {
    text: [
      'For a Spanish project I remade a painting by the artist Carmen Herrera, "Green Garden" (1950), as a multi-colour 3D print, with the title, the artist and my name printed along the bottom. I recoloured it in blues.',
    ],
  },
  hero: { layout: 'single', items: [{ i: '/assets/media/prints/green-garden-print.webp', c: 'The finished print' }] },
  sections: [
    { type: 'media', id: 'making', layout: 'row', items: [
      { i: '/assets/media/prints/green-garden-slicer.webp', c: 'Sliced for four colours' },
      { i: '/assets/media/prints/green-garden-reference.webp', c: 'The original: Carmen Herrera, Green Garden (1950)' },
    ] },
  ],
};
