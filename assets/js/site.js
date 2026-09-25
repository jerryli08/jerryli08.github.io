// Landing page: progressive 3D background, hover previews, lazy media, CAD embeds.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------------------------------------------------------- lazy video (project pages)
  const lazy = document.querySelectorAll('video[data-src]');
  if (lazy.length) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.src) v.src = v.dataset.src;
          if (!reduced) v.play().catch(() => {});
        } else if (!v.paused) v.pause();
      }
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    lazy.forEach((v) => io.observe(v));
  }

  // ---------------------------------------------------------- CAD click-to-load
  document.querySelectorAll('[data-cad]').forEach((box) => {
    box.querySelector('button')?.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = box.dataset.cad; f.title = 'Interactive CAD model'; f.allow = 'fullscreen'; f.setAttribute('allowfullscreen', '');
      box.innerHTML = ''; box.appendChild(f);
    });
  });

  // ---------------------------------------------------------- 3D background
  // The still render paints instantly. The real-time scene (three.js, the two CAD models and
  // the Mars textures) loads only after the page itself has finished loading, and never on
  // data-saver or 2G/3G connections or without WebGL.
  const stage = document.querySelector('[data-stage]');
  const canvas = stage?.querySelector('canvas');
  const conn = navigator.connection || {};
  const slow = conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (canvas && !slow && webgl && !/[?&]no3d/.test(location.search)) {
    const start = () => import(canvas.dataset.hero)
      .then((m) => m.initWorld(canvas, { mode: 'landing', onReady: () => stage.classList.add('live') }))
      .catch((e) => { console.warn('3D background unavailable', e); });
    const idle = () => (('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2000 }) : setTimeout(start, 200));
    document.readyState === 'complete' ? idle() : addEventListener('load', idle, { once: true });
  }

  // ---------------------------------------------------------- scroll: darken the scene behind the work
  const dim = document.querySelector('[data-dim]');
  const tag = document.querySelector('[data-scene-tag]');
  const nav = document.querySelector('.home .nav');
  const peek = document.querySelector('[data-peek]');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const t = clamp01(scrollY / (innerHeight * 0.8));
    if (dim) dim.style.opacity = (t * 0.9).toFixed(3);
    nav?.classList.toggle('scrolled', scrollY > innerHeight * 0.35);
    if (tag) tag.style.opacity = String(1 - clamp01((t - 0.2) / 0.4));
    if (t > 0.45 && peek && !peek.hidden) closePeek();
  };
  function clamp01(x) { return Math.min(1, Math.max(0, x)); }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------------------------------------------------------- filters
  const tiles = [...document.querySelectorAll('.tile')];
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    const k = b.dataset.filter;
    tiles.forEach((t) => { t.hidden = k !== 'all' && t.dataset.kind !== k; });
  }));

  if (!canHover) return;

  // ---------------------------------------------------------- grid tiles: the clip plays inside the tile
  for (const t of tiles) {
    if (!t.dataset.preview) continue;
    let timer = 0;
    t.addEventListener('pointerenter', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        let vid = t.querySelector('video');
        if (!vid) {
          vid = document.createElement('video');
          vid.muted = true; vid.loop = true; vid.playsInline = true; vid.setAttribute('muted', ''); vid.setAttribute('playsinline', '');
          vid.preload = 'auto'; vid.src = t.dataset.preview;
          vid.addEventListener('playing', () => t.classList.add('playing'));
          t.insertBefore(vid, t.querySelector('.tile-shade'));
        }
        if (!reduced) vid.play().catch(() => {});
      }, 120);
    });
    t.addEventListener('pointerleave', () => { clearTimeout(timer); const vid = t.querySelector('video'); if (vid) { vid.pause(); t.classList.remove('playing'); } });
  }

  // ---------------------------------------------------------- featured: preview panel over the scene
  if (!peek) return;
  const slots = [...peek.querySelectorAll('.slot')];
  const kEl = peek.querySelector('[data-peek-k]'), tEl = peek.querySelector('[data-peek-t]'), go = peek.querySelector('[data-peek-go]');
  const items = [...document.querySelectorAll('[data-peek-item]')];
  let front = -1, current = null, timer = 0;
  function show(el) {
    if (current === el) return;
    current = el;
    items.forEach((i) => i.classList.toggle('is-active', i === el));
    const { preview, poster, title, kicker } = el.dataset;
    const next = (front + 1) % slots.length, slot = slots[next];
    slot.querySelector('.slot-bg').style.backgroundImage = `url("${poster}")`;
    let media;
    if (preview && !reduced) {
      media = document.createElement('video');
      media.muted = true; media.loop = true; media.playsInline = true; media.autoplay = true;
      media.setAttribute('muted', ''); media.setAttribute('playsinline', '');
      media.poster = poster; media.src = preview;
    } else { media = document.createElement('img'); media.src = poster; media.alt = ''; }
    media.className = 'slot-media';
    const fit = () => {
      const w = media.videoWidth || media.naturalWidth, h = media.videoHeight || media.naturalHeight;
      if (!w || !h) return;
      const box = slot.getBoundingClientRect();
      media.classList.toggle('cover', Math.abs(Math.log((w / h) / (box.width / box.height))) < 0.25);
    };
    media.addEventListener('loadedmetadata', fit); media.addEventListener('load', fit);
    const old = slot.querySelector('.slot-media');
    old ? old.replaceWith(media) : slot.appendChild(media);
    media.play?.().catch(() => {});
    slots.forEach((s2, i) => s2.classList.toggle('on', i === next));
    const prev = slots[front];
    if (prev) setTimeout(() => { if (!prev.classList.contains('on')) prev.querySelector('video')?.pause(); }, 450);
    front = next;
    kEl.textContent = kicker; tEl.textContent = title;
    go.setAttribute('href', el.getAttribute('href')); go.setAttribute('aria-label', `View project: ${title}`);
    peek.hidden = false;
  }
  function closePeek() {
    current = null;
    items.forEach((i) => i.classList.remove('is-active'));
    peek.hidden = true;
    slots.forEach((s2) => s2.querySelector('video')?.pause());
  }
  peek.querySelector('[data-peek-x]').addEventListener('click', closePeek);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closePeek(); });
  for (const el of items) {
    el.addEventListener('pointerenter', () => { clearTimeout(timer); timer = setTimeout(() => show(el), current ? 60 : 110); });
    el.addEventListener('pointerleave', () => clearTimeout(timer));
    el.addEventListener('focus', () => show(el));
  }
})();
