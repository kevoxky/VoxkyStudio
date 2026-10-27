// Pantalla de la Etapa 4: Storyboard Visual con visor/editor de Prompt por escena, cambio de Modelo, eliminación y regeneración.
// Se conecta con tipos_director_arte.ts, tipos_guion.ts, constantes_mesa_entrada.ts y VistaEstudioInicial.tsx.

"use client";

import React, { useState } from "react";
import { type Lamina360Identidad } from "@/agentes/director_arte/tipos_director_arte";
import { type GuionProduccionCompleto } from "@/agentes/guionista/tipos_guion";
import { MODELOS_IMAGEN_FAL } from "@/mesa_entrada/constantes_mesa_entrada";

export interface OpcionesRegenerarEscena {
  escenaIdIndividual?: string;
  promptPersonalizado?: string;
  modeloImagenOverride?: string;
}

interface PropiedadesPantallaStoryboardPaso4 {
  proyectoId: string;
  laminas360: Lamina360Identidad[];
  guion: GuionProduccionCompleto;
  modeloImagenActualId?: string;
  modeloImagenNombre: string;
  formato: string;
  alGenerarImagenesEscenas: (opciones?: OpcionesRegenerarEscena) => Promise<void>;
  alEliminarImagenEscena?: (idEscena: string) => Promise<void>;
  alAvanzarASiguientePaso: () => void;
  alVolverAPasoAnterior: () => void;
}

/**
 * Pantalla autónoma para la Fase 4 del Wizard: tira de láminas de identidad, generación de imágenes por escena, edición de prompt, eliminación y cambio de modelo.
 */
