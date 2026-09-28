// Carbon Fiber Ping Pong Paddle: a small page. The layup animation is illustration only (Jerry
// never laid it up); ply count and fibre angles are not his and stay out of the copy.
// Numbers marked "from the CAD" are measured from his paddle and mold models.
// Jerry, Sept 27, 21:12: the plies ALSO run into the handle, not just the face, so each ply in the
// animation follows the whole cavity, handle channel included.
export default {
  summary: {
    stats: [
      { v: '4 mm', l: 'Carbon blade at the head (CAD)' },
      { v: '1.8 mm', l: 'Rubber on each face (CAD)' },
      { v: '2', l: 'Mold blocks, keyed by pins' },
      { v: '0.2 mm', l: 'Pin to hole clearance (CAD)' },
    ],
    text: [
      'I designed a table tennis paddle to be made from carbon fiber by wet layup, along with the mold to lay it up in. Designing the mold meant thinking about draft angles so the part could come out of it.',
      'I never ended up laying it up. The animation below shows the layup I designed it for.',
    ],
  },
  hero: { layout: 'single', items: [{ i: '/assets/media/prints/paddle-render.webp', c: 'My render of the paddle: carbon fiber blade and handle, rubber on both faces' }] },
  sections: [
    {
      type: 'scrolly', id: 'layup', module: 'layup',
      h: 'The layup, as I designed it',
      poster: '/assets/media/cf-ping-pong-paddle/cad-mold.webp',
      steps: [
        { h: 'The mold', p: ['Two blocks, cavity side up: one for the handle, one for the head. The paddle\'s outline is sunk into their top faces.'] },
        { h: 'Keyed together', p: ['Two 8.8 mm pins on the handle block slide into 9.0 mm holes in the head block and line the two halves of the cavity up (cut open here at the pins\' centreline). From the CAD: the end faces meet while the pins are still 0.2 mm short of the bottom of their holes, so the blocks seat face to face and the pins never bottom out.'] },
        { h: 'First ply', p: ['A sheet of dry carbon fiber cloth goes into the cavity, across the head and down into the handle channel, 12.6 mm deep (from the CAD), then gets wetted out with resin.'] },
        { h: 'More plies', p: ['Every ply runs the whole paddle, face and handle, and is wetted as it goes. In a layup like this the weave usually turns from ply to ply; the count and angles here are only for the animation.'] },
        { h: 'The paddle', p: ['Out of the mold: the carbon fiber blade and handle in one piece, then the rubber on both faces. This is the paddle from my CAD.'] },
      ],
    },
    {
      type: 'prose', id: 'draft', h: 'Designing for draft',
      p: [
        'A layup only comes out of a mold if the walls it touches let it go, so the mold had to be designed around draft angles, not just shaped like the paddle.',
        'I checked both blocks with Fusion 360\'s draft analysis, which colours every face of the model by its draft relative to the direction the part is pulled out.',
      ],
      media: [{ i: '/assets/media/prints/paddle-mold-draft-analysis.webp', c: 'Draft analysis on both mold blocks in Fusion 360' }],
    },
    {
      type: 'scrolly', id: 'cad', module: '@turntable', length: '160vh',
      h: 'The CAD',
      p: [
        'The paddle, then the mold, from my CAD.',
        'From the CAD: the blade is 4 mm thick at the head with 1.8 mm of rubber on each face, and the handle is 112 mm long.',
      ],
      poster: '/assets/media/cf-ping-pong-paddle/cad-paddle.webp',
      data: {
        models: [
          { label: 'Paddle', src: '/assets/models/cf-ping-pong-paddle/paddle.glb', carbon: 'carbon' },
          { label: 'Mold', src: '/assets/models/cf-ping-pong-paddle/mold.glb' },
        ],
        azimuth: 30, elevation: 35, spin: 300,
      },
    },
  ],
};
