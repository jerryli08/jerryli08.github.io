// The race drone from Jerry's CAD, with the autonomy hardware picked out by its CAD part names,
// the two cameras' views drawn from their real sensor positions, and the props turning about their
// motor shafts (axes from the STEP, see drone-common.js).
//
// Camera views: a 66 x 41 degree pyramid (Camera Module 3 standard lens) from each IMX708 sensor.
// The downward one reaches a floor 1.0 m below the sensor (the script's TAKEOFF_ALTITUDE); its image
// is turned so that the bottom of the picture is the nose and the right of the picture is the
// drone's left (the script's camera-to-body rotation), so its wide side runs across the drone.
import * as THREE from 'three';
import { createStage } from '/assets/js/lib/stage.js';
import { segmented } from '/assets/js/lib/ui.js';
import { loadDrone, GROUPS, DOWN_SENSOR, FWD_SENSOR, css } from './drone-common.js';

const CSS = `
.adr-labels { position: absolute; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; }
.adr-labels svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.adr-label { position: absolute; left: 0; top: 0; max-width: 42%; padding: 3px 9px; border-radius: 999px; font-size: 12px; line-height: 1.3; font-weight: 620;
  color: var(--text); background: rgba(12, 10, 9, .82); border: 1px solid rgba(255, 255, 255, .14); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: opacity .2s; }
.adr-label.dim { opacity: .35; }
@media (max-width: 520px) { .adr-label { font-size: 11px; padding: 2px 7px; } }
`;
const HFOV = 66, VFOV = 41, FLOOR = 1.0;
const COLORS = { cameras: '#3aa0ff', compute: '#3ddc84', sensing: '#b18cff', power: '#ffb454', printed: '#ff6b35' };

