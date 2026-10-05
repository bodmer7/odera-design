# Firstlicht: Arbeitsnotizen (nicht veröffentlicht)

Stand und Entscheide, damit eine neue Session nahtlos weitermachen kann.

## Rahmen (Phase 0, 5.10.2026)
- Hosting: GitHub Pages (Jekyll «legacy», `_config.yml`), Custom Header (`_headers`) nicht möglich. `.htaccess` gilt nur bei einem späteren Umzug zu Infomaniak.
- Kein Build für die Website. odera.ch selbst: Claude-Design-Vorlage in `index.html`, Unterseiten erzeugt durch `tools/seo-build.mjs` (braucht Chrome, `CHROME=/opt/pw-browsers/chromium-*/chrome-linux/chrome`).
- Doppelmeter: statische Seiten, Schriften aus `/assets/fonts/`, Beispiel-Leiste, noindex, nicht in Sitemap, Bildnachweise im Impressum. Konventionen übernommen.
- Werkzeuge: Node 22, Playwright 1.56 global (`/opt/node22/lib/node_modules/playwright`), Chromium unter `/opt/pw-browsers`. npm erreichbar, sonst fast alles per Proxy gesperrt (pronovo, bfe, elcom, zefix, swissreg, pvgis, unsplash). Nur WebSearch geht.
- Paket Pro laut Angebot: bis 10 Seiten, Online-Terminbuchung oder erweiterte Formulare, Texte selbst bearbeiten, zweite Sprache, Bereich für offene Stellen, drei Korrekturrunden.

## Aufbau
- Vorlagen: `tools/firstlicht/vorlagen/*.html`, Teile in `vorlagen/teile/`. Bauen: `node tools/firstlicht/build.mjs` (Seiten) bzw. `--proto` (Hero-Prototypen nach `tools/firstlicht/prototypen/`).
- Firmendaten nur in `musterprojekte/firstlicht/daten/firma.json`.
- Schriften: Schibsted Grotesk 600 bis 800 (Titel), Manrope 400 bis 700 (Text), aus @fontsource-variable, mit fontTools beschnitten.

## Stand
- [x] Phase 0: Analyse, Pro-Umfang, Namensprüfung (`recherche/namenspruefung.md`)
- [x] Phase 1: Hero-Prototypen, Checkpoint. Entscheid Nico: Hero A (dunkel, Text links, Szene rechts), Claim «Solarstrom vom eigenen Dach. Ehrlich gerechnet.», Extras bauen und im Erklärmodus als «individuelle Erweiterung, Preis nach Aufwand» kennzeichnen, offene Stellen und Rückruf-Zeitfenster dazu.
- [x] Faktenrecherche: `daten/annahmen.json` (7 von 28 Werten verifiziert), `faktencheck.md` (F01 bis F34)
- [x] Phase 2: sechs Seiten, Erklärmodus, Styleguide, Logo-Dateien
- [x] Phase 3: Einbau in odera.ch (Musterprojekte `#mp-firstlicht`, Kachel Startseite, Einstieg `?quelle=firstlicht`, Ladezeit 0,4 s)
- [x] Phase 4: QA (Prüfskript, Browser-QA, Lighthouse mobil 100/100/100, SEO nur «is-crawlable» offen wegen noindex), unabhängiges Review
- [x] Phase 5: README, CLAUDE.md
- [ ] Merge in `main`: erst nach OK von Nico (geht live)

## Entscheide
- Branch: Session-Branch `claude/practical-planck-c2raa9` statt `musterprojekt-firstlicht` (Session-Vorgabe).
- Rechner: Horizont 30 Jahre (Swissolar: Lebensdauer 30 Jahre und mehr), Degradation 0,5 % pro Jahr, keine Steuerersparnis eingerechnet. Dadurch Amortisation im Standardfall deutlich länger als die 10 bis 14 Jahre, die Branchenseiten nennen. Bewusst so gelassen und auf der Seite erklärt.
- CSP als Meta-Tag (GitHub Pages erlaubt keine eigenen Header). `frame-ancestors` geht so nicht, ist für das Overlay auf odera.ch auch nicht gewollt.
- Keine strukturierten Daten (`LocalBusiness`), weil der Betrieb erfunden ist. Beispiel in der README.
- Keine Fotos, nur SVG-Illustrationen (keine Rechte- und Personenfragen). Optionale Fotoliste in `bilder.md`.

## Offen / nicht geprüft
- WebKit und Firefox nicht installiert, nur Chromium getestet. Auf echtem iPhone und Android prüfen.
- zefix und swissreg nicht direkt erreichbar, Namensprüfung nur über Websuche.
- Primärquellen der Annahmen nicht direkt abrufbar (Proxy), nur über Suchergebnisse.
