// Rules check for every puzzle (run from the repo root):
//  - the theme words, played in order on their tiles, are legal moves and clear the board
//  - the solver agrees the starting board can be cleared
//  - random play that strands itself always gets correct undo advice from Check
//  - index.html carries the same puzzles as src/puzzles.json
//  - the schedule has one puzzle per level on every day, with no gaps
const fs = require('fs');
const Core = require('../src/core.js');
const P = JSON.parse(fs.readFileSync('src/puzzles.json', 'utf8'));
const D = Core.decodeDict(JSON.parse(fs.readFileSync('src/dict.json', 'utf8')));
let fails = 0;

const html = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
const m = html.match(/var PUZZLES = (\[[\s\S]*?\n\]);/);
if (!m || JSON.stringify(JSON.parse(m[1])) !== JSON.stringify(P)) {
  fails++; console.log('FAIL index.html is out of date. Run: python3 tools/build.py');
}

// schedule: every date has exactly one puzzle at each level
const LEVELS = ['Easy', 'Medium', 'Hard', 'Expert'];
const byDate = {};
for (const p of P) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date || '')) { fails++; console.log(`FAIL #${p.id} ${p.title} has no valid date`); continue; }
  if (!LEVELS.includes(p.level)) { fails++; console.log(`FAIL #${p.id} ${p.title} has unknown level ${p.level}`); }
  (byDate[p.date] = byDate[p.date] || []).push(p.level);
}
const dates = Object.keys(byDate).sort();
for (const d of dates) {
  const got = byDate[d].slice().sort((a, b) => LEVELS.indexOf(a) - LEVELS.indexOf(b)).join(',');
  if (got !== LEVELS.join(',')) { fails++; console.log(`FAIL ${d} has ${got}, expected one of each level`); }
}
const day = 86400000, t0 = Date.parse(dates[0]), t1 = Date.parse(dates[dates.length - 1]);
const span = Math.round((t1 - t0) / day) + 1;
if (span !== dates.length) { fails++; console.log(`FAIL schedule has gaps: ${dates.length} dates across ${span} days`); }
console.log(`Schedule: ${dates.length} days, ${dates[0]} through ${dates[dates.length - 1]}, ${P.length} puzzles`);

const ids = new Set();
for (const p of P) {
  if (ids.has(p.id)) { fails++; console.log(`FAIL duplicate id ${p.id}`); }
  ids.add(p.id);
  const tiles = p.tiles.map(([x, y, z, l]) => ({ x, y, z, l }));
  const lex = Core.puzzleLexicon(D, tiles.map(t => t.l).join(''));
  const g = Core.geometry(tiles);
  const alive = new Uint8Array(tiles.length).fill(1);
  let ok = p.words.length === p.solution.length;
  p.solution.forEach((grp, k) => {
    const letters = grp.map(i => tiles[i].l).sort().join('');
    if (letters !== p.words[k].split('').sort().join('')) ok = false;
    if (!lex.words.has(p.words[k])) ok = false;
    for (const i of grp) if (!Core.isFree(g, alive, i)) ok = false;
    grp.forEach(i => alive[i] = 0);
  });
  if (!alive.every(a => !a)) ok = false;
  const solver = Core.Solver(tiles, lex);
  const start = solver.solve(new Uint8Array(tiles.length).fill(1), 300000);
  let seed = p.id * 97; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let deadEnds = 0, recovered = 0, worst = 0;
  for (let run = 0; run < 40; run++) {
    const a = new Uint8Array(tiles.length).fill(1), hist = [];
    let left = tiles.length;
    while (left > 0) {
      const ms = solver.moves(a, false);
      if (!ms.length) break;
      const mv = ms[Math.floor(r() * ms.length)];
      mv.tiles.forEach(i => a[i] = 0); left -= mv.tiles.length; hist.push(mv.tiles);
    }
    if (left === 0) continue;
    deadEnds++;
    const t0 = Date.now(), b = Uint8Array.from(a);
    let k = 0, st;
    do { hist[hist.length - 1 - k].forEach(i => b[i] = 1); k++; st = solver.solve(b, 300000).status; } while (st !== 'clear' && k < hist.length);
    worst = Math.max(worst, Date.now() - t0);
    if (st === 'clear') recovered++;
  }
  const pass = ok && start.status === 'clear' && recovered === deadEnds;
  if (!pass) fails++;
  console.log(`${pass ? 'PASS' : 'FAIL'} ${p.date} ${p.level.padEnd(6)} #${String(p.id).padEnd(2)} ${p.title.padEnd(15)} theme path ${ok ? 'ok' : 'BROKEN'}, start ${start.status}, ${recovered}/${deadEnds} dead ends recovered, slowest check ${worst}ms`);
}
console.log(fails ? `${fails} problem(s)` : 'All puzzles pass.');
process.exit(fails ? 1 : 0);
