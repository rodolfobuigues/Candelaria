// CLAUDE.md: PWA sin backend, host GitHub Pages con base '/candelaria/'
// (ESPECIFICACION.md § 2). Transform JSX clásico (jsxFactory/jsxFragment),
// no el runtime automático: en Vite 8 (Rolldown) el runtime automático
// resuelve react/jsx-dev-runtime en el escaneo de dependencias del
// servidor de desarrollo en vez de preact/jsx-dev-runtime, sin que
// optimizeDeps.esbuildOptions (deprecado) lo corrija. El transform clásico
// no depende de resolver ningún paquete "*jsx-runtime": cada .jsx importa
// `h`/`Fragment` de 'preact' a mano. Nada de @preact/preset-vite ni de
// dependencia nueva más allá de preact y vite, las dos únicas autorizadas.
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/candelaria/',
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
  },
});
