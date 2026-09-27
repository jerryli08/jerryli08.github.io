// Demo: one module, from our CAD (my teammates designed it). The green half turns about the body
// diagonal, the cut plane's normal through the cube centre, in 120 degree steps. Readouts are computed
// from the CAD: how far the green half reaches past the cube mid-turn, and where the next cube goes.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented, readout, button, playToggle } from '/assets/js/lib/ui.js';
import { ROLL } from './kin.js';
import { MODEL, TURNING, cubeOutline, matte } from './chain3d.js';

const DEG = Math.PI / 180;
const S3 = 1 / Math.sqrt(3);
const AXIS = [S3, S3, -S3]; // the joint axis in the CAD frame (the planner's (1, 1, 1), see chain3d.js)
const PITCH = 0.082;
const ease = (u) => u * u * (3 - 2 * u);

export async function mount(el, ctx) {
  const stage = createStage(el);
  const THREE = stage.THREE;
  const model = matte(await stage.load(MODEL));
  const turning = stage.part(TURNING);
  const axis = new THREE.Vector3(...AXIS);
  const pivot = stage.pivot(turning, [0, 0, 0], AXIS);
  const view0 = { azimuth: 45, elevation: 26, pad: 1.55 };
  stage.frame(model, view0);

  // annotations: the joint axis, the 80 mm cube outline, an arrow out of the exit face
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
  ghost.traverse((o) => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    Object.assign(o.material, { transparent: true, opacity: 0.22, depthWrite: false });
  });
  ghost.position.set(0, PITCH, 0);
  ghost.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Number(ROLL[0]) * Math.PI) / 2);
  ghost.visible = false;
  pivot.add(ghost);

  // the green half's vertices in the module frame, to measure its reach while it turns
  model.updateMatrixWorld(true);
  const verts = [];
  const v = new THREE.Vector3();
  for (const t of turning) t.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position;
    const m = o.matrixWorld;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); verts.push(v.x, v.y, v.z); }
  });
  const q = new THREE.Quaternion(), w = new THREE.Vector3();
  function reach(angle) {
    q.setFromAxisAngle(axis, angle);
    let m = 0;
    for (let i = 0; i < verts.length; i += 3) {
      w.set(verts[i], verts[i + 1], verts[i + 2]).applyQuaternion(q);
      m = Math.max(m, Math.abs(w.x), Math.abs(w.y), Math.abs(w.z));
    }
    return m * 1000; // mm from the cube centre
  }

  // ---------------------------------------------------------------- controls
  const info = readout(null, { rows: [
    { key: 'joint', label: 'Joint', unit: '°', format: (x) => (x > 0.5 ? '+' : '') + x.toFixed(0) },
    { key: 'servo', label: 'Servo shaft (4:1)', unit: '°', format: (x) => (x > 0.5 ? '+' : '') + x.toFixed(0) },
    { key: 'steps', label: 'Encoder counts', format: (x) => (x > 0.5 ? '+' : '') + Math.round(x).toLocaleString('en-US') },
    { key: 'reach', label: 'Reach into the next cell', unit: 'mm', format: (x) => x.toFixed(1) },
  ] });
  let angle = 0, anim = null;
  function show(a) {
    angle = a;
    pivot.setAngle(a);
    const deg = a / DEG;
    info.set({ joint: deg, servo: deg * 4, steps: (deg / 120) * 5461, reach: Math.max(0, reach(a) - 42) });
  }
  function goTo(targetDeg, seconds = 0.9) {
    const from = angle, to = targetDeg * DEG;
    anim?.(); anim = null;
    if (stage.reducedMotion) { show(to); return Promise.resolve(); }
    return new Promise((res) => {
      let t = 0;
      const dur = seconds * Math.max(0.5, Math.abs(to - from) / (120 * DEG));
      anim = stage.onFrame((dt) => {
        t = Math.min(1, t + dt / dur);
        show(from + (to - from) * ease(t));
        if (t >= 1) { anim?.(); anim = null; res(); }
      });
    });
  }
  const seg = segmented(ctx.panel, {
    label: 'Joint', value: 0,
    options: [{ value: -120, label: '-120°' }, { value: 0, label: '0°' }, { value: 120, label: '+120°' }],
    onChange: (d) => { play.set(false); goTo(d); },
  });
  // play: the booth's cycle at the robot's speed, 2 s per step, until paused
  let cycling = false;
  const seq = [120, 0, -120, 0];
  const play = playToggle(ctx.panel, {
    playing: false, labels: ['Cycle at robot speed', 'Pause'],
    onChange: async (on) => {
      cycling = on;
      if (!on) { anim?.(); anim = null; return; }
      let i = seq.indexOf(Math.round(angle / DEG / 120) * 120) + 1;
      while (cycling) {
        const d = seq[i % seq.length];
        seg.set(d, { silent: true });
        await goTo(d, 2);
        if (stage.reducedMotion) await new Promise((r) => setTimeout(r, 1200));
        i++;
      }
    },
  });
  const toggle = (label, on, off) => {
    let state = false;
    const b = button(ctx.panel, { label, onClick: () => { state = !state; b.setAttribute('aria-pressed', String(state)); b.style.background = state ? 'rgba(255,255,255,0.08)' : ''; (state ? on : off)(); } });
    b.setAttribute('aria-pressed', 'false');
    return b;
  };
  // a box around the three places the next cube can be (+Y, +X, -Z), for framing
  const reachBox = new THREE.Mesh(new THREE.BoxGeometry(0.162, 0.162, 0.162), new THREE.MeshBasicMaterial());
  reachBox.position.set(0.041, 0.041, -0.041); reachBox.visible = false;
  stage.scene.add(reachBox);
  const here = () => stage.camera.position.clone().sub(stage.controls.target);
  toggle('Show the next cube', () => { ghost.visible = true; stage.frame(reachBox, { dir: here(), pad: 1.08, duration: 0.8 }); }, () => { ghost.visible = false; stage.frame(model, { dir: here(), pad: view0.pad, duration: 0.8 }); });
  ctx.panel.append(info.el);
  show(0);

  return {
    dispose() { cycling = false; anim?.(); stage.dispose(); },
  };
}
