// "The lift", scroll-driven: Jerry's CAD with the carriage running on its MGN9 rails. The winch
// pulley turns about its axle in the CAD by the line it has wound (112 mm of line per turn), the
// line shortens with it, and the carriage carries the SO-101 with it. u = step + progress, 0..4:
//   0 the carriage at its CAD height     1 one pulley turn up, close on the winch
//   2 paying line out: down to the bottom of the travel     3 the full stroke up, five turns
// Travel limits are the carriage's end positions on the rails in the CAD (-258 mm to +302 mm).
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, PULLEY_R, PLATE_Y, LIFT_MIN, LIFT_MAX, clamp, lerp, smooth } from './rig.js';

const TURN = 2 * Math.PI * PULLEY_R; // 112 mm of line per turn
const seg = (f, a, b) => smooth((f - a) / (b - a));
function dyAt(s, f) {
  if (s === 0) return 0;
  if (s === 1) return TURN * seg(f, 0.15, 0.85);
  if (s === 2) return lerp(TURN, LIFT_MIN, seg(f, 0.1, 0.85));
  return lerp(LIFT_MIN, LIFT_MAX, seg(f, 0.08, 0.9));
}

export async function mount(el, ctx) {
  const reduced = ctx.reducedMotion;
  const stage = createStage(el, { controls: false, hint: false });
  const R = await loadRobot(stage);
  stage.highlight([...R.groups.carriage, ...R.groups.winch], '#ff6b35', { intensity: 0.14 });

  // where the carriage and the rails are, from the CAD (for the labels)
  const cb = new THREE.Box3();
  for (const m of R.groups.carriage) cb.expandByObject(m);
  const cc = cb.getCenter(new THREE.Vector3());
  const ov = labelLayer(stage);
  const narrow = el.clientWidth < 640; // phone: shorter labels
  const carriageAt = new THREE.Vector3(cb.max.x, cc.y, cc.z);
  const L = {
    carriage: ov.label(narrow ? 'Carriage' : 'Carriage: grid plate on two MGN9H blocks', carriageAt.toArray(), { color: '#ff6b35' }),
    rails: ov.label('Two 600 mm MGN9 rails', [cc.x, 0.2, cc.z], { color: '#fff1e2', minW: 520 }),
    mast: ov.label('The mast: a 1,008 mm corner post', [0.165, 0.86, 0.145], { color: '#fff1e2', minW: 520 }),
    winch: ov.label(narrow ? 'Winch pulley' : 'Winch pulley: 112 mm of line per turn', [0.19, 1.03, 0.178], { color: '#ff6b35' }),
    line: ov.label('1 mm synthetic line', [0.1912, 0.8, 0.1596], { color: '#fff1e2' }),
  };
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  hud.innerHTML = `
    <div class="rx-hud-row rx-hud-big" style="margin-top:0;padding-top:0;border-top:0"><span>Arm plate above the floor</span><b class="num" data-k="h"></b><i><em data-k="hBar"></em></i></div>
    <table class="num"><tbody>
      <tr><td>Carriage above its lowest point</td><td data-k="dy"></td></tr>
      <tr><td>Pulley turns from the bottom <small>112 mm of line each</small></td><td data-k="turns"></td></tr>
      <tr class="rx-hud-x"><td>Line below the pulley</td><td data-k="line"></td></tr>
    </tbody></table>
    <div class="rx-hud-mini num" data-k="mini"></div>`;
  ov.layer.append(hud);
  const K = Object.fromEntries([...hud.querySelectorAll('[data-k]')].map((n) => [n.dataset.k, n]));
  const shown = {};
  const put = (k, s) => { if (shown[k] !== s) { K[k].textContent = s; shown[k] = s; } };
  const H0 = PLATE_Y + LIFT_MIN, H1 = PLATE_Y + LIFT_MAX;
  function readout(dy) {
    const h = PLATE_Y + dy, up = dy - LIFT_MIN, turns = up / TURN;
    put('h', `${h.toFixed(2)} m`);
    const w = `${(((h - H0) / (H1 - H0)) * 100).toFixed(1)}%`;
    if (shown.hBar !== w) { K.hBar.style.width = w; shown.hBar = w; }
    put('dy', `${Math.round(up * 1000)} mm`);
    put('turns', turns.toFixed(2));
    put('line', `${Math.round((0.992 - 0.424 - dy) * 1000)} mm`);
    put('mini', `${Math.round(up * 1000)} mm up, ${turns.toFixed(2)} pulley turns from the bottom`);
  }

  // views framed once with the carriage at its CAD height: the whole robot, and the winch pulley
  const winchParts = stage.part(/Hub_Mount_Winch_Pulley|8mm_REX_Servo_Shaft|Sonic_Hub_8mm_REX_bore_3/, R.model);
  const sph = (v) => ({ t: v.target.clone(), s: new THREE.Spherical().setFromVector3(v.pos.clone().sub(v.target)) });
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (views && a === aspect) return views;
    aspect = a;
    const whole = sph(stage.frame(R.model, { azimuth: 62, elevation: 12, pad: 1.06, apply: false }));
    const winch = sph(stage.frame(winchParts, { azimuth: 50, elevation: 16, pad: 3.2, apply: false }));
    views = [whole, winch, whole, whole];
    return views;
  }
  const sp = new THREE.Spherical(), cam = new THREE.Vector3();
  function place(a, b, k, drift) {
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    const target = a.t.clone().lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k + drift);
    stage.setView({ pos: cam.setFromSpherical(sp).add(target), target });
  }
  R.lift.set(0);
  const v0 = viewsNow(); void v0; // frame at rest, before anything moves

  // the last step never scrolls all the way through on a desktop (its card leaves the screen at about
  // 0.6 of it), so it plays out over the first 55 % and then holds
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, 3), f = clamp(s === 3 ? stepP / 0.55 : stepP, 0, 1), u = s + f;
    const shift = ctx.shift(), phone = el.clientWidth < 640;
    stage.setShift(shift[0] - (phone ? 0 : 0.06), phone ? -0.08 : shift[1]);
    const dy = dyAt(s, f);
    R.lift.set(dy);
    L.carriage.p.set(carriageAt.x, carriageAt.y + dy, carriageAt.z);
    L.line.p.set(0.1912, (0.992 + 0.424 + dy) / 2, 0.1596);
    L.carriage.a = s === 0 || s >= 2 ? 1 : 0;
    L.rails.a = s === 0 ? 1 : 0;
    L.mast.a = s === 0 ? 1 : 0;
    L.winch.a = s === 1 ? seg(f, 0.1, 0.3) : s === 0 ? 1 : 0;
    L.line.a = s === 1 ? seg(f, 0.2, 0.4) : 0;
    readout(dy);
    const v = viewsNow();
    const k = s === 0 || reduced ? 1 : smooth(f / 0.45);
    place(v[Math.max(0, s - 1)], v[s], k, reduced ? 0 : (u / 4 - 0.5) * 0.3);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
