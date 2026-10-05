/* Firstlicht: Energie-Baukasten auf der Seite Leistungen
   Schalter blenden Teile ein, der Anteil Solarstrom kommt aus der Rechner-Logik. */

import { berechnen } from './rechner-logik.js';
import { annahmenLaden, zahl, prozent, bewegungAus } from './hilfen.js';

const wurzel = document.querySelector('[data-baukasten]');

async function starten() {
  const a = await annahmenLaden();
  const titel = wurzel.querySelector('[data-bk-beschreibung]');
  const aus = (k) => wurzel.querySelector(`[data-bk="${k}"]`);
  const fluesse = [...wurzel.querySelectorAll('[data-fluss]')];
  let timer = 0;

  function aktualisieren(bewegt) {
    const an = (n) => wurzel.querySelector(`input[name="${n}"]`).checked;
    const teile = ['netz', ...['pv', 'speicher', 'wallbox', 'waermepumpe'].filter(an)];
    wurzel.dataset.an = teile.join(' ');
    const pv = an('pv');
    const r = berechnen({ flaeche: 60, speicher: an('speicher'), eauto: an('wallbox'), waermepumpe: an('waermepumpe') }, a);
    const anteil = pv ? r.autarkie : 0;
    const vomDach = pv ? Math.round(r.eigenverbrauchKwh / 100) * 100 : 0;
    aus('autarkie').textContent = prozent(anteil);
    aus('balken').style.setProperty('--anteil', `${Math.round(anteil * 100)}%`);
    aus('detail').textContent = pv
      ? `Verbrauch ${zahl(Math.round(r.verbrauch.total / 100) * 100)} kWh pro Jahr, davon rund ${zahl(vomDach)} kWh vom eigenen Dach.`
      : `Verbrauch ${zahl(Math.round(r.verbrauch.total / 100) * 100)} kWh pro Jahr, alles aus dem Netz.`;
    const sichtbar = { netzHaus: true, dachHaus: pv, dachSpeicher: pv && an('speicher'), dachAuto: pv && an('wallbox'), dachWp: pv && an('waermepumpe') };
    fluesse.forEach((f) => f.classList.toggle('ist-an', !!sichtbar[f.dataset.fluss]));
    const namen = { pv: 'Solaranlage', speicher: 'Batteriespeicher', wallbox: 'Wallbox mit Elektroauto', waermepumpe: 'Wärmepumpe' };
    const liste = teile.filter((t) => namen[t]).map((t) => namen[t]);
    titel.textContent = `Einfamilienhaus${liste.length ? ' mit ' + liste.join(', ') : ' ohne Solaranlage'}. Anteil Solarstrom ${prozent(anteil)}.`;
    if (bewegt && !bewegungAus()) {
      wurzel.classList.remove('ist-bewegt');
      void wurzel.offsetWidth;
      wurzel.classList.add('ist-bewegt');
      clearTimeout(timer);
      timer = setTimeout(() => wurzel.classList.remove('ist-bewegt'), 4000);
    }
  }
  wurzel.addEventListener('change', () => aktualisieren(true));
  aktualisieren(false);
}

if (wurzel) starten().catch((e) => console.error('Baukasten:', e));
