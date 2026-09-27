// The season from the official FIRST results, one event per step of the text. A column per event,
// in date order, shows where we finished in that event's field (top = 1st, baseline = last; the
// label on the cap is the rank). Under it, one square per qualification match: filled for a win,
// hollow for a loss, dashed for the surrogate match that did not count. The panel beside the chart
// gives the current event's matches, scores and awards; on the Union Bridge step the five result
// screens we photographed that day flip by, one per fifth of the step. A column grows from the
// baseline over the first part of its step (cut with reduced motion). The results table in the
// text below is the same data. Every picture is a pure function of (step, stepP).
import { css, h, svg, clamp, smooth, setter, mediaUrl, cardCover } from './kit.js';

const LOCAL_CSS = `
.pp-se { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: 22px; padding: 26px 26px 20px; }
.pp-se-chart { position: relative; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; }
.pp-se-chart > header { display: grid; gap: 2px; margin-bottom: 10px; }
.pp-se-chart > header b { font-size: 16px; font-weight: 650; color: var(--text); }
.pp-se-chart > header span { font-size: 12.5px; color: var(--muted); }
.pp-se-plot { position: relative; min-height: 0; }
.pp-se-plot svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.pp-se-grid { stroke: rgba(237, 232, 226, 0.12); stroke-width: 1; shape-rendering: crispEdges; }
.pp-se-axis { font-size: 11.5px; fill: var(--muted); }
.pp-se-col { fill: #ff6b35; }
.pp-se-col.past { fill: rgba(255, 107, 53, 0.42); }
.pp-se-cap { font-size: 14px; font-weight: 650; fill: var(--text); text-anchor: middle; font-variant-numeric: tabular-nums; }
.pp-se-cap.past { fill: var(--text-2); font-weight: 550; }
.pp-se-foot { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); margin-top: 10px; }
.pp-se-ev { display: grid; justify-items: center; gap: 5px; text-align: center; min-width: 0; opacity: 0.4; }
.pp-se-ev.seen { opacity: 0.75; }
.pp-se-ev.on { opacity: 1; }
.pp-se-ev b { font-size: 13px; font-weight: 650; color: var(--text); line-height: 1.2; }
.pp-se-ev small { font-size: 11.5px; color: var(--muted); }
.pp-se-wl { display: flex; gap: 3px; }
.pp-se-wl i { width: 10px; height: 10px; border-radius: 2px; border: 1.5px solid rgba(237, 232, 226, 0.5); }
.pp-se-wl i.w { background: #ff6b35; border-color: #ff6b35; }
.pp-se-wl i.s { border-style: dashed; border-color: rgba(237, 232, 226, 0.35); }
.pp-se-panel { position: relative; min-width: 0; min-height: 0; display: grid; grid-template-rows: auto auto auto minmax(0, 1fr); gap: 12px; padding: 18px 18px 16px; border-radius: 16px; background: rgba(10, 8, 7, 0.55); border: 1px solid rgba(255, 255, 255, 0.1); }
.pp-se-panel h4 { margin: 0; font-size: 17px; line-height: 1.25; font-weight: 700; color: var(--text); }
.pp-se-panel .dt { display: block; margin-top: 3px; font-size: 12.5px; font-weight: 500; color: var(--muted); }
.pp-se-big { display: flex; gap: 22px; flex-wrap: wrap; }
.pp-se-big div { display: grid; }
.pp-se-big b { font-size: 30px; line-height: 1.05; font-weight: 750; color: var(--text); font-variant-numeric: tabular-nums; }
.pp-se-big span { font-size: 11px; font-weight: 650; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); }
.pp-se-list { margin: 0; padding: 0; list-style: none; display: grid; gap: 0; align-content: start; overflow: hidden; }
.pp-se-list li { display: grid; grid-template-columns: 50px 16px minmax(0, 1fr); align-items: center; gap: 8px; padding: 5px 0; border-top: 1px solid rgba(255, 255, 255, 0.07); font-size: 13px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.pp-se-list li:first-child { border-top: 0; }
.pp-se-list li b { color: var(--text); font-weight: 650; }
.pp-se-list li i { width: 10px; height: 10px; border-radius: 2px; border: 1.5px solid rgba(237, 232, 226, 0.5); }
.pp-se-list li i.w { background: #ff6b35; border-color: #ff6b35; }
.pp-se-list li i.s { border-style: dashed; border-color: rgba(237, 232, 226, 0.35); }
.pp-se-list li.aw { grid-template-columns: 16px minmax(0, 1fr); color: var(--text); }
.pp-se-list li.aw i { border-radius: 50%; background: none; border-color: #ff6b35; }
.pp-se-list li.note { grid-template-columns: minmax(0, 1fr); color: var(--muted); font-size: 12px; }
.pp-se-shot { position: relative; min-height: 0; border-radius: 10px; overflow: hidden; background: #0c0a09; }
.pp-se-shot img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: 0; }
.pp-se-shot .pp-chip { position: absolute; left: 8px; bottom: 8px; z-index: 2; }
.pp-se-src { position: absolute; right: 26px; bottom: 6px; margin: 0; font-size: 11px; color: var(--muted); }
@media (max-width: 900px) {
  .pp-se { grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr) minmax(0, 1.15fr); gap: 8px; padding: 10px 10px 16px; }
  .pp-se-chart > header { margin-bottom: 4px; }
  .pp-se-chart > header b { font-size: 13.5px; }
  .pp-se-chart > header span { display: none; }
  .pp-se-cap { font-size: 11.5px; }
  .pp-se-axis { font-size: 10px; }
  .pp-se-foot { margin-top: 4px; }
  .pp-se-ev b { font-size: 10.5px; }
  .pp-se-ev small { display: none; }
  .pp-se-wl i { width: 7px; height: 7px; }
  .pp-se-panel { grid-template-rows: auto auto auto minmax(0, 1fr); padding: 10px 12px; gap: 6px; }
  .pp-se-panel h4 { font-size: 14px; }
  .pp-se-list li.mt, .pp-se-list li.note { display: none; }
  .pp-se-list li.aw { padding: 2px 0; font-size: 12px; }
  .pp-se-shot .pp-chip { display: none; }
  .pp-se-panel .dt { display: inline; margin-left: 6px; }
  .pp-se-big { gap: 12px; }
  .pp-se-big b { font-size: 20px; }
  .pp-se-big span { font-size: 9.5px; }
  .pp-se-list li { font-size: 11.5px; padding: 3px 0; grid-template-columns: 38px 12px minmax(0, 1fr); gap: 6px; }
  .pp-se-list li i { width: 8px; height: 8px; }
  .pp-se-src { right: 10px; bottom: 2px; font-size: 10px; }
}
`;

