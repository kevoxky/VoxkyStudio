// Valida los datos del proyecto, archivos multimedia (imagen, audio, video), tipos MIME seguros y costos en USD.
// Se conecta con constantes_mesa_entrada.ts, subir_imagenes_referencia.ts, inspector_multimodal_fal.ts y tests/.

import {
  type ArchivoMultimediaGuardado,
  CANTIDAD_MAXIMA_CUSTOM,
  CANTIDAD_MINIMA_CUSTOM,
  CARPETA_STORAGE_REFERENCIAS,
  ENDPOINTS_MODELO_IMAGEN_PERMITIDOS,
  ENDPOINTS_MODELO_VIDEO_PERMITIDOS,
  FORMATOS_PERMITIDOS,
  type FormatoVideo,
  IDIOMAS_SALIDA_PERMITIDOS,
  type IdiomaSalidaVideo,
  IMAGENES_ESTIMADAS_POR_MINUTO,
  LONGITUD_MAXIMA_IDEA,
  LONGITUD_MINIMA_IDEA,
  MODELOS_IMAGEN_FAL,
  MODELOS_VIDEO_FAL,
  MODOS_CALIDAD_PERMITIDOS,
  type ModoCalidadProduccion,
  OPCIONES_DURACION_PREDEFINIDAS,
  PERFILES_PRODUCCION_CALIDAD,
  SEGUNDOS_POR_MINUTO,
  TAMANO_MAXIMO_IMAGEN_BYTES,
  TAMANO_MAXIMO_MULTIMEDIA_BYTES,
  TIPOS_AUDIO_PERMITIDOS,
  TIPOS_IMAGEN_PERMITIDOS,
  TIPOS_VIDEO_PERMITIDOS,
  type TipoArchivoReferencia,
  type UnidadDuracionCustom,
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
      mensajeError:
        "Por favor, escribe la idea de tu video antes de comenzar la producción.",
    };
  }

  if (textoLimpio.length < LONGITUD_MINIMA_IDEA) {
    return {
      esValido: false,
      mensajeError:
        "Tu idea es muy cortita. Cuéntanos un poco más de detalle sobre el video que quieres crear.",
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
 * Comprueba que el formato elegido esté entre las 6 relaciones de aspecto soportadas.
 * Recibe el formato seleccionado y devuelve si es válido o el motivo del error.
 */
export function validarFormatoVideo(formato: string): ResultadoValidacion {
  if (!FORMATOS_PERMITIDOS.includes(formato as FormatoVideo)) {
    return {
      esValido: false,
      mensajeError:
        "Elige un formato de video válido (16:9, 9:16, 1:1, 4:5, 4:3 o 21:9).",
    };
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Construye el texto de duración personalizada (por ejemplo "Custom: 7 min") a partir de la cantidad y la unidad.
 * Recibe el número y la unidad ("seg" o "min") y devuelve el texto formateado.
 */
export function formatearDuracionCustom(
  cantidad: number,
  unidad: UnidadDuracionCustom
): string {
  return `Custom: ${cantidad} ${unidad}`;
}

/**
 * Comprueba que la duración objetivo sea una opción predefinida ("Auto", "30 seg", etc.) o un valor "Custom: X seg/min" válido.
 * Recibe el texto de duración objetivo y devuelve si es válido o un mensaje explicativo.
 */
export function validarDuracionObjetivo(
  duracionObjetivo: string
): ResultadoValidacion {
  const texto = duracionObjetivo.trim();

  if (OPCIONES_DURACION_PREDEFINIDAS.includes(texto)) {
    return { esValido: true, mensajeError: null };
  }

  const coincidenciaCustom = /^Custom:\s*(\d+)\s*(seg|min)$/.exec(texto);
  if (!coincidenciaCustom) {
    return {
      esValido: false,
      mensajeError:
        "Selecciona una duración válida o escribe un número entero positivo para la duración personalizada.",
    };
  }

  const cantidadNumerica = Number(coincidenciaCustom[1]);
  if (
    !Number.isInteger(cantidadNumerica) ||
    cantidadNumerica < CANTIDAD_MINIMA_CUSTOM ||
    cantidadNumerica > CANTIDAD_MAXIMA_CUSTOM
  ) {
    return {
      esValido: false,
      mensajeError: `La duración personalizada debe ser un número entre ${CANTIDAD_MINIMA_CUSTOM} y ${CANTIDAD_MAXIMA_CUSTOM}.`,
    };
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Comprueba que los modelos de imagen y de video correspondan a endpoints oficiales permitidos en fal.ai.
 * Recibe el endpoint de imagen y el de video, y devuelve si ambos son válidos.
 */
export function validarModelosFal(
  modeloImagen: string,
  modeloVideo: string
): ResultadoValidacion {
  if (!ENDPOINTS_MODELO_IMAGEN_PERMITIDOS.includes(modeloImagen)) {
    return {
      esValido: false,
      mensajeError: "Selecciona un modelo de imagen válido de la lista.",
    };
  }

  if (!ENDPOINTS_MODELO_VIDEO_PERMITIDOS.includes(modeloVideo)) {
    return {
      esValido: false,
      mensajeError: "Selecciona un modelo de video válido de la lista.",
    };
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Comprueba que el idioma de salida seleccionado esté dentro de los idiomas soportados.
 * Recibe el nombre del idioma y devuelve si es válido.
 */
export function validarIdiomaSalida(idiomaSalida: string): ResultadoValidacion {
  if (!IDIOMAS_SALIDA_PERMITIDOS.includes(idiomaSalida as IdiomaSalidaVideo)) {
    return {
      esValido: false,
      mensajeError: "Selecciona un idioma de salida válido para el video.",
    };
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Identifica si un archivo adjunto es una 'imagen', un 'audio' o un 'video' según su tipo MIME o su extensión.
 * Recibe el archivo y devuelve su categoría multimedia o null si no es compatible.
 */
export function detectarTipoArchivoMultimedia(
  archivo: ArchivoImagenMinimo
): TipoArchivoReferencia | null {
  const mime = (archivo.type || "").toLowerCase();
  const nombre = (archivo.name || "").toLowerCase();

  // Primero verificamos por extensión explícita por si el navegador envía un MIME vacío o genérico
  if (/\.(mp3|wav|m4a)$/.test(nombre) || TIPOS_AUDIO_PERMITIDOS.includes(mime)) {
    return "audio";
  }

  if (
    /\.(mp4|mov|webm)$/.test(nombre) ||
    TIPOS_VIDEO_PERMITIDOS.includes(mime)
  ) {
    return "video";
  }

  if (
    /\.(jpg|jpeg|png|webp)$/.test(nombre) ||
    TIPOS_IMAGEN_PERMITIDOS.includes(mime)
  ) {
    return "imagen";
  }

  return null;
}

/**
 * Obtiene un tipo MIME estándar garantizado a partir del archivo y su nombre para evitar rechazos en Storage o fal.ai.
 * Recibe el archivo con su nombre y tipo original y devuelve un MIME válido (ej. "audio/mpeg", "image/png").
 */
export function obtenerMimeTypeSeguro(archivo: {
  name: string;
  type?: string;
}): string {
  const nombre = (archivo.name || "").toLowerCase();
  const mimeOriginal = (archivo.type || "").toLowerCase().trim();

  if (nombre.endsWith(".mp3")) return "audio/mpeg";
  if (nombre.endsWith(".wav")) return "audio/wav";
  if (nombre.endsWith(".m4a")) return "audio/mp4";
  if (nombre.endsWith(".mp4")) return "video/mp4";
  if (nombre.endsWith(".mov")) return "video/quicktime";
  if (nombre.endsWith(".webm")) return "video/webm";
  if (nombre.endsWith(".png")) return "image/png";
  if (nombre.endsWith(".webp")) return "image/webp";
  if (nombre.endsWith(".jpg") || nombre.endsWith(".jpeg")) return "image/jpeg";

  return mimeOriginal || "application/octet-stream";
}

/**
 * Separa estrictamente los archivos en Imágenes (para Visión) y Audios/Videos (para Whisper), impidiendo mezclar URLs.
 * Recibe la lista de archivos multimedia o URLs y devuelve dos listas separadas y garantizadas.
 */
export function separarArchivosPorTipoEstricto(
  archivosMultimedia?: ArchivoMultimediaGuardado[],
  imagenesReferencia?: string[]
): {
  archivosImagen: ArchivoMultimediaGuardado[];
  archivosAudioVideo: ArchivoMultimediaGuardado[];
} {
  const listaBase: ArchivoMultimediaGuardado[] =
    Array.isArray(archivosMultimedia) && archivosMultimedia.length > 0
      ? archivosMultimedia
      : Array.isArray(imagenesReferencia)
      ? imagenesReferencia.map((url, idx) => {
          const urlSinParams = url.split("?")[0].toLowerCase();
          const esAudio = /\.(mp3|wav|m4a)$/i.test(urlSinParams);
          const esVideo = /\.(mp4|mov|webm)$/i.test(urlSinParams);
          const tipo: TipoArchivoReferencia = esAudio
            ? "audio"
            : esVideo
            ? "video"
            : "imagen";

          return {
            tipo,
            url,
            nombre: `referencia_${idx + 1}`,
            mimeType:
              tipo === "audio"
                ? "audio/mpeg"
                : tipo === "video"
                ? "video/mp4"
                : "image/jpeg",
          };
        })
      : [];

  const archivosImagen: ArchivoMultimediaGuardado[] = [];
  const archivosAudioVideo: ArchivoMultimediaGuardado[] = [];

  for (const item of listaBase) {
    const nombreOUrl = `${item.nombre || ""} ${item.url.split("?")[0]}`.toLowerCase();
    const pareceAudioOVideo = /\.(mp3|wav|m4a|mp4|mov|webm)(\b|$)/i.test(
      nombreOUrl
    );

    if (
      item.tipo === "audio" ||
      item.tipo === "video" ||
      pareceAudioOVideo
    ) {
      archivosAudioVideo.push({
        ...item,
        tipo: item.tipo === "imagen" ? "audio" : item.tipo,
      });
    } else if (item.tipo === "imagen") {
      archivosImagen.push(item);
    }
  }

  return { archivosImagen, archivosAudioVideo };
}

/**
 * Verifica que cada archivo multimedia sea una imagen (.jpg, .png, .webp), audio (.mp3, .wav, .m4a) o video (.mp4, .mov, .webm) con peso seguro.
 * Recibe la lista de archivos seleccionados y devuelve si son válidos o un mensaje de error claro.
 */
export function validarImagenesReferencia(
  archivos: ArchivoImagenMinimo[]
): ResultadoValidacion {
  for (const archivo of archivos) {
    const tipoDetectado = detectarTipoArchivoMultimedia(archivo);

    if (!tipoDetectado) {
      return {
        esValido: false,
        mensajeError: `El archivo "${archivo.name}" no es compatible. Puedes subir imágenes (JPG, PNG, WEBP), audios (MP3, WAV, M4A) o videos (MP4, MOV, WEBM).`,
      };
    }

    const limiteBytes =
      tipoDetectado === "imagen"
        ? TAMANO_MAXIMO_IMAGEN_BYTES
        : TAMANO_MAXIMO_MULTIMEDIA_BYTES;

    if (archivo.size > limiteBytes) {
      const limiteMB = tipoDetectado === "imagen" ? "10 MB" : "100 MB";
      return {
        esValido: false,
        mensajeError: `El archivo "${archivo.name}" supera el peso máximo permitido de ${limiteMB}.`,
      };
    }
  }

  return { esValido: true, mensajeError: null };
}

/**
 * Calcula cuánto cuesta en dólares (USD) producir 1 minuto completo (60s de video + ~12 imágenes base) con los modelos elegidos.
 * Recibe el endpoint de imagen y el de video, y devuelve el costo por minuto redondeado a 2 decimales.
 */
export function calcularCostoPorMinutoUSD(
  idModeloImagen: string,
  idModeloVideo: string
): number {
  const fichaImagen = MODELOS_IMAGEN_FAL.find((m) => m.id === idModeloImagen);
  const fichaVideo = MODELOS_VIDEO_FAL.find((m) => m.id === idModeloVideo);

  const precioPorImagen = fichaImagen ? fichaImagen.precioUnitarioUSD : 0.04;
  const precioPorSegundoVideo = fichaVideo ? fichaVideo.precioUnitarioUSD : 0.1;

  const totalPorMinuto =
    IMAGENES_ESTIMADAS_POR_MINUTO * precioPorImagen +
    SEGUNDOS_POR_MINUTO * precioPorSegundoVideo;

  return Math.round(totalPorMinuto * 100) / 100;
}

/**
 * Convierte el texto de duración seleccionada ("Auto", "30 seg", "3 min", "Custom: 7 min") en segundos totales.
 * Recibe la duración objetivo ("Auto" se calcula sobre una base de 60 segundos) y devuelve los segundos equivalentes.
 */
export function convertirDuracionASegundos(duracionObjetivo: string): number {
  const texto = duracionObjetivo.trim();

  if (texto === "Auto") {
    return SEGUNDOS_POR_MINUTO;
  }

  const coincidencia = /^(?:Custom:\s*)?(\d+)\s*(seg|min)$/.exec(texto);
  if (!coincidencia) {
    return SEGUNDOS_POR_MINUTO;
  }

  const cantidad = Number(coincidencia[1]);
  const unidad = coincidencia[2];

  return unidad === "min" ? cantidad * SEGUNDOS_POR_MINUTO : cantidad;
}

/**
 * Calcula el presupuesto total estimado en USD del proyecto según el costo por minuto y la duración elegida.
 * Recibe el costo por minuto en USD y el texto de duración, y devuelve el presupuesto total redondeado a 2 decimales.
 */
export function calcularPresupuestoTotalUSD(
  costoPorMinutoUSD: number,
  duracionObjetivo: string
): number {
  const segundosTotales = convertirDuracionASegundos(duracionObjetivo);
  const minutosEquivalentes = segundosTotales / SEGUNDOS_POR_MINUTO;

  return Math.round(costoPorMinutoUSD * minutosEquivalentes * 100) / 100;
}

/**
 * Detecta si la combinación actual de modelos coincide con el perfil Rápido, Pro o Máximo, o si es Personalizado.
 * Recibe el ID del modelo de imagen y de video, y devuelve el modo de calidad correspondiente.
 */
export function detectarModoCalidad(
  idModeloImagen: string,
  idModeloVideo: string
): ModoCalidadProduccion {
  const perfilEncontrado = PERFILES_PRODUCCION_CALIDAD.find(
    (perfil) =>
      perfil.idModeloImagen === idModeloImagen &&
      perfil.idModeloVideo === idModeloVideo
  );

  return perfilEncontrado ? perfilEncontrado.modo : "personalizado";
}

/**
 * Comprueba que el modo de calidad y los importes estimados en USD sean válidos antes de guardar en Firestore.
 * Recibe el modo y los montos calculados y devuelve si son válidos.
 */
export function validarDatosFinancierosProyecto(
  modoCalidad: string,
  costoEstimadoPorMinutoUSD: number,
  presupuestoTotalEstimadoUSD: number
): ResultadoValidacion {
  if (!MODOS_CALIDAD_PERMITIDOS.includes(modoCalidad as ModoCalidadProduccion)) {
    return {
      esValido: false,
      mensajeError: "El modo de calidad seleccionado no es válido.",
    };
  }

  if (
    !Number.isFinite(costoEstimadoPorMinutoUSD) ||
    costoEstimadoPorMinutoUSD <= 0 ||
    !Number.isFinite(presupuestoTotalEstimadoUSD) ||
    presupuestoTotalEstimadoUSD <= 0
  ) {
    return {
      esValido: false,
      mensajeError: "Los costos estimados del proyecto deben ser mayores a 0.",
    };
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
  const nombreSeguro = nombreArchivoOriginal
    .trim()
    .replace(/[^a-zA-Z0-9._-]/g, "_");

  return `${CARPETA_STORAGE_REFERENCIAS}/${proyectoId}/${indiceImagen + 1}_${nombreSeguro}`;
}
