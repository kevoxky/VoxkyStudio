// Crea la ficha maestra del proyecto en la colección "proyectos" de Firestore reutilizando activos de Biblioteca Global.
// Se conecta con cliente_firebase.ts, constantes_mesa_entrada.ts, validar_entrada_proyecto.ts, subir_imagenes_referencia.ts y gestor_biblioteca_activos.ts.

import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  obtenerBaseDeDatosFirestore,
  verificarConfiguracionFirebase,
} from "@/configuracion/cliente_firebase";
import {
  buscarActivoPorHashEnFirestore,
  construirClaveCacheLamina360,
} from "@/biblioteca/gestor_biblioteca_activos";
import { type ActivoBibliotecaGlobal } from "@/biblioteca/tipos_biblioteca";
import { type Lamina360Identidad } from "@/agentes/director_arte/tipos_director_arte";
import {
  type ArchivoMultimediaGuardado,
  COLECCION_PROYECTOS,
  ESTADO_ANALIZANDO_IDEA,
  type FormatoVideo,
  type IdiomaSalidaVideo,
  MODELOS_INTERNOS_POR_DEFECTO,
  type ModoCalidadProduccion,
  TOLERANCIA_FLEXIBLE_POR_DEFECTO,
} from "./constantes_mesa_entrada";
import {
  validarDatosFinancierosProyecto,
  validarDuracionObjetivo,
  validarFormatoVideo,
  validarIdeaOriginal,
  validarIdiomaSalida,
  validarImagenesReferencia,
  validarModelosFal,
} from "./validar_entrada_proyecto";
import { subirArchivosMultimediaStorage } from "./subir_imagenes_referencia";

export interface DatosEntradaProyecto {
  ideaOriginal: string;
  formato: FormatoVideo;
  duracionObjetivo: string;
  toleranciaFlexible?: boolean;
  modeloImagen: string;
  modeloVideo: string;
  estiloVisualSeleccionado?: string;
  modoCalidad: ModoCalidadProduccion;
  costoEstimadoPorMinutoUSD: number;
  presupuestoTotalEstimadoUSD: number;
  idiomaSalida: IdiomaSalidaVideo;
  archivosReferencia: File[];
  activosBibliotecaSeleccionados?: ActivoBibliotecaGlobal[];
  alInformarProgreso?: (mensaje: string) => void;
}

/**
 * Valida todos los datos técnicos, multimedia y financieros antes de subir archivos o escribir en Firebase.
 * Recibe los datos del formulario y lanza un error claro en español si algo no cumple las reglas.
 */
function verificarDatosAntesDeGuardar(datos: DatosEntradaProyecto): void {
  const estadoFirebase = verificarConfiguracionFirebase();
  if (!estadoFirebase.estaConfigurado) {
    throw new Error(
      estadoFirebase.mensajeError ??
        "Falta configurar las claves de Firebase en el archivo .env."
    );
  }

  const validaciones = [
    validarIdeaOriginal(datos.ideaOriginal),
    validarFormatoVideo(datos.formato),
    validarDuracionObjetivo(datos.duracionObjetivo),
    validarModelosFal(datos.modeloImagen, datos.modeloVideo),
    validarDatosFinancierosProyecto(
      datos.modoCalidad,
      datos.costoEstimadoPorMinutoUSD,
      datos.presupuestoTotalEstimadoUSD
    ),
    validarIdiomaSalida(datos.idiomaSalida),
    validarImagenesReferencia(datos.archivosReferencia),
  ];

  for (const resultado of validaciones) {
    if (!resultado.esValido) {
      throw new Error(
        resultado.mensajeError ??
          "Revisa los datos seleccionados antes de continuar."
      );
    }
  }
}

/**
 * Sube los archivos multimedia nuevos (con deduplicación SHA-256), integra los elegidos de la Biblioteca
 * y guarda la ficha maestra del proyecto en Firestore precargando Láminas 360° si ya existen.
 */
