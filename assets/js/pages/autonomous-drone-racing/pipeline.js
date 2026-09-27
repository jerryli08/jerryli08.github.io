// Scrolly: one downward-camera frame through every step of the flight script's line detection and
// control, computed live with the same code as the simulation (line-core.js). The frame is drawn for
// this page (a curve of LED bulbs and a round reflection), not a recorded picture.
import { SCRIPT, SIM, buildCourse, makeCamera, renderDown, detect, makeWorkspace, control, toFloor } from './line-core.js';

const { W, H } = SCRIPT;
const POSE = { x: 0, z: 0, h: 0, alt: SIM.ALT };
// the rope's path in image pixels, then around outside the picture to close the loop
const PATH = [[190, -60], [212, 60], [262, 170], [345, 250], [470, 302], [640, 326], [800, 336], [1300, 360], [1500, -300], [1000, -900], [300, -900], [150, -350]];
const GLARE = [520, 100], GLARE_R = 0.115; // a wide reflection, larger in area than the rope in view

function slide(src, dst, k, anchor, max, rows) {
  // running max (dilate) or min (erode) with a k-wide window starting `anchor` before each pixel;
  // pixels outside the image are ignored, like OpenCV's default border for these operations
  const n = rows ? W : H, lines = rows ? H : W;
  const q = new Int32Array(n);
  for (let l = 0; l < lines; l++) {
    const at = (i) => (rows ? l * W + i : i * W + l);
    let head = 0, tail = 0, next = 0;
    for (let i = 0; i < n; i++) {
      const lo = i - anchor, hi = Math.min(n - 1, i - anchor + k - 1);
      while (next <= hi) {
        const v = src[at(next)];
        while (tail > head && (max ? src[at(q[tail - 1])] <= v : src[at(q[tail - 1])] >= v)) tail--;
        q[tail++] = next++;
      }
      while (q[head] < lo) head++;
      dst[at(i)] = src[at(q[head])];
    }
  }
}
function morph(src, k, max) {
  const a = new Uint8Array(W * H), b = new Uint8Array(W * H), anchor = k >> 1;
  slide(src, a, k, anchor, max, true);
  slide(a, b, k, anchor, max, false);
  return b;
}

