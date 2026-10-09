# SEO für odera.ch

Stand: 9. Oktober 2026. Ehrlich vorweg: Platz 1 kann niemand garantieren. Ziel ist, für realistische lokale
Suchanfragen gut zu ranken: technisch einwandfrei, klar im Angebot, eindeutige Signale. Der stärkste Hebel ausserhalb
der Website ist das Google-Unternehmensprofil (Checkliste unten).

## Technik (Teil 2)

- Jede Route liefert im HTML nur ihren eigenen, fertig gerenderten Inhalt: genau ein `h1`, keine `{{ }}`, 117 bis
  154 KB statt rund 415 KB. Die Vorlage mit allen Seiten liegt in `assets/js/vorlage.js` und wird erst nach dem
  ersten Zeichnen geladen. Gegenprobe: `node tools/gliederung.mjs` (Gliederung) und die Schleife aus dem Auftrag.
- `lang="de-CH"`, `canonical` auf sich selbst (404 ohne), Open Graph und Twitter Card je Seite, Favicon-Set und Manifest.
- `sitemap.xml` mit allen indexierbaren Adressen und `lastmod` (Datum der letzten Textänderung, `tools/sitemap-stand.json`).
  Nicht drin: die Detailseiten der Musterprojekte, 404, `/start/`, Impressum.

## Begriffsplan

| Seite | Hauptbegriff | Nebenbegriffe |
|---|---|---|
| `/` | Website erstellen lassen, Fixpreis | Webdesign Aargau, Webdesigner Freiamt, Website für KMU Schweiz |
| `/angebot/` | Website Kosten Schweiz | Website Preis KMU, Webdesign Fixpreis |
| `/ablauf/` | Website erstellen lassen Ablauf | Website Entwurf gratis |
| `/musterprojekte/` | Webdesign Beispiele KMU | Website Beispiel Handwerker |
| `/ueber-mich/` | Webdesigner Berikon | Webdesign Mutschellen, Webdesign Bremgarten |
| `/projekt-check/` | Website Angebot anfragen | Offerte Website |
| `/website-fuer-handwerker/` | Website für Handwerker | Schweiz, Aargau |
| `/website-fuer-restaurants/` | Website für Restaurants | Schweiz, Aargau |
| `/website-fuer-praxen/` | Website für Praxen | Schweiz, Aargau |
| `/website-fuer-laeden/` | Website für Läden | Schweiz, Aargau |

Keine Ortsseiten mit ausgetauschtem Ortsnamen (Brückenseiten). Der Einzugsgebiet-Satz steht im Fuss jeder Seite
und auf Über mich. Name, Ort und E-Mail überall gleich: «ODERA Design», «Berikon AG», «kontakt@odera.ch».

## Titel und Beschreibungen (Zeichen in Klammern)

