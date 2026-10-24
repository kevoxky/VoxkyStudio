// Endpoint desacoplado (/api/agentes/analizar-idea) para el Agente Productor Ejecutivo Multimodal y futuros Widgets B2B.
// Se conecta con src/agentes/analista_clarificador/inspector_multimodal_fal.ts y src/estudio/VistaEstudioInicial.tsx.

import { NextRequest, NextResponse } from "next/server";
import {
  ESTADO_ESPERANDO_CLARIFICACION,
  ESTADO_LISTO_PARA_GUION,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { ejecutarAnalisisProductorEjecutivo } from "@/agentes/analista_clarificador/inspector_multimodal_fal";
import { type EntradaAnalizarIdea } from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";

/**
 * Procesa el análisis multimodal de la idea y archivos (o peticiones externas con modoSilencioso: true).
 * Recibe los datos del proyecto y devuelve la clasificación, el análisis de visión/audio y de 0 a N preguntas.
 */
export async function POST(peticion: NextRequest) {
  try {
    const cuerpo = (await peticion.json()) as Partial<EntradaAnalizarIdea>;

    if (
      !cuerpo ||
      typeof cuerpo.ideaOriginal !== "string" ||
      cuerpo.ideaOriginal.trim().length === 0
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Es necesario enviar el campo 'ideaOriginal' con la descripción del proyecto.",
        },
        { status: 400 }
      );
    }

    const analisisProductorEjecutivo = await ejecutarAnalisisProductorEjecutivo({
      proyectoId: cuerpo.proyectoId,
      ideaOriginal: cuerpo.ideaOriginal.trim(),
      formato: cuerpo.formato,
      duracionObjetivo: cuerpo.duracionObjetivo,
      idiomaSalida: cuerpo.idiomaSalida,
      archivosMultimedia: cuerpo.archivosMultimedia,
      imagenesReferencia: cuerpo.imagenesReferencia,
      modoSilencioso: Boolean(cuerpo.modoSilencioso),
    });

    // Si hubo 0 preguntas o está activo modoSilencioso (API/Widget), pasa directo a "listo_para_guion"
    const estadoSiguiente = analisisProductorEjecutivo.requiereClarificacion
      ? ESTADO_ESPERANDO_CLARIFICACION
      : ESTADO_LISTO_PARA_GUION;

    return NextResponse.json({
      ok: true,
      proyectoId: cuerpo.proyectoId ?? null,
      estadoSiguiente,
      analisisProductorEjecutivo,
    });
  } catch (error) {
    const detalle =
      error instanceof Error
        ? error.message
        : "Error inesperado al analizar la idea en el Productor Ejecutivo.";

    return NextResponse.json(
      {
        ok: false,
        error: detalle,
      },
      { status: 500 }
    );
  }
}
