// Endpoint de servidor (/api/agentes/analizar-idea) que ejecuta el Agente Productor Ejecutivo Multimodal y persiste en Firestore y Biblioteca.
// Se conecta con inspector_multimodal_fal.ts, gestor_biblioteca_activos.ts y VistaEstudioInicial.tsx.

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import { actualizarFichaYLaminaEnBibliotecaFirestore } from "@/biblioteca/gestor_biblioteca_activos";
import { ejecutarAnalisisProductorEjecutivo } from "@/agentes/analista_clarificador/inspector_multimodal_fal";
import { type EntradaAnalizarIdea } from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";
import {
  type ArchivoMultimediaGuardado,
  COLECCION_PROYECTOS,
  ESTADO_ESPERANDO_CLARIFICACION,
  ESTADO_LISTO_PARA_GUION,
} from "@/mesa_entrada/constantes_mesa_entrada";

/**
 * Recibe la idea y archivos (o el proyectoId en Firestore), ejecuta el análisis multimodal con separación
 * de Identidad Física Inmutable vs. Vestuario Base, y guarda el resultado en Firestore y en `biblioteca_activos`.
 */
export async function POST(peticion: NextRequest) {
  try {
    const cuerpo = (await peticion.json()) as Partial<EntradaAnalizarIdea>;
    const proyectoId =
      typeof cuerpo.proyectoId === "string" ? cuerpo.proyectoId.trim() : "";

    let ideaOriginal =
      typeof cuerpo.ideaOriginal === "string" ? cuerpo.ideaOriginal.trim() : "";
    let formato = cuerpo.formato || "16:9";
    let duracionObjetivo = cuerpo.duracionObjetivo || "Auto";
    let idiomaSalida = cuerpo.idiomaSalida || "Español";
    let archivosMultimedia = Array.isArray(cuerpo.archivosMultimedia)
      ? cuerpo.archivosMultimedia
      : [];
    let imagenesReferencia = Array.isArray(cuerpo.imagenesReferencia)
      ? cuerpo.imagenesReferencia
      : [];

    // Si VistaEstudioInicial envía únicamente proyectoId, leemos los datos del documento en Firestore
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
          idiomaSalida?: string;
          archivosMultimedia?: ArchivoMultimediaGuardado[];
          imagenesReferencia?: string[];
        };
        ideaOriginal = datosDoc.ideaOriginal?.trim() || ideaOriginal;
        formato = datosDoc.formato || formato;
        duracionObjetivo = datosDoc.duracionObjetivo || duracionObjetivo;
        idiomaSalida = datosDoc.idiomaSalida || idiomaSalida;
        if (archivosMultimedia.length === 0 && Array.isArray(datosDoc.archivosMultimedia)) {
          archivosMultimedia = datosDoc.archivosMultimedia;
        }
        if (imagenesReferencia.length === 0 && Array.isArray(datosDoc.imagenesReferencia)) {
          imagenesReferencia = datosDoc.imagenesReferencia;
        }
      }
    }

    if (!ideaOriginal || ideaOriginal.length < 5) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Es necesario enviar una 'ideaOriginal' válida (mínimo 5 caracteres) para que el Agente Productor la analice.",
        },
        { status: 400 }
      );
    }

    const resultadoAnalisis = await ejecutarAnalisisProductorEjecutivo({
      proyectoId,
      ideaOriginal,
      formato,
      duracionObjetivo,
      idiomaSalida,
      archivosMultimedia,
      imagenesReferencia,
      modoSilencioso: Boolean(cuerpo.modoSilencioso),
    });

    const estadoSiguiente = resultadoAnalisis.requiereClarificacion
      ? ESTADO_ESPERANDO_CLARIFICACION
      : ESTADO_LISTO_PARA_GUION;

    // Persistimos en Firestore del proyecto y actualizamos biblioteca_activos con la identidad separada
    if (proyectoId && verificarConfiguracionFirebase().estaConfigurado) {
      try {
        const baseDeDatos = obtenerBaseDeDatosFirestore();
        const refProyecto = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
        await updateDoc(refProyecto, {
          analisisProductorEjecutivo: JSON.parse(
            JSON.stringify(resultadoAnalisis)
          ),
          estado: estadoSiguiente,
        });

        const desgloses =
          resultadoAnalisis.fichaIdentidadVisual?.personajesSeparados ?? [];
        for (const personaje of desgloses) {
          await actualizarFichaYLaminaEnBibliotecaFirestore({
            urlReferenciaOriginal: personaje.urlImagen || "",
            nombreReferencia: personaje.nombreArchivo,
            fichaIdentidadBase: {
              nombreReferencia: personaje.nombreArchivo,
              identidadFisicaInmutable: personaje.identidadFisicaInmutable,
              vestuarioOriginalFoto: personaje.vestuarioOriginalFoto,
            },
          });
        }
      } catch {
        // Si la actualización secundaria falla, devolvemos igualmente el análisis en la respuesta HTTP
      }
    }

    return NextResponse.json({
      ok: true,
      proyectoId: proyectoId ?? null,
      estadoSiguiente,
      analisisProductorEjecutivo: resultadoAnalisis,
    });
  } catch (error) {
    const detalle =
      error instanceof Error
        ? error.message
        : "Error interno al ejecutar el Agente Productor Ejecutivo.";

    return NextResponse.json(
      {
        ok: false,
        error: detalle,
      },
      { status: 500 }
    );
  }
}
