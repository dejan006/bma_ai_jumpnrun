// Game.Entities.Checkpoint – Aktivierbarer Respawn-Punkt.
// - Aktivierung bei AABB-Überlappung mit dem Spieler
// - Visual: Flagge (grau -> gruen), leichtes Pulsieren wenn aktiv
// - respawnX/respawnY definieren den genauen Spieler-Respawnpunkt

window.Game = window.Game || {};
window.Game.Entities = window.Game.Entities || {};

window.Game.Entities.Checkpoint = (function () {
  'use strict';

  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function create(x, y) {
    // Wir stellen die Flagge als schmales Rechteck dar; Respawn ist leicht ueber Grund.
    return {
      x, y, w: 0.8, h: 2.2,
      respawnX: x, respawnY: y,
      active: false,

      tryActivate(player, onActivated) {
        if (this.active) return false;
        if (aabbOverlap(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
          this.active = true;
          if (onActivated) onActivated(this);
          return true;
        }
        return false;
      },

      draw(ctx, worldToScreen, pxPerM, t, isCurrent) {
        const a = worldToScreen(this.x, this.y);
        const W = Math.round(this.w * pxPerM);
        const H = Math.round(this.h * pxPerM);

        // Stange
        ctx.fillStyle = '#8b8b8b';
        ctx.fillRect(a.x, a.y, Math.max(2, Math.floor(W * 0.18)), H);

        // Flagge
        const flap = Math.sin(t * 6) * 0.1;
        const flagW = Math.max(6, Math.floor(W * 1.2));
        const flagH = Math.max(6, Math.floor(H * 0.4));
        ctx.save();
        ctx.translate(a.x + Math.max(2, Math.floor(W * 0.18)), a.y + Math.floor(H * 0.15));
        ctx.rotate(flap);
        ctx.fillStyle = this.active ? (isCurrent ? '#34d399' : '#22c55e') : '#58626f';
        ctx.fillRect(0, 0, flagW, flagH);
        ctx.restore();

        // Glanz wenn aktiv
        if (this.active) {
          ctx.save();
          ctx.globalAlpha = 0.15 + (isCurrent ? 0.15 : 0);
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(a.x + W * 0.3, a.y + H * 0.1, Math.max(8, Math.floor(W * 1.5)), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    };
  }

  return { create };
})();
