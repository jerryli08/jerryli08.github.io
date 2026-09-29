// Static site generator for jerryli.design. Output is plain HTML committed to the repo,
// so GitHub Pages and Vercel both serve it with no build step on their side.
//   node tools/build.mjs            production (drafts hidden)
//   PREVIEW=1 node tools/build.mjs  preview (drafts shown with a label)
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, readdirSync, unlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, projects, about } from '../src/projects.mjs';
import { loadPageModules, createRich } from './rich.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = process.env.PREVIEW === '1';
const p = (...a) => join(ROOT, ...a);

// ---------------------------------------------------------------- helpers
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// a title for display: short hyphenated words ("UAV-UGV", "Two-Sided") never split across lines
const titleHtml = (t = '') => esc(t).replace(/(^|\s)([^\s-]+(?:-[^\s-]+)+)(?=\s|$)/g, (m, sp, w) => (w.length <= 10 ? `${sp}<span class="nw">${w}</span>` : m));
const hashCache = new Map();
// "three" plus every vendored addon under its own URL, so the 3D world's relative imports
// (world.js, the addons importing each other) get content-hashed URLs and the year-long cache
function vendorImportMap() {
  const dir = join(ROOT, 'assets/vendor/addons'), imports = { three: v('/assets/vendor/three.module.min.js') };
  const walkJs = (d, u) => { for (const n of readdirSync(d).sort()) { const f = join(d, n); if (statSync(f).isDirectory()) walkJs(f, `${u}/${n}`); else if (n.endsWith('.js')) imports[`${u}/${n}`] = v(`${u}/${n}`); } };
  if (existsSync(dir)) walkJs(dir, '/assets/vendor/addons');
  return `<script type="importmap">${JSON.stringify({ imports })}</script>`;
}
function v(url) { // cache-busting query from file contents
  const f = p(url.replace(/^\//, ''));
  if (!existsSync(f)) return url;
  if (!hashCache.has(f)) hashCache.set(f, createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 8));
  return `${url}?v=${hashCache.get(f)}`;
}
const has = (url) => existsSync(p(url.replace(/^\//, '')));
// hashed URLs for everything world.js loads, handed to it through the canvas
function worldAssets() {
  const out = {};
  for (const dir of ['models', 'world']) for (const f of readdirSync(p(`assets/${dir}`), { withFileTypes: true })) if (f.isFile()) out[`${dir}/${f.name}`] = v(`/assets/${dir}/${f.name}`);
  return esc(JSON.stringify(out));
}
const dimCache = new Map();
function dims(url) {
  const f = p(url.replace(/^\//, ''));
  if (dimCache.has(f)) return dimCache.get(f);
  let d = null;
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', f]).toString().trim();
    const [w, h] = out.split(',').map(Number);
    if (w && h) d = { w, h };
  } catch { /* unknown */ }
  dimCache.set(f, d);
  return d;
}
const visible = (x) => PREVIEW || !x.draft;
const list = (kind) => projects.filter((x) => x.kind === kind && visible(x));
const url = (x) => `/projects/${x.slug}`;
const thumb = (x) => (has(`/assets/thumbs/${x.slug}.webp`) ? `/assets/thumbs/${x.slug}.webp` : null);
const poster = (x) => (has(`/assets/posters/${x.slug}.jpg`) ? `/assets/posters/${x.slug}.jpg` : null);
// share images: LinkedIn and some other link previews do not show WebP, so a project whose share
// image would be its WebP card thumbnail gets a 1200 x 630 JPG copy in /assets/og/ (made once, and
// again whenever the thumbnail changes)
const og = (x) => (has(`/assets/og/${x.slug}.jpg`) ? `/assets/og/${x.slug}.jpg` : null);
{
  const { default: sharp } = await import('sharp');
  mkdirSync(p('assets/og'), { recursive: true });
  for (const x of projects) {
    const t = thumb(x); if (poster(x) || !t) continue;
    const src = p(t.slice(1)), out = p(`assets/og/${x.slug}.jpg`);
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) continue;
    await sharp(src).resize(1200, 630, { fit: 'cover' }).flatten({ background: '#0b0a09' }).jpeg({ quality: 80, mozjpeg: true }).toFile(out);
  }
}
const arrow = '<span class="arrow" aria-hidden="true">&#8599;</span>';

function mediaSrc(m) {
  // 'videos/x.mp4', 'images/x.jpg', a per-project 'slug/x' or an absolute '/assets/media/slug/x'
  const bare = (u, re) => u.replace(/^\/assets\/media\//, '').replace(re, '');
  if (m.v) {
    const name = bare(m.v, /^videos\//).replace(/\.mp4$/, '');
    // per-project folders keep the poster next to the clip; the old flat clips use posters/
    const poster = name.includes('/') ? `/assets/media/${name}.jpg` : `/assets/media/posters/${name}.jpg`;
    return { type: 'video', src: `/assets/media/${name}.mp4`, poster };
  }
  const name = bare(m.i, /^images\//).replace(/\.\w+$/, '');
  const webp = `/assets/media/${name}.webp`;
  return { type: 'image', src: has(webp) ? webp : `/${m.i}` };
}
function mediaEl(m, { eager = false } = {}) {
  const s = mediaSrc(m);
  const d = dims(s.src);
  const wh = d ? ` width="${d.w}" height="${d.h}"` : '';
  if (s.type === 'video') {
    return `<video muted loop playsinline preload="none" data-src="${v(s.src)}" poster="${v(s.poster)}"${wh} aria-label="${esc(m.c || '')}"></video>`;
  }
  return `<img src="${v(s.src)}" alt="${esc(m.c || '')}"${wh}${eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"'}>`;
}

// ---------------------------------------------------------------- shared chrome
// Mona Sans (GitHub, SIL OFL 1.1, assets/fonts/OFL.txt), self-hosted: the same variable woff2 files
// and descriptors Google Fonts serves for latin and latin-ext, so the first paint waits on no other
// origin and the latin file can be preloaded and cached for a year
const FONT_FACES = [
  ['mona-sans-latin-ext.woff2', 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF'],
  ['mona-sans-latin.woff2', 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD'],
];
const fontCss = () => FONT_FACES.map(([f, range]) => `@font-face{font-family:'Mona Sans';font-style:normal;font-weight:200 900;font-stretch:75% 125%;font-display:swap;src:url(${v(`/assets/fonts/${f}`)}) format('woff2');unicode-range:${range}}`).join('');
// the black and white "jl" icon (Sept 28). Every page, the redirects included, links the same files
// with a content hash, so a browser that cached the old icon for any page fetches the new one:
// /favicon.ico (16, 32, 48) for browsers that look there, the SVG where it is supported, and the
// 180 px touch icon
const iconLinks = () => `<link rel="icon" href="${v('/favicon.ico')}" sizes="16x16 32x32 48x48">
<link rel="icon" href="${v('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="apple-touch-icon" href="${v('/assets/apple-touch-icon.png')}">`;
function head({ title, description, path, image = '/assets/img/og.jpg', extra = '' }) {
  const canonical = site.url + (path === '/' ? '/' : path);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${site.url}${image}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b0a09">
${iconLinks()}
<link rel="preload" href="${v('/assets/fonts/mona-sans-latin.woff2')}" as="font" type="font/woff2" crossorigin>
<style>${fontCss()}</style>
<link rel="stylesheet" href="${v('/assets/css/site.css')}">
${PREVIEW ? '<meta name="robots" content="noindex">\n' : ''}${extra}</head>`;
}
function nav({ home = false } = {}) {
  const pre = home ? '' : '/';
  return `<nav class="nav" aria-label="Main">
  <a class="wordmark" href="/" aria-label="Jerry Li, home">jerryli.design</a>
  <div class="nav-links">
    <a href="${pre}#work">Work</a>
    <a href="${pre}#about">About</a>
    <a class="nav-cta" href="${pre}#contact">Contact</a>
  </div>
</nav>`;
}
// both emails, labelled, school first (Jerry, Sept 28)
const EMAILS = [['School', site.emailSchool], ['Personal', site.email]].filter(([, e]) => e);
const footer = () => `<footer class="footer"><span>&copy; ${new Date().getFullYear()} Jerry Li</span><span class="footer-mail">${EMAILS.map(([l, e]) => `<a href="mailto:${e}">${l}: ${e}</a>`).join('')}</span></footer>`;
const scripts = (extra = '') => `<script src="${v('/assets/js/site.js')}" defer></script>${extra}`;

// ---------------------------------------------------------------- landing
const statLine = (x) => (x.kind === 'hackathon' ? (x.place || x.event) : (x.stats?.[0] ? `${x.stats[0].v} ${x.stats[0].l}` : x.org));
// when the project was made, for cards: the months ("Jul to Aug 2025", "Sep 2025 to May 2026",
// "Jun 2024", or a season like "Summer 2024"), else the year. Never a dash: a range reads "to".
const MONTH_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\b|\b(spring|summer|fall|autumn|winter)\b/i;
function when(x) {
  const d = String(x.date || '').trim();
  if (MONTH_RE.test(d)) return d.replace(/\s*[\u2013\u2014-]\s*/g, ' to ').replace(/\s+/g, ' ');
  return String(x.year || (d.match(/\d{4}/g) || []).pop() || '');
}
// the same, with a cross-year range split into two lines' worth: [first half, 'to ...'] for small cards
const whenHtml = (x) => { const w = when(x); const m = w.match(/^(.*?\d{4}) to (.+\d{4})$/); return m ? `${esc(m[1])} <span class="nw">to ${esc(m[2])}</span>` : esc(w); };
// featured cards on the first screen, staggered in two columns
function fcard(x) {
  const t = thumb(x);
  return `<a class="fcard" href="${url(x)}">
  <div class="fcard-img">${t ? `<img src="${v(t)}" alt="" fetchpriority="high" decoding="async">` : ''}<span class="card-cta"><span>Click to learn more</span></span></div>
  <div class="fcard-body"><h3>${titleHtml(x.title)}</h3><p class="meta">${when(x) ? `<span class="yr">${esc(when(x))}</span>` : ''}<span>${esc(statLine(x))}</span></p></div>
</a>`;
}
// newest first, by when the project ended ("Sep 2025 to May 2026" ends May 2026)
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12, spring: 5, summer: 8, fall: 11, winter: 1 };
function span(x) {
  const toks = String(x.date || '').toLowerCase().match(/[a-z]+|\d{4}/g) || [];
  const pts = [];
  let pending = [];
  for (const t of toks) {
    if (/^\d{4}$/.test(t)) { const y = +t; if (!pending.length) pts.push(y * 12 + 6); pending.forEach((m) => pts.push(y * 12 + m)); pending = []; }
    else if (MONTHS[t.slice(0, 3)] || MONTHS[t]) pending.push(MONTHS[t] || MONTHS[t.slice(0, 3)]);
  }
  if (!pts.length && x.year) pts.push(+x.year * 12 + 6);
  return pts.length ? [Math.min(...pts), Math.max(...pts)] : [-Infinity, -Infinity];
}
// ties on the end month: a higher `tiebreak` goes first (Jerry's own order), then the later start
const newestFirst = (a, b) => { const [sa, ea] = span(a), [sb, eb] = span(b); return eb - ea || (b.tiebreak || 0) - (a.tiebreak || 0) || sb - sa; };
const oldestFirst = (a, b) => { const [sa, ea] = span(a), [sb, eb] = span(b); return sa - sb || ea - eb; };
const pinnedFirst = (xs) => [...xs.filter((x) => x.pinned).sort(newestFirst), ...xs.filter((x) => !x.pinned).sort(newestFirst)];
// The home page's order (Jerry, Sept 28). All work: Projects (a week or more), Short projects (under
// a week, `length: 'short'`), then Concepts, each pinned first and then newest first; below it the
// Archive (newest first) and the prints (their `order`, then newest first). The next-project links
// follow the same order.
function homeGroups() {
  const built = ['main', 'hackathon'].flatMap((k) => list(k));
  return {
    projects: pinnedFirst(built.filter((x) => x.length !== 'short')),
    short: pinnedFirst(built.filter((x) => x.length === 'short')),
    concepts: pinnedFirst(list('concept')),
    archive: list('archive').sort(newestFirst),
    objects: list('object').sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || newestFirst(a, b)),
  };
}
const homeOrder = (g = homeGroups()) => [...g.projects, ...g.short, ...g.concepts, ...g.archive, ...g.objects];
const PIN_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M15.2 2.6a1 1 0 0 1 1.4 0l4.8 4.8a1 1 0 0 1 0 1.4l-1.3 1.3a1 1 0 0 1-1 .25l-.9-.3-3.2 3.2.4 3.3a1 1 0 0 1-.3.8l-1 1a1 1 0 0 1-1.4 0L9.3 15l-5.1 5.1a.9.9 0 0 1-1.3-1.3L8 13.7 4.6 10.3a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 .8-.3l3.3.4 3.2-3.2-.3-.9a1 1 0 0 1 .25-1z"/></svg>';
const PIN = `<span class="pin" title="Pinned">${PIN_ICON}<span class="sr-only">Pinned</span></span>`;
// every project in the grid: same size, picture on top, words underneath
const KIND_LABEL = { main: 'Project', hackathon: 'Hackathon', concept: 'Concept', object: '3D model', archive: 'Archive' };
// a card in All work also carries its group (a quiet tag on short projects and concepts, shown only
// when the list is sorted by date) and its place in each date order
const GROUP_TAG = { short: 'Short project', concepts: 'Concept' };
function card(x, w = null) {
  const t = thumb(x);
  const s0 = statLine(x) || '', sub = s0 === KIND_LABEL[x.kind] ? '' : s0; // no "Concept" under a card already labelled Concept
  const wa = w ? ` data-group="${w.group}" data-new="${w.rank.new.get(x)}" data-old="${w.rank.old.get(x)}"` : '';
  const tag = w && GROUP_TAG[w.group] ? `<span class="card-g">${GROUP_TAG[w.group]}</span>` : '';
  return `<a class="card" href="${url(x)}" data-kind="${x.kind}"${wa}>
  <div class="card-img">${t ? `<img src="${v(t)}" alt="" loading="lazy" decoding="async">` : '<div class="placeholder">Media coming</div>'}${x.hours ? `<span class="badge">${esc(x.hours)}</span>` : ''}${x.draft ? '<span class="badge draft">Draft</span>' : ''}${x.pinned ? PIN : ''}${tag}<span class="card-cta"><span>Click to learn more</span></span></div>
  <div class="card-body"><span class="card-k">${esc(KIND_LABEL[x.kind])}${when(x) ? `<span class="card-d"><span class="card-dot" aria-hidden="true"> · </span>${whenHtml(x)}</span>` : ''}</span><b>${titleHtml(x.title)}</b><span class="card-s">${esc(sub)}</span></div>
</a>`;
}
// Prints and small models: a collage of photo prints, each at its own aspect ratio, tilted a little.
// The picture is assets/thumbs/collage/<slug>.webp (native aspect), else the card thumbnail, else
// a blank print with the title, so a missing image never breaks the shelf.
const TILTS = [-2.4, 1.7, -1.1, 2.6, -0.5, 1.2, -2.0, 0.8];
const DROPS = [0, 16, -6, 10, -12, 6, 14, -4]; // px up or down: rows that do not line up exactly
function printCard(x, i) {
  const src = has(`/assets/thumbs/collage/${x.slug}.webp`) ? `/assets/thumbs/collage/${x.slug}.webp` : thumb(x);
  const d = src ? dims(src) : null;
  const ar = d ? d.w / d.h : 4 / 3;
  const img = src ? `<img src="${v(src)}" alt=""${d ? ` width="${d.w}" height="${d.h}"` : ''} loading="lazy" decoding="async">` : '<span class="pcard-none" aria-hidden="true"></span>';
  return `<a class="pcard" href="${url(x)}" style="--ar:${+ar.toFixed(4)};--tilt:${TILTS[i % TILTS.length]}deg;--dy:${DROPS[i % DROPS.length]}px">
  <span class="pcard-img">${img}${x.draft ? '<span class="badge draft">Draft</span>' : ''}</span><span class="pcard-t">${esc(x.title)}${when(x) ? `<small class="pcard-d">${esc(when(x))}</small>` : ''}</span>
</a>`;
}
// the project the live scene is showing: a media card, the photo filling the left column beside the
// title, text and buttons (it stretches to their height, so there is no gap on either side), and a
// footer with the fact and how to play with the scene. On a narrow card (phones) the photo runs
// across the top instead. The layout follows the card's own width (container queries in site.css).
function heroCard(x) {
  const img = `/assets/thumbs/${x.slug}.webp`, d = dims(img) || { w: 720, h: 462 };
  return `<aside class="scene-card" aria-labelledby="scene-card-h"><div class="sc-in">
  <div class="sc-media">
    <a class="sc-img" href="${url(x)}" tabindex="-1" aria-hidden="true"><img src="${v(img)}" alt="" width="${d.w}" height="${d.h}" decoding="async" fetchpriority="high"></a>
    <p class="sc-feat">${PIN_ICON}Featured project</p>
  </div>
  <div class="sc-main">
    <h2 id="scene-card-h">${titleHtml(x.title)}</h2>
    <p class="sc-sub">${esc(x.org)}${when(x) ? ` · <span class="nw">${esc(when(x))}</span>` : ''}</p>
    <p class="sc-p">${esc(x.short)} I came up with it, led the ${esc(x.team.replace(/ people$/, '-person'))} team, and designed and built all of the hardware.</p>
    <div class="sc-actions"><a class="nav-drive sc-drive" href="/drive">Drive the rover</a><a class="sc-go" href="${url(x)}">See more ${arrow}</a></div>
  </div>
  <div class="sc-foot">
    <p class="sc-fact"><b>First author</b> of the research poster at IEEE MIT URTC 2025</p>
    <p class="sc-hint"><span class="sc-live"><span class="dot"></span>Live 3D from my Fusion 360 CAD.</span> <span class="h-fine">Move your cursor: the rover drives there. Point far away and the drone carries it over.</span><span class="h-touch">Tap the ground: the rover drives there. Tap far away and the drone carries it over.</span></p>
  </div>
</div></aside>`;
}

function landing() {
  const featured = projects.filter((x) => x.featured && visible(x)).sort((a, b) => a.featured - b.featured);
  const heroProject = projects.find((x) => x.hero);
  // All work: Projects, Short projects, then Concepts as a quieter subsection (Jerry, Sept 28), with
  // a sort that turns the three into one list by date; the Archive and the prints stay below it
  const g = homeGroups();
  const { archive, objects } = g;
  const flat = [...g.projects, ...g.short, ...g.concepts];
  const rank = { new: new Map([...flat].sort(newestFirst).map((x, i) => [x, i])), old: new Map([...flat].sort(oldestFirst).map((x, i) => [x, i])) };
  const wcards = (group) => g[group].map((x) => card(x, { group, rank })).join('\n');
  const wgroup = (group, id, title, sub, cls = '') => g[group].length ? `<section class="wgroup ${cls}" id="${id}" aria-labelledby="${id}-h">
      <div class="wgroup-head"><h3 id="${id}-h">${title}</h3><p>${sub}</p></div>
      <div class="grid${group === 'concepts' ? ' grid-concepts' : ''}">${wcards(group)}</div>
    </section>` : '';
  const SORTS = [['default', 'Default'], ['new', 'Newest first'], ['old', 'Oldest first']];
  // "20+ more projects": everything not already on the first screen, rounded down to a 5
  const more = flat.length + archive.length + objects.length - featured.length - 1, moreLabel = more >= 10 ? `${Math.floor(more / 5) * 5}+` : String(more);
  // a fanned hand of little thumbnails from the projects below, so "more" reads at a glance
  const fan = [...flat, ...archive].filter((x) => !x.featured && !x.hero && has(`/assets/thumbs/mini/${x.slug}.webp`)).slice(0, 5);
  const shelf = (id, title, sub, items, cls = '') => items.length ? `<section class="archive ${cls}" id="${id}" aria-labelledby="${id}-h">
    <div class="archive-head"><h2 id="${id}-h">${title}</h2><p>${sub}</p></div>
    <div class="grid grid-archive">${items.map((x) => card(x)).join('\n')}</div>
  </section>` : '';
  const stageStill = '/assets/img/hero-still.webp';
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: site.name, url: site.url, email: `mailto:${site.email}`, sameAs: [site.linkedin, site.github], alumniOf: 'University of Illinois Urbana-Champaign', jobTitle: 'Mechanical Engineering Student' };
  return `${head({
    title: 'Jerry Li · Mechanical Engineering Portfolio',
    description: site.description,
    path: '/',
    extra: `${vendorImportMap()}
<link rel="preload" as="image" href="${v(stageStill)}" media="(min-width: 960px)" fetchpriority="high">
<link rel="preload" as="image" href="${v('/assets/img/hero-still-m.webp')}" media="(max-width: 959px)" fetchpriority="high">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
`,
  })}
<body class="home">
<a class="sr-only" href="#work">Skip to projects</a>
<div class="bg" data-stage aria-hidden="true">
  <picture><source media="(max-width: 959px)" srcset="${v('/assets/img/hero-still-m.webp')}"><img class="bg-still" src="${v(stageStill)}" alt="" width="1920" height="1080"></picture>
  <canvas class="bg-canvas" data-world="landing" data-hero="${v('/assets/js/world.js')}" data-assets="${worldAssets()}"></canvas>
</div>
<div class="veil" aria-hidden="true"></div>
<div class="veil-dim" data-dim aria-hidden="true"></div>
${nav({ home: true })}
<main class="content">
  <section class="hero" aria-label="Introduction">
    <div class="hero-left">
      <header class="hello">
        <h1 class="name">Jerry Li</h1>
        <p class="lede">Mechanical engineering at UIUC. I design and build robots, drones and electric vehicles, from the first CAD sketch to the last wire.</p>
        <ul class="chips">
          <li><a href="/projects/hybrid-vehicle"><b>First author</b>MIT Lincoln Laboratory research</a></li>
          <li><a href="/projects/ftc-decode"><b>1st place</b>FIRST World Championship award</a></li>
          <li><a href="#work"><b>5+</b>hackathons</a></li>
        </ul>
      </header>
      <div class="featured">
        <div class="f-col">${featured.filter((_, i) => i % 2 === 0).map(fcard).join('\n')}</div>
        <div class="f-col f-col-b">${featured.filter((_, i) => i % 2 === 1).map(fcard).join('\n')}</div>
      </div>
    </div>
    ${heroProject ? heroCard(heroProject) : ''}
  </section>
  <section class="work" id="work" aria-labelledby="work-h" data-work>
    <div class="work-head">
      <h2 id="work-h">All work</h2>
      <div class="sort" role="group" aria-labelledby="sort-l"><span class="sort-l" id="sort-l">Sort</span><span class="sort-g">${SORTS.map(([k, label], i) => `<button type="button" data-sort="${k}" aria-pressed="${i === 0}">${label}</button>`).join('')}</span></div>
      <p class="sr-only" role="status" data-sort-status></p>
    </div>
    <div class="work-groups">
    ${wgroup('projects', 'projects', 'Projects', 'A week or more')}
    ${wgroup('short', 'short-projects', 'Short projects', 'Under a week')}
    ${wgroup('concepts', 'concepts', 'Concepts', 'Designed in CAD, never finished.', 'wgroup-concepts')}
    </div>
    <div class="grid work-flat" hidden></div>
  </section>
  ${shelf('archive', 'Archive', '2023 and earlier: early robots and side builds.', archive)}
  ${objects.length ? `<section class="archive shelf-prints" id="prints" aria-labelledby="prints-h">
    <div class="archive-head"><h2 id="prints-h">Prints and small models</h2><p>Quick CAD and 3D printing experiments.</p></div>
    <div class="collage">${objects.map(printCard).join('\n')}</div>
  </section>` : ''}
  <section class="section about" id="about" aria-labelledby="about-h">
    <h2 class="about-title" id="about-h">About</h2>
    <div class="about-grid">
      <div class="about-text">${about.p.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      <div class="portrait"><img src="${v('/assets/media/jerry-portrait.webp')}" alt="Jerry Li" loading="lazy" width="960" height="1200"></div>
      <div class="contact-card" id="contact">
        <h3 class="contact-line">Always interested in new projects and problems to solve; let's connect!</h3>
        <ul class="contact-mail">${EMAILS.map(([l, e]) => `<li><span class="cm-l">${l}:</span> <a href="mailto:${e}">${e}</a></li>`).join('')}</ul>
        <p class="links-inline"><a href="${site.linkedin}" rel="me">LinkedIn ${arrow}</a><a href="${site.github}" rel="me">GitHub ${arrow}</a></p>
      </div>
    </div>
  </section>
  ${footer()}
</main>
<a class="more" href="#work" data-more aria-label="Scroll to ${moreLabel} more projects">
  <span class="more-fan" aria-hidden="true">${fan.map((x) => `<img src="${v(`/assets/thumbs/mini/${x.slug}.webp`)}" alt="" width="96" height="72">`).join('')}</span>
  <span class="more-txt"><b class="more-n">${moreLabel}</b><span class="more-l">more projects<br>below</span></span>
  <span class="more-arrow" aria-hidden="true">&darr;</span>
</a>
${scripts()}
</body>
</html>
`;
}

function drivePage() {
  // arrow keys drawn as one icon turned four ways, so all four read the same size (font arrows do not)
  const ARROW = (d) => `<kbd class="kbd-ar" aria-label="${{ u: 'Up', l: 'Left', d: 'Down', r: 'Right' }[d]} arrow"><svg class="ar-${d}" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.2V2.2M2.6 5.4 6 2l3.4 3.4"/></svg></kbd>`;
  const ARROW_KEYS = ['u', 'l', 'd', 'r'].map(ARROW).join('');
  const hv = projects.find((x) => x.slug === 'hybrid-vehicle'); // the vehicle this page drives
  const pad = (cls, keys, label) => `<div class="pad ${cls}" aria-hidden="true"><span class="pad-l">${label}</span><button type="button" data-k="${keys[0]}">&#9650;</button><div><button type="button" data-k="${keys[1]}">&#9664;</button><button type="button" data-k="${keys[2]}">&#9660;</button><button type="button" data-k="${keys[3]}">&#9654;</button></div></div>`;
  return `${head({
    title: 'Drive the rover · Jerry Li',
    description: `Drive the ${hv.title} across Mars, rendered in real time from my Fusion 360 CAD. Press X to undock the drone and fly it.`,
    path: '/drive',
    extra: `${vendorImportMap()}\n`,
  })}
<body class="drive" data-dock="docked">
<canvas class="drive-canvas" data-world="drive" data-hero="${v('/assets/js/world.js')}" data-assets="${worldAssets()}"></canvas>
<div class="drive-hud">
  <a class="chip" href="/">&larr; Back to portfolio</a>
  <p class="chip drive-title"><span class="dot"></span><span><a href="${url(hv)}">${titleHtml(hv.title)}</a>, from my CAD</span></p>
</div>
<div class="dock-bar"><button type="button" class="dock-btn x-btn" data-dock-toggle><kbd>X</kbd><span data-dock-label>Press X to detach the drone</span></button><button type="button" class="dock-btn f-btn" data-fly-toggle><kbd>F</kbd><span data-fly-label>Press F to fly</span></button></div>
<div class="split-line" aria-hidden="true"></div>
<p class="view-label vl-drone" aria-hidden="true"><b>Drone</b><span class="vl-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span><span class="num" data-v="drone">0.00 m/s</span><span class="num vl-alt" data-alt>0.0 m up</span></p>
<p class="view-label vl-rover" aria-hidden="true"><b>Rover</b><span class="vl-keys">${ARROW_KEYS}</span><span class="num" data-speed2>0.00 m/s</span></p>
<div class="feed" aria-hidden="true"><span class="feed-l">Belly camera</span><i></i><i></i><i></i><i></i></div>
<svg class="tag-overlay" aria-hidden="true"><polygon data-tag-quad points=""></polygon><g data-tag-ticks></g><text data-tag-text x="0" y="0"></text></svg>
<p class="dock-caption" data-caption role="status"></p>
<div class="drive-load" data-drive-load><b>Loading Mars</b><span>About 6 MB. Arrow keys or WASD to drive, X to detach the drone.</span></div>
<div class="drive-keys" data-keys><span class="dk-help"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or ${ARROW_KEYS} to drive</span><span class="speed num" data-v="rover">0.00 m/s</span></div>
${pad('pad-rover', ['up', 'left', 'down', 'right'], 'Rover')}
${pad('pad-drone', ['w', 'a', 's', 'd'], 'Drone')}
<script type="module">
  const $ = (s) => document.querySelector(s), body = document.body, c = $('.drive-canvas');
  const quad = $('[data-tag-quad]'), ticks = $('[data-tag-ticks]'), txt = $('[data-tag-text]'), cap = $('[data-caption]');
  // touch screens have no X or F key: the same buttons say Tap
  const TOUCH = matchMedia('(pointer: coarse)').matches;
  const LABEL = { docked: TOUCH ? 'Tap to detach the drone' : 'Press X to detach the drone', detaching: 'Undocking\u2026', split: TOUCH ? 'Tap to reattach' : 'Press X to reattach', attaching: 'Docking\u2026', lifting: '', carried: '', landing: '' };
  const FLY = { docked: TOUCH ? 'Tap to fly' : 'Press F to fly', lifting: 'Taking off\u2026', carried: TOUCH ? 'Tap to land' : 'Press F to land', landing: 'Landing\u2026' };
  // the keys bar: the same pieces in every mode, key boxes then a speed; split mode gets one group per vehicle
  const K = (...k) => k.map((x) => '<kbd>' + x + '</kbd>').join(''), WASD = K('W', 'A', 'S', 'D'), ARROWS = ${JSON.stringify(ARROW_KEYS)};
  const sp = (w) => '<span class="speed num" data-v="' + w + '">0.00 m/s</span>', help = (t) => '<span class="dk-help">' + t + '</span>';
  const grp = (name, keys, w) => '<span class="dk-grp"><b>' + name + '</b>' + (keys ? help(keys) : '') + sp(w) + '</span>';
  const HELP = {
    docked: help(WASD + ' or ' + ARROWS + ' to drive') + sp('rover'),
    split: grp('Drone', WASD, 'drone') + '<i class="dk-sep"></i>' + grp('Rover', ARROWS, 'rover'),
    detaching: help('Undocking') + sp('rover'),
    attaching: help('The drone is flying home') + '<i class="dk-sep"></i>' + grp('Drone', '', 'drone'),
    lifting: help('Lifting the rover') + sp('rover'),
    carried: help(WASD + ' or ' + ARROWS + ' to fly') + sp('rover'),
    landing: help('Setting down') + sp('rover'),
  };
  let vRover = [...document.querySelectorAll('[data-v="rover"], [data-speed2]')], vDrone = [];
  const onMode = ({ mode }) => { body.dataset.dock = mode; $('[data-dock-label]').textContent = LABEL[mode]; if (FLY[mode]) $('[data-fly-label]').textContent = FLY[mode]; $('[data-keys]').innerHTML = HELP[mode]; vRover = [...document.querySelectorAll('[data-v="rover"], [data-speed2]')]; vDrone = [...document.querySelectorAll('[data-v="drone"]')]; };
  if (TOUCH) { $('[data-dock-label]').textContent = LABEL.docked; $('[data-fly-label]').textContent = FLY.docked; }
  const onView = (f, portrait) => { document.documentElement.style.setProperty('--split', (f * 100).toFixed(3) + '%'); body.classList.toggle('is-split', f > 0.001); body.classList.toggle('split-wide', f > 0.4); body.classList.toggle('split-v', !!portrait); };
  const onCaption = (t) => { if (t) cap.textContent = t; cap.classList.toggle('on', !!t); };
  const onTag = (d) => {
    body.classList.toggle('feed-on', !!d);
    if (!d) { quad.setAttribute('points', ''); ticks.innerHTML = ''; txt.textContent = ''; return; }
    const cx = d.pts.reduce((a, p) => a + p[0], 0) / 4, cy = d.pts.reduce((a, p) => a + p[1], 0) / 4;
    body.dataset.tag = d.found ? (d.locked ? 'locked' : 'found') : 'search';
    if (d.found) {
      quad.setAttribute('points', d.pts.map((p) => p.join(',')).join(' '));
      ticks.innerHTML = d.pts.map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4"></circle>').join('') + '<line x1="' + (cx - 9) + '" y1="' + cy + '" x2="' + (cx + 9) + '" y2="' + cy + '"></line><line x1="' + cx + '" y1="' + (cy - 9) + '" x2="' + cx + '" y2="' + (cy + 9) + '"></line>';
      const top = Math.min(...d.pts.map((p) => p[1])), left = Math.min(...d.pts.map((p) => p[0]));
      txt.setAttribute('x', left); txt.setAttribute('y', top - 12);
      txt.textContent = (d.phase === 'approach' ? 'AprilTag found \u00b7 ' : d.phase === 'lock' ? 'LOCKED \u00b7 aligning \u00b7 ' : 'LOCKED \u00b7 descending \u00b7 ') + d.dist.toFixed(2) + ' m';
    } else { quad.setAttribute('points', ''); ticks.innerHTML = ''; const v = body.classList.contains('split-v'); txt.setAttribute('x', 24); txt.setAttribute('y', v ? innerHeight * 0.25 : innerHeight / 2); txt.textContent = 'Searching for the AprilTag\u2026'; }
  };
  const ms = (s) => Math.abs(s).toFixed(2) + ' m/s';
  const onSpeed = (s) => { const t = ms(s); for (const e of vRover) e.textContent = t; };
  const onDrone = (d) => { $('[data-alt]').textContent = d.alt.toFixed(1) + ' m up'; const t = ms(d.speed || 0); for (const e of vDrone) e.textContent = t; };
  import(c.dataset.hero).then((m) => m.initWorld(c, { mode: 'drive', assets: JSON.parse(c.dataset.assets || '{}'), debug: /[?&]__step/.test(location.search), onReady: () => { $('[data-drive-load]').classList.add('done'); window.__ready = true; }, onSpeed, onMode, onView, onCaption, onTag, onDrone }))
    .catch((e) => { $('[data-drive-load]').innerHTML = '<b>3D could not start</b><span>' + (e && e.message ? e.message : 'WebGL is unavailable') + '</span>'; window.__err = String(e); });
</script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- project page
// pieces shared by the simple page and the rich page (src/pages/<slug>.mjs)
function pageFacts(x) {
  const facts = [
    x.event && ['Event', x.event],
    x.place && ['Result', x.place],
    x.hours && ['Build time', x.hours],
    x.role && ['Role', x.role],
    x.team && ['Team', x.team],
    x.date && ['Timeline', x.date],
  ].filter(Boolean);
  const tags = x.tools?.length ? `<div><dt>Built with</dt><dd class="tags">${x.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</dd></div>` : '';
  const links = [...(x.links || [])];
  const linkBtns = links.length ? `<div class="btn-row">${links.map((l) => `<a class="btn" href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' rel="noopener"' : ''}>${esc(l.label)} ${arrow}</a>`).join('')}</div>` : '';
  return facts.length || tags || linkBtns ? `<aside class="facts">${facts.length || tags ? `<dl>${facts.map(([k, val]) => `<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join('')}${tags}</dl>` : ''}${linkBtns}</aside>` : '';
}
function pageHeader(x, stats = x.stats, md = esc) {
  return `<header class="p-head">
    <p class="p-kicker"><a href="/#work">&larr; All projects</a>${x.event || x.org ? `<span>${esc(x.event || x.org)}</span>` : ''}${x.date ? `<span>${esc(x.date)}</span>` : ''}${x.draft ? '<span class="draft-tag">Draft, waiting on media</span>' : ''}</p>
    <h1 class="p-title">${titleHtml(x.title)}</h1>
    ${x.subtitle ? `<p class="p-sub">${esc(x.subtitle)}</p>` : ''}
    <p class="p-lede">${esc(x.short)}</p>
    ${stats?.length ? `<div class="stats">${stats.map((s) => `<div class="stat"><b>${md(s.v)}</b><span>${md(s.l)}</span></div>`).join('')}</div>` : ''}
  </header>`;
}
const cadBlock = (x) => (x.cad ? `<h2 class="block-title">CAD</h2>
  <div class="cad" data-cad="${esc(x.cad)}">
    <div class="cad-load"><b>Interactive CAD model</b><span>Rotate and inspect the full design in Autodesk Viewer.</span><button class="hud-go" type="button">Load the 3D model ${arrow}</button></div>
  </div>` : '');
// rich pages: the page's own scroll-driven 3D replaces the click-to-load embed (Jerry: nothing gated
// behind a click); the full Fusion 360 model stays one plain link away
const cadLink = (x) => (x.cad ? `<p class="rx-cad-link"><a href="${esc(x.cad)}" rel="noopener">Open the full Fusion 360 model in Autodesk Viewer ${arrow}</a></p>` : '');
const nextLink = (next) => (next ? `<a class="next" href="${url(next)}"><span><span class="label">Next project</span><b>${titleHtml(next.title)}</b></span><span class="big-arrow" aria-hidden="true">&rarr;</span></a>` : '');

function projectPage(x, next) {
  const media = (x.media || []);
  const [first, ...rest] = media;
  const heroImg = poster(x) || og(x) || thumb(x);
  const desc = `${x.title}: ${x.short}`;
  return `${head({ title: `${x.title} · Jerry Li`, description: desc, path: url(x), image: heroImg ? heroImg : undefined })}
<body class="project">
${nav()}
<main class="page">
  ${pageHeader(x)}
  ${first ? `<figure class="hero-media" style="margin:28px 0 0">${mediaEl(first, { eager: true })}${first.c ? `<figcaption>${esc(first.c)}</figcaption>` : ''}</figure>` : (x.draft ? '<div class="pending">Photos and video for this project are on the way.</div>' : '')}
  <div class="p-grid">
    <div class="prose">${(x.body || []).map((b) => `<section><h2>${esc(b.h)}</h2>${b.p.map((t) => `<p>${esc(t)}</p>`).join('')}</section>`).join('')}</div>
    ${pageFacts(x)}
  </div>
  ${rest.length ? `<h2 class="block-title">Build log</h2><div class="gallery">${rest.map((m) => `<figure><div class="m">${mediaEl(m)}</div>${m.c ? `<figcaption>${esc(m.c)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
  ${cadBlock(x)}
  ${nextLink(next)}
  ${footer()}
</main>
${scripts()}
</body>
</html>
`;
}

// Rich layout, from src/pages/<slug>.mjs: header, hero, summary beside the facts, the page's
// sections, then the same CAD block, next link and footer as the simple page.
const rich = createRich({ ROOT, PREVIEW, esc, v, has, dims, mediaSrc });
function richPage(x, next, page) {
  const r = rich.render(x, page);
  for (const w of r.warnings) console.log(`  ! ${x.slug}: ${w}`);
  const heroImg = poster(x) || og(x) || thumb(x);
  const facts = pageFacts(x);
  const intro = r.summary || facts ? `<div class="rx-w"><div class="p-grid rx-intro${r.summary ? '' : ' rx-intro-facts'}">${r.summary || ''}${facts}</div></div>` : '';
  return `${head({ title: `${x.title} · Jerry Li`, description: `${x.title}: ${x.short}`, path: url(x), image: heroImg || undefined, extra: r.head })}
<body class="project rich">
${nav()}
<main class="rx" data-slug="${esc(x.slug)}" data-assets="${r.assets}">
  <div class="rx-w">${pageHeader(x, r.stats || x.stats, rich.md)}</div>
  ${r.hero}
  ${intro}
  ${r.sections}
  <div class="rx-w rx-end">
  ${cadLink(x)}
  ${nextLink(next)}
  ${footer()}
  </div>
</main>
${scripts(`\n<script type="module" src="${v('/assets/js/project.js')}"></script>`)}
</body>
</html>
`;
}

function redirectPage(to, title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>${iconLinks().replace(/\n/g, '')}<link rel="canonical" href="${site.url}${to}"><meta http-equiv="refresh" content="0; url=${to}"><meta name="robots" content="noindex"></head><body><p><a href="${to}">${esc(title)}</a></p></body></html>\n`;
}

function notFound() {
  return `${head({ title: 'Not found · Jerry Li', description: site.description, path: '/404', extra: PREVIEW ? '' : '<meta name="robots" content="noindex">\n' })}
<body class="project">${nav()}<main class="page"><header class="p-head"><p class="p-kicker"><span>404</span></p><h1 class="p-title">This page wandered off.</h1><p class="p-lede">The project you are looking for may have moved. Everything is on the <a href="/" style="color:var(--accent)">home page</a>.</p></header>${footer()}</main></body></html>
`;
}

// ---------------------------------------------------------------- write
const order = ['main', 'hackathon', 'concept', 'object', 'archive'];
const all = order.flatMap((k) => list(k));
mkdirSync(p('projects'), { recursive: true });
writeFileSync(p('index.html'), landing());
// optional rich pages; any failure falls back to the simple page
const pages = await loadPageModules(ROOT);
function renderProject(x, next) {
  const mod = pages.get(x.slug);
  if (mod) {
    try { return richPage(x, next, mod.page); } catch (e) { console.warn(`  ! ${mod.file} failed to render, ${x.slug} keeps its simple page: ${e.stack || e.message}`); }
  }
  return projectPage(x, next);
}
// "Next project" follows the home page: Projects, Short projects, Concepts, the Archive, then the
// prints, and wraps from the last back to the first (Jerry, Sept 28)
const seq = homeOrder();
for (const x of all) if (!seq.includes(x)) seq.push(x); // nothing is left without a next link
seq.forEach((x, i) => writeFileSync(p('projects', `${x.slug}.html`), renderProject(x, seq[(i + 1) % seq.length])));
for (const [slug, mod] of pages) {
  if (slug.startsWith('_')) continue;
  if (!projects.some((x) => x.slug === slug)) console.warn(`  ! ${mod.file}: no project with slug "${slug}" in src/projects.mjs`);
}
// pages whose name starts with _ (framework examples, scratch pages) exist in preview builds only,
// linked from nowhere; production builds delete them
for (const f of readdirSync(p('projects')).filter((n) => n.startsWith('_') && n.endsWith('.html'))) if (!PREVIEW) unlinkSync(p('projects', f));
if (PREVIEW) {
  for (const [slug, mod] of pages) {
    if (!slug.startsWith('_')) continue;
    const x = { slug, kind: 'main', title: slug, short: '', ...(mod.page.meta || {}), draft: false };
    try { writeFileSync(p('projects', `${slug}.html`), richPage(x, all[0], mod.page)); } catch (e) { console.warn(`  ! ${mod.file} failed to render: ${e.stack || e.message}`); }
  }
}
writeFileSync(p('about.html'), redirectPage('/#about', 'About Jerry Li'));
writeFileSync(p('contact.html'), redirectPage('/#contact', 'Contact Jerry Li'));
writeFileSync(p('404.html'), notFound());
writeFileSync(p('drive.html'), drivePage());
const urls = ['/', '/drive', ...all.filter((x) => !x.draft).map(url)];
writeFileSync(p('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(p('robots.txt'), PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`built ${all.length} project pages${PREVIEW ? ' (preview, drafts shown)' : ''}`);
for (const x of all) {
  const missing = (x.media || []).map(mediaSrc).filter((s) => !has(s.src)).map((s) => s.src);
  if (missing.length) console.log('  missing media for', x.slug, missing);
}
