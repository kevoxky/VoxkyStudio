// Píldoras desplegables compactas para Formato y Duración con menús flotantes que no alteran el ancho de la barra.
// Se conecta con constantes_mesa_entrada.ts, validar_entrada_proyecto.ts y se integra en la barra inferior de MesaDeEntrada.tsx.

"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  CANTIDAD_MAXIMA_CUSTOM,
  CANTIDAD_MINIMA_CUSTOM,
  type FormatoVideo,
  OPCIONES_DURACION_PREDEFINIDAS,
  OPCIONES_FORMATO_VIDEO,
  type UnidadDuracionCustom,
} from "./constantes_mesa_entrada";
import { formatearDuracionCustom } from "./validar_entrada_proyecto";

interface PropiedadesSelectorFormato {
  formatoSeleccionado: FormatoVideo;
  alCambiarFormato: (nuevoFormato: FormatoVideo) => void;
  deshabilitado: boolean;
}

interface PropiedadesSelectorDuracion {
  duracionObjetivo: string;
  alCambiarDuracion: (nuevaDuracion: string) => void;
  deshabilitado: boolean;
}

/**
 * Muestra una píldora compacta con el formato actual (ej. "16:9") y un menú flotante con las descripciones de cada plataforma.
 * Recibe el formato elegido, la función para actualizarlo y si está deshabilitado, y devuelve el selector sin ensanchar la barra.
 */
export function SelectorFormatoVideo({
  formatoSeleccionado,
  alCambiarFormato,
  deshabilitado,
}: PropiedadesSelectorFormato) {
  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);
  const referenciaContenedor = useRef<HTMLDivElement | null>(null);

  // Cerramos el menú flotante automáticamente si el usuario hace clic fuera de él
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
      <button
        type="button"
        disabled={deshabilitado}
        onClick={() => setMenuAbierto((abierto) => !abierto)}
        aria-label="Formato del video"
        aria-expanded={menuAbierto}
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 hover:bg-slate-200/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="w-4 h-4 text-slate-500 shrink-0"
        >
          <rect x="2.5" y="4" width="15" height="12" rx="2" />
        </svg>
        <span>{formatoSeleccionado}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5 text-slate-500 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {menuAbierto && (
        <div className="absolute left-0 bottom-full mb-2 w-72 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-300/60 z-30">
          {OPCIONES_FORMATO_VIDEO.map((opcion) => {
            const activo = opcion.valor === formatoSeleccionado;
            return (
              <button
                key={opcion.valor}
                type="button"
                onClick={() => {
                  alCambiarFormato(opcion.valor);
                  setMenuAbierto(false);
                }}
                className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                  activo
                    ? "bg-indigo-50 text-indigo-900 font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span className="font-bold">{opcion.etiquetaCorta}</span>
                <span className="text-slate-500 text-[11px]">
                  {opcion.descripcionPlataforma}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Muestra una píldora compacta de Duración con menú flotante que incluye las opciones rápidas y el selector Custom integrado.
 * Recibe la duración objetivo actual, la función para actualizarla y si está deshabilitado, sin abrir espacio extra en la barra.
 */
export function SelectorDuracionVideo({
  duracionObjetivo,
  alCambiarDuracion,
  deshabilitado,
}: PropiedadesSelectorDuracion) {
  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);
  const [cantidadCustom, setCantidadCustom] = useState<number>(7);
  const [unidadCustom, setUnidadCustom] = useState<UnidadDuracionCustom>("min");
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
    document.addEventListener("mousedown", manejarClicFuera);
    return () => document.removeEventListener("mousedown", manejarClicFuera);
  }, []);

  /**
   * Actualiza la cantidad numérica personalizada y aplica inmediatamente el formato "Custom: X seg/min".
   * Recibe el texto numérico escrito por el usuario y actualiza la duración del proyecto.
   */
  function actualizarCantidadCustom(textoNumero: string) {
    const numeroEntero = Math.max(
      CANTIDAD_MINIMA_CUSTOM,
      Math.min(CANTIDAD_MAXIMA_CUSTOM, Number(textoNumero) || 1)
    );
    setCantidadCustom(numeroEntero);
    alCambiarDuracion(formatearDuracionCustom(numeroEntero, unidadCustom));
  }

  /**
   * Cambia la unidad entre segundos ("seg") y minutos ("min") dentro del menú flotante Custom.
   * Recibe la unidad elegida y actualiza la duración objetivo sin empujar los demás botones de la barra.
   */
  function actualizarUnidadCustom(nuevaUnidad: UnidadDuracionCustom) {
    setUnidadCustom(nuevaUnidad);
    alCambiarDuracion(formatearDuracionCustom(cantidadCustom, nuevaUnidad));
  }

  return (
    <div ref={referenciaContenedor} className="relative inline-flex">
      <button
        type="button"
        disabled={deshabilitado}
        onClick={() => setMenuAbierto((abierto) => !abierto)}
        aria-label="Duración aproximada del video"
        aria-expanded={menuAbierto}
        title="Duración aproximada con tolerancia flexible para no cortar frases ni ideas a la mitad"
        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 hover:bg-slate-200/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="w-4 h-4 text-slate-500 shrink-0"
        >
          <circle cx="10" cy="11" r="6.5" />
          <path strokeLinecap="round" d="M10 8v3.2l2 1.3M8 2.5h4" />
        </svg>
        <span>{duracionObjetivo}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-3.5 h-3.5 text-slate-500 shrink-0"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Menú flotante superior: contiene los tiempos predefinidos y la fila Custom sin ocupar espacio en la barra */}
      {menuAbierto && (
        <div className="absolute left-0 bottom-full mb-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-300/60 z-30 space-y-1.5">
          <div className="grid grid-cols-2 gap-1">
            {OPCIONES_DURACION_PREDEFINIDAS.map((tiempo) => {
              const activo = duracionObjetivo === tiempo;
              return (
                <button
                  key={tiempo}
                  type="button"
                  onClick={() => {
                    alCambiarDuracion(tiempo);
                    setMenuAbierto(false);
                  }}
                  className={`rounded-xl px-2.5 py-1.5 text-left text-xs transition-colors cursor-pointer ${
                    activo
                      ? "bg-indigo-600 text-white font-semibold"
                      : "text-slate-700 hover:bg-slate-100 font-medium"
                  }`}
                >
                  {tiempo}
                </button>
              );
            })}
          </div>

          {/* Sección Custom dentro del mismo menú flotante */}
          <div className="border-t border-slate-100 pt-2 px-1 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-500">
              Custom (duración personalizada):
            </p>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={CANTIDAD_MINIMA_CUSTOM}
                max={CANTIDAD_MAXIMA_CUSTOM}
                value={cantidadCustom}
                onChange={(evento) =>
                  actualizarCantidadCustom(evento.target.value)
                }
                aria-label="Cantidad de duración personalizada"
                className="w-16 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-center text-xs font-bold text-slate-900 focus:border-indigo-500 focus:bg-white focus:outline-none"
              />

              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                {(["seg", "min"] as UnidadDuracionCustom[]).map((unidad) => (
                  <button
                    key={unidad}
                    type="button"
                    onClick={() => actualizarUnidadCustom(unidad)}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      unidadCustom === unidad
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {unidad}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  alCambiarDuracion(
                    formatearDuracionCustom(cantidadCustom, unidadCustom)
                  );
                  setMenuAbierto(false);
                }}
                className="ml-auto rounded-lg bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 text-[11px] font-bold text-indigo-700 cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
