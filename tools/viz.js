// Print layout stats + ASCII top-down view (F free, L locked face-up, H hidden).
const Core = require('../src/core.js');
const LAYOUTS = require('./layouts.js');

function expand(spec) {
  const tiles = [];
  for (const [z, x, y, rows] of spec)
    rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '#') tiles.push({ x: x + 2 * c, y: y + 2 * r, z }); }));
  // sanity: no overlaps on same layer, every upper tile supported
  for (let i = 0; i < tiles.length; i++) for (let j = i + 1; j < tiles.length; j++) {
    const a = tiles[i], b = tiles[j];
    if (a.z === b.z && Math.abs(a.x - b.x) < 2 && Math.abs(a.y - b.y) < 2) throw new Error('overlap ' + JSON.stringify([a, b]));
  }
  for (const t of tiles) if (t.z > 0) {
    const sup = tiles.some(b => b.z === t.z - 1 && Math.abs(b.x - t.x) < 2 && Math.abs(b.y - t.y) < 2);
    if (!sup) throw new Error('unsupported ' + JSON.stringify(t));
  }
  return tiles;
}

function view(tiles, letters, alive) {
  const g = Core.geometry(tiles);
  alive = alive || tiles.map(() => 1);
  const W = Math.max(...tiles.map(t => t.x)) + 2, H = Math.max(...tiles.map(t => t.y)) + 2;
  const grid = Array.from({ length: H }, () => Array(W).fill('  '));
  const order = tiles.map((t, i) => i).filter(i => alive[i]).sort((a, b) => tiles[a].z - tiles[b].z);
  let F = 0, Lk = 0, Hd = 0;
  for (const i of order) {
    const t = tiles[i];
    const free = Core.isFree(g, alive, i), cov = Core.isCovered(g, alive, i);
    if (free) F++; else if (cov) Hd++; else Lk++;
    const ch = letters ? (cov ? '··' : (free ? letters[i].toUpperCase() : letters[i].toLowerCase()) + t.z) : (free ? 'F' : cov ? 'H' : 'L') + t.z;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) grid[t.y + dy][t.x + dx] = (dx === 0 && dy === 0) ? ch.padEnd(2) : '░░';
  }
  return { text: grid.map(r => r.join('')).join('\n'), F, L: Lk, H: Hd, n: tiles.length, W: W / 2, Hh: H / 2 };
}

module.exports = { expand, view };

if (require.main === module && !process.env.NOMAIN) {
  for (const [name, spec] of Object.entries(LAYOUTS)) {
    const tiles = expand(spec);
    const v = view(tiles);
    console.log(`\n== ${name}: n=${v.n} size=${v.W}x${v.Hh} free=${v.F} locked=${v.L} hidden=${v.H} layers=${Math.max(...tiles.map(t => t.z)) + 1}`);
    const zs = Math.max(...tiles.map(t => t.z));
    const W = Math.max(...tiles.map(t => t.x)) + 2, H = Math.max(...tiles.map(t => t.y)) + 2;
    const cols = [];
    for (let z = 0; z <= zs; z++) {
      const grid = Array.from({ length: H }, () => Array(W).fill('.'));
      tiles.filter(t => t.z === z).forEach(t => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) grid[t.y + dy][t.x + dx] = String(z); });
      cols.push(grid.map(r => r.join('')));
    }
    const top = v.text.split('\n');
    for (let r = 0; r < H; r++) console.log(cols.map(c => c[r]).join('   ') + '     ' + top[r]);
  }
}
