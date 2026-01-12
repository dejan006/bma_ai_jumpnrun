// Game Main – Gegner-Patrouille + Schaden/Respawn am Checkpoint (Spawn als Checkpoint).

(function () {
  'use strict';

  const { Engine } = window.Game.Engine;
  const Input = window.Game.Input;
  const Player = window.Game.Entities.Player;
  const Coin = window.Game.Entities.Coin;
  const Enemy = window.Game.Entities.PatrolEnemy;
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

    level: { loaded: false, name: '', platforms: [], spawn: { x:0, y:0 }, bounds: null, coins: [], enemies: [] },

    player: Player.create(0, 0),
    camera: Camera.create(),
    hud: HUD.create(),

    coins: [],
    enemies: [],

    checkpoint: { x: 0, y: 0 },     // aktueller Checkpoint (Prompt 10 wird Checkpoints als Entitaet hinzufügen)
    invulnTill: 0                    // Unverwundbarkeit bis Zeitstempel (nach Treffer)
  };

  // ---------- Helpers ----------
  function setCheckpointToSpawn() {
    state.checkpoint.x = state.level.spawn.x;
    state.checkpoint.y = state.level.spawn.y;
  }

  function respawnToCheckpoint() {
    state.player.reset(state.checkpoint.x, state.checkpoint.y);
    const cx = state.player.x + state.player.w * 0.5;
    const cy = state.player.y + state.player.h * 0.5;
    state.camera.snapTo(cx, cy);
    // kurze Nach-Treffer-Unverwundbarkeit
    state.invulnTill = state.time + 1.0;
  }

  function resetAllCoinsVisible() {
    for (const c of state.coins) c.collected = false;
  }

  function onPlayerHit() {
    if (state.time < state.invulnTill) return; // noch unverwundbar
    state.hud.addLives(-1);
    respawnToCheckpoint();
  }

  function buildCoins() {
    state.coins = (state.level.coins || []).map(c => Coin.create(c.x, c.y, 0.35));
  }

  function buildEnemies() {
    state.enemies = (state.level.enemies || [])
      .filter(e => (e.type || 'patrol') === 'patrol')
      .map(e => Enemy.create(e));
  }

  function resetToLoadedLevel() {
    const b = state.level.bounds;
    state.camera.setBounds(b.minX, b.minY, b.maxX, b.maxY);
    Tiles.buildFromLevel(state.level, PX_PER_M);
    buildCoins();
    buildEnemies();
    setCheckpointToSpawn();
    respawnToCheckpoint();
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

    // HUD Start
    state.hud.setLives(3);
    state.hud.setCoins(0);
    state.hud.resetTimer();

    // Level laden
    LevelLoader.load('level1').then(level => {
      state.level = { ...level, loaded: true };
      resetToLoadedLevel();
    }).catch(err => {
      console.error(err);
      state.level = { loaded: true, name: 'error', platforms: [], spawn: {x:0,y:0}, bounds: {minX:-50,minY:-20,maxX:50,maxY:50}, coins: [], enemies: [] };
      state.camera.clearBounds();
      Tiles.buildFromLevel(state.level, PX_PER_M);
      buildCoins();
      buildEnemies();
      setCheckpointToSpawn();
      respawnToCheckpoint();
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

    // Coins
    for (const c of state.coins) {
      c.tryCollect(state.player, () => state.hud.addCoins(1));
    }

    // Enemies bewegen & Schaden pruefen
    for (const e of state.enemies) {
      e.update(dt);
      e.checkHit(state.player, onPlayerHit);
    }

    // Kamera
    const px = state.player.x + state.player.w * 0.5;
    const py = state.player.y + state.player.h * 0.5;
    state.camera.follow(px, py, dt, 8);

    // HUD
    state.hud.update(dt);

    // Reset (kompletter Level-Reset)
    if (Input.pressed('KeyR')) {
      resetAllCoinsVisible();
      state.hud.setCoins(0);
      setCheckpointToSpawn();
      respawnToCheckpoint();
      state.hud.resetTimer();
      state.hud.setLives(3);
    }
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

    // Plattformkanten
    for (const p of state.level.platforms) {
      drawRect(ctx, p.x, p.y, p.w, p.h, 'rgba(17,20,28,0.65)');
    }

    // Coins
    for (const c of state.coins) c.draw(ctx, worldToScreen, PX_PER_M, state.time);

    // Enemies
    for (const e of state.enemies) e.draw(ctx, worldToScreen, PX_PER_M, state.time);

    // Spieler (mit dezentem Hit-Feedback)
    if (state.time < state.invulnTill) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(state.time * 30) * 0.2;
      state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);
      ctx.restore();
    } else {
      state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);
    }

    // HUD
    state.hud.draw(ctx);

    // Debug mini
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `lives=${state.hud.lives} coins=${state.hud.coins} cp=(${state.checkpoint.x.toFixed(1)},${state.checkpoint.y.toFixed(1)})`,
      state.viewport.w - 10,
      state.viewport.h - 10
    );
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
