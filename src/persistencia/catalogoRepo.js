// Catálogo con costo y precio ya derivados por el motor — ESPECIFICACION.md
// § 4. Memoizado para no recalcular 76 productos en cada tecla del
// buscador: el resultado se cachea y se reutiliza mientras `parametros` no
// cambie de valor. Cambiar un insumo (o un producto/combo) no se puede
// detectar automáticamente sin escuchar IndexedDB, así que quien escriba en
// esas tiendas tiene que llamar invalidarCatalogo() a mano.
import { TIENDAS } from './esquema.js';
import { obtenerTodos } from './db.js';
import {
  calcularCostoUnitario,
  calcularCostoProducto,
  calcularCostoCombo,
  resolverRecipienteCosto,
} from '../motor/calculo.js';

// Los siete insumos fijos de la receta no se referencian por id desde el
// producto (ESPECIFICACION.md § 3.2): se resuelven por nombre, igual que la
// planilla original con VLOOKUP (§ 7 regla 7). "Escencia" es la grafía vieja
// de la planilla; se reconocen las dos.
const NOMBRES_INSUMOS_FIJOS = {
  ceraAltoPF: ['cera alto pf'],
  ceraBajoPF: ['cera bajo pf'],
  pabilo: ['pabilo'],
  yeso: ['yeso'],
  esencia: ['esencia', 'escencia'],
  colorante: ['colorante'],
  aceiteCoco: ['aceite de coco'],
};

function resolverInsumosFijos(insumos) {
  const porNombre = new Map(insumos.map((i) => [i.nombre.trim().toLowerCase(), i]));
  const resueltos = {};
  for (const [clave, candidatos] of Object.entries(NOMBRES_INSUMOS_FIJOS)) {
    const insumo = candidatos.map((c) => porNombre.get(c)).find(Boolean);
    if (!insumo) {
      throw new Error(
        `No se encontró el insumo fijo "${clave}" (buscado como: ${candidatos.join(' / ')})`
      );
    }
    resueltos[clave] = calcularCostoUnitario(insumo.montoCompra, insumo.cantidadCompra);
  }
  return resueltos;
}

async function construirCatalogo(db, parametros) {
  const [insumos, productos, combos] = await Promise.all([
    obtenerTodos(db, TIENDAS.INSUMOS),
    obtenerTodos(db, TIENDAS.PRODUCTOS),
    obtenerTodos(db, TIENDAS.COMBOS),
  ]);

  const costosInsumosFijos = resolverInsumosFijos(insumos);
  const costosInsumosPorId = new Map(
    insumos.map((i) => [i.id, calcularCostoUnitario(i.montoCompra, i.cantidadCompra)])
  );
  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  const productosConDerivados = productos.map((producto) => {
    const recipienteCostoResuelto = resolverRecipienteCosto(producto, productosPorId);
    const extras = (producto.extras ?? []).map((extra) => ({
      costoUnitario: costosInsumosPorId.get(extra.insumoId) ?? 0,
      cantidad: extra.cantidad,
    }));

    const derivado = calcularCostoProducto(
      { ...producto, recipienteCostoResuelto, extras },
      costosInsumosFijos,
      parametros
    );

    return { ...producto, ...derivado };
  });

  const productosDerivadosPorId = new Map(productosConDerivados.map((p) => [p.id, p]));

  function costoUnitLinea(linea) {
    if (linea.tipo === 'PRODUCTO') {
      const producto = productosDerivadosPorId.get(linea.refId);
      if (!producto) {
        throw new Error(`Combo con línea a un producto inexistente: ${linea.refId}`);
      }
      return producto.costoProduccion;
    }
    const costoInsumo = costosInsumosPorId.get(linea.refId);
    if (costoInsumo === undefined) {
      throw new Error(`Combo con línea a un insumo inexistente: ${linea.refId}`);
    }
    return costoInsumo;
  }

  const combosConDerivados = combos.map((combo) => {
    const lineas = combo.lineas.map((linea) => ({ ...linea, costoUnit: costoUnitLinea(linea) }));
    const { costoCombo, precioCombo } = calcularCostoCombo(lineas, parametros);
    return { ...combo, lineas, costoCombo, precioCombo };
  });

  return {
    productos: productosConDerivados.filter((p) => p.activo),
    combos: combosConDerivados.filter((c) => c.activo),
  };
}

let cache = null; // { parametrosJSON, promesa }

export function invalidarCatalogo() {
  cache = null;
}

export function obtenerCatalogo(db, parametros) {
  const parametrosJSON = JSON.stringify(parametros);
  if (!cache || cache.parametrosJSON !== parametrosJSON) {
    cache = { parametrosJSON, promesa: construirCatalogo(db, parametros) };
  }
  return cache.promesa;
}
