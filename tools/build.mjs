// Static site generator for jerryli.design. Output is plain HTML committed to the repo,
// so GitHub Pages and Vercel both serve it with no build step on their side.
//   node tools/build.mjs            production (drafts hidden)
//   PREVIEW=1 node tools/build.mjs  preview (drafts shown with a label)
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site, projects, about } from '../src/projects.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PREVIEW = process.env.PREVIEW === '1';
const p = (...a) => join(ROOT, ...a);

// ---------------------------------------------------------------- helpers
const esc = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hashCache = new Map();
function v(url) { // cache-busting query from file contents
  const f = p(url.replace(/^\//, ''));
  if (!existsSync(f)) return url;
  if (!hashCache.has(f)) hashCache.set(f, createHash('sha1').update(readFileSync(f)).digest('hex').slice(0, 8));
  return `${url}?v=${hashCache.get(f)}`;
}
const has = (url) => existsSync(p(url.replace(/^\//, '')));
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
const preview = (x) => (has(`/assets/previews/${x.slug}.mp4`) ? `/assets/previews/${x.slug}.mp4` : null);
const poster = (x) => (has(`/assets/posters/${x.slug}.jpg`) ? `/assets/posters/${x.slug}.jpg` : null);
const kicker = (x) => [x.event || x.org, x.year].filter(Boolean).join(' · ');
const arrow = '<span class="arrow" aria-hidden="true">&#8599;</span>';

function mediaSrc(m) {
  if (m.v) {
    const name = m.v.replace(/^videos\//, '').replace(/\.mp4$/, '');
    return { type: 'video', src: `/assets/media/${name}.mp4`, poster: `/assets/media/posters/${name}.jpg` };
  }
  const name = m.i.replace(/^images\//, '').replace(/\.\w+$/, '');
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
const FONT = 'https://fonts.googleapis.com/css2?family=Mona+Sans:wdth,wght@75..125,200..900&display=swap';
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
<link rel="icon" href="${v('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT}">
<link rel="stylesheet" href="${v('/assets/css/site.css')}">
${PREVIEW ? '<meta name="robots" content="noindex">\n' : ''}${extra}</head>`;
}
function nav({ home = false } = {}) {
  const pre = home ? '' : '/';
  return `<nav class="nav" aria-label="Main">
  <a class="wordmark" href="/">Jerry Li</a>
  <div class="nav-links">
    <a href="${pre}#work">Projects</a>
    <a href="${pre}#hackathons">Hackathons</a>
    <a href="${pre}#archive">Archive</a>
    <a class="keep" href="${pre}#about">About</a>
    <a class="nav-cta" href="mailto:${site.email}">Contact</a>
  </div>
</nav>`;
}
const footer = () => `<footer class="footer"><span>&copy; ${new Date().getFullYear()} Jerry Li</span><span><a href="mailto:${site.email}">${site.email}</a></span></footer>`;
const scripts = (extra = '') => `<script src="${v('/assets/js/site.js')}" defer></script>${extra}`;

// ---------------------------------------------------------------- landing
function row(x, i) {
  const t = thumb(x), pv = preview(x), po = poster(x) || t;
  const data = po ? ` data-preview="${pv ? v(pv) : ''}" data-poster="${v(po)}" data-title="${esc(x.title)}" data-kicker="${esc(kicker(x))}"` : '';
  const stat = x.stats?.[0];
  const isHack = x.kind === 'hackathon';
  const meta = isHack
    ? [x.place ? `<span class="hi">${esc(x.place)}</span>` : '', `<span>${esc(x.event)}</span>`].filter(Boolean).join('')
    : [stat ? `<span><span class="hi">${esc(stat.v)}</span> ${esc(stat.l)}</span>` : '', x.org ? `<span>${esc(x.org)}</span>` : ''].filter(Boolean).join('');
  return `<a class="row" href="${url(x)}"${data}>
  <div class="row-thumb">${t ? `<img src="${v(t)}" alt="" ${x.kind === 'main' && i < 5 ? 'fetchpriority="low"' : 'loading="lazy"'} decoding="async">` : '<div class="placeholder">Media coming</div>'}<span class="row-cta">Click to <i>learn more</i></span></div>
  <div>
    <div class="row-top"><span class="row-n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(x.title)}</h3>${isHack ? `<span class="hours">${esc(x.hours)}</span>` : `<span class="row-yr">${esc(x.year)}</span>`}</div>
    <p class="row-sum">${esc(x.short)}${x.draft ? ' <span class="draft-tag">Draft</span>' : ''}</p>
    <p class="row-meta">${meta}</p>
  </div>
</a>`;
}
function tile(x) {
  const t = thumb(x), po = poster(x) || t;
  const data = po ? ` data-preview="" data-poster="${v(po)}" data-title="${esc(x.title)}" data-kicker="${esc(kicker(x))}"` : '';
  return `<a class="tile" href="${url(x)}"${data}>
  <div class="row-thumb">${t ? `<img src="${v(t)}" alt="" loading="lazy">` : '<div class="placeholder">Media coming</div>'}</div>
  <h3>${esc(x.title)}${x.draft ? ' <span class="draft-tag">Draft</span>' : ''}</h3><p>${esc(x.short)}</p>
</a>`;
}
function arow(x) {
  const t = thumb(x), pv = preview(x), po = poster(x) || t;
  const data = po ? ` data-preview="${pv ? v(pv) : ''}" data-poster="${v(po)}" data-title="${esc(x.title)}" data-kicker="${esc(kicker(x))}"` : '';
  return `<a class="arow" href="${url(x)}"${data}><span class="yr">${esc(x.year)}</span><span><b>${esc(x.title)}</b><span class="s">${esc(x.short)}</span></span><span class="go">View ${arrow}</span></a>`;
}
function section(id, title, items, render, note = '') {
  if (!items.length) return '';
  return `<section class="section" id="${id}" aria-labelledby="${id}-h">
  <div class="section-head"><h2 id="${id}-h">${title}<span class="count num">${items.length}</span></h2>${note ? `<p class="section-note">${note}</p>` : ''}</div>
  ${render(items)}
</section>`;
}

function landing() {
  const main = list('main'), hacks = list('hackathon'), concepts = list('concept'), objects = list('object'), archive = list('archive');
  const hero = projects.find((x) => x.slug === 'hybrid-vehicle');
  const stageStill = '/assets/img/hero-still.webp';
  const ld = { '@context': 'https://schema.org', '@type': 'Person', name: site.name, url: site.url, email: `mailto:${site.email}`, sameAs: [site.linkedin, site.github], alumniOf: 'University of Illinois Urbana-Champaign', jobTitle: 'Mechanical Engineering Student' };
  return `${head({
    title: 'Jerry Li · Mechanical Engineering Portfolio',
    description: site.description,
    path: '/',
    extra: `<script type="importmap">{"imports":{"three":"${v('/assets/vendor/three.module.min.js')}"}}</script>
<link rel="preload" as="image" href="${v(stageStill)}" fetchpriority="high">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
`,
  })}
<body class="home">
<a class="sr-only" href="#work">Skip to projects</a>
${nav({ home: true })}
<div class="split">
  <div class="index index-top">
    <header class="intro">
      <p class="label">Mechanical Engineering · University of Illinois Urbana-Champaign</p>
      <h1 class="name">Jerry Li</h1>
      <p class="lede">${esc(about.lede)}</p>
      <ul class="proof">
        <li><b>First author</b><span>Research poster, IEEE MIT URTC 2025</span></li>
        <li><b>1st place</b><span>Sustain Award, FIRST World Championship</span></li>
        <li><b>2nd of 250+</b><span>Teams at the Corgi hackathon</span></li>
      </ul>
      <p class="links-inline"><a href="mailto:${site.email}">Email ${arrow}</a><a href="${site.linkedin}" rel="me">LinkedIn ${arrow}</a><a href="${site.github}" rel="me">GitHub ${arrow}</a></p>
    </header>
  </div>
  <aside class="viewer" data-viewer data-stage-status="Real-time 3D from my &lt;span class=&quot;long&quot;&gt;Fusion 360 &lt;/span&gt;CAD" aria-label="Project preview">
    <div class="viewer-frame">
      <div class="stage" data-stage>
        <img class="stage-still" src="${v(stageStill)}" alt="My hybrid drone and rover, docked together, rendered from the CAD on a Mars landscape" width="1200" height="1500">
        <canvas class="stage-canvas" aria-hidden="true" data-models="${v('/assets/models/drone.glb')}|${v('/assets/models/rover.glb')}" data-hero="${v('/assets/js/hero.js')}"></canvas>
      </div>
      <div class="slot"><div class="slot-bg"></div></div>
      <div class="slot"><div class="slot-bg"></div></div>
      <div class="shade"></div>
      <div class="hud-top">
        <span class="chip"><span class="dot"></span><span data-status>Real-time 3D from my <span class="long">Fusion 360 </span>CAD</span></span>
        <button class="chip back-btn" type="button" data-back hidden>Back to the 3D scene</button>
      </div>
      <div class="hud">
        <div><p class="hud-k" data-hud-k>${esc(kicker(hero))}</p><p class="hud-t" data-hud-t>${esc(hero.title)}</p></div>
        <a class="hud-go" data-hud-go href="${url(hero)}">View project ${arrow}</a>
      </div>
    </div>
  </aside>
  <div class="index index-rest">
    ${section('work', 'Projects', main, (xs) => `<div class="rows">${xs.map(row).join('\n')}</div>`)}
    ${section('hackathons', 'Hackathons', hacks, (xs) => `<div class="rows">${xs.map(row).join('\n')}</div>`, 'Built in hours, not months.')}
    ${section('concepts', 'Concepts', concepts, (xs) => `<div class="tiles">${xs.map(tile).join('\n')}</div>`)}
    ${section('models', '3D models', objects, (xs) => `<div class="tiles">${xs.map(tile).join('\n')}</div>`)}
    ${section('archive', 'Archive', archive, (xs) => `<div class="rows">${xs.map(arow).join('\n')}</div>`, 'Older and smaller builds.')}
    <section class="section" id="about" aria-labelledby="about-h">
      <div class="section-head"><h2 id="about-h">About</h2></div>
      <div class="about-grid">
        <div>${about.p.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
        <div class="portrait"><img src="${v('/assets/media/jerry-portrait.webp')}" alt="Jerry Li" loading="lazy" width="960" height="1200"></div>
      </div>
      <div class="contact-card">
        <h3>Building something? I'd like to hear about it.</h3>
        <p class="links-inline"><a href="mailto:${site.email}">${site.email} ${arrow}</a><a href="${site.linkedin}">LinkedIn ${arrow}</a><a href="${site.github}">GitHub ${arrow}</a></p>
      </div>
    </section>
    ${footer()}
  </div>
</div>
${scripts()}
</body>
</html>
`;
}

// ---------------------------------------------------------------- project page
function projectPage(x, next) {
  const media = (x.media || []);
  const [first, ...rest] = media;
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
  const heroImg = poster(x) || thumb(x);
  const desc = `${x.title}: ${x.short}`;
  return `${head({ title: `${x.title} · Jerry Li`, description: desc, path: url(x), image: heroImg ? heroImg : undefined })}
<body class="project">
${nav()}
<main class="page">
  <header class="p-head">
    <p class="p-kicker"><a href="/#${x.kind === 'hackathon' ? 'hackathons' : x.kind === 'archive' ? 'archive' : 'work'}">&larr; All projects</a>${x.event || x.org ? `<span>${esc(x.event || x.org)}</span>` : ''}${x.date ? `<span>${esc(x.date)}</span>` : ''}${x.draft ? '<span class="draft-tag">Draft, waiting on media</span>' : ''}</p>
    <h1 class="p-title">${esc(x.title)}</h1>
    ${x.subtitle ? `<p class="p-sub">${esc(x.subtitle)}</p>` : ''}
    <p class="p-lede">${esc(x.short)}</p>
    ${x.stats?.length ? `<div class="stats">${x.stats.map((s) => `<div class="stat"><b>${esc(s.v)}</b><span>${esc(s.l)}</span></div>`).join('')}</div>` : ''}
  </header>
  ${first ? `<figure class="hero-media" style="margin:28px 0 0">${mediaEl(first, { eager: true })}</figure>${first.c ? `<figcaption>${esc(first.c)}</figcaption>` : ''}` : (x.draft ? '<div class="pending">Photos and video for this project are on the way.</div>' : '')}
  <div class="p-grid">
    <div class="prose">${(x.body || []).map((b) => `<section><h2>${esc(b.h)}</h2>${b.p.map((t) => `<p>${esc(t)}</p>`).join('')}</section>`).join('')}</div>
    <aside class="facts"><dl>${facts.map(([k, val]) => `<div><dt>${k}</dt><dd>${esc(val)}</dd></div>`).join('')}${tags}</dl>${linkBtns}</aside>
  </div>
  ${rest.length ? `<h2 class="block-title">Build log</h2><div class="gallery">${rest.map((m) => `<figure><div class="m">${mediaEl(m)}</div>${m.c ? `<figcaption>${esc(m.c)}</figcaption>` : ''}</figure>`).join('')}</div>` : ''}
  ${x.cad ? `<h2 class="block-title">CAD</h2>
  <div class="cad" data-cad="${esc(x.cad)}">
    <div class="cad-load"><b>Interactive CAD model</b><span>Rotate and inspect the full design in Autodesk Viewer.</span><button class="hud-go" type="button">Load the 3D model ${arrow}</button></div>
  </div>` : ''}
  ${next ? `<a class="next" href="${url(next)}"><span><span class="label">Next project</span><b>${esc(next.title)}</b></span><span class="big-arrow" aria-hidden="true">&rarr;</span></a>` : ''}
  ${footer()}
</main>
${scripts()}
</body>
</html>
`;
}

function redirectPage(to, title) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title><link rel="canonical" href="${site.url}${to}"><meta http-equiv="refresh" content="0; url=${to}"><meta name="robots" content="noindex"></head><body><p><a href="${to}">${esc(title)}</a></p></body></html>\n`;
}

function notFound() {
  return `${head({ title: 'Not found · Jerry Li', description: site.description, path: '/404' })}
<body class="project">${nav()}<main class="page"><header class="p-head"><p class="p-kicker"><span>404</span></p><h1 class="p-title">This page wandered off.</h1><p class="p-lede">The project you are looking for may have moved. Everything is on the <a href="/" style="color:var(--accent)">home page</a>.</p></header>${footer()}</main></body></html>
`;
}

// ---------------------------------------------------------------- write
const order = ['main', 'hackathon', 'concept', 'object', 'archive'];
const all = order.flatMap((k) => list(k));
mkdirSync(p('projects'), { recursive: true });
writeFileSync(p('index.html'), landing());
all.forEach((x, i) => writeFileSync(p('projects', `${x.slug}.html`), projectPage(x, all[(i + 1) % all.length])));
writeFileSync(p('about.html'), redirectPage('/#about', 'About Jerry Li'));
writeFileSync(p('contact.html'), redirectPage('/#about', 'Contact Jerry Li'));
writeFileSync(p('404.html'), notFound());
const urls = ['/', ...all.filter((x) => !x.draft).map(url)];
writeFileSync(p('sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.url}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(p('robots.txt'), PREVIEW ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);
console.log(`built ${all.length} project pages${PREVIEW ? ' (preview, drafts shown)' : ''}`);
for (const x of all) {
  const missing = (x.media || []).map(mediaSrc).filter((s) => !has(s.src)).map((s) => s.src);
  if (missing.length) console.log('  missing media for', x.slug, missing);
}
