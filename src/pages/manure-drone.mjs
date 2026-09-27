// Manure-Collecting Drone (concept, Constellation Youth Energy Summit, summer 2024). Rich page,
// scroll-first (Sept 27, 2026). Copy uses only facts Jerry stated (his checklist entry, projects.mjs,
// the README of his public repo github.com/jerryli08/cegyes2024) and his CAD. Every outside number is
// cited where it is used (ASAE D384.1, IPCC 2006 Vol. 4 Ch. 10, the Hobbywing X6 spec, an EFT E610P
// listing); every derived number says it is computed, and the assumptions are named.
// The airframe, motors and props are an open GrabCAD model of an EFT spraying drone (his README
// credits it); the page claims only his changes: the vacuum canister in place of the spray tank, the
// intake nozzle and duct, and the new landing gear. There are no photos or videos: every picture is
// his CAD (render stills and posters are renders of it).
// The "add manure and watch it pick it up" interaction in his checklist is left out under his Sept 26
// scroll-only rule; the scroll runs the mission instead.
// Held back until Jerry answers (/home/claude/work/youth-energy-summit-manure-drone/questions.md):
// whether he doubled the motors into coaxial pairs (Q1: the page does not say who did), which EFT
// model it was (Q2: the E610P is given only as a comparable sprayer), whether the canister is a
// downloaded model (Q3), the team and who did what beyond his idea and CAD (Q4), what he would change
// (Q5: no "next time" block), any numbers he presented at the summit (Q6), and naming the town (Q7:
// the page says "a small rural town in New York State"; the linked repo names it).
const M = '/assets/models/manure-drone/';
const ORANGE = '#ff6b35', BLUE = '#27c7ff', GREEN = '#3fb96a';
const REPO = 'https://github.com/jerryli08/cegyes2024';
const GRABCAD = 'https://grabcad.com/library/eft-spraying-drone-1';
const ASAE = 'http://large.stanford.edu/publications/coal/references/docs/ASAEStandard.pdf';
const IPCC = 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html';
const X6 = 'https://rcmumbai.com/hobbywing-x6-power-system-for-agricultural-drones-cw.html';
const E610P = 'https://robokits.co.in/multirotor-spare-parts/agriculture-drone-parts/eft-e-series-e610p-agriculture-drone-frame-25kg-take-off-weight-with-10l-tank-capacity';

