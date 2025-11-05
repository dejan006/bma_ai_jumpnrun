// Game Main – verbindet Engine, Input und minimale Welt.
// Ergebnis von Prompt 1: Schwarzer Hintergrund + Overlay, kein Konsolenfehler.
(function () {
  'use strict';

  const { Engine } = window.Game.Engine;
  const Input = window.Game.Input;

  const canvas = document.getElementById('game');

  // Einfache Welt (Platzhalter)
  const state = {
    time: 0,
    viewport: { w: 0, h: 0, dpr: 1 },
    // Platzhalter-Level (nur als Daten vorhanden, visuell in Prompt 1 noch nicht noetig)
    level: { name: 'placeholder', gravity: 40 }
  };

  function onResize(w, h, dpr) {
    state.viewport.w = w;
    state.viewport.h = h;
    state.viewport.dpr = dpr;
  }

  function onUpdate(dt) {
    state.time += dt;

    // Input initialisieren (einmal beim ersten Update)
    if (!state._inputInited) {
      Input.init();
      state._inputInited = true;
    }
    // Hier noch kein Gameplay – das folgt in den naechsten Prompts.
  }

  function onRender(ctx) {
    // Hintergrund schwarz (Vorgabe)
    ctx.clearRect(0, 0, state.viewport.w, state.viewport.h);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, state.viewport.w, state.viewport.h);

    // Optionale visuelle Herzschlagprobe (kleiner Punkt in der Mitte, sehr dunkel)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(state.viewport.w/2, state.viewport.h/2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Keine Texte hier – „Hello Game“-Overlay kommt aus index.html
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
