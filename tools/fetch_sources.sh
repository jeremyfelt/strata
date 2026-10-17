#!/usr/bin/env bash
# Fetch everything the build tools need that isn't checked in. Run from the repo root.
#   word lists  -> dl/dictionary (ENABLE + popular), node_modules (SCOWL, offensive-word list)
#   typeface    -> dl/fonts (Archivo, for drawing icons and for local screenshots)
#   python deps -> wordfreq, pillow, playwright
set -euo pipefail
mkdir -p dl/fonts
[ -d dl/dictionary ] || git clone --depth 1 https://github.com/dolph/dictionary.git dl/dictionary
npm install --no-audit --no-fund
base=https://raw.githubusercontent.com/google/fonts/main/ofl/archivo
[ -f dl/fonts/Archivo.ttf ] || curl -sSL -o dl/fonts/Archivo.ttf "$base/Archivo%5Bwdth,wght%5D.ttf"
[ -f dl/fonts/Archivo-Italic.ttf ] || curl -sSL -o dl/fonts/Archivo-Italic.ttf "$base/Archivo-Italic%5Bwdth,wght%5D.ttf"
pip install -r requirements.txt
echo "Sources ready."
