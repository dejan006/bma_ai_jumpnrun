// Game.World.LevelLoader – lädt Level-JSON und berechnet Bounds.
// Nutzung:
//   LevelLoader.load('level1').then(level => { ... });
// Rückgabe-Objekt:
//   { name, spawn:{x,y}, platforms:[...], bounds:{minX,minY,maxX,maxY} }

window.Game = window.Game || {};
window.Game.World = window.Game.World || {};
window.Game.World.LevelLoader = (function () {
  'use strict';

  async function load(name) {
    const res = await fetch(`levels/${name}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Level "${name}" konnte nicht geladen werden (${res.status})`);
    const data = await res.json();

    const platforms = Array.isArray(data.platforms) ? data.platforms : [];
    const spawn = data.spawn || { x: 0, y: 0 };

    // Bounds aus Plattformen ableiten
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of platforms) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x + p.w > maxX) maxX = p.x + p.w;
      if (p.y + p.h > maxY) maxY = p.y + p.h;
    }
    const pad = typeof data.boundsPadding === 'number' ? data.boundsPadding : 2;
    if (platforms.length === 0) {
      minX = -50; minY = -20; maxX = 50; maxY = 50;
    }
    const bounds = { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };

    return { name: data.name || name, spawn, platforms, bounds };
  }

  return { load };
})();
