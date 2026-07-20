// PostToolUse (Edit|Write) — corre toda la suite (`node --test`, que
// descubre todos los *.test.js del repo) cuando se edita código fuente bajo
// src/. Antes esto solo corría los tests del motor al tocar src/motor; con
// la Fase 4 (interfaz) tocando persistencia y estilos todo el tiempo, una
// regresión ahí tiene que bloquear igual. CLAUDE.md: "No se considera
// terminado el motor hasta que estos tests pasen" — extendido a toda la
// base, no solo al motor.
//
// `node --test <directorio>` no funciona en este entorno (Node 24 en
// Windows lo resuelve como módulo CJS en vez de listar los tests adentro:
// MODULE_NOT_FOUND). `node --test` sin argumentos sí descubre todo
// recursivamente y es el mismo comando que corre `npm test`.
const { execSync } = require('child_process');

let data = '';
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  const norm = filePath.replace(/\\/g, '/');
  const esCodigoFuente = /(^|\/)src\/.*\.(js|cjs)$/.test(norm);
  if (!esCodigoFuente) process.exit(0);

  try {
    execSync('node --test', { stdio: 'pipe', cwd: process.cwd() });
    process.exit(0);
  } catch (error) {
    const salida = (error.stdout ? error.stdout.toString() : '') +
      (error.stderr ? error.stderr.toString() : '');
    const resumen = salida.split('\n').slice(-25).join('\n');
    console.log(JSON.stringify({
      decision: 'block',
      reason: `La suite completa (node --test) falla tras editar ${filePath}. CLAUDE.md: "No se considera terminado el motor hasta que estos tests pasen".\n\n${resumen}`,
    }));
    process.exit(0);
  }
});
