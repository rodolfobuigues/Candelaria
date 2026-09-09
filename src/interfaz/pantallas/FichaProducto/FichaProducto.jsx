/** @jsx h */
import { h } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { abrirDB, obtenerTodos } from '../../../persistencia/db.js';
import { TIENDAS } from '../../../persistencia/esquema.js';
import { obtenerCatalogo } from '../../../persistencia/catalogoRepo.js';
import { resolverRecipienteCosto, calcularIndicadores } from '../../../motor/calculo.js';
import { obtenerParametrosVigentes } from '../../../config/parametrosRepo.js';
import { formatearImporte, formatearCostoUnitario } from '../../../config/formato.js';
import { navegarA } from '../../enrutador.js';

function numeroTexto(numero, decimales = 2) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: decimales,
    minimumFractionDigits: 0,
  }).format(numero);
}

function FilaReceta({ nombre, cantidad, unidad, importe }) {
  if (!cantidad && !importe) return null;
  return (
    <li class="fila-lista">
      <div class="fila-lista__contenido">
        <strong class="nombre-truncado">{nombre}</strong>
        <span class="texto-cuerpo-s fila-lista__codigo">{numeroTexto(cantidad)} {unidad}</span>
      </div>
      <span class="importe">{formatearCostoUnitario(importe)}</span>
    </li>
  );
}

function construirReceta(producto, costos, insumosPorId, productosPorId) {
  const receta = [
    { nombre: 'Cera alto PF', cantidad: producto.ceraAltoPF, unidad: 'g', importe: producto.costoCeraAlto },
    { nombre: 'Cera bajo PF', cantidad: producto.ceraBajoPF, unidad: 'g', importe: producto.costoCeraBajo },
    { nombre: 'Pabilo', cantidad: producto.pabilo, unidad: 'unidad', importe: producto.costoPabilo },
    { nombre: 'Recipiente', cantidad: producto.recipienteCantidad, unidad: 'unidad', importe: producto.costoRecipiente },
    { nombre: 'Yeso', cantidad: producto.yeso, unidad: 'g', importe: producto.costoYeso },
    { nombre: 'Esencia', cantidad: producto.esenciaG, unidad: 'g', importe: producto.costoEsencia },
    { nombre: 'Colorante', cantidad: producto.coloranteMl, unidad: 'ml', importe: producto.costoColorante },
    { nombre: 'Aceite de coco', cantidad: producto.cocoU, unidad: 'unidad', importe: producto.costoCoco },
  ];

  const extras = (producto.extras ?? []).map((extra) => {
    const insumo = insumosPorId.get(extra.insumoId);
    return {
      nombre: insumo?.nombre ?? extra.insumoId,
      cantidad: extra.cantidad,
      unidad: insumo?.unidad ?? 'unidad',
      importe: (costos.get(extra.insumoId) ?? 0) * extra.cantidad,
    };
  });

  return { fija: receta, extras, productosPorId };
}

function Indicador({ etiqueta, valor }) {
  return (
    <div class="indicador">
      <span class="etiqueta">{etiqueta}</span>
      <strong>{valor}</strong>
    </div>
  );
}

export function FichaProducto({ codigo }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const db = await abrirDB();
        const parametros = await obtenerParametrosVigentes(db);
        const [catalogo, productos, insumos] = await Promise.all([
          obtenerCatalogo(db, parametros),
          obtenerTodos(db, TIENDAS.PRODUCTOS),
          obtenerTodos(db, TIENDAS.INSUMOS),
        ]);
        if (!activo) return;
        const producto = catalogo.productos.find((item) => item.id === codigo);
        if (!producto) throw new Error(`No existe el producto ${codigo}.`);
        const productosPorId = new Map(productos.map((item) => [item.id, item]));
        const productoBase = productosPorId.get(codigo);
        const recipienteCostoResuelto = resolverRecipienteCosto(productoBase, productosPorId);
        const insumosPorId = new Map(insumos.map((item) => [item.id, item]));
        const costos = new Map(insumos.map((item) => [
          item.id,
          item.montoCompra / item.cantidadCompra,
        ]));
        const receta = construirReceta({ ...producto, recipienteCostoResuelto }, costos, insumosPorId, productosPorId);
        const indicadores = calcularIndicadores(producto);
        setDatos({ producto, receta, indicadores });
      } catch (e) {
        if (activo) setError(e.message);
      }
    }
    cargar();
    return () => { activo = false; };
  }, [codigo]);

  const categoria = useMemo(() => ({
    VELA: 'Vela',
    RECIPIENTE: 'Recipiente',
    REPOSICION: 'Reposición',
  }), []);

  if (error) {
    return <p class="aviso">No se pudo cargar la ficha: {error}</p>;
  }
  if (!datos) {
    return <p class="texto-cuerpo-s">Cargando ficha…</p>;
  }

  const { producto, receta, indicadores } = datos;
  return (
    <section class="ficha-producto lista">
      <div class="ficha-producto__identidad">
        <span class="texto-cuerpo-s">{producto.codigo} · {categoria[producto.categoria] ?? producto.categoria}</span>
        <h2 class="titulo-m">{producto.nombre}</h2>
        <span class="etiqueta">Precio</span>
        <strong class="importe-l ficha-producto__precio">{formatearImporte(producto.precio)}</strong>
      </div>

      <section class="tarjeta ficha-seccion">
        <h3 class="texto-seccion">Receta</h3>
        <ul class="lista ficha-lista">
          {receta.fija.map((linea) => <FilaReceta key={linea.nombre} {...linea} />)}
          {receta.extras.map((linea) => <FilaReceta key={linea.nombre} {...linea} />)}
        </ul>
      </section>

      <section class="tarjeta ficha-seccion">
        <h3 class="texto-seccion">Costo</h3>
        <dl class="ficha-costos">
          <div><dt>Materiales</dt><dd>{formatearCostoUnitario(producto.materiales)}</dd></div>
          <div><dt>Mano de obra · {numeroTexto(producto.minutosManoObra, 0)} min</dt><dd>{formatearCostoUnitario(producto.manoObra)}</dd></div>
          <div><dt>Subtotal</dt><dd>{formatearCostoUnitario(producto.subtotal)}</dd></div>
          <div class="ficha-costos__total"><dt>Costo de producción</dt><dd>{formatearImporte(producto.costoProduccion)}</dd></div>
        </dl>
      </section>

      <section class="ficha-indicadores" aria-label="Indicadores de rentabilidad">
        <Indicador etiqueta="Margen sobre costo" valor={`${numeroTexto(indicadores.margenSobreCosto * 100, 1)} %`} />
        <Indicador etiqueta="Peso mano de obra" valor={`${numeroTexto(indicadores.pesoManoObra * 100, 1)} %`} />
        <Indicador etiqueta="Beneficio bruto" valor={formatearImporte(indicadores.beneficioBruto)} />
        <Indicador etiqueta="Beneficio neto" valor={formatearImporte(indicadores.beneficioNeto)} />
      </section>

      <button type="button" class="boton-secundario" onClick={() => navegarA(`producto-editar/${producto.codigo}`)}>Editar receta</button>
    </section>
  );
}
