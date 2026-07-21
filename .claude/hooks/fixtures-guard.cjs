// PreToolUse (Edit|Write) — CLAUDE.md / PASO_A_PASO.md: "Si alguno falla,
// corregí el motor, nunca las fixtures." Bloquea ediciones directas a los
// tres archivos de fixtures: son la fuente de verdad contra la que se
// valida el motor, no un resultado a ajustar para que el test pase.
const path = require('path');

const FIXTURES = new Set([
  'fixtures_productos.csv',
  'fixtures_insumos.csv',
  'fixtures_combos.json',
]);

let data = '';
process.stdin.on('data', (chunk) => { data += chunk; });
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch (e) {
    process.stderr.write(`fixtures-guard: entrada del hook no es JSON válido (${e.message}). No se bloquea — podría ser un cambio de formato de la entrada — pero conviene revisarlo.\n`);
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || '';
  if (!filePath) process.exit(0);

  const base = path.basename(filePath);
  if (!FIXTURES.has(base)) process.exit(0);

  console.log(JSON.stringify({
    decision: 'block',
    reason: `${base} es una fixture: la fuente de verdad contra la que se valida el motor, no un archivo de trabajo. CLAUDE.md: "Si alguno falla, corregí el motor, nunca las fixtures". Si el usuario pidió explícitamente cambiar esta fixture, decíselo y que lo confirme antes de tocarla.`,
  }));
  process.exit(0);
});
