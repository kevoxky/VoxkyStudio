// Gestiona las imágenes de referencia sin límite de 4 fotos: muestra la fila de miniaturas arriba y el botón "+" en la barra inferior.
// Se conecta con constantes_mesa_entrada.ts, validar_entrada_proyecto.ts y se integra dentro de MesaDeEntrada.tsx.

"use client";

import React, { useRef } from "react";
import { TIPOS_IMAGEN_PERMITIDOS } from "./constantes_mesa_entrada";
import { validarImagenesReferencia } from "./validar_entrada_proyecto";

export interface ImagenConVistaPrevia {
  archivo: File;
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
 * Valida los archivos de imagen que el usuario adjuntó o arrastró y los suma a la lista actual con su miniatura.
 * Recibe los archivos actuales, los nuevos archivos y las funciones de estado, y actualiza la galería o muestra un error.
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
    (archivo) => ({
      archivo,
      urlVistaPrevia: URL.createObjectURL(archivo),
    })
  );

  alCambiarImagenes([...imagenesActuales, ...nuevasConMiniatura]);
}

/**
 * Muestra la fila de miniaturas en la parte superior de la caja de entrada cuando el usuario adjunta imágenes.
 * Recibe la lista de fotos cargadas y la función para quitar cualquiera de ellas, y devuelve las vistas previas.
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
          className="relative group w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs shrink-0"
        >
          <img
            src={item.urlVistaPrevia}
            alt={`Referencia ${indice + 1}: ${item.archivo.name}`}
            className="w-full h-full object-cover"
          />
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
 * Muestra el botón "+" en la esquina inferior izquierda de la barra para adjuntar imágenes de referencia.
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
        accept={TIPOS_IMAGEN_PERMITIDOS.join(",")}
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
        title="Adjuntar imágenes de referencia (o arrástralas a la caja)"
        aria-label="Adjuntar imágenes de referencia"
        className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-slate-100/90 hover:bg-slate-200/80 text-slate-700 text-lg font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        +
      </button>
    </>
  );
}
