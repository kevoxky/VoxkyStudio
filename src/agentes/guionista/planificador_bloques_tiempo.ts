// Planificador de tomas con Duración Dinámica (Prioridad 1: orden del usuario; Prioridad 2: autonomía del Director de 3s a 30s).
// Se conecta con tipos_guion.ts, reconciliador_letra_whisper.ts y generador_guion_fal.ts.

import { type MarcaTiempoTranscripcion } from "../analista_clarificador/tipos_productor_ejecutivo.ts";
import {
  reconciliarLetraYSegmentosCompletos,
  redondearSegundos,
} from "../analista_clarificador/reconciliador_letra_whisper.ts";
import {
  type EntradaGenerarGuion,
  type EscenaGuion,
  type ModoDuracionGuion,
  type TramoTiempoPlanificado,
} from "./tipos_guion.ts";

export interface ReglaDuracionDetectada {
  modoDuracion: ModoDuracionGuion;
  limiteMaximoSeg: number;
}

/**
 * Evalúa si el usuario pidió explícitamente un límite de segundos por toma (Prioridad 1) o si el Director decide con autonomía (Prioridad 2).
 * Recibe la idea original y el modelo de video elegido, y devuelve el modo y el tope de segundos por toma.
 */
export function detectarReglaDuracionPorToma(
  ideaOriginal: string,
  modeloVideo?: string
): ReglaDuracionDetectada {
  const texto = String(ideaOriginal ?? "").toLowerCase();
  const coincidenciaExplicita = texto.match(
    /(?:m[aá]ximo|max|cada\s+clip\s+de|tomas?\s+de|escenas?\s+de|clips?\s+de|cortes?\s+de)\s*(\d+)\s*(?:seg|segundos|s\b)/i
  );

  if (coincidenciaExplicita) {
    const valor = Number(coincidenciaExplicita[1]);
    if (Number.isFinite(valor) && valor >= 2 && valor <= 30) {
      return {
        modoDuracion: "fijo_usuario",
        limiteMaximoSeg: valor,
      };
    }
  }

  // Prioridad 2 (Autonomía del Agente): permite desde cortes rápidos (3-4s) y tomas medias (6-10s) hasta planos largos (12-30s)
  const soportaPlanosLargos =
    !modeloVideo ||
    modeloVideo.includes("ltx") ||
    modeloVideo.includes("kling") ||
    modeloVideo.includes("veo") ||
    modeloVideo.includes("seedance");

  return {
    modoDuracion: "autonomo_director",
    limiteMaximoSeg: soportaPlanosLargos ? 20 : 10,
  };
}

/**
 * Función compatible que devuelve el límite numérico de segundos por toma detectado en el prompt (o 6s por defecto si es fijo).
 * Recibe la idea original del usuario y devuelve los segundos máximos.
 */
export function detectarDuracionMaximaTomaSegundos(ideaOriginal: string): number {
  const regla = detectarReglaDuracionPorToma(ideaOriginal);
  return regla.modoDuracion === "fijo_usuario" ? regla.limiteMaximoSeg : 10;
}

/**
 * Calcula la duración total exacta del proyecto en segundos priorizando la duración real del archivo de audio/video.
 * Recibe los datos de entrada del guion y devuelve los segundos totales que debe cubrir el Timeline (ej. 125s).
 */
