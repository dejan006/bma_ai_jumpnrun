// Game.Effects.Particles – einfacher, performanter Partikelsystem-Pool
// Features:
// - Staub-Emitter (Sprung/Landung)
// - Sparkles (bei Coin-Collect)
// - Objektpooling (kein GC-Sturm), framerateunabhaengig
//
// API:
//   const fx = Game.Effects.Particles.create();
//   fx.emitDust(x, y, dir);      // dir: -1 links, 1 rechts, 0 neutral
//   fx.emitLanding(x, y);        // kurzer, dichter Puff
//   fx.emitSparkles(x, y);
//   fx.update(dt);
//   fx.draw(ctx, worldToScreen, pxPerM);

window.Game = window.Game || {};
window.Game.Effects = window.Game.Effects || {};

window.Game.Effects.Particles = (function () {
  'use strict';

  const MAX = 600;         // Pool-Groesse
  const particles = new Array(MAX);
  let head = 0;            // Ringpuffer-Head
  let activeCount = 0;     // Anzahl aktiver Partikel (zur schnellen Schleife)

  function now() { return performance.now() / 1000; }

  function alloc() {
    // Nimm naechsten Slot im Ring; überschreibe alte, bereits tote Partikel
    const i = head;
    head = (head + 1) % MAX;
    if (!particles[i]) particles[i] = {};
    const p = particles[i];
    p.alive = true;
    p.t0 = now();
    activeCount = Math.min(MAX, activeCount + (particles[i].alive ? 0 : 0)); // bleibt konstant
    return p;
  }

  function spawnDust(x, y, count, baseVx, baseVy) {
    for (let i = 0; i < count; i++) {
      const p = alloc();
      const a = Math.random() * Math.PI; // 0..PI (nach oben)
      const sp = 2 + Math.random() * 4;
      p.x = x; p.y = y;
      p.vx = baseVx + Math.cos(a) * sp * (0.6 + Math.random() * 0.6);
      p.vy = baseVy - Math.sin(a) * sp * (0.4 + Math.random() * 0.8);
      p.ttl = 0.45 + Math.random() * 0.25;
      p.life = p.ttl;
      p.size = 0.10 + Math.random() * 0.12; // in Metern
      p.type = 'dust';
      p.color = '#d1cfc7';
      p.rot = Math.random() * Math.PI * 2;
      p.vr = (Math.random() - 0.5) * 6;
      p.gravity = 22; // schnellerer Fall fuer Staub
      p.alive = true;
    }
  }

  function spawnSparkles(x, y, count) {
    for (let i = 0; i < count; i++) {
      const p = alloc();
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      p.x = x; p.y = y;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp * 0.8;
      p.ttl = 0.35 + Math.random() * 0.25;
      p.life = p.ttl;
      p.size = 0.08 + Math.random() * 0.10;
      p.type = 'spark';
      p.color = '#ffeaa7';
      p.rot = Math.random() * Math.PI * 2;
      p.vr = (Math.random() - 0.5) * 14;
      p.gravity = 8; // leichter Fall
      p.alive = true;
    }
  }

  function update(dt) {
    const t = now();
    for (let i = 0; i < MAX; i++) {
      const p = particles[i];
      if (!p || !p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) { p.alive = false; continue; }
      // Physik
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      // Leichtes bodennahes Abbremsen fuer Staub (simple Damping)
      if (p.type === 'dust') {
        p.vx *= Math.exp(-4 * dt);
      }
    }
  }

  function draw(ctx, worldToScreen, pxPerM) {
    for (let i = 0; i < MAX; i++) {
      const p = particles[i];
      if (!p || !p.alive) continue;
      const a = worldToScreen(p.x, p.y);
      const s = Math.max(2, Math.round(p.size * pxPerM));
      const alpha = Math.max(0, Math.min(1, p.life / p.ttl));
      ctx.save();
      ctx.globalAlpha = Math.pow(alpha, 1.5);

      if (p.type === 'dust') {
        ctx.translate(a.x, a.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-s/2, -s/3, s, s * 0.66);
      } else {
        // spark
        ctx.translate(a.x, a.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-s/2, -1, s, 2);
        ctx.fillRect(-1, -s/2, 2, s);
        ctx.globalAlpha *= 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, Math.round(s * 0.65), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function create() {
    return {
      emitDust(x, y, dir = 0) {
        // dir beeinflusst leicht die Basisrichtung
        const baseVx = (dir || 0) * 2.5;
        spawnDust(x, y, 12 + (dir ? 4 : 0), baseVx, -2);
      },
      emitLanding(x, y) {
        spawnDust(x, y, 18, 0, -1.5);
      },
      emitSparkles(x, y) {
        spawnSparkles(x, y, 18);
      },
      update,
      draw
    };
  }

  return { create };
})();
