// The season as a slideshow driven by the scroll: our dated photos, renders and clip stills in
// order, a date rail under them with our four events, and the official results filling in as the
// scroll passes each event. Dates come from the files; results from the official FIRST Tech
// Challenge event pages for team 18996 (2023 season). Clips show their poster frame here.
// Every photo gets an equal share of the scroll; the rail cursor moves between the photos' dates.
// setProgress is a pure function of p: scrolling back runs it backwards.
import { clamp, smooth, css, h, setter, esc } from './kit.js';

const CSS = `
.fc-se { position: absolute; inset: 0; overflow: hidden; }
.fc-se-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0; }
.fc-se-ph { position: absolute; border-radius: 12px; box-shadow: 0 30px 60px -30px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.08); opacity: 0; background: #151210; }
.fc-se-cap { position: absolute; z-index: 4; max-width: min(560px, calc(100% - 24px)); padding: 9px 13px 10px; border-radius: 12px; background: rgba(10,8,7,0.84); border: 1px solid rgba(255,255,255,0.12); font-size: 14px; line-height: 1.4; color: var(--text); }
.fc-se-cap .d { display: block; font-size: 12px; font-weight: 650; letter-spacing: 0.02em; color: var(--accent); }
.fc-se-res { position: absolute; z-index: 4; padding: 16px 18px; border-radius: 16px; background: rgba(10,8,7,0.84); border: 1px solid rgba(255,255,255,0.12); }
.fc-se-res h4 { margin: 0 0 4px; font-size: 11px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.fc-se-res ol { list-style: none; margin: 0; padding: 0; }
.fc-se-res li { padding: 10px 0 9px; border-top: 1px solid rgba(255,255,255,0.08); opacity: 0.28; }
.fc-se-res li:first-child { border-top: 0; }
.fc-se-res li.seen { opacity: 0.8; }
.fc-se-res li.now { opacity: 1; }
.fc-se-res .ev { font-size: 14px; font-weight: 650; color: var(--text); }
.fc-se-res .dt { font-size: 12px; color: var(--muted); margin-left: 6px; font-weight: 500; }
.fc-se-res .rk { display: block; margin-top: 3px; font-size: 13px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.fc-se-res .rk b { color: var(--text); font-weight: 650; }
.fc-se-res li.now .rk b { color: var(--accent); }
.fc-se-res .aw { display: block; margin-top: 2px; font-size: 12px; color: var(--muted); }
.fc-se-rail { position: absolute; z-index: 4; left: 24px; right: 24px; height: 64px; }
.fc-se-rail .ln { position: absolute; left: 0; right: 0; top: 34px; height: 2px; background: rgba(237,232,226,0.18); }
.fc-se-rail .fill { position: absolute; left: 0; top: 34px; height: 2px; background: rgba(255,107,53,0.7); width: 0; }
.fc-se-rail .dot { position: absolute; top: 31px; width: 8px; height: 8px; margin-left: -4px; border-radius: 50%; background: rgba(237,232,226,0.3); }
.fc-se-rail .dot.seen { background: rgba(255,107,53,0.8); }
.fc-se-rail .evm { position: absolute; top: 28px; width: 14px; height: 14px; margin-left: -7px; transform: rotate(45deg); border: 2px solid rgba(237,232,226,0.35); background: #0b0a09; }
.fc-se-rail .evm.seen { background: var(--accent); border-color: var(--accent); }
.fc-se-rail .evl { position: absolute; top: 4px; transform: translateX(-50%); font-size: 11.5px; font-weight: 650; color: var(--muted); white-space: nowrap; }
.fc-se-rail .evl.seen { color: var(--text); }
.fc-se-rail .mo { position: absolute; top: 46px; transform: translateX(-50%); font-size: 11px; color: var(--muted); }
.fc-se-rail .cur { position: absolute; top: 22px; width: 2px; height: 26px; margin-left: -1px; background: var(--accent); }
.fc-se-narrow .fc-se-res { display: none; }
.fc-se-narrow .fc-se-cap { font-size: 12.5px; padding: 7px 10px 8px; }
.fc-se-narrow .fc-se-rail { left: 12px; right: 12px; }
.fc-se-narrow .fc-se-rail .evl { font-size: 10px; }
`;

