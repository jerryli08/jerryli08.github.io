// The season on one line: every dated photo, render and clip on this page placed on a timeline from
// kickoff (Sep 7 2024) to the Chesapeake Championship (Mar 2 2025), in three lanes: my extension,
// the intake and the events. Drag the date, click a dot, or use the arrow keys; the picture is the
// latest item on or before that date. Clips show their first frame here (nothing moves); they play
// further down the page. Dates come from the files and the official event pages.
import { css, h, rich } from './kit.js';
import { slider } from '/assets/js/lib/ui.js';

const LOCAL_CSS = `
.itd-t { display: grid; grid-template-rows: minmax(0, 1fr) auto; outline: none; }
.itd-t-view { position: relative; overflow: hidden; }
.itd-t-view img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity 0.25s; }
.itd-t-view img.on { opacity: 1; }
.itd-reduced .itd-t-view img { transition: none; }
.itd-t-cap { position: absolute; left: 12px; bottom: 12px; z-index: 2; display: block; max-width: min(560px, calc(100% - 24px)); border-radius: 10px; white-space: normal; }
.itd-t-cap .d { color: var(--accent); font-weight: 650; }
.itd-t-clip { position: absolute; right: 12px; top: 12px; z-index: 2; }
.itd-t-line { position: relative; padding: 10px 18px 12px 116px; border-top: 1px solid var(--line); background: rgba(12, 10, 9, 0.6); }
.itd-t-lane { position: relative; height: 26px; }
.itd-t-lane + .itd-t-lane { border-top: 1px dashed rgba(237, 232, 226, 0.08); }
.itd-t-lane > b { position: absolute; left: -104px; top: 50%; transform: translateY(-50%); width: 96px; font-size: 11.5px; font-weight: 600; color: var(--muted); letter-spacing: 0.02em; }
.itd-t-dot { position: absolute; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; border: 2px solid var(--line-strong); background: var(--bg); color: var(--text-2); font-size: 10px; font-weight: 700; line-height: 14px; text-align: center; cursor: pointer; padding: 0; transition: transform 0.15s, background 0.15s, border-color 0.15s; }
.itd-t-dot:hover { border-color: var(--accent); transform: scale(1.15); }
.itd-t-dot.ev { border-radius: 4px; }
.itd-t-dot.seen { border-color: rgba(255, 107, 53, 0.55); }
.itd-t-dot.on { background: var(--accent); border-color: var(--accent); color: #140c07; transform: scale(1.2); z-index: 2; }
.itd-t-axis { position: relative; height: 18px; margin-top: 4px; }
.itd-t-axis span { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--muted); }
.itd-t-now { position: absolute; top: 6px; bottom: 26px; width: 2px; margin-left: -1px; background: rgba(255, 107, 53, 0.55); pointer-events: none; }
@media (max-width: 700px) {
  .itd-t-line { padding: 8px 12px 10px 62px; }
  .itd-t-lane > b { left: -54px; width: 50px; font-size: 10.5px; }
  .itd-t-dot { width: 14px; height: 14px; margin: -7px 0 0 -7px; font-size: 8px; line-height: 10px; border-width: 2px; }
  .itd-t-cap { font-size: 11.5px; left: 8px; bottom: 8px; max-width: calc(100% - 16px); }
  .itd-t-axis span { font-size: 10px; }
  .itd-t-axis span.k { display: none; }
}
`;
const DAY = 86400000;
const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (t) => { const d = new Date(t); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };
const memory = {};

