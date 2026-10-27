// Generador de Imágenes Ancla (Keyframes) por Escena usando el modelo elegido y las Láminas 360° adaptadas al vestuario de cada escena.
// Se conecta con tipos_director_arte.ts, almacenar_imagen_permanente.ts, generador_laminas_360.ts y el SDK de fal.ai.

import { fal } from "@fal-ai/client";
import { persistirImagenEnFirebaseStorage } from "./almacenar_imagen_permanente.ts";
import { type Lamina360Identidad } from "./tipos_director_arte.ts";
import {
  obtenerInstruccionEstiloVisual,
  resolverEndpointImagenSegunReferencias,
} from "./generador_laminas_360.ts";

interface EntradaGenerarEscenaIndividual {
  proyectoId: string;
  idEscena: string;
  numero: number;
  promptImagenAncla: string;
  archivosReferenciaUsados: string[];
  idVestuarioAsignado?: string;
  descripcionVestuarioEscena?: string;
  laminas360Disponibles: Lamina360Identidad[];
  modeloImagen?: string;
  estiloVisualSeleccionado?: string;
  formato?: string;
}

export interface ResultadoGeneracionEscena {
  idEscena: string;
  numero: number;
  imagenAnclaUrl?: string;
  estadoImagen: "lista" | "error";
  errorImagen?: string;
}

/**
 * Mapea el formato de relación de aspecto del proyecto al parámetro aspect_ratio esperado por fal.ai.
 * Recibe el formato del proyecto (ej. "16:9", "9:16", "1:1", "4:5", "4:3", "21:9") y devuelve el valor aceptado.
 */
export function normalizarAspectRatioFal(formato: string = "16:9"): string {
  const limpio = formato.trim();
  switch (limpio) {
    case "16:9":
    case "9:16":
    case "1:1":
    case "4:3":
    case "3:4":
      return limpio;
    case "4:5":
      return "3:4";
    case "21:9":
      return "16:9";
    default:
      return "16:9";
  }
}

/**
 * Traduce el formato del proyecto al enum `image_size` requerido por los endpoints oficiales de ByteDance Seedream en fal.ai.
 */
export function normalizarImageSizeSeedream(formato: string = "16:9"): string {
  const limpio = formato.trim();
  switch (limpio) {
    case "9:16":
      return "portrait_16_9";
    case "1:1":
      return "square_hd";
    case "4:5":
    case "3:4":
      return "portrait_4_3";
    case "4:3":
      return "landscape_4_3";
    case "16:9":
    case "21:9":
    default:
      return "landscape_16_9";
  }
}

/**
 * Selecciona las URLs de las Láminas 360° que corresponden a los personajes o productos de la escena
 * priorizando la Lámina 360° cuyo `idVestuario` coincida con el `idVestuarioAsignado` de esa escena (ej. `vestuario_gimnasio`).
 */
export function seleccionarLaminasParaEscena(
  referenciasUsadas: string[],
  laminasDisponibles: Lamina360Identidad[],
  idVestuarioAsignado: string = "vestuario_base"
): string[] {
  const laminasListas = laminasDisponibles.filter(
    (l) => l.estado === "lista" && Boolean(l.urlLamina360)
  );
  if (laminasListas.length === 0) return [];

  const vestuarioBuscado = (idVestuarioAsignado || "vestuario_base").trim();

  // Filtramos primero por las referencias que participan en la escena (o todas si no se especificó ninguna)
  const candidatasPorReferencia =
    Array.isArray(referenciasUsadas) && referenciasUsadas.length > 0
      ? laminasListas.filter((lamina) =>
          referenciasUsadas.some((refNombre) => {
            const limpioRef = refNombre.toLowerCase();
            const limpioLam = lamina.nombreReferencia.toLowerCase();
            return (
              limpioRef.includes(limpioLam) || limpioLam.includes(limpioRef)
            );
          })
        )
      : laminasListas;

  const grupoParaEvaluar =
    candidatasPorReferencia.length > 0 ? candidatasPorReferencia : laminasListas;

  // Agrupamos por nombreReferencia para elegir la lámina del vestuario exacto de esta escena (o su vestuario_base si es producto)
  const porPersonajeOProducto = new Map<string, Lamina360Identidad[]>();
  for (const lam of grupoParaEvaluar) {
    const clave = lam.nombreReferencia.toLowerCase();
    const lista = porPersonajeOProducto.get(clave) ?? [];
    lista.push(lam);
    porPersonajeOProducto.set(clave, lista);
  }

  const urlsSeleccionadas: string[] = [];
  for (const [, variantes] of porPersonajeOProducto.entries()) {
    const exactaVestuario = variantes.find(
      (v) => (v.idVestuario || "vestuario_base") === vestuarioBuscado
    );
    const respaldoBase =
      variantes.find(
        (v) => (v.idVestuario || "vestuario_base") === "vestuario_base"
      ) ?? variantes[0];

    const elegida = exactaVestuario ?? respaldoBase;
    if (elegida?.urlLamina360) {
      urlsSeleccionadas.push(elegida.urlLamina360);
    }
  }

  return urlsSeleccionadas;
}

