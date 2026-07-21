// PostToolUse (Edit|Write) — CLAUDE.md: "Ningún archivo fuera de
// src/estilos/tokens.css puede contener un valor literal de color, radio de
// borde, sombra o espaciado", ni una referencia a fuente remota. La regla
// vive en un solo lugar: src/estilos/guardaLiterales.cjs. Este hook solo la
// aplica al archivo recién tocado.
//
// Falla cerrada: si el guardián no carga o tira una excepción al revisar,
// esto bloquea en vez de dejar pasar la edición sin control.
const fs = require('fs');
const path = require('path');

const RUTA_GUARDIAN = path.join(__dirname, '..', '..', 'src', 'estilos', 'guardaLiterales.cjs');
let revisarArchivo;
let errorCarga = null;
try {
  ({ revisarArchivo } = require(RUTA_GUARDIAN));
} catch (e) {
  errorCarga = e;
}

let data = '';
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch (e) {
    process.stderr.write(`tokens-guard: entrada del hook no es JSON válido (${e.message}). No se bloquea — podría ser un cambio de formato de la entrada, no un problema del guardián — pero conviene revisarlo.\n`);
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) ||
    (input.tool_response && input.tool_response.filePath) || '';
  if (!filePath) process.exit(0);

  if (errorCarga) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `El guardián de literales (${RUTA_GUARDIAN}) no cargó: ${errorCarga.message}. Falla cerrada: se bloquea la edición de ${filePath} hasta que el guardián funcione.`,
    }));
    process.exit(0);
  }

  let contenido;
  try {
    contenido = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `El guardián de literales no pudo leer ${filePath} para revisarlo: ${e.message}. Falla cerrada: sin poder leer el archivo no se puede confirmar que no tenga un literal fuera de tokens.css, así que se bloquea la edición.`,
    }));
    process.exit(0);
  }

  const relativo = path.relative(process.cwd(), filePath);

  let violaciones;
  try {
    violaciones = revisarArchivo(relativo, contenido);
  } catch (e) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: `El guardián de literales tiró una excepción revisando ${relativo}: ${e.message}. Falla cerrada: se bloquea la edición.`,
    }));
    process.exit(0);
  }

  if (violaciones.length > 0) {
    const detalle = violaciones
      .slice(0, 5)
      .map((v) => `  línea ${v.linea} — ${v.tipo}: ${v.detalle}`)
      .join('\n');
    console.log(JSON.stringify({
      decision: 'block',
      reason: `Literal fuera de tokens.css detectado en ${relativo}:\n${detalle}\n\nCLAUDE.md: "Ningún archivo fuera de src/estilos/tokens.css puede contener un valor literal de color, radio de borde, sombra o espaciado". Reemplazalo por una variable de tokens.css (var(--...)).`,
    }));
  }
  process.exit(0);
});
