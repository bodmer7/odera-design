# Musterprojekt Firstlicht Solartechnik

Beispiel-Firmenseite für das **Paket Pro** von ODERA Design. Der Betrieb ist frei
erfunden: Firstlicht plant und montiert Solaranlagen, Speicher und Ladestationen
im Freiamt, Reusstal und Limmattal. Erreichbar unter `/musterprojekte/firstlicht/`,
alle Seiten `noindex`, nicht in der Sitemap.

Diese Datei, `faktencheck.md` und `bilder.md` werden nicht veröffentlicht
(`_config.yml` und `veroeffentlichen.yml` schliessen sie aus).

## Seiten

| Seite | Inhalt |
|---|---|
| `index.html` | Hero mit interaktiver Haus-Szene (Tageszeit, Jahreszeit, Energiefluss), Mini-Rechner, Leistungen, drei Projekte, Ablauf, Fragen |
| `rechner.html` | Solarrechner mit Kompass, Ergebnis als Spanne, Monats- und Kostendiagramm, Annahmen mit Quelle und Datum, Link teilen, Drucken, Übergabe an die Anfrage |
| `leistungen.html` | Leistungen, Anlage-Baukasten, Monitoring-Ansicht, Ablauf, Förderung |
| `projekte.html` | Projekte mit Filter (`?filter=`), Detail-Dialog (`#projekt-id`), Vorher-Nachher-Regler |
| `ueber-uns.html` | Betrieb, Arbeitsweise, Einsatzgebiet, offene Stellen (ohne Personenfotos) |
| `kontakt.html` | Anfrage in drei Schritten mit Rückruf-Zeitfenster, Kontaktdaten, Impressum und Datenschutz des Musters. Sendet nichts. |
| `_styleguide.html` | Farben, Schriften, Komponenten. Wird von Jekyll nicht veröffentlicht (führender Unterstrich), nur lokal ansehen. |

**Erklärmodus:** `?erklaeren=1` oder der Schalter in der Beispiel-Leiste. Er
markiert 15 Stellen und erklärt, was zum Paket Pro gehört und was eine
**individuelle Erweiterung, Preis nach Aufwand** ist (Szene, Solarrechner,
Baukasten, Monitoring, Projektfilter mit Dialog).

## Aufbau

Die Seiten in diesem Ordner sind **erzeugt**. Bearbeitet werden die Vorlagen:

```
tools/firstlicht/
  build.mjs            Seiten bauen: Vorlagen + Teile + Daten → musterprojekte/firstlicht/*.html
  vorlagen/            Seitenvorlagen, teile/ (Kopf, Fuss, Leiste, Szene ...), fragen.json
  css/                 Quell-CSS: firstlicht.css (Kern) + seiten/*.css, erklaeren.css
  illustrationen.mjs   SVG-Illustrationen (Gebäude, Baukasten, Symbole)
  check.mjs            Regelprüfung (Leiste, noindex, Striche, ß, Links, Kontaktdaten ...)
  qa.mjs               Browserprüfung (Überlauf 320 bis 1920 px, hell/dunkel, axe, ohne JS, Netzwerk, html-validate)
  lighthouse.mjs       Lighthouse, Median aus drei Läufen
  screenshots.mjs      Aufnahmen für odera.ch (assets/img/muster-firstlicht-desktop, -handy, -rechner)
  tests/               Unit-Tests für Rechner und Szene
  recherche/           Rohmaterial der Recherche, Namensprüfung
  NOTIZEN.md           Arbeitsnotizen und Entscheide
```

Einzige Datenquellen:

- `daten/firma.json`: Name, Adresse, Telefon, E-Mail, Öffnungszeiten (alles erfunden).
- `daten/annahmen.json`: jede Zahl des Rechners, mit Quelle, Datum und Status.
- `daten/projekte.json`: die erfundenen Projekte.
- `tools/firstlicht/vorlagen/fragen.json`: häufige Fragen.

Der Build setzt Platzhalter (`{{firma.*}}`, `{{meta.*}}`), bündelt pro Seite
Kern- und Seiten-CSS (lightningcss, minifiziert) und schreibt eine
Content-Security-Policy als Meta-Tag, mit Hashes der Inline-Skripte. Eine
Änderung an einem Inline-Skript ohne neuen Build bricht die Seite.

Skripte liegen unter `assets/js/` als ES-Module. `main.js` lädt die
Seitenmodule nach Bedarf, der Erklärmodus kommt per dynamischem Import.
Zur Laufzeit gibt es keine externen Anfragen: Schriften, Bilder und Daten
liegen im Repo.

## Befehle

```bash
npm install                 # einmalig, nur Werkzeuge (devDependencies)
npm run firstlicht:build    # Seiten neu erzeugen
npm run firstlicht:test     # Unit-Tests (Rechner, Szene)
npm run firstlicht:check    # Regelprüfung
npm run firstlicht:qa       # alles oben + Browserprüfung, Screenshots in _lokal/firstlicht-qa/
npm run firstlicht:screens  # Aufnahmen für odera.ch neu erzeugen
```

