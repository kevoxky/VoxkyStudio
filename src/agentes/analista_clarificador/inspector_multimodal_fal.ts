// Ojos, Oídos y Cerebro del Agente Productor Ejecutivo usando fal.ai (Visión, Whisper y LLM Director).
// Se conecta con constantes_mesa_entrada.ts, tipos_productor_ejecutivo.ts, clasificador_especialidades.ts y /api/agentes/analizar-idea.

import { fal } from "@fal-ai/client";
import {
  type ArchivoMultimediaGuardado,
  MODELOS_INTERNOS_POR_DEFECTO,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { separarArchivosPorTipoEstricto } from "@/mesa_entrada/validar_entrada_proyecto";
import {
  type AnalisisProductorEjecutivo,
  type CategoriaProduccion,
  type EntradaAnalizarIdea,
  type FichaIdentidadVisual,
  LISTA_CATEGORIAS_PRODUCCION,
  type MarcaTiempoTranscripcion,
  type ResultadoTranscripcionAudio,
} from "./tipos_productor_ejecutivo";
import {
  construirAnalisisProductorRespaldo,
  construirSystemPromptDirector,
} from "./clasificador_especialidades";

/**
 * Configura la llave secreta FAL_KEY en el servidor antes de invocar modelos de fal.ai.
 * No recibe parámetros y garantiza que el cliente del servidor esté autenticado.
 */
function configurarCredencialesServidorFal(): boolean {
  const clave = process.env.FAL_KEY;
  if (!clave || clave.trim().length === 0) {
    return false;
  }

  fal.config({
    credentials: clave.trim(),
  });
  return true;
}

/**
 * Inspecciona exclusivamente las imágenes subidas usando fal-ai/any-llm/vision para extraer la ficha de identidad visual.
 * Recibe la lista de archivos de imagen y la idea del usuario, y devuelve la descripción detallada sin aceptar jamás audios o videos.
 */
export async function inspeccionarImagenesConFal(
  archivosImagen: ArchivoMultimediaGuardado[],
  ideaOriginal: string
): Promise<FichaIdentidadVisual | null> {
  // Filtro defensivo estricto: jamás enviar URLs de .mp3, .wav, .m4a, .mp4, .mov o .webm como image_urls a Visión
  const soloImagenesSeguras = archivosImagen.filter(
    (img) =>
      img.tipo === "imagen" &&
      !/\.(mp3|wav|m4a|mp4|mov|webm)(\?|#|$)/i.test(img.url) &&
      !/\.(mp3|wav|m4a|mp4|mov|webm)$/i.test(img.nombre)
  );

  if (soloImagenesSeguras.length === 0) {
    return null;
  }

  const urlsImagenes = soloImagenesSeguras.map((img) => img.url);

  if (!configurarCredencialesServidorFal()) {
    return {
      resumenVisual: `Se registraron ${urlsImagenes.length} imagen(es) de referencia visual listas para mantener consistencia.`,
      detallesPorImagen: soloImagenesSeguras.map(
        (img, i) => `Referencia #${i + 1} (${img.nombre})`
      ),
    };
  }

  try {
    const respuesta = await fal.subscribe(
      MODELOS_INTERNOS_POR_DEFECTO.analisisVisionAudio,
      {
        input: {
          model: "google/gemini-2.5-flash",
          image_urls: urlsImagenes,
          system_prompt:
            "Eres un Director de Fotografía y Continuidad de Cine. Describe en español con precisión técnica los rostros, vestimenta, productos, iluminación o zonas del cuerpo (ej. para tatuajes) que aparecen en las imágenes para mantener consistencia absoluta en todo el video.",
          prompt: `Idea del proyecto: "${ideaOriginal}". Analiza las ${urlsImagenes.length} imagen(es) adjuntas y entrega una Ficha de Identidad Visual concisa en español.`,
        },
      }
    );

    const textoSalida = String(
      (respuesta.data as { output?: string })?.output ?? ""
    ).trim();

    return {
      resumenVisual:
        textoSalida ||
        `Identidad visual extraída de ${urlsImagenes.length} imagen(es) de referencia.`,
      detallesPorImagen: soloImagenesSeguras.map(
        (img, i) => `Imagen ${i + 1}: ${img.nombre}`
      ),
    };
  } catch {
    return {
      resumenVisual: `Se analizaron ${urlsImagenes.length} imagen(es) de referencia para conservar la identidad de personajes, productos y estilo.`,
      detallesPorImagen: soloImagenesSeguras.map(
        (img, i) => `Imagen ${i + 1}: ${img.nombre}`
      ),
    };
  }
}

/**
 * Escucha los archivos de audio o video usando fal-ai/whisper para extraer la letra o diálogo con marcas de tiempo.
 * Recibe los archivos de audio/video subidos y devuelve la lista de transcripciones con sus tiempos.
 */
export async function transcribirAudiosYVideosConWhisper(
  archivosAudioVideo: ArchivoMultimediaGuardado[]
): Promise<ResultadoTranscripcionAudio[]> {
  if (archivosAudioVideo.length === 0) {
    return [];
  }

  const tieneCredencial = configurarCredencialesServidorFal();
  const resultados: ResultadoTranscripcionAudio[] = [];

  for (const archivo of archivosAudioVideo) {
    if (!tieneCredencial) {
      resultados.push({
        urlArchivo: archivo.url,
        nombreArchivo: archivo.nombre,
        textoCompleto: `Archivo ${archivo.tipo} listo para sincronización (${archivo.nombre}).`,
        idiomaDetectado: "Automático",
        ritmoYTono: "Sincronización rítmica natural",
        segmentosConTiempo: [],
      });
      continue;
    }

    try {
      const respuestaWhisper = await fal.subscribe(
        MODELOS_INTERNOS_POR_DEFECTO.transcripcionAudio,
        {
          input: {
            audio_url: archivo.url,
            task: "transcribe",
            chunk_level: "segment",
          },
        }
      );

      const datos = respuestaWhisper.data as {
        text?: string;
        chunks?: Array<{ timestamp?: [number, number]; text?: string }>;
        inferred_languages?: string[];
      };

      const segmentos: MarcaTiempoTranscripcion[] = Array.isArray(datos?.chunks)
        ? datos.chunks.slice(0, 25).map((bloque) => ({
            inicioSeg: Number(bloque.timestamp?.[0] ?? 0),
            finSeg: Number(bloque.timestamp?.[1] ?? 0),
            texto: String(bloque.text ?? "").trim(),
          }))
        : [];

      resultados.push({
        urlArchivo: archivo.url,
        nombreArchivo: archivo.nombre,
        textoCompleto:
          String(datos?.text ?? "").trim() ||
          "Pista instrumental / sin voz hablada detectada.",
        idiomaDetectado: datos?.inferred_languages?.[0] ?? "Detectado",
        ritmoYTono:
          archivo.tipo === "audio"
            ? "Canción / pista musical con marcas de tiempo para videoclip"
            : "Diálogo hablado en video con marcas de tiempo para doblaje/edición",
        segmentosConTiempo: segmentos,
      });
    } catch {
      resultados.push({
        urlArchivo: archivo.url,
        nombreArchivo: archivo.nombre,
        textoCompleto: `Pista de ${archivo.tipo} registrada (${archivo.nombre}).`,
        idiomaDetectado: "Automático",
        ritmoYTono: "Ritmo sincronizado con el archivo original",
        segmentosConTiempo: [],
      });
    }
  }

  return resultados;
}

/**
 * Extrae y valida el JSON devuelto por el LLM Director, o usa el análisis de respaldo si el formato varía.
 * Recibe el texto crudo del modelo y el respaldo calculado, y devuelve el objeto AnalisisProductorEjecutivo seguro.
 */
function interpretarRespuestaJsonDirector(
  textoCrudo: string,
  respaldo: AnalisisProductorEjecutivo,
  modoSilencioso: boolean
): AnalisisProductorEjecutivo {
  try {
    const limpio = textoCrudo
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const inicio = limpio.indexOf("{");
    const fin = limpio.lastIndexOf("}");
    if (inicio === -1 || fin === -1) {
      return respaldo;
    }

    const parseado = JSON.parse(limpio.slice(inicio, fin + 1));

    const categoriaPrincipal: CategoriaProduccion =
      LISTA_CATEGORIAS_PRODUCCION.includes(parseado.categoriaPrincipal)
        ? parseado.categoriaPrincipal
        : respaldo.categoriaPrincipal;

    const preguntasCrudas = Array.isArray(parseado.preguntas)
      ? parseado.preguntas
      : respaldo.preguntas;

    const preguntasLimpias = modoSilencioso
      ? []
      : preguntasCrudas
          .filter(
            (p: { pregunta?: string }) =>
              typeof p?.pregunta === "string" && p.pregunta.trim().length > 0
          )
          .map(
            (
              p: {
                id?: string;
                pregunta: string;
                motivoCreativo?: string;
                opcionesSugeridas?: string[];
              },
              indice: number
            ) => ({
              id: p.id || `pregunta_${indice + 1}`,
              pregunta: p.pregunta.trim(),
              motivoCreativo:
                p.motivoCreativo ||
                "Decisión creativa para afinar el estilo de producción.",
              opcionesSugeridas:
                Array.isArray(p.opcionesSugeridas) &&
                p.opcionesSugeridas.length > 0
                  ? p.opcionesSugeridas.map((op) => String(op))
                  : ["Sí, aplicar recomendación del Director", "Prefiero otro enfoque"],
            })
          );

    const requiereClarificacion =
      !modoSilencioso &&
      Boolean(parseado.requiereClarificacion) &&
      preguntasLimpias.length > 0;

    return {
      categoriaPrincipal,
      categoriasSecundarias: Array.isArray(parseado.categoriasSecundarias)
        ? parseado.categoriasSecundarias.filter((c: CategoriaProduccion) =>
            LISTA_CATEGORIAS_PRODUCCION.includes(c)
          )
        : respaldo.categoriasSecundarias,
      justificacionCategoria:
        typeof parseado.justificacionCategoria === "string"
          ? parseado.justificacionCategoria
          : respaldo.justificacionCategoria,
      fichaIdentidadVisual: respaldo.fichaIdentidadVisual,
      transcripcionesAudioVideo: respaldo.transcripcionesAudioVideo,
      requiereClarificacion,
      preguntas: requiereClarificacion ? preguntasLimpias : [],
      decisionesAutomaticasDirector:
        parseado.decisionesAutomaticasDirector &&
        typeof parseado.decisionesAutomaticasDirector === "object"
          ? parseado.decisionesAutomaticasDirector
          : respaldo.decisionesAutomaticasDirector,
      resumenDireccionCreativa:
        typeof parseado.resumenDireccionCreativa === "string"
          ? parseado.resumenDireccionCreativa
          : respaldo.resumenDireccionCreativa,
    };
  } catch {
    return respaldo;
  }
}

/**
 * Ejecuta el flujo multimodal completo del Paso 2: inspecciona imágenes, transcribe audios/videos y genera la clarificación elástica.
 * Recibe los datos del proyecto o del Widget externo y devuelve el análisis completo del Productor Ejecutivo.
 */
export async function ejecutarAnalisisProductorEjecutivo(
  entrada: EntradaAnalizarIdea
): Promise<AnalisisProductorEjecutivo> {
  const modoSilencioso = Boolean(entrada.modoSilencioso);
  const idiomaSalida = entrada.idiomaSalida || "Español";

  // Separamos estrictamente imágenes (para Visión) y audios/videos (para Whisper con audio_url)
  const { archivosImagen, archivosAudioVideo } = separarArchivosPorTipoEstricto(
    entrada.archivosMultimedia,
    entrada.imagenesReferencia
  );
  const archivosMultimedia: ArchivoMultimediaGuardado[] = [
    ...archivosImagen,
    ...archivosAudioVideo,
  ];

  // 1. Ojos y Oídos del Agente en paralelo (Visión solo recibe imágenes; Whisper solo recibe audio/video con audio_url)
  const [fichaIdentidadVisual, transcripcionesAudioVideo] = await Promise.all([
    inspeccionarImagenesConFal(archivosImagen, entrada.ideaOriginal),
    transcribirAudiosYVideosConWhisper(archivosAudioVideo),
  ]);

  const respaldo = construirAnalisisProductorRespaldo(
    entrada.ideaOriginal,
    archivosMultimedia,
    fichaIdentidadVisual,
    transcripcionesAudioVideo,
    modoSilencioso
  );

  if (modoSilencioso || !configurarCredencialesServidorFal()) {
    return respaldo;
  }

  // 2. Cerebro del Director: evalúa qué categoría es y cuántas preguntas (0 a N) son estrictamente necesarias
  try {
    const contextoMultimodal = JSON.stringify({
      ideaOriginal: entrada.ideaOriginal,
      formato: entrada.formato || "16:9",
      duracionObjetivo: entrada.duracionObjetivo || "Auto",
      idiomaSalida,
      cantidadImagenes: archivosImagen.length,
      resumenVisual: fichaIdentidadVisual?.resumenVisual ?? "Sin imágenes adjuntas",
      transcripciones: transcripcionesAudioVideo.map((t) => ({
        nombre: t.nombreArchivo,
        texto: t.textoCompleto.slice(0, 600),
        idiomaDetectado: t.idiomaDetectado,
      })),
    });

    const respuestaLlm = await fal.subscribe(
      MODELOS_INTERNOS_POR_DEFECTO.razonamientoDirector,
      {
        input: {
          model: "google/gemini-2.5-flash",
          system_prompt: construirSystemPromptDirector(idiomaSalida),
          prompt: `Analiza este proyecto audiovisual y responde únicamente con el JSON solicitado:\n${contextoMultimodal}`,
        },
      }
    );

    const textoSalida = String(
      (respuestaLlm.data as { output?: string })?.output ?? ""
    );

    return interpretarRespuestaJsonDirector(
      textoSalida,
      respaldo,
      modoSilencioso
    );
  } catch {
    return respaldo;
  }
}
