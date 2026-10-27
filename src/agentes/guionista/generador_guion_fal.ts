// Agente Guionista Cinematográfico (Paso 3) con Duración Autónoma, cobertura 100% y Armario de Vestuario Contextual.
// Se conecta con tipos_guion.ts, planificador_bloques_tiempo.ts, gestor_vestuario_contextual.ts y /api/agentes/generar-guion.

import { fal } from "@fal-ai/client";
import { MODELOS_INTERNOS_POR_DEFECTO } from "@/mesa_entrada/constantes_mesa_entrada";
import { separarArchivosPorTipoEstricto } from "@/mesa_entrada/validar_entrada_proyecto";
import { type AnalisisProductorEjecutivo } from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";
import { reconciliarLetraYSegmentosCompletos } from "@/agentes/analista_clarificador/reconciliador_letra_whisper";
import {
  type EntradaGenerarGuion,
  type EscenaGuion,
  type GuionProduccionCompleto,
  type ModoDuracionGuion,
  type PrendaVestuarioEscenario,
  type TramoTiempoPlanificado,
} from "./tipos_guion";
import {
  construirEscenaRespaldoPorTramo,
  detectarPreferenciaLipSync,
  detectarReglaDuracionPorToma,
  determinarDuracionTotalProduccionSegundos,
  planificarTramosSinHuecos,
} from "./planificador_bloques_tiempo";
import {
  aplicarConsistenciaArmarioAEscenas,
  construirArmarioVestuariosContextual,
} from "./gestor_vestuario_contextual";

const TAMANO_BLOQUE_ESCENAS = 10;
const MAX_TOKENS_SALIDA_GUION = 16_000;

/**
 * Configura la llave secreta FAL_KEY en el servidor antes de invocar al modelo LLM del Guionista.
 * No recibe parámetros y devuelve true si la credencial está disponible.
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
 * Construye el prompt del sistema para el Agente Guionista y Diseñador de Vestuario de Cine.
 * Recibe el idioma, la ficha visual, las referencias, las decisiones y el modo de duración, y devuelve las instrucciones.
 */
