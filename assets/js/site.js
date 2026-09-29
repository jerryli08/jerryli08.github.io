// Every page: lazy media, CAD embeds, smooth in-page links. Landing: progressive 3D background,
// scroll dimming, the All work sort.
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
      .then((m) => m.initWorld(canvas, { mode: 'landing', assets: JSON.parse(canvas.dataset.assets || '{}'), onReady: () => stage.classList.add('live') }))
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

  // ---------------------------------------------------------- in-page links: smooth, and focus follows
  // Work, About and Contact in the nav (and any other #link to this page) glide to their section,
  // or jump with reduced motion; the section then takes keyboard focus without a second scroll.
  const samePage = (a) => a.hash && a.origin === location.origin && a.pathname.replace(/\/index\.html$/, '/') === location.pathname.replace(/\/index\.html$/, '/');
  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href*="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !samePage(a)) return;
    let el = null;
    try { el = document.getElementById(decodeURIComponent(a.hash.slice(1))); } catch { /* not an id */ }
    if (!el) return;
    e.preventDefault();
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    if (location.hash !== a.hash) history.pushState(null, '', a.hash);
    if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
  });

  // ---------------------------------------------------------- All work: sort
  // Default shows the three groups (Projects, Short projects, Concepts); Newest first and Oldest
  // first move the same cards into one list by date (their ranks come from the build) and back.
  // The choice lasts for the visit, so the back button returns to the same list.
  const work = document.querySelector('[data-work]');
  if (work) {
    const groups = work.querySelector('.work-groups'), flat = work.querySelector('.work-flat');
    const cards = [...groups.querySelectorAll('.card')], home = cards.map((c) => c.parentElement);
    const btns = [...work.querySelectorAll('[data-sort]')], status = work.querySelector('[data-sort-status]');
    const SAID = { default: 'Grouped: projects, short projects, concepts', new: 'Sorted newest first', old: 'Sorted oldest first' };
    let mode = 'default';
    const apply = (m, announce) => {
      if (!SAID[m] || m === mode) return;
      mode = m;
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sort === m)));
      if (m === 'default') cards.forEach((c, i) => home[i].appendChild(c)); // cards are in document order
      else [...cards].sort((a, b) => a.dataset[m] - b.dataset[m]).forEach((c) => flat.appendChild(c));
      groups.hidden = m !== 'default'; flat.hidden = m === 'default';
      work.dataset.sorted = m;
      if (announce && status) status.textContent = SAID[m];
      try { sessionStorage.setItem('work-sort', m); } catch { /* storage off */ }
    };
    btns.forEach((b) => b.addEventListener('click', () => apply(b.dataset.sort, true)));
    let saved = null;
    try { saved = sessionStorage.getItem('work-sort'); } catch { /* storage off */ }
    if (saved) apply(saved, false);
  }

})();
