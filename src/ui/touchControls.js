// Game.UI.TouchControls – On-Screen-Buttons (Links/Rechts/Sprung)
// - Responsiv: nur auf Touch/kleinen Screens sichtbar (pointer: coarse)
// - Keine HTML-Anpassung nötig: UI & CSS werden per JS injiziert
// - Simuliert Keyboard-Events (Arrow- oder WASD-Mapping), damit bestehendes Input weiterverwendet wird.

window.Game = window.Game || {};
window.Game.UI = window.Game.UI || {};

window.Game.UI.TouchControls = (function () {
  'use strict';

  const prefersCoarse = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  function injectStyleOnce() {
    if (document.getElementById('tc-style')) return;
    const css = `
#tc-wrap{position:fixed;inset:0;pointer-events:none;z-index:9999;}
#tc-left,#tc-right,#tc-jump{position:fixed;bottom:16px;pointer-events:auto;touch-action:none;
  width:min(24vw,120px);height:min(24vw,120px);border-radius:16px;background:rgba(0,0,0,.35);
  border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;
  user-select:none;-webkit-user-select:none;backdrop-filter:blur(2px);}
#tc-left{left:16px;} #tc-right{left:calc(16px + min(24vw,120px) + 12px);}
#tc-jump{right:16px;}
.tc-icon{font:600 18px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;color:#eaeaea;opacity:.9}
#tc-wrap.tc-hidden{display:none;}
@media (min-width: 900px) and (pointer:fine){#tc-wrap{display:none}}
@media (orientation:portrait){
  #tc-left,#tc-right,#tc-jump{width:min(28vw,132px);height:min(28vw,132px);}
  #tc-right{left:calc(16px + min(28vw,132px) + 12px);}
}
    `.trim();
    const style = document.createElement('style');
    style.id = 'tc-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mkBtn(id, label) {
    const b = document.createElement('div');
    b.id = id;
    const t = document.createElement('div');
    t.className = 'tc-icon';
    t.textContent = label;
    b.appendChild(t);
    return b;
  }

  function synthKey(type, code) {
    // Verhindere Event-Spam: sende nur state-Transitions
    try {
      const ev = new KeyboardEvent(type, { key: '', code, bubbles: true });
      document.dispatchEvent(ev);
      window.dispatchEvent(ev);
      // Fallback für Libraries, die auf onkeydown am documentElement horchen
      (document.documentElement || document.body).dispatchEvent(ev);
    } catch (e) {}
  }

  function create() {
    injectStyleOnce();

    // Root-Container
    const wrap = document.createElement('div');
    wrap.id = 'tc-wrap';
    document.body.appendChild(wrap);

    // Buttons
    const bLeft  = mkBtn('tc-left',  '◀');
    const bRight = mkBtn('tc-right', '▶');
    const bJump  = mkBtn('tc-jump',  '⭡');

    wrap.appendChild(bLeft);
    wrap.appendChild(bRight);
    wrap.appendChild(bJump);

    // Standard-Mapping: 'wasd' oder 'arrows'
    let mapping = 'wasd';
    let mapCodes = () => ({ left: 'KeyA', right: 'KeyD', jump: 'Space' });

    function setMapping(mode) {
      mapping = (mode === 'arrows') ? 'arrows' : 'wasd';
      mapCodes = () => mapping === 'arrows'
        ? ({ left: 'ArrowLeft', right: 'ArrowRight', jump: 'Space' })
        : ({ left: 'KeyA', right: 'KeyD', jump: 'Space' });
    }

    // Button State & Handlers (unterstützt Multitouch)
    const active = { left: false, right: false, jump: false };
    const touchIds = { left: null, right: null, jump: null };

    function press(which) {
      if (active[which]) return;
      active[which] = true;
      const codes = mapCodes();
      synthKey('keydown', codes[which]);
    }
    function release(which) {
      if (!active[which]) return;
      active[which] = false;
      const codes = mapCodes();
      synthKey('keyup', codes[which]);
    }

    function bind(btn, which) {
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (touchIds[which] === null && e.changedTouches.length) {
          touchIds[which] = e.changedTouches[0].identifier;
          press(which);
        }
      }, { passive: false });

      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        for (const t of e.changedTouches) {
          if (t.identifier === touchIds[which]) {
            touchIds[which] = null;
            release(which);
          }
        }
      }, { passive: false });

      btn.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        touchIds[which] = null;
        release(which);
      }, { passive: false });

      // Optional: Maus als Notfall (z. B. Simulatoren)
      btn.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse') return;
        e.preventDefault(); press(which);
      });
      btn.addEventListener('pointerup', (e) => {
        if (e.pointerType === 'mouse') return;
        e.preventDefault(); release(which);
      });
      btn.addEventListener('pointercancel', (e) => {
        if (e.pointerType === 'mouse') return;
        e.preventDefault(); release(which);
      });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    bind(bLeft, 'left');
    bind(bRight, 'right');
    bind(bJump, 'jump');

    // Sichtbarkeit: nur auf Touch/coarse
    function updateVisibility() {
      const shouldShow = prefersCoarse();
      wrap.classList.toggle('tc-hidden', !shouldShow);
    }
    updateVisibility();
    window.matchMedia('(pointer: coarse)').addEventListener?.('change', updateVisibility);
    window.addEventListener('resize', updateVisibility);

    // Public API
    return {
      setMapping,
      show: () => wrap.classList.remove('tc-hidden'),
      hide: () => wrap.classList.add('tc-hidden'),
      destroy: () => { wrap.remove(); }
    };
  }

  return { create };
})();
