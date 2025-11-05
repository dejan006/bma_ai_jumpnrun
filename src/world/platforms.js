// Game.World.platforms – einfache rechteckige Plattformen.
// Koordinatensystem: y waechst nach unten (Screen-Logik).
// Werte sind in "Metern" (abstrakt), das Rendering skaliert spaeter in Pixel.

window.Game = window.Game || {};
window.Game.World = window.Game.World || {};

window.Game.World.platforms = [
  { x: -40, y: 14, w: 120, h: 2 },  // Hauptboden – lang
  { x:   8, y:  9, w: 10,  h: 1.5 },
  { x:  22, y:  6.5, w: 8, h: 1.5 },
  { x:  36, y:  4, w: 8,  h: 1.5 },
  { x:  52, y:  2, w: 10, h: 1.5 },
  { x:  70, y:  9, w: 10, h: 1.5 },
  { x:  86, y:  6, w: 8,  h: 1.5 }
];
