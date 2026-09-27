// "Drive the arm with your hand": the AR-glasses control mode of LinqBot, running in the browser.
// Your webcam stands in for the camera on the glasses; with no camera, a drag pad feeds the same
// pipeline. Everything after the camera follows our code in github.com/amzoeee/soma-hackathon:
//   robot/src/tracking/hand_tracker.py  one MediaPipe GestureRecognizer in VIDEO mode, hands under
//                                       4% of the frame dropped, the last good hand held 24 frames,
//                                       fist latched on Closed_Fist >= 0.60, released on an open hand >= 0.35
//   robot/src/mapping/relative_teleop.py  relative mapping, EMA and dead bands per axis, clutch debounce
//                                       (18 frames on, 6 off), proportional pinch
//   robot/src/main.py, config/settings.py  workspace box, IK seeded from the current angles (a miss over
//                                       3 cm keeps the last solution), 5 degrees per step per joint,
//                                       wrist roll locked
// The one change: the glasses' camera looks out from the operator's head toward the arm, and a
// webcam looks back at you, so the left/right and reach signs are flipped to keep motion natural.
// The camera is only asked for when the reader presses Start camera; frames never leave the page.
import { createStage } from '/assets/js/lib/stage.js';
import { slider } from '/assets/js/lib/ui.js';
import { THREE, loadArm, props, makeGrasp, homePose, style, h, SHARED_CSS, ROLL, CAN, CAN_HOME, fk, toArm, toRepo, ik, clamp, fitBox } from './rig.js';

const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21';
const TASK = '/assets/models/linqbot/gesture_recognizer.task';
const C = {
  minConf: 0.15, fistEnter: 0.6, fistExit: 0.35, minHandSize: 0.04, holdFrames: 24,
  scale: { x: 0.5, y: 0.6, z: 0.5 }, alphaXY: 0.15, alphaZ: 0.08, dbXY: 0.006, dbZ: 0.01, alphaGrip: 0.25,
  clutchOn: 18, clutchOff: 6,
  box: { x: [0.12, 0.3], y: [-0.15, 0.15], z: [0.05, 0.3] },
  maxStep: 5, miss: 0.03, fps: 30,
};
const OPEN = new Set(['Open_Palm', 'Victory', 'Thumb_Up', 'Pointing_Up']);
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]];

const CSS = `
.lq-pip { position: absolute; z-index: 4; left: 12px; bottom: 12px; width: 240px; aspect-ratio: 4 / 3; border-radius: 10px; overflow: hidden;
  background: #0d0d0d; border: 1px solid rgba(255, 255, 255, 0.18); box-shadow: 0 12px 28px -14px rgba(0, 0, 0, .9); }
.lq-pip canvas { display: block; width: 100%; height: 100%; touch-action: none; cursor: grab; }
.lq-pip.cam canvas { cursor: default; }
.lq-pip-tag { position: absolute; left: 8px; top: 6px; font: 600 11px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #e8e8e8; pointer-events: none; text-shadow: 0 1px 2px #000; }
.lq-pip-msg { position: absolute; inset: auto 8px 8px 8px; font-size: 11.5px; line-height: 1.35; color: #d8d2cb; pointer-events: none; text-shadow: 0 1px 2px #000; }
.lq-t-controls { display: contents; }
.lq-t-status { flex: 1 1 100%; margin: 0; min-height: 1.4em; font-size: 13px; color: var(--text-2); }
.lq-t-status:empty { display: none; }
@media (max-width: 640px) { .lq-pip { width: 44%; left: 8px; bottom: 8px; } }
`;

// an open right hand in camera-image units (y down), wrist at 0 and the middle knuckle 1 unit above it
const HAND = [[0, 0], [-0.4, -0.18], [-0.75, -0.35], [-1.05, -0.52], [-1.35, -0.72], [-0.3, -0.95], [-0.36, -1.4], [-0.4, -1.7], [-0.43, -1.95],
  [0, -1], [0, -1.5], [0, -1.82], [0, -2.1], [0.28, -0.95], [0.32, -1.42], [0.35, -1.7], [0.37, -1.95], [0.52, -0.82], [0.62, -1.15], [0.68, -1.38], [0.72, -1.58]];
