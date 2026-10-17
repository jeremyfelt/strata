"""Build the game's dictionary -> src/dict.json

Sources (fetch with tools/fetch_sources.sh, run from the repo root):
  dl/dictionary/enable1.txt    ENABLE word list (public domain)
  dl/dictionary/popular.txt    common subset of ENABLE (dolph/dictionary)
  node_modules/wordlist-english  SCOWL size <= 70, American + common (see licenses/SCOWL.txt)
  node_modules/naughty-words     used only to keep offensive words out of hints
  wordfreq (pip)               word frequencies, used to mark common words

Every word of 3-12 letters is accepted. 'common' words may be offered by Reveal; the rest
are accepted when typed but never suggested. Theme words in src/puzzles.json always count
as common. Output is front-coded per word length to keep the page small.
"""
import json, re
from wordfreq import zipf_frequency as zf

MINLEN, MAXLEN = 3, 12
enable = set(w.strip() for w in open('dl/dictionary/enable1.txt'))
popular = set(w.strip() for w in open('dl/dictionary/popular.txt'))
scowl = set()
for v in ['english', 'american']:
    for n in [10, 20, 35, 40, 50, 55, 60, 70]:
        for w in json.load(open(f'node_modules/wordlist-english/{v}-words-{n}.json')):
            if re.fullmatch('[a-z]+', w):
                scowl.add(w)
words = {w for w in enable | scowl if MINLEN <= len(w) <= MAXLEN and re.fullmatch('[a-z]+', w)}

# Never accepted: slurs and strongly vulgar words, plus their inflections.
STRONG_PREFIX = ['fuck', 'shit', 'cunt', 'nigger', 'nigga', 'motherfuck', 'bullshit', 'asshole',
                 'whore', 'slut', 'wank', 'twat', 'dildo', 'faggot', 'blowjob', 'gangbang']
STRONG_EXACT = ['bitch', 'bitches', 'bitchy', 'bitched', 'bitching', 'bitchier', 'bitchiest',
                'bollocks', 'clit', 'clits', 'coon', 'coons', 'cum', 'cums', 'cumming', 'darkie', 'darkies',
                'dick', 'dicks', 'fag', 'fags', 'faggy', 'honkey', 'honkeys', 'honkie', 'honkies', 'honky',
                'jigaboo', 'jigaboos', 'kike', 'kikes', 'milf', 'milfs', 'mong', 'mongs', 'negro', 'negroes',
                'nympho', 'nymphos', 'poon', 'poons', 'poof', 'poofs', 'poofter', 'porn', 'porns', 'porno',
                'pornos', 'pussy', 'pussies', 'spic', 'spics', 'spastic', 'spastics', 'titties',
                'titty', 'tosser', 'tossers', 'twink', 'twinks', 'wetback', 'wetbacks', 'gook', 'gooks', 'chink',
                'chinks', 'dyke', 'dykes', 'tranny', 'trannies', 'retard', 'retards', 'wop', 'wops', 'dago',
                'dagoes', 'dagos', 'kraut', 'krauts', 'paki', 'pakis', 'jap', 'japs', 'raghead', 'ragheads',
                'towelhead', 'towelheads', 'gyp', 'gyps', 'gypped', 'gypping', 'spaz', 'spazzes',
                'anilingus', 'cunnilingus', 'fellatio', 'rimming', 'skank', 'skanks', 'skanky', 'prick', 'pricks']
never = {w for w in words if any(w.startswith(p) for p in STRONG_PREFIX)} | (set(STRONG_EXACT) & words)
words -= never

# Accepted if typed, but never offered as a hint.
def inflections(w):
    return {w, w + 's', w + 'es', w + 'ed', w + 'ing', w + 'er', w + 'ers', w + 'y'}
naughty = {w for w in json.load(open('node_modules/naughty-words/en.json')) if re.fullmatch('[a-z]+', w)}
no_hint = set()
for w in naughty:
    no_hint |= inflections(w)
no_hint |= {'ass', 'asses', 'tit', 'tits', 'sex', 'sexes', 'sexed', 'rape', 'rapes', 'raped', 'nazi', 'nazis',
            'gay', 'gays', 'jew', 'jews', 'lez', 'homo', 'homos', 'hun', 'huns', 'kill', 'kills'}

theme = {w.lower() for p in json.load(open('src/puzzles.json')) for w in p['words']}
missing = sorted(theme - words)
if missing:
    print('Adding theme words missing from the word lists:', ', '.join(missing))
    words |= set(missing)

common = {w for w in words if w in theme or (w not in no_hint and (w in popular or (len(w) >= 4 and zf(w, 'en') >= 2.9)))}
rare = words - common

def front_code(ws, L):
    out, prev = [], ''
    for w in sorted(ws):
        p = 0
        while p < len(prev) and p < L - 1 and prev[p] == w[p]:
            p += 1
        out.append((chr(48 + p) if p < 10 else chr(65 + p - 10)) + w[p:])
        prev = w
    return ''.join(out)

data = {'min': MINLEN, 'max': MAXLEN, 'common': {}, 'rare': {}}
for L in range(MINLEN, MAXLEN + 1):
    data['common'][L] = front_code([w for w in common if len(w) == L], L)
    data['rare'][L] = front_code([w for w in rare if len(w) == L], L)
json.dump(data, open('src/dict.json', 'w'), separators=(',', ':'))
size = sum(len(s) for k in ('common', 'rare') for s in data[k].values())
print(f'src/dict.json: {len(words)} words ({len(common)} common), {len(never)} removed, {size / 1024:.0f} KB')
