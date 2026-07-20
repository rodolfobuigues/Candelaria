// Fragmentos de prueba para guardaLiterales.test.js. Viven en un .cjs a
// propósito: no está en EXTENSIONES_REVISABLES, así que puede contener los
// literales que el test necesita para verificar que el guardián los
// detecta, sin auto-bloquearse al guardar este archivo.
'use strict';

module.exports = {
  tokensCssComoTexto:
    '--color-primary: #944228; --sombra-tarjeta: 0 8px 24px rgba(32,26,24,0.06);',
  hexEnCss: '.x { color: #944228; }',
  rgbaEnCss: '.x { color: rgba(0,0,0,.5); }',
  radioLiteral: '.x { border-radius: 4px; }',
  sombraLiteral: '.x { box-shadow: 0 2px 4px #000; }',
  espaciadoLiteral: '.x { padding: 12px; margin: 4px 8px; gap: 1rem; }',
  espaciadoConTokens:
    '.x { padding: var(--esp-elemento); margin: 0; gap: var(--esp-stack-m); }',
  linkFontsGoogleapis:
    '<link href="https://fonts.googleapis.com/css2?family=Inter">',
  importRemoto: "@import url('https://cdn.example.com/x.css');",
  linkExterno: '<link rel="stylesheet" href="//cdn.example.com/x.css">',
  manifestConExcepciones: JSON.stringify({
    theme_color: '#944228',
    background_color: '#fff8f6',
    icons: [{ src: '/icono.png', color: '#000000' }],
  }),
  indexHtmlConMeta:
    '<meta name="theme-color" content="#944228"><div style="color:#123456"></div>',
  regexHexComoCodigo: 'const re = /#[0-9a-f]{3,8}/;',
  hexNoEximidoManifest: '#000000',
  hexNoEximidoIndexHtml: '#123456',
};
