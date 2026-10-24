// Crea la ficha maestra del proyecto en la colección "proyectos" de Firestore con archivos multimedia tipados y costos en USD.
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
 * Sube primero los archivos multimedia a referencias/{proyectoId}/ y luego crea el documento en la colección "proyectos".
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

  // Paso 1: Subimos imágenes, audios o videos a Firebase Storage guardando su tipo ('imagen' | 'audio' | 'video') y URL
  const archivosMultimedia = await subirArchivosMultimediaStorage(
    proyectoId,
    datos.archivosReferencia
  );

  // Mantenemos también la lista simple de URLs en imagenesReferencia por compatibilidad
  const enlacesCompatibles = archivosMultimedia.map((item) => item.url);

  // Paso 2: Guardamos la ficha maestra en la colección "proyectos"
  try {
    await setDoc(referenciaDocumento, {
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
      imagenesReferencia: enlacesCompatibles,
      archivosMultimedia,
      estado: ESTADO_ANALIZANDO_IDEA,
      fechaCreacion: serverTimestamp(),
    });

    return proyectoId;
  } catch (error) {
    throw new Error(
      "No se pudo guardar la ficha del proyecto en Firebase Firestore. Verifica tu conexión y las reglas de Firestore."
    );
  }
}
