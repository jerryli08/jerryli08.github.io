// The five intake versions of the season, one per scroll step, in Jerry's order. Each step shows
// three stills from that version's own clip, which follow each other as you scroll through the step,
// so the pick up plays forward (and backward) with the scroll. The rail at the top marks where you
// are; the step text beside it says what the version did and what went wrong. Nothing plays and there
// is nothing to click. Every picture is a pure function of (step, progress through the step).
import { css, h, rich, mediaUrl, clamp, smooth, stack } from './kit.js';

const LOCAL_CSS = `
.itd-s { --l: 0px; }
.itd-s-rail { position: absolute; left: calc(var(--l) + 18px); right: 18px; top: 16px; z-index: 3; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); margin: 0; padding: 0; list-style: none; }
.itd-s-rail::before { content: ''; position: absolute; left: 10%; right: 10%; top: 14px; height: 2px; background: var(--line-strong); }
.itd-s-rail li { position: relative; display: grid; justify-items: center; }
.itd-s-dot { position: relative; z-index: 1; width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: var(--bg); border: 2px solid var(--line-strong); color: var(--text-2); font-size: 13px; font-weight: 700; }
.itd-s-rail li.done .itd-s-dot { border-color: rgba(255, 107, 53, 0.6); }
.itd-s-rail li.on .itd-s-dot { background: var(--accent); border-color: var(--accent); color: #140c07; }
.itd-s-rail small { margin-top: 5px; font-size: 12px; line-height: 1.2; color: var(--muted); text-align: center; }
.itd-s-rail li.on small { color: var(--text); font-weight: 600; }
.itd-s .itd-box { left: calc(var(--l) + 12px); right: 12px; top: 78px; bottom: 64px; }
.itd-s-cap { position: absolute; left: calc(var(--l) + 18px); right: 18px; bottom: 14px; z-index: 3; display: flex; justify-content: center; }
.itd-s-cap .itd-chip { display: block; max-width: 100%; border-radius: 12px; padding: 7px 13px 8px; font-size: 14px; white-space: normal; text-align: center; }
.itd-s-cap .n { color: var(--accent); font-weight: 650; font-variant-numeric: tabular-nums; }
@media (max-width: 900px) {
  .itd-s-rail { top: 8px; left: 10px; right: 10px; }
  .itd-s-rail::before { top: 12px; }
  .itd-s-dot { width: 26px; height: 26px; font-size: 12px; }
  .itd-s-rail small { font-size: 10.5px; margin-top: 3px; }
  .itd-s .itd-box { left: 6px; right: 6px; top: 62px; bottom: 6px; }
  .itd-s-cap { left: 8px; right: 8px; bottom: 8px; justify-content: flex-start; }
  .itd-s-cap .itd-chip { font-size: 12px; padding: 5px 10px 6px; text-align: left; }
}
@media (max-width: 480px) { .itd-s-rail small { display: none; } .itd-s .itd-box { top: 44px; } }
`;
// where the next still takes over, through a step (three stills per version)
const CUTS = [0.4, 0.72];

export function mount(el, ctx) {
  css('itd-s-css', LOCAL_CSS);
  const V = ctx.data.versions || [];
  const reduced = ctx.reducedMotion;
  const root = h('div', 'itd itd-s');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', ctx.data.aria || 'The five intake versions');
  el.appendChild(root);

  const rail = h('ol', 'itd-s-rail');
  const marks = V.map((v, i) => {
    const li = h('li');
    li.append(h('span', 'itd-s-dot', String(i + 1)), h('small', null, v.short));
    rail.append(li);
    return li;
  });
  const box = h('div', 'itd-box');
  const capWrap = h('div', 'itd-s-cap');
  const cap = h('p', 'itd-chip');
  capWrap.append(cap);
  root.append(box, rail, capWrap);

  const small = el.clientWidth < 700;
  const flat = [];
  V.forEach((v, i) => v.frames.forEach((f, j) => flat.push({ i, j, src: mediaUrl(ctx, f, small), alt: `${v.c} (still ${j + 1} of ${v.frames.length})` })));
  const start = []; let n = 0;
  V.forEach((v, i) => { start[i] = n; n += v.frames.length; });
  const pics = stack(box, flat.map((f) => f.src), flat.map((f) => f.alt));

  // on a full-width desktop scrolly the step cards cover the left: keep the pictures right of them
  function layout() {
    let l = 0;
    if (ctx.shift()[0] > 0) {
      const card = el.closest('.rx-scrolly')?.querySelector('.rx-step-card');
      if (card) {
        const r = card.getBoundingClientRect(), e = el.getBoundingClientRect();
        l = clamp(r.right - e.left + 24, 0, e.width * 0.55);
      }
    }
    root.style.setProperty('--l', `${Math.round(l)}px`);
  }

  let shownV = -1, shownF = -1;
  function setProgress(p, step, stepP) {
    const s = clamp(step | 0, 0, V.length - 1);
    const q = clamp(stepP, 0, 1);
    const cnt = V[s].frames.length;
    const j = cnt < 3 ? Math.min(cnt - 1, Math.floor(q * cnt)) : (q < CUTS[0] ? 0 : q < CUTS[1] ? 1 : 2);
    const f = start[s] + j;
    // a new version fades in over the last still of the one before; its own stills cut like a flip book
    if (j === 0 && s > 0 && !reduced) {
      const k = smooth(0, 0.22, q);
      pics.show(k >= 1 ? f : f - 1, f, k);
    } else pics.show(f);
    if (s !== shownV) {
      shownV = s;
      marks.forEach((li, i) => { li.classList.toggle('on', i === s); li.classList.toggle('done', i < s); });
    }
    if (f !== shownF) {
      shownF = f;
      cap.replaceChildren(h('span', 'n', `${V[s].dates}  `));
      const rest = h('span'); rich(rest, V[s].c); cap.append(rest);
    }
  }

  const ro = new ResizeObserver(layout);
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
