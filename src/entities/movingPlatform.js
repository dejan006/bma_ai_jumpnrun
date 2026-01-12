// Game.Entities.MovingPlatform – Plattform A↔B mit Pause, Player-Mitnahme.
// - Bewegt sich zwischen Punkten a und b, Speed in m/s, optionale Pause an Enden.
// - Tracking von prevX/prevY fuer saubere Mitnahme des Spielers.

window.Game = window.Game || {};
window.Game.Entities = window.Game.Entities || {};

window.Game.Entities.MovingPlatform = (function () {
  'use strict';

  function create(cfg) {
    const a = cfg.a || { x: cfg.x || 0, y: cfg.y || 0 };
    const b = cfg.b || { x: (cfg.x || 0) + 4, y: cfg.y || 0 };
    return {
      x: cfg.x || a.x,
      y: cfg.y || a.y,
      w: cfg.w || 3,
      h: cfg.h || 0.8,
      a, b,
      speed: cfg.speed || 3,
      pause: Math.max(0, cfg.pause || 0),
      _toB: true,
      _pauseT: 0,
      prevX: cfg.x || a.x,
      prevY: cfg.y || a.y,

      update(dt) {
        this.prevX = this.x; this.prevY = this.y;
        if (this._pauseT > 0) { this._pauseT -= dt; return; }

        const tgt = this._toB ? this.b : this.a;
        const dx = tgt.x - this.x, dy = tgt.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.02) {
          this._toB = !this._toB;
          this._pauseT = this.pause;
          return;
        }
        const vx = (dx / (dist || 1)) * this.speed;
        const vy = (dy / (dist || 1)) * this.speed;
        this.x += vx * dt;
        this.y += vy * dt;
      },

      aabb() { return { x: this.x, y: this.y, w: this.w, h: this.h }; },

      draw(ctx, worldToScreen, pxPerM) {
        const a = worldToScreen(this.x, this.y);
        const W = Math.round(this.w * pxPerM);
        const H = Math.round(this.h * pxPerM);

        // Plattform-Körper
        ctx.fillStyle = '#6b7280';
        ctx.fillRect(a.x, a.y, W, H);

        // Oberkante hervorheben
        ctx.fillStyle = '#d1d5db';
        ctx.fillRect(a.x, a.y, W, Math.max(2, Math.floor(H * 0.18)));
      }
    };
  }

  return { create };
})();
