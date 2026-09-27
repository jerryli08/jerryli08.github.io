// The software and hardware path from the downward camera to the motors, as the flight script and
// the CAD have it. A 2D figure (no WebGL): tap or hover a box to read what it does.
const NODES = {
  down: ['Downward camera', 'Pi Camera Module 3', 'Looks at the floor under the nose. The script reads it at 640 x 360.'],
  pic: ['Picamera2', 'one frame per loop', 'camera.capture_array() hands the script a 640 x 360 image each time round the loop.'],
  cv: ['OpenCV + NumPy', 'find the line', 'Dilate, erode, threshold, keep the longest blob, fit a line to it (the scrolly above goes through each step).'],
  pd: ['PD control', 'pixels to m/s and °/s', 'Pixel and angle errors in, forward, right and yaw-rate commands out, rotated from the camera frame to the drone and clamped.'],
  mav: ['MAVSDK-Python', 'gRPC to mavsdk_server', 'Our asyncio program sends one body-frame velocity and yaw-rate setpoint, then sleeps 0.5 s. mavsdk_server (the linux-arm64 build) runs on the Pi and speaks MAVLink.'],
  fc: ['Flight controller', 'Offboard mode', 'Holds whatever body velocity and yaw rate it is told, and keeps the drone stable. The Pi never drives the motors itself.'],
  motors: ['4 motors', '2216, 880 KV, 10 x 4.5 in props', 'From the CAD: the X500 frame\'s four motors, 500 mm apart on the diagonal.'],
  fwd: ['Forward camera', 'Pi Camera Module 3', 'For obstacle avoidance: the hoops on the course carry AprilTags.'],
  flow: ['ARK Flow', 'optical flow + distance', 'In the CAD under the nose, beside the downward camera: an optical flow camera and a distance sensor looking at the floor.'],
  rc: ['RC transmitter', 'manual takeover', 'Teammates stood by with transmitters during test flights, ready to take over by hand.'],
};
const WIDE = {
  vb: [1100, 330],
  box: { down: [10, 45, 125], pic: [170, 45, 125], cv: [318, 45, 135], pd: [476, 45, 125], mav: [624, 45, 140], fc: [890, 45, 200], motors: [890, 255, 200], fwd: [10, 215, 125], flow: [640, 185, 190], rc: [640, 255, 190] },
  pi: [155, 20, 624, 122],
  arrows: [['down', 'pic'], ['pic', 'cv'], ['cv', 'pd'], ['pd', 'mav'], ['mav', 'fc', 'MAVLink over UART', ['/dev/ttyAMA0', '57,600 baud']], ['fc', 'motors'], ['flow', 'fc'], ['rc', 'fc'], ['fwd', 'pi', 'obstacle avoidance: hoops with AprilTags', null, true]],
};
const NARROW = {
  vb: [360, 670],
  box: { down: [10, 10, 200], pic: [10, 110, 200], cv: [10, 185, 200], pd: [10, 260, 200], mav: [10, 335, 200], fc: [10, 485, 200], motors: [10, 600, 200], fwd: [228, 110, 124], flow: [228, 460, 124], rc: [228, 535, 124] },
  pi: [2, 88, 216, 330],
  arrows: [['down', 'pic'], ['pic', 'cv'], ['cv', 'pd'], ['pd', 'mav'], ['mav', 'fc', 'MAVLink over UART', null], ['fc', 'motors'], ['flow', 'fc'], ['rc', 'fc'], ['fwd', 'pi', null, null, true]],
};
const BH = 52;

