// Define los tipos de datos de la Biblioteca Global de Activos Reutilizables ("biblioteca_activos") con deduplicación SHA-256.
// Se conecta con gestor_biblioteca_activos.ts, ModalBibliotecaActivos.tsx, subir_imagenes_referencia.ts y los agentes de estudio.

import { type TipoArchivoReferencia } from "../mesa_entrada/constantes_mesa_entrada.ts";

export const COLECCION_BIBLIOTECA_ACTIVOS = "biblioteca_activos";
export const CARPETA_STORAGE_BIBLIOTECA = "biblioteca";

export type CategoriaActivoBiblioteca =
  | "personaje"
  | "producto"
  | "audio"
  | "otro";

/**
 * Separa estrictamente la identidad física inmutable (rostro, edad, cabello, cuerpo)
 * del vestuario base que lleva puesto en la fotografía original.
 */
export interface FichaIdentidadPersonajeSeparada {
  nombreReferencia: string;
  identidadFisicaInmutable: string;
  vestuarioOriginalFoto: string;
}

/**
 * Representa una Lámina 360° ya generada para una combinación de vestuario y estilo visual,
 * permitiendo reutilizarla gratis en futuros proyectos sin volver a pagar en fal.ai.
 */
export interface Lamina360GuardadaEnBiblioteca {
  idVestuario: string;
  estiloVisual: string;
  urlLamina360: string;
  descripcionVestuario: string;
  promptUsado?: string;
  fechaCreacion: string;
}

/**
 * Documento guardado en la colección global `biblioteca_activos` de Firestore.
 */
export interface ActivoBibliotecaGlobal {
  id: string;
  nombre: string;
  tipo: TipoArchivoReferencia;
  mimeType: string;
  categoriaActivo: CategoriaActivoBiblioteca;
  url: string;
  hashArchivo: string;
  duracionSegundos?: number;
  fichaIdentidadBase?: FichaIdentidadPersonajeSeparada;
  laminas360PorVestuario?: Record<string, Lamina360GuardadaEnBiblioteca>;
  fechaCreacion: string;
}
