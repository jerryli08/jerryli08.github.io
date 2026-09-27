// Version one (HDF plates) to version two (G10 lattice), scroll-driven, from Jerry's two CAD files.
// Both files put the car's middle at the same place along its length, so the V1 car is the V2 car
// with 50 mm more at each end; V1 is lifted 41.5 mm so both stand on one ground. V1's plates are
// tinted brown like the real HDF (the CAD file draws them black); its STM32 Nucleo board is left
// out of the web model (tools/cad/configs/electric-vehicle-prototype.json), as are the screws.
// Steps (u = step + progress through it):
//   0 V1 whole                         3 both: V1 as a ghost over V2, with the two wheelbases
//   1 V1 with its top plate cut away   4 V2 from above, top plate back on: the G10 lattice
//   2 V2, cut the same way
// Views are framed once, at rest, on the bigger V1 (so V2 reads shorter in the same frame) and
// blended; every picture is a pure function of the scroll position.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { M, blendViews, clamp, smooth, lerp } from './rig.js';

const ORANGE = '#ff6b35', BLUE = '#3d8bff', PURPLE = '#a78bfa', V1C = '#d9a066', V2C = '#9ec5ff';
const LIFT = 0.0415;
const PARK = 5, CUT = 0.0826, ABOVE = 0.14; // keeps y <= c: CUT drops both top plates (83.5 to 85.5 mm)
const DEG = Math.PI / 180;
// per step: opacity of each version, the cut, and which parts are lit
const STEPS = [
  { v1: 1, v2: 0, cut: PARK },
  { v1: 1, v2: 0, cut: CUT, lit: [['v1', 'motors', ORANGE], ['v1', 'boards', PURPLE]] },
  { v1: 0, v2: 1, cut: CUT, lit: [['v2', 'motor', ORANGE], ['v2', 'belts', BLUE], ['v2', 'encoder', PURPLE]] },
  { v1: 0.26, v2: 1, cut: CUT, dims: 1 },
  { v1: 0, v2: 1, cut: PARK },
];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const blend = blendViews(stage);
  const [v1, v2] = await Promise.all([stage.load(`${M}/prototype.glb`), stage.load(`${M}/final.glb`)]);
  v1.position.y = LIFT; v1.updateMatrixWorld(true);
  stage.fitGround();

  // every mesh gets its own copy of its materials, so each version fades and each part lights up alone
  const own = (obj) => {
    const mats = [];
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.material = [].concat(o.material).map((m) => { const c = stage.cloneMaterial(m); mats.push(c); return c; });
      if (o.material.length === 1) o.material = o.material[0];
    });
    return mats;
  };
  const mats1 = own(v1), mats2 = own(v2);
  for (const m of mats2) { m.alphaHash = true; m.needsUpdate = true; } // V2 dissolves without sorting trouble
  const P1 = (re) => stage.part(re, v1), P2 = (re) => stage.part(re, v2);
  // the plate body's pure black material (CAD 0, 0, 0; the stage lifts it to about 2 %) is the two
  // HDF plates: brown like the real hardboard
  for (const o of P1(/_0_1_1_98_$/)) o.traverse((m) => {
    if (!m.isMesh) return;
    const hdf = [].concat(m.material)[0];
    if (hdf?.color && Math.max(hdf.color.r, hdf.color.g, hdf.color.b) < 0.03) {
      hdf.color.set('#6e4a2c'); hdf.roughness = 0.8; hdf.metalness = 0;
      hdf.bumpMap = null; hdf.roughnessMap = null; hdf.needsUpdate = true; // hardboard, not printed plastic
    }
  });
  const parts = {
    v1: {
      motors: [...P1(/Corps_sup_rieur/), ...P1(/Spur_Gear_8_teeth/), ...P1(/Spur_Gear_48_teeth/)],
      boards: [...P1(/basetta_lcd|LCD_screen/), ...P1(/mt6701_mockup|MT6701_Mount/)],
    },
    v2: {
      motor: [...P2(/Corps_sup_rieur/), ...P2(/Spur_Gear_8_teeth/), ...P2(/Spur_Gear_48_teeth/)],
      belts: [...P2(/1140_2GT_6_for_ev/), ...P2(/47t_gt2_7mm_pulley/)],
      encoder: [...P2(/Spur_Gear_40_teeth/), ...P2(/mt6701_mockup|MT6701_Mount/), ...P2(/1501_0006_0100/)],
    },
  };
  const matsOf = (list) => { const out = []; for (const p of list) p.traverse((o) => { if (o.isMesh) out.push(...[].concat(o.material)); }); return out; };
  const litMats = STEPS.map((s) => (s.lit || []).map(([v, key, color]) => ({ mats: matsOf(parts[v][key]), color: new THREE.Color(color).multiplyScalar(0.55) })));
  const cut = stage.sectionPlane([0, -1, 0], PARK); // after the copies, so they all get the cut's caps

  // the two wheelbases: thin dimension lines on the floor beside the -X wheels, axle centre to axle centre
  const dim = (z0, z1, x, color) => {
    const g = new THREE.BufferGeometry().setFromPoints([[x, z0], [x, z1], [x - 0.012, z0], [x + 0.012, z0], [x - 0.012, z1], [x + 0.012, z1]].map(([a, z]) => new THREE.Vector3(a, 0.028, z)));
    g.setIndex([0, 1, 2, 3, 4, 5]);
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, toneMapped: false, transparent: true, opacity: 0 }));
    l.visible = false;
    stage.scene.add(l);
    return l;
  };
  const dims = [dim(-0.3005, 0.3226, -0.215, V1C), dim(-0.2505, 0.2726, -0.195, V2C)];

  // labels (annotations), per step
  const ov = labelLayer(stage);
  const c = (list) => stage.bounds(list).center.toArray();
  const bells = P1(/Corps_sup_rieur/).map((b) => ({ b, z: stage.bounds(b).center.z }));
  const L = [
    [],
    [...bells.map(({ b, z }) => ov.label(z > 0 ? 'Rear motor, the MT6701 on its shaft' : 'Front motor', c(b), { color: ORANGE, side: 'l' })),
      ov.label('16x2 LCD', c(P1(/basetta_lcd/)), { color: PURPLE, side: 'l', minW: 560 })],
    [ov.label('One D2830', c(P2(/Corps_sup_rieur/)), { color: ORANGE }),
      ov.label('GT2 belt to the front axle', [-0.0636, 0.078, 0.02], { color: BLUE, side: 'l' }),
      ov.label('Encoder on a 40T gear', c(P2(/Spur_Gear_40_teeth/)), { color: PURPLE, side: 'l', minW: 560 })],
    [ov.label('V1 wheelbase 623 mm', [-0.215, 0.028, 0.0111], { color: V1C, side: 'l' }),
      ov.label('V2 wheelbase 523 mm', [-0.195, 0.028, 0.0111], { color: V2C })],
    [],
  ];

  // views, framed once per stage shape (V1 frames steps 0 to 3, V2 the top view)
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const V = (obj, o) => stage.frame(obj, { ...o, apply: false, refresh: true });
    const top = V(v2, { azimuth: 90, elevation: 84, pad: 1.4 });
    views = [
      V(v1, { azimuth: 322, elevation: 24, pad: 0.96 }),
      V(v1, { azimuth: 332, elevation: 34, pad: 0.98 }),
      V(v1, { azimuth: 332, elevation: 34, pad: 0.98 }),
      V(v1, { azimuth: 296, elevation: 34, pad: 1.0 }),
      top,
    ];
    return views;
  }

  const fadeState = new Map();
  function setOpacity(mats, obj, a, hash) {
    if (fadeState.get(obj) === a) return;
    fadeState.set(obj, a);
    obj.visible = a > 0.004;
    for (const m of mats) {
      if (hash) m.opacity = a;
      else {
        const t = a < 0.999;
        if (m.transparent !== t) { m.transparent = t; m.depthWrite = !t; m.needsUpdate = true; }
        m.opacity = a;
      }
    }
    obj.traverse((o) => { if (o.isMesh) o.castShadow = a > 0.5; });
    stage.invalidate();
  }
  const blank = new THREE.Color(0);
  let tinted = new Set();
  function tint(list) { // [{ mats, color, k }]
    const now = new Set();
    for (const { mats, color, k } of list) for (const m of mats) if (m.emissive) { now.add(m); m.emissive.copy(blank).lerp(color, k); }
    for (const m of tinted) if (!now.has(m)) m.emissive.copy(blank);
    tinted = now;
    stage.invalidate(false);
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, STEPS.length - 1);
    const prev = Math.max(0, step - 1);
    const S = STEPS[step], A = STEPS[prev];
    const sp = reduced ? 0.5 : clamp(stepP, 0, 1);
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    stage.setShift(...ctx.shift());
    const vs = viewsNow();
    const drift = (reduced ? 0 : 8 * DEG);
    stage.setView(blend(vs[prev], vs[step], k, step === 0 ? drift * sp : lerp(drift, drift * sp, k)));
    setOpacity(mats1, v1, lerp(A.v1, S.v1, k), false);
    setOpacity(mats2, v2, lerp(A.v2, S.v2, k), true);
    // the cut sweeps down from above the car, or back up out of it
    const cA = A.cut === PARK ? ABOVE : A.cut, cB = S.cut === PARK ? ABOVE : S.cut;
    const cv = lerp(step === 0 ? cB : cA, cB, k);
    cut.set(cv >= ABOVE - 1e-6 ? PARK : cv);
    tint([...litMats[step].map((t) => ({ ...t, k })), ...(step !== prev ? litMats[prev].map((t) => ({ ...t, k: 1 - k })) : [])]);
    const d = lerp(A.dims || 0, S.dims || 0, k);
    if (d !== dims[0].material.opacity) { for (const l of dims) { l.visible = d > 0.01; l.material.opacity = d; } stage.invalidate(); }
    L.forEach((ls, i) => {
      const s = i === step ? (step === 0 ? 1 : smooth(0.5, 1, k)) : i === prev && step !== prev ? 1 - smooth(0, 0.5, k) : 0;
      for (const l of ls) l.a = s;
    });
    ov.update();
  }
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() {
      ov.dispose();
      for (const l of dims) { l.geometry.dispose(); l.material.dispose(); stage.scene.remove(l); }
      stage.dispose();
    },
  };
}
