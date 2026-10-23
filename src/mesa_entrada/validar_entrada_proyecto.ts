// Valida los datos escritos por el usuario y las imágenes seleccionadas antes de subirlas a Firebase.
// Se conecta con constantes_mesa_entrada.ts, ZonaImagenesReferencia.tsx y crear_documento_proyecto.ts.

import {
  CARPETA_STORAGE_REFERENCIAS,
  FORMATOS_PERMITIDOS,
  type FormatoVideo,
  LONGITUD_MAXIMA_IDEA,
  LONGITUD_MINIMA_IDEA,
  MAXIMO_IMAGENES_REFERENCIA,
  TAMANO_MAXIMO_IMAGEN_BYTES,
  TIPOS_IMAGEN_PERMITIDOS,
} from "./constantes_mesa_entrada.ts";

export interface ResultadoValidacion {
  esValido: boolean;
  mensajeError: string | null;
}

export interface ArchivoImagenMinimo {
  name: string;
  size: number;
  type: string;
}

/**
 * Comprueba que la idea del video no esté vacía ni supere el límite razonable de texto.
 * Recibe el texto escrito por el usuario y devuelve si es válido o un mensaje claro en español.
 */
export function validarIdeaOriginal(ideaOriginal: string): ResultadoValidacion {
  const textoLimpio = ideaOriginal.trim();

  if (textoLimpio.length === 0) {
    return {
      esValido: false,
      mensajeError: "Por favor, escribe la idea de tu video antes de comenzar la producción.",
    };
  }

  if (textoLimpio.length < LONGITUD_MINIMA_IDEA) {
    return {
      esValido: false,
      mensajeError: "Tu idea es muy cortita. Cuéntanos un poco más de detalle sobre el video que quieres crear.",
    };
  }

  if (textoLimpio.length > LONGITUD_MAXIMA_IDEA) {
    return {
      esValido: false,
      mensajeError: `La idea supera el máximo permitido de ${LONGITUD_MAXIMA_IDEA} caracteres.`,
    };
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Comprueba que el formato elegido sea únicamente Vertical ('9:16') u Horizontal ('16:9').
 * Recibe el formato seleccionado y devuelve si es válido o el motivo del error.
 */
export function validarFormatoVideo(formato: string): ResultadoValidacion {
  if (!FORMATOS_PERMITIDOS.includes(formato as FormatoVideo)) {
    return {
      esValido: false,
      mensajeError: "Elige un formato válido: Vertical (9:16) u Horizontal (16:9).",
    };
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Verifica que las imágenes de referencia no sean más de 4 y que cada una tenga un formato y peso seguros.
 * Recibe la lista de archivos seleccionados y devuelve si son válidos o qué archivo tiene un problema.
 */
export function validarImagenesReferencia(
  archivos: ArchivoImagenMinimo[]
): ResultadoValidacion {
  if (archivos.length > MAXIMO_IMAGENES_REFERENCIA) {
    return {
      esValido: false,
      mensajeError: `Solo puedes subir hasta ${MAXIMO_IMAGENES_REFERENCIA} imágenes de referencia.`,
    };
  }

  for (const archivo of archivos) {
    if (!TIPOS_IMAGEN_PERMITIDOS.includes(archivo.type)) {
      return {
        esValido: false,
        mensajeError: `El archivo "${archivo.name}" no es una imagen válida. Usa fotos en formato JPG, PNG o WEBP.`,
      };
    }

    if (archivo.size > TAMANO_MAXIMO_IMAGEN_BYTES) {
      return {
        esValido: false,
        mensajeError: `La imagen "${archivo.name}" pesa demasiado (máximo 10 MB por foto).`,
      };
    }
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Limpia el nombre de un archivo y construye la ruta exacta dentro de referencias/{proyectoId}/.
 * Recibe el identificador del proyecto, el número de orden y el nombre original, y devuelve la ruta segura.
 */
export function construirRutaStorageReferencia(
  proyectoId: string,
  indiceImagen: number,
  nombreArchivoOriginal: string
): string {
  // Quitamos caracteres especiales del nombre del archivo para evitar errores en enlaces web
  const nombreSeguro = nombreArchivoOriginal
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  return `${CARPETA_STORAGE_REFERENCIAS}/${proyectoId}/${indiceImagen + 1}_${nombreSeguro}`;
}
