// Real test footage stepped by the scroll. Each step of the text shows one or more shots: a clip
// segment (scrubbed frame by frame from a WebP frame sequence cut from the page's own clip) or a
// photo. Scrolling down plays the clip forward, scrolling up plays it back; nothing plays by itself
// and there is nothing to click. A new step fades in over the last picture of the one before; a
// second shot in a step fades in over the first. With reduced motion every shot shows its middle
// frame and the pictures cut instead of blending.
//
// Section data (the shots ride in each step's `view`, which reaches the module as data.steps):
//   data: { aria, fps, frames: { clip: { n, w, h } } }
//   steps: [{ h, p, view: { shots: [{ clip, from, to, date, c, tag, w? } | { i, date, c, tag, w? }] } }]
// `from` and `to` are seconds in the cut clip; `w` weights a shot's share of its step.
import { css, h, clamp, smooth, setter, urls, loader, coarseToFine, painter, cardEdge } from './kit.js';

const LOCAL_CSS = `
.pp-reel .pp-tag { left: 0; top: 0; }
.pp-reel .pp-cap { left: 0; top: 0; max-width: 90%; }
.pp-reel .pp-bar { left: 0; top: 0; }
`;
const IN = 0.2;     // a step fades in over its first 20 %
const END = 0.96;   // and holds its last picture over the last 4 %
const FADE = 0.22;  // a later shot in a step fades in over the first 22 % of its share

