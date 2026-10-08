// Hilfen für den Worker odera-stats: Lesezugang, Zeitraum, Aufbewahrung.

import { zuercherTag } from './ereignisse.js';

export const AUFBEWAHRUNG_MONATE = 14;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TAGE = 400;

/** Vergleich in konstanter Zeit, damit das Token nicht über die Antwortzeit erraten werden kann. */
export function gleich(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let unterschied = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) unterschied |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return unterschied === 0;
}

export function berechtigt(request, env) {
  const token = env.STATS_READ_TOKEN;
  const kopf = request.headers.get('Authorization') || '';
  if (!token || !kopf.startsWith('Bearer ')) return false;
  return gleich(kopf.slice(7).trim(), token);
}

export function zeitraum(url) {
  const von = url.searchParams.get('from');
  const bis = url.searchParams.get('to');
  if (!DATUM.test(von || '') || !DATUM.test(bis || '') || von > bis) return null;
  const tage = (Date.parse(bis) - Date.parse(von)) / 86400000;
  return tage <= MAX_TAGE ? { von, bis } : null;
}

/** Datum vor so vielen Monaten (Europe/Zurich), für die Löschung. */
export function grenze(monate = AUFBEWAHRUNG_MONATE, jetzt = new Date()) {
  const d = new Date(jetzt);
  d.setUTCMonth(d.getUTCMonth() - monate);
  return zuercherTag(d);
}

