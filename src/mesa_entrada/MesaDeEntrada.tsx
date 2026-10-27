// Interfaz de la Mesa de Entrada (Paso 1) con barra de comando unificada, selectores con Tooltip y cápsula inferior de precios en USD.
// Se conecta con SelectorFormatoVideo.tsx, SelectorModeloConTooltip.tsx, ZonaImagenesReferencia.tsx y crear_documento_proyecto.ts.

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerClienteFalSeguro } from "@/configuracion/cliente_fal";
import {
  DURACION_POR_DEFECTO,
  ESTILO_VISUAL_POR_DEFECTO,
  type IdEstiloVisual,
  FORMATO_HORIZONTAL,
  type FormatoVideo,
  IDIOMAS_SALIDA_PERMITIDOS,
  IDIOMA_SALIDA_POR_DEFECTO,
  type IdiomaSalidaVideo,
  MODELOS_IMAGEN_FAL,
  MODELOS_VIDEO_FAL,
  MODELO_IMAGEN_POR_DEFECTO,
  MODELO_VIDEO_POR_DEFECTO,
  PERFILES_PRODUCCION_CALIDAD,
  type PerfilProduccionCalidad,
  TEXTO_BOTON_COMENZAR,
  TEXTO_CARGA_ESTUDIO,
  TOLERANCIA_FLEXIBLE_POR_DEFECTO,
} from "./constantes_mesa_entrada";
import {
  SelectorDuracionVideo,
  SelectorFormatoVideo,
} from "./SelectorFormatoVideo";
import { SelectorModeloConTooltip } from "./SelectorModeloConTooltip";
import { SelectorEstiloVisual } from "./SelectorEstiloVisual";
import {
  BotonAdjuntarImagenes,
  FilaMiniaturasReferencia,
  type ImagenConVistaPrevia,
  agregarActivosDesdeBiblioteca,
  agregarImagenesReferenciaValidas,
} from "./ZonaImagenesReferencia";
import {
  calcularCostoPorMinutoUSD,
  calcularPresupuestoTotalUSD,
  detectarModoCalidad,
} from "./validar_entrada_proyecto";
import { crearProyectoEnFirestore } from "./crear_documento_proyecto";
import { HistorialProyectos } from "./HistorialProyectos";

/**
 * Muestra la Mesa de Entrada con la tarjeta de comando unificada, perfiles Rápido/Pro/Máximo y cálculo de presupuesto en vivo.
 * No recibe propiedades externas y devuelve la pantalla principal interactiva.
 */
