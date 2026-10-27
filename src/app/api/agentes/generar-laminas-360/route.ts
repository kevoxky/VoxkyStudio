// Endpoint (/api/agentes/generar-laminas-360) para crear o reutilizar Láminas 360° (base y por vestuario) en Storage y Biblioteca.
// Se conecta con generador_laminas_360.ts, gestor_biblioteca_activos.ts, Firestore y PantallaLaminas360Paso3.tsx.

import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { obtenerBaseDeDatosFirestore } from "@/configuracion/cliente_firebase";
import {
  actualizarFichaYLaminaEnBibliotecaFirestore,
  buscarActivoPorUrlONombreEnFirestore,
  construirClaveCacheLamina360,
  eliminarLaminaDeBibliotecaFirestore,
} from "@/biblioteca/gestor_biblioteca_activos";
import { COLECCION_PROYECTOS } from "@/mesa_entrada/constantes_mesa_entrada";
import {
  detectarTipoReferencia,
  generarLamina360Individual,
} from "@/agentes/director_arte/generador_laminas_360";
import {
  type EntradaGenerarLaminas360,
  type Lamina360Identidad,
} from "@/agentes/director_arte/tipos_director_arte";
import { type DesglosePersonajeIdentidadYVestuario } from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";
import { type PrendaVestuarioEscenario } from "@/agentes/guionista/tipos_guion";

/**
 * Genera o reutiliza las Láminas 360° (incluyendo variantes de vestuario contextual) y las guarda en Firestore y `biblioteca_activos`.
 */
