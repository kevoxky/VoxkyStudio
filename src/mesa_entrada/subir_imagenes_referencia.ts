// Sube archivos multimedia de referencia (imagen, audio o video) a Firebase Storage en referencias/{proyectoId}/.
// Se conecta con src/configuracion/cliente_firebase.ts, constantes_mesa_entrada.ts y validar_entrada_proyecto.ts.

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { obtenerAlmacenamientoStorage } from "@/configuracion/cliente_firebase";
import { type ArchivoMultimediaGuardado } from "./constantes_mesa_entrada";
import {
  construirRutaStorageReferencia,
  detectarTipoArchivoMultimedia,
} from "./validar_entrada_proyecto";

/**
 * Sube un archivo individual (imagen, audio o video) a Firebase Storage y devuelve su ficha con tipo y URL pública.
 * Recibe el ID del proyecto, el archivo y su posición, y devuelve el objeto ArchivoMultimediaGuardado.
 */
async function subirUnArchivoMultimedia(
  proyectoId: string,
  archivo: File,
  indice: number
): Promise<ArchivoMultimediaGuardado> {
  const almacenamiento = obtenerAlmacenamientoStorage();
  const rutaEnStorage = construirRutaStorageReferencia(
    proyectoId,
    indice,
    archivo.name
  );
  const referenciaArchivo = ref(almacenamiento, rutaEnStorage);
  const tipoDetectado = detectarTipoArchivoMultimedia(archivo) ?? "imagen";

  await uploadBytes(referenciaArchivo, archivo, {
    contentType: archivo.type || "application/octet-stream",
  });

  const enlacePublico = await getDownloadURL(referenciaArchivo);

  return {
    tipo: tipoDetectado,
    url: enlacePublico,
    nombre: archivo.name,
    mimeType: archivo.type || "application/octet-stream",
  };
}

/**
 * Sube todos los archivos multimedia seleccionados a referencias/{proyectoId}/ clasificando cada uno como imagen, audio o video.
 * Recibe el ID del proyecto y la lista de archivos, y devuelve la lista de fichas multimedia con sus URLs permanentes.
 */
export async function subirArchivosMultimediaStorage(
  proyectoId: string,
  archivos: File[]
): Promise<ArchivoMultimediaGuardado[]> {
  if (archivos.length === 0) {
    return [];
  }

  try {
    const promesas = archivos.map((archivo, indice) =>
      subirUnArchivoMultimedia(proyectoId, archivo, indice)
    );
    return await Promise.all(promesas);
  } catch (error) {
    throw new Error(
      "No se pudieron subir los archivos multimedia a Firebase Storage. Verifica tu conexión y los permisos de Storage."
    );
  }
}

/**
 * Función de compatibilidad que devuelve únicamente la lista de enlaces (URLs) subidos a Firebase Storage.
 * Recibe el ID del proyecto y los archivos, y devuelve el arreglo de URLs públicas.
 */
export async function subirImagenesReferenciaStorage(
  proyectoId: string,
  archivosImagenes: File[]
): Promise<string[]> {
  const fichasSubidas = await subirArchivosMultimediaStorage(
    proyectoId,
    archivosImagenes
  );
  return fichasSubidas.map((ficha) => ficha.url);
}
