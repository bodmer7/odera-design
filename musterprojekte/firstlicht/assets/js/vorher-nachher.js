/* Firstlicht: Vorher-Nachher-Regler, per Maus, Finger und Tastatur (echter Range-Regler) */
document.querySelectorAll('[data-vorher-nachher]').forEach((vn) => {
  const regler = vn.querySelector('.vn__regler');
  const setzen = () => {
    const w = Number(regler.value);
    vn.style.setProperty('--vn', `${w}%`);
    // Der Wert ist die Position der Trennlinie: links davon «vorher», rechts davon «nachher»
    regler.setAttribute('aria-valuetext', w <= 5 ? 'Nur nachher' : w >= 95 ? 'Nur vorher' : `${w} Prozent vorher, ${100 - w} Prozent nachher sichtbar`);
  };
  regler.addEventListener('input', setzen);
  setzen();
});
