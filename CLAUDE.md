# CLAUDE.md: Entscheidungen und offene Punkte für odera.ch

Kurzfassung für die Arbeit an diesem Repo. Technische Details stehen im `README.md`,
hier steht nur, was festgelegt wurde und was noch offen ist. Stand: 30. Oktober 2026.

## Feste Regeln

- **Sichtbare Texte:** Schweizer Rechtschreibung (ss, nie ß), Sie-Form, keine Gedankenstriche
  (– oder —). Berichte an Nico auf Deutsch im selben Stil.
- **Nichts erfinden:** keine Kundenstimmen, Kundenzahlen, Statistiken oder Auszeichnungen. Jede Zahl
  muss belegbar sein. Preise, Paketinhalte, Fristen und Garantien nie selbst ändern, nur vorschlagen.
- **Datenschutz als Markenversprechen:** Kein Tracking ohne Einwilligung, keine Cookies. Einzige
  Ausnahme ist die Statistik mit Opt-in nach Teil 11, mit eigener Datenbank odera-stats (EU) und
  ohne Personendaten. Sonst keine Pop-ups, keine Dark Patterns, keine weitere Datenbank, keine
  Secrets im Browser, keine URL-Parameter mit Personendaten.
- **Repo ist öffentlich** (GitHub Pages). Keine Secrets, keine Personendaten, keine Business-Interna (Firmen und
  Kontakte aus der Akquise, Kundendaten, Statistikwerte, Kampagnen). IBM auf odera.ch nie nennen. Die Portfolio-Kopie
  `/muster/portfolio/` ist seit 13. Oktober 2026 gelöscht (private Adresse, nirgends verlinkt). Interne Notizen gehören ins private Akquise-Repo.
- **Nur Gratis-Pläne:** GitHub Pages, Cloudflare Workers und Workers AI, Resend. Nie nach Schlüsseln
  im Chat fragen.
- **Veröffentlichen:** ohne weiteres OK, wenn alles grün ist (Funktionstests, Kontrast, Lighthouse
  nicht schlechter, Konsole sauber). Sonst stoppen und berichten.
- **Desktop ab 1024 px** ist abgenommen. Änderungen für kleinere Breiten gehen in den Block
  `<style id="mobil">` und werden per Pixelvergleich bei 1024 und 1440 px gegen `main` geprüft.

## Arbeitsweise

- Stack: Quelle ist `src/seite.html` mit Claude-Design-Vorlagen (`<x-dc>`), kein Astro. `index.html` und alle
  Routen sind erzeugt (nur eigener Inhalt, ohne Vorlage), die Vorlage liegt erzeugt in `assets/js/vorlage.js`.
  Tests: `node tools/funktionstest.mjs`, `node tools/links-pruefen.mjs`. Nach **jeder** Änderung
  `node tools/seo-build.mjs` laufen lassen, er erzeugt Unterseiten, Vorab-Block, Sitemap und das
  Wissen des Chat-Assistenten.
- Änderungen nur in der Vorlage ab `<x-dc>` und im `<head>`. Der Vorab-Block `<!-- vorab:… -->` wird
  überschrieben. Die rohe Vorlage enthält jedes Element ein zweites Mal unsichtbar: im Code
  `this.sichtbar(sel)` verwenden, in Tests `:visible`.
- Fallen in der dc-Laufzeit: camelCase-Attribute werden umgeschrieben (in CSS-SVGs `%76iewBox`
  schreiben); native Ereignis-Attribute und `src="{{ … }}"` laufen schon in der rohen Vorlage, darum
  iframes und Lade-Listener per Code erzeugen.
- Veröffentlichen: Feature-Branch, Fast-Forward auf `main`, Push. odera.ch zeigt per DNS auf GitHub Pages, das
  baut nach jedem Push. Der Infomaniak-Workflow hat keine Secrets und überspringt den Upload (Stand 12. Oktober 2026). Ändert sich etwas, das der Chat-Assistent wissen soll
  (`chat-proxy/src/wissen.js`), danach `chat-proxy` deployen. Ändern sich Formular oder Prüfregeln,
  zuerst `anfrage-proxy`, dann `chat-proxy` deployen.
