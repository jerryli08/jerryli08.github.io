// Scrolly "roll": the GT3 RS wheel from Jerry's CAD, stood upright as it sits on the car. Scrolling
// rolls it three full turns along a ruler on the ground, then the camera pans around it: face, side,
// back and from above.
//
// Geometry, measured from the real CAD (GLB frame, metres, Y up; the model lies face up):
//  - the axle is the GLB's Y axis through x = 0, z = 0: circles fitted to the barrel (radius
//    253.6 mm at y = -237.6 mm, off-centre by under 0.01 mm) and to the centre bore (radius 31.3 mm,
//    y -72 to -101 mm) are both centred on it
//  - the face is at y = 0, the back lip at y = -264 mm; both lips are 272.5 mm in radius (545 mm
//    across), so the bare rim rolls on its lips: one turn = pi x 545 mm = 1.712 m along the ground
//  - seven spokes leave the hub and each splits in two before the rim (7 at r = 130 mm, 14 at
//    r = 180 to 220 mm)
// Upright: the model is turned +90 degrees about X, so its face (GLB +Y) looks along world +Z and the
// axle is level; the wheel rolls toward world +X. The camera tracks it, so the wheel stays put and the
// ruler slides under it by the distance rolled (the stage's shadows stay fitted to the wheel).
// The ruler, its ticks and the orange mark on the lip are annotations, not parts.
// Every picture is a pure function of (step, stepP); nothing moves on its own.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const DEG = Math.PI / 180;
const ACCENT = '#ff6b35';

const R = 0.2725; // lip radius, m (CAD)
const DEPTH = 0.264; // face lip to back lip, m (CAD)
const C = 2 * Math.PI * R; // 1.712 m per turn
const TURNS = 3;
const ROLL_STEPS = 2; // steps 0 and 1 roll the wheel (1.5 turns each); the rest pan around it

// Distance rolled at scroll time u (0..ROLL_STEPS): a trapezoid speed profile (gentle start and stop,
// steady in between), integrated in closed form
const RAMP = 0.12; // fraction of the roll spent speeding up, and again slowing down
function rolled(u) {
  const x = clamp(u / ROLL_STEPS, 0, 1), vmax = 1 / (1 - RAMP);
  let f;
  if (x < RAMP) f = (vmax * x * x) / (2 * RAMP);
  else if (x > 1 - RAMP) { const y = 1 - x; f = 1 - (vmax * y * y) / (2 * RAMP); }
  else f = vmax * (x - RAMP / 2);
  return f * TURNS * C;
}

// camera views (azimuth 0 looks from +Z at the face, 90 from +X, the way it rolls), framed once at rest
const VIEWS = [
  { azimuth: 30, elevation: 8, pad: 1.5 }, // rolling (steps 0 and 1)
  { azimuth: 30, elevation: 8, pad: 1.5 },
  { azimuth: 0, elevation: 3, pad: 1.12 }, // the face
  { azimuth: -90, elevation: 7, pad: 1.16 }, // side on: the barrel's depth
  { azimuth: -180, elevation: 9, pad: 1.12 }, // the back
  { azimuth: -300, elevation: 42, pad: 1.14 }, // from above, back round to the front
];

