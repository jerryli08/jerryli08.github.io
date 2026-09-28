// Why the pivot broke, on Jerry's real CAD, driven only by the scroll. Four steps:
//  0  the arm swings from just off the floor to the up preset with the slides in; the readout is
//     TestTeleop.java's own math at each angle (P term, gravity feedforward, their sum)
//  1  back down, then the slides run all the way out; two lines from the pivot axis to the claw
//     body's centre show the lever arm growing from 0.44 m to 1.42 m (from the CAD)
//  2  a close look at the pivot: its three short 72 mm U-channels lit (Jerry has not said which one
//     broke, so all three are lit and none is named)
//  3  the interlock he would add: the slides come in first, and only then does the arm pivot
// The picture is a pure function of (step, progress through the step). Views are framed once with
// the robot at rest and cached; reduced motion cuts to each step's end.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { rigRobot, PIVOT, CLAW_C, PHI_UP, TRAVEL, FLOOR, TICKS_PER_DEG } from './rig.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const PHI_REST = 4;
const RED = '#ff4d4d', GREEN = '#3ddc84', ORANGE = '#ff6b35';

// TestTeleop.java: power = -kP (target - ticks) + kG cos(angle + 110 deg), angle = -360 ticks / 3895.9
const KP = 0.001, KG = 0.18, TARGET_UP = 50;
const ticksAt = (phi) => 1190.4 - phi * TICKS_PER_DEG;
function control(phi) {
  const t = ticksAt(phi);
  const angle = (-360 * t) / 3895.9;
  const P = -KP * (TARGET_UP - t);
  const Gr = KG * Math.cos((angle + 110) * DEG);
  return { t, P, Gr, out: clamp(P + Gr, -1, 1) };
}
// lever arm from the pivot axis to the claw body's centre, in the arm's own plane (y, z)
const R1 = Math.hypot(CLAW_C[1] - PIVOT[1], CLAW_C[2]); // 1.416 m, slides out
const R0 = Math.hypot(CLAW_C[1] - PIVOT[1], CLAW_C[2] - TRAVEL); // 0.438 m, slides in

