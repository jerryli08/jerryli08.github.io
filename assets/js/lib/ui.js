// Small shared controls for demo modules, styled in site.css (.rx-ui). Each takes the element
// to append to (usually ctx.panel, the strip under a demo's canvas) and returns a handle.
//
//   import { slider, playToggle, readout, segmented, button } from '/assets/js/lib/ui.js';
//   const s = slider(ctx.panel, { label: 'Latch', min: 0, max: 42, value: 0, unit: '°', onInput: (v) => rig.set(v) });
//   s.set(20);            // moves the thumb and calls onInput (pass { silent: true } to skip that)
let uid = 0;
const nextId = (p) => `rx-${p}-${++uid}`;
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fmtDefault = (step) => { const d = Math.max(0, Math.min(4, (String(step).split('.')[1] || '').length)); return (v) => Number(v).toFixed(d); };

/**
 * Range slider with a label and a live value.
 * opts: label, min (0), max (1), step (0.01), value (min), unit (''), format(v) -> string, onInput(v)
 * returns { el, input, value, set(v, { silent }), destroy() }
 */
export function slider(parent, o = {}) {
  const min = o.min ?? 0, max = o.max ?? 1, step = o.step ?? 0.01;
  const fmt = o.format || fmtDefault(step);
  const id = nextId('s');
  const wrap = el('div', 'rx-ui rx-slider');
  const lab = el('label', 'rx-ui-l', o.label || '');
  lab.htmlFor = id;
  const input = el('input');
  Object.assign(input, { type: 'range', id, min, max, step });
  input.value = o.value ?? min;
  const out = el('output', 'rx-ui-v num');
  out.htmlFor = id;
  const paint = () => {
    const v = Number(input.value);
    out.textContent = `${fmt(v)}${o.unit || ''}`;
    input.style.setProperty('--fill', `${((v - min) / (max - min || 1)) * 100}%`);
  };
  input.addEventListener('input', () => { paint(); o.onInput?.(Number(input.value)); });
  wrap.append(lab, input, out);
  parent?.appendChild(wrap);
  paint();
  return {
    el: wrap, input,
    get value() { return Number(input.value); },
    set(v, { silent = false } = {}) { input.value = v; paint(); if (!silent) o.onInput?.(Number(input.value)); },
    destroy() { wrap.remove(); },
  };
}

/**
 * Play / pause button. opts: playing (false), onChange(playing), labels (['Play', 'Pause'])
 * returns { el, playing, set(on, { silent }), destroy() }
 */
export function playToggle(parent, o = {}) {
  const [lPlay, lPause] = o.labels || ['Play', 'Pause'];
  const b = el('button', 'rx-ui rx-btn rx-play');
  b.type = 'button';
  let on = !!o.playing;
  const paint = () => {
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = on
      ? '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3" width="3" height="10" rx="1"/><rect x="9.5" y="3" width="3" height="10" rx="1"/></svg>'
      : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 2.8v10.4a.6.6 0 0 0 .9.5l8.2-5.2a.6.6 0 0 0 0-1L5.4 2.3a.6.6 0 0 0-.9.5z"/></svg>';
    b.append(el('span', null, on ? lPause : lPlay));
  };
  b.addEventListener('click', () => { on = !on; paint(); o.onChange?.(on); });
  parent?.appendChild(b);
  paint();
  return {
    el: b,
    get playing() { return on; },
    set(v, { silent = false } = {}) { on = !!v; paint(); if (!silent) o.onChange?.(on); },
    destroy() { b.remove(); },
  };
}

/**
 * Telemetry readout: a small table of live values.
 * opts: title?, rows: [{ key, label, unit?, format?(v), value? }]
 * returns { el, set({ key: value, ... }), destroy() }
 */
export function readout(parent, o = {}) {
  const wrap = el('div', 'rx-ui rx-readout');
  if (o.title) wrap.append(el('p', 'rx-readout-t', o.title));
  const dl = el('dl');
  const cells = new Map();
  for (const r of o.rows || []) {
    const row = el('div');
    const dd = el('dd', 'num');
    row.append(el('dt', null, r.label ?? r.key), dd);
    dl.append(row);
    cells.set(r.key, { dd, r });
  }
  wrap.append(dl);
  parent?.appendChild(wrap);
  const set = (vals = {}) => {
    for (const [k, v] of Object.entries(vals)) {
      const c = cells.get(k);
      if (!c) continue;
      const txt = c.r.format ? c.r.format(v) : typeof v === 'number' ? fmtDefault(0.01)(v) : String(v);
      const u = c.r.unit || '';
      c.dd.textContent = `${txt}${u && /^[A-Za-z]/.test(u) ? ' ' : ''}${u}`; // "12 cm", "40°", "5%"
    }
  };
  set(Object.fromEntries((o.rows || []).filter((r) => r.value != null).map((r) => [r.key, r.value])));
  return { el: wrap, set, destroy() { wrap.remove(); } };
}

/**
 * One-of-several buttons (versions, views). opts: label?, options: [{ value, label }] or strings,
 * value, onChange(value). returns { el, value, set(v, { silent }), destroy() }
 */
export function segmented(parent, o = {}) {
  const opts = (o.options || []).map((x) => (typeof x === 'object' ? x : { value: x, label: String(x) }));
  const wrap = el('div', 'rx-ui rx-seg');
  const group = el('div', 'rx-seg-g');
  group.setAttribute('role', 'group');
  if (o.label) { const l = el('span', 'rx-ui-l', o.label); l.id = nextId('g'); group.setAttribute('aria-labelledby', l.id); wrap.append(l); }
  let value = o.value ?? opts[0]?.value;
  const btns = opts.map((x) => {
    const b = el('button', 'rx-seg-b', x.label ?? String(x.value));
    b.type = 'button';
    b.addEventListener('click', () => { if (value !== x.value) { value = x.value; paint(); o.onChange?.(value); } });
    group.append(b);
    return [x.value, b];
  });
  const paint = () => { for (const [v, b] of btns) b.setAttribute('aria-pressed', String(v === value)); };
  wrap.append(group);
  parent?.appendChild(wrap);
  paint();
  return {
    el: wrap,
    get value() { return value; },
    set(v, { silent = false } = {}) { value = v; paint(); if (!silent) o.onChange?.(value); },
    destroy() { wrap.remove(); },
  };
}

/** Plain button. opts: label, onClick. returns the element. */
export function button(parent, o = {}) {
  const b = el('button', 'rx-ui rx-btn', o.label || '');
  b.type = 'button';
  if (o.onClick) b.addEventListener('click', o.onClick);
  parent?.appendChild(b);
  return b;
}
