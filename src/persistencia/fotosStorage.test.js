import test from 'node:test';
import assert from 'node:assert/strict';
import { esFotoBase64, guardarFotosEnStorage, revisarFotosCatalogo } from './fotosStorage.js';

const FOTO = `data:image/jpeg;base64,${Buffer.from('imagen').toString('base64')}`;

test('revisar fotos distingue Base64 de URL sin modificar registros', () => {
  const productos = [{ id: 'V1', fotos: [FOTO, 'https://ejemplo.test/foto.jpg'] }];
  const combos = [{ id: 'C1', fotos: [FOTO] }, { id: 'C2', fotos: [] }];
  assert.deepEqual(revisarFotosCatalogo(productos, combos), {
    registrosTotales: 3,
    registrosPendientes: 2,
    fotosBase64: 2,
    fotosConUrl: 1,
  });
  assert.equal(esFotoBase64(productos[0].fotos[0]), true);
});

test('sube primero y devuelve URLs conservando las fotos que ya eran remotas', async () => {
  const subidas = [];
  const bucket = {
    async upload(ruta, blob, opciones) { subidas.push({ ruta, tipo: blob.type, opciones }); return { error: null }; },
    getPublicUrl(ruta) { return { data: { publicUrl: `https://storage.test/${ruta}` } }; },
  };
  const cliente = { storage: { from(nombre) { assert.equal(nombre, 'catalogo'); return bucket; } } };
  const registro = { id: 'V 1', fotos: [FOTO, 'https://existente.test/foto.jpg'] };

  const resultado = await guardarFotosEnStorage(registro, 'productos', cliente);

  assert.equal(registro.fotos[0], FOTO);
  assert.match(resultado.fotos[0], /^https:\/\/storage\.test\/productos\/V-1\/[a-f0-9]{8}\.jpg$/);
  assert.equal(resultado.fotos[1], registro.fotos[1]);
  assert.equal(subidas.length, 1);
  assert.equal(subidas[0].tipo, 'image/jpeg');
  assert.equal(subidas[0].opciones.upsert, true);
});

test('si falla una subida no reemplaza el Base64 del registro original', async () => {
  const cliente = { storage: { from() { return { upload: async () => ({ error: { message: 'sin conexión' } }), getPublicUrl: () => ({ data: {} }) }; } } };
  const registro = { id: 'V1', fotos: [FOTO] };
  await assert.rejects(() => guardarFotosEnStorage(registro, 'productos', cliente), /sin conexión/);
  assert.equal(registro.fotos[0], FOTO);
});
