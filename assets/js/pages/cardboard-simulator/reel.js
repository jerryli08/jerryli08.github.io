// A scroll-driven slideshow of the real media, for a project with no CAD (Jerry, Sept 26: projects
// without CAD are scroll-based too, and scrolling advances a slideshow of the photos and clips).
// Each scroll step shows one or more shots. A photo drifts in slowly with the scroll; a clip is
// scrubbed by the scroll (its frame is set from the scroll position, it never plays), with its
// real stills underneath until the video can show a frame. Nothing moves on its own, nothing is
// clickable, and every picture is a pure function of (step, progress through the step).
// A shot may be cropped (`crop`, fractions of the source frame) to keep people's faces out.
//
// data.steps[i] (the step's `view`): { short, shots: [shot] }
// shot: { i: 'photo.webp' } or { v: 'clip.mp4', from, to, stills: [{ i, at }] }, plus
//       size: [w, h] of the source in pixels, crop?: [x, y, w, h], zoom?: [from, to],
//       focus?: [fx, fy] (zoom centre, fractions of the cropped frame), c: 'caption', until?: 0..1
const CSS = `
.reel { position: absolute; inset: 0; --l: 0px; color: var(--text); background: #0c0a09; overflow: hidden; }
.reel *, .reel *::before, .reel *::after { box-sizing: border-box; }
.reel-rail { position: absolute; left: calc(var(--l) + 18px); right: 18px; top: 16px; z-index: 3; display: grid; margin: 0; padding: 0; list-style: none; }
.reel-rail::before { content: ''; position: absolute; left: calc(50% / var(--n)); right: calc(50% / var(--n)); top: 14px; height: 2px; background: var(--line-strong); }
.reel-rail li { position: relative; display: grid; justify-items: center; min-width: 0; }
.reel-dot { position: relative; z-index: 1; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--bg); border: 2px solid var(--line-strong); color: var(--text-2); font-size: 13px; font-weight: 700; }
.reel-rail li.done .reel-dot { border-color: rgba(255, 107, 53, 0.6); }
.reel-rail li.on .reel-dot { background: var(--accent); border-color: var(--accent); color: #140c07; }
.reel-rail small { margin-top: 5px; max-width: 100%; font-size: 12px; line-height: 1.2; color: var(--muted); text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.reel-rail li.on small { color: var(--text); font-weight: 600; }
.reel-box { position: absolute; left: calc(var(--l) + 16px); right: 16px; top: 78px; bottom: 64px; }
.reel-shot { position: absolute; overflow: hidden; border-radius: 12px; background: #0c0a09; opacity: 0; will-change: opacity; }
.reel-zoom { position: absolute; inset: 0; transform-origin: 50% 50%; }
.reel-src { position: absolute; }
.reel-src > img, .reel-src > video { position: absolute; inset: 0; width: 100%; height: 100%; display: block; object-fit: fill; }
.reel-src > video { opacity: 0; }
.reel-src > video.live { opacity: 1; }
.reel-cap { position: absolute; left: calc(var(--l) + 18px); right: 18px; bottom: 14px; z-index: 3; display: flex; justify-content: center; }
.reel-chip { display: block; max-width: 100%; margin: 0; padding: 7px 13px 8px; border-radius: 12px; background: rgba(10, 8, 7, 0.78); border: 1px solid rgba(255, 255, 255, 0.14); font-size: 14px; line-height: 1.35; color: var(--text-2); text-align: center; }
.reel-chip b { color: var(--text); font-weight: 650; }
@media (max-width: 900px) {
  .reel-rail { top: 8px; left: 10px; right: 10px; }
  .reel-rail::before { top: 12px; }
  .reel-dot { width: 26px; height: 26px; font-size: 12px; }
  .reel-rail small { font-size: 10.5px; margin-top: 3px; }
  .reel-box { left: 6px; right: 6px; top: 62px; bottom: 50px; }
  .reel-cap { left: 8px; right: 8px; bottom: 8px; }
  .reel-chip { font-size: 12px; padding: 5px 10px 6px; }
}
@media (max-width: 480px) { .reel-rail small { display: none; } .reel-box { top: 44px; } }
`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const BLEND = 0.15; // a new step fades in over the first 15 % of it
const INNER = 0.06; // shots inside a step hand over in a short fade

function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
// **bold** only; everything else is text
function rich(el, text) {
  el.replaceChildren();
  String(text || '').split(/(\*\*[^*]+\*\*)/).forEach((part) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) el.appendChild(h('b', null, part.slice(2, -2)));
    else if (part) el.appendChild(document.createTextNode(part));
  });
}

