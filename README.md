# Strata

Word puzzles in layers. Letter tiles are stacked like mahjong tiles: spell words from the tiles you can reach, and every word you play uncovers more. Clear the board to solve.

Four new puzzles arrive every day, one at each level: Easy, Medium, Hard and Expert. Earlier days stay playable.

Play at **https://strata.jeremyfelt.com**. On an iPhone, open it in Safari and choose Share → Add to Home Screen. After the first visit it also works offline.

## How to play

- Tap free tiles in order to spell a word of three or more letters, then tap Enter.
- A tile is free when nothing sits on top of it and its left or right side is open.
- Played tiles leave the board. Their neighbors open up and the tiles beneath turn face up.
- Each layer stands on its own color, so you can see how deep a stack goes.
- The title hints at a theme. The theme words use every tile exactly once, and finding them all puts you at par.
- Any real word is accepted, so there are many other routes to a clear, and many ways to strand yourself with leftover letters. Undo is unlimited, **Check** tells you whether the board can still be cleared (and how far to undo if not), and **Reveal** fills in a word that keeps a clear possible.

Progress, times and best results are saved in the browser on each device. The day turns over at local midnight.

## The schedule

Every puzzle in `src/puzzles.json` has a `date` and a `level`, and each date has exactly one puzzle per level. [SCHEDULE.md](SCHEDULE.md) lists the lineup by day (titles only, no answers); `tools/build.py` regenerates it.

To preview a day before it goes live, add it to the address: `https://strata.jeremyfelt.com/#2026-10-25`.

Boards are edited, not randomly generated. Each one starts from a hand-picked theme, its theme words and a hand-drawn layout. A construction tool places the words on the layout so that playing them in order clears the board, tries many placements, and keeps the one closest to a difficulty target for its level. Difficulty is measured with simulated players: one plays any common word while keeping a sensible share of vowels, the other also looks for theme words. The targets, as the share of games the theme-blind player clears:

| Level | Target | Typical board |
|-------|-------:|---------------|
| Easy | about 45% | 15–21 tiles, 3–4 theme words |
| Medium | about 30% | 23–29 tiles, 5 theme words |
| Hard | about 16% | 24–30 tiles, 5–6 theme words, awkward letters |
| Expert | about 5% | 27–34 tiles, 5–6 theme words, J, Q, X, Z and friends |

Every published board is checked by a solver: the theme path is legal, the starting board can be cleared, and when a board gets stranded, Check's undo advice always leads back to one that can be cleared.

## Adding a day

1. Add four specs to `tools/specs.js`, one per level, with the next ids and the new date: title (the clue), layout, target, theme words and a one-line note. The theme words' letters must add up to the layout's tile count. `node tools/viz.js` lists every layout with its tile count; new shapes go in `tools/layouts.js`.
2. `node tools/make.js <id> <id> <id> <id>` places the words, measures difficulty, prints each board and writes `out/puzzle-<id>.json`. If a board lands far from its target, try another layout or swap a word and run it again.
3. `node tools/add_puzzle.js <id> <id> <id> <id>` adds them to `src/puzzles.json`.
4. `python3 tools/build_dict.py` so Reveal can suggest the new theme words, then `python3 tools/build.py`.
5. Run the tests and commit. GitHub Pages publishes the new `index.html`.

In `src/puzzles.json`, `tiles` are `[x, y, z, letter]` in half-tile units (a tile covers 2×2 units, so an odd offset sits across two tiles below it; `z` is the layer, 0 is the table). `words` are the theme words in a playable order and `solution` lists the tile indexes each one uses.

## Repository

| Path | What it is |
|------|------------|
| `index.html` | The game, built. GitHub Pages serves it. |
| `SCHEDULE.md` | The lineup by day, generated. |
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

This writes `index.html` (standalone, for the site), `dist/strata-artifact.html` (the same game as a claude.ai artifact body) and `SCHEDULE.md`.

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
node tools/test_logic.js           # schedule, rules and solver checks for every puzzle
python3 tools/test_ui.py           # plays every day of index.html in a headless phone-sized browser
python3 tools/test_ui.py --shots   # same, plus screenshots in out/shots/
```

`test_ui.py` needs Playwright's Chromium (`python3 -m playwright install chromium`).

## Credits

Typeface: Archivo by Omnibus-Type (SIL Open Font License), served by Google Fonts. Word list sources are listed in [NOTICE.md](NOTICE.md).
