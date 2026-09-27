// Rich project pages: renders src/pages/<slug>.mjs page modules into HTML for build.mjs.
// How to write a page: tools/pages/README.md. Every page module is optional; a project without
// one keeps the simple page. A module that fails to import, or a page that fails to render,
// is logged and falls back to the simple page, so one broken page never breaks the build.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SECTION_TYPES = ['prose', 'media', 'demo', 'scrolly', 'split', 'iterations', 'callout', 'stats'];
const MEDIA_LAYOUTS = ['grid', 'row', 'wide', 'collage'];

/** Import every src/pages/*.mjs. Returns Map(slug -> { page, file }). Broken modules are skipped with a warning. */
export async function loadPageModules(root) {
  const dir = join(root, 'src', 'pages');
  const out = new Map();
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.mjs')).sort()) {
    const slug = f.slice(0, -4);
    try {
      const m = await import(pathToFileURL(join(dir, f)).href);
      const page = m.default;
      if (!page || typeof page !== 'object') throw new Error('it has no `export default { ... }` object');
      if (!Array.isArray(page.sections)) throw new Error('`sections` must be an array');
      out.set(slug, { page, file: `src/pages/${f}` });
    } catch (e) {
      console.warn(`  ! src/pages/${f} could not be loaded, ${slug} keeps its simple page: ${e.message}`);
    }
  }
  return out;
}

