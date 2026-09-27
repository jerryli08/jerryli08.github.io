// Demo: drive the arm yourself. Drag the target in the arm's plane and the two-link inverse
// kinematics (rig.js) turns the real shoulder and elbow about their CAD axes to put the grip point
// on it. This is the planned control, worked out on the CAD; it never ran on the arm.
// The near half of the drone can be cut away so the arm reads in profile.
import { createStage } from '/assets/js/lib/stage.js';
import { readout, segmented, button } from '/assets/js/lib/ui.js';
import { loadArm, ik, fk, allowed, labels, hud, S, G, ZP, L1, L2, RMIN, RMAX, PHI_0, Q1_LIM, DEG, clamp, lerp } from './rig.js';

const NS = 'http://www.w3.org/2000/svg';
const CSS = `
.da-svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.da-svg.back { z-index: 0; pointer-events: none; }
.da-svg.front { z-index: 2; pointer-events: none; }
.da-svg .ring { fill: rgba(127,212,255,.07); stroke: rgba(127,212,255,.35); stroke-width: 1; fill-rule: evenodd; }
.da-svg .arc { fill: none; stroke: rgba(255,210,122,.75); stroke-width: 1.5; stroke-dasharray: 5 5; }
.da-svg .bone { fill: none; stroke: #7fd4ff; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.da-svg .joint { fill: #0b0a09; stroke: #eee9e3; stroke-width: 2; }
.da-svg .grip { fill: #7fd4ff; }
.da-svg .miss { stroke: rgba(255,179,138,.9); stroke-width: 1.5; stroke-dasharray: 3 4; }
.da-svg .handle { pointer-events: auto; cursor: grab; touch-action: none; }
.da-svg .handle .hit { fill: transparent; }
.da-svg .handle .dot { fill: #ff6b35; stroke: #fff; stroke-width: 2; }
.da-svg .handle.far .dot { fill: #8c847b; }
.da-svg .handle:focus { outline: none; } .da-svg .handle:focus-visible .dot { stroke: #ffd27a; stroke-width: 3; }
.da-hint { position: absolute; right: 12px; bottom: 12px; z-index: 4; padding: 5px 10px; border-radius: 999px; pointer-events: none;
  font: 550 12px/1.2 var(--font, system-ui, sans-serif); color: #b8b0a7; background: rgba(11,10,9,.75); border: 1px solid rgba(237,232,226,.14); }
`;
let styled = false;

