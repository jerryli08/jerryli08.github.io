// HTML annotations over a stage: labels pinned to points on the model, and small cards (legends,
// readouts). Call update() after the camera or the label strengths change; it only writes styles.
//
//   import { labelLayer } from '/assets/js/lib/labels.js';
//   const ov = labelLayer(stage);
//   const l = ov.label('72T pulley', [x, y, z], { color: '#fff1e2', side: 'l' });
//   l.a = 1; ov.update();                 // a: 0..1, how strongly it shows
//   const card = ov.card({ corner: 'tr' }); card.append(ov.chip('#ff6b35', 'Printed spacers'));
const css = (el, s) => { Object.assign(el.style, s); return el; };

export function labelLayer(stage) {
  const { THREE } = stage;
  const layer = css(document.createElement('div'), {
    position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', overflow: 'hidden',
    font: '500 12.5px/1.25 var(--font, system-ui, sans-serif)', color: '#eee9e3',
  });
  layer.className = 'rx-labels';
  stage.el.appendChild(layer);
  const labels = [];
  const v = new THREE.Vector3();

  /** A label at point p ([x, y, z] in world metres, or an Object3D whose centre it follows). side 'l' puts the text left of the dot. minW: hide on stages narrower than this. */
  function label(text, p, o = {}) {
    const el = css(document.createElement('div'), { position: 'absolute', left: '0', top: '0', opacity: '0', whiteSpace: 'nowrap', willChange: 'transform' });
    const dot = css(document.createElement('span'), {
      position: 'absolute', left: '-4px', top: '-4px', width: '8px', height: '8px', borderRadius: '50%',
      background: o.color || '#ff6b35', boxShadow: '0 0 0 3px rgba(10,8,7,.55)',
    });
    const pill = css(document.createElement('span'), {
      position: 'absolute', top: '-11px', padding: '3px 9px', borderRadius: '999px',
      background: 'rgba(10,8,7,.74)', border: '1px solid rgba(255,255,255,.14)',
    });
    if (o.side === 'l') pill.style.right = '10px'; else pill.style.left = '10px';
    pill.textContent = text;
    el.append(dot, pill);
    layer.appendChild(el);
    const l = { el, p: Array.isArray(p) ? new THREE.Vector3(...p) : null, obj: p && p.isObject3D ? p : null, a: 0, minW: o.minW || 0, shown: -1, x: NaN, y: NaN };
    labels.push(l);
    return l;
  }
  /** A small card pinned to a corner of the stage: corner 'tr' (default), 'tl', 'br' or 'bl'. */
  function card(o = {}) {
    const c = o.corner || 'tr';
    const el = css(document.createElement('div'), {
      position: 'absolute', maxWidth: 'min(300px, 70%)', padding: '11px 13px',
      borderRadius: '12px', background: 'rgba(10,8,7,.74)', border: '1px solid rgba(255,255,255,.12)',
      opacity: '0', fontSize: '12.5px', lineHeight: '1.4',
    });
    el.style[c[0] === 't' ? 'top' : 'bottom'] = '14px';
    el.style[c[1] === 'r' ? 'right' : 'left'] = '14px';
    layer.appendChild(el);
    return el;
  }
  function chip(color, text) {
    const row = css(document.createElement('div'), { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' });
    const sw = css(document.createElement('span'), { width: '10px', height: '10px', borderRadius: '3px', background: color, flex: 'none' });
    const t = document.createElement('span'); t.textContent = text;
    row.append(sw, t);
    return row;
  }
  const box = new THREE.Box3();
  function update() {
    const cam = stage.camera;
    cam.updateMatrixWorld();
    const w = stage.el.clientWidth, h = stage.el.clientHeight;
    for (const l of labels) {
      if (l.obj) box.setFromObject(l.obj).getCenter(v); else v.copy(l.p);
      v.project(cam);
      const on = l.a > 0.02 && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && w >= l.minW;
      const a = on ? Math.round(Math.min(1, l.a) * 100) / 100 : 0;
      if (a !== l.shown) { l.el.style.opacity = String(a); l.shown = a; }
      if (!on) continue;
      const x = Math.round(((v.x + 1) / 2) * w * 2) / 2, y = Math.round(((1 - v.y) / 2) * h * 2) / 2;
      if (x !== l.x || y !== l.y) { l.el.style.transform = `translate(${x}px, ${y}px)`; l.x = x; l.y = y; }
    }
  }
  return { layer, label, card, chip, update, labels, dispose() { layer.remove(); } };
}
