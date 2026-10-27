// Generador de Láminas de Consistencia 360° (Turnaround Sheets) adaptadas a vestuario contextual sobre fondo gris neutro.
// Se conecta con tipos_director_arte.ts, almacenar_imagen_permanente.ts, gestor_biblioteca_activos.ts y el SDK de fal.ai.

import { fal } from "@fal-ai/client";
import { persistirImagenEnFirebaseStorage } from "./almacenar_imagen_permanente.ts";
import {
  type Lamina360Identidad,
  type TipoLamina360,
} from "./tipos_director_arte.ts";
import { ESTILOS_VISUALES_PROYECTO } from "../../mesa_entrada/constantes_mesa_entrada.ts";

export interface OpcionesVestuarioLamina360 {
  idVestuario?: string;
  descripcionVestuario?: string;
  promptVestuarioIngles?: string;
  identidadFisicaInmutable?: string;
  promptPersonalizado?: string;
}

/**
 * Resuelve de forma inteligente el endpoint exacto según si la escena o tarea tiene referencias (`image_urls`) o es generación pura.
 * Si tiene referencias, devuelve el endpoint de edición/kontext; si no tiene, devuelve el endpoint de texto puro.
 */
export function resolverEndpointImagenSegunReferencias(
  modeloImagen: string = "google/nano-banana-2.1",
  tieneReferencias: boolean = true
): string {
  const modeloLimpio = modeloImagen.trim().toLowerCase();

  // Caso 1: CON REFERENCIAS VISUALES (Image-to-Image / Edit)
  if (tieneReferencias) {
    if (
      modeloLimpio.endsWith("/edit") ||
      modeloLimpio.endsWith("/kontext") ||
      modeloLimpio.endsWith("/image-to-image")
    ) {
      return modeloImagen;
    }
    if (modeloLimpio.includes("seedream/v5/pro")) {
      return "bytedance/seedream/v5/pro/edit";
    }
    if (modeloLimpio.includes("seedream/v5/lite")) {
      return "bytedance/seedream/v5/lite/edit";
    }
    if (modeloLimpio.includes("seedream/v5/flash")) {
      return "bytedance/seedream/v5/flash/edit";
    }
    if (modeloLimpio.includes("seedream")) {
      return "fal-ai/bytedance/seedream/v4.5/edit";
    }
    if (modeloLimpio.includes("nano-banana-pro")) {
      return "fal-ai/nano-banana-pro/edit";
    }
    if (modeloLimpio.includes("nano-banana")) {
      return "google/nano-banana-2.1/edit";
    }
    if (
      modeloLimpio.includes("flux-kontext/dev") ||
      modeloLimpio === "fal-ai/flux/dev"
    ) {
      return "fal-ai/flux-kontext/dev";
    }
    if (modeloLimpio.includes("flux")) {
      return "fal-ai/flux-pro/kontext";
    }
    if (modeloLimpio.includes("recraft")) {
      return "fal-ai/recraft/v3/image-to-image";
    }
    if (modeloLimpio.includes("gpt-image")) {
      return "openai/gpt-image-2/edit";
    }
    return "google/nano-banana-2.1/edit";
  }

  // Caso 2: SIN REFERENCIAS (Text-to-Image Puro)
  if (modeloLimpio.includes("seedream/v5/pro")) {
    return "bytedance/seedream/v5/pro/text-to-image";
  }
  if (modeloLimpio.includes("seedream/v5/lite")) {
    return "bytedance/seedream/v5/lite/text-to-image";
  }
  if (modeloLimpio.includes("seedream/v5/flash")) {
    return "bytedance/seedream/v5/flash/text-to-image";
  }
  if (modeloLimpio.includes("seedream")) {
    return "fal-ai/bytedance/seedream/v4.5/text-to-image";
  }
  if (modeloLimpio.includes("nano-banana-pro")) {
    return "fal-ai/nano-banana-pro";
  }
  if (modeloLimpio.includes("nano-banana")) {
    return "google/nano-banana-2.1";
  }
  if (
    modeloLimpio.includes("flux-kontext/dev") ||
    modeloLimpio === "fal-ai/flux/dev"
  ) {
    return "fal-ai/flux/dev";
  }
  if (modeloLimpio.includes("flux")) {
    return "fal-ai/flux-pro/kontext/text-to-image";
  }
  if (modeloLimpio.includes("recraft")) {
    return "fal-ai/recraft/v3/text-to-image";
  }
  if (modeloLimpio.includes("gpt-image")) {
    return "openai/gpt-image-2";
  }
  return "google/nano-banana-2.1";
}

