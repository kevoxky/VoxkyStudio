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

export type IdEstiloVisual =
  | "original_referencia"
  | "3d_pixar"
  | "cartoon_2d"
  | "plastilina_claymation"
  | "realista_cinematografico"
  | "anime_ghibli"
  | "comic_novela"
  | "bloques_juguete"
  | "cuento_acuarela";

export interface EstiloVisualProyecto {
  id: IdEstiloVisual;
  nombreVisible: string;
  descripcionCorta: string;
  icono: string;
  instruccionPromptIngles: string;
}

export type TipoArchivoReferencia = "imagen" | "audio" | "video";

export type EstadoProyecto =
  | "analizando_idea"
  | "esperando_clarificacion"
  | "listo_para_guion"
  | "esperando_aprobacion_guion"
  | "listo_para_imagenes"
  | "generando_imagenes"
  | "listo_para_produccion_av";

export interface ArchivoMultimediaGuardado {
  tipo: TipoArchivoReferencia;
  url: string;
  nombre: string;
  mimeType: string;
  duracionSegundos?: number;
  hashArchivo?: string;
  activoBibliotecaId?: string;
  reutilizadoDeBiblioteca?: boolean;
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

// Estados del flujo de producción entre Paso 1, Paso 2, Paso 3 y Paso 4
export const ESTADO_ANALIZANDO_IDEA: EstadoProyecto = "analizando_idea";
export const ESTADO_ESPERANDO_CLARIFICACION: EstadoProyecto =
  "esperando_clarificacion";
export const ESTADO_LISTO_PARA_GUION: EstadoProyecto = "listo_para_guion";
export const ESTADO_ESPERANDO_APROBACION_GUION: EstadoProyecto =
  "esperando_aprobacion_guion";
export const ESTADO_LISTO_PARA_IMAGENES: EstadoProyecto = "listo_para_imagenes";
export const ESTADO_GENERANDO_IMAGENES: EstadoProyecto = "generando_imagenes";
export const ESTADO_LISTO_PARA_PRODUCCION_AV: EstadoProyecto =
  "listo_para_produccion_av";

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

export const FORMATOS_PERMITIDOS: FormatoVideo[] = OPCIONES_FORMATO_VIDEO.map((opcion) => opcion.valor);

// 2. Opciones de duración con tolerancia flexible (por defecto "Auto")
export const DURACION_POR_DEFECTO = "Auto";
export const TOLERANCIA_FLEXIBLE_POR_DEFECTO = true;

export const OPCIONES_DURACION_PREDEFINIDAS: string[] = [
  "Auto", "15 seg", "30 seg", "1 min", "3 min", "5 min", "10 min",
];

export const CANTIDAD_MINIMA_CUSTOM = 1;
export const CANTIDAD_MAXIMA_CUSTOM = 600;

// 3. Fichas técnicas de Modelos de Imagen en fal.ai (Todos son Duales: Text-to-Image e Image-to-Image /edit)
export const MODELOS_IMAGEN_FAL: FichaTecnicaModeloFal[] = [
  {
    id: "google/nano-banana-2.1",
    nombre: "Nano Banana 2.1 (Dual)",
    descripcion:
      "Modelo líder para consistencia visual. Genera desde texto o edita hasta 14 fotos de referencia.",
    calidad: "Alta",
    costoRealUSD: "~$0.067 / img",
    precioUnitarioUSD: 0.067,
    velocidadEstimada: "~8s",
    esPremium: true,
  },
  {
    id: "fal-ai/nano-banana-pro",
    nombre: "Nano Banana Pro 4K (Dual)",
    descripcion:
      "Máxima resolución 4K y ultra fidelidad en detalles de personajes, rostros y logos comerciales.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.150 / img",
    precioUnitarioUSD: 0.15,
    velocidadEstimada: "~15s",
    esPremium: true,
  },
  {
    id: "bytedance/seedream/v5/pro/text-to-image",
    nombre: "Seedream 5.0 Pro (Dual)",
    descripcion:
      "Motor insignia de ByteDance con fidelidad superior, texto nativo y edición consistente de hasta 10 referencias.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.068 / img",
    precioUnitarioUSD: 0.0675,
    velocidadEstimada: "~10s",
    esPremium: true,
  },
  {
    id: "bytedance/seedream/v5/lite/text-to-image",
    nombre: "Seedream 5.0 Lite (Dual)",
    descripcion:
      "Versión ágil y económica de Seedream 5.0 para creación y edición inteligente con múltiples referencias.",
    calidad: "Alta",
    costoRealUSD: "~$0.035 / img",
    precioUnitarioUSD: 0.035,
    velocidadEstimada: "~7s",
    esPremium: false,
  },
  {
    id: "bytedance/seedream/v5/flash/text-to-image",
    nombre: "Seedream 5.0 Flash (Dual)",
    descripcion:
      "Motor ultrarrápido de ByteDance Seedream 5.0 optimizado para velocidad y bajo presupuesto.",
    calidad: "Estándar",
    costoRealUSD: "~$0.027 / img",
    precioUnitarioUSD: 0.027,
    velocidadEstimada: "~5s",
    esPremium: false,
  },
  {
    id: "fal-ai/bytedance/seedream/v4.5/text-to-image",
    nombre: "Seedream 4.5 (Dual)",
    descripcion:
      "Arquitectura unificada de ByteDance para ilustración estilizada y edición consistente de personajes.",
    calidad: "Alta",
    costoRealUSD: "~$0.040 / img",
    precioUnitarioUSD: 0.04,
    velocidadEstimada: "~9s",
    esPremium: false,
  },
  {
    id: "fal-ai/flux-pro/kontext",
    nombre: "FLUX Kontext Pro (Dual)",
    descripcion:
      "Versión oficial de FLUX para edición y consistencia; conmuta entre texto puro y referencias visuales.",
    calidad: "Alta",
    costoRealUSD: "~$0.040 / img",
    precioUnitarioUSD: 0.04,
    velocidadEstimada: "~10s",
    esPremium: true,
  },
  {
    id: "fal-ai/flux-kontext/dev",
    nombre: "FLUX Kontext Dev (Dual)",
    descripcion:
      "Rápido y flexible para borradores con o sin imágenes de referencia a costo accesible.",
    calidad: "Estándar",
    costoRealUSD: "~$0.025 / img",
    precioUnitarioUSD: 0.025,
    velocidadEstimada: "~6s",
    esPremium: false,
  },
  {
    id: "fal-ai/recraft/v3",
    nombre: "Recraft V3 Design (Dual)",
    descripcion:
      "SOTA en diseño gráfico, 2D e ilustración. Edita con imagen o crea desde texto manteniendo la paleta.",
    calidad: "Alta",
    costoRealUSD: "~$0.040 / img",
    precioUnitarioUSD: 0.04,
    velocidadEstimada: "~7s",
    esPremium: false,
  },
  {
    id: "openai/gpt-image-2",
    nombre: "GPT Image 2 High (Dual)",
    descripcion:
      "OpenAI para escenas complejas con texto exacto. Soporta edición de imagen y generación pura.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.150 / img",
    precioUnitarioUSD: 0.15,
    velocidadEstimada: "~18s",
    esPremium: true,
  },
];

export const ENDPOINTS_MODELO_IMAGEN_PERMITIDOS: string[] = MODELOS_IMAGEN_FAL.map((modelo) => modelo.id);

// 4. Fichas técnicas reales de Modelos de Video en fal.ai (auditadas con el servidor MCP de fal.ai)
export const MODELOS_VIDEO_FAL: FichaTecnicaModeloFal[] = [
  {
    id: "minimax/h3-max-turbo/image-to-video",
    nombre: "MiniMax H3 Max Turbo",
    descripcion:
      "El motor más rápido y económico para previsualizar el ritmo y movimiento de tus escenas.",
    calidad: "Estándar",
    costoRealUSD: "~$0.03 / seg",
    precioUnitarioUSD: 0.03,
    costoPorMinutoVideoUSD: 1.84,
    velocidadEstimada: "~10s",
    esPremium: false,
  },
  {
    id: "minimax/h3-max/reference-to-video",
    nombre: "MiniMax H3 Max Reference",
    descripcion:
      "Conserva la estética de tus referencias con movimientos suaves a un precio accesible.",
    calidad: "Alta",
    costoRealUSD: "~$0.05 / seg",
    precioUnitarioUSD: 0.05,
    costoPorMinutoVideoUSD: 3.36,
    velocidadEstimada: "~15s",
    esPremium: false,
  },
  {
    id: "alibaba/wan-3.0-prime/reference-to-video",
    nombre: "Wan 3.0 Prime Reference",
    descripcion:
      "Especialista de última generación en mantener la identidad de personajes y objetos con fuerte coherencia multimodal.",
    calidad: "Alta",
    costoRealUSD: "~$0.05 / seg",
    precioUnitarioUSD: 0.05,
    costoPorMinutoVideoUSD: 3.40,
    velocidadEstimada: "~20s",
    esPremium: true,
  },
  {
    id: "fal-ai/kling-video/v3/pro/image-to-video",
    nombre: "Kling v3 Pro",
    descripcion:
      "Estándar profesional: movimiento cinematográfico, fluidez extrema y audio nativo.",
    calidad: "Alta",
    costoRealUSD: "~$0.14 / seg",
    precioUnitarioUSD: 0.14,
    costoPorMinutoVideoUSD: 8.4,
    velocidadEstimada: "~25s",
    esPremium: true,
  },
  {
    id: "bytedance/seedance-2.5/us/image-to-video",
    nombre: "ByteDance Seedance 2.5",
    descripcion:
      "Coreografía visual de alta gama, gran dinamismo de cámara y calidad cinematográfica de estudio.",
    calidad: "Ultra / Cine",
    costoRealUSD: "~$0.18 / seg",
    precioUnitarioUSD: 0.18,
    costoPorMinutoVideoUSD: 11.2,
    velocidadEstimada: "~30s",
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
    idModeloImagen: "fal-ai/flux-kontext/dev",
    idModeloVideo: "minimax/h3-max-turbo/image-to-video",
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
    rangoReferenciaUSD: "~$12.00 - $18.00 / min",
    descripcionCorta: "Máximo fotorrealismo y movimiento cinematográfico",
    idModeloImagen: "fal-ai/nano-banana-pro",
    idModeloVideo: "bytedance/seedance-2.5/us/image-to-video",
  },
];

export const MODO_CALIDAD_POR_DEFECTO: ModoCalidadProduccion = "pro";
export const MODELO_IMAGEN_POR_DEFECTO: string = "google/nano-banana-2.1";
export const MODELO_VIDEO_POR_DEFECTO: string =
  "fal-ai/kling-video/v3/pro/image-to-video";

export const MODOS_CALIDAD_PERMITIDOS: ModoCalidadProduccion[] = ["rapido", "pro", "maximo", "personalizado"];

// 6. Modelos internos por defecto (auditados en fal.ai para análisis, voz, lipsync y upscaling)
export const MODELOS_INTERNOS_POR_DEFECTO = {
  voz: "elevenlabs/tts/eleven-v4",
  transcripcionAudio: "fal-ai/whisper",
  analisisVisionAudio: "fal-ai/any-llm/vision",
  razonamientoDirector: "fal-ai/any-llm",
  lipSync: "fal-ai/sync-lipsync/v3",
  upscaling: "topaz/upscale/video/precision",
} as const;

// 7. Idiomas de salida (este idioma manda sobre el idioma en que el usuario escriba su prompt)
export const IDIOMAS_SALIDA_PERMITIDOS: IdiomaSalidaVideo[] = ["Español", "English", "Français", "Português", "Italiano", "Deutsch"];
export const IDIOMA_SALIDA_POR_DEFECTO: IdiomaSalidaVideo = "Español";

// 7.1 Catálogo Oficial de Estilos Visuales del Proyecto y Conversión Artística
export const ESTILO_VISUAL_POR_DEFECTO: IdEstiloVisual = "original_referencia";

export const ESTILOS_VISUALES_PROYECTO: EstiloVisualProyecto[] = [
  {
    id: "original_referencia",
    nombreVisible: "🎨 Mantener estilo de la foto",
    descripcionCorta: "Si la foto es 3D Pixar mantiene 3D Pixar; si es real, mantiene real",
    icono: "🎨",
    instruccionPromptIngles:
      "Strictly match and preserve the exact artistic medium, shading, and rendering style of the source reference image in image_urls (e.g. if the reference image is 3D Pixar cartoon style, render in that exact 3D animated style; if it is live-action photo, keep it photographic).",
  },
  {
    id: "3d_pixar",
    nombreVisible: "🧸 3D Pixar / Animación Cine",
    descripcionCorta: "Texturas suaves 3D, iluminación de cine animado, proporciones expresivas",
    icono: "🧸",
    instruccionPromptIngles:
      "TRANSFORM and render into premium 3D Pixar-style feature animation aesthetic, stylized appealing 3D character proportions, velvety subsurface scattering skin, expressive animated eyes, soft cinematic studio bounce lighting, rendered in high-end Octane 3D animated film render.",
  },
  {
    id: "cartoon_2d",
    nombreVisible: "📺 Cartoon 2D / Animación Clásica",
    descripcionCorta: "Trazo limpio, colores vibrantes planos y sombreado cel-shading",
    icono: "📺",
    instruccionPromptIngles:
      "TRANSFORM and render into vibrant 2D cartoon animation style, clean hand-drawn ink line art, crisp cel-shading, dynamic comic animation contours, saturated cheerful flat colors, retro classic Saturday morning cartoon look.",
  },
  {
    id: "plastilina_claymation",
    nombreVisible: "🧶 Plastilina / Stop-Motion (Claymation)",
    descripcionCorta: "Textura artesanal de plastilina con huellas suaves e iluminación de maqueta",
    icono: "🧶",
    instruccionPromptIngles:
      "TRANSFORM and render into handcrafted claymation stop-motion aesthetic (Aardman style), tangible sculpted plasticine clay textures, subtle thumbprint impressions on the clay surface, tactile miniature diorama studio lighting, physical miniature set depth of field.",
  },
  {
    id: "realista_cinematografico",
    nombreVisible: "🎬 Realista Cinematográfico 4K (Live-Action)",
    descripcionCorta: "Fotografía real de cine en carne y hueso con iluminación cinematográfica",
    icono: "🎬",
    instruccionPromptIngles:
      "TRANSFORM and render into ultra-realistic 35mm cinema live-action film photography, authentic real-life human features, natural skin pores, realistic textile folds, shallow depth of field, anamorphic cinematic lens lighting, Arri Alexa 4K live-action still.",
  },
  {
    id: "anime_ghibli",
    nombreVisible: "🌸 Anime / Ilustración Japonesa",
    descripcionCorta: "Estética anime cinematográfica detallada con fondos pintados y luz mágica",
    icono: "🌸",
    instruccionPromptIngles:
      "TRANSFORM and render into high-end Japanese anime film aesthetic (Studio Ghibli / Makoto Shinkai style), delicate line art, luminous emotive eyes, hand-painted scenic lighting, gentle atmospheric watercolor tones, beautiful Japanese animated feature style.",
  },
  {
    id: "comic_novela",
    nombreVisible: "💥 Cómic / Novela Gráfica",
    descripcionCorta: "Entintado marcado, tramas y colores intensos de historieta",
    icono: "💥",
    instruccionPromptIngles:
      "TRANSFORM and render into graphic novel and modern American comic book art, heavy bold black ink outlines, halftone dot patterns, dramatic cross-hatching shadows, vibrant high-contrast action comic book palette.",
  },
  {
    id: "bloques_juguete",
    nombreVisible: "🧱 Mundo de Bloques / Juguete 3D",
    descripcionCorta: "Estética de figuras articuladas y piezas brillantes de juguete",
    icono: "🧱",
    instruccionPromptIngles:
      "TRANSFORM and render into a tactile toy brick minifigure world, shiny injection-molded ABS plastic surfaces, seam lines, snap-on plastic accessories, miniature table-top tilt-shift photography, playful brick-built environment.",
  },
  {
    id: "cuento_acuarela",
    nombreVisible: "🖌️ Cuento Ilustrado / Acuarela",
    descripcionCorta: "Textura cálida de libro infantil pintado a mano con acuarelas",
    icono: "🖌️",
    instruccionPromptIngles:
      "TRANSFORM and render into whimsical children's storybook illustration, soft organic watercolor washes on textured rag paper, gentle colored pencil outlines, warm pastel tones, dreamy nostalgic picture book art.",
  },
];

// 8. Archivos Multimedia de Referencia soportados (Imágenes, Audios y Videos)
export const LONGITUD_MINIMA_IDEA = 5;
export const LONGITUD_MAXIMA_IDEA = 3000;

// Límites de peso: 10 MB por imagen y hasta 100 MB para canciones o videos de referencia
export const TAMANO_MAXIMO_IMAGEN_BYTES = 10 * 1024 * 1024;
export const TAMANO_MAXIMO_MULTIMEDIA_BYTES = 100 * 1024 * 1024;

export const TIPOS_IMAGEN_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
export const TIPOS_AUDIO_PERMITIDOS = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/m4a"];
export const TIPOS_VIDEO_PERMITIDOS = ["video/mp4", "video/quicktime", "video/webm"];
export const TIPOS_MULTIMEDIA_PERMITIDOS = [...TIPOS_IMAGEN_PERMITIDOS, ...TIPOS_AUDIO_PERMITIDOS, ...TIPOS_VIDEO_PERMITIDOS];

export const ACEPTAR_ARCHIVOS_MULTIMEDIA_INPUT =
  ".jpg,.jpeg,.png,.webp,.mp3,.wav,.m4a,.mp4,.mov,.webm,image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/mp4,video/mp4,video/quicktime,video/webm";

export const TEXTO_BOTON_COMENZAR = "Comenzar Producción";
export const TEXTO_CARGA_ESTUDIO = "Preparando tu estudio...";
