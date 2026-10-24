// Clasifica el proyecto en las 5 líneas de producción y aplica la Regla de Clarificación Elástica (de 0 a N preguntas).
// Se conecta con tipos_productor_ejecutivo.ts, inspector_multimodal_fal.ts y las pruebas automáticas en tests/.

import { type ArchivoMultimediaGuardado } from "../../mesa_entrada/constantes_mesa_entrada.ts";
import {
  type AnalisisProductorEjecutivo,
  type CategoriaProduccion,
  type FichaIdentidadVisual,
  LISTA_CATEGORIAS_PRODUCCION,
  type PreguntaClarificacionDirector,
  type ResultadoTranscripcionAudio,
} from "./tipos_productor_ejecutivo.ts";

/**
 * Analiza el texto de la idea y los tipos de archivos subidos para identificar la categoría principal y secundarias.
 * Recibe la idea original y la lista de archivos multimedia, y devuelve las categorías detectadas.
 */
export function clasificarEspecialidadProduccion(
  ideaOriginal: string,
  archivosMultimedia: ArchivoMultimediaGuardado[] = []
): {
  categoriaPrincipal: CategoriaProduccion;
  categoriasSecundarias: CategoriaProduccion[];
} {
  const texto = ideaOriginal.toLowerCase();
  const tieneAudio = archivosMultimedia.some((a) => a.tipo === "audio");
  const tieneVideo = archivosMultimedia.some((a) => a.tipo === "video");

  const puntajes: Record<CategoriaProduccion, number> = {
    videoclip_musical: 0,
    publicidad_comercial: 0,
    contenido_redes_influencer: 0,
    traduccion_doblaje_video: 0,
    cine_serie_storyboard: 0,
  };

  if (
    tieneAudio ||
    /(videoclip|canci[oó]n|musical|cantando|cantante|coro|ritmo|banda|single|spotify)/i.test(
      texto
    )
  ) {
    puntajes.videoclip_musical += tieneAudio ? 5 : 4;
  }

  if (
    (tieneVideo && /(trad[uú]c|dobla|idioma|pasar a|hablando en)/i.test(texto)) ||
    /(trad[uú]c(ir|elo|ci[oó]n)|doblaje|doblar video|cambiar idioma|lipsync a otro idioma)/i.test(
      texto
    )
  ) {
    puntajes.traduccion_doblaje_video += 6;
  }

  if (
    /(comercial|publicidad|anuncio|vender|producto|marca|oferta|promoci[oó]n|clientes|campaña)/i.test(
      texto
    )
  ) {
    puntajes.publicidad_comercial += 4;
  }

  if (
    /(reel|tiktok|influencer|tatuaje|tattoo|instagram|redes sociales|viral|ugc|proceso)/i.test(
      texto
    )
  ) {
    puntajes.contenido_redes_influencer += 4;
  }

  if (
    /(pel[ií]cula|serie|miniserie|frutinovela|cortometraje|cuento|infantil|storyboard|cap[ií]tulo|episodio|escenas|ficci[oó]n)/i.test(
      texto
    )
  ) {
    puntajes.cine_serie_storyboard += 4;
  }

  const ordenadas = [...LISTA_CATEGORIAS_PRODUCCION].sort(
    (a, b) => puntajes[b] - puntajes[a]
  );

  const principal =
    puntajes[ordenadas[0]] > 0 ? ordenadas[0] : "cine_serie_storyboard";

  const secundarias = ordenadas
    .slice(1)
    .filter((cat) => puntajes[cat] > 0);

  return {
    categoriaPrincipal: principal,
    categoriasSecundarias: secundarias,
  };
}

/**
 * Construye el System Prompt maestro del Director de Cine y Publicidad con la Regla de Clarificación Elástica (0 a N preguntas).
 * Recibe el idioma de salida del proyecto y devuelve las instrucciones estructuradas para el LLM.
 */
