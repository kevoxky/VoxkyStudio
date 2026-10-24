// Panel interactivo del Agente Productor Ejecutivo en la Sala de Estudio: muestra categoría, visión/audio y preguntas elásticas.
// Se conecta con tipos_productor_ejecutivo.ts, /api/agentes/confirmar-clarificacion y actualiza Firestore desde VistaEstudioInicial.tsx.

"use client";

import React, { useState } from "react";
import {
  type AnalisisProductorEjecutivo,
  CATALOGO_CATEGORIAS_PRODUCCION,
} from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";

interface PropiedadesPanelClarificacion {
  proyectoId: string;
  estadoActual: string;
  analisis: AnalisisProductorEjecutivo;
  alConfirmarClarificacion: (
    analisisActualizado: AnalisisProductorEjecutivo,
    nuevoEstado: string
  ) => Promise<void>;
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
}: PropiedadesPanelClarificacion) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>(
    analisis.respuestasUsuario ?? {}
  );
  const [enviandoDecisiones, setEnviandoDecisiones] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

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

      {/* 2. Resumen del Análisis Multimodal (Visión de fotos y Transcripción Whisper de audio/video) */}
      {(analisis.fichaIdentidadVisual ||
        analisis.transcripcionesAudioVideo.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {analisis.fichaIdentidadVisual && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-800">
                👁️ Ficha de Identidad Visual (Ojos del Agente)
              </p>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {analisis.fichaIdentidadVisual.resumenVisual}
              </p>
            </div>
          )}

          {analisis.transcripcionesAudioVideo.map((transcripcion) => (
            <div
              key={transcripcion.urlArchivo}
              className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-violet-800">
                  🎧 Audio / Letra Transcrita (Whisper)
                </p>
                <span className="rounded-full bg-white border border-violet-200 px-2.5 py-0.5 text-[10px] font-bold text-violet-800">
                  {transcripcion.nombreArchivo}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed line-clamp-4">
                {transcripcion.textoCompleto}
              </p>
              {transcripcion.segmentosConTiempo.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {transcripcion.segmentosConTiempo
                    .slice(0, 4)
                    .map((seg, idx) => (
                      <span
                        key={idx}
                        className="rounded-lg bg-white border border-violet-100 px-2 py-0.5 text-[10px] text-slate-600"
                      >
                        [{seg.inicioSeg.toFixed(1)}s - {seg.finSeg.toFixed(1)}s]{" "}
                        {seg.texto}
                      </span>
                    ))}
                </div>
              )}
            </div>
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
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm sm:text-base font-bold text-emerald-950">
              ✅ Dirección Creativa Completa · Estado: listo_para_guion
            </h4>
            <span className="rounded-full bg-emerald-600 text-white px-3 py-1 text-[11px] font-bold">
              Listo para Paso 3
            </span>
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
