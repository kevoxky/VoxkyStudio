// Píldora desplegable compacta para seleccionar el Estilo Visual del proyecto y la Conversión Artística.
// Se conecta con constantes_mesa_entrada.ts y se utiliza en MesaDeEntrada.tsx y en PanelEstudioVisualPaso4.tsx.

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ESTILOS_VISUALES_PROYECTO,
  type IdEstiloVisual,
} from "./constantes_mesa_entrada.ts";

interface PropiedadesSelectorEstiloVisual {
  estiloSeleccionado: IdEstiloVisual | string;
  alCambiarEstilo: (nuevoEstilo: IdEstiloVisual) => void;
  deshabilitado?: boolean;
  tamanoCompacto?: boolean;
}

/**
 * Muestra una píldora compacta con el estilo visual actual y despliega un menú flotante con los 9 estilos artísticos.
 * Recibe el estilo seleccionado y el callback para actualizarlo al instante.
 */
export function SelectorEstiloVisual({
  estiloSeleccionado,
  alCambiarEstilo,
  deshabilitado = false,
  tamanoCompacto = false,
}: PropiedadesSelectorEstiloVisual) {
  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);
  const referenciaContenedor = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function manejarClicFuera(evento: MouseEvent) {
      if (
        referenciaContenedor.current &&
        !referenciaContenedor.current.contains(evento.target as Node)
      ) {
        setMenuAbierto(false);
      }
    }

    if (menuAbierto) {
      document.addEventListener("mousedown", manejarClicFuera);
    }
    return () => {
      document.removeEventListener("mousedown", manejarClicFuera);
    };
  }, [menuAbierto]);

  const estiloActual =
    ESTILOS_VISUALES_PROYECTO.find((e) => e.id === estiloSeleccionado) ||
    ESTILOS_VISUALES_PROYECTO[0];

  return (
    <div ref={referenciaContenedor} className="relative inline-block">
      <button
        type="button"
        disabled={deshabilitado}
        onClick={() => setMenuAbierto(!menuAbierto)}
        title="Estilo visual del video y transformación artística"
        className={`group inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50/70 hover:bg-purple-100/90 text-purple-900 transition-all font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
          tamanoCompacto ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-xs sm:text-sm"
        }`}
      >
        <span className="text-sm">{estiloActual.icono}</span>
        <span className="font-semibold">{estiloActual.nombreVisible.split(" ")[1] || estiloActual.nombreVisible}</span>
        <svg
          className={`h-3 w-3 text-purple-700 transition-transform ${
            menuAbierto ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {menuAbierto && (
        <div className="absolute bottom-full mb-2 left-0 z-50 w-72 sm:w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100 max-h-96 overflow-y-auto">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              🎨 Estilo Visual y Arte
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Transforma la estética de personajes y escenas manteniendo 100% su identidad y ropa.
            </p>
          </div>

          <div className="space-y-1">
            {ESTILOS_VISUALES_PROYECTO.map((estilo) => {
              const estaActivo = estilo.id === estiloSeleccionado;
              return (
                <button
                  key={estilo.id}
                  type="button"
                  onClick={() => {
                    alCambiarEstilo(estilo.id);
                    setMenuAbierto(false);
                  }}
                  className={`w-full text-left rounded-xl px-3 py-2 text-xs transition-colors flex items-start gap-2.5 cursor-pointer ${
                    estaActivo
                      ? "bg-purple-100 text-purple-950 font-semibold"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-base shrink-0 mt-0.5">{estilo.icono}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{estilo.nombreVisible}</span>
                      {estaActivo && <span className="text-purple-600 font-bold ml-1">✓</span>}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 font-normal">
                      {estilo.descripcionCorta}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
