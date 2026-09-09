/** @jsx h */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { supabase, supabaseConfigurado } from '../config/supabase.js';
import { cargarFuenteInicialSiHaceFalta } from '../desarrollo/inicializacion.js';
import { App } from './App.jsx';

export function AuthGate() {
  const [sesion, setSesion] = useState(undefined);
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [datosInicializados, setDatosInicializados] = useState(false);

  useEffect(() => {
    if (!supabaseConfigurado) { setSesion(null); return undefined; }
    let activo = true;
    supabase.auth.getSession().then(({ data }) => activo && setSesion(data.session));
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => setSesion(nuevaSesion));
    return () => { activo = false; suscripcion.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!supabaseConfigurado || !sesion || datosInicializados) return undefined;
    let activo = true;
    setCargandoDatos(true);
    cargarFuenteInicialSiHaceFalta()
      .then(() => activo && setDatosInicializados(true))
      .catch((errorInicializacion) => {
        console.error('No se pudo cargar el catálogo inicial.', errorInicializacion);
        if (activo) setError('No se pudo cargar el catálogo. Revisá que hayas ejecutado supabase/schema.sql.');
      })
      .finally(() => activo && setCargandoDatos(false));
    return () => { activo = false; };
  }, [sesion, datosInicializados]);

  async function ingresar(evento) {
    evento.preventDefault();
    setCargando(true); setError(null);
    const { error: errorIngreso } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena });
    if (errorIngreso) setError('Correo o contraseña incorrectos.');
    setCargando(false);
  }

  if (!supabaseConfigurado) return <App />;
  if (sesion && cargandoDatos) return <main class="auth-pantalla"><p class="texto-cuerpo-s">Cargando catálogo…</p></main>;
  if (sesion && datosInicializados) return <App />;
  if (sesion === undefined) return <main class="auth-pantalla"><p class="texto-cuerpo-s">Comprobando acceso…</p></main>;

  return (
    <main class="auth-pantalla">
      <section class="tarjeta auth-tarjeta">
        <h1 class="titulo-l">Candelaria</h1>
        <p class="texto-cuerpo-s">Ingresá para administrar costos, productos, combos y pedidos.</p>
        <form class="formulario-campos" onSubmit={ingresar}>
          <label class="campo-entrada"><span>Correo</span><input type="email" value={correo} onInput={(e) => setCorreo(e.currentTarget.value)} required /></label>
          <label class="campo-entrada"><span>Contraseña</span><input type="password" value={contrasena} onInput={(e) => setContrasena(e.currentTarget.value)} required /></label>
          {error && <p class="aviso">{error}</p>}
          <button type="submit" class="boton-primario" disabled={cargando}>{cargando ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
      </section>
    </main>
  );
}
