// Two bench tests of the December hand off, side by side and in sync: one where the sample drops
// into the bucket and one where it tips and falls out. Both clips are real, filmed from the same
// spot a few minutes apart; they are only shifted in time so the intake starts to flip at the same
// moment in both (lined up by eye, frame by frame). One clock drives both: play, slow down, or drag
// the time slider to step through the flip. Nothing loads or plays until the reader asks.
import { css, h, clip } from './kit.js';
import { slider, segmented, button } from '/assets/js/lib/ui.js';

const LOCAL_CSS = `
.itd-h { display: flex; gap: 10px; padding: 14px 14px 54px; }
.itd-h-pane { position: relative; flex: 1 1 0; min-width: 0; min-height: 0; border-radius: 12px; border: 1px solid var(--line); }
.itd-h-pane > video { cursor: pointer; object-fit: cover; }
.itd-h-lab { position: absolute; left: 10px; top: 10px; z-index: 2; }
.itd-h-lab i { width: 8px; height: 8px; border-radius: 50%; background: rgb(52, 199, 110); }
.itd-h-pane.bad .itd-h-lab i { background: rgb(255, 92, 92); }
.itd-h-phase { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); z-index: 2; white-space: nowrap; max-width: calc(100% - 24px); overflow: hidden; text-overflow: ellipsis; }
.itd-h-phase .num { font-variant-numeric: tabular-nums; color: var(--accent); font-weight: 650; }
.itd-h-go { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 3; }
.itd-h-jumps { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; }
@media (max-width: 700px) {
  .itd-h { flex-direction: column; padding: 10px 10px 48px; gap: 8px; }
  .itd-h-lab { left: 8px; top: 8px; font-size: 11.5px; padding: 4px 9px; }
  .itd-h-phase { font-size: 11.5px; bottom: 10px; }
  .itd-h-go { left: auto; right: 16px; transform: translateY(-50%); }
}
`;

const memory = {}; // shared time per block, kept across unmount and remount

export function mount(el, ctx) {
  css();
  if (!document.getElementById('itd-h-css')) {
    const s = h('style'); s.id = 'itd-h-css'; s.textContent = LOCAL_CSS; document.head.appendChild(s);
  }
  const D = ctx.data;
  const span = D.span || 8;
  const marks = (D.marks || []).slice().sort((a, b) => a.t - b.t);
  const root = h('div', `itd itd-h${ctx.reducedMotion ? ' itd-reduced' : ''}`);
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', D.aria || 'Two hand off tests in sync');
  el.appendChild(root);

  const vids = (D.clips || []).map((c) => {
    const pane = h('div', `itd-media itd-h-pane${c.bad ? ' bad' : ''}`);
    const cl = clip(ctx, c.v, c.label);
    cl.el.controls = false; // one shared clock drives both clips
    cl.el.loop = false;
    pane.appendChild(cl.el);
    const lab = h('p', 'itd-chip itd-h-lab');
    lab.append(h('i'), h('b', null, c.label));
    pane.appendChild(lab);
    cl.el.addEventListener('click', () => setPlaying(!playing));
    root.appendChild(pane);
    const v = cl.el;
    let pending = null;
    v.addEventListener('seeked', () => { if (pending != null) { const t = pending; pending = null; v.currentTime = t; } });
    const seek = (t) => {
      t = Math.max(0, t);
      if (v.readyState < 1) { v.addEventListener('loadedmetadata', () => seek(t), { once: true }); return; }
      if (v.seeking) pending = t; else v.currentTime = t;
    };
    return { c, cl, v, seek, off: c.off || 0 };
  });

  const phase = h('p', 'itd-chip itd-h-phase');
  root.appendChild(phase);
  const go = h('button', 'itd-chip itd-h-go', D.startLabel || 'Load both clips and step through the flip');
  go.type = 'button';
  go.style.cursor = 'pointer';
  go.addEventListener('click', () => { begin(); seekAll(s); });
  root.appendChild(go);

  let s = memory[ctx.id] ?? 0;
  let playing = false, rate = 1, started = false, stopLoop = null;

  function begin() {
    if (started) return;
    started = true;
    go.remove();
    for (const x of vids) x.cl.load();
  }
  function seekAll(t) { for (const x of vids) x.seek(x.off + t); }
  function paintPhase() {
    let m = null;
    for (const k of marks) if (s + 0.05 >= k.t) m = k;
    phase.replaceChildren(h('span', 'num', `${s.toFixed(1)} s`), document.createTextNode(m ? `  ${m.label}` : `  ${D.before || 'Before the flip'}`));
    memory[ctx.id] = s;
  }

  function loop() {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const [a, ...rest] = vids;
      if (!a || a.v.seeking || a.v.readyState < 2 || a.v.currentTime < a.off - 0.05) return; // not there yet
      s = Math.max(0, a.v.currentTime - a.off);
      if (s >= span || a.v.ended) { s = 0; seekAll(0); }
      for (const b of rest) {
        const want = b.off + s;
        if (!b.v.seeking && Math.abs(b.v.currentTime - want) > 0.12) b.v.currentTime = want;
        if (b.v.paused && playing) b.v.play().catch(() => {});
      }
      time.set(Math.min(span, Math.max(0, s)), { silent: true });
      paintPhase();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }
  function setPlaying(on) {
    begin();
    playing = on;
    playBtn.setAttribute('aria-pressed', String(on));
    playBtn.querySelector('span').textContent = on ? 'Pause' : 'Play both';
    if (on) {
      if (s >= span - 0.05) s = 0;
      seekAll(s);
      for (const x of vids) { x.v.playbackRate = rate; x.v.play().catch(() => {}); }
      stopLoop?.();
      stopLoop = loop();
    } else {
      for (const x of vids) x.v.pause();
      stopLoop?.(); stopLoop = null;
    }
  }

  // ---- controls
  const playBtn = button(ctx.panel, { label: '', onClick: () => setPlaying(!playing) });
  playBtn.classList.add('rx-play');
  playBtn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg><span>Play both</span>';
  playBtn.setAttribute('aria-pressed', 'false');
  segmented(ctx.panel, {
    label: 'Speed', value: 1,
    options: [{ value: 1, label: 'Full' }, { value: 0.25, label: 'Quarter' }],
    onChange: (v) => { rate = v; for (const x of vids) x.v.playbackRate = v; },
  });
  const time = slider(ctx.panel, {
    label: 'Time', min: 0, max: span, step: 0.05, value: s, unit: ' s',
    format: (v) => v.toFixed(1),
    onInput: (v) => { if (playing) setPlaying(false); begin(); s = v; seekAll(s); paintPhase(); },
  });
  if (marks.length && ctx.panel) {
    const jumps = h('div', 'rx-ui itd-h-jumps');
    jumps.append(h('span', 'rx-ui-l', D.jumpLabel || 'Jump to'));
    for (const m of marks) {
      button(jumps, { label: m.short || m.label, onClick: () => { if (playing) setPlaying(false); begin(); s = m.t; time.set(s, { silent: true }); seekAll(s); paintPhase(); } });
    }
    ctx.panel.appendChild(jumps);
  }
  paintPhase();

  return {
    dispose() {
      stopLoop?.();
      for (const x of vids) x.v.pause();
      root.remove();
    },
  };
}
