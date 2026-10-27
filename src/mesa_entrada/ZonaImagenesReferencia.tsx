// Gestiona los archivos multimedia de referencia: muestra tarjetas arriba, menú "+" con Biblioteca Global y subida anti-duplicados.
// Se conecta con constantes_mesa_entrada.ts, validar_entrada_proyecto.ts, ModalBibliotecaActivos.tsx y MesaDeEntrada.tsx.

"use client";

import React, { useRef, useState } from "react";
import { ModalBibliotecaActivos } from "@/biblioteca/ModalBibliotecaActivos";
import { type ActivoBibliotecaGlobal } from "@/biblioteca/tipos_biblioteca";
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
  duracionSegundos?: number;
  activoBiblioteca?: ActivoBibliotecaGlobal;
}

/**
 * Lee la duración real en segundos de un archivo de audio o video usando HTMLAudioElement / HTMLVideoElement en el navegador.
 * Recibe el tipo de archivo y su URL temporal, y devuelve la duración redondeada a 1 decimal (ej. 125.0).
 */
export function leerDuracionMultimediaEnNavegador(
  tipo: TipoArchivoReferencia,
  urlObjeto: string
): Promise<number | undefined> {
  if (
    typeof window === "undefined" ||
    (tipo !== "audio" && tipo !== "video")
  ) {
    return Promise.resolve(undefined);
  }

  return new Promise((resolver) => {
    const elemento = document.createElement(
      tipo === "audio" ? "audio" : "video"
    );
    elemento.preload = "metadata";

    const temporizador = setTimeout(() => {
      limpiar();
      resolver(undefined);
    }, 5_000);

    function limpiar() {
      clearTimeout(temporizador);
      elemento.onloadedmetadata = null;
      elemento.onerror = null;
      elemento.src = "";
    }

    elemento.onloadedmetadata = () => {
      const duracion = elemento.duration;
      limpiar();
      if (
        typeof duracion === "number" &&
        Number.isFinite(duracion) &&
        duracion > 0
      ) {
        resolver(Math.round(duracion * 10) / 10);
      } else {
        resolver(undefined);
      }
    };

    elemento.onerror = () => {
      limpiar();
      resolver(undefined);
    };

    elemento.src = urlObjeto;
  });
}

interface PropiedadesFilaMiniaturas {
  imagenesCargadas: ImagenConVistaPrevia[];
  alQuitarImagen: (indiceAQuitar: number) => void;
  deshabilitado: boolean;
}

interface PropiedadesBotonAdjuntar {
  alSeleccionarArchivos: (archivos: FileList | null) => void;
  alSeleccionarDeBiblioteca?: (activos: ActivoBibliotecaGlobal[]) => void;
  deshabilitado: boolean;
}

/**
 * Valida los archivos de imagen, audio o video que el usuario adjuntó desde su equipo y los añade a la fila superior.
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
    ...imagenesActuales
      .filter((item) => !item.activoBiblioteca)
      .map((item) => item.archivo),
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

  const listaActualizada = [...imagenesActuales, ...nuevasConMiniatura];
  alCambiarImagenes(listaActualizada);

  // Medimos en segundo plano la duración exacta en segundos de cada canción o video
  Promise.all(
    nuevasConMiniatura.map(async (item) => {
      if (item.tipo === "audio" || item.tipo === "video") {
        const duracion = await leerDuracionMultimediaEnNavegador(
          item.tipo,
          item.urlVistaPrevia
        );
        return { ...item, duracionSegundos: duracion };
      }
      return item;
    })
  ).then((nuevasConDuracion) => {
    alCambiarImagenes([...imagenesActuales, ...nuevasConDuracion]);
  });
}

/**
 * Añade uno o varios activos elegidos desde la Biblioteca Global sin necesidad de volver a subirlos.
 * Recibe la lista actual, los activos seleccionados y el callback de actualización.
 */
export function agregarActivosDesdeBiblioteca(
  imagenesActuales: ImagenConVistaPrevia[],
  activosElegidos: ActivoBibliotecaGlobal[],
  alCambiarImagenes: (nuevasImagenes: ImagenConVistaPrevia[]) => void,
  alOcurrirError: (mensaje: string | null) => void
): void {
  if (!activosElegidos || activosElegidos.length === 0) return;
  alOcurrirError(null);

  const hashesActuales = new Set(
    imagenesActuales
      .map((item) => item.activoBiblioteca?.hashArchivo)
      .filter(Boolean)
  );

  const nuevosItems: ImagenConVistaPrevia[] = [];

  for (const activo of activosElegidos) {
    if (hashesActuales.has(activo.hashArchivo)) continue;

    // Creamos un archivo liviano simbólico para mantener compatibilidad con la interfaz ImagenConVistaPrevia
    const archivoSimbolico = new File(["biblioteca"], activo.nombre, {
      type: activo.mimeType || "image/png",
    });

    nuevosItems.push({
      archivo: archivoSimbolico,
      tipo: activo.tipo,
      urlVistaPrevia: activo.url,
      duracionSegundos: activo.duracionSegundos,
      activoBiblioteca: activo,
    });
  }

  if (nuevosItems.length > 0) {
    alCambiarImagenes([...imagenesActuales, ...nuevosItems]);
  }
}

