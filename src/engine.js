// Game.Engine – Fixed-Timestep Game Loop + High-DPI-Resize-Handling.
window.Game = window.Game || {};
window.Game.Engine = (function () {
  'use strict';

  const DPR_MAX = 2;           // clamp fuer Performance
  const FIXED_DT = 1 / 60;     // 60 Hz Update
  const MAX_FRAME = 0.25;      // Anti-stall: max 250ms pro Frame annehmen

  class Engine {
    /**
     * @param {HTMLCanvasElement} canvas Ziel-Canvas
     * @param {object} opts { onUpdate(dt), onRender(ctx, state), onResize(w,h,dpr) }
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
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // logische Pixel
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

      // clamp bei Tab-Wechsel/Debug-Pause
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

  return { Engine, FIXED_DT };
})();
