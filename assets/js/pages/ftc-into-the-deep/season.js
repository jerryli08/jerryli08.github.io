// The season on one line, driven by the scroll: every dated photo, render and clip on this page
// placed on a timeline from kickoff (Sep 7 2024) to the Chesapeake Championship (Mar 2 2025), in
// three lanes (my extension, the intake, the events). Scrolling plays the season forward one picture
// at a time: each picture holds, then the next one fades in while the marker walks along the dates
// to it. Clips show a still here; they play further down the page. Dates come from the files and the
// official event pages. The picture is a pure function of the scroll progress p.
import { css, h, rich, mediaUrl, clamp, smooth, stack } from './kit.js';

const LOCAL_CSS = `
.itd-t { display: grid; grid-template-rows: minmax(0, 1fr) auto; }
.itd-t-view { position: relative; min-height: 0; }
.itd-t-view .itd-box { inset: 14px 14px 76px; }
.itd-t-cap { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 3; display: block; width: max-content; max-width: min(860px, calc(100% - 32px)); border-radius: 12px; padding: 8px 14px 9px; font-size: 14.5px; white-space: normal; text-align: center; background: rgba(10, 8, 7, 0.9); }
.itd-t-cap .d { color: var(--accent); font-weight: 650; }
.itd-t-clip { position: absolute; right: 16px; top: 16px; z-index: 3; }
.itd-t-count { position: absolute; left: 16px; top: 16px; z-index: 3; font-variant-numeric: tabular-nums; }
.itd-t-line { padding: 10px max(24px, 4vw) 10px calc(max(24px, 4vw) + 100px); border-top: 1px solid var(--line); background: rgba(12, 10, 9, 0.72); }
.itd-t-track { position: relative; }
.itd-t-lane { position: relative; height: 26px; }
.itd-t-lane + .itd-t-lane { border-top: 1px dashed rgba(237, 232, 226, 0.08); }
.itd-t-lane > b { position: absolute; left: -100px; top: 50%; transform: translateY(-50%); width: 90px; font-size: 12px; font-weight: 600; color: var(--muted); letter-spacing: 0.02em; }
.itd-t-dot { position: absolute; top: 50%; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; border: 2px solid var(--line-strong); background: var(--bg); color: var(--text-2); font-size: 10px; font-weight: 700; line-height: 14px; text-align: center; }
.itd-t-dot.ev { border-radius: 4px; }
.itd-t-dot.seen { border-color: rgba(255, 107, 53, 0.6); }
.itd-t-dot.on { background: var(--accent); border-color: var(--accent); color: #140c07; transform: scale(1.2); z-index: 2; }
.itd-t-axis { position: relative; height: 18px; margin-top: 4px; }
.itd-t-axis span { position: absolute; transform: translateX(-50%); font-size: 11px; color: var(--muted); white-space: nowrap; }
.itd-t-now { position: absolute; top: -4px; bottom: 18px; width: 2px; margin-left: -1px; background: var(--accent); border-radius: 1px; }
@media (max-width: 700px) {
  .itd-t-line { padding: 8px 14px 8px 80px; }
  .itd-t-lane { height: 22px; }
  .itd-t-lane > b { left: -70px; width: 60px; font-size: 10.5px; }
  .itd-t-dot { width: 14px; height: 14px; margin: -7px 0 0 -7px; font-size: 8px; line-height: 10px; }
  .itd-t-view .itd-box { inset: 8px 8px 6px; }
  .itd-t-cap { font-size: 12px; left: 8px; bottom: 8px; transform: none; width: auto; max-width: calc(100% - 16px); padding: 6px 10px 7px; text-align: left; }
  .itd-t-clip, .itd-t-count { top: 8px; font-size: 11.5px; padding: 3px 9px; }
  .itd-t-clip { right: 8px; } .itd-t-count { left: 8px; }
  .itd-t-axis span { font-size: 10px; }
  .itd-t-axis span.k { display: none; }
}
`;
const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmt = (t) => { const d = new Date(t); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`; };

export function mount(el, ctx) {
  css('itd-t-css', LOCAL_CSS);
  const D = ctx.data;
  const reduced = ctx.reducedMotion;
  const t0 = day(D.from), t1 = day(D.to);
  const items = (D.items || []).map((x, k) => ({ ...x, k, t: day(x.d) })).sort((a, b) => a.t - b.t || a.k - b.k);
  const N = items.length;
  const pct = (t) => `${(((t - t0) / (t1 - t0)) * 100).toFixed(3)}%`;

  const root = h('div', 'itd itd-t');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', D.aria || 'The season on a timeline');
  el.appendChild(root);

  const view = h('div', 'itd-t-view');
  const box = h('div', 'itd-box');
  const cap = h('p', 'itd-chip itd-t-cap');
  const clipTag = h('p', 'itd-chip itd-t-clip', D.clipNote || 'Still from a clip');
  const count = h('p', 'itd-chip itd-t-count');
  view.append(box, cap, clipTag, count);
  const small = el.clientWidth < 700;
  const pics = stack(box, items.map((it) => mediaUrl(ctx, it.v || it.i, small)), items.map((it) => it.c || ''));

  // the timeline: lanes of dots on a date axis, and a marker that follows the scroll
  const line = h('div', 'itd-t-line');
  const track = h('div', 'itd-t-track');
  const dots = [];
  for (const ln of D.lanes || []) {
    const lane = h('div', 'itd-t-lane');
    lane.append(h('b', null, ln.label));
    items.forEach((it, j) => {
      if (it.lane !== ln.key) return;
      const d = h('span', `itd-t-dot${ln.key === 'event' ? ' ev' : ''}`, it.n != null ? String(it.n) : '');
      d.style.left = pct(it.t);
      lane.append(d);
      dots[j] = d;
    });
    track.append(lane);
  }
  const axis = h('div', 'itd-t-axis');
  const kick = h('span', 'k', D.fromLabel || 'Kickoff'); kick.style.left = '0%'; kick.style.transform = 'none';
  axis.append(kick);
  for (let y = new Date(t0).getUTCFullYear(), m = new Date(t0).getUTCMonth() + 1; Date.UTC(y, m, 1) <= t1; m++) {
    const first = Date.UTC(y, m, 1), mm = new Date(first).getUTCMonth();
    const s = h('span', null, MONTHS[mm] + (mm === 0 ? ` ${new Date(first).getUTCFullYear()}` : ''));
    s.style.left = pct(first);
    axis.append(s);
  }
  const now = h('div', 'itd-t-now');
  track.append(axis, now);
  line.append(track);
  root.append(view, line);

  let shown = -1, nowAt = '';
  function setProgress(p) {
    // u runs 0..N: item i holds for most of its share of the scroll, then item i + 1 fades in
    const u = clamp(p, 0, 1) * N;
    const i = Math.min(N - 1, Math.floor(u)), f = u - i;
    const k = i < N - 1 ? (reduced ? (f >= 0.9 ? 1 : 0) : smooth(0.78, 0.98, f)) : 0;
    pics.show(i, i + 1, k);
    const cur = k >= 0.5 ? i + 1 : i;
    if (cur !== shown) {
      shown = cur;
      const it = items[cur];
      cap.replaceChildren(h('span', 'd', `${fmt(it.t)}  `));
      const rest = h('span'); rich(rest, it.c || ''); cap.append(rest);
      clipTag.hidden = !it.v;
      count.textContent = `${cur + 1} / ${N}`;
      dots.forEach((d, j) => { if (d) { d.classList.toggle('on', j === cur); d.classList.toggle('seen', j < cur); } });
    }
    // the marker walks from this item's date to the next one's while the next picture comes in
    const t = i < N - 1 ? items[i].t + (items[i + 1].t - items[i].t) * smooth(0.55, 0.98, f) : items[i].t;
    const left = pct(t);
    if (left !== nowAt) { nowAt = left; now.style.left = left; }
  }
  setProgress(0);
  return { setProgress, dispose() { root.remove(); } };
}