export async function mount(el, ctx) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const stage = createStage(el, { controls: false });
  const T = stage.THREE;
  const rig = await loadArm(stage);
  if (rig.parts.bottle) rig.parts.bottle.visible = false;

  // side view of the arm's plane, framed on the drone and the space the arm can reach under it
  const region = new T.Mesh(new T.BoxGeometry(1.04, 0.74, 0.02));
  region.position.set(0.38, -0.255, ZP);
  const place = () => {
    const tall = el.clientHeight > el.clientWidth * 0.8;
    region.scale.set(1, tall ? 1.15 : 1, 1);
    region.position.y = tall ? -0.28 : -0.255;
    region.updateMatrixWorld(true);
    stage.frame(region, { azimuth: 0, elevation: 0, pad: 1.02, refresh: true });
  };
  place();
  const cut = stage.sectionPlane([0, 0, -1], -0.045); // keep z <= -45 mm: the near landing gear and props come off

  // ---------------------------------------------------------------- overlay layers
  const back = document.createElementNS(NS, 'svg'); back.setAttribute('class', 'da-svg back'); back.setAttribute('aria-hidden', 'true');
  const front = document.createElementNS(NS, 'svg'); front.setAttribute('class', 'da-svg front');
  el.insertBefore(back, stage.canvas); // behind the transparent canvas: the model draws over it
  el.append(front);
  const mk = (p, tag, cls) => { const n = document.createElementNS(NS, tag); if (cls) n.setAttribute('class', cls); p.append(n); return n; };
  const ring = mk(back, 'path', 'ring'), arc = mk(back, 'path', 'arc');
  const miss = mk(front, 'line', 'miss'), bone = mk(front, 'polyline', 'bone');
  const jS = mk(front, 'circle', 'joint'), jE = mk(front, 'circle', 'joint'), jG = mk(front, 'circle', 'grip');
  jS.setAttribute('r', 5); jE.setAttribute('r', 5); jG.setAttribute('r', 4.5);
  const handle = mk(front, 'g', 'handle');
  const hit = mk(handle, 'circle', 'hit'), dot = mk(handle, 'circle', 'dot');
  hit.setAttribute('r', 24); dot.setAttribute('r', 9);
  handle.setAttribute('tabindex', '0'); handle.setAttribute('role', 'slider');
  handle.setAttribute('aria-label', 'Arm target. Drag, or use the arrow keys, to move it in the arm plane');
  const hint = document.createElement('span'); hint.className = 'da-hint'; hint.textContent = 'Drag the orange target'; el.append(hint);

  const labs = labels(el);
  labs.add('s', { text: 'Shoulder', side: 'r' });
  labs.add('e', { text: 'Elbow', side: 'r' });
  labs.add('arc', { text: 'Claw level along this arc', side: 'r', cls: 'cam' });
  const status = hud(el);

  const v3 = new T.Vector3();
  const scr = (x, y) => { v3.set(x, y, ZP).project(stage.camera); return [((v3.x + 1) / 2) * el.clientWidth, ((1 - v3.y) / 2) * el.clientHeight]; };
  const pts = (list) => list.map(([x, y]) => scr(x, y).map((n) => n.toFixed(1)).join(',')).join(' ');
  function drawStatic() {
    // reach: the ring between |L1 - L2| and L1 + L2 around the shoulder
    const circ = (r) => { const a = []; for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2; a.push(scr(S[0] + r * Math.cos(t), S[1] + r * Math.sin(t))); } return `M${a.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L')}Z`; };
    ring.setAttribute('d', `${circ(RMAX)} ${circ(RMIN)}`);
    // where the claw is level (forearm at its CAD angle): grip = S + L1 (cos q1, sin q1) + L2 (cos phi0, sin phi0)
    const a = [];
    for (let q = Q1_LIM[0]; q <= Q1_LIM[1] + 1e-9; q += 1 * DEG) {
      const gx = S[0] + L1 * Math.cos(q) + L2 * Math.cos(PHI_0), gy = S[1] + L1 * Math.sin(q) + L2 * Math.sin(PHI_0);
      if (allowed(q, Math.atan2(Math.sin(PHI_0 - q), Math.cos(PHI_0 - q)))) a.push(scr(gx, gy));
    }
    arc.setAttribute('d', a.length ? `M${a.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L')}` : '');
    const qa = -100 * DEG;
    labs.point('arc', new T.Vector3(S[0] + L1 * Math.cos(qa) + L2 * Math.cos(PHI_0), S[1] + L1 * Math.sin(qa) + L2 * Math.sin(PHI_0), ZP));
  }

  // ---------------------------------------------------------------- state
  const target = { x: G[0], y: G[1] };
  let good = { x: G[0], y: G[1] }; // last target the arm could reach within the limits
  const info = readout(null, { rows: [
    { key: 't', label: 'Target from shoulder' },
    { key: 'q1', label: 'Shoulder q1', unit: '°', format: (v) => v.toFixed(1) },
    { key: 'q2', label: 'Elbow q2', unit: '°', format: (v) => v.toFixed(1) },
    { key: 'p', label: 'Claw tilt from level', unit: '°', format: (v) => v.toFixed(1) },
  ] });
  function solve(x, y) { const r = ik(x - S[0], y - S[1]); return { ...r, ok: allowed(r.q1, r.q2) }; }
  function apply() {
    let r = solve(target.x, target.y), note = '', cls = '';
    const inReach = r.reach;
    if (!r.ok) {
      // walk back toward the last good target until the pose is inside the limits
      let lo = 0, hi = 1;
      for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; const t = solve(lerp(good.x, target.x, m), lerp(good.y, target.y, m)); if (t.ok) lo = m; else hi = m; }
      r = solve(lerp(good.x, target.x, lo), lerp(good.y, target.y, lo));
      note = inReach ? 'At a joint limit: the arm stays under the drone' : `Out of reach: ${(RMAX * 1000).toFixed(0)} mm is the limit`;
      cls = 'warn';
      if (!r.ok) r = solve(good.x, good.y);
    } else if (!r.reach) { note = `Out of reach: ${(RMAX * 1000).toFixed(0)} mm is the limit`; cls = 'warn'; }
    if (r.ok) {
      const { g } = fk(r.q1, r.q2);
      if (r.reach) good = { x: target.x, y: target.y }; else good = { x: g[0], y: g[1] };
      rig.setJoints(r.q1, r.q2);
    }
    const { e, g } = fk(rig.q1, rig.q2);
    // overlay
    bone.setAttribute('points', pts([S, e, g]));
    const [sx, sy] = scr(...S), [ex, ey] = scr(...e), [gx, gy] = scr(...g), [tx, ty] = scr(target.x, target.y);
    jS.setAttribute('cx', sx); jS.setAttribute('cy', sy); jE.setAttribute('cx', ex); jE.setAttribute('cy', ey); jG.setAttribute('cx', gx); jG.setAttribute('cy', gy);
    handle.setAttribute('transform', `translate(${tx.toFixed(1)} ${ty.toFixed(1)})`);
    const far = Math.hypot(tx - gx, ty - gy) > 3;
    handle.classList.toggle('far', far);
    miss.setAttribute('x1', gx); miss.setAttribute('y1', gy); miss.setAttribute('x2', far ? tx : gx); miss.setAttribute('y2', far ? ty : gy);
    labs.point('s', new T.Vector3(S[0], S[1], ZP)); labs.point('e', new T.Vector3(e[0], e[1], ZP));
    labs.update(stage.camera);
    const u = (target.x - S[0]) * 1000, v = (target.y - S[1]) * 1000;
    handle.setAttribute('aria-valuetext', `${u.toFixed(0)} mm across, ${v.toFixed(0)} mm up from the shoulder`);
    const tilt = Math.atan2(Math.sin(rig.q1 + rig.q2 - Math.PI), Math.cos(rig.q1 + rig.q2 - Math.PI)) / DEG;
    info.set({ t: `${u.toFixed(0)}, ${v.toFixed(0)} mm`, q1: rig.q1 / DEG, q2: rig.q2 / DEG, p: tilt });
    status.set(note || `Reach ${Math.hypot(g[0] - S[0], g[1] - S[1]) * 1000 | 0} mm of ${(RMAX * 1000).toFixed(0)}`, cls);
  }
  function redraw() { drawStatic(); apply(); }

  // ---------------------------------------------------------------- input
  const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 0, 1), -ZP), hitp = new T.Vector3(), ndc = new T.Vector2();
  function toPlane(e) {
    const r = el.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    return ray.ray.intersectPlane(plane, hitp) ? { x: hitp.x, y: hitp.y } : null;
  }
  let drag = null;
  handle.addEventListener('pointerdown', (e) => { e.preventDefault(); drag = e.pointerId; handle.setPointerCapture(e.pointerId); hint.hidden = true; });
  handle.addEventListener('pointermove', (e) => { if (drag !== e.pointerId) return; const p = toPlane(e); if (p) { target.x = p.x; target.y = p.y; apply(); } });
  const end = (e) => { if (drag === e.pointerId) drag = null; };
  handle.addEventListener('pointerup', end); handle.addEventListener('pointercancel', end);
  // mouse: a click anywhere on the stage sends the target there (touch keeps scrolling the page)
  const onClick = (e) => { if (e.pointerType === 'touch' || e.target.closest?.('.handle')) return; const p = toPlane(e); if (p) { target.x = p.x; target.y = p.y; hint.hidden = true; apply(); } };
  el.addEventListener('pointerdown', onClick);
  handle.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[e.key];
    if (!k) return;
    e.preventDefault();
    const s = e.shiftKey ? 0.02 : 0.005;
    target.x += k[0] * s; target.y += k[1] * s; apply();
  });

  // ---------------------------------------------------------------- controls
  let clawAnim = null;
  segmented(ctx.panel, { label: 'Claw', options: [{ value: 0, label: 'Closed' }, { value: 1, label: 'Open' }], value: 0,
    onChange(v) {
      clawAnim?.();
      if (ctx.reducedMotion) { rig.setClaw(v); return; }
      const from = rig.open;
      let t = 0;
      clawAnim = stage.onFrame((dt) => { t = Math.min(1, t + dt / 0.35); rig.setClaw(lerp(from, v, t)); if (t >= 1) { clawAnim(); clawAnim = null; } });
    } });
  segmented(ctx.panel, { label: 'View', options: [{ value: 'cut', label: 'Near side cut away' }, { value: 'all', label: 'Whole drone' }], value: 'cut', onChange: (v) => cut.enable(v === 'cut') });
  button(ctx.panel, { label: 'Back to the CAD pose', onClick() { target.x = G[0]; target.y = G[1]; good = { x: G[0], y: G[1] }; apply(); } });
  ctx.panel.append(info.el);

  let raf = 0;
  const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { place(); raf = requestAnimationFrame(redraw); }); });
  ro.observe(el);
  redraw();
  return {
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); clawAnim?.(); el.removeEventListener('pointerdown', onClick); back.remove(); front.remove(); hint.remove(); labs.dispose(); status.dispose(); region.geometry.dispose(); region.material.dispose(); stage.dispose(); },
  };
}
