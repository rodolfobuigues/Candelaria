// Catálogo con costo y precio ya derivados por el motor — ESPECIFICACION.md
// § 4. Memoizado para no recalcular 76 productos en cada tecla del
// buscador: el resultado se cachea y se reutiliza mientras `parametros` no
// cambie de valor. Cambiar un insumo (o un producto/combo) no se puede
// detectar automáticamente sin escuchar IndexedDB, así que quien escriba en
// esas tiendas tiene que llamar invalidarCatalogo() a mano.
import { TIENDAS } from './esquema.js';
import { obtenerTodos } from './db.js';
import { ROLES_INSUMOS_FIJOS, normalizarNombreInsumo } from '../config/insumosFijos.js';
import {
  calcularCostoUnitario,
  calcularCostoProducto,
  calcularCostoCombo,
  resolverRecipienteCosto,
} from '../motor/calculo.js';

// El rol persistido es independiente del nombre editable. Las referencias
// antiguas se reconocen sin reescribir la base al leer; al editarlas la UI
// conserva su rol antes de cambiar el texto.
export function resolverInsumosFijos(insumos, parametros = {}, requeridos = null) {
  const porId = new Map(insumos.map((insumo) => [String(insumo.id), insumo]));
  const resueltos = {};
  const usados = new Set();
  for (const { id: clave, nombres, codigo } of ROLES_INSUMOS_FIJOS) {
    if (requeridos && !requeridos.has(clave)) { resueltos[clave] = 0; continue; }
    const asignados = insumos.filter((insumo) => insumo.rolMotor === clave);
    if (asignados.length > 1) throw new Error(`Hay más de un insumo con el rol ${clave}. Corregilo en Productos → Insumos.`);
    const configurado = parametros.insumosFijos?.[clave];
    const insumo = asignados[0] ?? (configurado ? porId.get(String(configurado)) : null)
      ?? insumos.find((item) => !item.rolMotor && nombres.includes(normalizarNombreInsumo(item.nombre)))
      ?? insumos.find((item) => !item.rolMotor && String(item.codigo ?? item.id).toUpperCase() === codigo && !usados.has(item.id));
    if (!insumo) {
      throw new Error(
        `No se encontró el insumo fijo "${clave}". Asigná su rol en Productos → Insumos.`
      );
    }
    if (usados.has(insumo.id)) throw new Error(`El insumo ${insumo.codigo ?? insumo.id} está asignado a más de un rol del motor.`);
    usados.add(insumo.id);
    resueltos[clave] = calcularCostoUnitario(insumo.montoCompra, insumo.cantidadCompra);
  }
  return resueltos;
}

// Cálculo puro reutilizado por la exportación y la simulación de importaciones.
// Incluye registros inactivos; el catálogo de venta los filtra después.
export function calcularCatalogoDesdeDatos({ insumos, productos, combos }, parametros) {
  if (!insumos.length && !productos.length && !combos.length) return { productos: [], combos: [] };
  const requeridos = new Set();
  for (const producto of productos) {
    if (producto.ceraAltoPF > 0) requeridos.add('ceraAltoPF');
    if (producto.ceraBajoPF > 0) requeridos.add('ceraBajoPF');
    if (producto.pabilo > 0) requeridos.add('pabilo');
    if (producto.yeso > 0) requeridos.add('yeso');
    if ((producto.ceraAltoPF ?? 0) + (producto.ceraBajoPF ?? 0) > 0) {
      if (parametros.porcentajeEsencia > 0) requeridos.add('esencia');
      if (parametros.mlColorantePorGramoCera > 0) requeridos.add('colorante');
      if (parametros.unidadesCocoPorGramoCera > 0) requeridos.add('aceiteCoco');
    }
  }
  const costosInsumosFijos = resolverInsumosFijos(insumos, parametros, requeridos);
  const costosInsumosPorId = new Map(
    insumos.map((i) => [i.id, calcularCostoUnitario(i.montoCompra, i.cantidadCompra)])
  );
  const productosPorId = new Map(productos.map((p) => [p.id, p]));

  const productosConDerivados = productos.map((producto) => {
    const recipienteCostoResuelto = resolverRecipienteCosto(producto, productosPorId);
    const extras = (producto.extras ?? []).map((extra) => {
      if (!costosInsumosPorId.has(extra.insumoId)) throw new Error(`El producto ${producto.codigo} tiene un extra inexistente: ${extra.insumoId}.`);
      return { costoUnitario: costosInsumosPorId.get(extra.insumoId), cantidad: extra.cantidad };
    });

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
    const lineas = (combo.lineas ?? []).map((linea) => ({ ...linea, costoUnit: costoUnitLinea(linea) }));
    const { costoCombo, precioCombo } = calcularCostoCombo(lineas, parametros);
    return { ...combo, lineas, costoCombo, precioCombo };
  });

  return {
    productos: productosConDerivados,
    combos: combosConDerivados,
  };
}

async function construirCatalogo(db, parametros) {
  const [insumos, productos, combos] = await Promise.all([
    obtenerTodos(db, TIENDAS.INSUMOS),
    obtenerTodos(db, TIENDAS.PRODUCTOS),
    obtenerTodos(db, TIENDAS.COMBOS),
  ]);
  const catalogo = calcularCatalogoDesdeDatos({ insumos, productos, combos }, parametros);
  return { productos: catalogo.productos.filter((p) => p.activo), combos: catalogo.combos.filter((c) => c.activo) };
}

let cache = null; // { parametrosJSON, promesa }

export function invalidarCatalogo() {
  cache = null;
}

export function obtenerCatalogo(db, parametros) {
  const parametrosJSON = JSON.stringify(parametros);
  if (!cache || cache.db !== db || cache.parametrosJSON !== parametrosJSON) {
    const promesa = construirCatalogo(db, parametros);
    cache = { db, parametrosJSON, promesa };
    promesa.catch(() => { if (cache?.promesa === promesa) cache = null; });
  }
  return cache.promesa;
}
