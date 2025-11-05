// Game.Input – Tastaturzustand (WASD/Arrows/Space). Später erweiterbar.
window.Game = window.Game || {};
window.Game.Input = (function () {
  'use strict';

  const keys = Object.create(null);

  function onKey(e, down) {
    // Einfache Normalisierung
    const code = e.code;
    if (code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Space') {
      e.preventDefault(); // vermeidet Scrollen/Seitensprung
    }
    keys[code] = down;
  }

  function init() {
    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup',   (e) => onKey(e, false));
  }

  function pressed(code) { return !!keys[code]; }

  return { init, pressed };
})();
