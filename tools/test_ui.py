"""Plays index.html in a headless phone-sized browser (run from the repo root).
Goes day by day through the schedule, solving all four puzzles of each day by tapping their
theme words and following Next, then checks the earlier-days list, the end of the schedule,
and the stuck path: a rejected word, a dead end, Check's undo advice, Reveal, pause, reload
persistence and restart. Fails on any console error.
  python3 tools/test_ui.py [--shots]   (--shots saves screenshots to out/shots/)"""
import json, os, re, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath('.')
URL = 'file://' + ROOT + '/index.html'
SHOTS = '--shots' in sys.argv
os.makedirs('out/shots', exist_ok=True)
P = json.load(open('src/puzzles.json'))
BY_ID = {p['id']: p for p in P}
DATES = sorted({p['date'] for p in P})
FONTS = f'''@font-face {{ font-family: "Archivo"; src: url("file://{ROOT}/dl/fonts/Archivo.ttf"); font-weight: 100 900; font-stretch: 62% 125%; }}
@font-face {{ font-family: "Archivo"; src: url("file://{ROOT}/dl/fonts/Archivo-Italic.ttf"); font-weight: 100 900; font-stretch: 62% 125%; font-style: italic; }}'''
errors, problems = [], []

def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg)
    if not cond: problems.append(msg)

def shot(pg, name):
    if SHOTS: pg.screenshot(path=f'out/shots/{name}.png')

def solve_open_puzzle(pg):
    """Solve whichever puzzle is open by tapping its theme words in order."""
    p = BY_ID[pg.evaluate('window.__strata.G.P.id')]
    for k, grp in enumerate(p['solution']):
        pool = list(grp)
        for ch in p['words'][k]:
            i = next(i for i in pool if p['tiles'][i][3] == ch); pool.remove(i)
            pg.click(f'.tile[data-i="{i}"]')
        pg.click('#enter'); pg.wait_for_timeout(540)
    pg.wait_for_timeout(450)
    return p

def open_page(pw, scheme='light', size=(390, 780), date=None):
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=2, has_touch=True, is_mobile=True, color_scheme=scheme)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg.goto(URL + ('#' + date if date else ''))
    if os.path.exists('dl/fonts/Archivo.ttf'): pg.add_style_tag(content=FONTS)
    pg.wait_for_timeout(600)
    return b, pg

def close_sheet_if_help(pg):
    if pg.is_visible('#sheet') and pg.inner_text('#sheet-title') == 'How to play':
        pg.click('#sheet [data-act="close"]'); pg.wait_for_timeout(200)

