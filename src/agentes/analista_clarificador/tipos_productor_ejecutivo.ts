// Define los tipos y las 5 especialidades de producción del Agente Productor Ejecutivo Multimodal y Clarificador Elástico.
// Se conecta con clasificador_especialidades.ts, inspector_multimodal_fal.ts, los endpoints /api/agentes/* y PanelClarificacionDirector.tsx.

import { type ArchivoMultimediaGuardado } from "../../mesa_entrada/constantes_mesa_entrada.ts";

export type CategoriaProduccion =
  | "videoclip_musical"
  | "publicidad_comercial"
  | "contenido_redes_influencer"
  | "traduccion_doblaje_video"
  | "cine_serie_storyboard";

export interface InfoVisualCategoria {
  id: CategoriaProduccion;
  icono: string;
  titulo: string;
  descripcion: string;
}

export interface MarcaTiempoTranscripcion {
  inicioSeg: number;
  finSeg: number;
  texto: string;
}

export interface ResultadoTranscripcionAudio {
  urlArchivo: string;
  nombreArchivo: string;
  textoCompleto: string;
  idiomaDetectado: string;
  ritmoYTono: string;
  segmentosConTiempo: MarcaTiempoTranscripcion[];
}

export interface FichaIdentidadVisual {
  resumenVisual: string;
  detallesPorImagen: string[];
}

export interface PreguntaClarificacionDirector {
  id: string;
  pregunta: string;
  motivoCreativo: string;
  opcionesSugeridas: string[];
}

export interface AnalisisProductorEjecutivo {
  categoriaPrincipal: CategoriaProduccion;
  categoriasSecundarias: CategoriaProduccion[];
  justificacionCategoria: string;
  fichaIdentidadVisual: FichaIdentidadVisual | null;
  transcripcionesAudioVideo: ResultadoTranscripcionAudio[];
  requiereClarificacion: boolean;
  preguntas: PreguntaClarificacionDirector[];
  decisionesAutomaticasDirector: Record<string, string>;
  resumenDireccionCreativa: string;
  respuestasUsuario?: Record<string, string>;
  fueSaltadoPorUsuario?: boolean;
}

export interface EntradaAnalizarIdea {
  proyectoId?: string;
  ideaOriginal: string;
  formato?: string;
  duracionObjetivo?: string;
  idiomaSalida?: string;
  archivosMultimedia?: ArchivoMultimediaGuardado[];
  imagenesReferencia?: string[];
  modoSilencioso?: boolean;
}

// Catálogo oficial de las 5 líneas de producción de VoxkyStudio
export const CATALOGO_CATEGORIAS_PRODUCCION: Record<
  CategoriaProduccion,
  InfoVisualCategoria
> = {
  videoclip_musical: {
    id: "videoclip_musical",
    icono: "🎵",
    titulo: "Videoclip Musical",
    descripcion:
      "Producción musical sincronizada con canción, letra, ritmo y actuación o LipSync.",
  },
  publicidad_comercial: {
    id: "publicidad_comercial",
    icono: "📢",
    titulo: "Publicidad Comercial",
    descripcion:
      "Anuncio de producto, servicio o marca orientado a impacto visual y conversión.",
  },
  contenido_redes_influencer: {
    id: "contenido_redes_influencer",
    icono: "📱",
    titulo: "Contenido Redes / Influencer",
    descripcion:
      "Reels, TikToks, personajes consistentes o previsualización para negocios (ej. tatuajes).",
  },
  traduccion_doblaje_video: {
    id: "traduccion_doblaje_video",
    icono: "🌐",
    titulo: "Traducción y Doblaje de Video",
    descripcion:
      "Adaptación de un video hablado a otro idioma con preservación de voz y LipSync.",
  },
  cine_serie_storyboard: {
    id: "cine_serie_storyboard",
    icono: "🎬",
    titulo: "Miniserie / Cine / Storyboard",
    descripcion:
      "Narrativa cinematográfica, cortometraje, serie infantil o frutinovela guiada por escenas.",
  },
};

export const LISTA_CATEGORIAS_PRODUCCION: CategoriaProduccion[] = [
  "videoclip_musical",
  "publicidad_comercial",
  "contenido_redes_influencer",
  "traduccion_doblaje_video",
  "cine_serie_storyboard",
];
