// Add (or replace) built puzzles in src/puzzles.json.
//   node tools/add_puzzle.js <id> [<id> ...]     reads out/puzzle-<id>.json
// Run from the repo root, then: python3 tools/build_dict.py && python3 tools/build.py
const fs = require('fs');
const ids = process.argv.slice(2).map(Number);
if (!ids.length) { console.error('Usage: node tools/add_puzzle.js <id> [<id> ...]'); process.exit(1); }
const list = JSON.parse(fs.readFileSync('src/puzzles.json', 'utf8'));
for (const id of ids) {
  const src = `out/puzzle-${id}.json`;
  if (!fs.existsSync(src)) { console.error(`${src} not found. Run: node tools/make.js ${id}`); process.exit(1); }
  const p = JSON.parse(fs.readFileSync(src, 'utf8'));
  const entry = { id: p.id, date: p.date, title: p.title, level: p.level, note: p.note, words: p.words, tiles: p.tiles, solution: p.solution };
  const at = list.findIndex(q => q.id === entry.id);
  if (at >= 0) list[at] = entry; else list.push(entry);
  console.log(`${at >= 0 ? 'Replaced' : 'Added'} #${entry.id} ${entry.title} (${entry.date}, ${entry.level})`);
}
list.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) || a.id - b.id);
fs.writeFileSync('src/puzzles.json', '[\n' + list.map(q => '  ' + JSON.stringify(q)).join(',\n') + '\n]\n');
console.log(`${list.length} puzzles in src/puzzles.json.`);