export function construirSystemPromptDirector(idiomaSalida: string): string {
  return `Eres el Agente Productor Ejecutivo y Director de Cine de élite de VoxkyStudio.
Tu misión es analizar la idea del usuario, la descripción visual de sus imágenes y la transcripción de sus audios/videos, clasificar el proyecto en una de las 5 líneas de producción y aplicar la REGLA DE CLARIFICACIÓN ELÁSTICA:

1. LAS 5 CATEGORÍAS OFICIALES:
- "videoclip_musical"
- "publicidad_comercial"
- "contenido_redes_influencer"
- "traduccion_doblaje_video"
- "cine_serie_storyboard"

2. REGLA DE CLARIFICACIÓN ELÁSTICA (PROHIBIDO HACER UN NÚMERO FIJO DE PREGUNTAS):
- CASO A (0 Preguntas): Si el prompt del usuario y los archivos ya dejan claro qué hacer (por ejemplo, una instrucción muy completa o un video subido que solo pide "Tradúcelo al francés"), devuelve "requiereClarificacion": false y "preguntas": [].
- CASO B (De 1 a N preguntas según la complejidad): Si faltan definiciones artísticas o técnicas clave, genera ÚNICAMENTE las preguntas estrictamente necesarias (puede ser 1 sola si falta un detalle puntual, o 4, 5 o 6 si es una película, frutinovela o campaña abierta).
- Adapta tus preguntas a la categoría:
  * En videoclip_musical: pregunta si el protagonista debe cantar frente a cámara moviendo los labios al ritmo de la letra (LipSync) o solo actuar en la historia visual, estilo visual y cambios de escenario.
  * En publicidad_comercial: pregunta si llevará voz en off, diálogo de personajes o solo música y efectos, llamado a la acción y enfoque del producto.
  * En traduccion_doblaje_video: pregunta solo si desea conservar el timbre de voz original con sincronización labial (sync-lipsync/v3) o voz superpuesta estilo documental.
  * En cine_serie_storyboard: pregunta por la personalidad de los protagonistas, el tono (comedia, drama, infantil), el estilo de animación/realismo y el arco de la historia.
- Cada pregunta debe incluir de 2 a 4 "opcionesSugeridas" cortas y accionables para botones rápidos.
- Nota: El idioma final seleccionado para el video es "${idiomaSalida}" (manda sobre el idioma del prompt).

Responde ESTRICTAMENTE con un objeto JSON válido con esta forma exacta (sin bloques markdown):
{
  "categoriaPrincipal": "videoclip_musical | publicidad_comercial | contenido_redes_influencer | traduccion_doblaje_video | cine_serie_storyboard",
  "categoriasSecundarias": [],
  "justificacionCategoria": "Explicación breve en español",
  "requiereClarificacion": true,
  "preguntas": [
    {
      "id": "p1",
      "pregunta": "Texto claro de la pregunta en español",
      "motivoCreativo": "Por qué esta decisión mejora el video",
      "opcionesSugeridas": ["Opción 1", "Opción 2", "Opción 3"]
    }
  ],
  "decisionesAutomaticasDirector": {
    "estiloVisual": "Decisión sugerida por el Director",
    "enfoqueSonoro": "Decisión sonora sugerida"
  },
  "resumenDireccionCreativa": "Resumen ejecutivo de cómo se producirá el video"
}`;
}

/**
 * Determina cuántas y cuáles preguntas hacer (de 0 a N) cuando se evalúa de forma elástica o de respaldo.
 * Recibe la idea, la categoría principal y si el modo silencioso (API/Widget) está activo, y devuelve las preguntas necesarias.
 */
