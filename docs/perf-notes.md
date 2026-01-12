# Performance-Pass (Prompt 19)

## Ziel
Stabile Physik bei variabler FPS, flüssigere Darstellung und weniger Garbage-Collection (GC).

---

## 1) Fester Timestep + Interpolation
- **Fixed step (120 Hz)** mit Accumulator (`step = 1/120s`), Clamping (`maxAccum = 0.25s`) gegen Spiral of Death.
- **Render-Interpolation**: `alpha = accum/step` wird an `onRender(ctx, alpha)` übergeben.
- **Positions-Interpolation**:
  - `player.prevX/prevY` im Fixed-Step gesichert, Render nutzt `lerp(prev → curr, alpha)`.
  - **MovingPlatforms** haben bereits `prevX/prevY` → ebenfalls interpoliert.
  - Kamera: eigene `prev`-Schattenwerte im Main; world→screen rechnet mit interpolierter Kamera.
  - Statische Objekte (Tiles/Plattformen/Checkpoints/Goal) ohne Interp (keine Bewegung nötig).

**Effekt:** Bewegung wirkt flüssig bei 60/90/120 Hz, Physik bleibt deterministisch.

---

## 2) Draw-Call & State-Change Reduktion
- **Batching statischer Plattformkanten**: eine `fillStyle`-Setzung, viele `fillRect`-Aufrufe (statt mehrfacher Style-Wechsel).
- **Kein unnötiges `save()/restore()`** im Hot-Path; nur für Spieler-Hit-Blink/Shake.
- **Hintergrund/Shake**: `ctx.translate()` einmal vor Welt-Draw; HUD/Menü ohne Shake.

---

## 3) GC-Minimierung
- **Objekt-Reuse**:
  - `tmpScreen` (gemeinsames Rückgabe-Objekt in `worldToScreen`) statt neue `{x,y}` je Call.
  - `tmpRects` als wiederverwendetes Array für kombinierte AABB-Liste.
  - Kamera-Prev/Cur in `tmpCam` statt neue Objekte je Frame.
- **Keine temporären Arrays im Hot-Path** (`slice()` → ersetzt durch manuelles Füllen).
- **Optionale Interp-Parameter** in `worldToScreen(x, y, px, py)` verhindern neue Paar-Objekte.

---

## 4) Timing & Resize
- **ResizeObserver** passt Canvas-Auflösung + DPR atomar an, ruft `onResize(w,h,dpr)` nur bei echten Änderungen.
- **Desynchronized Canvas Context** genutzt (`{ desynchronized: true }`) → geringere Input-Latenz auf unterstützten Browsern.

---

## 5) Verhalten bei Pausen & Optionen
- **Pause/Options**: Fixed-Step wird weiter getickt, aber Spiel-Update kehrt früh zurück → kein unnötiges Partikel/Physik-Work.
- **Reduce Motion**: deaktiviert Partikel & Screen-Shake direkt im Update/Render-Pfad.
- **Screen-Shake**: kleiner, GC-armer Sampler (kein großes Objektaufkommen).

---

## 6) Mögliche weitere Optimierungen (Future Work)
- **OffscreenCanvas/WebWorker** für Tiles-Render bei sehr großen Levels.
- **QuadTree / Sweep & Prune** für Kollisionen statt lineares AABB-Array.
- **Path2D**-Batching für Plattformen/Coins (wenn Stilwechsel minimiert werden kann).
- **Sprite-Atlas** + `drawImage()` statt prozeduraler Kacheln, falls Art-Assets vorliegen.
- **GPU-beschleunigte Canvas (WebGPU/WebGL)** bei hohen Auflösungen.

---