/**
 * Traduce el modelo de imagen a su endpoint de edición correspondiente que acepta `image_urls` o `image_url`.
 * Recibe el modelo base y devuelve la ruta del endpoint de edición.
 */
export function obtenerEndpointConReferencia(
  modeloImagen: string = "google/nano-banana-2.1"
): string {
  return resolverEndpointImagenSegunReferencias(modeloImagen, true);
}

/**
 * Obtiene la instrucción en inglés del estilo visual seleccionado para transformar o preservar la imagen.
 * Recibe el id del estilo y devuelve el bloque de texto en inglés para el prompt.
 */
export function obtenerInstruccionEstiloVisual(
  idEstilo: string = "original_referencia"
): string {
  const encontrado = ESTILOS_VISUALES_PROYECTO.find((e) => e.id === idEstilo);
  return (
    encontrado?.instruccionPromptIngles ||
    ESTILOS_VISUALES_PROYECTO[0].instruccionPromptIngles
  );
}

/**
 * Detecta si una imagen de referencia corresponde a un personaje/persona o a un producto/objeto.
 * Recibe el nombre del archivo y devuelve 'personaje' o 'producto'.
 */
export function detectarTipoReferencia(nombreArchivo: string): TipoLamina360 {
  const nombreLimpio = nombreArchivo.toLowerCase();
  const palabrasProducto = [
    "producto",
    "bebida",
    "lata",
    "botella",
    "caja",
    "empaque",
    "frasco",
    "envase",
    "pepsi",
    "coca",
    "snack",
    "taza",
    "zapato",
    "zapatilla",
    "reloj",
    "perfume",
    "crema",
  ];

  if (palabrasProducto.some((palabra) => nombreLimpio.includes(palabra))) {
    return "producto";
  }
  return "personaje";
}

/**
 * Construye el prompt técnico para generar la Hoja de Consistencia 360° (Turnaround Sheet) sobre fondo gris neutro (#808080).
 * Soporta tanto `vestuario_base` (mantener ropa original) como cambio de vestuario contextual (`vestuario_gimnasio`, `vestuario_playa`, etc.)
 * conservando el 100% de la `identidadFisicaInmutable` del personaje.
 */