export function MesaDeEntrada() {
  const enrutador = useRouter();

  const [ideaOriginal, setIdeaOriginal] = useState<string>("");
  const [formatoSeleccionado, setFormatoSeleccionado] =
    useState<FormatoVideo>(FORMATO_HORIZONTAL);
  const [duracionObjetivo, setDuracionObjetivo] =
    useState<string>(DURACION_POR_DEFECTO);
  const [modeloImagen, setModeloImagen] = useState<string>(
    MODELO_IMAGEN_POR_DEFECTO
  );
  const [modeloVideo, setModeloVideo] = useState<string>(
    MODELO_VIDEO_POR_DEFECTO
  );
  const [estiloVisual, setEstiloVisual] = useState<IdEstiloVisual>(
    ESTILO_VISUAL_POR_DEFECTO
  );
  const [idiomaSalida, setIdiomaSalida] = useState<IdiomaSalidaVideo>(
    IDIOMA_SALIDA_POR_DEFECTO
  );
  const [imagenesCargadas, setImagenesCargadas] = useState<
    ImagenConVistaPrevia[]
  >([]);
  const [arrastrandoArchivos, setArrastrandoArchivos] =
    useState<boolean>(false);
  const [estaGuardando, setEstaGuardando] = useState<boolean>(false);
  const [textoProgresoEnvio, setTextoProgresoEnvio] =
    useState<string>(TEXTO_CARGA_ESTUDIO);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Cálculo dinámico en tiempo real del modo, costo por minuto y presupuesto total según la duración
  const modoCalidadActual = detectarModoCalidad(modeloImagen, modeloVideo);
  const costoEstimadoPorMinutoUSD = calcularCostoPorMinutoUSD(
    modeloImagen,
    modeloVideo
  );
  const presupuestoTotalEstimadoUSD = calcularPresupuestoTotalUSD(
    costoEstimadoPorMinutoUSD,
    duracionObjetivo
  );

  // Configuramos el túnel seguro de fal.ai hacia /api/fal/proxy al cargar la página
  useEffect(() => {
    obtenerClienteFalSeguro();
  }, []);

  /**
   * Aplica automáticamente la pareja de Modelo de Imagen y Modelo de Video al elegir Rápido, Pro o Máximo.
   * Recibe el perfil elegido por el usuario y actualiza los selectores y el costo en vivo.
   */
  function aplicarPerfilDeCalidad(perfil: PerfilProduccionCalidad) {
    setModeloImagen(perfil.idModeloImagen);
    setModeloVideo(perfil.idModeloVideo);
  }

  /**
   * Elimina una imagen adjunta de la fila superior cuando el usuario pulsa su botón "✕".
   * Recibe la posición de la imagen en la fila y libera su vista previa temporal.
   */
  function quitarImagenPorIndice(indiceAQuitar: number) {
    const imagenAQuitar = imagenesCargadas[indiceAQuitar];
    if (imagenAQuitar && imagenAQuitar.urlVistaPrevia.startsWith("blob:")) {
      URL.revokeObjectURL(imagenAQuitar.urlVistaPrevia);
    }

    setImagenesCargadas(
      imagenesCargadas.filter((_, indice) => indice !== indiceAQuitar)
    );
    setMensajeError(null);
  }

  /**
   * Se ejecuta al pulsar el botón circular de envío (↑): muestra el avance real paso a paso y abre /estudio/[id].
   * Recibe el evento del formulario y usa try / catch / finally estricto para que jamás se quede colgado el spinner.
   */
  async function manejarEnvioProduccion(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensajeError(null);
    setEstaGuardando(true);

    const archivosParaSubir = imagenesCargadas
      .filter((item) => !item.activoBiblioteca)
      .map((item) => item.archivo);
    const activosBibliotecaElegidos = imagenesCargadas
      .map((item) => item.activoBiblioteca)
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    setTextoProgresoEnvio(
      archivosParaSubir.length > 0
        ? `Verificando en Biblioteca / Subiendo archivos (1 de ${archivosParaSubir.length})...`
        : activosBibliotecaElegidos.length > 0
        ? `Reutilizando ${activosBibliotecaElegidos.length} activo(s) de tu Biblioteca Global...`
        : "Guardando proyecto en la base de datos..."
    );

    try {
      const nuevoProyectoId = await crearProyectoEnFirestore({
        ideaOriginal,
        formato: formatoSeleccionado,
        duracionObjetivo,
        toleranciaFlexible: TOLERANCIA_FLEXIBLE_POR_DEFECTO,
        modeloImagen,
        modeloVideo,
        estiloVisualSeleccionado: estiloVisual,
        modoCalidad: modoCalidadActual,
        costoEstimadoPorMinutoUSD,
        presupuestoTotalEstimadoUSD,
        idiomaSalida,
        archivosReferencia: archivosParaSubir,
        activosBibliotecaSeleccionados: activosBibliotecaElegidos,
        alInformarProgreso: (mensajePaso) => setTextoProgresoEnvio(mensajePaso),
      });

      setTextoProgresoEnvio("Entrando a la sala de estudio...");
      enrutador.push(`/estudio/${nuevoProyectoId}`);
    } catch (error) {
      const textoExplicativo =
        error instanceof Error
          ? error.message
          : "Ocurrió un problema inesperado al preparar tu estudio. Inténtalo de nuevo.";

      setMensajeError(textoExplicativo);
    } finally {
      setEstaGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl space-y-5">
        <header className="text-center space-y-1.5">
          <span className="inline-block rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700">
            VoxkyStudio · Mesa de Entrada
          </span>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900">
            ¿Qué video vamos a producir hoy?
          </h1>
          <p className="text-sm text-slate-500">
            Escribe tu idea, adjunta tus referencias y ajusta los motores de tu
            estudio en una sola barra.
          </p>
        </header>

        {/* Gran tarjeta blanca redondeada estilo "barra de comando unificada" */}
        <form
          onSubmit={manejarEnvioProduccion}
          onDragOver={(evento) => {
            evento.preventDefault();
            if (!estaGuardando) setArrastrandoArchivos(true);
          }}
          onDragLeave={() => setArrastrandoArchivos(false)}
          onDrop={(evento) => {
            evento.preventDefault();
            setArrastrandoArchivos(false);
            if (!estaGuardando) {
              agregarImagenesReferenciaValidas(
                imagenesCargadas,
                evento.dataTransfer.files,
                setImagenesCargadas,
                setMensajeError
              );
            }
          }}
          className={`w-full rounded-3xl border bg-white p-4 sm:p-5 shadow-xl shadow-slate-200/80 transition-all ${
            arrastrandoArchivos
              ? "border-indigo-500 ring-4 ring-indigo-500/15 bg-indigo-50/20"
              : "border-slate-200/90"
          }`}
        >
          {/* PARTE SUPERIOR: Área de texto limpia y fila de miniaturas si hay fotos adjuntas */}
          <div className="px-1">
            <FilaMiniaturasReferencia
              imagenesCargadas={imagenesCargadas}
              alQuitarImagen={quitarImagenPorIndice}
              deshabilitado={estaGuardando}
            />

            <textarea
              id="idea-video"
              rows={4}
              value={ideaOriginal}
              disabled={estaGuardando}
              onChange={(evento) => {
                setIdeaOriginal(evento.target.value);
                if (mensajeError) setMensajeError(null);
              }}
              placeholder="Describe la idea de tu video, personajes, estilo visual o arrastra aquí tus imágenes de referencia..."
              className="w-full border-0 bg-transparent py-2 text-base sm:text-lg text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50 resize-none"
            />
          </div>

          {mensajeError && (
            <div
              role="alert"
              className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs sm:text-sm font-medium text-red-700"
            >
              {mensajeError}
            </div>
          )}

          {estaGuardando && (
            <div className="mb-3 flex items-center gap-2.5 rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-indigo-800">
              <span className="h-4 w-4 rounded-full border-2 border-indigo-300 border-t-indigo-700 animate-spin shrink-0" />
              <span>{textoProgresoEnvio}</span>
            </div>
          )}

          {/* PARTE INFERIOR: Barra de herramientas integrada dentro de la misma caja */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
            {/* IZQUIERDA: Botón "+", Formato, Duración, Modelo de Imagen y Modelo de Video */}
            <div className="flex flex-wrap items-center gap-2">
              <BotonAdjuntarImagenes
                alSeleccionarArchivos={(archivos) =>
                  agregarImagenesReferenciaValidas(
                    imagenesCargadas,
                    archivos,
                    setImagenesCargadas,
                    setMensajeError
                  )
                }
                alSeleccionarDeBiblioteca={(activos) =>
                  agregarActivosDesdeBiblioteca(
                    imagenesCargadas,
                    activos,
                    setImagenesCargadas,
                    setMensajeError
                  )
                }
                deshabilitado={estaGuardando}
              />

              <SelectorFormatoVideo
                formatoSeleccionado={formatoSeleccionado}
                alCambiarFormato={setFormatoSeleccionado}
                deshabilitado={estaGuardando}
              />

              <SelectorDuracionVideo
                duracionObjetivo={duracionObjetivo}
                alCambiarDuracion={setDuracionObjetivo}
                deshabilitado={estaGuardando}
              />

              <SelectorModeloConTooltip
                tipoIcono="imagen"
                etiquetaAria="Modelo de Imagen en fal.ai"
                modelosDisponibles={MODELOS_IMAGEN_FAL}
                idModeloSeleccionado={modeloImagen}
                alSeleccionarModelo={setModeloImagen}
                deshabilitado={estaGuardando}
              />

              <SelectorModeloConTooltip
                tipoIcono="video"
                etiquetaAria="Modelo de Video en fal.ai"
                modelosDisponibles={MODELOS_VIDEO_FAL}
                idModeloSeleccionado={modeloVideo}
                alSeleccionarModelo={setModeloVideo}
                deshabilitado={estaGuardando}
              />

              <SelectorEstiloVisual
                estiloSeleccionado={estiloVisual}
                alCambiarEstilo={setEstiloVisual}
                deshabilitado={estaGuardando}
              />
            </div>

            {/* DERECHA: Selector de Idioma de salida y botón circular de envío "↑" */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative inline-flex items-center">
                <select
                  aria-label="Idioma de salida del video"
                  value={idiomaSalida}
                  disabled={estaGuardando}
                  onChange={(evento) =>
                    setIdiomaSalida(evento.target.value as IdiomaSalidaVideo)
                  }
                  title="Idioma final de diálogos, voces y textos del video (manda sobre el idioma del prompt)"
                  className="appearance-none rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 pl-3.5 pr-7 py-1.5 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {IDIOMAS_SALIDA_PERMITIDOS.map((idioma) => (
                    <option key={idioma} value={idioma}>
                      {idioma}
                    </option>
                  ))}
                </select>

                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <button
                type="submit"
                disabled={estaGuardando}
                title={TEXTO_BOTON_COMENZAR}
                aria-label={TEXTO_BOTON_COMENZAR}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-md shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait shrink-0"
              >
                ↑
              </button>
            </div>
          </div>
        </form>

        {/* BARRA FLOTANTE INFERIOR DE MODOS: Rápido, Pro y Máximo + Presupuesto Total Estimado en USD */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Cápsula translúcida centrada (estilo glassmorphism) */}
          <div className="inline-flex flex-wrap items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 backdrop-blur-md p-1.5 shadow-lg shadow-slate-200/60">
            {PERFILES_PRODUCCION_CALIDAD.map((perfil) => {
              const estaSeleccionado = modoCalidadActual === perfil.modo;
              const costoPerfilPorMinuto = calcularCostoPorMinutoUSD(
                perfil.idModeloImagen,
                perfil.idModeloVideo
              );

              return (
                <button
                  key={perfil.modo}
                  type="button"
                  disabled={estaGuardando}
                  onClick={() => aplicarPerfilDeCalidad(perfil)}
                  title={`${perfil.descripcionCorta} (${perfil.rangoReferenciaUSD})`}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs transition-all cursor-pointer disabled:opacity-50 ${
                    estaSeleccionado
                      ? "bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/30"
                      : "text-slate-700 hover:bg-slate-100/90 font-semibold"
                  }`}
                >
                  <span>{perfil.icono}</span>
                  <span>{perfil.titulo}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      estaSeleccionado
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    ~${costoPerfilPorMinuto.toFixed(2)}/min
                  </span>
                </button>
              );
            })}
          </div>

          {/* Indicador dinámico en vivo del costo por minuto y presupuesto total según la duración seleccionada */}
          <div className="inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-emerald-200/80 bg-emerald-50/70 px-4 py-1.5 text-xs text-emerald-950">
            <span>
              Tarifa actual:{" "}
              <strong className="font-bold">
                ~${costoEstimadoPorMinutoUSD.toFixed(2)} USD / min
              </strong>
              {modoCalidadActual === "personalizado" && (
                <span className="ml-1.5 rounded-full bg-white border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                  Personalizado
                </span>
              )}
            </span>
            <span className="text-emerald-300">•</span>
            <span>
              Costo aprox. del proyecto ({duracionObjetivo}):{" "}
              <strong className="font-bold text-emerald-800">
                ~${presupuestoTotalEstimadoUSD.toFixed(2)} USD
              </strong>
            </span>
          </div>
        </div>

        {/* Sección "📂 Mis Proyectos Recientes" en tiempo real con opciones para continuar o eliminar */}
        <HistorialProyectos />
      </div>
    </main>
  );
}
