// Vista en tiempo real del estudio (/estudio/[id]) en colores claros que escucha los cambios del documento en la colección "proyectos".
// Se conecta con src/configuracion/cliente_firebase.ts, src/mesa_entrada/constantes_mesa_entrada.ts y src/app/estudio/[id]/page.tsx.

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import {
  COLECCION_PROYECTOS,
  FormatoVideo,
} from "@/mesa_entrada/constantes_mesa_entrada";

interface FichaProyectoFirestore {
  ideaOriginal: string;
  formato: FormatoVideo;
  imagenesReferencia: string[];
  estado: string;
}

interface PropiedadesVistaEstudio {
  proyectoId: string;
}

/**
 * Muestra la sala del estudio en tonos claros conectada en tiempo real a la ficha maestra del proyecto en Firestore.
 * Recibe el identificador único del proyecto desde la URL y devuelve la pantalla de seguimiento.
 */
export function VistaEstudioInicial({ proyectoId }: PropiedadesVistaEstudio) {
  const [proyecto, setProyecto] = useState<FichaProyectoFirestore | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Escuchamos en tiempo real el documento del proyecto dentro de la colección "proyectos"
  useEffect(() => {
    const estadoFirebase = verificarConfiguracionFirebase();
    if (!estadoFirebase.estaConfigurado) {
      setMensajeError(estadoFirebase.mensajeError);
      setCargando(false);
      return;
    }

    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(
      baseDeDatos,
      COLECCION_PROYECTOS,
      proyectoId
    );

    const cancelarSuscripcion = onSnapshot(
      referenciaDocumento,
      (instantanea) => {
        if (!instantanea.exists()) {
          setMensajeError(
            "No encontramos ningún proyecto con este código en Firebase Firestore."
          );
          setProyecto(null);
        } else {
          const datos = instantanea.data() as FichaProyectoFirestore;
          setProyecto(datos);
          setMensajeError(null);
        }
        setCargando(false);
      },
      () => {
        setMensajeError(
          "No se pudo conectar en tiempo real con Firebase Firestore. Revisa tu conexión o los permisos de lectura."
        );
        setCargando(false);
      }
    );

    return () => cancelarSuscripcion();
  }, [proyectoId]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 flex items-center justify-center p-4 sm:p-6">
      <section className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/70">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-6">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              Sala de Estudio en Tiempo Real
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
              Proyecto #{proyectoId}
            </h1>
          </div>

          <Link
            href="/"
            className="rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors"
          >
            ← Volver a la Mesa de Entrada
          </Link>
        </div>

        {cargando && (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-sm text-slate-600">
              Conectando en tiempo real con tu estudio...
            </p>
          </div>
        )}

        {!cargando && mensajeError && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
            {mensajeError}
          </div>
        )}

        {!cargando && proyecto && (
          <div className="space-y-6">
            {/* Indicador del estado actual en tiempo real */}
            <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-indigo-600 animate-pulse" />
                <div>
                  <p className="text-xs text-indigo-700 font-medium">
                    Estado actual del estudio
                  </p>
                  <p className="text-sm sm:text-base font-bold text-indigo-950">
                    {proyecto.estado}
                  </p>
                </div>
              </div>
              <span className="rounded-lg bg-white border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-900 shadow-2xs">
                Formato {proyecto.formato}
              </span>
            </div>

            {/* Idea original guardada en la ficha maestra */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Idea Original
              </h2>
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:text-base text-slate-800 whitespace-pre-wrap">
                {proyecto.ideaOriginal}
              </p>
            </div>

            {/* Imágenes de referencia subidas a Firebase Storage */}
            <div className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Imágenes de Referencia ({proyecto.imagenesReferencia?.length ?? 0})
              </h2>
              {proyecto.imagenesReferencia &&
              proyecto.imagenesReferencia.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {proyecto.imagenesReferencia.map((enlace, indice) => (
                    <a
                      key={enlace}
                      href={enlace}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50 hover:border-indigo-500 transition-colors shadow-xs"
                    >
                      <img
                        src={enlace}
                        alt={`Referencia ${indice + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">
                  Este proyecto se creó sin imágenes de referencia.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
