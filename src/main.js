// Game Main – verwendet Player-Entity mit Coyote-Time & Jump-Buffer.
// Ergebnis Prompt 3:
// - Horizontal: A/D oder Pfeile
// - Sprung: Space/W/ArrowUp (Coyote & Buffer aktiv)
// - ExtraJumps = 0
// - Flip nach Blickrichtung
// - Rendering als gelbes Rechteck
//
// Hinweise:
// - PX_PER_M steuert "Zoom". Kamera folgt sanft der Figur.
// - R setzt den Spieler zurueck.

(function () {
  'use strict';

  const { Engine } = window.Game.Engine;
  const Input = window.Game.Input;
  const Platforms = (window.Game.World && window.Game.World.platforms) || [];
  const Player = window.Game.Entities.Player;

  const canvas = document.getElementById('game');
  const PX_PER_M = 40;

  const state = {
    time: 0,
    viewport: { w: 0, h: 0, dpr: 1 },
    gravity: 40,
    frictionGround: 18,
    frictionAir: 2,

    player: Player.create(0, 0),
    camera: { x: 0, y: 0, offsetX: 0, offsetY: 2 }
  };

  function resetPlayer() {
    state.player.reset(0, 0);
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

    // Spieler-Update (inkl. Coyote/Buffer)
    state.player.update(
      state.time,
      dt,
      Input,
      Platforms,
      { gravity: state.gravity, frictionGround: state.frictionGround, frictionAir: state.frictionAir }
    );

    // Kamera folgt sanft dem Spieler-Mittelpunkt
    const vw = state.viewport.w / PX_PER_M;
    const vh = state.viewport.h / PX_PER_M;
    const pxCenterX = state.player.x + state.player.w * 0.5;
    const pxCenterY = state.player.y + state.player.h * 0.5;
    const targetX = pxCenterX - vw * 0.5 + state.camera.offsetX;
    const targetY = pxCenterY - vh * 0.5 + state.camera.offsetY;
    const smooth = 1 - Math.exp(-8 * dt);
    state.camera.x += (targetX - state.camera.x) * smooth;
    state.camera.y += (targetY - state.camera.y) * smooth;

    // Reset
    if (Input.pressed('KeyR')) resetPlayer();
  }

  function worldToScreen(x, y) {
    const sx = Math.round((x - state.camera.x) * PX_PER_M + state.viewport.w / 2);
    const sy = Math.round((y - state.camera.y) * PX_PER_M + state.viewport.h / 2);
    return { x: sx, y: sy };
  }

  function drawPlatform(ctx, x, y, w, h, color) {
    const a = worldToScreen(x, y);
    ctx.fillStyle = color;
    ctx.fillRect(a.x, a.y, Math.round(w * PX_PER_M), Math.round(h * PX_PER_M));
  }

  function onRender(ctx) {
    // Hintergrund
    ctx.clearRect(0, 0, state.viewport.w, state.viewport.h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.viewport.w, state.viewport.h);

    // Plattformen
    for (const p of Platforms) {
      drawPlatform(ctx, p.x, p.y, p.w, p.h, '#2b2f45');
    }

    // Spieler
    state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);

    // Debug-Hinweis klein unten rechts
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `v=(${state.player.vx.toFixed(2)}, ${state.player.vy.toFixed(2)}) ground=${state.player.onGround ? 'ja' : 'nein'}`,
      state.viewport.w - 10,
      state.viewport.h - 10
    );
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
