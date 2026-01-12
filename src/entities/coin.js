// Game.Entities.Coin – Sammelbare Münze (Kreis-Hitbox), WebAudio-SFX.
// - Radius in "Metern" (default r = 0.35)
// - Kollision: Circle vs. Player-Rect (distanz zu nächstem Punkt)
// - SFX: kurzer Ton mit Hüllkurve und kleinem Pitch-Glissando (ohne externe Dateien)

window.Game = window.Game || {};
window.Game.Entities = window.Game.Entities || {};

window.Game.Entities.Coin = (function () {
  'use strict';

  const Audio = (() => {
    let ctx = null;
    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      return ctx;
    }
    function ping() {
      const ac = ensure(); if (!ac) return;
      const t0 = ac.currentTime;
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      // Start-Pitch → Ziel-Pitch (kleiner Slide nach oben)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t0);
      osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.08);

      // Hüllkurve
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.6, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);

      osc.connect(gain).connect(ac.destination);
      osc.start(t0);
      osc.stop(t0 + 0.26);
    }
    return { ping };
  })();

  function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
    // Nächster Punkt auf dem Rechteck zur Kreis-Mitte
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx, dy = cy - ny;
    return (dx*dx + dy*dy) <= r*r;
  }

  function create(x, y, r = 0.35) {
    return {
      x, y, r,
      collected: false,
      _twist: Math.random() * Math.PI * 2, // für kleines Wobble

      tryCollect(player, onCollect) {
        if (this.collected) return;
        if (circleRectHit(this.x, this.y, this.r, player.x, player.y, player.w, player.h)) {
          this.collected = true;
          try { Audio.ping(); } catch(e) {}
          if (onCollect) onCollect();
        }
      },

      draw(ctx, worldToScreen, pxPerM, t) {
        if (this.collected) return;
        const a = worldToScreen(this.x, this.y);
        const R = Math.max(2, Math.round(this.r * pxPerM));
        const wob = Math.sin(t * 6 + this._twist) * 0.15;

        // Halo
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(a.x, a.y, R * (1.6 + wob * 0.5), 0, Math.PI * 2);
        ctx.fillStyle = '#ffd166';
        ctx.fill();
        ctx.restore();

        // Körper
        ctx.save();
        ctx.translate(a.x, a.y);
        ctx.rotate(wob);
        // Außenring
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fillStyle = '#f4d35e';
        ctx.fill();

        // Innenteil
        ctx.beginPath();
        ctx.arc(0, 0, R * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffeaa7';
        ctx.fill();

        // Schimmer
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(-R*0.25, -R*0.25, R*0.25, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        ctx.restore();
      }
    };
  }

  return { create };
})();