export async function POST(peticion: NextRequest) {
  try {
    const cuerpo = (await peticion.json()) as Partial<EntradaGenerarLaminas360>;
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
        {
          ok: false,
          error: `No se encontró el proyecto con ID ${proyectoId}.`,
        },
        { status: 404 }
      );
    }

    const datosProyecto = instantanea.data() as {
      modeloImagen?: string;
      estiloVisualSeleccionado?: string;
      archivosMultimedia?: Array<{
        nombre: string;
        url: string;
        tipo: "imagen" | "audio" | "video";
      }>;
      imagenesReferencia?: string[];
      laminas360?: Lamina360Identidad[];
      analisisProductorEjecutivo?: {
        fichaIdentidadVisual?: {
          resumenVisual?: string;
          detallesPorImagen?: string[];
          personajesSeparados?: DesglosePersonajeIdentidadYVestuario[];
        } | null;
      };
      guionProduccion?: {
        armarioVestuarios?: PrendaVestuarioEscenario[];
      };
    };

    const modeloElegido =
      cuerpo.modeloImagen ||
      datosProyecto.modeloImagen ||
      "google/nano-banana-2.1";
    const estiloElegido =
      cuerpo.estiloVisualSeleccionado ||
      datosProyecto.estiloVisualSeleccionado ||
      "original_referencia";

    let referenciasParaProcesar: Array<{ nombre: string; url: string }> = [];

    if (
      Array.isArray(cuerpo.archivosReferencia) &&
      cuerpo.archivosReferencia.length > 0
    ) {
      referenciasParaProcesar = cuerpo.archivosReferencia
        .filter((a) => a.tipo === "imagen")
        .map((a) => ({ nombre: a.nombre, url: a.url }));
    } else if (
      Array.isArray(datosProyecto.archivosMultimedia) &&
      datosProyecto.archivosMultimedia.length > 0
    ) {
      referenciasParaProcesar = datosProyecto.archivosMultimedia
        .filter((a) => a.tipo === "imagen")
        .map((a) => ({ nombre: a.nombre, url: a.url }));
    } else if (Array.isArray(datosProyecto.imagenesReferencia)) {
      referenciasParaProcesar = datosProyecto.imagenesReferencia.map(
        (url, i) => ({
          nombre: `Referencia_${i + 1}.png`,
          url,
        })
      );
    }

    if (cuerpo.nombreReferenciaIndividual) {
      const nombreBuscado = cuerpo.nombreReferenciaIndividual.toLowerCase();
      referenciasParaProcesar = referenciasParaProcesar.filter((refItem) =>
        refItem.nombre.toLowerCase().includes(nombreBuscado)
      );
    }

    if (referenciasParaProcesar.length === 0) {
      return NextResponse.json({
        ok: true,
        proyectoId,
        mensaje:
          "El proyecto no cuenta con imágenes de referencia para generar Láminas 360°.",
        laminas360: datosProyecto.laminas360 || [],
      });
    }

    const fichaVisual =
      datosProyecto.analisisProductorEjecutivo?.fichaIdentidadVisual;
    const detallesPorImagen = fichaVisual?.detallesPorImagen || [];
    const resumenVisual = fichaVisual?.resumenVisual || "";
    const personajesSeparados = fichaVisual?.personajesSeparados || [];

    const armarioProyecto: PrendaVestuarioEscenario[] =
      Array.isArray(datosProyecto.guionProduccion?.armarioVestuarios) &&
      datosProyecto.guionProduccion.armarioVestuarios.length > 0
        ? datosProyecto.guionProduccion.armarioVestuarios
        : [
            {
              idVestuario: "vestuario_base",
              nombrePersonaje: "Principal",
              escenarioOLugar: "Base",
              descripcionVestuario:
                "Vestuario original de la fotografía de referencia.",
              promptVestuarioIngles:
                "exact original clothing from reference photo",
              esVestuarioBaseOriginal: true,
            },
          ];

    const laminasPrevias = Array.isArray(datosProyecto.laminas360)
      ? datosProyecto.laminas360
      : [];
    const resultadosNuevos: Lamina360Identidad[] = [];
    const regeneracionExplicita = Boolean(
      cuerpo.forzarRegeneracion ||
        cuerpo.nombreReferenciaIndividual ||
        cuerpo.promptPersonalizado
    );

    for (const refItem of referenciasParaProcesar) {
      const tipoRef = detectarTipoReferencia(refItem.nombre);
      const desglosePersonaje = personajesSeparados.find((p) =>
        refItem.nombre.toLowerCase().includes(p.nombreArchivo.toLowerCase())
      );
      const detalleCoincidente = detallesPorImagen.find((d) =>
        d.toLowerCase().includes(refItem.nombre.toLowerCase())
      );
      const descripcionContexto = detalleCoincidente || resumenVisual;

      // Si es producto solo necesita vestuario_base; si es personaje generamos para los vestuarios del armario
      let vestuariosParaEstaReferencia =
        tipoRef === "producto"
          ? [armarioProyecto[0]]
          : armarioProyecto;

      if (cuerpo.idVestuarioIndividual) {
        vestuariosParaEstaReferencia = vestuariosParaEstaReferencia.filter(
          (v) => v.idVestuario === cuerpo.idVestuarioIndividual
        );
      }

      const activoBiblioteca = await buscarActivoPorUrlONombreEnFirestore(
        refItem.url,
        refItem.nombre
      );

      for (const prenda of vestuariosParaEstaReferencia) {
        const idVestuarioActual = prenda?.idVestuario || "vestuario_base";
        const descripcionVestuarioPersonaje =
          idVestuarioActual === "vestuario_base"
            ? desglosePersonaje?.vestuarioOriginalFoto ||
              activoBiblioteca?.fichaIdentidadBase?.vestuarioOriginalFoto ||
              prenda?.descripcionVestuario
            : prenda?.descripcionVestuario;

        const claveCache = construirClaveCacheLamina360(
          idVestuarioActual,
          estiloElegido
        );
        const laminaEnBiblioteca =
          activoBiblioteca?.laminas360PorVestuario?.[claveCache];

        // 1. Si ya existe en biblioteca_activos para este vestuario y estilo visual, la reutilizamos gratis sin llamar a fal.ai
        if (
          !regeneracionExplicita &&
          laminaEnBiblioteca &&
          laminaEnBiblioteca.urlLamina360
        ) {
          const nombreBaseId = refItem.nombre.replace(/[^a-zA-Z0-9_-]/g, "_");
          const idLaminaReutilizada =
            idVestuarioActual !== "vestuario_base"
              ? `lamina_${nombreBaseId}__${idVestuarioActual}`
              : `lamina_${nombreBaseId}`;

          resultadosNuevos.push({
            id: idLaminaReutilizada,
            nombreReferencia: refItem.nombre,
            urlReferenciaOriginal: refItem.url,
            tipo: tipoRef,
            urlLamina360: laminaEnBiblioteca.urlLamina360,
            promptUsado:
              laminaEnBiblioteca.promptUsado ||
              `Lámina 360° reutilizada desde Biblioteca Global (${idVestuarioActual} · ${estiloElegido}).`,
            fechaCreacion: laminaEnBiblioteca.fechaCreacion,
            estado: "lista",
            estiloVisualAplicado: estiloElegido,
            idVestuario: idVestuarioActual,
            descripcionVestuario:
              descripcionVestuarioPersonaje ||
              laminaEnBiblioteca.descripcionVestuario,
            identidadFisicaInmutable:
              desglosePersonaje?.identidadFisicaInmutable ||
              activoBiblioteca?.fichaIdentidadBase?.identidadFisicaInmutable,
            reutilizadaDeBiblioteca: true,
          });
          continue;
        }

        // 2. Si no existe en caché (o el usuario pidió regenerar), llamamos a fal.ai con el modelo elegido y el prompt (por defecto o editado)
        const identidadInmutable =
          desglosePersonaje?.identidadFisicaInmutable ||
          activoBiblioteca?.fichaIdentidadBase?.identidadFisicaInmutable;

        const laminaGenerada = await generarLamina360Individual(
          proyectoId,
          refItem.nombre,
          refItem.url,
          modeloElegido,
          estiloElegido,
          descripcionContexto,
          {
            idVestuario: idVestuarioActual,
            descripcionVestuario: descripcionVestuarioPersonaje,
            promptVestuarioIngles: prenda?.promptVestuarioIngles,
            identidadFisicaInmutable: identidadInmutable,
            promptPersonalizado: cuerpo.promptPersonalizado,
          }
        );

        resultadosNuevos.push(laminaGenerada);

        // 3. Guardamos en biblioteca_activos para reutilizarla gratis en futuros proyectos
        if (laminaGenerada.estado === "lista" && laminaGenerada.urlLamina360) {
          await actualizarFichaYLaminaEnBibliotecaFirestore({
            urlReferenciaOriginal: refItem.url,
            nombreReferencia: refItem.nombre,
            nuevaLamina360: {
              idVestuario: idVestuarioActual,
              estiloVisual: estiloElegido,
              urlLamina360: laminaGenerada.urlLamina360,
              descripcionVestuario:
                descripcionVestuarioPersonaje || "Vestuario base original",
              promptUsado: laminaGenerada.promptUsado,
              fechaCreacion: laminaGenerada.fechaCreacion,
            },
          });
        }
      }
    }

    const laminasActualizadas: Lamina360Identidad[] = [...laminasPrevias];
    for (const nueva of resultadosNuevos) {
      const indicePrevio = laminasActualizadas.findIndex(
        (l) =>
          l.id === nueva.id ||
          (l.nombreReferencia === nueva.nombreReferencia &&
            (l.idVestuario || "vestuario_base") ===
              (nueva.idVestuario || "vestuario_base"))
      );
      if (indicePrevio >= 0) {
        laminasActualizadas[indicePrevio] = nueva;
      } else {
        laminasActualizadas.push(nueva);
      }
    }

    await updateDoc(docRef, {
      laminas360: JSON.parse(JSON.stringify(laminasActualizadas)),
    });

    return NextResponse.json({
      ok: true,
      proyectoId,
      laminas360: laminasActualizadas,
    });
  } catch (error) {
    const detalle =
      error instanceof Error
        ? error.message
        : "Error inesperado al generar las Láminas 360°.";
    return NextResponse.json({ ok: false, error: detalle }, { status: 500 });
  }
}

