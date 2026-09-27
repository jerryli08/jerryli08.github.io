// Drive the finished robot (Jerry's version 2 CAD) around a small arena and knock cardboard boxes
// over with the weapon. The robot, its blade and its wheels are his CAD, turning about the real
// axes from the STEP; the arena and the boxes are props drawn for the page, and the box physics
// is a small rigid-body model written for it (illustrative, not a simulation of real hits).
//
// Drive: W A S D or the arrow keys once the stage has focus (click it), or the stick. Tank
// steering like the real robot: two wheels, arcade mix. Weapon: the vertical slider on the
// right sets the target speed between stopped and the full no-load 8,214 rpm; Space toggles it.
// The readout shows the live speed (spin-up, and the drop on every hit) with the same math as
// Jerry's weapon calculator. Nothing moves until the reader drives or moves the slider.
import { createStage } from '/assets/js/lib/stage.js';
import { readout, segmented, button } from '/assets/js/lib/ui.js';
import { loadRobot, rig, blurDisc, LIFT, W_MAX, tipOf, fmtInt } from './rig.js';
import { createSim, ARENA } from './physics.js';

const HX = ARENA.hx, HZ = ARENA.hz; // a 1.4 x 0.96 m prop
const WALL_H = 0.1;           // drawn wall height; the collision walls go up to the ceiling
const DT = 1 / 240;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
let saved = null; // survives an unmount while the reader scrolls away

const CSS = `
.bb-arena { touch-action: pan-y; }
.bb-arena:focus { outline: none; }
.bb-arena:focus-visible { outline: 2px solid var(--accent, #ff6b35); outline-offset: -2px; }
.bb-go { position: absolute; z-index: 4; left: 50%; top: 14px; transform: translateX(-50%); padding: 7px 14px; border-radius: 999px;
  background: rgba(10,8,7,.72); border: 1px solid rgba(255,255,255,.16); color: #eee9e3; font: 550 13px/1.2 var(--font-ui, system-ui, sans-serif);
  cursor: pointer; white-space: nowrap; transition: opacity .3s; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.bb-go kbd { font: inherit; padding: 0 5px; border-radius: 4px; border: 1px solid rgba(255,255,255,.28); margin: 0 1px; }
.bb-go.gone { opacity: 0; pointer-events: none; }
.bb-joy { position: absolute; z-index: 4; left: 16px; bottom: 16px; width: 112px; height: 112px; border-radius: 50%;
  background: rgba(10,8,7,.42); border: 1px solid rgba(255,255,255,.2); touch-action: none; cursor: grab; }
.bb-joy::after { content: ''; position: absolute; inset: 50% auto auto 50%; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: rgba(255,255,255,.25); }
.bb-joy-k { position: absolute; left: 50%; top: 50%; width: 46px; height: 46px; margin: -23px 0 0 -23px; border-radius: 50%;
  background: rgba(238,233,227,.9); box-shadow: 0 4px 14px rgba(0,0,0,.45); pointer-events: none; }
.bb-wpn { position: absolute; z-index: 4; right: 14px; top: 50%; transform: translateY(-50%); display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 10px 8px; border-radius: 14px; background: rgba(10,8,7,.5); border: 1px solid rgba(255,255,255,.14); touch-action: none; user-select: none; -webkit-user-select: none; }
.bb-wpn:focus { outline: none; } .bb-wpn:focus-visible { outline: 2px solid var(--accent, #ff6b35); outline-offset: 2px; }
.bb-wpn-l { font: 600 11px/1 var(--font-ui, system-ui, sans-serif); letter-spacing: .06em; text-transform: uppercase; color: #cfc8c0; }
.bb-wpn-v { font: 650 13px/1 var(--font-ui, system-ui, sans-serif); font-variant-numeric: tabular-nums; color: #fff; min-width: 4ch; text-align: center; }
.bb-wpn-t { position: relative; width: 30px; height: 170px; margin: 6px 0 10px; cursor: pointer; }
.bb-wpn-t::before { content: ''; position: absolute; left: 13px; top: 0; bottom: 0; width: 4px; border-radius: 4px; background: rgba(255,255,255,.16); }
.bb-wpn-f { position: absolute; left: 13px; bottom: 0; width: 4px; border-radius: 4px; background: var(--accent, #ff6b35); }
.bb-wpn-k { position: absolute; left: 6px; width: 18px; height: 18px; margin-bottom: -9px; border-radius: 50%; background: #eee9e3; box-shadow: 0 0 0 4px rgba(255,107,53,.3); }
.bb-live { position: absolute; z-index: 4; right: 70px; top: 14px; padding: 5px 10px; border-radius: 8px; background: rgba(10,8,7,.6);
  font: 600 12.5px/1.2 var(--font-ui, system-ui, sans-serif); font-variant-numeric: tabular-nums; color: #eee9e3; pointer-events: none; }
@media (max-width: 600px) {
  .bb-joy { left: 12px; bottom: 12px; width: 96px; height: 96px; } .bb-joy-k { width: 40px; height: 40px; margin: -20px 0 0 -20px; }
  .bb-wpn { right: 10px; top: auto; bottom: 12px; transform: none; padding: 8px 6px; gap: 6px; } .bb-wpn-t { height: 112px; margin: 4px 0 8px; }
  .bb-go { top: 10px; font-size: 12px; } .bb-live { right: auto; left: 12px; top: 48px; font-size: 11.5px; }
}
`;
let styled = false;

