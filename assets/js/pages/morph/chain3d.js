// The 17-cube chain drawn from 17 copies of our real module CAD (assets/models/morph/module.glb, one
// InstancedMesh per part) and posed by the planner's own kinematics (kin.js). Nothing here changes a
// shape: every cube is the same CAD, placed where the planner puts it.
//
// Frames. The planner's module frame has the chain along local +X and the joint on (1, 1, 1); the CAD
// module has the chain along +Y (black half in, green half out) and the joint on (1, 1, -1). The proper
// rotation P below maps one onto the other (P (1,0,0) = (0,1,0), P (1,1,1) = (1,1,-1)), so a +120 degree
// turn means the same thing in both. The planner's world is Z up in millimetres; the page is Y up in
// metres: (x, y, z) -> (x, z, -y) / 1000.
import { N, Chain, mul, I3 } from './kin.js';

export const MODEL = '/assets/models/morph/module.glb';
export const TURNING = /^anim_morph_[01]_/; // the green half: Top and Hub_Moving (CAD names)
const PT = [0, 1, 0, 1, 0, 0, 0, 0, -1]; // CAD module frame -> planner module frame (P transposed; P is symmetric)
const W = [1, 0, 0, 0, 0, 1, 0, -1, 0]; // planner world -> page world

const ease = (u) => u * u * (3 - 2 * u);

/** The module is printed plastic; the stage's colour pass reads saturated green as PCB soldermask
 *  (glossy clearcoat). Give printed parts a matte PLA finish instead. */
export function matte(obj) {
  const hsl = {};
  obj.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!m?.color) continue;
      m.color.getHSL(hsl);
      if ('clearcoat' in m) m.clearcoat = 0;
      if (hsl.h > 0.25 && hsl.h < 0.5 && hsl.s > 0.3) m.roughness = 0.62;
      else if (hsl.l < 0.12) m.roughness = 0.68;
    }
  });
  return obj;
}

export async function createChain(stage) {
  const THREE = stage.THREE;
  const src = matte(await stage.load(MODEL, { add: false }));
  src.updateMatrixWorld(true);
  const parts = [];
  src.traverse((o) => {
    if (!o.isMesh) return;
    let turn = false;
    for (let p = o; p; p = p.parent) if (TURNING.test(p.name)) turn = true;
    // only the shell (green half, and the big black merged mesh) casts a shadow the shell does not already cast
    const big = o.geometry.attributes.position.count;
    parts.push({ geometry: o.geometry, material: o.material, turn, local: o.matrixWorld.clone(), shadow: /^anim_morph_0_/.test(o.name) || (!turn && big > 8000) });
  });
  const group = new THREE.Group();
  group.name = 'morph-chain';
  stage.root.add(group);
  const inst = parts.map((p) => {
    const im = new THREE.InstancedMesh(p.geometry, p.material, N);
    im.castShadow = p.shadow; im.receiveShadow = p.shadow; im.frustumCulled = false;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(im);
    return { im, turn: p.turn, local: p.local };
  });

  const m4 = (R, c) => {
    const A = mul(W, mul(R, PT));
    return new THREE.Matrix4().set(A[0], A[1], A[2], c[0] / 1000, A[3], A[4], A[5], c[2] / 1000, A[6], A[7], A[8], -c[1] / 1000, 0, 0, 0, 1);
  };
  const tmp = new THREE.Matrix4();
  let last = null;
  /** page-world matrices of each module's still (F) and moving (G) half, for chain pose + move in progress */
  function matrices(chain, m = null, u = 0) {
    const w = chain.world(m, u);
    return { F: w.still.map((h) => m4(h.R, h.c)), G: w.moving.map((h) => m4(h.R, h.c)) };
  }
  function write(M) {
    last = M;
    for (const x of inst) {
      for (let k = 0; k < N; k++) x.im.setMatrixAt(k, tmp.multiplyMatrices(x.turn ? M.G[k] : M.F[k], x.local));
      x.im.instanceMatrix.needsUpdate = true;
    }
    stage.invalidate();
  }

  // an invisible box around a set of rest poses, for stage.frame()
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
  box.visible = false;
  stage.scene.add(box);
  function boundsOf(...chains) {
    const b = new THREE.Box3();
    const v = new THREE.Vector3();
    for (const c of chains) for (const h of c.world().still) { v.set(h.c[0] / 1000, h.c[2] / 1000, -h.c[1] / 1000); b.expandByPoint(v); }
    b.expandByScalar(0.042);
    b.getCenter(box.position); b.getSize(box.scale);
    box.updateMatrixWorld(true);
    return box;
  }
  function settleGround() { for (const x of inst) x.im.computeBoundingBox(); stage.fitGround(); }

  // ---------------------------------------------------------------- state and motion
  let chain = new Chain(I3);
  write(matrices(chain));
  settleGround();

  const queue = [];
  let stop = null, cur = null;
  function tick(dt) {
    if (!cur) {
      cur = queue.shift();
      if (!cur) { stop?.(); stop = null; settleGround(); api.onIdle?.(); return; }
      cur.t = 0;
      if (cur.swap) { chain = cur.swap; write(matrices(chain)); api.onSwap?.(cur); cur = null; return; }
      api.onMove?.(cur);
    }
    cur.t = Math.min(1, cur.t + dt / cur.seconds);
    if (cur.t >= 1) {
      chain.step(cur);
      write(matrices(chain));
      const done = cur; cur = null;
      api.onMoved?.(done);
    } else write(matrices(chain, cur, ease(cur.t)));
  }
  const api = {
    group, inst, matrices, write, boundsOf,
    get chain() { return chain; },
    get busy() { return !!cur || queue.length > 0; },
    get moving() { return cur; },
    /** jump to a chain pose (no motion) */
    set(c) { queue.length = 0; cur = null; stop?.(); stop = null; chain = c; write(matrices(chain)); settleGround(); },
    /** queue moves ({ j, d, out, base, ...extra }) at `seconds` per 120 degree step; { swap: chain } entries replace the pose */
    play(moves, seconds = 0.8) {
      for (const m of moves) queue.push({ ...m, seconds });
      if (!stop) stop = stage.onFrame(tick);
    },
    cancel() { queue.length = 0; },
    onMove: null, onMoved: null, onIdle: null, onSwap: null,
  };
  return api;
}

/** an outline of one cube (an annotation, not a part): 80 mm box edges */
export function cubeOutline(THREE, color, opacity = 1) {
  const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.0815, 0.0815, 0.0815));
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthTest: false });
  const l = new THREE.LineSegments(g, m);
  l.renderOrder = 10;
  l.visible = false;
  return l;
}
