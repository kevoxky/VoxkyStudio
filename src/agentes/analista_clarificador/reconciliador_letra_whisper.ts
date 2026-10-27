// Reconciliador matemático de letra y marcas de tiempo de fal-ai/whisper para cubrir el 100% del audio sin recortes.
// Se conecta con inspector_multimodal_fal.ts, PanelClarificacionDirector.tsx, el Agente Guionista y las pruebas unitarias.

import { type MarcaTiempoTranscripcion } from "./tipos_productor_ejecutivo.ts";

export interface ChunkCrudoWhisper {
  timestamp?: [number | null | undefined, number | null | undefined];
  text?: string;
}

/**
 * Redondea un número de segundos a 1 decimal para mantener marcas de tiempo limpias (ej. 90.8s, 125.0s).
 * Recibe un valor numérico y devuelve el número redondeado a una cifra decimal.
 */
export function redondearSegundos(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * Normaliza una palabra quitando acentos, signos de puntuación y mayúsculas para comparar letras con precisión.
 * Recibe una palabra suelta y devuelve su versión limpia alfanumérica.
 */
function normalizarPalabraComparacion(palabra: string): string {
  return palabra
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Convierte TODOS los chunks de fal-ai/whisper en segmentos sin ningún límite (.slice) y sin descartar tiempos abiertos [inicio, null].
 * Recibe la lista cruda de chunks y la duración total del audio, y devuelve todos los segmentos de principio a fin.
 */
export function convertirChunksWhisperASegmentos(
  chunksCrudos: ChunkCrudoWhisper[] | undefined,
  duracionTotalAudio?: number
): MarcaTiempoTranscripcion[] {
  if (!Array.isArray(chunksCrudos) || chunksCrudos.length === 0) {
    return [];
  }

  const segmentos: MarcaTiempoTranscripcion[] = [];

  for (let i = 0; i < chunksCrudos.length; i++) {
    const bloque = chunksCrudos[i];
    const textoLimpio = String(bloque?.text ?? "").trim();
    if (!textoLimpio) {
      continue;
    }

    const inicioCrudo = bloque?.timestamp?.[0];
    const finCrudo = bloque?.timestamp?.[1];

    const inicioPrevio =
      segmentos.length > 0 ? segmentos[segmentos.length - 1].finSeg : 0;
    const inicioSeg =
      typeof inicioCrudo === "number" && Number.isFinite(inicioCrudo)
        ? redondearSegundos(Math.max(0, inicioCrudo))
        : redondearSegundos(inicioPrevio);

    let finSeg: number;
    if (
      typeof finCrudo === "number" &&
      Number.isFinite(finCrudo) &&
      finCrudo > inicioSeg
    ) {
      finSeg = redondearSegundos(finCrudo);
    } else {
      // Si el chunk viene con tiempo final abierto [inicio, null], miramos el siguiente chunk o la duración real del audio
      const siguienteInicio = chunksCrudos[i + 1]?.timestamp?.[0];
      if (
        typeof siguienteInicio === "number" &&
        Number.isFinite(siguienteInicio) &&
        siguienteInicio > inicioSeg
      ) {
        finSeg = redondearSegundos(siguienteInicio);
      } else if (
        typeof duracionTotalAudio === "number" &&
        Number.isFinite(duracionTotalAudio) &&
        duracionTotalAudio > inicioSeg
      ) {
        finSeg = redondearSegundos(duracionTotalAudio);
      } else {
        finSeg = redondearSegundos(inicioSeg + 4.5);
      }
    }

    segmentos.push({
      inicioSeg,
      finSeg,
      texto: textoLimpio,
    });
  }

  return segmentos;
}

/**
 * Detecta qué palabras o estrofas al final de textoCompleto no quedaron incluidas dentro de los segmentos actuales.
 * Recibe el texto completo y los segmentos existentes, y devuelve el fragmento faltante al final.
 */
export function extraerTextoFaltanteAlFinal(
  textoCompleto: string,
  segmentos: MarcaTiempoTranscripcion[]
): string {
  const textoTotalLimpio = String(textoCompleto ?? "").trim();
  if (!textoTotalLimpio) {
    return "";
  }

  const palabrasCompletas = textoTotalLimpio.split(/\s+/).filter(Boolean);
  const textoUnidoSegmentos = segmentos
    .map((s) => String(s.texto ?? "").trim())
    .filter(Boolean)
    .join(" ");

  if (!textoUnidoSegmentos) {
    return textoTotalLimpio;
  }

  const palabrasSegmentos = textoUnidoSegmentos.split(/\s+/).filter(Boolean);
  const normCompletas = palabrasCompletas.map(normalizarPalabraComparacion);
  const normSegmentos = palabrasSegmentos
    .map(normalizarPalabraComparacion)
    .filter(Boolean);

  if (normSegmentos.length === 0) {
    return textoTotalLimpio;
  }

  // Buscamos dónde termina el último tramo de palabras de los segmentos dentro del textoCompleto
  for (
    let tamanoAncla = Math.min(5, normSegmentos.length);
    tamanoAncla >= 1;
    tamanoAncla--
  ) {
    const ancla = normSegmentos.slice(normSegmentos.length - tamanoAncla);
    const inicioBusqueda = Math.max(0, normSegmentos.length - 25);

    let indiceEncontrado = -1;
    for (
      let pos = inicioBusqueda;
      pos <= normCompletas.length - tamanoAncla;
      pos++
    ) {
      let coincide = true;
      for (let k = 0; k < tamanoAncla; k++) {
        if (normCompletas[pos + k] !== ancla[k]) {
          coincide = false;
          break;
        }
      }
      if (coincide) {
        indiceEncontrado = pos + tamanoAncla - 1;
      }
    }

    if (indiceEncontrado !== -1) {
      const palabrasRestantes = palabrasCompletas.slice(indiceEncontrado + 1);
      return palabrasRestantes.join(" ").trim();
    }
  }

  if (palabrasCompletas.length > palabrasSegmentos.length) {
    return palabrasCompletas.slice(palabrasSegmentos.length).join(" ").trim();
  }

  return "";
}

/**
 * Divide un bloque de letra faltante en frases naturales (por punto, signo o estrofas cortas) para asignarles tiempos.
 * Recibe el texto faltante y devuelve un arreglo de frases listas para convertirse en segmentos.
 */
export function dividirEnFrasesNaturales(textoFaltante: string): string[] {
  const limpio = textoFaltante.trim();
  if (!limpio) {
    return [];
  }

  // Primero separamos por finales de oración (. ! ? ; o saltos de línea)
  const oracionesBrutas = limpio
    .split(/(?<=[.!?;\n])\s+/)
    .map((o) => o.trim())
    .filter(Boolean);

  const frasesFinales: string[] = [];

  for (const oracion of oracionesBrutas) {
    const palabras = oracion.split(/\s+/).filter(Boolean);
    if (palabras.length <= 9) {
      frasesFinales.push(oracion);
      continue;
    }

    // Si una oración es larga, intentamos dividir por comas o en grupos naturales de ~6 palabras
    const partesPorComa = oracion
      .split(/(?<=,)\s+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (partesPorComa.length > 1 && partesPorComa.every((p) => p.split(/\s+/).length <= 10)) {
      frasesFinales.push(...partesPorComa);
    } else {
      const tamanoGrupo = 6;
      for (let i = 0; i < palabras.length; i += tamanoGrupo) {
        frasesFinales.push(palabras.slice(i, i + tamanoGrupo).join(" "));
      }
    }
  }

  return frasesFinales.length > 0 ? frasesFinales : [limpio];
}

/**
 * Compara las palabras de textoCompleto con los segmentos de Whisper y reparte proporcionalmente cualquier letra faltante hasta el final real del audio.
 * Recibe textoCompleto, segmentos actuales y duracionTotalAudio (ej. 125s), y devuelve el 100% de los segmentos reconciliados.
 */
export function reconciliarLetraYSegmentosCompletos(
  textoCompleto: string,
  segmentos: MarcaTiempoTranscripcion[],
  duracionTotalAudio?: number
): MarcaTiempoTranscripcion[] {
  const duracionValida =
    typeof duracionTotalAudio === "number" &&
    Number.isFinite(duracionTotalAudio) &&
    duracionTotalAudio > 0
      ? redondearSegundos(duracionTotalAudio)
      : undefined;

  // Normalizamos los segmentos actuales asegurando que ninguno tenga tiempo final abierto o inválido
  const segmentosNormalizados: MarcaTiempoTranscripcion[] = (
    Array.isArray(segmentos) ? segmentos : []
  )
    .filter((s) => String(s?.texto ?? "").trim().length > 0)
    .map((seg, idx, arr) => {
      const inicioPrevio = idx > 0 ? arr[idx - 1].finSeg : 0;
      const inicioSeg =
        typeof seg.inicioSeg === "number" && Number.isFinite(seg.inicioSeg)
          ? redondearSegundos(Math.max(0, seg.inicioSeg))
          : redondearSegundos(inicioPrevio);

      let finSeg =
        typeof seg.finSeg === "number" &&
        Number.isFinite(seg.finSeg) &&
        seg.finSeg > inicioSeg
          ? redondearSegundos(seg.finSeg)
          : redondearSegundos(inicioSeg + 4.0);

      // Si era el último segmento con timestamp abierto [inicio, null] y no hay texto faltante, llegará al final del audio
      if (
        idx === arr.length - 1 &&
        (!Number.isFinite(seg.finSeg) || seg.finSeg <= inicioSeg) &&
        duracionValida &&
        duracionValida > inicioSeg
      ) {
        finSeg = duracionValida;
      }

      return {
        inicioSeg,
        finSeg,
        texto: String(seg.texto).trim(),
      };
    });

  const textoFaltante = extraerTextoFaltanteAlFinal(
    textoCompleto,
    segmentosNormalizados
  );

  // Si no falta ninguna palabra en los segmentos, devolvemos la lista completa ya normalizada
  if (!textoFaltante) {
    return segmentosNormalizados;
  }

  const frasesFaltantes = dividirEnFrasesNaturales(textoFaltante);
  if (frasesFaltantes.length === 0) {
    return segmentosNormalizados;
  }

  let segundoArranque =
    segmentosNormalizados.length > 0
      ? segmentosNormalizados[segmentosNormalizados.length - 1].finSeg
      : 0;

  // Si el último segmento previo se había estirado artificialmente hasta duracionValida, le damos su duración natural para dejar espacio al texto faltante
  if (
    duracionValida &&
    segmentosNormalizados.length > 0 &&
    segundoArranque >= duracionValida
  ) {
    const ultimoSeg = segmentosNormalizados[segmentosNormalizados.length - 1];
    ultimoSeg.finSeg = redondearSegundos(
      Math.min(ultimoSeg.inicioSeg + 4.0, Math.max(ultimoSeg.inicioSeg + 1.5, duracionValida * 0.75))
    );
    segundoArranque = ultimoSeg.finSeg;
  }

  const finAudioReal =
    duracionValida && duracionValida > segundoArranque
      ? duracionValida
      : redondearSegundos(segundoArranque + frasesFaltantes.length * 4.5);

  const duracionPorRepartir = Math.max(
    frasesFaltantes.length * 1.0,
    finAudioReal - segundoArranque
  );

  // Repartimos el tiempo proporcionalmente a la cantidad de caracteres de cada frase faltante
  const pesos = frasesFaltantes.map((frase) => Math.max(4, frase.length));
  const pesoTotal = pesos.reduce((acc, p) => acc + p, 0);

  let cursorSeg = segundoArranque;
  const nuevosSegmentosFaltantes: MarcaTiempoTranscripcion[] =
    frasesFaltantes.map((frase, indice) => {
      const esUltimo = indice === frasesFaltantes.length - 1;
      const inicioSeg = redondearSegundos(cursorSeg);
      const proporcion = pesos[indice] / pesoTotal;
      const finCalculado = esUltimo
        ? finAudioReal
        : redondearSegundos(cursorSeg + duracionPorRepartir * proporcion);
      const finSeg = Math.max(redondearSegundos(inicioSeg + 0.8), finCalculado);
      cursorSeg = finSeg;

      return {
        inicioSeg,
        finSeg,
        texto: frase,
      };
    });

  return [...segmentosNormalizados, ...nuevosSegmentosFaltantes];
}
