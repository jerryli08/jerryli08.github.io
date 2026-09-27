// Runtime for rich project pages (pages built from src/pages/<slug>.mjs). Loaded as a module on
// those pages only. It handles:
//   - videos: muted loops that load and play only while on screen, poster first; nothing is fetched
//     until the page has loaded and gone idle, and at most two play at once (the most visible)
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
  const MAX_PLAY = 2;
  // Videos wait for the page: first paint gets the network to itself, posters show meanwhile.
  const afterLoad = new Promise((res) => (document.readyState === 'complete' ? res() : addEventListener('load', res, { once: true })))
    .then(() => new Promise((res) => (window.requestIdleCallback ? requestIdleCallback(res, { timeout: 1500 }) : setTimeout(res, 300))));
  if (vids.length) {
    const ensure = (v) => { if (!v.src) { v.src = v.dataset.rxSrc; v.load(); } };
    const area = new Map(); // on-screen videos and how much of each shows
    const choose = () => { // play the most visible few, pause the rest
      const want = new Set([...area].filter(([v]) => !v.dataset.userPaused).sort((a, b) => b[1] - a[1]).slice(0, MAX_PLAY).map(([v]) => v));
      for (const v of vids) {
        if (want.has(v) && autoplay) { ensure(v); v.play().catch(() => {}); } else if (!v.paused) v.pause();
      }
    };
    afterLoad.then(() => {
      const near = new IntersectionObserver((es) => {
        for (const e of es) if (e.isIntersecting && !autoplay) ensure(e.target); // with controls: ready to press play
      }, { rootMargin: '400px 0px' });
      const seen = new IntersectionObserver((es) => {
        for (const e of es) {
          if (e.isIntersecting && e.intersectionRatio >= 0.2) area.set(e.target, e.intersectionRect.width * e.intersectionRect.height);
          else area.delete(e.target);
        }
        choose();
      }, { threshold: [0, 0.2, 0.45, 0.7, 1] });
      for (const v of vids) { near.observe(v); seen.observe(v); }
    });
    for (const v of vids) {
      if (!autoplay) v.controls = true;
      else v.addEventListener('click', () => {
        if (v.paused) { delete v.dataset.userPaused; area.set(v, Infinity); ensure(v); v.play().catch(() => {}); choose(); } else { v.dataset.userPaused = '1'; v.pause(); choose(); }
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
  const MAX_LIVE = isTouch ? 2 : 3; // each live canvas costs GPU memory; far-away blocks are unmounted
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
    // on a slow or data-saving connection a 3D block waits for the reader's go; 2D ones (webgl: false,
    // SVG and photos) cost next to nothing and load as usual
    if (slow && !st.consent && b.dataset.webgl !== 'false') {
      status(b, 'ask');
      return;
    }
    const stage = b.querySelector('[data-rx-stage]');
    const before = new Set(stage.children);
    status(b, 'loading');
    let data = {};
    try { data = JSON.parse(b.dataset.rxData || '{}'); } catch { /* none */ }
    const wide = b.classList.contains('rx-scrolly-wide');
    const ctx = {
      id: b.id, slug: main?.dataset.slug || '', data, asset, reducedMotion: reduced, isTouch,
      panel: st.panel, kind: b.dataset.rxBlock, width: wide ? 'wide' : 'full',
      // where the step text covers the stage right now, as a stage.setShift(fx, fy) that keeps the
      // model clear of it: on a full-width desktop scrolly the cards cover the left
      shift() {
        // up to 900 px wide the text sits below the stage, and a wide scrolly has it beside
        if (b.dataset.rxBlock !== 'scrolly' || wide || innerWidth <= 900) return [0, 0];
        return [0.15, 0];
      },
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
      st.canvases = [...stage.querySelectorAll('canvas')];
      live.add(b);
      status(b, 'live');
      note(b, '');
      if (b.dataset.rxBlock === 'scrolly') measure(b, true); // where the reader is now, not where they were
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
      // arriving by a jump (a link, a reload part way down) sends no scroll event: measure now
      if (e.isIntersecting && e.target.dataset.rxBlock === 'scrolly') measure(e.target);
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
    // draw in this same frame, so the canvas and any HTML labels on it move together
    for (const c of st.canvases || []) c.rxFlush?.();
  }
  // layout values that only change on resize, read once instead of every scroll frame
  function geom(b, st) {
    if (st.geom && st.geom.w === innerWidth && st.geom.h === innerHeight) return st.geom;
    const stage = b.querySelector('.rx-scrolly-stage');
    return (st.geom = {
      w: innerWidth, h: innerHeight, body: b.querySelector('.rx-scrolly-body'), stage,
      top: parseFloat(getComputedStyle(stage).top) || 0,
      // the active step is the last one whose text has come up past the line: its top passes 70%
      // of the screen on a desktop (so it is in view and the one before has scrolled away), 84% on a
      // phone, where the text scrolls in below the stage (--rx-line in site.css)
      line: innerHeight * (parseFloat(getComputedStyle(b).getPropertyValue('--rx-line')) || 0.7),
    });
  }
  function measure(b, force) {
    const st = state.get(b);
    const g = geom(b, st);
    const r = g.body.getBoundingClientRect();
    const span = r.height - g.stage.offsetHeight;
    const p = span > 0 ? Math.min(1, Math.max(0, (g.top - r.top) / span)) : 0;
    const steps = st.steps || (st.steps = [...b.querySelectorAll('[data-step]')]);
    const cards = st.cards || (st.cards = steps.map((s) => s.querySelector('.rx-step-card') || s));
    let step = 0, stepP = steps.length ? 0 : p; // a scrolly without steps: one step, the whole way
    steps.forEach((s, i) => { // progress through a step runs over the height of its slot
      const y = cards[i].getBoundingClientRect().top;
      if (y <= g.line) {
        step = i; stepP = Math.min(1, Math.max(0, (g.line - y) / (s.offsetHeight || 1)));
        // the last step's slot runs past the point where the stage unpins, so it would stop part way
        // (about 0.6): finish it exactly when the section's progress reaches 1
        if (i === steps.length - 1 && span > 0) {
          const p0 = Math.min(0.999, Math.max(0, (g.top - g.line + (y - r.top)) / span));
          stepP = Math.min(1, Math.max(stepP, (p - p0) / (1 - p0)));
        }
      }
    });
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
      // only scrollies near the screen: one far away keeps its last picture and is not drawn anyway
      requestAnimationFrame(() => { ticking = false; for (const b of scrollies) if (state.get(b).near) measure(b); });
    };
    addEventListener('scroll', onScroll, { passive: true });
    // a resize changes the stage's shape: re-send the progress so the module can re-frame
    addEventListener('resize', () => requestAnimationFrame(() => { for (const b of scrollies) if (state.get(b).api) measure(b, true); }));
    for (const b of scrollies) measure(b);
  }
})();
