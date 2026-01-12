// Game.Entities.Coin – Render mit Glanz-Highlight und kleinem Glow

window.Game = window.Game || {};
window.Game.Entities = window.Game.Entities || {};

window.Game.Entities.Coin = (function () {
  'use strict';

  function create(x, y, r=0.35) {
    return {
      x, y, r, collected: false,
      tryCollect, draw
    };
  }

  function tryCollect(player, onCollect) {
    if (this.collected) return;
    const dx = (player.x + player.w*0.5) - this.x;
    const dy = (player.y + player.h*0.5) - this.y;
    if (Math.hypot(dx, dy) < (this.r + Math.max(player.w, player.h)*0.5)*0.85) {
      this.collected = true;
      onCollect && onCollect(this);
    }
  }

  function draw(ctx, worldToScreen, pxPerM, t) {
    if (this.collected) return;
    const s = worldToScreen(this.x - this.r, this.y - this.r);
    const d = Math.max(2, Math.round(this.r * 2 * pxPerM));

    // Basis
    const cx = s.x + d/2, cy = s.y + d/2;
    const rad = d/2;

    // Glow
    const glow = ctx.createRadialGradient(cx, cy, rad*0.2, cx, cy, rad*1.2);
    glow.addColorStop(0.0, 'rgba(255,204,0,0.30)');
    glow.addColorStop(1.0, 'rgba(255,204,0,0.00)');
    ctx.fillStyle = glow; ctx.fillRect(cx-rad*1.2, cy-rad*1.2, rad*2.4, rad*2.4);

    // Münze
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI*2);
    ctx.closePath();
    const base = ctx.createLinearGradient(cx, cy-rad, cx, cy+rad);
    base.addColorStop(0, '#ffd166');
    base.addColorStop(1, '#f4a61f');
    ctx.fillStyle = base; ctx.fill();

    // Glanz
    ctx.beginPath();
    ctx.ellipse(cx + rad*0.15, cy - rad*0.25, rad*0.55, rad*0.28, -0.3, 0, Math.PI*2);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  }

  return { create };
})();
