// Scroll-driven teardown of the finished robot (Jerry's version 2 CAD): the top plate, the
// weapon, the drive, the switch and the frame come off in turn, leaving the bottom plate; then it
// all goes back together and rolls upside down about the axle height, which shows why the robot
// drives either way up. Plates, weapon, switch and frame move along the weapon axis (+Y); the
// wheels and drive motors slide out along the axle axis (X) and the wheels turn about it.
// Views are framed once with the robot assembled and at rest, then blended by the scroll.
// The picture is a pure function of the scroll position.
import { createStage } from '/assets/js/lib/stage.js';
import { loadRobot, AXLE_X, AXLE_Y, LIFT } from './rig.js';
import { toSph, blend, viewCache, coverOf, frameFree } from './views.js';

const DEG = Math.PI / 180;
const ease = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const lerp = (a, b, t) => a + (b - a) * t;
// explode state after each step (cumulative), metres
const Z = { top: 0, weapon: 0, sw: 0, frame: 0, wheel: 0, drive: 0, turn: 0, fade: 0, hiW: 0, hiF: 0, hiB: 0 };
const S = [
  { ...Z },
  { ...Z, top: 0.07 },
  { ...Z, top: 0.07, weapon: 0.04, hiW: 1 },
  { ...Z, top: 0.07, weapon: 0.04, wheel: 0.05, drive: 0.025, turn: 0.25 },
  { ...Z, top: 0.07, weapon: 0.04, wheel: 0.05, drive: 0.025, turn: 0.25, sw: 0.05 },
  { ...Z, top: 0.07, weapon: 0.04, wheel: 0.05, drive: 0.025, turn: 0.25, sw: 0.05, frame: 0.02, hiF: 1 },
  { ...Z, top: 0.07, weapon: 0.04, wheel: 0.05, drive: 0.025, turn: 0.25, sw: 0.05, frame: 0.02, fade: 1, hiB: 1 },
  { ...Z },
];
const CAM = [[145, 22, 1.1], [150, 32, 1.3], [152, 24, 1.3], [122, 26, 1.6], [18, 16, 1.4], [35, 30, 1.35], [160, 62, 1.25], [180, 5, 1.2]];

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const T = stage.THREE;
  const { model, p } = await loadRobot(stage, 'v2', { add: false });
  // roll about a line along the robot's forward axis at axle height
  const hinge = AXLE_Y + LIFT;
  const flip = new T.Group(); flip.position.y = hinge;
  const inner = new T.Group(); inner.position.y = LIFT - hinge;
  flip.add(inner); inner.add(model);
  stage.root.add(flip);
  stage.fitGround();

  // one material per mesh so each part can fade and glow on its own
  const accent = new T.Color('#ff6b35');
  const mats = new Map();
  model.traverse((m) => {
    if (!m.isMesh) return;
    const list = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => x.clone());
    m.material = Array.isArray(m.material) ? list : list[0];
    mats.set(m, list);
  });
  const meshesOf = (objs) => { const out = []; for (const o of objs) o.traverse((m) => { if (m.isMesh) out.push(m); }); return out; };
  const groups = {
    top: [...p.top, ...p.topBearing, ...p.spacer],
    weapon: [...p.rotor, ...p.stator, ...p.motorBearings, ...p.blade, ...p.screws],
    sw: p.switch, frame: p.tpu, drive: [...p.driveL, ...p.driveR],
  };
  const base = new Map();
  for (const o of Object.values(groups).flat()) base.set(o, o.position.clone());
  const wheelL = stage.pivot(p.wheelL, [-AXLE_X, AXLE_Y, 0], [1, 0, 0]);
  const wheelR = stage.pivot(p.wheelR, [AXLE_X, AXLE_Y, 0], [1, 0, 0]);
  const wl0 = wheelL.position.clone(), wr0 = wheelR.position.clone();
  const bottomMeshes = new Set(meshesOf(p.bottom));
  const bladeMeshes = new Set(meshesOf(p.blade));
  const frameMeshes = new Set(meshesOf(p.tpu));

  // a faint floor grid for the last step
  const grid = new T.GridHelper(0.5, 25, '#8c847b', '#8c847b');
  grid.material.transparent = true; grid.material.opacity = 0; grid.material.depthWrite = false;
  grid.position.y = 0.0004; grid.visible = false;
  stage.scene.add(grid);

  function apply(s, flipT, gridA) {
    for (const [k, objs] of Object.entries(groups)) {
      for (const o of objs) {
        const b = base.get(o);
        if (k === 'drive') o.position.set(b.x + (p.driveL.includes(o) ? -s.drive : s.drive), b.y, b.z);
        else o.position.set(b.x, b.y + s[k], b.z);
      }
    }
    wheelL.position.set(wl0.x - s.wheel, wl0.y, wl0.z);
    wheelR.position.set(wr0.x + s.wheel, wr0.y, wr0.z);
    wheelL.setAngle(-s.turn * 2 * Math.PI); wheelR.setAngle(-s.turn * 2 * Math.PI);
    for (const [m, list] of mats) {
      const faded = !bottomMeshes.has(m) ? s.fade : 0;
      const glow = bladeMeshes.has(m) ? s.hiW : frameMeshes.has(m) ? s.hiF : bottomMeshes.has(m) ? s.hiB : 0;
      for (const mat of list) {
        const op = 1 - 0.86 * faded;
        mat.transparent = op < 0.999; mat.opacity = op; mat.depthWrite = op > 0.5;
        if (mat.emissive) { mat.emissive.copy(accent); mat.emissiveIntensity = (frameMeshes.has(m) ? 0.06 : 0.3) * glow; }
      }
      m.castShadow = faded < 0.5;
    }
    flip.rotation.z = Math.PI * flipT;
    grid.visible = gridA > 0.01; grid.material.opacity = 0.35 * gridA;
  }

  // one view per step, framed once on the assembled robot at rest (its bounds are cached), into the
  // part of the stage the step cards leave free on a full-width desktop
  let cover = 0;
  const views = viewCache(el, (aspect) => frameFree(stage, (cover = coverOf(el, ctx)), () => CAM.map(([az, elev, pad]) => toSph(T, stage.frame(model, {
    azimuth: az, elevation: elev, pad: pad * (aspect < 1 ? 1.3 : 0.8), offset: [0, 0.018, 0], apply: false,
  })))));
  views();

  function setProgress(prog, step = 0, stepP = 0) {
    const i = Math.max(0, Math.min(S.length - 1, step));
    const prev = S[Math.max(0, i - 1)], cur = S[i];
    let s, flipT = 0, gridA = 0, k;
    if (i === S.length - 1) {
      // reassemble over the first half, then roll over
      k = ease(stepP * 2);
      s = Object.fromEntries(Object.keys(Z).map((key) => [key, lerp(prev[key], cur[key], k)]));
      flipT = ease((stepP - 0.45) / 0.5);
      gridA = ease((stepP - 0.3) / 0.3);
    } else {
      k = ease(stepP * 1.4);
      s = Object.fromEntries(Object.keys(Z).map((key) => [key, lerp(prev[key], cur[key], k)]));
    }
    apply(s, flipT, gridA);
    const kc = ctx.reducedMotion ? 1 : ease(stepP * 1.4);
    const v = views();
    stage.setShift(cover / 2, 0);
    blend(stage, v[Math.max(0, i - 1)], v[i], i === 0 ? 1 : kc);
    stage.invalidate();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose: () => { grid.geometry.dispose(); grid.material.dispose(); stage.dispose(); } };
}
