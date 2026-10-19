// PWA sobre GitHub Pages. JSX clásico de Preact tanto en desarrollo como
// en producción; Oxc es el transformador vigente de Vite 8.
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Candelaria/',
  plugins: [{
    name: 'candelaria-recursos-pwa',
    generateBundle(_opciones, bundle) {
      // Sólo el grafo estático de entrada. Excel y herramientas privadas
      // dinámicas se cachean al usarlas, sin descargarlas al instalar el catálogo.
      const recursos = new Set(Object.keys(bundle).filter((ruta) => /\.(css|woff2)$/.test(ruta)));
      function incluir(ruta) {
        if (recursos.has(ruta)) return;
        recursos.add(ruta);
        const chunk = bundle[ruta];
        if (chunk?.type === 'chunk') chunk.imports.forEach(incluir);
      }
      Object.values(bundle).filter((item) => item.type === 'chunk' && item.isEntry).forEach((item) => incluir(item.fileName));
      this.emitFile({ type: 'asset', fileName: 'recursos-pwa.json', source: JSON.stringify([...recursos]) });
    },
  }],
  oxc: {
    jsx: { runtime: 'classic', pragma: 'h', pragmaFrag: 'Fragment' },
  },
});
