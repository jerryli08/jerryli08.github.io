// Passive latching, in a section through the middle of both latches. Lower the drone and its
// landing tubes push the doors down on their pins; once the tubes are past, the elastic between
// the knobs pulls the doors back over them. Pulling up only presses the tubes into the doors'
// undersides. Door angles come from the real door section turned against the 16 mm tube
// (common.js, doorPush); the elastic is drawn in (it is not part of the CAD).
import { createStage } from '/assets/js/lib/stage.js';
import { slider, button } from '/assets/js/lib/ui.js';
import { rigLatch, addElastic, labels, anchor, hud, region, animate, doorPush, easeInOut, clamp, CUT_X, DEG, HOLD_H, FIRST_TOUCH, injectStyle } from './common.js';

const TOP = 32; // mm, the drone's starting height above docked

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false });
  const [rover, drone] = await Promise.all([stage.load('/assets/models/rover.glb'), stage.load('/assets/models/drone.glb')]);
  const latch = rigLatch(stage, rover);
  const elastic = addElastic(stage, rover, latch);
  latch.onChange = elastic.update;
  stage.sectionPlane([-1, 0, 0], CUT_X);

  const both = region([0.405, -0.101, -0.206], [0.43, -0.012, -0.007]);
  const one = region([0.405, -0.101, -0.094], [0.43, -0.012, -0.019]);
  const DIR = [1, 0.1, 0.12];
  function place() {
    const wide = el.clientWidth > el.clientHeight * 1.25;
    stage.frame(wide ? both : one, { dir: DIR, pad: 1.06 });
  }
  place();
  const ro = new ResizeObserver(place);
  ro.observe(el);

  const labs = labels(stage, [
    { id: 'band', anchor: elastic.bands[0].b, side: 'r', text: 'Elastic on the knobs', cls: 'pas' },
    { id: 'held', anchor: anchor(drone, drone, [CUT_X, -0.0621, -0.0565]), side: 'r', text: '↑ Pulling up: <b>held</b>', on: false },
  ]);
  const info = hud(stage, [{ key: 'h', label: 'Drone height' }, { key: 'b', label: 'Door angle' }, { key: 's', label: 'Elastic stretch' }, { key: 'state', state: true }]);

  // ---------------------------------------------------------------- state
  let h = TOP, latched = false, snap = null, anim = null;
  const rest = elastic.bands[0].len;
  function show(state, cls) {
    info.set({ h: `${h.toFixed(1)} mm`, b: `${(latch.doors[0].b / DEG).toFixed(1)}°`, s: `${Math.max(0, (elastic.bands[0].len - rest) * 1000).toFixed(1)} mm` });
    info.state(state, cls);
  }
  function setDoors(b) { latch.setDoor(b); }
  function apply(hmm) {
    if (latched) hmm = Math.min(hmm, HOLD_H);
    h = clamp(hmm, 0, TOP);
    drone.position.y = h / 1000;
    s.set(h, { silent: true });
    let state, cls = '';
    if (latched) {
      if (!snap) setDoors(0);
      const held = h >= HOLD_H - 0.02;
      labs.set('held', { on: held });
      state = held ? 'Held: the tubes press up into the doors' : 'Latched, no power';
      cls = 'ok';
    } else {
      labs.set('held', { on: false });
      const b = doorPush(h);
      if (b == null) {
        latched = true;
        startSnap();
        state = 'Latched, no power'; cls = 'ok';
      } else {
        setDoors(b * DEG);
        state = h >= FIRST_TOUCH ? 'Above the latch' : 'The tubes push the doors down';
        cls = h >= FIRST_TOUCH ? '' : 'warn';
      }
    }
    buttons();
    drone.updateMatrixWorld(true);
    elastic.update();
    show(state, cls);
  }
  // past the doors, the elastic pulls them back up: a short damped overshoot reads as the snap
  function startSnap() {
    const from = latch.doors[0].b;
    if (ctx.reducedMotion) { setDoors(0); return; }
    let t = 0;
    snap = stage.onFrame((dt) => {
      t += dt;
      setDoors(from * Math.exp(-t * 16) * Math.cos(t * 38));
      show(info.el.querySelector('.hv-state').textContent, 'ok');
      if (t > 0.45) { snap(); snap = null; setDoors(0); show(info.el.querySelector('.hv-state').textContent, 'ok'); }
    });
  }
  function run(seconds, fn) {
    anim?.stop();
    anim = animate(stage, seconds, fn, ctx.reducedMotion);
    anim.done.then(() => { anim = null; buttons(); });
    return anim.done;
  }

  // ---------------------------------------------------------------- controls
  const s = slider(ctx.panel, { label: 'Drone height', min: 0, max: TOP, step: 0.1, value: TOP, unit: ' mm', format: (v) => v.toFixed(1), onInput: (v) => { anim?.stop(); anim = null; apply(v); } });
  injectStyle();
  const bLand = button(ctx.panel, { label: 'Lower it', onClick() { const h0 = h; run(Math.max(0.4, h0 / TOP * 2.6), (t) => apply(h0 * (1 - easeInOut(t)))); } });
  const bPull = button(ctx.panel, { label: 'Pull up', onClick() { const h0 = h; run(0.5, (t) => apply(h0 + (HOLD_H + 1 - h0) * easeInOut(t))); } });
  const bRel = button(ctx.panel, {
    label: 'Release (servo)',
    async onClick() {
      const h0 = h;
      await run(0.7, (t) => { latch.set(easeInOut(t)); apply(h0); });
      latched = false;
      await run(1.1, (t) => { const hh = h0 + (TOP - h0) * easeInOut(t); h = hh; drone.position.y = hh / 1000; s.set(hh, { silent: true }); elastic.update(); show('Released: the servo swings the arms open', ''); });
      await run(0.6, (t) => { latch.set(1 - easeInOut(t)); apply(TOP); });
    },
  });
  for (const b of [bLand, bPull, bRel]) b.classList.add('hv-btn');
  function buttons() {
    const busy = !!anim;
    bLand.disabled = latched || h <= 0.01;
    bPull.disabled = !latched || h >= HOLD_H - 0.02;
    bRel.disabled = !latched || (busy && latch.open > 0);
  }

  // mouse or pen: drag the drone up and down on the canvas (touch keeps scrolling the page)
  const canvas = stage.canvas;
  canvas.style.pointerEvents = 'auto';
  canvas.style.cursor = 'ns-resize';
  let drag = null;
  const pxPerMm = () => {
    const a = new stage.THREE.Vector3(CUT_X, -0.07, -0.0565).project(stage.camera), b = new stage.THREE.Vector3(CUT_X, -0.06, -0.0565).project(stage.camera);
    return Math.abs(b.y - a.y) * 0.5 * el.clientHeight / 10;
  };
  canvas.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') return; drag = { y: e.clientY, h, k: pxPerMm() }; canvas.setPointerCapture(e.pointerId); anim?.stop(); anim = null; });
  canvas.addEventListener('pointermove', (e) => { if (drag) apply(drag.h - (e.clientY - drag.y) / drag.k); });
  const end = () => { drag = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  apply(TOP);
  return {
    dispose() { anim?.stop(); snap?.(); ro.disconnect(); labs.dispose(); info.dispose(); elastic.dispose(); both.geometry.dispose(); one.geometry.dispose(); stage.dispose(); },
  };
}
