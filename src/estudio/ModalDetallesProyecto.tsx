// Modal limpio y compacto para consultar la Idea Original y los Archivos Multimedia sin ocupar espacio fijo en pantalla.
// Se conecta con VistaEstudioInicial.tsx y permite revisar en cualquier momento los datos del proyecto.

"use client";

import React, { useEffect } from "react";
import { type ArchivoMultimediaGuardado } from "@/mesa_entrada/constantes_mesa_entrada";

interface PropiedadesModalDetallesProyecto {
  abierto: boolean;
  alCerrar: () => void;
  proyectoId: string;
  ideaOriginal: string;
  archivosMultimedia?: ArchivoMultimediaGuardado[];
  imagenesReferencia?: string[];
  formato: string;
  duracionObjetivo?: string;
  estiloVisualSeleccionado?: string;
  idiomaSalida?: string;
}

/**
 * Muestra una ventana modal flotante para consultar la idea y archivos del proyecto con un solo clic.
 */
export function ModalDetallesProyecto({
  abierto,
  alCerrar,
  proyectoId,
  ideaOriginal,
  archivosMultimedia = [],
  imagenesReferencia = [],
  formato,
  duracionObjetivo,
  estiloVisualSeleccionado,
  idiomaSalida,
}: PropiedadesModalDetallesProyecto) {
  useEffect(() => {
    function manejarTeclaEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") alCerrar();
    }
    if (abierto) {
      document.addEventListener("keydown", manejarTeclaEscape);
    }
    return () => document.removeEventListener("keydown", manejarTeclaEscape);
  }, [abierto, alCerrar]);

  if (!abierto) return null;

  const totalArchivos = archivosMultimedia.length > 0 ? archivosMultimedia.length : imagenesReferencia.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={alCerrar}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Ficha del Proyecto #{proyectoId}
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              📋 Idea Original y Archivos de Referencia
            </h3>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="rounded-full h-8 w-8 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Resumen de configuración rápida */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            Formato: {formato}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
            Duración: {duracionObjetivo ?? "Auto"}
          </span>
          {estiloVisualSeleccionado && (
            <span className="rounded-full bg-purple-50 text-purple-900 border border-purple-200 px-3 py-1 font-semibold">
              Estilo: {estiloVisualSeleccionado.replace(/_/g, " ")}
            </span>
          )}
          {idiomaSalida && (
            <span className="rounded-full bg-sky-50 text-sky-900 border border-sky-200 px-3 py-1 font-semibold">
              Idioma: {idiomaSalida}
            </span>
          )}
        </div>

        {/* Idea original */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Prompt / Idea Escrita
          </h4>
          <p className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
            {ideaOriginal}
          </p>
        </div>

        {/* Archivos multimedia */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Archivos Adjuntos ({totalArchivos})
          </h4>

          {archivosMultimedia.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {archivosMultimedia.map((item, idx) => (
                <a
                  key={`${item.url}-${idx}`}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 bg-slate-50 hover:border-indigo-400 p-2.5 flex items-center gap-2.5 transition-colors group"
                >
                  <span className="text-lg">
                    {item.tipo === "imagen" ? "🖼️" : item.tipo === "audio" ? "🎵" : "🎬"}
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                      {item.nombre}
                    </p>
                    <span className="text-[10px] uppercase text-slate-400 font-bold">
                      {item.tipo} {item.duracionSegundos ? `· ${item.duracionSegundos.toFixed(1)}s` : ""}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 group-hover:text-indigo-600">↗</span>
                </a>
              ))}
            </div>
          ) : imagenesReferencia.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {imagenesReferencia.map((url, idx) => (
                <a
                  key={`${url}-${idx}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs font-semibold text-slate-700 hover:border-indigo-400"
                >
                  🖼️ Referencia #{idx + 1} ↗
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">No se adjuntaron archivos para este proyecto.</p>
          )}
        </div>

        <div className="pt-2 text-right">
          <button
            type="button"
            onClick={alCerrar}
            className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
}
