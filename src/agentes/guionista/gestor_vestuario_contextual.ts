// Diseñador General de Vestuario de Cine: construye "armarioVestuarios" para cualquier historia/personaje y mantiene consistencia por escenario.
// Se conecta con tipos_guion.ts, tipos_productor_ejecutivo.ts, generador_guion_fal.ts y las pruebas unitarias.

import { type DesglosePersonajeIdentidadYVestuario } from "../analista_clarificador/tipos_productor_ejecutivo.ts";
import {
  type EscenaGuion,
  type PrendaVestuarioEscenario,
} from "./tipos_guion.ts";

interface ReglaVestuarioContextual {
  idVestuario: string;
  escenarioOLugar: string;
  palabrasClave: string[];
  descripcionVestuario: string;
  promptVestuarioIngles: string;
}

// Catálogo general de respaldo cuando la historia menciona cambios de ambiente claros y el LLM no especificó uno propio
const CATALOGO_VESTUARIOS_CONTEXTUALES: ReglaVestuarioContextual[] = [
  {
    idVestuario: "vestuario_gimnasio",
    escenarioOLugar: "Gimnasio / Entrenamiento deportivo",
    palabrasClave: [
      "gimnasio",
      "gym",
      "pesas",
      "entrenando",
      "entrenamiento",
      "cinta de correr",
      "fitness",
    ],
    descripcionVestuario:
      "Conjunto deportivo de entrenamiento (camiseta deportiva transpirable, pantalón o short deportivo y zapatillas de entrenamiento)",
    promptVestuarioIngles:
      "wearing consistent athletic activewear workout outfit (breathable sports top, athletic shorts or pants, and training sneakers appropriate for the character)",
  },
  {
    idVestuario: "vestuario_playa",
    escenarioOLugar: "Playa / Piscina / Mar",
    palabrasClave: [
      "playa",
      "frente al mar",
      "en el mar",
      "arena de la playa",
      "olas de la playa",
      "piscina",
      "alberca",
      "beach",
    ],
    descripcionVestuario:
      "Atuendo de playa o piscina acorde al personaje (ropa de baño veraniega consistente y calzado ligero de playa)",
    promptVestuarioIngles:
      "wearing consistent summer beachwear / swimwear outfit appropriate for the character's age and style",
  },
  {
    idVestuario: "vestuario_casa",
    escenarioOLugar: "Casa / Hogar / Descanso",
    palabrasClave: [
      "en casa",
      "su casa",
      "a casa",
      "sala de estar",
      "cocina de casa",
      "descansando en casa",
    ],
    descripcionVestuario:
      "Ropa casual y cómoda para estar en casa (suéter o camiseta suave y pantalón cómodo de hogar)",
    promptVestuarioIngles:
      "wearing cozy comfortable casual home loungewear outfit (soft top and comfortable casual pants)",
  },
  {
    idVestuario: "vestuario_dormir",
    escenarioOLugar: "Dormitorio / Hora de dormir",
    palabrasClave: [
      "pijama",
      "hora de dormir",
      "en la cama",
      "acostada en la cama",
      "acostado en la cama",
    ],
    descripcionVestuario:
      "Pijama cómodo de dos piezas en algodón suave para dormir",
    promptVestuarioIngles:
      "wearing a soft two-piece cotton pajama sleepwear set appropriate for the character",
  },
  {
    idVestuario: "vestuario_fiesta",
    escenarioOLugar: "Fiesta / Evento de gala",
    palabrasClave: [
      "gala",
      "alfombra roja",
      "cena elegante",
      "celebración de gala",
    ],
    descripcionVestuario:
      "Atuendo formal y elegante de gala o celebración acorde al personaje",
    promptVestuarioIngles:
      "wearing an elegant formal celebration / evening gala outfit appropriate for the character",
  },
  {
    idVestuario: "vestuario_invierno",
    escenarioOLugar: "Nieve / Montaña / Invierno",
    palabrasClave: [
      "nieve",
      "nevando",
      "montaña nevada",
      "invierno",
      "tormenta de nieve",
    ],
    descripcionVestuario:
      "Abrigo térmico acolchado de invierno, bufanda tejida y botas para nieve",
    promptVestuarioIngles:
      "wearing a warm padded winter snow jacket, knit scarf, and winter boots",
  },
];

/**
 * Verifica si una palabra o frase clave aparece como palabra completa dentro del texto (evitando falsos positivos como "calmar" con "mar").
 */
function contienePalabraClaveExacta(
  texto: string,
  palabraClave: string
): boolean {
  const escapada = palabraClave.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patron = new RegExp(
    `(?:^|[^a-záéíóúñü0-9])${escapada}(?:[^a-záéíóúñü0-9]|$)`,
    "i"
  );
  return patron.test(texto);
}

/**
 * Detecta si el usuario ordenó explícitamente en su prompt NO cambiar la ropa de los personajes de referencia.
 */
