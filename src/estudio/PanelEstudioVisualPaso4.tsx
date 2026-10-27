// Panel visual del Paso 4: Galería de Láminas 360°, Timeline con imágenes en vivo y botones de regeneración individual.
// Se conecta con tipos_director_arte.ts, tipos_guion.ts, constantes_mesa_entrada.ts y VistaEstudioInicial.tsx.

"use client";

import React, { useState } from "react";
import {
  ESTADO_LISTO_PARA_PRODUCCION_AV,
  type IdEstiloVisual,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { SelectorEstiloVisual } from "@/mesa_entrada/SelectorEstiloVisual";
import { type Lamina360Identidad } from "@/agentes/director_arte/tipos_director_arte";
import { type EscenaGuion, type GuionProduccionCompleto } from "@/agentes/guionista/tipos_guion";

interface PropiedadesPanelEstudioVisualPaso4 {
  proyectoId: string;
  estadoActual: string;
  laminas360: Lamina360Identidad[];
  guion: GuionProduccionCompleto;
  modeloImagenNombre: string;
  formato: string;
  estiloVisualSeleccionado?: string;
  alCambiarEstiloVisual?: (nuevoEstilo: IdEstiloVisual) => Promise<void>;
  alGenerarLaminas360: (nombreReferencia?: string) => Promise<void>;
  alGenerarImagenesEscenas: (escenaIdIndividual?: string) => Promise<void>;
  alAprobarPasoProduccionAV: () => Promise<void>;
}

/**
 * Muestra el panel interactivo del Paso 4: Láminas de Identidad 360° arriba y escenas del Storyboard con imágenes reales abajo.
 * Recibe los datos del proyecto y callbacks de generación, y permite regenerar individualmente escenas o láminas.
 */
export function PanelEstudioVisualPaso4({
  proyectoId,
  estadoActual,
  laminas360,
  guion,
  modeloImagenNombre,
  formato,
  estiloVisualSeleccionado = "original_referencia",
  alCambiarEstiloVisual,
  alGenerarLaminas360,
  alGenerarImagenesEscenas,
  alAprobarPasoProduccionAV,
}: PropiedadesPanelEstudioVisualPaso4) {
  const [generandoLaminas, setGenerandoLaminas] = useState<boolean>(false);
  const [generandoEscenas, setGenerandoEscenas] = useState<boolean>(false);
  const [escenaRegenerandoId, setEscenaRegenerandoId] = useState<string | null>(null);
  const [laminaZoomUrl, setLaminaZoomUrl] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  const totalEscenas = guion.escenas.length;
  const escenasConImagen = guion.escenas.filter((e) => e.imagenAnclaUrl && e.estadoImagen === "lista").length;
  const todasEscenasListas = totalEscenas > 0 && escenasConImagen === totalEscenas;

  /**
   * Ejecuta la generación o regeneración de las Láminas 360° para todas las referencias o una individual.
   */
  async function manejarGenerarLaminas(nombreRef?: string) {
    setMensajeError(null);
    setGenerandoLaminas(true);
    try {
      await alGenerarLaminas360(nombreRef);
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Error al generar láminas 360°.");
    } finally {
      setGenerandoLaminas(false);
    }
  }

  /**
   * Ejecuta la generación de todas las imágenes o de una sola escena individual.
   */
  async function manejarGenerarImagenes(escenaId?: string) {
    setMensajeError(null);
    if (escenaId) {
      setEscenaRegenerandoId(escenaId);
    } else {
      setGenerandoEscenas(true);
    }

    try {
      await alGenerarImagenesEscenas(escenaId);
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Error al generar imágenes de escenas.");
    } finally {
      setEscenaRegenerandoId(null);
      setGenerandoEscenas(false);
    }
  }

  return (
    <div className="space-y-8 border-t border-slate-200 pt-6">
      {/* 1. SECCIÓN SUPERIOR: Galería de Láminas de Identidad 360° */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-sky-50 p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Paso 4A · Director de Arte
              </span>
              <span className="rounded-full bg-indigo-100 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-900">
                Láminas de Consistencia 360° (Turnaround Sheets)
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-1">
              🧬 Fichas de Identidad Visual 360° (Fondo Gris Neutro)
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Giran tus fotos en múltiples ángulos y planos de detalle para que los modelos no deformen rostros ni productos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {alCambiarEstiloVisual && (
              <div className="flex items-center gap-1.5 bg-white/90 border border-slate-200 rounded-full px-2 py-1 shadow-sm">
                <span className="text-[11px] font-semibold text-slate-600 pl-1">Estilo:</span>
                <SelectorEstiloVisual
                  estiloSeleccionado={estiloVisualSeleccionado}
                  alCambiarEstilo={(nuevo) => alCambiarEstiloVisual(nuevo)}
                  deshabilitado={generandoLaminas}
                  tamanoCompacto={true}
                />
              </div>
            )}

            <button
              type="button"
              disabled={generandoLaminas}
              onClick={() => manejarGenerarLaminas()}
              className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {generandoLaminas ? "⏳ Generando Láminas 360°..." : "🎨 Generar / Actualizar Láminas 360°"}
            </button>
          </div>
        </div>

        {laminas360.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              Aún no se han generado las Láminas de Identidad 360° para este proyecto.
            </p>
            <p className="text-xs text-slate-500 max-w-lg mx-auto">
              Haz clic en el botón superior para crear las hojas de giro de personajes y productos con fondo gris neutro.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {laminas360.map((lamina) => (
              <div
                key={lamina.id}
                className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {lamina.tipo === "personaje" ? "👤 Personaje:" : "📦 Producto:"} {lamina.nombreReferencia}
                    </span>
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] uppercase font-bold text-slate-600">
                      {lamina.tipo}
                    </span>
                  </div>

                  <div
                    className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-neutral-500 cursor-pointer group"
                    onClick={() => setLaminaZoomUrl(lamina.urlLamina360)}
                  >
                    <img
                      src={lamina.urlLamina360}
                      alt={`Lámina 360 de ${lamina.nombreReferencia}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold">
                      🔍 Clic para Pantalla Completa
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <a
                    href={lamina.urlLamina360}
                    download={`Lamina_360_${lamina.nombreReferencia}.png`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    Descargar ↓
                  </a>
                  <button
                    type="button"
                    disabled={generandoLaminas}
                    onClick={() => manejarGenerarLaminas(lamina.nombreReferencia)}
                    className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    🔄 Regenerar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. SECCIÓN INFERIOR: Timeline Visual con Imágenes Reales del Storyboard */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Paso 4B · Storyboard Visual
              </span>
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                {escenasConImagen} de {totalEscenas} imágenes listas
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-1">
              🎬 Fotogramas Iniciales por Escena (Motor: {modeloImagenNombre})
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Cada toma utiliza su prompt ancla inyectando las Láminas 360° para garantizar máxima fidelidad.
            </p>
          </div>

          <button
            type="button"
            disabled={generandoEscenas}
            onClick={() => manejarGenerarImagenes()}
            className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 text-xs sm:text-sm shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {generandoEscenas
              ? `⏳ Generando storyboard (${escenasConImagen}/${totalEscenas})...`
              : "🎨 Generar Todas las Imágenes del Storyboard"}
          </button>
        </div>

        {/* Galería de tarjetas de escenas con imagen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {guion.escenas.map((escena) => {
            const estaRegenerandoEsta = escenaRegenerandoId === escena.idEscena;

            return (
              <div
                key={escena.idEscena}
                className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
                    {escena.imagenAnclaUrl ? (
                      <img
                        src={escena.imagenAnclaUrl}
                        alt={`Escena #${escena.numero}: ${escena.titulo}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4 space-y-1.5">
                        <span className="text-2xl">🖼️</span>
                        <p className="text-xs font-semibold text-slate-400">
                          {estaRegenerandoEsta ? "Generando imagen..." : "Pendiente de generar"}
                        </p>
                      </div>
                    )}

                    <div className="absolute top-2 left-2 rounded-lg bg-black/75 px-2 py-0.5 text-[10px] font-mono font-bold text-white">
                      #{escena.numero} · [{escena.tiempoInicioSeg}s - {escena.tiempoFinSeg}s]
                    </div>

                    {escena.requiereLipSync && (
                      <div className="absolute top-2 right-2 rounded-lg bg-pink-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        🎤 LipSync
                      </div>
                    )}
                  </div>

                  <div className="p-3.5 space-y-2">
                    <p className="text-xs font-bold text-slate-900">{escena.titulo}</p>
                    <p className="text-[11px] text-violet-800 bg-violet-50 rounded-lg p-2 font-medium">
                      🎵 {escena.letraODialogo}
                    </p>
                    <p className="text-xs text-slate-600 line-clamp-3">
                      {escena.descripcionVisual}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                  <span className="text-[10px] font-mono text-slate-400">
                    ⏱️ {escena.duracionSegundos}s
                  </span>
                  <button
                    type="button"
                    disabled={estaRegenerandoEsta || generandoEscenas}
                    onClick={() => manejarGenerarImagenes(escena.idEscena)}
                    className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 px-2.5 py-1 text-[11px] font-bold text-slate-700 transition-colors"
                  >
                    {estaRegenerandoEsta ? "⏳ Creando..." : "🎨 Regenerar esta toma"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. BOTÓN PRINCIPAL PARA PASAR AL PASO 5 Y 6 */}
      {mensajeError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
          {mensajeError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <button
          type="button"
          disabled={!todasEscenasListas}
          onClick={alAprobarPasoProduccionAV}
          className={`rounded-full px-6 py-3 text-xs sm:text-sm font-bold shadow-lg transition-all ${
            todasEscenasListas
              ? "bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-indigo-500/25"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          {todasEscenasListas
            ? "✅ Aprobar Todas las Imágenes y Pasar a Sonido y Video (Pasos 5 y 6) →"
            : `Genera las ${totalEscenas - escenasConImagen} imágenes faltantes para continuar al Paso 5`}
        </button>
      </div>

      {/* Modal de Zoom en pantalla completa para Láminas 360° */}
      {laminaZoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setLaminaZoomUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden bg-neutral-900 border border-white/20 p-2">
            <button
              type="button"
              onClick={() => setLaminaZoomUrl(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/70 text-white font-bold flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              ✕
            </button>
            <img
              src={laminaZoomUrl}
              alt="Lámina 360 en pantalla completa"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
