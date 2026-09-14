// Conversión de la planilla vigente 18/08/2026 al modelo de la aplicación.
// Recibe el resultado de leerXlsx y no consulta ni incorpora fixtures antiguas.

const UNIDADES = { gr: 'g', kg: 'kg', ml: 'ml', l: 'l', 'unid.': 'unidad', hs: 'hora' };
const CODIGOS_REPOSICION = new Map([['R150', 'RP150'], ['R50', 'RP50'], ['R170', 'RP170']]);

function texto(valor) { return String(valor ?? '').trim(); }
function numero(valor) { const resultado = Number(valor); return Number.isFinite(resultado) ? resultado : 0; }
function codigoImportado(valor) { return CODIGOS_REPOSICION.get(texto(valor).toUpperCase()) ?? texto(valor).toUpperCase(); }
function hoja(libro, nombre) { return libro.hojas.find((item) => item.nombre === nombre); }

export function construirInsumosDesdeFuente(libro) {
  const materia = hoja(libro, 'Materia prima');
  if (!materia) throw new Error('La planilla no contiene la hoja "Materia prima".');
  return materia.filas
    .filter((fila) => /^(M|A|E|MO)\d*$/i.test(texto(fila[0])) && texto(fila[1]))
    .map((fila) => ({
      id: texto(fila[0]).toUpperCase(), codigo: texto(fila[0]).toUpperCase(), nombre: texto(fila[1]),
      categoria: texto(fila[0]).startsWith('M') ? (texto(fila[0]) === 'MO' ? 'MANO_DE_OBRA' : 'MATERIAL') : texto(fila[0]).startsWith('A') ? 'ACCESORIO' : 'EMPAQUE',
      unidad: UNIDADES[texto(fila[3]).toLowerCase()] ?? 'unidad', montoCompra: numero(fila[2]), cantidadCompra: 1, activo: true,
    }));
}

export function construirProductosDesdeFuente(libro) {
  const costos = hoja(libro, 'Costos');
  if (!costos) throw new Error('La planilla no contiene la hoja "Costos".');
  const porFila = new Map(costos.filas.map((fila, indice) => [indice + 1, texto(fila[0])]));
  return costos.filas
    .map((fila, indice) => ({ fila, numeroFila: indice + 1 }))
    .filter(({ fila }) => /^(V|R)\d+$/i.test(texto(fila[0])))
    .map(({ fila, numeroFila }) => {
      const codigoOriginal = texto(fila[0]).toUpperCase(); const codigo = codigoImportado(codigoOriginal);
      const formula = texto(costos.formulas?.[numeroFila - 1]?.[2]);
      const referencia = formula.match(/(?:C|E)(\d+)/i)?.[1];
      const padre = referencia ? codigoImportado(porFila.get(Number(referencia))) : null;
      return {
        id: codigo, codigo, nombre: texto(fila[1]), categoria: codigoOriginal.startsWith('V') ? 'VELA' : 'RECIPIENTE',
        ceraAltoPF: numero(fila[7]), ceraBajoPF: numero(fila[8]), pabilo: numero(fila[9]), yeso: numero(fila[11]),
        minutosManoObra: numero(fila[12]), recipienteCosto: numero(fila[2]), recipienteCantidad: numero(fila[10]),
        heredaCostoDe: padre, extras: [], activo: true,
      };
    });
}

function firmaLineas(lineas) { return lineas.map((linea) => `${codigoImportado(linea[0])}:${numero(linea[3])}`).join('|'); }

export function construirCombosDesdeFuente(libro, productos) {
  const combosHoja = hoja(libro, 'Combos');
  if (!combosHoja) throw new Error('La planilla no contiene la hoja "Combos".');
  const codigosProductos = new Set(productos.map((producto) => producto.codigo)); const resultado = []; const firmas = new Set();
  for (let indice = 0; indice < combosHoja.filas.length; indice += 1) {
    const encabezado = combosHoja.filas[indice]; const id = texto(encabezado[0]);
    if (!/^\d+$/.test(id)) continue;
    const lineas = [];
    for (let siguiente = indice + 1; siguiente < combosHoja.filas.length && !/^\d+$/.test(texto(combosHoja.filas[siguiente][0])); siguiente += 1) {
      const fila = combosHoja.filas[siguiente]; if (!texto(fila[0])) continue;
      lineas.push({ tipo: codigosProductos.has(codigoImportado(fila[0])) ? 'PRODUCTO' : 'INSUMO', refId: codigoImportado(fila[0]), cantidad: numero(fila[3]) });
    }
    if (!lineas.length) continue;
    const firma = firmaLineas(lineas.map((linea) => [linea.refId, '', '', linea.cantidad]));
    if (firmas.has(firma)) continue;
    firmas.add(firma); resultado.push({ id, nombre: texto(encabezado[1]) || `Combo ${id}`, lineas, activo: true });
  }
  return resultado;
}

export function construirCatalogoDesdeFuente(libro) {
  const insumos = construirInsumosDesdeFuente(libro); const productos = construirProductosDesdeFuente(libro);
  const combos = construirCombosDesdeFuente(libro, productos);
  return { insumos, productos, combos, fuente: 'Velas y adornos Candelaria 18-8-26.xlsx' };
}