with sync_playwright() as pw:
    # 1. every day, every puzzle, through the UI
    b, pg = open_page(pw, date=DATES[0])
    check(pg.locator('#list .day .pz').count() == 4 and pg.locator('#list .past').count() == 0, f'{DATES[0]} shows four puzzles today and no earlier days')
    shot(pg, 'home')
    for d in DATES:
        pg.evaluate(f'location.hash = "{d}"'); pg.wait_for_timeout(250)
        pg.click('#list .day .pz:not(.solved)'); pg.wait_for_timeout(350)
        close_sheet_if_help(pg)
        solved = []
        for n in range(4):
            p = solve_open_puzzle(pg)
            title, verdict = pg.inner_text('#sheet-title'), pg.inner_text('#sheet .verdict')
            solved.append(p['level'])
            if d == DATES[0] and n == 0: shot(pg, 'result')
            nxt = pg.query_selector('#sheet [data-act="next"]')
            if n < 3:
                if not nxt: check(False, f'{d}: Next missing after {p["title"]}'); break
                nxt.click(); pg.wait_for_timeout(400)
            else:
                check(nxt is None and 'all four for today' in pg.inner_text('#sheet'), f'{d}: after four, the day is done')
        check(solved == ['Easy', 'Medium', 'Hard', 'Expert'], f'{d}: solved {", ".join(solved)} at par' if 'right at par' in verdict else f'{d}: {verdict}')
        pg.click('#sheet [data-act="home"]'); pg.wait_for_timeout(300)
        check('4 of 4 cleared' in pg.inner_text('#list .day .tally'), f'{d}: home shows 4 of 4 cleared')
    check(pg.locator('#list .past').count() == len(DATES) - 1, f'the last day lists {len(DATES) - 1} earlier days')
    pg.click('#list .past summary'); pg.wait_for_timeout(250)
    check(pg.locator('#list .past[open] .pz.solved').count() == 4, 'an earlier day opens to its four puzzles')
    shot(pg, 'home-earlier')
    after = (__import__('datetime').date.fromisoformat(DATES[-1]) + __import__('datetime').timedelta(days=1)).isoformat()
    pg.evaluate(f'location.hash = "{after}"'); pg.wait_for_timeout(250)
    check(pg.is_visible('#list .empty-day') and pg.locator('#list .past').first.get_attribute('open') is not None, f'{after}: no puzzles yet, latest day shown open')
    shot(pg, 'home-unscheduled')
    pg.evaluate(f'location.hash = "{DATES[0]}"'); pg.wait_for_timeout(250)
    pg.click('#list .day .pz'); pg.wait_for_timeout(400)
    check(pg.inner_text('#sheet-title').startswith('You cleared'), 'reopening a solved puzzle shows its result')
    pg.click('#sheet [data-act="again"]'); pg.wait_for_timeout(400)
    check(pg.evaluate('Array.from(window.__strata.G.alive).every(a => a === 1)'), 'play again starts a full board')
    b.close()

    # 2. getting stuck and recovering
    target = next(p for p in P if p['level'] == 'Easy' and p['date'] == DATES[1])
    dead = json.loads(subprocess.run(['node', 'tools/deadend.js', str(target['id'])], capture_output=True, text=True).stdout)
    b, pg = open_page(pw, size=(375, 667), date=DATES[1])
    pg.click(f'.pz[data-id="{target["id"]}"]'); pg.wait_for_timeout(300)
    close_sheet_if_help(pg)
    check(pg.inner_text('#g-sub') == 'Easy, today', 'the header names the level and day')
    trio = pg.evaluate('''() => { const G = window.__strata.G; const f = []; for (let i = 0; i < G.n; i++) if (G.state[i] === 'free') f.push(i);
        for (const a of f) for (const b of f) for (const c of f) { if (a===b||b===c||a===c) continue;
          const w = G.tiles[a].l+G.tiles[b].l+G.tiles[c].l; if (!G.lex.words.has(w)) return [a,b,c]; } return null; }''')
    for i in trio: pg.click(f'.tile[data-i="{i}"]')
    pg.click('#enter'); pg.wait_for_timeout(250)
    check(pg.inner_text('#toast') == 'Not in the dictionary.', 'a non-word is rejected')
    for _ in trio: pg.click('#del')
    if dead:
        for m in dead['moves']:
            for i in m['order']: pg.click(f'.tile[data-i="{i}"]')
            pg.click('#enter'); pg.wait_for_timeout(650)
        pg.wait_for_timeout(300)
        check(pg.evaluate('window.__strata.G.dead') is True, 'a stranded board is detected')
        shot(pg, 'dead-end')
        pg.click('#menu-btn'); pg.wait_for_timeout(300)
        pg.click('#sheet [data-act="check"]'); pg.wait_for_timeout(300)
        btn = pg.query_selector('#sheet [data-act^="undo-"]')
        check(btn is not None, 'Check explains how far to undo')
        btn.click(); pg.wait_for_timeout(500)
        check(pg.evaluate('window.__strata.G.dead') is False, 'undoing per the advice clears the dead end')
    pg.click('#menu-btn'); pg.wait_for_timeout(300)
    pg.click('#sheet [data-act="reveal"]'); pg.wait_for_timeout(300)
    word = pg.evaluate("window.__strata.G.sel.map(i => window.__strata.G.tiles[i].l).join('')")
    check(len(word) >= 3 and pg.evaluate('window.__strata.G.assisted'), f'Reveal fills in a word ({word})')
    pg.click('#enter'); pg.wait_for_timeout(600)
    pg.click('#timer'); pg.wait_for_timeout(150)
    check(pg.is_visible('#paused'), 'pausing hides the board')
    pg.click('#resume'); pg.wait_for_timeout(150)
    before = pg.evaluate('window.__strata.G.moves.map(m => m.w).join(",")')
    pg.reload(); pg.wait_for_timeout(700)
    pg.click(f'.pz[data-id="{target["id"]}"]'); pg.wait_for_timeout(450)
    check(pg.evaluate('window.__strata.G.moves.map(m => m.w).join(",")') == before, 'progress survives a reload')
    pg.click('#menu-btn'); pg.wait_for_timeout(250)
    pg.click('#sheet [data-act="restart-ask"]'); pg.wait_for_timeout(250)
    pg.click('#sheet [data-act="restart"]'); pg.wait_for_timeout(450)
    check(pg.evaluate('window.__strata.G.moves.length') == 0, 'restart puts every tile back')
    pg.click('#back'); pg.wait_for_timeout(250)
    big = max(P, key=lambda q: (len(q['tiles']), q['date']))
    pg.evaluate(f'location.hash = "{big["date"]}"'); pg.wait_for_timeout(250)
    pg.click(f'.pz[data-id="{big["id"]}"]'); pg.wait_for_timeout(450)
    check(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), 'largest board fits a 375px screen')
    shot(pg, 'small-phone')
    b.close()

    if SHOTS:
        for d in DATES[3:]:
            b, pg = open_page(pw, date=d)
            for p in [q for q in P if q['date'] == d]:
                pg.click(f'.pz[data-id="{p["id"]}"]'); pg.wait_for_timeout(350)
                close_sheet_if_help(pg)
                shot(pg, f'{d}-{p["level"].lower()}')
                pg.click('#back'); pg.wait_for_timeout(250)
            b.close()
        b, pg = open_page(pw, scheme='dark', date=DATES[0])
        shot(pg, 'dark-home')
        b.close()

check(not errors, 'no console errors' if not errors else 'console errors:\n  ' + '\n  '.join(errors))
print('All UI checks pass.' if not problems else f'{len(problems)} UI check(s) failed.')
sys.exit(1 if problems else 0)
