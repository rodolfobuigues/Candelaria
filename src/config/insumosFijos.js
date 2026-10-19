export const ROLES_INSUMOS_FIJOS = Object.freeze([
  { id: 'ceraAltoPF', nombre: 'Cera de alto punto de fusión', codigo: 'M1', nombres: ['cera alto pf'] },
  { id: 'ceraBajoPF', nombre: 'Cera de bajo punto de fusión', codigo: 'M2', nombres: ['cera bajo pf'] },
  { id: 'pabilo', nombre: 'Pabilo', codigo: 'M5', nombres: ['pabilo'] },
  { id: 'yeso', nombre: 'Yeso', codigo: 'M7', nombres: ['yeso'] },
  { id: 'esencia', nombre: 'Esencia', codigo: 'M4', nombres: ['esencia', 'escencia'] },
  { id: 'colorante', nombre: 'Colorante', codigo: 'M3', nombres: ['colorante'] },
  { id: 'aceiteCoco', nombre: 'Aceite de coco', codigo: 'M6', nombres: ['aceite de coco'] },
]);

export function normalizarNombreInsumo(nombre) {
  return String(nombre ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
}

// Al editar un registro antiguo se congela este rol ANTES de cambiar su nombre.
// Los nombres existentes tienen precedencia sobre códigos históricos porque
// también hay bases antiguas con otra asignación de códigos.
export function inferirRolInsumo(insumo) {
  if (ROLES_INSUMOS_FIJOS.some((rol) => rol.id === insumo.rolMotor)) return insumo.rolMotor;
  const porNombre = ROLES_INSUMOS_FIJOS.find((rol) => rol.nombres.includes(normalizarNombreInsumo(insumo.nombre)));
  return porNombre?.id ?? ROLES_INSUMOS_FIJOS.find((rol) => rol.codigo === String(insumo.codigo ?? insumo.id).toUpperCase())?.id ?? null;
}
