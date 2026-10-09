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

## Nachher (lokal, 9. Oktober 2026, Branch redesign-teil3)

### Pro Route

| Route | HTML KB | h1 im Quelltext | {{ | Wörter | Höhe px | Abschnitte | Hintergrundwechsel | Bilder |
|---|---|---|---|---|---|---|---|---|
| `/` | 139 | 1 | 0 | 419 | 6105 | 9 | 8 | 5 |
| `/angebot/` | 154 | 1 | 0 | 652 | 6100 | 7 | 6 | 0 |
| `/ablauf/` | 132 | 1 | 0 | 377 | 4961 | 6 | 6 | 0 |
| `/musterprojekte/` | 121 | 1 | 0 | 228 | 3863 | 5 | 5 | 2 |
| `/ueber-mich/` | 124 | 1 | 0 | 279 | 3887 | 6 | 6 | 1 |
| `/website-fuer-handwerker/` | 125 | 1 | 0 | 318 | 4793 | 7 | 7 | 1 |
| `/website-fuer-restaurants/` | 124 | 1 | 0 | 300 | 4899 | 7 | 7 | 0 |
| `/website-fuer-praxen/` | 123 | 1 | 0 | 276 | 4807 | 7 | 7 | 0 |
| `/website-fuer-laeden/` | 124 | 1 | 0 | 280 | 4807 | 7 | 7 | 0 |
| `/projekt-check/` | 122 | 1 | 0 | 94 | 939 | 1 | 0 | 0 |
| `/datenschutz/` | 135 | 1 | 0 | 2024 | 7725 | 2 | 1 | 0 |
| `/impressum/` | 117 | 1 | 0 | 239 | 2478 | 2 | 1 | 0 |
| `/agb/` | 131 | 1 | 0 | 1320 | 6182 | 2 | 1 | 0 |

Datenschutz hat mehr Wörter als vorher, weil Abschnitt 14 (Statistik) dazugekommen ist. Rechtstexte werden nicht gekürzt.
Bei den Branchenseiten und dem Angebot zählen zugeklappte Antworten nicht mit.

### Wortbudgets (Teil 4)

| Seite | vorher | nachher | Ziel | erfüllt |
|---|---|---|---|---|
| Startseite | 647 | 419 | höchstens 420 | ja |
| Angebot | 1055 | 652 | höchstens 686 (65 %) | ja |
| Ablauf | 585 | 377 | höchstens 322 (55 %) | nein, siehe Konflikte in `docs/entscheidungen.md` |
| Musterprojekte | 471 | 228 | höchstens 330 (70 %) | ja |
| Über mich | 585 | 279 | höchstens 420 | ja |
| Branchenseiten | neu | 276 bis 318 sichtbar, mit Antworten rund 340 bis 390 | 350 bis 500 | knapp |

### Lighthouse, vorher und nachher unter gleichen Bedingungen

Beide Fassungen lokal mit gzip ausgeliefert (wie GitHub Pages), Median aus drei Läufen. Vorher = `origin/main` vom 9. Oktober.

| Route | Gerät | vorher Performance | nachher Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|---|---|
| `/` | mobil | 95 | 95 | 100 | 100 | 100 |
| `/` | desktop | 100 | 100 | 100 | 100 | 100 |
| `/ablauf/` | mobil | 97 | 97 | 100 | 100 | 100 |
| `/ablauf/` | desktop | 100 | 100 | 100 | 100 | 100 |
| `/ueber-mich/` | mobil | 96 | 96 | 100 | 100 | 100 |
| `/ueber-mich/` | desktop | 100 | 100 | 100 | 100 | 100 |
| `/angebot/` | mobil | | 97 | 100 | 100 | 100 |
| `/musterprojekte/` | mobil | | 96 | 100 | 100 | 100 |
| `/website-fuer-restaurants/` | mobil | | 97 | 100 | 100 | 100 |

## Gekürzte Texte (Auswahl der wichtigsten Blöcke)

| Seite, Block | alter Text | neuer Text |
|---|---|---|
| Start, Zeile über dem Titel | Nico Bodmer · Webseiten aus Berikon AG | Webdesign aus Berikon AG für Betriebe in der ganzen Schweiz |
| Start, Einleitung | Für Handwerk, Gastro, Praxen und Läden. Ich zeige Ihnen den fertigen Entwurf, Sie entscheiden danach. | Für Handwerk, Gastro, Praxen und Läden. Sie sehen den fertigen Entwurf und entscheiden danach. |
| Start, Musterprojekte | So sehen meine Seiten aus. Zwei Seiten mit zwei verschiedenen Zielen. Die erste ist für einen erfundenen Betrieb gebaut, die zweite ist mein eigenes Portfolio. | So arbeiten meine Seiten. Zwei erfundene Betriebe, zwei echte Websites. |
| Start, Preise | Einmalig bezahlt, ohne Abo. Hosting können Sie nach dem Livegang dazunehmen, müssen aber nicht. | Einmalig bezahlt, ohne Abo. |
| Start, Vergleich | vier Zeilen mit je drei Sätzen | vier Kriterien mit Symbolen (erfüllt, je nach Anbieter, nicht erfüllt), ein Satz Fazit |
| Start, Person | Ich heisse Nico Bodmer und baue von Berikon aus Webseiten für kleine Betriebe. Nebenberuflich und darum höchstens zwei Projekte gleichzeitig. Dazu drei Zeilen Lebenslauf. | Ich heisse Nico Bodmer und baue Websites für kleine Betriebe. Dazu drei Fakten mit Symbolen. |
| Ablauf | «In vier Phasen» und «Die Schritte im Einzelnen» (zehn Schritte, Schalter pro Schritt) | eine Zeitleiste mit vier Phasen, Einzelschritte aufklappbar, ein Schalter |
| Ablauf, Stolpersteine | Deshalb beginnt die Lieferfrist erst, wenn Fragebogen und Bilder bei mir sind. Das steht in der Auftragsbestätigung, damit keiner von uns im Ungewissen bleibt. | Die Lieferfrist beginnt erst, wenn Fragebogen und Bilder bei mir sind. |
| Angebot, Einleitung | Sie bekommen Ihre Website als fertigen Entwurf, bevor Sie sich für irgendetwas entscheiden. Was sie kostet, steht hier offen. Einmalig, ohne Abonnement, ohne Nachträge. | Sie zahlen erst, wenn Ihnen der Entwurf gefällt. Einmalig, ohne Abo, ohne Nachträge. |
| Angebot, Pakete | bis zu zehn Punkte pro Karte | höchstens fünf Punkte, vollständige Listen aufklappbar |
| Angebot, Betrieb Schweiz | sieben Punkte, fünf davon wie «Betrieb bei mir» | Alles wie «Betrieb bei mir», dazu zwei Punkte |
| Über mich, Einleitung | drei Absätze (Lehre, Beruf, Studium) | zwei kurze Absätze mit denselben Fakten |
| Über mich, Womit ich arbeite | drei Karten mit Fliesstext (138 Wörter) | vier Symbole mit Kurzlabel (rund 25 Wörter) |
| Über mich, Kundenstimmen | Hier stehen keine Kundenstimmen. Ich baue seit Kurzem Websites auf eigene Rechnung, und ich erfinde keine Referenzen, um grösser zu wirken. … | Zusagen statt Kundenstimmen. Ich erfinde keine Referenzen. Messen Sie mich an diesen drei Punkten. |
| Musterprojekte | Drei Seiten, drei Welten. Mit Portfolio und je einer Desktop- und Handy-Fassung | Zwei Betriebe, zwei eigene Seiten. Ohne Portfolio (nur noch auf Über mich verlinkt) |