function state(step, sp, reduced) {
  const m = (a, b) => (reduced ? 1 : smooth(a, b, sp));
  if (step === 0) return { phi: lerp(PHI_REST, PHI_UP, m(0.08, 0.9)), e: 0 };
  if (step === 1) return { phi: lerp(PHI_UP, PHI_REST, m(0.05, 0.4)), e: m(0.45, 0.95) };
  if (step === 2) return { phi: PHI_REST, e: 1 };
  return { phi: lerp(PHI_REST, PHI_UP, m(0.55, 0.95)), e: 1 - m(0.1, 0.5) };
}
const VIEW = ['sideUp', 'sideAll', 'pivot', 'sideAll'];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const R = await rigRobot(stage);
  const { model } = R;
  const reduced = ctx.reducedMotion;
  const pivotCh = [...R.part('G_PIVOT_CH'), ...R.part('G_TOWERS')];

  R.pose({ phi: PHI_REST, e: 0, wrist: 0, grip: [0, 0] });
  model.updateMatrixWorld(true);
  stage.fitGround();

  // ---- views, framed once at rest
  const boxOf = (x0, x1, y0, y1, z0, z1) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0));
    b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.updateMatrixWorld(true); return b;
  };
  const place = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const portrait = a < 0.9;
    const f = ctx.shift()[0] > 0 ? 1.18 : 1;
    const fr = (obj, azimuth, elevation, pad) => place(stage.frame(obj, { azimuth, elevation, pad: pad * f, apply: false, refresh: true }));
    views = {
      sideUp: fr(boxOf(-0.24, 0.19, FLOOR, 0.62, -0.3, 0.55), 90, 8, portrait ? 1.0 : 1.1),
      sideAll: fr(boxOf(-0.24, 0.19, FLOOR, 0.62, -0.3, 1.5), 90, 8, portrait ? 1.0 : 1.04),
      pivot: fr(pivotCh, 24, 20, portrait ? 1.7 : 2.2),
    };
    return views;
  }
  const sph = new THREE.Spherical();
  function blend(a, b, k) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sph.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    stage.setView({ pos: new THREE.Vector3().setFromSpherical(sph).add(target), target });
  }

  // ---- lever-arm lines: annotations drawn just outside the robot's +x side, over the model
  const LX = 0.22;
  const lineMat = (color, opacity) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
  const mkLine = (color, opacity) => {
    const g = new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const l = new THREE.Line(g, lineMat(color, opacity)); l.renderOrder = 10; l.frustumCulled = false; l.visible = false;
    model.add(l); return l;
  };
  const lineIn = mkLine('#e8e2da', 0.9), lineOut = mkLine(ORANGE, 1);
  const setLine = (l, a, b) => { const p = l.geometry.attributes.position; p.setXYZ(0, ...a); p.setXYZ(1, ...b); p.needsUpdate = true; };
  const clawAt = (phi, e) => {
    // the claw body's centre for pitch phi and extension e, about the pivot axis
    const dz = CLAW_C[2] - TRAVEL * (1 - e), dy = CLAW_C[1] - PIVOT[1];
    const c = Math.cos(phi * DEG), s = Math.sin(phi * DEG);
    return [LX, PIVOT[1] + dy * c + dz * s, dz * c - dy * s];
  };

  // ---- overlays: the controller readout, the lever-arm readout and the interlock chip
  const ov = labelLayer(stage);
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div data-k="ctl">
      <div class="rx-hud-row"><span>From TestTeleop.java</span><b class="num" data-k="tick"></b></div>
      <table class="num"><tbody>
        <tr><td>P term <small>-0.001 x (50 - ticks)</small></td><td data-k="P"></td></tr>
        <tr><td>Gravity term <small>0.18 cos(angle + 110°)</small></td><td data-k="G"></td></tr>
      </tbody></table>
      <div class="rx-hud-mini num" data-k="mini"></div>
      <div class="rx-hud-row rx-hud-big"><span>Motor power</span><b class="num" data-k="out"></b><i><em data-k="outBar"></em></i></div>
    </div>
    <div data-k="lev" style="display:none">
      <div class="rx-hud-row"><span>Claw from the pivot</span><b class="num" data-k="r"></b></div>
      <div class="rx-hud-row rx-hud-big"><span>Torque from the claw</span><b class="num" data-k="tq"></b><i><em data-k="tqBar"></em></i></div>
      <div class="rx-hud-row" style="margin-top:8px"><span>Inertia of the claw</span><b class="num" data-k="in"></b><i><em data-k="inBar"></em></i></div>
    </div>
    <div data-k="lock" style="display:none">
      <div class="rx-hud-row"><span>Slides out</span><b class="num" data-k="ext"></b></div>
      <div class="rx-hud-row rx-hud-big"><span data-k="lockTxt"></span><b data-k="lockDot" style="display:inline-block;width:14px;height:14px;border-radius:50%"></b></div>
    </div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, t) => { if (shown[k] !== t) { K[k].textContent = t; shown[k] = t; } };
  const css = (k, prop, v) => { const id = `${k}.${prop}`; if (shown[id] !== v) { K[k].style[prop] = v; shown[id] = v; } };
  const bar = (k, f) => css(k, 'width', `${(clamp(f, 0, 1) * 100).toFixed(1)}%`);
  const sgn = (v) => `${v < 0 ? '-' : '+'}${Math.abs(v).toFixed(3)}`;
  const LBL = {
    r0: ov.label('', [0, 0, 0], { color: '#e8e2da' }),
    r1: ov.label('', [0, 0, 0], { color: ORANGE }),
    ch: ov.label('Short 72 mm U-channels', [0, 0, 0], { color: ORANGE }),
  };
  LBL.r0.el.lastChild.textContent = `Slides in: ${R0.toFixed(2)} m`;
  const chBox = new THREE.Box3();
  for (const o of pivotCh) chBox.expandByObject(o);
  const chTop = new THREE.Vector3((chBox.min.x + chBox.max.x) / 2 + 0.04, chBox.max.y, 0);
  LBL.ch.p.copy(chTop);

  // step 2: a section just in front of the pivot axis (keeps z <= 0.03 m), so the arm and the front
  // half of the robot are cut away and the three channels, both motors and the hubs show whole
  let cut = null;
  function setCut(amount) {
    if (amount <= 0.001) { if (cut) cut.enable(false); return; }
    if (!cut) cut = stage.sectionPlane([0, 0, -1], 2);
    cut.enable(true);
    cut.set(lerp(1.6, 0.03, amount));
  }

  let lit = 0, unlit = null;
  function setProgress(p, step = 0, stepP = 0) {
    step = clamp(step | 0, 0, 3);
    const s = state(step, stepP, reduced);
    R.pose({ phi: s.phi, e: s.e, wrist: 0, grip: [0, 0] });
    const vs = viewsNow();
    const k = step === 0 || reduced ? 1 : smooth(0, 0.45, stepP);
    blend(vs[VIEW[Math.max(0, step - 1)]], vs[VIEW[step]], k);
    stage.setShift(...ctx.shift());

    // which readout shows
    const mode = step === 0 ? 'ctl' : step === 1 ? 'lev' : step === 3 ? 'lock' : '';
    for (const m of ['ctl', 'lev', 'lock']) css(m, 'display', mode === m ? '' : 'none');
    hud.style.display = mode ? '' : 'none';
    if (mode === 'ctl') {
      const c = control(s.phi);
      put('tick', `${Math.round(c.t)} ticks, target 50`);
      put('P', sgn(c.P)); put('G', sgn(c.Gr));
      put('out', sgn(c.out)); bar('outBar', Math.abs(c.out));
      put('mini', `P ${sgn(c.P)}, gravity ${sgn(c.Gr)}`);
    }
    const r = Math.hypot(CLAW_C[1] - PIVOT[1], CLAW_C[2] - TRAVEL * (1 - s.e));
    if (mode === 'lev') {
      put('r', `${r.toFixed(2)} m`);
      put('tq', `${(r / R0).toFixed(1)}x`); bar('tqBar', r / R1);
      put('in', `${((r / R0) ** 2).toFixed(1)}x`); bar('inBar', (r / R1) ** 2);
    }
    if (mode === 'lock') {
      const locked = s.e > 0.02;
      put('ext', `${Math.round(s.e * TRAVEL * 1000)} mm`);
      put('lockTxt', locked ? 'Slides out: pivot locked' : 'Slides in: pivot free');
      css('lockDot', 'background', locked ? RED : GREEN);
    }

    // lever-arm lines, step 1 only
    const showLines = step === 1 ? (reduced ? 1 : smooth(0.3, 0.5, stepP)) : 0;
    lineIn.visible = lineOut.visible = showLines > 0;
    if (showLines > 0) {
      const piv = [LX, PIVOT[1], PIVOT[2]];
      setLine(lineIn, piv, clawAt(s.phi, 0));
      setLine(lineOut, piv, clawAt(s.phi, s.e));
      lineIn.material.opacity = 0.9 * showLines; lineOut.material.opacity = showLines;
      stage.invalidate();
    }
    const c0 = clawAt(s.phi, 0), c1 = clawAt(s.phi, s.e);
    LBL.r0.p.set(...c0); LBL.r1.p.set(...c1);
    const t1 = s.e > 0.98 ? `Slides out: ${r.toFixed(2)} m, 3.2x the torque` : `${r.toFixed(2)} m`;
    if (LBL.r1.el.lastChild.textContent !== t1) LBL.r1.el.lastChild.textContent = t1;
    LBL.r0.a = showLines * (s.e > 0.12 ? 1 : 0);
    LBL.r1.a = showLines;

    // the pivot's channels lit in step 2
    const want = step === 2 ? Math.round(10 * (reduced ? 1 : smooth(0.2, 0.5, stepP))) / 10 : 0;
    if (want !== lit) {
      lit = want;
      unlit?.(); unlit = null;
      if (lit > 0) unlit = stage.highlight(pivotCh, ORANGE, { intensity: 0.55 * lit });
    }
    LBL.ch.a = step === 2 ? (reduced ? 1 : smooth(0.35, 0.6, stepP)) : 0;
    setCut(step === 2 ? k : step === 3 ? 1 - k : 0);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { unlit?.(); ov.dispose(); stage.dispose(); } };
}