export async function mount(el, ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const stage = createStage(el, { controls: false, hint: false, fov: 30 });
  const { THREE: T, scene, camera } = stage;
  const V3 = T.Vector3;
  const reduced = ctx.reducedMotion;
  const touch = ctx.isTouch;

  // ------------------------------------------------------------ the arena (a prop, not CAD)
  const cv = document.createElement('canvas'); cv.width = 1400; cv.height = 960;
  const g2 = cv.getContext('2d');
  g2.fillStyle = '#2c2f34'; g2.fillRect(0, 0, 1400, 960);
  g2.strokeStyle = 'rgba(210,215,222,0.10)'; g2.lineWidth = 2;
  for (let i = 0; i <= 14; i++) { const p = i * 100; g2.beginPath(); g2.moveTo(p, 0); g2.lineTo(p, 960); g2.stroke(); }
  for (let i = 0; i <= 9; i++) { const p = 20 + i * 100; g2.beginPath(); g2.moveTo(0, p); g2.lineTo(1400, p); g2.stroke(); }
  g2.strokeStyle = 'rgba(255,107,53,0.35)'; g2.lineWidth = 6; g2.strokeRect(6, 6, 1388, 948);
  const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
  const floor = new T.Mesh(new T.PlaneGeometry(2 * HX, 2 * HZ), new T.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'arena-floor';
  scene.add(floor);
  const wallMat = new T.MeshStandardMaterial({ color: '#a9bccf', roughness: 0.2, transparent: true, opacity: 0.12, depthWrite: false });
  const railMat = new T.MeshStandardMaterial({ color: '#3b3f46', roughness: 0.5, metalness: 0.6 });
  const arena = new T.Group(); scene.add(arena);
  for (const [x, z, w, d] of [[0, -HZ, 2 * HX, 0.006], [0, HZ, 2 * HX, 0.006], [-HX, 0, 0.006, 2 * HZ], [HX, 0, 0.006, 2 * HZ]]) {
    const wall = new T.Mesh(new T.BoxGeometry(w, WALL_H, d), wallMat); wall.position.set(x, WALL_H / 2, z); arena.add(wall);
    const rail = new T.Mesh(new T.BoxGeometry(w + 0.012, 0.012, d + 0.012), railMat); rail.position.set(x, WALL_H, z); rail.castShadow = true; arena.add(rail);
  }
  stage.ground.visible = false;

  // ------------------------------------------------------------ the robot (Jerry's CAD)
  const bot = new T.Group(); bot.name = 'robot';
  const inner = new T.Group(); inner.position.y = LIFT; bot.add(inner);
  stage.root.add(bot);
  const { model, p } = await loadRobot(stage, 'v2', { add: false });
  inner.add(model);
  stage.ground.visible = false; // the arena floor takes the shadows
  bot.updateWorldMatrix(true, true);
  const pv = rig(stage, p);
  const disc = blurDisc(T, '#9aa0a8');
  disc.position.set(0, 0.019, -0.076);
  model.add(disc);

  // light: cover the whole arena with the shadow
  const key = stage.light;
  key.position.set(-0.9, 2.0, 1.1); key.target.position.set(0, 0, 0);
  Object.assign(key.shadow.camera, { left: -0.9, right: 0.9, top: 0.9, bottom: -0.9, near: 0.2, far: 5 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.003;
  camera.near = 0.01; camera.far = 20; camera.updateProjectionMatrix();

  // ------------------------------------------------------------ boxes (props) and the physics
  const sim = createSim(T, { onHit: (at, dir, speed) => spawnChips(at, dir, speed) });
  const { st, input, boxes } = sim;
  st.last = 100;
  const kraft = new T.MeshStandardMaterial({ color: '#b68a5a', roughness: 0.92, metalness: 0 });
  const tape = new T.MeshStandardMaterial({ color: '#d8c39a', roughness: 0.35, metalness: 0, transparent: true, opacity: 0.8 });
  for (const b of boxes) {
    b.mesh = new T.Mesh(new T.BoxGeometry(b.w, b.h, b.d), kraft);
    b.mesh.castShadow = true; b.mesh.receiveShadow = true;
    const strip = new T.Mesh(new T.BoxGeometry(b.w * 1.002, 0.0008, Math.min(0.018, b.d * 0.3)), tape);
    strip.position.y = b.h / 2 + 0.0003; b.mesh.add(strip);
    scene.add(b.mesh);
  }

  // chips of cardboard on a hit (skipped with reduced motion)
  const chips = [];
  if (!reduced) {
    const chipGeo = new T.BoxGeometry(0.007, 0.0012, 0.005);
    for (let i = 0; i < 36; i++) {
      const c = new T.Mesh(chipGeo, kraft); c.visible = false; c.castShadow = false; scene.add(c);
      chips.push({ mesh: c, v: new V3(), spin: new V3(), life: 0 });
    }
  }
  let chipNext = 0;
  function spawnChips(at, dir, speed) {
    for (let i = 0; i < 6 && chips.length; i++) {
      const c = chips[chipNext]; chipNext = (chipNext + 1) % chips.length;
      c.mesh.position.copy(at);
      c.v.copy(dir).multiplyScalar(Math.min(3, speed * 0.08) * (0.5 + Math.random()))
        .add(new V3((Math.random() - 0.5) * 1.2, 0.6 + Math.random() * 1.4, (Math.random() - 0.5) * 1.2));
      c.spin.set(Math.random() * 30, Math.random() * 30, Math.random() * 30);
      c.life = 1.1; c.mesh.visible = true;
    }
  }

  // ------------------------------------------------------------ state
  if (saved) { Object.assign(st, saved.st); sim.resetBoxes(saved.boxes); }

  // ------------------------------------------------------------ overlays: focus chip, stick, vertical weapon slider, live rpm
  el.classList.add('bb-arena');
  el.tabIndex = 0;
  el.setAttribute('role', 'application');
  el.setAttribute('aria-label', 'Drive the robot. W A S D or arrow keys drive, Space toggles the weapon.');
  const go = document.createElement(touch ? 'div' : 'button');
  go.className = 'bb-go';
  if (touch) go.textContent = 'Drag the stick to drive';
  else { go.type = 'button'; go.innerHTML = 'Click to drive: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows, <kbd>Space</kbd> weapon'; go.addEventListener('click', () => el.focus()); }
  const joy = document.createElement('div'); joy.className = 'bb-joy'; joy.setAttribute('aria-hidden', 'true');
  const knob = document.createElement('div'); knob.className = 'bb-joy-k'; joy.append(knob);
  const wpn = document.createElement('div'); wpn.className = 'bb-wpn';
  Object.assign(wpn, { tabIndex: 0 });
  wpn.setAttribute('role', 'slider'); wpn.setAttribute('aria-label', 'Weapon speed'); wpn.setAttribute('aria-orientation', 'vertical');
  wpn.setAttribute('aria-valuemin', '0'); wpn.setAttribute('aria-valuemax', '100');
  wpn.innerHTML = '<span class="bb-wpn-l">Weapon</span><div class="bb-wpn-t"><div class="bb-wpn-f"></div><div class="bb-wpn-k"></div></div><span class="bb-wpn-v"></span>';
  const track = wpn.querySelector('.bb-wpn-t'), fill = wpn.querySelector('.bb-wpn-f'), thumb = wpn.querySelector('.bb-wpn-k'), wval = wpn.querySelector('.bb-wpn-v');
  const live = document.createElement('div'); live.className = 'bb-live'; live.setAttribute('aria-hidden', 'true');
  el.append(go, joy, wpn, live);

  const pct = () => Math.round((st.target / W_MAX) * 100);
  function paintSlider() {
    const v = pct();
    fill.style.height = `${v}%`; thumb.style.bottom = `${v}%`;
    wval.textContent = `${v}%`;
    wpn.setAttribute('aria-valuenow', String(v));
    wpn.setAttribute('aria-valuetext', v ? `${v} percent, ${fmtInt((v / 100) * 8214)} rpm target` : 'stopped');
  }
  function setWeapon(v) { // v: 0..100
    v = clamp(Math.round(v), 0, 100);
    st.target = (v / 100) * W_MAX;
    if (v > 0) st.last = v;
    paintSlider(); wake();
  }
  const fromY = (e) => { const r = track.getBoundingClientRect(); return ((r.bottom - e.clientY) / r.height) * 100; };
  let dragW = false;
  track.addEventListener('pointerdown', (e) => { dragW = true; track.setPointerCapture(e.pointerId); setWeapon(fromY(e)); e.preventDefault(); });
  track.addEventListener('pointermove', (e) => { if (dragW) setWeapon(fromY(e)); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) track.addEventListener(ev, () => { dragW = false; });
  wpn.addEventListener('keydown', (e) => {
    const step = { ArrowUp: 5, ArrowRight: 5, ArrowDown: -5, ArrowLeft: -5, PageUp: 20, PageDown: -20 }[e.key];
    if (step != null) setWeapon(pct() + step);
    else if (e.key === 'Home') setWeapon(0);
    else if (e.key === 'End') setWeapon(100);
    else return;
    e.preventDefault(); e.stopPropagation();
  });
  paintSlider();

  // stick
  let joyId = null;
  function joyAt(e) {
    const r = joy.getBoundingClientRect(), R = r.width / 2;
    let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
    const d = Math.hypot(dx, dy), lim = R * 0.62;
    if (d > lim) { dx *= lim / d; dy *= lim / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    input.jt = clamp(dx / lim, -1, 1); input.jf = clamp(-dy / lim, -1, 1);
    if (Math.abs(input.jt) < 0.08) input.jt = 0;
    if (Math.abs(input.jf) < 0.08) input.jf = 0;
    wake();
  }
  joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyAt(e); go.classList.add('gone'); e.preventDefault(); });
  joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyAt(e); });
  const joyUp = () => { joyId = null; input.jf = input.jt = 0; knob.style.transform = ''; };
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) joy.addEventListener(ev, joyUp);

  // keys, only while the stage has focus
  const MAP = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r' };
  const onKey = (down) => (e) => {
    if (e.target !== el) return;
    if (e.code === 'Space') {
      if (down && !e.repeat) setWeapon(st.target > 0 ? 0 : st.last);
      e.preventDefault(); return;
    }
    const k = MAP[e.code];
    if (!k) return;
    e.preventDefault();
    if (down) input.keys.add(k); else input.keys.delete(k);
    wake();
  };
  const kd = onKey(true), ku = onKey(false);
  el.addEventListener('keydown', kd);
  el.addEventListener('keyup', ku);
  el.addEventListener('focus', () => go.classList.add('gone'));
  el.addEventListener('blur', () => { input.keys.clear(); if (!touch) go.classList.remove('gone'); });

  // ------------------------------------------------------------ panel: readout, camera, resets
  const info = readout(null, { rows: [
    { key: 'rpm', label: 'Weapon', unit: 'rpm', format: fmtInt },
    { key: 'fts', label: 'Blade tip', unit: 'ft/s', format: (v) => v.toFixed(0) },
    { key: 'mph', label: 'Blade tip', unit: 'mph', format: (v) => v.toFixed(1) },
  ] });
  const cam = segmented(ctx.panel, { label: 'Camera', options: [{ value: 'over', label: 'Overview' }, { value: 'follow', label: 'Follow' }], value: saved?.cam || (el.clientHeight > el.clientWidth ? 'follow' : 'over'), onChange: () => { applyView(true); wake(); } });
  button(ctx.panel, { label: 'Reset boxes', onClick: () => { sim.resetBoxes(); render1(); } });
  button(ctx.panel, { label: 'Reset robot', onClick: () => { sim.resetRobot(); camYaw = st.yaw; render1(); applyView(false); } });
  ctx.panel.append(info.el);

  // ------------------------------------------------------------ camera
  let camYaw = st.yaw;
  function applyView(tween) {
    if (cam.value === 'over') {
      const portrait = el.clientHeight > el.clientWidth * 0.95;
      const v = stage.frame(floor, { azimuth: 10, elevation: 56, pad: portrait ? 0.9 : 1.0, apply: false, track: false });
      if (tween && !reduced) stage.tweenCamera(v, 0.7); else stage.setView(v);
    } else {
      const v = followView();
      if (tween && !reduced) stage.tweenCamera(v, 0.6); else stage.setView(v);
    }
  }
  function followView() {
    const portrait = el.clientHeight > el.clientWidth;
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), d = portrait ? 0.8 : 0.62, e = ((portrait ? 42 : 34) * Math.PI) / 180, ahead = portrait ? 0.14 : 0.1;
    return { pos: [st.x - fx * d * Math.cos(e), d * Math.sin(e), st.z - fz * d * Math.cos(e)], target: [st.x + fx * ahead, 0.02, st.z + fz * ahead] };
  }
  const ro = new ResizeObserver(() => requestAnimationFrame(() => { applyView(false); stage.invalidate(); }));
  ro.observe(el);

  // ------------------------------------------------------------ chips
  function stepChips(h) {
    for (const c of chips) {
      if (c.life <= 0) continue;
      c.life -= h;
      c.v.y -= 9.81 * h;
      c.mesh.position.addScaledVector(c.v, h);
      if (c.mesh.position.y < 0.0006) { c.mesh.position.y = 0.0006; c.v.multiplyScalar(0.3); c.v.y = 0; c.spin.multiplyScalar(0.3); }
      c.mesh.rotation.x += c.spin.x * h; c.mesh.rotation.y += c.spin.y * h;
      if (c.life <= 0) c.mesh.visible = false;
    }
  }

  function place() {
    bot.position.set(st.x, 0, st.z);
    bot.rotation.y = st.yaw;
    pv.wheelL.setAngle(st.aL); pv.wheelR.setAngle(st.aR); pv.weapon.setAngle(st.aW);
    disc.setSpeed(st.w);
    for (const b of boxes) { b.mesh.position.copy(b.x); b.mesh.quaternion.copy(b.q); }
  }
  let infoClock = 0;
  function show(force) {
    const t = tipOf(st.w);
    info.set({ rpm: t.rpm, fts: t.fts, mph: t.mph });
    live.textContent = st.w > 0.5 ? `${fmtInt(t.rpm)} rpm` : 'Weapon off';
    if (force) infoClock = 0;
  }
  function render1() { place(); show(true); if (cam.value === 'follow') stage.setView(followView()); stage.invalidate(); }

  // ------------------------------------------------------------ loop: runs only while something moves
  let acc = 0, loop = null;
  const busy = () => sim.busy() || chips.some((c) => c.life > 0);
  function wake() { if (!loop) { acc = 0; loop = stage.onFrame(tick); } }
  function tick(dt) {
    acc += Math.min(dt, 1 / 20);
    let n = 0;
    while (acc >= DT && n < 12) { sim.step(DT); stepChips(DT); acc -= DT; n++; }
    place();
    if (cam.value === 'follow') {
      camYaw += (st.yaw - camYaw) * (1 - Math.exp(-(reduced ? 20 : 4) * dt));
      stage.setView(followView());
    }
    infoClock -= dt;
    if (infoClock <= 0) { show(); infoClock = 0.08; }
    if (!busy()) { show(); loop(); loop = null; }
  }

  place(); show(true);
  applyView(false);

  return {
    dispose() {
      saved = { st: { ...st, vL: 0, vR: 0, ex: 0, ez: 0, ew: 0, w: 0, target: 0 }, boxes: boxes.map((b) => ({ x: b.x.toArray(), q: b.q.toArray() })), cam: cam.value };
      ro.disconnect();
      el.removeEventListener('keydown', kd); el.removeEventListener('keyup', ku);
      go.remove(); joy.remove(); wpn.remove(); live.remove();
      el.classList.remove('bb-arena'); el.removeAttribute('tabindex'); el.removeAttribute('role'); el.removeAttribute('aria-label');
      stage.dispose();
    },
  };
}
