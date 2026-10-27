// Interfaz del Paso 3: Línea de Tiempo horizontal con ancho proporcional a duracionSegundos y tarjetas editables del Storyboard.
// Se conecta con tipos_guion.ts y actualiza Firestore desde VistaEstudioInicial.tsx al aprobar hacia "listo_para_imagenes".

"use client";

import React, { useState } from "react";
import {
  ESTADO_LISTO_PARA_IMAGENES,
  type IdEstiloVisual,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { SelectorEstiloVisual } from "@/mesa_entrada/SelectorEstiloVisual";
import {
  type EscenaGuion,
  type GuionProduccionCompleto,
} from "@/agentes/guionista/tipos_guion";

interface PropiedadesPanelGuionTimeline {
  estadoActual: string;
  guion: GuionProduccionCompleto;
  generandoGuion: boolean;
  estiloVisualSeleccionado?: string;
  alCambiarEstiloVisual?: (nuevoEstilo: IdEstiloVisual) => Promise<void>;
  alGuardarYAprobarGuion: (
    guionActualizado: GuionProduccionCompleto,
    nuevoEstado: string
  ) => Promise<void>;
  alSolicitarRegenerarGuion: () => Promise<void>;
}

/**
 * Formatea una cantidad de segundos en reloj MM:SS (ej. 125 -> "2:05").
 * Recibe los segundos numéricos y devuelve el texto legible para el Timeline.
 */
function formatearRelojMinutosSegundos(segundos: number): string {
  const totalEntero = Math.max(0, Math.round(segundos));
  const minutos = Math.floor(totalEntero / 60);
  const segRestantes = totalEntero % 60;
  return `${minutos}:${segRestantes.toString().padStart(2, "0")}`;
}

/**
 * Recalcula en cadena los tiempos de inicio y fin (tiempoInicioSeg y tiempoFinSeg) cuando el usuario ajusta la duración de una escena.
 * Recibe el listado de escenas y devuelve la lista continua desde 0.0s sin huecos.
 */
function recalcularTiemposConsecutivos(escenas: EscenaGuion[]): EscenaGuion[] {
  let cursor = 0;
  return escenas.map((esc) => {
    const duracion = Math.max(
      1,
      Math.round((Number(esc.duracionSegundos) || 4) * 10) / 10
    );
    const inicio = Math.round(cursor * 10) / 10;
    const fin = Math.round((inicio + duracion) * 10) / 10;
    cursor = fin;

    return {
      ...esc,
      tiempoInicioSeg: inicio,
      tiempoFinSeg: fin,
      duracionSegundos: duracion,
    };
  });
}

/**
 * Muestra el Timeline proporcional por escena, las tarjetas editables de Storyboard y el botón de aprobación para el Paso 4.
 * Recibe el guion generado y las funciones de actualización en Firestore.
 */
export function PanelGuionTimeline({
  estadoActual,
  guion,
  generandoGuion,
  estiloVisualSeleccionado = "original_referencia",
  alCambiarEstiloVisual,
  alGuardarYAprobarGuion,
  alSolicitarRegenerarGuion,
}: PropiedadesPanelGuionTimeline) {
  const [escenasEditables, setEscenasEditables] = useState<EscenaGuion[]>(
    guion.escenas
  );
  const [idEscenaSeleccionada, setIdEscenaSeleccionada] = useState<string>(
    guion.escenas[0]?.idEscena ?? "escena_1"
  );
  const [guardandoCambios, setGuardandoCambios] = useState<boolean>(false);
  const [mensajeGuardado, setMensajeGuardado] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const duracionTotalCalculada =
    escenasEditables.length > 0
      ? escenasEditables[escenasEditables.length - 1].tiempoFinSeg
      : guion.duracionTotalSegundos;

  /**
   * Actualiza un campo de texto o LipSync de una escena específica.
   * Recibe el ID de la escena y los cambios a aplicar.
   */
  function actualizarCampoEscena(
    idEscena: string,
    cambios: Partial<EscenaGuion>
  ) {
    setEscenasEditables((previas) =>
      previas.map((esc) =>
        esc.idEscena === idEscena ? { ...esc, ...cambios } : esc
      )
    );
    setMensajeGuardado(null);
  }

  /**
   * Ajusta la duración en segundos de una escena y recalcula automáticamente los tiempos consecutivos del resto del Timeline.
   * Recibe el ID de la escena y la nueva duración numérica elegida por el usuario.
   */
  function cambiarDuracionDeEscena(idEscena: string, nuevaDuracion: number) {
    if (!Number.isFinite(nuevaDuracion) || nuevaDuracion <= 0) return;

    setEscenasEditables((previas) => {
      const actualizadas = previas.map((esc) =>
        esc.idEscena === idEscena
          ? {
              ...esc,
              duracionSegundos: nuevaDuracion,
              justificacionDuracion: `Duración ajustada manualmente por el usuario a ${nuevaDuracion.toFixed(1)}s.`,
            }
          : esc
      );
      return recalcularTiemposConsecutivos(actualizadas);
    });
    setMensajeGuardado(null);
  }

  /**
   * Desplaza suavemente la pantalla hasta la tarjeta de la escena al hacer clic en su bloque dentro del Timeline.
   * Recibe el ID de la escena seleccionada.
   */
  function irAEscenaDesdeTimeline(idEscena: string) {
    setIdEscenaSeleccionada(idEscena);
    if (typeof document !== "undefined") {
      document
        .getElementById(idEscena)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /**
   * Guarda las ediciones hechas en las tarjetas o aprueba el Timeline pasando al estado "listo_para_imagenes".
   * Recibe un booleano indicando si se aprueba definitivamente hacia el Paso 4.
   */
  async function confirmarOGuardarGuion(aprobarParaPaso4: boolean) {
    setMensajeError(null);
    setMensajeGuardado(null);
    setGuardandoCambios(true);

    try {
      const guionActualizado: GuionProduccionCompleto = {
        ...guion,
        duracionTotalSegundos: duracionTotalCalculada,
        escenas: escenasEditables,
      };
      const siguienteEstado = aprobarParaPaso4
        ? ESTADO_LISTO_PARA_IMAGENES || "listo_para_imagenes"
        : estadoActual || "esperando_aprobacion_guion";

      await alGuardarYAprobarGuion(guionActualizado, siguienteEstado);

      if (!aprobarParaPaso4) {
        setMensajeGuardado("Cambios del Timeline guardados en Firestore.");
      }
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el Timeline de escenas."
      );
    } finally {
      setGuardandoCambios(false);
    }
  }

  return (
    <div className="space-y-6 border-t border-slate-200 pt-6">
      {/* Encabezado del Guion y modo de duración (Orden del usuario vs. Autonomía del Director) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 sm:p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Paso 3 · Agente Guionista y Planificador de Tomas
            </span>
            <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-900">
              {guion.modoDuracion === "fijo_usuario"
                ? `Ritmo fijado por usuario (máx. ${guion.duracionMaximaPorTomaSeg}s)`
                : "Duración autónoma por toma (Criterio del Director)"}
            </span>
          </div>
          <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-1">
            🎬 {guion.tituloProduccion}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            {guion.resumenNarrativo}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {alCambiarEstiloVisual && (
            <div className="flex items-center gap-1.5 bg-white border border-indigo-200 rounded-full px-2 py-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-indigo-900 pl-1">Estilo:</span>
              <SelectorEstiloVisual
                estiloSeleccionado={estiloVisualSeleccionado}
                alCambiarEstilo={(nuevo) => alCambiarEstiloVisual(nuevo)}
                deshabilitado={generandoGuion || guardandoCambios}
                tamanoCompacto={true}
              />
            </div>
          )}

          <span className="rounded-full bg-white border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-900">
            {escenasEditables.length} tomas · 0:00 a{" "}
            {formatearRelojMinutosSegundos(duracionTotalCalculada)} (
            {duracionTotalCalculada.toFixed(1)}s)
          </span>

          <button
            type="button"
            disabled={generandoGuion || guardandoCambios}
            onClick={alSolicitarRegenerarGuion}
            className="rounded-full border border-slate-300 bg-white hover:bg-slate-100 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
          >
            {generandoGuion ? "⏳ Regenerando..." : "🔄 Regenerar Guion"}
          </button>
        </div>
      </div>

      {/* ARMARIO DE VESTUARIO CONTEXTUAL POR ESCENARIO */}
      {guion.armarioVestuarios && guion.armarioVestuarios.length > 0 && (
        <details className="group rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <summary className="flex flex-wrap items-center justify-between gap-2 cursor-pointer list-none text-xs sm:text-sm font-bold text-amber-950">
            <span>
              👗 Armario de Vestuario Contextual por Lugar ({guion.armarioVestuarios.length} atuendo(s) consistente(s))
            </span>
            <span className="rounded-full bg-white border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
              Ver catálogo de ropa ▾
            </span>
          </summary>
          <div className="mt-3 pt-3 border-t border-amber-200/70 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {guion.armarioVestuarios.map((prenda) => (
              <div
                key={prenda.idVestuario}
                className="rounded-xl bg-white border border-amber-200 p-3 space-y-1 shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-950">
                    👕 {prenda.idVestuario}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    📍 {prenda.escenarioOLugar}
                  </span>
                </div>
                <p className="text-xs text-slate-700">
                  {prenda.descripcionVestuario}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* 1. BARRA DE LÍNEA DE TIEMPO (TIMELINE) VISUAL HORIZONTAL CON ANCHO PROPORCIONAL */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white space-y-3 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300">
          <span>
            ⏱️ Línea de Tiempo Proporcional (Ancho según duración de cada toma ·
            Haz clic para ir a la escena)
          </span>
          <span className="font-mono text-indigo-300">
            0:00 (0.0s) →{" "}
            {formatearRelojMinutosSegundos(duracionTotalCalculada)} (
            {duracionTotalCalculada.toFixed(1)}s)
          </span>
        </div>

        <div className="flex items-stretch gap-1.5 overflow-x-auto pb-2 pt-1">
          {escenasEditables.map((escena) => {
            const estaActiva = idEscenaSeleccionada === escena.idEscena;
            // El ancho de cada bloque es proporcional a su duracionSegundos (mínimo 96px para lectura cómoda)
            const anchoProporcionalPx = Math.max(
              96,
              Math.round(escena.duracionSegundos * 22)
            );

            return (
              <button
                key={escena.idEscena}
                type="button"
                style={{
                  width: `${anchoProporcionalPx}px`,
                  flexGrow: escena.duracionSegundos,
                }}
                onClick={() => irAEscenaDesdeTimeline(escena.idEscena)}
                title={`Escena #${escena.numero} (${escena.duracionSegundos.toFixed(1)}s) [${escena.tiempoInicioSeg.toFixed(1)}s - ${escena.tiempoFinSeg.toFixed(1)}s]: ${escena.letraODialogo}`}
                className={`group flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all cursor-pointer shrink-0 ${
                  estaActiva
                    ? "border-indigo-400 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                    : "border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="text-[11px] font-bold">
                    #{escena.numero}
                  </span>
                  <span className="text-[10px] font-mono opacity-85">
                    {escena.tiempoInicioSeg.toFixed(1)}s-
                    {escena.tiempoFinSeg.toFixed(1)}s
                  </span>
                </div>

                <p className="text-[10px] line-clamp-2 mt-1 leading-tight opacity-90">
                  {escena.letraODialogo}
                </p>

                <div className="flex items-center justify-between gap-1 mt-1.5 pt-1 border-t border-white/10">
                  <span className="rounded bg-black/30 px-1.5 py-0.5 text-[9px] font-mono font-bold">
                    ⏱️ {escena.duracionSegundos.toFixed(1)}s
                  </span>
                  {escena.requiereLipSync && (
                    <span className="rounded bg-pink-500/30 border border-pink-400/50 px-1 text-[9px] font-bold text-pink-200">
                      🎤 LipSync
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TARJETAS DE ESCENA EDITABLES ABAJO */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm sm:text-base font-bold text-slate-900">
            📋 Tarjetas de Escenas del Storyboard ({escenasEditables.length}{" "}
            tomas editables)
          </h4>
          <button
            type="button"
            disabled={guardandoCambios}
            onClick={() => confirmarOGuardarGuion(false)}
            className="rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 text-xs font-bold text-indigo-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            💾 Guardar cambios del guion
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {escenasEditables.map((escena) => {
            const seleccionada = idEscenaSeleccionada === escena.idEscena;
            return (
              <div
                id={escena.idEscena}
                key={escena.idEscena}
                onClick={() => setIdEscenaSeleccionada(escena.idEscena)}
                className={`rounded-2xl border p-4 sm:p-5 transition-all space-y-3 ${
                  seleccionada
                    ? "border-indigo-500 bg-indigo-50/20 ring-2 ring-indigo-500/15"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                {/* Fila superior: Toma #, Rango de segundos, Editor de Duración y LipSync */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-indigo-600 text-white px-3 py-1 text-xs font-bold">
                      Toma #{escena.numero}
                    </span>
                    <span className="rounded-xl border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-800">
                      [{escena.tiempoInicioSeg.toFixed(1)}s -{" "}
                      {escena.tiempoFinSeg.toFixed(1)}s]
                    </span>

                    <label className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 text-xs font-semibold text-indigo-900">
                      <span>Duración:</span>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        step={0.5}
                        value={escena.duracionSegundos}
                        onChange={(e) =>
                          cambiarDuracionDeEscena(
                            escena.idEscena,
                            Number(e.target.value)
                          )
                        }
                        className="w-14 rounded bg-white border border-indigo-200 px-1.5 py-0.5 text-center font-mono font-bold text-indigo-950 focus:outline-none"
                      />
                      <span>seg</span>
                    </label>

                    <input
                      type="text"
                      value={escena.titulo}
                      onChange={(e) =>
                        actualizarCampoEscena(escena.idEscena, {
                          titulo: e.target.value,
                        })
                      }
                      className="rounded-lg border border-transparent hover:border-slate-200 focus:border-indigo-500 bg-transparent px-2 py-0.5 text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      actualizarCampoEscena(escena.idEscena, {
                        requiereLipSync: !escena.requiereLipSync,
                      })
                    }
                    className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                      escena.requiereLipSync
                        ? "border-pink-300 bg-pink-50 text-pink-800"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {escena.requiereLipSync
                      ? "🎤 LipSync Activo"
                      : "🎬 Solo Actuación Visual"}
                  </button>
                </div>

                {/* Justificación de la duración elegida por el Director */}
                <p className="text-[11px] text-indigo-800 bg-indigo-50/60 border border-indigo-100 rounded-lg px-3 py-1.5">
                  <strong>⏱️ Criterio de duración:</strong>{" "}
                  {escena.justificacionDuracion}
                </p>

                {/* Frase de la canción o voz que suena en esta toma */}
                <div className="rounded-xl border border-violet-200 bg-violet-50/70 px-3.5 py-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-violet-900 shrink-0">
                    🎵 Letra / Audio en esta toma:
                  </span>
                  <input
                    type="text"
                    value={escena.letraODialogo}
                    onChange={(e) =>
                      actualizarCampoEscena(escena.idEscena, {
                        letraODialogo: e.target.value,
                      })
                    }
                    className="flex-1 min-w-52 bg-white/80 rounded-lg border border-violet-200 px-2.5 py-1 text-xs sm:text-sm font-semibold text-violet-950 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Descripción visual en español (editable por el usuario) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700">
                    🎥 Descripción visual de la escena (Editable):
                  </label>
                  <textarea
                    rows={2}
                    value={escena.descripcionVisual}
                    onChange={(e) =>
                      actualizarCampoEscena(escena.idEscena, {
                        descripcionVisual: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white p-2.5 text-xs sm:text-sm text-slate-800 focus:border-indigo-500 focus:outline-none resize-y"
                  />
                </div>

                {/* Referencias que entran en esta toma y prompts técnicos */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Referencias usadas:
                    </span>
                    {escena.archivosReferenciaUsados.map((refNombre, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-900"
                      >
                        👤 {refNombre}
                      </span>
                    ))}
                    <span
                      title={escena.descripcionVestuarioEscena || "Vestuario consistente asignado a este escenario"}
                      className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-mono font-bold text-amber-900"
                    >
                      👕 {escena.idVestuarioAsignado || "vestuario_base"}
                    </span>
                  </div>

                  <details className="text-xs text-slate-600">
                    <summary className="cursor-pointer font-semibold text-indigo-700 hover:underline">
                      Prompts Técnicos IA (Imagen Ancla + Video) ▾
                    </summary>
                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">
                          Prompt Imagen Ancla (Paso 4):
                        </p>
                        <textarea
                          rows={2}
                          value={escena.promptImagenAncla}
                          onChange={(e) =>
                            actualizarCampoEscena(escena.idEscena, {
                              promptImagenAncla: e.target.value,
                            })
                          }
                          className="w-full mt-1 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
                        />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-slate-700">
                          Prompt Animación de Video (Paso 6):
                        </p>
                        <textarea
                          rows={2}
                          value={escena.promptVideoAnimacion}
                          onChange={(e) =>
                            actualizarCampoEscena(escena.idEscena, {
                              promptVideoAnimacion: e.target.value,
                            })
                          }
                          className="w-full mt-1 rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700"
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {mensajeGuardado && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800">
          ✓ {mensajeGuardado}
        </div>
      )}

      {mensajeError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
          {mensajeError}
        </div>
      )}

      {/* 3. BOTÓN PRINCIPAL DE CONFIRMACIÓN PARA PASAR AL PASO 4 */}
      {estadoActual !== ESTADO_LISTO_PARA_IMAGENES ? (
        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            disabled={guardandoCambios}
            onClick={() => confirmarOGuardarGuion(true)}
            className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-60"
          >
            {guardandoCambios
              ? "Aprobando y guardando Timeline..."
              : "Aprobar Timeline y Generar Imágenes en el Estudio (Paso 4) →"}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm sm:text-base font-bold text-emerald-950">
              ✅ Timeline Aprobado · Estado: listo_para_imagenes
            </h4>
            <p className="text-xs sm:text-sm text-emerald-900 mt-0.5">
              Las {escenasEditables.length} escenas (0.0s a{" "}
              {duracionTotalCalculada.toFixed(1)}s) están aprobadas para generar
              sus imágenes base en el Paso 4.
            </p>
          </div>
          <span className="rounded-full bg-emerald-600 text-white px-3.5 py-1.5 text-xs font-bold">
            Listo para Paso 4
          </span>
        </div>
      )}
    </div>
  );
}
