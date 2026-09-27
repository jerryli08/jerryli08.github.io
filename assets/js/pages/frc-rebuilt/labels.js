// Screen-space labels for points on the model: a dot on the point and a short name beside it.
// Annotations only (no geometry). update(camera) re-projects them after the camera moves.
import * as THREE from 'three';

const CSS = `
.frc-labs { position: absolute; inset: 0; pointer-events: none; overflow: hidden; z-index: 2; }
.frc-lab { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 6px; white-space: nowrap;
  font: 500 12px/1.2 var(--font-ui, system-ui, sans-serif); color: #eee9e3; transition: opacity .25s; will-change: transform; }
.frc-lab i { width: 7px; height: 7px; border-radius: 50%; background: #ff6b35; box-shadow: 0 0 0 2px rgba(11,10,9,.7); flex: none; }
.frc-lab b { font-weight: 500; padding: 3px 7px; border-radius: 6px; background: rgba(11,10,9,.78); border: 1px solid rgba(237,232,226,.18); }
.frc-lab.l { flex-direction: row-reverse; }
@media (max-width: 600px) { .frc-lab { font-size: 11px; } .frc-lab b { padding: 2px 6px; } }
@media (prefers-reduced-motion: reduce) { .frc-lab { transition: none; } }
`;
let styled = false;

export function createLabels(el) {
  if (!styled) { const s = document.createElement('style'); s.textContent = CSS; document.head.append(s); styled = true; }
  const box = document.createElement('div');
  box.className = 'frc-labs';
  box.setAttribute('aria-hidden', 'true');
  el.append(box);
  let items = [];
  const v = new THREE.Vector3();
  return {
    /** list: [{ text, p: [x, y, z] world metres, side: 'r' | 'l' }] */
    set(list) {
      const key = list.map((x) => x.text).join('|');
      if (key !== box.dataset.key) {
        box.textContent = '';
        items = list.map((x) => {
          const d = document.createElement('span');
          d.className = `frc-lab${x.side === 'l' ? ' l' : ''}`;
          d.innerHTML = '<i></i><b></b>';
          d.querySelector('b').textContent = x.text;
          box.append(d);
          return { ...x, d };
        });
        box.dataset.key = key;
      } else items.forEach((it, i) => { it.p = list[i].p; });
    },
    opacity(a) { box.style.opacity = String(a); },
    update(camera) {
      const w = el.clientWidth, h = el.clientHeight;
      camera.updateMatrixWorld();
      for (const it of items) {
        v.set(it.p[0], it.p[1], it.p[2]).project(camera);
        const behind = v.z > 1;
        const x = ((v.x + 1) / 2) * w, y = ((1 - v.y) / 2) * h;
        const dw = it.d.offsetWidth;
        const off = it.side === 'l' ? -dw + 3.5 : -3.5;
        it.d.style.transform = `translate(${(x + off).toFixed(1)}px, ${(y - 9).toFixed(1)}px)`;
        it.d.style.opacity = behind || x < 0 || x > w || y < 0 || y > h ? '0' : '1';
      }
    },
    dispose() { box.remove(); },
  };
}
