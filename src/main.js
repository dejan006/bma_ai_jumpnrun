// Game Main – HUD integriert (Lives/Coins/Timer) und aktualisiert sich im Spiel.

(function () {
  'use strict';

  const { Engine } = window.Game.Engine;
  const Input = window.Game.Input;
  const Player = window.Game.Entities.Player;
  const Camera = window.Game.Camera;
  const LevelLoader = window.Game.World.LevelLoader;

  const Back = window.Game.Render.Background;
  const Tiles = window.Game.Render.Tiles;
  const HUD = window.Game.UI.HUD;

  const canvas = document.getElementById('game');
  const PX_PER_M = 40;

  const state = {
    time: 0,
    viewport: { w: 0, h: 0, dpr: 1 },

    gravity: 40,
    frictionGround: 18,
    frictionAir: 2,

    level: { loaded: false, name: '', platforms: [], spawn: { x:0, y:0 }, bounds: null },

    player: Player.create(0, 0),
    camera: Camera.create(),
    hud: HUD.create()
  };

  // ---------- Helpers ----------
  function resetPlayerToSpawn() {
    state.player.reset(state.level.spawn.x, state.level.spawn.y);
    const cx = state.player.x + state.player.w * 0.5;
    const cy = state.player.y + state.player.h * 0.5;
    state.camera.snapTo(cx, cy);
    // Beispiel: Timer beim Respawn zuruecksetzen (kannst du spaeter aendern)
    state.hud.resetTimer();
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
    state.camera.setOffsets(0, 2);

    // HUD Startwerte (kannst du spaeter via Events anpassen)
    state.hud.setLives(3);
    state.hud.setCoins(0);
    state.hud.resetTimer();

    // Level laden (asynchron)
    LevelLoader.load('level1').then(level => {
      state.level = { ...level, loaded: true };
      const b = state.level.bounds;
      state.camera.setBounds(b.minX, b.minY, b.maxX, b.maxY);
      Tiles.buildFromLevel(state.level, PX_PER_M);
      resetPlayerToSpawn();
    }).catch(err => {
      console.error(err);
      state.level = { loaded: true, name: 'error', platforms: [], spawn: {x:0,y:0}, bounds: {minX:-50,minY:-20,maxX:50,maxY:50} };
      state.camera.clearBounds();
      Tiles.buildFromLevel(state.level, PX_PER_M);
      resetPlayerToSpawn();
    });

    state._inited = true;
  }

  function onUpdate(dt) {
    state.time += dt;
    initOnce();

    if (!state.level.loaded) return;

    // Spieler
    state.player.update(
      state.time,
      dt,
      Input,
      state.level.platforms,
      { gravity: state.gravity, frictionGround: state.frictionGround, frictionAir: state.frictionAir }
    );

    // Kamera
    const px = state.player.x + state.player.w * 0.5;
    const py = state.player.y + state.player.h * 0.5;
    state.camera.follow(px, py, dt, 8);

    // HUD-Zeit laeuft
    state.hud.update(dt);

    // Reset
    if (Input.pressed('KeyR')) resetPlayerToSpawn();
  }

  function worldToScreen(x, y) {
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
    // Hintergrund
    Back.draw(ctx, state.viewport.w, state.viewport.h, state.camera.x, state.camera.y, state.time);

    if (!state.level.loaded) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lädt Level…', state.viewport.w / 2, state.viewport.h / 2);
      return;
    }

    // Tiles
    Tiles.draw(ctx, state.viewport.w, state.viewport.h, state.camera, PX_PER_M);

    // Plattform-Kanten dezent
    for (const p of state.level.platforms) {
      drawRect(ctx, p.x, p.y, p.w, p.h, 'rgba(17,20,28,0.65)');
    }

    // Spieler
    state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);

    // HUD
    state.hud.draw(ctx);

    // Debug mini (unten rechts)
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `lvl=${state.level.name} cam=(${state.camera.x.toFixed(2)}, ${state.camera.y.toFixed(2)})`,
      state.viewport.w - 10,
      state.viewport.h - 10
    );
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