- Git-Identität in diesem Repo (lokal gesetzt): «Nico Bodmer» mit der GitHub-noreply-Adresse, nie die private Adresse.
- Commits werden über 1Password signiert und scheitern oft mit «failed to fill whole buffer».
  Mehrmals versuchen, sonst Nico bitten, 1Password zu entsperren.
- Headless-Testläufe räumen ihre Chrome-Profile im System-Temp auf. Am 1. Oktober 2026 hatten
  liegengebliebene Profile die Platte gefüllt (26 GB).

## Wichtige Entscheidungen

### Projekt-Check (Formular)
- Jedes Feld ist als Pflichtfeld oder optional gekennzeichnet, optionale Auswahlfragen auch. «Weiter» steht nur, wo es
  etwas tut (Regel unten), ist dann aber nie gesperrt, darunter «Noch offen: …». Fehler zeigen sich am Feld, mit Fokus
  auf dem ersten Fehler, ab zwei Fehlern mit Zusammenfassung. Tippfehler-Vorschläge «Meinten Sie …?».
- «Anfrage senden» ist nie gesperrt (aria-disabled nur bei «Sendet …» und offline). Ohne Häkchen bei AGB und
  Datenschutz steht der Fehler direkt am Häkchen, mit Fokus dorthin.
- Browser und Worker prüfen mit denselben Regeln (`anfrage-proxy/src/regeln.js`).
- Fehlerfarbe `#B42318` (AA auf allen Flächen).
- Mindestdauer bis zum Senden: 20 s (voll), 6 s (Kurzversion). Schnellere Anfragen lehnt der Worker
  ab, auch in Tests. Der Start (`startZeit`) wird im Tab gemerkt und beim «Fortsetzen» übernommen. Fehlt noch Zeit,
  wartet die Seite sie vor dem Senden still ab («Sendet …»). Die Tests stellen den gemerkten Start dafür zurück
  (`startZurueck()` in `tools/funktionstest.mjs`).

### Projekt-Check mit sechs Fragen (seit 29. Oktober 2026, Branch `projekt-check-kurz`)
- Ein Gratis-Entwurf ist schnell gebaut. Gefragt wird darum nur, was es für den Entwurf und eine grobe Preisschätzung
  braucht, alles andere klärt Nico nach dem Entwurf.
- Fragen: Ziel, Branche, Website heute (Folgefrage «Was stört» oder «Wobei brauchen Sie Unterstützung?»), Funktionen,
  «Ihr Betrieb» (Name, Ort, Angebot), Kontakt (mit Termin-Chips). Das Häkchen für die Referenz steht im Ergebnis unter dem Preis (siehe unten). Entfernt: Region, Kunden,
  Seitenzahl, Stil, Vorbilder, Farben, Domain, Hosting, Logo, Texte, Fotos als eigene Fragen.
- Paket nur aus den Funktionen plus Mindestpaket aus dem Einstieg (Paketkarten Standard und Pro, Doppelmeter, Firstlicht).
- Einfachauswahl geht nach 400 ms selbst weiter (nicht beim Ändern, nicht bei Zusatzfeld), seit 30. Oktober 2026 mit
  Häkchen auf der gewählten Karte. Fortschritt siehe «Projekt-Check weiter». Bei 390 × 664 px sind alle Antworten ohne
  Scrollen sichtbar (ausser Funktionen-Karten),
  Test `node tools/funktionstest.mjs … handy`. Senden-Ansicht unter 768 px: Zustimmung und Senden direkt unter dem
  Ergebnis, Mail-Vorschau hinter «Ihre Angaben ansehen».
- Statistik: `projektcheck_step` trägt den Schlüssel der Frage in `ziel` (nie Antworten). Braucht den Worker `odera-stats`
  in der neuen Fassung, sonst wird der Schlüssel verworfen.

