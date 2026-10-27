// Endpoint de servidor (/api/agentes/generar-guion) que ejecuta el Agente Guionista Cinematográfico y persiste en Firestore.
// Se conecta con generador_guion_fal.ts, tipos_guion.ts y VistaEstudioInicial.tsx.

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import { type AnalisisProductorEjecutivo } from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";
import { ejecutarAgenteGuionistaCompleto } from "@/agentes/guionista/generador_guion_fal";
import { type EntradaGenerarGuion } from "@/agentes/guionista/tipos_guion";
import {
  type ArchivoMultimediaGuardado,
  COLECCION_PROYECTOS,
  ESTADO_ESPERANDO_APROBACION_GUION,
} from "@/mesa_entrada/constantes_mesa_entrada";

/**
 * Recibe los datos aprobados (o el proyectoId en Firestore), genera el Guion y Timeline de escenas con Armario de Vestuario
 * y guarda el resultado en Firestore con estado "esperando_aprobacion_guion".
 */
export async function POST(peticion: NextRequest) {
  try {
    const cuerpo = (await peticion.json()) as Partial<EntradaGenerarGuion> & {
      duracionExactaAudioSegundos?: number;
    };
    const proyectoId =
      typeof cuerpo.proyectoId === "string" ? cuerpo.proyectoId.trim() : "";

    let ideaOriginal =
      typeof cuerpo.ideaOriginal === "string" ? cuerpo.ideaOriginal.trim() : "";
    let formato = cuerpo.formato || "16:9";
    let duracionObjetivo = cuerpo.duracionObjetivo || "Auto";
    let modeloVideo = cuerpo.modeloVideo;
    let idiomaSalida = cuerpo.idiomaSalida || "Español";
    let archivosMultimedia = Array.isArray(cuerpo.archivosMultimedia)
      ? cuerpo.archivosMultimedia
      : [];
    let imagenesReferencia = Array.isArray(cuerpo.imagenesReferencia)
      ? cuerpo.imagenesReferencia
      : [];
    let analisisProductorEjecutivo = cuerpo.analisisProductorEjecutivo;

    // Si VistaEstudioInicial envía únicamente proyectoId, leemos el proyecto completo desde Firestore
    if (
      proyectoId &&
      ideaOriginal.length < 5 &&
      verificarConfiguracionFirebase().estaConfigurado
    ) {
      const baseDeDatos = obtenerBaseDeDatosFirestore();
      const refProyecto = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
      const snapProyecto = await getDoc(refProyecto);
      if (snapProyecto.exists()) {
        const datosDoc = snapProyecto.data() as {
          ideaOriginal?: string;
          formato?: string;
          duracionObjetivo?: string;
          modeloVideo?: string;
          idiomaSalida?: string;
          archivosMultimedia?: ArchivoMultimediaGuardado[];
          imagenesReferencia?: string[];
          analisisProductorEjecutivo?: AnalisisProductorEjecutivo;
        };
        ideaOriginal = datosDoc.ideaOriginal?.trim() || ideaOriginal;
        formato = datosDoc.formato || formato;
        duracionObjetivo = datosDoc.duracionObjetivo || duracionObjetivo;
        modeloVideo = datosDoc.modeloVideo || modeloVideo;
        idiomaSalida = datosDoc.idiomaSalida || idiomaSalida;
        if (
          archivosMultimedia.length === 0 &&
          Array.isArray(datosDoc.archivosMultimedia)
        ) {
          archivosMultimedia = datosDoc.archivosMultimedia;
        }
        if (
          imagenesReferencia.length === 0 &&
          Array.isArray(datosDoc.imagenesReferencia)
        ) {
          imagenesReferencia = datosDoc.imagenesReferencia;
        }
        if (!analisisProductorEjecutivo && datosDoc.analisisProductorEjecutivo) {
          analisisProductorEjecutivo = datosDoc.analisisProductorEjecutivo;
        }
      }
    }

    if (!ideaOriginal || ideaOriginal.length < 5) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Es necesario enviar la 'ideaOriginal' del proyecto para generar el Guion y Timeline de escenas.",
        },
        { status: 400 }
      );
    }

    const duracionForzada =
      typeof cuerpo.duracionAudioForzadaSegundos === "number"
        ? cuerpo.duracionAudioForzadaSegundos
        : typeof cuerpo.duracionExactaAudioSegundos === "number"
          ? cuerpo.duracionExactaAudioSegundos
          : undefined;

    const { guionProduccion, analisisReconciliado } =
      await ejecutarAgenteGuionistaCompleto({
        proyectoId,
        ideaOriginal,
        formato,
        duracionObjetivo,
        modeloVideo,
        idiomaSalida,
        archivosMultimedia,
        imagenesReferencia,
        analisisProductorEjecutivo,
        duracionAudioForzadaSegundos: duracionForzada,
      });

    if (proyectoId && verificarConfiguracionFirebase().estaConfigurado) {
      try {
        const baseDeDatos = obtenerBaseDeDatosFirestore();
        const refProyecto = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
        await updateDoc(refProyecto, {
          guionProduccion: JSON.parse(JSON.stringify(guionProduccion)),
          ...(analisisReconciliado
            ? {
                analisisProductorEjecutivo: JSON.parse(
                  JSON.stringify(analisisReconciliado)
                ),
              }
            : {}),
          estado: ESTADO_ESPERANDO_APROBACION_GUION,
        });
      } catch {
        // Si la escritura secundaria falla, devolvemos igualmente el guion en la respuesta HTTP
      }
    }

    return NextResponse.json({
      ok: true,
      proyectoId: proyectoId ?? null,
      estadoSiguiente: ESTADO_ESPERANDO_APROBACION_GUION,
      guionProduccion,
      analisisProductorEjecutivo: analisisReconciliado,
    });
  } catch (error) {
    const detalle =
      error instanceof Error
        ? error.message
        : "Error interno al ejecutar el Agente Guionista y Planificador de Tomas.";

    return NextResponse.json(
      {
        ok: false,
        error: detalle,
      },
      { status: 500 }
    );
  }
}
