# Statistik von odera.ch (Teil 11)

Massgebende Referenz für Ereignisse, Kennungen und den API-Vertrag mit dem
Akquise-Tool (Repo `odera-akquise`, Tab «Website»). Stand: 8. Oktober 2026.

## Grundsätze

- Gemessen wird **nur nach Einwilligung** im Banner «Statistik» (Zustimmen und
  Ablehnen gleichwertig). Die Wahl steht im `localStorage` unter
  `odera-statistik` (`ja` oder `nein`), widerrufbar über den Link
  «Einstellungen» in der Fusszeile und in Datenschutz Abschnitt 14.
- **Keine Cookies, keine IP-Adressen, keine Eingaben.** Eine zufällige
  Sitzungs-ID liegt im `sessionStorage` (`odera-sid`) und verschwindet mit
  dem Tab.
- Eigenes Skript `assets/js/statistik.js` ohne Drittanbieter. Es sendet
  gebündelt per `navigator.sendBeacon` an den eigenen Worker `odera-stats`
  (`workers/odera-stats/`), Datenbank Cloudflare D1 in der EU.
- Rohdaten werden nach **14 Monaten** gelöscht (Cron täglich 03:17 UTC).
- Der Banner erscheint erst nach der ersten Handlung oder nach 2,5 Sekunden,
  damit er das erste Zeichnen nicht bremst.

## Ereignisse

Eine Sendung: `{ s: Sitzung, g: Gerät, k: Kampagne, e: [Ereignisse] }`.
Ein Ereignis: `{ t: Typ, p: Pfad, z: Ziel, n: Zahl, i: Zusatz }`.

| Typ | Ziel `z` | Zahl `n` | Auslöser |
| --- | --- | --- | --- |
| `consent_yes` | | | Klick auf «Zustimmen» |
| `page_view` | | | jede Seite, auch Seitenwechsel ohne Neuladen; der erste der Sitzung trägt `erster: true` und die Herkunft `r` (nur Hostname) |
| `section_view` | Abschnitts-ID | | Abschnitt zu 30 Prozent sichtbar (lange Abschnitte: halber Bildschirm), einmal pro Seitenaufruf |
| `scroll` | | 25, 50, 75, 100 | Scrolltiefe, je einmal pro Seitenaufruf |
| `engaged` | | Sekunden | aktive Zeit (Tab sichtbar, Handlung in den letzten 30 s), beim Verlassen der Seite |
| `cta_click` | Knopf-ID | | Klick auf einen Link zum Projekt-Check |
| `pricing_click` | `website`, `standard`, `pro` | | Klick auf einen Paket-Knopf (`data-quelle="paket-…"`) |
| `projektcheck_start` | | | erste Frage des Projekt-Checks sichtbar |
| `projektcheck_step` | | Fragenummer | Fortschrittsbalken `.q-prog[aria-valuenow]`, einmal pro Schritt und Sitzung |
| `projektcheck_submit` | `ok` oder `fehler` | | Ergebnis des Absendens (`assets/js/anfrage.js`) |
| `generator_use` | Branche | | Branche gewählt, «Beispiel zeigen», erste Eingabe beim Namen |
| `generator_cta` | Branche | | «So weitermachen: Projekt-Check starten» im Vorschau-Werkzeug |
| `chat_open`, `chat_send` | | | Chat geöffnet, Nachricht gesendet (ohne Inhalt, `assets/js/chat.js`) |
| `chat_preset` | Kennung der Frage | | vorgeschlagene Frage gewählt |
| `faq_open` | Kennung der Frage | | Akkordeon im Abschnitt `fragen` geöffnet |
| `muster_open` | `doppelmeter`, `firstlicht` | | Klick auf ein Musterprojekt |
| `outbound_click` | Ziel | | Link nach aussen |
| `web_vitals` | `lcp`, `cls`, `inp` | Wert (ms, CLS ohne Einheit) | erste Seite des Besuchs, beim Verlassen |
| `js_error` | Meldung (gekürzt) | | Skriptfehler, höchstens 5 pro Seitenaufruf; `i` = Datei und Zeile |

Andere Module melden über `window.dispatchEvent(new CustomEvent('odera:messung', { detail: { t, z } }))`.

## Kennungen

**Abschnitte der Startseite** (`data-abschnitt` in `src/seite.html`, Reihenfolge):

