// "How the hand drives the arm", scroll-driven: our AR hand-control code (handsim.js, ported from
// github.com/amzoeee/soma-hackathon, robot/) run once, at mount, on a drawn hand that follows a script,
// 30 frames a second. The scroll picks the frame, so scrolling back plays it backwards. No camera is
// used: the glasses view in the corner is a drawing of the hand the script feeds the pipeline.
// Six steps (handsim.STEPS): a hand appears, across and up, reach by hand size, pinch and lift, the
// fist clutch, carry on and let go.
import { createStage } from '/assets/js/lib/stage.js';
import { THREE, loadArm, props, fitBox, cachedView, placeView, style, h, writer, toArm, clamp, lerp } from './rig.js';
import { runHand, STEPS, FPS, BONES, C, ASPECT } from './handsim.js';

const CSS = `
.lq-cam { position: absolute; z-index: 3; left: 14px; top: 14px; width: clamp(190px, 31%, 330px); aspect-ratio: ${512} / ${378};
  border-radius: 12px; overflow: hidden; background: #111; border: 1px solid rgba(255, 255, 255, 0.16); box-shadow: 0 16px 30px -18px #000; pointer-events: none; }
.lq-cam canvas { display: block; width: 100%; height: 100%; }
.lq-cam b { position: absolute; left: 9px; top: 7px; font: 600 11px/1.3 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #e8e8e8; text-shadow: 0 1px 2px #000; }
.lq-hud-h td:first-child { transition: none; }
.lq-hud-h tr.on td { color: var(--text); }
.lq-hud-h tr.on td:first-child { box-shadow: inset 3px 0 0 var(--accent); padding-left: 8px; }
.lq-hud-h .lq-ok { color: #3ee06b; } .lq-hud-h .lq-warn { color: #ffd23f; } .lq-hud-h .lq-dim { color: var(--muted); }
@media (max-width: 640px) { .lq-cam { width: 42%; left: 8px; top: auto; bottom: 8px; } }
`;

// which readout row each step is about: 0 none, 1 across + height, 2 reach, 3 pinch, 4 clutch, 5 all
const ROWS_ON = [[], ['x', 'y'], ['s'], ['p'], ['c'], ['x', 'y', 'p']];