/**
 * Elimina una Lámina 360° individual (tanto del proyecto como de la caché de Biblioteca) o un vestuario extra del armario.
 */
export async function DELETE(peticion: NextRequest) {
  try {
    const cuerpo = (await peticion.json()) as {
      proyectoId?: string;
      idLamina?: string;
      idVestuarioArmario?: string;
    };

    if (!cuerpo.proyectoId) {
      return NextResponse.json(
        { ok: false, error: "Falta el campo 'proyectoId'." },
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
      laminas360?: Lamina360Identidad[];
      guionProduccion?: {
        armarioVestuarios?: PrendaVestuarioEscenario[];
        escenas?: Array<Record<string, unknown>>;
      };
    };

    let laminas = Array.isArray(datos.laminas360) ? [...datos.laminas360] : [];

    // Caso A: Eliminar una Lámina 360° específica
    if (cuerpo.idLamina) {
      const aEliminar = laminas.find((l) => l.id === cuerpo.idLamina);
      laminas = laminas.filter((l) => l.id !== cuerpo.idLamina);

      if (aEliminar) {
        await eliminarLaminaDeBibliotecaFirestore({
          urlReferenciaOriginal: aEliminar.urlReferenciaOriginal,
          nombreReferencia: aEliminar.nombreReferencia,
          idVestuario: aEliminar.idVestuario || "vestuario_base",
          estiloVisual: aEliminar.estiloVisualAplicado,
        });
      }

      await updateDoc(docRef, {
        laminas360: JSON.parse(JSON.stringify(laminas)),
      });

      return NextResponse.json({ ok: true, laminas360: laminas });
    }

    // Caso B: Eliminar un vestuario extra del armario (y sus láminas asociadas)
    if (
      cuerpo.idVestuarioArmario &&
      cuerpo.idVestuarioArmario !== "vestuario_base"
    ) {
      const laminasDelVestuario = laminas.filter(
        (l) => l.idVestuario === cuerpo.idVestuarioArmario
      );
      for (const lam of laminasDelVestuario) {
        await eliminarLaminaDeBibliotecaFirestore({
          urlReferenciaOriginal: lam.urlReferenciaOriginal,
          nombreReferencia: lam.nombreReferencia,
          idVestuario: lam.idVestuario || cuerpo.idVestuarioArmario,
          estiloVisual: lam.estiloVisualAplicado,
        });
      }

      laminas = laminas.filter(
        (l) => l.idVestuario !== cuerpo.idVestuarioArmario
      );
      const armarioFiltrado = (
        datos.guionProduccion?.armarioVestuarios || []
      ).filter((p) => p.idVestuario !== cuerpo.idVestuarioArmario);
      const escenasActualizadas = (datos.guionProduccion?.escenas || []).map(
        (esc) =>
          esc.idVestuarioAsignado === cuerpo.idVestuarioArmario
            ? { ...esc, idVestuarioAsignado: "vestuario_base" }
            : esc
      );

      await updateDoc(docRef, {
        laminas360: JSON.parse(JSON.stringify(laminas)),
        "guionProduccion.armarioVestuarios": JSON.parse(
          JSON.stringify(armarioFiltrado)
        ),
        "guionProduccion.escenas": JSON.parse(
          JSON.stringify(escenasActualizadas)
        ),
      });

      return NextResponse.json({
        ok: true,
        laminas360: laminas,
        armarioVestuarios: armarioFiltrado,
      });
    }

    return NextResponse.json({ ok: true, laminas360: laminas });
  } catch (error) {
    const detalle =
      error instanceof Error
        ? error.message
        : "Error al eliminar la Lámina 360°.";
    return NextResponse.json({ ok: false, error: detalle }, { status: 500 });
  }
}