function construirSystemPromptGuionista(
  idiomaSalida: string,
  resumenFichaVisual: string,
  nombresImagenesReferencia: string[],
  respuestasDirector: Record<string, string>,
  modoDuracion: ModoDuracionGuion,
  limiteMaximoSeg: number
): string {
  const explicacionModo =
    modoDuracion === "fijo_usuario"
      ? `PRIORIDAD 1 (ORDEN DEL USUARIO): El usuario pidió tomas de máximo ${limiteMaximoSeg}s. Explica en "justificacionDuracion" cómo se adapta cada corte a ese ritmo.`
      : `PRIORIDAD 2 (AUTONOMÍA DEL DIRECTOR): Elige y justifica en "justificacionDuracion" por qué cada toma tiene su duración (ej. "Corte rápido de 4s para el salto del coro" o "Toma extendida de 10s para mostrar la transición emocional completa").`;

  return `Eres el Agente Guionista Cinematográfico y Diseñador de Vestuario de Cine de VoxkyStudio.
Tu misión es escribir las escenas del Timeline cubriendo el 100% de los tramos de tiempo desde 0.0s hasta el segundo final sin dejar huecos.

${explicacionModo}

REGLAS DE VESTUARIO CONTEXTUAL Y CONSISTENCIA POR ESCENARIO (APLICABLE A CUALQUIER HISTORIA):
- CASO 1 (Misma ropa en todo el video): Si el usuario pidió conservar la ropa original ("no cambiar la ropa", "100% exactos a la referencia") o si el proyecto no exige cambios de vestuario, usa únicamente "idVestuarioAsignado": "vestuario_base" en todas las escenas.
- CASO 2 (Cambios de ropa lógicos según el escenario de la historia): Si la narrativa requiere que un personaje cambie de ropa según la situación o lugar (sea cual sea la historia: un chef en la cocina vs. en la calle, un explorador en la nieve vs. en casa, alguien entrenando, nadando, trabajando, durmiendo o en el espacio), define en "armarioVestuarios" un identificador claro ("vestuario_<escenario>", ej. "vestuario_cocina", "vestuario_nieve", "vestuario_gimnasio", "vestuario_playa", "vestuario_espacio", etc.), escribe en "escenarioOLugar" el lugar real de tu historia y diseña "descripcionVestuario" y "promptVestuarioIngles" acordes a la edad y estilo del personaje.
- REGLA DE ORO DE CONTINUIDAD: Todas las escenas que ocurran en un mismo lugar o situación dentro del video DEBEN tener exactamente el mismo "idVestuarioAsignado" y la misma ropa exacta sumada a la identidad física inmutable del personaje.

REGLAS OBLIGATORIAS DE ESCENA:
1. IDIOMA DE SALIDA ("${idiomaSalida}"): "letraODialogo" debe ir en "${idiomaSalida}" (o "[Instrumental / Acción]" si no hay voz).
2. DESCRIPCIÓN VISUAL EN ESPAÑOL: "descripcionVisual" va en español claro explicando qué ocurre en pantalla en esa toma.
3. PROMPT IMAGEN ANCLA EN INGLÉS ("promptImagenAncla"): Descripción detallada en INGLÉS que inyecta la Identidad Física Inmutable y el vestuario asignado:
   "${resumenFichaVisual}"
4. PROMPT VIDEO ANIMACIÓN EN INGLÉS ("promptVideoAnimacion"): Movimiento de cámara y actuación para el modelo de video del Paso 6.
5. ARCHIVOS DE REFERENCIA ("archivosReferenciaUsados"): Elige de esta lista qué referencias entran en esta toma: ${JSON.stringify(nombresImagenesReferencia)}.
6. DECISIONES DEL DIRECTOR: ${JSON.stringify(respuestasDirector)}.

Responde ÚNICAMENTE con un objeto JSON válido con la propiedad "escenas" (y opcionalmente "armarioVestuarios"):
{
  "armarioVestuarios": [
    {
      "idVestuario": "vestuario_base",
      "nombrePersonaje": "NombreArchivo.png",
      "escenarioOLugar": "Ropa original de la foto de referencia",
      "descripcionVestuario": "Descripción fija en español...",
      "promptVestuarioIngles": "Fixed English outfit description...",
      "esVestuarioBaseOriginal": true
    }
  ],
  "escenas": [
    {
      "numero": 1,
      "titulo": "Título corto de la toma",
      "justificacionDuracion": "Nota breve de por qué el director eligió esa duración para esta toma",
      "letraODialogo": "Frase de la canción o diálogo",
      "descripcionVisual": "Explicación clara en español...",
      "promptImagenAncla": "Detailed English prompt with character immutable identity and assigned scene wardrobe...",
      "promptVideoAnimacion": "Camera movement and character acting in English...",
      "archivosReferenciaUsados": ["NombreArchivo.png"],
      "requiereLipSync": true,
      "idVestuarioAsignado": "vestuario_base"
    }
  ]
}`;
}

/**
 * Genera un bloque de escenas con el LLM de fal.ai y lo fusiona con los tramos matemáticos para garantizar 0 huecos.
 * Recibe los tramos del bloque y el contexto creativo, y devuelve las escenas completas con justificacionDuracion.
 */