export function determinarDuracionTotalProduccionSegundos(
  entrada: EntradaGenerarGuion
): number {
  if (
    typeof entrada.duracionAudioForzadaSegundos === "number" &&
    entrada.duracionAudioForzadaSegundos > 0
  ) {
    return redondearSegundos(entrada.duracionAudioForzadaSegundos);
  }

  const archivoConDuracion = (entrada.archivosMultimedia ?? []).find(
    (a) =>
      (a.tipo === "audio" || a.tipo === "video") &&
      typeof a.duracionSegundos === "number" &&
      a.duracionSegundos > 0
  );
  if (archivoConDuracion?.duracionSegundos) {
    return redondearSegundos(archivoConDuracion.duracionSegundos);
  }

  const primeraTranscripcion =
    entrada.analisisProductorEjecutivo?.transcripcionesAudioVideo?.[0];
  if (primeraTranscripcion) {
    if (
      typeof primeraTranscripcion.duracionTotalSegundos === "number" &&
      primeraTranscripcion.duracionTotalSegundos > 0
    ) {
      return redondearSegundos(primeraTranscripcion.duracionTotalSegundos);
    }

    const segs = primeraTranscripcion.segmentosConTiempo ?? [];
    if (segs.length > 0) {
      const ultimoFin = segs[segs.length - 1].finSeg;
      const reconciliados = reconciliarLetraYSegmentosCompletos(
        primeraTranscripcion.textoCompleto,
        segs,
        primeraTranscripcion.duracionTotalSegundos
      );
      const finReconciliado =
        reconciliados[reconciliados.length - 1]?.finSeg ?? ultimoFin;
      if (finReconciliado > 0) {
        return redondearSegundos(finReconciliado);
      }
    }
  }

  const textoDuracion = String(entrada.duracionObjetivo ?? "Auto")
    .trim()
    .toLowerCase();
  const matchSeg = textoDuracion.match(/(\d+(?:\.\d+)?)\s*seg/);
  if (matchSeg) {
    return Math.max(10, redondearSegundos(Number(matchSeg[1])));
  }

  const matchMin = textoDuracion.match(/(\d+(?:\.\d+)?)\s*min/);
  if (matchMin) {
    return Math.max(15, redondearSegundos(Number(matchMin[1]) * 60));
  }

  return 30;
}

/**
 * Determina si las escenas con voz cantada o hablada deben llevar LipSync según la decisión del usuario.
 * Recibe la idea original y el análisis del Productor Ejecutivo, y devuelve true o false.
 */
export function detectarPreferenciaLipSync(
  ideaOriginal: string,
  analisis?: EntradaGenerarGuion["analisisProductorEjecutivo"]
): boolean {
  const respuestaP1 =
    analisis?.respuestasUsuario?.p1 ??
    analisis?.decisionesAutomaticasDirector?.p1 ??
    "";
  const combinado = `${ideaOriginal} ${respuestaP1}`.toLowerCase();

  if (
    combinado.includes("sin lipsync") ||
    combinado.includes("solo historia visual") ||
    combinado.includes("no cantan")
  ) {
    return false;
  }

  if (
    combinado.includes("lipsync") ||
    combinado.includes("canta") ||
    combinado.includes("sincronización de labios") ||
    analisis?.categoriaPrincipal === "videoclip_musical" ||
    analisis?.categoriaPrincipal === "traduccion_doblaje_video"
  ) {
    return true;
  }

  return false;
}

/**
 * Genera la nota breve que explica por qué el Director eligió esa duración para la toma.
 * Recibe la duración del clip, el modo activo y si es instrumental, y devuelve la justificación en español.
 */
function construirJustificacionDuracion(
  duracionSeg: number,
  modoDuracion: ModoDuracionGuion,
  limiteUsuarioSeg: number,
  esInstrumental: boolean
): string {
  if (modoDuracion === "fijo_usuario") {
    return `Toma de ${duracionSeg.toFixed(1)}s respetando el máximo de ${limiteUsuarioSeg}s pedido por el usuario.`;
  }

  if (duracionSeg <= 4.5) {
    return `Corte rápido de ${duracionSeg.toFixed(1)}s para acentuar el impacto rítmico y visual.`;
  }

  if (duracionSeg <= 10.5) {
    return esInstrumental
      ? `Toma media de ${duracionSeg.toFixed(1)}s para transición musical y acción de personajes.`
      : `Toma narrativa de ${duracionSeg.toFixed(1)}s para desarrollar la frase completa sin cortar la emoción.`;
  }

  return `Plano extendido de ${duracionSeg.toFixed(1)}s para sostener la continuidad emocional de la secuencia.`;
}

