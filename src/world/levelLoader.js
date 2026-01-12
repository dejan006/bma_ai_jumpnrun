// Game.World.LevelLoader – lädt Level-JSON und berechnet Bounds.
// Rueckgabe: { name, spawn, platforms, tiles, coins, enemies, checkpoints, bounds }

window.Game = window.Game || {};
window.Game.World = window.Game.World || {};
window.Game.World.LevelLoader = (function () {
  'use strict';

  async function load(name) {
    const res = await fetch(`levels/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Level "${name}" konnte nicht geladen werden (${res.status})`);
    const data = await res.json();

    const platforms   = Array.isArray(data.platforms)   ? data.platforms   : [];
    const spawn       = data.spawn || { x: 0, y: 0 };
    const tiles       = data.tiles || null;
    const coins       = Array.isArray(data.coins)       ? data.coins       : [];
    const enemies     = Array.isArray(data.enemies)     ? data.enemies     : [];
    const checkpoints = Array.isArray(data.checkpoints) ? data.checkpoints : [];

    // Bounds aus Plattformen
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of platforms) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + p.w > maxX) maxX = p.x + p.w;
      if (p.y + p.h > maxY) maxY = p.y + p.h;
    }
    const pad = typeof data.boundsPadding === 'number' ? data.boundsPadding : 2;
    if (platforms.length === 0) { minX = -50; minY = -20; maxX = 50; maxY = 50; }
    const bounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };

    return { name: data.name || name, spawn, platforms, tiles, coins, enemies, checkpoints, bounds };
  }

  return { load };
})();
