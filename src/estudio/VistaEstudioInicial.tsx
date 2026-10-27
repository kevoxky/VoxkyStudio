// Vista en tiempo real del estudio (/estudio/[id]) con experiencia interactiva paso a paso (Wizard por pantallas).
// Se conecta con src/configuracion/cliente_firebase.ts, BarraPasosEstudio.tsx, ModalDetallesProyecto.tsx y los paneles especializados.

"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import {
  type ArchivoMultimediaGuardado,
  COLECCION_PROYECTOS,
  type FormatoVideo,
  type IdiomaSalidaVideo,
  MODELOS_IMAGEN_FAL,
  MODELOS_VIDEO_FAL,
  type ModoCalidadProduccion,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { type AnalisisProductorEjecutivo } from "@/agentes/analista_clarificador/tipos_productor_ejecutivo";
import { type GuionProduccionCompleto } from "@/agentes/guionista/tipos_guion";
import { type Lamina360Identidad } from "@/agentes/director_arte/tipos_director_arte";
import {
  ESTADO_LISTO_PARA_IMAGENES,
  ESTADO_LISTO_PARA_PRODUCCION_AV,
  type IdEstiloVisual,
} from "@/mesa_entrada/constantes_mesa_entrada";
import { leerDuracionMultimediaEnNavegador } from "@/mesa_entrada/ZonaImagenesReferencia";
import { PanelClarificacionDirector } from "./PanelClarificacionDirector";
import { PanelGuionTimeline } from "./PanelGuionTimeline";
import { BarraPasosEstudio, type NumeroPasoWizard } from "./BarraPasosEstudio";
import { ModalDetallesProyecto } from "./ModalDetallesProyecto";
import {
  type DatosAjustesProyecto,
  ModalAjustesEstudio,
} from "./ModalAjustesEstudio";
import {
  type OpcionesRegenerarLamina,
  PantallaLaminas360Paso3,
} from "./PantallaLaminas360Paso3";
import {
  type OpcionesRegenerarEscena,
  PantallaStoryboardPaso4,
} from "./PantallaStoryboardPaso4";
import { PantallaProduccionPaso5 } from "./PantallaProduccionPaso5";

interface FichaProyectoFirestore {
  ideaOriginal: string;
  formato: FormatoVideo;
  duracionObjetivo?: string;
  toleranciaFlexible?: boolean;
  modeloImagen?: string;
  modeloVideo?: string;
  estiloVisualSeleccionado?: string;
  modoCalidad?: ModoCalidadProduccion;
  costoEstimadoPorMinutoUSD?: number;
  presupuestoTotalEstimadoUSD?: number;
  idiomaSalida?: IdiomaSalidaVideo;
  imagenesReferencia: string[];
  archivosMultimedia?: ArchivoMultimediaGuardado[];
  analisisProductorEjecutivo?: AnalisisProductorEjecutivo;
  guionProduccion?: GuionProduccionCompleto;
  laminas360?: Lamina360Identidad[];
  estado: string;
}

interface PropiedadesVistaEstudio {
  proyectoId: string;
}

/**
 * Busca el nombre comercial amigable de un modelo de fal.ai a partir de su identificador técnico.
 */
function obtenerNombreAmigableModelo(idModelo: string | undefined): string {
  if (!idModelo) return "Por defecto";
  const todosLosModelos = [...MODELOS_IMAGEN_FAL, ...MODELOS_VIDEO_FAL];
  const encontrado = todosLosModelos.find((modelo) => modelo.id === idModelo);
  return encontrado ? encontrado.nombre : idModelo;
}

/**
 * Elimina cualquier propiedad con valor undefined para que updateDoc de Firestore jamás falle.
 */
function limpiarDatosParaFirestore<T>(datos: T): T {
  return JSON.parse(JSON.stringify(datos)) as T;
}

/**
 * Determina el paso máximo desbloqueado y el paso recomendado según el estado de Firestore.
 */
