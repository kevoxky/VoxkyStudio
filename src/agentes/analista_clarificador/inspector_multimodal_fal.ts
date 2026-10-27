// Ojos, Oídos y Cerebro del Agente Productor Ejecutivo usando fal.ai (Ficha Técnica individual por imagen, Whisper y LLM Director).
// Se conecta con constantes_mesa_entrada.ts, tipos_productor_ejecutivo.ts, clasificador_especialidades.ts y /api/agentes/analizar-idea.

import { fal } from "@fal-ai/client";
import {
  type ArchivoMultimediaGuardado,
  MODELOS_INTERNOS_POR_DEFECTO,
} from "../../mesa_entrada/constantes_mesa_entrada.ts";
import { separarArchivosPorTipoEstricto } from "../../mesa_entrada/validar_entrada_proyecto.ts";
import {
  type AnalisisProductorEjecutivo,
  type CategoriaProduccion,
  type DesglosePersonajeIdentidadYVestuario,
  type EntradaAnalizarIdea,
  type FichaIdentidadVisual,
  LISTA_CATEGORIAS_PRODUCCION,
  type ResultadoTranscripcionAudio,
} from "./tipos_productor_ejecutivo.ts";
import {
  type ChunkCrudoWhisper,
  convertirChunksWhisperASegmentos,
  reconciliarLetraYSegmentosCompletos,
} from "./reconciliador_letra_whisper.ts";
import {
  construirAnalisisProductorRespaldo,
  construirSystemPromptDirector,
} from "./clasificador_especialidades.ts";

export { reconciliarLetraYSegmentosCompletos };

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
 * Limpia cualquier rastro de código JSON crudo, llaves `{ }`, comillas de propiedades o textos robóticos
 * para que en la interfaz siempre se lea una Ficha Técnica limpia y natural en español.
 */
