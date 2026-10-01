"""Verkleinert die vorgeladenen Schriften in assets/fonts/ (Bricolage Grotesque, Inter, JetBrains Mono).

Was es tut, ohne das Aussehen zu ändern:
- Variable Achsen auf den genutzten Bereich begrenzen: Bricolage Stärke 700 bis 800 und optische Grösse 18 bis 72,
  Inter Stärke 400 bis 600.
- Nur die OpenType-Funktionen behalten, die die Seite nutzt (Unterschneidung, Ligaturen, Tabellenziffern, Akzente).
- Der Zeichenumfang (latin, latin-ext) bleibt gleich.

Ausführen (einmalig fonttools in einer eigenen Umgebung installieren):
    python3 -m venv /tmp/venv && /tmp/venv/bin/pip install fonttools brotli
    /tmp/venv/bin/python tools/schriften-schlank.py

Das Skript kann mehrfach laufen, die Dateien werden dabei nicht weiter verändert.
"""
import io
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ORDNER = os.path.join(os.path.dirname(__file__), '..', 'assets', 'fonts')
FUNKTIONEN = ['kern', 'liga', 'calt', 'tnum', 'ccmp', 'locl', 'mark', 'mkmk', 'case']
DATEIEN = {
    'bricolage-grotesque-700-800-latin.woff2': {'wght': (700, 800), 'opsz': (18, 72)},
    'bricolage-grotesque-700-800-latin-ext.woff2': {'wght': (700, 800), 'opsz': (18, 72)},
    'inter-400-500-600-latin.woff2': {'wght': (400, 600)},
    'inter-400-500-600-latin-ext.woff2': {'wght': (400, 600)},
    'jetbrains-mono-500-latin.woff2': None,
    'jetbrains-mono-500-latin-ext.woff2': None,
}


def schlank(f):
    o = subset.Options()
    o.layout_features = FUNKTIONEN
    o.name_IDs = ['*']
    o.notdef_outline = True
    o.hinting = False
    s = subset.Subsetter(o)
    s.populate(unicodes=list(f.getBestCmap().keys()))
    s.subset(f)
    return f


def neu_laden(f):
    puffer = io.BytesIO()
    f.flavor = None
    f.save(puffer)
    puffer.seek(0)
    return TTFont(puffer)


for name, achsen in DATEIEN.items():
    pfad = os.path.join(ORDNER, name)
    vorher = os.path.getsize(pfad)
    f = schlank(TTFont(pfad))
    if achsen and 'fvar' in f:
        f = instancer.instantiateVariableFont(neu_laden(f), achsen)
    f.flavor = 'woff2'
    f.save(pfad)
    print(f'{name:46} {vorher:>7} -> {os.path.getsize(pfad):>7} Bytes')
