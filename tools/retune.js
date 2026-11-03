// Find a better board shape for a puzzle that lands off its difficulty target.
// Tries every layout with the same tile count as the spec's theme words, a few placements
// each, and lists them by how close their nearest placement comes to the spec's target.
//   node tools/retune.js <id> [attempts per layout, default 16]
// Then set the spec's `layout` in tools/specs.js and run make.js for it again.
process.env.NOMAIN = '1';
const C = require('./construct.js');
const LAYOUTS = require('./layouts.js');
const SPECS = require('./specs.js');
const PUZZLES = require('../src/puzzles.json');

const id = +process.argv[2], attempts = +(process.argv[3] || 16);
const spec = SPECS.find(s => s.id === id);
if (!spec) { console.error(`No spec with id ${id} in tools/specs.js`); process.exit(1); }
const n = spec.words.join('').length;
const uses = {};
for (const s of SPECS) uses[s.layout] = (uses[s.layout] || 0) + 1;
const published = new Set(PUZZLES.map(p => p.id));

const rows = [];
for (const name of Object.keys(LAYOUTS)) {
  if (C.expand(LAYOUTS[name]).length !== n) continue;
  const t0 = Date.now();
  const res = C.buildPuzzle({ ...spec, layout: name }, { attempts, N: 160, seed: 7000 + id });
  const ok = res.cands.filter(c => c.ev.themed >= c.ev.careful);
  if (!ok.length) { rows.push({ name, best: null }); continue; }
  const rates = ok.map(c => c.ev.careful).sort((a, b) => a - b);
  const best = ok.reduce((a, c) => Math.abs(c.ev.careful - spec.target) < Math.abs(a.ev.careful - spec.target) ? c : a);
  rows.push({ name, best: best.ev.careful, lo: rates[0], hi: rates[rates.length - 1], ms: Date.now() - t0 });
}
rows.sort((a, b) => (a.best == null) - (b.best == null) || Math.abs(a.best - spec.target) - Math.abs(b.best - spec.target));
console.log(`#${id} ${spec.title} (${spec.level}, ${n} tiles, target ${spec.target}, now on ${spec.layout}${published.has(id) ? ', already published' : ''})`);
for (const r of rows) {
  const mark = r.name === spec.layout ? ' <- current' : '';
  console.log(r.best == null
    ? `  ${r.name.padEnd(12)} no valid placement`
    : `  ${r.name.padEnd(12)} nearest ${r.best.toFixed(3)}  range ${r.lo.toFixed(3)}-${r.hi.toFixed(3)}  used by ${uses[r.name] || 0} spec(s)${mark}`);
}