export function limpiarTextoFichaTecnica(texto: string): string {
  return String(texto ?? "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .replace(
      /^Rasgos físicos inmutables de [^:]+:\s*/i,
      ""
    )
    .replace(/\{\s*"resumenVisual"\s*:\s*"/gi, "")
    .replace(/"\s*,\s*"personajesSeparados"\s*:[\s\S]*$/gi, "")
    .replace(/[{}\[\]]/g, "")
    .replace(/"(resumenVisual|identidadFisicaInmutable|vestuarioOriginalFoto|nombreArchivo)"\s*:\s*/gi, "")
    .replace(/^["'\s]+|["'\s]+$/g, "")
    .replace(/\*\*/g, "")
    .trim();
}

/**
 * Extrae de la respuesta de Visión de una sola imagen sus dos campos:
 * 1) `identidadFisicaInmutable` (Edad, rostro, ojos, cabello, piel, complexión y estilo visual)
 * 2) `vestuarioOriginalFoto` (Ropa, colores y calzado exactos que lleva en la foto)
 */
export function extraerFichaTecnicaDeUnaImagen(
  nombreArchivo: string,
  urlImagen: string,
  textoVisionIndividual: string
): DesglosePersonajeIdentidadYVestuario {
  const crudo = String(textoVisionIndividual ?? "").trim();

  // Buscamos los marcadores explícitos APARIENCIA_Y_RASGOS_FISICOS y ROPA_Y_CALZADO_EN_FOTO
  const regexRasgos =
    /(?:APARIENCIA_Y_RASGOS_FISICOS|IDENTIDAD_FISICA|RASGOS_FISICOS)\s*:\s*([\s\S]*?)(?=(?:ROPA_Y_CALZADO_EN_FOTO|VESTUARIO_BASE|VESTUARIO|ROPA)\s*:|$)/i;
  const regexVestuario =
    /(?:ROPA_Y_CALZADO_EN_FOTO|VESTUARIO_BASE|VESTUARIO|ROPA)\s*:\s*([\s\S]*)$/i;

  const matchRasgos = crudo.match(regexRasgos);
  const matchVestuario = crudo.match(regexVestuario);

  if (matchRasgos && matchRasgos[1]?.trim()) {
    const identidadLimpia = limpiarTextoFichaTecnica(matchRasgos[1]);
    const vestuarioLimpio = matchVestuario?.[1]
      ? limpiarTextoFichaTecnica(matchVestuario[1])
      : "Ropa y calzado originales visibles en la imagen de referencia.";

    return {
      nombreArchivo,
      urlImagen,
      identidadFisicaInmutable:
        identidadLimpia ||
        `Personaje o elemento visual de la referencia "${nombreArchivo}".`,
      vestuarioOriginalFoto:
        vestuarioLimpio ||
        "Mantiene la vestimenta y colores mostrados en su foto original.",
    };
  }

  // Si vino un párrafo corrido sin marcadores, separamos inteligentemente las frases de ropa de las de rasgos físicos
  const textoLimpio = limpiarTextoFichaTecnica(crudo);
  if (textoLimpio.length > 0) {
    const oraciones = textoLimpio
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const palabrasRopa = [
      "camiseta",
      "camisa",
      "blusa",
      "bata",
      "pantalón",
      "pantalon",
      "short",
      "shorts",
      "falda",
      "vestido",
      "zapatilla",
      "zapato",
      "tenis",
      "botas",
      "chaqueta",
      "suéter",
      "sueter",
      "ropa",
      "viste",
      "lleva puesto",
      "overol",
      "gorra",
    ];

    const oracionesRopa = oraciones.filter((oracion) =>
      palabrasRopa.some((p) => oracion.toLowerCase().includes(p))
    );
    const oracionesRasgos = oraciones.filter(
      (oracion) => !oracionesRopa.includes(oracion)
    );

    return {
      nombreArchivo,
      urlImagen,
      identidadFisicaInmutable:
        oracionesRasgos.length > 0
          ? oracionesRasgos.join(" ")
          : textoLimpio,
      vestuarioOriginalFoto:
        oracionesRopa.length > 0
          ? oracionesRopa.join(" ")
          : textoLimpio,
    };
  }

  return {
    nombreArchivo,
    urlImagen,
    identidadFisicaInmutable: `Personaje o referencia visual "${nombreArchivo}" (conservando rostro, edad, cabello, complexión y estilo artístico original).`,
    vestuarioOriginalFoto: `Vestimenta, colores y calzado exactos que aparecen en la foto "${nombreArchivo}".`,
  };
}

/**
 * Construye o interpreta el desglose de Ficha Técnica (`identidadFisicaInmutable` y `vestuarioOriginalFoto`)
 * para una lista de imágenes (compatible tanto con JSON estructurado como con texto natural).
 */
export function construirDesgloseIdentidadYVestuario(
  archivosImagen: Array<{ nombre: string; url: string }>,
  textoVisionCrudo: string,
  ideaOriginal: string = ""
): {
  resumenVisual: string;
  personajesSeparados: DesglosePersonajeIdentidadYVestuario[];
} {
  const limpio = String(textoVisionCrudo ?? "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  // 1. Si el texto es un JSON válido con personajesSeparados, lo extraemos limpiamente
  const inicioJson = limpio.indexOf("{");
  const finJson = limpio.lastIndexOf("}");
  if (inicioJson !== -1 && finJson !== -1 && finJson > inicioJson) {
    try {
      const parseado = JSON.parse(limpio.slice(inicioJson, finJson + 1)) as {
        resumenVisual?: string;
        personajesSeparados?: Array<{
          nombreArchivo?: string;
          identidadFisicaInmutable?: string;
          vestuarioOriginalFoto?: string;
        }>;
      };

      if (
        Array.isArray(parseado.personajesSeparados) &&
        parseado.personajesSeparados.length > 0
      ) {
        const personajes: DesglosePersonajeIdentidadYVestuario[] =
          archivosImagen.map((img, idx) => {
            const coincidente =
              parseado.personajesSeparados?.find(
                (p) =>
                  p.nombreArchivo &&
                  img.nombre
                    .toLowerCase()
                    .includes(p.nombreArchivo.toLowerCase())
              ) ?? parseado.personajesSeparados?.[idx];

            return {
              nombreArchivo: img.nombre,
              urlImagen: img.url,
              identidadFisicaInmutable: limpiarTextoFichaTecnica(
                coincidente?.identidadFisicaInmutable ||
                  `Rasgos físicos y rostro de ${img.nombre}.`
              ),
              vestuarioOriginalFoto: limpiarTextoFichaTecnica(
                coincidente?.vestuarioOriginalFoto ||
                  `Vestuario original en la foto ${img.nombre}.`
              ),
            };
          });

        const resumenLegible =
          limpiarTextoFichaTecnica(parseado.resumenVisual || "") ||
          personajes
            .map(
              (p) =>
                `**${p.nombreArchivo}:** ${p.identidadFisicaInmutable} Vestuario: ${p.vestuarioOriginalFoto}`
            )
            .join("\n\n");

        return {
          resumenVisual: resumenLegible,
          personajesSeparados: personajes,
        };
      }
    } catch {
      // Si el JSON estaba truncado, continuamos abajo limpiando cualquier llave o sintaxis JSON
    }
  }

  // 2. Si no es JSON o el JSON se cortó, extraemos la ficha limpia para cada imagen sin mostrar código nunca
  const ideaMinuscula = ideaOriginal.toLowerCase();
  const personajesExtraidos: DesglosePersonajeIdentidadYVestuario[] =
    archivosImagen.map((img) => {
      if (limpio.length > 0) {
        return extraerFichaTecnicaDeUnaImagen(img.nombre, img.url, limpio);
      }

      const nombreLimpio = img.nombre.toLowerCase();
      const esDoctoraOMedico =
        nombreLimpio.includes("doctor") ||
        nombreLimpio.includes("medic") ||
        ideaMinuscula.includes("doctora") ||
        ideaMinuscula.includes("doctor");

      return {
        nombreArchivo: img.nombre,
        urlImagen: img.url,
        identidadFisicaInmutable: `Rasgos faciales, edad, ojos, peinado, tono de piel y complexión física de "${img.nombre}".`,
        vestuarioOriginalFoto: esDoctoraOMedico
          ? `Bata blanca médica de doctora sobre blusa clínica azul (vestuario base de la foto "${img.nombre}").`
          : `Ropa, colores y calzado originales visibles en la foto "${img.nombre}".`,
      };
    });

  const resumenConstruido = personajesExtraidos
    .map(
      (p) =>
        `**${p.nombreArchivo}**\n• **Rasgos físicos y estilo:** ${p.identidadFisicaInmutable}\n• **Ropa y calzado en la foto:** ${p.vestuarioOriginalFoto}`
    )
    .join("\n\n");

  return {
    resumenVisual: resumenConstruido,
    personajesSeparados: personajesExtraidos,
  };
}

/**
 * Inspecciona CADA imagen subida de manera individual usando fal-ai/any-llm/vision
 * para crear una Ficha Técnica clara, real y exclusiva de cada personaje o producto sin mezclar descripciones.
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

  if (!configurarCredencialesServidorFal()) {
    const desgloseSinClave = construirDesgloseIdentidadYVestuario(
      soloImagenesSeguras,
      "",
      ideaOriginal
    );
    return {
      resumenVisual: desgloseSinClave.resumenVisual,
      detallesPorImagen: soloImagenesSeguras.map(
        (img, i) => `Referencia #${i + 1} (${img.nombre})`
      ),
      personajesSeparados: desgloseSinClave.personajesSeparados,
    };
  }

  try {
    // Analizamos cada imagen por separado en paralelo para que cada personaje tenga su propia Ficha Técnica exacta
    const fichasPorImagen = await Promise.all(
      soloImagenesSeguras.map(async (img) => {
        try {
          const respuesta = await fal.subscribe(
            MODELOS_INTERNOS_POR_DEFECTO.analisisVisionAudio,
            {
              input: {
                model: "google/gemini-2.5-flash",
                image_urls: [img.url],
                system_prompt: [
                  "Eres un Director de Arte y Casting de Cine.",
                  "Observa únicamente la imagen adjunta y escribe su Ficha Técnica en español sencillo y directo, usando exactamente estas dos etiquetas (sin JSON, sin llaves y sin código):",
                  "APARIENCIA_Y_RASGOS_FISICOS: Describe aquí qué es (niño, niña, adulto, producto, etc.), su estilo visual (ej. animación 3D tipo Pixar, ilustración 2D o foto realista), edad aproximada, forma de cara, color y forma de ojos, cejas, tono de piel, corte y color de cabello, complexión y accesorios fijos (como gafas, moños o aretes).",
                  "ROPA_Y_CALZADO_EN_FOTO: Describe aquí con total precisión qué prendas de vestir lleva puestas en la foto, sus colores exactos, estampados (ej. rayas, logos, texturas) y su calzado.",
                ].join("\n"),
                prompt: `Archivo de referencia: "${img.nombre}". Contexto del proyecto: "${ideaOriginal}". Escribe la Ficha Técnica de esta imagen con las dos etiquetas solicitadas:`,
              },
            }
          );

          const textoSalida = String(
            (respuesta.data as { output?: string })?.output ?? ""
          ).trim();

          return extraerFichaTecnicaDeUnaImagen(
            img.nombre,
            img.url,
            textoSalida
          );
        } catch {
          return extraerFichaTecnicaDeUnaImagen(img.nombre, img.url, "");
        }
      })
    );

    const resumenGlobal = fichasPorImagen
      .map(
        (p) =>
          `**${p.nombreArchivo}**\n• **Rasgos físicos y estilo:** ${p.identidadFisicaInmutable}\n• **Ropa y calzado en la foto:** ${p.vestuarioOriginalFoto}`
      )
      .join("\n\n");

    return {
      resumenVisual: resumenGlobal,
      detallesPorImagen: soloImagenesSeguras.map(
        (img, i) => `Imagen ${i + 1}: ${img.nombre}`
      ),
      personajesSeparados: fichasPorImagen,
    };
  } catch {
    const desgloseRespaldo = construirDesgloseIdentidadYVestuario(
      soloImagenesSeguras,
      "",
      ideaOriginal
    );
    return {
      resumenVisual: desgloseRespaldo.resumenVisual,
      detallesPorImagen: soloImagenesSeguras.map(
        (img, i) => `Imagen ${i + 1}: ${img.nombre}`
      ),
      personajesSeparados: desgloseRespaldo.personajesSeparados,
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
        chunks?: ChunkCrudoWhisper[];
        inferred_languages?: string[];
      };

      const textoCompletoExtraido =
        String(datos?.text ?? "").trim() ||
        "Pista instrumental / sin voz hablada detectada.";

      const segmentosCrudos = convertirChunksWhisperASegmentos(
        datos?.chunks,
        archivo.duracionSegundos
      );

      const segmentosCompletos =
        textoCompletoExtraido ===
        "Pista instrumental / sin voz hablada detectada."
          ? segmentosCrudos
          : reconciliarLetraYSegmentosCompletos(
              textoCompletoExtraido,
              segmentosCrudos,
              archivo.duracionSegundos
            );

      const ultimoFinDetectado =
        segmentosCompletos.length > 0
          ? segmentosCompletos[segmentosCompletos.length - 1].finSeg
          : undefined;

      resultados.push({
        urlArchivo: archivo.url,
        nombreArchivo: archivo.nombre,
        textoCompleto: textoCompletoExtraido,
        idiomaDetectado: datos?.inferred_languages?.[0] ?? "Detectado",
        ritmoYTono:
          archivo.tipo === "audio"
            ? "Canción / pista musical con marcas de tiempo para videoclip"
            : "Diálogo hablado en video con marcas de tiempo para doblaje/edición",
        duracionTotalSegundos: archivo.duracionSegundos ?? ultimoFinDetectado,
        segmentosConTiempo: segmentosCompletos,
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
                  : [
                      "Sí, aplicar recomendación del Director",
                      "Prefiero otro enfoque",
                    ],
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
 * Ejecuta el flujo multimodal completo del Paso 2: inspecciona imágenes individualmente, transcribe audios/videos y genera la clarificación.
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

  // 1. Ojos y Oídos del Agente en paralelo (Visión analiza cada imagen por separado; Whisper transcribe el audio/video)
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
      resumenVisual:
        fichaIdentidadVisual?.resumenVisual ?? "Sin imágenes adjuntas",
      personajesSeparados: fichaIdentidadVisual?.personajesSeparados ?? [],
      transcripciones: transcripcionesAudioVideo.map((t) => ({
        nombre: t.nombreArchivo,
        texto: t.textoCompleto,
        duracionTotalSegundos: t.duracionTotalSegundos,
        totalSegmentos: t.segmentosConTiempo.length,
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
