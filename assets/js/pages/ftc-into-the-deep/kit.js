// Shared bits for the FTC INTO THE DEEP page's 2D demos. There is no CAD for this season, so every
// demo here is built from real photos, renders and clips (no WebGL, no stand-in geometry).
// Styles are scoped to .itd-* and injected once.
const CSS = `
.itd { position: absolute; inset: 0; color: var(--text); font-family: inherit; }
.itd *, .itd *::before, .itd *::after { box-sizing: border-box; }
.itd-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px; border-radius: 999px; background: rgba(10, 8, 7, 0.72); border: 1px solid rgba(255, 255, 255, 0.14); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); font-size: 12.5px; line-height: 1.3; color: var(--text-2); }
.itd-chip b { color: var(--text); font-weight: 650; }
.itd-kicker { font-size: 11.5px; font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.itd-flag { --flag: 255, 92, 92; margin-top: 12px; padding: 9px 12px 10px; border-radius: 10px; border: 1px solid rgba(var(--flag), 0.38); border-left-width: 4px; background: rgba(var(--flag), 0.08); font-size: 14px; line-height: 1.45; color: var(--text-2); }
.itd-flag-fix { --flag: 52, 199, 110; }
.itd-flag span { display: inline-block; margin-right: 6px; padding: 1px 8px; border-radius: 999px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgb(var(--flag)); background: rgba(var(--flag), 0.16); border: 1px solid rgba(var(--flag), 0.42); vertical-align: 1px; }
.itd-media { position: relative; overflow: hidden; background: #0c0a09; }
.itd-media > img, .itd-media > video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
.itd-play { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 58px; height: 58px; border-radius: 50%; display: grid; place-items: center; background: rgba(10, 8, 7, 0.62); border: 1px solid rgba(255, 255, 255, 0.22); color: var(--text); cursor: pointer; transition: background 0.2s, opacity 0.2s; }
.itd-play:hover { background: rgba(255, 107, 53, 0.85); }
.itd-play svg { width: 20px; height: 20px; fill: currentColor; margin-left: 3px; }
.itd-play[hidden] { display: none; }
.itd-fade { transition: opacity 0.3s var(--ease, ease); }
.itd-reduced .itd-fade { transition: none; }
.itd [hidden] { display: none !important; }
.itd :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
`;
let injected = false;
export function css() {
  if (injected || document.getElementById('itd-css')) { injected = true; return; }
  const s = document.createElement('style');
  s.id = 'itd-css';
  s.textContent = CSS;
  document.head.appendChild(s);
  injected = true;
}

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// **bold** only, everything else as text (captions come from the page file)
export function rich(el, text) {
  el.replaceChildren();
  String(text).split(/(\*\*[^*]+\*\*)/).forEach((part) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) el.appendChild(h('b', null, part.slice(2, -2)));
    else if (part) el.appendChild(document.createTextNode(part));
  });
  return el;
}

export const mediaUrl = (ctx, name) => ctx.asset(name.startsWith('/') ? name : `/assets/media/${ctx.slug}/${name}`);
export const posterOf = (name) => name.replace(/\.mp4$/, '.jpg');

// A muted clip that loads nothing until it is asked to play (poster first). With reduced motion
// it shows its own controls, as the site's other videos do. opts.start (seconds) skips the start of
// a clip: no poster (the poster is the clip's first frame), the frame at \`start\` is shown instead,
// and each loop restarts there.
export function clip(ctx, name, alt, opts = {}) {
  const v = document.createElement('video');
  const start = opts.start || 0;
  v.muted = true; v.playsInline = true; v.loop = !start; v.preload = 'none';
  v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
  if (!start) v.poster = mediaUrl(ctx, posterOf(name));
  v.setAttribute('aria-label', alt || 'Video');
  if (ctx.reducedMotion) v.controls = true;
  let loaded = false;
  const load = (preload = 'auto') => {
    if (!loaded) { loaded = true; v.preload = preload; v.src = `${mediaUrl(ctx, name)}${start ? `#t=${start}` : ''}`; }
    else if (preload === 'auto') v.preload = 'auto';
  };
  if (start) {
    load('metadata');
    v.addEventListener('ended', () => { v.currentTime = start; v.play().catch(() => {}); });
  }
  return { el: v, load, play() { load(); return v.play().catch(() => {}); }, pause() { v.pause(); } };
}

export const PLAY_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg>';

// Horizontal swipe on touch screens (vertical swipes still scroll the page)
export function onSwipe(el, fn) {
  let x0 = null, y0 = null;
  const start = (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; };
  const end = (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) fn(dx < 0 ? 1 : -1);
  };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', end, { passive: true });
  return () => { el.removeEventListener('touchstart', start); el.removeEventListener('touchend', end); };
}
