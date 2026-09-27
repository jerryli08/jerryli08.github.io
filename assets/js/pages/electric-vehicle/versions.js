// Version one (HDF plates) and version two (G10 lattice) of the car, from Jerry's two CAD files.
// Both files put the car's middle at the same place along its length, so the V1 car is the V2 car
// with 50 mm more at each end; V1 is lifted 41.5 mm so both stand on one ground. Picks light up
// what changed: V1's two motors and its STM32 Nucleo and LCD; V2's one motor and its two belts.
// V1's plates are tinted brown like the real HDF (the CAD file draws them grey). The top plates
// start cut away (a section plane) so the motors, gears and boards between the plates show.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented } from '/assets/js/lib/ui.js';
import { M, partsOf, fade, labels, chip } from './rig.js';

const ORANGE = '#ff6b35', BLUE = '#3d8bff', PURPLE = '#a78bfa';
const LIFT = 0.0415;

export async function mount(el, ctx) {
  const stage = createStage(el);
  const { THREE } = stage;
  const v2 = await stage.load(`${M}/final.glb`);
  const p2 = partsOf(stage, v2);
  const labs = labels(el);
  const info = chip(el, { left: '14px', top: '14px' });
  let v1 = null, p1 = null, v1Loading = null;
  const loadV1 = () => v1Loading || (v1Loading = stage.load(`${M}/prototype.glb`).then((m) => {
    v1 = m; v1.position.y = LIFT; v1.updateMatrixWorld(true);
    const P = (re) => stage.part(re, v1);
    p1 = {
      motors: P(/D2830_BLDC_Motor/), nucleo: P(/NUCLEO_F446RE/), lcd: P(/_LCD_1/), plates: P(/_0_1_1_98_$/),
      axles: P(/Carbon_Fiber_Axle_Rod/),
    };
    // the plate body's first material is the two HDF plates: brown like the real hardboard
    for (const o of p1.plates) o.traverse((m) => {
      if (!m.isMesh) return;
      const mats = [].concat(m.material);
      if (mats[0]?.color && mats[0].color.getHex() === 0x000000) {
        const hdf = mats[0].clone();
        hdf.color.set('#6e4a2c'); hdf.roughness = 0.8; hdf.metalness = 0;
        m.material = Array.isArray(m.material) ? [hdf, ...mats.slice(1)] : hdf;
      }
    });
    stage.fitGround();
    return m;
  }));

  // wheelbase marks: a thin dimension line on the floor beside the -X wheels, axle centre to axle centre
  const mkLine = (z0, z1, y, color, x = color === '#d9a066' ? -0.215 : -0.195) => {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, y, z0), new THREE.Vector3(x, y, z1),
      new THREE.Vector3(x - 0.012, y, z0), new THREE.Vector3(x + 0.012, y, z0), new THREE.Vector3(x - 0.012, y, z1), new THREE.Vector3(x + 0.012, y, z1)]);
    g.setIndex([0, 1, 2, 3, 4, 5]);
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, toneMapped: false }));
    stage.scene.add(l);
    return l;
  };
  const wb1 = mkLine(-0.3005, 0.3226, 0.028, '#d9a066');
  const wb2 = mkLine(-0.2505, 0.2726, 0.028, '#9ec5ff');

  // the top plates can be cut away to show what sits between the plates (both top plates sit at
  // y 83.5 to 85.5 mm once V1 is lifted onto V2's ground); new and cloned materials are prepared
  // for the cut by switching it off and on again
  const PARK = 5;
  const cut = stage.sectionPlane([0, -1, 0], PARK);
  let cutOn = true;
  const applyCut = () => { cut.enable(false); cut.enable(true); cut.set(cutOn ? 0.0826 : PARK); };
  let unlight = [];
  const clearLights = () => { unlight.forEach((f) => f()); unlight = []; };
  const lit = (list, color, k = 0.5) => { if (list.length) unlight.push(stage.highlight(list, color, { intensity: k })); };

  async function show(which) {
    if (which !== 'v2') await loadV1();
    clearLights();
    v2.visible = which !== 'v1';
    if (v1) v1.visible = which !== 'v2';
    if (v1) fade([v1], which === 'both' ? 0.28 : 1);
    wb1.visible = which !== 'v2'; wb2.visible = which !== 'v1';
    if (which === 'v1') { lit(p1.motors, ORANGE, 1); lit([...p1.nucleo, ...p1.lcd], PURPLE, 0.75); }
    if (which === 'v2') { lit([...p2.rotor, ...p2.stator, ...p2.pinion], ORANGE, 0.9); lit(p2.belts, BLUE, 0.6); }
    applyCut();
    const L = [];
    if (which !== 'v2') L.push({ text: 'V1 wheelbase 623 mm', p: [-0.215, 0.028, 0.0111], side: 'l', color: '#d9a066' });
    if (which !== 'v1') L.push({ text: 'V2 wheelbase 523 mm', p: [-0.195, 0.028, 0.0111], side: 'r', color: '#9ec5ff' });
    labs.set(L);
    info.set(which === 'v1' ? 'Version one: HDF plates, two motors (orange), STM32 Nucleo and LCD (purple)'
      : which === 'v2' ? 'Version two: G10 lattice, one motor (orange), two belts to the front axle (blue)'
        : 'Version two, with version one as a ghost: 50 mm more at each end');
    stage.frame(which === 'v2' ? v2 : v1, { azimuth: 322, elevation: 26, pad: which === 'both' ? 0.9 : 0.86, duration: 0 });
    stage.invalidate();
  }
  // keep the labels on their points while the reader orbits
  const onChange = () => labs.update(stage.camera, THREE);
  stage.controls?.addEventListener('change', onChange);
  const ro = new ResizeObserver(() => requestAnimationFrame(onChange));
  ro.observe(el);

  segmented(ctx.panel, {
    label: 'Version', value: 'v2',
    options: [{ value: 'v1', label: 'Version one (HDF)' }, { value: 'v2', label: 'Version two (G10)' }, { value: 'both', label: 'Both' }],
    onChange: (v) => { show(v).then(onChange).catch((e) => console.error(e)); },
  });
  segmented(ctx.panel, {
    label: 'Top plate', value: true,
    options: [{ value: true, label: 'Cut away' }, { value: false, label: 'On' }],
    onChange: (v) => { cutOn = v; applyCut(); },
  });
  await show('v2');
  onChange();
  return {
    dispose() {
      ro.disconnect(); stage.controls?.removeEventListener('change', onChange);
      labs.dispose(); info.dispose();
      for (const l of [wb1, wb2]) { l.geometry.dispose(); l.material.dispose(); stage.scene.remove(l); }
      stage.dispose();
    },
  };
}
