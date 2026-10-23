// Valida los datos del proyecto y calcula en tiempo real los costos en USD según los modelos de fal.ai y la duración.
// Se conecta con constantes_mesa_entrada.ts, MesaDeEntrada.tsx, crear_documento_proyecto.ts y las pruebas en tests/.

import {
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
  TIPOS_IMAGEN_PERMITIDOS,
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
 * Verifica que cada imagen de referencia tenga un formato seguro (JPG, PNG, WEBP) y no supere 10 MB.
 * Recibe la lista de archivos seleccionados y devuelve si son válidos o qué archivo tiene un problema.
 */
export function validarImagenesReferencia(
  archivos: ArchivoImagenMinimo[]
): ResultadoValidacion {
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
