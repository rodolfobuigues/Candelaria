import test from 'node:test';
import assert from 'node:assert/strict';
import { construirCatalogoPublico, obtenerCatalogoPublico } from './catalogoPublicoRepo.js';

test('construye el catálogo público sin incluir costos ni recetas', () => {
  const catalogo = {
    productos: [{ id: 'V1', nombre: 'Pino chico', costoProduccion: 8400 }],
    combos: [{ id: '3', nombre: 'Vela aromática', precioCombo: 11400, fotos: ['data:image/jpeg;base64,abc', 'https://foto.test/3.jpg'], lineas: [{ tipo: 'PRODUCTO', refId: 'V1', cantidad: 2 }, { tipo: 'INSUMO', refId: 'E2', cantidad: 1 }] }],
  };
  const resultado = construirCatalogoPublico(catalogo, [{ id: 'E2', nombre: 'Bolsa organza', montoCompra: 520 }]);
  assert.deepEqual(resultado, [{ id: '3', nombre: 'Vela aromática', descripcion: '2 × Pino chico, 1 × Bolsa organza', precio: 11400, fotos: ['https://foto.test/3.jpg'], activo: true }]);
  assert.equal('costoProduccion' in resultado[0], false);
  assert.equal('lineas' in resultado[0], false);
});

test('lee sólo los campos públicos y ordena códigos numéricamente', async () => {
  const consulta = {
    eq(campo, valor) { assert.equal(campo, 'activo'); assert.equal(valor, true); return Promise.resolve({ data: [{ id: '10', nombre: 'Diez', descripcion: '', precio: '2000', fotos: null }, { id: '2', nombre: 'Dos', descripcion: '', precio: '1000', fotos: [] }], error: null }); },
  };
  const cliente = { from(tabla) { assert.equal(tabla, 'catalogo_publico_combos'); return { select(campos) { assert.equal(campos, 'id,nombre,descripcion,precio,fotos'); return consulta; } }; } };
  const resultado = await obtenerCatalogoPublico(cliente);
  assert.deepEqual(resultado.map((combo) => combo.id), ['2', '10']);
  assert.equal(resultado[1].precio, 2000);
  assert.deepEqual(resultado[1].fotos, []);
});