// every file under a directory, as site URLs ('/assets/...')
function walk(root, url) {
  const dir = join(root, url.replace(/^\//, ''));
  if (!existsSync(dir)) return [];
  const out = [];
  for (const n of readdirSync(dir).sort()) {
    if (n.startsWith('.')) continue;
    const u = `${url.replace(/\/$/, '')}/${n}`;
    if (statSync(join(dir, n)).isDirectory()) out.push(...walk(root, u)); else out.push(u);
  }
  return out;
}

/**
 * env: { ROOT, PREVIEW, esc, v, has, dims, mediaSrc }
 * returns { render(x, page) -> { head, assets, hero, summary, sections, warnings } }
 */
export function createRich(env) {
  const { ROOT, PREVIEW, esc, v, has, dims, mediaSrc } = env;

  // ---------------------------------------------------------------- inline markup
  // **bold**, *italic*, `code`, [label](url). Everything else is escaped.
  function md(s) {
    if (s == null) return '';
    let t = esc(String(s));
    const codes = [];
    t = t.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (all, label, href) => (/^(https?:\/\/|\/|#|mailto:)/.test(href)
      ? `<a href="${href}"${/^https?:/.test(href) ? ' rel="noopener"' : ''}>${label}</a>` : label));
    t = t.replace(/\*\*(?=\S)(.+?)(?<=\S)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/(^|[^\w*])\*(?=\S)(.+?)(?<=\S)\*(?!\w)/g, '$1<em>$2</em>');
    return t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  }
  const plain = (s) => String(s ?? '').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*?([^*]+)\*\*?/g, '$1');
  const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

  // paragraphs: strings, plus a few block shapes for technical write-ups. ctx: the render context
  // (for inline figures), or a warn function (older callers).
  function blocks(list, ctx) {
    const warn = typeof ctx === 'function' ? ctx : ctx.warn;
    return arr(list).map((b) => {
      if (typeof b === 'string') return `<p>${md(b)}</p>`;
      if (b && typeof b === 'object') {
        if (b.h) return `<h3>${md(b.h)}</h3>`;
        if (b.fig) { // a picture in the flow of the text: one item, or several side by side
          if (typeof ctx === 'function') { warn('fig blocks are not allowed here'); return ''; }
          const items = arr(b.fig);
          const inner = items.length > 1 ? row(items, ctx, { width: b.wide ? 1140 : 720 }) : fig(items[0], ctx, { sizes: b.wide ? '(max-width: 1180px) 100vw, 1140px' : '(max-width: 760px) 100vw, 720px' });
          return `<div class="rx-inline-fig${b.wide ? ' rx-bleed' : ''}">${inner}</div>`;
        }
        if (b.ul) return `<ul>${arr(b.ul).map((i) => `<li>${md(i)}</li>`).join('')}</ul>`;
        if (b.ol) return `<ol>${arr(b.ol).map((i) => `<li>${md(i)}</li>`).join('')}</ol>`;
        if (b.table) {
          const t = b.table;
          const head = t.head ? `<thead><tr>${t.head.map((c) => `<th scope="col">${md(c)}</th>`).join('')}</tr></thead>` : '';
          const rows = arr(t.rows).map((r) => `<tr>${arr(r).map((c) => `<td>${md(c)}</td>`).join('')}</tr>`).join('');
          return `<div class="rx-table"><table>${t.caption ? `<caption>${md(t.caption)}</caption>` : ''}${head}<tbody>${rows}</tbody></table></div>`;
        }
        if (b.quote) return `<blockquote><p>${md(b.quote)}</p>${b.by ? `<cite>${md(b.by)}</cite>` : ''}</blockquote>`;
        if (b.note) return `<p class="rx-note-p">${md(b.note)}</p>`;
        if (b.pre) return `<pre><code>${esc(b.pre)}</code></pre>`;
        // engineering story markers: a problem (red), its fix (green), what I'd do next time (blue)
        for (const [key, label] of [['problem', 'Problem'], ['fix', 'Fix'], ['next', 'Next time']]) {
          if (b[key] == null) continue;
          const body = arr(b[key]).map((x) => `<p>${md(x)}</p>`).join('');
          return `<div class="rx-flag rx-flag-${key}"><p class="rx-flag-label"><span>${esc(b.label || label)}</span>${b.title ? ` <strong>${md(b.title)}</strong>` : ''}</p>${body}</div>`;
        }
      }
      warn(`unknown paragraph ${JSON.stringify(b).slice(0, 60)}`);
      return '';
    }).join('');
  }

  // ---------------------------------------------------------------- media
  const norm = (u, slug) => (u.startsWith('/') ? u : `/assets/media/${slug}/${u}`);
  function resolveMedia(m, slug) {
    const raw = m.v || m.i;
    if (!raw || typeof raw !== 'string') throw new Error('a media item needs v (video) or i (photo)');
    if (/^(videos|images)\//.test(raw)) { // the older projects.mjs form: 'videos/x.mp4'
      const s = mediaSrc(m);
      return { ...s, small: null, ok: has(s.src) };
    }
    let src = norm(raw, slug);
    if (!/\.\w+$/.test(src)) src += m.v ? '.mp4' : '.webp';
    if (m.v) {
      const base = src.split('/').pop().replace(/\.\w+$/, '');
      const poster = m.poster ? norm(m.poster, slug) : [src.replace(/\.\w+$/, '.jpg'), `/assets/media/posters/${base}.jpg`].find(has);
      return { type: 'video', src, poster, ok: has(src) };
    }
    const small = src.replace(/(\.\w+)$/, '-s$1');
    return { type: 'image', src, small: has(small) ? small : null, ok: has(src) };
  }
  const TILTS = [-2.4, 1.7, -1.1, 2.6, -0.5, 1.2, -2.0, 0.8];
  function fig(m, ctx, o = {}) {
    if (!m || typeof m !== 'object') { ctx.warn('media item is not an object'); return ''; }
    let r;
    try { r = resolveMedia(m, ctx.slug); } catch (e) { ctx.warn(e.message); return ''; }
    const cap = m.c ? `<figcaption>${md(m.c)}</figcaption>` : '';
    if (!r.ok) {
      ctx.warn(`missing media ${r.src}`);
      return PREVIEW ? `<figure class="rx-fig rx-missing" style="--ar:1.7778"><div class="rx-m"><span>Missing: ${esc(r.src)}</span></div>${cap}</figure>` : '';
    }
    const d = dims(r.src) || { w: 1600, h: 900 };
    const ar = +(d.w / d.h).toFixed(4);
    const alt = m.alt ?? plain(m.c);
    const style = `--ar:${ar}${o.tilt != null ? `;--tilt:${o.tilt}deg` : ''}`;
    const cls = `rx-fig${m.tall ? ' rx-tall' : ''}`;
    if (r.type === 'video') {
      return `<figure class="${cls}" style="${style}"><div class="rx-m"><video muted loop playsinline preload="none" data-rx-src="${v(r.src)}"${r.poster ? ` poster="${v(r.poster)}"` : ''} width="${d.w}" height="${d.h}" aria-label="${esc(alt || 'Video')}"></video></div>${cap}</figure>`;
    }
    let srcset = '';
    if (r.small) {
      const k = 800 / Math.max(d.w, d.h), sw = Math.round(d.w * Math.min(1, k));
      srcset = ` srcset="${v(r.small)} ${sw}w, ${v(r.src)} ${d.w}w" sizes="${o.sizes || '100vw'}"`;
    }
    const load = o.eager ? ' fetchpriority="high"' : ' loading="lazy"';
    return `<figure class="${cls}" style="${style}"><a class="rx-m" href="${v(r.src)}" data-lb data-caption="${esc(plain(m.c))}" data-alt="${esc(alt)}"><img src="${v(r.small || r.src)}"${srcset} alt="${esc(alt)}" width="${d.w}" height="${d.h}"${load} decoding="async"></a>${cap}</figure>`;
  }
  function aspectOf(m, slug) {
    try { const r = resolveMedia(m, slug); const d = r.ok && dims(r.src); return d ? d.w / d.h : 16 / 9; } catch { return 16 / 9; }
  }
  // one row, every item the same height, widths from their aspect ratios (nothing cropped)
  function row(items, ctx, o = {}) {
    const list = arr(items);
    const sum = list.reduce((a, m) => a + aspectOf(m, ctx.slug), 0);
    const sizes = `(max-width: 640px) 100vw, ${Math.round(o.width || 1140 / Math.max(1, list.length))}px`;
    return `<div class="rx-row${sum > 2 ? ' rx-stack-sm' : ''}" style="--sum:${+sum.toFixed(4)}">${list.map((m, i) => fig(m, ctx, { sizes, eager: o.eager && i === 0 })).join('')}</div>`;
  }
  function mediaLayout(layout, items, ctx, o = {}) {
    const list = arr(items);
    if (!list.length) { ctx.warn('media section has no items'); return ''; }
    if (layout === 'row') return row(list, ctx, o);
    if (layout === 'wide') return `<div class="rx-wide">${list.map((m) => fig(m, ctx, { sizes: '(max-width: 1180px) 100vw, 1140px' })).join('')}</div>`;
    if (layout === 'collage') return `<div class="rx-collage">${list.map((m, i) => fig(m, ctx, { sizes: '(max-width: 640px) 50vw, 260px', tilt: TILTS[i % TILTS.length] })).join('')}</div>`;
    const cols = o.cols === 3 ? 3 : 2;
    return `<div class="rx-grid rx-cols-${cols}">${list.map((m) => fig(m, ctx, { sizes: `(max-width: 640px) 50vw, ${Math.round(1140 / cols)}px` })).join('')}</div>`;
  }

  // ---------------------------------------------------------------- interactive blocks
  function resolveModule(m, slug) {
    if (!m || typeof m !== 'string') return null;
    const path = m.startsWith('@') ? `/assets/js/lib/demos/${m.slice(1)}.js`
      : m.startsWith('/') ? m : `/assets/js/pages/${slug}/${m.replace(/\.js$/, '')}.js`;
    return { path, ok: has(path) };
  }
  const cssLen = (h) => (typeof h === 'number' ? `${h}px` : /^[\w\s().,%+\-*/]+$/.test(String(h)) ? String(h) : null);
  function stageInner(o, ctx) {
    let poster = '';
    if (o.poster) {
      const src = norm(o.poster, ctx.slug);
      if (has(src)) poster = `<img class="rx-poster" src="${v(src)}" alt="" loading="lazy" decoding="async">`;
      else ctx.warn(`missing poster ${src}`);
    }
    const is3d = o.webgl !== false;
    return `${poster}<p class="rx-status" aria-hidden="true"><span class="rx-spin"></span>${is3d ? 'Loading 3D' : 'Loading'}</p><button type="button" class="rx-load hud-go" data-rx-load>${is3d ? 'Load the 3D animation' : 'Load the animation'}</button><p class="rx-note" data-rx-note role="status" hidden></p>`;
  }
  // id: already registered with ctx.uid by the caller
  function block(kind, o, ctx, id) {
    const mod = resolveModule(o.module, ctx.slug);
    if (!mod) { ctx.warn(`${kind} ${id} has no module`); return ctx.err(`${kind} needs a module`); }
    if (!mod.ok) ctx.warn(`${kind} ${id}: module ${mod.path} does not exist`);
    const h = o.height != null ? cssLen(o.height) : null;
    if (o.height != null && !h) ctx.warn(`${id}: height "${o.height}" is not a CSS length`);
    const data = o.data != null ? ` data-rx-data="${esc(JSON.stringify(o.data))}"` : '';
    ctx.modules = true;
    // a missing module still renders its poster, with the "could not load" note
    return `<div class="rx-demo" id="${esc(id)}" data-rx-block="${kind}" data-module="${mod.ok ? v(mod.path) : esc(mod.path)}"${data}${o.webgl === false ? ' data-webgl="false"' : ''}${h ? ` style="--h:${esc(h)}"` : ''}>
      <div class="rx-stage" data-rx-stage>${stageInner(o, ctx)}</div>
      <div class="rx-panel" data-rx-panel></div>
    </div>`;
  }

  // ---------------------------------------------------------------- sections
  // Prose with media: the paragraphs are cut into as many runs as there are media items, of about
  // the same length (never right after a subheading, never between a problem and its fix), and each
  // run gets its picture beside it, so pictures come evenly all the way down the text. On a phone
  // each picture follows its run.
  const wordsOf = (b) => (typeof b === 'string' ? plain(b).split(/\s+/).filter(Boolean).length
    : b && typeof b === 'object' ? (b.h ? 6 : b.fig ? 0 : wordsOf(JSON.stringify(Object.values(b)).replace(/[[\]{}",]/g, ' '))) : 0);
  function chunk(list, k) {
    const w = list.map(wordsOf), cum = [];
    w.reduce((a, x, i) => (cum[i] = a + x), 0);
    const total = cum[cum.length - 1] || 1;
    // a break may follow block i unless it is a subheading or the next block is a fix / next-time
    const ok = list.map((b, i) => i < list.length - 1 && !(b && b.h) && !(list[i + 1] && typeof list[i + 1] === 'object' && (list[i + 1].fix != null || list[i + 1].next != null)));
    const cuts = [];
    for (let j = 1; j < k; j++) { // the allowed break closest to each equal share
      let best = -1;
      for (let i = (cuts[cuts.length - 1] ?? -1) + 1; i < list.length; i++) if (ok[i] && (best < 0 || Math.abs(cum[i] - (total * j) / k) < Math.abs(cum[best] - (total * j) / k))) best = i;
      if (best < 0) break;
      cuts.push(best);
    }
    const out = [];
    let from = 0;
    for (const c of [...cuts, list.length - 1]) { out.push(list.slice(from, c + 1)); from = c + 1; }
    return out.filter((r) => r.length);
  }
  const H2 = (h, id) => (h ? `<h2 class="rx-h2"${id ? ` id="${id}-h"` : ''}>${md(h)}</h2>` : '');
  const open = (cls, s, ctx, id) => `<section class="rx-sec ${cls}"${id ? ` id="${esc(id)}"` : ''}${s.h ? ` aria-labelledby="${esc(id)}-h"` : ''}>`;
  // heading and lead text sit in the centred reading column; pictures use the full width below
  const head = (s, id, ctx, lead = true) => (s.h || (lead && s.p) ? `<div class="rx-col">${H2(s.h, id)}${lead && s.p ? `<div class="rx-text rx-lead">${blocks(s.p, ctx)}</div>` : ''}</div>` : '');
  const SECTIONS = {
    prose(s, ctx) {
      const id = ctx.uid(s.id, 'prose');
      if (s.p == null) ctx.warn(`prose ${id} has no p`);
      const media = arr(s.media);
      if (!media.length) return `${open('rx-prose', s, ctx, id)}<div class="rx-w"><div class="rx-col">${H2(s.h, id)}<div class="rx-text">${blocks(s.p, ctx)}</div></div></div></section>`;
      const runs = chunk(arr(s.p), media.length);
      const rows = runs.map((run, i) => {
        const items = i === runs.length - 1 ? media.slice(i) : [media[i]]; // short text: extra pictures stack in the last row
        const figs = items.map((m) => (Array.isArray(m) ? row(m, ctx, { width: 560 }) : fig(m, ctx, { sizes: '(max-width: 900px) 100vw, 560px' }))).join('');
        return `<div class="rx-pm-row"><div class="rx-text">${blocks(run, ctx)}</div><div class="rx-pm-fig">${figs}</div></div>`;
      }).join('');
      return `${open(`rx-prose rx-pm${s.side === 'left' ? ' rx-pm-left' : ''}`, s, ctx, id)}<div class="rx-w">${H2(s.h, id)}${rows}</div></section>`;
    },
    media(s, ctx) {
      const id = ctx.uid(s.id, 'media');
      const layout = s.layout || 'grid';
      if (!MEDIA_LAYOUTS.includes(layout)) ctx.warn(`media ${id}: unknown layout "${layout}" (use ${MEDIA_LAYOUTS.join(', ')})`);
      return `${open(`rx-media rx-media-${esc(layout)}`, s, ctx, id)}<div class="rx-w">${head(s, id, ctx)}${mediaLayout(layout, s.items, ctx, { cols: s.cols })}</div></section>`;
    },
    demo(s, ctx) {
      // the built-in CAD viewer is now a scroll-driven turntable: same data, no JavaScript to change
      if (s.module === '@viewer') {
        return SECTIONS.scrolly({ ...s, module: '@turntable', width: s.width || 'wide', side: s.aside === 'right' ? 'right' : 'left', steps: [], length: s.length }, ctx);
      }
      const id = ctx.uid(s.id, 'demo');
      const b = block('demo', s, ctx, id);
      const cap = s.caption ? `<p class="rx-cap">${md(s.caption)}</p>` : '';
      const text = `${H2(s.h, id)}${s.p ? `<div class="rx-text">${blocks(s.p, ctx)}</div>` : ''}`;
      if (s.aside === 'left' || s.aside === 'right') {
        return `<section class="rx-sec rx-demo-sec"${s.h ? ` aria-labelledby="${esc(id)}-h"` : ''}><div class="rx-w"><div class="rx-aside rx-aside-${s.aside}"><div class="rx-aside-txt">${text}</div><div class="rx-aside-vis">${b}${cap}</div></div></div></section>`;
      }
      return `<section class="rx-sec rx-demo-sec"${s.h ? ` aria-labelledby="${esc(id)}-h"` : ''}><div class="rx-w">${head(s, id, ctx)}${b}${cap}</div></section>`;
    },
    // A sticky stage driven by the scroll. width 'full' (default): the stage spans the screen and the
    // step cards scroll over its left side. 'wide': the stage takes about three quarters of the
    // screen and the text runs beside it (side 'left' or 'right'). Without steps, the stage stays
    // pinned for `length` of scrolling while the module plays through progress 0 to 1; a wide one
    // keeps its heading and text pinned beside it. On a phone every scrolly is full width with the
    // text over the bottom (or, without steps, above the stage).
    scrolly(s, ctx) {
      const id = ctx.uid(s.id, 'scrolly');
      const steps = arr(s.steps);
      const wide = s.width === 'wide';
      if (s.width != null && !['full', 'wide'].includes(s.width)) ctx.warn(`scrolly ${id}: width "${s.width}" (use full or wide)`);
      const mod = resolveModule(s.module, ctx.slug);
      if (!mod) { ctx.warn(`scrolly ${id} has no module`); return ctx.err('scrolly needs a module'); }
      if (!mod.ok) ctx.warn(`scrolly ${id}: module ${mod.path} does not exist`);
      const stepH = s.stepHeight != null ? cssLen(s.stepHeight) : null;
      const len = !steps.length ? cssLen(s.length ?? '180vh') : null;
      // per-step `view` objects (for @turntable) travel to the module as data.steps
      let data = s.data;
      if (steps.some((st) => st && st.view)) data = { ...(data || {}), steps: steps.map((st) => st.view || {}) };
      const dataAttr = data != null ? ` data-rx-data="${esc(JSON.stringify(data))}"` : '';
      ctx.modules = true;
      const beside = wide && !steps.length; // the section's own text is the pinned column
      const cap = s.caption ? `<p class="rx-cap">${md(s.caption)}</p>` : '';
      const list = steps.length
        ? steps.map((st, i) => `<li class="rx-step${i === 0 ? ' is-active' : ''}" data-step="${i}"><div class="rx-step-card rx-text">${st.h ? `<h3>${md(st.h)}</h3>` : ''}${blocks(st.p, ctx)}</div></li>`).join('')
        : beside && (s.h || s.p) ? `<li class="rx-step rx-step-pin is-active"><div class="rx-step-card rx-text">${H2(s.h, id)}${blocks(s.p, ctx)}${cap}</div></li>` : '';
      const style = [stepH ? `--step-h:${esc(stepH)}` : '', len ? `--len:${esc(len)}` : ''].filter(Boolean).join(';');
      const cls = `rx-scrolly${wide ? ` rx-scrolly-wide rx-side-${s.side === 'right' ? 'right' : 'left'}` : ''}${steps.length ? '' : ' rx-stepless'}`;
      return `<section class="rx-sec rx-scrolly-sec"${s.h ? ` aria-labelledby="${esc(id)}-h"` : ''}>
    ${beside ? '' : `<div class="rx-w">${head(s, id, ctx)}</div>`}
    <div class="${cls}" id="${esc(id)}" data-rx-block="scrolly" data-module="${mod.ok ? v(mod.path) : esc(mod.path)}"${dataAttr}${s.webgl === false ? ' data-webgl="false"' : ''}${style ? ` style="${style}"` : ''}>
      <div class="rx-scrolly-body">
        <div class="rx-scrolly-stage"><div class="rx-stage" data-rx-stage>${stageInner(s, ctx)}</div></div>
        <ol class="rx-steps">${list}</ol>
      </div>
    </div>${!beside && cap ? `<div class="rx-w"><div class="rx-col">${cap}</div></div>` : ''}
  </section>`;
    },
    split(s, ctx) {
      const id = ctx.uid(s.id, 'split');
      const items = arr(s.items);
      if (!items.length) ctx.warn(`split ${id} has no items`);
      const rows = items.map((it, i) => {
        let vis = '';
        if (it.module) vis = block('demo', it, ctx, ctx.uid(it.id || `${id}-${i + 1}`, 'demo'));
        else if (it.media) vis = Array.isArray(it.media) && it.media.length > 1 ? row(it.media, ctx, { width: 640 }) : fig(arr(it.media)[0], ctx, { sizes: '(max-width: 900px) 100vw, 640px' });
        else ctx.warn(`split ${id} item ${i + 1} has neither module nor media`);
        return `<div class="rx-split-row${i % 2 ? ' rx-flip' : ''}"><div class="rx-split-vis">${vis}${it.caption ? `<p class="rx-cap">${md(it.caption)}</p>` : ''}</div><div class="rx-split-txt rx-text">${it.h ? `<h3>${md(it.h)}</h3>` : ''}${blocks(it.p, ctx)}</div></div>`;
      }).join('');
      return `${open('rx-split', s, ctx, id)}<div class="rx-w">${H2(s.h, id)}${rows}</div></section>`;
    },
    iterations(s, ctx) {
      const id = ctx.uid(s.id, 'iterations');
      const items = arr(s.items);
      if (!items.length) ctx.warn(`iterations ${id} has no items`);
      return `${open('rx-iter', s, ctx, id)}<div class="rx-w">${head(s, id, ctx, false)}<ol class="rx-tl">${items.map((it) => `<li class="rx-tl-item">${it.label ? `<p class="rx-tl-label">${md(it.label)}</p>` : ''}${it.title ? `<h3 class="rx-tl-title">${md(it.title)}</h3>` : ''}<div class="rx-text">${blocks(it.p, ctx)}</div>${arr(it.media).length ? `<div class="rx-tl-media">${row(it.media, ctx, { width: 860 })}</div>` : ''}</li>`).join('')}</ol></div></section>`;
    },
    callout(s, ctx) {
      const id = ctx.uid(s.id, 'callout');
      return `<section class="rx-sec rx-callout-sec"${s.id ? ` id="${esc(id)}"` : ''}><div class="rx-w"><aside class="rx-callout">${s.h ? `<h2 class="rx-callout-h">${md(s.h)}</h2>` : ''}<div class="rx-text">${blocks(s.p, ctx)}</div></aside></div></section>`;
    },
    stats(s, ctx) {
      const id = ctx.uid(s.id, 'stats');
      const items = arr(s.items);
      if (!items.length) ctx.warn(`stats ${id} has no items`);
      return `${open('rx-stats-sec', s, ctx, id)}<div class="rx-w">${head(s, id, ctx, false)}<div class="stats rx-stats">${items.map((x) => `<div class="stat"><b>${md(x.v)}</b><span>${md(x.l)}</span></div>`).join('')}</div></div></section>`;
    },
  };

  // ---------------------------------------------------------------- page
  function assetMap(slug, extra = []) {
    const urls = [
      ...walk(ROOT, '/assets/models').filter((u) => u.split('/').length === 4), // shared models: /assets/models/x.glb
      ...walk(ROOT, `/assets/models/${slug}`),
      ...walk(ROOT, `/assets/media/${slug}`),
      ...walk(ROOT, '/assets/js/lib'),
    ];
    for (const e of arr(extra)) {
      if (typeof e !== 'string') continue;
      const u = e.startsWith('/') ? e : `/${e}`;
      if (has(u) && statSync(join(ROOT, u)).isDirectory()) urls.push(...walk(ROOT, u)); else if (has(u)) urls.push(u);
    }
    return Object.fromEntries([...new Set(urls)].map((u) => [u, v(u)]));
  }
  // bare "three" and "three/addons/...", and every shared/page module under its own path, all
  // mapped to content-hashed URLs so a changed module is never served stale from cache
  function importMap(slug) {
    const imports = { three: v('/assets/vendor/three.module.min.js') };
    for (const u of walk(ROOT, '/assets/vendor/addons').filter((x) => x.endsWith('.js'))) {
      imports[u] = v(u);
      imports[`three/addons/${u.slice('/assets/vendor/addons/'.length)}`] = v(u);
    }
    for (const u of [...walk(ROOT, '/assets/js/lib'), ...walk(ROOT, `/assets/js/pages/${slug}`)].filter((x) => x.endsWith('.js'))) imports[u] = v(u);
    return `<script type="importmap">${JSON.stringify({ imports }).replace(/</g, '\\u003c')}</script>\n`;
  }

  function render(x, page) {
    const warnings = [];
    const used = new Set();
    const ctx = {
      slug: x.slug,
      modules: false,
      warn: (m) => warnings.push(m),
      err: (m) => (PREVIEW ? `<div class="rx-w"><p class="rx-err">${esc(m)}</p></div>` : ''),
      uid(id, kind) {
        let base = typeof id === 'string' && /^[A-Za-z][\w-]*$/.test(id) ? id : null;
        if (id != null && !base) warnings.push(`id "${id}" should be letters, digits, - or _`);
        base = base || `${kind}-${used.size + 1}`;
        let u = base, n = 2;
        while (used.has(u)) { if (id) warnings.push(`duplicate id "${id}"`); u = `${base}-${n++}`; }
        used.add(u);
        return u;
      },
    };
    // hero: the page's own, else the project's first video or photo (hero: null turns it off)
    let hero = '';
    const hh = page.hero === undefined ? (x.media?.[0] ? { layout: 'single', items: [x.media[0]] } : null) : page.hero;
    if (hh) {
      const items = arr(hh.items);
      if (!items.length) ctx.warn('hero has no items');
      else if (hh.layout === 'row' && items.length > 1) hero = `<div class="rx-w"><div class="rx-hero rx-hero-row">${row(items, ctx, { eager: true })}</div></div>`;
      else hero = `<div class="rx-w"><div class="rx-hero rx-hero-single">${fig(items[0], ctx, { eager: true, sizes: '(max-width: 1180px) 100vw, 1140px' })}</div></div>`;
    }
    const summary = page.summary?.text ? `<div class="rx-summary rx-text">${blocks(page.summary.text, ctx)}</div>` : '';
    const sections = arr(page.sections).map((s, i) => {
      const where = `section ${i + 1}${s?.type ? ` (${s.type})` : ''}`;
      if (!s || typeof s !== 'object' || !SECTIONS[s.type]) {
        ctx.warn(`${where}: unknown type "${s?.type}" (use ${SECTION_TYPES.join(', ')})`);
        return ctx.err(`${where}: unknown section type "${s?.type}"`);
      }
      try {
        const n = warnings.length;
        const html = SECTIONS[s.type](s, ctx);
        for (let k = n; k < warnings.length; k++) warnings[k] = `${where}: ${warnings[k]}`;
        return html;
      } catch (e) {
        ctx.warn(`${where}: ${e.message}`);
        return ctx.err(`${where} failed: ${e.message}`);
      }
    }).join('\n');
    // Jerry's rule (Sept 26): every demo is a scroll-driven animation. Interactive ones still to convert:
    const todo = arr(page.sections).flatMap((s) => (s?.type === 'demo' && s.module !== '@viewer' ? [s.id || s.module]
      : s?.type === 'split' ? arr(s.items).filter((it) => it?.module).map((it) => it.id || it.module) : []));
    if (todo.length) warnings.push(`${todo.length} interactive demo${todo.length > 1 ? 's' : ''} to convert to scroll-driven scrollies: ${todo.join(', ')}`);
    // Jerry's rule: no long stretch of text without a picture. Text-only sections in a row are
    // added up; a run of more than about a screenful is a warning. In prose with media each run of
    // paragraphs has its picture pinned beside it, so only a very long run there is flagged.
    const LIMIT = 220, LIMIT_BESIDE = 420;
    let run = 0, runFrom = 0;
    arr(page.sections).forEach((s, i) => {
      if (!s || typeof s !== 'object') return;
      const media = arr(s.media).length || arr(s.p).some((b) => b && b.fig) || ['media', 'scrolly', 'split', 'demo'].includes(s.type)
        || (s.type === 'iterations' && arr(s.items).some((it) => arr(it.media).length));
      if (s.type === 'prose' && arr(s.media).length) {
        chunk(arr(s.p), arr(s.media).length).forEach((r) => { const n = r.reduce((a, b) => a + wordsOf(b), 0); if (n > LIMIT_BESIDE) warnings.push(`section ${i + 1} (prose): ${n} words beside one picture; add media items so each run of text has its own`); });
      }
      if (media) { run = 0; return; }
      if (s.type === 'prose' || s.type === 'callout') {
        if (!run) runFrom = i + 1;
        run += arr(s.p).reduce((a, b) => a + wordsOf(b), 0);
        if (run > LIMIT) { warnings.push(`${runFrom === i + 1 ? `section ${i + 1}` : `sections ${runFrom}-${i + 1}`}: about ${run} words of text in a row with no picture; give the prose \`media: [...]\` so pictures sit beside it, or put a media section between`); run = -1e9; }
      }
    });
    return {
      head: ctx.modules ? importMap(x.slug) : '',
      assets: esc(JSON.stringify(assetMap(x.slug, page.assets))),
      hero, summary, sections, warnings,
      stats: page.summary?.stats,
    };
  }
  return { render, md };
}
