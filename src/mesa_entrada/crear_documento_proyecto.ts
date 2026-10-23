// Crea la ficha maestra del proyecto en la colección "proyectos" de Firebase Firestore tras subir las imágenes de referencia.
// Se conecta con src/configuracion/cliente_firebase.ts, constantes_mesa_entrada.ts, validar_entrada_proyecto.ts y subir_imagenes_referencia.ts.

import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import {
  COLECCION_PROYECTOS,
  ESTADO_ANALIZANDO_IDEA,
  FormatoVideo,
} from "./constantes_mesa_entrada";
import {
  validarFormatoVideo,
  validarIdeaOriginal,
  validarImagenesReferencia,
} from "./validar_entrada_proyecto";
import { subirImagenesReferenciaStorage } from "./subir_imagenes_referencia";

export interface DatosEntradaProyecto {
  ideaOriginal: string;
  formato: FormatoVideo;
  archivosReferencia: File[];
}

/**
 * Valida todos los datos de entrada antes de contactar con Firebase para ahorrar tiempo y evitar errores.
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

  const validacionIdea = validarIdeaOriginal(datos.ideaOriginal);
  if (!validacionIdea.esValido) {
    throw new Error(validacionIdea.mensajeError ?? "La idea del video no es válida.");
  }

  const validacionFormato = validarFormatoVideo(datos.formato);
  if (!validacionFormato.esValido) {
    throw new Error(validacionFormato.mensajeError ?? "El formato no es válido.");
  }

  const validacionImagenes = validarImagenesReferencia(datos.archivosReferencia);
  if (!validacionImagenes.esValido) {
    throw new Error(validacionImagenes.mensajeError ?? "Las imágenes no son válidas.");
  }
}

/**
 * Ejecuta el guardado inicial completo: sube primero las imágenes a referencias/{proyectoId}/ y luego crea el documento en Firestore.
 * Recibe la idea original, el formato y los archivos de imagen, y devuelve el identificador único del proyecto creado.
 */
export async function crearProyectoEnFirestore(
  datos: DatosEntradaProyecto
): Promise<string> {
  verificarDatosAntesDeGuardar(datos);

  const baseDeDatos = obtenerBaseDeDatosFirestore();

  // Generamos primero la referencia del documento para conocer su ID antes de subir las fotos
  const referenciaColeccion = collection(baseDeDatos, COLECCION_PROYECTOS);
  const referenciaDocumento = doc(referenciaColeccion);
  const proyectoId = referenciaDocumento.id;

  // Paso 1: Subimos las imágenes seleccionadas a Firebase Storage en referencias/{proyectoId}/
  const enlacesImagenes = await subirImagenesReferenciaStorage(
    proyectoId,
    datos.archivosReferencia
  );

  // Paso 2: Guardamos la ficha maestra en la colección "proyectos" con los 5 campos exactos
  try {
    await setDoc(referenciaDocumento, {
      ideaOriginal: datos.ideaOriginal.trim(),
      formato: datos.formato,
      imagenesReferencia: enlacesImagenes,
      estado: ESTADO_ANALIZANDO_IDEA,
      fechaCreacion: serverTimestamp(),
    });

    return proyectoId;
  } catch (error) {
    throw new Error(
      "No se pudo guardar la ficha del proyecto en Firebase Firestore. Verifica que Firestore esté activo y con reglas de escritura habilitadas."
    );
  }
}