export function mount(el, ctx) {
  css('pp-reel-css', LOCAL_CSS);
  const D = ctx.data || {};
  const fps = D.fps || 8;
  const FR = D.frames || {};
  const U = urls(ctx);
  const reduced = ctx.reducedMotion;
  const S = setter();

  // shots with their share of the step, and the frame range each clip segment covers
  const steps = (D.steps || []).map((st) => {
    const shots = (st.shots || []).map((s) => ({ ...s }));
    const total = shots.reduce((a, s) => a + (s.w || 1), 0) || 1;
    let at = 0;
    for (const s of shots) {
      s.a = at; s.len = (s.w || 1) / total; at += s.len;
      const m = s.clip && FR[s.clip];
      if (m) {
        s.i0 = clamp(Math.floor((s.from || 0) * fps), 0, m.n - 1);
        s.i1 = clamp(Math.ceil((s.to ?? m.n / fps) * fps), s.i0, m.n - 1);
      }
      s.bgUrl = U.bg(s.clip ? `${s.clip}.mp4` : s.i);
    }
    return shots;
  });
  if (!steps.length || !steps[0].length) return {};

  const root = h('div', 'pp pp-reel');
  root.setAttribute('role', 'img');
  el.appendChild(root);
  const paint = painter(root);
  const tag = h('p', 'pp-chip pp-tag');
  tag.append(h('i'), h('b'));
  const tagB = tag.querySelector('b');
  const cap = h('p', 'pp-cap');
  const bar = h('div', 'pp-bar');
  const barI = h('i');
  bar.append(barI);
  root.append(tag, bar, cap);

  let small = false;
  let redraw = 0;
  // redraw when a picture the screen is waiting for arrives (not for pictures loading ahead)
  const missing = new Set();
  const load = loader((url) => { if (missing.has(url) && !redraw) redraw = requestAnimationFrame(() => { redraw = 0; draw(); }); });
  const want = (url) => { const im = load.get(url); if (!im && url) missing.add(url); return im; };

  // the picture for shot s at scrub position u (0..1): { a, b, k } urls and blend, plus clip time
  function pic(s, u) {
    if (s.i) return { a: U.media(s.i, small), k: 0 };
    const m = FR[s.clip];
    if (!m) return { a: U.media(`${s.clip}.mp4`), k: 0 };
    const q = reduced ? 0.5 : clamp(u, 0, 1);
    const f = s.i0 + (s.i1 - s.i0) * q;
    const ia = Math.floor(f), ib = Math.min(s.i1, ia + 1);
    return { a: U.frame(s.clip, ia), b: ib !== ia ? U.frame(s.clip, ib) : null, k: f - ia, ia, ib, q };
  }
  // the nearest frame of the segment that has loaded, so a slow connection still shows something
  function nearest(s, ia) {
    for (let d = 1; d <= s.i1 - s.i0; d++) {
      for (const j of [ia - d, ia + d]) {
        if (j < s.i0 || j > s.i1) continue;
        const im = load.get(U.frame(s.clip, j));
        if (im) return im;
      }
    }
    return load.get(U.media(`${s.clip}.mp4`));
  }

  // what to load: this step's shots coarse to fine, the pictures either side of it, then the next step
  let planned = -1;
  function plan(step) {
    if (planned === step) return;
    planned = step;
    const list = [];
    const add = (s, full) => {
      if (s.bgUrl) list.push(s.bgUrl);
      if (s.i) { list.push(U.media(s.i, small)); return; }
      if (!FR[s.clip]) { list.push(U.media(`${s.clip}.mp4`)); return; }
      if (reduced) { list.push(pic(s, 0.5).a); return; }
      if (!full) { list.push(U.frame(s.clip, s.i0)); return; }
      for (const i of coarseToFine(s.i0, s.i1)) list.push(U.frame(s.clip, i));
    };
    const cur = steps[step], prev = steps[step - 1], next = steps[step + 1];
    if (cur[0]) add(cur[0], false);
    if (prev) { const s = prev[prev.length - 1]; if (s.bgUrl) list.push(s.bgUrl); list.push(pic(s, 1).a); }
    for (const s of cur) add(s, true);
    if (next) { add(next[0], false); for (const s of next) add(s, true); }
    load.plan(list);
  }

  let area = { x: 0, y: 0, w: 1, h: 1 };
  function layout() {
    paint.size();
    small = paint.W < 700;
    const phone = paint.W < 640;
    const pad = phone ? 8 : 22;
    const L = cardEdge(el, ctx);
    const capH = phone ? 40 : 56;
    area = { x: L + pad, y: pad, w: Math.max(40, paint.W - L - pad * 2), h: Math.max(40, paint.H - pad * 2 - capH) };
    cap.style.maxWidth = `${Math.round(Math.min(area.w, 720))}px`;
  }

  // the layers on screen for (step, q): [{ s, u, alpha }], bottom first
  function layers(step, q) {
    const shots = steps[step];
    if (reduced) {
      const pos = clamp((q - IN) / (END - IN), 0, 0.9999);
      const s = shots.find((x) => pos >= x.a && pos < x.a + x.len) || shots[shots.length - 1];
      return [{ s, u: 0.5, alpha: 1 }];
    }
    if (q < IN) {
      const k = step === 0 ? 1 : smooth(0, IN, q);
      const out = [];
      if (k < 1) { const ps = steps[step - 1]; out.push({ s: ps[ps.length - 1], u: 1, alpha: 1 }); }
      out.push({ s: shots[0], u: 0, alpha: k });
      return out;
    }
    const pos = clamp((q - IN) / (END - IN), 0, 1);
    let j = shots.findIndex((x) => pos < x.a + x.len);
    if (j < 0) j = shots.length - 1;
    const s = shots[j];
    const u = clamp((pos - s.a) / s.len, 0, 1);
    if (j === 0) return [{ s, u, alpha: 1 }];
    if (u < FADE) return [{ s: shots[j - 1], u: 1, alpha: 1 }, { s, u: 0, alpha: smooth(0, FADE, u) }];
    return [{ s, u: (u - FADE) / (1 - FADE), alpha: 1 }];
  }

  let last = [0, 0];
  let capSize = null;
  function draw() {
    const [step, q] = last;
    plan(step);
    const L = layers(step, q);
    missing.clear();
    paint.clear();
    // backdrop: each layer's blurred copy, dimmed
    for (const l of L) paint.cover(want(l.s.bgUrl), 0.5 * l.alpha);
    paint.shade(0.35);
    let top = null;
    for (const l of L) {
      const p = pic(l.s, l.u);
      let a = want(p.a);
      if (!a && l.s.clip && FR[l.s.clip]) a = nearest(l.s, p.ia);
      const f = paint.contain(a, area, l.alpha);
      if (p.b && p.k > 0.02) { const b = want(p.b); if (b) paint.contain(b, area, l.alpha * p.k); }
      if (f && l.alpha >= 0.5) top = { l, f, p };
    }
    if (!top) top = { l: L[L.length - 1], f: null, p: null };
    // chips on the picture now showing
    const s = top.l.s;
    const f = top.f || { x: area.x, y: area.y, w: area.w, h: area.h };
    S.text(tagB, s.tag || (s.i ? 'Photo' : 'Clip'));
    S.style(tag, 'transform', `translate(${Math.round(f.x + 10)}px, ${Math.round(f.y + 10)}px)`);
    const clipOn = !!(s.clip && FR[s.clip] && !reduced && top.p);
    S.hide(bar, !clipOn);
    if (clipOn) {
      S.style(bar, 'width', `${Math.round(f.w - 24)}px`);
      S.style(bar, 'transform', `translate(${Math.round(f.x + 12)}px, ${Math.round(f.y + f.h - 12)}px)`);
      S.style(barI, 'transform', `scaleX(${(top.p.q ?? 0).toFixed(3)})`);
    }
    if (S.cap(cap, s.date, s.c) || !capSize) capSize = [cap.offsetWidth, cap.offsetHeight];
    const [cw, ch] = capSize;
    const cx = clamp(f.x + f.w / 2 - cw / 2, area.x, area.x + area.w - cw);
    S.style(cap, 'transform', `translate(${Math.round(cx)}px, ${Math.round(Math.min(paint.H - ch - 6, f.y + f.h + 10))}px)`);
    const aria = `${D.aria ? `${D.aria}. ` : ''}${s.date ? `${s.date}: ` : ''}${s.c || ''}`;
    if (root._aria !== aria) { root._aria = aria; root.setAttribute('aria-label', aria); }
  }

  function setProgress(p, step, stepP) {
    last = [clamp(step | 0, 0, steps.length - 1), clamp(stepP ?? 0, 0, 1)];
    draw();
  }
  const ro = new ResizeObserver(() => { layout(); capSize = null; draw(); });
  ro.observe(el);
  layout();
  setProgress(0, 0, 0);
  return {
    setProgress,
    dispose() { ro.disconnect(); if (redraw) cancelAnimationFrame(redraw); load.dispose(); root.remove(); },
  };
}
