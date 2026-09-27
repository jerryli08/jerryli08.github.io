// The belt drivetrain on the rover's left side, cut open along the outside of the belt (keeps model
// z <= -0.047) so both pulleys and the belt run are visible. Each side is skid steered: a servo
// drives the rear wheel, whose 35-tooth HTD 3M pulley carries a 384 mm belt to the same pulley in
// the front wheel. The belt mesh in the CAD is one static part, so its motion is shown with marks
// drawn on it (one per belt tooth, every eighth in orange), moving at the pulley's pitch speed.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, button } from '/assets/js/lib/ui.js';
import { rigWheels, hud, injectStyle, clamp } from './common.js';

// from the CAD: pulley centres (model x), axle height, belt back radius, belt edges; HTD 3M 35T pitch radius
const XF = 0.3481, XR = 0.4878, CY = -0.1372, RB = 0.01756 + 0.00025, PITCH_R = 35 * 0.003 / (2 * Math.PI);
const Z0 = -0.0599, Z1 = -0.0479, C = XR - XF, L = 2 * C + 2 * Math.PI * PITCH_R, TEETH = 128;
const W_MAX = 2 * Math.PI * 1.1; // rad/s of wheel at 100 % (for the picture only)

export async function mount(el, ctx) {
  const stage = createStage(el);
  const rover = await stage.load('/assets/models/rover.glb');
  const { wheels, radius } = rigWheels(stage, rover);
  const T = stage.THREE;

  // tooth marks on the back of the left belt
  const geo = new T.BoxGeometry(0.0008, 0.0005, Z1 - Z0 + 0.0004);
  const mat = new T.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0 });
  const marks = new T.InstancedMesh(geo, mat, TEETH);
  marks.name = 'belt marks';
  const grey = new T.Color('#d9d2c9'), orange = new T.Color('#ff6b35');
  for (let i = 0; i < TEETH; i++) marks.setColorAt(i, i % 8 === 0 ? orange : grey);
  marks.castShadow = false; marks.receiveShadow = false;
  rover.add(marks);
  const m4 = new T.Matrix4(), q = new T.Quaternion(), p = new T.Vector3(), one = new T.Vector3(1, 1, 1), zAxis = new T.Vector3(0, 0, 1);
  // s: distance along the belt's pitch line in the direction it runs when driving forward
  // (top run toward the front, -x; then down around the front pulley)
  function place(i, s) {
    s = ((s % L) + L) % L;
    let x, y, ang;
    const arc = Math.PI * PITCH_R;
    if (s < C) { x = XR - s; y = CY + RB; ang = 0; }
    else if (s < C + arc) { const a = Math.PI / 2 + (s - C) / PITCH_R; x = XF + RB * Math.cos(a); y = CY + RB * Math.sin(a); ang = a - Math.PI / 2; }
    else if (s < 2 * C + arc) { x = XF + (s - C - arc); y = CY - RB; ang = Math.PI; }
    else { const a = 1.5 * Math.PI + (s - 2 * C - arc) / PITCH_R; x = XR + RB * Math.cos(a); y = CY + RB * Math.sin(a); ang = a - Math.PI / 2; }
    p.set(x, y, (Z0 + Z1) / 2);
    q.setFromAxisAngle(zAxis, ang);
    marks.setMatrixAt(i, m4.compose(p, q, one));
  }
  let sBelt = 0;
  function layMarks() { for (let i = 0; i < TEETH; i++) place(i, sBelt + (i * L) / TEETH); marks.instanceMatrix.needsUpdate = true; stage.invalidate(); }
  layMarks();

  // cut away everything outboard of the left belt
  const cut = stage.sectionPlane([0, 0, -1], -0.047);
  stage.frame(null, { azimuth: 18, elevation: 16, pad: 1.05 });
  const focus = new T.Mesh(new T.BoxGeometry(0.25, 0.085, 0.06));
  focus.position.set(0.418, -0.132, -0.07); focus.updateMatrixWorld(true);
  stage.frame(focus, { azimuth: 16, elevation: 17, pad: 1.02 });

  // ---------------------------------------------------------------- top-view inset (a diagram, not CAD)
  injectStyle();
  const inset = document.createElement('div');
  inset.className = 'hv-hud';
  inset.style.cssText = 'left:12px;right:auto;top:12px;padding:8px;gap:4px';
  inset.innerHTML = `<svg viewBox="-60 -80 120 160" width="96" height="128" aria-hidden="true" style="display:block">
    <defs><marker id="hvA" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" fill="#ff9a6b"/></marker><marker id="hvB" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8z" fill="#eee9e3"/></marker></defs>
    <rect x="-37" y="-60" width="74" height="120" rx="8" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.28)"/>
    <text x="0" y="-66" fill="#8c847b" font-size="10" text-anchor="middle">front</text>
    <g fill="#6f675f"><rect x="-47" y="-44" width="9" height="26" rx="2"/><rect x="-47" y="18" width="9" height="26" rx="2"/><rect x="38" y="-44" width="9" height="26" rx="2"/><rect x="38" y="18" width="9" height="26" rx="2"/></g>
    <line id="hvL" x1="-42" y1="0" x2="-42" y2="0" stroke="#ff9a6b" stroke-width="3" marker-end="url(#hvA)"/>
    <line id="hvR" x1="42" y1="0" x2="42" y2="0" stroke="#ff9a6b" stroke-width="3" marker-end="url(#hvA)"/>
    <path id="hvP" d="" fill="none" stroke="#eee9e3" stroke-width="1.6" stroke-dasharray="3 3" marker-end="url(#hvB)"/>
  </svg><div class="hv-state" id="hvS" style="text-align:center;min-width:96px"></div>`;
  el.appendChild(inset);
  const $ = (id) => inset.querySelector(`#${id}`);
  // on a phone the bottom corner belongs to the "swipe to turn" hint, so the readout goes top right
  const info = hud(stage, [{ key: 'ratio', label: 'Rear to front wheel' }, { key: 'belt', label: 'Belt speed / ground speed' }], { where: el.clientWidth < 560 ? 'tr' : 'br' });
  info.set({ ratio: '35T : 35T = 1 : 1', belt: `${(PITCH_R / radius).toFixed(2)}` });

  // ---------------------------------------------------------------- driving
  let vl = 0, vr = 0, angL = 0, angR = 0, stop = null;
  function draw() {
    const k = 34;
    $('hvL').setAttribute('y2', String(-vl * k));
    $('hvR').setAttribute('y2', String(-vr * k));
    $('hvL').style.opacity = Math.abs(vl) > 0.02 ? '1' : '0';
    $('hvR').style.opacity = Math.abs(vr) > 0.02 ? '1' : '0';
    // ideal skid steer (no slip): v = (vL + vR) / 2, turn rate = (vR - vL) / track width
    const Wd = 84, v = (vl + vr) / 2, w = (vr - vl) / Wd;
    let text, d = '';
    if (Math.abs(vl) < 0.02 && Math.abs(vr) < 0.02) text = 'Stopped';
    else if (Math.abs(v) < 0.015) { text = w > 0 ? 'Spinning left' : 'Spinning right'; d = w > 0 ? 'M18 -18 A25 25 0 0 0 -18 -18' : 'M-18 -18 A25 25 0 0 1 18 -18'; }
    else {
      // trace the centre's path: heading measured from straight ahead, positive to the left
      let x = 0, y = 0, h = 0, len = 0;
      const pts = ['M0 0'];
      while (len < 54 && Math.abs(h) < 1.7) { x -= Math.sin(h) * Math.sign(v); y -= Math.cos(h) * Math.sign(v); h += w / Math.abs(v); len += 1; pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`); }
      d = pts.join(' ');
      if (Math.abs(w) < 1e-4) text = v > 0 ? 'Straight ahead' : 'Straight back';
      else text = `${(w > 0) === (v > 0) ? 'Arcing left' : 'Arcing right'}, radius ${Math.round(Math.abs(v / w) / Wd * 135.2)} mm`;
    }
    $('hvP').setAttribute('d', d);
    $('hvS').textContent = text;
  }
  function tick(dt) {
    const wl = vl * W_MAX, wr = vr * W_MAX;
    angL += wl * dt; angR += wr * dt;
    for (const w of wheels) w.setAngle(w.left ? angL : angR);
    sBelt += wl * PITCH_R * dt; // the left belt moves at the pulley's pitch-line speed
    layMarks();
  }
  function drive() {
    draw();
    const moving = Math.abs(vl) > 0.001 || Math.abs(vr) > 0.001;
    if (moving && !stop) stop = stage.onFrame(tick);
    if (!moving && stop) { stop(); stop = null; }
  }
  const sl = slider(ctx.panel, { label: 'Left side (near)', min: -100, max: 100, step: 1, value: 0, unit: '%', format: (v) => v.toFixed(0), onInput: (v) => { vl = v / 100; drive(); } });
  const sr = slider(ctx.panel, { label: 'Right side', min: -100, max: 100, step: 1, value: 0, unit: '%', format: (v) => v.toFixed(0), onInput: (v) => { vr = v / 100; drive(); } });
  const preset = (l, r) => () => { sl.set(l); sr.set(r); };
  button(ctx.panel, { label: 'Forward', onClick: preset(60, 60) });
  button(ctx.panel, { label: 'Arc left', onClick: preset(30, 70) });
  button(ctx.panel, { label: 'Spin', onClick: preset(-60, 60) });
  button(ctx.panel, { label: 'Stop', onClick: preset(0, 0) });
  draw();
  void cut; void clamp;
  return { dispose() { stop?.(); info.dispose(); inset.remove(); geo.dispose(); mat.dispose(); focus.geometry.dispose(); stage.dispose(); } };
}
