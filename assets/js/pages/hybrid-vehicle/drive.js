// "The belt drivetrain", scroll-driven: the rover's left side, cut open along the outside of the
// belt (keeps model z <= -0.047) so both pulleys and the belt run show. Each side is skid steered:
// a servo drives the rear wheel, whose 35-tooth HTD 3M pulley carries a 384 mm belt to the same
// pulley in the front wheel. u = step + progress through the step (0..4):
//   0  at rest, the parts named     2  arcing left: left side 30 %, right side 70 %
//   1  forward: both sides at 60 %  3  turning in place: left side back, right side forward
// The wheels turn about their real axles by the running total of each side's speed over the
// scroll (tabulated once), so the picture is a pure function of u; the speeds are for the picture.
// The belt in the CAD is one static part, so its motion is shown with marks drawn on it (one per
// belt tooth, every eighth in orange) moving at the pulley's pitch speed. The inset is a diagram
// of ideal skid steering, not CAD.
import { createStage } from '/assets/js/lib/stage.js';
import { rigWheels, tags, anchor, region, integrate, freeLeftOf, smooth, lerp, clamp } from './common.js';

// from the CAD: pulley centres (model x), axle height, belt back radius, belt edges; HTD 3M 35T pitch radius
const XF = 0.3481, XR = 0.4878, CY = -0.1372, RB = 0.01756 + 0.00025, PITCH_R = 35 * 0.003 / (2 * Math.PI);
const Z0 = -0.0599, Z1 = -0.0479, C = XR - XF, L = 2 * C + 2 * Math.PI * PITCH_R, TEETH = 128;
const TRACK = 135.2; // mm between the wheel centre planes, from the CAD
// how far the picture is lifted (fraction of the stage height) to keep the rover clear of the
// readout, and the framing pad: a wide, short stage (1280 x 720) gets more of both
const LIFT_PHONE = 0.07;
const wideOf = (el) => clamp((el.clientWidth / Math.max(1, el.clientHeight) - 1.6) / 0.35, 0, 1);
// each side's speed per step, as a fraction of full: [left, right]
const SIDES = [[0, 0], [0.6, 0.6], [0.3, 0.7], [-0.6, 0.6]];
const sideAt = (u, i) => {
  const s = clamp(Math.floor(u), 0, SIDES.length - 1), k = smooth(s, s + 0.35, u);
  return lerp(SIDES[Math.max(0, s - 1)][i], SIDES[s][i], s === 0 ? 1 : k);
};
const TURNS = 1.2 * 2 * Math.PI; // wheel radians per step of scrolling at full speed (the picture only)
const angL = integrate((u) => sideAt(u, 0), 4), angR = integrate((u) => sideAt(u, 1), 4);

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const rover = await stage.load('/assets/models/rover.glb');
  const { wheels } = rigWheels(stage, rover);
  const T3 = stage.THREE;
  const reduced = ctx.reducedMotion;

  // tooth marks on the back of the left belt
  const geo = new T3.BoxGeometry(0.0008, 0.0005, Z1 - Z0 + 0.0004);
  const mat = new T3.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, metalness: 0 });
  const marks = new T3.InstancedMesh(geo, mat, TEETH);
  marks.name = 'belt marks';
  const grey = new T3.Color('#d9d2c9'), orange = new T3.Color('#ff6b35');
  for (let i = 0; i < TEETH; i++) marks.setColorAt(i, i % 8 === 0 ? orange : grey);
  marks.castShadow = false; marks.receiveShadow = false;
  rover.add(marks);
  const m4 = new T3.Matrix4(), q = new T3.Quaternion(), p = new T3.Vector3(), one = new T3.Vector3(1, 1, 1), zAxis = new T3.Vector3(0, 0, 1);
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
  let laid = NaN;
  function layMarks(sBelt) {
    if (sBelt === laid) return false;
    laid = sBelt;
    for (let i = 0; i < TEETH; i++) place(i, sBelt + (i * L) / TEETH);
    marks.instanceMatrix.needsUpdate = true;
    return true;
  }

  // cut away everything outboard of the left belt
  stage.sectionPlane([0, 0, -1], -0.047);
  const focus = region([0.293, -0.1745, -0.1], [0.543, -0.0895, -0.04]);
  let view = null, vkey = '';
  function viewNow(sx, sy) {
    const key = `${el.clientWidth}x${el.clientHeight}:${sx}:${sy}`;
    if (view && key === vkey) return view;
    vkey = key;
    stage.setShift(sx, sy); // frame with the runtime's shift; setProgress then lifts the picture
    view = stage.frame(focus, { azimuth: 16, elevation: 17, pad: el.clientWidth < 620 ? 1.02 : 1.1 + 0.1 * wideOf(el), apply: false, track: false, refresh: true });
    return view;
  }

  // ---------------------------------------------------------------- labels and the readout
  const A = (pt) => anchor(rover, rover, pt);
  const ov = tags(stage);
  const freeLeft = freeLeftOf(el, ctx); // a label that would run under the step cards flips to the other side
  const labs = [
    ov.tag('Axon MINI drive servo', A([0.4764, -0.1372, -0.0911]), { side: 'l', short: 'Drive servo' }),
    ov.tag('Rear wheel: 35T HTD 3M pulley', A([XR, CY, -0.049]), { side: 'r', short: 'Rear pulley, 35T' }),
    ov.tag('Front wheel: the same 35T pulley', A([XF, CY, -0.049]), { side: 'l', short: 'Front pulley' }),
    ov.tag('Belt, 384 mm long, 12 mm wide', A([0.418, CY - RB, -0.049]), { side: 'r', short: 'Belt, 384 mm' }),
  ];
  // One readout at the bottom right (at the bottom, full width, on a phone): both sides' speeds,
  // the belt ratio and a top view of ideal skid steering. Sized by the shared floors in site.css
  // (.rx-inset, --rx-ov-*: Jerry, Sept 28, "whenever you do popups like these make sure they are
  // big enough"); the picture is lifted a little so the rover stays clear of it.
  if (!document.getElementById('hv-drive-css')) {
    const st = document.createElement('style'); st.id = 'hv-drive-css';
    st.textContent = `
.rx-inset.hv-di { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 18px; align-items: center; width: clamp(380px, 31vw, 540px); padding: 14px 18px 14px 14px; --hv-h: clamp(170px, 27vh, 250px); }
.rx-inset.hv-di > svg { width: calc(var(--hv-h) * 0.75); height: var(--hv-h); border-radius: 0; }
.hv-di-txt { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.hv-di-state { font-size: calc(var(--rx-ov-text) * 1.25); line-height: 1.25; font-weight: 650; color: var(--text); }
.rx-inset.hv-di.hv-di-narrow { left: 8px; right: 8px; width: auto; gap: 12px; padding: 9px 12px 9px 8px; --hv-h: 124px; }
.hv-di-narrow .hv-di-txt { gap: 6px; }
.hv-di-narrow .hv-di-state { font-size: 14px; }`;
    document.head.append(st);
  }
  const inset = document.createElement('div');
  inset.className = 'rx-inset hv-di';
  inset.style.opacity = '0';
  inset.innerHTML = `<svg viewBox="-60 -80 120 160" aria-hidden="true">
    <defs><marker id="hvA" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="4.5" markerHeight="4.5" orient="auto-start-reverse"><path d="M0 0 8 4 0 8z" fill="#ff9a6b"/></marker><marker id="hvB" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 8 4 0 8z" fill="#eee9e3"/></marker></defs>
    <rect x="-37" y="-60" width="74" height="120" rx="8" fill="rgba(255,255,255,.06)" stroke="rgba(255,255,255,.3)"/>
    <text data-k="F" x="0" y="-66" fill="#b8b0a7" font-size="10" text-anchor="middle">front</text>
    <g fill="#6f675f"><rect x="-47" y="-44" width="9" height="26" rx="2"/><rect x="-47" y="18" width="9" height="26" rx="2"/><rect x="38" y="-44" width="9" height="26" rx="2"/><rect x="38" y="18" width="9" height="26" rx="2"/></g>
    <line data-k="L" x1="-42" y1="0" x2="-42" y2="0" stroke="#ff9a6b" stroke-width="3.2" marker-end="url(#hvA)"/>
    <line data-k="R" x1="42" y1="0" x2="42" y2="0" stroke="#ff9a6b" stroke-width="3.2" marker-end="url(#hvA)"/>
    <path data-k="P" d="" fill="none" stroke="#eee9e3" stroke-width="1.8" stroke-dasharray="3.5 3" marker-end="url(#hvB)"/>
  </svg><div class="hv-di-txt">
    <b class="hv-di-state" data-k="S"></b>
    <div class="rx-hud-row"><span>Left side (near)</span><b class="num" data-k="l"></b><i><em data-k="lBar"></em></i></div>
    <div class="rx-hud-row"><span>Right side</span><b class="num" data-k="r"></b><i><em data-k="rBar"></em></i></div>
    <small class="rx-hud-x">Top view: the arrows are each side’s speed, the dashed line its path</small>
  </div>`;
  ov.layer.append(inset);
  const $ = (k) => inset.querySelector(`[data-k="${k}"]`);
  const drawn = {};
  const attr = (k, a, v) => { const key = `${k}.${a}`; if (drawn[key] !== v) { $(k).setAttribute(a, v); drawn[key] = v; } };
  const put = (k, t) => { if (drawn[k] !== t) { $(k).textContent = t; drawn[k] = t; } };
  const bar = (k, f) => { const w = `${(clamp(f, 0, 1) * 100).toFixed(1)}%`; if (drawn[k] !== w) { $(k).style.width = w; drawn[k] = w; } };
  function diagram(vl, vr) {
    attr('L', 'y2', (-vl * 34).toFixed(1)); attr('R', 'y2', (-vr * 34).toFixed(1));
    attr('L', 'opacity', Math.abs(vl) > 0.02 ? '1' : '0'); attr('R', 'opacity', Math.abs(vr) > 0.02 ? '1' : '0');
    // ideal skid steer (no slip): v = (vL + vR) / 2, turn rate = (vR - vL) / track width
    const Wd = 84, v = (vl + vr) / 2, w = (vr - vl) / Wd;
    let text, d = '';
    if (Math.abs(vl) < 0.02 && Math.abs(vr) < 0.02) text = 'Stopped';
    else if (Math.abs(v) < 0.015) { text = w > 0 ? 'Turning in place, left' : 'Turning in place, right'; d = w > 0 ? 'M18 -18 A25 25 0 0 0 -18 -18' : 'M-18 -18 A25 25 0 0 1 18 -18'; }
    else {
      // trace the centre's path: heading measured from straight ahead, positive to the left
      let x = 0, y = 0, h = 0, len = 0;
      const pts = ['M0 0'];
      while (len < 54 && Math.abs(h) < 1.7) { x -= Math.sin(h) * Math.sign(v); y -= Math.cos(h) * Math.sign(v); h += w / Math.abs(v); len += 1; pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`); }
      d = pts.join(' ');
      if (Math.abs(w) < 1e-4) text = v > 0 ? 'Straight ahead' : 'Straight back';
      else text = `${(w > 0) === (v > 0) ? 'Arcing left' : 'Arcing right'}, radius\u00a0${Math.round((Math.abs(v / w) / Wd) * TRACK)}\u00a0mm`;
    }
    attr('P', 'd', d);
    put('S', text);
  }

  function setProgress(pr, step, stepP) {
    const u = clamp(step + stepP, 0, 4);
    const narrow = el.clientWidth < 620;
    const [sx, sy] = ctx.shift();
    const v0 = viewNow(sx, sy); // framed once per size, with the runtime's shift
    stage.setShift(sx, sy + (narrow ? LIFT_PHONE : 0.03 + 0.05 * wideOf(el))); // then lifted clear of the readout
    stage.setView(v0);
    // with reduced motion the sides jump to each step's speeds and the wheels stay put
    const uu = reduced ? Math.floor(u) + 0.999 : u;
    const vl = sideAt(uu, 0), vr = sideAt(uu, 1);
    const aL = reduced ? 0 : angL(u) * TURNS, aR = reduced ? 0 : angR(u) * TURNS;
    for (const w of wheels) w.setAngle(w.left ? aL : aR);
    if (layMarks(aL * PITCH_R)) stage.invalidate(); // the left belt moves at the pulley's pitch-line speed
    const la = 1 - smooth(1.35, 1.6, u);
    labs.forEach((t, i) => { t.a = narrow && (i === 0 || i === 2) ? 0 : la; }); // on a phone the servo and front pulley labels would crowd the rear wheel
    ov.update(narrow, freeLeft());
    const pct = (x) => `${x > 0 ? '+' : ''}${Math.round(x * 100)} %`;
    put('l', pct(vl)); bar('lBar', Math.abs(vl));
    put('r', pct(vr)); bar('rBar', Math.abs(vr));
    const ia = String(Math.round(smooth(0.9, 1.1, u) * 100) / 100);
    if (drawn.a !== ia) { inset.style.opacity = ia; inset.style.visibility = ia === '0' ? 'hidden' : ''; drawn.a = ia; }
    if (drawn.narrow !== narrow) { inset.classList.toggle('hv-di-narrow', narrow); attr('F', 'font-size', narrow ? '15' : '10'); drawn.narrow = narrow; }
    diagram(vl, vr);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); geo.dispose(); mat.dispose(); focus.geometry.dispose(); stage.dispose(); } };
}
