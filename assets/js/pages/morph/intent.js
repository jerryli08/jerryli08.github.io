// The booth's intent classifier, run in the browser. Nothing is retrained or approximated:
//  - the encoder is the team's own all-MiniLM-L6-v2 file, dynamically quantized to int8
//    (imessage/data/encoder/minilm/model.onnx), exported weight for weight to minilm-int8.bin;
//  - this file runs the same graph onnxruntime runs: uint8 activations quantized per tensor
//    (DynamicQuantizeLinear), int8 x uint8 integer matmuls, float attention, GELU, LayerNorm,
//    then mean pooling and L2 normalisation (imessage/cubot_imessage/model/encoder.py);
//  - the head is the fitted softmax from imessage/data/intent_head.npz over [MiniLM | TF-IDF] / sqrt 2,
//    with the same thresholds (model/head.py).
// Checked (work/morph-htn-2026/build): the tokenizer gives the same ids as the team's on all 7,578 corpus
// texts; the encoder matches onnxruntime run at its basic optimization level (cosine 1.0) and gives the
// same top label as the team's default pipeline on 400 of 400 sampled corpus texts.

const NONE = 'none';

// ------------------------------------------------------------------ small helpers
const rint = (x) => { const r = Math.round(x); return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : r; };
function erf(x) { // W. J. Cody style rational approximation via erfc, |error| < 1.2e-7
  const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? 1 - r : r - 1;
}
function half(u16) { // IEEE float16 -> float32
  const out = new Float32Array(u16.length);
  for (let i = 0; i < u16.length; i++) {
    const h = u16[i], s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
    out[i] = e === 0 ? s * f * 2 ** -24 : e === 31 ? (f ? NaN : s * Infinity) : s * (1 + f / 1024) * 2 ** (e - 15);
  }
  return out;
}
function view(buf, t) {
  const n = t.shape.reduce((a, b) => a * b, 1);
  if (t.dtype === 'int8') return new Int8Array(buf, t.off, n);
  if (t.dtype === 'uint8') return new Uint8Array(buf, t.off, n);
  if (t.dtype === 'float32') return new Float32Array(buf, t.off, n);
  if (t.dtype === 'float16') return half(new Uint16Array(buf, t.off, n));
  throw new Error(`dtype ${t.dtype}`);
}

// ------------------------------------------------------------------ tokenizer: BertNormalizer + BertPreTokenizer + WordPiece
const isCjk = (cp) => (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf) || (cp >= 0x20000 && cp <= 0x2a6df)
  || (cp >= 0x2a700 && cp <= 0x2b73f) || (cp >= 0x2b740 && cp <= 0x2b81f) || (cp >= 0x2b820 && cp <= 0x2ceaf)
  || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0x2f800 && cp <= 0x2fa1f);
const PUNCT = /\p{P}/u, CTRL = /[\p{Cc}\p{Cf}]/u, SPACE = /\p{Zs}/u, MARK = /\p{Mn}/u;
const isPunct = (ch) => { const c = ch.codePointAt(0); return (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126) || PUNCT.test(ch); };
function normalize(text) {
  let s = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp === 0 || cp === 0xfffd || (CTRL.test(ch) && !'\t\n\r'.includes(ch))) continue;
    s += ' \t\n\r'.includes(ch) || SPACE.test(ch) ? ' ' : isCjk(cp) ? ` ${ch} ` : ch;
  }
  s = s.toLowerCase().normalize('NFD');
  let out = '';
  for (const ch of s) if (!MARK.test(ch)) out += ch;
  return out;
}
function pretokenize(text) {
  const words = [];
  let cur = '';
  for (const ch of text) {
    if (/\s/u.test(ch)) { if (cur) { words.push(cur); cur = ''; } } else if (isPunct(ch)) { if (cur) { words.push(cur); cur = ''; } words.push(ch); } else cur += ch;
  }
  if (cur) words.push(cur);
  return words;
}