export function generarPreguntasElasticasPorCategoria(
  ideaOriginal: string,
  categoriaPrincipal: CategoriaProduccion,
  modoSilencioso: boolean = false
): PreguntaClarificacionDirector[] {
  if (modoSilencioso) {
    return [];
  }

  const texto = ideaOriginal.toLowerCase();

  // Caso A (0 preguntas): Si es una traducción directa clara o un prompt sumamente específico con estilo, voz y narrativa ya definidos
  if (
    categoriaPrincipal === "traduccion_doblaje_video" &&
    /(lipsync|sincronizaci[oó]n|misma voz|timbre|documental)/i.test(texto)
  ) {
    return [];
  }

  const tieneEstiloDefinido =
    /(cinematogr[aá]fico|realista|3d|pixar|anime|animado|ne[oó]n|minimalista|documental)/i.test(
      texto
    );
  const tieneAudioDefinido =
    /(voz en off|sin voz|solo m[uú]sica|di[aá]logo|lipsync|cantando a c[aá]mara)/i.test(
      texto
    );

  if (ideaOriginal.trim().length > 220 && tieneEstiloDefinido && tieneAudioDefinido) {
    return [];
  }

  // Caso B (De 1 a N preguntas según qué falta realmente en esa categoría)
  if (categoriaPrincipal === "traduccion_doblaje_video") {
    return [
      {
        id: "modo_doblaje",
        pregunta:
          "¿Cómo prefieres realizar el doblaje y adaptación al idioma elegido?",
        motivoCreativo:
          "Define si sincronizamos el movimiento de los labios del hablante original.",
        opcionesSugeridas: [
          "Conservar timbre original + LipSync (sync-lipsync/v3)",
          "Voz profesional nueva + LipSync natural",
          "Voz superpuesta estilo documental (sin alterar labios)",
        ],
      },
    ];
  }

  if (categoriaPrincipal === "videoclip_musical") {
    const preguntasMusicales: PreguntaClarificacionDirector[] = [
      {
        id: "interpretacion_musical",
        pregunta:
          "¿Quieres que el protagonista aparezca cantando frente a cámara moviendo los labios al ritmo de la letra (LipSync) o actuando en una historia visual?",
        motivoCreativo:
          "Determina en qué tomas activaremos el motor de sincronización labial con la canción.",
        opcionesSugeridas: [
          "Combinar canto a cámara (LipSync) con escenas de historia",
          "100% cantando frente a cámara (Performance / LipSync)",
          "Solo historia narrativa mientras suena la canción",
        ],
      },
    ];

    if (!tieneEstiloDefinido) {
      preguntasMusicales.push({
        id: "estetica_escenarios",
        pregunta:
          "¿Qué atmósfera visual y ritmo de cambios de escenario buscas para el videoclip?",
        motivoCreativo:
          "Alinea la iluminación y el montaje con la energía de la canción.",
        opcionesSugeridas: [
          "Estética de cine moderno con 3 a 4 locaciones épicas",
          "Estudio minimalista e iluminación de alto contraste",
          "Fantasía / Surrealista con transiciones dinámicas",
        ],
      });
    }

    return preguntasMusicales;
  }

  if (categoriaPrincipal === "publicidad_comercial") {
    const preguntasComercial: PreguntaClarificacionDirector[] = [];

    if (!tieneAudioDefinido) {
      preguntasComercial.push({
        id: "formato_sonoro_anuncio",
        pregunta:
          "¿Qué tratamiento de voz y sonido tendrá el comercial?",
        motivoCreativo:
          "Define si generaremos locución persuasiva, diálogo de actores o impacto puramente musical.",
        opcionesSugeridas: [
          "Voz en off comercial persuasiva + música",
          "Personaje hablando a cámara (presentador / testimonio)",
          "Solo música épica y efectos sonoros de producto",
        ],
      });
    }

    preguntasComercial.push({
      id: "enfoque_conversion",
      pregunta:
        "¿Cuál es el enfoque principal y el llamado a la acción al cierre del anuncio?",
      motivoCreativo:
        "Asegura que los últimos segundos destaquen tu producto o servicio con fuerza.",
      opcionesSugeridas: [
        "Mostrar el producto en uso real + cierre de marca",
        "Resolver un problema cotidiano + oferta directa",
        "Impacto aspiracional de lujo y estilo de vida",
      ],
    });

    return preguntasComercial;
  }

  if (categoriaPrincipal === "contenido_redes_influencer") {
    return [
      {
        id: "dinamica_reel",
        pregunta:
          "¿Cómo quieres estructurar el gancho y la narrativa para redes sociales?",
        motivoCreativo:
          "Optimiza los primeros 3 segundos para retener la atención en el feed.",
        opcionesSugeridas: [
          "Previsualización realista del resultado + proceso dinámico",
          "Influencer hablando a cámara con cortes ágiles",
          "Demostración visual estética con música en tendencia",
        ],
      },
    ];
  }

  // Categoría: cine_serie_storyboard (Miniseries, películas infantiles, frutinovelas, cortos)
  const preguntasCine: PreguntaClarificacionDirector[] = [
    {
      id: "tono_narrativo",
      pregunta:
        "¿Qué tono emocional y ritmo debe guiar la historia y a sus protagonistas?",
      motivoCreativo:
        "Define la expresividad de las voces, actuaciones y música incidental.",
      opcionesSugeridas: [
        "Comedia divertida y expresiva (ideal para frutinovelas / viral)",
        "Aventura familiar / Infantil tierna y colorida",
        "Drama cinematográfico intenso y emotivo",
      ],
    },
  ];

  if (!tieneEstiloDefinido) {
    preguntasCine.push({
      id: "acabado_visual_cine",
      pregunta: "¿Qué estilo visual prefieres para los personajes y escenarios?",
      motivoCreativo:
        "Mantiene la misma estética en todas las escenas del storyboard.",
      opcionesSugeridas: [
        "Animación 3D estilo estudio de cine (Pixar / DreamWorks)",
        "Realismo cinematográfico con lentes de cine",
        "Personajes antropomórficos hiperrealistas con ojos y boca expresivos",
      ],
    });
  }

  preguntasCine.push({
    id: "arco_historia",
    pregunta: "¿Cómo quieres que cierre este episodio o historia?",
    motivoCreativo:
      "Ayuda al Guionista a estructurar el clímax dentro de la duración elegida.",
    opcionesSugeridas: [
      "Final cerrado con moraleja o giro sorprendente",
      "Final en suspenso (Cliffhanger) para continuar en otro episodio",
      "Final feliz y celebratorio",
    ],
  });

  return preguntasCine;
}

