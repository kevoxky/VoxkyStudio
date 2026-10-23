// Sube las imágenes de referencia seleccionadas por el usuario a Firebase Storage en la carpeta referencias/{proyectoId}/.
// Se conecta con src/configuracion/cliente_firebase.ts, validar_entrada_proyecto.ts y crear_documento_proyecto.ts.

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { obtenerAlmacenamientoStorage } from "@/configuracion/cliente_firebase";
import { construirRutaStorageReferencia } from "./validar_entrada_proyecto";

/**
 * Sube una sola imagen a Firebase Storage y obtiene su enlace público permanente.
 * Recibe el identificador del proyecto, el archivo de imagen y su posición, y devuelve el enlace web (URL).
 */
async function subirUnaImagenReferencia(
  proyectoId: string,
  archivo: File,
  indice: number
): Promise<string> {
  const almacenamiento = obtenerAlmacenamientoStorage();
  const rutaEnStorage = construirRutaStorageReferencia(
    proyectoId,
    indice,
    archivo.name
  );
  const referenciaArchivo = ref(almacenamiento, rutaEnStorage);

  // Subimos los datos del archivo indicando su tipo de imagen para que el navegador la muestre bien
  await uploadBytes(referenciaArchivo, archivo, {
    contentType: archivo.type,
  });

  // Obtenemos el enlace público permanente de descarga desde Firebase Storage
  const enlacePublico = await getDownloadURL(referenciaArchivo);
  return enlacePublico;
}

/**
 * Sube todas las imágenes seleccionadas por el usuario (hasta 4) a la carpeta referencias/{proyectoId}/.
 * Recibe el identificador único del proyecto y la lista de archivos, y devuelve la lista de enlaces permanentes.
 */
export async function subirImagenesReferenciaStorage(
  proyectoId: string,
  archivosImagenes: File[]
): Promise<string[]> {
  if (archivosImagenes.length === 0) {
    return [];
  }

  try {
    const promesasDeSubida = archivosImagenes.map((archivo, indice) =>
      subirUnaImagenReferencia(proyectoId, archivo, indice)
    );

    const listaEnlacesPublicos = await Promise.all(promesasDeSubida);
    return listaEnlacesPublicos;
  } catch (error) {
    throw new Error(
      "No se pudieron subir las imágenes a Firebase Storage. Verifica tu conexión a internet y los permisos de Storage en Firebase."
    );
  }
}
