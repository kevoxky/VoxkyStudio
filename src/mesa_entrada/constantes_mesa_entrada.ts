// Define todas las constantes y tipos de datos de la Mesa de Entrada (Paso 1) sin textos ni números mágicos.
// Se conecta con validar_entrada_proyecto.ts, subir_imagenes_referencia.ts, crear_documento_proyecto.ts y los componentes visuales.

export type FormatoVideo = "9:16" | "16:9";

export type EstadoInicialProyecto = "analizando_idea";

// Nombre de la colección en Firebase Firestore donde cada documento es la ficha maestra de un video
export const COLECCION_PROYECTOS = "proyectos";

// Nombre de la carpeta raíz en Firebase Storage donde se guardan las fotos de cada proyecto
export const CARPETA_STORAGE_REFERENCIAS = "referencias";

// Estado inicial exacto con el que nace cada proyecto en Firestore
export const ESTADO_ANALIZANDO_IDEA: EstadoInicialProyecto = "analizando_idea";

// Formatos de video disponibles para elegir en la Mesa de Entrada
export const FORMATO_VERTICAL: FormatoVideo = "9:16";
export const FORMATO_HORIZONTAL: FormatoVideo = "16:9";
export const FORMATOS_PERMITIDOS: FormatoVideo[] = [
  FORMATO_VERTICAL,
  FORMATO_HORIZONTAL,
];

// Límites de validación para proteger la aplicación y la subida de archivos
export const MAXIMO_IMAGENES_REFERENCIA = 4;
export const LONGITUD_MINIMA_IDEA = 5;
export const LONGITUD_MAXIMA_IDEA = 3000;

// Tamaño máximo permitido por cada imagen subida (10 Megabytes expresados en bytes)
export const TAMANO_MAXIMO_IMAGEN_BYTES = 10 * 1024 * 1024;

// Tipos de archivo de imagen seguros que aceptamos desde el navegador
export const TIPOS_IMAGEN_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Textos exactos pedidos para la interfaz de la Parte 1
export const TEXTO_BOTON_COMENZAR = "Comenzar Producción";
export const TEXTO_CARGA_ESTUDIO = "Preparando tu estudio...";
