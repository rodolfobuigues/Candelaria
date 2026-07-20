// PostToolUse (Edit|Write) — CLAUDE.md: "no se considera terminado el motor
// hasta que estos tests pasen". Corre node --test src/motor solo cuando el
// archivo editado pertenece al motor o a sus parámetros globales.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// `node --test <directorio>` no funciona en este entorno (Node 24 en
// Windows lo resuelve como módulo CJS en vez de listar los tests adentro:
// MODULE_NOT_FOUND). Se listan los archivos *.test.js explícitamente.
function archivosDeTestMotor() {
  const dirMotor = path.join(process.cwd(), 'src', 'motor');
  return fs
    .readdirSync(dirMotor)
    .filter((archivo) => archivo.endsWith('.test.js'))
    .map((archivo) => path.join('src', 'motor', archivo));
}

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
  const esMotor = norm.includes('/src/motor/') || norm.endsWith('src/config/parametros.js');
  if (!esMotor) process.exit(0);

  const archivos = archivosDeTestMotor();
  const comando = `node --test ${archivos.map((a) => `"${a}"`).join(' ')}`;

  try {
    execSync(comando, { stdio: 'pipe', cwd: process.cwd() });
    process.exit(0);
  } catch (error) {
    const salida = (error.stdout ? error.stdout.toString() : '') +
      (error.stderr ? error.stderr.toString() : '');
    const resumen = salida.split('\n').slice(-25).join('\n');
    console.log(JSON.stringify({
      decision: 'block',
      reason: `Los tests del motor (${comando}) fallan tras editar ${filePath}. CLAUDE.md: "no se considera terminado el motor hasta que estos tests pasen".\n\n${resumen}`,
    }));
    process.exit(0);
  }
});