export function usuarioPidioMantenerRopaFija(ideaOriginal: string): boolean {
  const limpio = String(ideaOriginal ?? "").toLowerCase();
  const frasesFijas = [
    "no les puede cambiar la ropa",
    "no cambiar la ropa",
    "sin cambiar la ropa",
    "sin cambiar de ropa",
    "mantener la misma ropa",
    "siempre con la misma ropa",
    "no cambies la ropa",
  ];
  return frasesFijas.some((frase) => limpio.includes(frase));
}

/**
 * Detecta qué identificador de vestuario (`idVestuario`) corresponde lógicamente según el lugar o acción descrita en la escena.
 * Soporta tanto cualquier vestuario dinámico creado por el Guionista como el catálogo contextual general.
 */
export function detectarIdVestuarioSegunTextoEscena(
  textoEscena: string,
  armarioDisponible: PrendaVestuarioEscenario[] = []
): string {
  const limpio = String(textoEscena ?? "").toLowerCase();

  // Si menciona explícitamente el lugar del vestuario base original (ej. consultorio, estudio, oficina principal), mantiene vestuario_base
  if (
    contienePalabraClaveExacta(limpio, "consultorio") ||
    contienePalabraClaveExacta(limpio, "clínica") ||
    contienePalabraClaveExacta(limpio, "clinica") ||
    contienePalabraClaveExacta(limpio, "vestuario original")
  ) {
    return "vestuario_base";
  }

  // 1. Primero verificamos si coincide con algún vestuario dinámico del armario del proyecto
  for (const prenda of armarioDisponible) {
    if (prenda.idVestuario === "vestuario_base") continue;
    const terminosLugar = prenda.escenarioOLugar
      .toLowerCase()
      .split(/[/,;|-]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 4);

    if (
      terminosLugar.some((termino) =>
        contienePalabraClaveExacta(limpio, termino)
      )
    ) {
      return prenda.idVestuario;
    }
  }

  // 2. Respaldo general por palabras clave completas
  for (const regla of CATALOGO_VESTUARIOS_CONTEXTUALES) {
    if (
      regla.palabrasClave.some((palabra) =>
        contienePalabraClaveExacta(limpio, palabra)
      )
    ) {
      return regla.idVestuario;
    }
  }

  return "vestuario_base";
}

/**
 * Construye el catálogo `armarioVestuarios` del proyecto antes de las escenas:
 * - Si el usuario pidió no cambiar la ropa o la historia no cambia de contexto, devuelve únicamente `vestuario_base`.
 * - Si la historia requiere cambios de vestuario (cualquier profesión, aventura o escenario), crea los vestuarios correspondientes.
 */
export function construirArmarioVestuariosContextual(
  ideaOriginal: string,
  textosEscenas: string[],
  nombresPersonajes: string[] = [],
  personajesSeparados: DesglosePersonajeIdentidadYVestuario[] = [],
  armarioSugeridoLlm: Partial<PrendaVestuarioEscenario>[] = []
): PrendaVestuarioEscenario[] {
  const nombrePrincipal =
    personajesSeparados.map((p) => p.nombreArchivo).join(", ") ||
    nombresPersonajes.join(", ") ||
    "Personajes de referencia";

  const descripcionBaseOriginal =
    personajesSeparados.length > 1
      ? personajesSeparados
          .map((p) => `${p.nombreArchivo}: ${p.vestuarioOriginalFoto}`)
          .join(" | ")
      : personajesSeparados[0]?.vestuarioOriginalFoto ||
        "Mantiene exactamente la ropa, colores y calzado originales de la foto de referencia subida.";

  const prendaBase: PrendaVestuarioEscenario = {
    idVestuario: "vestuario_base",
    nombrePersonaje: nombrePrincipal,
    escenarioOLugar: "Ropa original de la foto de referencia",
    descripcionVestuario: descripcionBaseOriginal,
    promptVestuarioIngles:
      "wearing the exact original outfit, colors, patterns, and footwear from the uploaded reference photo (vestuario_base)",
    esVestuarioBaseOriginal: true,
  };

  // Si el usuario indicó explícitamente que NO se le cambie la ropa a sus personajes, respetamos solo vestuario_base
  if (usuarioPidioMantenerRopaFija(ideaOriginal)) {
    return [prendaBase];
  }

  const mapaArmario = new Map<string, PrendaVestuarioEscenario>();
  mapaArmario.set("vestuario_base", prendaBase);

  // 1. Incorporamos cualquier vestuario contextual diseñado por el Agente Guionista para esta historia específica
  for (const sugerido of armarioSugeridoLlm) {
    if (
      sugerido &&
      typeof sugerido.idVestuario === "string" &&
      sugerido.idVestuario.trim().length > 0 &&
      typeof sugerido.descripcionVestuario === "string" &&
      sugerido.descripcionVestuario.trim().length > 0
    ) {
      const idLimpio = sugerido.idVestuario.trim();
      if (idLimpio === "vestuario_base") continue;

      mapaArmario.set(idLimpio, {
        idVestuario: idLimpio,
        nombrePersonaje: sugerido.nombrePersonaje || nombrePrincipal,
        escenarioOLugar: sugerido.escenarioOLugar || idLimpio,
        descripcionVestuario: sugerido.descripcionVestuario.trim(),
        promptVestuarioIngles:
          sugerido.promptVestuarioIngles?.trim() ||
          `wearing consistent ${idLimpio} outfit: ${sugerido.descripcionVestuario.trim()}`,
        esVestuarioBaseOriginal: false,
      });
    }
  }

  // 2. Respaldo general si el texto de la idea o escenas menciona ambientes que exigen otra ropa (gimnasio, playa, nieve, dormir, etc.)
  const textoCombinado = [ideaOriginal, ...textosEscenas]
    .join(" \n ")
    .toLowerCase();

  for (const regla of CATALOGO_VESTUARIOS_CONTEXTUALES) {
    const apareceLugar = regla.palabrasClave.some((palabra) =>
      contienePalabraClaveExacta(textoCombinado, palabra)
    );
    if (apareceLugar && !mapaArmario.has(regla.idVestuario)) {
      mapaArmario.set(regla.idVestuario, {
        idVestuario: regla.idVestuario,
        nombrePersonaje: nombrePrincipal,
        escenarioOLugar: regla.escenarioOLugar,
        descripcionVestuario: regla.descripcionVestuario,
        promptVestuarioIngles: regla.promptVestuarioIngles,
        esVestuarioBaseOriginal: false,
      });
    }
  }

  return Array.from(mapaArmario.values());
}

