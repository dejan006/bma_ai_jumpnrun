// Game.Render.Tiles – rudimentares Tile-Rendering aus Level-JSON (Rects → Map).
// - tileSize in "Metern" (passt zu World-Koordinaten).
// - id 1 = Boden, id 2 = Deko (beide prozedural als Muster gezeichnet).
// - Wir speichern belegte Kacheln in einer Map (key "x,y") statt 2D-Array.

window.Game = window.Game || {};
window.Game.Render = window.Game.Render || {};

window.Game.Render.Tiles = (function () {
  'use strict';

  const PX = { perM: 40 }; // wird von aussen gesetzt via init(pxPerM)

  const map = new Map();   // "x,y" -> id
  let tileSize = 1;

  // Offscreen-Atlas prozedural (id -> canvas)
  const atlas = new Map();

  function makeTile(id) {
    const sizePx = Math.round(tileSize * PX.perM);
    const c = document.createElement('canvas');
    c.width = c.height = sizePx;
    const g = c.getContext('2d');

    // Hintergrund
    g.fillStyle = (id === 1) ? '#2b2f45' : '#3a3f5d';
    g.fillRect(0, 0, sizePx, sizePx);

    // Prozedurales Muster
    g.globalAlpha = 0.25;
    g.fillStyle = (id === 1) ? '#8aa4ff' : '#c6d0ff';
    for (let y = 0; y < sizePx; y += 4) {
      g.fillRect((y % 8), y, sizePx * 0.5, 1);
    }
    g.globalAlpha = 1;

    // Kanten-Shading
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 0, sizePx, 2);                  // top
    g.fillRect(0, sizePx - 2, sizePx, 2);         // bottom
    g.fillRect(0, 0, 2, sizePx);                  // left
    g.fillRect(sizePx - 2, 0, 2, sizePx);         // right

    return c;
  }

  function getTileCanvas(id) {
    if (!atlas.has(id)) atlas.set(id, makeTile(id));
    return atlas.get(id);
  }

  function fillRectToMap(rx, ry, rw, rh, id) {
    // Fülle integer Kacheln innerhalb des Rects
    const x0 = Math.floor(rx);
    const y0 = Math.floor(ry);
    const x1 = Math.ceil(rx + rw) - 1;
    const y1 = Math.ceil(ry + rh) - 1;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        map.set(`${x},${y}`, id);
      }
    }
  }

  function buildFromLevel(level, pxPerM) {
    PX.perM = pxPerM;
    map.clear();
    atlas.clear();

    if (!level.tiles || !level.tiles.layers) return;
    tileSize = level.tiles.tileSize || 1;

    for (const layer of level.tiles.layers) {
      const rects = layer.rects || [];
      for (const r of rects) {
        fillRectToMap(r.x, r.y, r.w, r.h, r.id || 1);
      }
    }
  }

  function draw(ctx, viewW_px, viewH_px, camera, pxPerM) {
    // Sichtbares Fenster in Weltkoordinaten
    const halfW = viewW_px / pxPerM * 0.5;
    const halfH = viewH_px / pxPerM * 0.5;
    const minX = Math.floor(camera.x - halfW) - 2;
    const maxX = Math.floor(camera.x + halfW) + 2;
    const minY = Math.floor(camera.y - halfH) - 2;
    const maxY = Math.floor(camera.y + halfH) + 2;

    const tilePx = Math.round(tileSize * pxPerM);

    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        const id = map.get(`${tx},${ty}`);
        if (!id) continue;
        const c = getTileCanvas(id);
        const sx = Math.round((tx - camera.x) * pxPerM + viewW_px / 2);
        const sy = Math.round((ty - camera.y) * pxPerM + viewH_px / 2);
        ctx.drawImage(c, sx, sy, tilePx, tilePx);
      }
    }
  }

  return { buildFromLevel, draw };
})();
