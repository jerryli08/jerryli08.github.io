// The turret (scroll-driven): the shooter turns on a 158-tooth internal ring gear (module 1.5)
// with four Melonbotics Super Servos standing inside it. The turret group (servos, hood, flywheel
// motors, number plates, 72 mm wheel and the top bearing plate) turns about the ring gear's centre;
// the ring gear and the plate under it stay with the robot. The angle is a pure function of the
// scroll: from 0 it turns one way to 120 degrees, back through 0 to 120 the other way, and home.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import { loadRobot, rigRobot, looks, mm, AX, DEG, smooth, clamp, hud } from './rig.js';

const RING_T = 158;
const SWING = 120;

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, fov: 30 });
  const { P } = await loadRobot(stage);
  const rig = rigRobot(stage, P, { pto: false, turret: true });
  const tp = rig.piv.turret;
  const look = looks(stage);
  look(P.ring, 1, '#ff6b35', 0.5);
  let view = null, aspect = 0;
  function frameNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!view || a !== aspect) {
      aspect = a;
      const was = tp.angle; tp.setAngle(0); // framed at rest
      view = stage.frame([P.turret, P.ring], { azimuth: -145, elevation: 36, pad: 1.3, apply: false, refresh: true });
      tp.setAngle(was);
    }
    return view;
  }

  // the four servos' centres in the CAD, turned with the turret for their labels
  const servos = [[125.2, -348.4], [334.3, -341.5], [124.5, -259.6], [333.7, -252.7]];
  const ov = labelLayer(stage);
  const ring = ov.label('Ring gear, 158 teeth', mm(AX.TURRET[0] - 73, 310, AX.TURRET[1] - 105), { color: '#ff6b35' });
  const sv = servos.map((c, i) => {
    const l = ov.label(i === 1 ? 'Four Super Servos' : '', mm(0, 0, 0), { color: '#27c7ff' });
    if (i !== 1) l.el.lastChild.remove(); // a dot only
    return l;
  });
  const H = hud(ov.layer, [['a', 'Turret'], ['t', 'Ring teeth passed']], true);

  function setProgress(p) {
    stage.setShift(...ctx.shift());
    stage.setView(frameNow());
    const x = clamp(p, 0, 1);
    // 0 -> +120 -> -120 -> 0, easing at each end (with reduced motion it cuts between those poses)
    const deg = ctx.reducedMotion ? SWING * (x < 0.33 ? 0 : x < 0.66 ? 1 : -1)
      : SWING * (smooth(0.06, 0.3, x) - 2 * smooth(0.36, 0.66, x) + smooth(0.72, 0.94, x));
    tp.setAngle(deg * DEG);
    const a = tp.angle, c = Math.cos(a), s = Math.sin(a);
    servos.forEach(([sx, sz], i) => {
      const dx = sx - AX.TURRET[0], dz = sz - AX.TURRET[1];
      // rotation about +y: x' = c dx + s dz, z' = -s dx + c dz
      sv[i].p.set(...mm(AX.TURRET[0] + c * dx + s * dz, 378, AX.TURRET[1] - s * dx + c * dz));
      sv[i].a = 1;
    });
    ring.a = 1;
    H.put('a', `${deg > 0.5 ? '+' : deg < -0.5 ? '−' : ''}${Math.abs(deg).toFixed(0)}°`);
    H.put('t', ((Math.abs(deg) / 360) * RING_T).toFixed(1));
    H.put('mini', `Turret ${Math.abs(deg).toFixed(0)}°, ${((Math.abs(deg) / 360) * RING_T).toFixed(1)} ring teeth`);
    ov.update();
  }
  setProgress(0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
