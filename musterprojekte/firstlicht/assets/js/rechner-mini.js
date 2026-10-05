/* Firstlicht: Mini-Rechner auf der Startseite
   Zwei Regler, sofortiges Ergebnis. Rechnet mit derselben Logik wie der volle Rechner. */

import { berechnen } from './rechner-logik.js';
import { annahmenLaden, zahl } from './hilfen.js';

const form = document.querySelector('[data-mini-rechner]');

async function starten() {
  const a = await annahmenLaden();
  const flaeche = form.querySelector('#mini-flaeche');
  const preis = form.querySelector('#mini-preis');
  const aus = (k) => form.querySelector(`[data-mini="${k}"]`);
  const fuellen = (el) => el.style.setProperty('--fuellung', `${((el.value - el.min) / (el.max - el.min)) * 100}%`);

  function rechnen() {
    const r = berechnen({ flaeche: flaeche.value, strompreis: preis.value }, a);
    form.querySelector('[data-mini-aus="flaeche"]').textContent = `${zahl(r.eingaben.flaeche)} m²`;
    form.querySelector('[data-mini-aus="strompreis"]').textContent = `${zahl(r.eingaben.strompreis, 1)} Rp./kWh`;
    flaeche.setAttribute('aria-valuetext', `${zahl(r.eingaben.flaeche)} Quadratmeter`);
    preis.setAttribute('aria-valuetext', `${zahl(r.eingaben.strompreis, 1)} Rappen pro Kilowattstunde`);
    aus('kwp').textContent = r.leer ? 'zu klein' : `${zahl(r.kwp, 1)} kWp`;
    aus('ertrag').textContent = `rund ${zahl(r.ertrag.wert)} kWh`;
    aus('ersparnis').textContent = r.ersparnis.wert > 0 ? `CHF ${zahl(r.ersparnis.von)} bis ${zahl(r.ersparnis.bis)}` : 'kaum Ersparnis';
    fuellen(flaeche);
    fuellen(preis);
  }
  form.addEventListener('input', rechnen);
  rechnen();
}

if (form) starten().catch((e) => {
  console.error('Mini-Rechner:', e);
  const hinweis = document.createElement('p');
  hinweis.className = 'hinweis';
  hinweis.textContent = 'Die Schätzung lässt sich gerade nicht laden. Rufen Sie uns an, wir rechnen gerne mit Ihnen.';
  form.prepend(hinweis);
});
