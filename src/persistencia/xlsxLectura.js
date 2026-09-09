// Lector mínimo de XLSX para la revisión de importaciones en navegador.
// Lee el contenedor ZIP y las hojas XML sin agregar dependencias externas.

function textoXml(xml) {
  return new DOMParser().parseFromString(xml, 'application/xml');
}

function indiceColumna(referencia) {
  const letras = referencia.match(/[A-Z]+/i)?.[0] ?? 'A';
  return [...letras.toUpperCase()].reduce((total, letra) => total * 26 + letra.charCodeAt(0) - 64, 0) - 1;
}

async function descomprimir(datos) {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter(); writer.write(datos); writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

async function entradasZip(buffer) {
  const bytes = new Uint8Array(buffer); const vista = new DataView(buffer); const resultado = new Map(); let posicion = 0;
  while (posicion + 30 <= bytes.length && vista.getUint32(posicion, true) === 0x04034b50) {
    const metodo = vista.getUint16(posicion + 8, true); const comprimido = vista.getUint32(posicion + 18, true); const nombreLargo = vista.getUint16(posicion + 26, true); const extraLargo = vista.getUint16(posicion + 28, true);
    const nombre = new TextDecoder().decode(bytes.slice(posicion + 30, posicion + 30 + nombreLargo)); const inicio = posicion + 30 + nombreLargo + extraLargo; const datos = bytes.slice(inicio, inicio + comprimido);
    resultado.set(nombre, metodo === 8 ? await descomprimir(datos) : datos); posicion = inicio + comprimido;
  }
  return resultado;
}

export async function leerXlsx(archivo) {
  const archivos = await entradasZip(await archivo.arrayBuffer()); const decodificar = (datos) => new TextDecoder().decode(datos);
  const compartidosDoc = textoXml(decodificar(archivos.get('xl/sharedStrings.xml') ?? new Uint8Array()));
  const compartidos = [...compartidosDoc.querySelectorAll('si')].map((si) => [...si.querySelectorAll('t')].map((nodo) => nodo.textContent).join(''));
  const workbook = textoXml(decodificar(archivos.get('xl/workbook.xml'))); const relaciones = textoXml(decodificar(archivos.get('xl/_rels/workbook.xml.rels')));
  const mapaRelaciones = new Map([...relaciones.querySelectorAll('Relationship')].map((relacion) => [relacion.getAttribute('Id'), relacion.getAttribute('Target')]));
  const hojas = [];
  for (const hoja of workbook.querySelectorAll('sheet')) {
    const nombre = hoja.getAttribute('name'); const target = mapaRelaciones.get(hoja.getAttribute('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')) ?? mapaRelaciones.get(hoja.getAttribute('r:id'));
    const ruta = target?.startsWith('/') ? target.slice(1) : `xl/${target}`; const documento = textoXml(decodificar(archivos.get(ruta)));
    const filas = [...documento.querySelectorAll('row')].map((fila) => { const valores = []; for (const celda of fila.querySelectorAll(':scope > c')) { const indice = indiceColumna(celda.getAttribute('r')); let valor = celda.querySelector('v')?.textContent ?? ''; if (celda.getAttribute('t') === 's') valor = compartidos[Number(valor)] ?? ''; if (celda.getAttribute('t') === 'inlineStr') valor = celda.querySelector('t')?.textContent ?? ''; valores[indice] = valor; } return valores; });
    hojas.push({ nombre, filas });
  }
  return { hojas };
}