| Seite | Titel | Beschreibung |
|---|---|---|
| `/` | Website erstellen lassen ab CHF 890 · ODERA Design (50) | Neue Website für Ihren Betrieb: fertiger Entwurf in 5 Arbeitstagen, gratis und unverbindlich. Fixpreis ab CHF 890. Webdesign aus Berikon AG. (140) |
| `/angebot/` | Was kostet eine Website? Fixpreise · ODERA Design (49) | Website, Standard oder Pro: drei Pakete zum Fixpreis ab CHF 890, einmalig und ohne Abo. Betrieb auf Wunsch ab CHF 240 pro Jahr. (127) |
| `/ablauf/` | Website erstellen lassen: der Ablauf · ODERA Design (51) | Vier Phasen, rund zwei Stunden Ihrer Zeit: Sie sehen den fertigen Entwurf, bevor Sie einen Franken bezahlen. So entsteht Ihre Website. (134) |
| `/musterprojekte/` | Webdesign Beispiele für Betriebe · ODERA Design (47) | Zwei Beispiel-Websites für Handwerk und Solar. Sehen Sie, wie Ihre neue Seite aussehen könnte, und testen Sie Ihren Betrieb in zehn Sekunden. (141) |
| `/ueber-mich/` | Nico Bodmer, Webdesigner aus Berikon · ODERA Design (51) | Sie reden mit dem, der die Seite baut: Nico Bodmer aus Berikon AG baut Websites für Betriebe im Aargau und in der ganzen Schweiz. (129) |
| `/website-fuer-handwerker/` | Website für Handwerker ab CHF 890 · ODERA Design (48) | Website für Ihren Handwerksbetrieb: Telefonnummer, Referenzbilder, Offerte-Knopf. Fertiger Entwurf in 5 Arbeitstagen, gratis. Fixpreis ab CHF 890. (146) |
| `/website-fuer-restaurants/` | Website für Restaurants und Cafés · ODERA Design (48) | Website für Ihr Restaurant oder Café: Karte, Öffnungszeiten und Reservation auf dem Handy. Entwurf in 5 Arbeitstagen, gratis. Fixpreis ab CHF 890. (146) |
| `/website-fuer-praxen/` | Website für Praxen ab CHF 890 · ODERA Design (44) | Website für Ihre Praxis: Termine, Team und Anfahrt klar gezeigt, Daten auf Wunsch in der Schweiz. Entwurf in 5 Arbeitstagen, gratis. Ab CHF 890. (144) |
| `/website-fuer-laeden/` | Website für Läden ab CHF 890 · ODERA Design (43) | Website für Ihren Laden: Sortiment, Öffnungszeiten und Anfahrt auf einen Blick. Fertiger Entwurf in 5 Arbeitstagen, gratis. Fixpreis ab CHF 890. (144) |
| `/projekt-check/` | Projekt-Check: Angebot in 6 Minuten · ODERA Design (50) | 18 kurze Fragen, rund 6 Minuten. Danach erhalten Sie ein Angebot zum Fixpreis und einen kostenlosen Entwurf Ihrer neuen Website, ohne Risiko. (141) |
| `/impressum/` | Impressum · ODERA Design (24) | (noindex) (0) |
| `/datenschutz/` | Datenschutzerklärung · ODERA Design (35) | Welche Daten beim Besuch von odera.ch, im Projekt-Check, im Chat und bei der Statistik mit Einwilligung bearbeitet werden. Keine Cookies. (137) |
| `/agb/` | Allgemeine Geschäftsbedingungen · ODERA Design (46) | Allgemeine Geschäftsbedingungen von ODERA Design für Websites zum Fixpreis: Entwurf, Zahlung nach Annahme, Übergabe, Betrieb und Hosting. (137) |

Trenner im Titel einheitlich «·». Das Impressum bleibt `noindex`, weil es die Wohnadresse nennt (Abweichung vom
Auftrag, siehe `docs/entscheidungen.md`).

## Strukturierte Daten (JSON-LD)

Eine Quelle: `strukturDaten()` in `tools/seo-build.mjs`, Werte aus `src/seite.html` (Preise, Betriebspreise,
LinkedIn-Adressen `ODERA_LINKEDIN_URL` und `LINKEDIN_PERSON_URL`, Branchenseiten).

| Seite | Typen |
|---|---|
| `/` | WebSite, LocalBusiness `#organisation` (Logo `odera-logo-512.png`, Adresse ohne Strasse, Einzugsgebiet Aargau, Zürich, Schweiz, `priceRange`, `sameAs` LinkedIn-Firma, `contactPoint`, drei Pakete), WebPage, FAQPage |
| `/angebot/` | WebPage, BreadcrumbList, Service mit OfferCatalog (drei Pakete, zwei Betriebsarten), FAQPage |
| `/ueber-mich/` | WebPage, BreadcrumbList, Person `#person` (`sameAs` LinkedIn-Profil, `worksFor` Organisation) |
| Branchenseiten | WebPage, BreadcrumbList, Service mit `serviceType` und `areaServed`, FAQPage |
| übrige | WebPage, BreadcrumbList |

Keine Bewertungen, keine Öffnungszeiten (kein Ladenlokal), FAQPage nur mit sichtbaren Fragen.

**Prüfung:** Schema.org Validator am 9. Oktober 2026 mit der Live-Startseite: 0 Fehler, 0 Warnungen (WebSite, LocalBusiness, WebPage, FAQPage). Den Google Rich Results Test bitte nach der Einrichtung der Search Console für Startseite, Angebot und eine Branchenseite laufen lassen.

## Gliederung h1 bis h3 (aus dem ausgelieferten HTML)

### `/` ✓

- h1 Sie sehen Ihre neue Website, bevor Sie bezahlen.
  - h2 So arbeiten meine Seiten
    - h3 Schreinerei Doppelmeter
    - h3 Firstlicht Solartechnik
  - h2 Drei Pakete, feste Preise
  - h2 So läuft es
    - h3 Anfrage
    - h3 Entwurf
    - h3 Umsetzung
    - h3 Übergabe
  - h2 Baukasten, Agentur oder ich?
  - h2 Sie reden mit dem, der die Seite baut
  - h2 Was Sie sich vielleicht fragen
  - h2 Fangen wir mit der ersten Frage an

