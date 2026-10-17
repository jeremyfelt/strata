// Add (or replace) a built puzzle in src/puzzles.json.
//   node tools/add_puzzle.js <id>     reads out/puzzle-<id>.json
// Run from the repo root, then rebuild with: python3 tools/build.py
const fs = require('fs');
const id = +process.argv[2];
const src = `out/puzzle-${id}.json`;
if (!fs.existsSync(src)) { console.error(`${src} not found. Run: node tools/make.js ${id}`); process.exit(1); }
const p = JSON.parse(fs.readFileSync(src, 'utf8'));
const entry = { id: p.id, title: p.title, level: p.level, note: p.note, words: p.words, tiles: p.tiles, solution: p.solution };
const list = JSON.parse(fs.readFileSync('src/puzzles.json', 'utf8'));
const at = list.findIndex(q => q.id === entry.id);
if (at >= 0) list[at] = entry; else list.push(entry);
list.sort((a, b) => a.id - b.id);
fs.writeFileSync('src/puzzles.json', '[\n' + list.map(q => '  ' + JSON.stringify(q)).join(',\n') + '\n]\n');
console.log(`${at >= 0 ? 'Replaced' : 'Added'} #${entry.id} ${entry.title}. ${list.length} puzzles in src/puzzles.json.`);
