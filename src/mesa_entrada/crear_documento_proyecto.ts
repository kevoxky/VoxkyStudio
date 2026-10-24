// Crea la ficha maestra del proyecto en la colección "proyectos" de Firestore informando el progreso paso a paso.
// Se conecta con src/configuracion/cliente_firebase.ts, constantes_mesa_entrada.ts, validar_entrada_proyecto.ts y subir_imagenes_referencia.ts.

import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import {
  COLECCION_PROYECTOS,
  ESTADO_ANALIZANDO_IDEA,
  type FormatoVideo,
  type IdiomaSalidaVideo,
  MODELOS_INTERNOS_POR_DEFECTO,
  type ModoCalidadProduccion,
  TOLERANCIA_FLEXIBLE_POR_DEFECTO,
} from "./constantes_mesa_entrada";
import {
  validarDatosFinancierosProyecto,
  validarDuracionObjetivo,
  validarFormatoVideo,
  validarIdeaOriginal,
  validarIdiomaSalida,
  validarImagenesReferencia,
  validarModelosFal,
} from "./validar_entrada_proyecto";
import { subirArchivosMultimediaStorage } from "./subir_imagenes_referencia";

export interface DatosEntradaProyecto {
  ideaOriginal: string;
  formato: FormatoVideo;
  duracionObjetivo: string;
  toleranciaFlexible?: boolean;
  modeloImagen: string;
  modeloVideo: string;
  modoCalidad: ModoCalidadProduccion;
  costoEstimadoPorMinutoUSD: number;
  presupuestoTotalEstimadoUSD: number;
  idiomaSalida: IdiomaSalidaVideo;
  archivosReferencia: File[];
  alInformarProgreso?: (mensaje: string) => void;
}

/**
 * Valida todos los datos técnicos, multimedia y financieros antes de subir archivos o escribir en Firebase.
 * Recibe los datos del formulario y lanza un error claro en español si algo no cumple las reglas.
 */
function verificarDatosAntesDeGuardar(datos: DatosEntradaProyecto): void {
  const estadoFirebase = verificarConfiguracionFirebase();
  if (!estadoFirebase.estaConfigurado) {
    throw new Error(
      estadoFirebase.mensajeError ??
        "Falta configurar las claves de Firebase en el archivo .env."
    );
  }

  const validaciones = [
    validarIdeaOriginal(datos.ideaOriginal),
    validarFormatoVideo(datos.formato),
    validarDuracionObjetivo(datos.duracionObjetivo),
    validarModelosFal(datos.modeloImagen, datos.modeloVideo),
    validarDatosFinancierosProyecto(
      datos.modoCalidad,
      datos.costoEstimadoPorMinutoUSD,
      datos.presupuestoTotalEstimadoUSD
    ),
    validarIdiomaSalida(datos.idiomaSalida),
    validarImagenesReferencia(datos.archivosReferencia),
  ];

  for (const resultado of validaciones) {
    if (!resultado.esValido) {
      throw new Error(
        resultado.mensajeError ??
          "Revisa los datos seleccionados antes de continuar."
      );
    }
  }
}

/**
 * Sube los archivos multimedia (con progreso real y respaldo en fal.ai) y guarda el proyecto en Firestore.
 * Recibe las preferencias de la Mesa de Entrada y devuelve el identificador único del proyecto creado.
 */
export async function crearProyectoEnFirestore(
  datos: DatosEntradaProyecto
): Promise<string> {
  verificarDatosAntesDeGuardar(datos);

  const baseDeDatos = obtenerBaseDeDatosFirestore();

  const referenciaColeccion = collection(baseDeDatos, COLECCION_PROYECTOS);
  const referenciaDocumento = doc(referenciaColeccion);
  const proyectoId = referenciaDocumento.id;

  // Paso 1: Subimos imágenes, audios o videos mostrando "Subiendo archivos multimedia (X de Y)..."
  const archivosMultimedia = await subirArchivosMultimediaStorage(
    proyectoId,
    datos.archivosReferencia,
    datos.alInformarProgreso
  );

  // En imagenesReferencia guardamos exclusivamente las URLs de tipo "imagen" para no mezclar audios ni videos
  const enlacesSoloImagenes = archivosMultimedia
    .filter((item) => item.tipo === "imagen")
    .map((item) => item.url);

  // Paso 2: Informamos el guardado en Firestore y aplicamos timeout de seguridad
  datos.alInformarProgreso?.("Guardando proyecto en la base de datos...");

  try {
    const promesaEscritura = setDoc(referenciaDocumento, {
      ideaOriginal: datos.ideaOriginal.trim(),
      formato: datos.formato,
      duracionObjetivo: datos.duracionObjetivo,
      toleranciaFlexible:
        datos.toleranciaFlexible ?? TOLERANCIA_FLEXIBLE_POR_DEFECTO,
      modeloImagen: datos.modeloImagen,
      modeloVideo: datos.modeloVideo,
      modoCalidad: datos.modoCalidad,
      costoEstimadoPorMinutoUSD: datos.costoEstimadoPorMinutoUSD,
      presupuestoTotalEstimadoUSD: datos.presupuestoTotalEstimadoUSD,
      modelosInternos: { ...MODELOS_INTERNOS_POR_DEFECTO },
      idiomaSalida: datos.idiomaSalida,
      imagenesReferencia: enlacesSoloImagenes,
      archivosMultimedia,
      estado: ESTADO_ANALIZANDO_IDEA,
      fechaCreacion: serverTimestamp(),
    });

    await Promise.race([
      promesaEscritura,
      new Promise((_, rechazar) =>
        setTimeout(
          () =>
            rechazar(
              new Error(
                "Tiempo agotado al guardar en Firestore. Revisa tu conexión a internet."
              )
            ),
          25_000
        )
      ),
    ]);

    return proyectoId;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "No se pudo guardar la ficha del proyecto en Firebase Firestore."
    );
  }
}