/**
 * Construye un análisis completo y consistente del Productor Ejecutivo como respaldo o para modo API/Widget.
 * Recibe la idea, los archivos, las fichas de visión/audio y si está en modo silencioso, y devuelve el objeto AnalisisProductorEjecutivo.
 */
export function construirAnalisisProductorRespaldo(
  ideaOriginal: string,
  archivosMultimedia: ArchivoMultimediaGuardado[],
  fichaIdentidadVisual: FichaIdentidadVisual | null,
  transcripcionesAudioVideo: ResultadoTranscripcionAudio[],
  modoSilencioso: boolean = false
): AnalisisProductorEjecutivo {
  const { categoriaPrincipal, categoriasSecundarias } =
    clasificarEspecialidadProduccion(ideaOriginal, archivosMultimedia);

  const preguntas = generarPreguntasElasticasPorCategoria(
    ideaOriginal,
    categoriaPrincipal,
    modoSilencioso
  );

  return {
    categoriaPrincipal,
    categoriasSecundarias,
    justificacionCategoria: `Proyecto clasificado como ${categoriaPrincipal.replace(/_/g, " ")} a partir de tu idea y ${archivosMultimedia.length} archivo(s) de referencia.`,
    fichaIdentidadVisual,
    transcripcionesAudioVideo,
    requiereClarificacion: preguntas.length > 0,
    preguntas,
    decisionesAutomaticasDirector: {
      estiloVisual:
        "Iluminación cinematográfica consistente con las referencias adjuntas",
      enfoqueSonoro:
        transcripcionesAudioVideo.length > 0
          ? "Sincronización rítmica con el audio/video analizado"
          : "Diseño sonoro envolvente adaptado al género",
    },
    resumenDireccionCreativa:
      preguntas.length === 0
        ? "Información completa: el Director tiene todos los elementos claros para pasar directamente a la creación del guion técnico."
        : `El Director identificó ${preguntas.length} decisión(es) clave para afinar tu producción antes de escribir el guion.`,
  };
}
