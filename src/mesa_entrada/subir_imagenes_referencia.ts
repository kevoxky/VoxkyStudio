// Sube archivos multimedia con deduplicación SHA-256 en la Biblioteca Global ("biblioteca_activos") y respaldo en fal.ai.
// Se conecta con gestor_biblioteca_activos.ts, cliente_firebase.ts, cliente_fal.ts, constantes_mesa_entrada.ts y validar_entrada_proyecto.ts.

import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { obtenerAlmacenamientoStorage } from "@/configuracion/cliente_firebase";
import { obtenerClienteFalSeguro } from "@/configuracion/cliente_fal";
import {
  buscarActivoPorHashEnFirestore,
  calcularHashArchivoSHA256,
  construirRutaStorageBiblioteca,
  detectarCategoriaActivoPorNombreYTipo,
  registrarActivoEnBibliotecaFirestore,
} from "@/biblioteca/gestor_biblioteca_activos";
import { type ArchivoMultimediaGuardado } from "./constantes_mesa_entrada";
import {
  construirRutaStorageReferencia,
  detectarTipoArchivoMultimedia,
  obtenerMimeTypeSeguro,
} from "./validar_entrada_proyecto";
import { leerDuracionMultimediaEnNavegador } from "./ZonaImagenesReferencia";

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
 * Intenta subir un archivo a Firebase Storage dentro de `biblioteca/{hashArchivo}_{nombre}` (con respaldo en `referencias/{proyectoId}`).
 * Recibe la ruta en Storage, el archivo y su tipo MIME, y devuelve la URL pública de Firebase.
 */
async function intentarSubidaFirebaseStorage(
  rutaEnStorage: string,
  archivo: File,
  mimeSeguro: string
): Promise<string> {
  const almacenamiento = obtenerAlmacenamientoStorage();
  // Reducimos el tiempo interno de reintento de Firebase para no bloquear la pantalla 10 minutos
  almacenamiento.maxUploadRetryTime = 12_000;

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
 * Procesa un archivo individual: calcula su huella digital SHA-256 (`hashArchivo`), consulta `biblioteca_activos`
 * para reutilizarlo si ya existe, o lo sube una sola vez a `biblioteca/{hashArchivo}_{nombre}` y lo registra.
 */
async function subirUnArchivoMultimediaBlindado(
  proyectoId: string,
  archivo: File,
  indice: number,
  alInformarProgreso?: (mensajeProgreso: string) => void
): Promise<ArchivoMultimediaGuardado> {
  const tipoDetectado = detectarTipoArchivoMultimedia(archivo) ?? "imagen";
  const mimeSeguro = obtenerMimeTypeSeguro(archivo);

  // 1. Calculamos la huella digital SHA-256 en el navegador antes de subir nada
  let hashArchivo = "";
  try {
    const bufferArchivo = await archivo.arrayBuffer();
    hashArchivo = await calcularHashArchivoSHA256(bufferArchivo);
  } catch {
    hashArchivo = `fallback_${archivo.name}_${archivo.size}`;
  }

  // 2. Consultamos en biblioteca_activos si ya existe un activo con este mismo hashArchivo
  const activoExistente = await buscarActivoPorHashEnFirestore(hashArchivo);
  if (activoExistente && activoExistente.url) {
    alInformarProgreso?.(
      `♻️ Reutilizando de tu Biblioteca (sin duplicar subida): ${archivo.name}...`
    );

    return {
      tipo: activoExistente.tipo || tipoDetectado,
      url: activoExistente.url,
      nombre: archivo.name,
      mimeType: activoExistente.mimeType || mimeSeguro,
      hashArchivo,
      activoBibliotecaId: activoExistente.id,
      reutilizadoDeBiblioteca: true,
      ...(typeof activoExistente.duracionSegundos === "number"
        ? { duracionSegundos: activoExistente.duracionSegundos }
        : {}),
    };
  }

  // 3. Si es nuevo, lo subimos una sola vez a `biblioteca/{hashArchivo}_{nombre}`
  const rutaBiblioteca = construirRutaStorageBiblioteca(
    hashArchivo,
    archivo.name
  );
  let enlacePublico: string;

  try {
    enlacePublico = await intentarSubidaFirebaseStorage(
      rutaBiblioteca,
      archivo,
      mimeSeguro
    );
  } catch {
    try {
      const rutaRespaldoProyecto = construirRutaStorageReferencia(
        proyectoId,
        indice,
        archivo.name
      );
      enlacePublico = await intentarSubidaFirebaseStorage(
        rutaRespaldoProyecto,
        archivo,
        mimeSeguro
      );
    } catch {
      try {
        enlacePublico = await subirConRespaldoFalStorage(archivo, mimeSeguro);
      } catch {
        throw new Error(
          `No se pudo subir el archivo "${archivo.name}" ni a Firebase Storage ni al respaldo de fal.ai. Verifica tu conexión y que el archivo no esté dañado.`
        );
      }
    }
  }

  // Si es audio o video, medimos su duración exacta en segundos desde el navegador
  let duracionSegundos: number | undefined;
  if (
    typeof window !== "undefined" &&
    (tipoDetectado === "audio" || tipoDetectado === "video")
  ) {
    const urlTemporal = URL.createObjectURL(archivo);
    try {
      duracionSegundos = await leerDuracionMultimediaEnNavegador(
        tipoDetectado,
        urlTemporal
      );
    } finally {
      URL.revokeObjectURL(urlTemporal);
    }
  }

  // 4. Registramos automáticamente en `biblioteca_activos` para futuros proyectos
  const activoRegistrado = await registrarActivoEnBibliotecaFirestore({
    nombre: archivo.name,
    tipo: tipoDetectado,
    mimeType: mimeSeguro,
    categoriaActivo: detectarCategoriaActivoPorNombreYTipo(
      archivo.name,
      tipoDetectado
    ),
    url: enlacePublico,
    hashArchivo,
    duracionSegundos,
  });

  return {
    tipo: tipoDetectado,
    url: enlacePublico,
    nombre: archivo.name,
    mimeType: mimeSeguro,
    hashArchivo,
    activoBibliotecaId: activoRegistrado.id,
    reutilizadoDeBiblioteca: false,
    ...(typeof duracionSegundos === "number" ? { duracionSegundos } : {}),
  };
}

/**
 * Sube o reutiliza los archivos multimedia reportando el progreso real en cada paso.
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
      `Verificando en Biblioteca / Subiendo archivo (${i + 1} de ${total}): ${archivos[i].name}...`
    );

    const ficha = await subirUnArchivoMultimediaBlindado(
      proyectoId,
      archivos[i],
      i,
      alInformarProgreso
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