export async function mount(el, ctx) {
  style('lq-hand-css', CSS);
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const arm = await loadArm(stage);
  const { can } = props(stage);
  stage.fitGround();
  const run = runHand([0.24, -0.09]);
  const F = run.frames;

  // the gripper target (an annotation): where the pipeline asks the gripper to go
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.006, 16, 12), new THREE.MeshBasicMaterial({ color: '#3ee06b', depthTest: false, transparent: true, opacity: 0.9 }));
  dot.renderOrder = 8;
  stage.scene.add(dot);

  // one view, framed once around the space the arm works in
  const box = fitBox(stage, [-0.17, 0, -0.08], [0.1, 0.3, 0.3]);
  const view = cachedView(stage, el, box, { azimuth: 24, elevation: 20, pad: (a) => (a < 1 ? 1.02 : 1.1) });

  // ---------------------------------------------------------------- the glasses view (drawn)
  const cam = h('div', 'lq-cam');
  const cv = h('canvas');
  cam.append(cv, h('b', null, 'Glasses camera (drawn)'));
  el.append(cam);
  const g2 = cv.getContext('2d');
  // a still grey, 16-level backdrop in the style of the Eye camera's frames (seeded, drawn once)
  const noise = document.createElement('canvas');
  noise.width = 128; noise.height = 95;
  {
    const ng = noise.getContext('2d'), img = ng.createImageData(128, 95);
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < 95; y++) for (let x = 0; x < 128; x++) {
      const base = 58 + 30 * (y / 95) - 18 * Math.hypot(x / 128 - 0.5, y / 95 - 0.55);
      const v = Math.floor(clamp(base + (rnd() - 0.5) * 26, 0, 255) / 16) * 17, i = (y * 128 + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255;
    }
    ng.putImageData(img, 0, 0);
  }
  let cw = 0, ch = 0;
  function sizeCanvas() {
    const r = Math.min(2, devicePixelRatio || 1);
    const w = Math.round(cam.clientWidth * r), hh = Math.round(cam.clientHeight * r);
    if (w !== cw || hh !== ch) { cv.width = cw = w; cv.height = ch = hh; lastDraw = ''; }
  }
  let lastDraw = '';
  function drawCam(f, step) {
    sizeCanvas();
    const key = `${f.t.toFixed(3)}|${step}|${cw}`;
    if (key === lastDraw || !cw) return;
    lastDraw = key;
    const W = cw, H = ch, u = W / 330;
    g2.imageSmoothingEnabled = false;
    g2.drawImage(noise, 0, 0, W, H);
    const lm = f.lm;
    const P = lm ? lm.map(([x, y]) => [x * W, y * H]) : null;
    const hud = f.hud;
    // the origin the motion is measured from, and the hand's offset from it
    if (P && hud.origin && !hud.clutched) {
      const ox = hud.origin[0] * W, oy = hud.origin[1] * H;
      g2.strokeStyle = 'rgba(255,107,53,0.95)'; g2.lineWidth = 2 * u; g2.setLineDash([5 * u, 4 * u]);
      g2.beginPath(); g2.moveTo(ox, oy); g2.lineTo(P[0][0], P[0][1]); g2.stroke(); g2.setLineDash([]);
      g2.beginPath(); g2.arc(ox, oy, 5 * u, 0, Math.PI * 2); g2.stroke();
      g2.fillStyle = '#ff6b35'; g2.font = `600 ${11 * u}px ui-monospace, Menlo, monospace`;
      g2.fillText('origin', ox + 8 * u, oy + 16 * u);
    }
    if (!P) {
      g2.fillStyle = 'rgba(240,240,240,0.75)'; g2.font = `600 ${13 * u}px ui-monospace, Menlo, monospace`;
      g2.fillText('Hand: MISSING', 10 * u, H - 12 * u);
      return;
    }
    // hand size (wrist to middle knuckle) and pinch (thumb tip to index tip), when a step is about them
    if (step === 2) {
      g2.strokeStyle = '#ffd23f'; g2.lineWidth = 5 * u;
      g2.beginPath(); g2.moveTo(...P[0]); g2.lineTo(...P[9]); g2.stroke();
    }
    g2.lineWidth = 2.4 * u;
    g2.strokeStyle = hud.clutched ? '#ff4b3e' : '#3ee06b';
    g2.beginPath();
    for (const [a, b] of BONES) { g2.moveTo(...P[a]); g2.lineTo(...P[b]); }
    g2.stroke();
    g2.fillStyle = '#ff8000';
    for (const [x, y] of P) { g2.beginPath(); g2.arc(x, y, 2.8 * u, 0, Math.PI * 2); g2.fill(); }
    if (step === 3 || step === 5) {
      g2.strokeStyle = '#6cc4ff'; g2.lineWidth = 3 * u;
      g2.beginPath(); g2.moveTo(...P[4]); g2.lineTo(...P[8]); g2.stroke();
    }
    g2.fillStyle = 'rgba(240,240,240,0.85)'; g2.font = `600 ${12 * u}px ui-monospace, Menlo, monospace`;
    g2.fillText(`${hud.clutched ? 'CLUTCH' : 'Hand'} · ${hud.gesture}`, 10 * u, H - 12 * u);
  }

  // ---------------------------------------------------------------- readout
  const hudEl = h('div', 'rx-hud lq-hud-h');
  hudEl.innerHTML = `
    <div class="rx-hud-row"><span>Clutch</span><b class="num" data-k="c"></b><i><em data-k="cBar"></em></i></div>
    <table class="num"><thead><tr><th></th><th>Hand</th><th>Gripper target</th></tr></thead><tbody>
      <tr data-r="x"><td>Across <small>y = 0.6 × Δx</small></td><td data-k="hx"></td><td data-k="ty"></td></tr>
      <tr data-r="y"><td>Height <small>z = −0.5 × Δy</small></td><td data-k="hy"></td><td data-k="tz"></td></tr>
      <tr data-r="s"><td>Reach <small>x = −0.5 × Δsize</small></td><td data-k="hs"></td><td data-k="tx"></td></tr>
      <tr data-r="p"><td>Pinch <small>gap ÷ (2 × size)</small></td><td data-k="hp"></td><td data-k="tg"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  el.append(hudEl);
  const K = Object.fromEntries([...hudEl.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const R = Object.fromEntries([...hudEl.querySelectorAll('[data-r]')].map((n) => [n.dataset.r, n]));
  const put = writer();
  const cls = new Map();
  const setCls = (node, c) => { if (cls.get(node) !== c) { node.className = c; cls.set(node, c); } };
  const sg = (v, d = 3) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;
  const m = (v) => `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(3)} m`;
  function readout(f, step) {
    const d = f.hud;
    const fist = Math.min(d.fistN, C.clutchOn);
    put(K.c, d.clutched ? 'ACTIVE: arm frozen' : fist > 0 ? `fist ${fist} / ${C.clutchOn} frames` : 'off');
    setCls(K.c, `num ${d.clutched ? 'lq-warn' : ''}`);
    const w = `${((d.clutched ? 1 : fist / C.clutchOn) * 100).toFixed(0)}%`;
    if (cls.get('bar') !== w) { K.cBar.style.width = w; cls.set('bar', w); }
    const live = d.hand && d.origin;
    put(K.hx, live ? `Δx ${sg(d.hand[0] - d.origin[0])}` : '·');
    put(K.hy, live ? `Δy ${sg(d.hand[1] - d.origin[1])}` : '·');
    put(K.hs, f.h ? `${f.h.s.toFixed(3)}${live ? ` (${sg(-(d.hand[2] - d.origin[2]))})` : ''}` : '·');
    put(K.hp, d.pinch != null ? d.pinch.toFixed(2) : '·');
    put(K.tx, `x ${m(d.ee[0])}`); put(K.ty, `y ${m(d.ee[1])}`); put(K.tz, `z ${m(d.ee[2])}`);
    put(K.tg, `claw ${Math.round(clamp(d.g, 0, 1) * 100)}% open`);
    put(K.mini, `Target ${d.ee.map((v) => v.toFixed(2)).join(', ')} m · claw ${Math.round(clamp(d.g, 0, 1) * 100)}% open${d.clutched ? ' · clutch on' : ''}`);
    for (const [k, row] of Object.entries(R)) setCls(row, ROWS_ON[step].includes(k) ? 'on' : '');
  }

  // ---------------------------------------------------------------- the picture for a scroll position
  const qa = new Array(6);
  let last = '';
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, STEPS.length - 2);
    const f01 = reduced ? 1 : clamp(stepP / 0.85, 0, 1);
    const t = STEPS[s] + (STEPS[s + 1] - STEPS[s]) * f01;
    const n = clamp(t * FPS, 0, F.length - 1), i = Math.min(F.length - 2, Math.floor(n)), k = n - i;
    const key = `${s}|${n.toFixed(3)}|${el.clientWidth}x${el.clientHeight}`;
    if (key === last) return;
    last = key;
    const A = F[i], B = F[i + 1];
    for (let j = 0; j < 6; j++) qa[j] = lerp(A.q[j], B.q[j], k);
    arm.pose(qa);
    const nb = k < 0.5 ? A : B;
    const cb = A.can.b.map((v, j) => lerp(v, B.can.b[j], k)), ca = A.can.a.map((v, j) => lerp(v, B.can.a[j], k));
    can.place(cb, ca);
    dot.position.set(...toArm(nb.hud.ee));
    stage.invalidate();
    const phone = el.clientWidth < 640;
    stage.setShift(phone ? 0.2 : 0.03, phone ? -0.1 : -0.1);
    const v = view();
    placeView(stage, v, v, 0, reduced ? 0 : ((s + f01) / 6 - 0.5) * 0.3);
    readout(nb, s);
    drawCam(nb, s);
  }
  const ro = new ResizeObserver(() => { lastDraw = ''; last = ''; });
  ro.observe(cam);
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); stage.dispose(); } };
}
