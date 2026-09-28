// Shared bits for the FTC INTO THE DEEP page's scroll-driven slideshows. There is no CAD for this
// season, so every scrolly here is built from real photos, renders and clip stills (webgl: false,
// no stand-in geometry). Every picture is a pure function of the scroll position: nothing plays,
// nothing animates on its own and there is nothing to click, drag or press.
// Styles are scoped to .itd-* and injected once per page.
const BASE = `
.itd { position: absolute; inset: 0; color: var(--text); font-family: inherit; }
.itd *, .itd *::before, .itd *::after { box-sizing: border-box; }
.itd-chip { display: inline-flex; align-items: center; gap: 8px; padding: 5px 11px; border-radius: 999px; background: rgba(10, 8, 7, 0.76); border: 1px solid rgba(255, 255, 255, 0.14); font-size: var(--rx-ov-small); line-height: 1.35; color: var(--text-2); }
.itd-chip b { color: var(--text); font-weight: 650; }
.itd-kicker { margin: 0; font-size: var(--rx-ov-small); font-weight: 650; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.itd-box { position: absolute; overflow: hidden; }
.itd-box > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; opacity: 0; }
.itd [hidden] { display: none !important; }
`;

export function css(id, text) {
  if (!document.getElementById('itd-css')) {
    const s = document.createElement('style'); s.id = 'itd-css'; s.textContent = BASE; document.head.appendChild(s);
  }
  if (id && !document.getElementById(id)) {
    const s = document.createElement('style'); s.id = id; s.textContent = text; document.head.appendChild(s);
  }
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

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// A file in this page's media folder (a clip's name gives its poster). `small`: use the 800 px copy
// (name-s.webp) when the stage is narrow.
export function mediaUrl(ctx, name, small = false) {
  let n = name.replace(/\.mp4$/, '.jpg');
  if (small && /\.webp$/.test(n)) n = n.replace(/\.webp$/, '-s.webp');
  return ctx.asset(n.startsWith('/') ? n : `/assets/media/${ctx.slug}/${n}`);
}

// A stack of pictures in one box. show(a, b, k): picture a fully shown and picture b (or -1) over it
// at opacity k, everything else hidden. Pictures load a few ahead of the one shown, so scrolling on
// finds them ready. Only styles that change are written.
export function stack(box, srcs, alts, ahead = 3) {
  const imgs = [];
  const get = (i) => {
    if (!imgs[i]) {
      const im = h('img'); im.alt = alts[i] || ''; im.decoding = 'async'; im.src = srcs[i];
      box.appendChild(im);
      imgs[i] = im;
    }
    return imgs[i];
  };
  let last = new Map();
  const set = (im, o, z) => {
    const os = String(o), zs = String(z);
    if (im.style.opacity !== os) im.style.opacity = os;
    if (im.style.zIndex !== zs) im.style.zIndex = zs;
  };
  return {
    show(a, b = -1, k = 0) {
      const n = srcs.length;
      for (let i = Math.max(0, a - 1); i <= Math.min(n - 1, a + ahead); i++) get(i);
      const want = new Map([[a, [1, 1]]]);
      if (b >= 0 && b < n && b !== a && k > 0.001) want.set(b, [k, 2]);
      for (const [i] of last) if (!want.has(i)) set(imgs[i], 0, 0);
      for (const [i, [o, z]] of want) set(get(i), o, z);
      last = want;
    },
  };
}
