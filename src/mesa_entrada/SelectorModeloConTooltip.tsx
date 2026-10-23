// Selector tipo píldora azul claro para modelos de fal.ai con menú desplegable y tarjeta lateral de detalle (Hover Card).
// Se conecta con constantes_mesa_entrada.ts y se muestra dentro de la barra de herramientas de MesaDeEntrada.tsx.

"use client";

import React, { useEffect, useRef, useState } from "react";
import { type FichaTecnicaModeloFal } from "./constantes_mesa_entrada";

interface PropiedadesSelectorModelo {
  tipoIcono: "imagen" | "video";
  etiquetaAria: string;
  modelosDisponibles: FichaTecnicaModeloFal[];
  idModeloSeleccionado: string;
  alSeleccionarModelo: (nuevoIdModelo: string) => void;
  deshabilitado: boolean;
}

/**
 * Muestra la píldora azul claro del modelo activo y al abrirse despliega la lista a la izquierda y la tarjeta técnica a la derecha.
 * Recibe el catálogo de modelos, el ID seleccionado y la función de cambio, y devuelve el selector interactivo con tooltip.
 */
export function SelectorModeloConTooltip({
  tipoIcono,
  etiquetaAria,
  modelosDisponibles,
  idModeloSeleccionado,
  alSeleccionarModelo,
  deshabilitado,
}: PropiedadesSelectorModelo) {
  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);
  const [idModeloEnHover, setIdModeloEnHover] =
    useState<string>(idModeloSeleccionado);
  const referenciaContenedor = useRef<HTMLDivElement | null>(null);

  const modeloActivo =
    modelosDisponibles.find((m) => m.id === idModeloSeleccionado) ??
    modelosDisponibles[0];

  const modeloDetalle =
    modelosDisponibles.find((m) => m.id === idModeloEnHover) ?? modeloActivo;

  // Cerramos el menú desplegable cuando el usuario hace clic fuera del selector
  useEffect(() => {
    function manejarClicFuera(evento: MouseEvent) {
      if (
        referenciaContenedor.current &&
        !referenciaContenedor.current.contains(evento.target as Node)
      ) {
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, []);

  return (
    <div ref={referenciaContenedor} className="relative inline-flex">
      {/* Píldora azul claro compacta en la barra de herramientas */}
      <button
        type="button"
        disabled={deshabilitado}
        aria-label={etiquetaAria}
        aria-expanded={menuAbierto}
        onClick={() => {
          setIdModeloEnHover(idModeloSeleccionado);
          setMenuAbierto((abierto) => !abierto);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50/90 hover:bg-sky-100/80 px-3 py-1.5 text-xs font-semibold text-sky-900 transition-colors cursor-pointer disabled:opacity-50"
      >
        {tipoIcono === "imagen" ? (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="w-4 h-4 text-sky-700 shrink-0"
          >
            <rect x="2.5" y="3.5" width="15" height="13" rx="2" />
            <circle cx="7" cy="8" r="1.3" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.5 14.5l4.2-4.2a1 1 0 011.4 0l2.4 2.4 2.3-2.3a1 1 0 011.4 0l1.8 1.8"
            />
          </svg>
        ) : (
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            className="w-4 h-4 text-sky-700 shrink-0"
          >
            <rect x="2.5" y="5" width="11" height="10" rx="2" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 8.5l4-2.3v7.6l-4-2.3"
            />
          </svg>
        )}

        <span>{modeloActivo.nombre}</span>

        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5 text-sky-700 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Menú desplegable doble: Lista a la izquierda + Tarjeta de información (Hover Card) a la derecha */}
      {menuAbierto && (
        <div className="absolute left-0 bottom-full mb-2 flex flex-col sm:flex-row items-stretch gap-2 z-40">
          {/* IZQUIERDA: Lista principal de modelos con check (✓) y diamante (💎) */}
          <div className="w-56 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-300/60 space-y-0.5">
            {modelosDisponibles.map((modelo) => {
              const esSeleccionado = modelo.id === idModeloSeleccionado;
              const estaEnHover = modelo.id === modeloDetalle.id;

              return (
                <button
                  key={modelo.id}
                  type="button"
                  onMouseEnter={() => setIdModeloEnHover(modelo.id)}
                  onFocus={() => setIdModeloEnHover(modelo.id)}
                  onClick={() => {
                    alSeleccionarModelo(modelo.id);
                    setMenuAbierto(false);
                  }}
                  className={`w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
                    esSeleccionado
                      ? "bg-indigo-50 text-indigo-950 font-bold"
                      : estaEnHover
                      ? "bg-slate-100 text-slate-900 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="w-3.5 text-indigo-600 font-bold shrink-0">
                      {esSeleccionado ? "✓" : ""}
                    </span>
                    <span className="truncate">{modelo.nombre}</span>
                  </span>

                  {modelo.esPremium && (
                    <span
                      title="Modelo de alta gama"
                      className="text-[11px] ml-1.5 shrink-0"
                    >
                      💎
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* DERECHA: Tarjeta flotante de detalle técnico (Hover Card / Tooltip) */}
          <div className="w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl shadow-slate-300/60 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  {modeloDetalle.nombre}
                </h3>
                {modeloDetalle.esPremium && (
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    💎 Premium
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {modeloDetalle.descripcion}
              </p>
            </div>

            {/* Grilla inferior con los 3 datos técnicos: CALIDAD, PRECIO REAL y VELOCIDAD */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 text-center">
              <div className="rounded-xl bg-slate-50 p-2 border border-slate-100">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Calidad
                </p>
                <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                  {modeloDetalle.calidad}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50/70 p-2 border border-emerald-100">
                <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                  Precio Real
                </p>
                <p className="text-[11px] font-bold text-emerald-900 mt-0.5">
                  {modeloDetalle.costoRealUSD}
                </p>
              </div>

              <div className="rounded-xl bg-sky-50/70 p-2 border border-sky-100">
                <p className="text-[9px] font-bold uppercase tracking-wider text-sky-700">
                  Velocidad
                </p>
                <p className="text-[11px] font-bold text-sky-900 mt-0.5">
                  ⏱ {modeloDetalle.velocidadEstimada}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