function calcularProgresoSegunEstado(
  estado: string,
  tieneGuion: boolean,
  tieneLaminas: boolean,
  todasEscenasListas: boolean
): { pasoRecomendado: NumeroPasoWizard; maximoDesbloqueado: NumeroPasoWizard } {
  if (estado === ESTADO_LISTO_PARA_PRODUCCION_AV || todasEscenasListas) {
    return { pasoRecomendado: 5, maximoDesbloqueado: 5 };
  }
  if (estado === "generando_imagenes" || tieneLaminas) {
    return { pasoRecomendado: 4, maximoDesbloqueado: 4 };
  }
  if (estado === ESTADO_LISTO_PARA_IMAGENES || tieneGuion) {
    return { pasoRecomendado: 3, maximoDesbloqueado: 3 };
  }
  if (estado === "listo_para_guion" || estado === "esperando_aprobacion_guion") {
    return { pasoRecomendado: 2, maximoDesbloqueado: 2 };
  }
  return { pasoRecomendado: 1, maximoDesbloqueado: 1 };
}

/**
 * Orquesta la Sala de Estudio interactiva pantalla por pantalla (Wizard) sin apilar componentes.
 */
export function VistaEstudioInicial({ proyectoId }: PropiedadesVistaEstudio) {
  const [proyecto, setProyecto] = useState<FichaProyectoFirestore | null>(null);
  const [cargando, setCargando] = useState<boolean>(true);
  const [analizandoConAgente, setAnalizandoConAgente] = useState<boolean>(false);
  const [generandoGuion, setGenerandoGuion] = useState<boolean>(false);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [avisoPasoBloqueado, setAvisoPasoBloqueado] = useState<string | null>(null);
  const [modalDetallesAbierto, setModalDetallesAbierto] = useState<boolean>(false);
  const [modalAjustesAbierto, setModalAjustesAbierto] = useState<boolean>(false);

  // Estado del Wizard: paso visual activo que controla qué pantalla única se renderiza
  const [pasoVisualActivo, setPasoVisualActivo] = useState<NumeroPasoWizard>(1);
  const autoAvanceInicialRef = useRef<boolean>(false);

  const analisisIniciadoRef = useRef<boolean>(false);
  const guionIniciadoRef = useRef<boolean>(false);

  // Escuchamos en tiempo real el documento del proyecto dentro de Firestore
  useEffect(() => {
    const estadoFirebase = verificarConfiguracionFirebase();
    if (!estadoFirebase.estaConfigurado) {
      setMensajeError(estadoFirebase.mensajeError);
      setCargando(false);
      return;
    }

    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);

    const desuscribir = onSnapshot(
      referenciaDocumento,
      (instantanea) => {
        if (!instantanea.exists()) {
          setMensajeError(`No se encontró ningún proyecto con el ID "${proyectoId}".`);
          setCargando(false);
          return;
        }

        const datos = instantanea.data() as FichaProyectoFirestore;
        setProyecto(datos);
        setCargando(false);

        // Auto-avance inteligente la primera vez que se carga el proyecto
        const tieneGuion = Boolean(datos.guionProduccion && datos.guionProduccion.escenas?.length > 0);
        const tieneLaminas = Boolean(datos.laminas360 && datos.laminas360.some((l) => l.estado === "lista"));
        const todasEscenasListas = Boolean(
          tieneGuion &&
          datos.guionProduccion?.escenas.every((e) => e.imagenAnclaUrl && e.estadoImagen === "lista")
        );

        const { pasoRecomendado } = calcularProgresoSegunEstado(
          datos.estado,
          tieneGuion,
          tieneLaminas,
          todasEscenasListas
        );

        if (!autoAvanceInicialRef.current) {
          setPasoVisualActivo(pasoRecomendado);
          autoAvanceInicialRef.current = true;
        }
      },
      (error) => {
        setMensajeError(`Error de conexión con Firestore: ${error.message}`);
        setCargando(false);
      }
    );

    return () => desuscribir();
  }, [proyectoId]);

  // Activación automática del Agente Productor Ejecutivo si el proyecto está recién creado
  useEffect(() => {
    if (!proyecto || cargando) return;
    if (proyecto.estado === "analizando_idea" && !analisisIniciadoRef.current) {
      analisisIniciadoRef.current = true;
      dispararAgenteProductorEjecutivo();
    }
  }, [proyecto, cargando]);

  async function dispararAgenteProductorEjecutivo() {
    setAnalizandoConAgente(true);
    setMensajeError(null);

    try {
      const respuesta = await fetch("/api/agentes/analizar-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proyectoId }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        throw new Error(datos.error || "No se pudo completar el análisis del Productor Ejecutivo.");
      }
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Error al analizar la idea con el Agente Productor.");
    } finally {
      setAnalizandoConAgente(false);
    }
  }

  async function dispararAgenteGuionista() {
    setGenerandoGuion(true);
    setMensajeError(null);

    try {
      let duracionExactaSeg: number | undefined;
      const primerAudio = proyecto?.archivosMultimedia?.find(
        (a) => a.tipo === "audio" || a.tipo === "video"
      );

      if (primerAudio?.duracionSegundos && primerAudio.duracionSegundos > 0) {
        duracionExactaSeg = primerAudio.duracionSegundos;
      } else if (primerAudio?.url) {
        const leida = await leerDuracionMultimediaEnNavegador(primerAudio.tipo, primerAudio.url);
        if (leida) duracionExactaSeg = leida;
      }

      const respuesta = await fetch("/api/agentes/generar-guion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyectoId,
          duracionExactaAudioSegundos: duracionExactaSeg,
        }),
      });

      const datos = await respuesta.json();
      if (!respuesta.ok || !datos.ok) {
        throw new Error(datos.error || "No se pudo generar el Guion y Timeline de producción.");
      }
      setPasoVisualActivo(2);
    } catch (error) {
      setMensajeError(error instanceof Error ? error.message : "Error inesperado al generar el Guion.");
    } finally {
      setGenerandoGuion(false);
    }
  }

  async function guardarClarificacionEnFirestore(
    analisisActualizado: AnalisisProductorEjecutivo,
    nuevoEstado: string
  ) {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);

    await updateDoc(
      referenciaDocumento,
      limpiarDatosParaFirestore({
        analisisProductorEjecutivo: analisisActualizado,
        estado: nuevoEstado,
      })
    );

    // Avanza automáticamente a la pantalla de Guion
    setPasoVisualActivo(2);
    if (!proyecto?.guionProduccion) {
      dispararAgenteGuionista();
    }
  }

  async function guardarGuionEnFirestore(
    guionActualizado: GuionProduccionCompleto,
    nuevoEstado: string
  ) {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);

    await updateDoc(
      referenciaDocumento,
      limpiarDatosParaFirestore({
        guionProduccion: guionActualizado,
        estado: nuevoEstado,
      })
    );

    // Al aprobar guion, avanzamos automáticamente a la Pantalla 3 (Láminas 360°)
    if (nuevoEstado === ESTADO_LISTO_PARA_IMAGENES) {
      setPasoVisualActivo(3);
    }
  }

  async function manejarCambiarEstiloVisual(nuevoEstilo: IdEstiloVisual) {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
    await updateDoc(
      referenciaDocumento,
      limpiarDatosParaFirestore({
        estiloVisualSeleccionado: nuevoEstilo,
      })
    );
  }

  async function guardarAjustesEstudioEnFirestore(
    nuevosAjustes: DatosAjustesProyecto
  ) {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
    await updateDoc(
      referenciaDocumento,
      limpiarDatosParaFirestore(nuevosAjustes)
    );
  }

  async function manejarGenerarLaminas360(opciones?: OpcionesRegenerarLamina) {
    const res = await fetch("/api/agentes/generar-laminas-360", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proyectoId,
        nombreReferenciaIndividual: opciones?.nombreReferencia,
        idVestuarioIndividual: opciones?.idVestuario,
        promptPersonalizado: opciones?.promptPersonalizado,
        forzarRegeneracion: Boolean(
          opciones?.nombreReferencia ||
            opciones?.idVestuario ||
            opciones?.promptPersonalizado
        ),
        modeloImagen: opciones?.modeloImagenOverride || proyecto?.modeloImagen,
        estiloVisualSeleccionado:
          proyecto?.estiloVisualSeleccionado || "original_referencia",
      }),
    });
    const datos = await res.json();
    if (!res.ok || !datos.ok) {
      throw new Error(datos.error || "No se pudieron generar las Láminas 360°.");
    }
  }

  async function manejarEliminarLamina360(idLamina: string) {
    const res = await fetch("/api/agentes/generar-laminas-360", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId, idLamina }),
    });
    const datos = await res.json();
    if (!res.ok || !datos.ok) {
      throw new Error(datos.error || "No se pudo eliminar la Lámina 360°.");
    }
  }

  async function manejarEliminarVestuarioArmario(idVestuarioArmario: string) {
    const res = await fetch("/api/agentes/generar-laminas-360", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId, idVestuarioArmario }),
    });
    const datos = await res.json();
    if (!res.ok || !datos.ok) {
      throw new Error(datos.error || "No se pudo quitar el vestuario.");
    }
  }

  async function manejarAgregarVestuarioArmario(nuevoVestuario: {
    escenarioOLugar: string;
    descripcionVestuario: string;
  }) {
    if (!proyecto?.guionProduccion) return;

    const slugLimpio = nuevoVestuario.escenarioOLugar
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 24);

    const idVestuario = `vestuario_${slugLimpio || Date.now().toString().slice(-4)}`;
    const armarioActual = proyecto.guionProduccion.armarioVestuarios || [
      {
        idVestuario: "vestuario_base",
        nombrePersonaje: "General",
        escenarioOLugar: "Ropa original de la foto de referencia",
        descripcionVestuario:
          "Mantener exactamente el vestuario original de la foto subida.",
        promptVestuarioIngles:
          "Keep exact original outfit, colors, and clothing details from the reference photo.",
        esVestuarioBaseOriginal: true,
      },
    ];

    const armarioNormalizado = armarioActual.map((prenda) =>
      prenda.idVestuario === "vestuario_base" &&
      prenda.escenarioOLugar.toLowerCase().includes("consultorio")
        ? {
            ...prenda,
            escenarioOLugar: "Ropa original de la foto de referencia",
          }
        : prenda
    );

    const existeMismoId = armarioNormalizado.some(
      (p) => p.idVestuario === idVestuario
    );
    const idFinal = existeMismoId
      ? `${idVestuario}_${Date.now().toString().slice(-3)}`
      : idVestuario;

    const guionActualizado: GuionProduccionCompleto = {
      ...proyecto.guionProduccion,
      armarioVestuarios: [
        ...armarioNormalizado,
        {
          idVestuario: idFinal,
          nombrePersonaje: "General",
          escenarioOLugar: nuevoVestuario.escenarioOLugar,
          descripcionVestuario: nuevoVestuario.descripcionVestuario,
          promptVestuarioIngles: `Outfit for ${nuevoVestuario.escenarioOLugar}: ${nuevoVestuario.descripcionVestuario}`,
          esVestuarioBaseOriginal: false,
        },
      ],
    };

    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
    await updateDoc(
      referenciaDocumento,
      limpiarDatosParaFirestore({
        guionProduccion: guionActualizado,
      })
    );
  }

  async function manejarGenerarImagenesEscenas(
    opciones?: OpcionesRegenerarEscena
  ) {
    const res = await fetch("/api/agentes/generar-imagenes-escenas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proyectoId,
        escenaIdIndividual: opciones?.escenaIdIndividual,
        promptPersonalizado: opciones?.promptPersonalizado,
        modeloImagen: opciones?.modeloImagenOverride || proyecto?.modeloImagen,
        formato: proyecto?.formato,
        estiloVisualSeleccionado:
          proyecto?.estiloVisualSeleccionado || "original_referencia",
      }),
    });
    const datos = await res.json();
    if (!res.ok || !datos.ok) {
      throw new Error(
        datos.error || "No se pudieron generar las imágenes de las escenas."
      );
    }
  }

  async function manejarEliminarImagenEscena(idEscena: string) {
    const res = await fetch("/api/agentes/generar-imagenes-escenas", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proyectoId, idEscena }),
    });
    const datos = await res.json();
    if (!res.ok || !datos.ok) {
      throw new Error(
        datos.error || "No se pudo eliminar la imagen de la escena."
      );
    }
  }

  async function manejarAprobarPasoProduccionAV() {
    const baseDeDatos = obtenerBaseDeDatosFirestore();
    const referenciaDocumento = doc(baseDeDatos, COLECCION_PROYECTOS, proyectoId);
    await updateDoc(
      referenciaDocumento,
      limpiarDatosParaFirestore({
        estado: ESTADO_LISTO_PARA_PRODUCCION_AV,
      })
    );
    setPasoVisualActivo(5);
  }

  // Cálculos de desbloqueo para navegación manual libre
  const tieneGuion = Boolean(proyecto?.guionProduccion && proyecto.guionProduccion.escenas?.length > 0);
  const tieneLaminas = Boolean(proyecto?.laminas360 && proyecto.laminas360.some((l) => l.estado === "lista"));
  const todasEscenasListas = Boolean(
    tieneGuion &&
    proyecto?.guionProduccion?.escenas.every((e) => e.imagenAnclaUrl && e.estadoImagen === "lista")
  );

  const { maximoDesbloqueado } = calcularProgresoSegunEstado(
    proyecto?.estado || "",
    tieneGuion,
    tieneLaminas,
    todasEscenasListas
  );

  function manejarIntentoPasoBloqueado(paso: NumeroPasoWizard) {
    const nombres = ["", "Análisis", "Guion", "Láminas 360°", "Storyboard", "Producción"];
    setAvisoPasoBloqueado(
      `Primero debes completar y aprobar el paso actual antes de ingresar a "${nombres[paso]}".`
    );
    setTimeout(() => setAvisoPasoBloqueado(null), 4000);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900 p-3 sm:p-5 flex flex-col justify-between">
      <div className="w-full max-w-6xl mx-auto space-y-4">
        {/* CABECERA COMPACTA DE UNA SOLA LÍNEA */}
        <header className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition-colors"
              title="Volver a la Mesa de Entrada"
            >
              ← Mesa de Entrada
            </Link>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">#{proyectoId.slice(0, 8)}</span>
              {proyecto?.analisisProductorEjecutivo?.categoriaPrincipal && (
                <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-bold text-indigo-900">
                  {proyecto.analisisProductorEjecutivo.categoriaPrincipal.replace(/_/g, " ")}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {typeof proyecto?.presupuestoTotalEstimadoUSD === "number" && (
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-900">
                Presupuesto: ~${proyecto.presupuestoTotalEstimadoUSD.toFixed(2)} USD
              </span>
            )}

            <button
              type="button"
              onClick={() => setModalDetallesAbierto(true)}
              className="rounded-full border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-950 transition-colors cursor-pointer"
            >
              📋 Ver idea y archivos (
              {proyecto?.archivosMultimedia?.length ?? proyecto?.imagenesReferencia?.length ?? 0})
            </button>

            <button
              type="button"
              onClick={() => setModalAjustesAbierto(true)}
              title="Cambiar modelos de imagen (Seedream, Nano Banana, FLUX), video, estilo visual o formato"
              className="rounded-full border border-slate-300 bg-slate-100 hover:bg-slate-200 px-3 py-1 text-xs font-bold text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>⚙️</span>
              <span>
                Ajustes ({obtenerNombreAmigableModelo(proyecto?.modeloImagen)})
              </span>
            </button>
          </div>
        </header>

        {/* BARRA HORIZONTAL DE ETAPAS (STEPPER INTERACTIVO) */}
        <BarraPasosEstudio
          pasoActivo={pasoVisualActivo}
          pasoMaximoDesbloqueado={maximoDesbloqueado}
          alSeleccionarPaso={(p) => setPasoVisualActivo(p)}
          alIntentarPasoBloqueado={manejarIntentoPasoBloqueado}
        />

        {/* AVISO TEMPORAL DE PASO BLOQUEADO */}
        {avisoPasoBloqueado && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs font-semibold text-amber-900 flex items-center justify-between animate-in fade-in">
            <span>🔒 {avisoPasoBloqueado}</span>
            <button
              type="button"
              onClick={() => setAvisoPasoBloqueado(null)}
              className="font-bold text-amber-950 ml-2 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* ESTADO DE CARGA O ERROR GLOBAL */}
        {cargando && (
          <div className="py-20 text-center space-y-3">
            <div className="mx-auto h-8 w-8 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-600">
              Conectando con tu estudio en tiempo real...
            </p>
          </div>
        )}

        {!cargando && mensajeError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs sm:text-sm font-semibold text-red-700">
            {mensajeError}
          </div>
        )}

        {/* CONTENEDOR PRINCIPAL: RENDERIZA EXCLUSIVAMENTE LA PANTALLA ACTIVA */}
        {!cargando && proyecto && (
          <div className="min-h-[500px]">
            {/* PANTALLA 1: ANÁLISIS Y CLARIFICACIÓN */}
            {pasoVisualActivo === 1 && (
              <div className="space-y-4">
                {proyecto.analisisProductorEjecutivo ? (
                  <PanelClarificacionDirector
                    proyectoId={proyectoId}
                    estadoActual={proyecto.estado}
                    analisis={proyecto.analisisProductorEjecutivo}
                    alConfirmarClarificacion={guardarClarificacionEnFirestore}
                    alPasarAlPaso3Guion={() => {
                      setPasoVisualActivo(2);
                      if (!proyecto.guionProduccion) dispararAgenteGuionista();
                    }}
                  />
                ) : (
                  <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center space-y-3 shadow-xs">
                    <div className="mx-auto h-8 w-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                    <h3 className="text-base font-bold text-slate-800">
                      El Agente Productor Ejecutivo está inspeccionando tus archivos...
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Analizando la letra de tu audio, la ficha visual de tus personajes y preparando las decisiones del director.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PANTALLA 2: GUION Y TIMELINE */}
            {pasoVisualActivo === 2 && (
              <div className="space-y-4">
                {proyecto.guionProduccion ? (
                  <PanelGuionTimeline
                    estadoActual={proyecto.estado}
                    guion={proyecto.guionProduccion}
                    generandoGuion={generandoGuion}
                    estiloVisualSeleccionado={proyecto.estiloVisualSeleccionado || "original_referencia"}
                    alCambiarEstiloVisual={manejarCambiarEstiloVisual}
                    alGuardarYAprobarGuion={guardarGuionEnFirestore}
                    alSolicitarRegenerarGuion={dispararAgenteGuionista}
                  />
                ) : (
                  <div className="rounded-3xl border border-indigo-200 bg-indigo-50/60 p-8 text-center space-y-4">
                    <span className="text-4xl">🎬</span>
                    <div className="space-y-1">
                      <h3 className="text-base sm:text-lg font-bold text-indigo-950">
                        {generandoGuion
                          ? "Generando Guion y Timeline de Escenas (0.0s a fin)..."
                          : "Listo para crear el Guion Cinematográfico"}
                      </h3>
                      <p className="text-xs text-indigo-800 max-w-md mx-auto">
                        El Agente Guionista sincronizará cada segundo de la canción o duración elegida sin cortes ni saltos.
                      </p>
                    </div>

                    {!generandoGuion && (
                      <button
                        type="button"
                        onClick={dispararAgenteGuionista}
                        className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 text-xs sm:text-sm shadow-md transition-colors cursor-pointer"
                      >
                        Comenzar Guion y Timeline →
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PANTALLA 3: LÁMINAS 360° Y ESTILO ARTÍSTICO */}
            {pasoVisualActivo === 3 && (
              <PantallaLaminas360Paso3
                proyectoId={proyectoId}
                laminas360={proyecto.laminas360 || []}
                armarioVestuarios={proyecto.guionProduccion?.armarioVestuarios || []}
                estiloVisualSeleccionado={proyecto.estiloVisualSeleccionado || "original_referencia"}
                modeloImagenActualId={proyecto.modeloImagen}
                modeloImagenNombre={obtenerNombreAmigableModelo(proyecto.modeloImagen)}
                alCambiarEstiloVisual={manejarCambiarEstiloVisual}
                alGenerarLaminas360={manejarGenerarLaminas360}
                alEliminarLamina360={manejarEliminarLamina360}
                alEliminarVestuarioArmario={manejarEliminarVestuarioArmario}
                alAgregarVestuarioArmario={manejarAgregarVestuarioArmario}
                alAvanzarASiguientePaso={() => setPasoVisualActivo(4)}
                alVolverAPasoAnterior={() => setPasoVisualActivo(2)}
              />
            )}

            {/* PANTALLA 4: STORYBOARD VISUAL POR ESCENA */}
            {pasoVisualActivo === 4 && proyecto.guionProduccion && (
              <PantallaStoryboardPaso4
                proyectoId={proyectoId}
                laminas360={proyecto.laminas360 || []}
                guion={proyecto.guionProduccion}
                modeloImagenActualId={proyecto.modeloImagen}
                modeloImagenNombre={obtenerNombreAmigableModelo(proyecto.modeloImagen)}
                formato={proyecto.formato}
                alGenerarImagenesEscenas={manejarGenerarImagenesEscenas}
                alEliminarImagenEscena={manejarEliminarImagenEscena}
                alAvanzarASiguientePaso={manejarAprobarPasoProduccionAV}
                alVolverAPasoAnterior={() => setPasoVisualActivo(3)}
              />
            )}

            {/* PANTALLA 5: AUDIO, VIDEO Y DESCARGA FINAL */}
            {pasoVisualActivo === 5 && proyecto.guionProduccion && (
              <PantallaProduccionPaso5
                proyectoId={proyectoId}
                formato={proyecto.formato}
                modeloVideoNombre={obtenerNombreAmigableModelo(proyecto.modeloVideo)}
                idiomaSalida={proyecto.idiomaSalida || "Español"}
                guion={proyecto.guionProduccion}
                alVolverAPasoAnterior={() => setPasoVisualActivo(4)}
              />
            )}
          </div>
        )}
      </div>

      {/* MODAL PARA CONSULTAR LA IDEA Y ARCHIVOS SIN SCROLL */}
      {proyecto && (
        <>
          <ModalDetallesProyecto
            abierto={modalDetallesAbierto}
            alCerrar={() => setModalDetallesAbierto(false)}
            proyectoId={proyectoId}
            ideaOriginal={proyecto.ideaOriginal}
            archivosMultimedia={proyecto.archivosMultimedia}
            imagenesReferencia={proyecto.imagenesReferencia}
            formato={proyecto.formato}
            duracionObjetivo={proyecto.duracionObjetivo}
            estiloVisualSeleccionado={proyecto.estiloVisualSeleccionado}
            idiomaSalida={proyecto.idiomaSalida}
          />

          <ModalAjustesEstudio
            abierto={modalAjustesAbierto}
            alCerrar={() => setModalAjustesAbierto(false)}
            modeloImagenActual={proyecto.modeloImagen || "google/nano-banana-2.1"}
            modeloVideoActual={
              proyecto.modeloVideo ||
              "fal-ai/kling-video/v3/pro/image-to-video"
            }
            estiloVisualActual={
              proyecto.estiloVisualSeleccionado || "original_referencia"
            }
            formatoActual={proyecto.formato || "16:9"}
            idiomaSalidaActual={proyecto.idiomaSalida || "Español"}
            duracionObjetivoActual={proyecto.duracionObjetivo || "Auto"}
            alGuardarAjustes={guardarAjustesEstudioEnFirestore}
          />
        </>
      )}
    </main>
  );
}