const PINCH = { 3: [-0.62, -1.05], 4: [-0.52, -1.28], 7: [-0.46, -1.45], 8: [-0.5, -1.3] };
const FIST = { 3: [-0.45, -0.75], 4: [-0.2, -0.95], 6: [-0.34, -1.25], 7: [-0.25, -1.1], 8: [-0.2, -0.85], 10: [0, -1.3], 11: [0.05, -1.1], 12: [0.05, -0.8],
  14: [0.3, -1.25], 15: [0.3, -1.05], 16: [0.25, -0.8], 18: [0.55, -1.05], 19: [0.5, -0.9], 20: [0.42, -0.75] };

/** hand_tracker.py after MediaPipe: size gate, hold-over, fist latch */
function makeTracker() {
  let last = null, missed = 0, latched = false;
  const held = () => {
    missed++;
    if (last && missed <= C.holdFrames) return { ...last, fist: latched, held: true };
    if (missed > C.holdFrames) last = null;
    return null;
  };
  return {
    process(lm, g) {
      if (!lm) return held();
      const size = Math.hypot(lm[9][0] - lm[0][0], lm[9][1] - lm[0][1]);
      if (size < C.minHandSize) return held();
      let name = null, conf = 0, gFist = false;
      if (g && g.name && g.name !== 'None') { name = g.name; conf = g.score; gFist = name === 'Closed_Fist'; }
      let curled = 0;
      for (const t of [8, 12, 16, 20]) if (Math.hypot(lm[t][0] - lm[9][0], lm[t][1] - lm[9][1]) < size * 0.55) curled++;
      const geom = curled >= 4;
      if (latched) { if ((OPEN.has(name) && conf >= C.fistExit) || (!gFist && !geom)) latched = false; }
      else if (gFist && conf >= C.fistEnter) latched = true;
      last = { lm, size, fist: latched, gesture: name || (latched ? 'Closed_Fist' : null), conf };
      missed = 0;
      return last;
    },
    reset() { last = null; missed = 0; latched = false; },
  };
}

/** relative_teleop.py: target = anchor + scale * (hand - origin), fist clutch with debounce */
function makeTeleop() {
  const ema = (a) => ({ a, v: null, up(x) { this.v = this.v == null ? x : this.a * x + (1 - this.a) * this.v; return this.v; } });
  let fx, fy, fz, fg, db, seed, target, anchor, origin, engaged, fist, fistN, openN;
  function seedPose(p, g = 1) {
    seed = [...p, g]; target = { x: p[0], y: p[1], z: p[2], g };
    anchor = p.slice(); origin = null; engaged = false; fist = false; fistN = 0; openN = 0;
    fx = ema(C.alphaXY); fy = ema(C.alphaXY); fz = ema(C.alphaZ); fg = ema(C.alphaGrip); fg.v = g; db = { x: null, y: null, z: null };
  }
  const band = (v, k, b) => { if (db[k] == null || Math.abs(v - db[k]) >= b) db[k] = v; return db[k]; };
  function debounce(raw) {
    if (raw) { fistN++; openN = 0; if (!fist && fistN >= C.clutchOn) fist = true; }
    else { openN++; fistN = 0; if (fist && openN >= C.clutchOff) fist = false; }
    return fist;
  }
  seedPose([0.2, 0, 0.15]);
  return {
    seed: seedPose,
    get target() { return target; },
    update(t) {
      if (!t) return { ...target, clutched: fist, valid: false };
      const hx = t.lm[0][0], hy = t.lm[0][1], hz = -t.size;
      const pinch = Math.hypot(t.lm[4][0] - t.lm[8][0], t.lm[4][1] - t.lm[8][1]);
      const g = fg.up(clamp(pinch / (t.size * 2 + 1e-6), 0, 1));
      if (debounce(!!t.fist)) {
        if (engaged) { engaged = false; origin = null; }
        target.g = g;
        return { ...target, clutched: true, valid: true };
      }
      let x, y, z;
      if (!engaged) {
        fx.v = hx; fy.v = hy; fz.v = hz; db = { x: hx, y: hy, z: hz };
        x = hx; y = hy; z = hz;
        origin = [hx, hy, hz];
        anchor = [target.x, target.y, target.z];
        engaged = true;
      } else {
        x = band(fx.up(hx), 'x', C.dbXY); y = band(fy.up(hy), 'y', C.dbXY); z = band(fz.up(hz), 'z', C.dbZ);
      }
      // robot: x = ax + sx (hz - oz), y = ay + sy (hx - ox); signs flipped for a webcam facing the reader
      target.x = anchor[0] - C.scale.x * (z - origin[2]);
      target.y = anchor[1] + C.scale.y * (x - origin[0]);
      target.z = anchor[2] + C.scale.z * -(y - origin[1]);
      target.g = g;
      return { ...target, clutched: false, valid: true };
    },
  };
}