/**
 * Genera la Imagen Ancla (Keyframe) de una escena individual inyectando las Láminas 360° del vestuario asignado
 * y aplicando el estilo visual seleccionado mediante endpoints de edición Imagen-a-Imagen.
 */
export async function generarImagenAnclaEscenaIndividual(
  datos: EntradaGenerarEscenaIndividual
): Promise<ResultadoGeneracionEscena> {
  const clave = process.env.FAL_KEY;
  if (!clave || clave.trim().length === 0) {
    return {
      idEscena: datos.idEscena,
      numero: datos.numero,
      estadoImagen: "error",
      errorImagen: "Falta configurar FAL_KEY en el servidor.",
    };
  }
  fal.config({ credentials: clave.trim() });

  const modeloBase = datos.modeloImagen || "google/nano-banana-2.1";
  const aspectRatio = normalizarAspectRatioFal(datos.formato || "16:9");
  const estilo = datos.estiloVisualSeleccionado || "original_referencia";
  const instruccionEstilo = obtenerInstruccionEstiloVisual(estilo);
  const vestuarioEscena = datos.idVestuarioAsignado || "vestuario_base";

  const urlsLaminas = seleccionarLaminasParaEscena(
    datos.archivosReferenciaUsados,
    datos.laminas360Disponibles,
    vestuarioEscena
  );

  const notaVestuario = datos.descripcionVestuarioEscena
    ? `SCENE CONSISTENT WARDROBE (${vestuarioEscena}): ${datos.descripcionVestuarioEscena}.`
    : "";

  const promptFinal = [
    `ARTISTIC MEDIUM & RENDERING STYLE: ${instruccionEstilo}.`,
    `SCENE KEYFRAME ACTION: ${datos.promptImagenAncla}.`,
    notaVestuario,
    urlsLaminas.length > 0
      ? `STRICT IDENTITY & WARDROBE CONTINUITY: Match 100% of the characters' immutable facial identity and the exact ${vestuarioEscena} clothing shown in the provided reference 360 turnaround sheets.`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    let urlTemporal = "";
    const tieneReferencias = urlsLaminas.length > 0;
    const endpointFinal = resolverEndpointImagenSegunReferencias(
      modeloBase,
      tieneReferencias
    );

    if (tieneReferencias) {
      if (endpointFinal.includes("kontext") || endpointFinal.includes("recraft")) {
        const respuesta = await fal.subscribe(endpointFinal, {
          input: {
            prompt: promptFinal,
            image_url: urlsLaminas[0],
          },
        });
        const d = respuesta.data as { images?: Array<{ url: string }> };
        urlTemporal = d.images?.[0]?.url || "";
      } else if (endpointFinal.includes("seedream")) {
        const respuesta = await fal.subscribe(endpointFinal, {
          input: {
            prompt: promptFinal,
            image_urls: urlsLaminas.slice(0, 10),
            image_size: normalizarImageSizeSeedream(datos.formato || "16:9"),
          },
        });
        const d = respuesta.data as { images?: Array<{ url: string }> };
        urlTemporal = d.images?.[0]?.url || "";
      } else {
        const respuesta = await fal.subscribe(endpointFinal, {
          input: {
            prompt: promptFinal,
            image_urls: urlsLaminas,
            aspect_ratio: aspectRatio,
            resolution: "2K",
          },
        });
        const d = respuesta.data as { images?: Array<{ url: string }> };
        urlTemporal = d.images?.[0]?.url || "";
      }
    } else if (endpointFinal.includes("seedream")) {
      const respuesta = await fal.subscribe(endpointFinal, {
        input: {
          prompt: promptFinal,
          image_size: normalizarImageSizeSeedream(datos.formato || "16:9"),
          num_images: 1,
        },
      });
      const d = respuesta.data as { images?: Array<{ url: string }> };
      urlTemporal = d.images?.[0]?.url || "";
    } else {
      const respuesta = await fal.subscribe(endpointFinal, {
        input: {
          prompt: promptFinal,
          aspect_ratio: aspectRatio,
          num_images: 1,
        },
      });
      const d = respuesta.data as { images?: Array<{ url: string }> };
      urlTemporal = d.images?.[0]?.url || "";
    }

    if (!urlTemporal) {
      throw new Error(
        `fal.ai no devolvió URL de imagen para la Escena #${datos.numero}.`
      );
    }

    const rutaStorage = `proyectos/${datos.proyectoId}/escenas/escena_${datos.numero}.png`;
    const urlPermanente = await persistirImagenEnFirebaseStorage(
      urlTemporal,
      rutaStorage,
      "image/png"
    );

    return {
      idEscena: datos.idEscena,
      numero: datos.numero,
      imagenAnclaUrl: urlPermanente,
      estadoImagen: "lista",
    };
  } catch (error) {
    const mensaje =
      error instanceof Error
        ? error.message
        : "Error al generar la imagen ancla.";
    return {
      idEscena: datos.idEscena,
      numero: datos.numero,
      estadoImagen: "error",
      errorImagen: mensaje,
    };
  }
}
