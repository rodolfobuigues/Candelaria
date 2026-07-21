// Regresión del defecto que tuvo tokens-guard.cjs hasta el 20/07: un
// require() de un módulo del proyecto (no un builtin de Node) hecho fuera
// de un try/catch cuelga el proceso con una excepción no capturada antes de
// imprimir ninguna decisión — el hook "falla abierta" en silencio, la
// edición pasa. Este test lee el CÓDIGO FUENTE de cada hook (no lo ejecuta)
// y falla si vuelve a aparecer ese patrón en cualquiera de los tres.
//
// Es un chequeo textual línea por línea, no un parser de JavaScript: alcanza
// para el estilo de estos archivos (un try/catch por bloque, sin anidar,
// `try {` y `} catch` cada uno en su propia línea) y para su único trabajo,
// que es no dejar reintroducir el patrón conocido. No pretende ser un linter
// general — si el estilo de los hooks cambia a algo más complejo, este
// chequeo hay que rehacerlo, no estirarlo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR_HOOKS = path.join(__dirname, '..', '..', '.claude', 'hooks');

const BUILTIN_O_NPM = /require\(\s*['"](fs|path|child_process|os|assert|url|node:[\w/-]+)['"]\s*\)/;
const PARECE_MODULO_DEL_PROYECTO = /require\(\s*(RUTA_\w+|path\.join\(|['"]\.\.?\/)/;

function requiresDeProyectoSinTryCatch(rutaHook) {
  const codigo = fs.readFileSync(rutaHook, 'utf8');
  const lineas = codigo.split('\n');
  let dentroDeTry = 0;
  const violaciones = [];

  lineas.forEach((linea, i) => {
    if (/\btry\s*\{/.test(linea)) dentroDeTry++;
    if (/\}\s*catch\b/.test(linea)) dentroDeTry = Math.max(0, dentroDeTry - 1);

    if (/\brequire\(/.test(linea) && !BUILTIN_O_NPM.test(linea) && PARECE_MODULO_DEL_PROYECTO.test(linea)) {
      if (dentroDeTry === 0) {
        violaciones.push({ linea: i + 1, texto: linea.trim() });
      }
    }
  });

  return violaciones;
}

const HOOKS = ['tokens-guard.cjs', 'fixtures-guard.cjs', 'suite-tests.cjs'];

for (const nombreHook of HOOKS) {
  test(`${nombreHook}: ningún require() de módulo del proyecto fuera de try/catch`, () => {
    const violaciones = requiresDeProyectoSinTryCatch(path.join(DIR_HOOKS, nombreHook));
    assert.deepStrictEqual(
      violaciones,
      [],
      `${nombreHook} tiene require() de un módulo del proyecto sin try/catch: ` +
        violaciones.map((v) => `línea ${v.linea} — ${v.texto}`).join('; ')
    );
  });
}