### Projekt-Check weiter (seit 30. Oktober 2026, Branch `projekt-check-weiter`)
- **Weiter-Regel** (`weiterNoetig()`): Einfachauswahl ohne Antwort ohne «Weiter» und ohne «Noch offen». «Weiter», wenn
  die Frage beim Anzeigen schon beantwortet ist (Zurück, Antwort-Pillen, Einstieg), die Antwort ein Zusatzfeld öffnet,
  beim Ändern, bei Mehrfachauswahl, Funktionen und Feldern. Optionale Fragen ohne Antwort: Textknopf «Überspringen».
  Bis zum automatischen Weiter ändert sich die Leiste nicht (`autoLeiste`). Unter 1024 px ohne Knopf nur «Zurück»
  kompakt, auf Frage 1 ohne Antwort keine Leiste. Enter wirkt auf Karten, Knöpfen, Links und Häkchen wie bei ihnen
  üblich, als «Weiter» nur ohne Fokus auf einem bedienbaren Element.
- **Fortschritt** (`fortschritt()`): Folgefragen behalten die Nummer ihrer Hauptfrage («Frage 3 von 6 · Zusatzfrage»),
  der Balken steht dann zwischen 3 und 4. Die Gesamtzahl zählt nur Hauptfragen ohne die durch Einstiege übersprungenen und
  ändert sich während des Checks nie. `aria-valuenow` ganzzahlig, `aria-valuetext` mit dem sichtbaren Text. Balken in Kobalt.
- **Zurück im Browser**: pro Frage ein Verlaufseintrag auf derselben Adresse, im Zustand nur Schritt und Tiefe, keine
  Antworten (`checkVor()`, `checkPop()`). Zurück geht eine Frage zurück, auf Frage 1 hinaus, im Ergebnis zur letzten Frage.
  Knopf «Zurück» und Antwort-Pillen gehen über denselben Verlauf. Nach dem Senden `replaceState`: Zurück führt hinaus.
  `statistik.js` zählt dabei keinen Seitenaufruf (gleicher Pfad). Test: `node tools/funktionstest.mjs … verlauf`.
- **Seitliches Scrollen** immer gegen `document.documentElement.clientWidth` messen, nie gegen `innerWidth` (wächst in der
  Handy-Emulation mit) und auch während Animationen (Test `senden` bei 320, 390 und 768 px). Unter 768 px blendet das
  Mail-Fenster senkrecht ein, `.eg-wrap` und unter 1024 px der Fragenbereich haben `overflow-x: clip`.
- Ergebnis unter 768 px: Paket, Preis, Umfang, Zusätze, dann Zustimmung und «Anfrage senden», danach Vergleich und
  «Antworten noch einmal durchsehen». Unter dem Preis «Paket … wegen: …» mit «Funktionen ändern», nur wenn das Paket
  aus den Funktionen kommt.
