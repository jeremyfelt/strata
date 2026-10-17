// Try a layout and word set across many placements and print the spread of clear rates.
//   NOMAIN=1 node tools/batch.js <layout> <word,word,...> [attempts]
const C = require('./construct.js');
const [layout, words, attempts] = process.argv.slice(2);
const t0 = Date.now();
const res = C.buildPuzzle({ title: 't', layout, words: words.split(',') }, { attempts: +(attempts || 20), N: 200 });
const cs = res.cands.map(c => c.ev.careful).sort((a, b) => a - b);
const rs = res.cands.map(c => c.ev.themed).sort((a, b) => a - b);
const q = (a, f) => a[Math.floor(f * (a.length - 1))];
console.log(`${layout} [${words}] n=${res.cands.length} ${Date.now() - t0}ms  careful min/med/max ${q(cs,0)}/${q(cs,.5)}/${q(cs,1)}  themed ${q(rs,0)}/${q(rs,.5)}/${q(rs,1)}`);
