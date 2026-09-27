// The five intake versions of the season, in Jerry's order, each with its real clip and one line on
// what it did and what went wrong. Nothing plays until the reader presses play; after that, moving
// to another version plays that version's clip. Arrow keys, the numbered rail, the buttons under
// the stage and horizontal swipes all move between versions.
import { css, h, clip, onSwipe, rich, PLAY_SVG } from './kit.js';

const LOCAL_CSS = `
.itd-s { display: grid; grid-template-columns: minmax(0, 1.45fr) minmax(0, 1fr); outline: none; }
.itd-s-media { position: relative; }
.itd-s-slot { position: absolute; inset: 0; opacity: 0; pointer-events: none; }
.itd-s-slot.on { opacity: 1; pointer-events: auto; }
.itd-s-slot > video, .itd-s-slot > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
.itd-s-slot.in-r { animation: itd-s-in-r 0.28s var(--ease, ease) both; }
.itd-s-slot.in-l { animation: itd-s-in-l 0.28s var(--ease, ease) both; }
@keyframes itd-s-in-r { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes itd-s-in-l { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
.itd-reduced .itd-s-slot.in-r, .itd-reduced .itd-s-slot.in-l { animation: none; }
.itd-s-cap { position: absolute; left: 12px; right: 12px; bottom: 12px; z-index: 2; display: block; width: fit-content; max-width: calc(100% - 24px); border-radius: 10px; white-space: normal; }
.itd-s-card { display: flex; flex-direction: column; min-height: 0; padding: 20px 22px 18px; border-left: 1px solid var(--line); background: rgba(12, 10, 9, 0.55); overflow-y: auto; }
.itd-s-card > * { flex-shrink: 0; }
.itd-s-rail { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0; margin: 0 0 16px; padding: 0; list-style: none; position: relative; }
.itd-s-rail::before { content: ''; position: absolute; left: 10%; right: 10%; top: 15px; height: 2px; background: var(--line-strong); }
.itd-s-rail li { position: relative; display: grid; justify-items: center; }
.itd-s-dot { position: relative; z-index: 1; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: var(--bg); border: 2px solid var(--line-strong); color: var(--text-2); font-size: 13px; font-weight: 700; cursor: pointer; transition: border-color 0.2s, background 0.2s, color 0.2s; }
.itd-s-dot:hover { border-color: var(--accent); color: var(--text); }
.itd-s-dot[aria-current="step"] { background: var(--accent); border-color: var(--accent); color: #140c07; }
.itd-s-dot.done { border-color: rgba(255, 107, 53, 0.6); }
.itd-s-rail small { margin-top: 5px; font-size: 11px; line-height: 1.2; color: var(--muted); text-align: center; }
.itd-s-rail li.on small { color: var(--text); }
.itd-s-name { margin-top: 4px; font-size: clamp(20px, 2vw, 25px); font-weight: 780; font-stretch: 112%; letter-spacing: -0.015em; line-height: 1.12; }
.itd-s-dates { margin-top: 4px; font-size: 13.5px; color: var(--accent); font-weight: 600; }
.itd-s-line { margin-top: 10px; font-size: 15px; line-height: 1.55; color: var(--text-2); }
.itd-s-line b { color: var(--text); font-weight: 650; }
.itd-s-foot { margin-top: auto; padding-top: 12px; font-size: 12.5px; color: var(--muted); }
@media (max-width: 760px) {
  .itd-s { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) auto; }
  .itd-s-card { border-left: 0; border-top: 1px solid var(--line); padding: 12px 14px 12px; overflow: visible; }
  .itd-s-rail { margin-bottom: 8px; }
  .itd-s-rail small { display: none; }
  .itd-s-dot { width: 28px; height: 28px; font-size: 12px; }
  .itd-s-rail::before { top: 13px; }
  .itd-s-name { font-size: 18px; margin-top: 0; }
  .itd-s-line { font-size: 14px; margin-top: 6px; }
  .itd-s-foot { display: none; }
  .itd-s-cap { font-size: 11.5px; left: 8px; bottom: 8px; max-width: calc(100% - 16px); }
}
`;

const memory = {}; // the step each block was on, kept across unmount and remount

