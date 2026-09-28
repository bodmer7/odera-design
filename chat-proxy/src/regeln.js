// Prüfung der Anfrage und Rechnung des Rate Limits. Ohne Cloudflare-Abhängigkeiten, damit es sich in Node testen lässt.

export const GRENZEN = {
  nachricht: 1000,       // Zeichen der neuen Nachricht
  verlauf: 6,            // Nachrichten im mitgeschickten Verlauf
  verlaufEintrag: 3000,  // Zeichen je Eintrag im Verlauf (Antworten sind länger als Fragen)
  anfrageBytes: 32000,   // Grösse des ganzen Anfragekörpers
};

// Pro IP: 8 Nachrichten in 10 Minuten, 20 pro Tag.
export const FENSTER = [
  { dauer: 10 * 60 * 1000, max: 8 },
  { dauer: 24 * 60 * 60 * 1000, max: 20 },
];

/** Prüft { message, history }. Gibt { ok: true, message, history } oder { ok: false, fehler }. */
export function pruefeAnfrage(body) {
  if (!body || typeof body !== 'object') return { ok: false, fehler: 'Ungültige Anfrage.' };
  const { message, history = [] } = body;
  if (typeof message !== 'string' || !message.trim()) return { ok: false, fehler: 'Die Nachricht fehlt.' };
  if (message.length > GRENZEN.nachricht) return { ok: false, fehler: `Die Nachricht ist länger als ${GRENZEN.nachricht} Zeichen.` };
  if (!Array.isArray(history)) return { ok: false, fehler: 'Der Verlauf ist ungültig.' };
  if (history.length > GRENZEN.verlauf) return { ok: false, fehler: `Der Verlauf hat mehr als ${GRENZEN.verlauf} Nachrichten.` };
  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    const rolle = i % 2 === 0 ? 'user' : 'assistant';
    if (!h || h.role !== rolle || typeof h.content !== 'string' || !h.content.trim() || h.content.length > GRENZEN.verlaufEintrag) {
      return { ok: false, fehler: 'Der Verlauf ist ungültig.' };
    }
  }
  if (history.length % 2 !== 0) return { ok: false, fehler: 'Der Verlauf ist ungültig.' };
  return { ok: true, message: message.trim(), history: history.map((h) => ({ role: h.role, content: h.content })) };
}

/**
 * Rate Limit über gespeicherte Zeitstempel.
 * Gibt { erlaubt, stempel, wiederInSek } zurück. stempel ist die neue Liste zum Speichern.
 */
export function pruefeLimit(stempel, jetzt, fenster = FENSTER) {
  const laengstes = Math.max(...fenster.map((f) => f.dauer));
  const aktuell = (stempel || []).filter((t) => jetzt - t < laengstes);
  for (const f of fenster) {
    const drin = aktuell.filter((t) => jetzt - t < f.dauer);
    if (drin.length >= f.max) {
      const frei = Math.min(...drin) + f.dauer;
      return { erlaubt: false, stempel: aktuell, wiederInSek: Math.max(1, Math.ceil((frei - jetzt) / 1000)) };
    }
  }
  aktuell.push(jetzt);
  return { erlaubt: true, stempel: aktuell, wiederInSek: 0 };
}

/** Kalendertag in UTC. Das Gratis-Kontingent von Workers AI beginnt um 00:00 UTC neu. */
export function utcTag(jetzt = Date.now()) {
  return new Date(jetzt).toISOString().slice(0, 10);
}

/** Ursprünge, die den Proxy aufrufen dürfen. */
export function erlaubterUrsprung(origin, env) {
  if (!origin) return false;
  const liste = String(env.ERLAUBTE_URSPRUENGE || 'https://odera.ch').split(',').map((s) => s.trim()).filter(Boolean);
  if (liste.includes(origin)) return true;
  if (env.ERLAUBE_LOCALHOST === '1' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return false;
}

/**
 * Ordnet einen Fehler von Workers AI einer Art zu, die der Browser versteht.
 * 3036: Tageskontingent aufgebraucht. 3040 oder 429: keine Kapazität.
 * Quelle: https://developers.cloudflare.com/workers-ai/platform/errors/
 */
export function fehlerArt(err) {
  const text = String((err && (err.message || err.toString())) || '');
  if (/\b3036\b|daily free allocation|neurons/i.test(text)) return 'ausgelastet';
  if (/\b3040\b|capacity|\b429\b/i.test(text)) return 'ueberlastet';
  return 'nicht_erreichbar';
}

/** Text aus der Antwort von Workers AI, je nach Modell in unterschiedlicher Form. */
export function antwortText(r) {
  if (!r) return '';
  if (typeof r === 'string') return r;
  if (typeof r.response === 'string') return r.response;
  const c = r.choices && r.choices[0];
  if (c && c.message && typeof c.message.content === 'string') return c.message.content;
  if (Array.isArray(r.output)) {
    const msg = r.output.filter((o) => o.type === 'message').flatMap((o) => o.content || []);
    return msg.map((x) => x.text || '').join('');
  }
  return '';
}
