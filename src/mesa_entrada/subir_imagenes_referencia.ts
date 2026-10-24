// Sube archivos multimedia a Firebase Storage con timeout de 45s y respaldo automático en fal.storage.upload.
// Se conecta con cliente_firebase.ts, cliente_fal.ts, constantes_mesa_entrada.ts y validar_entrada_proyecto.ts.

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { obtenerAlmacenamientoStorage } from "@/configuracion/cliente_firebase";
import { obtenerClienteFalSeguro } from "@/configuracion/cliente_fal";
import { type ArchivoMultimediaGuardado } from "./constantes_mesa_entrada";
import {
  construirRutaStorageReferencia,
  detectarTipoArchivoMultimedia,
  obtenerMimeTypeSeguro,
} from "./validar_entrada_proyecto";

// Tiempo máximo de espera por cada archivo (45 segundos) para que la app jamás se quede colgada
const TIMEOUT_POR_ARCHIVO_MS = 45_000;
const TIMEOUT_INTENTO_FIREBASE_MS = 18_000;

/**
 * Ejecuta una promesa con un límite estricto de tiempo en milisegundos.
 * Recibe la promesa y el tiempo máximo, y lanza un error claro si se supera el límite.
 */
function ejecutarConTimeout<T>(
  promesa: Promise<T>,
  tiempoMaximoMs: number,
  mensajeTimeout: string
): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    const temporizador = setTimeout(() => {
      rechazar(new Error(mensajeTimeout));
    }, tiempoMaximoMs);

    promesa
      .then((resultado) => {
        clearTimeout(temporizador);
        resolver(resultado);
      })
      .catch((error) => {
        clearTimeout(temporizador);
        rechazar(error);
      });
  });
}

/**
 * Intenta subir un archivo a Firebase Storage dentro de referencias/{proyectoId}/.
 * Recibe el ID del proyecto, el archivo, su posición y su tipo MIME, y devuelve la URL pública de Firebase.
 */
async function intentarSubidaFirebaseStorage(
  proyectoId: string,
  archivo: File,
  indice: number,
  mimeSeguro: string
): Promise<string> {
  const almacenamiento = obtenerAlmacenamientoStorage();
  // Reducimos el tiempo interno de reintento de Firebase para no bloquear la pantalla 10 minutos
  almacenamiento.maxUploadRetryTime = 12_000;

  const rutaEnStorage = construirRutaStorageReferencia(
    proyectoId,
    indice,
    archivo.name
  );
  const referenciaArchivo = ref(almacenamiento, rutaEnStorage);

  await ejecutarConTimeout(
    uploadBytes(referenciaArchivo, archivo, {
      contentType: mimeSeguro,
    }),
    TIMEOUT_INTENTO_FIREBASE_MS,
    `Tiempo agotado al subir "${archivo.name}" a Firebase Storage.`
  );

  return await ejecutarConTimeout(
    getDownloadURL(referenciaArchivo),
    10_000,
    `Tiempo agotado al obtener el enlace de "${archivo.name}" en Firebase Storage.`
  );
}

/**
 * Respaldo automático (Fallback): sube el archivo al almacenamiento seguro de fal.ai usando /api/fal/proxy.
 * Recibe el archivo y su tipo MIME garantizado, y devuelve la URL pública permanente de fal.ai.
 */
async function subirConRespaldoFalStorage(
  archivo: File,
  mimeSeguro: string
): Promise<string> {
  const clienteFal = obtenerClienteFalSeguro();

  // Aseguramos que el objeto File lleve el MIME explícito (ej. audio/mpeg para .mp3)
  const archivoNormalizado =
    archivo.type === mimeSeguro
      ? archivo
      : new File([archivo], archivo.name, { type: mimeSeguro });

  return await ejecutarConTimeout(
    clienteFal.storage.upload(archivoNormalizado),
    TIMEOUT_POR_ARCHIVO_MS,
    `Tiempo máximo agotado (45s) al subir "${archivo.name}". Verifica tu conexión a internet.`
  );
}

/**
 * Sube un archivo individual intentando primero Firebase Storage y usando fal.storage.upload como respaldo automático.
 * Recibe el ID del proyecto, el archivo y su posición, y devuelve el objeto ArchivoMultimediaGuardado.
 */
async function subirUnArchivoMultimediaBlindado(
  proyectoId: string,
  archivo: File,
  indice: number
): Promise<ArchivoMultimediaGuardado> {
  const tipoDetectado = detectarTipoArchivoMultimedia(archivo) ?? "imagen";
  const mimeSeguro = obtenerMimeTypeSeguro(archivo);

  let enlacePublico: string;

  try {
    enlacePublico = await intentarSubidaFirebaseStorage(
      proyectoId,
      archivo,
      indice,
      mimeSeguro
    );
  } catch {
    // Si Firebase falla por reglas, CORS o timeout, usamos automáticamente el almacenamiento seguro de fal.ai
    try {
      enlacePublico = await subirConRespaldoFalStorage(archivo, mimeSeguro);
    } catch {
      throw new Error(
        `No se pudo subir el archivo "${archivo.name}" ni a Firebase Storage ni al respaldo de fal.ai. Verifica tu conexión y que el archivo no esté dañado.`
      );
    }
  }

  return {
    tipo: tipoDetectado,
    url: enlacePublico,
    nombre: archivo.name,
    mimeType: mimeSeguro,
  };
}

/**
 * Sube todos los archivos multimedia reportando el progreso real ("Subiendo archivos multimedia (1 de 3)...") en cada paso.
 * Recibe el ID del proyecto, los archivos y un callback opcional de progreso, y devuelve las fichas subidas.
 */
export async function subirArchivosMultimediaStorage(
  proyectoId: string,
  archivos: File[],
  alInformarProgreso?: (mensajeProgreso: string) => void
): Promise<ArchivoMultimediaGuardado[]> {
  if (archivos.length === 0) {
    return [];
  }

  const total = archivos.length;
  const fichasSubidas: ArchivoMultimediaGuardado[] = [];

  for (let i = 0; i < total; i++) {
    alInformarProgreso?.(
      `Subiendo archivos multimedia (${i + 1} de ${total})...`
    );

    const ficha = await subirUnArchivoMultimediaBlindado(
      proyectoId,
      archivos[i],
      i
    );
    fichasSubidas.push(ficha);
  }

  return fichasSubidas;
}

/**
 * Función de compatibilidad que devuelve únicamente la lista de enlaces (URLs) subidos.
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
