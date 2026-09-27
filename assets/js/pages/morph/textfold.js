// Scrolly: text the chain, it folds. One text per step, from the example requests the team's real
// Python pipeline classified ahead of time (examples.js: the bridge's rules, the int8 MiniLM
// classifier and its fitted head, then the shape it maps to in the public 17-cube library), and the
// chain folds along that shape's planned moves (library.js), one 120 degree step at a time, on 17
// copies of our module CAD. Nothing is classified or planned in the browser.
//
// data: { texts: [...] } the messages in order; each must be one of examples.js.
// Between shapes the page unwinds the last plan backwards (the robot drove every joint home at once).
// Every picture is a pure function of (step, stepP): scrolling back plays it backwards.
import { createStage } from '/assets/js/lib/stage.js';
import { labelLayer } from '/assets/js/lib/labels.js';
import lib from './library.js';
import examples from './examples.js';
import { Chain, movesOf, I3 } from './kin.js';
import { createChain, cubeOutline } from './chain3d.js';
import { silhouetteSvg } from './minimap.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const ease = (u) => u * u * (3 - 2 * u);
const byKey = new Map(lib.shapes.map((s) => [s.id.toLowerCase(), s]));
const nice = (id) => (id.length === 1 ? `the ${id.toUpperCase()}` : `the ${id}`);
const pct = (p) => `${(p * 100).toFixed(1)}%`;
const deg = (d) => `${d > 0 ? '+' : '-'}120°`;
const AZ = 24, EL = 30; // one camera direction for the whole sequence
const M0 = 0.2, M1 = 0.84; // the part of each step in which the chain moves
// the last step only gets to about 60% of its progress before the stage unpins (its progress is
// measured from its centred text card), so each step's timeline is squeezed into this much of it
const SPAN = 0.97, LAST_SPAN = 0.56;

const copy = (c) => { const n = new Chain(c.base); n.states = c.states.slice(); n.o = c.o.slice(); return n; };

/** the whole sequence, worked out once: per step the message, what the bridge does, and the moves */
function plan(texts) {
  let chain = new Chain(I3);
  let applied = []; // moves applied since the straight chain
  let holding = null;
  return texts.map((text) => {
    const ex = examples.find((e) => e.text.toLowerCase() === String(text).toLowerCase());
    if (!ex) throw new Error(`textfold: "${text}" is not one of the classified examples`);
    const shape = ex.shape ? byKey.get(ex.shape.toLowerCase()) : null;
    const kind = ex.home ? 'home' : shape ? 'fold' : 'none';
    const unwind = kind === 'none' ? [] : applied.slice().reverse().map((m) => ({ j: m.j, d: -m.d, out: m.out, base: m.before, back: true }));
    const from = holding;
    const fwd = kind === 'fold' ? movesOf(shape) : [];
    const moves = [...unwind, ...fwd];
    const snaps = [copy(chain)];
    moves.forEach((m, i) => {
      // a plan starts from the straight chain lying on the face it was planned on (the planner tries
      // all four); the sequence on the page only uses plans that start where the last one unwound to
      if (i === unwind.length && JSON.stringify(chain.base.map(Math.round)) !== JSON.stringify(shape.start)) throw new Error(`textfold: ${shape.id} starts on another face`);
      chain.step(m); snaps.push(copy(chain));
    });
    if (kind !== 'none') { applied = fwd; holding = shape; }
    return { ex, kind, shape: kind === 'none' ? holding : shape, from, moves, back: unwind.length, snaps };
  });
}

