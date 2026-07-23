// Siembra de las 3 fixtures en IndexedDB — para ver las pantallas de Fase 4
// antes de que exista el importador (ESPECIFICACION.md § 7, Fase 5).
//
// NO es el importador: no aplica ninguna de sus reglas de limpieza. No
// resuelve la cadena `heredaCostoDe` (la columna hereda_costo_de de la
// fixture mezcla fórmulas de costo con referencias a otra fila — resolver
// eso es trabajo del importador, § 3.2.1 y § 7), no renombra los códigos
// `R150`/`R50`/`R170` a `RP150`/`RP50`/`RP170`, no interpreta fórmulas de
// Excel. Lee las fixtures tal cual y las escribe.
//
// Puro y sin IO propio (no lee archivos ni sabe de Vite): recibe el texto
// ya cargado y solo escribe en IndexedDB vía db.js. Quien lo llama desde el
// navegador es src/desarrollo/siembraFixtures.js.
import { TIENDAS } from '../persistencia/esquema.js';
import { guardar } from '../persistencia/db.js';

function numero(valor) {
  return valor === '' || valor === undefined ? 0 : parseFloat(valor);
}

function parseCSV(texto) {
  const lineas = texto.trim().split(/\r?\n/);
  const encabezados = lineas[0].split(';');
  return lineas.slice(1).map((linea) => {
    const celdas = linea.split(';');
    const fila = {};
    encabezados.forEach((encabezado, i) => {
      fila[encabezado] = celdas[i] ?? '';
    });
    return fila;
  });
}

// Traducción directa de la abreviatura de la planilla al enum de
// ESPECIFICACION.md § 3.1 — no es una regla de limpieza del importador,
// es el mínimo para poder escribir un registro válido en el esquema.
const UNIDADES = { gr: 'g', kg: 'kg', ml: 'ml', 'unid.': 'unidad', hs: 'hora' };

export function construirInsumos(textoCSV) {
  return parseCSV(textoCSV).map((fila) => ({
    id: fila.codigo,
    codigo: fila.codigo,
    nombre: fila.nombre,
    categoria: fila.categoria,
    unidad: UNIDADES[fila.unidad] ?? 'g',
    // esp_costo_prod es el costo unitario EFECTIVO (incluye los dos
    // insumos con valor forzado de § 7 regla 9). No hay monto y cantidad
    // de compra por separado en la fixture: se carga como el propio
    // fallback que § 7 prevé para cuando la fórmula no se puede derivar
    // ("cargar monto = costo unitario y cantidad = 1").
    montoCompra: numero(fila.esp_costo_prod),
    cantidadCompra: 1,
    activo: true,
  }));
}

const CATEGORIAS_PRODUCTO = {
  VELAS: 'VELA',
  RECIPIENTES: 'RECIPIENTE',
  'Reposicion Cera BPF': 'REPOSICION',
};

export function construirProductos(textoCSV) {
  return parseCSV(textoCSV).map((fila) => ({
    id: fila.codigo,
    codigo: fila.codigo,
    nombre: fila.nombre,
    categoria: CATEGORIAS_PRODUCTO[fila.categoria] ?? fila.categoria,
    ceraAltoPF: numero(fila.cera_alto_g),
    ceraBajoPF: numero(fila.cera_bajo_g),
    pabilo: numero(fila.pabilo_u),
    yeso: numero(fila.yeso_g),
    minutosManoObra: numero(fila.mo_min),
    recipienteCosto: numero(fila.recipiente_costo),
    recipienteCantidad: numero(fila.recipiente_u),
    heredaCostoDe: null,
    extras: [],
    activo: true,
  }));
}

export function construirCombos(jsonCombos, codigosProductos) {
  return jsonCombos.map((combo) => ({
    id: String(combo.id),
    nombre: combo.nombre,
    activo: true,
    lineas: combo.lineas.map((linea) => ({
      tipo: codigosProductos.has(linea.codigo) ? 'PRODUCTO' : 'INSUMO',
      refId: linea.codigo,
      cantidad: linea.cant,
    })),
  }));
}

export async function sembrar(db, { insumos, productos, combos }) {
  for (const insumo of insumos) await guardar(db, TIENDAS.INSUMOS, insumo);
  for (const producto of productos) await guardar(db, TIENDAS.PRODUCTOS, producto);
  for (const combo of combos) await guardar(db, TIENDAS.COMBOS, combo);
}
