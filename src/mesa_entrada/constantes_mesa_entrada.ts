// Define constantes, tipos multimedia (imagen, audio, video), formatos, duraciones y fichas de fal.ai.
// Se conecta con validar_entrada_proyecto.ts, ZonaImagenesReferencia.tsx, subir_imagenes_referencia.ts y los agentes del Paso 2.

export type FormatoVideo = "16:9" | "9:16" | "1:1" | "4:5" | "4:3" | "21:9";

export type UnidadDuracionCustom = "seg" | "min";

export type NivelCalidadModelo = "Estándar" | "Alta" | "Ultra / Cine";

export type ModoCalidadProduccion =
  | "rapido"
  | "pro"
  | "maximo"
  | "personalizado";

export type IdiomaSalidaVideo =
  | "Español"
  | "English"
  | "Français"
  | "Português"
  | "Italiano"
  | "Deutsch";

export type TipoArchivoReferencia = "imagen" | "audio" | "video";

export type EstadoProyecto =
  | "analizando_idea"
  | "esperando_clarificacion"
  | "listo_para_guion";

export interface ArchivoMultimediaGuardado {
  tipo: TipoArchivoReferencia;
  url: string;
  nombre: string;
  mimeType: string;
}

export interface OpcionFormato {
  valor: FormatoVideo;
  etiquetaCorta: string;
  descripcionPlataforma: string;
}

export interface FichaTecnicaModeloFal {
  id: string;
  nombre: string;
  descripcion: string;
  calidad: NivelCalidadModelo;
  costoRealUSD: string;
  precioUnitarioUSD: number;
  costoPorMinutoVideoUSD?: number;
  velocidadEstimada: string;
  esPremium: boolean;
}

export interface PerfilProduccionCalidad {
  modo: "rapido" | "pro" | "maximo";
  icono: string;
  titulo: string;
  rangoReferenciaUSD: string;
  descripcionCorta: string;
  idModeloImagen: string;
  idModeloVideo: string;
}

// Nombre de la colección en Firebase Firestore donde cada documento es la ficha maestra de un video
export const COLECCION_PROYECTOS = "proyectos";

// Nombre de la carpeta raíz en Firebase Storage donde se guardan los archivos multimedia de cada proyecto
export const CARPETA_STORAGE_REFERENCIAS = "referencias";

// Estados del flujo de producción entre Paso 1 y Paso 2
export const ESTADO_ANALIZANDO_IDEA: EstadoProyecto = "analizando_idea";
export const ESTADO_ESPERANDO_CLARIFICACION: EstadoProyecto =
  "esperando_clarificacion";
export const ESTADO_LISTO_PARA_GUION: EstadoProyecto = "listo_para_guion";

// Cantidad estimada de imágenes base que se generan por cada minuto de video (1 toma cada 5 segundos = 12 imágenes)
export const IMAGENES_ESTIMADAS_POR_MINUTO = 12;
export const SEGUNDOS_POR_MINUTO = 60;

// 1. Formatos de video soportados para múltiples plataformas
export const FORMATO_HORIZONTAL: FormatoVideo = "16:9";
export const FORMATO_VERTICAL: FormatoVideo = "9:16";

export const OPCIONES_FORMATO_VIDEO: OpcionFormato[] = [
  {
    valor: "16:9",
    etiquetaCorta: "16:9",
    descripcionPlataforma: "Horizontal · YouTube / Cine / TV",
  },
  {
    valor: "9:16",
    etiquetaCorta: "9:16",
    descripcionPlataforma: "Vertical · TikTok / Reels / Shorts",
  },
  {
    valor: "1:1",
    etiquetaCorta: "1:1",
    descripcionPlataforma: "Cuadrado · Post de Instagram / Feed",
  },
  {
    valor: "4:5",
    etiquetaCorta: "4:5",
    descripcionPlataforma: "Retrato · Feed vertical Instagram / FB",
  },
  {
    valor: "4:3",
    etiquetaCorta: "4:3",
    descripcionPlataforma: "Clásico · TV retro",
  },
  {
    valor: "21:9",
    etiquetaCorta: "21:9",
    descripcionPlataforma: "Ultra Panorámico Cinematográfico",
  },
];