### `/angebot/` ✓

- h1 Was Ihre Website kostet.
  - h2 Was soll Ihre Seite können?
  - h2 Was in jedem Paket steckt
  - h2 Wer betreibt Ihre Website danach?
    - h3 Sie hosten selbst
    - h3 Betrieb bei mir
    - h3 Betrieb bei mir, Schweiz
  - h2 Was nicht im Preis ist
  - h2 Was Sie sich jetzt vermutlich denken

### `/ablauf/` ✓

- h1 So entsteht Ihre Website.
  - h2 Vier Phasen bis zur fertigen Website
    - h3 Anfrage
    - h3 Entwurf
    - h3 Umsetzung
    - h3 Übergabe
  - h2 Ihr Aufwand auf einen Blick
  - h2 Danach
  - h2 Drei Dinge, an denen Projekte scheitern
    - h3 Die Inhalte kommen nie.
    - h3 Es reden zu viele mit.
    - h3 Die Zugangsdaten sind weg.
  - h2 Schritt 1 dauert rund 6 Minuten.

### `/musterprojekte/` ✓

- h1 Zwei Betriebe, zwei eigene Seiten.
  - h2 Schreinerei Doppelmeter
  - h2 Firstlicht Solartechnik
  - h2 Sehen Sie Ihren Betrieb in zehn Sekunden
  - h2 Ihr Betrieb sähe anders aus. Erzählen Sie mir davon.

### `/ueber-mich/` ✓

- h1 Wer das macht
  - h2 Ausbildung und Beruf
  - h2 Zusagen statt Kundenstimmen
    - h3 Fixpreis
    - h3 Fester Termin
    - h3 Kein Lock-in
  - h2 Gängige Technik, keine Eigenbauten
  - h2 Höchstens zwei Projekte gleichzeitig
    - h3 Wann Sie mich erreichen
  - h2 Schreiben Sie mir. Antwort spätestens am nächsten Abend.

### `/website-fuer-handwerker/` ✓

- h1 Website für Handwerksbetriebe
  - h2 Was auf Ihre Website gehört
    - h3 Telefonnummer in jedem Bildschirm
    - h3 Referenzbilder Ihrer Arbeiten
    - h3 Ein Knopf für die Offerte
    - h3 Ihr Einzugsgebiet
    - h3 Jede Leistung auf eigener Seite
  - h2 So sieht eine Handwerker-Website aus
    - h3 Schreinerei Doppelmeter
  - h2 In vier Schritten online
    - h3 Anfrage
    - h3 Entwurf
    - h3 Umsetzung
    - h3 Übergabe
  - h2 Fixpreis, einmalig
  - h2 Was Sie sich vielleicht fragen
  - h2 Sehen Sie Ihre Website, bevor Sie bezahlen.

### `/website-fuer-restaurants/` ✓

- h1 Website für Restaurants und Cafés
  - h2 Was auf Ihre Website gehört
    - h3 Die Karte als Text
    - h3 Öffnungszeiten auf einen Blick
    - h3 Reservieren ohne Umweg
    - h3 Bilder von Raum und Gerichten
    - h3 Anlässe und Gruppen
  - h2 Sehen Sie Ihr Lokal in zehn Sekunden
  - h2 In vier Schritten online
    - h3 Anfrage
    - h3 Entwurf
    - h3 Umsetzung
    - h3 Übergabe
  - h2 Fixpreis, einmalig
  - h2 Was Sie sich vielleicht fragen
  - h2 Sehen Sie Ihre Website, bevor Sie bezahlen.

### `/website-fuer-praxen/` ✓

- h1 Website für Praxen
  - h2 Was auf Ihre Website gehört
    - h3 Der Weg zum Termin
    - h3 Team und Ausbildung
    - h3 Behandlungen verständlich erklärt
    - h3 Anfahrt und Zugang
    - h3 Daten in der Schweiz
  - h2 Sehen Sie Ihre Praxis in zehn Sekunden
  - h2 In vier Schritten online
    - h3 Anfrage
    - h3 Entwurf
    - h3 Umsetzung
    - h3 Übergabe
  - h2 Fixpreis, einmalig
  - h2 Was Sie sich vielleicht fragen
  - h2 Sehen Sie Ihre Website, bevor Sie bezahlen.

