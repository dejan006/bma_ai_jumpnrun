// Game.Entities.Goal – Ziel-Flagge: Berührung → Levelwechsel.
// AABB-Kollision mit Spieler, einfache Visualisierung (gold/gruen).

window.Game = window.Game || {};
window.Game.Entities = window.Game.Entities || {};

window.Game.Entities.Goal = (function () {
  'use strict';

  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function create(cfg) {
    const x = cfg.x || 0, y = cfg.y || 0;
    return {
      x, y, w: cfg.w || 1.2, h: cfg.h || 2.4,
      reached: false,

      check(player, onReach) {
        if (this.reached) return;
        if (aabbOverlap(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
          this.reached = true;
          if (onReach) onReach();
        }
      },

      draw(ctx, worldToScreen, pxPerM, t) {
        const a = worldToScreen(this.x, this.y);
        const W = Math.round(this.w * pxPerM);
        const H = Math.round(this.h * pxPerM);

        // Stange
        ctx.fillStyle = '#947a51';
        ctx.fillRect(a.x, a.y, Math.max(2, Math.floor(W * 0.18)), H);

        // Flagge (gold)
        const flap = Math.sin(t * 6) * 0.1;
        const flagW = Math.max(6, Math.floor(W * 1.2));
        const flagH = Math.max(6, Math.floor(H * 0.45));
        ctx.save();
        ctx.translate(a.x + Math.max(2, Math.floor(W * 0.18)), a.y + Math.floor(H * 0.15));
        ctx.rotate(flap);
        ctx.fillStyle = this.reached ? '#22c55e' : '#f4d35e';
        ctx.fillRect(0, 0, flagW, flagH);
        ctx.restore();

        // Glanz
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(a.x + W * 0.4, a.y + H * 0.1, Math.max(12, Math.floor(W * 1.6)), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
  }

  return { create };
})();
