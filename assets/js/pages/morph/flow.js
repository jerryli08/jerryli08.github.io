// 2D flow diagram drawn as inline SVG from the section's data (no WebGL). Wide screens: boxes left
// to right in `rows` rows, a connector wrapping from the end of one row to the start of the next,
// side branches (fallbacks, rejects) in dashed boxes under their step. Narrow screens: one column,
// branches shown inside their step. data: { steps: [{ t, s, edge, accent, dashed, branch: { t, s, edge, tone } }],
// rows, note, chips, label }
const NS = 'http://www.w3.org/2000/svg';
const C = {
  box: 'rgba(255,255,255,0.045)', line: 'rgba(237,232,226,0.2)', text: '#eee9e3', sub: '#b8b0a7', muted: '#8c847b',
  accent: '#ff6b35', accentFill: 'rgba(255,107,53,0.1)', reject: '#e0a39a', arrow: 'rgba(237,232,226,0.5)',
};

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
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function mount(el, ctx) {
  const d = ctx.data || {};
  const steps = d.steps || [];
  const family = getComputedStyle(el).fontFamily || 'system-ui, sans-serif';
  const holder = document.createElement('div');
  Object.assign(holder.style, { position: 'relative', zIndex: 5, padding: '18px 16px' });
  el.append(holder);
  el.style.background = 'rgba(255,255,255,0.015)';
  let lastW = 0;

  function text(x, y, lines, px, weight, fill, anchor = 'start', lh = 1.32) {
    return lines.map((l, i) => `<text x="${x.toFixed(1)}" y="${(y + i * px * lh).toFixed(1)}" font-size="${px}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="inherit">${esc(l)}</text>`).join('');
  }
  function boxSvg(x, y, w, h, o) {
    const stroke = o.accent ? C.accent : o.tone === 'reject' ? 'rgba(224,163,154,0.6)' : C.line;
    const fill = o.accent ? C.accentFill : C.box;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="12" fill="${fill}" stroke="${stroke}" stroke-width="${o.accent ? 1.5 : 1}"${o.dashed ? ' stroke-dasharray="5 4"' : ''}/>`;
  }
  const arrowHead = (x, y, dir, color) => {
    const s = 5.5;
    const pts = dir === 'right' ? [[x, y], [x - s * 1.6, y - s], [x - s * 1.6, y + s]]
      : dir === 'down' ? [[x, y], [x - s, y - s * 1.6], [x + s, y - s * 1.6]]
        : dir === 'up' ? [[x, y], [x - s, y + s * 1.6], [x + s, y + s * 1.6]]
          : [[x, y], [x + s * 1.6, y - s], [x + s * 1.6, y + s]];
    return `<path d="M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join('L')}Z" fill="${color}"/>`;
  };
  // content height of a box of width w
  const PAD = 12, TP = 14, SP = 12.5;
  function layoutBox(o, w) {
    const tl = wrap(o.t, w - 2 * PAD, TP, 650, family);
    const sl = wrap(o.s, w - 2 * PAD, SP, 450, family);
    return { tl, sl, h: PAD * 2 + tl.length * TP * 1.3 + (sl.length ? 6 + sl.length * SP * 1.32 : 0) };
  }
  function drawBox(x, y, w, L, o, hOverride) {
    const h = hOverride || L.h;
    let s = boxSvg(x, y, w, h, o);
    s += text(x + PAD, y + PAD + TP * 0.95, L.tl, TP, 650, o.tone === 'reject' ? C.reject : C.text);
    if (L.sl.length) s += text(x + PAD, y + PAD + L.tl.length * TP * 1.3 + 6 + SP * 0.95, L.sl, SP, 450, C.sub);
    return s;
  }

  function render() {
    const W = Math.floor(holder.clientWidth - 32);
    if (W < 200 || W === lastW) return;
    lastW = W;
    const wide = W >= 720;
    let svg = '', H = 0;
    if (wide) {
      const rows = Math.max(1, d.rows || 1);
      const cols = Math.ceil(steps.length / rows);
      const gap = Math.min(64, Math.max(40, W * 0.045)), mR = 22;
      const bw = (W - mR - gap * (cols - 1)) / cols;
      let y = 0;
      for (let r = 0; r < rows; r++) {
        const row = steps.slice(r * cols, r * cols + cols);
        if (!row.length) break;
        const Ls = row.map((o) => layoutBox(o, bw));
        const bh = Math.max(...Ls.map((L) => L.h));
        const edgeY = y + 22; // edge labels above the arrows
        const top = y + 34;
        row.forEach((o, i) => {
          const x = i * (bw + gap);
          svg += drawBox(x, top, bw, Ls[i], o, bh);
          if (i > 0) {
            const x0 = x - gap + 3, x1 = x - 3, ym = top + bh / 2;
            const col = o.accent && row[i - 1].accent ? C.accent : C.arrow;
            svg += `<path d="M${x0} ${ym}H${x1 - 7}" stroke="${col}" stroke-width="1.6" fill="none"${o.edgeDashed ? ' stroke-dasharray="4 4"' : ''}/>` + arrowHead(x1, ym, 'right', col);
            if (o.edge) {
              const ls = wrap(o.edge, gap + bw * 0.55, 11.5, 500, family);
              svg += text(x - gap / 2, top - 8 - (ls.length - 1) * 13, ls, 11.5, 500, C.muted, 'middle');
            }
          }
        });
        // branches under their step
        let bmax = 0;
        const Bs = row.map((o) => (o.branch ? layoutBox(o.branch, bw) : null));
        row.forEach((o, i) => {
          if (!o.branch) return;
          const x = i * (bw + gap), by = top + bh + 40;
          const col = o.branch.tone === 'reject' ? 'rgba(224,163,154,0.7)' : C.arrow;
          svg += o.branch.into
            ? `<path d="M${x + bw / 2} ${by - 3}V${top + bh + 9}" stroke="${col}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>` + arrowHead(x + bw / 2, top + bh + 3, 'up', col)
            : `<path d="M${x + bw / 2} ${top + bh + 3}V${by - 8}" stroke="${col}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>` + arrowHead(x + bw / 2, by - 3, 'down', col);
          if (o.branch.edge) svg += text(x + bw / 2 + 8, top + bh + 24, [o.branch.edge], 11.5, 500, C.muted);
          svg += drawBox(x, by, bw, Bs[i], { ...o.branch, dashed: true });
          bmax = Math.max(bmax, 40 + Bs[i].h);
          if (o.branch.back != null) {
            // a dashed arrow from the branch back up into a later step of the same row
            const j = o.branch.back, xj = j * (bw + gap) + bw / 2;
            svg += `<path d="M${x + bw} ${by + Bs[i].h / 2}H${xj}V${top + bh + 9}" stroke="${C.arrow}" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/>` + arrowHead(xj, top + bh + 3, 'up', C.arrow);
            if (o.branch.backEdge) svg += text((x + bw + xj) / 2, by + Bs[i].h / 2 - 7, [o.branch.backEdge], 11.5, 500, C.muted, 'middle');
          }
        });
        y = top + bh + bmax;
        // wrap to the next row
        if (r < rows - 1 && steps[(r + 1) * cols]) {
          const lastX = (row.length - 1) * (bw + gap) + bw, ym = top + bh / 2;
          const chan = y + 20;
          const next = steps[(r + 1) * cols];
          svg += `<path d="M${lastX + 3} ${ym}H${lastX + mR - 4}V${chan}H${bw / 2}V${chan + 36 - 9}" stroke="${C.arrow}" stroke-width="1.6" fill="none" stroke-linejoin="round"/>` + arrowHead(bw / 2, chan + 36 - 3, 'down', C.arrow);
          if (next.edge) svg += text((lastX + mR + bw / 2) / 2, chan - 7, [next.edge], 11.5, 500, C.muted, 'middle');
          y = chan + 36 - 34;
        }
      }
      H = y + 6;
    } else {
      let y = 0;
      steps.forEach((o, i) => {
        if (i > 0) {
          const col = o.accent && steps[i - 1].accent ? C.accent : C.arrow;
          svg += `<path d="M22 ${y + 2}V${y + 30}" stroke="${col}" stroke-width="1.6" fill="none"${o.edgeDashed ? ' stroke-dasharray="4 4"' : ''}/>` + arrowHead(22, y + 36, 'down', col);
          if (o.edge) svg += text(36, y + 23, wrap(o.edge, W - 50, 11.5, 500, family).slice(0, 1), 11.5, 500, C.muted);
          y += 38;
        }
        const L = layoutBox(o, W);
        let extra = 0, BL = null;
        if (o.branch) { BL = layoutBox({ t: o.branch.t, s: o.branch.s }, W - 28); extra = 10 + 20 + BL.h; }
        svg += boxSvg(0, y, W, L.h + extra, o);
        svg += text(PAD, y + PAD + TP * 0.95, L.tl, TP, 650, C.text);
        if (L.sl.length) svg += text(PAD, y + PAD + L.tl.length * TP * 1.3 + 6 + SP * 0.95, L.sl, SP, 450, C.sub);
        if (BL) {
          const by = y + L.h + 20;
          svg += text(14, by - 6, [`${o.branch.edge ? `${o.branch.edge}:` : ''}`], 11.5, 500, C.muted);
          svg += boxSvg(14, by, W - 28, BL.h, { dashed: true, tone: o.branch.tone });
          svg += text(14 + PAD, by + PAD + TP * 0.95, BL.tl, TP, 650, o.branch.tone === 'reject' ? C.reject : C.text);
          if (BL.sl.length) svg += text(14 + PAD, by + PAD + BL.tl.length * TP * 1.3 + 6 + SP * 0.95, BL.sl, SP, 450, C.sub);
        }
        y += L.h + extra;
      });
      H = y + 4;
    }
    // footer: note and chips
    let foot = '';
    let fy = H + 22;
    if (d.chips?.length) {
      let x = 0;
      for (const c of d.chips) {
        const w = measure(c, 12.5, 600, family) + 26;
        if (x + w > W) { x = 0; fy += 36; }
        foot += `<rect x="${x}" y="${fy - 18}" width="${w.toFixed(1)}" height="28" rx="14" fill="rgba(255,255,255,0.05)" stroke="${C.line}"/>` + text(x + 13, fy + 0.5, [c], 12.5, 600, C.text);
        x += w + 8;
      }
      fy += 30;
    }
    if (d.note) {
      const ls = wrap(d.note, W, 13, 500, family);
      foot += text(0, fy, ls, 13, 500, C.sub);
      fy += ls.length * 17;
    }
    const total = (foot ? fy : H) + 4;
    holder.innerHTML = `<svg xmlns="${NS}" viewBox="0 0 ${W} ${total.toFixed(0)}" width="${W}" height="${total.toFixed(0)}" role="img" aria-label="${esc(d.label || 'Diagram')}" style="display:block;overflow:visible;font-family:inherit">${svg}${foot}</svg>`;
    el.style.height = `${Math.ceil(total + 36)}px`;
  }
  const ro = new ResizeObserver(() => render());
  ro.observe(holder);
  (document.fonts?.ready || Promise.resolve()).then(() => { lastW = 0; render(); });
  render();
  return { dispose() { ro.disconnect(); holder.remove(); } };
}