export const FORMATOS_PERMITIDOS: FormatoVideo[] = OPCIONES_FORMATO_VIDEO.map(
  (opcion) => opcion.valor
);

// 2. Opciones de duración con tolerancia flexible (por defecto "Auto")
export const DURACION_POR_DEFECTO = "Auto";
export const TOLERANCIA_FLEXIBLE_POR_DEFECTO = true;

export const OPCIONES_DURACION_PREDEFINIDAS: string[] = [
  "Auto",
  "15 seg",
  "30 seg",
  "1 min",
  "3 min",
  "5 min",
  "10 min",
];

export const CANTIDAD_MINIMA_CUSTOM = 1;
export const CANTIDAD_MAXIMA_CUSTOM = 600;

// 3. Fichas técnicas reales de Modelos de Imagen en fal.ai (auditadas con el MCP de fal.ai)
export const MODELOS_IMAGEN_FAL: FichaTecnicaModeloFal[] = [
  {
    id: "fal-ai/flux/schnell",
    nombre: "FLUX.1 Schnell",
    descripcion:
      "Ultra veloz y muy económico. Ideal para bocetos rápidos, pruebas de concepto y borradores.",
    calidad: "Estándar",
    costoRealUSD: "~$0.003 / img",
    precioUnitarioUSD: 0.003,
    velocidadEstimada: "~3s",
    esPremium: false,
  },
  {
    id: "fal-ai/flux/dev",
    nombre: "FLUX.1 Dev",
    descripcion:
      "Gran adherencia al prompt con excelente equilibrio entre calidad visual y rapidez.",
    calidad: "Alta",
    costoRealUSD: "~$0.025 / img",
    precioUnitarioUSD: 0.025,
    velocidadEstimada: "~6s",
    esPremium: false,
  },
  {
    id: "fal-ai/flux-2-pro",
    nombre: "FLUX 2 Pro",
    descripcion:
      "Iluminación realista, texturas limpias y composición profesional a costo moderado.",
    calidad: "Alta",
    costoRealUSD: "~$0.030 / img",
    precioUnitarioUSD: 0.03,
    velocidadEstimada: "~8s",
    esPremium: false,
  },
  {
    id: "fal-ai/imagen4/preview",
    nombre: "Google Imagen 4",
    descripcion:
      "Motor fotográfico de Google con colores nítidos y estética comercial luminosa.",
    calidad: "Alta",
    costoRealUSD: "~$0.040 / img",
    precioUnitarioUSD: 0.04,
    velocidadEstimada: "~8s",
    esPremium: false,
  },
  {
    id: "fal-ai/flux-pro/v1.1-ultra",
    nombre: "FLUX.1 Pro Ultra",
    descripcion:
      "Fotorealismo de alta resolución (2K) con gran riqueza en piel, telas y escenarios.",
    calidad: "Alta",
    costoRealUSD: "~$0.060 / img",
    precioUnitarioUSD: 0.06,
    velocidadEstimada: "~10s",
    esPremium: true,
  },
  {
    id: "google/nano-banana-2.1",
    nombre: "Nano Banana 2.1",
    descripcion:
      "Ideal para personajes consistentes, productos fieles y hasta 14 referencias visuales.",
    calidad: "Alta",
    costoRealUSD: "~$0.067 / img",
    precioUnitarioUSD: 0.067,
    velocidadEstimada: "~10s",
    esPremium: true,
  },
  {
    id: "fal-ai/nano-banana-pro",
    nombre: "Nano Banana Pro",
    descripcion:
      "Máxima fidelidad para diseño de marca, consistencia extrema de personajes y acabado 4K.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.150 / img",
    precioUnitarioUSD: 0.15,
    velocidadEstimada: "~15s",
    esPremium: true,
  },
  {
    id: "openai/gpt-image-2",
    nombre: "GPT Image 2 High",
    descripcion:
      "Comprensión profunda de escenas complejas y tipografía exacta integrada en la imagen.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.150 / img",
    precioUnitarioUSD: 0.15,
    velocidadEstimada: "~18s",
    esPremium: true,
  },
];

