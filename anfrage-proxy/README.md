# Anfrage-Proxy für den Projekt-Check auf odera.ch

Kleiner Cloudflare Worker, der eine fertige Anfrage aus dem Projekt-Check entgegennimmt, prüft und per
E-Mail an kontakt@odera.ch zustellt. Versand über **Resend** (Gratis-Plan, Region eu-west-1, Irland).
Nichts wird gespeichert ausser Zählern für das Rate Limit (IP nur gehasht, nach 24 Stunden gelöscht).
Dieser Ordner wird auf GitHub Pages nicht veröffentlicht (`_config.yml`).

```
Browser (index.html, Mail-Fenster)  ->  Worker (dieser Ordner)  ->  Resend  ->  kontakt@odera.ch
                                        prüft Turnstile, Herkunft, Grösse, Honigtopf, Zeit, Limit
```

## Dateien

| Datei | Inhalt |
|---|---|
| `src/index.js` | Worker: CORS, Prüfungen, Turnstile, Rate Limit, Versand mit Idempotency-Key, Limiter (Durable Object) |
| `src/regeln.js` | Validierung der Felder, Referenz (ODR-XXXX), erlaubte Herkunft, 3 Anfragen pro Stunde je IP |
| `src/mail.js` | E-Mail an Nico und Kopie an die anfragende Person (HTML und Text, alles maskiert) |
| `src/schema.js` | Felder, Pflichtfelder, Maximallängen. **Wird erzeugt** aus `ANFRAGE` in `index.html` (`tools/anfrage-schema.mjs`, läuft am Schluss von `tools/seo-build.mjs`) |
| `wrangler.toml` | Erlaubte Herkunft, Turnstile-Hosts, Tageslimit gesamt (`TAGESLIMIT_GESAMT`, 40) |
| `test/worker.test.mjs` | Tests ohne Netz und ohne Konto: `npm test` |

## Secrets

Beide nur als Worker-Secret, nie im Repo, nie im Browser:

```bash
npx wrangler secret put RESEND_API_KEY     # Resend-Schlüssel mit Recht «Sending access», nur Domain odera.ch
npx wrangler secret put TURNSTILE_SECRET   # Secret Key des Turnstile-Widgets
```

Der Befehl fragt den Wert im Terminal ab.

## Einschalten auf der Website

In `index.html` beide Werte setzen, dann `node tools/seo-build.mjs`:

- `ANFRAGE_ENDPOINT` = `https://odera-anfrage.odera-chat-proxy.workers.dev/`
- `TURNSTILE_SITEKEY` = Site Key des Turnstile-Widgets (öffentlich)

Ist einer leer, gilt der alte Ablauf: Die Anfrage öffnet sich im eigenen E-Mail-Programm. Datenschutz
(Abschnitte 3, 5 bis 7), Hinweistexte und die Wissensbasis des Chats folgen demselben Schalter.
Erst einschalten, wenn die Domain in Resend verifiziert ist. Danach `STAND_RECHTSTEXTE` anpassen.

## Grenzen im Gratis-Plan

- Resend: 3000 E-Mails pro Monat, 100 pro Tag. Eine Anfrage braucht eine, mit Kopie zwei E-Mails.
  Darum höchstens 40 Anfragen pro Tag (`TAGESLIMIT_GESAMT`).
- Cloudflare Workers: 100 000 Aufrufe pro Tag. Turnstile: gratis.
- Ist ein Limit erreicht oder der Versand gestört, bekommt die Besucherin eine Meldung mit Ausweg
  (nochmals versuchen, mit dem eigenen E-Mail-Programm senden, Text kopieren). Keine Anfrage geht verloren.

## Deploy

```bash
npm install
npx wrangler deploy
npm test
```

Protokolle sind ausgeschaltet (`observability`). `wrangler tail` zeigt nur Ereignisse wie
`gesendet`, `abgewiesen` oder `limit`, nie Inhalte oder IP-Adressen.
