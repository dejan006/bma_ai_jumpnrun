// Game Main – verbindet Engine, Input und Physik mit einem Test-Koerper.
// Prompt 2 Ergebnis: Gravitation, AABB-Kollision, horizontale/vertikale Sweeps.
// Steuerung: A/D oder Pfeile = laufen, SPACE = kleiner Testsprung, R = Reset.

(function () {
  'use strict';

  const { Engine, moveAndCollide } = window.Game.Engine;
  const Input = window.Game.Input;
  const Platforms = (window.Game.World && window.Game.World.platforms) || [];

  const canvas = document.getElementById('game');

  // Rendering-Scale: 1 Meter = 40 Pixel
  const PX_PER_M = 40;

  // Welt-State
  const state = {
    time: 0,
    viewport: { w: 0, h: 0, dpr: 1 },
    gravity: 40,
    frictionGround: 18,
    frictionAir: 2,
    // einfacher Player-Testkoerper
    player: {
      x: 0, y: 0, w: 0.9, h: 1.6,
      vx: 0, vy: 0,
      speed: 12,
      onGround: false
    },
    camera: { x: 0, y: 0, smooth: 0.12, offsetX: 0, offsetY: 2 }
  };

  function resetPlayer() {
    state.player.x = 0;
    state.player.y = 0;
    state.player.vx = 0;
    state.player.vy = 0;
    state.player.onGround = false;
    state.camera.x = state.player.x;
    state.camera.y = state.player.y;
  }

  function onResize(w, h, dpr) {
    state.viewport.w = w;
    state.viewport.h = h;
    state.viewport.dpr = dpr;
  }

  function initOnce() {
    if (state._inited) return;
    Input.init();
    resetPlayer();
    state._inited = true;
  }

  function onUpdate(dt) {
    state.time += dt;
    initOnce();

    const p = state.player;

    // --- Input horizontal ---
    const left  = Input.pressed('ArrowLeft') || Input.pressed('KeyA');
    const right = Input.pressed('ArrowRight') || Input.pressed('KeyD');
    let dir = (left ? -1 : 0) + (right ? 1 : 0);

    const accel = p.onGround ? state.frictionGround : state.frictionAir;
    const target = dir * p.speed * (p.onGround ? 1.0 : 0.9);
    // Bequeme Annäherung an Zielgeschwindigkeit:
    p.vx = target + (p.vx - target) * Math.exp(-accel * dt);

    // --- einfacher Testsprung ---
    if (Input.pressed('Space') && p.onGround) {
      p.vy = -16; // negativ = nach oben (Screen y+) geht nach unten
    }

    // Gravitation
    p.vy += state.gravity * dt;

    // Bewegen + Kollision
    const moved = moveAndCollide(p, dt, Platforms);
    p.x = moved.x; p.y = moved.y; p.vx = moved.vx; p.vy = moved.vy;
    p.onGround = moved.landed;

    // Kamera folgt leicht
    const vw = state.viewport.w / PX_PER_M;
    const vh = state.viewport.h / PX_PER_M;
    const cxTarget = (p.x + p.w * 0.5) - vw * 0.5 + state.camera.offsetX;
    const cyTarget = (p.y + p.h * 0.5) - vh * 0.5 + state.camera.offsetY;
    const smooth = 1 - Math.exp(-8 * dt);
    state.camera.x += (cxTarget - state.camera.x) * smooth;
    state.camera.y += (cyTarget - state.camera.y) * smooth;

    // Reset (R)
    if (Input.pressed('KeyR')) resetPlayer();
  }

  function worldToScreen(x, y) {
    // Kamera in Metern, wir rendern in Pixel
    const sx = Math.round((x - state.camera.x) * PX_PER_M + state.viewport.w / 2);
    const sy = Math.round((y - state.camera.y) * PX_PER_M + state.viewport.h / 2);
    return { x: sx, y: sy };
  }

  function drawRect(ctx, x, y, w, h, color) {
    const a = worldToScreen(x, y);
    ctx.fillStyle = color;
    ctx.fillRect(a.x, a.y, Math.round(w * PX_PER_M), Math.round(h * PX_PER_M));
  }

  function onRender(ctx) {
    // Hintergrund (schwarz wie gefordert)
    ctx.clearRect(0, 0, state.viewport.w, state.viewport.h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.viewport.w, state.viewport.h);

    // Plattformen
    for (const p of Platforms) {
      drawRect(ctx, p.x, p.y, p.w, p.h, '#2b2f45');
    }

    // Player (gelbes Rechteck)
    const pl = state.player;
    drawRect(ctx, pl.x, pl.y, pl.w, pl.h, '#f4d35e');

    // Minimale Debug-Info unten rechts (optional, sehr dezent)
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`v=(${pl.vx.toFixed(2)}, ${pl.vy.toFixed(2)}) ground=${pl.onGround ? 'ja' : 'nein'}`, state.viewport.w - 10, state.viewport.h - 10);
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
