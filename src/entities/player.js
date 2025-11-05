// Game.Entities.Player – Spieler-Entity mit Laufen/Springen, Coyote-Time, Jump-Buffer.
// Rendering: gelbes Rechteck, Flip nach Blickrichtung (facing = -1/1).
//
// Inspector-Hinweise (Parameter, die du spaeter leicht anpassen kannst):
// - moveSpeed: Grundgeschwindigkeit horizontal
// - airControl: Steuerungsanteil in der Luft (0..1)
// - jumpForce: Impuls beim Sprung
// - coyoteTime: Zeitfenster nach Verlassen des Bodens, in dem Sprung noch zaehlt (Sek.)
// - jumpBuffer: Zeitfenster, um fruehe Spruenge zu puffern (Sek.)
// - extraJumps: Anzahl Zusatzspruenge in der Luft (0 = nur Bodensprung)
//
// Steuerung:
// - Links/Rechts: ArrowLeft/ArrowRight oder A/D
// - Sprung: Space/W/ArrowUp
//
// Abhaengigkeiten:
// - window.Game.Engine.moveAndCollide (Physik)
// - window.Game.Engine.aabbOverlap (fuer Bodenprobe)

window.Game = window.Game || {};
window.Game.Entities = window.Game.Entities || {};

window.Game.Entities.Player = (function () {
  'use strict';

  const { moveAndCollide, aabbOverlap } = window.Game.Engine;

  function create(initialX = 0, initialY = 0) {
    return {
      // Transform / Kinematik
      x: initialX, y: initialY,
      w: 0.9, h: 1.6,
      vx: 0, vy: 0,

      // Tuning
      moveSpeed: 12,
      airControl: 0.9,
      jumpForce: 17,
      coyoteTime: 0.10,
      jumpBuffer: 0.12,
      extraJumps: 0,

      // Status
      onGround: false,
      facing: 1, // 1 = rechts, -1 = links
      jumpsLeft: 0,
      lastOnGroundTime: -999,
      lastJumpPressedTime: -999,
      _prevJumpHeld: false,

      reset(x = initialX, y = initialY) {
        this.x = x; this.y = y;
        this.vx = 0; this.vy = 0;
        this.onGround = false;
        this.facing = 1;
        this.jumpsLeft = this.extraJumps;
        this.lastOnGroundTime = -999;
        this.lastJumpPressedTime = -999;
        this._prevJumpHeld = false;
      },

      /**
       * Update Physik + Eingaben.
       * @param {number} time   – globale Spielzeit in Sekunden
       * @param {number} dt     – fixed timestep
       * @param {object} Input  – Game.Input (pressed(code):bool)
       * @param {Array} platforms – Weltkollisionen
       * @param {object} world  – {gravity:number, frictionGround:number, frictionAir:number}
       */
      update(time, dt, Input, platforms, world) {
        // --- Eingaben ---
        const left  = Input.pressed('ArrowLeft') || Input.pressed('KeyA');
        const right = Input.pressed('ArrowRight') || Input.pressed('KeyD');
        const jumpHeld = Input.pressed('Space') || Input.pressed('KeyW') || Input.pressed('ArrowUp');

        const dir = (left ? -1 : 0) + (right ? 1 : 0);
        if (dir !== 0) this.facing = dir > 0 ? 1 : -1;

        // Rising Edge fuer Jump erfassen
        if (jumpHeld && !this._prevJumpHeld) {
          this.lastJumpPressedTime = time;
        }
        this._prevJumpHeld = jumpHeld;

        // Horizontalgeschwindigkeit richtungsabhaengig annähern
        const accel = this.onGround ? world.frictionGround : world.frictionAir;
        const target = dir * this.moveSpeed * (this.onGround ? 1 : this.airControl);
        // Exponentielle Annäherung: sanft, framerateunabhaengig
        this.vx = target + (this.vx - target) * Math.exp(-accel * dt);

        // Coyote + Buffer
        // Bodenprobe (leicht unterhalb)
        const probe = { x: this.x, y: this.y + 0.01, w: this.w, h: this.h };
        let grounded = false;
        for (const p of platforms) {
          if (aabbOverlap(probe.x, probe.y, probe.w, probe.h, p.x, p.y, p.w, p.h)) { grounded = true; break; }
        }
        if (grounded) {
          this.onGround = true;
          this.lastOnGroundTime = time;
          this.jumpsLeft = this.extraJumps;
        } else {
          this.onGround = false;
        }

        const canGroundJump = (time - this.lastOnGroundTime) <= this.coyoteTime;
        const bufferedJump  = (time - this.lastJumpPressedTime) <= this.jumpBuffer;

        if (bufferedJump && (canGroundJump || this.jumpsLeft > 0)) {
          // Vertikale Geschwindigkeit nullen, dann Impuls
          this.vy = -this.jumpForce; // negativ = nach oben (Screen y+ geht nach unten)
          if (!canGroundJump) this.jumpsLeft--;
          this.lastJumpPressedTime = -999; // Buffer verbraucht
        }

        // Gravitation
        this.vy += world.gravity * dt;

        // Bewegen + Kollision
        const moved = moveAndCollide(this, dt, platforms);
        this.x = moved.x; this.y = moved.y; this.vx = moved.vx; this.vy = moved.vy;

        if (moved.landed) {
          this.onGround = true;
          this.lastOnGroundTime = time;
          this.jumpsLeft = this.extraJumps;
        }
      },

      /**
       * Rendering als gelbes Rechteck, Flip via facing.
       * @param {CanvasRenderingContext2D} ctx
       * @param {object} view   {w,h}
       * @param {number} pxPerM – Pixel pro Meter
       * @param {function} worldToScreen – Koordinatenumrechnung
       */
      draw(ctx, view, pxPerM, worldToScreen) {
        const a = worldToScreen(this.x, this.y);
        const w = Math.round(this.w * pxPerM);
        const h = Math.round(this.h * pxPerM);

        // Um Mittelpunkt spiegeln, damit Flip sichtbar wird (z. B. Auge)
        ctx.save();
        ctx.translate(a.x + w/2, a.y + h/2);
        ctx.scale(this.facing, 1);

        // Koerper
        ctx.fillStyle = '#f4d35e';
        ctx.fillRect(-w/2, -h/2, w, h);

        // kleines "Auge", damit Flip erkennbar ist
        ctx.fillStyle = '#1b1b1b';
        ctx.fillRect(w*0.1, -h*0.15, Math.max(2, Math.floor(w*0.12)), Math.max(2, Math.floor(w*0.12)));

        ctx.restore();
      }
    };
  }

  return { create };
})();
