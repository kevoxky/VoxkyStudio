// Sección "📂 Mis Proyectos Recientes" en la página principal: muestra tarjetas en tiempo real con opción de continuar o eliminar.
// Se conecta con cliente_firebase.ts, constantes_mesa_entrada.ts, tipos_productor_ejecutivo.ts y se muestra en page.tsx / MesaDeEntrada.tsx.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { deleteObject, listAll, ref } from "firebase/storage";
import {
  obtenerAlmacenamientoStorage,
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import {
  type ArchivoMultimediaGuardado,
  CARPETA_STORAGE_REFERENCIAS,
  COLECCION_PROYECTOS,
  type FormatoVideo,
  MODELOS_IMAGEN_FAL,
  MODELOS_VIDEO_FAL,
} from "./constantes_mesa_entrada";
import {
  CATALOGO_CATEGORIAS_PRODUCCION,
  type CategoriaProduccion,
} from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";

interface FichaResumenHistorial {
  id: string;
  ideaOriginal: string;
  formato: FormatoVideo;
  estado: string;
  modeloImagenNombre: string;
  modeloVideoNombre: string;
  primeraImagenUrl: string | null;
  categoriaPrincipal?: CategoriaProduccion;
  fechaTexto: string;
}

/**
 * Obtiene el nombre comercial corto de un modelo de imagen o video en fal.ai a partir de su ID.
 * Recibe el ID del modelo y devuelve el nombre comercial limpio.
 */
function obtenerNombreModeloCorto(idModelo: string | undefined): string {
  if (!idModelo) return "Estándar";
  const todos = [...MODELOS_IMAGEN_FAL, ...MODELOS_VIDEO_FAL];
  const encontrado = todos.find((m) => m.id === idModelo);
  return encontrado ? encontrado.nombre : idModelo;
}

/**
 * Formatea la fecha de creación de Firestore en un texto amigable en español (ej. "Hoy, 19:40" o "24 oct, 18:30").
 * Recibe el valor crudo de fechaCreacion y devuelve el texto formateado.
 */
function formatearFechaCreacion(fechaCruda: unknown): string {
  try {
    const ts = fechaCruda as Timestamp | undefined;
    const fecha = ts && typeof ts.toDate === "function" ? ts.toDate() : null;
    if (!fecha) return "Reciente";

    const ahora = new Date();
    const esHoy =
      fecha.getDate() === ahora.getDate() &&
      fecha.getMonth() === ahora.getMonth() &&
      fecha.getFullYear() === ahora.getFullYear();

    const hora = fecha.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    if (esHoy) return `Hoy, ${hora}`;

    const diaMes = fecha.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    return `${diaMes}, ${hora}`;
  } catch {
    return "Reciente";
  }
}

/**
 * Traduce el estado técnico de Firestore a una etiqueta clara para la tarjeta del historial.
 * Recibe el estado del documento y devuelve su título y colores.
 */
function obtenerEtiquetaEstadoHistorial(estado: string): {
  titulo: string;
  clases: string;
} {
  switch (estado) {
    case "analizando_idea":
      return {
        titulo: "Analizando idea",
        clases: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "esperando_clarificacion":
      return {
        titulo: "Esperando clarificación",
        clases: "border-violet-200 bg-violet-50 text-violet-800",
      };
    case "listo_para_guion":
      return {
        titulo: "Listo para guion",
        clases: "border-sky-200 bg-sky-50 text-sky-800",
      };
    case "esperando_aprobacion_guion":
      return {
        titulo: "En Storyboard",
        clases: "border-indigo-200 bg-indigo-50 text-indigo-800",
      };
    case "listo_para_imagenes":
    case "completado":
      return {
        titulo: estado === "completado" ? "Completado" : "Listo para imágenes",
        clases: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    default:
      return {
        titulo: estado,
        clases: "border-slate-200 bg-slate-100 text-slate-700",
      };
  }
}

/**
 * Muestra la sección "📂 Mis Proyectos Recientes" en tiempo real con botones para continuar o eliminar cada proyecto.
 * No recibe parámetros y mantiene sincronizada la colección "proyectos" de Firestore.
 */
export function HistorialProyectos() {
  const [proyectos, setProyectos] = useState<FichaResumenHistorial[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [idConfirmandoEliminar, setIdConfirmandoEliminar] = useState<
    string | null
  >(null);
  const [idEliminando, setIdEliminando] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  useEffect(() => {
    const estadoFirebase = verificarConfiguracionFirebase();
    if (!estadoFirebase.estaConfigurado) {
      setCargando(false);
      return;
    }

    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const consulta = query(
      collection(baseDeDatos, COLECCION_PROYECTOS),
      orderBy("fechaCreacion", "desc"),
      limit(18)
    );

    const cancelarSuscripcion = onSnapshot(
      consulta,
      (instantanea) => {
        const lista: FichaResumenHistorial[] = instantanea.docs.map(
          (docSnap) => {
            const datos = docSnap.data() as {
              ideaOriginal?: string;
              formato?: FormatoVideo;
              estado?: string;
              modeloImagen?: string;
              modeloVideo?: string;
              imagenesReferencia?: string[];
              archivosMultimedia?: ArchivoMultimediaGuardado[];
              analisisProductorEjecutivo?: {
                categoriaPrincipal?: CategoriaProduccion;
              };
              fechaCreacion?: unknown;
            };

            const primeraFotoMultimedia = (
              datos.archivosMultimedia ?? []
            ).find((a) => a.tipo === "imagen")?.url;
            const primeraImagenUrl =
              primeraFotoMultimedia ?? datos.imagenesReferencia?.[0] ?? null;

            return {
              id: docSnap.id,
              ideaOriginal:
                datos.ideaOriginal?.trim() || "Proyecto sin descripción",
              formato: datos.formato ?? "16:9",
              estado: datos.estado ?? "analizando_idea",
              modeloImagenNombre: obtenerNombreModeloCorto(datos.modeloImagen),
              modeloVideoNombre: obtenerNombreModeloCorto(datos.modeloVideo),
              primeraImagenUrl,
              categoriaPrincipal:
                datos.analisisProductorEjecutivo?.categoriaPrincipal,
              fechaTexto: formatearFechaCreacion(datos.fechaCreacion),
            };
          }
        );

        setProyectos(lista);
        setCargando(false);
      },
      () => {
        setCargando(false);
      }
    );

    return () => cancelarSuscripcion();
  }, []);

  /**
   * Elimina el documento del proyecto en Firestore (proyectos/{id}) e intenta limpiar sus archivos en Firebase Storage (referencias/{id}/).
   * Recibe el ID del proyecto confirmado por el usuario.
   */
  async function confirmarEliminacionProyecto(proyectoId: string) {
    setErrorEliminar(null);
    setIdEliminando(proyectoId);

    try {
      const baseDeDatos = obtenerBaseDeDatosFirestore();
      await deleteDoc(doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId));

      // Intentamos limpiar la carpeta referencias/{proyectoId}/ en Firebase Storage sin bloquear si no tenía archivos allí
      try {
        const almacenamiento = obtenerAlmacenamientoStorage();
        const carpetaRef = ref(
          almacenamiento,
          `${CARPETA_STORAGE_REFERENCIAS}/${proyectoId}`
        );
        const listado = await listAll(carpetaRef);
        await Promise.all(
          listado.items.map((archivoRef) => deleteObject(archivoRef))
        );
      } catch {
        // Si los archivos estaban en fal.storage o la carpeta ya estaba vacía, continuamos sin error
      }

      setIdConfirmandoEliminar(null);
    } catch (error) {
      setErrorEliminar(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar el proyecto de Firestore."
      );
    } finally {
      setIdEliminando(null);
    }
  }

  if (cargando || proyectos.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Mis Proyectos Recientes"
      className="w-full max-w-4xl mx-auto pt-4 space-y-3.5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h2 className="text-sm sm:text-base font-bold text-slate-800">
          📂 Mis Proyectos Recientes ({proyectos.length})
        </h2>
        <span className="text-xs text-slate-500">
          Continúa donde quedaste o administra tu historial en tiempo real
        </span>
      </div>

      {errorEliminar && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700">
          {errorEliminar}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {proyectos.map((proy) => {
          const infoCat = proy.categoriaPrincipal
            ? CATALOGO_CATEGORIAS_PRODUCCION[proy.categoriaPrincipal]
            : null;
          const etiquetaEstado = obtenerEtiquetaEstadoHistorial(proy.estado);
          const pidiendoConfirmacion = idConfirmandoEliminar === proy.id;
          const estaEliminandoEste = idEliminando === proy.id;

          return (
            <article
              key={proy.id}
              className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-3.5"
            >
              {/* Parte superior: Miniatura o ícono de categoría + Idea original y fecha */}
              <div className="flex items-start gap-3">
                {proy.primeraImagenUrl ? (
                  <img
                    src={proy.primeraImagenUrl}
                    alt="Miniatura del proyecto"
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl shrink-0">
                    {infoCat?.icono ?? "🎬"}
                  </div>
                )}

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-indigo-700 truncate">
                      {infoCat
                        ? `${infoCat.icono} ${infoCat.titulo}`
                        : "🎬 Producción Audiovisual"}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {proy.fechaTexto}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-slate-800 line-clamp-2 leading-snug">
                    {proy.ideaOriginal}
                  </p>
                </div>
              </div>

              {/* Etiquetas técnicas: Estado actual, Formato y Motores elegidos */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${etiquetaEstado.clases}`}
                >
                  {etiquetaEstado.titulo}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                  {proy.formato}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-900">
                  🖼️ {proy.modeloImagenNombre}
                </span>
                <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[10px] font-semibold text-sky-900">
                  🎥 {proy.modeloVideoNombre}
                </span>
              </div>

              {/* Dos botones de acción: Continuar proyecto y Eliminar con confirmación rápida */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {!pidiendoConfirmacion ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIdConfirmandoEliminar(proy.id)}
                      className="rounded-full border border-slate-200 bg-slate-50 hover:bg-red-50 hover:border-red-200 hover:text-red-700 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                    >
                      🗑️ Eliminar
                    </button>

                    <Link
                      href={`/estudio/${proy.id}`}
                      className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 text-xs font-bold shadow-2xs transition-colors"
                    >
                      Continuar proyecto →
                    </Link>
                  </>
                ) : (
                  <div className="w-full flex flex-wrap items-center justify-between gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-1.5">
                    <span className="text-[11px] font-bold text-red-800">
                      ¿Seguro que deseas eliminar este proyecto?
                    </span>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        type="button"
                        disabled={estaEliminandoEste}
                        onClick={() => setIdConfirmandoEliminar(null)}
                        className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={estaEliminandoEste}
                        onClick={() => confirmarEliminacionProyecto(proy.id)}
                        className="rounded-full bg-red-600 hover:bg-red-500 text-white px-3 py-1 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                      >
                        {estaEliminandoEste ? "Eliminando..." : "Sí, eliminar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
