// Game Main – Performance Pass:
// - Fixed timestep + interpolation (alpha)
// - Draw-call/state-change minimierung
// - GC-minimierung (Objekt-/Array-Reuse, keine Hot-Path-Allokationen)

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

  const Back  = window.Game.Render.Tiles ? window.Game.Render.Background : window.Game.Render?.Background;
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

    save: Save.load(),

    // screen-shake (respektiert Optionen wie in Prompt 18)
    shakeAmp: 0,
    shakeDecay: 2.5
  };

  // ---- GC-freundliche temporäre Objekte / Arrays (einmalig anlegen, immer wiederverwenden)
  const tmpScreen = { x: 0, y: 0 };
  const tmpRects = []; // wiederverwendete Liste für combinedPlatformRects
  const tmpCam = { x: 0, y: 0, prevX: 0, prevY: 0 };

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

  function triggerShake(px) {
    if (!state.save.options?.screenShake || state.save.options?.reduceMotion) return;
    state.shakeAmp = Math.max(state.shakeAmp, px || 4);
  }
  function updateShake(dt) {
    if (state.shakeAmp > 0) state.shakeAmp = Math.max(0, state.shakeAmp - state.shakeDecay * dt);
  }
  function sampleShake() {
    if (state.shakeAmp <= 0) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * state.shakeAmp, y: (Math.random() - 0.5) * state.shakeAmp };
  }

  function onPlayerHit() {
    if (state.time < state.invulnTill) return;
    state.hud.addLives(-1);
    triggerShake(8);
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
    if (!Touch || state.touch) return;
    state.touch = Touch.create();
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

  // ---- Physics helpers (no allocations) ----
  function combinedPlatformRects(out) {
    out.length = 0;
    const base = state.level.platforms;
    for (let i = 0; i < base.length; i++) out.push(base[i]);
    const mp = state.mplats;
    for (let i = 0; i < mp.length; i++) out.push(mp[i].aabb()); // aabb returns object, but it's internal object reused in mplat
    return out;
  }

  function findMovingGroundUnderPlayer() {
    const eps = 0.02;
    const px = state.player.x, py = state.player.y, pw = state.player.w, ph = state.player.h;
    for (let i = 0; i < state.mplats.length; i++) {
      const a = state.mplats[i].aabb();
      const feetOnTop =
        (py + ph) <= (a.y + eps) && (py + ph) >= (a.y - eps) &&
        (px + pw) > a.x && px < (a.x + a.w);
      if (feetOnTop) return state.mplats[i];
    }
    return null;
  }

  // --- Interpolation support: wir merken prev-Positionen im Fixed-Step
  function stashPrevPositions() {
    // Player
    state.player.prevX = state.player.x;
    state.player.prevY = state.player.y;
    // Camera
    tmpCam.prevX = state.camera.x;
    tmpCam.prevY = state.camera.y;
    // Enemies
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      e.prevX = e.x; e.prevY = e.y;
    }
    // Moving platforms: handled internally (prevX/prevY in .update)
  }

  function onFixedUpdate(dt) {
    state.time += dt;
    initOnce();
    updateShake(dt);
    if (!state.level.loaded) return;

    handleGlobalToggles();

    if (state.gameState === 'menu' || state.gameState === 'paused' || state.gameState === 'options') {
      state.menu.update(Input);
      return;
    }

    // === PLAYING ===
    stashPrevPositions();

    const wasGround = state.player.onGround;
    const prevVy = state.player.vy;

    // Bewegliche Plattformen
    for (let i = 0; i < state.mplats.length; i++) state.mplats[i].update(dt);

    // Spieler
    state.player.update(
      state.time, dt, Input, combinedPlatformRects(tmpRects),
      { gravity: state.gravity, frictionGround: state.frictionGround, frictionAir: state.frictionAir }
    );

    // Kamera folgen (prev wurde vor dem Follow gestasht, für Interp)
    const px = state.player.x + state.player.w * 0.5;
    const py = state.player.y + state.player.h * 0.5;
    state.camera.follow(px, py, dt, 8);

    // Jump/Land Effekte (optional reduziert)
    if (!state.save.options?.reduceMotion) {
      if (wasGround && !state.player.onGround && prevVy < 0) {
        const dir = (Input.pressed('ArrowRight') || Input.pressed('KeyD')) ? 1
                  : (Input.pressed('ArrowLeft')  || Input.pressed('KeyA')) ? -1 : 0;
        state.fx.emitDust(state.player.x + state.player.w * 0.5, state.player.y + state.player.h, dir);
      }
      if (!wasGround && state.player.onGround) {
        state.fx.emitLanding(state.player.x + state.player.w * 0.5, state.player.y + state.player.h);
        triggerShake(3);
      }
    }

    // Coins
    for (let i = 0; i < state.coins.length; i++) {
      const c = state.coins[i];
      c.tryCollect(state.player, () => {
        state.hud.addCoins(1);
        if (!state.save.options?.reduceMotion) state.fx.emitSparkles(c.x, c.y);
      });
    }

    // Gegner
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      e.update(dt);
      e.checkHit(state.player, onPlayerHit);
    }

    // Checkpoints
    for (let i = 0; i < state.checkpoints.length; i++) {
      const cpInst = state.checkpoints[i];
      const activated = cpInst.tryActivate(state.player, (which) => {
        for (let j = 0; j < state.checkpoints.length; j++) if (state.checkpoints[j] !== which) state.checkpoints[j].active = false;
        setCheckpoint(which.respawnX, which.respawnY);
      });
      if (activated) break;
    }

    // Goal (Levelwechsel)
    if (state.goal) {
      state.goal.check(state.player, () => {
        const next = nextLevelName();
        state.save.unlocked[next] = true;
        Save.unlock(next);
        persist();
        loadLevel(next);
      });
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

  function handleGlobalToggles() {
    const wantPause = Input.pressed('KeyP') || Input.pressed('Escape');
    if (wantPause && state.level.loaded) {
      if (state.gameState === 'playing') setGameState('paused');
      else if (state.gameState === 'paused') setGameState('playing');
    }
  }

  // Interpoliertes world->screen Mapping (kein Objekt-Neualloc im Hot-Path)
  function makeWorldToScreen(alpha) {
    // Kamera-Interpolation (eigenes prev, da Camera selbst keine prevX/prevY hat)
    const camX = state.camera.x, camY = state.camera.y;
    tmpCam.x = tmpCam.prevX + (camX - tmpCam.prevX) * alpha;
    tmpCam.y = tmpCam.prevY + (camY - tmpCam.prevY) * alpha;

    const halfW = state.viewport.w * 0.5;
    const halfH = state.viewport.h * 0.5;
    const scale = PX_PER_M;

    return function worldToScreen(x, y, px, py) {
      // Wenn prev-Pos (px,py) übergeben wurde → interpoliere; sonst nutze (x,y) direkt
      const wx = (px === undefined) ? x : (px + (x - px) * alpha);
      const wy = (py === undefined) ? y : (py + (y - py) * alpha);
      tmpScreen.x = Math.round((wx - tmpCam.x) * scale + halfW);
      tmpScreen.y = Math.round((wy - tmpCam.y) * scale + halfH);
      return tmpScreen; // ACHTUNG: shared object, nur "read-only" direkt verwenden
    };
  }

  function drawRectInterp(ctx, worldToScreen, x, y, px, py, w, h, color) {
    const s = worldToScreen(x, y, px, py);
    ctx.fillStyle = color;
    ctx.fillRect(s.x, s.y, Math.round(w * PX_PER_M), Math.round(h * PX_PER_M));
  }

  function onRender(ctx, alpha) {
    if (!state._inited) return;

    // Hintergrund zuerst, optional shake (wird schon in Back.draw animiert)
    const sh = sampleShake();
    ctx.save();
    ctx.translate(sh.x, sh.y);
    Back.draw(ctx, state.viewport.w, state.viewport.h, state.camera.x, state.camera.y, state.time);

    const worldToScreen = makeWorldToScreen(alpha);

    if (!state.level.loaded) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ctx.font = '16px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Lädt Level…', state.viewport.w / 2, state.viewport.h / 2);
      ctx.restore();
      return;
    }

    // Tiles (intern bereits gekachelt/culling)
    Tiles.draw(ctx, state.viewport.w, state.viewport.h, state.camera, PX_PER_M);

    // Batch: statische Plattformkanten (eine Fill-Style-Setzung, viele fillRect)
    ctx.fillStyle = 'rgba(17,20,28,0.65)';
    for (let i = 0; i < state.level.platforms.length; i++) {
      const p = state.level.platforms[i];
      const s = worldToScreen(p.x, p.y); // keine Interp notwendig (statisch)
      ctx.fillRect(s.x, s.y, Math.round(p.w * PX_PER_M), Math.round(p.h * PX_PER_M));
    }

    // Bewegliche Plattformen (mit Interp aus prevX/prevY)
    for (let i = 0; i < state.mplats.length; i++) {
      const m = state.mplats[i];
      // nutze draw, aber liefere worldToScreen, das prev als optionale Parameter nutzen kann
      const aabb = m.aabb(); // shared object
      const s = worldToScreen(aabb.x, aabb.y, m.prevX, m.prevY);
      // draw ohne neue Pfade: direkt intern zeichnen
      const W = Math.round(aabb.w * PX_PER_M);
      const H = Math.round(aabb.h * PX_PER_M);
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(s.x, s.y, W, H);
      ctx.fillStyle = '#d1d5db';
      ctx.fillRect(s.x, s.y, W, Math.max(2, Math.floor(H * 0.18)));
    }

    // Coins (statisch animiert über time → keine Interp nötig)
    for (let i = 0; i < state.coins.length; i++) {
      state.coins[i].draw(ctx, worldToScreen, PX_PER_M, state.time);
    }

    // Enemies (interp über prevX/prevY, wenn vorhanden; fallback = curr)
    for (let i = 0; i < state.enemies.length; i++) {
      const e = state.enemies[i];
      // Wenn Enemy.draw(worldToScreen) intern sofort liest, können wir ihm eine wrapper-Funktion geben,
      // die prev nutzt. Viele unserer Entities lesen worldToScreen(x,y) nur einmal → ok.
      const w2s = (x, y) => worldToScreen(x, y, e.prevX, e.prevY);
      e.draw(ctx, w2s, PX_PER_M, state.time);
    }

    // Checkpoints & Goal (statisch)
    for (let i = 0; i < state.checkpoints.length; i++) {
      const cp = state.checkpoints[i];
      cp.draw(ctx, worldToScreen, PX_PER_M, state.time,
        Math.abs(cp.respawnX - state.checkpoint.x) < 0.01 && Math.abs(cp.respawnY - state.checkpoint.y) < 0.01
      );
    }
    if (state.goal) state.goal.draw(ctx, worldToScreen, PX_PER_M, state.time);

    // Spieler (mit Interp prevX/prevY)
    const w2sPlayer = (x, y) => worldToScreen(x, y, state.player.prevX, state.player.prevY);
    if (state.time < state.invulnTill) {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(state.time * 30) * 0.2;
      state.player.draw(ctx, state.viewport, PX_PER_M, w2sPlayer);
      ctx.restore();
    } else {
      state.player.draw(ctx, state.viewport, PX_PER_M, w2sPlayer);
    }

    // Partikel (nur wenn Reduce Motion aus)
    if (!state.save.options?.reduceMotion) {
      state.fx.draw(ctx, worldToScreen, PX_PER_M);
    }

    ctx.restore(); // Ende Welt (inkl. evtl. Shake)

    // HUD (keine Interp, keine Shake)
    state.hud.draw(ctx);

    // Menüs
    if (state.gameState === 'menu' || state.gameState === 'paused' || state.gameState === 'options') {
      state.menu.draw(ctx, state.viewport.w, state.viewport.h);
    }

    // Debug mini (keine neuen Strings im Hot-Path – akzeptieren wir minimal)
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    const unlockedList = Object.keys(state.save.unlocked).filter(k => state.save.unlocked[k]).sort().join(',');
    ctx.fillText(`lvl=${state.currentLevel} unlocked=[${unlockedList}]`, state.viewport.w - 10, state.viewport.h - 10);
  }

  const engine = new Engine(canvas, { onUpdate: onFixedUpdate, onRender, onResize }, { step: 1/120, maxAccum: 0.25, autoStart: true });
})();