export function PantallaStoryboardPaso4({
  laminas360,
  guion,
  modeloImagenActualId = "google/nano-banana-2.1",
  modeloImagenNombre,
  formato,
  alGenerarImagenesEscenas,
  alEliminarImagenEscena,
  alAvanzarASiguientePaso,
  alVolverAPasoAnterior,
}: PropiedadesPantallaStoryboardPaso4) {
  const [generandoEscenas, setGenerandoEscenas] = useState<boolean>(false);
  const [escenaRegenerandoId, setEscenaRegenerandoId] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [imagenModalUrl, setImagenModalUrl] = useState<string | null>(null);

  // Estado local para Ver / Editar Prompt y Modelo por toma
  const [promptsAbiertos, setPromptsAbiertos] = useState<Record<string, boolean>>({});
  const [promptsEditados, setPromptsEditados] = useState<Record<string, string>>({});
  const [modelosPorEscena, setModelosPorEscena] = useState<Record<string, string>>({});

  const totalEscenas = guion.escenas.length;
  const escenasConImagen = guion.escenas.filter(
    (e) => e.imagenAnclaUrl && e.estadoImagen === "lista"
  ).length;
  const todasListas = totalEscenas > 0 && escenasConImagen === totalEscenas;

  async function ejecutarGenerarImagenes(opciones?: OpcionesRegenerarEscena) {
    setMensajeError(null);
    if (opciones?.escenaIdIndividual) {
      setEscenaRegenerandoId(opciones.escenaIdIndividual);
    } else {
      setGenerandoEscenas(true);
    }

    try {
      await alGenerarImagenesEscenas(opciones);
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "Error al generar imágenes de las escenas."
      );
    } finally {
      setGenerandoEscenas(false);
      setEscenaRegenerandoId(null);
    }
  }

  async function manejarEliminarImagen(idEscena: string) {
    if (!alEliminarImagenEscena) return;
    setMensajeError(null);
    setEscenaRegenerandoId(idEscena);
    try {
      await alEliminarImagenEscena(idEscena);
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la imagen de la escena."
      );
    } finally {
      setEscenaRegenerandoId(null);
    }
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {mensajeError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700 flex items-center justify-between">
          <span>⚠️ {mensajeError}</span>
          <button
            type="button"
            onClick={() => setMensajeError(null)}
            className="text-red-900 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tira compacta horizontal de Láminas 360° activas */}
      {laminas360.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              🧬 Láminas de Consistencia Activas ({laminas360.length})
            </span>
            <span className="text-[10px] text-slate-500">
              Se inyectan en cada escena para mantener idénticos rostros y vestimenta
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {laminas360
              .filter((l) => Boolean(l.urlLamina360))
              .map((lamina) => (
                <div
                  key={lamina.id}
                  onClick={() => setImagenModalUrl(lamina.urlLamina360)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs hover:border-indigo-400 transition-colors shrink-0 cursor-pointer"
                >
                  <img
                    src={lamina.urlLamina360}
                    alt={lamina.nombreReferencia}
                    className="h-9 w-9 rounded-lg object-cover bg-neutral-600"
                  />
                  <div className="text-left pr-2">
                    <p className="text-[11px] font-bold text-slate-800 max-w-28 truncate">
                      {lamina.nombreReferencia}
                    </p>
                    <span className="text-[9px] font-mono font-semibold text-amber-800">
                      👕 {lamina.idVestuario || "vestuario_base"}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Cabecera del Storyboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-sky-50 via-white to-indigo-50 p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Paso 4 de 5 · Storyboard Cinematográfico
            </span>
            <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-900">
              {escenasConImagen} de {totalEscenas} tomas listas
            </span>
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-1">
            🖼️ Imágenes Ancla por Escena ({formato})
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            En cada toma puedes pulsar <strong>&ldquo;📝 Prompt&rdquo;</strong> para ver o editar el prompt enviado, elegir otro modelo, eliminar la imagen o regenerarla.
          </p>
        </div>

        <button
          type="button"
          disabled={generandoEscenas || Boolean(escenaRegenerandoId)}
          onClick={() => ejecutarGenerarImagenes()}
          className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2.5 text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
        >
          {generandoEscenas
            ? "⏳ Generando escenas en paralelo..."
            : todasListas
            ? "🔄 Regenerar Todas las Escenas"
            : "🎨 Generar Imágenes del Storyboard"}
        </button>
      </div>

      {/* Grilla de escenas del Storyboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {guion.escenas.map((escena) => {
          const tieneImagen = Boolean(
            escena.imagenAnclaUrl && escena.estadoImagen === "lista"
          );
          const estaRegenerandoEsta = escenaRegenerandoId === escena.idEscena;
          const promptAbierto = Boolean(promptsAbiertos[escena.idEscena]);
          const valorPrompt =
            promptsEditados[escena.idEscena] !== undefined
              ? promptsEditados[escena.idEscena]
              : escena.promptImagenAncla || "";
          const modeloEscena =
            modelosPorEscena[escena.idEscena] || modeloImagenActualId;

          return (
            <div
              key={escena.idEscena}
              className={`rounded-2xl border bg-white p-3.5 shadow-sm space-y-3 flex flex-col justify-between transition-all ${
                tieneImagen
                  ? "border-slate-200 hover:border-indigo-300"
                  : "border-amber-200 bg-amber-50/30"
              }`}
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-xs font-bold text-indigo-950">
                      Toma #{escena.numero}
                    </span>
                    <span
                      title={
                        escena.descripcionVestuarioEscena ||
                        "Vestuario consistente de esta escena"
                      }
                      className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-900"
                    >
                      👕 {escena.idVestuarioAsignado || "vestuario_base"}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-600">
                    {escena.tiempoInicioSeg.toFixed(1)}s -{" "}
                    {escena.tiempoFinSeg.toFixed(1)}s (
                    {escena.duracionSegundos.toFixed(1)}s)
                  </span>
                </div>

                {/* Contenedor de la imagen */}
                <div
                  className={`relative w-full rounded-xl overflow-hidden bg-slate-900 shadow-inner flex items-center justify-center ${
                    formato === "9:16"
                      ? "aspect-[9/16]"
                      : formato === "1:1"
                      ? "aspect-square"
                      : "aspect-video"
                  }`}
                >
                  {tieneImagen && escena.imagenAnclaUrl ? (
                    <>
                      <img
                        src={escena.imagenAnclaUrl}
                        alt={`Escena #${escena.numero}`}
                        className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() =>
                          setImagenModalUrl(escena.imagenAnclaUrl || null)
                        }
                      />
                      <div className="absolute bottom-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                        {escena.titulo || `Toma #${escena.numero}`}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 text-center space-y-2 text-slate-300">
                      {estaRegenerandoEsta || generandoEscenas ? (
                        <>
                          <div className="mx-auto h-7 w-7 rounded-full border-2 border-indigo-400 border-t-white animate-spin" />
                          <p className="text-xs font-semibold">
                            Generando imagen...
                          </p>
                        </>
                      ) : escena.estadoImagen === "error" ? (
                        <>
                          <span className="text-xl">⚠️</span>
                          <p className="text-[11px] font-semibold text-red-300">
                            {escena.errorImagen || "Error al generar esta toma"}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl">🎬</span>
                          <p className="text-xs font-medium text-slate-400">
                            Pendiente de generar
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">
                  <strong className="text-indigo-950">Acción: </strong>
                  {escena.descripcionVisual}
                </p>

                {/* Cajón desplegable para Ver / Editar el Prompt de la toma y elegir Modelo */}
                {promptAbierto && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                        📝 Prompt de la Toma #{escena.numero} (Editable):
                      </label>
                      {promptsEditados[escena.idEscena] !== undefined && (
                        <button
                          type="button"
                          onClick={() => {
                            const copia = { ...promptsEditados };
                            delete copia[escena.idEscena];
                            setPromptsEditados(copia);
                          }}
                          className="text-[10px] text-indigo-700 underline cursor-pointer"
                        >
                          Restaurar
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={4}
                      value={valorPrompt}
                      onChange={(e) =>
                        setPromptsEditados({
                          ...promptsEditados,
                          [escena.idEscena]: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-indigo-200 bg-white p-2 text-[11px] text-slate-800 font-mono leading-relaxed focus:border-indigo-500 focus:outline-none"
                    />

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                        🤖 Modelo para esta toma:
                      </label>
                      <select
                        value={modeloEscena}
                        onChange={(e) =>
                          setModelosPorEscena({
                            ...modelosPorEscena,
                            [escena.idEscena]: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none cursor-pointer"
                      >
                        {MODELOS_IMAGEN_FAL.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre} ({m.costoRealUSD})
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      disabled={generandoEscenas || Boolean(escenaRegenerandoId)}
                      onClick={() =>
                        ejecutarGenerarImagenes({
                          escenaIdIndividual: escena.idEscena,
                          promptPersonalizado: valorPrompt,
                          modeloImagenOverride: modeloEscena,
                        })
                      }
                      className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 text-[11px] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {estaRegenerandoEsta
                        ? "⏳ Regenerando..."
                        : "✨ Regenerar Toma con este Prompt y Modelo"}
                    </button>
                  </div>
                )}
              </div>

              {/* Barra inferior de botones de la toma */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setPromptsAbiertos({
                        ...promptsAbiertos,
                        [escena.idEscena]: !promptAbierto,
                      })
                    }
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      promptAbierto
                        ? "border-indigo-300 bg-indigo-100 text-indigo-950"
                        : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    📝 {promptAbierto ? "Ocultar Prompt" : "Prompt"}
                  </button>

                  {tieneImagen && alEliminarImagenEscena && (
                    <button
                      type="button"
                      disabled={generandoEscenas || Boolean(escenaRegenerandoId)}
                      onClick={() => manejarEliminarImagen(escena.idEscena)}
                      title="Eliminar la imagen actual de esta toma"
                      className="rounded-full border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 cursor-pointer disabled:opacity-50"
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={generandoEscenas || Boolean(escenaRegenerandoId)}
                  onClick={() =>
                    ejecutarGenerarImagenes({
                      escenaIdIndividual: escena.idEscena,
                      promptPersonalizado:
                        promptsEditados[escena.idEscena] !== undefined
                          ? promptsEditados[escena.idEscena]
                          : undefined,
                      modeloImagenOverride: modeloEscena,
                    })
                  }
                  className="rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-900 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {estaRegenerandoEsta ? "⏳..." : "🔄 Regenerar"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Zoom pantalla completa */}
      {imagenModalUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setImagenModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setImagenModalUrl(null)}
              className="absolute top-4 right-4 z-10 rounded-full h-8 w-8 bg-black/70 hover:bg-black text-white font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
            <img
              src={imagenModalUrl}
              alt="Imagen de escena ampliada"
              className="max-h-[85vh] w-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Barra de acción inferior Sticky */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-lg">
        <button
          type="button"
          onClick={alVolverAPasoAnterior}
          className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 text-xs sm:text-sm cursor-pointer"
        >
          ← Paso Anterior (Láminas 360°)
        </button>

        <button
          type="button"
          onClick={alAvanzarASiguientePaso}
          className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
        >
          {todasListas
            ? "✅ Aprobar Storyboard y Pasar a Producción de Video (Paso 5) →"
            : "Continuar a Producción de Video (Paso 5) →"}
        </button>
      </div>
    </div>
  );
}
