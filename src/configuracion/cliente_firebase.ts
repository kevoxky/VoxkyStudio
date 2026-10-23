// Configura la conexión única con Firebase Firestore (base de datos) y Firebase Storage (archivos).
// Se conecta con src/mesa_entrada/subir_imagenes_referencia.ts, src/mesa_entrada/crear_documento_proyecto.ts y src/estudio/VistaEstudioInicial.tsx.

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Datos de conexión leídos desde el archivo .env del proyecto
const CONFIGURACION_FIREBASE = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Comprueba si las variables principales de Firebase están escritas en el archivo .env.
 * No recibe parámetros y devuelve un objeto indicando si está listo o qué datos faltan.
 */
export function verificarConfiguracionFirebase(): {
  estaConfigurado: boolean;
  mensajeError: string | null;
} {
  const faltanClaves =
    !CONFIGURACION_FIREBASE.apiKey ||
    !CONFIGURACION_FIREBASE.projectId ||
    !CONFIGURACION_FIREBASE.storageBucket;

  if (faltanClaves) {
    return {
      estaConfigurado: false,
      mensajeError:
        "Faltan las claves de Firebase en tu archivo .env (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID y NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET). Revisa el archivo .env.example para completarlas.",
    };
  }

  return {
    estaConfigurado: true,
    mensajeError: null,
  };
}

/**
 * Obtiene o inicia la aplicación de Firebase evitando que se conecte más de una vez.
 * No recibe parámetros y devuelve la instancia activa de FirebaseApp.
 */
function obtenerAplicacionFirebase(): FirebaseApp {
  const verificacion = verificarConfiguracionFirebase();
  if (!verificacion.estaConfigurado) {
    throw new Error(verificacion.mensajeError ?? "Firebase no está configurado.");
  }

  // Si ya existe una conexión abierta la reutilizamos; si no, la creamos
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(CONFIGURACION_FIREBASE);
}

/**
 * Devuelve la conexión lista para guardar o leer documentos en Firebase Firestore.
 * No recibe parámetros y devuelve la base de datos Firestore.
 */
export function obtenerBaseDeDatosFirestore(): Firestore {
  const aplicacion = obtenerAplicacionFirebase();
  return getFirestore(aplicacion);
}

/**
 * Devuelve la conexión lista para subir o descargar imágenes en Firebase Storage.
 * No recibe parámetros y devuelve el sistema de almacenamiento FirebaseStorage.
 */
export function obtenerAlmacenamientoStorage(): FirebaseStorage {
  const aplicacion = obtenerAplicacionFirebase();
  return getStorage(aplicacion);
}
