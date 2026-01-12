// Game Main – State-Machine: Startmenü, Spielen, Pause, Optionen
// Tasten: P oder Esc = Pause/Resume, Enter = bestätigen (im Menü)

(function () {
  'use strict';

  const { Engine } = window.Game.Engine;
  const Input   = window.Game.Input;
  const Player  = window.Game.Entities.Player;
  const Coin    = window.Game.Entities.Coin;
  const Enemy   = window.Game.Entities.PatrolEnemy;
  const Cp      = window.Game.Entities.Checkpoint;
  const MPlat   = window.Game.Entities.MovingPlatform;
  const Camera  = window.Game.Camera;
  const LevelLoader = window.Game.World.LevelLoader;

  const Back  = window.Game.Render.Background;
  const Tiles = window.Game.Render.Tiles;
  const HUD   = window.Game.UI.HUD;
  const FX    = window.Game.Effects.Particles;
  const Menu  = window.Game.UI.Menu;

  const canvas = document.getElementById('game');
  const PX_PER_M = 40;

  const state = {
    time: 0,
    viewport: { w: 0, h: 0, dpr: 1 },

    gravity: 40,
    frictionGround: 18,
    frictionAir: 2,

    level: { loaded: false, name: '', platforms: [], tiles: null, coins: [], enemies: [], checkpoints: [], movingPlatforms: [], bounds: null },

    player: Player.create(0, 0),
    camera: Camera.create(),
    hud: HUD.create(),
    fx: FX.create(),
    menu: Menu.create(),

    coins: [],
    enemies: [],
    checkpoints: [],
    mplats: [],

    checkpoint: { x: 0, y: 0 },
    invulnTill: 0,
    groundUnder: null,

    // Spiel-Zustaende
    gameState: 'menu' // 'menu' | 'playing' | 'paused' | 'options'
  };

  // ---------- Helpers ----------
  function setCheckpoint(x, y) { state.checkpoint.x = x; state.checkpoint.y = y; }
  function setCheckpointToSpawn() { setCheckpoint(state.level.spawn.x, state.level.spawn.y); }

  function respawnToCheckpoint() {
    state.player.reset(state.checkpoint.x, state.checkpoint.y);
    const cx = state.player.x + state.player.w * 0.5;
    const cy = state.player.y + state.player.h * 0.5;
    state.camera.snapTo(cx, cy);
    state.invulnTill = state.time + 1.0;
    state.groundUnder = null;
  }

  function resetAllCoinsVisible() { for (const c of state.coins) c.collected = false; }

  function onPlayerHit() {
    if (state.time < state.invulnTill) return;
    state.hud.addLives(-1);
    if (state.hud.lives <= 0) { restartLevelKeepingData(); return; }
    respawnToCheckpoint();
  }

  function rebuildCoins()   { state.coins   = (state.level.coins   || []).map(c => Coin.create(c.x, c.y, 0.35)); }
  function rebuildEnemies() { state.enemies = (state.level.enemies || []).map(e => Enemy.create(e)); }
  function rebuildCheckpoints() {
    state.checkpoints = (state.level.checkpoints || []).map(cp => {
      const inst = Cp.create(cp.x, cp.y);
      if (Math.abs(cp.x - state.level.spawn.x) < 0.01 && Math.abs(cp.y - state.level.spawn.y) < 0.01) inst.active = true;
      return inst;
    });
  }
  function rebuildMovingPlatforms() { state.mplats = (state.level.movingPlatforms || []).map(mp => MPlat.create(mp)); }

  function resetToLoadedLevel() {
    const b = state.level.bounds;
    state.camera.setBounds(b.minX, b.minY, b.maxX, b.maxY);
    Tiles.buildFromLevel(state.level, PX_PER_M);
    rebuildCoins(); rebuildEnemies(); rebuildCheckpoints(); rebuildMovingPlatforms();
    setCheckpointToSpawn();
    respawnToCheckpoint();
    state.hud.resetTimer();
  }

  function restartLevelKeepingData() {
    resetToLoadedLevel();
    state.hud.setLives(3);
    state.hud.setCoins(0);
  }

  function onResize(w, h, dpr) {
    state.viewport.w = w; state.viewport.h = h; state.viewport.dpr = dpr;
    state.camera.resize(w, h, PX_PER_M);
  }

  function setGameState(s) {
    state.gameState = s;
    if (s === 'menu')     state.menu.open('start');
    if (s === 'paused')   state.menu.open('pause');
    if (s === 'options')  state.menu.open('options');
  }

  function initMenuCallbacks() {
    state.menu.setCallbacks({
      onStart: () => {
        // frischer Start
        restartLevelKeepingData();
        setGameState('playing');
      },
      onResume: () => setGameState('playing'),
      onReset: () => {
        restartLevelKeepingData();
        setGameState('playing');
      },
      onOpenOptions: () => setGameState('options'),
      onBackToStart: () => { setGameState('menu'); }
    });
  }

  function initOnce() {
    if (state._inited) return;
    Input.init();
    state.camera.setOffsets(0, 2);

    state.hud.setLives(3);
    state.hud.setCoins(0);
    state.hud.resetTimer();

    initMenuCallbacks();
    setGameState('menu'); // Beim Start im Startmenü

    LevelLoader.load('level1').then(level => {
      state.level = { ...level, loaded: true };
      resetToLoadedLevel();
    }).catch(err => {
      console.error(err);
      state.level = { loaded: true, name: 'error', platforms: [], spawn: {x:0,y:0}, bounds: {minX:-50,minY:-20,maxX:50,maxY:50},
        tiles:null, coins:[], enemies:[], checkpoints:[], movingPlatforms:[] };
      state.camera.clearBounds();
      Tiles.buildFromLevel(state.level, PX_PER_M);
      rebuildCoins(); rebuildEnemies(); rebuildCheckpoints(); rebuildMovingPlatforms();
      setCheckpointToSpawn();
      respawnToCheckpoint();
    });

    state._inited = true;
  }

  function combinedPlatformRects() {
    const list = state.level.platforms.slice();
    for (const m of state.mplats) list.push(m.aabb());
    return list;
  }

  function findMovingGroundUnderPlayer() {
    const eps = 0.02;
    const px = state.player.x, py = state.player.y, pw = state.player.w, ph = state.player.h;
    for (const m of state.mplats) {
      const a = m.aabb();
      const feetOnTop =
        (py + ph) <= (a.y + eps) && (py + ph) >= (a.y - eps) &&
        (px + pw) > a.x && px < (a.x + a.w);
      if (feetOnTop) return m;
    }
    return null;
  }

  function handleGlobalToggles() {
    // Pause-Taste: P/Esc
    const wantPause = Input.pressed('KeyP') || Input.pressed('Escape');
    if (wantPause && state.level.loaded) {
      if (state.gameState === 'playing') setGameState('paused');
      else if (state.gameState === 'paused') setGameState('playing');
    }
  }

  function onUpdate(dt) {
    state.time += dt;
    initOnce();
    handleGlobalToggles();

    // Hintergrund-Animationen etc. laufen weiter; Gameplay je nach State
    if (!state.level.loaded) return;

    if (state.gameState === 'menu' || state.gameState === 'paused' || state.gameState === 'options') {
      // Menü bekommt Eingaben, aber keine Spielwelt-Updates (Timer pausiert in Pause/Options)
      state.menu.update(Input);
      if (state.gameState === 'menu') {
        // Im Startmenü lassen wir HUD-Timer ruhen (bleibt 0)
      } else if (state.gameState === 'paused' || state.gameState === 'options') {
        // nichts tickt (keine HUD- oder Spielerupdates)
      }
      return;
    }

    // === PLAYING ===
    const wasGround = state.player.onGround;
    const prevVy = state.player.vy;

    // Bewegliche Plattformen
    for (const m of state.mplats) m.update(dt);

    // Spieler
    state.player.update(
      state.time, dt, Input, combinedPlatformRects(),
      { gravity: state.gravity, frictionGround: state.frictionGround, frictionAir: state.frictionAir }
    );

    // Jump/Land FX
    if (wasGround && !state.player.onGround && prevVy < 0) {
      const dir = (Input.pressed('ArrowRight') || Input.pressed('KeyD')) ? 1
                : (Input.pressed('ArrowLeft')  || Input.pressed('KeyA')) ? -1 : 0;
      state.fx.emitDust(state.player.x + state.player.w * 0.5, state.player.y + state.player.h, dir);
    }
    if (!wasGround && state.player.onGround) {
      state.fx.emitLanding(state.player.x + state.player.w * 0.5, state.player.y + state.player.h);
    }

    // Coins
    for (const c of state.coins) c.tryCollect(state.player, () => {
      state.hud.addCoins(1);
      state.fx.emitSparkles(c.x, c.y);
    });

    // Gegner
    for (const e of state.enemies) { e.update(dt); e.checkHit(state.player, onPlayerHit); }

    // Checkpoints
    for (const cp of state.checkpoints) {
      const activated = cp.tryActivate(state.player, (which) => {
        for (const other of state.checkpoints) if (other !== which) other.active = false;
        setCheckpoint(which.respawnX, which.respawnY);
      });
      if (activated) break;
    }

    // Mitnahme bewegliche Plattform
    let ground = null;
    if (state.player.onGround) ground = findMovingGroundUnderPlayer();
    if (ground) {
      const dx = ground.x - ground.prevX;
      const dy = ground.y - ground.prevY;
      state.player.x += dx; state.player.y += dy;
      const a = ground.aabb();
      if (state.player.y + state.player.h > a.y) state.player.y = a.y - state.player.h;
      state.groundUnder = ground;
    } else {
      state.groundUnder = null;
    }

    // Kamera, HUD, FX
    const px = state.player.x + state.player.w * 0.5;
    const py = state.player.y + state.player.h * 0.5;
    state.camera.follow(px, py, dt, 8);

    state.hud.update(dt);
    state.fx.update(dt);

    // Manueller Reset (während Spiel)
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
    // Hintergrund (läuft immer)
    Back.draw(ctx, state.viewport.w, state.viewport.h, state.camera.x, state.camera.y, state.time);

    if (!state.level.loaded) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lädt Level…', state.viewport.w / 2, state.viewport.h / 2);
      return;
    }

    // Welt zeichnen (auch im Menü sichtbar als Hintergrund)
    Tiles.draw(ctx, state.viewport.w, state.viewport.h, state.camera, PX_PER_M);

    for (const p of state.level.platforms) drawRect(ctx, p.x, p.y, p.w, p.h, 'rgba(17,20,28,0.65)');
    for (const m of state.mplats) m.draw(ctx, worldToScreen, PX_PER_M);
    for (const c of state.coins) c.draw(ctx, worldToScreen, PX_PER_M, state.time);
    for (const e of state.enemies) e.draw(ctx, worldToScreen, PX_PER_M, state.time);
    for (const cp of state.checkpoints) cp.draw(
      ctx, worldToScreen, PX_PER_M, state.time,
      Math.abs(cp.respawnX - state.checkpoint.x) < 0.01 && Math.abs(cp.respawnY - state.checkpoint.y) < 0.01
    );

    // Spieler (nur in playing sichtbar ohne Overlay-Dimmung)
    if (state.gameState === 'playing') {
      if (state.time < state.invulnTill) {
        ctx.save();
        ctx.globalAlpha = 0.6 + Math.sin(state.time * 30) * 0.2;
        state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);
        ctx.restore();
      } else {
        state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);
      }
    } else {
      // In Menüzuständen zeichnen wir den Spieler auch, aber Menü dimmt darüber
      state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);
    }

    // Partikel
    state.fx.draw(ctx, worldToScreen, PX_PER_M);

    // HUD (Timer pausiert automatisch, weil wir ihn im Update nicht erhöhen)
    state.hud.draw(ctx);

    // Menü-Overlay bei menu/pause/options
    if (state.gameState === 'menu' || state.gameState === 'paused' || state.gameState === 'options') {
      state.menu.draw(ctx, state.viewport.w, state.viewport.h);
    }

    // Debug mini
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `state=${state.gameState} lives=${state.hud.lives} coins=${state.hud.coins}`,
      state.viewport.w - 10, state.viewport.h - 10
    );
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