/**
 * Muestra la fila superior con miniaturas de fotos, tarjetas de canciones (audio) o clips de video adjuntados.
 * Incluye insignia de ahorro cuando un activo proviene de la Biblioteca Global o ya tiene Lámina 360°.
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
      {imagenesCargadas.map((item, indice) => {
        const tieneLaminaEnBiblioteca = Boolean(
          item.activoBiblioteca?.laminas360PorVestuario &&
            Object.keys(item.activoBiblioteca.laminas360PorVestuario).length > 0
        );

        return (
          <div
            key={`${item.archivo.name}-${indice}`}
            title={
              tieneLaminaEnBiblioteca
                ? `${item.archivo.name} · ✨ Lámina 360° lista (Ahorro activo)`
                : item.activoBiblioteca
                ? `${item.archivo.name} · 📚 Reutilizado de Mi Biblioteca`
                : item.archivo.name
            }
            className={`relative group rounded-xl overflow-hidden border shadow-2xs shrink-0 ${
              tieneLaminaEnBiblioteca
                ? "border-emerald-400 bg-emerald-50/40"
                : item.activoBiblioteca
                ? "border-indigo-300 bg-indigo-50/30"
                : "border-slate-200 bg-slate-50"
            } ${
              item.tipo === "audio"
                ? "h-14 px-3 flex items-center gap-2"
                : "w-14 h-14"
            }`}
          >
            {item.tipo === "imagen" && (
              <>
                <img
                  src={item.urlVistaPrevia}
                  alt={`Referencia ${indice + 1}: ${item.archivo.name}`}
                  className="w-full h-full object-cover"
                />
                {tieneLaminaEnBiblioteca ? (
                  <span className="absolute bottom-0 inset-x-0 bg-emerald-700/90 text-white text-[8px] font-bold text-center py-0.5 truncate px-0.5">
                    ✨ 360° lista
                  </span>
                ) : item.activoBiblioteca ? (
                  <span className="absolute bottom-0 inset-x-0 bg-indigo-700/90 text-white text-[8px] font-bold text-center py-0.5 truncate px-0.5">
                    📚 Biblioteca
                  </span>
                ) : null}
              </>
            )}

            {item.tipo === "audio" && (
              <div className="flex items-center gap-2 pr-4 max-w-48">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-sm shrink-0">
                  🎵
                </span>
                <div className="truncate">
                  <p className="text-[11px] font-bold text-slate-800 truncate">
                    {item.archivo.name}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-medium">
                    {item.activoBiblioteca ? "📚 Biblioteca" : "Audio"}
                    {item.duracionSegundos ? ` · ${item.duracionSegundos}s` : ""}
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
                  {item.duracionSegundos ? ` · ${item.duracionSegundos}s` : ""}
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
        );
      })}
    </div>
  );
}

/**
 * Muestra el botón "+" en la Mesa de Entrada. Al hacer clic despliega un menú con 2 opciones:
 * 1. "💻 Subir archivo nuevo desde mi equipo" (con detección automática anti-duplicados).
 * 2. "📚 Elegir de Mi Biblioteca (Personajes y Productos guardados)".
 */
export function BotonAdjuntarImagenes({
  alSeleccionarArchivos,
  alSeleccionarDeBiblioteca,
  deshabilitado,
}: PropiedadesBotonAdjuntar) {
  const referenciaInputArchivo = useRef<HTMLInputElement | null>(null);
  const [menuAbierto, setMenuAbierto] = useState<boolean>(false);
  const [modalBibliotecaAbierto, setModalBibliotecaAbierto] =
    useState<boolean>(false);

  return (
    <div className="relative inline-block">
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
        onClick={() => setMenuAbierto((prev) => !prev)}
        title="Subir archivo nuevo o elegir personajes/productos de tu Biblioteca"
        aria-label="Adjuntar archivos multimedia de referencia o abrir Biblioteca"
        className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 bg-slate-100/90 hover:bg-indigo-100 hover:border-indigo-300 text-slate-700 hover:text-indigo-800 text-lg font-medium transition-colors cursor-pointer disabled:opacity-50 shrink-0"
      >
        +
      </button>

      {/* Menú rápido flotante con las 2 opciones al pulsar "+" */}
      {menuAbierto && !deshabilitado && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuAbierto(false)}
          />
          <div className="absolute left-0 bottom-10 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl space-y-1 animate-in fade-in duration-150">
            <button
              type="button"
              onClick={() => {
                setMenuAbierto(false);
                referenciaInputArchivo.current?.click();
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 transition-colors cursor-pointer flex items-start gap-2.5"
            >
              <span className="text-base mt-0.5">💻</span>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Subir archivo nuevo desde mi equipo
                </p>
                <p className="text-[11px] text-slate-500">
                  Con detección automática anti-duplicados (SHA-256)
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setMenuAbierto(false);
                setModalBibliotecaAbierto(true);
              }}
              className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors cursor-pointer flex items-start gap-2.5"
            >
              <span className="text-base mt-0.5">📚</span>
              <div>
                <p className="text-xs font-bold text-indigo-950">
                  Elegir de Mi Biblioteca (Personajes y Productos guardados)
                </p>
                <p className="text-[11px] text-indigo-700">
                  Reutiliza personajes, productos y Láminas 360° al instante
                </p>
              </div>
            </button>
          </div>
        </>
      )}

      {/* Modal de galería visual de la Biblioteca Global */}
      <ModalBibliotecaActivos
        abierto={modalBibliotecaAbierto}
        alCerrar={() => setModalBibliotecaAbierto(false)}
        alSeleccionarActivos={(elegidos) => {
          alSeleccionarDeBiblioteca?.(elegidos);
        }}
      />
    </div>
  );
}