async function generarBloqueDeEscenasConFal(
  bloqueTramos: TramoTiempoPlanificado[],
  totalEscenasProyecto: number,
  ideaOriginal: string,
  idiomaSalida: string,
  resumenFichaVisual: string,
  nombresImagenesReferencia: string[],
  respuestasDirector: Record<string, string>,
  modoDuracion: ModoDuracionGuion,
  limiteMaximoSeg: number,
  tieneCredencial: boolean
): Promise<{
  escenas: EscenaGuion[];
  armarioSugerido: PrendaVestuarioEscenario[];
}> {
  const escenasRespaldo = bloqueTramos.map((tramo) =>
    construirEscenaRespaldoPorTramo(
      tramo,
      ideaOriginal,
      nombresImagenesReferencia,
      resumenFichaVisual
    )
  );

  if (!tieneCredencial) {
    return { escenas: escenasRespaldo, armarioSugerido: [] };
  }

  try {
    const promptBloque = JSON.stringify({
      ideaOriginal,
      modoDuracion,
      totalEscenasDelVideo: totalEscenasProyecto,
      tramosDeEsteBloque: bloqueTramos.map((t) => ({
        numero: t.numero,
        tiempoInicioSeg: t.tiempoInicioSeg,
        tiempoFinSeg: t.tiempoFinSeg,
        duracionSegundos: t.duracionSegundos,
        justificacionSugerida: t.justificacionDuracion,
        letraQueSuenaEnEsteTramo: t.letraODialogo,
        requiereLipSyncSugerido: t.requiereLipSyncSugerido,
      })),
    });

    const respuestaLlm = await fal.subscribe(
      MODELOS_INTERNOS_POR_DEFECTO.razonamientoDirector,
      {
        input: {
          model: "google/gemini-2.5-flash",
          max_tokens: MAX_TOKENS_SALIDA_GUION,
          system_prompt: construirSystemPromptGuionista(
            idiomaSalida,
            resumenFichaVisual,
            nombresImagenesReferencia,
            respuestasDirector,
            modoDuracion,
            limiteMaximoSeg
          ),
          prompt: `Genera las ${bloqueTramos.length} escenas exactas para estos tramos de tiempo (Escenas #${bloqueTramos[0].numero} a #${bloqueTramos[bloqueTramos.length - 1].numero} de ${totalEscenasProyecto}) en JSON:\n${promptBloque}`,
        },
      }
    );

    const textoCrudo = String(
      (respuestaLlm.data as { output?: string })?.output ?? ""
    )
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const inicioJson = textoCrudo.indexOf("{");
    const finJson = textoCrudo.lastIndexOf("}");
    if (inicioJson === -1 || finJson === -1) {
      return { escenas: escenasRespaldo, armarioSugerido: [] };
    }

    const parseado = JSON.parse(textoCrudo.slice(inicioJson, finJson + 1)) as {
      armarioVestuarios?: PrendaVestuarioEscenario[];
      escenas?: Array<Partial<EscenaGuion>>;
    };
    const listaDevuelta = Array.isArray(parseado.escenas)
      ? parseado.escenas
      : [];
    const armarioSugerido = Array.isArray(parseado.armarioVestuarios)
      ? parseado.armarioVestuarios
      : [];

    const escenasMapeadas = bloqueTramos.map((tramo, idx) => {
      const respaldo = escenasRespaldo[idx];
      const candidata =
        listaDevuelta.find((e) => Number(e?.numero) === tramo.numero) ??
        listaDevuelta[idx];

      if (!candidata) {
        return respaldo;
      }

      const archivosElegidos =
        Array.isArray(candidata.archivosReferenciaUsados) &&
        candidata.archivosReferenciaUsados.length > 0
          ? candidata.archivosReferenciaUsados.map((a) => String(a))
          : respaldo.archivosReferenciaUsados;

      return {
        idEscena: `escena_${tramo.numero}`,
        numero: tramo.numero,
        titulo:
          typeof candidata.titulo === "string" &&
          candidata.titulo.trim().length > 0
            ? candidata.titulo.trim()
            : respaldo.titulo,
        tiempoInicioSeg: tramo.tiempoInicioSeg,
        tiempoFinSeg: tramo.tiempoFinSeg,
        duracionSegundos: tramo.duracionSegundos,
        justificacionDuracion:
          typeof candidata.justificacionDuracion === "string" &&
          candidata.justificacionDuracion.trim().length > 0
            ? candidata.justificacionDuracion.trim()
            : respaldo.justificacionDuracion,
        letraODialogo: !tramo.esInstrumental
          ? tramo.letraODialogo
          : typeof candidata.letraODialogo === "string" &&
              candidata.letraODialogo.trim().length > 0
            ? candidata.letraODialogo.trim()
            : respaldo.letraODialogo,
        descripcionVisual:
          typeof candidata.descripcionVisual === "string" &&
          candidata.descripcionVisual.trim().length > 0
            ? candidata.descripcionVisual.trim()
            : respaldo.descripcionVisual,
        promptImagenAncla:
          typeof candidata.promptImagenAncla === "string" &&
          candidata.promptImagenAncla.trim().length > 0
            ? candidata.promptImagenAncla.trim()
            : respaldo.promptImagenAncla,
        promptVideoAnimacion:
          typeof candidata.promptVideoAnimacion === "string" &&
          candidata.promptVideoAnimacion.trim().length > 0
            ? candidata.promptVideoAnimacion.trim()
            : respaldo.promptVideoAnimacion,
        archivosReferenciaUsados: archivosElegidos,
        requiereLipSync:
          typeof candidata.requiereLipSync === "boolean"
            ? candidata.requiereLipSync && !tramo.esInstrumental
            : respaldo.requiereLipSync,
        idVestuarioAsignado:
          typeof candidata.idVestuarioAsignado === "string" &&
          candidata.idVestuarioAsignado.trim().length > 0
            ? candidata.idVestuarioAsignado.trim()
            : undefined,
      };
    });

    return { escenas: escenasMapeadas, armarioSugerido };
  } catch {
    return { escenas: escenasRespaldo, armarioSugerido: [] };
  }
}

