// The tailsitter assembly, rigged from the real CAD (shared by the page's scroll-driven modules).
//
// assets/models/vtol-tailsitter/assembly.glb is Jerry's SolidWorks assembly (tailsitter v7 + two
// brushless motors + two DALPROP T3045 props), moved so the airframe part's own frame is the origin:
// metres, +y up, the nose toward -z, +x the right wing. The pre-pass that made it
// (/home/claude/work/solidworks-vtol-tailsitter/prepass.mjs) split the one-part airframe into its
// seven solid bodies and baked each motor into a rotor and a stator side; nothing was reshaped.
//
// Axes, from tools/cad-axes.py on the STEP (millimetres; the airframe part sits at
// STEP X 848.74, Y 1263.79, Z 387.86 in the assembly):
//  - motor shafts and prop bores: along STEP Y (the model's z) at X 925.5 (right) and 772.0 (left),
//    Z 387.9, so x = +76.76 / -76.74 mm, y = 0
//  - elevon hinge: the 2.7 mm bore and the elevons' 2.0 mm knuckle bores share one axis along STEP X
//    at Y 1248.1, Z 387.9, so y = 0, z = +15.69 mm
export const SRC = '/assets/models/vtol-tailsitter/assembly.glb';
export const AX = {
  motorR: [0.07676, 0, 0], motorL: [-0.07674, 0, 0], motorDir: [0, 0, 1],
  hinge: [0, 0, 0.01569], hingeDir: [1, 0, 0],
};
// measured from the CAD: prop radius (75.7 mm tip to tip), the spans the page quotes
export const PROP_R = 0.03785;
export const SPAN = { discIn: 0.0389, discOut: 0.1146, elevonIn: 0.0295, elevonOut: 0.1195, tail: 0.0699 };

/** Loads the assembly and returns its parts and pivots (angles in radians; elevon + = trailing edge down). */
export async function loadCraft(stage, o = {}) {
  const model = await stage.load(SRC, { add: o.add });
  const P = (re) => stage.part(re, model);
  const parts = {
    propR: P(/prop_R/), propL: P(/prop_L/), rotorR: P(/motor_R_rotor/), rotorL: P(/motor_L_rotor/),
    elevR: P(/elevon_R/), elevL: P(/elevon_L/),
  };
  return { model, parts, pivots: null };
}

/** Pivots about the real axes; call once the model is in the scene. */
export function rig(stage, craft) {
  const { parts } = craft;
  craft.pivots = {
    spinR: stage.pivot([...parts.propR, ...parts.rotorR], AX.motorR, AX.motorDir),
    spinL: stage.pivot([...parts.propL, ...parts.rotorL], AX.motorL, AX.motorDir),
    elevR: stage.pivot(parts.elevR, AX.hinge, AX.hingeDir),
    elevL: stage.pivot(parts.elevL, AX.hinge, AX.hingeDir),
  };
  return craft.pivots;
}