export function construirPromptLamina360(
  tipo: TipoLamina360,
  nombreReferencia: string,
  estiloVisual: string = "original_referencia",
  descripcionVisualPrevia?: string,
  opcionesVestuario?: OpcionesVestuarioLamina360
): string {
  const instruccionEstilo = obtenerInstruccionEstiloVisual(estiloVisual);
  const contextoPrevio =
    descripcionVisualPrevia && descripcionVisualPrevia.trim().length > 0
      ? `Specific visual description from analysis: ${descripcionVisualPrevia.trim()}.`
      : "";

  const idVestuario = opcionesVestuario?.idVestuario || "vestuario_base";
  const esCambioVestuario =
    tipo === "personaje" &&
    idVestuario !== "vestuario_base" &&
    Boolean(opcionesVestuario?.descripcionVestuario);

  if (tipo === "personaje") {
    const reglaIdentidadYVestuario = esCambioVestuario
      ? `CRITICAL IDENTITY PRESERVATION & CONTEXTUAL WARDROBE RULE (${idVestuario}): Strictly preserve 100% of the character's immutable physical identity from the input image in image_urls (${opcionesVestuario?.identidadFisicaInmutable || "exact facial features, age, eye shape/color, skin tone, hair cut/color, body proportions, and permanent identity accessories"}), BUT REPLACE their original clothing with this exact consistent outfit for ${idVestuario}: ${opcionesVestuario?.descripcionVestuario}. ${opcionesVestuario?.promptVestuarioIngles || ""}.`
      : `CRITICAL IDENTITY AND WARDROBE RULE: Strictly preserve 100% of the character's facial features, age (child/adult/elderly), body proportions, hairstyle, accessories (such as glasses or bows), and the exact clothing colors, patterns, and footwear from the input image in image_urls (${opcionesVestuario?.identidadFisicaInmutable || "keep exact identity and vestuario_base"}).`;

    return [
      `Master character turnaround sheet, model sheet technical collage for reference subject: "${nombreReferencia}" (${idVestuario}).`,
      reglaIdentidadYVestuario,
      contextoPrevio,
      `ARTISTIC MEDIUM & RENDERING STYLE: ${instruccionEstilo}`,
      `STUDIO SETUP: Neutral studio middle grey background (#808080), clean diffused studio softbox lighting, high resolution, perfect identity continuity across all angles without visual drifting.`,
      `Top row: Macro face close-up sharp detail on eyes, facial expression, and hair. Head rotation grid: front view, left profile, right profile, three-quarter view, looking up, looking down, and rear head view.`,
      `Middle row: Full body turnaround in T-pose (arms spread) front view, T-pose back view, and neutral relaxed stance showing full matching clothing, fabric texture and shoes.`,
      `Bottom row: Full body 360 rotation: left side profile, right side profile, 3/4 front angle, full back view, 3/4 rear angle, and walking towards camera pose.`,
      `All views must depict the EXACT same individual with identical face, body proportions, and consistent ${idVestuario} clothing.`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  return [
    `Master commercial product turnaround sheet, studio packshot reference collage for: "${nombreReferencia}".`,
    `CRITICAL PRODUCT RULE: Strictly preserve 100% of the product's packaging shape, geometry, brand typography, logo placement, materials, colors, and volume from the input image in image_urls.`,
    contextoPrevio,
    `ARTISTIC MEDIUM & RENDERING STYLE: ${instruccionEstilo}`,
    `STUDIO SETUP: Neutral studio middle grey background (#808080), clean diffused softbox commercial studio lighting, high resolution, razor-sharp product details.`,
    `Top-left: Macro close-up on primary brand logo, label typography, material finish, and fine surface details.`,
    `Top-right: Cap, opening lid, rear nutrition/ingredient label, and barcode detail shots.`,
    `Middle and bottom rows: 360-degree turntable product views: front view, back view, left side profile, right side profile, top-down overhead view of the cap/top, and a dynamic 45-degree heroic angle.`,
    `All views must display the exact same product with identical colors, typography, and proportions.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Configura la clave FAL_KEY en el servidor si no ha sido configurada.
 * No recibe parámetros y devuelve un booleano indicando disponibilidad de la clave.
 */
function asegurarCredencialFal(): boolean {
  const clave = process.env.FAL_KEY;
  if (!clave || clave.trim().length === 0) return false;
  fal.config({ credentials: clave.trim() });
  return true;
}

/**
 * Genera la Lámina 360° de una referencia visual (y de un vestuario específico del armario)
 * usando endpoints Imagen-a-Imagen (`google/nano-banana-2.1/edit` o equivalente), la guarda en Firebase Storage y devuelve su ficha.
 */
export async function generarLamina360Individual(
  proyectoId: string,
  nombreReferencia: string,
  urlReferenciaOriginal: string,
  modeloElegido: string = "google/nano-banana-2.1",
  estiloVisual: string = "original_referencia",
  descripcionVisualPrevia?: string,
  opcionesVestuario?: OpcionesVestuarioLamina360
): Promise<Lamina360Identidad> {
  const tipo = detectarTipoReferencia(nombreReferencia);
  const idVestuario = opcionesVestuario?.idVestuario || "vestuario_base";
  const promptPorDefecto = construirPromptLamina360(
    tipo,
    nombreReferencia,
    estiloVisual,
    descripcionVisualPrevia,
    opcionesVestuario
  );
  const promptUsado =
    opcionesVestuario?.promptPersonalizado &&
    opcionesVestuario.promptPersonalizado.trim().length > 0
      ? opcionesVestuario.promptPersonalizado.trim()
      : promptPorDefecto;

  const nombreBaseId = nombreReferencia.replace(/[^a-zA-Z0-9_-]/g, "_");
  const idLamina =
    idVestuario !== "vestuario_base"
      ? `lamina_${nombreBaseId}__${idVestuario}`
      : `lamina_${nombreBaseId}`;

  if (!asegurarCredencialFal()) {
    return {
      id: idLamina,
      nombreReferencia,
      urlReferenciaOriginal,
      tipo,
      urlLamina360: "",
      promptUsado,
      fechaCreacion: new Date().toISOString(),
      estado: "error",
      error: "Falta configurar FAL_KEY en el servidor.",
      estiloVisualAplicado: estiloVisual,
      modeloGenerador: modeloElegido,
      idVestuario,
      descripcionVestuario: opcionesVestuario?.descripcionVestuario,
      identidadFisicaInmutable: opcionesVestuario?.identidadFisicaInmutable,
    };
  }

  try {
    const endpointFinal = obtenerEndpointConReferencia(modeloElegido);
    let urlResultadoTemporal: string = "";

    // Estructuramos la llamada pasando image_urls e image_url según el endpoint
    if (endpointFinal.includes("kontext")) {
      const respuesta = await fal.subscribe(endpointFinal, {
        input: {
          prompt: promptUsado,
          image_url: urlReferenciaOriginal,
        },
      });
      const datos = respuesta.data as { images?: Array<{ url: string }> };
      urlResultadoTemporal = datos.images?.[0]?.url || "";
    } else if (endpointFinal.includes("seedream")) {
      const respuesta = await fal.subscribe(endpointFinal, {
        input: {
          prompt: promptUsado,
          image_urls: [urlReferenciaOriginal],
          image_size: "portrait_4_3",
        },
      });
      const datos = respuesta.data as { images?: Array<{ url: string }> };
      urlResultadoTemporal = datos.images?.[0]?.url || "";
    } else {
      const respuesta = await fal.subscribe(endpointFinal, {
        input: {
          prompt: promptUsado,
          image_urls: [urlReferenciaOriginal],
          aspect_ratio: "3:4",
          resolution: "2K",
        },
      });
      const datos = respuesta.data as { images?: Array<{ url: string }> };
      urlResultadoTemporal = datos.images?.[0]?.url || "";
    }

    if (!urlResultadoTemporal) {
      throw new Error(
        `fal.ai no devolvió URL de imagen para la Lámina 360° de "${nombreReferencia}" (${idVestuario}).`
      );
    }

    const nombreLimpio = nombreReferencia.replace(/[^a-zA-Z0-9._-]/g, "_");
    const rutaStorage = `proyectos/${proyectoId}/laminas_360/lamina_360_${nombreLimpio}_${idVestuario}.png`;
    const urlPermanente = await persistirImagenEnFirebaseStorage(
      urlResultadoTemporal,
      rutaStorage,
      "image/png"
    );

    return {
      id: idLamina,
      nombreReferencia,
      urlReferenciaOriginal,
      tipo,
      urlLamina360: urlPermanente,
      promptUsado,
      fechaCreacion: new Date().toISOString(),
      estado: "lista",
      estiloVisualAplicado: estiloVisual,
      modeloGenerador: modeloElegido,
      idVestuario,
      descripcionVestuario: opcionesVestuario?.descripcionVestuario,
      identidadFisicaInmutable: opcionesVestuario?.identidadFisicaInmutable,
      reutilizadaDeBiblioteca: false,
    };
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al generar Lámina 360°.";
    return {
      id: idLamina,
      nombreReferencia,
      urlReferenciaOriginal,
      tipo,
      urlLamina360: "",
      promptUsado,
      fechaCreacion: new Date().toISOString(),
      estado: "error",
      error: mensaje,
      estiloVisualAplicado: estiloVisual,
      modeloGenerador: modeloElegido,
      idVestuario,
      descripcionVestuario: opcionesVestuario?.descripcionVestuario,
      identidadFisicaInmutable: opcionesVestuario?.identidadFisicaInmutable,
    };
  }
}