export async function mount(el, ctx) {
  css('adr-cad-css', CSS);
  const stage = createStage(el, { hint: ctx.isTouch ? 'Swipe sideways to turn' : 'Drag to turn it', exposure: 1.25, envIntensity: 1.25 });
  const D = await loadDrone(stage);
  const { model } = D;
  const view = { azimuth: -32, elevation: 26, pad: 0.98 };
  stage.frame(D.wrap, view);

  // ---------------------------------------------------------------- camera views (annotations)
  const wp = (p) => model.localToWorld(new THREE.Vector3(...p));
  model.updateWorldMatrix(true, true);
  const views = new THREE.Group(); views.name = 'camera-views'; views.visible = false;
  stage.scene.add(views);
  const tanH = Math.tan((HFOV / 2) * Math.PI / 180), tanV = Math.tan((VFOV / 2) * Math.PI / 180);
  function pyramid(apex, corners, color) {
    const pos = [apex.x, apex.y, apex.z]; corners.forEach((c) => pos.push(c.x, c.y, c.z));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    const face = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
    const ep = []; corners.forEach((c, i) => { const d = corners[(i + 1) % 4]; ep.push(apex.x, apex.y, apex.z, c.x, c.y, c.z, c.x, c.y, c.z, d.x, d.y, d.z); });
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.Float32BufferAttribute(ep, 3));
    const edges = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.75, toneMapped: false }));
    views.add(face, edges);
  }
  // forward camera: along -X, 1.2 m drawn
  const fa = wp(FWD_SENSOR), L = 1.2;
  pyramid(fa, [[-1, -1], [-1, 1], [1, 1], [1, -1]].map(([h, v]) => fa.clone().add(new THREE.Vector3(-L, v * tanV * L, h * tanH * L))), COLORS.cameras);
  // downward camera: along -Y to the floor; image x (wide side) across the drone (model Z)
  const da = wp(DOWN_SENSOR);
  const dc = [[-1, -1], [-1, 1], [1, 1], [1, -1]].map(([h, v]) => da.clone().add(new THREE.Vector3(v * tanV * FLOOR, -FLOOR, h * tanH * FLOOR)));
  pyramid(da, dc, '#9ad0ff');
  const fp = new THREE.Mesh(new THREE.PlaneGeometry(2 * tanV * FLOOR, 2 * tanH * FLOOR).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#9ad0ff', transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }));
  fp.position.set(da.x, da.y - FLOOR + 0.001, da.z); views.add(fp);
  // an arrow on the floor toward the nose: the bottom edge of the downward picture
  const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 3).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff6b35', toneMapped: false }));
  arrow.position.set(da.x - tanV * FLOOR + 0.1, da.y - FLOOR + 0.01, da.z); views.add(arrow);

  // ---------------------------------------------------------------- labels
  const layer = document.createElement('div'); layer.className = 'adr-labels'; el.appendChild(layer);
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg'); layer.appendChild(svg);
  const centerOf = (re) => { const b = new THREE.Box3(); for (const p of D.part(re)) b.expandByObject(p); return b.isEmpty() ? null : b.getCenter(new THREE.Vector3()); };
  const LABELS = [
    { text: 'Forward camera', re: GROUPS.fwdCam, g: 'cameras' },
    { text: 'Downward camera', re: GROUPS.downCam, g: 'cameras' },
    { text: 'ARK Flow: optical flow + distance', re: GROUPS.ark, g: 'sensing' },
    { text: 'Raspberry Pi 5', re: GROUPS.pi, g: 'compute' },
    { text: 'Printed cover', re: /raspi_top_cover/, g: 'printed' },
    { text: '4S LiPo', re: GROUPS.battery, g: 'power' },
    { text: 'Power module', re: /PCBA_PM06/, g: 'power' },
    { text: 'Printed landing gear mount', re: /new_landing_gear_mount_1/, g: 'printed' },
  ].map((l) => {
    const pos = centerOf(l.re); if (!pos) return null;
    const d = document.createElement('div'); d.className = 'adr-label'; d.textContent = l.text; layer.appendChild(d);
    const line = document.createElementNS(svgNS, 'polyline');
    line.setAttribute('fill', 'none'); line.setAttribute('stroke', 'rgba(255,154,98,.8)'); line.setAttribute('stroke-width', '1.2');
    const dot = document.createElementNS(svgNS, 'circle'); dot.setAttribute('r', '3'); dot.setAttribute('fill', '#ff6b35');
    svg.append(line, dot);
    return { ...l, pos, el: d, line, dot };
  }).filter(Boolean);
  const v = new THREE.Vector3();
  let labelsOn = el.clientWidth > 520, focus = 'none';
  function updateLabels() {
    const w = el.clientWidth, h = el.clientHeight;
    layer.style.display = labelsOn ? '' : 'none';
    if (!labelsOn) return;
    stage.camera.updateMatrixWorld();
    // anchor points on screen; labels stacked in two columns at the sides, leader lines to the parts
    const pts = LABELS.map((l) => { v.copy(l.pos).project(stage.camera); return { l, x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, ok: v.z < 1 }; });
    const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    for (const side of [-1, 1]) {
      const col = pts.filter((p) => (side < 0 ? p.x < cx : p.x >= cx)).sort((a, b) => a.y - b.y);
      const gap = 30, top = 16, bottom = h - 16;
      let y = top;
      const ys = col.map((p) => { y = Math.max(y, p.y - 11); const yy = y; y += gap; return yy; });
      // pull the stack up if it runs off the bottom
      const over = ys.length ? ys[ys.length - 1] + 22 - bottom : 0;
      for (let i = ys.length - 1, lim = bottom - 22; i >= 0 && over > 0; i--) { ys[i] = Math.min(ys[i], lim); lim = ys[i] - gap; }
      col.forEach((p, i) => {
        const { l } = p;
        const lw = Math.min(l.el.offsetWidth || 120, w * 0.42);
        const lx = side < 0 ? 12 : w - 12 - lw, ly = Math.max(top, ys[i]);
        l.el.style.transform = `translate(${lx.toFixed(1)}px, ${ly.toFixed(1)}px)`;
        const ex = side < 0 ? lx + lw : lx, ey = ly + 11;
        l.line.setAttribute('points', `${ex.toFixed(1)},${ey.toFixed(1)} ${(ex + side * -14).toFixed(1)},${ey.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`);
        l.dot.setAttribute('cx', p.x.toFixed(1)); l.dot.setAttribute('cy', p.y.toFixed(1));
        const dim = focus !== 'none' && l.g !== focus;
        l.el.classList.toggle('dim', dim);
        const vis = p.ok ? '1' : '0';
        l.el.style.opacity = vis === '0' ? '0' : ''; l.line.style.opacity = dim ? '.25' : vis; l.dot.style.opacity = dim ? '.25' : vis;
      });
    }
  }
  stage.controls?.addEventListener('change', updateLabels);

  // ---------------------------------------------------------------- highlight, views, props
  let clear = null;
  const sets = {
    cameras: [GROUPS.cameras], compute: [GROUPS.compute], sensing: [GROUPS.sensing], power: [GROUPS.power], printed: [GROUPS.printed],
  };
  function setFocus(k) {
    focus = k;
    clear?.(); clear = null;
    if (k !== 'none') clear = stage.highlight(sets[k].flatMap((re) => D.part(re)), COLORS[k], { intensity: 0.55 });
    updateLabels();
  }
  segmented(ctx.panel, {
    label: 'Show', value: 'none', onChange: setFocus,
    options: [{ value: 'none', label: 'All' }, { value: 'cameras', label: 'Cameras' }, { value: 'compute', label: 'Pi 5' }, { value: 'sensing', label: 'Flow sensor' }, { value: 'power', label: 'Power' }, { value: 'printed', label: 'Printed parts' }],
  });
  segmented(ctx.panel, {
    label: 'Camera views', value: false,
    options: [{ value: false, label: 'Off' }, { value: true, label: 'On' }],
    onChange: (on) => {
      views.visible = on;
      stage.frame(on ? [D.wrap, views] : D.wrap, { ...view, dir: stage.camera.position.clone().sub(stage.controls.target), duration: 0.8, pad: on ? 1.02 : view.pad });
      setTimeout(updateLabels, 850);
      stage.invalidate();
    },
  });
  let stopSpin = null;
  if (!ctx.reducedMotion) segmented(ctx.panel, {
    label: 'Props', value: false,
    options: [{ value: false, label: 'Still' }, { value: true, label: 'Spin' }],
    onChange: (on) => {
      if (on && !stopSpin) stopSpin = stage.onFrame((dt) => D.spin(dt));
      else if (!on && stopSpin) { stopSpin(); stopSpin = null; }
    },
  });
  segmented(ctx.panel, {
    label: 'Labels', value: labelsOn,
    options: [{ value: true, label: 'On' }, { value: false, label: 'Off' }],
    onChange: (on) => { labelsOn = on; updateLabels(); },
  });
  const ro = new ResizeObserver(() => requestAnimationFrame(updateLabels));
  ro.observe(el);
  requestAnimationFrame(updateLabels);

  return {
    dispose() { stopSpin?.(); ro.disconnect(); layer.remove(); stage.dispose(); },
  };
}
