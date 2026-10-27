// Define los tipos de datos para las Láminas de Consistencia 360° (incluyendo vestuarios y caché en Biblioteca) y el Paso 4.
// Se conecta con generador_laminas_360.ts, /api/agentes/generar-laminas-360, PantallaLaminas360Paso3.tsx y PanelEstudioVisualPaso4.tsx.

export type TipoLamina360 = "personaje" | "producto";

export interface Lamina360Identidad {
  id: string;
  nombreReferencia: string;
  urlReferenciaOriginal: string;
  tipo: TipoLamina360;
  urlLamina360: string;
  promptUsado: string;
  fechaCreacion: string;
  estado: "lista" | "generando" | "error";
  error?: string;
  estiloVisualAplicado?: string;
  modeloGenerador?: string;
  idVestuario?: string;
  descripcionVestuario?: string;
  identidadFisicaInmutable?: string;
  reutilizadaDeBiblioteca?: boolean;
}

export interface EntradaGenerarLaminas360 {
  proyectoId: string;
  modeloImagen?: string;
  estiloVisualSeleccionado?: string;
  descripcionVisualReferencia?: string;
  formato?: string;
  archivosReferencia?: Array<{
    nombre: string;
    url: string;
    tipo: "imagen" | "audio" | "video";
  }>;
  nombreReferenciaIndividual?: string;
  idVestuarioIndividual?: string;
  promptPersonalizado?: string;
  forzarRegeneracion?: boolean;
}

export interface EntradaGenerarImagenesEscenas {
  proyectoId: string;
  modeloImagen?: string;
  estiloVisualSeleccionado?: string;
  formato?: string;
  escenas: Array<{
    idEscena: string;
    numero: number;
    promptImagenAncla: string;
    archivosReferenciaUsados: string[];
    idVestuarioAsignado?: string;
    descripcionVestuarioEscena?: string;
    descripcionVisual?: string;
  }>;
  laminas360?: Lamina360Identidad[];
  escenaIdIndividual?: string;
  promptPersonalizado?: string;
}
