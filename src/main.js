// Game Main – Barrierefreiheit & Optionen (Kontrast, Screen-Shake, Reduce Motion, Lautstärke-Persistenz)

(function () {
  'use strict';

  const { Engine } = window.Game.Engine;
  const Input   = window.Game.Input;
  const Player  = window.Game.Entities.Player;
  const Coin    = window.Game.Entities.Coin;
  const Enemy   = window.Game.Entities.PatrolEnemy;
  const Cp      = window.Game.Entities.Checkpoint;
  const MPlat   = window.Game.Entities.MovingPlatform;
  const Goal    = window.Game.Entities.Goal;
  const Camera  = window.Game.Camera;
  const LevelLoader = window.Game.World.LevelLoader;

  const Back  = window.Game.Render.Background;
  const Tiles = window.Game.Render.Tiles;
  const HUD   = window.Game.UI.HUD;
  const FX    = window.Game.Effects.Particles;
  const Menu  = window.Game.UI.Menu;
  const Save  = window.Game.State.Save;
  const Touch = window.Game.UI.TouchControls;

  const canvas = document.getElementById('game');
  const PX_PER_M = 40;

  const LEVEL_SEQUENCE = [ 'level1', 'level2' ];

  const state = {
    time: 0,
    viewport: { w: 0, h: 0, dpr: 1 },

    gravity: 40,
    frictionGround: 18,
    frictionAir: 2,

    currentLevel: 'level1',
    level: { loaded: false, name: '', platforms: [], tiles: null, coins: [], enemies: [], checkpoints: [], movingPlatforms: [], goal: null, bounds: null },

    player: Player.create(0, 0),
    camera: Camera.create(),
    hud: HUD.create(),
    fx: FX.create(),
    menu: Menu.create(),
    touch: null,

    coins: [],
    enemies: [],
    checkpoints: [],
    mplats: [],
    goal: null,

    checkpoint: { x: 0, y: 0 },
    invulnTill: 0,
    groundUnder: null,

    gameState: 'menu', // 'menu' | 'playing' | 'paused' | 'options'

    save: Save.load(), // {version, unlocked, lastLevel, options}

    // Screen-Shake
    shakeAmp: 0, // aktuelle Amplitude in px
    shakeDecay: 2.5 // Abklingrate
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
    triggerShake(8); // kräftiger Shake bei Schaden
    if (state.hud.lives <= 0) { restartLevelKeepingData(); return; }
    respawnToCheckpoint();
  }

  function rebuildCoins()        { state.coins        = (state.level.coins   || []).map(c => Coin.create(c.x, c.y, 0.35)); }
  function rebuildEnemies()      { state.enemies      = (state.level.enemies || []).map(e => Enemy.create(e)); }
  function rebuildCheckpoints()  {
    state.checkpoints = (state.level.checkpoints || []).map(cp => {
      const inst = Cp.create(cp.x, cp.y);
      if (Math.abs(cp.x - state.level.spawn.x) < 0.01 && Math.abs(cp.y - state.level.spawn.y) < 0.01) inst.active = true;
      return inst;
    });
  }
  function rebuildMovingPlatforms() { state.mplats = (state.level.movingPlatforms || []).map(mp => MPlat.create(mp)); }
  function rebuildGoal() { state.goal = state.level.goal ? Goal.create(state.level.goal) : null; }

  function resetToLoadedLevel() {
    const b = state.level.bounds;
    state.camera.setBounds(b.minX, b.minY, b.maxX, b.maxY);
    Tiles.buildFromLevel(state.level, PX_PER_M);
    rebuildCoins(); rebuildEnemies(); rebuildCheckpoints(); rebuildMovingPlatforms(); rebuildGoal();
    setCheckpointToSpawn();
    respawnToCheckpoint();
    state.hud.resetTimer();
  }

  function restartLevelKeepingData() {
    loadLevel(state.currentLevel, true);
    state.hud.setLives(3);
    state.hud.setCoins(0);
  }

  function nextLevelName() {
    const idx = LEVEL_SEQUENCE.indexOf(state.currentLevel);
    const n = (idx + 1) % LEVEL_SEQUENCE.length;
    return LEVEL_SEQUENCE[n];
  }

  function persist() {
    Save.save({
      version: 1,
      unlocked: state.save.unlocked,
      lastLevel: state.currentLevel,
      options: state.save.options
    });
  }

  async function loadLevel(name, keepHUD = false) {
    state.level.loaded = false;
    try {
      const level = await LevelLoader.load(name);
      state.level = { ...level, loaded: true };
      state.currentLevel = name;

      state.save.lastLevel = name;
      persist();

      resetToLoadedLevel();
      if (!keepHUD) {
        state.hud.setLives(3);
        state.hud.setCoins(0);
        state.hud.resetTimer();
      }
    } catch (err) {
      console.error(err);
      state.level = { loaded: true, name: 'error', platforms: [], spawn: {x:0,y:0}, bounds: {minX:-50,minY:-20,maxX:50,maxY:50},
        tiles:null, coins:[], enemies:[], checkpoints:[], movingPlatforms:[], goal:null };
      state.camera.clearBounds();
      Tiles.buildFromLevel(state.level, PX_PER_M);
      rebuildCoins(); rebuildEnemies(); rebuildCheckpoints(); rebuildMovingPlatforms(); rebuildGoal();
      setCheckpointToSpawn(); respawnToCheckpoint();
    }
  }

  function onResize(w, h, dpr) {
    state.viewport.w = w; state.viewport.h = h; state.viewport.dpr = dpr;
    state.camera.resize(w, h, PX_PER_M);
  }

  function applyLoadedOptions() {
    state.menu.setOptions(state.save.options);
    if (state.touch) state.touch.setMapping(state.save.options.controls === 'arrows' ? 'arrows' : 'wasd');
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
        const startLevel = state.save.unlocked[state.save.lastLevel] ? state.save.lastLevel : 'level1';
        loadLevel(startLevel);
        setGameState('playing');
      },
      onResume: () => setGameState('playing'),
      onReset: () => { restartLevelKeepingData(); setGameState('playing'); },
      onOpenOptions: () => setGameState('options'),
      onBackToStart: () => { setGameState('menu'); },
      onOptionsChanged: (opts) => {
        state.save.options = Object.assign({}, state.save.options, opts);
        applyLoadedOptions();
        persist();
      }
    });
  }

  function initTouchControls() {
    if (!window.Game.UI.TouchControls || state.touch) return;
    state.touch = window.Game.UI.TouchControls.create();
    state.touch.setMapping(state.save.options.controls === 'arrows' ? 'arrows' : 'wasd');
  }

  function initOnce() {
    if (state._inited) return;
    Input.init();
    state.camera.setOffsets(0, 2);

    state.hud.setLives(3);
    state.hud.setCoins(0);
    state.hud.resetTimer();

    state.save = Save.load();
    initMenuCallbacks();
    setGameState('menu');

    initTouchControls();
    applyLoadedOptions();

    const initial = state.save.unlocked[state.save.lastLevel] ? state.save.lastLevel : 'level1';
    loadLevel(initial);

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
    const wantPause = Input.pressed('KeyP') || Input.pressed('Escape');
    if (wantPause && state.level.loaded) {
      if (state.gameState === 'playing') setGameState('paused');
      else if (state.gameState === 'paused') setGameState('playing');
    }
  }

  // --- Screen-Shake helpers ---
  function triggerShake(px) {
    if (!state.save.options.screenShake || state.save.options.reduceMotion) return;
    state.shakeAmp = Math.max(state.shakeAmp, px || 4);
  }
  function updateShake(dt) {
    if (state.shakeAmp <= 0) return;
    state.shakeAmp = Math.max(0, state.shakeAmp - state.shakeDecay * dt);
  }
  function sampleShake() {
    if (state.shakeAmp <= 0) return { x: 0, y: 0 };
    const ax = (Math.random() - 0.5) * state.shakeAmp;
    const ay = (Math.random() - 0.5) * state.shakeAmp;
    return { x: ax, y: ay };
  }

  function onUpdate(dt) {
    state.time += dt;
    initOnce();
    handleGlobalToggles();
    updateShake(dt);
    if (!state.level.loaded) return;

    if (state.gameState === 'menu' || state.gameState === 'paused' || state.gameState === 'options') {
      state.menu.update(Input);
      return;
    }

    // === PLAYING ===
    const wasGround = state.player.onGround;
    const prevVy = state.player.vy;

    for (const m of state.mplats) m.update(dt);

    state.player.update(
      state.time, dt, Input, combinedPlatformRects(),
      { gravity: state.gravity, frictionGround: state.frictionGround, frictionAir: state.frictionAir }
    );

    // Jump/Land Effekte – respektiere Reduce Motion
    if (!state.save.options.reduceMotion) {
      if (wasGround && !state.player.onGround && prevVy < 0) {
        const dir = (Input.pressed('ArrowRight') || Input.pressed('KeyD')) ? 1
                  : (Input.pressed('ArrowLeft')  || Input.pressed('KeyA')) ? -1 : 0;
        state.fx.emitDust(state.player.x + state.player.w * 0.5, state.player.y + state.player.h, dir);
      }
      if (!wasGround && state.player.onGround) {
        state.fx.emitLanding(state.player.x + state.player.w * 0.5, state.player.y + state.player.h);
        triggerShake(3); // kleiner Shake bei Landung
      }
    }

    for (const c of state.coins) c.tryCollect(state.player, () => {
      state.hud.addCoins(1);
      if (!state.save.options.reduceMotion) state.fx.emitSparkles(c.x, c.y);
    });

    for (const e of state.enemies) { e.update(dt); e.checkHit(state.player, onPlayerHit); }

    for (const cp of state.checkpoints) {
      const activated = cp.tryActivate(state.player, (which) => {
        for (const other of state.checkpoints) if (other !== which) other.active = false;
        setCheckpoint(which.respawnX, which.respawnY);
      });
      if (activated) break;
    }

    if (state.goal) {
      state.goal.check(state.player, () => {
        const next = nextLevelName();
        state.save.unlocked[next] = true;
        Save.unlock(next);
        persist();
        loadLevel(next);
      });
    }

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

    const px = state.player.x + state.player.w * 0.5;
    const py = state.player.y + state.player.h * 0.5;
    state.camera.follow(px, py, dt, 8);

    state.hud.update(dt);
    state.fx.update(dt);

    if (Input.pressed('KeyR')) {
      resetAllCoinsVisible();
      state.hud.setCoins(0);
      setCheckpointToSpawn();
      respawnToCheckpoint();
      state.hud.resetTimer();
      state.hud.setLives(3);
      persist();
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

  // Kontrast-Overlays: Umrandungen für wichtige Objekte
  function outlineRect(ctx, x, y, w, h, thick = 2) {
    const a = worldToScreen(x, y);
    ctx.lineWidth = thick;
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(a.x + 0.5, a.y + 0.5, Math.round(w * PX_PER_M) - 1, Math.round(h * PX_PER_M) - 1);
    ctx.strokeStyle = '#000';
    ctx.strokeRect(a.x + 1.5, a.y + 1.5, Math.round(w * PX_PER_M) - 3, Math.round(h * PX_PER_M) - 3);
  }

  function onRender(ctx) {
    // optionaler Screen-Shake-Offset nur für Welt (nicht HUD/Menü)
    const sh = sampleShake();

    // Hintergrund
    ctx.save();
    ctx.translate(sh.x, sh.y);
    Back.draw(ctx, state.viewport.w, state.viewport.h, state.camera.x, state.camera.y, state.time);
    // Welt
    if (!state.level.loaded) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lädt Level…', state.viewport.w / 2, state.viewport.h / 2);
      ctx.restore();
      return;
    }

    Tiles.draw(ctx, state.viewport.w, state.viewport.h, state.camera, PX_PER_M);

    for (const p of state.level.platforms) drawRect(ctx, p.x, p.y, p.w, p.h, 'rgba(17,20,28,0.65)');
    for (const m of state.mplats) m.draw(ctx, worldToScreen, PX_PER_M);
    for (const c of state.coins) c.draw(ctx, worldToScreen, PX_PER_M, state.time);
    for (const e of state.enemies) e.draw(ctx, worldToScreen, PX_PER_M, state.time);
    for (const cp of state.checkpoints) cp.draw(ctx, worldToScreen, PX_PER_M, state.time,
      Math.abs(cp.respawnX - state.checkpoint.x) < 0.01 && Math.abs(cp.respawnY - state.checkpoint.y) < 0.01
    );
    if (state.goal) state.goal.draw(ctx, worldToScreen, PX_PER_M, state.time);

    // Spieler
    if (state.time < state.invulnTill) {
      ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(state.time * 30) * 0.2;
      state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);
      ctx.restore();
    } else {
      state.player.draw(ctx, state.viewport, PX_PER_M, worldToScreen);
    }

    // High-Contrast-Umrandungen
    if (state.save.options.highContrast) {
      for (const p of state.level.platforms) outlineRect(ctx, p.x, p.y, p.w, p.h, 2);
      for (const m of state.mplats) outlineRect(ctx, m.x, m.y, m.w, m.h, 2);
      for (const e of state.enemies) outlineRect(ctx, e.x, e.y, e.w, e.h, 2);
      outlineRect(ctx, state.player.x, state.player.y, state.player.w, state.player.h, 2);
      if (state.goal) outlineRect(ctx, state.goal.x, state.goal.y, state.goal.w, state.goal.h, 2);
    }

    // Partikel
    if (!state.save.options.reduceMotion) {
      state.fx.draw(ctx, worldToScreen, PX_PER_M);
    }
    ctx.restore(); // Ende Welt inkl. Shake

    // HUD
    state.hud.draw(ctx);

    // Menü-Overlay
    if (state.gameState === 'menu' || state.gameState === 'paused' || state.gameState === 'options') {
      state.menu.draw(ctx, state.viewport.w, state.viewport.h);
    }

    // Debug mini
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const unlockedList = Object.keys(state.save.unlocked).filter(k => state.save.unlocked[k]).sort().join(',');
    ctx.fillText(
      `lvl=${state.currentLevel} unlocked=[${unlockedList}] HC=${state.save.options.highContrast?'1':'0'} SM=${state.save.options.screenShake?'1':'0'} RM=${state.save.options.reduceMotion?'1':'0'}`,
      state.viewport.w - 10, state.viewport.h - 10
    );
  }

  const engine = new Engine(canvas, { onUpdate, onRender, onResize });
  engine.start();
})();
