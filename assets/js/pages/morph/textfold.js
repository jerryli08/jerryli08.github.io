// Demo: text the chain, it folds. The same path as the booth, minus the phone network and GPT:
//   your text -> the bridge's rules (help, home) -> the booth's own MiniLM classifier, running here ->
//   a shape from the team's public 17-cube library -> that shape's planned moves, one 120 degree step
//   at a time, on 17 copies of our real module CAD.
// Nothing moves until the reader sends something. With reduced motion a fold jumps to its result.
import { createStage } from '/assets/js/lib/stage.js';
import { segmented, button } from '/assets/js/lib/ui.js';
import lib from './library.js';
import examples, { help as HELP } from './examples.js';
import { Chain, movesOf, snapshots, flatAxis, faceView, N } from './kin.js';
import { createChain, cubeOutline } from './chain3d.js';
import { silhouetteSvg } from './minimap.js';
import { loadClassifier, createClassifier, caption, wantsHelp, wantsHome } from './intent.js';

const FILES = ['/assets/models/morph/intent.json', '/assets/models/morph/minilm-int8.bin', '/assets/models/morph/intent.bin'];
const FILE_BYTES = [420955, 22485120, 3070184]; // for the progress bar before the server says
const SPEEDS = { fast: 0.55, robot: 2.0 }; // seconds per 120 degree step; the robot's plan budgets 2 s
const byKey = new Map(lib.shapes.map((s) => [s.id.toLowerCase(), s]));
const nice = (id) => (id.length === 1 ? `the letter ${id.toUpperCase()}` : id === 'check' ? 'a checkmark' : id === 'O-ring' ? 'an O-ring' : `a ${id}`);
const pct = (p) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const el = (tag, style, text) => { const e = document.createElement(tag); if (style) Object.assign(e.style, style); if (text != null) e.textContent = text; return e; };

