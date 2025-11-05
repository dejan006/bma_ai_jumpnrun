// Game.Engine + einfache 2D-Physik (AABB) mit separater Achsenauflösung.
// - Fixed-Timestep Loop
// - Gravitation wird von Entities genutzt (hier keine globale Physik)
// - moveAndCollide: horizontale/vertikale Sweeps
// - aabbOverlap: Kollisionstest

window.Game = window.Game || {};
window.Game.Engine = (function () {
  'use strict';

  const DPR_MAX = 2;
  const FIXED_DT = 1 / 60;
  const MAX_FRAME = 0.25;

  class Engine {
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

  // ---- AABB Utilities ----
  function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  function moveAndCollide(body, dt, platforms) {
    let { x, y, w, h, vx, vy } = body;
    // Horizontal
    x += vx * dt;
    for (const p of platforms) {
      if (aabbOverlap(x, y, w, h, p.x, p.y, p.w, p.h)) {
        if (vx > 0) x = p.x - w;
        else if (vx < 0) x = p.x + p.w;
        vx = 0;
      }
    }
    // Vertikal
    y += vy * dt;
    let landed = false;
    for (const p of platforms) {
      if (aabbOverlap(x, y, w, h, p.x, p.y, p.w, p.h)) {
        if (vy > 0) { // fallend (Screen y+ nach unten)
          y = p.y - h;
          landed = true;
        } else if (vy < 0) {
          y = p.y + p.h;
        }
        vy = 0;
      }
    }
    return { x, y, vx, vy, landed };
  }

  return { Engine, FIXED_DT, aabbOverlap, moveAndCollide };
})();
