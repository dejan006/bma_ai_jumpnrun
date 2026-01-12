// Game.Engine – Fixed timestep + interpolation, low-GC main loop, resize handling.
// API:
//   const engine = new Game.Engine.Engine(canvas, {
//     onUpdate(dt),          // fixed step; dt in seconds
//     onRender(ctx, alpha),  // render with interpolation alpha in [0..1]
//     onResize(w, h, dpr)    // optional; called on start + when canvas size changes
//   });
//   engine.start(); engine.stop();

window.Game = window.Game || {};
window.Game.Engine = (function () {
  'use strict';

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function Engine(canvas, callbacks, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    this.cb = callbacks || {};
    this.opts = Object.assign({
      step: 1 / 120,          // physics step (s)
      maxAccum: 0.25,         // clamp to avoid spiral of death
      autoStart: false
    }, options || {});
    this._raf = 0;
    this._running = false;
    this._accum = 0;
    this._prevStamp = 0;

    // cached pixel ratio + size
    this._dpr = 1; this._vw = 0; this._vh = 0;

    // bind
    this._tick = this._tick.bind(this);

    this._resizeObserver = new ResizeObserver(() => this._applySize());
    this._resizeObserver.observe(this.canvas);

    // initial apply size & notify
    this._applySize();

    if (this.opts.autoStart) this.start();
  }

  Engine.prototype._applySize = function () {
    const dpr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    if (w !== this._vw || h !== this._vh || dpr !== this._dpr) {
      this._vw = w; this._vh = h; this._dpr = dpr;
      this.canvas.width = Math.max(1, Math.floor(w * dpr));
      this.canvas.height = Math.max(1, Math.floor(h * dpr));
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (this.cb.onResize) this.cb.onResize(this._vw, this._vh, this._dpr);
    }
  };

  Engine.prototype.start = function () {
    if (this._running) return;
    this._running = true;
    this._accum = 0;
    this._prevStamp = performance.now() / 1000;
    this._raf = requestAnimationFrame(this._tick);
  };

  Engine.prototype.stop = function () {
    if (!this._running) return;
    cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._running = false;
  };

  Engine.prototype._tick = function (tsMs) {
    if (!this._running) return;
    const now = tsMs / 1000;
    let dt = now - this._prevStamp;
    this._prevStamp = now;

    // clamp & accumulate
    dt = clamp(dt, 0, this.opts.maxAccum);
    this._accum += dt;

    const step = this.opts.step;
    while (this._accum >= step) {
      if (this.cb.onUpdate) this.cb.onUpdate(step);
      this._accum -= step;
    }
    const alpha = clamp(this._accum / step, 0, 1);

    // clear (single clear; caller draws everything)
    // NOTE: caller can also clear; leaving here for convenience
    // this.ctx.clearRect(0, 0, this._vw, this._vh);

    if (this.cb.onRender) this.cb.onRender(this.ctx, alpha);

    this._raf = requestAnimationFrame(this._tick);
  };

  return { Engine };
})();