const ord = (n) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] || 'th'}`;

export function mount(el, ctx) {
  css('pp-se-css', LOCAL_CSS);
  const D = ctx.data;
  const E = D.events || [];
  const reduced = ctx.reducedMotion;
  const S = setter();
  const small = el.clientWidth < 700;
  const root = h('div', 'pp pp-se');
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', D.aria || 'Our 2022-23 season in the official results');
  el.appendChild(root);

  // ---- the chart
  const chart = h('div', 'pp-se-chart');
  const head = h('header');
  head.append(h('b', null, D.title || 'Where we finished at each event'), h('span', null, D.sub || 'Top of the chart is 1st place, the baseline is last'));
  const plot = h('div', 'pp-se-plot');
  const s = svg('svg', { 'aria-hidden': 'true' }, plot);
  const gGrid = svg('g', {}, s);
  const top = svg('line', { class: 'pp-se-grid' }, gGrid);
  const mid = svg('line', { class: 'pp-se-grid' }, gGrid);
  const base = svg('line', { class: 'pp-se-grid' }, gGrid);
  const lTop = svg('text', { class: 'pp-se-axis' }, gGrid); lTop.textContent = '1st';
  const lBase = svg('text', { class: 'pp-se-axis' }, gGrid); lBase.textContent = 'Last';
  const cols = E.map(() => ({ bar: svg('path', { class: 'pp-se-col' }, s), cap: svg('text', { class: 'pp-se-cap' }, s) }));
  const foot = h('div', 'pp-se-foot');
  const evs = E.map((e) => {
    const d = h('div', 'pp-se-ev');
    const wl = h('div', 'pp-se-wl');
    for (const m of e.matches) { const i = h('i', m.s ? 's' : m.w ? 'w' : ''); wl.append(i); }
    d.append(h('b', null, e.short), h('small', null, e.date), wl);
    foot.append(d);
    return d;
  });
  chart.append(head, plot, foot);

  // ---- the panel for the current event
  const panel = h('div', 'pp-se-panel');
  const ph = h('h4');
  const big = h('div', 'pp-se-big');
  const list = h('ul', 'pp-se-list');
  const shot = h('div', 'pp-se-shot');
  const shotTag = h('p', 'pp-chip');
  const shots = (D.shots || []).map((sh) => { const im = h('img'); im.alt = sh.c; im.decoding = 'async'; shot.append(im); return im; });
  shot.append(shotTag);
  panel.append(ph, big, list, shot);
  const src = h('p', 'pp-se-src', D.source || '');
  root.append(chart, panel, src);

  let loadedShots = false;
  function loadShots() {
    if (loadedShots) return;
    loadedShots = true;
    (D.shots || []).forEach((sh, i) => { shots[i].src = mediaUrl(ctx, sh.i, small); });
  }

  // geometry of the plot, measured on resize
  let G = null;
  function layout() {
    const left = cardCover(el, ctx);
    root.style.paddingLeft = left ? `${left + 20}px` : '';
    const r = plot.getBoundingClientRect();
    const W = Math.max(10, r.width), H = Math.max(10, r.height);
    const padT = 26, padB = 2, padL = 34;
    const y0 = H - padB, y1 = padT;
    const slot = (W - padL) / Math.max(1, E.length);
    const bw = Math.min(26, slot * 0.4);
    for (const [ln, y] of [[top, y1], [mid, (y0 + y1) / 2], [base, y0]]) {
      ln.setAttribute('x1', padL - 6); ln.setAttribute('x2', W); ln.setAttribute('y1', y.toFixed(1)); ln.setAttribute('y2', y.toFixed(1));
    }
    lTop.setAttribute('x', 0); lTop.setAttribute('y', (y1 + 4).toFixed(1));
    lBase.setAttribute('x', 0); lBase.setAttribute('y', (y0 - 3).toFixed(1));
    G = { W, H, y0, y1, slot, bw, padL };
  }
  // a column from the baseline with a 4 px rounded data end, square at the baseline
  function colPath(x, w, y0, y) {
    const r = Math.min(4, w / 2, Math.max(0, y0 - y));
    return `M${x},${y0} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y0} Z`;
  }

  let shownStep = -1, shownShot = -2, last = [0, 0, 0];
  function setProgress(p, step, stepP) {
    last = [p, step, stepP];
    if (!G) layout();
    const st = clamp(step | 0, 0, E.length - 1);
    const q = clamp(stepP, 0, 1);
    E.forEach((e, i) => {
      const v = (e.teams - e.rank) / (e.teams - 1); // share of the field below us: 1 = 1st, 0 = last
      const grow = i < st ? 1 : i > st ? 0 : reduced ? 1 : smooth(0, 0.4, q);
      const x = G.padL + G.slot * i + (G.slot - G.bw) / 2;
      const y = G.y0 - (G.y0 - G.y1) * Math.max(0.012, v) * grow;
      const c = cols[i];
      S.attr(c.bar, 'd', grow > 0 ? colPath(x, G.bw, G.y0, y) : '');
      S.attr(c.bar, 'class', `pp-se-col${i < st ? ' past' : ''}`);
      S.attr(c.cap, 'x', (x + G.bw / 2).toFixed(1));
      S.attr(c.cap, 'y', (y - 8).toFixed(1));
      S.attr(c.cap, 'class', `pp-se-cap${i < st ? ' past' : ''}`);
      S.text(c.cap, grow > 0.98 ? `${ord(e.rank)} of ${e.teams}` : '');
      S.cls(evs[i], 'on', i === st);
      S.cls(evs[i], 'seen', i < st);
    });
    if (st !== shownStep) {
      shownStep = st;
      const e = E[st];
      ph.replaceChildren(document.createTextNode(e.name), h('span', 'dt', e.long));
      big.replaceChildren();
      for (const [v, l] of [[`${ord(e.rank)} / ${e.teams}`, 'Rank'], [e.quals, 'Qualification'], ...(e.playoffs ? [[e.playoffs, 'Playoffs']] : [])]) {
        const d = h('div'); d.append(h('b', null, v), h('span', null, l)); big.append(d);
      }
      list.replaceChildren();
      for (const m of e.matches) {
        const li = h('li', 'mt');
        li.append(h('span', null, m.m), h('i', m.s ? 's' : m.w ? 'w' : ''));
        const t = h('span');
        t.append(h('b', null, m.score), document.createTextNode(m.s ? ' surrogate, not counted' : m.w ? ' win' : ' loss'));
        li.append(t);
        list.append(li);
      }
      for (const a of e.awards || []) { const li = h('li', 'aw'); li.append(h('i'), h('span', null, a)); list.append(li); }
      if (e.note) list.append(h('li', 'note', e.note));
      const withShots = !!e.shots;
      shot.hidden = !withShots;
      if (withShots) loadShots();
      root.setAttribute('aria-label', `${e.name}, ${e.long}: ranked ${e.rank} of ${e.teams}, ${e.quals} in qualification matches${(e.awards || []).length ? `, ${e.awards.join(', ')}` : ''}`);
    }
    // result screens flip one per fifth of the Union Bridge step
    const e = E[st];
    let k = -1;
    if (e.shots) k = Math.min(shots.length - 1, Math.floor(clamp((q - 0.1) / 0.85, 0, 0.9999) * shots.length));
    if (k !== shownShot) {
      shownShot = k;
      shots.forEach((im, i) => S.style(im, 'opacity', i === k ? '1' : '0'));
      if (k >= 0) S.text(shotTag, D.shots[k].c);
      list.querySelectorAll('li').forEach((li, i) => S.style(li, 'color', k >= 0 && i === k ? 'var(--text)' : ''));
    }
  }

  const ro = new ResizeObserver(() => { layout(); shownStep = -1; shownShot = -2; setProgress(...last); });
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); root.remove(); } };
}
