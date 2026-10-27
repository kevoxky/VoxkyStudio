// Gestiona la huella digital SHA-256 anti-duplicados y las consultas/escrituras en la colección "biblioteca_activos".
// Se conecta con tipos_biblioteca.ts, cliente_firebase.ts, subir_imagenes_referencia.ts y los agentes de estudio.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "../configuracion/cliente_firebase.ts";
import { type TipoArchivoReferencia } from "../mesa_entrada/constantes_mesa_entrada.ts";
import {
  type ActivoBibliotecaGlobal,
  CARPETA_STORAGE_BIBLIOTECA,
  type CategoriaActivoBiblioteca,
  COLECCION_BIBLIOTECA_ACTIVOS,
  type FichaIdentidadPersonajeSeparada,
  type Lamina360GuardadaEnBiblioteca,
} from "./tipos_biblioteca.ts";

/**
 * Calcula la huella digital única SHA-256 de un archivo usando Web Crypto API (`crypto.subtle.digest`).
 * Recibe los bytes del archivo (ArrayBuffer o Uint8Array) y devuelve un texto hexadecimal de 64 caracteres.
 */
export async function calcularHashArchivoSHA256(
  datosBuffer: ArrayBuffer | Uint8Array
): Promise<string> {
  const vistaBytes =
    datosBuffer instanceof Uint8Array
      ? datosBuffer
      : new Uint8Array(datosBuffer);

  //Copiamos a un ArrayBuffer estándar para máxima compatibilidad con Web Crypto en navegador y Node
  const copiaPlana = new Uint8Array(vistaBytes.byteLength);
  copiaPlana.set(vistaBytes);

  const resumenBuffer = await globalThis.crypto.subtle.digest(
    "SHA-256",
    copiaPlana.buffer
  );
  const arregloBytes = Array.from(new Uint8Array(resumenBuffer));
  return arregloBytes
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Construye la ruta estandarizada dentro de Firebase Storage para la biblioteca global (`biblioteca/{hashArchivo}_{nombre}`).
 * Recibe el hash SHA-256 y el nombre original del archivo, y devuelve la ruta limpia.
 */
export function construirRutaStorageBiblioteca(
  hashArchivo: string,
  nombreOriginal: string
): string {
  const nombreLimpio = nombreOriginal.replace(/[^a-zA-Z0-9._-]/g, "_");
  const hashLimpio = hashArchivo.trim().toLowerCase();
  return `${CARPETA_STORAGE_BIBLIOTECA}/${hashLimpio}_${nombreLimpio}`;
}

/**
 * Detecta la categoría del activo ('personaje' | 'producto' | 'audio' | 'otro') según su tipo MIME y su nombre.
 * Recibe el nombre del archivo y su tipo multimedia, y devuelve la categoría correspondiente.
 */
export function detectarCategoriaActivoPorNombreYTipo(
  nombreArchivo: string,
  tipo: TipoArchivoReferencia
): CategoriaActivoBiblioteca {
  if (tipo === "audio") return "audio";
  if (tipo === "video") return "otro";

  const nombreMinusculas = nombreArchivo.toLowerCase();
  const palabrasProducto = [
    "producto",
    "bebida",
    "lata",
    "botella",
    "caja",
    "empaque",
    "frasco",
    "envase",
    "pepsi",
    "coca",
    "snack",
    "taza",
    "zapato",
    "zapatilla",
    "reloj",
    "perfume",
    "crema",
    "logo",
  ];

  if (palabrasProducto.some((palabra) => nombreMinusculas.includes(palabra))) {
    return "producto";
  }

  return "personaje";
}

/**
 * Construye la clave única para guardar o buscar una Lámina 360° según el vestuario y el estilo visual elegido.
 * Recibe el identificador del vestuario (ej. "vestuario_base" o "vestuario_gimnasio") y el estilo visual.
 */
export function construirClaveCacheLamina360(
  idVestuario: string = "vestuario_base",
  estiloVisual: string = "original_referencia"
): string {
  const vestuarioLimpio = (idVestuario || "vestuario_base")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
  const estiloLimpio = (estiloVisual || "original_referencia")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
  return `${vestuarioLimpio}__${estiloLimpio}`;
}

/**
 * Comprueba en memoria si un archivo con la misma huella digital SHA-256 ya existe en una lista de activos.
 * Recibe la lista de activos existentes y el candidato nuevo, y devuelve si ya existe junto con el activo encontrado.
 */
export function deduplicarArchivosPorHashEnMemoria<
  T extends { hashArchivo: string }
>(
  existentes: T[],
  candidato: T
): { yaExiste: boolean; activoExistente: T | null } {
  const hashBuscado = candidato.hashArchivo.trim().toLowerCase();
  const encontrado =
    existentes.find(
      (item) => item.hashArchivo.trim().toLowerCase() === hashBuscado
    ) ?? null;

  return {
    yaExiste: Boolean(encontrado),
    activoExistente: encontrado,
  };
}

/**
 * Consulta en la colección `biblioteca_activos` de Firestore si ya existe un activo con el mismo `hashArchivo`.
 * Recibe el hash SHA-256 y devuelve la ficha completa del activo si existe, o null si es nuevo.
 */
export async function buscarActivoPorHashEnFirestore(
  hashArchivo: string
): Promise<ActivoBibliotecaGlobal | null> {
  if (!verificarConfiguracionFirebase().estaConfigurado) return null;

  try {
    const hashLimpio = hashArchivo.trim().toLowerCase();
    const baseDeDatos = obtenerBaseDeDatosFirestore();

    // 1. Búsqueda directa por ID de documento (usamos el hashArchivo como ID principal)
    const refDirecta = doc(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS, hashLimpio);
    const docDirecto = await getDoc(refDirecta);
    if (docDirecto.exists()) {
      return docDirecto.data() as ActivoBibliotecaGlobal;
    }

    // 2. Búsqueda de respaldo por consulta de campo hashArchivo
    const consulta = query(
      collection(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS),
      where("hashArchivo", "==", hashLimpio),
      limit(1)
    );
    const instantanea = await getDocs(consulta);
    if (!instantanea.empty) {
      return instantanea.docs[0].data() as ActivoBibliotecaGlobal;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Registra un archivo nuevo en la colección global `biblioteca_activos` usando su `hashArchivo` como identificador único.
 * Recibe los datos del archivo subido y devuelve el registro guardado.
 */
export async function registrarActivoEnBibliotecaFirestore(datos: {
  nombre: string;
  tipo: TipoArchivoReferencia;
  mimeType: string;
  categoriaActivo?: CategoriaActivoBiblioteca;
  url: string;
  hashArchivo: string;
  duracionSegundos?: number;
  fichaIdentidadBase?: FichaIdentidadPersonajeSeparada;
  laminas360PorVestuario?: Record<string, Lamina360GuardadaEnBiblioteca>;
}): Promise<ActivoBibliotecaGlobal> {
  const hashLimpio = datos.hashArchivo.trim().toLowerCase();
  const categoriaFinal =
    datos.categoriaActivo ??
    detectarCategoriaActivoPorNombreYTipo(datos.nombre, datos.tipo);

  const nuevoActivo: ActivoBibliotecaGlobal = {
    id: hashLimpio,
    nombre: datos.nombre,
    tipo: datos.tipo,
    mimeType: datos.mimeType,
    categoriaActivo: categoriaFinal,
    url: datos.url,
    hashArchivo: hashLimpio,
    ...(typeof datos.duracionSegundos === "number" && datos.duracionSegundos > 0
      ? { duracionSegundos: datos.duracionSegundos }
      : {}),
    ...(datos.fichaIdentidadBase
      ? { fichaIdentidadBase: datos.fichaIdentidadBase }
      : {}),
    laminas360PorVestuario: datos.laminas360PorVestuario ?? {},
    fechaCreacion: new Date().toISOString(),
  };

  if (verificarConfiguracionFirebase().estaConfigurado) {
    try {
      const baseDeDatos = obtenerBaseDeDatosFirestore();
      const refDoc = doc(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS, hashLimpio);
      await setDoc(refDoc, JSON.parse(JSON.stringify(nuevoActivo)), {
        merge: true,
      });
    } catch {
      // Si la escritura de caché falla por red, no bloqueamos el flujo principal del usuario
    }
  }

  return nuevoActivo;
}

/**
 * Busca un activo en `biblioteca_activos` a partir de su URL de Firebase Storage o de su nombre de archivo.
 * Recibe la URL original y opcionalmente el nombre, y devuelve el activo encontrado o null.
 */
export async function buscarActivoPorUrlONombreEnFirestore(
  urlArchivo: string,
  nombreArchivo?: string
): Promise<ActivoBibliotecaGlobal | null> {
  if (!verificarConfiguracionFirebase().estaConfigurado) return null;

  try {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    if (urlArchivo && urlArchivo.trim().length > 0) {
      const consultaUrl = query(
        collection(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS),
        where("url", "==", urlArchivo.trim()),
        limit(1)
      );
      const snapUrl = await getDocs(consultaUrl);
      if (!snapUrl.empty) {
        return snapUrl.docs[0].data() as ActivoBibliotecaGlobal;
      }
    }

    if (nombreArchivo && nombreArchivo.trim().length > 0) {
      const consultaNombre = query(
        collection(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS),
        where("nombre", "==", nombreArchivo.trim()),
        limit(1)
      );
      const snapNombre = await getDocs(consultaNombre);
      if (!snapNombre.empty) {
        return snapNombre.docs[0].data() as ActivoBibliotecaGlobal;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Actualiza en `biblioteca_activos` la ficha de identidad separada (`identidadFisicaInmutable` y `vestuarioOriginalFoto`)
 * o una nueva Lámina 360° asociada a un vestuario y estilo visual.
 */
export async function actualizarFichaYLaminaEnBibliotecaFirestore(opciones: {
  urlReferenciaOriginal: string;
  nombreReferencia?: string;
  fichaIdentidadBase?: FichaIdentidadPersonajeSeparada;
  nuevaLamina360?: Lamina360GuardadaEnBiblioteca;
}): Promise<void> {
  const activo = await buscarActivoPorUrlONombreEnFirestore(
    opciones.urlReferenciaOriginal,
    opciones.nombreReferencia
  );
  if (!activo) return;

  try {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const refDoc = doc(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS, activo.id);
    const cambios: Record<string, unknown> = {};

    if (opciones.fichaIdentidadBase) {
      cambios.fichaIdentidadBase = JSON.parse(
        JSON.stringify(opciones.fichaIdentidadBase)
      );
    }

    if (opciones.nuevaLamina360) {
      const claveCache = construirClaveCacheLamina360(
        opciones.nuevaLamina360.idVestuario,
        opciones.nuevaLamina360.estiloVisual
      );
      const mapaPrevio = activo.laminas360PorVestuario ?? {};
      cambios.laminas360PorVestuario = JSON.parse(
        JSON.stringify({
          ...mapaPrevio,
          [claveCache]: opciones.nuevaLamina360,
        })
      );
    }

    if (Object.keys(cambios).length > 0) {
      await updateDoc(refDoc, cambios);
    }
  } catch {
    // Error silencioso de caché para no interrumpir la generación
  }
}

/**
 * Elimina de `biblioteca_activos` una Lámina 360° guardada en caché para que no vuelva a reutilizarse si el usuario la descartó.
 */
export async function eliminarLaminaDeBibliotecaFirestore(opciones: {
  urlReferenciaOriginal: string;
  nombreReferencia?: string;
  idVestuario: string;
  estiloVisual?: string;
}): Promise<void> {
  const activo = await buscarActivoPorUrlONombreEnFirestore(
    opciones.urlReferenciaOriginal,
    opciones.nombreReferencia
  );
  if (!activo || !activo.laminas360PorVestuario) return;

  try {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const refDoc = doc(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS, activo.id);
    const copiaMapa = { ...activo.laminas360PorVestuario };

    for (const clave of Object.keys(copiaMapa)) {
      if (
        clave.startsWith(`${opciones.idVestuario}__`) ||
        copiaMapa[clave]?.idVestuario === opciones.idVestuario
      ) {
        delete copiaMapa[clave];
      }
    }

    await updateDoc(refDoc, {
      laminas360PorVestuario: JSON.parse(JSON.stringify(copiaMapa)),
    });
  } catch {
    // Si falla el borrado en caché, no bloqueamos el borrado en el proyecto
  }
}

/**
 * Obtiene todos los activos guardados en `biblioteca_activos` para mostrarlos en el selector visual de la Mesa de Entrada.
 * No recibe parámetros y devuelve la lista de activos ordenada del más reciente al más antiguo.
 */
export async function listarActivosBibliotecaFirestore(): Promise<
  ActivoBibliotecaGlobal[]
> {
  if (!verificarConfiguracionFirebase().estaConfigurado) return [];

  try {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const instantanea = await getDocs(
      collection(baseDeDatos, COLECCION_BIBLIOTECA_ACTIVOS)
    );
    const lista: ActivoBibliotecaGlobal[] = [];
    instantanea.forEach((docSnap) => {
      lista.push(docSnap.data() as ActivoBibliotecaGlobal);
    });

    return lista.sort((a, b) =>
      (b.fechaCreacion || "").localeCompare(a.fechaCreacion || "")
    );
  } catch {
    return [];
  }
}
