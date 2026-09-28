// 2D flow diagram driven by the scroll (inline SVG, no WebGL). The boxes light up in order as the
// reader scrolls and a dot carries the message (or the drawing, or the step) along each arrow.
// Wide stages: boxes left to right in rows, a connector wrapping from the end of one row to the start
// of the next, side branches (fallbacks, rejects) in dashed boxes under their box. Narrow stages: one
// column, branches inside their box, and the column slides so the active box stays in view.
// data: { boxes: [{ t, s, edge, branch: { t, s, edge, tone, into, back, backEdge } }], label, note,
//         chips, tally: { title, rows: [{ l, v, at }] }, minBox, steps }
// With scrolly steps, data.steps[i].to is the box the flow has reached by the end of step i (the
// page's step `view`); without steps the whole flow plays through the pinned length.
// Every picture is a pure function of (p, step, stepP).
const NS = 'http://www.w3.org/2000/svg';
const C = {
  box: 'rgba(255,255,255,0.045)', line: 'rgba(237,232,226,0.2)', text: '#eee9e3', sub: '#b8b0a7', muted: '#8c847b',
  accent: '#ff6b35', reject: '#e0a39a', arrow: 'rgba(237,232,226,0.5)',
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

let ctx2d = null;
function measure(text, px, weight, family) {
  ctx2d ||= document.createElement('canvas').getContext('2d');
  ctx2d.font = `${weight} ${px}px ${family}`;
  return ctx2d.measureText(text).width;
}
function wrap(text, width, px, weight, family) {
  const out = [];
  for (const para of String(text || '').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${word}` : word;
      if (measure(t, px, weight, family) > width && line) { out.push(line); line = word; } else line = t;
    }
    if (line) out.push(line);
  }
  return out;
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function mount(el, ctx) {
  const d = ctx.data || {};
  const boxes = d.boxes || [];
  const n = boxes.length;
  const views = Array.isArray(d.steps) ? d.steps : [];
  const family = getComputedStyle(el).fontFamily || 'system-ui, sans-serif';
  const holder = document.createElement('div');
  Object.assign(holder.style, { position: 'absolute', inset: '0', zIndex: 5, overflow: 'hidden' });
  const pan = document.createElement('div');
  Object.assign(pan.style, { position: 'absolute', left: '0', right: '0', top: '0', willChange: 'transform' });
  holder.append(pan);
  el.append(holder);

  // the tally: numbers that come in as the flow reaches their box
  let hud = null, tallyRows = [], tallyMini = null;
  if (d.tally?.rows?.length) {
    hud = document.createElement('div');
    hud.className = 'rx-hud';
    Object.assign(hud.style, { top: 'auto', bottom: '14px', zIndex: 6 });
    const max = Math.max(...d.tally.rows.map((r) => r.v));
    hud.innerHTML = `<div style="font-size:var(--rx-ov-small);font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)">${esc(d.tally.title || '')}</div>${
      d.tally.rows.map((r) => `<div class="rx-hud-row rx-hud-x" style="margin-top:7px"><span>${esc(r.l)}</span><b class="num">${r.v.toLocaleString('en-US')}</b><i><em style="width:0"></em></i></div>`).join('')
    }<div class="rx-hud-mini num"></div>`;
    tallyRows = [...hud.querySelectorAll('.rx-hud-row')].map((row, i) => ({ row, bar: row.querySelector('em'), f: d.tally.rows[i].v / max, at: d.tally.rows[i].at, shown: '' }));
    tallyMini = hud.querySelector('.rx-hud-mini');
    holder.append(hud);
  }

  function text(x, y, lines, px, weight, fill, anchor = 'start', lh = 1.32) {
    return lines.map((l, i) => `<text x="${x.toFixed(1)}" y="${(y + i * px * lh).toFixed(1)}" font-size="${px}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(l)}</text>`).join('');
  }
  const rect = (x, y, w, h, o = {}) => `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="12" fill="${C.box}" stroke="${o.tone === 'reject' ? 'rgba(224,163,154,0.6)' : C.line}" stroke-width="1"${o.dashed ? ' stroke-dasharray="5 4"' : ''}/>`;
  const arrowHead = (x, y, dir, color) => {
    const s = 5.5;
    const pts = dir === 'right' ? [[x, y], [x - s * 1.6, y - s], [x - s * 1.6, y + s]]
      : dir === 'down' ? [[x, y], [x - s, y - s * 1.6], [x + s, y - s * 1.6]]
        : dir === 'up' ? [[x, y], [x - s, y + s * 1.6], [x + s, y + s * 1.6]]
          : [[x, y], [x + s * 1.6, y - s], [x + s * 1.6, y + s]];
    return `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z" fill="${color}"/>`;
  };
  const PAD = 12;
  let TP = 14, SP = 12.5;
  function layoutBox(o, w) {
    const tl = wrap(o.t, w - 2 * PAD, TP, 650, family);
    const sl = wrap(o.s, w - 2 * PAD, SP, 450, family);
    return { tl, sl, h: PAD * 2 + tl.length * TP * 1.3 + (sl.length ? 6 + sl.length * SP * 1.32 : 0) };
  }
  const boxText = (x, y, L, tone) => text(x + PAD, y + PAD + TP * 0.95, L.tl, TP, 650, tone === 'reject' ? C.reject : C.text)
    + (L.sl.length ? text(x + PAD, y + PAD + L.tl.length * TP * 1.3 + 6 + SP * 0.95, L.sl, SP, 450, C.sub) : '');

  // geometry of the last layout, for setProgress
  let G = null, lastW = 0, lastH = 0, lastQ = null;

  function render() {
    const Wst = holder.clientWidth, Hst = holder.clientHeight;
    if (Wst < 200 || Hst < 120 || (Wst === lastW && Hst === lastH)) return;
    lastW = Wst; lastH = Hst;
    const padX = Wst >= 700 ? 36 : 16;
    const W = Math.floor(Wst - 2 * padX);
    TP = W >= 800 ? 16 : W >= 640 ? 15 : 14; SP = W >= 800 ? 14 : W >= 640 ? 13.5 : 12.5;
    const gap = clamp(W * 0.045, 36, 60), mR = 22;
    const minBox = d.minBox || 180;
    const most = W >= 560 ? clamp(Math.floor((W - mR + gap) / (minBox + gap)), 1, n) : 1;
    const cols = Math.ceil(n / Math.ceil(n / most)); // rows as even as they can be
    const grid = cols >= 2;
    const parts = []; // svg pieces: [kind, index, markup]
    const centers = new Array(n);
    const edges = new Array(n); // edge into box i: path d
    let H = 0;
    if (grid) {
      const rows = Math.ceil(n / cols);
      const bw = (W - mR - gap * (cols - 1)) / cols;
      let y = 0;
      for (let r = 0; r < rows; r++) {
        const row = boxes.slice(r * cols, r * cols + cols);
        const Ls = row.map((o) => layoutBox(o, bw));
        const bh = Math.max(...Ls.map((L) => L.h));
        const top = y + 34;
        row.forEach((o, c) => {
          const i = r * cols + c, x = c * (bw + gap);
          centers[i] = [x + bw / 2, top + bh / 2];
          parts.push(['b', i, rect(x, top, bw, bh, o) + boxText(x, top, Ls[c])]);
          if (c > 0) {
            const x0 = x - gap + 3, x1 = x - 3, ym = top + bh / 2;
            edges[i] = `M${x0.toFixed(1)} ${ym.toFixed(1)}H${(x1 - 7).toFixed(1)}`;
            let lab = '';
            if (o.edge) {
              const ls = wrap(o.edge, gap + bw * 0.55, 12.5, 500, family);
              lab = text(x - gap / 2, top - 8 - (ls.length - 1) * 14, ls, 12.5, 500, C.muted, 'middle');
            }
            parts.push(['e', i, `<path d="${edges[i]}" stroke="${C.arrow}" stroke-width="1.6" fill="none"/>${arrowHead(x1, ym, 'right', C.arrow)}${lab}`]);
          }
        });
        // branches under their box
        let bmax = 0;
        row.forEach((o, c) => {
          if (!o.branch) return;
          const i = r * cols + c, x = c * (bw + gap), by = top + bh + 40;
          const B = layoutBox(o.branch, bw);
          const col = o.branch.tone === 'reject' ? 'rgba(224,163,154,0.7)' : C.arrow;
          let s = o.branch.into
            ? `<path d="M${x + bw / 2} ${by - 3}V${top + bh + 9}" stroke="${col}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>${arrowHead(x + bw / 2, top + bh + 3, 'up', col)}`
            : `<path d="M${x + bw / 2} ${top + bh + 3}V${by - 8}" stroke="${col}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>${arrowHead(x + bw / 2, by - 3, 'down', col)}`;
          if (o.branch.edge) s += text(x + bw / 2 + 8, top + bh + 24, [o.branch.edge], 12.5, 500, C.muted);
          s += rect(x, by, bw, B.h, { ...o.branch, dashed: true }) + boxText(x, by, B, o.branch.tone);
          const j = o.branch.back != null ? i - c + o.branch.back : -1; // back into a box of the same row
          if (j > i && Math.floor(j / cols) === r && j < n) {
            const xj = (j % cols) * (bw + gap) + bw / 2;
            s += `<path d="M${x + bw} ${by + B.h / 2}H${xj}V${top + bh + 9}" stroke="${C.arrow}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>${arrowHead(xj, top + bh + 3, 'up', C.arrow)}`;
            if (o.branch.backEdge) s += text((x + bw + xj) / 2, by + B.h / 2 - 7, [o.branch.backEdge], 12.5, 500, C.muted, 'middle');
          }
          parts.push(['r', i, s]);
          bmax = Math.max(bmax, 40 + B.h);
        });
        y = top + bh + bmax;
        // wrap to the next row
        const next = (r + 1) * cols;
        if (next < n) {
          const lastX = (row.length - 1) * (bw + gap) + bw, ym = top + bh / 2;
          const chan = y + 20;
          edges[next] = `M${(lastX + 3).toFixed(1)} ${ym.toFixed(1)}H${lastX + mR - 4}V${chan.toFixed(1)}H${(bw / 2).toFixed(1)}V${(chan + 36 - 9).toFixed(1)}`;
          parts.push(['e', next, `<path d="${edges[next]}" stroke="${C.arrow}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>${arrowHead(bw / 2, chan + 36 - 3, 'down', C.arrow)}${boxes[next].edge ? text((lastX + mR + bw / 2) / 2, chan - 7, [boxes[next].edge], 12.5, 500, C.muted, 'middle') : ''}`]);
          y = chan + 36 - 34;
        }
      }
      H = y + 6;
    } else {
      let y = 0;
      boxes.forEach((o, i) => {
        if (i > 0) {
          edges[i] = `M22 ${y + 2}V${y + 30}`;
          parts.push(['e', i, `<path d="${edges[i]}" stroke="${C.arrow}" stroke-width="1.6" fill="none"/>${arrowHead(22, y + 36, 'down', C.arrow)}${o.edge ? text(36, y + 23, wrap(o.edge, W - 50, 12.5, 500, family).slice(0, 1), 12.5, 500, C.muted) : ''}`]);
          y += 38;
        }
        const L = layoutBox(o, W);
        let extra = 0, BL = null;
        if (o.branch) { BL = layoutBox({ t: o.branch.t, s: o.branch.s }, W - 28); extra = 10 + 20 + BL.h; }
        let s = rect(0, y, W, L.h + extra, o) + boxText(0, y, L);
        if (BL) {
          const by = y + L.h + 20;
          s += text(14, by - 6, [`${o.branch.edge ? `${o.branch.edge}:` : ''}`], 12.5, 500, C.muted);
          s += rect(14, by, W - 28, BL.h, { dashed: true, tone: o.branch.tone }) + boxText(14, by, BL, o.branch.tone);
        }
        parts.push(['b', i, s]);
        centers[i] = [W / 2, y + (L.h + extra) / 2];
        y += L.h + extra;
      });
      H = y + 4;
    }
    // footer: chips and note
    let foot = '', fy = H + 22;
    if (d.chips?.length) {
      let x = 0;
      for (const c of d.chips) {
        const w = measure(c, 12.5, 600, family) + 26;
        if (x + w > W) { x = 0; fy += 36; }
        foot += `<rect x="${x}" y="${fy - 18}" width="${w.toFixed(1)}" height="28" rx="14" fill="rgba(255,255,255,0.05)" stroke="${C.line}"/>${text(x + 13, fy + 0.5, [c], 12.5, 600, C.text)}`;
        x += w + 8;
      }
      fy += 30;
    }
    if (d.note) {
      const ls = wrap(d.note, W, 13, 500, family);
      foot += text(0, fy, ls, 13, 500, C.sub);
      fy += ls.length * 17;
    }
    const total = Math.ceil((foot ? fy : H) + 4);
    const token = '<circle data-token r="6" fill="#ff6b35" stroke="#fff1e2" stroke-width="2" opacity="0"/>';
    const byKind = (k) => parts.filter((p) => p[0] === k).map(([kind, i, s]) => `<g data-${kind}="${i}">${s}</g>`).join('');
    pan.innerHTML = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${total}" width="${W}" height="${total}" role="img" aria-label="${esc(d.label || 'Diagram')}" style="display:block;margin:0 auto;overflow:visible;font-family:inherit">${byKind('r')}${byKind('e')}${byKind('b')}${foot ? `<g data-foot>${foot}</g>` : ''}${token}</svg>`;
    const svg = pan.firstChild;
    const q = (sel) => [...svg.querySelectorAll(sel)];
    const els = {
      b: new Array(n), e: new Array(n), r: new Array(n),
      token: svg.querySelector('[data-token]'),
      foot: svg.querySelector('[data-foot]'),
    };
    for (const k of ['b', 'e', 'r']) for (const g of q(`[data-${k}]`)) els[k][Number(g.getAttribute(`data-${k}`))] = { g, rect: g.querySelector('rect'), path: g.querySelector('path'), state: '' };
    for (const e of els.e) if (e) e.len = e.path.getTotalLength();
    // room: below the diagram the tally sits at the bottom of the stage on a wide screen
    const hudH = hud ? hud.offsetHeight + 28 : 0;
    const room = Hst - hudH;
    G = { W, total, centers, els, room, fits: total <= room - 24, padTop: 18 };
    lastQ = null;
    if (cur != null) apply(cur);
  }

  // box i: 'f' (not reached), 'a' (active), 'd' (done)
  const STYLE = {
    f: { op: '0.28', stroke: C.line, sw: '1', fill: C.box },
    a: { op: '1', stroke: C.accent, sw: '2', fill: 'rgba(255,107,53,0.16)' },
    d: { op: '1', stroke: 'rgba(255,107,53,0.5)', sw: '1.3', fill: 'rgba(255,107,53,0.06)' },
  };
  function setBox(b, st, reject) {
    if (!b || b.state === st) return;
    b.state = st;
    const s = STYLE[st];
    b.g.setAttribute('opacity', s.op);
    if (b.rect && !reject) { b.rect.setAttribute('stroke', s.stroke); b.rect.setAttribute('stroke-width', s.sw); b.rect.setAttribute('fill', s.fill); }
  }
  let cur = null;
  function apply(qv) {
    if (!G || qv === lastQ) return;
    lastQ = qv;
    const i = clamp(Math.floor(qv), 0, n - 1), f = qv - i;
    for (let k = 0; k < n; k++) {
      const st = k < i ? 'd' : k === i ? 'a' : 'f';
      setBox(G.els.b[k], st);
      const e = G.els.e[k];
      if (e) { const es = k <= i ? 'e' : 'f'; if (e.state !== es) { e.state = es; e.g.setAttribute('opacity', es === 'e' ? '1' : '0.25'); } }
      const r = G.els.r[k];
      if (r) { const rs = k <= i ? 'e' : 'f'; if (r.state !== rs) { r.state = rs; r.g.setAttribute('opacity', rs === 'e' ? '0.9' : '0.2'); } }
    }
    if (G.els.foot) G.els.foot.setAttribute('opacity', qv >= n - 1 - 1e-6 ? '1' : '0.4');
    // the dot rides the arrow into the next box through the second half of the way there
    const e = G.els.e[i + 1], tok = G.els.token;
    const u = smooth(0.4, 0.95, f);
    if (e && u > 0 && u < 1 && !ctx.reducedMotion) {
      const pt = e.path.getPointAtLength(e.len * u);
      tok.setAttribute('cx', pt.x.toFixed(1)); tok.setAttribute('cy', pt.y.toFixed(1)); tok.setAttribute('opacity', '1');
    } else tok.setAttribute('opacity', '0');
    // keep the active box in view: centre the diagram when it fits, else slide it
    let ty;
    if (G.fits) ty = Math.max(G.padTop, (G.room - G.total) / 2);
    else {
      const j = Math.min(n - 1, i + 1);
      const k = smooth(0.4, 1, f);
      const cy = G.centers[i][1] + (G.centers[j][1] - G.centers[i][1]) * k;
      ty = clamp(G.room * 0.45 - cy, G.room - G.total - 16, G.padTop);
    }
    pan.style.transform = `translateY(${ty.toFixed(1)}px)`;
    // the tally
    for (const r of tallyRows) {
      const w = `${(r.f * smooth(r.at - 0.4, r.at, qv) * 100).toFixed(1)}%`;
      if (r.shown !== w) { r.bar.style.width = w; r.row.style.opacity = qv >= r.at - 0.4 ? '1' : '0.35'; r.shown = w; }
    }
    if (tallyMini) {
      const got = d.tally.rows.filter((r) => qv >= r.at - 0.05);
      const t = got.length ? got.map((r) => `${r.l} ${r.v.toLocaleString('en-US')}`).join(', ') : d.tally.rows[0] ? `${d.tally.rows[0].l} ${d.tally.rows[0].v.toLocaleString('en-US')}` : '';
      if (tallyMini.textContent !== t) tallyMini.textContent = t;
    }
  }

  function setProgress(p, step = 0, sp = 0) {
    let qv;
    if (views.length) {
      const s = clamp(step | 0, 0, views.length - 1);
      const to = clamp(views[s].to ?? n - 1, 0, n - 1), from = s > 0 ? clamp(views[s - 1].to ?? 0, 0, n - 1) : 0;
      // done by 55% of each step: the last step only gets to about 60% before the stage unpins
      qv = from + (to - from) * smooth(0.05, 0.55, sp);
    } else qv = (n - 1) * smooth(0.1, 0.85, p);
    if (ctx.reducedMotion) qv = Math.round(qv);
    cur = qv;
    apply(qv);
  }

  const ro = new ResizeObserver(() => render());
  ro.observe(holder);
  (document.fonts?.ready || Promise.resolve()).then(() => { lastW = 0; render(); });
  render();
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ro.disconnect(); holder.remove(); } };
}
