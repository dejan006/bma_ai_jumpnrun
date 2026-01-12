// Game.Entities.PatrolEnemy – einfacher Patrouillen-Gegner mit Wegpunkten.
// - Bewegung Richtung aktueller Wegpunkt, bei Ankunft optional Pause.
// - Kollision: AABB gegen Spieler -> Schaden-Callback.
// - Rendering: rotes Rechteck mit kleinen Augen.
//
// JSON-Felder (siehe level1.json):
//   { type:"patrol", x,y,w,h, speed, waypoints:[{x,y},...], pause }

window.Game = window.Game || {};
window.Game.Entities = window.Game.Entities || {};

window.Game.Entities.PatrolEnemy = (function () {
  'use strict';

  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function create(cfg) {
    const wp = Array.isArray(cfg.waypoints) && cfg.waypoints.length ? cfg.waypoints : [{ x: cfg.x, y: cfg.y }];
    return {
      x: cfg.x || 0, y: cfg.y || 0,
      w: cfg.w || 1.2, h: cfg.h || 1.2,
      speed: cfg.speed || 3.5,
      waypoints: wp,
      pause: Math.max(0, cfg.pause || 0),
      _i: 0,
      _pauseT: 0,

      update(dt) {
        if (this._pauseT > 0) { this._pauseT -= dt; return; }
        const tgt = this.waypoints[this._i];
        const dx = tgt.x - this.x;
        const dy = tgt.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.02) {
          // An Wegpunkt angekommen
          this._i = (this._i + 1) % this.waypoints.length;
          this._pauseT = this.pause;
          return;
        }
        const vx = (dx / (dist || 1)) * this.speed;
        const vy = (dy / (dist || 1)) * this.speed;
        this.x += vx * dt;
        this.y += vy * dt;
      },

      checkHit(player, onHit) {
        if (aabbOverlap(this.x, this.y, this.w, this.h, player.x, player.y, player.w, player.h)) {
          if (onHit) onHit();
        }
      },

      draw(ctx, worldToScreen, pxPerM, t) {
        const a = worldToScreen(this.x, this.y);
        const W = Math.round(this.w * pxPerM);
        const H = Math.round(this.h * pxPerM);

        ctx.save();
        ctx.translate(a.x, a.y);

        // Körper
        ctx.fillStyle = '#e63946';
        ctx.fillRect(0, 0, W, H);

        // Augen
        ctx.fillStyle = '#1b1b1b';
        ctx.fillRect(W * 0.2, H * 0.25, Math.max(2, Math.floor(W * 0.12)), Math.max(2, Math.floor(W * 0.12)));
        ctx.fillRect(W * 0.6, H * 0.25, Math.max(2, Math.floor(W * 0.12)), Math.max(2, Math.floor(W * 0.12)));

        // leichte Schattenkante
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, 2);
        ctx.fillRect(0, 0, 2, H);

        ctx.restore();
      }
    };
  }

  return { create };
})();
