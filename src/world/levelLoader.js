// Rueckgabe: { name, spawn, platforms, tiles, coins, enemies, checkpoints, movingPlatforms, goal, bounds }

window.Game = window.Game || {};
window.Game.World = window.Game.World || {};
window.Game.World.LevelLoader = (function () {
  'use strict';

  async function load(name) {
    const res = await fetch(`levels/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Level "${name}" konnte nicht geladen werden (${res.status})`);
    const data = await res.json();

    const platforms       = Array.isArray(data.platforms)        ? data.platforms        : [];
    const spawn           = data.spawn || { x: 0, y: 0 };
    const tiles           = data.tiles || null;
    const coins           = Array.isArray(data.coins)            ? data.coins            : [];
    const enemies         = Array.isArray(data.enemies)          ? data.enemies          : [];
    const checkpoints     = Array.isArray(data.checkpoints)      ? data.checkpoints      : [];
    const movingPlatforms = Array.isArray(data.movingPlatforms)  ? data.movingPlatforms  : [];
    const goal            = data.goal || null;

    // Bounds aus statischen + beweglichen Plattformen
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const rects = platforms.concat(movingPlatforms);
    if (rects.length === 0) { minX = -50; minY = -20; maxX = 50; maxY = 50; }
    for (const r of rects) {
      if (r.x < minX) minX = r.x;
      if (r.y < minY) minY = r.y;
      if (r.x + r.w > maxX) maxX = r.x + r.w;
      if (r.y + r.h > maxY) maxY = r.y + r.h;
    }
    const pad = typeof data.boundsPadding === 'number' ? data.boundsPadding : 2;
    const bounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };

    return { name: data.name || name, spawn, platforms, tiles, coins, enemies, checkpoints, movingPlatforms, goal, bounds };
  }

  return { load };
})();
