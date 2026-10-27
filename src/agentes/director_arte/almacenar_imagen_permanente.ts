// Descarga imágenes generadas por IA y las guarda permanentemente en Firebase Storage con contentType seguro.
// Se conecta con generador_laminas_360.ts, generador_imagenes_escenas.ts y el SDK de Firebase.

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { obtenerAlmacenamientoStorage } from "../../configuracion/cliente_firebase.ts";

const TIMEOUT_DESCARGA_MS = 30_000;
const TIMEOUT_SUBIDA_STORAGE_MS = 25_000;

/**
 * Descarga una imagen remota (desde fal.ai) con reintento automático y la sube de forma definitiva a Firebase Storage.
 * Si la descarga o subida a Storage falla por red, conserva y devuelve la URL válida de fal.ai para nunca perder la imagen generada.
 */
export async function persistirImagenEnFirebaseStorage(
  urlOrigen: string,
  rutaDestinoStorage: string,
  tipoMime: string = "image/png"
): Promise<string> {
  if (!urlOrigen) return "";

  try {
    let bufferBytes: Uint8Array | null = null;

    for (let intento = 0; intento < 2; intento++) {
      const controlador = new AbortController();
      const temporizador = setTimeout(
        () => controlador.abort(),
        TIMEOUT_DESCARGA_MS
      );
      try {
        const respuesta = await fetch(urlOrigen, {
          signal: controlador.signal,
        });
        if (!respuesta.ok) {
          throw new Error(
            `Error HTTP ${respuesta.status} al descargar imagen desde fal.ai.`
          );
        }
        const arrayBuffer = await respuesta.arrayBuffer();
        bufferBytes = new Uint8Array(arrayBuffer);
        break;
      } catch (err) {
        if (intento === 1) throw err;
        await new Promise((r) => setTimeout(r, 800));
      } finally {
        clearTimeout(temporizador);
      }
    }

    if (!bufferBytes) {
      return urlOrigen;
    }

    const almacenamiento = obtenerAlmacenamientoStorage();
    const referenciaArchivo = ref(almacenamiento, rutaDestinoStorage);

    const promesaSubida = uploadBytes(referenciaArchivo, bufferBytes, {
      contentType: tipoMime,
    });

    const subidaConTimeout = Promise.race([
      promesaSubida,
      new Promise<never>((_, rechazar) =>
        setTimeout(
          () =>
            rechazar(
              new Error(
                `Timeout de ${TIMEOUT_SUBIDA_STORAGE_MS}ms al guardar en Storage: ${rutaDestinoStorage}`
              )
            ),
          TIMEOUT_SUBIDA_STORAGE_MS
        )
      ),
    ]);

    await subidaConTimeout;
    return await getDownloadURL(referenciaArchivo);
  } catch {
    // Respaldo seguro: devolvemos la URL directa de fal.ai para que jamás se pierda la imagen generada
    return urlOrigen;
  }
}
