// Modal de galería visual conectado a "biblioteca_activos" para elegir personajes, productos o audios guardados con un clic.
// Se conecta con tipos_biblioteca.ts, gestor_biblioteca_activos.ts y ZonaImagenesReferencia.tsx.

"use client";

import React, { useEffect, useState } from "react";
import { listarActivosBibliotecaFirestore } from "./gestor_biblioteca_activos";
import {
  type ActivoBibliotecaGlobal,
  type CategoriaActivoBiblioteca,
} from "./tipos_biblioteca";

interface PropiedadesModalBibliotecaActivos {
  abierto: boolean;
  alCerrar: () => void;
  alSeleccionarActivos: (activosElegidos: ActivoBibliotecaGlobal[]) => void;
}

type FiltroBiblioteca = "todos" | CategoriaActivoBiblioteca;

/**
 * Muestra la galería interactiva de la Biblioteca Global de Activos Reutilizables.
 * Indica con la insignia "✨ Lámina 360° lista (Ahorro activo)" qué personajes o productos ya cuentan con lámina 360°.
 */
export function ModalBibliotecaActivos({
  abierto,
  alCerrar,
  alSeleccionarActivos,
}: PropiedadesModalBibliotecaActivos) {
  const [activos, setActivos] = useState<ActivoBibliotecaGlobal[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [filtroActivo, setFiltroActivo] = useState<FiltroBiblioteca>("todos");
  const [busqueda, setBusqueda] = useState<string>("");
  const [idsSeleccionados, setIdsSeleccionados] = useState<string[]>([]);

  useEffect(() => {
    if (!abierto) return;
    let cancelado = false;
    setCargando(true);
    setIdsSeleccionados([]);

    listarActivosBibliotecaFirestore()
      .then((lista) => {
        if (!cancelado) setActivos(lista);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [abierto]);

  if (!abierto) return null;

  const activosFiltrados = activos.filter((item) => {
    const pasaCategoria =
      filtroActivo === "todos" || item.categoriaActivo === filtroActivo;
    const pasaBusqueda =
      busqueda.trim().length === 0 ||
      item.nombre.toLowerCase().includes(busqueda.trim().toLowerCase());
    return pasaCategoria && pasaBusqueda;
  });

  function alternarSeleccion(idActivo: string) {
    setIdsSeleccionados((previos) =>
      previos.includes(idActivo)
        ? previos.filter((id) => id !== idActivo)
        : [...previos, idActivo]
    );
  }

  function confirmarSeleccion() {
    const elegidos = activos.filter((item) =>
      idsSeleccionados.includes(item.id)
    );
    if (elegidos.length > 0) {
      alSeleccionarActivos(elegidos);
    }
    alCerrar();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Biblioteca de Personajes, Productos y Audios guardados"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4"
      onClick={alCerrar}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-purple-50 px-5 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
              Biblioteca Global Reutilizable · Deduplicación SHA-256
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              📚 Elegir de Mi Biblioteca (Personajes y Productos guardados)
            </h2>
            <p className="text-xs text-slate-500">
              Reutiliza personajes recurrentes, productos o canciones al instante sin volver a subir archivos ni pagar otra vez por sus Láminas 360°.
            </p>
          </div>
          <button
            type="button"
            onClick={alCerrar}
            className="h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Barra de filtros y búsqueda */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "todos", etiqueta: "Todos" },
                { id: "personaje", etiqueta: "👤 Personajes" },
                { id: "producto", etiqueta: "📦 Productos" },
                { id: "audio", etiqueta: "🎵 Audios" },
              ] as Array<{ id: FiltroBiblioteca; etiqueta: string }>
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFiltroActivo(tab.id)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-colors cursor-pointer ${
                  filtroActivo === tab.id
                    ? "bg-indigo-600 text-white shadow-2xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.etiqueta}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar (ej. Leo, Mia, Doctora)..."
            className="rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none w-52"
          />
        </div>

        {/* Cuerpo de la galería */}
        <div className="p-5 overflow-y-auto flex-1">
          {cargando ? (
            <div className="py-12 text-center space-y-2">
              <div className="mx-auto h-7 w-7 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">
                Cargando tus personajes, productos y audios guardados...
              </p>
            </div>
          ) : activosFiltrados.length === 0 ? (
            <div className="py-12 text-center space-y-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6">
              <span className="text-3xl">🗂️</span>
              <p className="text-sm font-bold text-slate-700">
                No hay activos en esta vista todavía
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Cada vez que subas una imagen, personaje, producto o canción desde tu equipo, se guardará automáticamente aquí con huella digital anti-duplicados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
              {activosFiltrados.map((activo) => {
                const seleccionado = idsSeleccionados.includes(activo.id);
                const cantidadLaminas = activo.laminas360PorVestuario
                  ? Object.keys(activo.laminas360PorVestuario).length
                  : 0;
                const tieneLamina360 = cantidadLaminas > 0;

                return (
                  <div
                    key={activo.id}
                    onClick={() => alternarSeleccion(activo.id)}
                    className={`group relative rounded-2xl border p-2.5 transition-all cursor-pointer flex flex-col justify-between ${
                      seleccionado
                        ? "border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/30 shadow-md"
                        : "border-slate-200 bg-white hover:border-indigo-300 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                        {activo.tipo === "imagen" ? (
                          <img
                            src={activo.url}
                            alt={activo.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            <span className="text-3xl">
                              {activo.tipo === "audio" ? "🎵" : "🎬"}
                            </span>
                            {activo.duracionSegundos && (
                              <span className="mt-1 rounded bg-slate-800 text-white px-1.5 py-0.5 text-[10px] font-mono">
                                {Math.round(activo.duracionSegundos)}s
                              </span>
                            )}
                          </div>
                        )}

                        {/* Checkbox de selección */}
                        <div
                          className={`absolute top-2 right-2 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold shadow-xs ${
                            seleccionado
                              ? "bg-indigo-600 text-white"
                              : "bg-white/90 text-slate-400 border border-slate-200"
                          }`}
                        >
                          ✓
                        </div>

                        {/* Insignia de categoría */}
                        <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/70 text-white px-1.5 py-0.5 text-[9px] font-bold uppercase">
                          {activo.categoriaActivo}
                        </span>
                      </div>

                      <p
                        title={activo.nombre}
                        className="mt-2 text-xs font-bold text-slate-800 truncate"
                      >
                        {activo.nombre}
                      </p>
                    </div>

                    {/* Insignia de Ahorro Activo si ya tiene Lámina 360° */}
                    <div className="mt-2 space-y-1">
                      {tieneLamina360 ? (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 leading-tight">
                          ✨ Lámina 360° lista (Ahorro activo)
                        </div>
                      ) : activo.fichaIdentidadBase ? (
                        <div className="rounded-lg border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-800">
                          🧬 Identidad analizada
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          Guardado en Biblioteca
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pie del modal */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3.5">
          <span className="text-xs font-semibold text-slate-600">
            {idsSeleccionados.length === 0
              ? "Haz clic sobre uno o varios elementos para seleccionarlos"
              : `${idsSeleccionados.length} activo(s) seleccionado(s)`}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={alCerrar}
              className="rounded-full border border-slate-300 bg-white hover:bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={idsSeleccionados.length === 0}
              onClick={confirmarSeleccion}
              className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-1.5 text-xs font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-40"
            >
              Agregar a mi proyecto ({idsSeleccionados.length}) →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
