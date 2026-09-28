// Manure-Collecting Drone (concept, Constellation Youth Energy Summit, summer 2024). Rich page,
// scroll-first (Sept 27, 2026). Copy uses only facts Jerry stated (his checklist entry, projects.mjs,
// the README of his public repo github.com/jerryli08/cegyes2024) and his CAD. Every outside number is
// cited where it is used (ASAE D384.1, IPCC 2006 Vol. 4 Ch. 10, the Hobbywing X6 spec, an EFT E610P
// listing); every derived number says it is computed, and the assumptions are named. Since Sept 27 the
// numbers are yellow { calc } blocks (lift, one cow a day, hover power) holding the same inputs and results.
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
const HEAT = 'https://www.engineeringtoolbox.com/gross-net-heating-values-d_420.html';
const AIR = 'https://www.engineeringtoolbox.com/standard-atmosphere-d_604.html';
const E610P = 'https://robokits.co.in/multirotor-spare-parts/agriculture-drone-parts/eft-e-series-e610p-agriculture-drone-frame-25kg-take-off-weight-with-10l-tank-capacity';
// Round 4 (Jerry, Sept 28: compare the drones' electricity and pollution with what the whole operation
// generates and saves): OMAFRA's farm digester factsheet (ISSN 1198-712X; dairy manure 23 m³ biogas and
// 48 kWh of electricity per wet tonne at 35 %, biogas about 60 % methane), EPA eGRID2023 rev2 (NYUP
// 242.8 lb CO2e/MWh, the eGRID subregion of the rural New York town in his repo; US 770.9), IPCC AR6
// WG1 Table 7.15 (non-fossil CH4, GWP-100 27.0) and IPCC 2006 Eq. 10.23 (0.67 kg per m³ of CH4).
// The 10-minute trip and the 90 % / 85 % efficiencies are labelled as assumptions on the page.
const OMAFRA = 'https://www.ontario.ca/page/energy-yields-farm-based-anaerobic-digestion-system';
const EGRID = 'https://www.epa.gov/egrid/summary-data';
const AR6 = 'https://www.ipcc.ch/report/ar6/wg1/chapter/chapter-7/';

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
    // ------------------------------------------------------------------ the mission
    // Jerry (Sept 27, 21:12): the best CAD scroll animation sits right below the hero.
    { type: 'scrolly', id: 'patrol', module: 'patrol', width: 'full', stepHeight: '95vh', poster: `${M}poster-patrol.webp`,
      h: 'How it would work',
      p: ['The real drone CAD, at real scale, flying the mission as you scroll.'],
      steps: [
        { h: 'Twelve props, six pairs', p: [
          'Twelve motors in six coaxial pairs, with 23 in props. Each lower prop mirrors the one above it and turns the other way, so the pair on each arm cancels its torque.',
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

    // ------------------------------------------------------------------ the problem
    { type: 'prose', id: 'problem', h: 'Why manure', p: [
      'The town we planned for has a lot of cow farming, and methane was its main source of pollution. On a dairy farm, manure is one source of methane: stored wet in lagoons or slurry tanks, it breaks down without oxygen and gives it off, and methane is a much stronger greenhouse gas than CO2.',
      'My idea was to collect the manure with a drone. For a lot of places it is much easier for an agricultural drone to fly to the site, vacuum the manure up, drop it at a depot and repeat than to deploy dedicated ground rovers.',
    ] },

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
      { h: 'Lift and payload' },
      { calc: 'Can twelve motors carry a full canister?',
        given: [
          ['Motors, in six coaxial pairs, with 23 in props', '12', 'My CAD'],
          ['Hobbywing X6 (180 KV, 2388 prop, 48 V): max lift per motor', '12 kg', '[Hobbywing X6 spec](' + X6 + ')'],
          ['Recommended takeoff weight per motor', '3 to 5 kg', 'Hobbywing X6 spec'],
          ['A comparable sprayer, the EFT E610P frame: takeoff on 6 motors with a 10 L tank', '25 kg', '[Robokits listing](' + E610P + ')'],
          ['Canister below the arms, as modelled', 'about 26 L', 'My CAD'],
          ['Dairy manure density', '990 kg/m³', '[ASAE D384.1](' + ASAE + '), Table 1'],
        ],
        work: [
          'Rated takeoff weight: 12 motors x 3 to 5 kg = **36 to 60 kg**, before the loss from the lower props working in the upper props\' wash',
          'The six-motor 10 L sprayer frame for comparison: 25 kg / 6 motors = 4.2 kg per motor, inside the same 3 to 5 kg band',
          'Payload: taking the half of the canister below the arms as the manure space, 26 L x 0.99 kg/L = **about 26 kg** for a full load',
        ],
        result: 'A full canister is about 26 kg, and twelve motors are rated for 36 to 60 kg of takeoff weight. Twelve motors instead of six is what makes a full 26 L canister plausible.' },
      { h: 'One cow, one day' },
      { calc: 'How much manure, and how much methane?',
        given: [
          ['Dairy manure per 1,000 kg of cow per day', '86 kg', '[ASAE D384.1](' + ASAE + '), Table 1'],
          ['of which urine', '26 kg', 'ASAE D384.1, Table 1'],
          ['A typical dairy cow', '640 kg', 'ASAE D384.1, Table 1'],
          ['Volatile solids per cow per day, North America', '5.4 kg', '[IPCC 2006](' + IPCC + '), Vol. 4, Ch. 10, Table 10A-4'],
          ['Methane potential per kg of volatile solids', '0.24 m³', 'IPCC 2006, Table 10A-4'],
          ['Share of that methane released: uncovered lagoon, cool climate (10 °C)', '66 %', 'IPCC 2006, Table 10.17'],
          ['Share released: manure on pasture', '1 %', 'IPCC 2006, Table 10.17'],
          ['Heat in methane (net: 8,570 kcal per normal m³)', 'about 10 kWh/m³', '[Engineering ToolBox](' + HEAT + ')'],
        ],
        work: [
          'Manure: 86 - 26 = 60 kg of feces per 1,000 kg of cow per day, so 0.64 x 60 = **about 38 kg (39 L)** for a 640 kg cow',
          'Trips: 38 kg / 26 kg per canister = **about 1.5 full canisters per cow per day**',
          'Methane: 5.4 kg x 0.24 m³/kg = **1.3 m³ per cow per day** at most, about **13 kWh** of heat at 10 kWh per m³',
          'In an uncovered lagoon, 66 % of that potential escapes: **about 0.86 m³ per cow per day**. A digester captures it instead. On pasture, 1 % escapes: about 0.013 m³',
        ],
        result: 'One cow makes about 1.5 canisters of manure a day, holding up to 1.3 m³ of methane, about 13 kWh.' },
      { problem: 'By the same IPCC data, manure lying on a pasture releases only about 1 % of its methane potential, because it breaks down with air around it.', title: 'Manure left on grass makes little methane' },
      { fix: 'The methane the drone saves is the methane the manure would have made in a lagoon or slurry tank, where 66 % of it escapes. For manure that would have stayed on the grass, the gain is the energy from the digester rather than avoided methane.', label: 'What it changes' },
      { problem: 'One cow makes about 38 kg of manure a day, so a 100-cow herd on pasture would need about 150 full trips a day.', title: 'Scale' },
      { fix: 'One drone can only cover part of a farm: a real system needs several, or aims at the places ground machines cannot reach easily. That is where a drone has the advantage: it does not need roads, lanes or a flat barn floor.', label: 'Where it still works' },
      { h: 'Hover power' },
      { calc: 'How much power does it take to hover?',
        given: [
          ['Takeoff weight, the low end of the rating', '36 kg', 'the lift calculation above'],
          ['Prop radius (23 in props), six pairs', '0.2925 m', 'My CAD'],
          ['Air density at sea level', '1.225 kg/m³', '[Engineering ToolBox, standard atmosphere](' + AIR + ')'],
          ['Coaxial penalty; figure of merit', '1.28; 0.7', 'assumed'],
        ],
        work: [
          'Thrust: T = 36 kg x 9.81 m/s² = 353 N',
          'Disc area: A = 6 x π x 0.2925² = 1.61 m²',
          'Ideal induced power: T^1.5 / √(2 ρ A) = 353^1.5 / √(2 x 1.225 x 1.61) = about 3.3 kW',
          'With the coaxial penalty and the figure of merit: 3.3 kW x 1.28 / 0.7 = **about 6.1 kW**. At 60 kg the same model gives about 13 kW',
          'Air time per kilowatt-hour of battery: 60 min x 1 kWh / 6.1 kW = **about 10 minutes**',
        ],
        result: 'Hovering at 36 kg takes about 6 kW, so every kilowatt-hour of battery buys about 10 minutes in the air.',
        note: 'Estimate from momentum theory with the two factors assumed; not a flight test.' },
      { problem: 'Hovering at 36 kg takes roughly 6 kW, so every kilowatt-hour of battery buys only about 10 minutes in the air.', title: 'Flight time' },
      { fix: 'Keep every trip short and put the charger at the depot, where the drone lands anyway after it empties the canister.', label: 'Where it still works' },
      { h: 'Not solved yet' },
      { problem: 'Fresh dairy manure is about 86 % water (ASAE: 12 kg of solids in 86 kg). It is heavy for its volume and messy to vacuum, and the nozzle and duct could clog. The concept does not solve this yet.', title: 'Wet manure' },
    ], media: [
      { i: 'patrol-vacuum.webp', c: 'From the mission above: the drone low over the pasture after its third pat, the canister shown full (the pasture and the fill level are illustrations)' },
      { i: 'cad-side.webp', c: 'My CAD from the side, front to the right: the canister through the body with the vacuum head on top, the duct up the back and the nozzle under it' },
      { i: 'cad-nozzle.webp', c: 'The intake nozzle and the duct at the back of the drone in my CAD' },
    ] },

    // ------------------------------------------------------------------ energy and pollution balance
    // Jerry (Sept 28): compare the electricity and pollution of the drones with the electricity
    // generated and the pollution saved by the whole operation. Inputs: this page's own numbers, cited
    // published values (OMAFRA, EPA eGRID2023, IPCC 2006 and AR6) and two labelled assumptions.
    { type: 'prose', id: 'balance', h: 'Energy in, energy out', p: [
      'The drones run on electricity, and the manure they bring back makes electricity in the digester. For the 100-cow herd above, one day of the whole operation, both ways:',
      { calc: 'Does the manure make more electricity than the drones use?',
        given: [
          ['Herd; manure per cow per day', '100 cows; 38 kg', 'above'],
          ['Manure per full canister', '26 kg', 'above'],
          ['Flying per full canister', '10 min', 'assumed'],
          ['Hover power at 36 kg; at 60 kg', '6.1 kW; 13 kW', 'above, for the whole flight'],
          ['Charging; motors and ESCs', '90 %; 85 % efficient', 'assumed'],
          ['Biogas from dairy manure in a farm digester', '23 m³ per tonne', '[OMAFRA](' + OMAFRA + '), Table 1'],
          ['Methane in the biogas', 'about 60 %', 'OMAFRA'],
          ['Heat in methane', 'about 10 kWh/m³', 'above'],
          ['Engine-generator, biogas to electricity', '35 % (25 to 42 %)', 'OMAFRA'],
        ],
        work: [
          'Manure: 100 x 38 kg = 3,800 kg a day = **146 canisters**; x 10 min = **24.3 hours of flying**, so several drones',
          'Grid power: 6.1 kW / (0.90 x 0.85) = 8.0 kW at 36 kg; 13 kW / 0.765 = 17 kW at 60 kg',
          'Energy in: 24.3 h x 8.0 kW = **194 kWh a day**; at 60 kg, **413 kWh**',
          'Energy out: 3.8 t x 23 m³/t x 0.60 x 10 kWh/m³ x 0.35 = **184 kWh a day**',
          'Out / in: 184 / 194 = **0.95**; at 60 kg, 184 / 413 = **0.45**',
          'Break-even: one canister makes 26 kg x 23 m³/t x 0.60 x 10 kWh/m³ x 0.35 = 1.26 kWh, enough for 1.26 / 8.0 kW = **9.5 minutes** of flying (4.4 at 60 kg)',
        ],
        result: 'The drones use about as much electricity as the manure makes, and twice as much flying heavy. The operation only gains electricity if a full canister takes under about 9.5 minutes of flying.',
        note: 'Estimate: the trip time and efficiencies are assumed, and hover power for the whole flight overstates what the drones use (forward flight takes less). The digester\'s heat, 62 kWh per tonne in the same table, is not counted.' },
      { calc: 'Does it cut more pollution than it causes?',
        given: [
          ['Upstate New York grid (eGRID subregion NYUP), CO2e', '242.8 lb/MWh = 0.110 kg/kWh', '[EPA eGRID2023](' + EGRID + '), Table 1'],
          ['Methane escaping per cow per day: lagoon; pasture', '0.86 m³; 0.013 m³', 'above (IPCC 2006)'],
          ['Mass of methane', '0.67 kg/m³', '[IPCC 2006](' + IPCC + '), Vol. 4, Eq. 10.23'],
          ['Methane\'s 100-year warming potential (non-fossil)', '27 x CO2', '[IPCC AR6 WG1](' + AR6 + '), Table 7.15'],
        ],
        work: [
          'Caused by the drones: 194 kWh x 0.110 = **21 kg of CO2e a day** (45 kg at 60 kg)',
          'Grid power the digester displaces: 184 kWh x 0.110 = 20 kg',
          'Manure bound for a lagoon: 100 x 0.86 m³ x 0.67 kg/m³ x 27 = 1,560 kg, plus 20 = **1,580 kg avoided a day**',
          'Manure that would stay on the grass: 100 x 0.013 m³ x 0.67 kg/m³ x 27 = 23 kg, plus 20 = **43 kg avoided a day**',
          'Avoided / caused: lagoon manure **35 to 75**; pasture manure **1 to 2**',
        ],
        result: 'For manure bound for a lagoon, the operation avoids 35 to 75 times the CO2e its drones cause. For manure that would have stayed on the grass, it about breaks even.',
        note: 'Estimate, rounded. On the US-average grid (770.9 lb/MWh, same table) the drones cause about 3 times as much and the lagoon case is still 11 to 24 times. Leaks from the digester and the digestate storage are not counted, so the avoided figures are upper bounds. The CO2 from burning the biogas is biogenic and, as in IPCC inventories, not counted.' },
      { problem: 'The drones use about as much electricity as the manure they bring back makes, and more when they fly heavy. As a power plant, the operation does not pay.', title: 'Energy balance' },
      { fix: 'Its case is the methane: for manure that would have gone to a lagoon, it avoids tens of times the CO2e it causes. Short trips, with the depot and its charger close to the herd, keep the energy near break-even: under about 9.5 minutes of flying per full canister.', label: 'Where it still works' },
    ], media: [
      { i: 'cad-coax-pair.webp', c: 'Where the electricity goes: one of the six coaxial pairs in my CAD, an upper and a lower motor, each with its 23 in prop' },
      { i: 'patrol-depot.webp', c: 'From the mission above: the drone landed at the depot beside the digester, its generator and the digestate tank (the depot is an illustration; the drone is my CAD)' },
    ] },

    // ------------------------------------------------------------------ verdict
    { type: 'callout', id: 'verdict', h: 'Why it is still worth it', p: [
      'The drone does not need roads, lanes or a flat barn floor. For a lot of places it is much easier to fly an agricultural drone to the site, vacuum, deposit and cycle than to deploy dedicated ground rovers, and the kind of drone this is built on is already made to carry about 10 L of liquid around a farm. The CAD and its versions are in [my repo](' + REPO + ').',
    ] },
  ],
};