/**
 * Divide la duración total (ej. 0.0s a 125.0s) en tramos consecutivos sin huecos (obedeciendo al usuario o con ritmo autónomo variado).
 * Recibe la duración total, el máximo por toma, los segmentos, si hay LipSync y el modo de duración, y devuelve el Timeline planificado.
 */
export function planificarTramosSinHuecos(
  duracionTotalSeg: number,
  duracionMaxTomaSeg: number,
  segmentosReconciliados: MarcaTiempoTranscripcion[],
  habilitarLipSync: boolean,
  modoDuracion: ModoDuracionGuion = "fijo_usuario"
): TramoTiempoPlanificado[] {
  const totalSeg = Math.max(5, redondearSegundos(duracionTotalSeg));
  const maxToma = Math.max(3, Math.min(30, duracionMaxTomaSeg));
  const fronteras: Array<{ inicio: number; fin: number }> = [];

  if (modoDuracion === "autonomo_director") {
    // En modo autónomo, el Director alterna tomas cortas de impacto (3.5-4.5s), medias (6-9s) y planos largos (10-14s) alineados a la canción
    const patronRitmicoDirector = [4.0, 6.5, 8.0, 4.5, 9.5, 5.5, 11.0, 6.0];
    let cursor = 0;
    let indicePatron = 0;

    while (cursor < totalSeg - 0.15) {
      const restante = redondearSegundos(totalSeg - cursor);
      const duracionDeseada = Math.min(
        maxToma,
        patronRitmicoDirector[indicePatron % patronRitmicoDirector.length]
      );
      indicePatron++;

      if (restante <= Math.min(maxToma, duracionDeseada + 2.5)) {
        fronteras.push({ inicio: cursor, fin: totalSeg });
        cursor = totalSeg;
        break;
      }

      let corteElegido = redondearSegundos(cursor + duracionDeseada);
      for (const seg of segmentosReconciliados) {
        if (
          seg.finSeg >= cursor + 3.0 &&
          seg.finSeg <= Math.min(totalSeg - 3.0, cursor + duracionDeseada + 2.0)
        ) {
          corteElegido = redondearSegundos(seg.finSeg);
          break;
        }
      }

      fronteras.push({ inicio: cursor, fin: corteElegido });
      cursor = corteElegido;
    }
  } else {
    // Prioridad 1 (Orden explícita del usuario): ninguna escena supera maxToma
    const minToma = Math.max(2.5, maxToma - 2);
    let cursor = 0;

    while (cursor < totalSeg - 0.15) {
      const restante = redondearSegundos(totalSeg - cursor);
      if (restante <= maxToma) {
        fronteras.push({ inicio: cursor, fin: totalSeg });
        cursor = totalSeg;
        break;
      }

      if (restante < maxToma + minToma) {
        const mitad = redondearSegundos(cursor + restante / 2);
        fronteras.push({ inicio: cursor, fin: mitad });
        fronteras.push({ inicio: mitad, fin: totalSeg });
        cursor = totalSeg;
        break;
      }

      let corteElegido = redondearSegundos(cursor + maxToma);
      for (const seg of segmentosReconciliados) {
        if (seg.finSeg >= cursor + minToma && seg.finSeg <= cursor + maxToma) {
          corteElegido = redondearSegundos(seg.finSeg);
        }
      }

      fronteras.push({ inicio: cursor, fin: corteElegido });
      cursor = corteElegido;
    }
  }

  // Asignamos el 100% de los segmentos reconciliados al tramo donde cae su punto medio para no perder ni una palabra
  const letrasPorTramo: string[][] = fronteras.map(() => []);

  for (const seg of segmentosReconciliados) {
    const texto = String(seg.texto ?? "").trim();
    if (!texto) continue;

    const centroSeg = (seg.inicioSeg + seg.finSeg) / 2;
    let indiceTramo = fronteras.findIndex(
      (f) => centroSeg >= f.inicio && centroSeg <= f.fin
    );

    if (indiceTramo === -1) {
      indiceTramo = centroSeg < 0 ? 0 : fronteras.length - 1;
    }

    letrasPorTramo[indiceTramo].push(texto);
  }

  return fronteras.map((rango, idx) => {
    const frases = letrasPorTramo[idx];
    const tieneLetra = frases.length > 0;

    let letraODialogo: string;
    if (tieneLetra) {
      letraODialogo = frases.join(" ");
    } else if (idx === 0) {
      letraODialogo = "[Instrumental / Intro]";
    } else if (idx === fronteras.length - 1) {
      letraODialogo = "[Instrumental / Cierre Final]";
    } else {
      letraODialogo = "[Instrumental / Acción Visual]";
    }

    const duracionSegundos = redondearSegundos(rango.fin - rango.inicio);
    const esInstrumental = !tieneLetra;

    return {
      numero: idx + 1,
      tiempoInicioSeg: rango.inicio,
      tiempoFinSeg: rango.fin,
      duracionSegundos,
      justificacionDuracion: construirJustificacionDuracion(
        duracionSegundos,
        modoDuracion,
        maxToma,
        esInstrumental
      ),
      letraODialogo,
      esInstrumental,
      requiereLipSyncSugerido: habilitarLipSync && tieneLetra,
    };
  });
}

