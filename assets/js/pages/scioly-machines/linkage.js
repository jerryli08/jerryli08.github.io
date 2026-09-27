// Demo: the linkage in my CAD. Tip the upper lever and the rigid link carries the lower lever
// with it; both turn about their real fulcrums (the 6202 bearings). The highlight picks out
// each lever and the link, with its fulcrum, effort and load marked.
import { createStage } from '/assets/js/lib/stage.js';
import { slider, readout, segmented, playToggle } from '/assets/js/lib/ui.js';
import { loadRig, labels, DEG, STOP, K, P1, P2, X_UP, X_LO } from './rig.js';

const COL = { upper: '#ff6b35', lower: '#58b0ff', link: '#f2c14e' };

export async function mount(el, ctx) {
  const stage = createStage(el);
  const T = stage.THREE;
  const rig = await loadRig(stage);
  stage.frame(rig.model, { azimuth: -52, elevation: 20, pad: 1.05 });

  const labs = labels(el);
  const tags = {
    upper: [
      ['uF', 'Fulcrum', () => new T.Vector3(X_UP, P1[0], P1[1]), 'l'],
      ['uE', 'Effort: mass A', () => rig.upperPoint(190, -0.012), 'c'],
      ['uL', 'Load: the link', () => rig.pinU().add(new T.Vector3(0, 0.012, 0)), 'c'],
    ],
    lower: [
      ['lF', 'Fulcrum', () => new T.Vector3(X_LO, P2[0], P2[1]), 'r'],
      ['lL', 'Load: mass B', () => rig.lowerPoint(190, -0.012), 'c'],
      ['lE', 'Effort: the link', () => rig.pinL().add(new T.Vector3(0, -0.02, 0)), 'r'],
    ],
    link: [
      ['kU', 'Pin on the class 1 lever, 75 mm out', () => rig.pinU(), 'r'],
      ['kL', 'Pin on the class 2 lever, 375 mm out', () => rig.pinL(), 'r'],
    ],
  };
  for (const list of Object.values(tags)) for (const [id, text, , side] of list) labs.add(id, { text, side, on: false });

  let sel = 'none', clear = null;
  function pick(v) {
    sel = v;
    clear?.(); clear = null;
    if (v !== 'none') clear = stage.highlight(rig.parts[v], COL[v], { intensity: 0.55 });
    for (const [k, list] of Object.entries(tags)) for (const [id] of list) labs.show(id, k === v);
    place();
  }
  function place() {
    for (const list of Object.values(tags)) for (const [id, , at] of list) labs.point(id, at());
    labs.update(stage.camera);
  }

  const info = readout(null, { rows: [
    { key: 'a1', label: 'Class 1 lever', unit: '°', format: (v) => v.toFixed(2) },
    { key: 'a2', label: 'Class 2 lever', unit: '°', format: (v) => v.toFixed(2) },
    { key: 'r', label: 'Angle ratio' },
    { key: 'd', label: 'Each link pin moves', unit: 'mm', format: (v) => v.toFixed(1) },
  ] });
  function tip(deg) {
    rig.set(-deg * DEG); // positive slider = mass A's side down
    const a1 = rig.a1 / DEG, a2 = rig.a2 / DEG;
    info.set({ a1: -a1, a2: -a2, r: Math.abs(a1) < 0.01 ? `${K.toFixed(1)} : 1 (CAD)` : `${(a1 / a2).toFixed(2)} : 1`, d: Math.abs(75 * Math.sin(rig.a1)) });
    place();
  }

  segmented(ctx.panel, { label: 'Show', options: [{ value: 'none', label: 'Device' }, { value: 'upper', label: 'Class 1' }, { value: 'lower', label: 'Class 2' }, { value: 'link', label: 'Link' }], value: 'none', onChange: pick });
  const s = slider(ctx.panel, { label: 'Tip the class 1 lever', min: -STOP / DEG, max: STOP / DEG, step: 0.1, value: 0, unit: '°', format: (v) => v.toFixed(1), onInput: (v) => { rock.set(false, { silent: true }); stopRock(); tip(v); } });
  let stopRock = () => {};
  const rock = playToggle(ctx.panel, {
    playing: false, labels: ['Rock it', 'Stop'],
    onChange(on) {
      stopRock();
      if (!on) return;
      if (ctx.reducedMotion) { tip(STOP / DEG); s.set(STOP / DEG, { silent: true }); rock.set(false, { silent: true }); return; }
      let t = Math.asin(Math.max(-1, Math.min(1, s.value / (STOP / DEG)))) / 2.2;
      const off = stage.onFrame((dt) => { t += dt; const v = (STOP / DEG) * Math.sin(t * 2.2); s.set(v, { silent: true }); tip(v); });
      stopRock = () => { off(); stopRock = () => {}; };
    },
  });
  ctx.panel.append(info.el);
  stage.controls?.addEventListener('change', () => labs.update(stage.camera));
  const ro = new ResizeObserver(() => labs.update(stage.camera));
  ro.observe(el);
  tip(0);
  pick('none');
  return { dispose() { stopRock(); ro.disconnect(); clear?.(); labs.dispose(); stage.dispose(); } };
}
