/* Strata core: board geometry, free-tile rules, lexicon, solver.
   Shared by the build tools (Node) and the game page (inlined). */
(function (root) {
  'use strict';
  var Core = {};
  Core.MIN_LEN = 3;

  /* Tiles live on a half-unit grid: each tile is 2x2 half-units.
     A tile is covered if any higher tile overlaps its footprint.
     A tile is free if it is uncovered and its left or right side is open. */
  Core.geometry = function (tiles) {
    var n = tiles.length, above = [], left = [], right = [], i, j;
    for (i = 0; i < n; i++) { above.push([]); left.push([]); right.push([]); }
    for (i = 0; i < n; i++) {
      var a = tiles[i];
      for (j = 0; j < n; j++) {
        if (i === j) continue;
        var b = tiles[j];
        var ox = Math.abs(a.x - b.x) < 2, oy = Math.abs(a.y - b.y) < 2;
        if (b.z > a.z && ox && oy) above[i].push(j);
        else if (b.z === a.z && oy) {
          if (b.x === a.x - 2) left[i].push(j);
          else if (b.x === a.x + 2) right[i].push(j);
        }
      }
    }
    return { n: n, above: above, left: left, right: right };
  };

  function anyAlive(list, alive) {
    for (var k = 0; k < list.length; k++) if (alive[list[k]]) return true;
    return false;
  }
  Core.isCovered = function (g, alive, i) { return anyAlive(g.above[i], alive); };
  Core.isFree = function (g, alive, i) {
    if (!alive[i] || anyAlive(g.above[i], alive)) return false;
    return !anyAlive(g.left[i], alive) || !anyAlive(g.right[i], alive);
  };
  Core.freeList = function (g, alive) {
    var out = [];
    for (var i = 0; i < g.n; i++) if (Core.isFree(g, alive, i)) out.push(i);
    return out;
  };

  /* ---------- dictionary ---------- */
  function decodeFront(s, L, out) {
    var i = 0, prev = '';
    while (i < s.length) {
      var c = s.charCodeAt(i), p = c < 58 ? c - 48 : c - 55;
      var w = prev.slice(0, p) + s.substr(i + 1, L - p);
      out.push(w);
      prev = w;
      i += 1 + L - p;
    }
  }
  Core.decodeDict = function (data) {
    var common = [], rare = [];
    for (var L = data.min; L <= data.max; L++) {
      if (data.common[L]) decodeFront(data.common[L], L, common);
      if (data.rare[L]) decodeFront(data.rare[L], L, rare);
    }
    return { common: common, rare: rare };
  };

  function countLetters(s) {
    var c = new Array(26).fill(0);
    for (var i = 0; i < s.length; i++) c[s.charCodeAt(i) - 97]++;
    return c;
  }
  function sortLetters(w) { return w.split('').sort().join(''); }
  Core.sortLetters = sortLetters;

  /* Lexicon restricted to words buildable from a puzzle's letters.
     words: Set of acceptable words; sigs: sorted-letters -> {word, common}. */
  Core.puzzleLexicon = function (dict, letterString) {
    var pool = countLetters(letterString.toLowerCase());
    var words = new Set(), sigs = new Map(), prefixes = new Set();
    function fits(w) {
      var c = new Array(26).fill(0);
      for (var i = 0; i < w.length; i++) {
        var k = w.charCodeAt(i) - 97;
        if (++c[k] > pool[k]) return false;
      }
      return true;
    }
    function add(list, isCommon) {
      for (var i = 0; i < list.length; i++) {
        var w = list[i];
        if (w.length > letterString.length || !fits(w)) continue;
        words.add(w);
        var s = sortLetters(w), e = sigs.get(s);
        if (!e) sigs.set(s, { word: w, common: isCommon });
        else if (isCommon && !e.common) { e.word = w; e.common = true; }
      }
    }
    add(dict.common, true);
    add(dict.rare, false);
    sigs.forEach(function (_, s) { for (var k = 1; k <= s.length; k++) prefixes.add(s.slice(0, k)); });
    var commonPrefixes = new Set();
    sigs.forEach(function (e, s) { if (e.common) for (var k = 1; k <= s.length; k++) commonPrefixes.add(s.slice(0, k)); });
    return { words: words, sigs: sigs, prefixes: prefixes, commonPrefixes: commonPrefixes };
  };

  /* ---------- solver ---------- */
  Core.Solver = function (tiles, lex, opts) {
    opts = opts || {};
    var g = Core.geometry(tiles), n = tiles.length, minLen = opts.minLen || Core.MIN_LEN;
    var letters = tiles.map(function (t) { return t.l.toLowerCase(); });
    var pow = []; for (var i = 0; i < n; i++) pow.push(Math.pow(2, i));
    var deadAll = new Set(), deadCommon = new Set();

    function keyOf(alive) { var k = 0; for (var i = 0; i < n; i++) if (alive[i]) k += pow[i]; return k; }

    /* All moves: subsets (size >= minLen) of free tiles whose letters form a word. */
    var moves = function (alive, commonOnly) {
      var free = Core.freeList(g, alive).sort(function (a, b) {
        return letters[a] < letters[b] ? -1 : letters[a] > letters[b] ? 1 : a - b;
      });
      var out = [], chosen = [], pre = commonOnly ? lex.commonPrefixes : lex.prefixes;
      (function rec(pos, sig) {
        if (sig.length >= minLen) {
          var e = lex.sigs.get(sig);
          if (e && (!commonOnly || e.common)) out.push({ tiles: chosen.slice(), sig: sig, word: e.word, common: e.common });
        }
        for (var p = pos; p < free.length; p++) {
          var s2 = sig + letters[free[p]];
          if (!pre.has(s2)) continue;
          chosen.push(free[p]); rec(p + 1, s2); chosen.pop();
        }
      })(0, '');
      return out;
    };


    function search(alive, count, key, commonOnly, budget, dead) {
      if (count === 0) return [];
      if (dead.has(key)) return null;
      if (++budget.used > budget.max) throw budget;
      var ms = moves(alive, commonOnly);
      ms.sort(function (a, b) { return (b.common - a.common) || (b.tiles.length - a.tiles.length); });
      for (var m = 0; m < ms.length; m++) {
        var t = ms[m].tiles, k2 = key, j;
        if (count - t.length > 0 && count - t.length < minLen) continue;
        for (j = 0; j < t.length; j++) { alive[t[j]] = 0; k2 -= pow[t[j]]; }
        var r = search(alive, count - t.length, k2, commonOnly, budget, dead);
        for (j = 0; j < t.length; j++) alive[t[j]] = 1;
        if (r) { r.unshift(ms[m]); return r; }
      }
      dead.add(key);
      return null;
    }

    /* Returns {status: 'clear'|'stuck'|'unknown', path} */
    function solve(aliveIn, maxNodes) {
      var alive = Uint8Array.from(aliveIn), count = 0;
      for (var i = 0; i < n; i++) count += alive[i] ? 1 : 0;
      var key = keyOf(alive), budget = { used: 0, max: maxNodes || 400000 };
      try {
        var r = search(alive, count, key, true, budget, deadCommon);
        if (r) return { status: 'clear', path: r, nodes: budget.used };
      } catch (e) { if (e !== budget) throw e; }
      budget.used = 0;
      try {
        var r2 = search(alive, count, key, false, budget, deadAll);
        return r2 ? { status: 'clear', path: r2, nodes: budget.used } : { status: 'stuck', nodes: budget.used };
      } catch (e2) { if (e2 !== budget) throw e2; return { status: 'unknown', nodes: budget.used }; }
    }

    return { g: g, moves: function (a, c) { return moves(a, c); }, solve: solve, keyOf: keyOf, letters: letters };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Core;
  else root.StrataCore = Core;
})(this);
