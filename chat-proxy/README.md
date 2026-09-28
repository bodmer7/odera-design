# Chat-Proxy für den Assistenten auf odera.ch

Kleiner Cloudflare Worker zwischen der Website und einem Sprachmodell von **Cloudflare Workers AI**.
Er prüft jede Anfrage, begrenzt die Menge und gibt die Antwort an den Browser weiter.
Alles läuft im **Gratis-Plan** von Cloudflare: kein Zahlungsmittel, kein API-Schlüssel, kein Secret.
Die Website selbst bleibt statisch auf GitHub Pages. Dieser Ordner wird dort nicht veröffentlicht (`_config.yml`).

```
Browser (assets/js/chat.js)  ->  Worker (dieser Ordner)  ->  Workers AI (Binding AI)
```

## Dateien

| Datei | Inhalt |
|---|---|
| `src/index.js` | Worker: CORS, Prüfung, Rate Limit, Tageszähler, Aufruf von Workers AI |
| `src/regeln.js` | Grenzen (Länge, Verlauf 6, 8 pro 10 Minuten, 20 pro Tag) und Fehlerarten |
| `src/prompt.js` | System-Prompt, `max_tokens` 400, Auswahl der Wissensteile je Frage |
| `src/wissen.js` | Wissensbasis. **Wird erzeugt**, nicht von Hand ändern (siehe unten) |
| `wrangler.toml` | Modell (`MODELL`), Tageslimit (`TAGESLIMIT_GESAMT`), Bindings |
| `test/*.test.mjs` | Tests ohne Netz und ohne Konto: `npm test` |
| `test/fragen.mjs` | 13 Fragen an den laufenden Proxy (verbraucht Kontingent) |

## Einrichten

1. Gratis-Konto auf [dash.cloudflare.com](https://dash.cloudflare.com), ohne Zahlungsmittel.
2. In diesem Ordner:
   ```bash
   npm install
   npx wrangler login
   npx wrangler deploy
   ```
3. Die Adresse aus der Ausgabe (`https://odera-chat.<name>.workers.dev/`) in `index.html` bei
   `CHAT_ENDPOINT` eintragen und `node tools/seo-build.mjs` ausführen. Solange `CHAT_ENDPOINT` leer ist,
   ist der Assistent auf der Website unsichtbar.

## Wissensbasis aktualisieren

Die Wissensbasis entsteht aus denselben Texten wie die Website:

```bash
node tools/seo-build.mjs     # erzeugt die Seiten und am Schluss chat-proxy/src/wissen.js
cd chat-proxy && npx wrangler deploy
```

Sie ist verdichtet (ohne Bedienelemente, Inhaltsverzeichnisse und Doppeltes) und in Teile gegliedert.
Angebot, Ablauf, Kontakt, Projekt-Check, Referenzpreis und Erreichbarkeit gehen bei jeder Frage mit.
AGB, Datenschutz, Impressum, Über mich und Musterprojekte gehen nur mit, wenn die Frage ein passendes
Stichwort enthält (Liste in `tools/wissen-build.mjs`). So bleibt jede Anfrage klein.

## Gratis-Kontingent und Tageslimit

Workers AI gibt im Gratis-Plan **10'000 Neurons pro Tag**, Neustart um 00:00 UTC. Danach schlagen
Anfragen fehl (Fehler 3036), es wird nichts verrechnet. Quelle:
[Workers AI Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/).

Damit das Kontingent nicht mitten am Tag ausgeht, zählt der Worker alle Nachrichten eines UTC-Tages und
nimmt nach `TAGESLIMIT_GESAMT` keine mehr an. Dann zeigt der Chat: «Der Assistent ist für heute
ausgelastet. Schreiben Sie mir an kontakt@odera.ch oder starten Sie den Projekt-Check.»
Dasselbe erscheint, falls das Kontingent trotzdem aufgebraucht ist.

Die Herleitung des Tageslimits und die gemessenen Verbrauchswerte stehen unten im Abschnitt «Messung».

## Betrieb

- **Mitlesen** (nur Fehlerart und Tokenzahlen, keine Inhalte): `npx wrangler tail`
- **Verbrauch ansehen:** Cloudflare-Dashboard, *AI › Workers AI*.
- **Modell wechseln:** `MODELL` in `wrangler.toml`, danach `npx wrangler deploy`. Den Verbrauch neu messen
  und `TAGESLIMIT_GESAMT` anpassen.
- **Assistent abschalten:** `CHAT_ENDPOINT` in `index.html` leeren und veröffentlichen.
- Kein Workers Paid Plan nötig. Ohne Zahlungsmittel kann Cloudflare nichts verrechnen.

## Messung (28.09.2026)

Modellvergleich mit den 13 Fragen aus `test/fragen.mjs`:

| Modell | Ergebnis |
|---|---|
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | 13 von 13 korrekt, gutes Deutsch, Französisch und Englisch in der Sprache der Frage. **Gewählt.** |
| `@cf/openai/gpt-oss-120b` | Eine Antwort unleserlich, mehrere abgeschnitten (Denk-Tokens zählen zur Ausgabe), Englisch auf Deutsch beantwortet, Gedankenstriche |

Verbrauch Mistral Small 3.1 (31'876 Neurons je Million Eingabe-Tokens, 50'488 je Million Ausgabe-Tokens):

| | Eingabe-Tokens | Neurons |
|---|---|---|
| Typische Frage (nur Kern) | etwa 4'850 | etwa 160 |
| Mittel der 13 Testfragen | | etwa 180 |
| Ungünstig (grosse Teile, voller Verlauf, 400 Tokens Antwort) | etwa 8'200 | etwa 280 |

10'000 Neurons pro Tag reichen also für **typisch etwa 45 Nachrichten**. `TAGESLIMIT_GESAMT` steht auf **35**,
damit auch im ungünstigen Fall nichts über das Kontingent hinausgeht. Fragt jemand ausnahmsweise nach
allen Themen zugleich (AGB, Datenschutz und mehr), kann das Kontingent früher aufgebraucht sein. Dann meldet
Workers AI den Fehler 3036 und der Chat zeigt dieselbe Meldung «für heute ausgelastet». Kosten entstehen keine.
