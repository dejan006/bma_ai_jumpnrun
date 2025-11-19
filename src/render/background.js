// Game.Render.Background – einfacher Parallax-Hintergrund (reines Canvas).
// Ebenen:
//  1) Sky-Gradient
//  2) Sterne (langsam)
//  3) Hills (mittlere Parallax)

window.Game = window.Game || {};
window.Game.Render = window.Game.Render || {};

window.Game.Render.Background = (function () {
  'use strict';

  const stars = [];
  let starInitW = 0, starInitH = 0;

  function ensureStars(viewW, viewH) {
    // Re-Seed nur wenn View stark aendert
    if (Math.abs(viewW - starInitW) < 50 && Math.abs(viewH - starInitH) < 50 && stars.length) return;
    starInitW = viewW; starInitH = viewH;
    stars.length = 0;
    const count = Math.max(80, Math.floor(viewW * viewH / 14000));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * 0.4 + 0.2
      });
    }
  }

  function draw(ctx, viewW, viewH, cameraX, cameraY, t) {
    // Sky
    const g = ctx.createLinearGradient(0, 0, 0, viewH);
    g.addColorStop(0, '#101424');
    g.addColorStop(1, '#0b0e18');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, viewW, viewH);

    ensureStars(viewW, viewH);

    // Stars (parallax sehr klein)
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.translate(-(cameraX * 5 % viewW), -(cameraY * 5 % viewH));
    for (const s of stars) {
      ctx.fillStyle = `rgba(255,255,255,${s.a.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Hills (Parallax mittel)
    ctx.save();
    ctx.translate(-cameraX * 10, -cameraY * 6);
    ctx.globalAlpha = 0.28;
    for (let i = -2; i < 8; i++) {
      const cx = i * 300 + Math.sin((t + i) * 0.2) * 15;
      const cy = viewH * 0.75 + (i % 2 ? -12 : 8);
      ctx.beginPath();
      ctx.arc(cx, cy, 200, Math.PI, 0);
      ctx.fillStyle = '#1a2036';
      ctx.fill();
    }
    ctx.restore();
  }

  return { draw };
})();
