// "Stowed for the start, deployed to play", scroll-driven: a side view from the roller motor side
// with the parts outside the belts cut away. Scrolling swings the intake arm about its real pivot
// axis (rig.js) from the deployed pose the CAD is modelled in up to the stowed angle, 132 degrees,
// where every part of the arm is behind the inner face of the bumper wood; the sprung top hopper
// panel folds forward about its own live joint on the way (rig.foldFor, checked clear of the
// shooters and the transfer on the CAD). It replaces the slider demo; there is nothing to drag.
//
// The readout is measured live: the two belt centre distances, between the pulley centres (they
// never change, because the middle pulley is on the pivot axis), how far the front of the arm is
// past the inner face of the bumper wood (FRONT, measured on the CAD's triangles for every degree),
// and the top panel's fold. The picture is a pure function of the scroll; the camera is framed once.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, AX, FLOOR, STOW, WOOD_Z, foldFor, onPanel, DEG } from './rig.js';

// mm from the inner face of the front bumper wood to the frontmost point of the arm, for every
// whole degree of stow swing, 0 to 132; negative is inside. (The top panel folds only after 106
// degrees, when it is far behind the wood, so its fold does not change these.)
const FRONT = [301.0, 300.3, 299.5, 298.6, 297.6, 296.4, 295.3, 294.1, 292.8, 291.4, 289.9, 288.2, 286.5, 284.7, 282.7, 280.7, 278.5, 276.3, 273.9, 274.2, 274.9, 275.4, 275.9, 276.2, 276.5, 276.6, 276.7, 276.6, 276.4, 276.2, 275.8, 275.4, 275.0, 274.4, 273.7, 273.0, 272.1, 271.1, 270.1, 268.9, 267.7, 266.3, 264.9, 263.3, 261.8, 260.1, 258.4, 256.5, 254.6, 252.6, 250.4, 248.2, 245.9, 243.5, 241.0, 238.5, 235.9, 233.2, 230.5, 227.6, 224.7, 221.7, 218.6, 215.5, 212.2, 208.9, 205.5, 202.0, 198.5, 194.9, 191.3, 187.6, 183.8, 179.9, 177.0, 175.4, 173.8, 172.1, 170.4, 168.5, 166.7, 164.7, 162.7, 160.7, 158.6, 156.4, 154.1, 151.8, 149.4, 147.0, 144.5, 142.0, 139.4, 136.7, 134.0, 131.2, 128.4, 125.6, 122.6, 119.7, 116.7, 113.6, 110.5, 107.3, 104.1, 100.8, 97.5, 94.1, 90.8, 87.4, 83.9, 80.4, 76.9, 73.3, 69.7, 66.0, 62.4, 58.6, 54.9, 51.1, 47.3, 43.5, 39.6, 35.8, 31.9, 27.9, 24.0, 20.0, 16.0, 12.0, 8.0, 3.9, -0.1];
const MAX = Math.round(-STOW / DEG); // 132

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