export default {
  summary: {
    stats: [
      { v: '12', l: 'Motors in six coaxial pairs, with 23 in props' },
      { v: 'About 26 L', l: 'Of canister below the arms as modelled: about 26 kg of manure (computed)' },
      { v: '38 kg', l: 'Of manure per dairy cow per day, not counting urine (ASAE D384.1)' },
      { v: '1.3 m³', l: 'Of methane per cow per day at most, about 13 kWh (IPCC 2006)' },
    ],
    text: [
      'For the Constellation Youth Energy Summit, our team wrote a climate action plan for a small rural town in New York State with a lot of cow farming, where methane was the main source of pollution. My idea was a drone that vacuums up cow manure: a camera finds it in the field, the drone vacuums it up and flies it to a depot, where it can be turned into energy.',
      'I built the concept in CAD on an open model of an agricultural spraying drone: I replaced its spray tank with a vacuum canister, added an intake nozzle and a duct, and changed the landing gear. The numbers below check whether it could work, problems included.',
    ],
  },
  hero: {
    layout: 'single',
    items: [{ i: 'cad-hero.webp', c: 'My CAD of the manure drone: the vacuum canister runs through the middle of the body, with six arms of coaxial motor pairs and 23 in props around it' }],
  },
  sections: [
    // ------------------------------------------------------------------ the problem
    { type: 'prose', id: 'problem', h: 'Why manure', p: [
      'The town we planned for has a lot of cow farming, and methane was its main source of pollution. On a dairy farm, manure is one source of methane: stored wet in lagoons or slurry tanks, it breaks down without oxygen and gives it off, and methane is a much stronger greenhouse gas than CO2.',
      'My idea was to collect the manure with a drone. For a lot of places it is much easier for an agricultural drone to fly to the site, vacuum the manure up, drop it at a depot and repeat than to deploy dedicated ground rovers.',
    ] },

    // ------------------------------------------------------------------ the mission
    { type: 'scrolly', id: 'patrol', module: 'patrol', width: 'full', stepHeight: '95vh', poster: `${M}poster-patrol.webp`,
      h: 'How it would work',
      p: ['The real drone CAD, at real scale, flying the mission as you scroll.'],
      steps: [
        { h: 'Twelve props, six pairs', p: [
          'The drone has twelve motors in six coaxial pairs, with 23 in props. Each lower prop is the mirror image of the one above it and turns the other way, so the two props on each arm cancel each other\'s torque.',
          'At 3 to 5 kg of recommended takeoff weight per motor ([Hobbywing X6 spec](' + X6 + ')), twelve motors are rated for 36 to 60 kg, before the loss from stacking two props on one axis.',
        ] },
        { h: 'Scan', p: ['It takes off and flies over the pasture while a downward camera looks for manure, and marks every pat it finds. No camera is in the CAD yet: this is the plan.'] },
        { h: 'Vacuum', p: ['It flies to each pat, drops low over it and vacuums it up through the wide nozzle under its back. The canister fills. Its half below the arms is about 26 L as modelled: about 26 kg of manure, taking that half as the part that holds it.'] },
        { h: 'Back to the depot', p: ['With the canister full, it flies back to the depot and empties it into the digester\'s inlet. The pats it left behind wait for the next trip.'] },
        { h: 'Into energy', p: [
          'It lands to charge. In the digester, bacteria break the manure down without oxygen and make biogas, mostly methane and CO2. The biogas runs a generator for electricity and heat, and the digested manure goes back on the fields as fertilizer.',
          'Burning the methane turns it into CO2, which traps far less heat than the methane would have.',
        ] },
      ],
      caption: 'Illustrative: the pasture, the manure, the digester, the camera footprint, the streams and the fill level are drawn for the animation. The drone is my CAD at real scale, and each prop turns about its real hub axis, slowed down so you can see which way. The sources for the numbers in the readout are in the table below.' },

    // ------------------------------------------------------------------ the CAD versions
    { type: 'scrolly', id: 'versions', module: '@turntable', width: 'wide', side: 'left', stepHeight: '90vh', poster: `${M}poster-versions.webp`,
      h: 'From a spraying drone to a manure drone',
      p: ['I started from an open CAD model of an EFT agricultural spraying drone on [GrabCAD](' + GRABCAD + '), as the README in [my repo](' + REPO + ') says. The airframe, the motors and the props are that model; my changes are the canister, the nozzle and duct, and the landing gear. These are three of my saved versions, all from the night of July 19, 2024.'],
      data: {
        models: [
          { label: 'v2', src: `${M}v2.glb` },
          { label: 'v5', src: `${M}v5.glb` },
          { label: 'v7', src: `${M}final.glb` },
        ],
        azimuth: 215, elevation: 15, pad: 1.0, drift: 12,
      },
      steps: [
        { h: 'v2: the sprayer', view: { version: 0, azimuth: 215, elevation: 14, pad: 0.86,
            highlight: [{ parts: 'md_tank$', color: BLUE, intensity: 0.45 }, { parts: 'md_gear$', color: GREEN, intensity: 0.3 }],
            labels: [{ text: 'Spray tank', part: 'md_tank$', color: BLUE }, { text: 'Landing gear', part: 'md_gear$', color: GREEN, side: 'l' }] },
          p: ['Version 2 still has the sprayer\'s tank in the middle of the body: 11.7 L as modelled, a 10 L class sprayer.'] },
        { h: 'v5: tank out, canister in', view: { version: 1, azimuth: 215, elevation: 14, pad: 0.86,
            highlight: [{ parts: 'md_canister$', color: ORANGE, intensity: 0.4 }, { parts: 'md_gear$', color: GREEN, intensity: 0.3 }],
            labels: [{ text: 'Vacuum canister', part: 'md_canister$', color: ORANGE }, { text: 'New landing gear', part: 'md_gear$', color: GREEN, side: 'l' }] },
          p: ['I took out the spray tank and its cover and put a vacuum canister through the middle of the body, 342 mm across, with about 26 L of it below the arms. The landing gear is new: its skids sit 20 mm lower and 45 mm wider than before (measured in the CAD). A pipe runs up the front of the canister.'] },
        { h: 'v7: nozzle and duct', view: { version: 2, azimuth: 28, elevation: 6, pad: 0.86,
            highlight: [{ parts: 'md_nozzle$', color: ORANGE, intensity: 0.45 }, { parts: 'md_duct$', color: BLUE, intensity: 0.45 }],
            labels: [{ text: 'Intake nozzle', part: 'md_nozzle$', color: ORANGE }, { text: 'Duct to the canister', part: 'md_duct$', color: BLUE, side: 'l' }] },
          p: ['The intake moved to the back: a nozzle under the back of the drone, its mouth a 264 mm wide slot 32 mm off the ground when it is landed, and a duct up the back to the canister. The rear obstacle radar is gone: the nozzle sits where it was.'] },
        { h: 'From the side', view: { version: 2, azimuth: 90, elevation: 3, pad: 0.92,
            highlight: [{ parts: 'md_nozzle$', color: ORANGE, intensity: 0.4 }, { parts: 'md_duct$', color: BLUE, intensity: 0.4 }],
            labels: [{ text: 'Vacuum head', at: [0.12, 0.6, -0.05] }, { text: 'Below the arms: about 26 L', at: [0.154, -0.02, 0.0], side: 'l' },
              { text: 'Nozzle', at: [0.118, -0.13, 0.33], color: ORANGE }, { text: 'Duct', at: [0.2, 0.3, 0.23], color: BLUE }] },
          p: ['From the side, front to the right: the canister runs through the body, from just above the ground up to the vacuum head on top, and the duct climbs the back from the nozzle to the canister.'] },
      ],
      caption: 'The airframe, motors and props are the open EFT spraying drone model on GrabCAD. v2, v5 and v7 are from my repo; v7 is the final model. Volumes and sizes are measured in the CAD.' },

    // ------------------------------------------------------------------ the numbers
    { type: 'prose', id: 'numbers', h: 'Does it add up?', p: [
      'Numbers from my CAD and from published data. Every input is cited; every result is computed from them.',
      { table: {
        head: ['Input', 'Value', 'Source'],
        rows: [
          ['Motors and props', '12, in six coaxial pairs; 23 in props', 'My CAD'],
          ['Lift per motor (Hobbywing X6, 180 KV, 2388 prop, 48 V)', '12 kg max, 3 to 5 kg recommended takeoff weight', '[Hobbywing X6 spec](' + X6 + ')'],
          ['A comparable sprayer (EFT E610P frame)', '25 kg takeoff with a 10 L tank, on 6 motors', '[Robokits listing](' + E610P + ')'],
          ['Canister below the arms', 'About 26 L, its volume as modelled', 'My CAD'],
          ['Dairy manure', '86 kg per 1,000 kg of cow per day, 26 kg of it urine; 990 kg/m³; a typical cow is 640 kg', '[ASAE D384.1](' + ASAE + '), Table 1'],
          ['Methane potential of dairy manure, North America', '5.4 kg of volatile solids per cow per day; 0.24 m³ of methane per kg', '[IPCC 2006](' + IPCC + '), Vol. 4, Ch. 10, Table 10A-4'],
          ['Share of that methane released', 'Manure on pasture: 1 %. Uncovered lagoon, cool climate (10 °C): 66 %', 'IPCC 2006, Table 10.17'],
        ],
      } },
      { h: 'Results' },
      { ul: [
        '**Lift.** 12 motors x 3 to 5 kg = **36 to 60 kg** of recommended takeoff weight, before the loss from the lower props working in the upper props\' wash. For comparison, a six-motor 10 L sprayer frame is rated for 25 kg; twelve motors instead of six is what makes a full 26 L canister plausible.',
        '**Payload.** Taking the half of the canister below the arms as the manure space (about 26 L as modelled), a full load is **about 26 kg** at 990 kg/m³.',
        '**Manure per cow.** 86 - 26 = 60 kg of feces per 1,000 kg of cow per day, so **about 38 kg (39 L)** for a 640 kg cow: about **1.5 full canisters per cow per day**.',
        '**Energy.** 5.4 kg x 0.24 m³/kg = **1.3 m³ of methane per cow per day** at most, about **13 kWh** of heat at about 10 kWh per m³ of methane.',
        '**Methane kept out of the air.** In an uncovered lagoon, 66 % of that potential escapes: about **0.86 m³ per cow per day**. A digester captures it instead.',
      ] },
      { h: 'The problems, honestly' },
      { problem: 'By the same IPCC data, manure lying on a pasture releases only about 1 % of its methane potential, because it breaks down with air around it.', title: 'Manure left on grass makes little methane' },
      { fix: 'The methane the drone saves is the methane the manure would have made in a lagoon or slurry tank, where 66 % of it escapes. For manure that would have stayed on the grass, the gain is the energy from the digester rather than avoided methane.', label: 'What it changes' },
      { problem: 'One cow makes about 38 kg of manure a day, so a 100-cow herd on pasture would need about 150 full trips a day.', title: 'Scale' },
      { fix: 'One drone can only cover part of a farm: a real system needs several, or aims at the places ground machines cannot reach easily. That is where flying wins: the drone does not need roads, lanes or a flat barn floor.', label: 'Where it still works' },
      { problem: 'Hovering at 36 kg takes roughly 6 kW, so every kilowatt-hour of battery buys only about 10 minutes in the air.', title: 'Flight time' },
      { fix: 'Keep every trip short and put the charger at the depot, where the drone lands anyway after it empties the canister.', label: 'Where it still works' },
      { note: 'Hover power, computed: ideal induced power T^1.5 / sqrt(2 ρ A) for 36 kg (353 N) over the six prop discs (A = 6 x π x 0.2925² = 1.61 m², ρ = 1.225 kg/m³) is about 3.3 kW; with a coaxial penalty of 1.28 and a figure of merit of 0.7, both assumed, about 6.1 kW. At 60 kg the same model gives about 13 kW.' },
      { problem: 'Fresh dairy manure is about 86 % water (ASAE: 12 kg of solids in 86 kg). It is heavy for its volume and messy to vacuum, and the nozzle and duct could clog. The concept does not solve this yet.', title: 'Wet manure' },
    ], media: [
      { i: 'patrol-vacuum.webp', c: 'From the mission above: the drone low over the pasture after its third pat, the canister shown full (the pasture and the fill level are illustrations)' },
      { i: 'cad-side.webp', c: 'My CAD from the side, front to the right: the canister through the body with the vacuum head on top, the duct up the back and the nozzle under it' },
      { i: 'cad-nozzle.webp', c: 'The intake nozzle and the duct at the back of the drone in my CAD' },
    ] },

    // ------------------------------------------------------------------ verdict
    { type: 'callout', id: 'verdict', h: 'Why it is still worth it', p: [
      'The drone does not need roads, lanes or a flat barn floor. For a lot of places it is much easier to fly an agricultural drone to the site, vacuum, deposit and cycle than to deploy dedicated ground rovers, and the kind of drone this is built on is already made to carry about 10 L of liquid around a farm. The CAD and its versions are in [my repo](' + REPO + ').',
    ] },
  ],
};
