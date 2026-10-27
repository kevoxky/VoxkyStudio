// Endpoint (/api/agentes/generar-imagenes-escenas) para generar y persistir las Imágenes Ancla de las escenas en Firestore y Storage.
// Se conecta con generador_imagenes_escenas.ts, Firestore y PanelEstudioVisualPaso4.tsx.

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { obtenerBaseDeDatosFirestore } from "@/configuracion/cliente_firebase";
import {
  COLECCION_PROYECTOS,
  ESTADO_GENERANDO_IMAGENES,
  ESTADO_LISTO_PARA_PRODUCCION_AV,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { generarImagenAnclaEscenaIndividual } from "@/agentes/director_arte/generador_imagenes_escenas";
import { type EntradaGenerarImagenesEscenas, type Lamina360Identidad } from "@/agentes/director_arte/tipos_director_arte";
import { type EscenaGuion, type GuionProduccionCompleto } from "@/agentes/guionista/tipos_guion";

/**
 * Genera las Imágenes Ancla (Keyframes) de las escenas del proyecto (o de una escena individual) y las guarda en Storage y Firestore.
 * Recibe el ID del proyecto, las escenas y opcionalmente el escenaIdIndividual.
 */
export async function POST(peticion: NextRequest) {
  try {
    const cuerpo = (await peticion.json()) as Partial<EntradaGenerarImagenesEscenas>;
    const proyectoId = cuerpo.proyectoId;

    if (!proyectoId || typeof proyectoId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Es necesario enviar el campo 'proyectoId'." },
        { status: 400 }
      );
    }

    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const docRef = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
    const instantanea = await getDoc(docRef);

    if (!instantanea.exists()) {
      return NextResponse.json(
        { ok: false, error: `No se encontró el proyecto con ID ${proyectoId}.` },
        { status: 404 }
      );
    }

    const datosProyecto = instantanea.data() as {
      formato?: string;
      modeloImagen?: string;
      estiloVisualSeleccionado?: string;
      laminas360?: Lamina360Identidad[];
      guionProduccion?: GuionProduccionCompleto;
    };

    const guionActual = datosProyecto.guionProduccion;
    if (!guionActual || !Array.isArray(guionActual.escenas) || guionActual.escenas.length === 0) {
      return NextResponse.json(
        { ok: false, error: "El proyecto no tiene un guion con escenas generado." },
        { status: 400 }
      );
    }

    const modeloFinal = cuerpo.modeloImagen || datosProyecto.modeloImagen || "google/nano-banana-2.1";
    const formatoFinal = cuerpo.formato || datosProyecto.formato || "16:9";
    const estiloFinal = cuerpo.estiloVisualSeleccionado || datosProyecto.estiloVisualSeleccionado || "original_referencia";
    const laminasDisponibles = Array.isArray(cuerpo.laminas360)
      ? cuerpo.laminas360
      : Array.isArray(datosProyecto.laminas360)
      ? datosProyecto.laminas360
      : [];

    const escenaIdBuscada = cuerpo.escenaIdIndividual;
    const promptEditado =
      typeof cuerpo.promptPersonalizado === "string" &&
      cuerpo.promptPersonalizado.trim().length > 0
        ? cuerpo.promptPersonalizado.trim()
        : undefined;

    const escenasActualizadas: EscenaGuion[] = guionActual.escenas.map((e) =>
      escenaIdBuscada && e.idEscena === escenaIdBuscada && promptEditado
        ? { ...e, promptImagenAncla: promptEditado }
        : e
    );

    const escenasParaProcesar: EscenaGuion[] = escenaIdBuscada
      ? escenasActualizadas.filter((e) => e.idEscena === escenaIdBuscada)
      : escenasActualizadas;

    if (escenasParaProcesar.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No se encontraron escenas para generar imágenes." },
        { status: 400 }
      );
    }

    if (!escenaIdBuscada) {
      await updateDoc(docRef, { estado: ESTADO_GENERANDO_IMAGENES });
    }

    const CONCURRENCIA_MAXIMA = 3;

    for (let i = 0; i < escenasParaProcesar.length; i += CONCURRENCIA_MAXIMA) {
      const lote = escenasParaProcesar.slice(i, i + CONCURRENCIA_MAXIMA);

      const resultadosLote = await Promise.all(
        lote.map((escena) =>
          generarImagenAnclaEscenaIndividual({
            proyectoId,
            idEscena: escena.idEscena,
            numero: escena.numero,
            promptImagenAncla: escena.promptImagenAncla,
            archivosReferenciaUsados: escena.archivosReferenciaUsados || [],
            idVestuarioAsignado: escena.idVestuarioAsignado || "vestuario_base",
            descripcionVestuarioEscena: escena.descripcionVestuarioEscena,
            laminas360Disponibles: laminasDisponibles,
            modeloImagen: modeloFinal,
            estiloVisualSeleccionado: estiloFinal,
            formato: formatoFinal,
          })
        )
      );

      for (const res of resultadosLote) {
        const idx = escenasActualizadas.findIndex((e) => e.idEscena === res.idEscena);
        if (idx >= 0) {
          escenasActualizadas[idx] = {
            ...escenasActualizadas[idx],
            imagenAnclaUrl: res.imagenAnclaUrl || escenasActualizadas[idx].imagenAnclaUrl,
            estadoImagen: res.estadoImagen,
            errorImagen: res.errorImagen,
          };
        }
      }

      await updateDoc(docRef, {
        "guionProduccion.escenas": JSON.parse(JSON.stringify(escenasActualizadas)),
      });
    }

    const todasListas = escenasActualizadas.every((e) => e.estadoImagen === "lista");
    const estadoFinal = todasListas ? ESTADO_LISTO_PARA_PRODUCCION_AV : ESTADO_GENERANDO_IMAGENES;

    if (!escenaIdBuscada) {
      await updateDoc(docRef, { estado: estadoFinal });
    }

    return NextResponse.json({
      ok: true,
      proyectoId,
      estadoSiguiente: estadoFinal,
      escenas: escenasActualizadas,
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "Error inesperado al generar las imágenes de las escenas.";
    return NextResponse.json({ ok: false, error: detalle }, { status: 500 });
  }
}

/**
 * Elimina la imagen generada de una escena específica cuando el usuario no está conforme con el resultado.
 */
export async function DELETE(peticion: NextRequest) {
  try {
    const cuerpo = (await peticion.json()) as {
      proyectoId?: string;
      idEscena?: string;
    };

    if (!cuerpo.proyectoId || !cuerpo.idEscena) {
      return NextResponse.json(
        { ok: false, error: "Faltan 'proyectoId' o 'idEscena'." },
        { status: 400 }
      );
    }

    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const docRef = doc(baseDeDatos, COLECCION_PROYECTOS, cuerpo.proyectoId);
    const instantanea = await getDoc(docRef);

    if (!instantanea.exists()) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el proyecto." },
        { status: 404 }
      );
    }

    const datos = instantanea.data() as {
      guionProduccion?: GuionProduccionCompleto;
    };
    const escenas = datos.guionProduccion?.escenas || [];

    const escenasActualizadas = escenas.map((esc) => {
      if (esc.idEscena !== cuerpo.idEscena) return esc;
      const copia = { ...esc };
      delete copia.imagenAnclaUrl;
      delete copia.estadoImagen;
      delete copia.errorImagen;
      return copia;
    });

    await updateDoc(docRef, {
      "guionProduccion.escenas": JSON.parse(
        JSON.stringify(escenasActualizadas)
      ),
    });

    return NextResponse.json({ ok: true, escenas: escenasActualizadas });
  } catch (error) {
    const detalle =
      error instanceof Error
        ? error.message
        : "Error al eliminar la imagen de la escena.";
    return NextResponse.json({ ok: false, error: detalle }, { status: 500 });
  }
}
