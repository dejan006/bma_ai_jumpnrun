# Debug-Checklist (Prompt 20)

## Toggle & Sichtbarkeit
- **F1** schaltet Debug-Overlay ein/aus.
- Overlay zeigt **FPS**, **Position (x,y)**, **Velocity (vx, vy)**, **GameState**.

## Collider-Ansicht
- Player, statische Plattformen, bewegliche Plattformen, Gegner und Goal werden mit Rahmen gezeichnet.
- Prüfen:
  - Steht der Player korrekt **auf** Plattformen (kein Einsinken / Schweben)?
  - Trefferbox bei Gegnern passt zur visuellen Darstellung.
  - Goal-Box ist erreichbar (keine unsichtbare Wand).

## Ladepfad & Fallbacks
- Falls ein Renderer (Hintergrund) nicht verfügbar ist, existiert ein **Fallback**, damit das Spiel nicht hängt.
- Level-Load-Fehler: Fallback-Level verhindert dauerhaftes „Lädt Spiel…“.

## Performance
- FPS sollte **stabil** sein (60+ je nach Gerät).
- Fixed-Timestep (120 Hz) + **Interpolation** aktiv.
- Keine auffälligen GC-Spitzen im Gameplay-Hot-Path.

## Eingaben
- **F1** reagiert zuverlässig.
- Pause/Resume (Esc/P) blockiert die Physik wie erwartet.
- Touch-Controls (Mobil) bleiben funktionsfähig.

## Typische Fehlerquellen (Quick Checks)
- Stimmt die **Script-Reihenfolge** in `index.html`? (Entities/Render/State → `main.js` zuletzt)
- Existieren die **Level-Dateien** unter `/levels` und werden ohne 404 geladen?
- Sind neue Dateien in VS Code/Server **gespeichert** und Live-Server neu geladen?

