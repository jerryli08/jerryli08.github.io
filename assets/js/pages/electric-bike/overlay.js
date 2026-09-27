// HTML annotations over a demo canvas: labels pinned to points on the model, and small cards
// (legends, bars). Labels are projected with the stage camera every time the view changes.
const css = (el, s) => { Object.assign(el.style, s); return el; };

export function overlayLayer(stage) {
  const { THREE } = stage;
  const layer = css(document.createElement('div'), {
    position: 'absolute', inset: '0', zIndex: '2', pointerEvents: 'none', overflow: 'hidden',
    font: '500 12.5px/1.25 var(--font, system-ui, sans-serif)', color: '#eee9e3',
  });
  layer.className = 'eb-overlay';
  stage.el.appendChild(layer);
  const labels = [];
  const v = new THREE.Vector3();

  /** A label at model point p ([x, y, z] metres). side: 'r' puts the text right of the dot, 'l' left. */
  function label(text, p, o = {}) {
    const el = css(document.createElement('div'), { position: 'absolute', left: '0', top: '0', opacity: '0', transition: 'opacity .25s', whiteSpace: 'nowrap' });
    const dot = css(document.createElement('span'), {
      position: 'absolute', left: '-4px', top: '-4px', width: '8px', height: '8px', borderRadius: '50%',
      background: o.color || '#ff6b35', boxShadow: '0 0 0 3px rgba(10,8,7,.55)',
    });
    const pill = css(document.createElement('span'), {
      position: 'absolute', top: '-11px', padding: '3px 9px', borderRadius: '999px',
      background: 'rgba(10,8,7,.74)', border: '1px solid rgba(255,255,255,.14)', backdropFilter: 'blur(6px)',
    });
    if (o.side === 'l') pill.style.right = '10px'; else pill.style.left = '10px';
    pill.textContent = text;
    el.append(dot, pill);
    layer.appendChild(el);
    const l = { el, p: new THREE.Vector3(...p), a: 0, minW: o.minW || 0 };
    labels.push(l);
    return l;
  }
  /** A small card pinned to a corner of the canvas. */
  function card(o = {}) {
    const el = css(document.createElement('div'), {
      position: 'absolute', top: '14px', right: '14px', maxWidth: 'min(300px, 70%)', padding: '11px 13px',
      borderRadius: '12px', background: 'rgba(10,8,7,.74)', border: '1px solid rgba(255,255,255,.12)',
      backdropFilter: 'blur(8px)', opacity: '0', transition: 'opacity .25s', fontSize: '12.5px', lineHeight: '1.4',
    });
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
  function update() {
    const cam = stage.camera;
    cam.updateMatrixWorld();
    const w = stage.el.clientWidth, h = stage.el.clientHeight;
    for (const l of labels) {
      v.copy(l.p).project(cam);
      const on = l.a > 0.02 && v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05 && w >= l.minW;
      l.el.style.opacity = on ? String(Math.min(1, l.a)) : '0';
      if (on) l.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }
  return { layer, label, card, chip, update, labels, dispose() { layer.remove(); } };
}
