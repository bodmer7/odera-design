# Redesign: vorher und nachher

Gemessen mit `node tools/messen.mjs` (1440 px, gerenderte Seite) und `node tools/lighthouse.mjs`
(Median aus drei Läufen). Rohdaten in `docs/messungen/`.

## Vorher (live, 8. Oktober 2026, Stand `origin/main` 30989f9)

### Pro Route

| Route | HTML KB | h1 im Quelltext | `{{` im Quelltext | Wörter | Höhe bei 1440 px | Abschnitte | Hintergrundwechsel | echte Bilder |
|---|---|---|---|---|---|---|---|---|
| `/` | 415 | 12 | 680 | 647 | 6977 | 8 | 8 | 6 |
| `/angebot/` | 446 | 12 | 680 | 1055 | 6741 | 7 | 4 | 0 |
| `/ablauf/` | 422 | 12 | 680 | 585 | 4655 | 6 | 3 | 0 |
| `/musterprojekte/` | 416 | 12 | 680 | 471 | 5333 | 6 | 6 | 3 |
| `/ueber-mich/` | 409 | 12 | 680 | 585 | 5459 | 9 | 4 | 1 |
| `/projekt-check/` | 374 | 11 | 680 | 94 | 948 | 1 | 0 | 0 |
| `/datenschutz/` | 417 | 12 | 680 | 1621 | 7277 | 2 | 1 | 0 |
| `/impressum/` | 392 | 12 | 680 | 239 | 2717 | 2 | 1 | 0 |
| `/agb/` | 414 | 12 | 680 | 1320 | 7040 | 2 | 1 | 0 |

«Echte Bilder»: `<img>` und Bildflächen mit Hintergrundbild, mindestens 120 px breit, ohne SVG-Grafiken.
«Hintergrundwechsel»: Wechsel der Hintergrundfarbe zwischen aufeinanderfolgenden Abschnitten inklusive Footer.
Auf der Startseite wechseln `#FFFFFF` und `#F6F5F1` ab, farbig sind nur Abschluss (Kobalt) und Footer (Tinte).

### Lighthouse vorher

| Route | Gerät | Performance | Accessibility | Best Practices | SEO | LCP s | CLS |
|---|---|---|---|---|---|---|---|
| `/` | mobil | 99 | 100 | 100 | 100 | 2.18 | 0.000 |
| `/` | desktop | 100 | 100 | 100 | 100 | 0.56 | 0.000 |
| `/ablauf/` | mobil | 99 | 100 | 100 | 100 | 2.10 | 0.000 |
| `/ablauf/` | desktop | 100 | 100 | 100 | 100 | 0.48 | 0.000 |
| `/ueber-mich/` | mobil | 97 | 100 | 100 | 100 | 2.61 | 0.000 |
| `/ueber-mich/` | desktop | 100 | 100 | 100 | 100 | 0.48 | 0.000 |

Lighthouse bewertet SEO mit 100, obwohl jede Route alle Seiten enthält: Der Test prüft Titel, Beschreibung,
`canonical` und Lesbarkeit, nicht doppelte Inhalte oder mehrere `h1`.

### Wörter pro Abschnitt vorher

Siehe `docs/messungen/vorher-abschnitte.md`.