export async function mount(el, ctx) {
  // ---------------------------------------------------------------- compute every stage once
  const ctrl = PATH.map(([u, v]) => { const f = toFloor(POSE, u, v); return [f.x, f.z]; });
  const course = buildCourse(ctrl);
  const gf = toFloor(POSE, GLARE[0], GLARE[1]);
  const cam = makeCamera(3);
  const raw = renderDown(cam, course, POSE, { x: gf.x, z: gf.z, r: GLARE_R }).slice();
  const dil = morph(raw, SCRIPT.KDIL, true);
  const ero = morph(dil, SCRIPT.KERO, false);
  const ws = makeWorkspace();
  const vis = detect(raw, ws);
  const lab = ws.label.slice();
  const prev = { ex: 0, ey: 0, ang: 0 };
  let u = vis.found ? control(vis, prev) : null;
  if (u) u = control(vis, prev); // second call: previous errors equal, so the D terms are zero
  const keepId = vis.found ? vis.comps[vis.keep].id : -1;

  const layers = [];
  const toCanvas = (fill) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'), im = g.createImageData(W, H), d = im.data;
    for (let i = 0, j = 0; i < W * H; i++, j += 4) { const [r, gg, b] = fill(i); d[j] = r; d[j + 1] = gg; d[j + 2] = b; d[j + 3] = 255; }
    g.putImageData(im, 0, 0);
    return c;
  };
  const grey = (a) => (i) => [a[i], a[i], a[i]];
  layers.push(toCanvas(grey(raw)), toCanvas(grey(dil)), toCanvas(grey(ero)));
  const maskImg = toCanvas((i) => (ero[i] >= SCRIPT.LOW ? [255, 255, 255] : [6, 6, 6]));
  const blobs = toCanvas((i) => (lab[i] === 0 ? [6, 6, 6] : lab[i] === keepId ? [255, 255, 255] : [105, 105, 110]));
  const fitBase = toCanvas((i) => (lab[i] === 0 ? [raw[i] * 0.3, raw[i] * 0.3, raw[i] * 0.3] : lab[i] === keepId ? [235, 235, 235] : [90, 90, 95]));
  layers.push(maskImg, blobs, fitBase, fitBase, fitBase);

  // ---------------------------------------------------------------- drawing
  const canvas = document.createElement('canvas');
  canvas.className = 'rx-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A downward camera frame going through each step of the line detection');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  el.appendChild(canvas);
  const g = canvas.getContext('2d');
  let box = { x: 0, y: 0, w: 1, h: 1, s: 1 }, dpr = 1;
  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = el.clientWidth, h = el.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    const portrait = h > w;
    // clear of the step cards: they cover the left side (wide) or the bottom (phone)
    const area = portrait ? { x: 12, y: 16, w: w - 24, h: h * 0.5 } : { x: w * 0.4, y: 24, w: w * 0.6 - 32, h: h - 48 };
    const s = Math.min(area.w / W, area.h / (H + 60));
    box = { s, w: W * s, h: H * s, x: area.x + (area.w - W * s) / 2, y: area.y + (area.h - (H + 60) * s) / 2 + 34 * s };
  }
  const TITLES = ['1. The raw frame', '2. cv2.dilate, 30 x 30', '3. cv2.erode, 20 x 20', '4. cv2.inRange, 250 to 255', '5. Keep the longest blob',
    '6. cv2.fitLine', '7. Look 100 px ahead', '8. Velocity and yaw commands'];
  function overlay(step, a) {
    if (a <= 0) return;
    g.save(); g.globalAlpha = a;
    g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip(); // keep every mark inside the picture
    const X = (x) => box.x + x * box.s, Y = (y) => box.y + y * box.s;
    g.lineWidth = 2; g.font = `600 ${Math.max(11, 13 * box.s * 1.3)}px 'Mona Sans', system-ui, sans-serif`;
    if (step === 4) {
      for (const c of vis.comps) {
        const keep = c.id === keepId;
        g.strokeStyle = keep ? '#7cc4ff' : '#ffb454'; g.setLineDash([6, 5]);
        g.beginPath(); c.rect.corners.forEach((p, i) => (i ? g.lineTo(X(p[0]), Y(p[1])) : g.moveTo(X(p[0]), Y(p[1])))); g.closePath(); g.stroke();
        g.setLineDash([]);
        g.fillStyle = keep ? '#7cc4ff' : '#ffb454';
        const label = `${keep ? 'kept' : 'ignored'}: long side ${Math.round(c.long)} px`, tw = g.measureText(label).width;
        // kept: bottom left of the picture; ignored: just under its blob, inside the picture
        const bw = Math.max(...c.rect.corners.map((q) => q[1]));
        const tx = keep ? X(14) : Math.min(X(W) - tw - 10, Math.max(X(10), X(c.rect.cx) - tw / 2));
        const ty = keep ? Y(H - 18) : Math.min(Y(H - 18), Y(bw) + 22);
        g.fillText(label, tx, ty);
      }
    }
    if (step >= 5 && u) {
      g.strokeStyle = '#3ddc84'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(X(vis.x - u.dx * 700), Y(vis.y - u.dy * 700)); g.lineTo(X(vis.x + u.dx * 700), Y(vis.y + u.dy * 700)); g.stroke();
      g.fillStyle = '#3ddc84'; g.beginPath(); g.arc(X(vis.x), Y(vis.y), 5, 0, 7); g.fill();
    }
    if (step >= 6 && u) {
      g.strokeStyle = '#fff'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(X(W / 2 - 12), Y(H / 2)); g.lineTo(X(W / 2 + 12), Y(H / 2)); g.moveTo(X(W / 2), Y(H / 2 - 12)); g.lineTo(X(W / 2), Y(H / 2 + 12)); g.stroke();
      g.strokeStyle = '#ff6b35'; g.setLineDash([7, 5]); g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(X(W / 2), Y(H / 2)); g.lineTo(X(u.tx), Y(u.ty)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#ff6b35'; g.beginPath(); g.arc(X(u.tx), Y(u.ty), 7, 0, 7); g.fill();
      // the angle between the line and the image's "forward" axis (straight down the picture)
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(X(vis.x), Y(vis.y)); g.lineTo(X(vis.x), Y(vis.y + 120)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fff';
      g.fillText(`error x ${u.ex.toFixed(0)} px, y ${u.ey.toFixed(0)} px`, X(12), Y(H - 40));
      g.fillText(`angle ${u.ang.toFixed(1)}°`, X(12), Y(H - 16));
    }
    if (step === 7 && u) {
      const rows = [['forward', `0.001 x ${u.ey.toFixed(0)}`, `${u.fwd.toFixed(3)} m/s`], ['right', `-0.001 x ${u.ex.toFixed(0)}`, `${u.right.toFixed(3)} m/s`], ['yaw rate', `0.2 x ${u.ang.toFixed(1)}`, `${u.yaw.toFixed(1)} °/s`]];
      const bw = 330 * box.s * 1.1, bh = 108 * box.s * 1.1, bx = X(W) - bw - 10, by = Y(12);
      g.fillStyle = 'rgba(12,10,9,.86)'; g.fillRect(bx, by, bw, bh);
      g.strokeStyle = 'rgba(255,255,255,.2)'; g.strokeRect(bx, by, bw, bh);
      g.fillStyle = '#fff';
      rows.forEach((r, i) => {
        const yy = by + (24 + i * 28) * box.s * 1.1;
        g.fillStyle = 'rgba(238,233,227,.7)'; g.fillText(r[0], bx + 12, yy);
        g.fillText(r[1], bx + bw * 0.34, yy);
        g.fillStyle = '#ff9a62'; g.fillText(r[2], bx + bw * 0.72, yy);
      });
    }
    g.restore();
  }
  function frameLabels(step) {
    g.save();
    g.fillStyle = 'rgba(238,233,227,.92)'; g.font = `650 ${Math.max(13, 15 * Math.min(1.4, box.s * 1.4))}px 'Mona Sans', system-ui, sans-serif`;
    g.fillText(TITLES[step], box.x, box.y - 12);
    g.fillStyle = 'rgba(238,233,227,.6)'; g.font = `550 ${Math.max(11, 12 * Math.min(1.3, box.s * 1.3))}px 'Mona Sans', system-ui, sans-serif`;
    g.textAlign = 'right'; g.fillText('640 x 360, nose at the bottom', box.x + box.w, box.y - 12);
    g.restore();
  }
  let last = [0, 0];
  function setProgress(p, step = 0, stepP = 0) {
    last = [step, stepP];
    step = Math.max(0, Math.min(layers.length - 1, step));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(layers[step], box.x, box.y, box.w, box.h);
    const nextA = step < layers.length - 1 ? Math.max(0, (stepP - 0.8) / 0.2) : 0;
    if (nextA > 0 && layers[step + 1] !== layers[step]) { g.globalAlpha = nextA; g.drawImage(layers[step + 1], box.x, box.y, box.w, box.h); g.globalAlpha = 1; }
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.strokeRect(box.x - 0.5, box.y - 0.5, box.w + 1, box.h + 1);
    overlay(step, 1 - nextA);
    if (nextA > 0) overlay(step + 1, nextA);
    frameLabels(step);
  }
  layout();
  setProgress(0, 0, 0);
  const ro = new ResizeObserver(() => { layout(); setProgress(0, last[0], last[1]); });
  ro.observe(el);
  return { setProgress, dispose() { ro.disconnect(); canvas.remove(); } };
}
