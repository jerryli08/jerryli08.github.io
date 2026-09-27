// The whole system from the real CAD: rover and drone, docked or apart, with a cutaway and labels.
// "Apart" runs the release (servo opens the latch, the drone lifts off, the latch closes again);
// "Docked" runs the passive catch (the tubes push the doors down, the elastic snaps them shut).
// The door angles during the catch come from the CAD section (common.js, doorPush).
import { createStage } from '/assets/js/lib/stage.js';
import { segmented } from '/assets/js/lib/ui.js';
import { rigLatch, rigProps, addElastic, callouts, anchor, animate, doorPush, easeInOut, smooth, clamp, DEG, injectStyle, hull } from './common.js';

const LIFT = 0.2; // m, how far the drone rises when apart

export async function mount(el, ctx) {
  const stage = createStage(el);
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const latch = rigLatch(stage, rover);
  const props = rigProps(stage, drone);
  const elastic = addElastic(stage, rover, latch);
  latch.onChange = elastic.update;

  const narrow = () => el.clientWidth < 620;
  // Fit both vehicles with the drone at height hm, seen along dir, on their real vertices
  // (common.js hull): a single bounding box around this X-shaped pair frames it far too small.
  const shape = hull(stage, [rover, drone]);
  function fitView(hm, dir) {
    const y0 = drone.position.y;
    drone.position.y = hm; drone.updateMatrixWorld(true);
    const wide = el.clientWidth > el.clientHeight * 1.2;
    const v = shape.fit(dir || { azimuth: -42, elevation: 22 }, wide ? 1.3 : 1.08);
    drone.position.y = y0; drone.updateMatrixWorld(true);
    return v;
  }
  stage.setView(fitView(0));

  // ---------------------------------------------------------------- labels (positions: CAD bounding-box centres)
  const R = (p) => anchor(rover, rover, p), D = (p) => anchor(drone, drone, p);
  const items = [
    { id: 'latch', text: 'Latches (2)', anchor: anchor(latch.doors[0].part, rover, [0.4175, -0.0500, -0.0300]), side: 'r' },
    { id: 'tag', text: 'AprilTag', anchor: R([0.268, -0.0840, -0.090]), side: 'l' },
    { id: 'servo', text: 'Latch servo, Feetech FT5325M', anchor: R([0.3892, -0.1111, -0.0965]), side: 'r', cls: 'in' },
    { id: 'pi', text: 'Raspberry Pi 5 and Arduino Mega', anchor: R([0.2445, -0.1305, -0.1108]), side: 'l', cls: 'in' },
    { id: 'lipo', text: '2S 2200 mAh LiPo', anchor: R([0.3453, -0.1376, -0.1101]), side: 'l', cls: 'in' },
    { id: 'drive', text: 'Drive servos, Axon MINI (2)', anchor: R([0.4764, -0.1372, -0.0911]), side: 'r', cls: 'in' },
    { id: 'belt', text: 'HTD 3M belt, 384 mm', anchor: R([0.418, -0.1196, -0.0539]), side: 'r' },
    { id: 'tubes', text: '16 mm landing tubes', anchor: D([0.34, -0.0621, -0.0565]), side: 'l' },
    { id: 'cam', text: 'Downward Pi camera and ARK Flow', anchor: D([0.279, -0.0451, -0.1115]), side: 'l' },
    { id: 'frame', text: 'Holybro X500 V2', anchor: D([0.36, -0.0005, 0.02]), side: 'r' },
  ];
  items.forEach((it, i) => { it.n = i + 1; });
  const labs = callouts(stage, items, { narrow });
  // phones: numbered dots, names in a key under the canvas
  injectStyle();
  const key = document.createElement('ol');
  key.className = 'hv-key';
  key.innerHTML = items.map((it) => `<li><i>${it.n}</i>${it.text}</li>`).join('');
  function fitLabels() { key.style.display = narrow() && labelsOn ? '' : 'none'; stage.invalidate(); }
  let labelsOn = true;

  // ---------------------------------------------------------------- docking and release
  let state = 'docked', anim = null, propA = 0, h = 0, cut = null;
  const setDrone = (hm) => { h = hm; drone.position.y = hm; elastic.update(); stage.invalidate(); };
  function spin(rate, dt) { propA += rate * dt; props.set(propA); }
  // frame both vehicles as they will be at drone height hm, from wherever the reader has turned the camera
  const camDir = () => stage.camera.position.clone().sub(stage.controls.target);
  let goal = 0; // the drone height the camera is framed for
  function reframe(hm, seconds) {
    goal = hm;
    stage.tweenCamera(fitView(hm, camDir()), ctx.reducedMotion ? 0 : seconds);
  }
  function release() {
    anim?.stop();
    let last = 0;
    const T = 3.2;
    anim = animate(stage, T, (t) => {
      const dt = (t - last) * T; last = t;
      latch.set(easeInOut(clamp(t / 0.22, 0, 1)) * (1 - smooth(0.82, 1, t)));
      spin(60 * smooth(0.05, 0.3, t) * (1 - smooth(0.85, 1, t)), dt);
      setDrone(LIFT * easeInOut(clamp((t - 0.26) / 0.56, 0, 1)));
    }, ctx.reducedMotion);
    if (ctx.reducedMotion) { latch.set(0); setDrone(LIFT); }
    reframe(LIFT, 1.4);
  }
  function dock() {
    anim?.stop();
    let last = 0, snapped = false, snapT = 0;
    const T = 3.4, h0 = h;
    anim = animate(stage, T, (t) => {
      const dt = (t - last) * T; last = t;
      spin(60 * (1 - smooth(0.78, 0.97, t)), dt);
      const hm = h0 * (1 - easeInOut(clamp(t / 0.8, 0, 1)));
      setDrone(hm);
      const b = doorPush(hm * 1000);
      if (b == null || snapped) {
        // past the doors: the elastic pulls them back up; a short damped overshoot reads as a snap
        if (!snapped) { snapped = true; snapT = t; }
        const s = (t - snapT) * T, from = 38.75 * DEG;
        latch.setDoor(from * Math.exp(-s * 16) * Math.cos(s * 38));
      } else latch.setDoor(b * DEG);
    }, ctx.reducedMotion);
    if (ctx.reducedMotion) { setDrone(0); latch.setDoor(0); }
    reframe(0, 1.2);
  }

  // ---------------------------------------------------------------- controls
  segmented(ctx.panel, {
    label: 'Vehicles', value: 'docked',
    options: [{ value: 'docked', label: 'Docked' }, { value: 'apart', label: 'Apart' }],
    onChange(v) { if (v === state) return; state = v; if (v === 'apart') release(); else dock(); },
  });
  segmented(ctx.panel, {
    label: 'Inside', value: 'closed',
    options: [{ value: 'closed', label: 'Closed' }, { value: 'cut', label: 'Cut open' }],
    onChange(v) {
      if (v === 'cut') {
        // keep z <= -0.108: the rover's left half comes off along its centreline, showing the latch
        // servo, the electronics stack and the geartrain in section
        if (!cut) cut = stage.sectionPlane([0, 0, -1], -0.108); else cut.enable(true);
      } else cut?.enable(false);
    },
  });
  segmented(ctx.panel, {
    label: 'Labels', value: 'on',
    options: [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }],
    onChange(v) { labelsOn = v === 'on'; labs.show(labelsOn); fitLabels(); },
  });
  ctx.panel.appendChild(key);
  fitLabels();
  let lastW = el.clientWidth, lastH = el.clientHeight;
  const ro = new ResizeObserver(() => {
    fitLabels();
    if (el.clientWidth === lastW && el.clientHeight === lastH) return;
    lastW = el.clientWidth; lastH = el.clientHeight;
    stage.setView(fitView(goal, camDir()));
  });
  ro.observe(el);

  return {
    dispose() { anim?.stop(); ro.disconnect(); labs.dispose(); key.remove(); elastic.dispose(); stage.dispose(); },
  };
}
