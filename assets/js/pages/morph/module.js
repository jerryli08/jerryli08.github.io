// Scrolly: one module from our CAD (my teammates designed it), turned by the scroll. The green half
// turns about the body diagonal, the cut plane's normal through the cube centre, in 120 degree steps.
// Readouts are computed from the CAD: the servo shaft and encoder counts from the 4:1 reduction
// (5,461 counts per 120 degree step), and how far the green half reaches past the cube mid-turn,
// measured on the CAD's vertices as it turns (the same measure the old demo used).
// Steps: 0 at rest, 1 turning to 60 degrees (the sweep), 2 on to +120, 3 the next cube: -120, 0 and
// +120 send it three different ways. Every picture is a pure function of (step, stepP).
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { ROLL } from './kin.js';
import { MODEL, TURNING, cubeOutline, matte } from './chain3d.js';

const DEG = Math.PI / 180;
const S3 = 1 / Math.sqrt(3);
const AXIS = [S3, S3, -S3]; // the joint axis in the CAD frame (the planner's (1, 1, 1), see chain3d.js)
const PITCH = 0.082;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const sign = (x) => (x > 0.5 ? '+' : x < -0.5 ? '-' : '');

// joint angle (degrees) through the steps: at rest; to 60; on to +120; then back through 0 to -120
function angleAt(step, sp) {
  if (step <= 0) return 0;
  if (step === 1) return 60 * smooth(0.05, 0.5, sp);
  if (step === 2) return 60 + 60 * smooth(0.05, 0.45, sp);
  // the last step only gets to about 60% of its progress before the stage unpins
  return 120 - 240 * smooth(0.12, 0.52, sp);
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const model = matte(await stage.load(MODEL));
  const turning = stage.part(TURNING);
  const axis = new THREE.Vector3(...AXIS);

  // the green half's vertices in the module frame (before it is put on its pivot), to measure its reach
  model.updateMatrixWorld(true);
  const verts = [];
  const v = new THREE.Vector3();
  for (const t of turning) t.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); verts.push(v.x, v.y, v.z); }
  });
  const q = new THREE.Quaternion(), w = new THREE.Vector3();
  const reachMemo = new Map();
  function reach(d) { // mm past the cube's 42 mm half-width, at joint angle d (whole degrees)
    d = Math.round(d);
    if (reachMemo.has(d)) return reachMemo.get(d);
    q.setFromAxisAngle(axis, d * DEG);
    let m = 0;
    for (let i = 0; i < verts.length; i += 3) {
      w.set(verts[i], verts[i + 1], verts[i + 2]).applyQuaternion(q);
      m = Math.max(m, Math.abs(w.x), Math.abs(w.y), Math.abs(w.z));
    }
    const r = Math.max(0, m * 1000 - 42);
    reachMemo.set(d, r);
    return r;
  }

  const pivot = stage.pivot(turning, [0, 0, 0], AXIS);

  // annotations (not parts): the joint axis, the 80 mm cube outline, an arrow out of the exit face
  const axisLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([axis.clone().multiplyScalar(-0.085), axis.clone().multiplyScalar(0.085)]),
    new THREE.LineDashedMaterial({ color: '#ff6b35', dashSize: 0.006, gapSize: 0.004, depthTest: false, transparent: true }),
  );
  axisLine.computeLineDistances(); axisLine.renderOrder = 10;
  const outline = cubeOutline(THREE, '#eee9e3', 0.35);
  outline.visible = true;
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0.041, 0), 0.05, 0x9fd3ff, 0.014, 0.009);
  arrow.traverse((o) => { if (o.material) { o.material.depthTest = false; o.material.transparent = true; } o.renderOrder = 11; });
  stage.scene.add(axisLine, outline);
  pivot.add(arrow);

  // the next module: a see-through copy of the same CAD, 82 mm off the exit face, turned by the
  // first roll digit, riding on the green half
  const ghost = matte(await stage.load(MODEL, { add: false, shadows: false }));
  const ghostMats = [];
  ghost.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    Object.assign(o.material, { transparent: true, opacity: 0, depthWrite: false });
    ghostMats.push(o.material);
  });
  ghost.position.set(0, PITCH, 0);
  ghost.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Number(ROLL[0]) * Math.PI) / 2);
  ghost.visible = false;
  pivot.add(ghost);
  // where the next cube's centre can be: +Y at 0, and the two cells a 120 degree turn either way
  // sends it to (a 120 degree turn about the body diagonal maps the cube's axes onto each other)
  const spots = [-120, 0, 120].map((d) => {
    const p = new THREE.Vector3(0, PITCH, 0).applyAxisAngle(axis, d * DEG);
    const o = cubeOutline(THREE, '#9fd3ff', 0.7);
    o.position.copy(p);
    o.material.opacity = 0;
    stage.scene.add(o);
    return { d, o };
  });

  // labels
  const ov = labelLayer(stage);
  const TIP = new THREE.Vector3(0, 0.095, 0); // the arrow's tip, on the green half
  const lAxis = ov.label('Joint axis: the body diagonal', axis.clone().multiplyScalar(0.075).toArray(), { color: '#ff6b35', minW: 560 });
  const lExit = ov.label('The next cube mounts here', TIP.toArray(), { color: '#9fd3ff', minW: 560 });

  // the readout
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div class="rx-hud-row rx-hud-big"><span>Joint</span><b class="num" data-k="joint"></b></div>
    <table class="num"><tbody>
      <tr><td>Servo shaft <small>4:1 reduction</small></td><td data-k="servo"></td></tr>
      <tr><td>Encoder counts <small>5,461 per 120° step</small></td><td data-k="counts"></td></tr>
    </tbody></table>
    <div class="rx-hud-row" style="margin-top:10px"><span>Reach past the cube, from the CAD</span><b class="num" data-k="reach"></b><i><em data-k="reachBar"></em></i></div>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  hud.style.borderTop = '0';
  hud.querySelector('.rx-hud-big').style.cssText = 'margin-top:0;padding-top:0;border-top:0';
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, text) => { if (shown[k] !== text) { K[k].textContent = text; shown[k] = text; } };
  const peak = Math.max(...[-120, -90, -60, -30, 0, 30, 60, 90, 120].map(reach), 1);

  // views, framed once at rest: the module alone, and the module with the three places the next cube can be
  const reachBox = new THREE.Mesh(new THREE.BoxGeometry(0.162, 0.162, 0.162), new THREE.MeshBasicMaterial());
  reachBox.position.set(0.041, 0.041, -0.041); reachBox.visible = false;
  stage.scene.add(reachBox);
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || Math.abs(a - aspect) > 1e-3) {
      aspect = a;
      views = [
        stage.frame(model, { azimuth: 45, elevation: 26, pad: a < 1 ? 1.3 : 1.6, apply: false }),
        stage.frame(reachBox, { azimuth: 45, elevation: 26, pad: a < 1 ? 1.3 : 1.45, apply: false }),
      ];
    }
    return views;
  }

  const reduced = ctx.reducedMotion;
  let lastLook = '';
  function setProgress(p, step = 0, sp = 0) {
    step = clamp(step | 0, 0, 3);
    const [fx, fy] = ctx.shift();
    const phone = el.clientWidth < 640;
    stage.setShift(phone ? fx : fx > 0 ? fx + 0.05 : fx - 0.08, fy + (phone ? -0.08 : -0.04));
    let d = angleAt(step, sp);
    if (reduced) d = [0, 60, 120, -120][step];
    pivot.setAngle(d * DEG);

    // the next cube and its three places, on the last step
    const g = step < 3 ? 0 : reduced ? 1 : smooth(0, 0.1, sp);
    // each place lights up once the next cube has been there on this step
    const seen = spots.map((s) => (s.d === 120 ? g : clamp((s.d + 12 - d) / 12, 0, 1) * g));
    const look = `${g.toFixed(3)}|${seen.map((x) => x.toFixed(3)).join()}`;
    if (look !== lastLook) {
      lastLook = look;
      ghost.visible = g > 0;
      for (const m of ghostMats) m.opacity = 0.22 * g;
      spots.forEach((s, i) => { s.o.visible = seen[i] > 0; s.o.material.opacity = 0.7 * seen[i]; });
      stage.invalidate();
    }
    const V = viewsNow();
    const k = step < 3 ? 0 : reduced ? 1 : smooth(0, 0.15, sp);
    stage.setView({ pos: V[0].pos.clone().lerp(V[1].pos, k), target: V[0].target.clone().lerp(V[1].target, k) });

    // readout
    const r = reach(d);
    put('joint', `${sign(d)}${Math.abs(d).toFixed(0)}°`);
    put('servo', `${sign(d)}${Math.abs(d * 4).toFixed(0)}°`);
    put('counts', `${sign(d)}${Math.round(Math.abs(d / 120) * 5461).toLocaleString('en-US')}`);
    put('reach', `${r.toFixed(1)} mm`);
    const wBar = `${((r / peak) * 100).toFixed(1)}%`;
    if (shown.reachBar !== wBar) { K.reachBar.style.width = wBar; shown.reachBar = wBar; }
    put('mini', `Servo shaft ${sign(d)}${Math.abs(d * 4).toFixed(0)}°, ${sign(d)}${Math.round(Math.abs(d / 120) * 5461).toLocaleString('en-US')} counts`);
    lAxis.a = step < 3 ? 1 : 1 - smooth(0, 0.1, sp);
    lExit.p.copy(TIP).applyAxisAngle(axis, d * DEG);
    lExit.a = step === 1 ? 0 : 1;
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose?.(); stage.dispose(); } };
}