// the ruler on the ground, drawn in a shader: a baseline, 10 cm ticks, and an orange tick at every
// full turn from the start. uS is the distance rolled: the ruler point under the axle.
const Z0 = 0.2; // baseline, m in front of the axle's middle (the face lip is at z = 0.132)
const rulerVS = 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }';
const rulerFS = `uniform float uS; uniform float uC; uniform float uA; varying vec3 vW;
// coverage of a line of half width w (m) at distance d, never thinner than about a pixel (then fainter)
float ln(float d, float w) { float fw = max(fwidth(d), 1e-6); float we = max(w, fw * 0.6); return (1.0 - smoothstep(we - fw * 0.5, we + fw * 0.5, abs(d))) * (w / we); }
void main() {
  float xr = vW.x + uS, z = vW.z;
  float span = smoothstep(-0.5, -0.1, xr) * (1.0 - smoothstep(${(TURNS * C + 0.1).toFixed(4)}, ${(TURNS * C + 0.5).toFixed(4)}, xr));
  float fade = (1.0 - smoothstep(1.1, 2.1, abs(vW.x))) * uA;
  float base = ln(z - ${Z0.toFixed(3)}, 0.0016);
  float d10 = (fract(xr / 0.1 + 0.5) - 0.5) * 0.1;
  float d50 = (fract(xr / 0.5 + 0.5) - 0.5) * 0.5;
  float t10 = ln(d10, 0.0012) * step(${Z0.toFixed(3)}, z) * step(z, ${(Z0 + 0.022).toFixed(3)});
  float t50 = ln(d50, 0.0016) * step(${Z0.toFixed(3)}, z) * step(z, ${(Z0 + 0.042).toFixed(3)});
  float white = max(base, max(t10, t50)) * span;
  float n = floor(xr / uC + 0.5);
  float turn = ln(xr - n * uC, 0.0035) * step(-0.01, n) * step(n, ${TURNS.toFixed(1)}) * step(0.1, z) * step(z, ${(Z0 + 0.075).toFixed(3)});
  vec3 col = mix(vec3(0.93, 0.91, 0.88), vec3(1.0, 0.42, 0.21), turn);
  float a = max(white * 0.55, turn * 0.95) * fade;
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
}`;

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false, envIntensity: 1.25 });
  const { THREE } = stage;
  const reduced = ctx.reducedMotion;

  // the CAD colour is black: anodized gives it a smooth dark metal finish instead of printed plastic
  const model = await stage.load('/assets/models/gt3rs-wheel/wheel.glb', { add: false, anodized: /.*/ });
  const upright = new THREE.Group();
  upright.name = 'wheel, upright';
  upright.rotation.x = 90 * DEG; // GLB +Y (the face) to world +Z; the axle is level
  upright.position.z = DEPTH / 2; // the face lip at z = +132 mm, the back lip at -132 mm
  upright.add(model);
  stage.add(upright); // re-fits the ground under the lips (y = -272.5 mm)

  // the axle: the GLB's Y axis through the origin (see the top of this file)
  const mesh = model.children.length ? model.children : [model];
  const axle = stage.pivot(mesh, [0, 0, 0], [0, 1, 0]);

  // an orange tick on the face of the lip, at the bottom when the wheel starts: after every full
  // turn it comes back down onto one of the ruler's orange ticks
  const markMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const mark = new THREE.Mesh(new THREE.RingGeometry(0.256, 0.2705, 1, 1, -93 * DEG, 6 * DEG), markMat);
  mark.rotation.x = -90 * DEG; // the ring's plane onto the face plane (GLB y = 0); angle -90 deg lies on GLB +Z, world down
  mark.position.y = 0.0015; // just proud of the face
  mark.name = 'lip mark (annotation)';
  mark.userData.rxNoClip = true;
  axle.add(mark);

  // the ruler, flat on the ground in front of the face; the stage's scene, not its models, so the
  // framing, ground fit and contact shadow ignore it
  const groundY = stage.ground.position.y + 0.0006;
  const rulerMat = new THREE.ShaderMaterial({
    vertexShader: rulerVS, fragmentShader: rulerFS, transparent: true, depthWrite: false,
    uniforms: { uS: { value: 0 }, uC: { value: C }, uA: { value: 1 } },
  });
  const ruler = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.26), rulerMat);
  ruler.rotation.x = -90 * DEG;
  ruler.position.set(0, groundY, 0.21);
  ruler.name = 'ruler (annotation)';
  stage.scene.add(ruler);

  // labels on the orange ticks
  const ov = labelLayer(stage);
  const TICKS = Array.from({ length: TURNS + 1 }, (_, n) => ({
    n,
    l: ov.label(n === 0 ? 'Start' : `${n} turn${n > 1 ? 's' : ''}, ${(n * C).toFixed(2)} m`, [0, groundY, Z0 + 0.075], { color: ACCENT }),
  }));

  // views, framed once with the wheel at rest, cached per stage shape and shift
  let views = null, key = '';
  function viewsNow(shift) {
    const k = `${el.clientWidth}x${el.clientHeight}|${shift}`;
    if (views && k === key) return views;
    key = k;
    const a = axle.angle;
    axle.setAngle(0);
    views = VIEWS.map((v) => {
      const f = stage.frame(upright, { ...v, apply: false });
      return { t: f.target.clone(), s: new THREE.Spherical().setFromVector3(f.pos.clone().sub(f.target)) };
    });
    axle.setAngle(a);
    return views;
  }
  const sp = new THREE.Spherical(), camPos = new THREE.Vector3(), camT = new THREE.Vector3();
  function place(a, b, k) { // orbit from view a to view b around the wheel, never through it
    let dT = b.s.theta - a.s.theta;
    while (dT > Math.PI) dT -= 2 * Math.PI;
    while (dT < -Math.PI) dT += 2 * Math.PI;
    camT.copy(a.t).lerp(b.t, k);
    sp.set(lerp(a.s.radius, b.s.radius, k), lerp(a.s.phi, b.s.phi, k), a.s.theta + dT * k);
    camPos.setFromSpherical(sp).add(camT);
    stage.setView({ pos: camPos, target: camT });
  }

  const last = VIEWS.length - 1;
  function setProgress(p, step, stepP) {
    step = clamp(step | 0, 0, last);
    stepP = clamp(stepP, 0, 1);
    const shift = ctx.shift();
    stage.setShift(...shift);
    // the roll: steps 0 and 1 (held poses only with reduced motion)
    const u = step < ROLL_STEPS ? step + (reduced ? 1 : stepP) : ROLL_STEPS;
    const s = rolled(u);
    axle.setAngle(-s / R); // rolling toward +X without slipping: clockwise seen from the face
    rulerMat.uniforms.uS.value = s;
    // the camera: each pan step orbits in from the view before it, then holds
    const v = viewsNow(shift.join(','));
    const k = step < ROLL_STEPS || reduced ? 1 : smooth(0, 0.62, stepP);
    place(v[Math.max(0, step - 1)], v[step], k);
    // the ruler and the mark fade out as the camera leaves the rolling view
    const show = step < ROLL_STEPS ? 1 : step === ROLL_STEPS ? 1 - smooth(0, 0.35, stepP) : 0;
    rulerMat.uniforms.uA.value = show;
    ruler.visible = show > 0.004;
    markMat.opacity = show;
    mark.visible = show > 0.004;
    for (const t of TICKS) {
      const x = t.n * C - s;
      t.l.p.set(x, groundY, Z0 + 0.075);
      t.l.a = show * (1 - smooth(0.9, 1.5, Math.abs(x)));
    }
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose(); stage.dispose(); } };
}
