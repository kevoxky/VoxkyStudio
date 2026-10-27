// Pantalla de la Etapa 5: Producción AV, Renderizado de Video y Descarga Final MP4.
// Se conecta con VistaEstudioInicial.tsx y prepara el estudio para los Pasos 5 y 6.

"use client";

import React from "react";
import { type GuionProduccionCompleto } from "@/agentes/guionista/tipos_guion";

interface PropiedadesPantallaProduccionPaso5 {
  proyectoId: string;
  formato: string;
  modeloVideoNombre: string;
  idiomaSalida: string;
  guion: GuionProduccionCompleto;
  alVolverAPasoAnterior: () => void;
}

/**
 * Pantalla autónoma para la Fase 5 del Wizard: resumen de producción y preparación de renderizado audiovisual.
 */
export function PantallaProduccionPaso5({
  proyectoId,
  formato,
  modeloVideoNombre,
  idiomaSalida,
  guion,
  alVolverAPasoAnterior,
}: PropiedadesPantallaProduccionPaso5) {
  const totalTomas = guion.escenas.length;
  const tomasConImagen = guion.escenas.filter((e) => e.imagenAnclaUrl).length;
  const duracionTotal = guion.escenas.reduce((acc, e) => acc + (Number(e.duracionSegundos) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Tarjeta de bienvenida a la etapa final */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-teal-50 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Paso 5 de 5 · Sala de Renderizado y Masterización
          </span>
          <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
            Listo para producción
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          🎥 Audio, Video y Descarga de Producción
        </h2>
        <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
          Has completado con éxito la clarificación del director, la escaleta de guion y la generación del storyboard con consistencia visual. Aquí se ensambla la animación de cada toma, las voces y la mezcla sonora.
        </p>

        {/* Resumen técnico */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Tomas Aprobadas</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {tomasConImagen} / {totalTomas}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Duración Total</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              {duracionTotal.toFixed(1)} segundos
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Motor de Video</span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">
              {modeloVideoNombre}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">Formato / Idioma</span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 truncate">
              {formato} · {idiomaSalida}
            </p>
          </div>
        </div>
      </div>

      {/* Módulo de renderizado */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="mx-auto h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-3xl">
          🎬
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900">
            Renderizar Producción Completa (MP4)
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            El motor animará los keyframes aprobados con movimientos de cámara cinemáticos y montará la pista de audio con sincronización exacta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => alert("¡Próximamente! En los Pasos 5 y 6 se activará el renderizado de video en lote con Kling / Wan y descarga MP4.")}
          className="rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-7 py-3 text-sm shadow-md transition-all hover:scale-105 cursor-pointer"
        >
          🚀 Iniciar Renderizado Audiovisual
        </button>
      </div>

      {/* Barra de navegación inferior */}
      <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-sm p-4 shadow-lg">
        <button
          type="button"
          onClick={alVolverAPasoAnterior}
          className="rounded-full border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2 text-xs sm:text-sm cursor-pointer"
        >
          ← Paso Anterior (Storyboard)
        </button>

        <span className="text-xs text-slate-500 font-semibold">
          🎉 Estudio Completado hasta la Fase de Video
        </span>
      </div>
    </div>
  );
}
