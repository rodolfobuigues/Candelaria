/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { supabase, supabaseConfigurado } from '../config/supabase.js';
import { cargarFuenteInicialSiHaceFalta, resumirErrorInicializacion } from '../desarrollo/inicializacion.js';
import { App } from './App.jsx';
import { abrirDB } from '../persistencia/db.js';
import { sincronizarCatalogoPublico } from '../persistencia/catalogoPublicoRepo.js';
import { CatalogoPublico } from './pantallas/CatalogoPublico/CatalogoPublico.jsx';
import { borrarBorradores } from './borradorVenta.js';
import { navegarA, useRuta } from './enrutador.js';

export function AuthGate() {
  const ruta = useRuta().split('?')[0];
  const [sesion, setSesion] = useState(undefined);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [avisoDatos, setAvisoDatos] = useState(null);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [datosInicializados, setDatosInicializados] = useState(false);

  useEffect(() => {
    if (supabaseConfigurado && sesion === null) { setDatosInicializados(false); setAvisoDatos(null); borrarBorradores(globalThis.sessionStorage); }
  }, [sesion]);

  useEffect(() => {
    if (!supabaseConfigurado) { setSesion(null); return undefined; }
    let activo = true;
    supabase.auth.getSession().then(({ data, error: errorSesion }) => { if (activo) { setSesion(data?.session ?? null); if (errorSesion) setError('No se pudo comprobar el acceso. Volvé a ingresar.'); } }).catch(() => { if (activo) { setSesion(null); setError('No se pudo comprobar el acceso. Revisá la conexión y volvé a ingresar.'); } });
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => setSesion(nuevaSesion));
    return () => { activo = false; suscripcion.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado || !sesion || datosInicializados) return undefined;
    let activo = true;
    setCargandoDatos(true);
    cargarFuenteInicialSiHaceFalta()
      .then(async () => sincronizarCatalogoPublico(await abrirDB()))
      .then(() => activo && setDatosInicializados(true))
      .catch((errorInicializacion) => {
        if (activo) { setAvisoDatos(`No se pudo actualizar el catálogo público: ${resumirErrorInicializacion(errorInicializacion)}. Podés revisar los insumos y reintentar la publicación desde Ajustes.`); setDatosInicializados(true); }
      })
      .finally(() => activo && setCargandoDatos(false));
    return () => { activo = false; };
  }, [sesion, datosInicializados]);

  async function ingresar(evento) {
    evento.preventDefault();
    setCargando(true); setError(null);
    try {
      const { error: errorIngreso } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
      if (errorIngreso) setError(errorIngreso.status === 400 ? 'Correo o contraseña incorrectos.' : 'No se pudo ingresar. Revisá la conexión y volvé a intentar.');
      else { setContrasena(''); navegarA('vender'); }
    } catch { setError('No se pudo ingresar. Revisá la conexión y volvé a intentar.'); }
    finally { setCargando(false); }
  }

  if (!supabaseConfigurado) return <App />;
  if (sesion && cargandoDatos) return <main class="auth-pantalla"><p class="texto-cuerpo-s">Cargando catálogo…</p></main>;
  if (sesion && datosInicializados) return <div key={sesion.user.id}>{avisoDatos && <section class="tarjeta" role="status"><p class="aviso">{avisoDatos}</p><div class="fila-botones"><button type="button" class="boton-secundario" onClick={() => navegarA('productos?solapa=insumos')}>Revisar insumos</button><button type="button" class="boton-secundario" onClick={() => navegarA('ajustes')}>Abrir ajustes</button><button type="button" class="boton-texto" onClick={() => setAvisoDatos(null)}>Cerrar aviso</button></div></section>}<App usuarioId={sesion.user.id} /></div>;
  if (sesion === undefined) return <main class="auth-pantalla"><p class="texto-cuerpo-s">Comprobando acceso…</p></main>;
  if (ruta === 'catalogo') return <CatalogoPublico />;

  return (
    <main class="auth-pantalla">
      <section class="tarjeta auth-tarjeta">
        <h1 class="titulo-l">Candelaria</h1>
        <p class="texto-cuerpo-s">Ingresá para administrar costos, productos, combos y pedidos.</p>
        <form class="formulario-campos" onSubmit={ingresar}>
          <label class="campo-entrada"><span>Correo</span><input type="email" autoComplete="username" value={correo} onInput={(e) => setCorreo(e.currentTarget.value)} required /></label>
          <label class="campo-entrada"><span>Contraseña</span><input type="password" autoComplete="current-password" value={contrasena} onInput={(e) => setContrasena(e.currentTarget.value)} required /></label>
          {error && <p class="aviso">{error}</p>}
          <button type="submit" class="boton-primario" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
          <button type="button" class="boton-secundario" onClick={() => navegarA('catalogo')}>Volver al catálogo</button>
        </form>
      </section>
    </main>
  );
}