export function mount(el, ctx) {
  css();
  if (!document.getElementById('itd-t-css')) {
    const s = h('style'); s.id = 'itd-t-css'; s.textContent = LOCAL_CSS; document.head.appendChild(s);
  }
  const D = ctx.data;
  const t0 = day(D.from), t1 = day(D.to);
  const items = (D.items || []).map((x, k) => ({ ...x, k, t: day(x.d) })).sort((a, b) => a.t - b.t || a.k - b.k);
  const lanes = D.lanes || [];
  const x = (t) => `${((t - t0) / (t1 - t0)) * 100}%`;

  const root = h('div', `itd itd-t${ctx.reducedMotion ? ' itd-reduced' : ''}`);
  root.tabIndex = 0;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', D.aria || 'The season on a timeline');
  el.appendChild(root);

  const view = h('div', 'itd-t-view itd-media');
  const cap = h('p', 'itd-chip itd-t-cap');
  const clipTag = h('p', 'itd-chip itd-t-clip', D.clipNote || 'Frame from a clip');
  view.append(cap, clipTag);
  const imgs = items.map(() => null);
  const src = (it) => {
    const base = `/assets/media/${ctx.slug}/`;
    if (it.v) return ctx.asset(base + it.v.replace(/\.mp4$/, '.jpg'));
    return ctx.asset(base + (root.clientWidth < 700 && it.small !== false ? it.i.replace(/\.webp$/, '-s.webp') : it.i));
  };
  function img(j) {
    if (imgs[j]) return imgs[j];
    const im = h('img'); im.alt = items[j].c || ''; im.decoding = 'async'; im.src = src(items[j]);
    view.insertBefore(im, cap);
    imgs[j] = im;
    return im;
  }

  const line = h('div', 'itd-t-line');
  const now = h('div', 'itd-t-now');
  const dots = [];
  for (const ln of lanes) {
    const lane = h('div', 'itd-t-lane');
    lane.append(h('b', null, ln.label));
    for (const it of items.filter((q) => q.lane === ln.key)) {
      const b = h('button', `itd-t-dot${ln.key === 'event' ? ' ev' : ''}`, it.n != null ? String(it.n) : '');
      b.type = 'button';
      b.style.left = x(it.t);
      b.setAttribute('aria-label', `${fmt(it.t)}: ${it.title || it.c}`);
      b.addEventListener('click', (e) => { e.stopPropagation(); pick(items.indexOf(it)); });
      lane.append(b);
      dots[items.indexOf(it)] = b;
    }
    line.append(lane);
  }
  const axis = h('div', 'itd-t-axis');
  for (let m = new Date(t0); m.getTime() <= t1; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
    const first = Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1);
    if (first < t0) continue;
    const s = h('span', null, MONTHS[m.getUTCMonth()] + (m.getUTCMonth() === 0 ? ` ${m.getUTCFullYear()}` : ''));
    s.style.left = x(first);
    axis.append(s);
  }
  // Sep has no first-of-month tick inside the range: label kickoff instead
  const kick = h('span', 'k', D.fromLabel || 'Kickoff'); kick.style.left = '0%'; kick.style.transform = 'none'; axis.prepend(kick);
  line.append(axis, now);
  root.append(view, line);

  let cur = -1;
  function pick(j, fromSlider = false) {
    j = Math.max(0, Math.min(items.length - 1, j));
    if (j !== cur) {
      if (cur >= 0) imgs[cur]?.classList.remove('on');
      cur = j;
      img(j).classList.add('on');
      // warm the neighbours so stepping is instant
      if (j + 1 < items.length) img(j + 1);
      const it = items[j];
      cap.replaceChildren(h('span', 'd', `${fmt(it.t)}  `));
      const rest = h('span'); rich(rest, it.c || ''); cap.append(rest);
      clipTag.hidden = !it.v;
      dots.forEach((b, k) => { if (b) { b.classList.toggle('on', k === j); b.classList.toggle('seen', k < j); } });
      memory[ctx.id] = j;
    }
    if (!fromSlider) date.set(Math.round((items[j].t - t0) / DAY), { silent: true });
    const cs = getComputedStyle(line), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0;
    const f = ((fromSlider ? t0 + date.value * DAY : items[j].t) - t0) / (t1 - t0);
    now.style.left = `${pl + (line.clientWidth - pl - pr) * f}px`;
  }

  const date = slider(ctx.panel, {
    label: 'Date', min: 0, max: Math.round((t1 - t0) / DAY), step: 1, value: 0,
    format: (v) => fmt(t0 + v * DAY),
    onInput: (v) => {
      const t = t0 + v * DAY;
      let j = 0;
      items.forEach((it, k) => { if (it.t <= t) j = k; });
      pick(j, true);
    },
  });
  const prev = h('button', 'rx-ui rx-btn', 'Earlier'); prev.type = 'button';
  const next = h('button', 'rx-ui rx-btn', 'Later'); next.type = 'button';
  prev.addEventListener('click', () => pick(cur - 1));
  next.addEventListener('click', () => pick(cur + 1));
  ctx.panel?.append(prev, next);

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { pick(cur + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { pick(cur - 1); e.preventDefault(); }
  });
  const ro = new ResizeObserver(() => { const j = cur; cur = -1; imgs.forEach((im) => im?.classList.remove('on')); pick(j); });
  pick(memory[ctx.id] || 0);
  ro.observe(root);
  return { dispose() { ro.disconnect(); root.remove(); } };
}
