"""Plays index.html in a headless phone-sized browser (run from the repo root).
Solves every puzzle by tapping its theme words, then exercises the stuck path: a dead end,
Check's undo advice, Reveal, pause, reload persistence and restart. Fails on console errors.
  python3 tools/test_ui.py [--shots]   (--shots saves screenshots to out/shots/)"""
import json, os, re, subprocess, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath('.')
SHOTS = '--shots' in sys.argv
os.makedirs('out/shots', exist_ok=True)
P = json.load(open('src/puzzles.json'))
FONTS = f'''@font-face {{ font-family: "Archivo"; src: url("file://{ROOT}/dl/fonts/Archivo.ttf"); font-weight: 100 900; font-stretch: 62% 125%; }}
@font-face {{ font-family: "Archivo"; src: url("file://{ROOT}/dl/fonts/Archivo-Italic.ttf"); font-weight: 100 900; font-stretch: 62% 125%; font-style: italic; }}'''
errors, problems = [], []

def check(cond, msg):
    print(('ok   ' if cond else 'FAIL ') + msg)
    if not cond: problems.append(msg)

def shot(pg, name):
    if SHOTS: pg.screenshot(path=f'out/shots/{name}.png')

def tap_word(pg, p, k):
    pool = list(p['solution'][k])
    for ch in p['words'][k]:
        i = next(i for i in pool if p['tiles'][i][3] == ch); pool.remove(i)
        pg.click(f'.tile[data-i="{i}"]')

def open_page(pw, scheme='light', size=(390, 780)):
    b = pw.chromium.launch()
    ctx = b.new_context(viewport={'width': size[0], 'height': size[1]}, device_scale_factor=2, has_touch=True, is_mobile=True, color_scheme=scheme)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append(f'pageerror: {e}'))
    pg.on('console', lambda m: errors.append(f'console.{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.route(re.compile(r'https://fonts\.(googleapis|gstatic)\.com/.*'), lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg.goto('file://' + ROOT + '/index.html')
    if os.path.exists('dl/fonts/Archivo.ttf'): pg.add_style_tag(content=FONTS)
    pg.wait_for_timeout(600)
    return b, pg

with sync_playwright() as pw:
    # 1. every puzzle, start to finish, through the UI
    b, pg = open_page(pw)
    shot(pg, 'home')
    pg.click(f'.pz[data-id="{P[0]["id"]}"]'); pg.wait_for_timeout(300)
    shot(pg, 'help')
    pg.click('#sheet [data-act="close"]'); pg.wait_for_timeout(200)
    for n, p in enumerate(P):
        for k in range(len(p['words'])):
            tap_word(pg, p, k)
            if n == 0 and k == 0: shot(pg, 'selected')
            pg.click('#enter'); pg.wait_for_timeout(560)
        pg.wait_for_timeout(450)
        title = pg.inner_text('#sheet-title'); verdict = pg.inner_text('#sheet .verdict')
        check(title.startswith('Cleared') and 'right at par' in verdict, f"#{p['id']} {p['title']}: {title} / {verdict}")
        if n == 0: shot(pg, 'result')
        nxt = pg.query_selector('#sheet [data-act="next"]')
        if nxt: nxt.click(); pg.wait_for_timeout(450)
        else: pg.click('#sheet [data-act="home"]'); pg.wait_for_timeout(300)
    check(pg.inner_text('#progress').endswith(f'{len(P)} of {len(P)} cleared'), 'home shows every puzzle cleared')
    shot(pg, 'home-cleared')
    pg.click(f'.pz[data-id="{P[2]["id"]}"]'); pg.wait_for_timeout(400)
    check(pg.inner_text('#sheet-title').startswith('You cleared'), 'reopening a solved puzzle shows its result')
    pg.click('#sheet [data-act="again"]'); pg.wait_for_timeout(400)
    check(pg.evaluate('Array.from(window.__strata.G.alive).every(a => a === 1)'), 'play again starts a full board')
    b.close()

    # 2. getting stuck and recovering, on puzzle 2
    dead = json.loads(subprocess.run(['node', 'tools/deadend.js', str(P[1]['id'])], capture_output=True, text=True).stdout)
    b, pg = open_page(pw, size=(375, 667))
    pg.click(f'.pz[data-id="{P[1]["id"]}"]'); pg.wait_for_timeout(300)
    pg.click('#sheet [data-act="close"]'); pg.wait_for_timeout(200)
    trio = pg.evaluate('''() => { const G = window.__strata.G; const f = []; for (let i = 0; i < G.n; i++) if (G.state[i] === 'free') f.push(i);
        for (const a of f) for (const b of f) for (const c of f) { if (a===b||b===c||a===c) continue;
          const w = G.tiles[a].l+G.tiles[b].l+G.tiles[c].l; if (!G.lex.words.has(w)) return [a,b,c]; } return null; }''')
    for i in trio: pg.click(f'.tile[data-i="{i}"]')
    pg.click('#enter'); pg.wait_for_timeout(250)
    check(pg.inner_text('#toast') == 'Not in the dictionary.', 'a non-word is rejected')
    shot(pg, 'rejected')
    for _ in trio: pg.click('#del')
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
    shot(pg, 'check')
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
    pg.click(f'.pz[data-id="{P[1]["id"]}"]'); pg.wait_for_timeout(450)
    check(pg.evaluate('window.__strata.G.moves.map(m => m.w).join(",")') == before, 'progress survives a reload')
    pg.click('#menu-btn'); pg.wait_for_timeout(250)
    pg.click('#sheet [data-act="restart-ask"]'); pg.wait_for_timeout(250)
    pg.click('#sheet [data-act="restart"]'); pg.wait_for_timeout(450)
    check(pg.evaluate('window.__strata.G.moves.length') == 0, 'restart puts every tile back')
    pg.click('#back'); pg.wait_for_timeout(250)
    pg.click(f'.pz[data-id="{max(P, key=lambda q: len(q["tiles"]))["id"]}"]'); pg.wait_for_timeout(450)
    check(not pg.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth'), 'largest board fits a 375px screen')
    shot(pg, 'small-phone')
    b.close()

    if SHOTS:
        b, pg = open_page(pw, scheme='dark')
        pg.click(f'.pz[data-id="{P[6]["id"]}"]'); pg.wait_for_timeout(300)
        pg.click('#sheet [data-act="close"]'); pg.wait_for_timeout(250)
        shot(pg, 'dark-board')
        b.close()

check(not errors, 'no console errors' if not errors else 'console errors:\n  ' + '\n  '.join(errors))
print('All UI checks pass.' if not problems else f'{len(problems)} UI check(s) failed.')
sys.exit(1 if problems else 0)
