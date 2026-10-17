// Build a puzzle from its spec: place the theme words on the layout many ways, measure each
// placement with simulated players, and keep the one nearest the spec's target difficulty.
//   node tools/make.js <id> [<id> ...]   -> out/puzzle-<id>.json for each
//   ATTEMPTS=60 by default (set the environment variable to change it)
// Run from the repo root.
process.env.NOMAIN = '1';
const fs = require('fs');
const Core = require('../src/core.js');
const C = require('./construct.js');
const SPECS = require('./specs.js');

const attempts = +(process.env.ATTEMPTS || 60);
const ids = process.argv.slice(2).map(Number);
if (!ids.length) { console.error('Usage: node tools/make.js <id> [<id> ...]'); process.exit(1); }
for (const id of ids) build(id);

function build(id) {
const spec = SPECS.find(s => s.id === id);
if (!spec) { console.error(`No spec with id ${id} in tools/specs.js`); process.exit(1); }
const t0 = Date.now();
const res = C.buildPuzzle(spec, { attempts, N: 200, seed: spec.seed || 1000 + id });

// re-verify every candidate's intended path against the free-tile rule
function verify(tiles, solution) {
  const g = Core.geometry(tiles), alive = new Uint8Array(tiles.length).fill(1);
  for (const step of solution) {
    for (const i of step.tiles) if (!Core.isFree(g, alive, i)) return false;
    step.tiles.forEach(i => { alive[i] = 0; });
  }
  return alive.every(a => a === 0);
}
const ok = res.cands.filter(c => verify(c.tiles, c.solution) && c.ev.themed >= c.ev.careful);
if (!ok.length) { console.error(`#${id}: no valid placement found. Try more attempts or a different layout.`); process.exitCode = 1; return; }
const score = c => Math.abs(c.ev.careful - spec.target) - 0.12 * c.ev.themed;
ok.sort((a, b) => score(a) - score(b));
const best = ok[0];

// deeper stats for the chosen one
const deep = C.evaluate(best.tiles, res.lex, spec.words.length, 600, 99, true, res.words);
const out = {
  id: spec.id, date: spec.date, title: spec.title, level: spec.level, note: spec.note, layout: spec.layout,
  words: best.solution.map(s => res.words[s.w]),
  tiles: best.tiles.map(t => [t.x, t.y, t.z, t.l]),
  solution: best.solution.map(s => s.tiles.slice().sort((a, b) => a - b)),
  stats: deep,
};
fs.mkdirSync('out', { recursive: true });
fs.writeFileSync(`out/puzzle-${id}.json`, JSON.stringify(out));
const dist = ok.map(c => c.ev.careful).sort((a, b) => a - b);
console.log(`#${id} ${spec.title}: ${ok.length}/${res.cands.length} valid placements, careful clear rate ${dist[0]}-${dist[dist.length - 1]}`);
console.log(`chosen: ${JSON.stringify(deep)}`);
console.log(`theme path: ${out.words.join(' ')}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
console.log(C.view(best.tiles, best.tiles.map(t => t.l)).text);
console.log(`\nWrote out/puzzle-${id}.json. Add it with: node tools/add_puzzle.js ${id}\n`);
}
