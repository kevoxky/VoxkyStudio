// Interfaz principal en colores claros de la Parte 1 (Mesa de Entrada): un único contenedor centrado con los 4 elementos esenciales.
// Se conecta con SelectorFormatoVideo.tsx, ZonaImagenesReferencia.tsx, crear_documento_proyecto.ts y redirige a /estudio/[id].

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { obtenerClienteFalSeguro } from "@/configuracion/cliente_fal";
import {
  FORMATO_VERTICAL,
  FormatoVideo,
  TEXTO_BOTON_COMENZAR,
  TEXTO_CARGA_ESTUDIO,
} from "./constantes_mesa_entrada";
import { SelectorFormatoVideo } from "./SelectorFormatoVideo";
import {
  ImagenConVistaPrevia,
  ZonaImagenesReferencia,
} from "./ZonaImagenesReferencia";
import { crearProyectoEnFirestore } from "./crear_documento_proyecto";

/**
 * Muestra el contenedor centrado en tonos claros de la Mesa de Entrada, coordina el guardado en Firebase y redirige al estudio.
 * No recibe propiedades externas y devuelve la pantalla principal interactiva.
 */
export function MesaDeEntrada() {
  const enrutador = useRouter();

  const [ideaOriginal, setIdeaOriginal] = useState<string>("");
  const [formatoSeleccionado, setFormatoSeleccionado] =
    useState<FormatoVideo>(FORMATO_VERTICAL);
  const [imagenesCargadas, setImagenesCargadas] = useState<
    ImagenConVistaPrevia[]
  >([]);
  const [estaGuardando, setEstaGuardando] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  // Al abrir la aplicación, configuramos el puente seguro de fal.ai hacia /api/fal/proxy
  useEffect(() => {
    obtenerClienteFalSeguro();
  }, []);

  /**
   * Se ejecuta al presionar "Comenzar Producción": sube las fotos, guarda el proyecto en Firestore y redirige.
   * Recibe el evento del formulario y navega automáticamente a /estudio/[id].
   */
  async function manejarEnvioProduccion(
    evento: React.FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();
    setMensajeError(null);
    setEstaGuardando(true);

    try {
      const archivosParaSubir = imagenesCargadas.map((item) => item.archivo);

      const nuevoProyectoId = await crearProyectoEnFirestore({
        ideaOriginal,
        formato: formatoSeleccionado,
        archivosReferencia: archivosParaSubir,
      });

      // Redirigimos automáticamente a la vista del estudio en tiempo real
      enrutador.push(`/estudio/${nuevoProyectoId}`);
    } catch (error) {
      const textoExplicativo =
        error instanceof Error
          ? error.message
          : "Ocurrió un problema inesperado al preparar tu estudio. Inténtalo de nuevo.";

      setMensajeError(textoExplicativo);
      setEstaGuardando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 flex items-center justify-center p-4 sm:p-6">
      {/* Único contenedor centrado de la Mesa de Entrada en colores claros */}
      <section className="w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/70">
        <header className="mb-6 text-center">
          <span className="inline-block rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 mb-2">
            VoxkyStudio · Mesa de Entrada
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Nueva Producción Audiovisual
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Describe tu idea, elige el formato y añade tus referencias visuales.
          </p>
        </header>

        <form onSubmit={manejarEnvioProduccion} className="space-y-6">
          {/* Elemento 1: Caja de texto amplia donde el usuario escribe la idea de su video */}
          <div className="space-y-2">
            <label
              htmlFor="idea-video"
              className="block text-sm font-semibold text-slate-800"
            >
              1. Idea de tu video
            </label>
            <textarea
              id="idea-video"
              rows={5}
              value={ideaOriginal}
              disabled={estaGuardando}
              onChange={(evento) => {
                setIdeaOriginal(evento.target.value);
                if (mensajeError) setMensajeError(null);
              }}
              placeholder="Escribe aquí tu idea con detalle: de qué trata el video, qué atmósfera buscas, quién aparece y qué quieres transmitir..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50/60 p-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-3 focus:ring-indigo-500/15 disabled:opacity-50 resize-y transition-colors"
            />
          </div>

          {/* Elemento 2: Selector visual simple para elegir Vertical (9:16) u Horizontal (16:9) */}
          <SelectorFormatoVideo
            formatoSeleccionado={formatoSeleccionado}
            alCambiarFormato={setFormatoSeleccionado}
            deshabilitado={estaGuardando}
          />

          {/* Elemento 3: Zona para arrastrar y soltar hasta 4 imágenes de referencia con vista previa pequeña */}
          <ZonaImagenesReferencia
            imagenesCargadas={imagenesCargadas}
            alCambiarImagenes={setImagenesCargadas}
            alOcurrirError={setMensajeError}
            deshabilitado={estaGuardando}
          />

          {/* Aviso claro en español si ocurre algún problema de validación o de conexión */}
          {mensajeError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {mensajeError}
            </div>
          )}

          {/* Elemento 4: Botón principal llamativo "Comenzar Producción" con indicador amigable de carga */}
          <button
            type="submit"
            disabled={estaGuardando}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:via-violet-500 hover:to-indigo-500 text-white font-semibold py-4 px-6 text-base shadow-lg shadow-indigo-500/25 transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
          >
            {estaGuardando ? (
              <>
                <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                <span>{TEXTO_CARGA_ESTUDIO}</span>
              </>
            ) : (
              <span>{TEXTO_BOTON_COMENZAR}</span>
            )}
          </button>
        </form>
      </section>
    </main>
  );
}
