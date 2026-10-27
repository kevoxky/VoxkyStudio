// Modal de Ajustes del Estudio (⚙️ Settings) para cambiar en vivo modelos de Imagen (Seedream, Nano Banana, FLUX, etc.), Video, Estilo, Formato e Idioma.
// Se conecta con constantes_mesa_entrada.ts, validar_entrada_proyecto.ts y VistaEstudioInicial.tsx.

"use client";

import React, { useEffect, useState } from "react";
import {
  ESTILOS_VISUALES_PROYECTO,
  type FormatoVideo,
  IDIOMAS_SALIDA_PERMITIDOS,
  type IdiomaSalidaVideo,
  type IdEstiloVisual,
  MODELOS_IMAGEN_FAL,
  MODELOS_VIDEO_FAL,
  type ModoCalidadProduccion,
  OPCIONES_FORMATO_VIDEO,
  PERFILES_PRODUCCION_CALIDAD,
} from "@/mesa_entrada/constantes_mesa_entrada";
import {
  calcularCostoPorMinutoUSD,
  calcularPresupuestoTotalUSD,
  detectarModoCalidad,
} from "@/mesa_entrada/validar_entrada_proyecto";

export interface DatosAjustesProyecto {
  modeloImagen: string;
  modeloVideo: string;
  estiloVisualSeleccionado: IdEstiloVisual;
  formato: FormatoVideo;
  idiomaSalida: IdiomaSalidaVideo;
  modoCalidad: ModoCalidadProduccion;
  costoEstimadoPorMinutoUSD: number;
  presupuestoTotalEstimadoUSD: number;
}

interface PropiedadesModalAjustesEstudio {
  abierto: boolean;
  alCerrar: () => void;
  modeloImagenActual: string;
  modeloVideoActual: string;
  estiloVisualActual: string;
  formatoActual: FormatoVideo;
  idiomaSalidaActual: IdiomaSalidaVideo;
  duracionObjetivoActual: string;
  alGuardarAjustes: (nuevosAjustes: DatosAjustesProyecto) => Promise<void>;
}

/**
 * Renderiza el modal de configuración del estudio (⚙️ Ajustes) para cambiar motores de IA y parámetros del proyecto en cualquier momento.
 * Recibe los valores actuales del proyecto y guarda los cambios directamente en Firestore.
 */
