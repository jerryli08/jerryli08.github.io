// One scoring cycle of the real robot, stepped through stills from our own clips by the scroll.
// There is no CAD of this robot, so this is footage, not a model: every frame is a still cut from a
// clip that plays elsewhere on the page (hero-floor-to-deposit, color-sensor-telemetry,
// transfer-fixed-two-pixels, hero-auto-backdrop), at the clip time shown on the frame.
// Beside it, the values our code uses for that stage of the cycle (github.com/CMP-18996/STATIC-CENTERSTAGE).
// setProgress is a pure function of (step, stepP): scrolling back plays it backwards.
import { clamp, smooth, css, h, setter, esc, lerp } from './kit.js';

const CSS = `
.fc-cy { position: absolute; inset: 0; overflow: hidden; }
.fc-cy-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; }
.fc-cy-f { position: absolute; left: 0; top: 0; border-radius: 12px; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.08); opacity: 0; background: #151210; }
.fc-cy-src { position: absolute; z-index: 3; padding: 5px 10px; border-radius: 999px; background: rgba(10,8,7,0.78); border: 1px solid rgba(255,255,255,0.12); font-size: 12px; font-weight: 600; color: var(--text-2); white-space: nowrap; }
.fc-cy-src b { color: var(--text); font-weight: 650; }
.fc-cy-panel { position: absolute; z-index: 3; top: 50%; transform: translateY(-50%); width: 300px; padding: 16px 18px 14px; border-radius: 16px; background: rgba(10,8,7,0.82); border: 1px solid rgba(255,255,255,0.12); color: var(--text-2); font-size: 13px; line-height: 1.4; }
.fc-cy-panel h4 { margin: 0 0 10px; font-size: 11px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.fc-cy-panel ol { list-style: none; margin: 0; padding: 0; }
.fc-cy-panel li { padding: 7px 0; border-top: 1px solid rgba(255,255,255,0.08); }
.fc-cy-panel li:first-child { border-top: 0; }
.fc-cy-panel .n { display: inline-grid; place-items: center; width: 20px; height: 20px; margin-right: 8px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.22); font-size: 11px; font-weight: 700; color: var(--muted); }
.fc-cy-panel .nm { font-weight: 650; color: var(--muted); }
.fc-cy-panel li.on .n { background: var(--accent); border-color: var(--accent); color: #160b05; }
.fc-cy-panel li.on .nm { color: var(--text); }
.fc-cy-panel li.done .n { border-color: rgba(255,107,53,0.6); color: var(--text-2); }
.fc-cy-panel table { display: none; width: 100%; margin: 8px 0 2px; border-collapse: collapse; }
.fc-cy-panel li.on table { display: table; }
.fc-cy-panel td { padding: 3px 0; vertical-align: top; font-size: 12.5px; }
.fc-cy-panel td:first-child { color: var(--muted); padding-right: 10px; white-space: nowrap; }
.fc-cy-panel td:last-child { color: var(--text); font-weight: 600; font-variant-numeric: tabular-nums; }
.fc-cy-panel .bar { height: 3px; margin-top: 7px; border-radius: 2px; background: rgba(255,255,255,0.1); overflow: hidden; display: none; }
.fc-cy-panel li.on .bar { display: block; }
.fc-cy-panel .bar i { display: block; height: 100%; width: 0; background: var(--accent); }
.fc-cy-panel .foot { margin-top: 10px; font-size: 11px; color: var(--muted); }
.fc-cy-dots { position: absolute; z-index: 3; left: 50%; bottom: 10px; transform: translateX(-50%); display: none; gap: 6px; align-items: center; padding: 5px 10px; border-radius: 999px; background: rgba(10,8,7,0.8); border: 1px solid rgba(255,255,255,0.12); font-size: 12px; font-weight: 650; color: var(--text); white-space: nowrap; }
.fc-cy-dots i { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,0.25); }
.fc-cy-dots i.on { background: var(--accent); }
.fc-cy-narrow .fc-cy-panel { display: none; }
.fc-cy-narrow .fc-cy-dots { display: flex; }
`;

