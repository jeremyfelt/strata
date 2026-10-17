# Notices

Strata's dictionary (`src/dict.json`) is derived from these sources:

- **ENABLE** (Enhanced North American Benchmark Lexicon), public domain, via [dolph/dictionary](https://github.com/dolph/dictionary).
- **SCOWL** (Spell Checker Oriented Word Lists) by Kevin Atkinson, via the [wordlist-english](https://www.npmjs.com/package/wordlist-english) package. Its copyright notice and permission terms are reproduced in [licenses/SCOWL.txt](licenses/SCOWL.txt).

These are used at build time to decide which words Reveal may suggest; none of their data is shipped as is:

- The "popular" list from [dolph/dictionary](https://github.com/dolph/dictionary).
- Word frequencies from [wordfreq](https://github.com/rspeer/wordfreq) by Robyn Speer.
- [naughty-words](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words) (CC BY 4.0), to keep offensive words out of suggestions.

Typeface: [Archivo](https://fonts.google.com/specimen/Archivo) by Omnibus-Type, SIL Open Font License 1.1, loaded from Google Fonts.