export async function mount(el, ctx) {
  const stage = createStage(el, { controls: false, hint: false });
  const { THREE } = stage;
  const view = await createChain(stage);
  const seq = plan(ctx.data?.texts || []);
  const reduced = ctx.reducedMotion;

  // the ground and shadows cover every pose the chain takes, fitted once
  view.groundAround(seq.flatMap((s) => [...s.snaps, ...s.moves.map((m, i) => [s.snaps[i], m, 0.5])]));

  // camera: per step, one view around everything the step passes through (while it moves) and one
  // around where it ends; both framed once at rest and cached, then blended
  const boxes = seq.map((s) => ({
    all: view.boxAround([...s.snaps, ...s.moves.map((m, i) => [s.snaps[i], m, 0.5])]),
    end: view.boxAround([s.snaps[s.snaps.length - 1]]),
  }));
  let views = null, aspect = 0;
  function viewsNow() {
    const a = el.clientWidth / Math.max(1, el.clientHeight);
    if (!views || Math.abs(a - aspect) > 1e-3) {
      aspect = a;
      const narrow = a < 1;
      hud.style.width = el.clientWidth < 640 ? '' : 'min(310px, calc(100% - 28px))';
      views = boxes.map((b, i) => {
        const end = stage.frame(b.end, { azimuth: AZ, elevation: EL, pad: narrow ? 1.15 : 1.6, apply: false });
        // a step where nothing moves holds the last step's closing view
        return { all: seq[i].moves.length ? stage.frame(b.all, { azimuth: AZ, elevation: EL, pad: narrow ? 1.04 : 1.25, apply: false }) : end, end };
      });
    }
    return views;
  }
  const lerpView = (a, b, k) => ({ pos: a.pos.clone().lerp(b.pos, k), target: a.target.clone().lerp(b.target, k) });

  // annotations (not parts): the wire end, and the cube whose joint is turning
  const wireEnd = cubeOutline(THREE, '#9fd3ff', 0.8);
  const active = cubeOutline(THREE, '#ff6b35', 1);
  stage.scene.add(wireEnd, active);
  wireEnd.visible = true;
  const outline = (o, k, M) => { o.matrixAutoUpdate = false; o.matrix.copy(M.F[k]); o.matrixWorldNeedsUpdate = true; };

  // ---------------------------------------------------------------- the readout: the text thread
  const ov = labelLayer(stage);
  const hud = document.createElement('div');
  hud.className = 'rx-hud';
  ov.layer.append(hud);
  const node = (tag, style, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; Object.assign(n.style, style); return n; };
  const bubble = (me) => node('p', {
    margin: me ? '0 0 0 auto' : '10px auto 0 0', width: 'fit-content', maxWidth: '92%', padding: '7px 12px', borderRadius: '16px',
    whiteSpace: 'pre-line', fontSize: '13.5px', lineHeight: '1.4', overflowWrap: 'anywhere',
    background: me ? '#0a84ff' : 'rgba(255,255,255,0.1)', color: me ? '#fff' : 'var(--text)',
    [me ? 'borderBottomRightRadius' : 'borderBottomLeftRadius']: '5px',
  }, me ? '' : 'rx-hud-x');
  const me = bubble(true);
  const clf = node('div', { marginTop: '10px' }, 'rx-hud-x');
  const clfHead = node('div', { fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' });
  const rows = [0, 1, 2].map(() => {
    const r = node('div', { marginTop: '5px' }, 'rx-hud-row');
    r.innerHTML = '<span></span><b class="num"></b><i><em></em></i>';
    clf.append(r);
    return { r, name: r.children[0], val: r.children[1], bar: r.querySelector('em') };
  });
  clf.prepend(clfHead);
  const bot = bubble(false);
  const moveRow = node('div', { marginTop: '10px', paddingTop: '9px', borderTop: '1px solid rgba(255,255,255,0.12)' }, 'rx-hud-row');
  moveRow.innerHTML = '<span></span><b class="num"></b><i><em></em></i>';
  const [moveL, moveV] = moveRow.children;
  const moveBar = moveRow.querySelector('em');
  const mini = node('div', {}, 'rx-hud-mini');
  const fig = node('figure', { margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: '12px' }, 'rx-hud-x');
  const figArt = node('div', { flex: 'none', width: '88px' });
  const figCap = node('figcaption', { fontSize: '11.5px', color: 'var(--muted)', lineHeight: '1.4' });
  fig.append(figArt, figCap);
  hud.append(me, clf, bot, moveRow, mini, fig);

  const shown = new Map();
  const put = (n, key, v) => { if (shown.get(n)?.[key] !== v) { (shown.get(n) || shown.set(n, {}).get(n))[key] = v; if (key === 'text') n.textContent = v; else if (key === 'html') n.innerHTML = v; else n.style[key] = v; } };
  const drawings = new Map();
  const drawing = (s) => { if (!drawings.has(s.id)) drawings.set(s.id, silhouetteSvg(s.sil, { size: 88, label: `Target drawing for ${s.id}` })); return drawings.get(s.id); };

  function readout(i, sp, t) {
    const s = seq[i], ex = s.ex, n = s.moves.length;
    put(me, 'text', ex.text);
    const aIn = reduced ? 1 : smooth(0.02, 0.1, sp); // the classifier's answer, then the reply
    const bIn = reduced ? 1 : smooth(0.1, 0.18, sp);
    if (s.kind === 'home') {
      put(clfHead, 'text', 'The bridge\'s rules');
      put(rows[0].name, 'text', 'A home phrase: no model runs');
      put(rows[0].val, 'text', '');
      put(rows[0].bar, 'width', '0%');
      put(rows[0].r.querySelector('i'), 'display', 'none');
      put(rows[1].r, 'display', 'none'); put(rows[2].r, 'display', 'none');
    } else {
      put(clfHead, 'text', 'MiniLM, on our laptop');
      put(rows[0].r.querySelector('i'), 'display', '');
      rows.forEach((r, k) => {
        const [label, p] = ex.ranked[k] || ['', 0];
        put(r.r, 'display', label ? '' : 'none');
        put(r.name, 'text', label.replace(/_/g, ' '));
        put(r.val, 'text', pct(p));
        put(r.bar, 'width', `${(p * 100 * aIn).toFixed(1)}%`);
      });
    }
    put(clf, 'opacity', String(aIn));
    const reply = s.kind === 'home' ? 'Going back to a straight line (home).'
      : s.kind === 'fold' ? `${ex.caption}. ${s.moves.length - s.back} moves, about ${Math.round((s.moves.length - s.back) * lib.move_s)}s.\n(deciphered using local MiniLM)`
        : 'MiniLM reads chitchat, not a shape. At the booth, GPT-4o-mini gets a turn here, and it can only answer with a shape from the list or "none". This page never calls it.';
    put(bot, 'text', reply);
    put(bot, 'opacity', String(bIn));
    put(bot, 'fontStyle', s.kind === 'none' ? 'italic' : 'normal');
    // the move being made
    const k = Math.min(n, Math.floor(t));
    let left, right, bar;
    if (!n) {
      left = s.shape ? `Holding ${nice(s.shape.id)}` : 'Straight chain';
      right = 'nothing moves';
      bar = 0;
    } else if (k < s.back) {
      left = `Unfolding ${nice(s.from.id)}, backwards`;
      right = `${k + 1} of ${s.back}`;
      bar = t / s.back;
    } else if (s.kind === 'home') {
      left = 'Home'; right = 'every joint at 0'; bar = 1;
    } else {
      const f = Math.min(s.moves.length - s.back, k - s.back + 1);
      const m = s.moves[Math.min(n - 1, k)];
      left = t <= s.back + 1e-6 ? `${s.shape.id}: ${n - s.back} planned moves` : `Move ${f} of ${n - s.back}`;
      right = t <= s.back + 1e-6 ? 'from the straight chain' : k >= n ? (s.shape.flat ? 'done, lying flat' : 'done, standing on edge') : `joint ${m.j + 1}, ${deg(m.d)}, ${m.out ? 'out' : 'in'}`;
      bar = (t - s.back) / (n - s.back);
    }
    put(moveL, 'text', left);
    put(moveV, 'text', right);
    put(moveBar, 'width', `${(clamp(bar, 0, 1) * 100).toFixed(1)}%`);
    const top = ex.ranked?.[0];
    put(mini, 'text', s.kind === 'home' ? `Rules: home. ${left}` : `MiniLM: ${top[0].replace(/_/g, ' ')} ${pct(top[1])}. ${left}${n && k < n ? ` (${right})` : ''}`);
    // the target drawing, while a shape is folding or held
    const target = s.kind === 'fold' && k >= s.back ? s.shape : s.kind === 'none' ? s.shape : null;
    put(fig, 'display', target ? '' : 'none');
    if (target) {
      put(figArt, 'html', drawing(target));
      put(figCap, 'text', `${target.id}: the drawing the planner folded to, ${target.flat ? 'lying flat' : 'standing on edge'} at the end`);
    }
  }

  let lastKey = '';
  function setProgress(p, step = 0, stepP = 0) {
    const i = clamp(step | 0, 0, seq.length - 1);
    const s = seq[i], n = s.moves.length;
    const sp = clamp(stepP / (i === seq.length - 1 ? LAST_SPAN : SPAN), 0, 1);
    // keep the chain clear of the readout (top right on a desktop, across the top on a phone)
    const [fx, fy] = ctx.shift();
    const phone = el.clientWidth < 640;
    stage.setShift(fx + (phone ? 0 : -0.15), fy + (phone ? -0.1 : -0.08));

    // pose: the step's moves play through its middle part, each one eased like a servo move
    let t = n * clamp((sp - M0) / (M1 - M0), 0, 1);
    const k = Math.min(n, Math.floor(t));
    let f = t - k;
    if (reduced) f = f < 0.5 ? 0 : 1;
    const key = `${i}|${k}|${f.toFixed(4)}`;
    if (key !== lastKey) {
      lastKey = key;
      const M = k >= n ? view.matrices(s.snaps[n]) : f >= 1 ? view.matrices(s.snaps[k + 1]) : view.matrices(s.snaps[k], s.moves[k], ease(f));
      view.write(M);
      outline(wireEnd, 0, M);
      active.visible = k < n && f > 1e-4 && f < 1;
      if (active.visible) outline(active, s.moves[k].j, M);
    }
    t = k + f;

    // camera: from where the last step ended to around this step's moves, then in on where it ends
    const v = viewsNow();
    const prevEnd = i > 0 ? v[i - 1].end : v[0].all;
    const k0 = reduced ? 1 : smooth(0, M0, sp), k1 = reduced ? (sp > M1 ? 1 : 0) : smooth(M1, 1, sp);
    stage.setView(k1 > 0 ? lerpView(v[i].all, v[i].end, k1) : lerpView(prevEnd, v[i].all, k0));

    readout(i, sp, t);
    ov.update();
  }
  setProgress(0, 0, 0);
  return { setProgress, dispose() { ov.dispose?.(); stage.dispose(); } };
}
