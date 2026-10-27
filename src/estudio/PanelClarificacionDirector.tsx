// Panel interactivo del Agente Productor Ejecutivo en la Sala de Estudio: muestra categoría, visión/audio y preguntas elásticas.
// Se conecta con tipos_productor_ejecutivo.ts, /api/agentes/confirmar-clarificacion y actualiza Firestore desde VistaEstudioInicial.tsx.

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  type AnalisisProductorEjecutivo,
  CATALOGO_CATEGORIAS_PRODUCCION,
  type ResultadoTranscripcionAudio,
} from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";
import { limpiarTextoFichaTecnica } from "@/agentes/analista_clarificador/inspector_multimodal_fal";
import { reconciliarLetraYSegmentosCompletos } from "@/agentes/analista_clarificador/reconciliador_letra_whisper";
import { leerDuracionMultimediaEnNavegador } from "@/mesa_entrada/ZonaImagenesReferencia";

/**
 * Convierte el texto con Markdown (**negritas**, ### títulos y * listas) en elementos limpios y fáciles de leer sin asteriscos sueltos.
 * Recibe el texto crudo de la Ficha de Identidad Visual y devuelve párrafos con negritas reales.
 */
function renderizarFichaVisualLimpia(textoCrudo: string): React.ReactNode {
  const lineas = String(textoCrudo ?? "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .split("\n");

  return lineas.map((linea, idxLinea) => {
    const partes = linea.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={idxLinea}>
        {partes.map((fragmento, idxFrag) => {
          if (fragmento.startsWith("**") && fragmento.endsWith("**")) {
            const limpio = fragmento.slice(2, -2).replace(/\*/g, "").trim();
            return (
              <strong key={idxFrag} className="font-bold text-slate-900">
                {limpio}
              </strong>
            );
          }
          return <span key={idxFrag}>{fragmento.replace(/\*\*/g, "")}</span>;
        })}
        {idxLinea < lineas.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

interface PropiedadesPanelClarificacion {
  proyectoId: string;
  estadoActual: string;
  analisis: AnalisisProductorEjecutivo;
  alConfirmarClarificacion: (
    analisisActualizado: AnalisisProductorEjecutivo,
    nuevoEstado: string
  ) => Promise<void>;
  alPasarAlPaso3Guion?: () => void;
}

/**
 * Muestra la especialidad detectada por el Director, el análisis de imágenes/audios y el formulario elástico de preguntas.
 * Recibe el análisis del Productor Ejecutivo y la función para guardar en Firestore, y devuelve el panel en tiempo real.
 */
export function PanelClarificacionDirector({
  proyectoId,
  estadoActual,
  analisis,
  alConfirmarClarificacion,
  alPasarAlPaso3Guion,
}: PropiedadesPanelClarificacion) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(
    analisis.respuestasUsuario ?? {}
  );
  const [enviandoDecisiones, setEnviandoDecisiones] = useState<boolean>(false);
  const [recalculandoAudioUrl, setRecalculandoAudioUrl] = useState<
    string | null
  >(null);
  const [reanalizandoFichas, setReanalizandoFichas] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const autoReparacionIniciadaRef = useRef<boolean>(false);

  /**
   * Vuelve a analizar individualmente cada imagen del proyecto para actualizar su Ficha Técnica limpia.
   */
  async function volverAAnalizarFichasVisuales() {
    setMensajeError(null);
    setReanalizandoFichas(true);
    try {
      const respuestaHttp = await fetch("/api/agentes/analizar-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId }),
      });
      const datos = await respuestaHttp.json();
      if (!respuestaHttp.ok || !datos.ok) {
        throw new Error(
          datos.error ?? "No se pudieron actualizar las fichas técnicas visuales."
        );
      }
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "Error al volver a analizar las fichas técnicas."
      );
    } finally {
      setReanalizandoFichas(false);
    }
  }

  // Si detectamos que un proyecto guardado tenía el formato anterior con código JSON "{ resumenVisual" o texto genérico, lo repara solo
  useEffect(() => {
    if (autoReparacionIniciadaRef.current) return;
    const lista = analisis.fichaIdentidadVisual?.personajesSeparados ?? [];
    const tieneFormatoAntiguo = lista.some(
      (p) =>
        p.identidadFisicaInmutable.includes("resumenVisual") ||
        p.identidadFisicaInmutable.includes("{") ||
        p.vestuarioOriginalFoto.includes("Prendas, colores, calzado y texturas que lleva puestos")
    );
    if (tieneFormatoAntiguo) {
      autoReparacionIniciadaRef.current = true;
      volverAAnalizarFichasVisuales();
    }
  }, [analisis.fichaIdentidadVisual]);

  const infoCategoria =
    CATALOGO_CATEGORIAS_PRODUCCION[analisis.categoriaPrincipal] ??
    CATALOGO_CATEGORIAS_PRODUCCION.cine_serie_storyboard;

  /**
   * Actualiza la respuesta de una pregunta cuando el usuario pulsa un botón rápido o escribe su propio detalle.
   * Recibe el ID de la pregunta y el texto elegido, y actualiza el estado local.
   */
  function seleccionarOEscribirRespuesta(idPregunta: string, valor: string) {
    setRespuestas((previo) => ({
      ...previo,
      [idPregunta]: valor,
    }));
  }

  /**
   * Recalcula el 100% de los segmentos de una canción o audio rescatando cualquier estrofa final hasta la duración total del archivo.
   * Recibe la transcripción actual, mide la duración real del audio y guarda los segmentos reconciliados en Firestore.
   */
  async function recalcularSegmentosCompletosAudio(
    transcripcion: ResultadoTranscripcionAudio
  ) {
    setMensajeError(null);
    setRecalculandoAudioUrl(transcripcion.urlArchivo);

    try {
      const duracionNavegador = await leerDuracionMultimediaEnNavegador(
        "audio",
        transcripcion.urlArchivo
      );
      const ultimoActual =
        transcripcion.segmentosConTiempo.length > 0
          ? transcripcion.segmentosConTiempo[
              transcripcion.segmentosConTiempo.length - 1
            ].finSeg
          : 0;

      // Si el navegador lee la duración exacta, la usamos; si por CORS no expone metadata, tomamos la duración registrada o el último tramo conocido
      const duracionObjetivo =
        duracionNavegador ??
        transcripcion.duracionTotalSegundos ??
        (ultimoActual > 0 ? ultimoActual : undefined);

      const nuevosSegmentos = reconciliarLetraYSegmentosCompletos(
        transcripcion.textoCompleto,
        transcripcion.segmentosConTiempo,
        duracionObjetivo
      );

      const nuevasTranscripciones = analisis.transcripcionesAudioVideo.map(
        (item) =>
          item.urlArchivo === transcripcion.urlArchivo
            ? {
                ...item,
                duracionTotalSegundos: duracionObjetivo,
                segmentosConTiempo: nuevosSegmentos,
              }
            : item
      );

      const analisisActualizado: AnalisisProductorEjecutivo = {
        ...analisis,
        transcripcionesAudioVideo: nuevasTranscripciones,
      };

      await alConfirmarClarificacion(analisisActualizado, estadoActual);
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudieron recalcular los segmentos completos del audio."
      );
    } finally {
      setRecalculandoAudioUrl(null);
    }
  }

  /**
   * Envía las respuestas (o la orden de saltar preguntas) a /api/agentes/confirmar-clarificacion y actualiza Firestore.
   * Recibe un booleano indicando si el usuario decidió saltar las preguntas.
   */
  async function enviarDecisionesDirector(saltarPreguntas: boolean) {
    setMensajeError(null);
    setEnviandoDecisiones(true);

    try {
      const respuestaHttp = await fetch(
        "/api/agentes/confirmar-clarificacion",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proyectoId,
            analisisActual: analisis,
            respuestasUsuario: respuestas,
            saltarPreguntas,
          }),
        }
      );

      const datos = await respuestaHttp.json();
      if (!respuestaHttp.ok || !datos.ok) {
        throw new Error(
          datos.error ?? "No se pudieron guardar las decisiones del Director."
        );
      }

      await alConfirmarClarificacion(
        datos.analisisProductorEjecutivo,
        datos.estadoSiguiente
      );
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "Ocurrió un problema al confirmar la clarificación."
      );
    } finally {
      setEnviandoDecisiones(false);
    }
  }

  return (
    <div className="space-y-5 border-t border-slate-200 pt-6">
      {/* 1. Tarjeta de Categoría de Producción detectada por el Director */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/80 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-600 text-white text-xl shadow-sm shrink-0">
              {infoCategoria.icono}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Agente Productor Ejecutivo
              </p>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {infoCategoria.icono} Proyecto detectado: {infoCategoria.titulo}
              </h3>
            </div>
          </div>

          {analisis.categoriasSecundarias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {analisis.categoriasSecundarias.map((catSec) => {
                const infoSec = CATALOGO_CATEGORIAS_PRODUCCION[catSec];
                return (
                  <span
                    key={catSec}
                    className="rounded-full border border-indigo-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-indigo-800"
                  >
                    + {infoSec?.icono} {infoSec?.titulo ?? catSec}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-600 mt-2.5">
          {analisis.justificacionCategoria}
        </p>
      </div>

      {/* 2. Bloques desplegables limpios: Ficha de Identidad Visual y Letra / Audio escuchado por el Agente (Whisper) */}
      {(analisis.fichaIdentidadVisual ||
        analisis.transcripcionesAudioVideo.length > 0) && (
        <div className="space-y-3">
          {analisis.fichaIdentidadVisual && (
            <details
              open
              className="group rounded-2xl border border-sky-200 bg-sky-50/60 p-4 transition-all"
            >
              <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none text-xs sm:text-sm font-bold text-sky-900">
                <span>
                  👁️ Fichas Técnicas de Personajes y Productos ({analisis.fichaIdentidadVisual.detallesPorImagen.length})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={reanalizandoFichas}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      volverAAnalizarFichasVisuales();
                    }}
                    className="rounded-full border border-sky-300 bg-white hover:bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-900 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {reanalizandoFichas
                      ? "⏳ Analizando cada imagen..."
                      : "🔄 Actualizar fichas técnicas"}
                  </button>
                  <span className="rounded-full bg-white border border-sky-200 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800 group-open:bg-sky-700 group-open:text-white transition-colors">
                    {analisis.fichaIdentidadVisual.detallesPorImagen.length}{" "}
                    ref(s) ▾
                  </span>
                </div>
              </summary>

              <div className="mt-3 pt-3 border-t border-sky-200/70 space-y-3">
                {analisis.fichaIdentidadVisual.personajesSeparados &&
                analisis.fichaIdentidadVisual.personajesSeparados.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analisis.fichaIdentidadVisual.personajesSeparados.map(
                      (personaje, idxP) => {
                        const rasgosLimpios = limpiarTextoFichaTecnica(
                          personaje.identidadFisicaInmutable
                        );
                        const vestuarioLimpio = limpiarTextoFichaTecnica(
                          personaje.vestuarioOriginalFoto
                        );

                        return (
                          <div
                            key={`${personaje.nombreArchivo}-${idxP}`}
                            className="rounded-2xl bg-white border border-sky-200 p-3.5 space-y-3 shadow-xs flex flex-col justify-between"
                          >
                            <div className="flex items-center gap-3 border-b border-slate-100 pb-2.5">
                              {personaje.urlImagen ? (
                                <img
                                  src={personaje.urlImagen}
                                  alt={personaje.nombreArchivo}
                                  className="h-14 w-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                                />
                              ) : (
                                <div className="h-14 w-14 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl shrink-0">
                                  👤
                                </div>
                              )}
                              <div className="min-w-0">
                                <span className="inline-block rounded-full bg-sky-100 border border-sky-200 px-2 py-0.5 text-[10px] font-bold text-sky-900">
                                  Ficha Técnica #{idxP + 1}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                                  {personaje.nombreArchivo}
                                </h4>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-2.5 text-xs text-slate-800 leading-relaxed">
                                <strong className="text-emerald-950 block mb-0.5">
                                  👤 Apariencia y Rasgos Físicos (Fijos en todo el video):
                                </strong>
                                {rasgosLimpios}
                              </div>

                              <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-2.5 text-xs text-slate-800 leading-relaxed">
                                <strong className="text-amber-950 block mb-0.5">
                                  👕 Ropa y Calzado en la Foto:
                                </strong>
                                {vestuarioLimpio}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    {renderizarFichaVisualLimpia(
                      limpiarTextoFichaTecnica(
                        analisis.fichaIdentidadVisual.resumenVisual
                      )
                    )}
                  </div>
                )}
              </div>
            </details>
          )}

          {analisis.transcripcionesAudioVideo.map((transcripcion) => (
            <details
              key={transcripcion.urlArchivo}
              className="group rounded-2xl border border-violet-200 bg-violet-50/60 p-4 transition-all"
            >
              <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none text-xs sm:text-sm font-bold text-violet-950">
                <span>
                  🎵 Letra / Audio escuchado por el Agente (Clic para ver
                  transcripción)
                </span>
                <span className="rounded-full bg-white border border-violet-200 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800 group-open:bg-violet-700 group-open:text-white transition-colors">
                  {transcripcion.nombreArchivo} ▾
                </span>
              </summary>

              <div className="mt-3 pt-3 border-t border-violet-200/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-violet-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white border border-violet-200 px-2.5 py-0.5 font-semibold">
                      Idioma detectado: {transcripcion.idiomaDetectado}
                    </span>
                    <span className="rounded-full bg-white border border-violet-200 px-2.5 py-0.5">
                      {transcripcion.ritmoYTono}
                    </span>
                    {transcripcion.duracionTotalSegundos && (
                      <span className="rounded-full bg-violet-100 border border-violet-300 px-2.5 py-0.5 font-bold text-violet-900">
                        Duración real: {transcripcion.duracionTotalSegundos}s
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={recalculandoAudioUrl === transcripcion.urlArchivo}
                    onClick={() => recalcularSegmentosCompletosAudio(transcripcion)}
                    className="rounded-full border border-violet-300 bg-white hover:bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-900 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {recalculandoAudioUrl === transcripcion.urlArchivo
                      ? "⏳ Recalculando hasta el final..."
                      : "🔄 Recalcular marcas de tiempo completas"}
                  </button>
                </div>

                <div className="rounded-xl bg-white/90 border border-violet-100 p-3 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {transcripcion.textoCompleto}
                </div>

                {transcripcion.segmentosConTiempo.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-violet-800">
                      Marcas de tiempo completas (
                      {transcripcion.segmentosConTiempo.length} segmentos · hasta{" "}
                      {transcripcion.segmentosConTiempo[
                        transcripcion.segmentosConTiempo.length - 1
                      ]?.finSeg.toFixed(1)}
                      s):
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {transcripcion.segmentosConTiempo.map((seg, idx) => (
                        <span
                          key={idx}
                          className="rounded-lg bg-white border border-violet-200/80 px-2.5 py-1 text-[11px] text-slate-700"
                        >
                          <strong className="text-violet-800">
                            [{seg.inicioSeg.toFixed(1)}s -{" "}
                            {seg.finSeg.toFixed(1)}s]
                          </strong>{" "}
                          {seg.texto}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}

      {/* 3. Preguntas Elásticas del Director (Cuando estado === "esperando_clarificacion") */}
      {estadoActual === "esperando_clarificacion" &&
        analisis.preguntas.length > 0 && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  🎬 Preguntas del Director ({analisis.preguntas.length})
                </h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Elige una opción con un clic o escribe tu propio detalle abajo
                  de cada pregunta.
                </p>
              </div>

              <button
                type="button"
                disabled={enviandoDecisiones}
                onClick={() => enviarDecisionesDirector(true)}
                className="rounded-full border border-slate-300 bg-white hover:bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Saltar preguntas (Que el Director decida por mí) →
              </button>
            </div>

            <div className="space-y-4">
              {analisis.preguntas.map((item, indice) => {
                const valorActual = respuestas[item.id] ?? "";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-2xs"
                  >
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {indice + 1}. {item.pregunta}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.motivoCreativo}
                      </p>
                    </div>

                    {/* Botones de opciones rápidas sugeridas por el Director */}
                    <div className="flex flex-wrap gap-2">
                      {item.opcionesSugeridas.map((opcion) => {
                        const seleccionada = valorActual === opcion;
                        return (
                          <button
                            key={opcion}
                            type="button"
                            disabled={enviandoDecisiones}
                            onClick={() =>
                              seleccionarOEscribirRespuesta(item.id, opcion)
                            }
                            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                              seleccionada
                                ? "border-indigo-600 bg-indigo-600 text-white shadow-2xs"
                                : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                            }`}
                          >
                            {seleccionada ? "✓ " : ""}
                            {opcion}
                          </button>
                        );
                      })}
                    </div>

                    {/* Campo abierto por si el usuario quiere escribir su propio detalle */}
                    <input
                      type="text"
                      value={valorActual}
                      disabled={enviandoDecisiones}
                      onChange={(evento) =>
                        seleccionarOEscribirRespuesta(
                          item.id,
                          evento.target.value
                        )
                      }
                      placeholder="O escribe aquí tu propio detalle o instrucción personalizada..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    />
                  </div>
                );
              })}
            </div>

            {mensajeError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
                {mensajeError}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={enviandoDecisiones}
                onClick={() => enviarDecisionesDirector(false)}
                className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 text-xs sm:text-sm shadow-md shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
              >
                {enviandoDecisiones
                  ? "Guardando decisiones del Director..."
                  : "Confirmar Decisiones y Pasar a Guion →"}
              </button>
            </div>
          </div>
        )}

      {/* 4. Confirmación cuando el proyecto ya está en "listo_para_guion" (0 preguntas o ya confirmado) */}
      {estadoActual === "listo_para_guion" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm sm:text-base font-bold text-emerald-950">
              ✅ Dirección Creativa Completa · Estado: listo_para_guion
            </h4>
            {alPasarAlPaso3Guion ? (
              <button
                type="button"
                onClick={alPasarAlPaso3Guion}
                className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
              >
                🎬 Pasar al Paso 3 (Generar Guion) →
              </button>
            ) : (
              <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-[11px] font-bold">
                Listo para Paso 3
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-emerald-900">
            {analisis.resumenDireccionCreativa}
          </p>

          {analisis.respuestasUsuario &&
            Object.keys(analisis.respuestasUsuario).length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {Object.entries(analisis.respuestasUsuario).map(
                  ([clave, respuesta]) => (
                    <div
                      key={clave}
                      className="rounded-xl bg-white/90 border border-emerald-200/80 px-3 py-2 text-xs text-slate-700"
                    >
                      <span className="font-bold text-emerald-900">
                        Decisión ({clave}):{" "}
                      </span>
                      {respuesta}
                    </div>
                  )
                )}
              </div>
            )}
        </div>
      )}
    </div>
  );
}