- **Referenzrabatt CHF 200** (seit 30. Oktober 2026, Nicos Vorgabe): für jedes Paket gleich, Konstante `REFERENZ_RABATT_CHF`
  (vorher je Paket fest 300, 610 und 1'000). Das Häkchen ist eine weisse Karte mit Limetten-Marke «CHF 200 Rabatt», angehakt
  limettengrün.
- **Referenz im Ergebnis** (Teil 7, auf Nicos OK): Das Häkchen «Sie dürfen meine fertige Website als Beispiel zeigen …» steht
  direkt unter dem Preis (`REFERENZ_HAKEN`, `#eg-referenz`), nicht mehr bei «Wie erreiche ich Sie?». Angehakt gilt
  `REFERENZ_JA`, der Preis wechselt sofort (durchgestrichen mit Referenzpreis). Auf dem Handy rückt «Anfrage senden» dadurch
  rund 130 px nach unten (bei 390 × 664 px etwa 800 statt 650 bis 710 px von oben).
- **Knopfzeile auf dem Desktop** (Teil 7): Auf «Was soll die Seite können?» und «Wie erreiche ich Sie?» bleibt die Leiste mit
  «Zurück» und «Weiter» ab 1024 px unten angeheftet (`data-anheften`), wie auf dem Handy.
- Weniger Ablenkung: Kurzversion-Link nur auf Frage 1 ohne Antwort, KI-Hinweis nur bei Auswahlfragen und Funktionen,
  Platzhalter mit «z. B.», Ziffern in den Karten nur mit Maus (sonst Auswahlkreis, immer `aria-hidden`).

### Statistik (Teil 11, live seit 8. Oktober 2026)
- Eigener Worker `odera-stats` in `workers/odera-stats/`, D1 `odera-stats` in der EU (Jurisdiktion eu),
  Rohdaten nach 14 Monaten gelöscht. Referenz für Ereignisse, IDs und API: `docs/tracking.md`.
- Skript `assets/js/statistik.js` (Version im Link `?v=` erhöhen), Banner mit gleichwertigem Zustimmen und
  Ablehnen, erscheint nach der ersten Handlung oder nach 2,5 s. Wahl im localStorage, Widerruf über
  «Einstellungen» in der Fusszeile und im Datenschutz Abschnitt 14.
- Abschnitte der Startseite tragen `data-abschnitt`. Neue Abschnitte und Branchenseiten bekommen es auch und
  werden in `docs/tracking.md` und in `config/abschnitte.json` im Akquise-Repo nachgetragen.
- Datenschutz: Abschnitt 3 sagt neu «Statistik nur mit Einwilligung» (die alte Aussage «keine Statistik» wäre
  falsch geworden), Abschnitt 14 neu. Fusszeile: «Keine Cookies. Statistik nur mit Ihrer Einwilligung.»
- Tests: `node tools/funktionstest.mjs … statistik`. Die übrigen Teile und `links-pruefen` laufen wie bei
  einem Besucher, der abgelehnt hat.

### Einblicke (Blog, seit 8. Oktober 2026)
- `/einblicke/` mit Übersicht und Artikeln ist statisches HTML ohne React und ohne Nachladen. Geschrieben wird es
  vom Akquise-Tool (privates Repo `odera-akquise`) über die GitHub-API, ein
  Commit pro Artikel, Token nur mit Contents-Recht auf dieses Repo. Nicht von Hand ändern.
- Vorlage `src/einblicke-vorlage.html` erzeugt `tools/seo-build.mjs` aus «Über mich»: gleicher Kopf, gleiche
  Fusszeile, beide Menüs fest im HTML, `assets/js/einblicke.js` für Menü, Kopf und Unterstrich, Stil in
  `assets/css/einblicke.css`. Nach Änderungen an Kopf oder Stil im Akquise-Repo `scripts/einblicke.ts neu-erstellen`.
- Menüpunkt «Einblicke» zwischen Musterprojekte und Über mich. Die Umbruchstellen des Kopfs sind dafür neu
  gemessen (Abstand 24 px ab 1379 px, kurzer Knopf ab 1319 px, Menü ab 1259 px).
- SEO: eigene Titel, Beschreibung, canonical, Open Graph mit Bildkarte, JSON-LD BlogPosting und BreadcrumbList,
  eigene Sitemap `einblicke/sitemap.xml` (in `robots.txt`), RSS `einblicke/feed.xml`. Ohne Artikel ist die
  Übersicht `noindex`.
- Am Ende jedes Artikels der Projekt-Check (`?quelle=einblicke`). Tests: `node tools/funktionstest.mjs … einblicke`.
- Übersicht seit 30. Oktober 2026: zwei Reihen Beiträge, die dritte angeschnitten mit Verlauf, darunter «Mehr anzeigen». Nur in
  `assets/js/einblicke.js` und `einblicke.css` (Generator unverändert, alle Karten bleiben im HTML, ohne JavaScript alles sichtbar).
- Seit 13. Oktober 2026 schreibt der Generator (`src/logik/einblicke.ts` im Akquise-Repo) die SEO wie die übrigen
  Seiten: Titel-Trenner «·», Zusatz « · ODERA Design» nur bis 65 Zeichen, sonst ohne, zu lange Titel mit Kurztitel
  (`titel_kurz` in `src/einblicke/<pfad>.json`, die h1 bleibt), Twitter-Angaben, BlogPosting mit `@id` von Person
  und Firma, `dateModified` nie vor dem Datum, Autorenzeile mit Link auf /ueber-mich/. Beim Veröffentlichen und
  Entfernen schreibt er auch den Teil Einblicke in `sitemap.xml` und `llms.txt`, mit denselben Zeilen wie `seo-build`
  (beide lesen `src/einblicke/index.json`). Nach Änderungen an Kopf, Stil oder Fusszeile: `seo-build`, dann im
  Akquise-Repo `cd scripts && npx tsx einblicke.ts neu-erstellen` (oder ohne GitHub `lokal ../../odera-design`).
- Seit 9. Oktober 2026: Übersicht und Artikel nutzen die Bänder des Gestaltungssystems (`.band`, `.wrap`, `.inner`,
  `.augenbraue`, `.titel-1`, `.einleitung`, `.karte`, Abschluss als `band-kobalt`) und haben damit dieselben Abstände
  wie /ablauf/. `einblicke.css` lädt als letztes vor `</head>` und setzt keine Abschnittsabstände. LinkedIn-Link auf die
  Firmenseite aus `ODERA_LINKEDIN_URL` (Marke `einblicke:linkedin-firma` in der Vorlage), immer neuer Tab.

### Hosting nach der Übergabe (seit 21. Oktober 2026, Branch `mobile-hero-hosting`)
- Kein Betrieb durch ODERA mehr, kein Abo, kein Jahresvertrag. Das Hosting wird auf den Namen des Kunden eingerichtet,
  standardmässig bei einem kostenlosen Anbieter, auf Wunsch bei einem Schweizer Hoster (Jahresgebühr direkt dort).
  Änderungen nach der Übergabe zu `STUNDENSATZ_CHF` (120) pro Stunde mit Schätzung vorab.
- Angebot: Abschnitt «Nach der Übergabe» unter dem alten Anker `#betrieb` (Abschnitts-ID `betrieb` bleibt). AGB
  Paragrafen 5 bis 8 auf Nicos Auftrag umformuliert (Ausnahme von «nur ergänzen»), Stand `STAND_RECHTSTEXTE`.
- Projekt-Check: Die Frage `HOSTING` gibt es seit 29. Oktober 2026 nicht mehr (siehe «Projekt-Check mit sechs Fragen»).
  Das Ergebnis nennt beim Hosting «auf Ihren Namen eingerichtet, ohne Abo».
- Paket Pro (Texte selbst bearbeiten, Terminbuchung): Punkt 03 «Keine Updates nötig» gilt ausdrücklich nur für die
  Website selbst, nicht für Dienste, die ein Pro-Zusatz nutzt.

### Hero auf dem Handy (seit 21. Oktober 2026)
- Unter 768 px: Badge mit Auslastung, Titel, Satz, ein Knopf, Tablet-Rahmen mit Handy, Vertrauenszeile, Kennzahlen,
  Chevron. Kennzahlen unter 430 px als drei Zeilen (Zahl links, Text rechts). Satz unter dem Titel mit `text-wrap: balance`,
  Abstand zu den Knöpfen `var(--a-4)` (`.einleitung.hero-lead`, seit 30. Oktober 2026 wieder auch ab 768 px). Frage mit Chips und «Preise ansehen» nur ausgeblendet. Kennzahlen stehen einmal im Markup (`.hero-zahlen`),
  ab 768 px als dunkler Streifen wie vorher. Titel zweizeilig, Grösse über `cqi` aus der Textspalte.
- Kopf unter 1024 px mit «Check starten» und hellgrauem Menüknopf, Logo bis 360 px leicht verkleinert (`zoom`), unter
  360 px stärker (bei 320 px ragte die Zeile sonst 27 px über den Rand).

### Musterprojekt Doppelmeter
- Eigene statische Seite unter `/musterprojekte/doppelmeter/`, `noindex`, nicht in der Sitemap.
  `/muster/doppelmeter.html` leitet weiter. Schriften lokal, Fotos von Unsplash, Nachweise im Impressum.
- Overlay auf der Musterprojekte-Seite mit Ladezustand und «In neuem Tab öffnen». Das iframe entsteht
  erst beim Öffnen. Unter 768 px öffnet der Link die Seite direkt.
- Angezeigte Ladezeit aus der Konstante `LADEZEIT` in `index.html`.

### Handy und Tablet (unter 1024 px)
- Eigenes blaues Vollbild-Menü, iOS-sichere Scroll-Sperre, Wisch nach unten schliesst,
  `theme-color` wird blau. Kopf 56 px, gleitet beim Runterscrollen weg.
- Startseite: erster Bildschirm nur Titel, Satz, vier Antwort-Chips und Vertrauenszeile.
- Pakete als wischbare Karten (Klasse `wisch`), Standard zuerst. Begründung: ein
  statt zweieinhalb Bildschirme.
- Projekt-Check: Weiter-Leiste über der Tastatur (`visualViewport`, `--tastatur`).
- Chat unter 768 px als Blatt von unten.

### Generator «Sehen Sie Ihren Betrieb in zehn Sekunden» (Seite Musterprojekte)
- Modul `assets/js/generator.js`, lädt erst beim Heranscrollen. Nichts wird gespeichert oder gesendet.
- Sechs Branchen (Handwerk, Praxis, Beratung, Gastronomie, Verkauf, Verein) mit den Fotos, Texten und
  Farben aus Nicos Vorgabe. Fotos in `assets/img/generator/`, von Nico geliefert, Unsplash-Lizenz,
  Fotografen im Impressum. Das frühere Vereinsfoto mit Kindern ist bewusst entfernt.
- Umschalter Desktop/Handy, «Beispiel zeigen», Suchergebnis-Karte mit Hinweis zur Platzierung.
- Übergabe an den Projekt-Check nur über eine JavaScript-Variable (`generatorCheck`), keine
  URL-Parameter. Nur vorausfüllen. Verein und andere unbekannte Branchen kommen als «Andere» mit Text.
- Eine frühere Fassung mit zwölf Branchen und drei Stilen wurde auf Nicos Wunsch verworfen.

### Rechtstexte
- Datenschutz, AGB und Impressum teilen ein Stand-Datum: `STAND_RECHTSTEXTE` (zurzeit «Oktober 2026»).
- Die Datenschutzerklärung hat nur noch die Fassung mit direktem Senden. Die alte Variante (`dsMail`, Anfrage per
  eigenem E-Mail-Programm) ist am 9. Oktober 2026 aus der Vorlage entfernt worden.
- Neu im Oktober 2026: Datenschutz Abschnitt 9 «Website-Vorschau», AGB Paragrafen 16 bis 18
  (Online-Vorschau, Lizenzbilder, Domain), Bildnachweis der Vorschau im Impressum. Inhalte und
  Bildrechte der Kunden regelt der bestehende Paragraf 11, darum dort nichts ergänzt.
- Bestehende Klauseln werden nie umformuliert, nur ergänzt und sauber weiternummeriert.

### Musterprojekte (`musterprojekte/`), Regeln für jedes Muster

Beispielseiten erfundener Betriebe (Doppelmeter, Firstlicht). Für jedes Muster gilt:

- Beispiel-Leiste auf jeder Seite («Beispielseite von ODERA Design. Der Betrieb
  ist frei erfunden.») mit Link zurück zu odera.ch und zum Projekt-Check
  (`?quelle=<muster>`, passender Eintrag in `EINSTIEGE` in `index.html`).
  Hinweis im Fuss wiederholen.
- Im Overlay von odera.ch blenden die Muster ihre Beispiel-Leiste aus (`html.im-rahmen`),
  die Overlay-Leiste zeigt dann den Hinweis. Neue Muster brauchen dieselbe Erkennung.
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

### Firstlicht

- Seiten in `musterprojekte/firstlicht/*.html` sind erzeugt. Bearbeiten in
  `tools/firstlicht/vorlagen/` und `tools/firstlicht/css/`, dann
  `npm run firstlicht:build`. Die CSP enthält Hashes der Inline-Skripte.
- Vor dem Commit: `npm run firstlicht:qa` (Build, Tests, Regelprüfung, Browser).
  In der Cloud `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` setzen.
- Details, Annahmen-Pflege und Befehle: `musterprojekte/firstlicht/README.md`.

### Redesign Oktober 2026 (Auftrag in 13 Teilen)
- Gestaltungssystem im Block `<style id="system">` (Tokens, Bänder, Karten, Icons). Weiss nie als Abschnittsfläche.
  Pro Hauptseite mindestens zwei Bänder auf Tinte oder Kobalt. Entscheidungen und Messwerte: `docs/entscheidungen.md`,
  `docs/redesign-vorher-nachher.md`, `docs/seo.md`.
- Musterprojekte: genau zwei (Doppelmeter, Firstlicht), je ein eigener Umschalter Desktop/Handy. Gerätebilder aus
  `tools/screenshots-muster.mjs` (nach Änderungen an einem Muster neu erzeugen). Portfolio nur noch auf Über mich.
- Phasen-Komponente (`PHASES`, `phasen`) für Ablauf und Startseite, Zeilen chronologisch (`zuerst`).
- Branchenseiten aus `BRANCHEN_SEITEN`, Einstiege `branche-…` füllen die Branche im Projekt-Check vor.
- LinkedIn nur als gewöhnliche Links, Adressen in `ODERA_LINKEDIN_URL` und `LINKEDIN_PERSON_URL`.
- Impressum bleibt `noindex` (Wohnadresse). Titel-Trenner «·». Prüfskripte: `tools/gliederung.mjs`, `tools/messen.mjs`,
  `tools/lighthouse.mjs`.

## Offene Punkte

- [x] **Deploys nach dem SEO-Audit:** am 13. Oktober 2026 `odera-chat` (07:58) und `odera-akquise` (07:59) deployt.
      Geprüft über Cloudflare: Wissensbasis live identisch mit `main`, Generator der Einblicke in der neuen Fassung.
- [ ] **Online-Prüfung nach dem Merge** (Nico): W3C-Validator, Rich Results Test, validator.schema.org.

- [ ] **Ladezeit Doppelmeter auf dem Handy:** 1,65 bis 2,5 s mit gedrosseltem Netz, Ziel war 1 s.
      Desktop 0,4 bis 0,5 s.
- [ ] **Vereinsfoto:** Auf dem Ball ist der Schriftzug «adidas» lesbar. Nico entscheidet, ob der
      Ausschnitt geändert wird.
- [ ] **Link «nico-bodmer.ch»** in der Portfolio-Karte hat 4 px mehr Innenabstand (Tippfläche,
      Lighthouse). Nico kann das zurücknehmen lassen.
- [ ] **Test auf echtem iPhone** nach Nicos Checkliste (Menü, Wischen, Projekt-Check mit Tastatur,
      Chat, untere Leiste) steht aus. Echte Tastatur und VoiceOver wurden nur simuliert.
- [ ] **Cloudflare im Datenschutz:** Registerstatus am 28. September 2026 «Active, Re-certification
      under Review». Status nachprüfen und Text bei Bedarf anpassen.
- [ ] **Unzuverlässiger Test:** `einstiege` bei 390 px scheitert manchmal beim Senden, wenn er direkt
      nach anderen Tests läuft. Einzeln grün.
- [x] **`README.md` nicht auf odera.ch:** am 12. Oktober 2026 geprüft, `/README.md`, `/CLAUDE.md` und
      `/docs/tracking.md` liefern 404 (`_config.yml`). Auf GitHub bleiben sie öffentlich.
- [ ] **Trichter im Akquise-Tool** (Tab «Website»): zeigt weiterhin «Frage N» aus `funnel.steps`. Seit dem Projekt-Check mit
      sechs Fragen (29. Oktober 2026) ist eine Nummer nicht mehr fest einer Frage zugeordnet (Folgefragen, Einstiege), und
      Zeiträume über den Wechsel mischen alte und neue Nummern. Auswertung pro Frage über `ziel` in den Rohdaten; die Anzeige
      pro Frage (Summary von odera-stats und Website-Tab) ist noch nicht gebaut.
- [ ] **Funktionen auf dem Handy** sind bei 390 × 664 px rund 1,6 Bildschirme hoch (vorher 2,4, Ziel rund 1,5). Mehr ginge nur
      mit kürzeren Titeln oder Etiketten.
- [ ] **Alte lokale Branches** aufräumen (`fehler`, `mobil`, `generator`, `generator2` und ältere
      sind in `main` enthalten). Ausnahme: `chat-assistent` hat Commits, die nicht in `main` sind.
      Vor dem Löschen prüfen.
