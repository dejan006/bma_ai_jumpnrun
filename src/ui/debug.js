// Game.UI.Debug – F1: Overlay mit FPS, Pos, Vel, Collider-Boxen (toggle).
// Zeichnet bewusst simpel (geringer Overhead).

window.Game = window.Game || {};
window.Game.UI = window.Game.UI || {};

window.Game.UI.Debug = (function () {
  'use strict';

  function create() {
    let on = false;
    let fps = 0, acc = 0, frames = 0;
    let lastSec = 0;

    function toggle() { on = !on; }
    function isOn() { return on; }

    function tick(dt) {
      acc += dt; frames++;
      // alle ~0.25s berechnen, um stabilere Zahl zu zeigen
      if (acc >= 0.25) {
        fps = Math.round(frames / acc);
        acc = 0; frames = 0;
      }
    }

    function drawOverlay(ctx, w, h, info) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(8, 8, 250, 86);
      ctx.fillStyle = '#eaeaea';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      ctx.fillText(`FPS: ${fps}`, 16, 16);
      ctx.fillText(`Pos: ${info.px.toFixed(2)}, ${info.py.toFixed(2)}`, 16, 32);
      ctx.fillText(`Vel: ${info.vx.toFixed(2)}, ${info.vy.toFixed(2)}`, 16, 48);
      ctx.fillText(`State: ${info.state}`, 16, 64);
      ctx.restore();
    }

    function drawColliders(ctx, w2s, scale, world) {
      ctx.save();
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      // Player
      const p = world.player;
      let s = w2s(p.x, p.y);
      ctx.strokeRect(s.x + 0.5, s.y + 0.5, Math.round(p.w * scale) - 1, Math.round(p.h * scale) - 1);

      // Statische Plattformen
      ctx.strokeStyle = '#60a5fa';
      for (let i = 0; i < world.level.platforms.length; i++) {
        const r = world.level.platforms[i];
        s = w2s(r.x, r.y);
        ctx.strokeRect(s.x + 0.5, s.y + 0.5, Math.round(r.w * scale) - 1, Math.round(r.h * scale) - 1);
      }

      // Moving Platforms
      ctx.strokeStyle = '#f59e0b';
      for (let i = 0; i < world.mplats.length; i++) {
        const a = world.mplats[i].aabb();
        s = w2s(a.x, a.y, world.mplats[i].prevX, world.mplats[i].prevY);
        ctx.strokeRect(s.x + 0.5, s.y + 0.5, Math.round(a.w * scale) - 1, Math.round(a.h * scale) - 1);
      }

      // Enemies
      ctx.strokeStyle = '#ef4444';
      for (let i = 0; i < world.enemies.length; i++) {
        const e = world.enemies[i];
        s = w2s(e.x, e.y, e.prevX, e.prevY);
        ctx.strokeRect(s.x + 0.5, s.y + 0.5, Math.round(e.w * scale) - 1, Math.round(e.h * scale) - 1);
      }

      // Goal
      if (world.goal) {
        ctx.strokeStyle = '#a78bfa';
        const g = world.goal;
        s = w2s(g.x, g.y);
        ctx.strokeRect(s.x + 0.5, s.y + 0.5, Math.round(g.w * scale) - 1, Math.round(g.h * scale) - 1);
      }

      ctx.restore();
    }

    return { toggle, isOn, tick, drawOverlay, drawColliders };
  }

  return { create };
})();
