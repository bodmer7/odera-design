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
- [x] Phase 0
- [x] Szenen-Modell `assets/js/szene-modell.js`, Szene `assets/js/szene.js`, Designsystem-Grundlage `assets/css/firstlicht.css`
- [x] Zwei Hero-Prototypen gebaut
- [ ] Checkpoint: OK von Nico abwarten
- [ ] Faktenrecherche (Subagent, Ausgabe in `tools/firstlicht/recherche/`)

## Offene Fragen an Nico
- Branch: Session-Vorgabe `claude/practical-planck-c2raa9`, Prompt verlangt `musterprojekt-firstlicht`.
- Rechner, Szene, Baukasten, Monitoring gehen über Paket Pro hinaus.
