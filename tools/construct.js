// Puzzle construction + evaluation.
// Places theme words onto a layout so that playing them in some order clears the board,
// then measures difficulty with simulated players.
const Core = require('../src/core.js');
const { expand, view } = require('./viz.js');
const LAYOUTS = require('./layouts.js');
const DICT = Core.decodeDict(require('../src/dict.json'));

function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function sample(arr, k, r) { return shuffle(arr.slice(), r).slice(0, k); }

/* Find groups: an order of words + disjoint tile sets, each fully free when played. */
function place(tiles, words, r, opts = {}) {
  const g = Core.geometry(tiles), n = tiles.length;
  const alive = new Uint8Array(n).fill(1);
  let nodes = 0;
  const maxNodes = opts.maxNodes || 4000;
  const firstWord = opts.firstWord; // optional: force which word is first
  function dfs(remaining, acc) {
    if (++nodes > maxNodes) return null;
    if (!remaining.length) return acc;
    const free = Core.freeList(g, alive);
    let cand = shuffle(remaining.slice(), r);
    if (acc.length === 0 && firstWord != null) cand = [firstWord];
    for (const wi of cand) {
      const len = words[wi].length;
      if (free.length < len) continue;
      for (let t = 0; t < 6; t++) {
        const grp = sample(free, len, r);
        grp.forEach(i => alive[i] = 0);
        const res = dfs(remaining.filter(x => x !== wi), acc.concat([{ w: wi, tiles: grp }]));
        grp.forEach(i => alive[i] = 1);
        if (res) return res;
      }
    }
    return null;
  }
  return dfs(words.map((_, i) => i), []);
}

/* Simulated players. 'random' picks any common word (longer favoured);
   'careful' also tries to keep about 40% vowels among the tiles left. */
const VOW = new Set('aeiou');
function makeEvaluator(tiles, lex, themeSigs) {
  const solver = Core.Solver(tiles, lex);
  function pick(ms, alive, r, careful, themed) {
    let tot = 0;
    const w = ms.map(m => {
      let s = Math.pow(m.tiles.length - 2, 1.6);
      if (themed && themeSigs.has(m.sig)) s *= 25;
      if (careful) {
        let un = 0;
        for (const t of m.tiles) for (let i = 0; i < tiles.length; i++) if (alive[i] && solver.g.above[i].includes(t)) un++;
        s *= 1 + 0.6 * un;
      }
      if (careful) {
        let v = 0, c = 0;
        for (let i = 0; i < tiles.length; i++) if (alive[i] && !m.tiles.includes(i)) { if (VOW.has(tiles[i].l)) v++; c++; }
        const ratio = c ? v / c : 0.4;
        s *= Math.exp(-Math.pow((ratio - 0.4) / 0.12, 2));
      }
      tot += s; return s;
    });
    let x = r() * tot, k = 0; while (x > w[k] && k < w.length - 1) { x -= w[k]; k++; }
    return ms[k];
  }
  return {
    solver,
    playout(r, careful, themed) {
      const alive = new Uint8Array(tiles.length).fill(1);
      let left = tiles.length, words = 0;
      while (left > 0) {
        const ms = solver.moves(alive, true).filter(m => !(left - m.tiles.length > 0 && left - m.tiles.length < 3));
        if (!ms.length) return { clear: false, words, left };
        const m = pick(ms, alive, r, careful, themed);
        m.tiles.forEach(i => alive[i] = 0);
        left -= m.tiles.length; words++;
      }
      return { clear: true, words };
    },
  };
}

function evaluate(tiles, lex, par, N, seed, deep, themeWords) {
  const themeSigs = new Set((themeWords || []).map(Core.sortLetters));
  const ev = makeEvaluator(tiles, lex, themeSigs), r = rng(seed);
  let rc = 0, cc = 0, ccPar = 0, tc = 0;
  for (let i = 0; i < N; i++) {
    if (ev.playout(r, false).clear) rc++;
    const o = ev.playout(r, true);
    if (o.clear) { cc++; if (o.words <= par) ccPar++; }
    if (ev.playout(r, true, true).clear) tc++;
  }
  const out = { random: +(rc / N).toFixed(3), careful: +(cc / N).toFixed(3), carefulPar: +(ccPar / N).toFixed(3), themed: +(tc / N).toFixed(3) };
  if (deep) {
    // how punishing is the opening? share of first moves (common words) that keep the board clearable
    const alive = new Uint8Array(tiles.length).fill(1);
    const first = ev.solver.moves(alive, true);
    let ok = 0, unknown = 0;
    for (const m of first) {
      m.tiles.forEach(i => alive[i] = 0);
      const s = ev.solver.solve(alive, 20000);
      m.tiles.forEach(i => alive[i] = 1);
      if (s.status === 'clear') ok++; else if (s.status === 'unknown') unknown++;
    }
    Object.assign(out, { firstMoves: first.length, firstOk: +(ok / Math.max(1, first.length)).toFixed(3), unknown });
  }
  return out;
}

function buildPuzzle(spec, opts = {}) {
  const tiles0 = expand(LAYOUTS[spec.layout]);
  const words = spec.words.map(w => w.toLowerCase());
  const total = words.reduce((s, w) => s + w.length, 0);
  if (total !== tiles0.length) throw new Error(`${spec.title}: ${total} letters vs ${tiles0.length} tiles`);
  const letters = words.join('');
  const lex = Core.puzzleLexicon(DICT, letters);
  for (const w of words) if (!lex.words.has(w)) throw new Error('not in dictionary: ' + w);
  const r = rng(opts.seed || 1);
  const cands = [];
  for (let attempt = 0; attempt < (opts.attempts || 30); attempt++) {
    const pl = place(tiles0, words, r, { firstWord: spec.firstWord });
    if (!pl) continue;
    const tiles = tiles0.map(t => ({ ...t }));
    pl.forEach(({ w, tiles: grp }) => {
      const ls = shuffle(words[w].split(''), r);
      grp.forEach((ti, k) => { tiles[ti].l = ls[k]; });
    });
    const ev = evaluate(tiles, lex, words.length, opts.N || 300, attempt + 7, opts.deep, words);
    cands.push({ tiles, solution: pl, ev });
  }
  return { words, lex, cands };
}

module.exports = { buildPuzzle, evaluate, place, rng, expand, view, DICT };

if (require.main === module) {
  const layout = process.argv[2], wordsArg = process.argv[3];
  const t0 = Date.now();
  const res = buildPuzzle({ title: 'test', layout, words: wordsArg.split(',') }, { attempts: +(process.argv[4] || 10), N: 300 });
  console.log(`placed ${res.cands.length} candidates in ${Date.now() - t0}ms`);
  for (const c of res.cands) console.log(JSON.stringify(c.ev));
}