export async function mount(el, ctx) {
  el.style.background = 'var(--bg-raise)';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:10px;';
  el.appendChild(wrap);
  const info = document.createElement('p');
  info.style.cssText = 'margin:0;min-height:3em;font-size:14px;line-height:1.5;color:var(--text-2);flex:1 1 100%;';
  info.setAttribute('aria-live', 'polite');
  ctx.panel.appendChild(info);
  const say = (k) => { const n = NODES[k]; info.innerHTML = ''; const b = document.createElement('b'); b.textContent = `${n[0]}: `; b.style.color = 'var(--text)'; info.append(b, n[2]); };
  say('pd');
  let layout = null;
  function draw() {
    const narrow = el.clientWidth < 700;
    const L = narrow ? NARROW : WIDE;
    const [vw, vh] = L.vb;
    // size the stage to the figure
    el.style.height = `${Math.round(Math.min(el.clientWidth - 20, narrow ? 460 : 1180) * (vh / vw) + 20)}px`;
    if (layout === L) return; layout = L;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Data path: downward camera, Picamera2, OpenCV and NumPy, PD control and MAVSDK on the Raspberry Pi 5, then MAVLink over UART to the flight controller in Offboard mode and the four motors; the forward camera, the ARK Flow sensor and the RC transmitter feed in from the side.');
    svg.style.cssText = `width:100%;height:100%;max-width:${narrow ? 460 : 1180}px;font-family:inherit;overflow:visible;`;
    const E = (tag, attrs, parent = svg) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); parent.appendChild(e); return e; };
    const defs = E('defs', {});
    const mk = E('marker', { id: 'adr-arrow', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    E('path', { d: 'M0 0L10 5L0 10z', fill: '#ff9a62' }, mk);
    const [px, py, pw, ph] = L.pi;
    E('rect', { x: px, y: py, width: pw, height: ph, rx: 14, fill: 'rgba(61,220,132,.05)', stroke: 'rgba(61,220,132,.55)', 'stroke-dasharray': '6 5' });
    const pl = E('text', { x: px + 12, y: py + ph - 9, fill: '#3ddc84', 'font-size': 13, 'font-weight': 650 });
    pl.textContent = narrow ? 'Raspberry Pi 5, Python 3' : 'Raspberry Pi 5: Python 3 with asyncio';
    const center = (k) => { const [x, y, w] = L.box[k]; return [x + w / 2, y + BH / 2]; };
    const edge = (k, toward) => {
      if (k === 'pi') { const [cx, cy] = [px + pw / 2, py + ph / 2]; const [tx, ty] = toward; const dx = tx - cx, dy = ty - cy; const s = Math.min(Math.abs((pw / 2) / (dx || 1e-6)), Math.abs((ph / 2) / (dy || 1e-6))); return [cx + dx * s, cy + dy * s]; }
      const [x, y, w] = L.box[k], [cx, cy] = [x + w / 2, y + BH / 2], [tx, ty] = toward;
      const dx = tx - cx, dy = ty - cy;
      const s = Math.min(Math.abs((w / 2) / (dx || 1e-6)), Math.abs((BH / 2) / (dy || 1e-6)));
      return [cx + dx * s, cy + dy * s];
    };
    const labels = [];
    for (const [a, b, l1, l2, dashed] of L.arrows) {
      const ca = a === 'pi' ? [px + pw / 2, py + ph / 2] : center(a), cb = b === 'pi' ? [px + pw / 2, py + ph / 2] : center(b);
      let [x1, y1] = edge(a, cb), [x2, y2] = edge(b, ca);
      if (b === 'pi' && !narrow) { x2 = x1 + 190; y2 = py + ph; [x1, y1] = edge(a, [x2, y2]); }
      E('line', { x1, y1, x2, y2, stroke: '#ff9a62', 'stroke-width': 2, 'marker-end': 'url(#adr-arrow)', ...(dashed ? { 'stroke-dasharray': '5 4' } : {}) });
      if (l1) labels.push([l1, l2, (x1 + x2) / 2, (y1 + y2) / 2, b === 'pi']);
    }
    for (const [k, [x, y, w]] of Object.entries(L.box)) {
      const g = E('g', { tabindex: 0, role: 'button', 'aria-label': `${NODES[k][0]}: ${NODES[k][2]}`, style: 'cursor:pointer;outline:none' });
      const r = E('rect', { x, y, width: w, height: BH, rx: 10, fill: '#1b1714', stroke: 'rgba(238,233,227,.22)' }, g);
      const t1 = E('text', { x: x + w / 2, y: y + 22, 'text-anchor': 'middle', fill: '#eee9e3', 'font-size': 14, 'font-weight': 650 }, g); t1.textContent = NODES[k][0];
      const t2 = E('text', { x: x + w / 2, y: y + 40, 'text-anchor': 'middle', fill: 'rgba(238,233,227,.62)', 'font-size': 11.5 }, g); t2.textContent = NODES[k][1];
      const on = () => { svg.querySelectorAll('rect[data-hot]').forEach((q) => { q.removeAttribute('data-hot'); q.setAttribute('stroke', 'rgba(238,233,227,.22)'); }); r.setAttribute('data-hot', ''); r.setAttribute('stroke', '#ff6b35'); say(k); };
      g.addEventListener('pointerenter', on); g.addEventListener('click', on); g.addEventListener('focus', on);
    }
    for (const [l1, l2, mx, my, side] of labels) {
      const x = narrow ? mx + 8 : side ? mx + 16 : mx, anchor = narrow || side ? 'start' : 'middle';
      const t = E('text', { x, y: narrow ? my + 4 : side ? my + 22 : my - 10, 'text-anchor': anchor, fill: 'rgba(238,233,227,.82)', 'font-size': 12 });
      t.textContent = l1;
      (l2 || []).forEach((line, i) => { const t2 = E('text', { x, y: my + 22 + i * 15, 'text-anchor': anchor, fill: 'rgba(238,233,227,.55)', 'font-size': 11 }); t2.textContent = line; });
    }
    wrap.replaceChildren(svg);
  }
  draw();
  const ro = new ResizeObserver(() => draw());
  ro.observe(el);
  return { dispose() { ro.disconnect(); wrap.remove(); info.remove(); } };
}
