// Game.UI.Menu – Start/Pause/Optionen (mit einstellbarer Lautstaerke & Steuerung)
// Navigation: ↑/↓ bzw. W/S, Enter/Space = OK, Esc = Zurück, ←/→ in Optionen zum Anpassen.

window.Game = window.Game || {};
window.Game.UI = window.Game.UI || {};

window.Game.UI.Menu = (function () {
  'use strict';

  function create() {
    const state = {
      screen: 'start',   // 'start' | 'pause' | 'options'
      sel: 0,
      items: [],
      options: { volume: 1.0, controls: 'wasd' },
      cb: {
        onStart: null,
        onResume: null,
        onReset: null,
        onOpenOptions: null,
        onBackToStart: null,
        onOptionsChanged: null   // (opts) => void
      }
    };

    function setOptions(opts) {
      state.options = Object.assign({}, state.options, opts || {});
    }
    function setCallbacks(cbs) { Object.assign(state.cb, cbs || {}); }

    function open(screen) {
      state.screen = screen;
      if (screen === 'start') {
        state.items = [
          { label: 'Start',    action: () => state.cb.onStart && state.cb.onStart() },
          { label: 'Optionen', action: () => open('options') },
          { label: 'Reset',    action: () => state.cb.onReset && state.cb.onReset() }
        ];
      } else if (screen === 'pause') {
        state.items = [
          { label: 'Fortsetzen', action: () => state.cb.onResume && state.cb.onResume() },
          { label: 'Optionen',   action: () => open('options') },
          { label: 'Reset',      action: () => state.cb.onReset && state.cb.onReset() },
          { label: 'Zum Start',  action: () => state.cb.onBackToStart && state.cb.onBackToStart() }
        ];
      } else {
        // Options-Screen: pseudo-Items (Volume, Controls, Zurück)
        state.items = [
          { key: 'volume',   label: () => `Lautstaerke: ${(Math.round(state.options.volume*100)).toString().padStart(3,' ')}%` },
          { key: 'controls', label: () => `Steuerung:  ${state.options.controls === 'wasd' ? 'WASD' : 'Pfeile'}` },
          { key: 'back',     label: () => 'Zurück' }
        ];
      }
      state.sel = 0;
    }

    function moveSel(d) {
      if (!state.items.length) return;
      state.sel = (state.sel + d + state.items.length) % state.items.length;
    }

    function adjustOption(d) {
      const it = state.items[state.sel];
      if (!it || state.screen !== 'options') return;
      if (it.key === 'volume') {
        const step = 0.05;
        state.options.volume = Math.max(0, Math.min(1, state.options.volume + d * step));
        state.cb.onOptionsChanged && state.cb.onOptionsChanged(state.options);
      } else if (it.key === 'controls') {
        const modes = ['wasd', 'arrows'];
        const idx = modes.indexOf(state.options.controls);
        const next = modes[(idx + d + modes.length) % modes.length];
        state.options.controls = next;
        state.cb.onOptionsChanged && state.cb.onOptionsChanged(state.options);
      }
    }

    function confirm() {
      const it = state.items[state.sel];
      if (!it) return;
      if (state.screen === 'options') {
        if (it.key === 'back') {
          open('pause'); // zurück ins Pausemenü (oder Startmenü, wenn du willst)
        }
      } else {
        if (it.action) it.action();
      }
    }

    function update(Input) {
      const up   = Input.pressed('ArrowUp')   || Input.pressed('KeyW');
      const down = Input.pressed('ArrowDown') || Input.pressed('KeyS');
      const left = Input.pressed('ArrowLeft') || Input.pressed('KeyA');
      const right= Input.pressed('ArrowRight')|| Input.pressed('KeyD');
      const ok   = Input.pressed('Enter') || Input.pressed('Space');
      const back = Input.pressed('Escape');

      if (up) moveSel(-1);
      if (down) moveSel(+1);

      if (state.screen === 'options') {
        if (left)  adjustOption(-1);
        if (right) adjustOption(+1);
      }

      if (ok) confirm();
      if (back) {
        if (state.screen === 'options') open('pause');
        else if (state.screen === 'pause') state.cb.onResume && state.cb.onResume();
      }
    }

    function drawPanel(ctx, w, h, title) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, w, h);
      const pw = Math.min(460, Math.floor(w * 0.9));
      const ph = Math.min(360, Math.floor(h * 0.82));
      const px = Math.floor((w - pw) / 2), py = Math.floor((h - ph) / 2);
      ctx.fillStyle = 'rgba(12,15,24,0.9)'; ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(title, px + pw / 2, py + 16);
      return { px, py, pw, ph };
    }

    function draw(ctx, viewW, viewH) {
      const title = state.screen === 'start' ? 'Startmenue'
                  : state.screen === 'pause' ? 'Pause'
                  : 'Optionen';
      const panel = drawPanel(ctx, viewW, viewH, title);

      const lineH = 30;
      let y = panel.py + 72;
      ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

      for (let i = 0; i < state.items.length; i++) {
        const sel = (i === state.sel);
        const label = typeof state.items[i].label === 'function' ? state.items[i].label() : state.items[i].label;
        ctx.fillStyle = sel ? '#e2e8f0' : 'rgba(255,255,255,0.8)';
        ctx.fillText(label, panel.px + panel.pw / 2, y + i * lineH);
        if (sel) {
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(panel.px + panel.pw / 2 - 110, y + i * lineH + 12, 220, 2);
        }
      }

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      const footer = state.screen === 'options'
        ? '↑/↓: Auswahl   •   ←/→: Wert ändern   •   Enter: OK   •   Esc: Zurück'
        : '↑/↓: Auswahl   •   Enter: OK   •   Esc: Zurück';
      ctx.fillText(footer, panel.px + panel.pw / 2, panel.py + panel.ph - 20);
    }

    return { state, setOptions, setCallbacks, open, update, draw };
  }

  return { create };
})();
