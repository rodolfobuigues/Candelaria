// Criterio 19 (ESPECIFICACION.md § 8.5) / DISEÑO.md § 10.5: todo texto menor
// a 24 px alcanza contraste 4,5:1 contra su fondo. Se calcula parseando
// tokens.css con la fórmula WCAG estándar, sin navegador — jsdom no tiene
// motor de layout ni de color y no sirve para esto.
//
// Los pares vienen de la tabla "Reglas de uso" de DISEÑO.md § 2. Algunas
// filas de esa tabla declaran fondo y texto juntos (par explícito); otras
// declaran un solo token usado como color de texto en la prosa del propio
// § 2 ("Precio de venta", "Costo, metadatos, códigos") sin decir sobre qué
// fondo — se prueba contra los dos fondos donde realmente aparece ese texto
// en la app (pantalla y tarjeta), no se asume uno solo en silencio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_CSS = path.join(__dirname, 'tokens.css');

function leerTokens() {
  const css = fs.readFileSync(TOKENS_CSS, 'utf8');
  const tokens = {};
  for (const m of css.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

function resolver(tokens, nombre, visitados = new Set()) {
  if (visitados.has(nombre)) throw new Error(`referencia circular en --${nombre}`);
  const valor = tokens[nombre];
  if (!valor) throw new Error(`token --${nombre} no existe en tokens.css`);
  const refVar = valor.match(/^var\(--([\w-]+)\)$/);
  if (refVar) return resolver(tokens, refVar[1], new Set([...visitados, nombre]));
  return valor;
}

function hexARgb(hex) {
  const limpio = hex.replace('#', '');
  if (limpio.length === 6) {
    return {
      r: parseInt(limpio.slice(0, 2), 16),
      g: parseInt(limpio.slice(2, 4), 16),
      b: parseInt(limpio.slice(4, 6), 16),
      a: 1,
    };
  }
  if (limpio.length === 8) {
    return {
      r: parseInt(limpio.slice(0, 2), 16),
      g: parseInt(limpio.slice(2, 4), 16),
      b: parseInt(limpio.slice(4, 6), 16),
      a: parseInt(limpio.slice(6, 8), 16) / 255,
    };
  }
  throw new Error(`hex inesperado: ${hex}`);
}

function componerSobreFondo(fg, bg) {
  if (fg.a === 1) return fg;
  return {
    r: fg.a * fg.r + (1 - fg.a) * bg.r,
    g: fg.a * fg.g + (1 - fg.a) * bg.g,
    b: fg.a * fg.b + (1 - fg.a) * bg.b,
    a: 1,
  };
}

function luminanciaRelativa({ r, g, b }) {
  const canal = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function ratioContraste(colorA, colorB) {
  const la = luminanciaRelativa(colorA);
  const lb = luminanciaRelativa(colorB);
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

function ratioParTextoFondo(tokens, nombreTexto, nombreFondo) {
  const fg = hexARgb(resolver(tokens, nombreTexto));
  const bg = hexARgb(resolver(tokens, nombreFondo));
  return ratioContraste(componerSobreFondo(fg, bg), bg);
}

const PARES_MINIMO_4_5 = [
  { uso: 'Botón primario', texto: 'color-on-primary', fondo: 'color-primary' },
  { uso: 'Botón secundario, sobre pantalla', texto: 'color-on-surface', fondo: 'color-surface' },
  { uso: 'Botón secundario, sobre tarjeta', texto: 'color-on-surface', fondo: 'color-surface-container-lowest' },
  { uso: 'Barra flotante del carrito', texto: 'color-inverse-on-surface', fondo: 'color-inverse-surface' },
  // 4,57:1 con --texto-etiqueta (12 px). El margen es mínimo, pero el
  // umbral que le corresponde es 4,5 — su texto es menor a 24 px, no se
  // relaja a 3:1 (ver verificar-diseno § "Nota sobre umbrales de
  // contraste"). Si este par baja de 4,5, este test tiene que fallar.
  { uso: 'Píldora de pestaña activa', texto: 'color-on-secondary-container', fondo: 'color-secondary-container' },
  { uso: 'Avisos de atención', texto: 'color-on-error-container', fondo: 'color-error-container' },
  { uso: 'Precio de venta, sobre pantalla', texto: 'color-primary', fondo: 'color-surface' },
  { uso: 'Precio de venta, sobre tarjeta', texto: 'color-primary', fondo: 'color-surface-container-lowest' },
  { uso: 'Costo, metadatos, códigos, sobre pantalla', texto: 'color-on-surface-variant', fondo: 'color-surface' },
  { uso: 'Costo, metadatos, códigos, sobre tarjeta', texto: 'color-on-surface-variant', fondo: 'color-surface-container-lowest' },
  // DISEÑO.md § 6 (definición de componentes), no § 2: el chip de filtro
  // fija fondo y texto para sus dos estados.
  { uso: 'Chip de filtro inactivo', texto: 'color-on-surface-variant', fondo: 'color-surface-container' },
  { uso: 'Chip de filtro activo', texto: 'color-on-primary', fondo: 'color-primary' },
  // La fila de § 2 solo declara el fondo; on-surface es el color de texto
  // por defecto que usa el resto de la app sobre cualquier superficie.
  { uso: 'Fila de total resaltada', texto: 'color-on-surface', fondo: 'color-surface-container-high' },
  { uso: 'Campo de entrada', texto: 'color-on-surface', fondo: 'color-surface-container-low' },
  // Etiquetas de estado — cada una es su propio par completo fondo/texto
  // (ver DISEÑO.md § 2 y § 6): nunca un color de estado con texto blanco
  // por defecto. "impago" ya no usa outline (es color de borde, prohibido
  // como texto por § 2); usa surface-container-highest de fondo.
  { uso: 'Etiqueta de estado — pendiente', texto: 'color-on-estado-pendiente', fondo: 'color-estado-pendiente' },
  { uso: 'Etiqueta de estado — entregado', texto: 'color-on-estado-entregado', fondo: 'color-estado-entregado' },
  { uso: 'Etiqueta de estado — impago', texto: 'color-on-estado-impago', fondo: 'color-estado-impago' },
  { uso: 'Etiqueta de estado — señado', texto: 'color-on-estado-senado', fondo: 'color-estado-senado' },
  { uso: 'Etiqueta de estado — pagado', texto: 'color-on-estado-pagado', fondo: 'color-estado-pagado' },
];

test('criterio 19: todos los pares (texto, fondo) de la tabla de Reglas de uso alcanzan 4,5:1', () => {
  const tokens = leerTokens();
  const insuficientes = PARES_MINIMO_4_5
    .map((p) => ({ ...p, ratio: ratioParTextoFondo(tokens, p.texto, p.fondo) }))
    .filter((p) => p.ratio < 4.5);

  assert.deepStrictEqual(
    insuficientes,
    [],
    `Pares por debajo de 4,5:1: ${insuficientes.map((p) => `${p.uso} (${p.ratio.toFixed(2)}:1)`).join(', ')}`
  );
});

test('el dorado nunca alcanza contraste de texto — confirma por qué DISEÑO §2 lo prohíbe como color de texto', () => {
  const tokens = leerTokens();
  const sobrePantalla = ratioParTextoFondo(tokens, 'color-gold', 'color-surface');
  const sobreTarjeta = ratioParTextoFondo(tokens, 'color-gold', 'color-surface-container-lowest');
  assert.ok(sobrePantalla < 4.5, `dorado sobre pantalla dio ${sobrePantalla.toFixed(2)}:1, se esperaba que fallara`);
  assert.ok(sobreTarjeta < 4.5, `dorado sobre tarjeta dio ${sobreTarjeta.toFixed(2)}:1, se esperaba que fallara`);
});
