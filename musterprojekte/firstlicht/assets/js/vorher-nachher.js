/* Firstlicht: Vorher-Nachher-Regler, per Maus, Finger und Tastatur (echter Range-Regler) */
document.querySelectorAll('[data-vorher-nachher]').forEach((vn) => {
  const regler = vn.querySelector('.vn__regler');
  const setzen = () => {
    const w = Number(regler.value);
    vn.style.setProperty('--vn', `${w}%`);
    regler.setAttribute('aria-valuetext', w <= 5 ? 'Nur vorher' : w >= 95 ? 'Nur nachher' : `${w} Prozent nachher sichtbar`);
  };
  regler.addEventListener('input', setzen);
  setzen();
});
