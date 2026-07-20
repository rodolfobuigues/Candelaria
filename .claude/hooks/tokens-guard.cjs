// PostToolUse (Edit|Write) — CLAUDE.md: "Ningún archivo fuera de
// src/estilos/tokens.css puede contener un valor literal de color, radio de
// borde, sombra o espaciado", ni una referencia a fuente remota. La regla
// vive en un solo lugar: src/estilos/guardaLiterales.cjs. Este hook solo la
// aplica al archivo recién tocado.
const fs = require('fs');
const path = require('path');
const { revisarArchivo } = require(
  path.join(__dirname, '..', '..', 'src', 'estilos', 'guardaLiterales.cjs')
);

let data = '';
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch {
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) ||
    (input.tool_response && input.tool_response.filePath) || '';
  if (!filePath) process.exit(0);

  let contenido;
  try {
    contenido = fs.readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }

  const relativo = path.relative(process.cwd(), filePath);
  const violaciones = revisarArchivo(relativo, contenido);

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
