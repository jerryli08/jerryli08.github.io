// Screen-space labels for points on the model: a dot on the point and a short name beside it.
// Annotations only (no geometry). update(camera) re-projects them after anything moves.
import * as THREE from 'three';

const CSS = `
.dcc-labs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
.dcc-lab { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font: 500 12px/1.2 var(--font, system-ui, sans-serif); color: #eee9e3; transition: opacity .25s; will-change: transform; }
.dcc-lab i { width: 7px; height: 7px; border-radius: 50%; background: var(--c, #ff6b35); box-shadow: 0 0 0 2px rgba(11,10,9,.7); flex: none; }
.dcc-lab b { font-weight: 500; padding: 3px 7px; border-radius: 6px; background: rgba(11,10,9,.8); border: 1px solid rgba(237,232,226,.18); }
.dcc-lab.l { flex-direction: row-reverse; }
.dcc-lab.off { opacity: 0 !important; }
@media (max-width: 600px) { .dcc-lab { font-size: 10.5px; gap: 4px; } .dcc-lab b { padding: 2px 5px; } }
@media (prefers-reduced-motion: reduce) { .dcc-lab { transition: none; } }
`;
let styled = false;

export function createLabels(el) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const box = document.createElement('div');
  box.className = 'dcc-labs';
  box.setAttribute('aria-hidden', 'true');
  el.append(box);
  let items = [];
  const v = new THREE.Vector3();
  const api = {
    /** list: [{ key, text, p: [x, y, z] model metres or () => [x, y, z], side: 'r' | 'l', color }] */
    set(list) {
      box.textContent = '';
      items = list.map((x) => {
        const d = document.createElement('span');
        d.className = `dcc-lab${x.side === 'l' ? ' l' : ''}`;
        d.innerHTML = '<i></i><b></b>';
        if (x.text) d.querySelector('b').textContent = x.text; else d.querySelector('b').remove();
        if (x.color) d.style.setProperty('--c', x.color);
        box.append(d);
        return { ...x, d, on: true };
      });
    },
    show(key, on) { const it = items.find((x) => x.key === key); if (it) { it.on = on; it.d.classList.toggle('off', !on); } },
    opacity(a) { box.style.opacity = String(a); },
    update(camera) {
      const w = el.clientWidth, h = el.clientHeight;
      camera.updateMatrixWorld();
      for (const it of items) {
        const p = typeof it.p === 'function' ? it.p() : it.p;
        v.set(p[0], p[1], p[2]).project(camera);
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
        const dw = it.d.offsetWidth;
        // keep the name on the canvas: flip to the other side of its dot near an edge
        let left = it.side === 'l';
        if (left && x - dw < 4) left = false; else if (!left && x + dw > w - 4) left = true;
        it.d.classList.toggle('l', left);
        const off = left ? -dw + 3.5 : -3.5;
        it.d.style.transform = `translate(${(x + off).toFixed(1)}px, ${(y - 9).toFixed(1)}px)`;
        const out = v.z > 1 || x < 0 || x > w || y < 0 || y > h;
        it.d.style.opacity = out || !it.on ? '0' : '1';
      }
    },
    dispose() { box.remove(); },
  };
  return api;
}
