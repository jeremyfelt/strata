// Puzzle specs: the editorial side of each board. The title is the clue; the theme words
// clear the board exactly (their count is par). `layout` names a shape in layouts.js and
// `target` is the clear rate we aim for with the theme-blind simulated player.
//
// src/puzzles.json is the source of truth for published boards. Re-running make.js for one
// of these specs produces a fresh board, not the published one.
//
// To add a puzzle: append a spec with the next id, then
//   node tools/make.js <id>          -> out/puzzle-<id>.json (prints the board + stats)
//   node tools/add_puzzle.js <id>    -> adds it to src/puzzles.json
//   python3 tools/build.py           -> rebuilds index.html
module.exports = [
  { id: 1, title: 'Harvest Moon', level: 'Easy', layout: 'hearth15', target: 0.56, seed: 1001,
    words: ['cider', 'gourd', 'maple'],
    note: 'Three flavors of October.' },
  { id: 2, title: 'Snow Day', level: 'Easy', layout: 'dome20', target: 0.45, seed: 1002,
    words: ['sled', 'scarf', 'igloo', 'mitten'],
    note: 'School’s out. Bundle up.' },
  { id: 3, title: 'Top Drawer', level: 'Easy', layout: 'shelves21', target: 0.33, seed: 1004,
    words: ['whisk', 'ladle', 'tongs', 'grater'],
    note: 'Everything a cook reaches for without looking.' },
  { id: 4, title: 'Tuning Up', level: 'Medium', layout: 'roof23', target: 0.38, seed: 1003,
    words: ['viola', 'cello', 'oboe', 'flute', 'harp'],
    note: 'Five voices from the orchestra pit.' },
  { id: 5, title: 'Fresh Baked', level: 'Medium', layout: 'keep29', target: 0.29, seed: 1005,
    words: ['scone', 'bagel', 'eclair', 'muffin', 'strudel'],
    note: 'One from each shelf of the bakery case.' },
  { id: 6, title: 'Deal Me In', level: 'Medium', layout: 'towers28', target: 0.25, seed: 1006,
    words: ['poker', 'rummy', 'bridge', 'hearts', 'spades'],
    note: 'Five games, one deck.' },
  { id: 7, title: 'In Bloom', level: 'Hard', layout: 'flower26', target: 0.2, seed: 1007,
    words: ['tulip', 'peony', 'dahlia', 'aster', 'lilac'],
    note: 'A bouquet in five stems.' },
  { id: 8, title: 'Tool Time', level: 'Hard', layout: 'anvil29', target: 0.13, seed: 1009,
    words: ['wrench', 'pliers', 'hammer', 'chisel', 'clamp'],
    note: 'A full workbench, consonants and all.' },
  { id: 9, title: 'Stargazing', level: 'Hard', layout: 'stairs28', target: 0.16, seed: 1008,
    words: ['comet', 'orbit', 'nebula', 'quasar', 'meteor'],
    note: 'Look up. Keep looking.' },
  { id: 10, title: 'On Safari', level: 'Expert', layout: 'savanna34', target: 0.1, seed: 1010,
    words: ['zebra', 'hyena', 'jackal', 'impala', 'rhino', 'giraffe'],
    note: 'Six sightings across the plain.' },
  { id: 11, title: 'Your Move', level: 'Expert', layout: 'bridge29', target: 0.03, seed: 1011,
    words: ['rook', 'pawn', 'king', 'queen', 'bishop', 'knight'],
    note: 'Every piece on the board, pawn to king.' },
  { id: 12, title: 'Forecast', level: 'Expert', layout: 'cloud34', target: 0.05, seed: 1012,
    words: ['hail', 'sleet', 'frost', 'squall', 'thunder', 'drizzle'],
    note: 'Six kinds of weather, none of it good.' },
];