/**
 * Ejecuta el Agente Guionista completo: reconcilia el 100% de la canción, construye el Armario de Vestuario Contextual
 * y genera el Timeline con duración dinámica e inyección de vestuario consistente por lugar.
 */
export async function ejecutarAgenteGuionistaCompleto(
  entrada: EntradaGenerarGuion
): Promise<{
  guionProduccion: GuionProduccionCompleto;
  analisisReconciliado?: AnalisisProductorEjecutivo;
}> {
  const idiomaSalida = entrada.idiomaSalida || "Español";
  const reglaDuracion = detectarReglaDuracionPorToma(
    entrada.ideaOriginal,
    entrada.modeloVideo
  );
  const duracionTotalSegundos =
    determinarDuracionTotalProduccionSegundos(entrada);

  // 1. Reconciliamos las transcripciones de audio/video para cubrir el 100% hasta duracionTotalSegundos
  let analisisReconciliado = entrada.analisisProductorEjecutivo;
  if (
    analisisReconciliado &&
    Array.isArray(analisisReconciliado.transcripcionesAudioVideo) &&
    analisisReconciliado.transcripcionesAudioVideo.length > 0
  ) {
    const transcripcionesReconciliadas =
      analisisReconciliado.transcripcionesAudioVideo.map((trans) => ({
        ...trans,
        duracionTotalSegundos,
        segmentosConTiempo: reconciliarLetraYSegmentosCompletos(
          trans.textoCompleto,
          trans.segmentosConTiempo ?? [],
          duracionTotalSegundos
        ),
      }));

    analisisReconciliado = {
      ...analisisReconciliado,
      transcripcionesAudioVideo: transcripcionesReconciliadas,
    };
  }

  const segmentosParaGuion =
    analisisReconciliado?.transcripcionesAudioVideo?.[0]?.segmentosConTiempo ??
    [];

  const habilitarLipSync = detectarPreferenciaLipSync(
    entrada.ideaOriginal,
    analisisReconciliado
  );

  // 2. Planificamos los tramos de 0.0s al final aplicando Prioridad 1 (orden del usuario) o Prioridad 2 (autonomía del Director)
  const tramosPlanificados = planificarTramosSinHuecos(
    duracionTotalSegundos,
    reglaDuracion.limiteMaximoSeg,
    segmentosParaGuion,
    habilitarLipSync,
    reglaDuracion.modoDuracion
  );

  const { archivosImagen } = separarArchivosPorTipoEstricto(
    entrada.archivosMultimedia,
    entrada.imagenesReferencia
  );
  const nombresImagenesReferencia = archivosImagen.map((img) => img.nombre);
  const personajesSeparados =
    analisisReconciliado?.fichaIdentidadVisual?.personajesSeparados ?? [];

  const resumenFichaVisual =
    analisisReconciliado?.fichaIdentidadVisual?.resumenVisual ??
    "Mantener consistencia física y estética absoluta de los personajes principales en todas las escenas.";

  const respuestasDirector = {
    ...(analisisReconciliado?.decisionesAutomaticasDirector ?? {}),
    ...(analisisReconciliado?.respuestasUsuario ?? {}),
  };

  // 3. Generamos en bloques paralelos con max_tokens alto (16000) para evitar cualquier corte de JSON
  const bloquesDeTramos: TramoTiempoPlanificado[][] = [];
  for (let i = 0; i < tramosPlanificados.length; i += TAMANO_BLOQUE_ESCENAS) {
    bloquesDeTramos.push(
      tramosPlanificados.slice(i, i + TAMANO_BLOQUE_ESCENAS)
    );
  }

  const tieneCredencial = configurarCredencialesServidorFal();
  const bloquesGenerados = await Promise.all(
    bloquesDeTramos.map((bloque) =>
      generarBloqueDeEscenasConFal(
        bloque,
        tramosPlanificados.length,
        entrada.ideaOriginal,
        idiomaSalida,
        resumenFichaVisual,
        nombresImagenesReferencia,
        respuestasDirector,
        reglaDuracion.modoDuracion,
        reglaDuracion.limiteMaximoSeg,
        tieneCredencial
      )
    )
  );

  const escenasSinVestuario = bloquesGenerados
    .flatMap((b) => b.escenas)
    .sort((a, b) => a.numero - b.numero);

  const armariosSugeridos = bloquesGenerados.flatMap((b) => b.armarioSugerido);

  // 4. Construimos el Armario de Vestuario Contextual y aplicamos la Regla de Consistencia por Lugar a cada escena
  const armarioVestuarios = construirArmarioVestuariosContextual(
    entrada.ideaOriginal,
    escenasSinVestuario.map(
      (e) => `${e.titulo} ${e.descripcionVisual} ${e.letraODialogo}`
    ),
    nombresImagenesReferencia,
    personajesSeparados,
    armariosSugeridos
  );

  const todasLasEscenas = aplicarConsistenciaArmarioAEscenas(
    escenasSinVestuario,
    armarioVestuarios,
    personajesSeparados
  );

  const guionProduccion: GuionProduccionCompleto = {
    tituloProduccion: `Guion y Timeline (${todasLasEscenas.length} escenas · 0.0s a ${duracionTotalSegundos.toFixed(1)}s)`,
    resumenNarrativo:
      analisisReconciliado?.resumenDireccionCreativa ??
      `Producción planificada en ${todasLasEscenas.length} escenas cubriendo el 100% de la duración (${duracionTotalSegundos}s).`,
    duracionTotalSegundos,
    modoDuracion: reglaDuracion.modoDuracion,
    duracionMaximaPorTomaSeg: reglaDuracion.limiteMaximoSeg,
    idiomaSalida,
    armarioVestuarios,
    escenas: todasLasEscenas,
    fechaGeneracion: new Date().toISOString(),
  };

  return {
    guionProduccion,
    analisisReconciliado,
  };
}
