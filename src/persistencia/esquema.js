// Esquema de IndexedDB — ESPECIFICACION.md § 3.
export const NOMBRE_DB = 'candelaria';
export const VERSION_DB = 1;

export const TIENDAS = {
  INSUMOS: 'insumos',
  PRODUCTOS: 'productos',
  COMBOS: 'combos',
  PARAMETROS: 'parametros',
  PEDIDOS: 'pedidos',
};

export function migrar(db) {
  if (!db.objectStoreNames.contains(TIENDAS.INSUMOS)) {
    const tienda = db.createObjectStore(TIENDAS.INSUMOS, { keyPath: 'id' });
    tienda.createIndex('codigo', 'codigo', { unique: true });
  }

  if (!db.objectStoreNames.contains(TIENDAS.PRODUCTOS)) {
    const tienda = db.createObjectStore(TIENDAS.PRODUCTOS, { keyPath: 'id' });
    tienda.createIndex('codigo', 'codigo', { unique: true });
  }

  if (!db.objectStoreNames.contains(TIENDAS.COMBOS)) {
    db.createObjectStore(TIENDAS.COMBOS, { keyPath: 'id' });
  }

  if (!db.objectStoreNames.contains(TIENDAS.PARAMETROS)) {
    db.createObjectStore(TIENDAS.PARAMETROS, { keyPath: 'id' });
  }

  if (!db.objectStoreNames.contains(TIENDAS.PEDIDOS)) {
    const tienda = db.createObjectStore(TIENDAS.PEDIDOS, { keyPath: 'id' });
    tienda.createIndex('numero', 'numero', { unique: true });
  }
}