| ID | Bezeichnung |
| --- | --- |
| `hero` | Einstieg (Hero) |
| `musterprojekte` | Musterprojekte |
| `preise` | Preise |
| `ablauf` | Ablauf |
| `vergleich` | Vergleich |
| `ueber-mich` | Über mich |
| `fragen` | Häufige Fragen |
| `abschluss` | Abschluss |

**Einblicke** (Blog, statische Seiten unter `/einblicke/`, geschrieben vom
Akquise-Tool, siehe unten):

| Seite | ID | Bezeichnung |
| --- | --- | --- |
| `/einblicke/` | `einblicke-kopf` | Kopf der Übersicht |
| `/einblicke/` | `artikel-liste` | Liste der Beiträge |
| `/einblicke/<pfad>/` | `artikel` | Artikel |
| beide | `abschluss` | Abschluss mit Projekt-Check |

**Branchenseiten** (`/website-fuer-handwerker/`, `/website-fuer-restaurants/`, `/website-fuer-praxen/`,
`/website-fuer-laeden/`, seit 9. Oktober 2026): `hero` (Einstieg), `inhalte` (Was auf Ihre Website gehört),
`beispiel` (Musterprojekt oder Vorschau-Werkzeug), `ablauf` (Ablauf kompakt), `preise` (Preise), `fragen`
(Fragen), `abschluss` (Abschluss). Knöpfe: `branche-handwerk-projekt-check`, `branche-gastro-projekt-check`,
`branche-praxis-projekt-check`, `branche-laden-projekt-check`.

**Übrige Seiten** (seit dem Redesign vom 9. Oktober 2026 ebenfalls mit `data-abschnitt`):

| Seite | IDs (Reihenfolge) |
| --- | --- |
| `/musterprojekte/` | `muster-kopf` (Kopf), `muster-doppelmeter` (Doppelmeter), `muster-firstlicht` (Firstlicht), `vorschau` (Vorschau-Werkzeug), `abschluss` |
| `/ablauf/` | `ablauf-kopf` (Kopf mit Kennzahlen), `fahrplan` (vier Phasen), `aufwand` (Aufwand auf einen Blick), `danach` (Danach), `stolpersteine` (Drei Dinge, an denen Projekte scheitern), `abschluss` |
| `/angebot/` | `angebot-kopf` (Kopf mit Preisen), `pakete` (Rechner und Pakete), `betrieb` (Betrieb), `preis-herleitung` (So kommt der Preis zustande), `nicht-im-preis` (Was nicht im Preis ist), `fragen` |
| `/ueber-mich/` | `ueber-kopf` (Porträt), `werdegang`, `zusagen`, `technik` (Womit ich arbeite), `erreichbarkeit` (Kapazität und Erreichbarkeit), `abschluss` (Kontakt) |

Neue Knöpfe: `ablauf-kopf-projekt-check`, `muster-abschluss-projekt-check`. Im Akquise-Repo in `config/abschnitte.json`
nachgetragen (Commit a05763a, 9. Oktober 2026).

**Knöpfe (`cta_click`):** `data-quelle` des Links plus `-projekt-check`
(z. B. `hero-projekt-check`, `leiste-projekt-check`, `faq-projekt-check`,
`einblicke-projekt-check` auf Übersicht und Artikeln der Einblicke),
Paket-Knöpfe als `paket-website`, `paket-standard`, `paket-pro`. Ohne
`data-quelle`: ID des umgebenden Abschnitts plus `-projekt-check`, sonst
`seite-projekt-check`.

**Musterprojekte:** `doppelmeter`, `firstlicht`.

**Links nach aussen:** `linkedin` (persönliches Profil), `linkedin-firma`
(Unternehmensseite), `portfolio` (nico-bodmer.ch), `atrega`, `mailto`,
`telefon`, sonst der Hostname.

**Fragen und Chat-Vorschläge:** Kennung aus den ersten fünf Wörtern der
Frage, klein, ohne Akzente, mit Bindestrichen (z. B.
`was-kostet-eine-website`).

**Kampagnen (`?k=` in der Adresse, gilt für die ganze Sitzung):**

| Präfix | Format | Herkunft |
| --- | --- | --- |
| `ak-` | `ak-2026-w41` | Akquise-Mails (derzeit nicht genutzt: Links in Mails ohne Parameter) |
| `li-` | `li-2026-w41-mo` (Tag `mo`, `mi`, `fr`) | LinkedIn-Beiträge (erster Kommentar verlinkt direkt den Artikel: `/einblicke/<pfad>/?k=li-…`) |
| `gbp` | `gbp` | Google-Unternehmensprofil |