export async function mount(root, ctx) {
  const stage = createStage(root, { hint: ctx.isTouch ? 'Drag to rotate' : 'Drag to rotate' });
  const THREE = stage.THREE;
  const view = await createChain(stage);
  stage.frame(view.boundsOf(view.chain), { azimuth: 24, elevation: 30, pad: 1.05 });

  // annotations: the wire end (module 1 carries the bus and power) and the cube whose joint is turning
  const wireEnd = cubeOutline(THREE, '#9fd3ff', 0.8);
  const active = cubeOutline(THREE, '#ff6b35', 1);
  stage.scene.add(wireEnd, active);
  wireEnd.visible = true;
  const outlineAt = (o, k, M) => { o.matrixAutoUpdate = false; o.matrix.copy(M.F[k]); o.matrixWorldNeedsUpdate = true; };

  // status chip over the stage
  const chip = el('p', {
    position: 'absolute', left: '12px', top: '12px', zIndex: 4, margin: 0, maxWidth: 'calc(100% - 24px)', padding: '7px 12px',
    borderRadius: '12px', background: 'rgba(10, 8, 7, 0.74)', border: '1px solid rgba(255, 255, 255, 0.12)', fontSize: '13px',
    lineHeight: 1.4, color: 'var(--text-2)', pointerEvents: 'none', backdropFilter: 'blur(10px)',
  });
  chip.setAttribute('role', 'status');
  chip.dataset.morphStatus = '';
  root.append(chip);
  const say = (t) => { chip.textContent = t; };
  say('17 cubes, straight. The outlined blue cube is the wire end: it carries the power and the servo bus.');

  // ---------------------------------------------------------------- panel: a message thread, input, chips
  const panel = ctx.panel;
  const col = el('div', { display: 'grid', gap: '12px', flex: '1 1 100%', minWidth: 0 });
  panel.append(col);

  const thread = el('div', { display: 'grid', gap: '8px', minHeight: '64px' });
  thread.setAttribute('aria-live', 'polite');
  const bubble = (text, me) => {
    const b = el('p', {
      margin: 0, justifySelf: me ? 'end' : 'start', maxWidth: 'min(560px, 92%)', padding: '9px 14px', borderRadius: '18px',
      whiteSpace: 'pre-line', fontSize: '14.5px', lineHeight: 1.45, overflowWrap: 'anywhere',
      background: me ? '#0a84ff' : 'rgba(255,255,255,0.08)', color: me ? '#fff' : 'var(--text)',
      borderBottomRightRadius: me ? '6px' : '18px', borderBottomLeftRadius: me ? '18px' : '6px',
    }, text);
    return b;
  };
  const meta = el('p', { margin: '-2px 0 0', fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5 });
  function show(userText, replyText, metaText = '') {
    thread.replaceChildren(...[userText != null ? bubble(userText, true) : null, replyText ? bubble(replyText, false) : null].filter(Boolean));
    meta.textContent = metaText;
  }
  show(null, 'Text me a shape. I fold into it and tell you what I am doing.');

  const form = el('form', { display: 'flex', gap: '8px', alignItems: 'center' });
  const input = el('input', {
    flex: '1 1 auto', minWidth: 0, minHeight: '40px', padding: '8px 16px', borderRadius: '999px', border: '1px solid var(--line-strong)',
    background: 'rgba(255,255,255,0.04)', color: 'var(--text)', font: 'inherit', fontSize: '15px',
  });
  Object.assign(input, { type: 'text', maxLength: 160, placeholder: 'Text the robot', autocomplete: 'off', enterKeyHint: 'send' });
  input.setAttribute('aria-label', 'Message to the robot');
  const send = button(null, { label: 'Send' });
  send.type = 'submit';
  form.append(input, send);
  form.addEventListener('submit', (e) => { e.preventDefault(); handle(input.value); });

  const chips = el('div', { display: 'flex', flexWrap: 'wrap', gap: '6px' });
  const chipBtn = (label, onClick, title) => {
    const b = el('button', {
      minHeight: '30px', padding: '4px 12px', borderRadius: '999px', border: '1px solid var(--line-strong)', background: 'transparent',
      color: 'var(--text-2)', font: 'inherit', fontSize: '13px', cursor: 'pointer',
    }, label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', onClick);
    return b;
  };
  for (const ex of examples) chips.append(chipBtn(`"${ex.text}"`, () => { input.value = ex.text; handle(ex.text); }));

  const loadRow = el('div', { display: 'flex', flexWrap: 'wrap', gap: '8px 14px', alignItems: 'center' });
  const loadBtn = button(loadRow, { label: 'Load the classifier for free text (26 MB)', onClick: () => ensureModel() });
  const loadNote = el('span', { fontSize: '12.5px', color: 'var(--muted)', lineHeight: 1.5, flex: '1 1 260px' },
    'The suggestions above were classified ahead of time by the same model. Free text needs the model itself: the team\'s int8 MiniLM and its head, run on your device. Nothing you type leaves your browser.');
  loadRow.append(loadNote);

  const controls = el('div', { display: 'flex', flexWrap: 'wrap', gap: '10px 18px', alignItems: 'center' });
  let speed = 'fast';
  segmented(controls, { label: 'Speed', value: speed, options: [{ value: 'fast', label: 'Fast' }, { value: 'robot', label: 'Robot: 2 s a step' }], onChange: (v) => { speed = v; } });
  let faceOn = false;
  const viewSeg = segmented(controls, { label: 'View', value: '3d', options: [{ value: '3d', label: '3D' }, { value: 'face', label: 'Face on' }], onChange: (v) => { faceOn = v === 'face'; frameNow(0.7); } });

  // the target drawing and the move list
  const details = el('div', { display: 'flex', flexWrap: 'wrap', gap: '14px 22px', alignItems: 'flex-start' });
  const fig = el('figure', { margin: 0, display: 'grid', gap: '6px', justifyItems: 'center', flex: '0 0 auto' });
  const figBox = el('div');
  const figCap = el('figcaption', { fontSize: '12px', color: 'var(--muted)', textAlign: 'center', maxWidth: '150px' }, 'Pick a shape to see its target drawing');
  fig.append(figBox, figCap);
  const steps = el('ol', { margin: 0, padding: '0 0 0 22px', fontSize: '13px', lineHeight: 1.55, color: 'var(--text-2)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', columnGap: '26px', flex: '1 1 280px', alignContent: 'start' });
  details.append(fig, steps);

  const all = el('details', { fontSize: '13.5px' });
  const sum = el('summary', { cursor: 'pointer', color: 'var(--text-2)' }, `Or fold one of the ${lib.shapes.length} shapes in the public repo directly`);
  const allChips = el('div', { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' });
  for (const s of lib.shapes) allChips.append(chipBtn(s.id, () => { input.value = ''; request(s, `Folding ${nice(s.id)}. ${s.moves.length} ${s.moves.length === 1 ? 'move' : 'moves'}, about ${Math.round(s.moves.length * lib.move_s)}s.`, null, `Picked from the list: ${s.moves.length} planned moves, ${s.ins} of them "in" (the base side swings).`); }));
  all.append(sum, allChips);

  col.append(thread, meta, form, chips, loadRow, controls, details, all);

  // ---------------------------------------------------------------- the classifier (loaded on demand)
  let clf = null, info = null, loading = null;
  function ensureModel() {
    if (clf) return Promise.resolve(clf);
    if (loading) return loading;
    loadBtn.disabled = true;
    loading = loadClassifier(FILES.map((f) => ctx.asset(f)), FILE_BYTES, (a, b) => {
      loadBtn.textContent = `Loading the classifier: ${(a / 1e6).toFixed(1)} of ${(b / 1e6).toFixed(0)} MB`;
    }).then(({ info: i, enc, head }) => {
      info = i;
      clf = createClassifier(info, enc, head);
      loadBtn.textContent = 'Classifier loaded: type anything';
      loadNote.textContent = `The team's MiniLM encoder (int8, ${info.head.classes.length - 1} shape labels plus "none"), running in your browser.`;
      return clf;
    }).catch((e) => {
      loading = null; loadBtn.disabled = false;
      loadBtn.textContent = 'Could not load the classifier. Try again';
      console.warn(e);
      throw e;
    });
    return loading;
  }

  async function handle(raw) {
    const text = String(raw || '').trim();
    if (!text) return;
    if (wantsHelp(text)) { show(text, HELP, 'A help word: the bridge answers with the shape list before any model runs.'); return; }
    if (wantsHome(text)) { goHome(text); return; }
    const ex = examples.find((e) => e.text.toLowerCase() === text.toLowerCase());
    let r;
    if (ex) r = { ...ex, ms: null, pre: true };
    else {
      if (!clf) {
        show(text, null, 'Loading the classifier (26 MB, once)...');
        try { await ensureModel(); } catch { show(text, null, 'The classifier did not load, so only the suggestions work right now.'); return; }
      }
      const c = clf.classify(text, 3);
      const shapeKey = c.accepted ? info.labelShape[c.label] : null;
      r = { text, label: c.label, confidence: c.confidence, margin: c.margin, accepted: c.accepted, ranked: c.ranked, shape: shapeKey, ms: c.ms,
        caption: caption(info.templates, c.label, text) };
    }
    const how = r.pre ? 'classified ahead of time by the same model' : `${r.ms.toFixed(0)} ms on this device`;
    const top = r.ranked.map(([l, p]) => `${l} ${pct(p)}`).join(', ');
    const shape = r.shape ? byKey.get(r.shape) : null;
    if (shape) {
      const n = shape.moves.length;
      const reply = `${r.caption}. ${n} ${n === 1 ? 'move' : 'moves'}, about ${Math.round(n * lib.move_s)}s.\n(deciphered using local MiniLM)`;
      request(shape, reply, text, `MiniLM: ${top} (${how}). Label "${r.label}" is shape ${shape.id} in the library.`);
      return;
    }
    // not foldable here: the booth asked GPT-4o-mini next; this page never calls it
    const name = r.label.replace(/_/g, ' ');
    const read = r.label === 'none' ? 'MiniLM read that as chitchat, not a shape.'
      : !r.accepted ? `MiniLM's best guess, ${name} at ${pct(r.confidence)}, is under the ${pct(info?.head.confidence ?? 0.2)} it needs to act on its own.`
        : `MiniLM read that as ${name} (${pct(r.confidence)}), which is not one of the ${lib.shapes.length} shapes in the public repo.`;
    show(text, `${read}\nAt the booth, GPT-4o-mini got a turn here, and could only answer with a shape from the same list. This page never calls it. Try one of: ${lib.shapes.map((x) => x.id).join(', ')}.`, `MiniLM: ${top} (${how}).`);
  }

  // ---------------------------------------------------------------- folding
  let applied = [];      // moves applied since the straight chain, with their base-before
  let current = null;    // the shape being folded or held
  let pending = null;
  function frameNow(duration = 0.8, target = null) {
    const chains = target || [view.chain];
    const b = view.boundsOf(...chains);
    const end = chains[chains.length - 1];
    let opts = { pad: 1.08, duration: stage.reducedMotion ? 0 : duration, refresh: true };
    if (faceOn && current) {
      // from the side where it reads like its drawing when there is one (the shape may have been turned
      // over by in moves), else straight at the face it lies flat along
      const a = flatAxis(end);
      const fv = faceView(end, current.sil);
      opts = { ...opts, ...(fv || (a === 2 ? { elevation: 88, azimuth: 0 } : a === 1 ? { elevation: 8, azimuth: 0 } : { elevation: 8, azimuth: 90 })) };
    } else {
      const d = stage.camera.position.clone().sub(stage.controls.target).setY(0).normalize().add(new THREE.Vector3(0, 0.62, 0));
      opts.dir = d;
    }
    stage.frame(b, opts);
  }
  function describe(m, i, total) {
    const deg = `${m.d > 0 ? '+' : '-'}120°`;
    return `Move ${i} of ${total}: joint ${m.j + 1}, ${deg}, ${m.out ? `out: cubes ${m.j + 2} to ${N} swing` : `in: cubes 1 to ${m.j + 1} swing, the rest stay put`}.`;
  }
  function listMoves(shape) {
    steps.replaceChildren(...movesOf(shape).map((m, i) => {
      const li = el('li', {}, `joint ${m.j + 1} ${m.d > 0 ? '+' : '-'}120°, ${m.out ? 'out' : 'in'}`);
      li.dataset.i = i;
      return li;
    }));
    figBox.innerHTML = silhouetteSvg(shape.sil, { label: `Target drawing for ${shape.id}` });
    figCap.textContent = `${shape.id}: the drawing the planner folded to (${shape.flat ? 'ends flat on the table' : 'ends standing on edge'})`;
  }
  const mark = (i) => { for (const li of steps.children) li.style.color = Number(li.dataset.i) < i ? 'var(--text)' : Number(li.dataset.i) === i ? 'var(--accent)' : ''; };

  function request(shape, reply, userText, metaText) {
    show(userText, reply, metaText);
    if (view.busy) { pending = shape; view.cancel(); return; }
    run(shape);
  }
  function goHome(userText) {
    show(userText, 'Going back to a straight line (home).', 'A home phrase: the bridge drives every joint back to zero before any model runs.');
    if (view.busy) { pending = 'home'; view.cancel(); return; }
    run(null);
  }
  function unwind() {
    return applied.slice().reverse().map((m) => ({ j: m.j, d: -m.d, out: m.out, base: m.before, back: true }));
  }
  function run(shape) {
    const back = unwind();
    const secs = SPEEDS[speed];
    current = shape;
    if (!shape) steps.replaceChildren(), (figBox.innerHTML = ''), (figCap.textContent = 'Straight chain: every joint at 0');
    else listMoves(shape);
    const fwd = shape ? movesOf(shape).map((m, i) => ({ ...m, i, total: shape.moves.length })) : [];
    // frame everything the chain will pass through
    const targets = shape ? snapshots(shape) : [];
    if (stage.reducedMotion) {
      view.set(shape ? targets[targets.length - 1] : new Chain(applied.length ? applied[0].before : view.chain.base));
      applied = shape ? movesOf(shape) : [];
      done(shape);
      return;
    }
    const seq = [...back];
    if (shape) {
      const straight = new Chain(shape.start);
      const sameFace = JSON.stringify(shape.start) === JSON.stringify(back.length ? back[back.length - 1].base : view.chain.base);
      if (!sameFace) seq.push({ swap: straight, lying: shape.lying });
      seq.push(...fwd);
    }
    frameNow(0.8, [view.chain, ...targets]);
    if (back.length) say(`Unfolding ${applied.length} ${applied.length === 1 ? 'move' : 'moves'} first, backwards.`);
    view.play(seq, secs);
  }
  function done(shape) {
    active.visible = false;
    const M = view.matrices(view.chain);
    outlineAt(wireEnd, 0, M);
    if (shape) { mark(shape.moves.length); say(`${shape.id}: ${shape.moves.length} ${shape.moves.length === 1 ? 'move' : 'moves'}, ${shape.flat ? 'lying flat' : 'standing on edge'}, as the planner predicted.`); }
    else say('Home: a straight line, every joint at 0.');
    frameNow(0.8);
  }
  view.onMove = (m) => {
    const M = view.matrices(view.chain);
    outlineAt(active, m.j, M); active.visible = true;
    if (m.back) say(`Unfolding: joint ${m.j + 1} back to ${view.chain.states[m.j] + m.d === 0 ? '0' : `${m.d > 0 ? '+' : '-'}120°`}, ${m.out ? 'out' : 'in'}.`);
    else { say(describe(m, m.i + 1, m.total)); mark(m.i); }
  };
  view.onMoved = (m) => {
    if (m.back) applied.pop(); else applied.push(m);
    outlineAt(wireEnd, 0, view.matrices(view.chain));
  };
  view.onSwap = (m) => { applied = []; say(`This plan starts with the straight chain resting on a different long face (the planner tries all four), so it is turned over first.`); outlineAt(wireEnd, 0, view.matrices(view.chain)); };
  view.onIdle = () => {
    if (pending) { const p = pending; pending = null; run(p === 'home' ? null : p); return; }
    done(current);
  };
  outlineAt(wireEnd, 0, view.matrices(view.chain));

  return {
    dispose() { chip.remove(); stage.dispose(); },
  };
}
