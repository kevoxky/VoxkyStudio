// Define la estructura del Guion Cinematográfico con duración dinámica/autónoma por toma, justificación del Director y Timeline del Paso 3.
// Se conecta con planificador_bloques_tiempo.ts, generador_guion_fal.ts, /api/agentes/generar-guion y PanelGuionTimeline.tsx.

import { type ArchivoMultimediaGuardado } from "../../mesa_entrada/constantes_mesa_entrada.ts";
import { type AnalisisProductorEjecutivo } from "../analista_clarificador/tipos_productor_ejecutivo.ts";

export type ModoDuracionGuion = "fijo_usuario" | "autonomo_director";

/**
 * Define un atuendo fijo y detallado dentro del Armario de Vestuario (`armarioVestuarios`)
 * para garantizar que en todas las escenas de un mismo lugar (ej. gimnasio, playa, casa, consultorio)
 * el personaje use exactamente la misma ropa conservando su identidad física inmutable.
 */
export interface PrendaVestuarioEscenario {
  idVestuario: string;
  nombrePersonaje: string;
  escenarioOLugar: string;
  descripcionVestuario: string;
  promptVestuarioIngles: string;
  esVestuarioBaseOriginal: boolean;
}

export interface EscenaGuion {
  idEscena: string;
  numero: number;
  titulo: string;
  tiempoInicioSeg: number;
  tiempoFinSeg: number;
  duracionSegundos: number;
  justificacionDuracion: string;
  letraODialogo: string;
  descripcionVisual: string;
  promptImagenAncla: string;
  promptVideoAnimacion: string;
  archivosReferenciaUsados: string[];
  requiereLipSync: boolean;
  idVestuarioAsignado?: string;
  descripcionVestuarioEscena?: string;
  imagenAnclaUrl?: string;
  estadoImagen?: "pendiente" | "generando" | "lista" | "error";
  errorImagen?: string;
}

export interface TramoTiempoPlanificado {
  numero: number;
  tiempoInicioSeg: number;
  tiempoFinSeg: number;
  duracionSegundos: number;
  justificacionDuracion: string;
  letraODialogo: string;
  esInstrumental: boolean;
  requiereLipSyncSugerido: boolean;
}

export interface GuionProduccionCompleto {
  tituloProduccion: string;
  resumenNarrativo: string;
  duracionTotalSegundos: number;
  modoDuracion: ModoDuracionGuion;
  duracionMaximaPorTomaSeg: number;
  idiomaSalida: string;
  armarioVestuarios?: PrendaVestuarioEscenario[];
  escenas: EscenaGuion[];
  fechaGeneracion: string;
}

export interface EntradaGenerarGuion {
  proyectoId?: string;
  ideaOriginal: string;
  formato?: string;
  duracionObjetivo?: string;
  modeloVideo?: string;
  idiomaSalida?: string;
  archivosMultimedia?: ArchivoMultimediaGuardado[];
  imagenesReferencia?: string[];
  analisisProductorEjecutivo?: AnalisisProductorEjecutivo;
  duracionAudioForzadaSegundos?: number;
}
