# Hinweise für Claude

Ausführliche Doku zur Website steht in `README.md`. Hier nur, was beim Arbeiten
leicht übersehen wird.

## odera.ch

- `index.html` ist die Vorlage, die Unterseiten erzeugt `node tools/seo-build.mjs`
  (braucht Chrome). Nach jeder Änderung an `index.html` neu erzeugen und mitcommitten.
- Preise und bestehende Texte nur ändern, wenn ausdrücklich verlangt.
- Push auf `main` geht live (GitHub Pages und Infomaniak). Vorher fragen.

## Musterprojekte (`musterprojekte/`)

Beispielseiten erfundener Betriebe (Doppelmeter, Firstlicht). Für jedes Muster gilt:

- Beispiel-Leiste auf jeder Seite («Beispielseite von ODERA Design. Der Betrieb
  ist frei erfunden.») mit Link zurück zu odera.ch und zum Projekt-Check
  (`?quelle=<muster>`, passender Eintrag in `EINSTIEGE` in `index.html`).
  Hinweis im Fuss wiederholen.
- `noindex`, nicht in der Sitemap. `seo-build` lässt `musterprojekte/<name>/` stehen.
- Nur erfundene Kontaktdaten. Keine Bewertungen, Sterne, Zitate, Labels,
  Zertifikate, Verbände oder Herstellermarken. Keine erkennbaren Gesichter,
  Kennzeichen, Hausnummern oder Strassenschilder.
- Demo-Formulare senden nichts.
- Impressum nennt ODERA Design als Betreiberin und verlinkt das echte Impressum.
- Schweizer Hochdeutsch, Sie-Form, kein ß, keine Halbgeviert- oder Geviertstriche
  im sichtbaren Text, Zahlen über `Intl.NumberFormat('de-CH')`.
- Keine externen Anfragen zur Laufzeit: Schriften, Bilder, Daten lokal.
- Tatsachen mit Quelle belegen (Firstlicht: `faktencheck.md`, `daten/annahmen.json`).

## Firstlicht

- Seiten in `musterprojekte/firstlicht/*.html` sind erzeugt. Bearbeiten in
  `tools/firstlicht/vorlagen/` und `tools/firstlicht/css/`, dann
  `npm run firstlicht:build`. Die CSP enthält Hashes der Inline-Skripte.
- Vor dem Commit: `npm run firstlicht:qa` (Build, Tests, Regelprüfung, Browser).
  In der Cloud `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` setzen.
- Details, Annahmen-Pflege und Befehle: `musterprojekte/firstlicht/README.md`.
