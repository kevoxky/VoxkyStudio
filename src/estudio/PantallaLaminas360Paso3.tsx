// Pantalla de la Etapa 3: Láminas 360° con visor/editor de Prompt enviado, cambio de Modelo, eliminación de lámina y Armario de Vestuario.
// Se conecta con tipos_director_arte.ts, tipos_guion.ts, constantes_mesa_entrada.ts y VistaEstudioInicial.tsx.

"use client";

import React, { useState } from "react";
import { SelectorEstiloVisual } from "@/mesa_entrada/SelectorEstiloVisual";
import { type Lamina360Identidad } from "@/agentes/director_arte/tipos_director_arte";
import { type PrendaVestuarioEscenario } from "@/agentes/guionista/tipos_guion";
import {
  type IdEstiloVisual,
  MODELOS_IMAGEN_FAL,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { SeccionArmarioVestuario } from "./SeccionArmarioVestuario";

export interface OpcionesRegenerarLamina {
  nombreReferencia?: string;
  idVestuario?: string;
  promptPersonalizado?: string;
  modeloImagenOverride?: string;
}

interface PropiedadesPantallaLaminas360Paso3 {
  proyectoId: string;
  laminas360: Lamina360Identidad[];
  armarioVestuarios?: PrendaVestuarioEscenario[];
  estiloVisualSeleccionado: string;
  modeloImagenActualId?: string;
  modeloImagenNombre: string;
  alCambiarEstiloVisual: (nuevoEstilo: IdEstiloVisual) => Promise<void>;
  alGenerarLaminas360: (opciones?: OpcionesRegenerarLamina) => Promise<void>;
  alEliminarLamina360?: (idLamina: string) => Promise<void>;
  alEliminarVestuarioArmario?: (idVestuario: string) => Promise<void>;
  alAgregarVestuarioArmario?: (nuevaPrenda: {
    escenarioOLugar: string;
    descripcionVestuario: string;
  }) => Promise<void>;
  alAvanzarASiguientePaso: () => void;
  alVolverAPasoAnterior: () => void;
}

/**
 * Pantalla autónoma para la Fase 3 del Wizard: control de Estilo Visual, Armario de Vestuario y Láminas 360° con edición de prompt, borrado y cambio de modelo.
 */
export function PantallaLaminas360Paso3({
  laminas360,
  armarioVestuarios = [],
  estiloVisualSeleccionado,
  modeloImagenActualId = "google/nano-banana-2.1",
  modeloImagenNombre,
  alCambiarEstiloVisual,
  alGenerarLaminas360,
  alEliminarLamina360,
  alEliminarVestuarioArmario,
  alAgregarVestuarioArmario,
  alAvanzarASiguientePaso,
  alVolverAPasoAnterior,
}: PropiedadesPantallaLaminas360Paso3) {
  const [generandoLaminas, setGenerandoLaminas] = useState<boolean>(false);
  const [idProcesandoIndividual, setIdProcesandoIndividual] = useState<string | null>(null);
  const [laminaZoomUrl, setLaminaZoomUrl] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Estado para abrir el cajón de Prompt editable y modelo por cada tarjeta
  const [promptsAbiertos, setPromptsAbiertos] = useState<Record<string, boolean>>({});
  const [promptsEditados, setPromptsEditados] = useState<Record<string, string>>({});
  const [modelosPorTarjeta, setModelosPorTarjeta] = useState<Record<string, string>>({});

  async function ejecutarGenerarLaminas(
    opciones?: OpcionesRegenerarLamina,
    idTarjeta?: string
  ) {
    setMensajeError(null);
    if (idTarjeta) {
      setIdProcesandoIndividual(idTarjeta);
    } else {
      setGenerandoLaminas(true);
    }

    try {
      await alGenerarLaminas360(opciones);
    } catch (error) {
      setMensajeError(
        error instanceof Error ? error.message : "Error al generar láminas 360°."
      );
    } finally {
      setGenerandoLaminas(false);
      setIdProcesandoIndividual(null);
    }
  }

  async function manejarEliminarLamina(idLamina: string) {
    if (!alEliminarLamina360) return;
    setMensajeError(null);
    setIdProcesandoIndividual(idLamina);
    try {
      await alEliminarLamina360(idLamina);
    } catch (error) {
      setMensajeError(
        error instanceof Error ? error.message : "No se pudo eliminar la lámina."
      );
    } finally {
      setIdProcesandoIndividual(null);
    }
  }

  async function manejarQuitarVestuario(idVestuario: string) {
    if (!alEliminarVestuarioArmario) return;
    setMensajeError(null);
    setGenerandoLaminas(true);
    try {
      await alEliminarVestuarioArmario(idVestuario);
    } catch (error) {
      setMensajeError(
        error instanceof Error ? error.message : "No se pudo quitar el vestuario."
      );
    } finally {
      setGenerandoLaminas(false);
    }
  }

  const hayLaminasGeneradas = laminas360.some((l) => l.estado === "lista");
  const cantidadReutilizadas = laminas360.filter(
    (l) => l.reutilizadaDeBiblioteca
  ).length;

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

      {/* Cabecera de la etapa */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 via-white to-indigo-50 p-4 sm:p-5 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
              Paso 3 de 5 · Dirección de Arte, Identidad y Vestuario
            </span>
            <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold text-purple-900">
              Motor activo: {modeloImagenNombre}
            </span>
            {cantidadReutilizadas > 0 && (
              <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
                ✨ {cantidadReutilizadas} reutilizada(s) de Biblioteca
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-xl font-bold text-slate-900 mt-1">
            🎭 Láminas de Identidad 360° y Armario de Vestuario
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
            En cada tarjeta puedes abrir <strong>&ldquo;📝 Ver / Editar Prompt&rdquo;</strong>, elegir otro modelo, <strong>eliminar</strong> la imagen si no te gusta o <strong>regenerarla</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-2xs">
            <span className="text-[11px] font-semibold text-slate-600 pl-1">
              Estilo Visual:
            </span>
            <SelectorEstiloVisual
              estiloSeleccionado={estiloVisualSeleccionado}
              alCambiarEstilo={(nuevo) => alCambiarEstiloVisual(nuevo)}
              deshabilitado={generandoLaminas}
              tamanoCompacto={true}
            />
          </div>

          <button
            type="button"
            disabled={generandoLaminas || Boolean(idProcesandoIndividual)}
            onClick={() => ejecutarGenerarLaminas()}
            className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {generandoLaminas
              ? "⏳ Generando / Cargando Láminas 360°..."
              : "🎨 Generar / Actualizar Láminas 360°"}
          </button>
        </div>
      </div>

      {/* Resumen interactivo del Armario de Vestuario */}
      {armarioVestuarios.length > 0 && (
        <SeccionArmarioVestuario
          armarioVestuarios={armarioVestuarios}
          deshabilitado={generandoLaminas || Boolean(idProcesandoIndividual)}
          alGenerarVestuario={(idVest) =>
            ejecutarGenerarLaminas({ idVestuario: idVest })
          }
          alEliminarVestuario={
            alEliminarVestuarioArmario ? manejarQuitarVestuario : undefined
          }
          alAgregarVestuarioPersonalizado={alAgregarVestuarioArmario}
        />
      )}

      {/* Grilla visual de láminas 360° */}
      {laminas360.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center space-y-3">
          <span className="text-3xl">🧬</span>
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            Aún no hay Láminas de Identidad 360° activas
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Pulsa el botón para generar las hojas de giro 360° de tus personajes o productos con el modelo seleccionado ({modeloImagenNombre}).
          </p>
          <button
            type="button"
            disabled={generandoLaminas}
            onClick={() => ejecutarGenerarLaminas()}
            className="rounded-full bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {generandoLaminas
              ? "⏳ Creando Láminas..."
              : "✨ Comenzar Generación 360° Ahora"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {laminas360.map((lamina) => {
            const promptAbierto = Boolean(promptsAbiertos[lamina.id]);
            const valorPrompt =
              promptsEditados[lamina.id] !== undefined
                ? promptsEditados[lamina.id]
                : lamina.promptUsado || "";
            const modeloTarjeta =
              modelosPorTarjeta[lamina.id] ||
              lamina.modeloGenerador ||
              modeloImagenActualId;
            const procesandoEsta = idProcesandoIndividual === lamina.id;
            const tieneImagenValida =
              lamina.estado === "lista" &&
              Boolean(lamina.urlLamina360) &&
              lamina.urlLamina360 !== lamina.urlReferenciaOriginal;

            return (
              <div
                key={lamina.id}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3 flex flex-col justify-between hover:border-purple-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {lamina.tipo === "personaje" ? "👤" : "📦"}{" "}
                      {lamina.nombreReferencia}
                    </span>
                    <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-900">
                      👕 {lamina.idVestuario || "vestuario_base"}
                    </span>
                  </div>

                  {lamina.reutilizadaDeBiblioteca && lamina.estado === "lista" && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-800">
                      ✨ Reutilizada de Biblioteca (puedes eliminarla o regenerarla abajo)
                    </div>
                  )}

                  {/* Vista de la imagen o alerta si falló */}
                  {lamina.estado === "error" ? (
                    <div className="aspect-[3/4] w-full rounded-xl border border-red-200 bg-red-50/70 p-4 flex flex-col items-center justify-center text-center gap-2">
                      <img
                        src={lamina.urlReferenciaOriginal}
                        alt={lamina.nombreReferencia}
                        className="h-20 w-20 rounded-xl object-cover border border-red-200 opacity-75"
                      />
                      <span className="text-xs font-bold text-red-800">
                        ⚠️ No se pudo generar esta lámina
                      </span>
                      <p className="text-[11px] text-red-700">
                        {lamina.error || "Fallo de conexión temporal con el modelo."}
                      </p>
                      <span className="text-[10px] text-slate-500">
                        Abre &ldquo;📝 Prompt&rdquo; para elegir otro modelo o pulsa &ldquo;🔄 Regenerar&rdquo;.
                      </span>
                    </div>
                  ) : (
                    <div
                      className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-600 cursor-pointer group shadow-inner"
                      onClick={() => setLaminaZoomUrl(lamina.urlLamina360)}
                    >
                      <img
                        src={lamina.urlLamina360}
                        alt={`Lámina 360 de ${lamina.nombreReferencia}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {!tieneImagenValida && (
                        <span className="absolute top-2 left-2 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
                          Foto base (pulsa Regenerar para giro 360°)
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <span>🔍</span> Clic para Ampliar
                      </div>
                    </div>
                  )}

                  {lamina.descripcionVestuario && (
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      <strong>Atuendo:</strong> {lamina.descripcionVestuario}
                    </p>
                  )}

                  {/* Cajón desplegable para Ver / Editar Prompt y elegir Modelo */}
                  {promptAbierto && (
                    <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-2.5 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                          📝 Prompt enviado a la IA (Editable):
                        </label>
                        {promptsEditados[lamina.id] !== undefined && (
                          <button
                            type="button"
                            onClick={() => {
                              const copia = { ...promptsEditados };
                              delete copia[lamina.id];
                              setPromptsEditados(copia);
                            }}
                            className="text-[10px] text-indigo-700 underline cursor-pointer"
                          >
                            Restaurar original
                          </button>
                        )}
                      </div>

                      <textarea
                        rows={5}
                        value={valorPrompt}
                        onChange={(e) =>
                          setPromptsEditados({
                            ...promptsEditados,
                            [lamina.id]: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-indigo-200 bg-white p-2 text-[11px] text-slate-800 font-mono leading-relaxed focus:border-indigo-500 focus:outline-none"
                      />

                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                          🤖 Modelo para regenerar esta imagen:
                        </label>
                        <select
                          value={modeloTarjeta}
                          onChange={(e) =>
                            setModelosPorTarjeta({
                              ...modelosPorTarjeta,
                              [lamina.id]: e.target.value,
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
                        disabled={generandoLaminas || procesandoEsta}
                        onClick={() =>
                          ejecutarGenerarLaminas(
                            {
                              nombreReferencia: lamina.nombreReferencia,
                              idVestuario:
                                lamina.idVestuario || "vestuario_base",
                              promptPersonalizado: valorPrompt,
                              modeloImagenOverride: modeloTarjeta,
                            },
                            lamina.id
                          )
                        }
                        className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 text-[11px] shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {procesandoEsta
                          ? "⏳ Regenerando..."
                          : "✨ Regenerar con este Prompt y Modelo"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Barra de botones de la tarjeta: Prompt, Eliminar y Regenerar */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPromptsAbiertos({
                          ...promptsAbiertos,
                          [lamina.id]: !promptAbierto,
                        })
                      }
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                        promptAbierto
                          ? "border-indigo-300 bg-indigo-100 text-indigo-950"
                          : "border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700"
                      }`}
                    >
                      📝 {promptAbierto ? "Ocultar Prompt" : "Ver / Editar Prompt"}
                    </button>

                    {alEliminarLamina360 && (
                      <button
                        type="button"
                        disabled={generandoLaminas || procesandoEsta}
                        onClick={() => manejarEliminarLamina(lamina.id)}
                        title="Eliminar esta imagen (también la borra de la caché de Biblioteca)"
                        className="rounded-full border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 cursor-pointer disabled:opacity-50"
                      >
                        🗑️ Eliminar
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={generandoLaminas || procesandoEsta}
                    onClick={() =>
                      ejecutarGenerarLaminas(
                        {
                          nombreReferencia: lamina.nombreReferencia,
                          idVestuario: lamina.idVestuario || "vestuario_base",
                          promptPersonalizado:
                            promptsEditados[lamina.id] !== undefined
                              ? promptsEditados[lamina.id]
                              : undefined,
                          modeloImagenOverride: modeloTarjeta,
                        },
                        lamina.id
                      )
                    }
                    className="rounded-full border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-900 cursor-pointer disabled:opacity-50"
                  >
                    {procesandoEsta ? "⏳..." : "🔄 Regenerar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Zoom pantalla completa */}
      {laminaZoomUrl && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={() => setLaminaZoomUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl overflow-hidden p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLaminaZoomUrl(null)}
              className="absolute top-4 right-4 z-10 rounded-full h-8 w-8 bg-black/70 hover:bg-black text-white font-bold flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
            <img
              src={laminaZoomUrl}
              alt="Lámina 360 ampliada"
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
          ← Paso Anterior (Guion)
        </button>

        <button
          type="button"
          onClick={alAvanzarASiguientePaso}
          className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
        >
          {hayLaminasGeneradas
            ? "Aprobar Láminas 360° y Pasar al Storyboard de Escenas →"
            : "Continuar al Storyboard de Escenas →"}
        </button>
      </div>
    </div>
  );
}
