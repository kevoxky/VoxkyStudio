// Panel interactivo del Armario de Vestuario para cualquier historia: permite ver, añadir o quitar atuendos por escenario.
// Se conecta con PantallaLaminas360Paso3.tsx, tipos_guion.ts y VistaEstudioInicial.tsx.

"use client";

import React, { useState } from "react";
import { type PrendaVestuarioEscenario } from "@/agentes/guionista/tipos_guion";

interface PropiedadesSeccionArmarioVestuario {
  armarioVestuarios: PrendaVestuarioEscenario[];
  deshabilitado: boolean;
  alGenerarVestuario: (idVestuario: string) => void;
  alEliminarVestuario?: (idVestuario: string) => void;
  alAgregarVestuarioPersonalizado?: (nuevaPrenda: {
    escenarioOLugar: string;
    descripcionVestuario: string;
  }) => Promise<void>;
}

/**
 * Limpia textos antiguos de ejemplo ("Consultorio") en el vestuario base para mostrar una etiqueta universal.
 */
function normalizarEtiquetaLugar(
  idVestuario: string,
  escenarioOLugar: string
): string {
  if (
    idVestuario === "vestuario_base" &&
    escenarioOLugar.toLowerCase().includes("consultorio")
  ) {
    return "Ropa original de la foto de referencia";
  }
  return escenarioOLugar;
}

/**
 * Limpia descripciones genéricas antiguas en el vestuario base.
 */
function normalizarDescripcionVestuario(
  idVestuario: string,
  descripcion: string
): string {
  if (
    idVestuario === "vestuario_base" &&
    descripcion.includes("Prendas, colores, calzado y texturas que lleva puestos")
  ) {
    return "Conserva 100% la ropa, colores, estampados y calzado originales que cada personaje lleva en su foto de referencia.";
  }
  return descripcion;
}

/**
 * Muestra el Armario de Vestuario del proyecto y permite añadir atuendos para cualquier escenario o quitar los que no se necesiten.
 */
export function SeccionArmarioVestuario({
  armarioVestuarios,
  deshabilitado,
  alGenerarVestuario,
  alEliminarVestuario,
  alAgregarVestuarioPersonalizado,
}: PropiedadesSeccionArmarioVestuario) {
  const [mostrarFormularioNuevo, setMostrarFormularioNuevo] =
    useState<boolean>(false);
  const [nuevoEscenario, setNuevoEscenario] = useState<string>("");
  const [nuevaDescripcionRopa, setNuevaDescripcionRopa] = useState<string>("");
  const [guardandoNuevo, setGuardandoNuevo] = useState<boolean>(false);

  async function manejarCrearPrenda(e: React.FormEvent) {
    e.preventDefault();
    if (
      !alAgregarVestuarioPersonalizado ||
      !nuevoEscenario.trim() ||
      !nuevaDescripcionRopa.trim()
    ) {
      return;
    }

    setGuardandoNuevo(true);
    try {
      await alAgregarVestuarioPersonalizado({
        escenarioOLugar: nuevoEscenario.trim(),
        descripcionVestuario: nuevaDescripcionRopa.trim(),
      });
      setNuevoEscenario("");
      setNuevaDescripcionRopa("");
      setMostrarFormularioNuevo(false);
    } finally {
      setGuardandoNuevo(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold text-amber-950">
            👗 Armario de Vestuario del Proyecto ({armarioVestuarios.length}{" "}
            atuendo(s)):
          </span>
          <p className="text-[11px] text-amber-800">
            Conserva el 100% del rostro y cuerpo del personaje. Si tu historia ocurre en distintos ambientes (trabajo, nieve, espacio, cocina, deporte, etc.), puedes añadir o quitar vestuarios aquí.
          </p>
        </div>

        {alAgregarVestuarioPersonalizado && (
          <button
            type="button"
            disabled={deshabilitado}
            onClick={() => setMostrarFormularioNuevo(!mostrarFormularioNuevo)}
            className="rounded-full border border-amber-300 bg-white hover:bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {mostrarFormularioNuevo
              ? "✕ Cerrar"
              : "➕ Añadir vestuario para otro escenario"}
          </button>
        )}
      </div>

      {/* Formulario rápido para añadir un vestuario de cualquier escenario */}
      {mostrarFormularioNuevo && (
        <form
          onSubmit={manejarCrearPrenda}
          className="rounded-xl border border-amber-300 bg-white p-3 space-y-2.5 animate-in fade-in"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                📍 ¿En qué lugar o situación se usa?
              </label>
              <input
                type="text"
                required
                value={nuevoEscenario}
                onChange={(e) => setNuevoEscenario(e.target.value)}
                placeholder="Ej: Cocina, Nieve, Espacio, Escuela, Fiesta..."
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                👕 ¿Qué ropa exacta debe llevar en ese lugar?
              </label>
              <input
                type="text"
                required
                value={nuevaDescripcionRopa}
                onChange={(e) => setNuevaDescripcionRopa(e.target.value)}
                placeholder="Ej: Abrigo rojo de invierno, gorro de lana azul y botas..."
                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={guardandoNuevo}
              className="rounded-full bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-1.5 text-xs shadow-xs cursor-pointer disabled:opacity-50"
            >
              {guardandoNuevo
                ? "⏳ Guardando..."
                : "💾 Guardar Vestuario en el Armario"}
            </button>
          </div>
        </form>
      )}

      {/* Tarjetas de cada vestuario */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {armarioVestuarios.map((prenda) => {
          const lugarLimpio = normalizarEtiquetaLugar(
            prenda.idVestuario,
            prenda.escenarioOLugar
          );
          const descripcionLimpia = normalizarDescripcionVestuario(
            prenda.idVestuario,
            prenda.descripcionVestuario
          );

          return (
            <div
              key={prenda.idVestuario}
              className="rounded-xl bg-white border border-amber-200 p-2.5 flex flex-col justify-between gap-2"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-950">
                    👕 {prenda.idVestuario}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 truncate max-w-44">
                    📍 {lugarLimpio}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 mt-1 line-clamp-2">
                  {descripcionLimpia}
                </p>
              </div>
              <div className="flex items-center justify-between gap-1.5 pt-1">
                {prenda.idVestuario !== "vestuario_base" &&
                alEliminarVestuario ? (
                  <button
                    type="button"
                    disabled={deshabilitado}
                    onClick={() => alEliminarVestuario(prenda.idVestuario)}
                    className="rounded-full border border-red-200 bg-red-50 hover:bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-700 cursor-pointer disabled:opacity-50"
                  >
                    🗑️ Quitar vestuario
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400">
                    Ropa original de la foto
                  </span>
                )}

                <button
                  type="button"
                  disabled={deshabilitado}
                  onClick={() => alGenerarVestuario(prenda.idVestuario)}
                  className="rounded-full border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-950 cursor-pointer disabled:opacity-50"
                >
                  🎨 Generar ({prenda.idVestuario})
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