export const ENDPOINTS_MODELO_IMAGEN_PERMITIDOS: string[] =
  MODELOS_IMAGEN_FAL.map((modelo) => modelo.id);

// 4. Fichas técnicas reales de Modelos de Video en fal.ai (auditadas con el MCP de fal.ai)
export const MODELOS_VIDEO_FAL: FichaTecnicaModeloFal[] = [
  {
    id: "minimax/h3-max-turbo/text-to-video",
    nombre: "MiniMax H3 Max Turbo",
    descripcion:
      "El motor más rápido y económico para previsualizar el ritmo y movimiento de tus escenas.",
    calidad: "Estándar",
    costoRealUSD: "~$0.03 / seg",
    precioUnitarioUSD: 0.03,
    costoPorMinutoVideoUSD: 1.84,
    velocidadEstimada: "~12s",
    esPremium: false,
  },
  {
    id: "fal-ai/ltx-2.3/audio-to-video",
    nombre: "LTX-2.3 Pro",
    descripcion:
      "Generación ágil con sincronización de audio, excelente para borradores rápidos y dinámicos.",
    calidad: "Estándar",
    costoRealUSD: "~$0.05 / seg",
    precioUnitarioUSD: 0.05,
    costoPorMinutoVideoUSD: 3.04,
    velocidadEstimada: "~15s",
    esPremium: false,
  },
  {
    id: "minimax/h3-max/reference-to-video",
    nombre: "MiniMax H3 Max",
    descripcion:
      "Conserva la estética de tus referencias con movimientos suaves a un precio accesible.",
    calidad: "Alta",
    costoRealUSD: "~$0.05 / seg",
    precioUnitarioUSD: 0.05,
    costoPorMinutoVideoUSD: 3.36,
    velocidadEstimada: "~20s",
    esPremium: false,
  },
  {
    id: "fal-ai/wan/v2.7/reference-to-video",
    nombre: "Wan 2.7 Reference",
    descripcion:
      "Especialista en mantener la identidad de personajes y objetos usando tus fotos de referencia.",
    calidad: "Alta",
    costoRealUSD: "~$0.10 / seg",
    precioUnitarioUSD: 0.1,
    costoPorMinutoVideoUSD: 6.8,
    velocidadEstimada: "~25s",
    esPremium: true,
  },
  {
    id: "fal-ai/kling-video/v3/pro/image-to-video",
    nombre: "Kling v3 Pro",
    descripcion:
      "Estándar profesional: movimiento fluido, física creíble, cámara de cine y audio nativo.",
    calidad: "Alta",
    costoRealUSD: "~$0.11 / seg",
    precioUnitarioUSD: 0.11,
    costoPorMinutoVideoUSD: 7.4,
    velocidadEstimada: "~30s",
    esPremium: true,
  },
  {
    id: "bytedance/seedance-2.5/text-to-video",
    nombre: "Seedance 2.5",
    descripcion:
      "Coreografía visual expresiva, gran dinamismo de cámara y calidad de estudio cinematográfico.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.23 / seg",
    precioUnitarioUSD: 0.23,
    costoPorMinutoVideoUSD: 15.6,
    velocidadEstimada: "~35s",
    esPremium: true,
  },
  {
    id: "fal-ai/veo3",
    nombre: "Google Veo 3",
    descripcion:
      "Tope de gama de Google: calidad cinematográfica superior, iluminación perfecta y sonido nativo.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.40 / seg",
    precioUnitarioUSD: 0.37,
    costoPorMinutoVideoUSD: 24.0,
    velocidadEstimada: "~45s",
    esPremium: true,
  },
];

export const ENDPOINTS_MODELO_VIDEO_PERMITIDOS: string[] =
  MODELOS_VIDEO_FAL.map((modelo) => modelo.id);

