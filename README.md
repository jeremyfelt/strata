# Strata

Word puzzles in layers. Letter tiles are stacked like mahjong tiles: spell words from the tiles you can reach, and every word you play uncovers more. Clear the board to solve.

Play at **https://strata.jeremyfelt.com**. On an iPhone, open it in Safari and choose Share → Add to Home Screen. After the first visit it also works offline.

## How to play

- Tap free tiles in order to spell a word of three or more letters, then tap Enter.
- A tile is free when nothing sits on top of it and its left or right side is open.
- Played tiles leave the board. Their neighbors open up and the tiles beneath turn face up.
- Each layer stands on its own color, so you can see how deep a stack goes.
- The title hints at a theme. The theme words use every tile exactly once, and finding them all puts you at par.
- Any real word is accepted, so there are many other routes to a clear, and many ways to strand yourself with leftover letters. Undo is unlimited, **Check** tells you whether the board can still be cleared (and how far to undo if not), and **Reveal** fills in a word that keeps a clear possible.

Progress, times and best results are saved in the browser on each device.

## The puzzles

| # | Title | Level | Tiles | Par |
|---|-------|-------|------:|----:|
| 1 | Harvest Moon | Easy | 15 | 3 |
| 2 | Snow Day | Easy | 20 | 4 |
| 3 | Top Drawer | Easy | 21 | 4 |
| 4 | Tuning Up | Medium | 23 | 5 |
| 5 | Fresh Baked | Medium | 29 | 5 |
| 6 | Deal Me In | Medium | 28 | 5 |
| 7 | In Bloom | Hard | 26 | 5 |
| 8 | Tool Time | Hard | 29 | 5 |
| 9 | Stargazing | Hard | 28 | 5 |
| 10 | On Safari | Expert | 34 | 6 |
| 11 | Your Move | Expert | 29 | 6 |
| 12 | Forecast | Expert | 34 | 6 |

Boards are edited, not randomly generated. Each one starts from a hand-picked theme and set of theme words and a hand-drawn layout. A construction tool places the words on the layout so that playing them in order clears the board, tries many placements, and keeps the one closest to a difficulty target. Difficulty is measured with simulated players: one plays any common word while keeping a sensible share of vowels, the other also looks for theme words. The theme-blind player clears No. 1 about half the time and No. 12 about 2% of the time.

Every published board is checked by a solver: the theme path is legal, the starting board can be cleared, and when a board gets stranded, Check's undo advice always leads back to one that can be cleared.

## Repository

| Path | What it is |
|------|------------|
| `index.html` | The game, built. GitHub Pages serves it. |
| `manifest.webmanifest`, `sw.js`, `icons/` | Home-screen install and offline play. |
| `src/app.html` | Markup, styles and app script, with placeholders the build fills in. |
| `src/core.js` | Board geometry, the free-tile rule, dictionary decoding and the solver. The page and the tools share it. |
| `src/puzzles.json` | The published puzzles, one per line. This is the source of truth. |
| `src/dict.json` | The compressed dictionary. |
| `tools/` | Dictionary builder, puzzle construction, page build and tests. |
| `licenses/`, `NOTICE.md` | Word list and typeface credits. |

## Building

```sh
python3 tools/build.py
```

This writes `index.html` (standalone, for the site) and `dist/strata-artifact.html` (the same game as a claude.ai artifact body).

## Adding a puzzle

1. Add a spec to `tools/specs.js` with the next id: title (the clue), level, layout, target clear rate, theme words and a one-line note. The theme words' letters must add up to the layout's tile count. `node tools/viz.js` lists every layout with its tile count; new shapes go in `tools/layouts.js`.
2. `node tools/make.js <id>` places the words, measures difficulty, prints the board and writes `out/puzzle-<id>.json`.
3. `node tools/add_puzzle.js <id>` adds it to `src/puzzles.json`.
4. `python3 tools/build.py`, then run the tests.

In `src/puzzles.json`, `tiles` are `[x, y, z, letter]` in half-tile units (a tile covers 2×2 units, so an odd offset sits across two tiles below it; `z` is the layer, 0 is the table). `words` are the theme words in a playable order and `solution` lists the tile indexes each one uses.

## Dictionary

Accepted words come from ENABLE plus SCOWL (size 70, American), 3 to 12 letters, about 160,000 words, with slurs and strongly vulgar words removed. Roughly 30,000 common words, plus every theme word, can be offered by Reveal. Everything else is accepted when typed but never suggested.

To rebuild it:

```sh
tools/fetch_sources.sh        # word lists, typeface and Python packages
python3 tools/build_dict.py   # writes src/dict.json
python3 tools/build.py
```

## Tests

```sh
node tools/test_logic.js        # rules and solver checks for every puzzle
python3 tools/test_ui.py        # plays index.html in a headless phone-sized browser
python3 tools/test_ui.py --shots   # same, plus screenshots in out/shots/
```

`test_ui.py` needs Playwright's Chromium (`python3 -m playwright install chromium`).

## Credits

Typeface: Archivo by Omnibus-Type (SIL Open Font License), served by Google Fonts. Word list sources are listed in [NOTICE.md](NOTICE.md).
