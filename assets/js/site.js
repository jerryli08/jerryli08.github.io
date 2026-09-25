// Landing page viewer + lazy media. No framework, no build step at runtime.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------------------------------------------------------- lazy video (project pages + stage)
  const lazy = document.querySelectorAll('video[data-src]');
  if (lazy.length) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const v = e.target;
        if (e.isIntersecting) {
          if (!v.src) { v.src = v.dataset.src; }
          if (!reduced) v.play().catch(() => {});
        } else if (!v.paused) {
          v.pause();
        }
      }
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    lazy.forEach((v) => io.observe(v));
  }

  // ---------------------------------------------------------- CAD click-to-load
  document.querySelectorAll('[data-cad]').forEach((box) => {
    const btn = box.querySelector('button');
    btn?.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = box.dataset.cad;
      f.title = 'Interactive CAD model';
      f.allow = 'fullscreen';
      f.setAttribute('allowfullscreen', '');
      box.innerHTML = '';
      box.appendChild(f);
    });
  });

  // ---------------------------------------------------------- landing viewer
  const viewer = document.querySelector('[data-viewer]');
  if (!viewer) return;

  // The 3D scene is progressive: the still render shows instantly, and the real-time scene
  // (three.js + the two CAD models, ~2 MB) only loads after the page has finished loading,
  // and never on data-saver or 2G/3G connections, or without WebGL.
  let hero = null;
  const stage = viewer.querySelector('[data-stage]');
  const canvas = stage?.querySelector('canvas');
  const conn = navigator.connection || {};
  const slow = conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || '');
  const webgl = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } })();
  if (canvas && !slow && webgl) {
    const start = () => {
      const [drone, rover] = canvas.dataset.models.split('|');
      import(canvas.dataset.hero)
        .then((m) => m.initHero(canvas, { models: { drone, rover }, onReady: () => stage.classList.add('live') }))
        .then((h) => { hero = h; if (current) hero?.setPaused(true); })
        .catch(() => { /* the still render stays up */ });
    };
    const idle = () => (('requestIdleCallback' in window) ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 300));
    document.readyState === 'complete' ? idle() : addEventListener('load', idle, { once: true });
  }
  const slots = [...viewer.querySelectorAll('.slot')];
  const hudK = viewer.querySelector('[data-hud-k]');
  const hudT = viewer.querySelector('[data-hud-t]');
  const hudGo = viewer.querySelector('[data-hud-go]');
  const back = viewer.querySelector('[data-back]');
  const status = viewer.querySelector('[data-status]');
  const stageInfo = { k: hudK.textContent, t: hudT.textContent, href: hudGo.getAttribute('href') };
  let front = -1, current = null, hoverTimer = 0, pauseTimer = 0;

  const items = [...document.querySelectorAll('[data-preview]')];

  function setHud(k, t, href) {
    hudK.textContent = k; hudT.textContent = t; hudGo.setAttribute('href', href);
    hudGo.setAttribute('aria-label', `View project: ${t}`);
  }

  function show(el) {
    if (current === el) return;
    current = el;
    items.forEach((i) => i.classList.toggle('is-active', i === el));
    const { preview, poster, title, kicker } = el.dataset;
    const next = (front + 1) % slots.length;
    const slot = slots[next];
    slot.querySelector('.slot-bg').style.backgroundImage = `url("${poster}")`;
    const old = slot.querySelector('.slot-media');
    let media;
    if (preview && !reduced) {
      media = document.createElement('video');
      media.muted = true; media.loop = true; media.playsInline = true; media.autoplay = true;
      media.setAttribute('muted', ''); media.setAttribute('playsinline', '');
      media.poster = poster;
      media.src = preview;
    } else {
      media = document.createElement('img');
      media.src = poster; media.alt = '';
    }
    media.className = 'slot-media';
    const fit = () => {
      const w = media.videoWidth || media.naturalWidth, h = media.videoHeight || media.naturalHeight;
      if (!w || !h) return;
      const r = w / h, fr = viewer.clientWidth / viewer.clientHeight;
      media.classList.toggle('cover', Math.abs(Math.log(r / fr)) < 0.28);
    };
    media.addEventListener('loadedmetadata', fit);
    media.addEventListener('load', fit);
    old ? old.replaceWith(media) : slot.appendChild(media);
    if (media.play) media.play().catch(() => {});
    slots.forEach((s, i) => s.classList.toggle('on', i === next));
    // pause the one fading out
    const prev = slots[front];
    if (prev) setTimeout(() => { if (!prev.classList.contains('on')) prev.querySelector('video')?.pause(); }, 500);
    front = next;
    setHud(kicker, title, el.getAttribute('href'));
    back.hidden = false;
    status.textContent = 'Project preview';
    clearTimeout(pauseTimer);
    pauseTimer = setTimeout(() => { if (current) hero?.setPaused(true); }, 600);
  }

  function reset() {
    current = null;
    items.forEach((i) => i.classList.remove('is-active'));
    slots.forEach((s) => { s.classList.remove('on'); s.querySelector('video')?.pause(); });
    setHud(stageInfo.k, stageInfo.t, stageInfo.href);
    back.hidden = true;
    status.innerHTML = viewer.dataset.stageStatus || '';
    clearTimeout(pauseTimer);
    hero?.setPaused(false);
  }
  back.addEventListener('click', reset);

  if (canHover) {
    for (const el of items) {
      el.addEventListener('pointerenter', () => {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => show(el), current ? 60 : 90);
      });
      el.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
      el.addEventListener('focus', () => show(el));
    }
    // After everything else has loaded, quietly prefetch the first few poster frames
    // (small JPEGs) so the first hovers paint instantly. Videos only load on hover.
    let warmed = false;
    const warm = () => {
      if (warmed || slow) return; warmed = true;
      items.slice(0, 6).forEach((el) => {
        if (!el.dataset.poster) return;
        const l = document.createElement('link');
        l.rel = 'prefetch'; l.href = el.dataset.poster;
        document.head.appendChild(l);
      });
    };
    addEventListener('load', () => setTimeout(warm, 5000), { once: true });
  }
})();