export function ModalAjustesEstudio({
  abierto,
  alCerrar,
  modeloImagenActual,
  modeloVideoActual,
  estiloVisualActual,
  formatoActual,
  idiomaSalidaActual,
  duracionObjetivoActual,
  alGuardarAjustes,
}: PropiedadesModalAjustesEstudio) {
  const [modeloImagen, setModeloImagen] = useState<string>(modeloImagenActual);
  const [modeloVideo, setModeloVideo] = useState<string>(modeloVideoActual);
  const [estiloVisual, setEstiloVisual] = useState<IdEstiloVisual>(
    (estiloVisualActual as IdEstiloVisual) || "original_referencia"
  );
  const [formato, setFormato] = useState<FormatoVideo>(formatoActual);
  const [idiomaSalida, setIdiomaSalida] =
    useState<IdiomaSalidaVideo>(idiomaSalidaActual);
  const [guardando, setGuardando] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Sincroniza el estado local cuando se abre el modal o cambian los datos externos
  useEffect(() => {
    if (abierto) {
      setModeloImagen(modeloImagenActual || "google/nano-banana-2.1");
      setModeloVideo(
        modeloVideoActual || "fal-ai/kling-video/v3/pro/image-to-video"
      );
      setEstiloVisual(
        (estiloVisualActual as IdEstiloVisual) || "original_referencia"
      );
      setFormato(formatoActual || "16:9");
      setIdiomaSalida(idiomaSalidaActual || "Español");
      setMensajeError(null);
    }
  }, [
    abierto,
    modeloImagenActual,
    modeloVideoActual,
    estiloVisualActual,
    formatoActual,
    idiomaSalidaActual,
  ]);

  if (!abierto) return null;

  const modoCalidad = detectarModoCalidad(modeloImagen, modeloVideo);
  const costoPorMinutoUSD = calcularCostoPorMinutoUSD(
    modeloImagen,
    modeloVideo
  );
  const presupuestoTotalUSD = calcularPresupuestoTotalUSD(
    costoPorMinutoUSD,
    duracionObjetivoActual || "Auto"
  );

  /**
   * Guarda los nuevos modelos y ajustes seleccionados en Firestore y cierra el modal.
   */
  async function manejarGuardar() {
    setGuardando(true);
    setMensajeError(null);
    try {
      await alGuardarAjustes({
        modeloImagen,
        modeloVideo,
        estiloVisualSeleccionado: estiloVisual,
        formato,
        idiomaSalida,
        modoCalidad,
        costoEstimadoPorMinutoUSD: costoPorMinutoUSD,
        presupuestoTotalEstimadoUSD: presupuestoTotalUSD,
      });
      alCerrar();
    } catch (error) {
      setMensajeError(
        error instanceof Error
          ? error.message
          : "No se pudieron guardar los ajustes del estudio."
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustes del Estudio y Motores de IA"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-3 sm:p-5"
      onClick={alCerrar}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Configuración en Tiempo Real
              </span>
            </div>
            <h3 className="text-base sm:text-xl font-bold text-slate-900 mt-0.5">
              Ajustes del Estudio y Motores de IA
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cambia en cualquier momento el modelo de imagen (Seedream, Nano Banana, FLUX, etc.), video, estilo visual o formato.
            </p>
          </div>

          <button
            type="button"
            onClick={alCerrar}
            className="rounded-full h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {mensajeError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            ⚠️ {mensajeError}
          </div>
        )}

        {/* 1. Perfiles rápidos de producción */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Perfiles Rápidos de Calidad
            </label>
            <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
              Tarifa calculada: ~${costoPorMinutoUSD.toFixed(2)} USD/min · Total aprox: ~${presupuestoTotalUSD.toFixed(2)} USD
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PERFILES_PRODUCCION_CALIDAD.map((perfil) => {
              const activo = modoCalidad === perfil.modo;
              return (
                <button
                  key={perfil.modo}
                  type="button"
                  onClick={() => {
                    setModeloImagen(perfil.idModeloImagen);
                    setModeloVideo(perfil.idModeloVideo);
                  }}
                  className={`rounded-2xl border p-3 text-left transition-all cursor-pointer ${
                    activo
                      ? "border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {perfil.icono} Modo {perfil.titulo}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700">
                      {perfil.rangoReferenciaUSD}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">
                    {perfil.descripcionCorta}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Selector de Modelo de Imagen (Dual: Text-to-Image + Image-to-Image /edit) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Motor de Generación de Imágenes (Láminas 360° y Storyboard)
            </label>
            <span className="text-[11px] text-indigo-700 font-semibold">
              Todos son Duales (soportan referencias visuales y texto)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {MODELOS_IMAGEN_FAL.map((modelo) => {
              const seleccionado = modeloImagen === modelo.id;
              const esSeedream = modelo.id.toLowerCase().includes("seedream");
              return (
                <button
                  key={modelo.id}
                  type="button"
                  onClick={() => setModeloImagen(modelo.id)}
                  className={`rounded-2xl border p-3 text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                    seleccionado
                      ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        🖼️ {modelo.nombre}
                        {esSeedream && (
                          <span className="rounded-full bg-purple-100 border border-purple-300 px-1.5 py-0.2 text-[9px] font-bold text-purple-900">
                            ByteDance
                          </span>
                        )}
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                        {modelo.costoRealUSD}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      {modelo.descripcion}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>Calidad: <strong>{modelo.calidad}</strong></span>
                    <span>Velocidad: <strong>{modelo.velocidadEstimada}</strong></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Selector de Modelo de Video */}
        <div className="space-y-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
            3. Motor de Generación de Video (Paso 5)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {MODELOS_VIDEO_FAL.map((modelo) => {
              const seleccionado = modeloVideo === modelo.id;
              return (
                <button
                  key={modelo.id}
                  type="button"
                  onClick={() => setModeloVideo(modelo.id)}
                  className={`rounded-2xl border p-2.5 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                    seleccionado
                      ? "border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-500/20"
                      : "border-slate-200 bg-white hover:border-indigo-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        🎬 {modelo.nombre}
                      </span>
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900 shrink-0">
                        {modelo.costoRealUSD}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">
                      {modelo.descripcion}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100 flex justify-between">
                    <span>{modelo.calidad}</span>
                    <span>{modelo.velocidadEstimada}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Estilo Visual, Formato de Pantalla e Idioma */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              🎨 Estilo Visual Artístico
            </label>
            <select
              value={estiloVisual}
              onChange={(e) => setEstiloVisual(e.target.value as IdEstiloVisual)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              {ESTILOS_VISUALES_PROYECTO.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.nombreVisible}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              📐 Formato de Pantalla
            </label>
            <select
              value={formato}
              onChange={(e) => setFormato(e.target.value as FormatoVideo)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              {OPCIONES_FORMATO_VIDEO.map((op) => (
                <option key={op.valor} value={op.valor}>
                  {op.etiquetaCorta} ({op.descripcionPlataforma})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              🌐 Idioma de Salida
            </label>
            <select
              value={idiomaSalida}
              onChange={(e) =>
                setIdiomaSalida(e.target.value as IdiomaSalidaVideo)
              }
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none cursor-pointer"
            >
              {IDIOMAS_SALIDA_PERMITIDOS.map((idioma) => (
                <option key={idioma} value={idioma}>
                  {idioma}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Barra inferior de guardado */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={guardando}
            onClick={alCerrar}
            className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={guardando}
            onClick={manejarGuardar}
            className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 text-xs shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {guardando
              ? "⏳ Guardando cambios..."
              : "💾 Guardar Ajustes del Estudio"}
          </button>
        </div>
      </div>
    </div>
  );
}
