// The path a fuel ball takes through the FRC REBUILT robot, from the floor to the shooter exit, in
// the robot's frame (metres, +Y up, +Z the front, the intake deployed). Pure functions, no three.js.
//
// Every number is read from Jerry's CAD (the web model, sliced through the lanes):
//  - The roller: axis at y 0.0771, z 0.2657 (rig.js), silicone sleeve radius 17.5 mm. The floor is
//    143 mm under its axis, so a 150 mm ball only fits under it squeezed. Nothing else lets fuel in:
//    the front hopper wall comes down to 155 mm over the floor right in front of the roller, with a
//    churro tube between them, so the ball cannot go over the top of the roller.
//  - The ball goes under the roller and up its back, squeezed against the front bumper and the low
//    churro tube on the arm, which stay about 123 mm from the roller all the way round. ORBIT: at
//    each angle round the roller axis, the centre distance that squeezes the ball equally against the
//    roller and whatever is outside it, measured on the CAD's sections; the squash is drawn from it.
//  - Out of the top of that gap it is thrown up and back over the front of the hopper floor (on the
//    arm, rising to the pivot) and lands just behind the ridge at the pivot. The throw is drawn (a
//    parabola), checked on the CAD to clear the floor, the churro tubes and the hopper walls.
//  - It rolls down the lane floor (15.7 degrees) until it meets the lower flex wheels, which hang
//    107 mm over the floor: with the transfer off the first ball stops against them and the next two
//    queue behind it, one ball apart (the last just behind the ridge).
//  - Fed: the lower flex wheels pull it under them, squeezed against the floor and the curve of the
//    bent backing (FEED, measured the same way round the lower shaft), then it goes up between the
//    wheels and the backing, past the upper wheels, squeezed by the flywheel against the hood (133 mm
//    apart), and leaves along the hood's top edge.
//
// Points are [y, z].
export const R = 0.075; // REBUILT fuel, 150 mm
const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// a squeezed turn round a wheel: [angle round its axis (degrees, 0 = toward the front, -90 = down), centre distance]
function orbit(axis, free, table) {
  return (deg) => {
    let i = 0; while (i < table.length - 2 && deg < table[i + 1][0]) i++;
    const [a0, r0] = table[i], [a1, r1] = table[i + 1];
    const rho = r0 + (r1 - r0) * clamp((deg - a0) / (a1 - a0), 0, 1), th = deg * DEG;
    // squeezed equally on both sides, so the ball is 2 (free - rho) shorter along the radius
    return [axis[0] + rho * Math.sin(th), axis[1] + rho * Math.cos(th), 1 - (free - rho) / R, th];
  };
}
// the roller; -47.4: a ball on the floor first touches it; -206: out of the gap
const ROLLER_FREE = R + 0.0175;
const ORBIT = [[-47.4, ROLLER_FREE], [-52, 0.09], [-56, 0.088], [-60, 0.086], [-64, 0.0845], [-68, 0.0835], [-72, 0.0825], [-76, 0.0815], [-80, 0.081], [-84, 0.0805], [-96, 0.0805], [-100, 0.081], [-104, 0.0815], [-108, 0.0825], [-112, 0.0835], [-116, 0.0845], [-120, 0.086], [-124, 0.088], [-128, 0.088], [-132, 0.0845], [-136, 0.082], [-140, 0.08], [-144, 0.078], [-148, 0.0765], [-152, 0.076], [-160, 0.0755], [-164, 0.076], [-168, 0.0765], [-172, 0.078], [-176, 0.079], [-180, 0.0795], [-184, 0.0805], [-188, 0.0815], [-192, 0.083], [-196, 0.0855], [-200, 0.088], [-204, 0.091], [-206, ROLLER_FREE], [-214, ROLLER_FREE]];
const onRoller = orbit([0.0771, 0.26565], ROLLER_FREE, ORBIT);

// the lane floor: the ball's centre line on the rear plate of the ridge, then on the lane ramp
const y49 = (z) => 0.265 + 0.282 * (z + 0.03976);
const yRamp = (z) => 0.1625 + 0.281 * (z + 0.3874);
// resting places, 0 deepest: against the lower flex wheels, then one ball apart up the lane
export const SLOTS = [[yRamp(-0.3328), -0.3328], [yRamp(-0.1884), -0.1884], [y49(-0.0453), -0.0453]];
const LAND = [y49(-0.03), -0.03]; // where the throw comes down, just behind the ridge
const APEX = LAND[0] + 0.12; // top of the throw

