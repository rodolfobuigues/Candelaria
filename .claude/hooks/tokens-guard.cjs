// PostToolUse (Edit|Write) — CLAUDE.md: "Ningún archivo fuera de
// src/estilos/tokens.css puede contener un valor literal de color (hex,
// rgb()), radio de borde, sombra o espaciado." Señal mínima detectable acá:
// hex (#fff, #ffffff) y rgb()/rgba() fuera de tokens.css.
const fs = require('fs');

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
  const norm = filePath.replace(/\\/g, '/');

  if (!norm.endsWith('.css')) process.exit(0);
  if (norm.endsWith('src/estilos/tokens.css')) process.exit(0);

  let contenido;
  try {
    contenido = fs.readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }

  const hex = contenido.match(/#[0-9a-fA-F]{3,8}\b/);
  const rgb = contenido.match(/\brgba?\(/);

  if (hex || rgb) {
    const ejemplo = hex ? hex[0] : rgb[0];
    console.log(JSON.stringify({
      decision: 'block',
      reason: `Valor literal de color detectado (${ejemplo}) en ${filePath}, fuera de tokens.css. CLAUDE.md: "Ningún archivo fuera de src/estilos/tokens.css puede contener un valor literal de color, radio de borde, sombra o espaciado". Reemplazalo por una variable de tokens.css (var(--...)).`,
    }));
  }
  process.exit(0);
});