const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (t) => { const d = new Date(t); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };

export function mount(el, ctx) {
  css('fc-se-css', CSS);
  const D = ctx.data;
  const reduced = ctx.reducedMotion;
  const S = setter();
  const items = D.items.map((it) => ({ ...it, t: day(it.d) }));
  const events = D.events.map((e) => ({ ...e, t: day(e.d) }));
  const t0 = day(D.from), t1 = day(D.to);
  const N = items.length;
  const media = (f) => ctx.asset(f.startsWith('/') ? f : `/assets/media/ftc-centerstage/${f}`);
  const small = (f) => (/\.webp$/.test(f) ? f.replace(/\.webp$/, '-s.webp') : f);

  const root = h('div', 'fc-se', { role: 'img' });
  el.append(root);
  const bgs = items.map(() => { const i = h('img', 'fc-se-bg', { alt: '', decoding: 'async' }); root.append(i); return i; });
  const phs = items.map((it) => { const i = h('img', 'fc-se-ph', { alt: it.c.replace(/\*\*/g, ''), decoding: 'async', width: it.w, height: it.h }); root.append(i); return i; });
  const cap = h('div', 'fc-se-cap');
  root.append(cap);
  const res = h('div', 'fc-se-res');
  res.innerHTML = `<h4>Official results, team 18996</h4><ol>${events.map((e) => `<li><span class="ev">${esc(e.name)}</span><span class="dt">${esc(fmt(e.t))}</span><span class="rk">${e.rank} · <b>${esc(e.rec)}</b>${e.po ? ` · ${esc(e.po)}` : ''}</span><span class="aw">${esc(e.aw)}</span></li>`).join('')}</ol>`;
  root.append(res);
  const resRows = [...res.querySelectorAll('li')];
  const rail = h('div', 'fc-se-rail');
  const x = (t) => `${(((t - t0) / (t1 - t0)) * 100).toFixed(3)}%`;
  rail.append(h('div', 'ln'));
  const fill = h('div', 'fill');
  rail.append(fill);
  for (let m = new Date(t0); m.getTime() <= t1; m.setUTCMonth(m.getUTCMonth() + 1, 1)) {
    const tm = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1);
    if (tm < t0) continue;
    const lab = h('span', 'mo'); lab.textContent = MONTHS[m.getUTCMonth()]; lab.style.left = x(tm); rail.append(lab);
  }
  const dots = items.map((it) => { const d = h('span', 'dot'); d.style.left = x(it.t); rail.append(d); return d; });
  const evm = events.map((e) => { const d = h('span', 'evm'); d.style.left = x(e.t); rail.append(d); return d; });
  const evl = events.map((e) => { const l = h('span', 'evl'); l.textContent = e.short; l.style.left = x(e.t); rail.append(l); return l; });
  const cur = h('span', 'cur');
  rail.append(cur);
  root.append(rail);

  let narrow = false, L = null;
  function layout() {
    const W = el.clientWidth, H = el.clientHeight;
    const key = `${W}x${H}`;
    if (!W || !H || (L && L.key === key)) return;
    narrow = W < 760;
    root.classList.toggle('fc-se-narrow', narrow);
    const railH = 72;
    const pw = narrow ? 0 : Math.min(360, W * 0.3);
    const area = { x: narrow ? 10 : 32, y: narrow ? 10 : 28, w: W - (narrow ? 20 : 64) - (pw ? pw + 28 : 0), h: H - railH - (narrow ? 20 : 44) };
    if (!narrow) Object.assign(res.style, { right: '32px', top: `${area.y}px`, width: `${pw}px` });
    Object.assign(rail.style, { bottom: `${narrow ? 4 : 12}px` });
    items.forEach((it, i) => {
      const k = Math.min(area.w / it.w, area.h / it.h);
      const w = Math.round(it.w * k), hh = Math.round(it.h * k);
      it.rect = { x: Math.round(area.x + (area.w - w) / 2), y: Math.round(area.y + (area.h - hh) / 2), w, h: hh };
      Object.assign(phs[i].style, { left: `${it.rect.x}px`, top: `${it.rect.y}px`, width: `${w}px`, height: `${hh}px` });
    });
    L = { key, area };
  }
  function load(i) {
    for (let j = i - 1; j <= i + 2; j++) {
      const it = items[j];
      if (!it || it.loaded) continue;
      it.loaded = true;
      const f = narrow ? small(it.i) : it.i;
      phs[j].src = media(f);
      // a tiny, pre-blurred and darkened copy (no CSS filter to redraw while scrolling)
      bgs[j].src = ctx.asset(`/assets/models/ftc-centerstage/blur/${it.i.replace(/(-s)?\.(webp|jpg)$/, '')}.webp`);
    }
  }

  let last = 0;
  function draw(p) {
    layout();
    const q = clamp(p, 0, 0.99999) * N;
    const i = Math.floor(q), f = q - i;
    load(i);
    // each photo dissolves in over the first 30 % of its share of the scroll
    const k = reduced || i === 0 ? 1 : smooth(0, 0.3, f);
    items.forEach((it, j) => {
      const o = j === i ? k : j === i - 1 ? 1 : 0;
      S.style(phs[j], 'opacity', (j === i - 1 && k >= 1 ? 0 : o).toFixed(3));
      S.style(phs[j], 'zIndex', j === i ? '2' : '1');
      S.style(bgs[j], 'opacity', (j === i ? k : j === i - 1 ? 1 - k : 0).toFixed(3));
    });
    const it = items[i];
    // the rail cursor moves from this photo's date toward the next one's
    const tn = i + 1 < N ? items[i + 1].t : t1;
    const tc = reduced ? it.t : it.t + (tn - it.t) * smooth(0.3, 1, f);
    S.style(cur, 'left', x(tc));
    S.style(fill, 'width', x(tc));
    dots.forEach((d, j) => S.cls(d, 'seen', items[j].t <= tc));
    const seen = events.map((e) => e.t <= tc);
    const nowEv = seen.lastIndexOf(true);
    evm.forEach((d, j) => S.cls(d, 'seen', seen[j]));
    evl.forEach((d, j) => { S.cls(d, 'seen', seen[j]); S.style(d, 'display', narrow && j !== Math.max(0, nowEv) ? 'none' : ''); });
    resRows.forEach((r, j) => { S.cls(r, 'seen', seen[j]); S.cls(r, 'now', j === nowEv); });
    // the caption belongs to the photo that dominates the picture right now
    const sh = k < 0.5 && i > 0 ? items[i - 1] : it;
    const ev = sh.ev != null ? events[sh.ev] : null;
    const html = `<span class="d">${esc(fmt(sh.t))}</span>${esc(sh.c)}${narrow && ev ? `<br><b>${esc(ev.rank)}, ${esc(ev.rec)}</b>` : ''}`;
    if (cap._h !== html) {
      cap._h = html; cap.innerHTML = html;
    }
    if (sh.rect) {
      const cw = Math.min(sh.rect.w - 20, narrow ? 9999 : 560);
      S.style(cap, 'left', `${sh.rect.x + 10}px`);
      S.style(cap, 'maxWidth', `${Math.max(200, cw)}px`);
      S.style(cap, 'top', 'auto');
      S.style(cap, 'bottom', `${el.clientHeight - (sh.rect.y + sh.rect.h) + 10}px`);
    }
    root.setAttribute('aria-label', `${fmt(sh.t)}: ${sh.c}`);
  }
  function setProgress(p) { last = clamp(p, 0, 1); draw(last); }
  const ro = new ResizeObserver(() => { L = null; draw(last); });
  ro.observe(el);
  draw(0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
