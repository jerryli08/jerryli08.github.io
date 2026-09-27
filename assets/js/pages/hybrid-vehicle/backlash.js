// "Why backlash hurts this latch", scroll-driven, on the final CAD (the first latch in section).
// Each arm hangs off a 7-tooth pinion with a 7 mm pitch radius (module 2, measured from the CAD),
// so play at a mesh, measured along the pitch circle, turns an arm by play / 7 mm radians. The
// inner arm sits one mesh from the servo gear; the outer arm sits behind two. The ghosts show each
// arm at both ends of its free play. u = step + progress through the step (0..4):
//   0  no play                        2  0.75 mm per mesh: the outer arm swings to the end of its
//   1  0.5 mm per mesh; the arms rock     play and its finger clears the tube's edge
//      through it                     3  back to the middle: the fix is in the doors, not the gears
// Nothing here models the earlier gears or the cut doors. Every picture is a pure function of u.
import { createStage } from '/assets/js/lib/stage.js';
import { rigLatch, addElastic, tags, hudPanel, freeLeftOf, anchor, region, smooth, lerp, clamp, CUT_X, DEG, OK, WARN } from './common.js';

const R_PINION = 7;   // mm, pitch radius of a 7-tooth module 2 pinion
const TIP_ARM = 35.8; // mm, arm pinion axis to the outer door's finger tip (CAD section)
const OVERLAP = 3.7;  // mm, how far each finger reaches past the edge of the tube (CAD section)

const playAt = (u) => lerp(0, 0.5, smooth(1.05, 1.4, u)) + lerp(0, 0.25, smooth(2.05, 2.35, u));
// where each arm sits in its band of play: -1 .. 1 (0 = the middle)
function wiggle(u) {
  if (u >= 1.4 && u < 2) return Math.sin(((u - 1.4) / 0.6) * 4 * Math.PI) * smooth(1.4, 1.5, u) * (1 - smooth(1.9, 2, u));
  if (u >= 2.4 && u < 3.4) return smooth(2.4, 2.75, u) * (1 - smooth(3.05, 3.35, u));
  return 0;
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const T3 = stage.THREE;
  const latch = rigLatch(stage, rover);
  const elastic = addElastic(stage, rover, latch);
  const cut = stage.sectionPlane([-1, 0, 0], CUT_X);
  const [outer, inner] = latch.arms; // latch 1: Component9 (+z, two meshes from the servo), Component8 (one mesh)
  const reduced = ctx.reducedMotion;

  // ghosts of the two latch 1 arms (with their doors) at each end of their play, cut like the rest
  const ghostMat = new T3.MeshBasicMaterial({ color: '#ffb088', transparent: true, opacity: 0.28, depthWrite: false, clippingPlanes: [cut.plane] });
  const ghosts = [];
  for (const arm of [outer, inner]) {
    for (const end of [-1, 1]) {
      const g = arm.pivot.clone(true);
      g.traverse((m) => { if (m.isMesh) { m.material = ghostMat; m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2; } });
      arm.pivot.parent.add(g);
      ghosts.push({ g, arm, end, q0: arm.pivot.quaternion.clone() });
    }
  }
  const box = region([0.405, -0.101, -0.096], [0.43, -0.042, -0.017]);
  let view = null, vkey = '';
  function viewNow() {
    const key = `${el.clientWidth}x${el.clientHeight}|${ctx.shift()[0]}`;
    if (view && key === vkey) return view;
    vkey = key;
    const portrait = el.clientHeight > el.clientWidth * 1.05;
    view = stage.frame(box, { dir: [1, 0.08, 0.1], pad: portrait ? 1.04 : 1.06, apply: false, track: false, refresh: true });
    return view;
  }

  const ov = tags(stage);
  const T = {
    tip: ov.tag('Outer finger tip', anchor(outer.door.part, rover, [CUT_X, -0.0546, -0.0522]), { side: 'r', short: 'Finger tip' }),
    edge: ov.tag('Tube edge', anchor(drone, drone, [CUT_X, -0.0701, -0.0485]), { side: 'r' }),
    pin: ov.tag('7-tooth pinions', anchor(rover, rover, [CUT_X, -0.0888, -0.0567]), { side: 'l', short: '7T pinions' }),
  };
  const hud = hudPanel(ov.layer, `
    <div class="rx-hud-row"><span>Play at each mesh</span><b class="num" data-k="play"></b><i><em data-k="playBar"></em></i></div>
    <div class="rx-hud-row rx-hud-x"><span>Inner arm, 1 mesh out</span><b class="num" data-k="i"></b></div>
    <div class="rx-hud-row rx-hud-x"><span>Outer arm, 2 meshes out</span><b class="num" data-k="o"></b></div>
    <div class="rx-hud-row"><span>Outer finger swing</span><b class="num" data-k="tip"></b><i><em data-k="tipBar"></em></i></div>
    <div class="rx-hud-row"><b data-k="state"></b></div>`);
  const freeLeft = freeLeftOf(el, ctx);
  const axis = new T3.Vector3(1, 0, 0), q = new T3.Quaternion();

  let moved = '';
  function setProgress(p, step, stepP) {
    const u = clamp(step + stepP, 0, 4);
    // full-width desktop: a little further right than usual, clear of the step cards
    const [sx, sy] = ctx.shift();
    stage.setShift(sx > 0 ? 0.2 : 0, sy);
    stage.setView(viewNow());
    const play = reduced ? [0, 0.5, 0.75, 0.75][Math.min(3, Math.floor(u))] : playAt(u);
    const bIn = play / R_PINION / 2, bOut = play / R_PINION; // half-bands, radians
    const w = reduced ? (u >= 2 && u < 3 ? 1 : 0) : wiggle(u);
    if (`${play}|${w}` !== moved) { // only when the parts moved: a camera-only change skips the shadow pass
      moved = `${play}|${w}`;
      for (const gh of ghosts) {
        const half = gh.arm === outer ? bOut : bIn;
        gh.g.quaternion.copy(gh.q0).premultiply(q.setFromAxisAngle(axis, gh.arm.sign * gh.end * half));
        gh.g.visible = play > 0.001;
      }
      latch.set(0, [bOut * w, bIn * w, 0, 0]);
      elastic.update(); // redraws the scene, ghosts included
    }
    // labels and readout
    const narrow = el.clientWidth < 620;
    T.pin.a = smooth(0.1, 0.35, u) * (1 - smooth(0.9, 1.05, u));
    T.tip.a = smooth(0.1, 0.35, u); T.edge.a = smooth(0.1, 0.35, u);
    ov.update(narrow, freeLeft());
    hud.show(1);
    const swing = TIP_ARM * bOut;
    hud.put('play', `${play.toFixed(2)} mm`); hud.bar('playBar', play / 1);
    hud.put('i', `±${(bIn / DEG).toFixed(1)}°`);
    hud.put('o', `±${(bOut / DEG).toFixed(1)}°`);
    hud.put('tip', `±${swing.toFixed(1)} mm of ${OVERLAP} mm`); hud.bar('tipBar', swing / OVERLAP);
    const clear = swing >= OVERLAP;
    hud.put('state', clear ? 'The outer finger can swing clear of the tube' : 'The finger still covers the tube');
    hud.color('state', clear ? WARN : OK);
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); elastic.dispose(); ghostMat.dispose(); box.geometry.dispose(); stage.dispose(); } };
}
