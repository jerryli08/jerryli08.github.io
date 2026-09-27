// What backlash does to this geartrain, on the final CAD (latch 1 in section). Each arm hangs off a
// 7-tooth pinion with a 7 mm pitch radius (module 2, measured from the CAD), so play at a mesh,
// measured along the pitch circle, turns an arm by play / 7 mm radians. The inner arm sits one
// mesh from the servo gear; the outer arm sits behind two. The ghosts show each arm at both ends of
// its free play; "Wiggle" rocks them through it. Nothing here models the earlier gears or doors.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, playToggle } from '/assets/js/lib/ui.js';
import { rigLatch, addElastic, labels, anchor, hud, region, CUT_X, DEG } from './common.js';

const R_PINION = 7;       // mm, pitch radius of a 7-tooth module 2 pinion
const TIP_ARM = 35.8;     // mm, arm pinion axis to the outer door's finger tip (CAD section)
const OVERLAP = 3.7;      // mm, how far each finger reaches past the edge of the tube (CAD section)

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const T = stage.THREE;
  const latch = rigLatch(stage, rover);
  const elastic = addElastic(stage, rover, latch);
  latch.onChange = elastic.update;
  const [outer, inner] = latch.arms; // latch 1: Component9 (+z, two meshes from the servo), Component8 (one mesh)

  // ghosts of the two latch 1 arms (with their doors) at each end of their play
  const ghostMat = new T.MeshBasicMaterial({ color: '#ffb088', transparent: true, opacity: 0.3, depthWrite: false });
  const ghosts = [];
  for (const arm of [outer, inner]) {
    for (const end of [-1, 1]) {
      const g = arm.pivot.clone(true);
      g.traverse((m) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; m.renderOrder = 2; } });
      arm.pivot.parent.add(g);
      ghosts.push({ g, arm, end, q0: arm.pivot.quaternion.clone() });
    }
  }
  stage.sectionPlane([-1, 0, 0], CUT_X);
  const box = region([0.405, -0.101, -0.096], [0.43, -0.042, -0.017]);
  const place = () => stage.frame(box, { dir: [1, 0.08, 0.1], pad: 1.04 });
  place();
  const ro = new ResizeObserver(place); ro.observe(el);

  const labs = labels(stage, [
    { id: 'tip', anchor: anchor(outer.door.part, rover, [CUT_X, -0.0546, -0.0522]), side: 'r', text: 'Finger tip' },
    { id: 'edge', anchor: anchor(drone, drone, [CUT_X, -0.0701, -0.0485]), side: 'r', text: 'Tube edge' },
  ]);
  const info = hud(stage, [{ key: 'o', label: 'Outer arm play' }, { key: 'i', label: 'Inner arm play' }, { key: 'tip', label: 'Outer finger swing' }, { key: 'state', state: true }]);

  let play = 0.5, t = 0, stop = null;
  const axis = new T.Vector3(1, 0, 0), q = new T.Quaternion();
  function update() {
    const bIn = play / R_PINION / 2, bOut = play / R_PINION; // half-bands, radians
    for (const gh of ghosts) {
      const half = gh.arm === outer ? bOut : bIn;
      gh.g.quaternion.copy(gh.q0).premultiply(q.setFromAxisAngle(axis, gh.arm.sign * gh.end * half));
      gh.g.visible = play > 0.001;
    }
    const w = Math.sin(t * 5);
    latch.setArmExtra([bOut * w, bIn * w, 0, 0]);
    const swing = TIP_ARM * bOut;
    info.set({ o: `±${(bOut / DEG).toFixed(1)}°`, i: `±${(bIn / DEG).toFixed(1)}°`, tip: `±${swing.toFixed(1)} mm` });
    info.state(swing < OVERLAP ? `Finger still covers the tube (${OVERLAP} mm)` : 'Outer finger can swing clear of the tube', swing < OVERLAP ? 'ok' : 'warn');
    stage.invalidate();
  }
  slider(ctx.panel, { label: 'Play at each mesh', min: 0, max: 1, step: 0.05, value: play, unit: ' mm', format: (v) => v.toFixed(2), onInput: (v) => { play = v; update(); } });
  playToggle(ctx.panel, {
    playing: false, labels: ['Wiggle', 'Stop'],
    onChange(on) {
      stop?.(); stop = null;
      if (on) stop = stage.onFrame((dt) => { t += dt; update(); });
      else { t = 0; update(); }
    },
  });
  update();
  return { dispose() { stop?.(); ro.disconnect(); labs.dispose(); info.dispose(); elastic.dispose(); ghostMat.dispose(); box.geometry.dispose(); stage.dispose(); } };
}
