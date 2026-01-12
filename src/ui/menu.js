// Game.UI.Menu – Startmenü & Pausemenü (Canvas-Gerendert)
// Screens: 'start', 'pause', 'options'
// Navigation: Pfeile/W/S bzw. ArrowUp/ArrowDown, Enter/Space = bestätigen, Esc = zurück/pausieren
// Callback-API: onStart, onResume, onReset, onOpenOptions, onBackToStart
// Hinweis: bewusst minimal gehalten (kein Maus-Focus), leicht erweiterbar.

window.Game = window.Game || {};
window.Game.UI = window.Game.UI || {};

window.Game.UI.Menu = (function () {
  'use strict';

  function create() {
    const state = {
      screen: 'start', // 'start' | 'pause' | 'options'
      sel: 0,
      items: [],
      cb: {
        onStart: null,
        onResume: null,
        onReset: null,
        onOpenOptions: null,
        onBackToStart: null
      }
    };

    function setCallbacks(cbs) {
      Object.assign(state.cb, cbs || {});
    }

    function open(screen) {
      state.screen = screen;
      if (screen === 'start') {
        state.items = [
          { label: 'Start',    action: () => state.cb.onStart && state.cb.onStart() },
          { label: 'Optionen', action: () => state.cb.onOpenOptions && state.cb.onOpenOptions() },
          { label: 'Reset',    action: () => state.cb.onReset && state.cb.onReset() }
        ];
      } else if (screen === 'pause') {
        state.items = [
          { label: 'Fortsetzen', action: () => state.cb.onResume && state.cb.onResume() },
          { label: 'Optionen',   action: () => state.cb.onOpenOptions && state.cb.onOpenOptions() },
          { label: 'Reset',      action: () => state.cb.onReset && state.cb.onReset() },
          { label: 'Zum Start',  action: () => state.cb.onBackToStart && state.cb.onBackToStart() }
        ];
      } else { // options
        state.items = [
          { label: 'Zurück', action: () => open('pause') }
        ];
      }
      state.sel = 0;
    }

    function moveSel(d) {
      if (!state.items.length) return;
      state.sel = (state.sel + d + state.items.length) % state.items.length;
    }

    function confirm() {
      const it = state.items[state.sel];
      if (it && it.action) it.action();
    }

    function update(Input) {
      // Up/Down Navigation
      const up = Input.pressed('ArrowUp') || Input.pressed('KeyW');
      const down = Input.pressed('ArrowDown') || Input.pressed('KeyS');
      const ok = Input.pressed('Enter') || Input.pressed('Space');
      const back = Input.pressed('Escape');

      if (up) moveSel(-1);
      if (down) moveSel(+1);
      if (ok) confirm();

      if (back) {
        if (state.screen === 'options') {
          open('pause');
        } else if (state.screen === 'pause') {
          state.cb.onResume && state.cb.onResume();
        }
      }
    }

    function drawPanel(ctx, w, h, title) {
      // abgedunkelter Hintergrund
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, w, h);

      // Panel
      const pw = Math.min(420, Math.floor(w * 0.9));
      const ph = Math.min(320, Math.floor(h * 0.8));
      const px = Math.floor((w - pw) / 2);
      const py = Math.floor((h - ph) / 2);

      ctx.fillStyle = 'rgba(12,15,24,0.9)';
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

      // Titel
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(title, px + pw / 2, py + 16);

      return { px, py, pw, ph };
    }

    function draw(ctx, viewW, viewH) {
      const title = state.screen === 'start' ? 'Startmenü'
                  : state.screen === 'pause' ? 'Pause'
                  : 'Optionen';
      const panel = drawPanel(ctx, viewW, viewH, title);

      // Items
      const lineH = 30;
      let y = panel.py + 72;
      ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < state.items.length; i++) {
        const sel = (i === state.sel);
        ctx.fillStyle = sel ? '#e2e8f0' : 'rgba(255,255,255,0.8)';
        ctx.fillText(state.items[i].label, panel.px + panel.pw / 2, y + i * lineH);

        if (sel) {
          // kleine Markierung
          ctx.fillStyle = '#93c5fd';
          ctx.fillRect(panel.px + panel.pw / 2 - 80, y + i * lineH + 12, 160, 2);
        }
      }

      // Footer-Hinweis
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
      ctx.fillText('↑/↓ oder W/S: Auswahl   •   Enter/Space: OK   •   Esc: Zurück',
        panel.px + panel.pw / 2, panel.py + panel.ph - 20);
    }

    // Public API
    return { state, setCallbacks, open, update, draw };
  }

  return { create };
})();
