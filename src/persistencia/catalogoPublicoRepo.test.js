import test from 'node:test';
import assert from 'node:assert/strict';
import { construirCatalogoPublico, normalizarBusqueda, telefonoComercialPublico, obtenerCatalogoPublico } from './catalogoPublicoRepo.js';

test('construye el catálogo público sin incluir costos ni recetas', () => {
  const catalogo = {
    productos: [{ id: 'V1', nombre: 'Pino chico', costoProduccion: 8400 }],
    combos: [{ id: '3', nombre: 'Vela aromática', precioCombo: 11400, fotos: ['data:image/jpeg;base64,abc', 'https://foto.test/3.jpg'], lineas: [{ tipo: 'PRODUCTO', refId: 'V1', cantidad: 2 }, { tipo: 'INSUMO', refId: 'E2', cantidad: 1 }] }],
  };
  const resultado = construirCatalogoPublico(catalogo, [{ id: 'E2', nombre: 'Bolsa organza', montoCompra: 520 }]);
  assert.deepEqual(resultado, [{ id: '3', nombre: 'Vela aromática', descripcion: '2 × Pino chico', precio: 11400, fotos: ['https://foto.test/3.jpg'], activo: true, telefono_comercial: '' }]);
  assert.equal('costoProduccion' in resultado[0], false);
  assert.equal('lineas' in resultado[0], false);
  const [previa] = construirCatalogoPublico(catalogo, [], {}, { vistaPrevia: true });
  assert.deepEqual(previa.fotos, ['data:image/jpeg;base64,abc', 'https://foto.test/3.jpg']);
  assert.equal(previa.descripcion, resultado[0].descripcion);
});

test('lee sólo los campos públicos y ordena códigos numéricamente', async () => {
  const consulta = {
    eq(campo, valor) { assert.equal(campo, 'activo'); assert.equal(valor, true); return Promise.resolve({ data: [{ id: '10', nombre: 'Diez', descripcion: '', precio: '2000', fotos: null }, { id: '2', nombre: 'Dos', descripcion: '', precio: '1000', fotos: [] }], error: null }); },
  };
  const cliente = { from(tabla) { assert.equal(tabla, 'catalogo_publico_combos'); return { select(campos) { assert.equal(campos, 'id,nombre,descripcion,precio,fotos,telefono_comercial'); return consulta; } }; } };
  const resultado = await obtenerCatalogoPublico(cliente);
  assert.deepEqual(resultado.map((combo) => combo.id), ['2', '10']);
  assert.equal(resultado[1].precio, 2000);
  assert.deepEqual(resultado[1].fotos, []);
});

test('publica contenido comercial revisado y sólo el teléfono configurado', () => {
  const combo = { id: 'antiguo', nombre: 'Interno', nombreComercial: 'Pino para regalar', descripcionComercial: 'Pino y presentación de regalo', precioCombo: 100, fotos: [], lineas: [{ tipo: 'INSUMO', refId: 'MO', cantidad: 60 }] };
  const [fila] = construirCatalogoPublico({ productos: [], combos: [combo] }, [{ id: 'MO', nombre: 'Mano de obra' }], { telefonoComercial: '+54 9 264 123-4567' });
  assert.equal(fila.nombre, 'Pino para regalar');
  assert.equal(fila.descripcion, 'Pino y presentación de regalo');
  assert.equal(fila.telefono_comercial, '5492641234567');
  assert.equal(telefonoComercialPublico('inventado'), '');
  assert.equal(telefonoComercialPublico('123'), '');
});

test('el fallback jamás publica cantidades ni nombres de insumos o mano de obra', () => {
  const [fila] = construirCatalogoPublico({ productos: [{ id: 'V1', nombre: 'Flor' }], combos: [{ id: '1', nombre: 'Combo', precioCombo: 200, lineas: [{ tipo: 'INSUMO', refId: 'V1', cantidad: 750 }, { tipo: 'INSUMO', refId: 'MO', cantidad: 45 }] }] }, [{ id: 'MO', nombre: 'Mano de obra' }]);
  assert.equal(fila.descripcion, '');
  assert.equal(normalizarBusqueda('  ÁROMÁTICA  '), 'aromatica');
});

test('bloquea precios públicos inválidos y conserva inactivos fuera de la publicación', async () => {
  for (const precio of [NaN, Infinity, -1, undefined, '', '   ', false, []]) {
    assert.throws(() => construirCatalogoPublico({ productos: [], combos: [{ id: '3', nombre: 'Combo', precioCombo: precio, lineas: [] }] }), /precio público/);
    const cliente = { from: () => ({ select: () => ({ eq: async () => ({ data: [{ id: '3', precio }], error: null }) }) }) };
    await assert.rejects(obtenerCatalogoPublico(cliente), /precio público/);
  }
  assert.deepEqual(construirCatalogoPublico({ productos: [], combos: [{ id: '3', activo: false, precioCombo: 100 }] }), []);
});
