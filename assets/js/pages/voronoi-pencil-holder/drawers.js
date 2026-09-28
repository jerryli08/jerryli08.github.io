// Scrolly "drawers": the Voronoi pencil holder from Jerry's CAD, its two pencil inserts sliding out
// of the body like drawers as you scroll, while the view drifts slowly around it (Jerry, Sept 27,
// 21:12): the OHTO MS01 insert slides out first; once it is a third of the way out the Pentel Orenz
// insert starts; both run out to full travel, hold, and then slide back in together.
//
// Geometry, from the real CAD (GLB frame, metres, Y up):
//  - the body runs x 1 to 161 mm; each insert runs x 1 to 163 mm, its capped end 2 mm proud of the
//    body at +x, and is an open trough along its length that the body closes over
//  - the inserts' bores and features are all on STEP X (tools/cad-axes.py on the STEP: every
//    cylinder of both inserts has its axis along X), so they slide along GLB +x, out of the capped end
// Full travel (Jerry, Sept 28, 03:53): each insert slides out about 80% of its overall length. Both
// inserts measure 162.00 mm along x in the CAD (this GLB and the raw export agree), so the travel is
// 0.8 x 162 = 129.6 mm, which leaves about 30 mm of each insert inside the body (see TRAVEL).
// Every picture is a pure function of the scroll progress p; nothing moves on its own.
import { createStage } from '/assets/js/lib/stage.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (x) => { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;

const LEN = 0.162; // each insert's length along its slide axis (x), m, measured in the CAD
const TRAVEL = 0.8 * LEN; // full travel along +x, m: about 80% of the insert's length (Jerry)
const RUN = 0.34; // share of the scroll one insert takes to run out
const A0 = 0.06; // the first insert starts
const THIRD = 0.3877; // the eased run reaches 1/3 of its travel at this fraction of RUN: 3t^2 - 2t^3 = 1/3
const B0 = A0 + THIRD * RUN; // the second starts when the first is a third of the way out
const OUT = B0 + RUN; // both fully out
const IN0 = OUT + 0.1, IN1 = IN0 + 0.24; // both slide back in together
const AZ0 = 18, AZ1 = 100; // the view drifts this way over the whole scroll (azimuth 0 looks from +Z)
const EL0 = 34, EL1 = 26;

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;
  const model = await stage.load('/assets/models/voronoi-pencil-holder/holder.glb');
  const ohto = stage.part(/ohto/i, model)[0];
  const orenz = stage.part(/pentel|orenz/i, model)[0];
  const drawers = [ohto, orenz].filter(Boolean).map((o) => ({ o, x: o.position.x, d: -1 }));
  function slide(d) { // d: [0..1, 0..1], each insert's share of its travel
    let moved = false;
    drawers.forEach((w, i) => {
      if (Math.abs(w.d - d[i]) < 1e-5) return;
      w.d = d[i]; w.o.position.x = w.x + TRAVEL * d[i]; moved = true;
    });
    if (moved) stage.invalidate();
  }

  // two views, framed once at rest: inserts in, and both inserts fully out; each is backed off far
  // enough that the model fits at every angle the drift turns through. The camera blends between
  // them as the inserts move, so the picture never re-frames on a moving part.
  let views = null, aspect = 0;
  function frameAll() {
    const keep = drawers.map((w) => w.d);
    const one = (open) => {
      slide(drawers.map(() => open));
      const f = stage.frame(model, { azimuth: AZ0, elevation: EL0, pad: 1.1, apply: false, refresh: true });
      const t = f.target.clone();
      let r = f.pos.distanceTo(t);
      for (let q = 0; q <= 1.001; q += 0.25) {
        const g = stage.frame(model, { azimuth: lerp(AZ0, AZ1, q), elevation: lerp(EL0, EL1, q), pad: 1.1, apply: false, refresh: false });
        r = Math.max(r, g.pos.distanceTo(g.target));
      }
      return { t, r };
    };
    const shut = one(0), open = one(1);
    stage.fitGround(); // with both inserts out: the ground and its shadow cover every pose
    slide(keep.map((d) => Math.max(0, d)));
    return { shut, open };
  }
  const sp = new THREE.Spherical(), pos = new THREE.Vector3(), tgt = new THREE.Vector3();

  function setProgress(p) {
    p = clamp(p || 0, 0, 1);
    stage.setShift(...ctx.shift());
    const asp = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || Math.abs(asp - aspect) > 1e-3) { aspect = asp; views = frameAll(); }
    const back = ease((p - IN0) / (IN1 - IN0));
    const a = ease((p - A0) / RUN) * (1 - back);
    const b = ease((p - B0) / RUN) * (1 - back);
    slide([a, b]);
    // the camera: blend between the two framings by how far out the inserts are, drifting round
    const k = ease(Math.max(a, b));
    tgt.copy(views.shut.t).lerp(views.open.t, k);
    const q = reduced ? 0.3 : p;
    sp.set(lerp(views.shut.r, views.open.r, k), (90 - lerp(EL0, EL1, q)) * DEG, lerp(AZ0, AZ1, q) * DEG);
    pos.setFromSpherical(sp).add(tgt);
    stage.setView({ pos, target: tgt });
  }
  setProgress(0);
  return { setProgress, dispose: () => stage.dispose() };
}