export function mount(el, ctx) {
  css();
  if (!document.getElementById('itd-s-css')) {
    const s = h('style'); s.id = 'itd-s-css'; s.textContent = LOCAL_CSS; document.head.appendChild(s);
  }
  const steps = ctx.data.steps || [];
  const root = h('div', `itd itd-s${ctx.reducedMotion ? ' itd-reduced' : ''}`);
  root.tabIndex = 0;
  root.setAttribute('role', 'group');
  root.setAttribute('aria-roledescription', 'stepper');
  root.setAttribute('aria-label', ctx.data.aria || 'Intake versions');
  el.appendChild(root);

  // ---- media: one slot per version, built when first shown
  const media = h('div', 'itd-media itd-s-media');
  const playBig = h('button', 'itd-play');
  playBig.type = 'button';
  playBig.innerHTML = PLAY_SVG;
  playBig.setAttribute('aria-label', 'Play the clip');
  const slots = steps.map(() => null);
  function slot(i) {
    if (slots[i]) return slots[i];
    const st = steps[i];
    const box = h('div', 'itd-s-slot');
    let c = null;
    if (st.v) {
      c = clip(ctx, st.v, st.c, { start: st.start });
      box.appendChild(c.el);
      c.el.addEventListener('click', () => { if (!ctx.reducedMotion) togglePlay(); });
    } else {
      const img = h('img'); img.alt = st.c || ''; img.decoding = 'async'; img.src = ctx.asset(`/assets/media/${ctx.slug}/${st.i}`);
      box.appendChild(img);
    }
    const cap = h('p', 'itd-chip itd-s-cap');
    rich(cap, st.c || '');
    box.appendChild(cap);
    media.insertBefore(box, playBig);
    slots[i] = { box, clip: c };
    return slots[i];
  }
  media.appendChild(playBig);

  // ---- card: rail, name, dates, line, problem or fix
  const card = h('div', 'itd-s-card');
  const rail = h('ol', 'itd-s-rail');
  const dots = steps.map((st, i) => {
    const li = h('li');
    const b = h('button', 'itd-s-dot', String(i + 1)); b.type = 'button';
    b.setAttribute('aria-label', `${i + 1}: ${st.name}`);
    b.addEventListener('click', () => go(i));
    li.append(b, h('small', null, st.short || ''));
    rail.append(li);
    return { li, b };
  });
  const kick = h('p', 'itd-kicker');
  const name = h('h3', 'itd-s-name');
  const dates = h('p', 'itd-s-dates');
  const line = h('p', 'itd-s-line');
  const flag = h('p', 'itd-flag');
  const foot = h('p', 'itd-s-foot', ctx.data.foot || '');
  card.append(rail, kick, name, dates, line, flag, foot);
  root.append(media, card);

  // ---- controls under the stage
  const prev = h('button', 'rx-ui rx-btn', 'Previous'); prev.type = 'button';
  const next = h('button', 'rx-ui rx-btn', 'Next'); next.type = 'button';
  const play = h('button', 'rx-ui rx-btn rx-play'); play.type = 'button';
  prev.addEventListener('click', () => go(cur - 1));
  next.addEventListener('click', () => go(cur + 1));
  play.addEventListener('click', () => togglePlay());
  playBig.addEventListener('click', (e) => { e.stopPropagation(); togglePlay(true); });
  ctx.panel?.append(prev, next, play);

  let cur = -1, playing = false;
  function paintPlay() {
    const s = slots[cur];
    const hasClip = !!s?.clip;
    play.disabled = !hasClip;
    play.style.opacity = hasClip ? '' : '0.45';
    play.setAttribute('aria-pressed', String(playing));
    play.innerHTML = playing
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10" rx="1"/><rect x="9.5" y="3" width="3" height="10" rx="1"/></svg><span>Pause clip</span>'
      : `${PLAY_SVG}<span>Play clip</span>`;
    playBig.hidden = !hasClip || playing || ctx.reducedMotion;
  }
  function togglePlay(on = !playing) {
    playing = on;
    const s = slots[cur];
    if (s?.clip) { if (playing) s.clip.play(); else s.clip.pause(); }
    paintPlay();
  }
  function go(i) {
    const n = steps.length;
    const to = ((i % n) + n) % n;
    if (to === cur) return;
    const dir = cur < 0 ? 0 : (i > cur ? 1 : -1);
    const old = slots[cur];
    if (old) { old.box.classList.remove('on', 'in-r', 'in-l'); old.clip?.pause(); }
    cur = to;
    memory[ctx.id] = cur;
    const s = slot(cur);
    s.box.classList.remove('in-r', 'in-l');
    void s.box.offsetWidth; // restart the slide-in
    s.box.classList.add('on');
    if (dir) s.box.classList.add(dir > 0 ? 'in-r' : 'in-l');
    const st = steps[cur];
    kick.textContent = `${ctx.data.kicker || 'Version'} ${cur + 1} of ${n}`;
    name.textContent = st.name;
    dates.textContent = st.dates;
    rich(line, st.line || '');
    if (st.flag) {
      flag.hidden = false;
      flag.className = `itd-flag${st.flag.type === 'fix' ? ' itd-flag-fix' : ''}`;
      flag.replaceChildren(h('span', null, st.flag.type === 'fix' ? 'Fix' : 'Problem'));
      flag.append(document.createTextNode(st.flag.text));
    } else flag.hidden = true;
    dots.forEach((d, j) => {
      d.b.setAttribute('aria-current', j === cur ? 'step' : 'false');
      d.b.classList.toggle('done', j < cur);
      d.li.classList.toggle('on', j === cur);
    });
    if (playing && s.clip) s.clip.play();
    paintPlay();
  }

  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { go(cur + 1); e.preventDefault(); }
    else if (e.key === 'ArrowLeft') { go(cur - 1); e.preventDefault(); }
    else if (e.key === ' ' && e.target === root) { togglePlay(); e.preventDefault(); }
  });
  const unswipe = onSwipe(media, (d) => go(cur + d));

  go(memory[ctx.id] || 0);
  return {
    dispose() {
      unswipe();
      for (const s of slots) s?.clip?.pause();
      root.remove();
    },
  };
}
