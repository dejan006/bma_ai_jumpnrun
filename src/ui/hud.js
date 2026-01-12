// Game.UI.HUD – schlichtes HUD links oben: Lives, Coins, Timer.
// API-Hooks fuer spaetere Ereignisse:
//   hud.setLives(n) / hud.addLives(d)
//   hud.setCoins(n) / hud.addCoins(d)
//   hud.resetTimer() / hud.setTimer(sec)
//
// Zeichnet Text mit leichter Outline fuer Lesbarkeit.

window.Game = window.Game || {};
window.Game.UI = window.Game.UI || {};

window.Game.UI.HUD = (function () {
  'use strict';

  function create() {
    return {
      lives: 3,
      coins: 0,
      timeSec: 0,

      // ---- API ----
      setLives(n) { this.lives = Math.max(0, Math.floor(n)); },
      addLives(d) { this.setLives(this.lives + Math.floor(d)); },

      setCoins(n) { this.coins = Math.max(0, Math.floor(n)); },
      addCoins(d) { this.setCoins(this.coins + Math.floor(d)); },

      resetTimer() { this.timeSec = 0; },
      setTimer(sec) { this.timeSec = Math.max(0, +sec || 0); },

      update(dt) {
        this.timeSec += dt;
      },

      draw(ctx) {
        const padX = 12, padY = 12, line = 18;

        // Zeit formatieren mm:ss
        const total = Math.floor(this.timeSec);
        const mm = String(Math.floor(total / 60)).padStart(2, '0');
        const ss = String(total % 60).padStart(2, '0');

        const lines = [
          `Lives: ${this.lives}`,
          `Coins: ${this.coins}`,
          `Time:  ${mm}:${ss}`
        ];

        ctx.font = '14px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        // Outline (dunkel)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        for (let i = 0; i < lines.length; i++) {
          const y = padY + i * line;
          ctx.fillText(lines[i], padX + 1, y + 1);
        }

        // Vordergrund (hell)
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        for (let i = 0; i < lines.length; i++) {
          const y = padY + i * line;
          ctx.fillText(lines[i], padX, y);
        }
      }
    };
  }

  return { create };
})();