In der Claude-Code-Cloud braucht Playwright den vorinstallierten Browser:

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
CHROME_PATH=/opt/pw-browsers/chromium-*/chrome-linux/chrome node tools/firstlicht/lighthouse.mjs
PROFIL=desktop CHROME_PATH=... node tools/firstlicht/lighthouse.mjs   # für die Ladezeit auf odera.ch
```

Läuft Chrome als root (Container), braucht `tools/seo-build.mjs` einen
kleinen Wrapper, der Chrome mit `--no-sandbox` startet, und `CHROME=<wrapper>`.

Die GitHub-Action `.github/workflows/firstlicht.yml` prüft bei jeder Änderung,
dass die erzeugten Seiten zum Build passen, und führt Tests und Regelprüfung aus.

## Nach Änderungen

1. `npm run firstlicht:qa` muss ohne Befunde durchlaufen.
2. Ändert sich das Aussehen der Startseite oder des Rechners:
   `npm run firstlicht:screens`, danach `node tools/seo-build.mjs`.
3. Ändert sich die Ladezeit: Lighthouse im Profil Desktop messen, den
   langsamsten LCP aufgerundet in `LADEZEIT.firstlicht` und das Datum in
   `firstlichtMessung` (beide in `/index.html`) eintragen, dann `seo-build`.

## Annahmen jährlich prüfen

Stand der Zahlen: `_stand` in `daten/annahmen.json` (5. Oktober 2026).
Von 28 Werten sind 7 «verifiziert» (offizielle Stelle nennt den Wert direkt),
21 «nicht verifiziert» (Faustwert, eigene Ableitung oder Sekundärquelle). Die
Recherche lief ohne direkten Zugriff auf die Primärquellen.

| Wann | Was | Wo |
|---|---|---|
| Anfang September | Strompreis Grundversorgung (Median) für das Folgejahr | ElCom, Strompreis-Webseite |
| Herbst | Rückliefertarife der grossen Netzbetreiber, Minimalvergütung | EKZ, CKW, AEW, Swissolar |
| Bei Änderung | Einmalvergütung (Ansätze, Mindestleistung, Obergrenze) | Pronovo |
| Jährlich | Anlage- und Speicherkosten | BFE-Studie Photovoltaik-Kosten, Swissolar Batteriemonitor |
| Wenn Netz offen | Ertrag pro kWp und Monatsverteilung für Muri AG und Dietikon | PVGIS (EU), sonnendach.ch |

Vorgehen: Wert, `quelle`, `datum` und `status` in `annahmen.json` ändern,
`_stand` setzen, `faktencheck.md` nachführen, Tests und QA laufen lassen. Die
Tests in `tests/rechner-logik.test.mjs` prüfen Plausibilität (Spannen,
Rundung, Grenzen), keine festen Ergebnisse. Das Datum unter dem Rechner kommt
automatisch aus `_stand`.

## Für eine echte Kundenseite

Das Muster enthält bewusst **keine** strukturierten Daten, weil der Betrieb
erfunden ist und die Seite nicht in Suchmaschinen erscheinen soll. Für einen
echten Betrieb gehört ein `LocalBusiness`-Block in den Kopf, etwa so:

```html
<!-- Nur für einen echten Betrieb. Alle Angaben müssen mit Impressum und Google-Profil übereinstimmen. -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Electrician",
  "name": "Name des Betriebs",
  "url": "https://www.beispiel.ch/",
  "telephone": "+41 56 000 00 00",
  "email": "info@beispiel.ch",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Strasse 1",
    "postalCode": "5630",
    "addressLocality": "Muri AG",
    "addressCountry": "CH"
  },
  "areaServed": ["Freiamt", "Reusstal", "Limmattal"],
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    "opens": "07:30", "closes": "17:30"
  }]
}
</script>
```

Weitere Schritte für einen echten Kunden: `noindex` entfernen, Sitemap und
Canonical auf die eigene Domain, Beispiel-Leiste und Erklärmodus entfernen
(`teile/leiste.html`, Platzhalter im Fuss), das Formular an einen echten
Empfänger anbinden (wie der Projekt-Check von odera.ch über den Worker),
echte Fotos mit Einwilligung (siehe `bilder.md`), Bewertungen nur echte und
überprüfbare.

**Zweite Sprache** (im Paket Pro enthalten, im Muster nicht umgesetzt): Die
Texte stehen in den Vorlagen, nicht im Code. Für Französisch einen Ordner
`vorlagen/fr/` anlegen, `build.mjs` pro Sprache nach `musterprojekte/firstlicht/fr/`
bauen lassen, `hreflang` im Kopf ergänzen. Zahlen formatieren die Skripte
bereits über `Intl.NumberFormat`, das Gebietsschema müsste aus `<html lang>`
gelesen werden statt fest `de-CH`.

## Regeln dieses Musters

- Beispiel-Leiste auf jeder Seite, Hinweis im Fuss wiederholt.
- Nur erfundene Kontaktdaten (Telefon aus dem Bereich für Beispiele).
- Keine Bewertungen, Sterne, Zitate, Labels, Zertifikate, Verbände, Herstellermarken.
- Keine erkennbaren Gesichter, Kennzeichen, Hausnummern, Strassenschilder.
- Rechner zeigt Spannen und Schätzungen mit Datum und Quelle, keine Versprechen.
- Schweizer Hochdeutsch, Sie-Form, kein ß, keine Halbgeviert- oder Geviertstriche im sichtbaren Text.

`check.mjs` prüft die maschinell prüfbaren Regeln.