export function mount(el, ctx) {
  css('fc-cy-css', CSS);
  const D = ctx.data.cycle;
  const reduced = ctx.reducedMotion;
  const S = setter();
  const url = (f) => ctx.asset(`/assets/models/ftc-centerstage/frames/${f}`);

  const root = h('div', 'fc-cy', { role: 'img' });
  el.append(root);

  // blurred backdrop: one per step, its key frame
  const bgs = D.map((st) => { const i = h('img', 'fc-cy-bg', { alt: '', decoding: 'async' }); root.append(i); return i; });
  // every frame of every step; src is set only when its step is near
  const frames = D.map((st) => st.frames.map((fr) => {
    const i = h('img', 'fc-cy-f', { alt: '', decoding: 'async', width: fr.w, height: fr.h });
    root.append(i);
    return { ...fr, img: i, loaded: false };
  }));
  const src = h('div', 'fc-cy-src');
  root.append(src);

  // the side panel: the five stages, the active one with the values our code uses for it
  const panel = h('div', 'fc-cy-panel');
  panel.innerHTML = `<h4>One cycle, in the code</h4><ol>${D.map((st, i) => `<li><span class="n">${i + 1}</span><span class="nm">${esc(st.name)}</span><table><tbody>${st.code.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</tbody></table><div class="bar"><i></i></div></li>`).join('')}</ol><p class="foot">Values from our robot code. Stills from our clips of the real robot.</p>`;
  root.append(panel);
  const rows = [...panel.querySelectorAll('li')];
  const bars = rows.map((r) => r.querySelector('.bar i'));
  const dots = h('div', 'fc-cy-dots');
  const dotEls = D.map(() => { const i = h('i'); dots.append(i); return i; });
  const dotName = h('span');
  dots.append(dotName);
  root.append(dots);

  function load(step) {
    for (let s = step - 1; s <= step + 1; s++) {
      if (!D[s]) continue;
      // a tiny, pre-blurred and darkened copy of the step's key frame (no CSS filter to redraw)
      if (!bgs[s].getAttribute('src')) bgs[s].src = ctx.asset(`/assets/models/ftc-centerstage/blur/${D[s].frames[D[s].key ?? 0].f.replace(/\.webp$/, '')}.webp`);
      for (const fr of frames[s]) if (!fr.loaded) { fr.loaded = true; fr.img.src = url(fr.f); }
    }
  }

  // layout: each frame placed once per stage size, fitted to the free area at its own aspect
  let L = null;
  function layout() {
    const W = el.clientWidth, H = el.clientHeight;
    if (!W || !H) return;
    const key = `${W}x${H}`;
    if (L && L.key === key) return;
    const narrow = W < 700;
    root.classList.toggle('fc-cy-narrow', narrow);
    const pw = narrow ? 0 : Math.min(300, W * 0.34);
    const pad = narrow ? 10 : 28;
    const area = { x: pad, y: pad + (narrow ? 0 : 8), w: W - pad * 2 - (pw ? pw + 24 : 0), h: H - pad * 2 - (narrow ? 34 : 8) };
    if (!narrow) Object.assign(panel.style, { right: `${pad}px`, width: `${pw}px` });
    for (const st of frames) for (const fr of st) {
      const k = Math.min(area.w / fr.w, area.h / fr.h);
      const w = Math.round(fr.w * k), hgt = Math.round(fr.h * k);
      fr.rect = { x: Math.round(area.x + (area.w - w) / 2), y: Math.round(area.y + (area.h - hgt) / 2), w, h: hgt };
      Object.assign(fr.img.style, { left: `${fr.rect.x}px`, top: `${fr.rect.y}px`, width: `${w}px`, height: `${hgt}px` });
    }
    L = { key, narrow };
  }

  let last = [0, 0];
  function draw(step, sp) {
    layout();
    load(step);
    const st = D[step];
    const n = st.frames.length;
    // blend in from the previous step's last frame over the first 18 % of the step, then step
    // through this clip's stills; each still holds, with a short dissolve into the next
    const inK = step === 0 || reduced ? 1 : smooth(0, 0.18, sp);
    let f;
    if (reduced) f = st.key ?? Math.floor((n - 1) / 2);
    else f = (n - 1) * clamp((sp - 0.2) / 0.72, 0, 1);
    const a = Math.floor(f), b = Math.min(n - 1, a + 1), t = reduced ? 0 : smooth(0.3, 0.7, f - a);
    const vis = new Map();
    const prev = step > 0 ? frames[step - 1][frames[step - 1].length - 1] : null;
    if (prev && inK < 1) vis.set(prev, 1);
    vis.set(frames[step][a], vis.has(frames[step][a]) ? 1 : (prev && inK < 1 ? inK : 1));
    if (b !== a && t > 0) vis.set(frames[step][b], t * inK);
    // stacking: the incoming frame above the outgoing one
    frames.forEach((stf, si) => stf.forEach((fr, fi) => {
      const o = vis.get(fr) || 0;
      S.style(fr.img, 'opacity', o.toFixed(3));
      S.style(fr.img, 'zIndex', String(fr === prev ? 1 : si === step && fi === b && b !== a ? 3 : 2));
    }));
    bgs.forEach((bg, i) => S.style(bg, 'opacity', (i === step ? inK : i === step - 1 ? 1 - inK : 0).toFixed(3)));
    // the source line sits on the frame showing now
    const cur = t > 0.5 ? frames[step][b] : frames[step][a];
    const show = inK < 0.5 && prev ? prev : cur;
    const srcHtml = `<b>${esc(show.src)}</b> · ${esc(show.t)}`;
    if (src._h !== srcHtml) { src._h = srcHtml; src.innerHTML = srcHtml; }
    if (show.rect) { S.style(src, 'left', `${show.rect.x + 10}px`); S.style(src, 'top', `${show.rect.y + 10}px`); }
    rows.forEach((r, i) => { S.cls(r, 'on', i === step); S.cls(r, 'done', i < step); });
    bars.forEach((bar, i) => S.style(bar, 'width', `${(i === step ? lerp(0, 100, clamp(sp, 0, 1)) : 0).toFixed(1)}%`));
    dotEls.forEach((d, i) => S.cls(d, 'on', i === step));
    S.text(dotName, `${step + 1}. ${st.name}`);
    root.setAttribute('aria-label', `Step ${step + 1} of ${D.length}, ${st.name}: ${cur.alt || ''}`);
  }

  function setProgress(p, step, stepP) {
    last = [clamp(step | 0, 0, D.length - 1), clamp(stepP, 0, 1)];
    draw(...last);
  }
  const ro = new ResizeObserver(() => { L = null; draw(...last); });
  ro.observe(el);
  draw(0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
