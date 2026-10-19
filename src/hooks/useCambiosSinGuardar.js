import { useEffect, useRef } from 'preact/hooks';
import { registrarGuarda } from '../interfaz/enrutador.js';
export function useCambiosSinGuardar(valor, listo = true) {
  const firma = JSON.stringify(valor);
  const referencia = useRef(null);
  const estado = useRef({ firma, listo });
  if (listo && referencia.current === null) referencia.current = firma;
  estado.current = { firma, listo };
  const hayCambios = () => estado.current.listo && referencia.current !== estado.current.firma;
  useEffect(() => {
    const quitar = registrarGuarda(() => !hayCambios() || globalThis.confirm('Hay cambios sin guardar. ¿Querés descartarlos y salir?'));
    const antesDeCerrar = (evento) => { if (hayCambios()) { evento.preventDefault(); evento.returnValue = ''; } };
    globalThis.addEventListener('beforeunload', antesDeCerrar);
    return () => { quitar(); globalThis.removeEventListener('beforeunload', antesDeCerrar); };
  }, []);
  return { marcarGuardado: (...proximoValor) => { referencia.current = proximoValor.length ? JSON.stringify(proximoValor[0]) : estado.current.firma; }, hayCambios: hayCambios() };
}