/**
 * Construye una escena completa de respaldo para un tramo de tiempo asegurando que nunca falte ningún campo obligatorio.
 * Recibe el tramo planificado, la idea original, las referencias y la ficha visual, y devuelve la EscenaGuion.
 */
export function construirEscenaRespaldoPorTramo(
  tramo: TramoTiempoPlanificado,
  ideaOriginal: string,
  nombresImagenesReferencia: string[],
  resumenFichaVisual: string
): EscenaGuion {
  const fragmentoCorto = tramo.esInstrumental
    ? tramo.letraODialogo.replace(/[\[\]]/g, "")
    : tramo.letraODialogo.slice(0, 42) +
      (tramo.letraODialogo.length > 42 ? "..." : "");

  const personajesUsados =
    nombresImagenesReferencia.length > 0
      ? nombresImagenesReferencia
      : ["Personajes principales"];

  return {
    idEscena: `escena_${tramo.numero}`,
    numero: tramo.numero,
    titulo: `Toma ${tramo.numero}: ${fragmentoCorto}`,
    tiempoInicioSeg: tramo.tiempoInicioSeg,
    tiempoFinSeg: tramo.tiempoFinSeg,
    duracionSegundos: tramo.duracionSegundos,
    justificacionDuracion: tramo.justificacionDuracion,
    letraODialogo: tramo.letraODialogo,
    descripcionVisual: tramo.esInstrumental
      ? `Plano dinámico de acción y atmósfera visual acorde a "${ideaOriginal.slice(0, 90)}" (${tramo.tiempoInicioSeg}s - ${tramo.tiempoFinSeg}s).`
      : `Los protagonistas interpretan y actúan al ritmo de "${tramo.letraODialogo}" manteniendo continuidad visual (${tramo.tiempoInicioSeg}s - ${tramo.tiempoFinSeg}s).`,
    promptImagenAncla: `Cinematic keyframe for scene ${tramo.numero} (${tramo.tiempoInicioSeg}s-${tramo.tiempoFinSeg}s). Visual continuity: ${resumenFichaVisual.slice(0, 260)}. Action synchronized with "${tramo.letraODialogo}". High quality lighting, sharp focus, consistent characters.`,
    promptVideoAnimacion: tramo.requiereLipSyncSugerido
      ? `Smooth cinematic camera movement, expressive character acting and natural lip-sync singing "${tramo.letraODialogo}", consistent character features, no abrupt transitions.`
      : `Fluid cinematic motion and expressive visual storytelling matching the rhythm (${tramo.duracionSegundos}s shot), consistent lighting and characters.`,
    archivosReferenciaUsados: personajesUsados,
    requiereLipSync: tramo.requiereLipSyncSugerido,
  };
}
