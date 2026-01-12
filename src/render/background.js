// Game.Render.Background – Parallax-Hintergrund (mehrere Layer) mit sanften Farbverläufen.
// API: Background.draw(ctx, viewW, viewH, camX, camY, t)

window.Game = window.Game || {};
window.Game.Render = window.Game.Render || {};

window.Game.Render.Background = (function () {
  'use strict';

  const LAYERS = [
    { speed: 0.10, seed: 1,  density: 0.55, size: [1, 2] }, // ferne Sterne
    { speed: 0.18, seed: 11, density: 0.28, size: [2, 3] }, // nahe Sterne
    { speed: 0.28, seed: 3,  hills: true, amp: 18, wave: 0.025 }, // entfernte Hügel
    { speed: 0.44, seed: 7,  hills: true, amp: 12, wave: 0.045 }, // nahe Hügel
  ];

  // deterministischer PRNG
  function mulberry32(a){return function(){let t=(a+=0x6D2B79F5);t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}

  let cache = null;

  function ensureCache(viewW, viewH, dpr=1) {
    if (cache && cache.w === viewW && cache.h === viewH) return;
    cache = {
      w: viewW, h: viewH,
      sky: null,
      stars: [],
    };

    // Sky-Gradient (sanfter Farbverlauf)
    const cvs = document.createElement('canvas');
    cvs.width = viewW; cvs.height = viewH;
    const g = cvs.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, viewH);
    grad.addColorStop(0.0, '#0b1020');
    grad.addColorStop(0.6, '#0f1527');
    grad.addColorStop(1.0, '#111827');
    g.fillStyle = grad;
    g.fillRect(0, 0, viewW, viewH);

    // leichte Vignette
    const rad = g.createRadialGradient(viewW/2, viewH/2, viewW*0.2, viewW/2, viewH/2, Math.max(viewW,viewH)*0.7);
    rad.addColorStop(0.0, 'rgba(0,0,0,0)');
    rad.addColorStop(1.0, 'rgba(0,0,0,0.35)');
    g.fillStyle = rad;
    g.fillRect(0, 0, viewW, viewH);

    cache.sky = cvs;

    // Sterne vorbereiten pro Layer
    cache.stars = LAYERS.map((L, idx) => {
      if (!L.density) return null;
      const rnd = mulberry32(L.seed);
      const count = Math.floor(viewW * viewH * L.density * 0.00015);
      const arr = new Array(count);
      for (let i = 0; i < count; i++) {
        arr[i] = {
          x: rnd() * (viewW + 200) - 100,
          y: rnd() * (viewH * 0.9),
          s: Math.floor(L.size[0] + rnd() * (L.size[1]-L.size[0] + 1)),
          a: 0.65 + rnd() * 0.35
        };
      }
      return arr;
    });
  }

  function drawHills(ctx, viewW, viewH, camX, t, L) {
    // Sinuswellen-Berge (einfach & billig)
    const baseY = viewH * 0.78;
    const amp   = L.amp;
    const wave  = L.wave;
    const offX  = -camX * L.speed;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(-20, viewH+20);

    for (let x = -20; x <= viewW+20; x += 6) {
      const y = baseY + Math.sin((x + offX) * wave + L.seed) * amp
                      + Math.sin((x + offX) * wave * 0.5 + L.seed*2.1) * amp*0.35;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(viewW+20, viewH+20);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, baseY-amp*1.8, 0, viewH);
    const c0 = L === LAYERS[2] ? '#0c1322' : '#111a2a';
    const c1 = L === LAYERS[2] ? '#0b1321' : '#0f1726';
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
  }

  function draw(ctx, viewW, viewH, camX, camY, t=0) {
    ensureCache(viewW, viewH, 1);

    // Hintergrund-Gradient als Basis
    ctx.drawImage(cache.sky, 0, 0);

    // Parallax-Layer
    for (let li = 0; li < LAYERS.length; li++) {
      const L = LAYERS[li];
      const offsetX = (-camX * L.speed) % (viewW + 120);

      if (L.density) {
        // Sterne
        const stars = cache.stars[li];
        if (stars) {
          ctx.save();
          ctx.globalAlpha = 0.85;
          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const x = s.x + offsetX;
            const xx = (x < -50) ? x + viewW + 120 : (x > viewW+60 ? x - (viewW+120) : x);
            ctx.globalAlpha = s.a * (0.8 + 0.2*Math.sin((t*0.5 + i*0.37)));
            ctx.fillStyle = '#c7d2fe';
            ctx.fillRect(xx, s.y, s.s, s.s);
          }
          ctx.restore();
        }
      } else if (L.hills) {
        drawHills(ctx, viewW, viewH, camX, t, L);
      }
    }

    // Boden-Nebel (sanfter Verlauf)
    const fog = ctx.createLinearGradient(0, viewH*0.65, 0, viewH);
    fog.addColorStop(0, 'rgba(17,23,35,0)');
    fog.addColorStop(1, 'rgba(17,23,35,0.65)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, viewH*0.65, viewW, viewH*0.35);
  }

  return { draw };
})();