// swing (degrees up) at the end of each step: deployed, stowing with the belts, the top panel, stowed
const AT = [0, 95, 122, MAX];
// the last step's text only gets about two thirds of the way up the screen, so it finishes early
const swingAt = (step, q) => (step === 0 ? 0 : lerp(AT[step - 1], AT[step], smooth(0.08, step === AT.length - 1 ? 0.5 : 0.9, q)));

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const rig = await loadRobot(stage);
  const reduced = !!ctx.reducedMotion;
  const cut = stage.sectionPlane([1, 0, 0], 0.002); // keeps x >= -0.002: the belt side, outer plates removed
  rig.fixClear();
  stage.highlight(rig.parts('motorBelt', 'rollerBelt'), '#ff6b35', { intensity: 0.6 });
  // the top panel is clear polycarbonate: drawn a little more solid here, and blue, so its fold reads
  const panelMat = new THREE.MeshPhysicalMaterial({ color: '#a9cdf5', roughness: 0.2, metalness: 0, transparent: true, opacity: 0.62, depthWrite: false });
  panelMat.userData.clear = true;
  for (const f of rig.parts('fold')) f.traverse((m) => { if (m.isMesh && m.material?.userData?.clear) m.material = panelMat; });
  stage.highlight(rig.parts('fold'), '#8fc3ff', { intensity: 0.45 });
  rig.fixClear();

  // views, each framed once on a fixed box (never on a moving part), cached per stage shape:
  // the side elevation from the roller motor side for the belts and the bumper line, and a view from
  // above and behind while the top panel folds over the shooters (the side plates hide it side on)
  const V = (y, z) => new THREE.Vector3(-0.01, y, z);
  const box = (min, max) => { const m = new THREE.Mesh(new THREE.BoxGeometry(max[0] - min[0], max[1] - min[1], max[2] - min[2])); m.position.set((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2); return m; };
  const SIDE = box([-0.01, -0.12, -0.77], [-0.01, 0.72, 0.43]);
  const TOP = box([-0.02, 0.12, -0.74], [0.6, 0.62, 0.12]);
  const VIEWS = [
    { obj: SIDE, dir: [-Math.cos(5 * DEG), Math.sin(5 * DEG), 0.1], pad: 1.0 },
    { obj: SIDE, dir: [-Math.cos(5 * DEG), Math.sin(5 * DEG), 0.1], pad: 1.0 },
    { obj: TOP, azimuth: -122, elevation: 36, pad: 1.0 },
    { obj: SIDE, dir: [-Math.cos(16 * DEG), Math.sin(16 * DEG), 0.12], pad: 1.0 },
  ];
  let views = null, aspect = 0;
  const sph = (v) => { const s = new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)); return { t: v.target.clone(), s }; };
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || a !== aspect) {
      aspect = a;
      views = VIEWS.map((v) => sph(stage.frame(v.obj, { dir: v.dir, azimuth: v.azimuth, elevation: v.elevation, pad: v.pad, apply: false, refresh: true })));
    }
    return views;
  }
  const sp = new THREE.Spherical();
  function place(a, b, k) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sp).add(target), target });
  }

  // annotations: centre lines between the pulley centres, and the inner face of the bumper wood
  const mat = new THREE.LineBasicMaterial({ color: '#ffd2bd', depthTest: false, transparent: true, opacity: 0.9 });
  const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const line = new THREE.Line(geo, mat); line.renderOrder = 10; stage.scene.add(line);
  const woodMat = new THREE.LineDashedMaterial({ color: '#8fc3ff', dashSize: 0.015, gapSize: 0.01, depthTest: false, transparent: true });
  const wood = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(FLOOR, WOOD_Z), V(0.7, WOOD_Z)]), woodMat);
  wood.computeLineDistances(); wood.renderOrder = 10; stage.scene.add(wood);

  const motor = V(AX.motor[0], AX.motor[1]), pivot = V(AX.pivot[0], AX.pivot[1]), roller0 = V(AX.roller[0], AX.roller[1]);
  const X = new THREE.Vector3(1, 0, 0);
  const rollerNow = new THREE.Vector3();

  const ov = labelLayer(stage);
  const L = {
    motor: ov.label('Motor pulley, 12T', motor.toArray(), { color: '#fff1e2', side: 'l' }),
    pivot: ov.label('Pivot axis, two 24T pulleys', pivot.toArray(), { color: '#fff1e2', side: 'l' }),
    roller: ov.label('Roller pulley, 24T', roller0.toArray(), { color: '#fff1e2', side: 'l' }),
    panel: ov.label('Top panel', [0, 0, 0], { color: '#8fc3ff', side: 'l' }),
    wood: ov.label('Inner face of the bumper wood', V(0.64, WOOD_Z).toArray(), { color: '#8fc3ff', side: 'l', minW: 520 }),
  };

  // the readout
  const hud = document.createElement('div');
  // compact on every screen (the one-line belts summary instead of the table), so on desktop the
  // readout ends above the step cards that run down the same left edge
  hud.className = 'rx-hud frc-stow-hud';
  const hudCss = document.createElement('style');
  hudCss.textContent = '.frc-stow-hud table { display: none; } .frc-stow-hud .rx-hud-mini { display: block; margin-top: 4px; color: var(--text); font-weight: 600; } .frc-stow-hud .rx-hud-big { margin-top: 6px; padding-top: 6px; }';
  ov.layer.append(hudCss);
  ov.layer.append(hud);
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Arm swing</span><b class="num" data-k="a"></b><i><em data-k="aBar"></em></i></div>
    <table class="num"><tbody>
      <tr><td>Belt 1 centres <small>motor to pivot</small></td><td data-k="d1"></td></tr>
      <tr><td>Belt 2 centres <small>pivot to roller</small></td><td data-k="d2"></td></tr>
      <tr><td>Top panel <small>folded forward</small></td><td data-k="f"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>
    <div class="rx-hud-row rx-hud-big"><span>Front of the arm past the bumper wood</span><b class="num" data-k="front"></b></div>`;
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  const bar = (k, f) => { const w = `${(f * 100).toFixed(1)}%`; if (shown[k] !== w) { K[k].style.width = w; shown[k] = w; } };
  const swingText = (deg) => (deg >= MAX - 0.05 ? `${MAX}°, stowed` : deg <= 0.05 ? '0°, deployed' : `${Math.round(deg)}° up`);

  // desktop: the readout shares the left edge with the step cards, so it goes above the active
  // card when there is room, below it otherwise, and top right only when neither fits
  const sec = el.closest('.rx-scrolly') || el.closest('section');
  let hudAt = '';
  function placeHud(step, phone) {
    let at = 'phone';
    if (!phone) {
      const card = sec?.querySelectorAll('.rx-step-card')[step];
      const L = ov.layer.getBoundingClientRect(), h = hud.offsetHeight, gap = 12;
      const r = card ? card.getBoundingClientRect() : null;
      if (!r || r.top >= L.top + 14 + h + gap || r.bottom <= L.top + 14) at = 'tl';
      else if (r.bottom + gap + h <= L.bottom - 14) at = 'bl';
      else at = 'tr';
    }
    if (at === hudAt) return;
    hudAt = at;
    const S = { phone: ['', '', '', ''], tl: ['14px', 'auto', '14px', 'auto'], bl: ['auto', '14px', '14px', 'auto'], tr: ['14px', 'auto', 'auto', '14px'] }[at];
    Object.assign(hud.style, { top: S[0], bottom: S[1], left: S[2], right: S[3] });
  }

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, AT.length - 1);
    const q = reduced ? 1 : clamp(stepP, 0, 1);
    const phone = el.clientWidth < 640;
    stage.setShift(phone ? 0 : 0.03, phone ? -0.07 : -0.04);
    placeHud(step, phone);
    const v = viewsNow(), prev = Math.max(0, step - 1);
    place(v[prev], v[step], step === 0 || reduced ? 1 : smooth(0, 0.45, stepP));

    const deg = swingAt(step, q);
    const a = -deg * DEG, f = foldFor(a);
    rig.setArm(a, f);
    // the roller keeps turning while the arm swings (its belts never change length)
    rig.setRoller(reduced ? 0 : 3 * (step + clamp(stepP, 0, 1)));

    rollerNow.copy(roller0).sub(pivot).applyAxisAngle(X, a).add(pivot);
    const pos = geo.attributes.position;
    pos.setXYZ(0, motor.x, motor.y, motor.z); pos.setXYZ(1, pivot.x, pivot.y, pivot.z); pos.setXYZ(2, rollerNow.x, rollerNow.y, rollerNow.z);
    pos.needsUpdate = true; geo.computeBoundingSphere();
    stage.invalidate(false);

    const i = clamp(deg, 0, MAX), lo = Math.floor(i), hi = Math.min(MAX, lo + 1);
    const front = FRONT[lo] + (FRONT[hi] - FRONT[lo]) * (i - lo);
    const d1 = motor.distanceTo(pivot) * 1000, d2 = pivot.distanceTo(rollerNow) * 1000;
    put('a', swingText(deg)); bar('aBar', deg / MAX);
    put('d1', `${d1.toFixed(1)} mm`); put('d2', `${d2.toFixed(1)} mm`);
    put('f', `${Math.round(f / DEG)}°`);
    put('front', front <= 0 ? 'Inside' : `${Math.round(front)} mm`);
    put('mini', `Belts ${d1.toFixed(1)} and ${d2.toFixed(1)} mm, top panel ${Math.round(f / DEG)}°`);

    L.roller.p.copy(rollerNow);
    const [py, pz] = onPanel(0.47, 0.343, a);
    L.panel.p.set(-0.01, py, pz);
    for (const l of Object.values(L)) l.a = 1;
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); cut.remove(); mat.dispose(); geo.dispose(); woodMat.dispose(); panelMat.dispose(); for (const b of [SIDE, TOP]) { b.geometry.dispose(); b.material.dispose(); } stage.dispose(); } };
}