function drawHand(g, lm, w, hh, clutched) {
  if (!lm) return;
  const P = lm.map(([x, y]) => [(1 - x) * w, y * hh]); // mirrored: a selfie view
  g.lineWidth = 2;
  g.strokeStyle = clutched ? '#ff4b3e' : '#3ee06b';
  g.beginPath();
  for (const [a, b] of BONES) { g.moveTo(P[a][0], P[a][1]); g.lineTo(P[b][0], P[b][1]); }
  g.stroke();
  g.fillStyle = '#ff8000';
  for (const [x, y] of P) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
}

export async function mount(el, ctx) {
  style('lq-shared-css', SHARED_CSS);
  style('lq-teleop-css', CSS);
  const stage = createStage(el, { hint: false });
  const arm = await loadArm(stage);
  const { can } = props(stage);
  stage.fitGround();
  const grasp = makeGrasp(stage, arm, can);
  const HOME = homePose();
  arm.pose(HOME);

  // camera: behind the arm and to its right, so the reader's right is the arm's right on screen
  const viewBox = fitBox(stage, [-0.2, 0, -0.08], [0.12, 0.32, 0.33]);
  const frameIt = () => stage.frame(viewBox, { azimuth: 222, elevation: 26, pad: 1.02 });
  frameIt();
  stage.controls.minDistance = 0.3; stage.controls.maxDistance = 1.6;

  // ---------------------------------------------------------------- overlays
  const goal = h('p', 'lq-goal', 'Goal: pick up the can');
  const hud = h('ul', 'lq-hud');
  const pip = h('div', 'lq-pip');
  const pc = h('canvas'); pc.width = 320; pc.height = 240;
  pc.setAttribute('aria-label', 'Hand pad: drag to move the hand');
  const tag = h('span', 'lq-pip-tag', 'Pad: drag to move');
  const pmsg = h('span', 'lq-pip-msg', '');
  pip.append(pc, tag, pmsg);
  el.append(goal, hud, pip);
  const g2 = pc.getContext('2d');
  const hudRow = (k) => { const li = h('li'); hud.appendChild(li); return li; };
  const rows = { clutch: hudRow(), hand: hudRow(), gesture: hudRow(), fps: hudRow(), ee: hudRow() };
  const put = (li, text, cls = '') => { li.textContent = text; li.className = cls; };

  // ---------------------------------------------------------------- controls
  const panel = ctx.panel;
  const row1 = h('div', 'lq-row');
  const bStart = h('button', 'lq-btn lq-primary', 'Start camera');
  const bStop = h('button', 'lq-btn', 'Stop camera');
  const bReset = h('button', 'lq-btn', 'Reset');
  const bEye = h('button', 'lq-btn', 'Eye camera view');
  bEye.setAttribute('aria-pressed', 'false');
  bEye.title = 'Simulates the glasses’ camera: 4-bit grey and noisy';
  const bClaw = h('button', 'lq-btn', 'Claw (hold)');
  const bClutch = h('button', 'lq-btn', 'Clutch (hold)');
  for (const b of [bStart, bStop, bReset, bEye, bClaw, bClutch]) b.type = 'button';
  bStop.hidden = true; bEye.hidden = true;
  row1.append(bStart, bStop, bEye, bClaw, bClutch, bReset);
  panel.appendChild(row1);
  const reachS = slider(panel, { label: 'Reach', min: 0, max: 1, step: 0.01, value: 0.4, format: (v) => `${Math.round(v * 100)}%` });
  const status = h('p', 'lq-t-status', '');
  const note = h('p', 'lq-note', '');
  panel.append(status, note);
  const setNote = () => {
    note.textContent = mode === 'cam'
      ? 'Open hand moves the arm. Pinch to close the claw. Make a fist to freeze the arm, move your hand back, open it to carry on. Your video never leaves the browser.'
      : ctx.isTouch
        ? 'No camera? Drag in the pad to move the hand, set Reach with the slider, hold Claw to pinch and Clutch to make a fist. Or press Start camera to use your hand.'
        : 'No camera? Drag in the pad to move the hand, set Reach with the slider (or the mouse wheel over the pad), hold Claw (Space) to pinch and Clutch (F) to make a fist. Or press Start camera to use your hand.';
  };

  // ---------------------------------------------------------------- state
  let mode = 'pad';
  let eye = false;
  const pad = { x: 0.5, y: 0.5, claw: false, clutch: false };
  const tracker = makeTracker();
  const teleop = makeTeleop();
  let sol = HOME.slice(0, 4);
  const box = { x: C.box.x.slice(), y: C.box.y.slice(), z: C.box.z.slice() };
  function reseed() {
    tracker.reset();
    const p = toRepo(fk(arm.angles));
    teleop.seed(p, 1 - arm.angles[5] / 95);
    for (const k of ['x', 'y', 'z']) { const v = p['xyz'.indexOf(k)]; box[k] = [Math.min(C.box[k][0], v - 0.01), Math.max(C.box[k][1], v + 0.01)]; }
  }
  function reset() {
    grasp.reset(CAN_HOME);
    arm.pose(HOME);
    sol = HOME.slice(0, 4);
    pad.x = 0.5; pad.y = 0.5; reachS.set(0.4, { silent: true });
    reseed();
    goal.textContent = 'Goal: pick up the can'; goal.classList.remove('done');
    frameIt();
  }
  reseed();

  // synthetic landmarks for the pad, in raw (unmirrored) camera coordinates
  function padLandmarks() {
    const size = 0.1 + 0.16 * reachS.value;
    const shape = HAND.map((p, i) => (pad.clutch ? FIST[i] : pad.claw ? PINCH[i] : null) || p);
    const cx = 1 - pad.x, cy = pad.y + 0.55 * size;
    return shape.map(([x, y]) => [cx - x * size, cy + y * size]); // mirror x so the pad reads like the preview
  }

  // ---------------------------------------------------------------- one control step (30 Hz)
  let steps = 0, fpsT = 0, fps = 0, lastLm = null, lastClutch = false;
  function step(sample) {
    const t = tracker.process(sample?.lm || null, sample?.gesture || null);
    const tg = teleop.update(t);
    const ee = [clamp(tg.x, ...box.x), clamp(tg.y, ...box.y), clamp(tg.z, ...box.z)];
    const cur = arm.angles.slice();
    const r = ik(toArm(ee), [...cur.slice(0, 4), ROLL], { iters: 60 });
    if (r.miss <= C.miss) sol = r.q.slice(0, 4);
    const q = sol.map((v, i) => clamp(v, cur[i] - C.maxStep, cur[i] + C.maxStep));
    const jawCmd = clamp((1 - clamp(tg.g, 0, 1)) * 95, cur[5] - 4.75, cur[5] + 4.75);
    const jaw = grasp.update(jawCmd, 1 / C.fps);
    arm.pose([...q, ROLL, jaw]);
    lastLm = t ? t.lm : null; lastClutch = tg.clutched;
    // HUD, in the style of the robot's glasses overlay
    put(rows.clutch, `Clutch: ${tg.clutched ? 'ACTIVE' : 'INACTIVE'}`, tg.clutched ? 'warn' : 'dim');
    put(rows.hand, `Hand: ${t ? 'DETECTED' : 'MISSING'}`, t ? 'ok' : 'dim');
    put(rows.gesture, `Gesture: ${t?.gesture || 'None'}`);
    put(rows.fps, `FPS: ${fps.toFixed(1)}`);
    put(rows.ee, `EE: [${ee.map((v) => v.toFixed(2)).join(', ')}]`);
    steps++;
    if (grasp.held && grasp.lift() > 0.05) { goal.textContent = 'Got it'; goal.classList.add('done'); }
  }

  // ---------------------------------------------------------------- pad (pointer fallback)
  function drawPad() {
    const w = pc.width, hh = pc.height;
    g2.fillStyle = '#121110'; g2.fillRect(0, 0, w, hh);
    g2.strokeStyle = 'rgba(255,255,255,0.06)'; g2.lineWidth = 1;
    for (let i = 1; i < 8; i++) { g2.beginPath(); g2.moveTo((i * w) / 8, 0); g2.lineTo((i * w) / 8, hh); g2.stroke(); }
    for (let i = 1; i < 6; i++) { g2.beginPath(); g2.moveTo(0, (i * hh) / 6); g2.lineTo(w, (i * hh) / 6); g2.stroke(); }
    drawHand(g2, lastLm, w, hh, lastClutch);
  }
  let dragging = false;
  const padPos = (e) => {
    const r = pc.getBoundingClientRect();
    pad.x = clamp((e.clientX - r.left) / r.width, 0.05, 0.95);
    pad.y = clamp((e.clientY - r.top) / r.height, 0.2, 0.98);
  };
  pc.addEventListener('pointerdown', (e) => { if (mode !== 'pad') return; dragging = true; pc.setPointerCapture(e.pointerId); padPos(e); });
  pc.addEventListener('pointermove', (e) => { if (dragging) padPos(e); });
  const endDrag = () => { dragging = false; };
  pc.addEventListener('pointerup', endDrag); pc.addEventListener('pointercancel', endDrag);
  pc.addEventListener('wheel', (e) => { if (mode !== 'pad') return; e.preventDefault(); reachS.set(clamp(reachS.value - Math.sign(e.deltaY) * 0.04, 0, 1), { silent: true }); }, { passive: false });
  const hold = (b, key) => {
    const on = (v) => { pad[key] = v; b.classList.toggle('is-held', v); };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); on(true); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, () => on(false));
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on(true); } });
    b.addEventListener('keyup', (e) => { if (e.key === 'Enter' || e.key === ' ') on(false); });
    return on;
  };
  const clawOn = hold(bClaw, 'claw'), clutchOn = hold(bClutch, 'clutch');
  const block = el.closest('[data-rx-block]') || el.parentElement;
  let over = false;
  const enter = () => { over = true; }, leave = () => { over = false; };
  block.addEventListener('pointerenter', enter); block.addEventListener('pointerleave', leave);
  const onKey = (e) => {
    if (mode !== 'pad' || !over || e.repeat || e.target?.closest?.('input, textarea, button')) return;
    const down = e.type === 'keydown';
    if (e.code === 'Space') { e.preventDefault(); clawOn(down); }
    if (e.code === 'KeyF') { e.preventDefault(); clutchOn(down); }
  };
  addEventListener('keydown', onKey); addEventListener('keyup', onKey);

  // ---------------------------------------------------------------- camera + MediaPipe
  let video = null, stream = null, recognizer = null, loading = null, lastVT = -1, lastTs = 0;
  const eyeC = document.createElement('canvas'); eyeC.width = 512; eyeC.height = 378;
  const eyeG = eyeC.getContext('2d', { willReadFrequently: true });
  async function loadRecognizer() {
    if (recognizer) return recognizer;
    if (!loading) {
      loading = (async () => {
        const vision = await import(/* @vite-ignore */ `${MP}/vision_bundle.mjs`);
        const files = await vision.FilesetResolver.forVisionTasks(`${MP}/wasm`);
        const opts = (delegate) => ({
          baseOptions: { modelAssetPath: new URL(ctx.asset(TASK), location.href).href, delegate },
          runningMode: 'VIDEO', numHands: 1,
          minHandDetectionConfidence: C.minConf, minHandPresenceConfidence: C.minConf, minTrackingConfidence: C.minConf,
        });
        try { return await vision.GestureRecognizer.createFromOptions(files, opts('GPU')); }
        catch { return await vision.GestureRecognizer.createFromOptions(files, opts('CPU')); }
      })();
    }
    recognizer = await loading;
    return recognizer;
  }
  function setMode(m) {
    mode = m;
    pip.classList.toggle('cam', m === 'cam');
    tag.textContent = m === 'cam' ? (eye ? 'Eye camera (simulated)' : 'Your camera') : 'Pad: drag to move';
    bStart.hidden = m === 'cam'; bStop.hidden = m !== 'cam'; bEye.hidden = m !== 'cam';
    bClaw.hidden = m === 'cam'; bClutch.hidden = m === 'cam'; reachS.el.hidden = m === 'cam';
    pmsg.textContent = '';
    setNote();
    reseed();
  }
  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) { status.textContent = 'This browser gives no camera access here, so the pad drives the hand.'; return; }
    bStart.disabled = true;
    status.textContent = 'Asking for your camera…';
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    } catch (e) {
      bStart.disabled = false;
      status.textContent = e && e.name === 'NotAllowedError' ? 'Camera blocked. The pad still drives the hand.' : 'No camera found. The pad still drives the hand.';
      return;
    }
    video = document.createElement('video');
    Object.assign(video, { muted: true, playsInline: true, srcObject: stream });
    try { await video.play(); } catch { /* starts on the next frame */ }
    status.textContent = 'Loading the hand tracker (about 8 MB, once)…';
    try { await loadRecognizer(); }
    catch (e) {
      console.error('[hand-teleop] MediaPipe failed', e);
      stopCamera();
      status.textContent = 'The hand tracker could not load here. The pad still drives the hand.';
      bStart.disabled = false;
      return;
    }
    if (!stream) return; // stopped while loading
    status.textContent = '';
    bStart.disabled = false;
    setMode('cam');
  }
  function stopCamera(msg) {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    if (video) { video.srcObject = null; video = null; }
    if (mode === 'cam') setMode('pad');
    status.textContent = msg || '';
  }
  function camFrame() {
    if (!video || !recognizer || video.readyState < 2 || video.currentTime === lastVT) return false;
    lastVT = video.currentTime;
    let src = video;
    const vw = video.videoWidth, vh = video.videoHeight;
    if (eye) {
      // what the glasses gave the tracker: 512 x 378, 4 bits of grey, noisy
      const s = Math.max(512 / vw, 378 / vh), dw = vw * s, dh = vh * s;
      eyeG.drawImage(video, (512 - dw) / 2, (378 - dh) / 2, dw, dh);
      const img = eyeG.getImageData(0, 0, 512, 378), d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] + (Math.random() - 0.5) * 40;
        const q = Math.floor(clamp(y, 0, 255) / 16) * 17;
        d[i] = d[i + 1] = d[i + 2] = q;
      }
      eyeG.putImageData(img, 0, 0);
      src = eyeC;
    }
    const ts = Math.max(lastTs + 1, performance.now());
    lastTs = ts;
    let res = null;
    try { res = recognizer.recognizeForVideo(src, ts); } catch (e) { console.error(e); }
    const lm = res?.landmarks?.[0]?.map((p) => [p.x, p.y]) || null;
    const top = res?.gestures?.[0]?.[0];
    step({ lm, gesture: top ? { name: top.categoryName, score: top.score } : null });
    // preview, mirrored
    const w = pc.width, hh = pc.height;
    g2.save(); g2.translate(w, 0); g2.scale(-1, 1);
    const sw = eye ? 512 : vw, sh = eye ? 378 : vh, s = Math.max(w / sw, hh / sh);
    g2.drawImage(src, (w - sw * s) / 2, (hh - sh * s) / 2, sw * s, sh * s);
    g2.restore();
    drawHand(g2, lastLm, w, hh, lastClutch);
    return true;
  }

  // ---------------------------------------------------------------- loop (only while on screen;
  // the stage redraws only when a joint actually moved)
  let acc = 0, raf = 0, prev = 0, onScreen = false;
  function tick(now) {
    raf = 0;
    if (!onScreen || document.hidden) return;
    const dt = prev ? Math.min(0.2, (now - prev) / 1000) : 0;
    prev = now;
    fpsT += dt;
    if (fpsT >= 1) { fps = steps / fpsT; steps = 0; fpsT = 0; }
    if (mode === 'cam') camFrame();
    else {
      acc += dt;
      let n = 0;
      while (acc >= 1 / C.fps && n < 4) {
        acc -= 1 / C.fps; n++;
        step({ lm: padLandmarks(), gesture: pad.clutch ? { name: 'Closed_Fist', score: 0.9 } : { name: pad.claw ? 'None' : 'Open_Palm', score: 0.9 } });
      }
      if (n) drawPad();
    }
    raf = requestAnimationFrame(tick);
  }
  const run = () => { if (!raf && onScreen && !document.hidden) { prev = 0; raf = requestAnimationFrame(tick); } };
  const onVis = () => run();
  document.addEventListener('visibilitychange', onVis);
  // stop the camera when the demo scrolls away
  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (!onScreen && stream) stopCamera('Camera stopped when you scrolled away. Press Start camera to use it again.');
    run();
  }, { threshold: 0 });
  io.observe(el);

  bStart.addEventListener('click', startCamera);
  bStop.addEventListener('click', () => stopCamera());
  bReset.addEventListener('click', reset);
  bEye.addEventListener('click', () => { eye = !eye; bEye.setAttribute('aria-pressed', String(eye)); tag.textContent = eye ? 'Eye camera (simulated)' : 'Your camera'; });
  setMode('pad');
  drawPad();

  return {
    dispose() {
      stopCamera();
      if (raf) cancelAnimationFrame(raf);
      onScreen = false;
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('keydown', onKey); removeEventListener('keyup', onKey);
      block.removeEventListener('pointerenter', enter); block.removeEventListener('pointerleave', leave);
      recognizer?.close?.(); recognizer = null; loading = null;
      stage.dispose();
    },
  };
}
