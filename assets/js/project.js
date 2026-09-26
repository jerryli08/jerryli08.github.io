// Runtime for rich project pages (pages built from src/pages/<slug>.mjs). Loaded as a module on
// those pages only. It handles:
//   - videos: muted loops that load and play only while on screen, poster first
//   - photos: click to open a lightbox (Esc closes, arrow keys and swipes step through)
//   - demos, split modules and scrollies: import the page's module when it comes near the
//     viewport and call mount(el, ctx); keep the poster (with a note) if WebGL or the module fails
//   - scrollies: feed the module the section's scroll progress 0..1 and the active step
// The module contract is documented in tools/pages/README.md.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const conn = navigator.connection || {};
  const slow = !!conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  const main = document.querySelector('[data-assets]');
  let ASSETS = {};
  try { ASSETS = JSON.parse(main?.getAttribute('data-assets') || '{}'); } catch { /* plain paths */ }
  const asset = (path) => {
    if (typeof path !== 'string' || /^(https?:|data:|blob:)/.test(path) || /[?&]v=/.test(path)) return path;
    const key = path.startsWith('/') ? path : path.startsWith('assets/') ? `/${path}` : `/assets/${path.replace(/^\.?\//, '')}`;
    return ASSETS[key] || key;
  };
  let webgl = null;
  const hasWebGL = () => {
    if (webgl === null) {
      try {
        const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
        webgl = !!gl;
        gl?.getExtension('WEBGL_lose_context')?.loseContext(); // give the test context back right away
      } catch { webgl = false; }
    }
    return webgl;
  };

  // ---------------------------------------------------------------- videos
  // With reduced motion or data saver on, nothing plays by itself: the video shows its controls.
  const vids = [...document.querySelectorAll('video[data-rx-src]')];
  const autoplay = !reduced && !slow;
  if (vids.length) {
    const near = new IntersectionObserver((es) => {
      for (const e of es) if (e.isIntersecting && !e.target.src) { e.target.src = e.target.dataset.rxSrc; e.target.load(); }
    }, { rootMargin: '600px 0px' });
    const seen = new IntersectionObserver((es) => {
      for (const e of es) {
        const v = e.target;
        if (e.isIntersecting && autoplay && !v.dataset.userPaused) {
          if (!v.src) { v.src = v.dataset.rxSrc; v.load(); }
          v.play().catch(() => {});
        } else if (!e.isIntersecting && !v.paused) v.pause();
      }
    }, { threshold: 0.2 });
    for (const v of vids) {
      near.observe(v); seen.observe(v);
      if (!autoplay) v.controls = true;
      else v.addEventListener('click', () => {
        if (v.paused) { delete v.dataset.userPaused; v.play().catch(() => {}); } else { v.dataset.userPaused = '1'; v.pause(); }
      });
    }
  }

  // ---------------------------------------------------------------- lightbox
  const shots = [...document.querySelectorAll('a[data-lb]')];
  if (shots.length) {
    let dlg = null, idx = 0, startX = null;
    const build = () => {
      dlg = document.createElement('dialog');
      dlg.className = 'rx-lb';
      dlg.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure>'
        + '<button type="button" class="rx-lb-x" aria-label="Close">&times;</button>'
        + '<button type="button" class="rx-lb-prev" aria-label="Previous photo">&larr;</button>'
        + '<button type="button" class="rx-lb-next" aria-label="Next photo">&rarr;</button>'
        + '<p class="rx-lb-n num" aria-live="polite"></p>';
      document.body.appendChild(dlg);
      dlg.querySelector('.rx-lb-x').addEventListener('click', () => dlg.close());
      dlg.querySelector('.rx-lb-prev').addEventListener('click', () => show(idx - 1));
      dlg.querySelector('.rx-lb-next').addEventListener('click', () => show(idx + 1));
      dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.tagName === 'FIGURE') dlg.close(); });
      dlg.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { show(idx - 1); e.preventDefault(); }
        if (e.key === 'ArrowRight') { show(idx + 1); e.preventDefault(); }
      });
      dlg.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      dlg.addEventListener('touchend', (e) => {
        if (startX == null) return;
        const dx = e.changedTouches[0].clientX - startX; startX = null;
        if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      });
      dlg.addEventListener('close', () => { document.documentElement.classList.remove('rx-lb-open'); shots[idx]?.focus({ preventScroll: true }); });
    };
    const show = (i) => {
      idx = (i + shots.length) % shots.length;
      const a = shots[idx], img = dlg.querySelector('img');
      img.src = a.href; img.alt = a.dataset.alt || '';
      dlg.querySelector('figcaption').textContent = a.dataset.caption || '';
      dlg.querySelector('.rx-lb-n').textContent = shots.length > 1 ? `${idx + 1} / ${shots.length}` : '';
      dlg.classList.toggle('single', shots.length < 2);
    };
    shots.forEach((a, i) => a.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button > 0) return; // new tab still works
      e.preventDefault();
      if (!dlg) build();
      show(i);
      document.documentElement.classList.add('rx-lb-open');
      dlg.showModal();
    }));
  }

  // ---------------------------------------------------------------- demos, split modules, scrollies
  // Each block: [data-rx-block] with data-module (hashed URL), a stage element [data-rx-stage]
  // holding the poster, and for demos a controls strip [data-rx-panel].
  const blocks = [...document.querySelectorAll('[data-rx-block]')];
  const MAX_LIVE = isTouch ? 4 : 6; // browsers cap live WebGL contexts; far-away demos are unmounted
  const live = new Set();
  const state = new WeakMap();
  const note = (b, text) => {
    const n = b.querySelector('[data-rx-note]');
    if (n) { n.textContent = text; n.hidden = !text; }
  };
  const status = (b, s) => { b.dataset.state = s; };

  function evict() {
    if (live.size <= MAX_LIVE) return;
    const mid = innerHeight / 2;
    const far = [...live].filter((b) => !state.get(b).near)
      .sort((a, b) => Math.abs(b.getBoundingClientRect().top - mid) - Math.abs(a.getBoundingClientRect().top - mid));
    while (live.size > MAX_LIVE && far.length) unmount(far.shift());
  }
  function unmount(b) {
    const st = state.get(b);
    try { st.api?.dispose?.(); } catch (e) { console.error(`[${b.id}] dispose failed`, e); }
    b.querySelector('[data-rx-stage]').dispatchEvent(new Event('rx:unmount')); // frees any stage the module left behind
    for (const n of st.added || []) n.remove();
    st.panel?.replaceChildren();
    st.api = null; st.mounting = null;
    live.delete(b);
    status(b, 'idle');
  }

  async function mount(b) {
    const st = state.get(b);
    if (st.api || st.mounting) return;
    if (b.dataset.webgl !== 'false' && !hasWebGL()) {
      status(b, 'failed');
      note(b, 'Interactive 3D needs WebGL, which this browser has turned off.');
      return;
    }
    if (slow && !st.consent) {
      status(b, 'ask');
      return;
    }
    const stage = b.querySelector('[data-rx-stage]');
    const before = new Set(stage.children);
    status(b, 'loading');
    let data = {};
    try { data = JSON.parse(b.dataset.rxData || '{}'); } catch { /* none */ }
    const ctx = {
      id: b.id, slug: main?.dataset.slug || '', data, asset, reducedMotion: reduced, isTouch,
      panel: st.panel, kind: b.dataset.rxBlock,
    };
    st.mounting = (async () => {
      const mod = await import(b.dataset.module);
      const fn = mod.mount || mod.default?.mount || (typeof mod.default === 'function' ? mod.default : null);
      if (!fn) throw new Error('the module exports no mount(el, ctx)');
      return (await fn(stage, ctx)) || {};
    })();
    try {
      const api = await st.mounting;
      st.api = api;
      st.added = [...stage.children].filter((n) => !before.has(n));
      live.add(b);
      status(b, 'live');
      note(b, '');
      if (st.progress != null) callProgress(b, st, true);
      evict();
    } catch (e) {
      console.error(`[${b.id}] demo module failed:`, e);
      stage.dispatchEvent(new Event('rx:unmount'));
      for (const n of [...stage.children]) if (!before.has(n)) n.remove();
      st.panel?.replaceChildren();
      status(b, 'failed');
      note(b, /webgl/i.test(String(e && e.message)) ? 'Interactive 3D needs WebGL, which this browser has turned off.' : 'The interactive view could not load.');
    } finally {
      st.mounting = null;
    }
  }

  const nearIO = new IntersectionObserver((es) => {
    for (const e of es) {
      const st = state.get(e.target);
      st.near = e.isIntersecting;
      if (e.isIntersecting && e.target.dataset.state !== 'failed') mount(e.target);
    }
  }, { rootMargin: '400px 0px' });
  for (const b of blocks) {
    const st = { near: false, api: null, panel: b.querySelector('[data-rx-panel]'), progress: null };
    state.set(b, st);
    status(b, 'idle');
    b.querySelector('[data-rx-load]')?.addEventListener('click', () => { st.consent = true; mount(b); });
    nearIO.observe(b);
  }

  // ---------------------------------------------------------------- scrolly progress
  const scrollies = blocks.filter((b) => b.dataset.rxBlock === 'scrolly');
  function callProgress(b, st, force) {
    if (!st.api?.setProgress) return;
    const key = `${st.progress.toFixed(5)}|${st.step}|${st.stepP.toFixed(4)}`;
    if (!force && key === st.lastKey) return;
    st.lastKey = key;
    try { st.api.setProgress(st.progress, st.step, st.stepP); } catch (e) { console.error(`[${b.id}] setProgress failed`, e); }
  }
  function measure(b, force) {
    const st = state.get(b);
    const body = b.querySelector('.rx-scrolly-body'), stage = b.querySelector('.rx-scrolly-stage');
    const r = body.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(stage).top) || 0;
    const span = r.height - stage.offsetHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, (top - r.top) / span)) : 0;
    // the active step is the last one whose top has come up past the line (60% down the screen;
    // lower on phones, where the cards ride at the bottom): --rx-line in site.css
    const line = innerHeight * (parseFloat(getComputedStyle(b).getPropertyValue('--rx-line')) || 0.6);
    const steps = st.steps || (st.steps = [...b.querySelectorAll('[data-step]')]);
    let step = 0, stepP = 0;
    steps.forEach((s, i) => { const sr = s.getBoundingClientRect(); if (sr.top <= line) { step = i; stepP = Math.min(1, Math.max(0, (line - sr.top) / (sr.height || 1))); } });
    if (step !== st.step) {
      steps.forEach((s, i) => s.classList.toggle('is-active', i === step));
      b.dataset.step = String(step);
    }
    st.progress = p; st.step = step; st.stepP = stepP;
    callProgress(b, st, force);
  }
  if (scrollies.length) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { ticking = false; for (const b of scrollies) if (state.get(b).near || state.get(b).api) measure(b); });
    };
    addEventListener('scroll', onScroll, { passive: true });
    // a resize changes the stage's shape: re-send the progress so the module can re-frame
    addEventListener('resize', () => requestAnimationFrame(() => { for (const b of scrollies) if (state.get(b).api) measure(b, true); }));
    for (const b of scrollies) measure(b);
  }
})();
