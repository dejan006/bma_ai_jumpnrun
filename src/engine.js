// Game.Engine + einfache 2D-Physik (AABB) mit separater Achsenauflösung.
// - Fixed-Timestep Loop wie in Prompt 1
// - Gravitation
// - Horizontale und vertikale Sweeps gegen rechteckige Plattformen
// - Boden-Erkennung (landed)
// Einheiten: "Meter" (abstrakt). Rendering skaliert in main.js.

window.Game = window.Game || {};
window.Game.Engine = (function () {
  'use strict';

  const DPR_MAX = 2;
  const FIXED_DT = 1 / 60;
  const MAX_FRAME = 0.25;

  class Engine {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {{onUpdate:function, onRender:function, onResize:function}} opts
     */
    constructor(canvas, opts) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.onUpdate = opts.onUpdate;
      this.onRender = opts.onRender;
      this.onResize = opts.onResize || (()=>{});

      this._acc = 0;
      this._last = performance.now() / 1000;

      this._resize = this._resize.bind(this);
      this._loop = this._loop.bind(this);

      window.addEventListener('resize', this._resize);
      this._resize();
    }

    _resize() {
      const dpr = Math.min(DPR_MAX, Math.max(1, window.devicePixelRatio || 1));
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      this.canvas.width = Math.floor(w * dpr);
      this.canvas.height = Math.floor(h * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.onResize(w, h, dpr);
    }

    start() {
      this._last = performance.now() / 1000;
      requestAnimationFrame(this._loop);
    }

    _loop() {
      const now = performance.now() / 1000;
      let frame = now - this._last;
      this._last = now;

      frame = Math.min(frame, MAX_FRAME);
      this._acc += frame;

      while (this._acc >= FIXED_DT) {
        this.onUpdate(FIXED_DT);
        this._acc -= FIXED_DT;
      }
      this.onRender(this.ctx);
      requestAnimationFrame(this._loop);
    }
  }

  // -------------------- Physik (AABB) --------------------

  /**
   * Axis-Aligned Bounding Box Kollisionsprüfung.
   */
  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /**
   * Bewege einen Korpus (Rect) und kollidiere gegen Plattformen.
   * Separater Sweep: erst X, dann Y. Liefert Info, ob gelandet wurde.
   *
   * @param {object} body {x,y,w,h,vx,vy}
   * @param {number} dt
   * @param {Array<{x,y,w,h}>} platforms
   * @returns {{x:number,y:number,vx:number,vy:number,hitX:boolean,hitY:boolean,landed:boolean}}
   */
  function moveAndCollide(body, dt, platforms) {
    let { x, y, w, h, vx, vy } = body;
    let hitX = false, hitY = false, landed = false;

    // Horizontal
    x += vx * dt;
    for (const p of platforms) {
      if (aabbOverlap(x, y, w, h, p.x, p.y, p.w, p.h)) {
        if (vx > 0) x = p.x - w;
        else if (vx < 0) x = p.x + p.w;
        vx = 0; hitX = true;
      }
    }

    // Vertikal
    y += vy * dt;
    for (const p of platforms) {
      if (aabbOverlap(x, y, w, h, p.x, p.y, p.w, p.h)) {
        if (vy > 0) { // fallend (nach unten im Screen)
          y = p.y - h;
          landed = true;
        } else if (vy < 0) {
          y = p.y + p.h;
        }
        vy = 0; hitY = true;
      }
    }

    return { x, y, vx, vy, hitX, hitY, landed };
  }

  return { Engine, FIXED_DT, aabbOverlap, moveAndCollide };
})();