// 5. Perfiles inteligentes de Producción (Rápido, Pro y Máximo)
export const PERFILES_PRODUCCION_CALIDAD: PerfilProduccionCalidad[] = [
  {
    modo: "rapido",
    icono: "⚡",
    titulo: "Rápido",
    rangoReferenciaUSD: "~$1.80 - $3.00 / min",
    descripcionCorta: "Económico y veloz para pruebas o borradores",
    idModeloImagen: "fal-ai/flux/schnell",
    idModeloVideo: "minimax/h3-max-turbo/text-to-video",
  },
  {
    modo: "pro",
    icono: "👑",
    titulo: "Pro",
    rangoReferenciaUSD: "~$6.50 - $9.00 / min",
    descripcionCorta: "Mejor relación calidad/precio profesional",
    idModeloImagen: "google/nano-banana-2.1",
    idModeloVideo: "fal-ai/kling-video/v3/pro/image-to-video",
  },
  {
    modo: "maximo",
    icono: "✨",
    titulo: "Máximo",
    rangoReferenciaUSD: "~$15.00 - $24.00 / min",
    descripcionCorta: "Tope de gama de calidad cinematográfica",
    idModeloImagen: "fal-ai/nano-banana-pro",
    idModeloVideo: "fal-ai/veo3",
  },
];

export const MODO_CALIDAD_POR_DEFECTO: ModoCalidadProduccion = "pro";
export const MODELO_IMAGEN_POR_DEFECTO: string = "google/nano-banana-2.1";
export const MODELO_VIDEO_POR_DEFECTO: string =
  "fal-ai/kling-video/v3/pro/image-to-video";

export const MODOS_CALIDAD_PERMITIDOS: ModoCalidadProduccion[] = [
  "rapido",
  "pro",
  "maximo",
  "personalizado",
];

// 6. Modelos internos por defecto (NO aparecen en la interfaz; incluyen Whisper y Visión para el Agente Productor)
export const MODELOS_INTERNOS_POR_DEFECTO = {
  voz: "fal-ai/elevenlabs/tts/multilingual-v2",
  transcripcionAudio: "fal-ai/whisper",
  analisisVisionAudio: "fal-ai/any-llm/vision",
  razonamientoDirector: "fal-ai/any-llm",
  lipSync: "fal-ai/sync-lipsync/v3",
  upscaling: "fal-ai/topaz/upscale/video",
} as const;

// 7. Idiomas de salida (este idioma manda sobre el idioma en que el usuario escriba su prompt)
export const IDIOMAS_SALIDA_PERMITIDOS: IdiomaSalidaVideo[] = [
  "Español",
  "English",
  "Français",
  "Português",
  "Italiano",
  "Deutsch",
];

export const IDIOMA_SALIDA_POR_DEFECTO: IdiomaSalidaVideo = "Español";

// 8. Archivos Multimedia de Referencia soportados (Imágenes, Audios y Videos)
export const LONGITUD_MINIMA_IDEA = 5;
export const LONGITUD_MAXIMA_IDEA = 3000;

// Límites de peso: 10 MB por imagen y hasta 100 MB para canciones o videos de referencia
export const TAMANO_MAXIMO_IMAGEN_BYTES = 10 * 1024 * 1024;
export const TAMANO_MAXIMO_MULTIMEDIA_BYTES = 100 * 1024 * 1024;

export const TIPOS_IMAGEN_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const TIPOS_AUDIO_PERMITIDOS = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
];

export const TIPOS_VIDEO_PERMITIDOS = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

export const TIPOS_MULTIMEDIA_PERMITIDOS = [
  ...TIPOS_IMAGEN_PERMITIDOS,
  ...TIPOS_AUDIO_PERMITIDOS,
  ...TIPOS_VIDEO_PERMITIDOS,
];

export const ACEPTAR_ARCHIVOS_MULTIMEDIA_INPUT =
  ".jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.mp4,.mov,.webm,image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/mp4,video/mp4,video/quicktime,video/webm";

export const TEXTO_BOTON_COMENZAR = "Comenzar Producción";
export const TEXTO_CARGA_ESTUDIO = "Preparando tu estudio...";
