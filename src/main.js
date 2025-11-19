// Game Main – nutzt Camera-Modul fuer sanftes Folgen + Level-Bounds.
// Ergebnis Prompt 4:
// - Weiche Kamera ohne Flackern (lerp/SmoothDamp-aehnlich)
// - Offsets (leicht oberhalb der Figur)
// - Begrenzung auf Level-Grenzen (aus Plattform-Extents abgeleitet)

(function () {
  'use strict';

  const { Engine } = window.Game.Engine;
  const Input = window.Game.Input;
  const Platforms = (window.Game.World && window.Game.World.platforms) || [];
  const Player = window.Game.Entities.Player;
  const Camera = window.Game.Camera;

  const canvas = document.getElementById('game');
  const PX_PER_M = 40;

  const state = {
    time: 0,
    viewport: { w: 0, h: 0, dpr: 1 },
    gravity: 40,
    frictionGround: 18,
    frictionAir: 2,

    player: Player.create(0, 0),
    camera: Camera.create()
  };

  // ---- Level-Bounds aus Plattformen ableiten ----
  function computeLevelBounds() {
    if (!Platforms.length) {
      return { minX: -50, minY: -20, maxX: 50, maxY: 50 };
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of Platforms) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + p.w > maxX) maxX = p.x + p.w;
      if (p.y + p.h > maxY) maxY = p.y + p.h;
    }
    // kleiner Rand
    const pad = 2;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function resetPlayer() {
    state.player.reset(0, 0);
    // Kamera sofort auf die Spielerposition "snappen"
    const cx = state.player.x + state.player.w * 0.5;
    const cy = state.player.y + state.player.h * 0.5;
    state.camera.snapTo(cx, cy);
  }

  function onResize(w, h, dpr) {
    state.viewport.w = w;
    state.viewport.h = h;
    state.viewport.dpr = dpr;
    state.camera.resize(w, h, PX_PER_M);
  }

  function initOnce() {
    if (state._inited) return;
    Input.init();

    // Kamera-Offsets (leicht oberhalb der Figur)
    state.camera.setOffsets(0, 2);

    // Bounds setzen
    const b = computeLevelBounds();
    state.camera.setBounds(b.minX, b.minY, b.maxX, b.maxY);

    resetPlayer();
    state._inited = true;
  }

  function onUpdate(dt) {
    state.time += dt;
    initOnce();

    // Spieler-Update
    state.player.update(
      state.time,
      dt,
      Input,
      Platforms,
      { gravity: state.gravity, frictionGround: state.frictionGround, frictionAir: state.frictionAir }
    );

    // Kamera folgt dem Spieler-Mittelpunkt
    const pxCenterX = state.player.x + state.player.w * 0.5;
    const pxCenterY = state.player.y + state.player.h * 0.5;
    state.camera.follow(pxCenterX, pxCenterY, dt, /*smooth*/ 8);

    // Reset
    if (Input.pressed('KeyR')) resetPlayer();
  }

  function worldToScreen(x, y) {
    return state.camera.worldToScreen(x, y, state.viewport.w, state.viewport.h, PX_PER_M);
  }

  function drawRect(ctx, x, y, w, h, color) {
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
      drawRect(ctx, p.x, p.y, p.w, p.h, '#2b2f45');
    }

    // Spieler
    state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);

    // Mini-Debug unten rechts
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `cam=(${state.camera.x.toFixed(2)}, ${state.camera.y.toFixed(2)}) v=(${state.player.vx.toFixed(2)}, ${state.player.vy.toFixed(2)})`,
      state.viewport.w - 10,
      state.viewport.h - 10
    );
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