### `/website-fuer-laeden/` ✓

- h1 Website für Läden
  - h2 Was auf Ihre Website gehört
    - h3 Ihr Sortiment mit Bildern
    - h3 Öffnungszeiten und Feiertage
    - h3 Anfahrt und Parkplätze
    - h3 Fragen per Anruf oder Formular
    - h3 Google-Unternehmensprofil
  - h2 Sehen Sie Ihren Laden in zehn Sekunden
  - h2 In vier Schritten online
    - h3 Anfrage
    - h3 Entwurf
    - h3 Umsetzung
    - h3 Übergabe
  - h2 Fixpreis, einmalig
  - h2 Was Sie sich vielleicht fragen
  - h2 Sehen Sie Ihre Website, bevor Sie bezahlen.

### `/projekt-check/` ✓

- h1 Projekt-Check von ODERA Design
  - h2 Wie heisst Ihr Betrieb?

### `/datenschutz/` ✓

- h1 Datenschutzerklärung
  - h2 1. Verantwortliche Person
  - h2 2. Besuch dieser Website
  - h2 3. Keine Cookies, Statistik nur mit Einwilligung
  - h2 4. Schriften
  - h2 5. Projektanfrage über den Projekt-Check
  - h2 6. Welche Angaben Sie mir übermitteln
  - h2 7. Bearbeitung Ihrer Anfrage und Bekanntgabe ins Ausland
  - h2 8. Chat-Assistent
  - h2 9. Website-Vorschau
  - h2 10. Aufbewahrung und Löschung
  - h2 11. Externe Links
  - h2 12. Ihre Rechte
  - h2 13. Änderungen
  - h2 14. Statistik mit Ihrer Einwilligung

### `/impressum/` ✓

- h1 Impressum
  - h2 1. Verantwortlich für diese Website
  - h2 2. Kontakt
  - h2 3. Rechtsform und Mehrwertsteuer
  - h2 4. Verantwortlich für den Inhalt
  - h2 5. Bildnachweise

### `/agb/` ✓

- h1 Allgemeine Geschäftsbedingungen
  - h2 1. Geltungsbereich und Vertragsschluss
  - h2 2. Ablauf des Projekts
  - h2 3. Mitwirkung der Kundin oder des Kunden
  - h2 4. Preise und Zahlung
  - h2 5. Hosting und Domain während der Entwicklung
  - h2 6. Übergabe
  - h2 7. Betrieb nach der Übergabe
  - h2 8. Backups
  - h2 9. Gewährleistung
  - h2 10. Haftung
  - h2 11. Inhalte des Kunden
  - h2 12. Urheberrecht und Nutzungsrechte
  - h2 13. Vertraulichkeit
  - h2 14. Beendigung
  - h2 15. Anwendbares Recht und Gerichtsstand
  - h2 16. Unverbindliche Online-Vorschau
  - h2 17. Lizenzbilder
  - h2 18. Domain
  - h2 19. Änderungen


## Checkliste für Nico (ausserhalb der Website)

1. **Google Search Console:** Domain-Property für odera.ch anlegen, per DNS-TXT beim Domain-Anbieter bestätigen,
   `sitemap.xml` einreichen, Startseite prüfen und Indexierung beantragen. Favicon und Logo übernimmt Google erst
   nach einem neuen Crawl, das kann Tage bis Wochen dauern.
2. **Bing Webmaster Tools:** Website aus der Search Console importieren.
3. **Google-Unternehmensprofil:** Kategorie «Webdesigner», als Dienstleister mit Einzugsgebiet, Wohnadresse
   ausblenden, Logo und Titelbild hochladen, Leistungen mit Preisen, Website-Link `https://odera.ch/?k=gbp`.
   Echte Kundinnen und Kunden um eine Bewertung bitten, sobald es sie gibt. Keine gekauften Bewertungen.
4. **Verzeichnisse:** local.ch und search.ch mit exakt denselben Angaben wie auf der Website.
5. **LinkedIn:** Unternehmensseite mit Website-Link, persönliches Profil mit Link auf odera.ch.
6. **Verweise von aussen:** nico-bodmer.ch verlinkt auf odera.ch.
7. **Monatlich:** Klicks, Impressionen und Positionen pro Suchbegriff in der Search Console ansehen und mit dem
   Statistik-Dashboard der Akquise-App vergleichen.
