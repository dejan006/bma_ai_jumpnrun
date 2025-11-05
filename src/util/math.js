// Game.Math – kleine Helfer, bewusst minimal gehalten.
window.Game = window.Game || {};
window.Game.Math = (function () {
  'use strict';

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function lerp(a, b, t)     { return a + (b - a) * t; }

  return { clamp, lerp };
})();
