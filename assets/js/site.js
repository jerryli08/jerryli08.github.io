// Landing page: progressive 3D background, scroll dimming, filters, lazy media, CAD embeds.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  const more = document.querySelector('[data-more]');
  const nav = document.querySelector('.home .nav');
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const t = clamp01(scrollY / (innerHeight * 0.8));
    if (dim) dim.style.opacity = (t * 0.9).toFixed(3);
    nav?.classList.toggle('scrolled', scrollY > innerHeight * 0.35);
    if (more) { const o = 1 - clamp01((t - 0.04) / 0.2); more.style.opacity = String(o); more.classList.toggle('gone', o < 0.05); }
  };
  function clamp01(x) { return Math.min(1, Math.max(0, x)); }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  // ---------------------------------------------------------- filters
  const tiles = [...document.querySelectorAll('.work .tile')];
  document.querySelectorAll('[data-filter]').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
    const k = b.dataset.filter;
    tiles.forEach((t) => { t.hidden = k !== 'all' && t.dataset.kind !== k; });
  }));

})();
