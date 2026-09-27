// The embossing head and the die, driven by the scroll. My team's CAD: the servo turns the arm and
// pin about its output shaft (a real axis from the STEP), and a section cut through the pin's plane
// shows the round nose coming down on its arc into one dimple of the die. The numbers are computed
// from the CAD: the nose is 86 mm from the shaft, 2.3 mm above the die in the CAD pose, touches the
// die at 2.6 degrees and reaches the bottom of the dimple at 3.3 degrees, 4.05 mm further along X.
// The orange arc, the dimension lines and the labels are drawn annotations.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadPrinter, views, partRx, G, ARC, cellX, lineZ, parkFor, noseAt, clamp, smooth, lerp } from './rig.js';

const ACCENT = '#ff6b35';
// one dimple under the pin: cell 8 (+X column), line 5, row 0 of the die
const DX = cellX(8, 1), DZ = lineZ(5, 0);
const PARK = parkFor(DX, DZ); // a small move from the CAD pose: 0.6 mm in X, -1.4 mm in Y
const swingAt = (step, f) => (step === 1 ? ARC.bottom * smooth(0.25, 0.9, f) : step === 2 ? ARC.bottom * (1 - smooth(0.15, 0.45, f) + smooth(0.6, 0.9, f)) : 0);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const P = await loadPrinter(stage);
  const reduced = ctx.reducedMotion;
  const n0 = noseAt(0);

  const V = views(stage, el, {
    head: { box: [[-0.232, 0.306, -0.40], [-0.105, 0.392, -0.30]], azimuth: 208, elevation: 16, pad: 1.05 },
    side: { box: [[DX - 0.0085, G.dieY - 0.0012, DZ - 0.001], [DX + 0.0035, G.dieY + 0.0048, DZ + 0.001]], azimuth: 180, elevation: 0, pad: 1.1 },
    die: { box: [[cellX(6, 0) - 0.003, G.dieY, lineZ(5, 0) - 0.003], [cellX(11, 1) + 0.012, G.dieY, lineZ(6, 2) + 0.006]], azimuth: 0, elevation: 76, pad: 1.08 },
  });
  const CAM = ['head', 'side', 'side', 'die'];

  // section through the pin's plane (keeps z >= DZ), for the side views
  const cut = stage.sectionPlane([0, 0, 1], 1);

  // drawn annotations: the nose's arc, and dimension lines
  const lineMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
  const dimMat = new THREE.LineBasicMaterial({ color: '#f3efe9', transparent: true, opacity: 0 });
  const zA = DZ - 0.00005; // just in front of the cut, toward the camera
  const arcPts = [];
  for (let i = 0; i <= 48; i++) { const n = noseAt((ARC.bottom * 1.05 * i) / 48); arcPts.push(new THREE.Vector3(n[0] + PARK.x, n[1], zA)); }
  const arc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(arcPts), lineMat);
  const seg = (pts, mat) => new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p))), mat);
  // 4.05 mm: raised nose centre to the dimple centre, drawn just above the die
  const yD = G.dieY + 0.0042, x0 = n0[0] + PARK.x, x1 = DX;
  const shiftDim = seg([[x0, yD, zA], [x1, yD, zA], [x0, yD - 0.0004, zA], [x0, yD + 0.0004, zA], [x1, yD - 0.0004, zA], [x1, yD + 0.0004, zA]], dimMat);
  // die dimensions (top view): dot pitch, cell pitch, line pitch, group of three
  const y1 = G.dieY + 0.0003;
  const dieMat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
  // below line 6, and the line pitch to the right of cell 11
  const zB = lineZ(6, 2) + 0.0022, xR = cellX(11, 1) + 0.0024;
  const dieDims = seg([
    [cellX(9, 0), y1, zB], [cellX(9, 1), y1, zB], // 2.34 mm
    [cellX(6, 0), y1, zB + 0.0014], [cellX(7, 0), y1, zB + 0.0014], // 6.22 mm
    [cellX(8, 0), y1, zB + 0.0014], [cellX(9, 0), y1, zB + 0.0014], // 8.56 mm
    [cellX(6, 0), y1, zB + 0.0028], [cellX(9, 0), y1, zB + 0.0028], // 21 mm
    [xR, y1, lineZ(5, 0)], [xR, y1, lineZ(6, 0)], // 10 mm
  ], dieMat);
  P.model.add(arc, shiftDim, dieDims);
  for (const o of [arc, shiftDim, dieDims]) o.frustumCulled = false;

  const ov = labelLayer(stage);
  const L = {
    servo: ov.label('Servo (DS3225MG in our CAD)', [-0.13, 0.388, -0.345], { color: '#fff1e2' }),
    shaft: ov.label('Servo shaft: the arm pivots here', [G.axis[0], G.axis[1], -0.37], { color: '#fff1e2', side: 'l' }),
    arm: ov.label('Arm', [-0.195, 0.352, -0.38], { color: '#fff1e2', side: 'l' }),
    pin: ov.label('Pin: round nose, 1.6 mm across', [-0.2145, 0.316, -0.38], { color: ACCENT, side: 'l' }),
    raised: ov.label('Start: 2.3 mm above the die', [x0, n0[1] + 0.0009, zA], { color: '#fff1e2', side: 'l' }),
    shift: ov.label('4.05 mm sideways', [(x0 + x1) / 2, yD + 0.0003, zA], { color: '#fff1e2' }),
    dimple: ov.label('Dimple: 1.6 mm across, 0.6 mm deep', [DX, G.dieY - 0.0006, zA], { color: ACCENT }),
    d1: ov.label('2.34 mm, dot to dot', [cellX(9, 1), y1, zB], { color: '#fff1e2', minW: 520 }),
    d2: ov.label('6.22 mm, cell to cell', [cellX(6, 0), y1, zB + 0.0014], { color: '#fff1e2', side: 'l', minW: 520 }),
    d5: ov.label('8.56 mm between groups', [cellX(9, 0), y1, zB + 0.0014], { color: '#fff1e2', minW: 520 }),
    d3: ov.label('21 mm: a group of three cells', [cellX(9, 0), y1, zB + 0.0028], { color: '#fff1e2' }),
    d4: ov.label('10 mm, line to line', [xR, y1, (lineZ(5, 0) + lineZ(6, 0)) / 2], { color: '#fff1e2', side: 'l' }),
  };
  const SHOW = [['servo', 'shaft', 'arm', 'pin'], ['raised', 'dimple'], ['raised', 'shift'], ['d1', 'd2', 'd3', 'd4', 'd5']];

  // the readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.style.width = 'min(270px, calc(100% - 28px))';
  hud.innerHTML = `
    <div class="rx-hud-row"><span>Servo angle</span><b class="num" data-k="a"></b><i><em data-k="bar"></em></i></div>
    <div class="rx-hud-row" style="margin-top:8px"><span>Nose, above the die</span><b class="num" data-k="h"></b></div>
    <div class="rx-hud-row" style="margin-top:4px"><span>Moved sideways</span><b class="num" data-k="s"></b></div>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, v, fn = (n, x) => { n.textContent = x; }) => { if (shown[k] !== v) { shown[k] = v; fn(K[k], v); } };

  const setA = (m, a) => { if (Math.abs(m.opacity - a) > 0.004) { m.opacity = a; m.visible = a > 0.01; stage.invalidate(false); } };

  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, CAM.length - 1);
    stage.setShift(...ctx.shift());
    const k = reduced || step === 0 ? 1 : smooth(0, 0.45, stepP);
    V.place(CAM[Math.max(0, step - 1)], CAM[step], k, reduced ? 0 : (stepP - 0.5) * (step === 1 || step === 2 ? 0.0 : 0.06));

    // the head lines up over the dimple in step 0, then swings
    const line = step === 0 ? smooth(0.5, 0.95, stepP) : 1;
    const a = swingAt(step, stepP);
    // for the die close-up the gantry moves off along Y, clear of the camera
    const away = step === 3 ? smooth(0, 0.35, stepP) : 0;
    P.set({ x: PARK.x * line, y: lerp(PARK.y * line, 0.1, away), a });

    // the cut comes in for the side views
    const cutK = step === 1 ? smooth(0.0, 0.4, stepP) : step === 2 ? 1 : step === 3 ? 1 - smooth(0, 0.3, stepP) : 0;
    cut.set(cutK > 0.001 ? -lerp(DZ - 0.09, DZ, cutK) : 1); // keeps z >= the cut; parked, nothing is cut

    setA(lineMat, step === 1 ? 0.95 * smooth(0.3, 0.5, stepP) : step === 2 ? 0.95 : 0);
    setA(dimMat, step === 2 ? smooth(0.25, 0.45, stepP) : 0);
    setA(dieMat, step === 3 ? smooth(0.4, 0.6, stepP) : 0);

    for (const [key, l] of Object.entries(L)) {
      const on = SHOW[step].includes(key), was = step > 0 && SHOW[step - 1].includes(key);
      l.a = on ? (was ? 1 : smooth(0.35, 0.6, stepP)) : 0;
    }
    ov.update();

    const n = noseAt(a), deg = (a * 180) / Math.PI;
    put('a', `${deg.toFixed(2)}°`);
    put('bar', `${((a / ARC.bottom) * 100).toFixed(1)}%`, (node, v) => { node.style.width = v; });
    const h = (n[1] - G.noseR - G.dieY) * 1000;
    put('h', h >= 0 ? `${h.toFixed(2)} mm` : `${h.toFixed(2)} mm (in the dimple)`);
    put('s', `${((n[0] - n0[0]) * 1000).toFixed(2)} mm`);
    put('mini', `${deg.toFixed(2)}°, ${h.toFixed(2)} mm, ${((n[0] - n0[0]) * 1000).toFixed(2)} mm sideways`);
    put('hud', step === 1 || step === 2 ? '1' : '0', () => { hud.style.opacity = shown.hud; });
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
