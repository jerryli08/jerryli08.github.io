// Two bench tests of the December hand off, one clean and one failed, stepping frame by frame with
// the scroll. Both are real clips filmed from the same spot; the stills are taken from each clip at
// the same moments on one shared clock, lined up on the moment the intake starts to flip back (by
// eye, frame by frame, as on the old synced player). Each step of the text shows the stills of one
// phase of the flip, and the readout shows the shared clock. Nothing plays and there is nothing to
// click. The stills cut from one to the next (no blend), so reduced motion changes nothing. Every picture is a pure function of (step, progress through the step).
import { css, h, mediaUrl, clamp, stack } from './kit.js';

const LOCAL_CSS = `
.itd-h { display: flex; flex-direction: column; gap: 10px; padding: 14px 14px 78px; }
.itd-h.side { flex-direction: row; }
.itd-h { align-items: center; }
.itd-h-pane { position: relative; flex: 1 1 0; min-width: 0; min-height: 0; max-width: 100%; max-height: 100%; aspect-ratio: 16 / 9; align-self: center; border-radius: 12px; overflow: hidden; background: #0c0a09; border: 1px solid var(--line); }
.itd-h-pane .itd-box { inset: 0; }
.itd-h-lab { position: absolute; left: 10px; top: 10px; z-index: 3; }
.itd-h-lab i { width: 9px; height: 9px; border-radius: 50%; background: rgb(52, 199, 110); }
.itd-h-pane.bad .itd-h-lab i { background: rgb(255, 92, 92); }
.itd-h .rx-hud { top: auto; right: 14px; left: 14px; bottom: 12px; width: auto; display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 4px 16px; padding: 9px 14px 10px; }
.itd-h-clock b { display: block; font-size: 24px; line-height: 1; font-variant-numeric: tabular-nums; color: var(--text); }
.itd-h-phase { font-size: 14px; color: var(--text); font-weight: 600; }
.itd-h-track { position: relative; height: 14px; margin-top: 4px; }
.itd-h-track::before { content: ''; position: absolute; left: 0; right: 0; top: 6px; height: 2px; border-radius: 1px; background: rgba(255, 255, 255, 0.14); }
.itd-h-tick { position: absolute; top: 2px; width: 2px; height: 10px; margin-left: -1px; background: rgba(255, 255, 255, 0.4); }
.itd-h-at { position: absolute; top: 2px; width: 10px; height: 10px; margin-left: -5px; border-radius: 50%; background: var(--accent); }
@media (max-width: 640px) {
  .itd-h { padding: 8px 8px 60px; gap: 6px; }
  .itd-h-lab { left: 6px; top: 6px; font-size: 11.5px; padding: 3px 9px; }
  .itd-h .rx-hud { left: 8px; right: 8px; bottom: 8px; padding: 6px 10px 7px; gap: 2px 12px; }
  .itd-h-clock b { font-size: 18px; }
  .itd-h-phase { font-size: 12.5px; }
}
`;

export function mount(el, ctx) {
  css('itd-h-css', LOCAL_CSS);
  const D = ctx.data;
  const times = D.times || [];
  const groups = D.groups || [];
  const span = D.span || 8.5;
  const marks = (D.marks || []).slice().sort((a, b) => a.t - b.t);

  const root = h('div', 'itd itd-h');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', D.aria || 'A clean and a failed hand off, frame by frame');
  el.appendChild(root);

  const panes = (D.clips || []).map((c) => {
    const pane = h('div', `itd-h-pane${c.bad ? ' bad' : ''}`);
    const box = h('div', 'itd-box');
    const lab = h('p', 'itd-chip itd-h-lab'); lab.append(h('i'), h('b', null, c.label));
    pane.append(box, lab);
    root.append(pane);
    return stack(box, c.frames.map((f) => mediaUrl(ctx, f)), c.frames.map((f, j) => `${c.label}, ${times[j].toFixed(1)} s on the shared clock`));
  });

  // readout: the shared clock, the phase of the flip, and where this is on the clock
  const hud = h('div', 'rx-hud');
  const clock = h('div', 'itd-h-clock');
  const clockB = h('b');
  clock.append(h('p', 'itd-kicker', D.clockLabel || 'Shared clock'), clockB);
  const right = h('div');
  const phase = h('div', 'itd-h-phase');
  const track = h('div', 'itd-h-track');
  for (const m of marks) { const t = h('span', 'itd-h-tick'); t.style.left = `${(m.t / span) * 100}%`; track.append(t); }
  const at = h('span', 'itd-h-at');
  track.append(at);
  right.append(phase, track);
  hud.append(clock, right);
  root.append(hud);

  // stacked panes on a tall stage, side by side on a very wide one
  function layout() { root.classList.toggle('side', el.clientWidth / Math.max(1, el.clientHeight) > 1.9); }

  let shown = -1;
  function setProgress(p, step, stepP) {
    const g = groups[clamp(step | 0, 0, groups.length - 1)] || [0];
    const q = clamp(stepP, 0, 0.9999);
    // the first still of a step holds a little longer, then the rest follow evenly
    const j = g.length === 1 ? 0 : Math.min(g.length - 1, Math.floor(Math.max(0, (q - 0.08) / 0.92) * g.length));
    const f = g[j];
    if (f === shown) return;
    shown = f;
    for (const pics of panes) pics.show(f);
    const t = times[f];
    clockB.textContent = `${t.toFixed(1)} s`;
    let m = null;
    for (const k of marks) if (t + 0.05 >= k.t) m = k;
    phase.textContent = m ? m.label : (D.before || 'Before the flip');
    at.style.left = `${(t / span) * 100}%`;
  }

  const ro = new ResizeObserver(layout);
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
