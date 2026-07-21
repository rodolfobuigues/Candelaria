// Falla cerrada: si src/estilos/guardaLiterales.cjs no carga o tira una
// excepción, .claude/hooks/tokens-guard.cjs tiene que bloquear la edición,
// no dejarla pasar en silencio. Se arma una copia temporal de la estructura
// relativa que el hook espera (.claude/hooks/ + src/estilos/) con un
// guardián roto a propósito, para no tocar el guardián real del repo.
//
// Vive en src/estilos/ (no en .claude/hooks/) porque `node --test` sin
// argumentos no descubre archivos bajo directorios que empiezan con punto:
// un test puesto en .claude/hooks/ nunca corre con `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOK_ORIGINAL = path.join(__dirname, '..', '..', '.claude', 'hooks', 'tokens-guard.cjs');
const GUARDIAN_REAL = path.join(__dirname, 'guardaLiterales.cjs');

function correrHookConGuardian(contenidoGuardian) {
  const raizTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'candelaria-hook-'));
  try {
    const dirHooks = path.join(raizTmp, '.claude', 'hooks');
    const dirEstilos = path.join(raizTmp, 'src', 'estilos');
    fs.mkdirSync(dirHooks, { recursive: true });
    fs.mkdirSync(dirEstilos, { recursive: true });

    fs.copyFileSync(HOOK_ORIGINAL, path.join(dirHooks, 'tokens-guard.cjs'));
    fs.writeFileSync(path.join(dirEstilos, 'guardaLiterales.cjs'), contenidoGuardian, 'utf8');

    const archivoObjetivo = path.join(dirEstilos, 'componentes.css');
    fs.writeFileSync(archivoObjetivo, '.x { padding: var(--esp-elemento); }', 'utf8');

    const entrada = JSON.stringify({ tool_input: { file_path: archivoObjetivo } });

    const salida = execFileSync(
      process.execPath,
      [path.join(dirHooks, 'tokens-guard.cjs')],
      { input: entrada, cwd: raizTmp, encoding: 'utf8' }
    );
    return salida.trim() ? JSON.parse(salida.trim()) : null;
  } finally {
    fs.rmSync(raizTmp, { recursive: true, force: true });
  }
}

test('falla cerrada: si guardaLiterales.cjs no carga (error de sintaxis), el hook bloquea', () => {
  const resultado = correrHookConGuardian('esto no es JavaScript válido {{{');
  assert.ok(resultado, 'el hook no devolvió ninguna decisión');
  assert.equal(resultado.decision, 'block');
  assert.match(resultado.reason, /no cargó/);
});

test('falla cerrada: si revisarArchivo() tira una excepción, el hook bloquea', () => {
  const resultado = correrHookConGuardian(
    "module.exports = { revisarArchivo() { throw new Error('roto a propósito'); } };"
  );
  assert.ok(resultado, 'el hook no devolvió ninguna decisión');
  assert.equal(resultado.decision, 'block');
  assert.match(resultado.reason, /excepción/);
});

test('caso normal: con el guardián real, un archivo sin violaciones no bloquea', () => {
  const guardianReal = fs.readFileSync(GUARDIAN_REAL, 'utf8');
  const resultado = correrHookConGuardian(guardianReal);
  assert.equal(resultado, null);
});

// Falla cerrada: si el guardián no puede LEER el archivo tocado (no
// require() del propio guardián, sino fs.readFileSync del archivo que hay
// que revisar), tampoco puede confirmar que esté libre de literales. Hasta
// ahora ese catch salía en silencio con process.exit(0) — pasaba la edición
// sin control. Se prueba apuntando el hook a un archivo que no existe.
test('falla cerrada: si no se puede leer el archivo tocado, el hook bloquea', () => {
  const raizTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'candelaria-hook-'));
  try {
    const dirHooks = path.join(raizTmp, '.claude', 'hooks');
    const dirEstilos = path.join(raizTmp, 'src', 'estilos');
    fs.mkdirSync(dirHooks, { recursive: true });
    fs.mkdirSync(dirEstilos, { recursive: true });

    fs.copyFileSync(HOOK_ORIGINAL, path.join(dirHooks, 'tokens-guard.cjs'));
    fs.copyFileSync(GUARDIAN_REAL, path.join(dirEstilos, 'guardaLiterales.cjs'));

    const archivoInexistente = path.join(dirEstilos, 'no-existe.css');
    const entrada = JSON.stringify({ tool_input: { file_path: archivoInexistente } });

    const salida = execFileSync(
      process.execPath,
      [path.join(dirHooks, 'tokens-guard.cjs')],
      { input: entrada, cwd: raizTmp, encoding: 'utf8' }
    );
    const resultado = salida.trim() ? JSON.parse(salida.trim()) : null;

    assert.ok(resultado, 'el hook no devolvió ninguna decisión');
    assert.equal(resultado.decision, 'block');
    assert.match(resultado.reason, /no pudo leer/);
  } finally {
    fs.rmSync(raizTmp, { recursive: true, force: true });
  }
});
