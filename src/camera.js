// Game.Camera – sanfte Kamera mit lerp/SmoothDamp-ähnlichem Verhalten,
// Offsets und Begrenzung auf Level-Bounds.
//
// Koordinaten:
// - camera.x / camera.y sind die Weltkoordinaten des Bildschirm-Zentrums (in "Metern").
// - Bounds beziehen sich auf Weltkoordinaten (minX, minY, maxX, maxY).
//
// API:
//   const cam = Game.Camera.create();
//   cam.setOffsets(ox, oy);
//   cam.setBounds(minX, minY, maxX, maxY);
//   cam.resize(viewportW_px, viewportH_px, pxPerM);
//   cam.snapTo(x,y);          // sofort setzen (ohne Smooth)
//   cam.follow(targetX, targetY, dt, smooth); // weiches Folgen (smooth ~ 6..12)
//   cam.worldToScreen(x,y, viewport) -> {x,y} (Pixel)

window.Game = window.Game || {};
window.Game.Camera = (function () {
  'use strict';

  function create() {
    return {
      x: 0, y: 0,
      offsetX: 0, offsetY: 2,
      // Viewport in Welt-Einheiten:
      _halfW: 10, _halfH: 6,
      // Bounds:
      _hasBounds: false,
      _minX: -Infinity, _minY: -Infinity, _maxX: Infinity, _maxY: Infinity,

      setOffsets(ox = 0, oy = 0) { this.offsetX = ox; this.offsetY = oy; },

      setBounds(minX, minY, maxX, maxY) {
        this._hasBounds = true;
        this._minX = minX; this._minY = minY; this._maxX = maxX; this._maxY = maxY;
      },

      clearBounds() {
        this._hasBounds = false;
        this._minX = this._minY = -Infinity;
        this._maxX = this._maxY = Infinity;
      },

      resize(viewportW_px, viewportH_px, pxPerM) {
        this._halfW = (viewportW_px / pxPerM) * 0.5;
        this._halfH = (viewportH_px / pxPerM) * 0.5;
      },

      _clampToBounds(cx, cy) {
        if (!this._hasBounds) return { x: cx, y: cy };
        const minCX = this._minX + this._halfW;
        const maxCX = this._maxX - this._halfW;
        const minCY = this._minY + this._halfH;
        const maxCY = this._maxY - this._halfH;
        // Wenn Level kleiner als Viewport ist, mittig klemmen:
        const clampedX = (minCX > maxCX) ? (this._minX + this._maxX) * 0.5 : Math.min(Math.max(cx, minCX), maxCX);
        const clampedY = (minCY > maxCY) ? (this._minY + this._maxY) * 0.5 : Math.min(Math.max(cy, minCY), maxCY);
        return { x: clampedX, y: clampedY };
      },

      snapTo(x, y) {
        const goalX = x + this.offsetX;
        const goalY = y + this.offsetY;
        const c = this._clampToBounds(goalX, goalY);
        this.x = c.x; this.y = c.y;
      },

      follow(targetX, targetY, dt, smooth = 8) {
        // Exponentieller Annäherungsfaktor (framerate-unabhaengig)
        const t = 1 - Math.exp(-smooth * dt);
        const goalX = targetX + this.offsetX;
        const goalY = targetY + this.offsetY;
        let nx = this.x + (goalX - this.x) * t;
        let ny = this.y + (goalY - this.y) * t;
        const c = this._clampToBounds(nx, ny);
        this.x = c.x; this.y = c.y;
      },

      worldToScreen(x, y, viewportW_px, viewportH_px, pxPerM) {
        const sx = Math.round((x - this.x) * pxPerM + viewportW_px / 2);
        const sy = Math.round((y - this.y) * pxPerM + viewportH_px / 2);
        return { x: sx, y: sy };
      }
    };
  }

  return { create };
})();