export function createTokenizer(vocabList, maxlen = 64) {
  const vocab = new Map(vocabList.map((t, i) => [t, i]));
  const UNK = vocab.get('[UNK]'), CLS = vocab.get('[CLS]'), SEP = vocab.get('[SEP]');
  function wordpiece(word) {
    const chars = [...word];
    if (chars.length > 100) return [UNK];
    const ids = [];
    let start = 0;
    while (start < chars.length) {
      let end = chars.length, found = -1;
      while (start < end) {
        const sub = (start ? '##' : '') + chars.slice(start, end).join('');
        if (vocab.has(sub)) { found = vocab.get(sub); break; }
        end--;
      }
      if (found < 0) return [UNK];
      ids.push(found); start = end;
    }
    return ids;
  }
  return (text) => {
    let ids = [];
    for (const w of pretokenize(normalize(text))) ids = ids.concat(wordpiece(w));
    return [CLS, ...ids.slice(0, maxlen - 2), SEP];
  };
}

// ------------------------------------------------------------------ the encoder
export function createEncoder(info, buf) {
  const W = {};
  for (const [name, t] of Object.entries(info.index)) W[name] = view(buf, t);
  const D = 384, H = 12, HD = 32, F = 1536;
  const [ws, wz] = info.emb.word, [ps, pz] = info.emb.position, [ts, tz] = info.emb.token_type;

  function layerNorm(x, T, w, b) {
    for (let t = 0; t < T; t++) {
      const o = t * D;
      let mu = 0; for (let i = 0; i < D; i++) mu += x[o + i];
      mu /= D;
      let v = 0; for (let i = 0; i < D; i++) { const d = x[o + i] - mu; v += d * d; }
      const inv = 1 / Math.sqrt(v / D + 1e-12);
      for (let i = 0; i < D; i++) x[o + i] = (x[o + i] - mu) * inv * w[i] + b[i];
    }
  }
  // DynamicQuantizeLinear (uint8, per tensor) then MatMulInteger with int8 weights (zero point 0)
  function qmatmul(x, T, K, N, w, wscale, bias) {
    let mn = 0, mx = 0;
    for (let i = 0; i < T * K; i++) { const v = x[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
    const scale = Math.fround((mx - mn) / 255);
    const out = new Float32Array(T * N);
    if (scale === 0) { for (let t = 0; t < T; t++) out.set(bias, t * N); return out; }
    const zp = Math.min(255, Math.max(0, rint(-mn / scale)));
    const a = new Int16Array(T * K);
    for (let i = 0; i < T * K; i++) a[i] = Math.min(255, Math.max(0, rint(x[i] / scale) + zp)) - zp;
    const acc = new Int32Array(N);
    const s = Math.fround(scale * wscale);
    for (let t = 0; t < T; t++) {
      acc.fill(0);
      for (let k = 0; k < K; k++) {
        const av = a[t * K + k];
        if (!av) continue;
        const row = k * N;
        for (let n = 0; n < N; n++) acc[n] += av * w[row + n];
      }
      for (let n = 0; n < N; n++) out[t * N + n] = acc[n] * s + bias[n];
    }
    return out;
  }

  return function embed(ids) {
    const T = ids.length;
    let x = new Float32Array(T * D);
    for (let t = 0; t < T; t++) {
      const wo = ids[t] * D, po = t * D;
      for (let i = 0; i < D; i++) {
        x[t * D + i] = (W.word[wo + i] - wz) * ws + (W.type[i] - tz) * ts + (W.pos[po + i] - pz) * ps;
      }
    }
    layerNorm(x, T, W['ln0.w'], W['ln0.b']);
    const sq = 1 / Math.sqrt(HD);
    for (let L = 0; L < 6; L++) {
      const sc = info.scales[L];
      const q = qmatmul(x, T, D, D, W[`${L}.q`], sc.q, W[`${L}.q.b`]);
      const k = qmatmul(x, T, D, D, W[`${L}.k`], sc.k, W[`${L}.k.b`]);
      const v = qmatmul(x, T, D, D, W[`${L}.v`], sc.v, W[`${L}.v.b`]);
      const ctx = new Float32Array(T * D);
      const att = new Float64Array(T);
      for (let h = 0; h < H; h++) {
        const ho = h * HD;
        for (let i = 0; i < T; i++) {
          let m = -Infinity;
          for (let j = 0; j < T; j++) {
            let dot = 0;
            for (let d = 0; d < HD; d++) dot += q[i * D + ho + d] * k[j * D + ho + d];
            att[j] = dot * sq; if (att[j] > m) m = att[j];
          }
          let sum = 0;
          for (let j = 0; j < T; j++) { att[j] = Math.exp(att[j] - m); sum += att[j]; }
          for (let d = 0; d < HD; d++) {
            let acc = 0;
            for (let j = 0; j < T; j++) acc += att[j] * v[j * D + ho + d];
            ctx[i * D + ho + d] = acc / sum;
          }
        }
      }
      const o = qmatmul(ctx, T, D, D, W[`${L}.o`], sc.o, W[`${L}.o.b`]);
      for (let i = 0; i < T * D; i++) o[i] += x[i];
      layerNorm(o, T, W[`${L}.ln1.w`], W[`${L}.ln1.b`]);
      x = o;
      const f = qmatmul(x, T, D, F, W[`${L}.f1`], sc.f1, W[`${L}.f1.b`]);
      for (let i = 0; i < T * F; i++) { const y = f[i]; f[i] = y * 0.5 * (1 + erf(y / 1.4142135)); }
      const y = qmatmul(f, T, F, D, W[`${L}.f2`], sc.f2, W[`${L}.f2.b`]);
      for (let i = 0; i < T * D; i++) y[i] += x[i];
      layerNorm(y, T, W[`${L}.ln2.w`], W[`${L}.ln2.b`]);
      x = y;
    }
    const e = new Float64Array(D);
    for (let t = 0; t < T; t++) for (let i = 0; i < D; i++) e[i] += x[t * D + i];
    let n = 0; for (let i = 0; i < D; i++) { e[i] /= T; n += e[i] * e[i]; }
    n = Math.max(Math.sqrt(n), 1e-9);
    for (let i = 0; i < D; i++) e[i] /= n;
    return e;
  };
}

// ------------------------------------------------------------------ TF-IDF (encoder.py TfidfEncoder) and the head
const cleanText = (t) => (String(t).toLowerCase().match(/[a-z0-9']+/g) || []).join(' ');
export function createTfidf(vocabList, idf) {
  const index = new Map(vocabList.map((t, i) => [t, i]));
  return (text) => {
    const clean = cleanText(text), words = clean ? clean.split(' ') : [];
    const counts = new Map();
    const add = (f) => { const j = index.get(f); if (j !== undefined) counts.set(j, (counts.get(j) || 0) + 1); };
    for (let n = 1; n <= 2; n++) for (let i = 0; i + n <= words.length; i++) add('w:' + words.slice(i, i + n).join(' '));
    const padded = [...` ${clean} `];
    for (let n = 3; n <= 5; n++) for (let i = 0; i + n <= padded.length; i++) add('c:' + padded.slice(i, i + n).join(''));
    const feats = [];
    let norm = 0;
    for (const [j, tf] of counts) { const v = (1 + Math.log(tf)) * idf[j]; feats.push([j, v]); norm += v * v; }
    norm = Math.sqrt(norm);
    return norm > 1e-9 ? feats.map(([j, v]) => [j, v / norm]) : [];
  };
}

/** The whole classifier. info: intent.json; enc, head: ArrayBuffers of minilm-int8.bin and intent.bin */
export function createClassifier(info, enc, head) {
  const tokenize = createTokenizer(info.vocab, info.encoder.maxlen);
  const embed = createEncoder(info.encoder, enc);
  const Wh = view(head, info.head.index.W), bh = view(head, info.head.index.b), idf = view(head, info.head.index.idf);
  const tfidf = createTfidf(info.tfidf, idf);
  const classes = info.head.classes, C = classes.length, [DE, DT] = info.head.dims, DIM = DE + DT;
  const r2 = 1 / Math.SQRT2;

  function probabilities(text) {
    const e = embed(tokenize(text.trim() || '.'));
    const f = tfidf(text);
    const z = new Float64Array(C);
    for (let c = 0; c < C; c++) {
      const row = c * DIM;
      let s = 0;
      for (let i = 0; i < DE; i++) s += Wh[row + i] * e[i];
      for (const [j, v] of f) s += Wh[row + DE + j] * v;
      z[c] = s * r2 + bh[c];
    }
    let m = -Infinity; for (const v of z) m = Math.max(m, v);
    let sum = 0; for (let c = 0; c < C; c++) { z[c] = Math.exp(z[c] - m); sum += z[c]; }
    for (let c = 0; c < C; c++) z[c] /= sum;
    return z;
  }
  /** head.decide(): label, confidence, margin (top-1 minus top-2) and whether it clears the thresholds */
  function classify(text, topK = 5) {
    const t0 = performance.now();
    const p = probabilities(text);
    const order = [...p.keys()].sort((a, b) => p[b] - p[a]);
    const label = classes[order[0]], confidence = p[order[0]], margin = confidence - p[order[1]];
    return {
      text, label, confidence, margin,
      accepted: label !== NONE && margin >= info.head.margin && confidence >= info.head.confidence,
      ranked: order.slice(0, topK).map((i) => [classes[i], p[i]]),
      probs: p, ms: performance.now() - t0,
    };
  }
  /** Classifier.restricted_best(): the best label among the ones the robot can fold */
  function restrictedBest(result, allowed) {
    let best = null;
    classes.forEach((c, i) => { if (c !== NONE && allowed.includes(c) && (!best || result.probs[i] > best[1])) best = [c, result.probs[i]]; });
    return best;
  }
  return { classify, restrictedBest, tokenize, classes };
}

// ------------------------------------------------------------------ captions.py, ported (the reply text)
const KNOWN = { 'hack the north': 'Hack the North', hackthenorth: 'Hack the North', htn: 'Hack the North', 'hack north': 'Hack the North', 'the judges': 'the judges', judges: 'the judges', waterloo: 'Waterloo', uwaterloo: 'Waterloo', uw: 'Waterloo', toronto: 'Toronto', everyone: 'everyone', everybody: 'everyone', 'my team': 'my team', 'the team': 'the team' };
const NOT_NAMES = new Set(['me', 'you', 'it', 'us', 'them', 'this', 'that', 'now', 'real', 'sure', 'fun', 'free', 'later', 'once', 'ever', 'good', 'great', 'example', 'instance', 'starters', 'a sec', 'a second', 'a minute', 'a moment', 'a bit', 'a while', 'a change', 'the demo', 'the record', 'the camera', 'the win', 'the table', 'the floor', 'the lols', 'the meme', 'hello', 'hi', 'hey', 'help', 'love', 'some love', 'a laugh', 'no reason', 'old times', 'practice', 'test', 'testing']);
const VERBS = /\b(?:make|draw|build|show|form|write|do|be|spell|turn|become|fold|please|shape|go|get|give)\b/i;
const DURATION = /\b(?:sec|secs|second|seconds|minute|minutes|hour|hours|\d+)\b/i;
const TRAILING = /\s*\b(?:please|pls|plz|now|again|thanks|thank you|ty)\b\s*$/i;
const PATTERNS = [
  /\bshow\s+(?<who>.+?)\s+some\s+(?:love|affection|support)\b/i,
  /\bsend\s+(?:some\s+)?love\s+to\s+(?<who>.+?)(?:\s*[.!?,;]|$)/i,
  /\b(?:say\s+(?:hi|hello|hey)\s+to|greet|wave\s+(?:at|to)|hello\s+to|hi\s+to)\s+(?<who>.+?)(?:\s*[.!?,;]|$)/i,
  /\b(?:show|give)\s+(?<who>.+?)\s+(?:a|an|the|some)\s+\w+/i,
  /\bfor\s+(?<who>.+?)(?:\s*[.!?,;]|$)/i,
];
export function extractWho(text) {
  const clean = String(text).split(/\s+/).filter(Boolean).join(' ');
  for (const p of PATTERNS) {
    const m = clean.match(p);
    if (!m) continue;
    const who = m.groups.who.trim().replace(/^["' ]+|["' ]+$/g, '').replace(TRAILING, '').trim();
    const low = who.toLowerCase();
    if (!who || who.length > 40 || who.split(' ').length > 4) continue;
    if (NOT_NAMES.has(low) || VERBS.test(low) || DURATION.test(low)) continue;
    return KNOWN[low] || KNOWN[low.replace('the ', '')] || who;
  }
  return null;
}
export function caption(templates, label, text) {
  const who = extractWho(text);
  let pair = templates[label];
  if (!pair) {
    if (/^(letter|digit)_/.test(label)) {
      const nice = label.startsWith('letter_') ? `letter ${label.slice(7).toUpperCase()}` : `number ${label.slice(6)}`;
      pair = [`The ${nice} for {who}`, `Making the ${nice}`];
    } else {
      const sp = label.replace(/_/g, ' ');
      const nice = `${'aeiou'.includes(sp[0]) ? 'an' : 'a'} ${sp}`;
      pair = [`Making ${nice} for {who}`, `Making ${nice}`];
    }
  }
  return who ? pair[0].replace('{who}', who) : pair[1];
}

// ------------------------------------------------------------------ the bridge's rules that run before the model (bridge.py)
export const HELP_WORDS = new Set(['help', '?', 'shapes', 'shape list', 'what can you do', 'what can you make', 'what shapes', 'commands', 'menu', 'list', 'options']);
const HOME = new Set(['straight', 'straight line', 'a straight line', 'the straight line', 'line', 'a line', 'home', 'go home', 'go to home', 'return home', 'zero', 'zeros', 'all zero', 'at zero', 'unfold', 'unfolded', 'reset', 'flat', 'flat line', 'straight chain', 'make it straight', 'fold straight', 'be straight']);
export const wantsHelp = (text) => HELP_WORDS.has(text.toLowerCase().replace(/^[!?. ]+|[!?. ]+$/g, ''));
export const wantsHome = (text) => HOME.has(text.toLowerCase().replace(/^[!?. ]+|[!?. ]+$/g, '').replace(/[_-]/g, ' ').split(/\s+/).filter(Boolean).join(' '));

/** Fetch the three files with progress; onProgress(bytesLoaded, bytesTotal) */
export async function loadClassifier(urls, sizes, onProgress) {
  const total = sizes.reduce((a, b) => a + b, 0);
  const got = urls.map(() => 0);
  async function grab(url, i) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    if (!res.body || !res.body.getReader) { const b = await res.arrayBuffer(); got[i] = b.byteLength; onProgress?.(got.reduce((a, c) => a + c, 0), total); return b; }
    const reader = res.body.getReader(), parts = [];
    let n = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); n += value.length; got[i] = n;
      onProgress?.(got.reduce((a, c) => a + c, 0), total);
    }
    const out = new Uint8Array(n);
    let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
    return out.buffer;
  }
  const [info, enc, head] = await Promise.all(urls.map(grab));
  return { info: JSON.parse(new TextDecoder().decode(info)), enc, head };
}
