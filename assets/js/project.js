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
    (st.host || b.querySelector('[data-rx-stage]')).dispatchEvent(new Event('rx:unmount')); // frees any stage the module left behind
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
    // A 2D scrolly (webgl: false) with steps draws in the part of the stage the step cards leave
    // free: an element from the cards' right edge to the stage's right (--rx-cover, written by
    // layout(); the whole stage on a phone), so no diagram or photo sits under a card. Its
    // ctx.shift() is then [0, 0]. A 3D stage keeps the whole width and shifts its picture instead.
    const free = b.dataset.rxBlock === 'scrolly' && b.dataset.webgl === 'false' && !!b.querySelector('[data-step]');
    const stageEl = b.querySelector('[data-rx-stage]');
    let stage = stageEl;
    if (free) {
      stage = stageEl.querySelector(':scope > .rx-free');
      if (!stage) { stage = document.createElement('div'); stage.className = 'rx-free'; stageEl.appendChild(stage); }
    }
    st.host = stage;
    const before = new Set(stage.children);
    status(b, 'loading');
    let data = {};
    try { data = JSON.parse(b.dataset.rxData || '{}'); } catch { /* none */ }
    const ctx = {
      id: b.id, slug: main?.dataset.slug || '', data, asset, reducedMotion: reduced, isTouch,
      panel: st.panel, kind: b.dataset.rxBlock, width: 'full', // every scrolly is full width (Jerry, Sept 27)
      // where the step text covers the stage right now, as a stage.setShift(fx, fy) that centres the
      // model in the part of the stage the cards leave free: on a desktop the cards cover the left,
      // so fx is half the covered fraction (about 0.2); on a phone the text sits below the stage
      shift() {
        if (b.dataset.rxBlock !== 'scrolly' || free) return [0, 0];
        return (st.geom || layout(b)).shift.slice();
      },
    };
    // createStage reads this, so a stage frames its views for the shift from the start
    stage.rxShift = ctx.shift;
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
    b.rxState = st; // read by the page tools (progress, step, stepP, geom)
    status(b, 'idle');
    b.querySelector('[data-rx-load]')?.addEventListener('click', () => { st.consent = true; mount(b); });
    nearIO.observe(b);
  }

  // ---------------------------------------------------------------- scrolly progress
  // Every scrolly is a full-width sticky stage. Each step owns a slot of scrolling (its li, the
  // section's stepHeight): its card rises into place, stays pinned there (CSS position: sticky, at
  // the top written below) while that step's animation runs, stepP 0 to 1, over the pinned part of
  // the slot, then leaves as the next card arrives and pins in turn. On a desktop the cards sit over
  // the left of the stage; up to 900 px wide they pin just under the stage (a card taller than the
  // room there pins with its bottom at the screen's bottom).
  //   p      0..1 while the stage is pinned (continuous)
  //   step   the step whose card is pinned, or the nearer one during a hand-off
  //   stepP  0..1 through that step's pinned range; 0 before it pins, 1 after it lets go
  // The first card is in its pinned spot when p is 0, and the last lets go exactly when the stage
  // does (desktop) or before it (phone), so the last step always reaches stepP = 1.
  // All positions are measured in layout(), on resize and when the page's height changes; the
  // scroll loop reads nothing but scrollY.
  const scrollies = blocks.filter((b) => b.dataset.rxBlock === 'scrolly');
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  function callProgress(b, st, force) {
    if (!st.api?.setProgress) return;
    const key = `${st.progress.toFixed(5)}|${st.step}|${st.stepP.toFixed(4)}`;
    if (!force && key === st.lastKey) return;
    st.lastKey = key;
    try { st.api.setProgress(st.progress, st.step, st.stepP); } catch (e) { console.error(`[${b.id}] setProgress failed`, e); }
    // draw in this same frame, so the canvas and any HTML labels on it move together
    for (const c of st.canvases || []) c.rxFlush?.();
  }
  const setStyle = (el, prop, val) => { if (el.style[prop] !== val) el.style[prop] = val; };
  const setVar = (el, name, val) => { if (el && el.style.getPropertyValue(name) !== val) el.style.setProperty(name, val); };
  // Lay out one scrolly's slots and cache where everything pins, in document pixels.
  function layout(b) {
    const st = state.get(b);
    const body = b.querySelector('.rx-scrolly-body'), box = b.querySelector('.rx-scrolly-stage');
    const stageEl = b.querySelector('[data-rx-stage]');
    const list = b.querySelector('.rx-steps');
    const steps = st.steps || (st.steps = [...b.querySelectorAll('[data-step]')]);
    const cards = st.cards || (st.cards = steps.map((s) => s.querySelector('.rx-step-card')));
    const vh = innerHeight;
    const ST = parseFloat(getComputedStyle(box).top) || 0; // the stage's sticky top (under the nav)
    const SH = box.offsetHeight;
    const sr = box.getBoundingClientRect();
    // desktop: the cards float over the stage (the list is pulled up over it); phone: below it
    const over = !!list && parseFloat(getComputedStyle(list).marginTop) < 0;
    const g = { vh, vw: innerWidth, shift: [0, 0], starts: [], ends: [], cut: [] };
    if (steps.length) {
      const gap = parseFloat(getComputedStyle(steps[0]).paddingBottom) || 0;
      for (const s of steps) s.style.minHeight = ''; // each slot as the CSS gives it (--step-h)
      const slot = steps.map((s) => s.offsetHeight);
      const C = cards.map((c) => c.offsetHeight);
      // where each card pins: over the stage, a little above its middle (a card taller than the
      // stage pins with its bottom 16 px above the stage's bottom); on a phone, just under the stage
      const T = C.map((c) => {
        if (over) return c <= SH - 32 ? ST + Math.max(16, (SH - c) * 0.42) : ST + SH - c - 16;
        const below = ST + SH + 12;
        return c <= vh - below - 12 ? below : vh - c - 12;
      });
      cards.forEach((c, i) => setStyle(c, 'top', `${Math.round(T[i])}px`));
      // a slot keeps at least half its length pinned: a tall card makes its slot longer
      steps.forEach((s, i) => {
        const need = C[i] + (i < steps.length - 1 ? gap : 0) + slot[i] * 0.5;
        if (need > slot[i]) s.style.minHeight = `${Math.ceil(need)}px`;
      });
      // the first card is in its pinned spot when the stage pins (p = 0); the last lets go when
      // the stage does (desktop) or just before it (phone, where the text is below the stage)
      const listTop0 = ST + (over ? 0 : SH); // the list's top on screen when p = 0
      const last = steps.length - 1;
      setStyle(list, 'paddingTop', `${Math.round(Math.max(over ? 0 : 12, T[0] - listTop0))}px`);
      setStyle(list, 'paddingBottom', `${Math.round(over ? Math.max(0, ST + SH - T[last] - C[last]) : 0)}px`);
      // measure after writing (one layout); scrollY read after it, in case scroll anchoring moved it
      steps.forEach((s, i) => {
        const top = s.getBoundingClientRect().top + scrollY;
        const h = s.offsetHeight - (i < last ? gap : 0);
        g.starts[i] = top - T[i];
        g.ends[i] = Math.max(g.starts[i] + 1, top + h - C[i] - T[i]);
      });
      // cards over the stage: centre the model in what they leave free (card's right edge + 24 px)
      if (over) {
        const right = cards[0].getBoundingClientRect().right - sr.left + 24;
        const fx = Math.min(0.3, Math.max(0, right / (2 * Math.max(1, sr.width))));
        g.shift = [+fx.toFixed(4), 0];
        setVar(stageEl, '--rx-cover', `${Math.round(right)}px`);
      } else setVar(stageEl, '--rx-cover', '0px');
      // a step becomes the active one half way through the hand-off from the step before
      for (let i = 1; i < steps.length; i++) g.cut[i] = (g.ends[i - 1] + g.starts[i]) / 2;
    } else setVar(stageEl, '--rx-cover', '0px');
    const bt = body.getBoundingClientRect().top + scrollY;
    g.p0 = bt - ST;
    g.p1 = Math.max(g.p0 + 1, bt + body.offsetHeight - SH - ST);
    if (steps.length) g.ends[steps.length - 1] = Math.min(g.ends[steps.length - 1], g.p1);
    st.geom = g;
    return g;
  }
  function measure(b, force) {
    const st = state.get(b);
    const g = st.geom || layout(b);
    const y = scrollY;
    const p = clamp01((y - g.p0) / (g.p1 - g.p0));
    const steps = st.steps;
    let step = 0, stepP = p; // a scrolly without steps: one step, the whole way
    if (steps.length) {
      while (step < steps.length - 1 && y >= g.cut[step + 1]) step++;
      stepP = clamp01((y - g.starts[step]) / (g.ends[step] - g.starts[step]));
    }
    if (step !== st.step) {
      steps.forEach((s, i) => s.classList.toggle('is-active', i === step));
      b.dataset.step = String(step);
    }
    // the next card stays out of sight until the step before it has played out (Jerry: once a
    // step's animation is done, scrolling carries its card away and brings the next one); it then
    // fades in just under the leaving card and pins in turn
    if (steps.length > 1) {
      let k = 1;
      while (k < steps.length && y >= g.ends[k - 1]) k++;
      if (k !== st.shown) { st.shown = k; st.cards.forEach((c, i) => c.classList.toggle('is-later', i >= k)); }
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
    // re-measure every slot when the layout moves: a resize (then re-send the progress, so the
    // modules can re-frame for the new shape), fonts arriving, anything above changing height
    let pending = 0, forceNext = false;
    const relayout = (force) => {
      forceNext ||= force;
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        const f = forceNext; forceNext = false;
        for (const b of scrollies) layout(b);
        for (const b of scrollies) { const st = state.get(b); if (st.near || f) measure(b, f && !!st.api); }
      });
    };
    addEventListener('resize', () => relayout(true));
    const ro = new ResizeObserver(() => relayout(false));
    ro.observe(main || document.body);
    for (const b of scrollies) for (const c of b.querySelectorAll('.rx-step-card')) ro.observe(c);
    document.fonts?.ready.then(() => relayout(false));
    for (const b of scrollies) layout(b);
    for (const b of scrollies) measure(b);
  }
})();