Andere Werte von `k` werden verworfen.

**Gerät:** Breite beim Start der Sitzung, unter 768 px `mobil`, unter
1024 px `tablet`, sonst `desktop`. **Land:** aus `request.cf.country` im
Worker.

## Einblicke (Blog)

Markiert Nico im Akquise-Tool einen LinkedIn-Beitrag als gepostet (Knopf
«Gepostet»), schreibt das Tool den passenden Artikel in einem Commit in dieses
Repo: `einblicke/<pfad>/index.html` mit `titelbild.webp` (Bildkarte, sonst
`.jpg`) und `vorschau.jpg` (1200 × 630 für geteilte Links), dazu
`einblicke/index.html`, `einblicke/feed.xml`, `einblicke/sitemap.xml` (in
`robots.txt` eingetragen) und die Daten unter `src/einblicke/` (nicht
veröffentlicht). Kopf, Menü und Fusszeile stammen aus
`src/einblicke-vorlage.html`, die `tools/seo-build.mjs` aus «Über mich» erzeugt;
das Skript `assets/js/einblicke.js` ersetzt dort die Laufzeit für Menü und Kopf.
Die Seiten laden `statistik.js` wie alle anderen: Seitenaufrufe, Scrolltiefe,
Abschnitte und `einblicke-projekt-check` werden nach Einwilligung gemessen. Der
Projekt-Check kennt den Einstieg `?quelle=einblicke` (`EINSTIEGE` in
`src/seite.html`).

Ändern sich Kopf, Menü oder Stil, nach `seo-build` im Akquise-Repo
`npx tsx scripts/einblicke.ts neu-erstellen` ausführen (schreibt alle Artikel
mit der neuen Vorlage).

## Worker odera-stats

| Pfad | Zweck | Zugang |
| --- | --- | --- |
| `POST /e` | Ereignisse erfassen | nur Origin `https://odera.ch` und `https://www.odera.ch`, höchstens 40 Ereignisse und 12 KB pro Sendung, 60 Sendungen pro Minute und Gerät (nur im Arbeitsspeicher), 20'000 Ereignisse pro Tag |
| `GET /api/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | Zusammenfassung für das Akquise-Tool | `Authorization: Bearer <STATS_READ_TOKEN>`, sonst 401 |
| `GET /api/export?from=…&to=…` | Rohdaten als NDJSON | wie oben |

Antwort von `/api/summary`: Format «v: 1» wie `test/fixtures/summary-beispiel.json`
im Akquise-Repo (`v`, `range`, `generatedAt`, `totals`, `daily`, `pages`,
`sections`, `scroll`, `ctas`, `pricing`, `funnel`, `generator`, `chat`, `faq`,
`muster`, `outbound`, `referrers`, `campaigns`, `devices`, `countries`,
`vitals`, `errors`). Wird das Format geändert, steigt `v`, und das
Akquise-Tool muss angepasst werden.

Definitionen: Sitzung = zufällige ID mit mindestens einem Seitenaufruf.
Absprungrate = Sitzungen mit genau einem Seitenaufruf und weniger als 10
aktiven Sekunden. `reachRate` = Abschnitt gesehen geteilt durch Aufrufe der
Seite. `exitRate` = Anteil Aufrufe, die die letzten der Sitzung waren.
Vitals = 75. Perzentil.

## Betrieb

```bash
cd workers/odera-stats
npm install
npm test                 # Einheitstests
npm run migrate          # D1-Migration online
npx wrangler deploy      # Worker veröffentlichen
```

Das Secret `STATS_READ_TOKEN` ist im Worker gesetzt und muss gleich sein wie
im Akquise-Worker. Lokal testen: `.dev.vars` mit einem eigenen Test-Token
(nicht im Repo), `npx wrangler d1 migrations apply odera-stats --local`,
`npx wrangler dev`.

Website-Tests: `node tools/funktionstest.mjs http://127.0.0.1:8792 statistik`
(Banner, Einwilligung, Widerruf, gesendete Ereignisse; der Versand an
odera-stats wird abgefangen). Die übrigen Teile laufen wie bei einem
Besucher, der abgelehnt hat.

Bei Änderungen an `assets/js/statistik.js` die Version im Skript-Link in
`src/seite.html` erhöhen (`statistik.js?v=…`), weil Infomaniak Skripte eine
Woche zwischenspeichert.
