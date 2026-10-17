// Find a short path of common words that strands a puzzle (used by test_ui.py).
//   node tools/deadend.js <id>   -> {"moves":[{"word","order"}...],"left":n}
const fs = require('fs');
const Core = require('../src/core.js');
const P = JSON.parse(fs.readFileSync('src/puzzles.json', 'utf8'));
const D = Core.decodeDict(JSON.parse(fs.readFileSync('src/dict.json', 'utf8')));
const p = P.find(q => q.id === +process.argv[2]);
const tiles = p.tiles.map(([x, y, z, l]) => ({ x, y, z, l }));
const solver = Core.Solver(tiles, Core.puzzleLexicon(D, tiles.map(t => t.l).join('')));
let seed = 3; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
for (let run = 0; run < 2000; run++) {
  const a = new Uint8Array(tiles.length).fill(1), moves = [];
  let left = tiles.length;
  while (left > 0) {
    const ms = solver.moves(a, true).filter(m => m.common);
    if (!ms.length) break;
    const m = ms[Math.floor(r() * ms.length)];
    const pool = m.tiles.slice(), order = [];
    for (const ch of m.word) { const j = pool.findIndex(i => tiles[i].l === ch); order.push(pool[j]); pool.splice(j, 1); }
    m.tiles.forEach(i => a[i] = 0); left -= m.tiles.length; moves.push({ word: m.word, order });
  }
  if (left >= 3 && moves.length <= 4 && solver.moves(a, false).length === 0) { console.log(JSON.stringify({ moves, left })); process.exit(0); }
}
console.log('null');
