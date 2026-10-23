// Selector visual simple en colores claros para elegir el formato del video entre Vertical (9:16) y Horizontal (16:9).
// Se conecta con constantes_mesa_entrada.ts y se muestra dentro de MesaDeEntrada.tsx.

"use client";

import React from "react";
import {
  FORMATO_HORIZONTAL,
  FORMATO_VERTICAL,
  FormatoVideo,
} from "./constantes_mesa_entrada";

interface PropiedadesSelectorFormato {
  formatoSeleccionado: FormatoVideo;
  alCambiarFormato: (nuevoFormato: FormatoVideo) => void;
  deshabilitado: boolean;
}

interface OpcionVisualFormato {
  valor: FormatoVideo;
  titulo: string;
  descripcion: string;
  claseRectangulo: string;
}

// Opciones de formato con sus textos descriptivos y proporción visual
const OPCIONES_FORMATO: OpcionVisualFormato[] = [
  {
    valor: FORMATO_VERTICAL,
    titulo: "Vertical (9:16)",
    descripcion: "Para Reels / TikTok",
    claseRectangulo: "w-5 h-8",
  },
  {
    valor: FORMATO_HORIZONTAL,
    titulo: "Horizontal (16:9)",
    descripcion: "Para YouTube",
    claseRectangulo: "w-8 h-5",
  },
];

/**
 * Muestra dos tarjetas luminosas e interactivas para elegir fácilmente entre video Vertical u Horizontal.
 * Recibe el formato actual, la función para cambiarlo y si el formulario está cargando, y devuelve el selector visual.
 */
export function SelectorFormatoVideo({
  formatoSeleccionado,
  alCambiarFormato,
  deshabilitado,
}: PropiedadesSelectorFormato) {
  return (
    <div className="space-y-2.5">
      <label className="block text-sm font-semibold text-slate-800">
        2. Formato del video
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPCIONES_FORMATO.map((opcion) => {
          const estaActivo = formatoSeleccionado === opcion.valor;

          return (
            <button
              key={opcion.valor}
              type="button"
              disabled={deshabilitado}
              onClick={() => alCambiarFormato(opcion.valor)}
              aria-pressed={estaActivo}
              className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                estaActivo
                  ? "border-indigo-600 bg-indigo-50/80 text-indigo-950 shadow-sm ring-1 ring-indigo-600/20"
                  : "border-slate-200 bg-slate-50/70 text-slate-700 hover:border-slate-300 hover:bg-slate-100/80"
              }`}
            >
              {/* Ícono geométrico claro que representa la pantalla vertical u horizontal */}
              <div
                className={`flex items-center justify-center w-11 h-11 rounded-lg border shrink-0 transition-colors ${
                  estaActivo
                    ? "bg-white border-indigo-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div
                  className={`${opcion.claseRectangulo} rounded-sm border-2 transition-colors ${
                    estaActivo
                      ? "border-indigo-600 bg-indigo-500/20"
                      : "border-slate-400 bg-slate-200/70"
                  }`}
                />
              </div>

              <div>
                <p className="font-semibold text-sm sm:text-base">
                  {opcion.titulo}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    estaActivo ? "text-indigo-700" : "text-slate-500"
                  }`}
                >
                  {opcion.descripcion}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