export function mount(el, ctx) {
  if (!document.getElementById('reel-css')) {
    const s = document.createElement('style'); s.id = 'reel-css'; s.textContent = CSS; document.head.appendChild(s);
  }
  const V = (ctx.data.steps || []).map((v) => ({ short: v.short || '', shots: v.shots || [] }));
  const reduced = ctx.reducedMotion;
  const url = (n, small) => {
    let f = n;
    if (small && /\.webp$/.test(f) && !/-s\.webp$/.test(f)) f = f.replace(/\.webp$/, '-s.webp');
    return ctx.asset(f.startsWith('/') ? f : `/assets/media/${ctx.slug}/${f}`);
  };

  const root = h('div', 'reel');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', ctx.data.aria || 'Photos and clips of the project, advanced by the scroll');
  const box = h('div', 'reel-box');
  const rail = h('ol', 'reel-rail');
  rail.style.gridTemplateColumns = `repeat(${Math.max(1, V.length)}, minmax(0, 1fr))`;
  rail.style.setProperty('--n', String(Math.max(1, V.length)));
  const marks = V.map((v, i) => {
    const li = h('li');
    li.append(h('span', 'reel-dot', String(i + 1)), h('small', null, v.short));
    rail.append(li);
    return li;
  });
  const capWrap = h('div', 'reel-cap');
  const cap = h('p', 'reel-chip');
  capWrap.append(cap);
  root.append(box, rail, capWrap);
  el.appendChild(root);

  // every shot in scroll order, with where it starts and ends inside its step
  const flat = [];
  V.forEach((v, s) => {
    const n = v.shots.length;
    let from = 0;
    v.shots.forEach((sh, k) => {
      const until = k === n - 1 ? 1 : (sh.until ?? (k + 1) / n);
      flat.push({ s, k, sh, from, until, el: null, zoomEl: null, video: null, stills: null, seek: null, shownStill: -1 });
      from = until;
    });
  });
  const firstOf = []; flat.forEach((f, i) => { if (firstOf[f.s] == null) firstOf[f.s] = i; });

  let small = el.clientWidth < 700;
  let boxW = 1, boxH = 1;

  function place(f) {
    const [sw, sh] = f.sh.size || [16, 9];
    const [cx, cy, cw, ch] = f.sh.crop || [0, 0, 1, 1];
    const a = (cw * sw) / (ch * sh);
    let w = boxW, hh = boxW / a;
    if (hh > boxH) { hh = boxH; w = boxH * a; }
    const st = f.el.style;
    st.width = `${w}px`; st.height = `${hh}px`; st.left = `${(boxW - w) / 2}px`; st.top = `${(boxH - hh) / 2}px`;
    const fw = w / cw, fh = hh / ch;
    const src = f.el.querySelector('.reel-src').style;
    src.width = `${fw}px`; src.height = `${fh}px`; src.left = `${-cx * fw}px`; src.top = `${-cy * fh}px`;
    const [fx, fy] = f.sh.focus || [0.5, 0.5];
    f.zoomEl.style.transformOrigin = `${fx * 100}% ${fy * 100}%`;
  }

  // A clip is scrubbed: the frame follows the scroll, one seek at a time (the last wanted time is
  // applied when the current seek lands). It never plays. Until it can show a frame, its stills
  // (cut from the same clip) stand in, picked by time.
  function scrubber(video, onFrame) {
    let busy = false, want = null;
    const go = (t) => { busy = true; want = null; try { video.currentTime = t; } catch { busy = false; } };
    video.addEventListener('seeked', () => { busy = false; onFrame(); if (want != null) go(want); });
    video.addEventListener('loadedmetadata', () => { if (want != null && !busy) go(want); });
    return (t) => {
      if (video.readyState < 1 || busy) { want = t; return; }
      if (Math.abs(video.currentTime - t) < 1 / 60) return;
      go(t);
    };
  }

  function build(f) {
    if (f.el) return;
    const sh = f.sh;
    f.el = h('div', 'reel-shot');
    f.zoomEl = h('div', 'reel-zoom');
    const src = h('div', 'reel-src');
    const alt = sh.alt || String(sh.c || '').replace(/\*\*/g, '');
    if (sh.v) {
      const stills = sh.stills?.length ? sh.stills : [{ i: sh.v.replace(/\.mp4$/, '.jpg'), at: sh.from || 0 }];
      f.stills = stills.map((s, j) => {
        const im = h('img'); im.alt = j === 0 ? alt : ''; im.decoding = 'async'; im.src = url(s.i, small);
        im.style.opacity = j === 0 ? '1' : '0';
        src.append(im);
        return { im, at: s.at ?? 0 };
      });
      f.shownStill = 0;
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('disablepictureinpicture', '');
      v.setAttribute('aria-hidden', 'true'); v.tabIndex = -1;
      v.src = url(sh.v);
      src.append(v);
      f.video = v;
      // shown only once it can really seek (a server without byte ranges leaves it stuck on frame 0,
      // and then the stills are the better picture)
      const seekable = () => v.seekable.length > 0 && v.seekable.end(v.seekable.length - 1) > 0.5;
      f.seek = scrubber(v, () => { if (v.readyState >= 2 && seekable()) v.classList.add('live'); });
    } else {
      const im = h('img'); im.alt = alt; im.decoding = 'async'; im.src = url(sh.i, small && !sh.full);
      src.append(im);
    }
    f.zoomEl.append(src);
    f.el.append(f.zoomEl);
    box.append(f.el);
    place(f);
  }

  function layout() {
    let l = 0;
    if (ctx.shift()[0] > 0) { // full-width desktop scrolly: keep the pictures right of the step cards
      const card = el.closest('.rx-scrolly')?.querySelector('.rx-step-card');
      if (card) {
        const r = card.getBoundingClientRect(), e = el.getBoundingClientRect();
        l = clamp(r.right - e.left + 24, 0, e.width * 0.55);
      }
    }
    root.style.setProperty('--l', `${Math.round(l)}px`);
    boxW = Math.max(1, box.clientWidth); boxH = Math.max(1, box.clientHeight);
    small = el.clientWidth < 700;
    for (const f of flat) if (f.el) place(f);
  }

  // one shot's picture at progress u (0..1 through the shot)
  function pose(f, u) {
    const sh = f.sh;
    const [z0, z1] = sh.zoom || [1, 1];
    const z = z0 + (z1 - z0) * u;
    const t = `scale(${z.toFixed(4)})`;
    if (f.zoomEl.style.transform !== t) f.zoomEl.style.transform = t;
    if (f.video) {
      const time = (sh.from || 0) + ((sh.to ?? sh.from ?? 0) - (sh.from || 0)) * u;
      let j = 0;
      f.stills.forEach((s, i) => { if (s.at <= time + 1e-3) j = i; });
      if (j !== f.shownStill) { f.stills[f.shownStill].im.style.opacity = '0'; f.stills[j].im.style.opacity = '1'; f.shownStill = j; }
      f.seek(time);
    }
  }

  // only styles that change are written
  const shown = new Map();
  function setOpacity(f, o, z) {
    const key = `${o.toFixed(3)}|${z}`;
    if (shown.get(f) === key) return;
    shown.set(f, key);
    f.el.style.opacity = o.toFixed(3);
    f.el.style.zIndex = String(z);
  }

  let shownStep = -1, shownCap = -1;
  function setProgress(p, step, stepP) {
    if (!flat.length) return;
    const s = clamp(step | 0, 0, V.length - 1);
    const q = clamp(stepP, 0, 1);
    // the current shot, and progress through it
    let ci = firstOf[s];
    while (ci + 1 < flat.length && flat[ci + 1].s === s && q >= flat[ci + 1].from) ci++;
    const cur = flat[ci];
    const u = reduced ? 0.5 : clamp((q - cur.from) / Math.max(1e-6, cur.until - cur.from), 0, 1);
    // the shot before fades out under it: over the first part of a step, or a short handover inside one
    let prev = null, k = 1;
    if (!reduced && ci > 0) {
      if (cur.k === 0 && s > 0) k = smooth(0, BLEND, q);
      else if (cur.k > 0) k = smooth(cur.from, cur.from + INNER, q);
      if (k < 1) prev = flat[ci - 1];
    }
    // build what is on screen and the shots just around it, so scrolling on finds them loaded
    for (let i = Math.max(0, ci - 2); i <= Math.min(flat.length - 1, ci + 3); i++) build(flat[i]);
    for (const f of flat) {
      if (!f.el) continue;
      if (f === cur) setOpacity(f, prev ? k : 1, 2);
      else if (f === prev) setOpacity(f, 1, 1);
      else setOpacity(f, 0, 0);
    }
    if (prev) pose(prev, 1);
    pose(cur, u);
    if (s !== shownStep) {
      shownStep = s;
      marks.forEach((li, i) => { li.classList.toggle('on', i === s); li.classList.toggle('done', i < s); });
    }
    // the caption follows the picture that is mostly on screen
    const capShot = prev && k < 0.5 ? prev : cur;
    const capI = flat.indexOf(capShot);
    if (capI !== shownCap) { shownCap = capI; rich(cap, capShot.sh.c); capWrap.hidden = !capShot.sh.c; }
  }

  const ro = new ResizeObserver(layout);
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() {
      ro.disconnect();
      for (const f of flat) if (f.video) { f.video.removeAttribute('src'); try { f.video.load(); } catch {} }
      root.remove();
    },
  };
}