/**
 * Aplica la Regla de Consistencia por Escenario a todas las escenas del guion:
 * asigna `idVestuarioAsignado` a cada escena e inyecta exactamente la misma descripción del vestuario
 * sumada a la `identidadFisicaInmutable` del personaje en todas las escenas que ocurran en ese mismo lugar.
 */
export function aplicarConsistenciaArmarioAEscenas(
  escenas: EscenaGuion[],
  armarioVestuarios: PrendaVestuarioEscenario[],
  personajesSeparados: DesglosePersonajeIdentidadYVestuario[] = []
): EscenaGuion[] {
  const mapaPorId = new Map<string, PrendaVestuarioEscenario>();
  for (const prenda of armarioVestuarios) {
    mapaPorId.set(prenda.idVestuario, prenda);
  }

  const prendaBase =
    mapaPorId.get("vestuario_base") ??
    ({
      idVestuario: "vestuario_base",
      nombrePersonaje: "Personajes de referencia",
      escenarioOLugar: "Ropa original de la foto de referencia",
      descripcionVestuario:
        "Mantiene el vestuario original de la foto de referencia.",
      promptVestuarioIngles:
        "wearing the exact original clothing from the reference photo",
      esVestuarioBaseOriginal: true,
    } satisfies PrendaVestuarioEscenario);

  const identidadInmutableResumen =
    personajesSeparados
      .map((p) => `${p.nombreArchivo}: ${p.identidadFisicaInmutable}`)
      .join(" | ") ||
    "Conservar 100% intactos el rostro, edad, ojos, piel, peinado y complexión física de la referencia.";

  return escenas.map((escena) => {
    const textoContextoEscena = `${escena.titulo} ${escena.descripcionVisual} ${escena.letraODialogo}`;
    const idDetectado = detectarIdVestuarioSegunTextoEscena(
      textoContextoEscena,
      armarioVestuarios
    );

    let idFinal = "vestuario_base";
    if (idDetectado !== "vestuario_base" && mapaPorId.has(idDetectado)) {
      idFinal = idDetectado;
    } else if (
      escena.idVestuarioAsignado &&
      mapaPorId.has(escena.idVestuarioAsignado)
    ) {
      idFinal = escena.idVestuarioAsignado;
    }

    const prendaElegida = mapaPorId.get(idFinal) ?? prendaBase;

    const bloqueIdentidadYVestuarioPrompt = [
      `[IMMUTABLE PHYSICAL IDENTITY: ${identidadInmutableResumen}]`,
      `[ASSIGNED SCENE WARDROBE (${prendaElegida.idVestuario} - ${prendaElegida.escenarioOLugar}): ${prendaElegida.descripcionVestuario}. ${prendaElegida.promptVestuarioIngles}]`,
    ].join(" ");

    const promptActual = escena.promptImagenAncla || "";
    const yaContieneVestuario = promptActual.includes(
      `(${prendaElegida.idVestuario}`
    );

    const promptImagenAnclaEnriquecido = yaContieneVestuario
      ? promptActual
      : `${promptActual.trim()} ${bloqueIdentidadYVestuarioPrompt}`.trim();

    return {
      ...escena,
      idVestuarioAsignado: prendaElegida.idVestuario,
      descripcionVestuarioEscena: prendaElegida.descripcionVestuario,
      promptImagenAncla: promptImagenAnclaEnriquecido,
    };
  });
}
