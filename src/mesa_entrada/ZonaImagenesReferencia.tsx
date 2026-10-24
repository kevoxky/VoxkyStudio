// Gestiona los archivos multimedia de referencia (imagen, audio y video): muestra sus tarjetas arriba y el botón "+" abajo.
// Se conecta con constantes_mesa_entrada.ts, validar_entrada_proyecto.ts y se integra dentro de MesaDeEntrada.tsx.

"use client";

import React, { useRef } from "react";
import {
  ACEPTAR_ARCHIVOS_MULTIMEDIA_INPUT,
  type TipoArchivoReferencia,
} from "./constantes_mesa_entrada";
import {
  detectarTipoArchivoMultimedia,
  validarImagenesReferencia,
} from "./validar_entrada_proyecto";

export interface ImagenConVistaPrevia {
  archivo: File;
  tipo: TipoArchivoReferencia;
  urlVistaPrevia: string;
}

interface PropiedadesFilaMiniaturas {
  imagenesCargadas: ImagenConVistaPrevia[];
  alQuitarImagen: (indiceAQuitar: number) => void;
  deshabilitado: boolean;
}

interface PropiedadesBotonAdjuntar {
  alSeleccionarArchivos: (archivos: FileList | null) => void;
  deshabilitado: boolean;
}

/**
 * Valida los archivos de imagen, audio o video que el usuario adjuntó y los añade a la fila superior con su tipo.
 * Recibe la lista actual, los nuevos archivos y las funciones de estado, y actualiza la fila o muestra un error.
 */
export function agregarImagenesReferenciaValidas(
  imagenesActuales: ImagenConVistaPrevia[],
  listaArchivosNuevos: FileList | null,
  alCambiarImagenes: (nuevasImagenes: ImagenConVistaPrevia[]) => void,
  alOcurrirError: (mensaje: string | null) => void
): void {
  if (!listaArchivosNuevos || listaArchivosNuevos.length === 0) {
    return;
  }

  const archivosNuevos = Array.from(listaArchivosNuevos);
  const todosLosArchivos = [
    ...imagenesActuales.map((item) => item.archivo),
    ...archivosNuevos,
  ];

  const resultadoValidacion = validarImagenesReferencia(todosLosArchivos);
  if (!resultadoValidacion.esValido) {
    alOcurrirError(resultadoValidacion.mensajeError);
    return;
  }

  alOcurrirError(null);

  const nuevasConMiniatura: ImagenConVistaPrevia[] = archivosNuevos.map(
    (archivo) => {
      const tipoDetectado = detectarTipoArchivoMultimedia(archivo) ?? "imagen";
      return {
        archivo,
        tipo: tipoDetectado,
        urlVistaPrevia: URL.createObjectURL(archivo),
      };
    }
  );

  alCambiarImagenes([...imagenesActuales, ...nuevasConMiniatura]);
}

/**
 * Muestra la fila superior con miniaturas de fotos, tarjetas de canciones (audio) o clips de video adjuntados.
 * Recibe la lista de archivos cargados y la función para quitar cualquiera de ellos, y devuelve la fila visual.
 */
export function FilaMiniaturasReferencia({
  imagenesCargadas,
  alQuitarImagen,
  deshabilitado,
}: PropiedadesFilaMiniaturas) {
  if (imagenesCargadas.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-2 pb-1">
      {imagenesCargadas.map((item, indice) => (
        <div
          key={`${item.archivo.name}-${indice}`}
          className={`relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs shrink-0 ${
            item.tipo === "audio" ? "h-14 px-3 flex items-center gap-2" : "w-14 h-14"
          }`}
        >
          {item.tipo === "imagen" && (
            <img
              src={item.urlVistaPrevia}
              alt={`Referencia ${indice + 1}: ${item.archivo.name}`}
              className="w-full h-full object-cover"
            />
          )}

          {item.tipo === "audio" && (
            <div className="flex items-center gap-2 pr-4 max-w-44">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-sm shrink-0">
                🎵
              </span>
              <div className="truncate">
                <p className="text-[11px] font-bold text-slate-800 truncate">
                  {item.archivo.name}
                </p>
                <p className="text-[10px] text-indigo-600 font-medium">
                  Audio / Canción
                </p>
              </div>
            </div>
          )}

          {item.tipo === "video" && (
            <div className="w-full h-full relative bg-slate-900 flex items-center justify-center">
              <video
                src={item.urlVistaPrevia}
                muted
                className="w-full h-full object-cover opacity-85"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white">
                🎬 Video
              </span>
            </div>
          )}

          {!deshabilitado && (
            <button
              type="button"
              onClick={() => alQuitarImagen(indice)}
              title={`Quitar ${item.archivo.name}`}
              className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-900/80 text-white hover:bg-red-600 text-[10px] font-bold flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Muestra el botón "+" en la barra inferior para adjuntar imágenes (.jpg, .png, .webp), audios (.mp3, .wav, .m4a) o videos (.mp4, .mov, .webm).
 * Recibe la función que procesa los archivos seleccionados y devuelve el botón con su selector oculto.
 */
export function BotonAdjuntarImagenes({
  alSeleccionarArchivos,
  deshabilitado,
}: PropiedadesBotonAdjuntar) {
  const referenciaInputArchivo = useRef<HTMLInputElement | null>(null);

  return (
    <>
      <input
        ref={referenciaInputArchivo}
        type="file"
        multiple
        accept={ACEPTAR_ARCHIVOS_MULTIMEDIA_INPUT}
        disabled={deshabilitado}
        onChange={(evento) => {
          alSeleccionarArchivos(evento.target.files);
          evento.target.value = "";
        }}
        className="hidden"
      />
      <button
        type="button"
        disabled={deshabilitado}
        onClick={() => referenciaInputArchivo.current?.click()}
        title="Adjuntar imágenes (.jpg, .png, .webp), canción/audio (.mp3, .wav, .m4a) o video (.mp4, .mov, .webm)"
        aria-label="Adjuntar archivos multimedia de referencia"
        className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-lg font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        +
      </button>
    </>
  );
}
