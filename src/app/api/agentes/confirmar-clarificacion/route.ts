// Endpoint desacoplado (/api/agentes/confirmar-clarificacion) para guardar las respuestas del usuario o saltar preguntas.
// Se conecta con src/estudio/PanelClarificacionDirector.tsx y prepara el proyecto en estado "listo_para_guion".

import { NextRequest, NextResponse } from "next/server";
import { ESTADO_LISTO_PARA_GUION } from "@/mesa_entrada/constantes_mesa_entrada";
import { type AnalisisProductorEjecutivo } from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";

interface CuerpoConfirmarClarificacion {
  proyectoId?: string;
  analisisActual: AnalisisProductorEjecutivo;
  respuestasUsuario?: Record<string, string>;
  saltarPreguntas?: boolean;
}

/**
 * Consolida las respuestas elegidas por el usuario (o aplica las decisiones automáticas del Director si decidió saltar).
 * Recibe el análisis actual y las respuestas, y devuelve el análisis actualizado con estadoSiguiente = "listo_para_guion".
 */
export async function POST(peticion: NextRequest) {
  try {
    const cuerpo =
      (await peticion.json()) as Partial<CuerpoConfirmarClarificacion>;

    if (!cuerpo || !cuerpo.analisisActual) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Falta el objeto 'analisisActual' para confirmar la clarificación del proyecto.",
        },
        { status: 400 }
      );
    }

    const fueSaltado = Boolean(cuerpo.saltarPreguntas);
    const respuestasLimpias: Record<string, string> = {};

    if (!fueSaltado && cuerpo.respuestasUsuario) {
      for (const [clave, valor] of Object.entries(cuerpo.respuestasUsuario)) {
        if (typeof valor === "string" && valor.trim().length > 0) {
          respuestasLimpias[clave] = valor.trim();
        }
      }
    }

    // Si el usuario saltó las preguntas o dejó alguna sin responder, el Director completa con su criterio profesional
    for (const pregunta of cuerpo.analisisActual.preguntas ?? []) {
      if (!respuestasLimpias[pregunta.id]) {
        respuestasLimpias[pregunta.id] =
          pregunta.opcionesSugeridas[0] ??
          "Criterio creativo automático del Director";
      }
    }

    const analisisActualizado: AnalisisProductorEjecutivo = {
      ...cuerpo.analisisActual,
      requiereClarificacion: false,
      respuestasUsuario: respuestasLimpias,
      fueSaltadoPorUsuario: fueSaltado,
      resumenDireccionCreativa: fueSaltado
        ? "El Director asumió las decisiones creativas automáticamente. Proyecto listo para generar el guion técnico."
        : "Respuestas de dirección confirmadas por el creador. Proyecto listo para generar el guion técnico.",
    };

    return NextResponse.json({
      ok: true,
      proyectoId: cuerpo.proyectoId ?? null,
      estadoSiguiente: ESTADO_LISTO_PARA_GUION,
      analisisProductorEjecutivo: analisisActualizado,
    });
  } catch (error) {
    const detalle =
      error instanceof Error
        ? error.message
        : "Error inesperado al confirmar las decisiones del Director.";

    return NextResponse.json(
      {
        ok: false,
        error: detalle,
      },
      { status: 500 }
    );
  }
}
