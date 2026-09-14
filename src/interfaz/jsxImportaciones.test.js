import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const RAIZ = dirname(fileURLToPath(import.meta.url));

function archivosJsx(directorio) {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return archivosJsx(ruta);
    return entrada.name.endsWith('.jsx') ? [ruta] : [];
  });
}

test('todo archivo que usa fragmentos JSX importa Fragment de Preact', () => {
  for (const archivo of archivosJsx(RAIZ)) {
    const codigo = readFileSync(archivo, 'utf8');
    if (!codigo.includes('<>') && !codigo.includes('</>')) continue;
    assert.match(
      codigo,
      /import\s*\{[^}]*\bFragment\b[^}]*\}\s*from\s*['"]preact['"]/,
      `${archivo} usa un fragmento JSX sin importar Fragment`
    );
  }
});
