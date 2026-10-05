"""Erzeugt die Logo-Dateien von Firstlicht als SVG mit Text in Pfaden (keine Schrift nötig).

    python3 tools/firstlicht/logo.py      (braucht fonttools und brotli: pip install fonttools brotli)
    node tools/firstlicht/logo-raster.mjs (Favicon .ico, Apple-Touch-Icon, Vorschaubild für Links)

Schrift: Schibsted Grotesk (SIL Open Font License), aus musterprojekte/firstlicht/assets/fonts/.
"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HIER = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HIER, '..', '..', 'musterprojekte', 'firstlicht', 'assets', 'fonts')
ZIEL = os.path.join(HIER, '..', '..', 'musterprojekte', 'firstlicht', 'assets', 'logo')

def schrift(datei, gewicht):
    f = TTFont(os.path.join(FONTS, datei))
    return instancer.instantiateVariableFont(f, {'wght': gewicht})

def text_pfad(font, text, groesse, x=0, y=0, sperrung=0.0):
    """Text als SVG-Pfad, Grundlinie bei y. Gibt (pfad, breite) zurück."""
    upm = font['head'].unitsPerEm
    s = groesse / upm
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    hmtx = font['hmtx']
    kern = {}
    teile = []
    cx = x
    for ch in text:
        name = cmap.get(ord(ch))
        if name is None:
            continue
        pen = SVGPathPen(glyphs)
        tp = TransformPen(pen, (s, 0, 0, -s, cx, y))
        glyphs[name].draw(tp)
        teile.append(pen.getCommands())
        cx += hmtx[name][0] * s + sperrung * groesse
    return ' '.join(teile), cx - x

TITEL = schrift('schibsted-grotesk-600-800-latin.woff2', 800)
TEXT = schrift('manrope-400-700-latin.woff2', 600)
TEXT_FETT = schrift('manrope-400-700-latin.woff2', 700)

def signet(farbe_dach, farbe_sonne, tx=0, ty=0, s=1.0, maske_id='m'):
    """Dachfirst (umgekehrtes V) mit aufgehender Sonne. 48 × 48."""
    return f'''<g transform="translate({tx} {ty}) scale({s})">
  <mask id="{maske_id}" maskUnits="userSpaceOnUse" x="0" y="0" width="48" height="48"><rect width="48" height="48" fill="#fff"/><path d="M5 38L24 19L43 38" fill="none" stroke="#000" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></mask>
  <circle cx="24" cy="15.5" r="9" fill="{farbe_sonne}" mask="url(#{maske_id})"/>
  <path d="M5 38L24 19L43 38" fill="none" stroke="{farbe_dach}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>
</g>'''

def logo(farbe_dach, farbe_sonne, farbe_wort, datei, titel):
    wort, breite = text_pfad(TITEL, 'Firstlicht', 34, x=58, y=36, sperrung=-0.035)
    w = round(58 + breite + 2)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} 48" width="{w}" height="48" role="img" aria-label="{titel}">
<title>{titel}</title>
{signet(farbe_dach, farbe_sonne)}
<path fill="{farbe_wort}" d="{wort}"/>
</svg>
'''
    open(os.path.join(ZIEL, datei), 'w').write(svg)
    return w

def schreiben(datei, inhalt):
    open(os.path.join(ZIEL, datei), 'w').write(inhalt)

logo('#10141C', '#FF8A3D', '#10141C', 'logo.svg', 'Firstlicht')
logo('#10141C', '#10141C', '#10141C', 'logo-mono-dunkel.svg', 'Firstlicht')   # dunkles Logo für helle Flächen
logo('#FFFFFF', '#FFFFFF', '#FFFFFF', 'logo-mono-hell.svg', 'Firstlicht')     # helles Logo für dunkle Flächen
schreiben('signet.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48" role="img" aria-label="Firstlicht"><title>Firstlicht</title>{signet("#10141C", "#FF8A3D")}</svg>\n')
# Favicon: dunkle Kachel, damit es auf hellen und dunklen Tabs funktioniert
schreiben('favicon.svg', f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="11" fill="#0E1420"/>{signet("#F7F5F0", "#FF8A3D", tx=4, ty=3, s=0.833, maske_id="f")}</svg>\n')

# Vorschaubild für geteilte Links (1200 × 630)
zeile1, _ = text_pfad(TITEL, 'Solarstrom vom eigenen Dach.', 74, x=96, y=318, sperrung=-0.035)
zeile2, _ = text_pfad(TITEL, 'Ehrlich gerechnet.', 74, x=96, y=402, sperrung=-0.035)
unter, _ = text_pfad(TEXT, 'Solaranlagen, Speicher und Ladestationen im Freiamt, Reusstal und Limmattal', 26, x=96, y=470)
marke, mb = text_pfad(TITEL, 'Firstlicht', 44, x=170, y=150, sperrung=-0.035)
hinweis, hb = text_pfad(TEXT_FETT, 'Beispielseite von ODERA Design. Der Betrieb ist frei erfunden.', 22, x=0, y=0)
og = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
<defs>
  <radialGradient id="glut" cx="0.85" cy="1.05" r="0.75"><stop offset="0" stop-color="#FF8A3D" stop-opacity=".55"/><stop offset=".45" stop-color="#FF8A3D" stop-opacity=".12"/><stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="630" fill="#0E1420"/>
<rect width="1200" height="630" fill="url(#glut)"/>
<circle cx="1050" cy="520" r="150" fill="#FFC857" opacity=".1"/>
<mask id="og-m" maskUnits="userSpaceOnUse" x="800" y="380" width="400" height="250"><rect x="800" y="380" width="400" height="250" fill="#fff"/><path d="M890 640L1050 530L1210 640" fill="none" stroke="#000" stroke-width="64" stroke-linejoin="round"/></mask>
<circle cx="1050" cy="505" r="62" fill="#FF8A3D" mask="url(#og-m)"/>
<path d="M890 640L1050 530L1210 640" fill="none" stroke="#F7F5F0" stroke-width="30" stroke-linejoin="round"/>
{signet("#F7F5F0", "#FF8A3D", tx=96, ty=96, s=1.45, maske_id="o")}
<path fill="#F7F5F0" d="{marke}"/>
<path fill="#F7F5F0" d="{zeile1}"/>
<path fill="#FFC857" d="{zeile2}"/>
<path fill="#B7C0D0" d="{unter}"/>
<rect x="96" y="530" width="{round(hb + 40)}" height="44" rx="22" fill="#D6F24B"/>
<g transform="translate(116 559)"><path fill="#11131A" d="{hinweis}"/></g>
</svg>
'''
open(os.path.join(HIER, 'og-image.svg'), 'w').write(og)  # Quelle, nicht veröffentlicht
print('Logo-Dateien geschrieben:', sorted(os.listdir(ZIEL)))