// fed: round the lower flex wheels (1.625 in, on the shaft at y 0.2065, z -0.424), from slot 0 to
// between the wheels and the backing, then up past the upper wheels and the flywheel to the exit
const FLEX_FREE = R + 0.0206;
const FEED = [[-17.47, FLEX_FREE], [-23, 0.091], [-29, 0.087], [-35, 0.0835], [-41, 0.0805], [-47, 0.0785], [-53, 0.0765], [-59, 0.0755], [-65, 0.0745], [-71, 0.074], [-77, 0.074], [-83, 0.0745], [-89, 0.075], [-95, 0.0765], [-101, 0.078], [-107, 0.0805], [-113, 0.083], [-119, 0.0865], [-125, 0.0885], [-131, 0.0905], [-137, 0.092], [-143, 0.093], [-149, 0.094], [-155, 0.0945], [-161, 0.0945], [-167, 0.094], [-173, 0.0935], [-180, 0.094]];
const onFlex = orbit([0.2065, -0.424], FLEX_FREE, FEED);
// [y, z, squash, squash direction (degrees round the wheel that squeezes it)] up between the flex
// wheels and the backing, then between the flywheel and the hood, every 20 mm of height: the centre
// line that squeezes the ball equally against both sides, or touches the backing where it is free.
// Past the upper flex wheels (3 mm squeeze) the flywheel squeezes it about 17 mm against the hood;
// the last point is where it comes free of the flywheel, at the hood's curled top.
const LIFT = [[0.2265, -0.5175, 1, -180], [0.2465, -0.5195, 1, -180], [0.2665, -0.5215, 0.994, -180], [0.2865, -0.525, 0.974, -180], [0.3065, -0.526, 0.983, -180], [0.3265, -0.531, 0.938, -155.3], [0.3465, -0.5355, 0.902, -165.1], [0.3665, -0.5385, 0.887, -174.9], [0.3865, -0.5385, 0.888, -184.6], [0.4065, -0.535, 0.889, -194.5], [0.4265, -0.5275, 0.889, -204.9], [0.4465, -0.516, 0.892, -216.2], [0.4565, -0.5095, 0.907, -221.8], [0.4665, -0.5035, 0.943, -227.3], [0.4765, -0.4975, 0.996, -231]];
export const EXIT = [0.8575, 0.5145]; // [y, z] direction the ball leaves in: the path's tangent where the flywheel lets go, 59 degrees up

// ---- polylines with arc lengths: [y, z, squash, squash direction (radians, round the wheel)]
function poly(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const at = (d) => {
    d = clamp(d, 0, s[s.length - 1]);
    let i = 1; while (i < s.length - 1 && d > s[i]) i++;
    const f = (d - s[i - 1]) / (s[i] - s[i - 1] || 1), a = pts[i - 1], b = pts[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
  };
  return { s, at, length: s[s.length - 1] };
}
// the lane: from the landing to slot 0 (the step down from the ridge plate to the ramp at z -0.185)
const LANE = poly([[...LAND, 1, 0], SLOTS[2].concat(1, 0), [y49(-0.185), -0.185, 1, 0], SLOTS[1].concat(1, 0), SLOTS[0].concat(1, 0)]);
export const SLOT_AT = [LANE.length, LANE.s[3], LANE.s[1]];
const feedPts = [];
for (let d = FEED[0][0]; d > -180; d -= 3) feedPts.push(onFlex(d));
feedPts.push(onFlex(-180));
for (const [y, z, sq, d] of LIFT) feedPts.push([y, z, sq, d * DEG]);
const FEEDP = poly(feedPts);

// ---- the throw: a parabola from the top of the roller gap to LAND, peaking at APEX (unit gravity)
const E = onRoller(-214);
const T1 = Math.sqrt(2 * (APEX - E[0])), T2 = Math.sqrt(2 * (APEX - LAND[0])), TF = T1 + T2;
const VZ = (LAND[1] - E[1]) / TF;
const throwAt = (f) => { const t = f * TF; return [E[0] + T1 * t - 0.5 * t * t, E[1] + VZ * t]; };

// ---- timing, in units of scroll (one step = 1): round the roller, the throw, then rolling
export const T_ORBIT = 0.2, T_THROW = 0.18, V_ROLL = 0.8, EASE = 0.08;
/** time from first touching the roller to resting in slot k */
export const arrival = (k) => T_ORBIT + T_THROW + (SLOT_AT[k] + EASE) / V_ROLL;

/**
 * Where a ball is, tau (scroll units) after it first touched the roller, bound for slot k:
 * [y, z, squash, squash direction (radians round X), stage: 0 round the roller, 1 thrown, 2 rolling].
 */
export function intake(tau, k) {
  if (tau < T_ORBIT) return [...onRoller(ORBIT[0][0] + (-214 - ORBIT[0][0]) * clamp(tau / T_ORBIT, 0, 1)), 0];
  if (tau < T_ORBIT + T_THROW) return [...throwAt((tau - T_ORBIT) / T_THROW), 1, 0, 1];
  // rolling, easing to a stop over the last EASE metres
  const L = SLOT_AT[k], x = (tau - T_ORBIT - T_THROW) * V_ROLL;
  const d = x < L - EASE ? x : x < L + EASE ? L - ((L + EASE - x) ** 2) / (4 * EASE) : L;
  return [...LANE.at(d), 2];
}

/**
 * A ball fed toward the shooter: x is its place (2, 1, 0 = the slots, down the lane), -1..0 under
 * the lower flex wheels and up to the exit, below -1 in flight; tPer converts flight to (drawn)
 * seconds, v0 the exit speed (drawn). Returns [y, z, squash, squash direction].
 */
export function fed(x, tPer, v0) {
  if (x >= 0) {
    const i = Math.min(1, Math.floor(x)), f = clamp(x - i, 0, 1);
    return LANE.at(SLOT_AT[i] + (SLOT_AT[Math.min(2, i + 1)] - SLOT_AT[i]) * f);
  }
  if (x >= -1) return FEEDP.at(-x * FEEDP.length); // evenly along it, so the ball behind never catches up
  const t = (-1 - x) * tPer, e = LIFT[LIFT.length - 1];
  return [e[0] + v0 * EXIT[0] * t - 4.905 * t * t, e[1] + v0 * EXIT[1] * t, 1, 0];
}

/** where a ball first touches the roller (robot frame, [y, z]) */
export const CONTACT = onRoller(ORBIT[0][0]).slice(0, 2);
