import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirCatalogoDesdeFuente } from './importadorFuente.js';

function fila(...valores) { return valores; }

test('importa la estructura vigente, resuelve herencia, renombra reposiciones y quita duplicados/vacíos', () => {
  const libro = { hojas: [
    { nombre: 'Materia prima', filas: [fila(), fila(), fila(), fila('M1', 'Cera alto pf', 16, 'gr'), fila('A1', 'Flores', 200, 'unid.'), fila('MO', 'Mano de obra', 7000, 'hs')] },
    { nombre: 'Costos', filas: [
      fila(), fila(), fila(), fila('R17', 'Bandeja', 100, 'unid.', null, null, null, 0, 0, 0, 0, 80, 15),
      fila('R18', 'Bandeja cera', 0, 'unid.', null, null, null, 0, 20, 0, 1, 0, 10),
      fila('R150', 'Reposición', 0, 'unid.', null, null, null, 0, 155, 1.5, 0, 0, 40),
    ], formulas: [[], [], [], [], [null, null, '=E4'], []] },
    { nombre: 'Combos', filas: [fila(), fila(), fila(1, 'Combo', 100), fila('R18', '', '', 1), fila('M1', '', '', 1), fila(2, 'Duplicado', 100), fila('R18', '', '', 1), fila('M1', '', '', 1), fila(3, 'Vacío', 100)] },
  ] };
  const resultado = construirCatalogoDesdeFuente(libro);
  assert.equal(resultado.insumos.length, 3);
  assert.equal(resultado.productos.length, 3);
  assert.equal(resultado.productos.find((p) => p.id === 'RP150').codigo, 'RP150');
  assert.equal(resultado.productos.find((p) => p.id === 'R18').heredaCostoDe, 'R17');
  assert.equal(resultado.combos.length, 1);
});
