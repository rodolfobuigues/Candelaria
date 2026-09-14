const INSUMOS_FIJOS = [
  { clave: 'cera-alto-pf', aliases: ['cera alto pf'], cantidad: 'ceraAltoPF', costo: 'costoCeraAlto', unidad: 'g', nombre: 'Cera alto PF' },
  { clave: 'cera-bajo-pf', aliases: ['cera bajo pf'], cantidad: 'ceraBajoPF', costo: 'costoCeraBajo', unidad: 'g', nombre: 'Cera bajo PF' },
  { clave: 'pabilo', aliases: ['pabilo'], cantidad: 'pabilo', costo: 'costoPabilo', unidad: 'unidad', nombre: 'Pabilo' },
  { clave: 'yeso', aliases: ['yeso'], cantidad: 'yeso', costo: 'costoYeso', unidad: 'g', nombre: 'Yeso' },
  { clave: 'esencia', aliases: ['esencia', 'escencia'], cantidad: 'esenciaG', costo: 'costoEsencia', unidad: 'g', nombre: 'Esencia' },
  { clave: 'colorante', aliases: ['colorante'], cantidad: 'coloranteMl', costo: 'costoColorante', unidad: 'ml', nombre: 'Colorante' },
  { clave: 'aceite-coco', aliases: ['aceite de coco'], cantidad: 'cocoU', costo: 'costoCoco', unidad: 'unidad', nombre: 'Aceite de coco' },
];

function numero(valor) {
  const convertido = Number(valor);
  return Number.isFinite(convertido) ? convertido : 0;
}

function normalizar(texto) {
  return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
}

function sumarInsumo(acumulados, { clave, nombre, cantidad, unidad, costo }) {
  const cantidadNumerica = numero(cantidad);
  const costoNumerico = numero(costo);
  if (cantidadNumerica === 0 && costoNumerico === 0) return;
  const id = `${clave}|${unidad}`;
  const existente = acumulados.get(id) ?? { id, nombre, cantidad: 0, unidad, costo: 0 };
  existente.cantidad += cantidadNumerica;
  existente.costo += costoNumerico;
  acumulados.set(id, existente);
}

function recipienteBase(producto, productosPorId) {
  let actual = producto;
  const visitados = new Set();
  while (actual?.heredaCostoDe && !visitados.has(String(actual.id))) {
    visitados.add(String(actual.id));
    actual = productosPorId.get(String(actual.heredaCostoDe)) ?? actual;
    if (visitados.has(String(actual.id))) break;
  }
  return actual ?? producto;
}

export function construirDesgloseCombo({ combo, productos, productosBase, insumos }) {
  const productosPorId = new Map(productos.map((producto) => [String(producto.id), producto]));
  const productosBasePorId = new Map(productosBase.map((producto) => [String(producto.id), producto]));
  const insumosPorId = new Map(insumos.map((insumo) => [String(insumo.id), insumo]));
  const insumosPorNombre = new Map(insumos.map((insumo) => [normalizar(insumo.nombre), insumo]));
  const acumulados = new Map();
  let materiales = 0;
  let manoObra = 0;
  let minutos = 0;

  for (const linea of combo.lineas ?? []) {
    const multiplicador = numero(linea.cantidad);
    if (linea.tipo === 'INSUMO') {
      const insumo = insumosPorId.get(String(linea.refId));
      if (!insumo) throw new Error(`El combo contiene un insumo inexistente: ${linea.refId}`);
      const costo = numero(insumo.montoCompra) / numero(insumo.cantidadCompra) * multiplicador;
      sumarInsumo(acumulados, {
        clave: `insumo:${insumo.id}`,
        nombre: insumo.nombre,
        cantidad: multiplicador,
        unidad: insumo.unidad,
        costo,
      });
      materiales += costo;
      continue;
    }

    const producto = productosPorId.get(String(linea.refId));
    if (!producto) throw new Error(`El combo contiene un producto inexistente: ${linea.refId}`);

    for (const fijo of INSUMOS_FIJOS) {
      const insumo = fijo.aliases.map((alias) => insumosPorNombre.get(alias)).find(Boolean);
      sumarInsumo(acumulados, {
        clave: insumo ? `insumo:${insumo.id}` : `fijo:${fijo.clave}`,
        nombre: insumo?.nombre ?? fijo.nombre,
        cantidad: numero(producto[fijo.cantidad]) * multiplicador,
        unidad: fijo.unidad,
        costo: numero(producto[fijo.costo]) * multiplicador,
      });
    }

    if (numero(producto.recipienteCantidad) > 0) {
      const base = recipienteBase(productosBasePorId.get(String(producto.id)) ?? producto, productosBasePorId);
      sumarInsumo(acumulados, {
        clave: `recipiente:${base.id}`,
        nombre: `Recipiente · ${base.nombre ?? producto.nombre}`,
        cantidad: numero(producto.recipienteCantidad) * multiplicador,
        unidad: 'unidad',
        costo: numero(producto.costoRecipiente) * multiplicador,
      });
    }

    for (const extra of producto.extras ?? []) {
      const insumo = insumosPorId.get(String(extra.insumoId));
      if (!insumo) throw new Error(`El producto ${producto.id} contiene un insumo inexistente: ${extra.insumoId}`);
      const cantidad = numero(extra.cantidad) * multiplicador;
      sumarInsumo(acumulados, {
        clave: `insumo:${insumo.id}`,
        nombre: insumo.nombre,
        cantidad,
        unidad: insumo.unidad,
        costo: numero(insumo.montoCompra) / numero(insumo.cantidadCompra) * cantidad,
      });
    }

    materiales += numero(producto.materiales) * multiplicador;
    manoObra += numero(producto.manoObra) * multiplicador;
    minutos += numero(producto.minutosManoObra) * multiplicador;
  }

  return { insumos: [...acumulados.values()], materiales, manoObra, minutos };
}
