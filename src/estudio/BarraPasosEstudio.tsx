// Barra horizontal de etapas del estudio (Stepper) con navegación interactiva, badges de estado y prevención de saltos bloqueados.
// Se conecta con VistaEstudioInicial.tsx para orquestar la experiencia paso a paso sin scroll infinito.

"use client";

import React from "react";

export type NumeroPasoWizard = 1 | 2 | 3 | 4 | 5;

export interface DefinicionPasoWizard {
  numero: NumeroPasoWizard;
  tituloCorto: string;
  etiquetaCompleta: string;
  icono: string;
  descripcionCorta: string;
}

export const PASOS_WIZARD_ESTUDIO: DefinicionPasoWizard[] = [
  {
    numero: 1,
    tituloCorto: "Análisis",
    etiquetaCompleta: "1. Análisis y Clarificación",
    icono: "🔍",
    descripcionCorta: "Visión, Audio y Preguntas del Director",
  },
  {
    numero: 2,
    tituloCorto: "Guion",
    etiquetaCompleta: "2. Guion y Escaleta",
    icono: "🎬",
    descripcionCorta: "Timeline y tomas sincronizadas 0.0s a fin",
  },
  {
    numero: 3,
    tituloCorto: "Láminas 360°",
    etiquetaCompleta: "3. Láminas 360° y Estilo",
    icono: "🎭",
    descripcionCorta: "Consistencia de personajes y productos",
  },
  {
    numero: 4,
    tituloCorto: "Storyboard",
    etiquetaCompleta: "4. Storyboard Visual",
    icono: "🖼️",
    descripcionCorta: "Keyframes generados por escena",
  },
  {
    numero: 5,
    tituloCorto: "Producción AV",
    etiquetaCompleta: "5. Audio, Video y Descarga",
    icono: "🎥",
    descripcionCorta: "Renderizado final y descarga MP4",
  },
];

interface PropiedadesBarraPasosEstudio {
  pasoActivo: NumeroPasoWizard;
  pasoMaximoDesbloqueado: NumeroPasoWizard;
  alSeleccionarPaso: (paso: NumeroPasoWizard) => void;
  alIntentarPasoBloqueado: (paso: NumeroPasoWizard) => void;
}

/**
 * Muestra la barra de navegación por etapas interactiva en la parte superior del estudio.
 */
export function BarraPasosEstudio({
  pasoActivo,
  pasoMaximoDesbloqueado,
  alSeleccionarPaso,
  alIntentarPasoBloqueado,
}: PropiedadesBarraPasosEstudio) {
  return (
    <nav
      aria-label="Etapas de producción"
      className="w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-1.5 shadow-xs"
    >
      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {PASOS_WIZARD_ESTUDIO.map((paso) => {
          const estaActivo = paso.numero === pasoActivo;
          const estaDesbloqueado = paso.numero <= pasoMaximoDesbloqueado;
          const estaCompletado = paso.numero < pasoMaximoDesbloqueado;

          return (
            <button
              key={paso.numero}
              type="button"
              onClick={() => {
                if (estaDesbloqueado) {
                  alSeleccionarPaso(paso.numero);
                } else {
                  alIntentarPasoBloqueado(paso.numero);
                }
              }}
              title={
                estaDesbloqueado
                  ? `${paso.etiquetaCompleta}: ${paso.descripcionCorta}`
                  : `Completa y aprueba el paso actual para desbloquear ${paso.etiquetaCompleta}`
              }
              className={`group relative flex flex-col items-center justify-center rounded-xl py-2 px-1 sm:px-2 transition-all cursor-pointer ${
                estaActivo
                  ? "bg-white text-indigo-950 font-bold shadow-sm border border-indigo-200 ring-2 ring-indigo-500/20"
                  : estaDesbloqueado
                  ? "text-slate-700 hover:bg-white/70 hover:text-indigo-900 font-semibold"
                  : "text-slate-400 opacity-60 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                <span>{paso.icono}</span>
                <span className="hidden md:inline truncate">{paso.tituloCorto}</span>
                <span className="md:hidden font-mono text-[11px]">#{paso.numero}</span>
                {estaCompletado && !estaActivo && (
                  <span className="text-emerald-600 text-xs font-bold">✓</span>
                )}
                {!estaDesbloqueado && (
                  <span className="text-[10px] text-slate-400">🔒</span>
                )}
              </div>

              <span className="hidden lg:block text-[10px] text-slate-500 font-normal truncate max-w-full mt-0.5">
                {paso.descripcionCorta}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
