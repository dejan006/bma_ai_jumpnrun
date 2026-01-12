// Game.State.Save – Persistenz von Fortschritt & Einstellungen (localStorage)
// Schema (versioniert):
// {
//   "version": 1,
//   "unlocked": {"level1": true, "level2": true|false},
//   "lastLevel": "level1"|"level2",
//   "options": { "volume": 1.0, "controls": "wasd"|"arrows" }
// }

window.Game = window.Game || {};
window.Game.State = window.Game.State || {};

window.Game.State.Save = (function () {
  'use strict';

  const KEY = 'jumpnrun.save.v1';

  const defaults = {
    version: 1,
    unlocked: { level1: true },     // level1 immer frei
    lastLevel: 'level1',
    options: { volume: 1.0, controls: 'wasd' }
  };

  function safeParse(json) {
    try { return JSON.parse(json); } catch(e) { return null; }
  }

  function load() {
    const raw = localStorage.getItem(KEY);
    const data = safeParse(raw);
    if (!data || data.version !== 1) {
      // First run / inkompatibel → Defaults schreiben
      localStorage.setItem(KEY, JSON.stringify(defaults));
      return structuredClone(defaults);
    }
    // Merge gegen Defaults, falls Felder fehlen
    const merged = structuredClone(defaults);
    Object.assign(merged.unlocked, data.unlocked || {});
    merged.lastLevel = data.lastLevel || merged.lastLevel;
    merged.options = Object.assign({}, merged.options, data.options || {});
    return merged;
  }

  function save(state) {
    const toStore = structuredClone(defaults);
    Object.assign(toStore.unlocked, state.unlocked || {});
    toStore.lastLevel = state.lastLevel || defaults.lastLevel;
    toStore.options = Object.assign({}, defaults.options, state.options || {});
    localStorage.setItem(KEY, JSON.stringify(toStore));
  }

  function unlock(level) {
    const s = load();
    s.unlocked[level] = true;
    save(s);
  }

  function setLastLevel(level) {
    const s = load();
    s.lastLevel = level;
    save(s);
  }

  function setVolume(v) {
    const s = load();
    s.options.volume = Math.max(0, Math.min(1, +v || 0));
    save(s);
  }

  function setControls(mode) {
    const s = load();
    s.options.controls = (mode === 'arrows') ? 'arrows' : 'wasd';
    save(s);
  }

  return { load, save, unlock, setLastLevel, setVolume, setControls };
})();
