// Zona interactiva en colores claros para arrastrar y soltar hasta 4 imágenes de referencia con vista previa pequeña.
// Se conecta con constantes_mesa_entrada.ts, validar_entrada_proyecto.ts y se muestra dentro de MesaDeEntrada.tsx.

"use client";

import React, { useRef, useState } from "react";
import {
  MAXIMO_IMAGENES_REFERENCIA,
  TIPOS_IMAGEN_PERMITIDOS,
} from "./constantes_mesa_entrada";
import { validarImagenesReferencia } from "./validar_entrada_proyecto";

export interface ImagenConVistaPrevia {
  archivo: File;
  urlVistaPrevia: string;
}

interface PropiedadesZonaImagenes {
  imagenesCargadas: ImagenConVistaPrevia[];
  alCambiarImagenes: (nuevasImagenes: ImagenConVistaPrevia[]) => void;
  alOcurrirError: (mensaje: string | null) => void;
  deshabilitado: boolean;
}

/**
 * Muestra el recuadro claro para arrastrar o elegir hasta 4 fotos y dibuja las miniaturas de vista previa.
 * Recibe las fotos actuales y las funciones para actualizar la lista o mostrar errores, y devuelve la zona visual.
 */
export function ZonaImagenesReferencia({
  imagenesCargadas,
  alCambiarImagenes,
  alOcurrirError,
  deshabilitado,
}: PropiedadesZonaImagenes) {
  const [estaArrastrandoSobreZona, setEstaArrastrandoSobreZona] =
    useState(false);
  const referenciaInputArchivo = useRef<HTMLInputElement | null>(null);

  /**
   * Procesa los archivos que el usuario soltó o seleccionó, comprueba que sean válidos y crea sus vistas previas.
   * Recibe la lista de archivos del navegador y actualiza el estado con las fotos aprobadas.
   */
  function agregarArchivosNuevos(listaArchivosNuevos: FileList | null) {
    if (!listaArchivosNuevos || listaArchivosNuevos.length === 0) {
      return;
    }

    const archivosNuevos = Array.from(listaArchivosNuevos);
    const todosLosArchivos = [
      ...imagenesCargadas.map((item) => item.archivo),
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

    alCambiarImagenes([...imagenesCargadas, ...nuevasConMiniatura]);
  }

  /**
   * Elimina una imagen de la lista cuando el usuario pulsa la "X" sobre su vista previa pequeña.
   * Recibe la posición de la foto a quitar y libera su memoria temporal del navegador.
   */
  function quitarImagenPorIndice(indiceAQuitar: number) {
    const imagenAQuitar = imagenesCargadas[indiceAQuitar];
    if (imagenAQuitar) {
      URL.revokeObjectURL(imagenAQuitar.urlVistaPrevia);
    }

    const listaActualizada = imagenesCargadas.filter(
      (_, indice) => indice !== indiceAQuitar
    );
    alCambiarImagenes(listaActualizada);
    alOcurrirError(null);
  }

  const cupoCompleto = imagenesCargadas.length >= MAXIMO_IMAGENES_REFERENCIA;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-slate-800">
          3. Imágenes de referencia{" "}
          <span className="text-slate-500 font-normal">
            (personajes, productos o estilos)
          </span>
        </label>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
          {imagenesCargadas.length} / {MAXIMO_IMAGENES_REFERENCIA} fotos
        </span>
      </div>

      {/* Zona clara para arrastrar y soltar o hacer clic */}
      <div
        onDragOver={(evento) => {
          evento.preventDefault();
          if (!deshabilitado && !cupoCompleto) {
            setEstaArrastrandoSobreZona(true);
          }
        }}
        onDragLeave={() => setEstaArrastrandoSobreZona(false)}
        onDrop={(evento) => {
          evento.preventDefault();
          setEstaArrastrandoSobreZona(false);
          if (!deshabilitado && !cupoCompleto) {
            agregarArchivosNuevos(evento.dataTransfer.files);
          }
        }}
        onClick={() => {
          if (!deshabilitado && !cupoCompleto) {
            referenciaInputArchivo.current?.click();
          }
        }}
        className={`rounded-xl border-2 border-dashed p-5 text-center transition-all ${
          deshabilitado || cupoCompleto
            ? "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed"
            : estaArrastrandoSobreZona
            ? "border-indigo-500 bg-indigo-50 text-indigo-900 cursor-pointer"
            : "border-slate-300 bg-slate-50/70 text-slate-700 hover:border-indigo-400 hover:bg-indigo-50/40 cursor-pointer"
        }`}
      >
        <input
          ref={referenciaInputArchivo}
          type="file"
          multiple
          accept={TIPOS_IMAGEN_PERMITIDOS.join(",")}
          disabled={deshabilitado || cupoCompleto}
          onChange={(evento) => {
            agregarArchivosNuevos(evento.target.files);
            evento.target.value = "";
          }}
          className="hidden"
        />

        <p className="text-sm font-medium">
          {cupoCompleto
            ? "Ya cargaste el máximo de 4 imágenes de referencia"
            : "Arrastra y suelta tus imágenes aquí, o haz clic para elegirlas"}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Hasta {MAXIMO_IMAGENES_REFERENCIA} fotos en formato JPG, PNG o WEBP
          (máximo 10 MB cada una)
        </p>
      </div>

      {/* Vistas previas pequeñas de cada foto cargada */}
      {imagenesCargadas.length > 0 && (
        <div className="grid grid-cols-4 gap-3 pt-1">
          {imagenesCargadas.map((item, indice) => (
            <div
              key={`${item.archivo.name}-${indice}`}
              className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white shadow-xs"
            >
              <img
                src={item.urlVistaPrevia}
                alt={`Referencia ${indice + 1}: ${item.archivo.name}`}
                className="w-full h-full object-cover"
              />
              {!deshabilitado && (
                <button
                  type="button"
                  onClick={() => quitarImagenPorIndice(indice)}
                  title="Quitar esta foto"
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-red-600 hover:text-white text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                >
                  ✕
                </button>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-xs border-t border-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700 font-medium truncate">
                {item.archivo.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