export async function crearProyectoEnFirestore(
  datos: DatosEntradaProyecto
): Promise<string> {
  verificarDatosAntesDeGuardar(datos);

  const baseDeDatos = obtenerBaseDeDatosFirestore();

  const referenciaColeccion = collection(baseDeDatos, COLECCION_PROYECTOS);
  const referenciaDocumento = doc(referenciaColeccion);
  const proyectoId = referenciaDocumento.id;
  const estiloElegido = datos.estiloVisualSeleccionado || "original_referencia";

  // Paso 1: Subimos o deduplicamos por hash SHA-256 los archivos nuevos subidos desde el equipo
  const archivosDesdeEquipo = await subirArchivosMultimediaStorage(
    proyectoId,
    datos.archivosReferencia,
    datos.alInformarProgreso
  );

  // Paso 2: Convertimos los activos elegidos desde el Modal de Biblioteca sin volver a subir nada
  const activosDeBiblioteca = datos.activosBibliotecaSeleccionados ?? [];
  const archivosDesdeBiblioteca: ArchivoMultimediaGuardado[] =
    activosDeBiblioteca.map((activo) => ({
      tipo: activo.tipo,
      url: activo.url,
      nombre: activo.nombre,
      mimeType: activo.mimeType,
      hashArchivo: activo.hashArchivo,
      activoBibliotecaId: activo.id,
      reutilizadoDeBiblioteca: true,
      ...(typeof activo.duracionSegundos === "number"
        ? { duracionSegundos: activo.duracionSegundos }
        : {}),
    }));

  const archivosMultimedia: ArchivoMultimediaGuardado[] = [
    ...archivosDesdeEquipo,
    ...archivosDesdeBiblioteca,
  ];

  // En imagenesReferencia guardamos exclusivamente las URLs de tipo "imagen"
  const enlacesSoloImagenes = archivosMultimedia
    .filter((item) => item.tipo === "imagen")
    .map((item) => item.url);

  // Paso 3: Si algún personaje o producto ya tiene Lámina 360° de vestuario_base para este estilo en la Biblioteca, la precargamos gratis
  const laminasPrecargadas: Lamina360Identidad[] = [];
  const claveBaseEstilo = construirClaveCacheLamina360(
    "vestuario_base",
    estiloElegido
  );

  for (const archivoItem of archivosMultimedia) {
    if (archivoItem.tipo !== "imagen" || !archivoItem.hashArchivo) continue;

    let activoEnCache = activosDeBiblioteca.find(
      (a) => a.hashArchivo === archivoItem.hashArchivo
    );
    if (!activoEnCache) {
      activoEnCache =
        (await buscarActivoPorHashEnFirestore(archivoItem.hashArchivo)) ??
        undefined;
    }

    const laminaGuardada =
      activoEnCache?.laminas360PorVestuario?.[claveBaseEstilo];
    if (laminaGuardada && laminaGuardada.urlLamina360) {
      laminasPrecargadas.push({
        id: `lamina_${archivoItem.nombre.replace(/[^a-zA-Z0-9_-]/g, "_")}__vestuario_base`,
        nombreReferencia: archivoItem.nombre,
        urlReferenciaOriginal: archivoItem.url,
        tipo:
          activoEnCache?.categoriaActivo === "producto"
            ? "producto"
            : "personaje",
        urlLamina360: laminaGuardada.urlLamina360,
        promptUsado:
          laminaGuardada.promptUsado ||
          "Lámina 360° reutilizada automáticamente desde Biblioteca Global.",
        fechaCreacion: laminaGuardada.fechaCreacion,
        estado: "lista",
        estiloVisualAplicado: estiloElegido,
        idVestuario: "vestuario_base",
        descripcionVestuario: laminaGuardada.descripcionVestuario,
        identidadFisicaInmutable:
          activoEnCache?.fichaIdentidadBase?.identidadFisicaInmutable,
        reutilizadaDeBiblioteca: true,
      });
    }
  }

  // Paso 4: Informamos el guardado en Firestore y aplicamos timeout de seguridad
  datos.alInformarProgreso?.("Guardando proyecto en la base de datos...");

  try {
    const promesaEscritura = setDoc(referenciaDocumento, {
      ideaOriginal: datos.ideaOriginal.trim(),
      formato: datos.formato,
      duracionObjetivo: datos.duracionObjetivo,
      toleranciaFlexible:
        datos.toleranciaFlexible ?? TOLERANCIA_FLEXIBLE_POR_DEFECTO,
      modeloImagen: datos.modeloImagen,
      modeloVideo: datos.modeloVideo,
      estiloVisualSeleccionado: estiloElegido,
      modoCalidad: datos.modoCalidad,
      costoEstimadoPorMinutoUSD: datos.costoEstimadoPorMinutoUSD,
      presupuestoTotalEstimadoUSD: datos.presupuestoTotalEstimadoUSD,
      modelosInternos: { ...MODELOS_INTERNOS_POR_DEFECTO },
      idiomaSalida: datos.idiomaSalida,
      imagenesReferencia: enlacesSoloImagenes,
      archivosMultimedia: JSON.parse(JSON.stringify(archivosMultimedia)),
      ...(laminasPrecargadas.length > 0
        ? { laminas360: JSON.parse(JSON.stringify(laminasPrecargadas)) }
        : {}),
      estado: ESTADO_ANALIZANDO_IDEA,
      fechaCreacion: serverTimestamp(),
    });

    await Promise.race([
      promesaEscritura,
      new Promise((_, rechazar) =>
        setTimeout(
          () =>
            rechazar(
              new Error(
                "Tiempo agotado al guardar en Firestore. Revisa tu conexión a internet."
              )
            ),
          25_000
        )
      ),
    ]);

    return proyectoId;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "No se pudo guardar la ficha del proyecto en Firebase Firestore."
    );
  }
}
