// Pruebas automáticas para verificar validaciones multimedia (imagen, audio, video), presupuesto en USD y el Agente Productor Ejecutivo.
// Se conecta con src/mesa_entrada/validar_entrada_proyecto.ts y src/agentes/analista_clarificador/clasificador_especialidades.ts.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularCostoPorMinutoUSD,
  calcularPresupuestoTotalUSD,
  construirRutaStorageReferencia,
  detectarModoCalidad,
  detectarTipoArchivoMultimedia,
  formatearDuracionCustom,
  obtenerMimeTypeSeguro,
  separarArchivosPorTipoEstricto,
  validarDatosFinancierosProyecto,
  validarDuracionObjetivo,
  validarFormatoVideo,
  validarIdeaOriginal,
  validarIdiomaSalida,
  validarImagenesReferencia,
  validarModelosFal,
} from "../src/mesa_entrada/validar_entrada_proyecto.ts";
import { MODELOS_INTERNOS_POR_DEFECTO } from "../src/mesa_entrada/constantes_mesa_entrada.ts";
import {
  clasificarEspecialidadProduccion,
  construirAnalisisProductorRespaldo,
  generarPreguntasElasticasPorCategoria,
} from "../src/agentes/analista_clarificador/clasificador_especialidades.ts";
import {
  convertirChunksWhisperASegmentos,
  reconciliarLetraYSegmentosCompletos,
} from "../src/agentes/analista_clarificador/reconciliador_letra_whisper.ts";
import {
  detectarDuracionMaximaTomaSegundos,
  detectarReglaDuracionPorToma,
  planificarTramosSinHuecos,
} from "../src/agentes/guionista/planificador_bloques_tiempo.ts";
import {
  construirPromptLamina360,
  detectarTipoReferencia,
  obtenerEndpointConReferencia,
  obtenerInstruccionEstiloVisual,
  resolverEndpointImagenSegunReferencias,
} from "../src/agentes/director_arte/generador_laminas_360.ts";
import {
  normalizarAspectRatioFal,
  normalizarImageSizeSeedream,
  seleccionarLaminasParaEscena,
} from "../src/agentes/director_arte/generador_imagenes_escenas.ts";
import {
  calcularHashArchivoSHA256,
  construirClaveCacheLamina360,
  construirRutaStorageBiblioteca,
  deduplicarArchivosPorHashEnMemoria,
  detectarCategoriaActivoPorNombreYTipo,
} from "../src/biblioteca/gestor_biblioteca_activos.ts";
import {
  construirDesgloseIdentidadYVestuario,
  extraerFichaTecnicaDeUnaImagen,
  limpiarTextoFichaTecnica,
} from "../src/agentes/analista_clarificador/inspector_multimodal_fal.ts";
import {
  aplicarConsistenciaArmarioAEscenas,
  construirArmarioVestuariosContextual,
  detectarIdVestuarioSegunTextoEscena,
} from "../src/agentes/guionista/gestor_vestuario_contextual.ts";

describe("Validaciones Multimedia, Presupuesto USD y Agente Productor Ejecutivo (Paso 2)", () => {
  it("rechaza una idea vacía y acepta una idea válida", () => {
    assert.equal(validarIdeaOriginal("   ").esValido, false);
    assert.equal(
      validarIdeaOriginal(
        "Un comercial cinematográfico de zapatillas corriendo bajo luces de neón."
      ).esValido,
      true
    );
  });

  it("acepta los 6 formatos de video y duraciones predefinidas o Custom", () => {
    for (const formato of ["16:9", "9:16", "1:1", "4:5", "4:3", "21:9"]) {
      assert.equal(validarFormatoVideo(formato).esValido, true);
    }
    assert.equal(
      validarDuracionObjetivo(formatearDuracionCustom(7, "min")).esValido,
      true
    );
  });

  it("detecta y valida archivos de imagen, audio (.mp3, .wav, .m4a) y video (.mp4, .mov, .webm)", () => {
    const imagen = { name: "personaje.png", size: 500_000, type: "image/png" };
    const cancion = { name: "cancion.mp3", size: 4_000_000, type: "audio/mpeg" };
    const clipVideo = { name: "entrevista.mp4", size: 12_000_000, type: "video/mp4" };

    assert.equal(detectarTipoArchivoMultimedia(imagen), "imagen");
    assert.equal(detectarTipoArchivoMultimedia(cancion), "audio");
    assert.equal(detectarTipoArchivoMultimedia(clipVideo), "video");

    assert.equal(
      validarImagenesReferencia([imagen, cancion, clipVideo]).esValido,
      true
    );
    assert.equal(MODELOS_INTERNOS_POR_DEFECTO.transcripcionAudio, "fal-ai/whisper");
  });

  it("procesa Prueba 2 (1 canción .mp3 + 2 imágenes .png) sin errores MIME y separa estrictamente Visión vs Whisper", () => {
    // Incluso si el navegador en Windows envía type vacío ("") para el .mp3
    const cancionMp3 = { name: "mi_cancion.mp3", size: 8_500_000, type: "" };
    const personaje1 = { name: "cantante_principal.png", size: 1_200_000, type: "image/png" };
    const personaje2 = { name: "baterista.png", size: 950_000, type: "" };

    const validacion = validarImagenesReferencia([cancionMp3, personaje1, personaje2]);
    assert.equal(validacion.esValido, true);

    assert.equal(obtenerMimeTypeSeguro(cancionMp3), "audio/mpeg");
    assert.equal(obtenerMimeTypeSeguro(personaje1), "image/png");
    assert.equal(obtenerMimeTypeSeguro(personaje2), "image/png");

    // Verificamos separación estricta para que .mp3 jamás vaya a Visión (image_urls)
    const { archivosImagen, archivosAudioVideo } = separarArchivosPorTipoEstricto(
      [
        {
          tipo: "audio",
          url: "https://storage.ejemplo.com/1_mi_cancion.mp3",
          nombre: "mi_cancion.mp3",
          mimeType: "audio/mpeg",
        },
        {
          tipo: "imagen",
          url: "https://storage.ejemplo.com/2_cantante_principal.png",
          nombre: "cantante_principal.png",
          mimeType: "image/png",
        },
        {
          tipo: "imagen",
          url: "https://storage.ejemplo.com/3_baterista.png",
          nombre: "baterista.png",
          mimeType: "image/png",
        },
      ],
      []
    );

    assert.equal(archivosImagen.length, 2);
    assert.equal(archivosAudioVideo.length, 1);
    assert.equal(archivosAudioVideo[0].nombre, "mi_cancion.mp3");
    assert.ok(archivosImagen.every((img) => !img.url.endsWith(".mp3")));
  });

  it("calcula el costo real por minuto y el presupuesto total según el modo y la duración", () => {
    const costoProMin = calcularCostoPorMinutoUSD(
      "google/nano-banana-2.1",
      "fal-ai/kling-video/v3/pro/image-to-video"
    );
    assert.equal(costoProMin, 9.2);
    assert.equal(
      detectarModoCalidad(
        "google/nano-banana-2.1",
        "fal-ai/kling-video/v3/pro/image-to-video"
      ),
      "pro"
    );
    const presupuesto30Seg = calcularPresupuestoTotalUSD(costoProMin, "30 seg");
    assert.equal(presupuesto30Seg, 4.6);
    assert.equal(
      validarDatosFinancierosProyecto("pro", costoProMin, presupuesto30Seg).esValido,
      true
    );
  });

  it("clasifica correctamente las 5 especialidades de producción de VoxkyStudio", () => {
    const casoMusical = clasificarEspecialidadProduccion(
      "Quiero un video para mi nueva canción",
      [
        {
          tipo: "audio",
          url: "https://ejemplo.com/tema.mp3",
          nombre: "tema.mp3",
          mimeType: "audio/mpeg",
        },
      ]
    );
    assert.equal(casoMusical.categoriaPrincipal, "videoclip_musical");

    const casoTraduccion = clasificarEspecialidadProduccion(
      "Tradúcelo al francés manteniendo mi voz",
      [
        {
          tipo: "video",
          url: "https://ejemplo.com/hablando.mp4",
          nombre: "hablando.mp4",
          mimeType: "video/mp4",
        },
      ]
    );
    assert.equal(casoTraduccion.categoriaPrincipal, "traduccion_doblaje_video");

    const casoCine = clasificarEspecialidadProduccion(
      "Una miniserie infantil estilo frutinovela con un mango detective",
      []
    );
    assert.equal(casoCine.categoriaPrincipal, "cine_serie_storyboard");
  });

  it("aplica la Regla de Clarificación Elástica (0 preguntas en modoSilencioso o caso claro, y 1 a N cuando faltan detalles)", () => {
    // Caso A (0 preguntas): modoSilencioso: true (para futuros Widgets / APIs B2B)
    const analisisSilencioso = construirAnalisisProductorRespaldo(
      "Previsualizar tatuaje en el antebrazo",
      [],
      null,
      [],
      true
    );
    assert.equal(analisisSilencioso.requiereClarificacion, false);
    assert.equal(analisisSilencioso.preguntas.length, 0);

    // Caso A (0 preguntas): traducción donde ya especificó timbre y LipSync
    const preguntasTraduccionCompleta = generarPreguntasElasticasPorCategoria(
      "Tradúcelo al francés conservando mi timbre original con sincronización lipsync",
      "traduccion_doblaje_video",
      false
    );
    assert.equal(preguntasTraduccionCompleta.length, 0);

    // Caso B (1 a N preguntas): videoclip musical sin definir si canta a cámara (LipSync)
    const preguntasVideoclip = generarPreguntasElasticasPorCategoria(
      "Haz un videoclip para mi canción de rock",
      "videoclip_musical",
      false
    );
    assert.ok(preguntasVideoclip.length >= 1);
    assert.ok(preguntasVideoclip[0].opcionesSugeridas.length >= 2);
  });

  it("valida modelos, idiomas y rutas de Storage", () => {
    assert.equal(
      validarModelosFal(
        "fal-ai/nano-banana-pro",
        "fal-ai/kling-video/v3/pro/image-to-video"
      ).esValido,
      true
    );
    assert.equal(validarIdiomaSalida("Français").esValido, true);
    assert.equal(
      construirRutaStorageReferencia("proy_1", 0, "mi cancion.mp3"),
      "referencias/proy_1/1_mi_cancion.mp3"
    );
  });

  it("elimina el límite de 25 segmentos, conserva tiempos abiertos [inicio, null] y reconcilia estrofas finales hasta 125s", () => {
    // 1. Probamos que más de 25 chunks (ej. 35 chunks) y un último chunk con [inicio, null] se conserven al 100%
    const chunksLargos = Array.from({ length: 35 }, (_, i) => ({
      timestamp: [
        i * 3,
        i === 34 ? null : (i + 1) * 3,
      ] as [number, number | null],
      text: `Verso número ${i + 1}`,
    }));

    const convertidos = convertirChunksWhisperASegmentos(chunksLargos, 125);
    assert.equal(convertidos.length, 35);
    assert.equal(convertidos[34].finSeg, 125);

    // 2. Probamos el caso real: 25 segmentos que terminaban en 90.8s pero textoCompleto tiene la estrofa final ("Manos a la panza... Adiós monstruo")
    const segmentosCortadosEn90 = [
      { inicioSeg: 0, finSeg: 45.0, texto: "Leo y Mía sienten un rugido adentro." },
      { inicioSeg: 45.0, finSeg: 90.8, texto: "El monstruo del enojo quiere salir hoy." },
    ];
    const letraCompletaCancion =
      "Leo y Mía sienten un rugido adentro. El monstruo del enojo quiere salir hoy. Manos a la panza, inhalo despacio. Soplo la vela y vuelve la calma. Adiós monstruo.";

    const reconciliados = reconciliarLetraYSegmentosCompletos(
      letraCompletaCancion,
      segmentosCortadosEn90,
      125
    );

    assert.ok(reconciliados.length >= 4);
    assert.equal(reconciliados[reconciliados.length - 1].finSeg, 125);
    const textoTodoUnido = reconciliados.map((s) => s.texto).join(" ");
    assert.ok(textoTodoUnido.includes("Manos a la panza"));
    assert.ok(textoTodoUnido.includes("Adiós monstruo"));

    // 3. Prioridad 1 (Orden explícita del usuario): respeta límite de 6s y cubre de 0.0s a 125.0s sin huecos
    const reglaUsuario = detectarReglaDuracionPorToma(
      "Quiero escenas de máximo 6 segundos sin transiciones"
    );
    assert.equal(reglaUsuario.modoDuracion, "fijo_usuario");
    assert.equal(reglaUsuario.limiteMaximoSeg, 6);
    assert.equal(
      detectarDuracionMaximaTomaSegundos(
        "Quiero escenas de máximo 6 segundos sin transiciones"
      ),
      6
    );

    const tramosGuion = planificarTramosSinHuecos(
      125,
      reglaUsuario.limiteMaximoSeg,
      reconciliados,
      true,
      reglaUsuario.modoDuracion
    );

    assert.equal(tramosGuion[0].tiempoInicioSeg, 0);
    assert.equal(tramosGuion[tramosGuion.length - 1].tiempoFinSeg, 125);
    assert.ok(tramosGuion.length >= 21);

    for (let i = 0; i < tramosGuion.length; i++) {
      assert.ok(tramosGuion[i].duracionSegundos <= 6);
      assert.ok(tramosGuion[i].justificacionDuracion.length > 5);
      if (i > 0) {
        assert.equal(
          tramosGuion[i].tiempoInicioSeg,
          tramosGuion[i - 1].tiempoFinSeg
        );
      }
    }

    const letrasEnTimeline = tramosGuion.map((t) => t.letraODialogo).join(" ");
    assert.ok(letrasEnTimeline.includes("Manos a la panza"));
    assert.ok(letrasEnTimeline.includes("Adiós monstruo"));

    // 4. Prioridad 2 (Autonomía del Director): cuando el usuario NO fija límite por toma, crea tomas variadas (cortas, medias y largas)
    const reglaAutonoma = detectarReglaDuracionPorToma(
      "Crea un videoclip emotivo para mi canción de Leo y Mía",
      "fal-ai/kling-video/v3/pro/image-to-video"
    );
    assert.equal(reglaAutonoma.modoDuracion, "autonomo_director");

    const tramosAutonomos = planificarTramosSinHuecos(
      125,
      reglaAutonoma.limiteMaximoSeg,
      reconciliados,
      true,
      reglaAutonoma.modoDuracion
    );
    assert.equal(tramosAutonomos[0].tiempoInicioSeg, 0);
    assert.equal(
      tramosAutonomos[tramosAutonomos.length - 1].tiempoFinSeg,
      125
    );
    assert.ok(
      tramosAutonomos.some((t) => t.duracionSegundos > 6),
      "En modo autónomo el Director puede crear tomas mayores a 6s"
    );
    assert.ok(
      tramosAutonomos.every((t) => t.justificacionDuracion.length > 5)
    );
  });

  it("Paso 4: detecta tipos de referencia, construye prompts de Láminas 360° y mapea formatos e imágenes por escena", () => {
    // 1. Detección de 'personaje' vs 'producto'
    assert.equal(detectarTipoReferencia("Leo Focal.png"), "personaje");
    assert.equal(detectarTipoReferencia("Mia cuerpo entero.jpg"), "personaje");
    assert.equal(detectarTipoReferencia("Lata Pepsi 350ml.png"), "producto");
    assert.equal(detectarTipoReferencia("Botella perfume cristal.webp"), "producto");

    // 2. Construcción de prompts de Láminas 360° sobre fondo gris neutro (#808080) sin "photorealistic"
    const promptPersonaje = construirPromptLamina360(
      "personaje",
      "Leo Focal.png",
      "plastilina_claymation",
      "Niño con camisa a rayas rojas y blancas y pantalones azules"
    );
    assert.ok(promptPersonaje.includes("#808080"));
    assert.ok(promptPersonaje.includes("turnaround sheet"));
    assert.ok(promptPersonaje.includes("T-pose"));
    assert.ok(promptPersonaje.includes("Leo Focal.png"));
    assert.ok(promptPersonaje.includes("claymation"));
    assert.ok(!promptPersonaje.includes("photorealistic")); // Verifica eliminación estricta de photorealistic

    const promptProducto = construirPromptLamina360("producto", "Lata Pepsi.png", "3d_pixar");
    assert.ok(promptProducto.includes("#808080"));
    assert.ok(promptProducto.includes("turnaround sheet"));
    assert.ok(promptProducto.includes("turntable"));
    assert.ok(promptProducto.includes("Lata Pepsi.png"));
    assert.ok(promptProducto.includes("3D Pixar"));

    // 2.1 Enrutador Dual Inteligente (Image-to-Image /edit con fotos, o Text-to-Image sin fotos)
    assert.equal(
      resolverEndpointImagenSegunReferencias("google/nano-banana-2.1", true),
      "google/nano-banana-2.1/edit"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias("google/nano-banana-2.1", false),
      "google/nano-banana-2.1"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias("fal-ai/nano-banana-pro", true),
      "fal-ai/nano-banana-pro/edit"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias("fal-ai/nano-banana-pro", false),
      "fal-ai/nano-banana-pro"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias("fal-ai/flux-pro/kontext", true),
      "fal-ai/flux-pro/kontext"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias("fal-ai/flux-pro/kontext", false),
      "fal-ai/flux-pro/kontext/text-to-image"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias("fal-ai/recraft/v3", true),
      "fal-ai/recraft/v3/image-to-image"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias("fal-ai/recraft/v3", false),
      "fal-ai/recraft/v3/text-to-image"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias(
        "bytedance/seedream/v5/pro/text-to-image",
        true
      ),
      "bytedance/seedream/v5/pro/edit"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias(
        "bytedance/seedream/v5/pro/text-to-image",
        false
      ),
      "bytedance/seedream/v5/pro/text-to-image"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias(
        "bytedance/seedream/v5/lite/text-to-image",
        true
      ),
      "bytedance/seedream/v5/lite/edit"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias(
        "bytedance/seedream/v5/flash/text-to-image",
        true
      ),
      "bytedance/seedream/v5/flash/edit"
    );
    assert.equal(
      resolverEndpointImagenSegunReferencias(
        "fal-ai/bytedance/seedream/v4.5/text-to-image",
        true
      ),
      "fal-ai/bytedance/seedream/v4.5/edit"
    );
    assert.equal(
      validarModelosFal(
        "bytedance/seedream/v5/pro/text-to-image",
        "fal-ai/kling-video/v3/pro/image-to-video"
      ).esValido,
      true
    );

    // 3. Normalización de aspect ratio y image_size para fal.ai / Seedream
    assert.equal(normalizarAspectRatioFal("16:9"), "16:9");
    assert.equal(normalizarAspectRatioFal("9:16"), "9:16");
    assert.equal(normalizarAspectRatioFal("1:1"), "1:1");
    assert.equal(normalizarAspectRatioFal("4:5"), "3:4");
    assert.equal(normalizarAspectRatioFal("21:9"), "16:9");
    assert.equal(normalizarImageSizeSeedream("16:9"), "landscape_16_9");
    assert.equal(normalizarImageSizeSeedream("9:16"), "portrait_16_9");
    assert.equal(normalizarImageSizeSeedream("1:1"), "square_hd");
    assert.equal(normalizarImageSizeSeedream("4:5"), "portrait_4_3");
    assert.equal(normalizarImageSizeSeedream("4:3"), "landscape_4_3");

    // 4. Inyección de Láminas 360° por escena
    const laminasSimuladas = [
      {
        id: "lam_1",
        nombreReferencia: "Leo Focal.png",
        urlReferenciaOriginal: "https://ejemplo.com/leo.png",
        tipo: "personaje" as const,
        urlLamina360: "https://storage.ejemplo.com/lamina_leo.png",
        promptUsado: promptPersonaje,
        fechaCreacion: "2026-10-26T00:00:00.000Z",
        estado: "lista" as const,
      },
      {
        id: "lam_2",
        nombreReferencia: "Mia Focal.png",
        urlReferenciaOriginal: "https://ejemplo.com/mia.png",
        tipo: "personaje" as const,
        urlLamina360: "https://storage.ejemplo.com/lamina_mia.png",
        promptUsado: promptPersonaje,
        fechaCreacion: "2026-10-26T00:00:00.000Z",
        estado: "lista" as const,
      },
    ];

    const urlsEscenaConLeoYMia = seleccionarLaminasParaEscena(
      ["Leo Focal.png", "Mia Focal.png"],
      laminasSimuladas
    );
    assert.equal(urlsEscenaConLeoYMia.length, 2);
    assert.ok(urlsEscenaConLeoYMia.includes("https://storage.ejemplo.com/lamina_leo.png"));
    assert.ok(urlsEscenaConLeoYMia.includes("https://storage.ejemplo.com/lamina_mia.png"));

    const urlsEscenaSoloLeo = seleccionarLaminasParaEscena(
      ["Leo Focal.png"],
      laminasSimuladas
    );
    assert.equal(urlsEscenaSoloLeo.length, 1);
    assert.equal(urlsEscenaSoloLeo[0], "https://storage.ejemplo.com/lamina_leo.png");
  });

  it("Biblioteca Global SHA-256 y Sistema de Vestuario Contextual por Escenario (Consultorio, Gimnasio, Playa, Casa)", async () => {
    // 1. Huella digital SHA-256 determinista y deduplicación en memoria
    const bytesDoctora = new TextEncoder().encode("imagen-doctora-bata-blanca-12345");
    const hash1 = await calcularHashArchivoSHA256(bytesDoctora);
    const hash2 = await calcularHashArchivoSHA256(bytesDoctora);
    assert.equal(hash1.length, 64);
    assert.equal(hash1, hash2);

    const rutaStorage = construirRutaStorageBiblioteca(hash1, "Doctora Elena.jpg");
    assert.equal(rutaStorage, `biblioteca/${hash1}_Doctora_Elena.jpg`);
    assert.equal(detectarCategoriaActivoPorNombreYTipo("Doctora Elena.jpg", "imagen"), "personaje");
    assert.equal(detectarCategoriaActivoPorNombreYTipo("Botella Agua.png", "imagen"), "producto");
    assert.equal(detectarCategoriaActivoPorNombreYTipo("Cancion.mp3", "audio"), "audio");

    const deduplicacion = deduplicarArchivosPorHashEnMemoria(
      [{ id: hash1, hashArchivo: hash1, url: "https://storage.ejemplo.com/doctora.jpg" }],
      { id: "nuevo", hashArchivo: hash2, url: "https://storage.ejemplo.com/duplicado.jpg" }
    );
    assert.equal(deduplicacion.yaExiste, true);
    assert.equal(deduplicacion.activoExistente?.url, "https://storage.ejemplo.com/doctora.jpg");
    assert.equal(
      construirClaveCacheLamina360("vestuario_gimnasio", "3d_pixar"),
      "vestuario_gimnasio__3d_pixar"
    );

    // 2. Separación estricta Bloque A (identidadFisicaInmutable) vs Bloque B (vestuarioOriginalFoto)
    const desglose = construirDesgloseIdentidadYVestuario(
      [{ nombre: "Doctora.jpg", url: "https://storage.ejemplo.com/doctora.jpg" }],
      JSON.stringify({
        resumenVisual: "Doctora de 32 años con bata blanca.",
        personajesSeparados: [
          {
            nombreArchivo: "Doctora.jpg",
            identidadFisicaInmutable:
              "Mujer de 32 años, rostro ovalado, ojos cafés almendrados, piel trigueña clara, cabello castaño oscuro recogido, gafas de montura fina dorada.",
            vestuarioOriginalFoto:
              "Bata blanca médica de doctora sobre blusa clínica azul (vestuario_base adaptable según el escenario).",
          },
        ],
      }),
      "Un día en la vida de la doctora: en su consultorio, entrenando en el gimnasio, descansando en la playa y llegando a casa."
    );

    assert.equal(desglose.personajesSeparados.length, 1);
    assert.ok(desglose.personajesSeparados[0].identidadFisicaInmutable.includes("32 años"));
    assert.ok(desglose.personajesSeparados[0].vestuarioOriginalFoto.includes("Bata blanca"));

    // 2.1 Limpieza de JSON roto y extracción individual de Ficha Técnica por personaje (Leo y Mía)
    const fichaLeo = extraerFichaTecnicaDeUnaImagen(
      "Leo Focal.png",
      "https://storage.ejemplo.com/leo.png",
      "APARIENCIA_Y_RASGOS_FISICOS: Niño pequeño de 5 años en estilo animación 3D Pixar, cabello castaño despeinado, ojos grandes color miel y mejillas sonrosadas.\nROPA_Y_CALZADO_EN_FOTO: Camiseta de manga corta a rayas horizontales rojas y blancas, shorts azules de mezclilla y zapatillas deportivas rojas."
    );
    assert.ok(fichaLeo.identidadFisicaInmutable.includes("Niño pequeño de 5 años"));
    assert.ok(fichaLeo.vestuarioOriginalFoto.includes("rayas horizontales rojas y blancas"));
    assert.ok(!fichaLeo.identidadFisicaInmutable.includes("APARIENCIA_Y_RASGOS_FISICOS"));

    const textoAntiguoConJsonRoto =
      'Rasgos físicos inmutables de Leo Focal.png (edad exacta): { "resumenVisual": "Leo es un niño con cabello castaño despeinado y camiseta a rayas rojas y blancas.';
    const textoYaLimpio = limpiarTextoFichaTecnica(textoAntiguoConJsonRoto);
    assert.ok(!textoYaLimpio.includes("{"));
    assert.ok(!textoYaLimpio.includes("resumenVisual"));
    assert.ok(textoYaLimpio.includes("Leo es un niño"));

    // 3. Armario de Vestuario Contextual y Regla de Consistencia por Lugar (Escenas 3, 4 y 9 en el gimnasio)
    const escenasDePrueba = [
      {
        idEscena: "escena_1",
        numero: 1,
        titulo: "Consultorio por la mañana",
        tiempoInicioSeg: 0,
        tiempoFinSeg: 5,
        duracionSegundos: 5,
        justificacionDuracion: "Apertura clínica",
        letraODialogo: "Atendiendo pacientes en el consultorio médico",
        descripcionVisual: "La doctora revisa un expediente en su consultorio.",
        promptImagenAncla: "Doctor checking chart in clinic.",
        promptVideoAnimacion: "Subtle camera push in.",
        archivosReferenciaUsados: ["Doctora.jpg"],
        requiereLipSync: true,
      },
      {
        idEscena: "escena_3",
        numero: 3,
        titulo: "Entrenamiento en el gimnasio (Parte 1)",
        tiempoInicioSeg: 5,
        tiempoFinSeg: 10,
        duracionSegundos: 5,
        justificacionDuracion: "Acción dinámica",
        letraODialogo: "Levantando pesas en el gimnasio",
        descripcionVisual: "La doctora entrena con mancuernas en el gimnasio.",
        promptImagenAncla: "Training with dumbbells at the gym.",
        promptVideoAnimacion: "Tracking shot.",
        archivosReferenciaUsados: ["Doctora.jpg"],
        requiereLipSync: false,
      },
      {
        idEscena: "escena_4",
        numero: 4,
        titulo: "Entrenamiento en el gimnasio (Parte 2)",
        tiempoInicioSeg: 10,
        tiempoFinSeg: 15,
        duracionSegundos: 5,
        justificacionDuracion: "Continuidad de ejercicio",
        letraODialogo: "Corriendo en la cinta del gimnasio",
        descripcionVisual: "Continúa su rutina de ejercicio en el gimnasio.",
        promptImagenAncla: "Running on treadmill at the gym.",
        promptVideoAnimacion: "Side profile shot.",
        archivosReferenciaUsados: ["Doctora.jpg"],
        requiereLipSync: false,
      },
      {
        idEscena: "escena_7",
        numero: 7,
        titulo: "Tarde frente al mar en la playa",
        tiempoInicioSeg: 15,
        tiempoFinSeg: 20,
        duracionSegundos: 5,
        justificacionDuracion: "Relajación en playa",
        letraODialogo: "Caminando por la arena de la playa",
        descripcionVisual: "Camina junto a las olas de la playa al atardecer.",
        promptImagenAncla: "Walking on the beach at sunset.",
        promptVideoAnimacion: "Wide cinematic pan.",
        archivosReferenciaUsados: ["Doctora.jpg"],
        requiereLipSync: false,
      },
      {
        idEscena: "escena_9",
        numero: 9,
        titulo: "Estiramiento final en el gimnasio",
        tiempoInicioSeg: 20,
        tiempoFinSeg: 25,
        duracionSegundos: 5,
        justificacionDuracion: "Regreso al gimnasio",
        letraODialogo: "Última serie en el gimnasio",
        descripcionVisual: "Termina su entrenamiento en el gimnasio con energía.",
        promptImagenAncla: "Finishing workout at the gym.",
        promptVideoAnimacion: "Heroic low angle.",
        archivosReferenciaUsados: ["Doctora.jpg"],
        requiereLipSync: false,
      },
    ];

    const armario = construirArmarioVestuariosContextual(
      "La doctora va del consultorio al gimnasio, luego a la playa y a su casa",
      escenasDePrueba.map((e) => `${e.titulo} ${e.descripcionVisual}`),
      ["Doctora.jpg"],
      desglose.personajesSeparados
    );

    const idsArmario = armario.map((a) => a.idVestuario);
    assert.ok(idsArmario.includes("vestuario_base"));
    assert.equal(armario[0].escenarioOLugar, "Ropa original de la foto de referencia");
    assert.ok(!armario[0].escenarioOLugar.toLowerCase().includes("consultorio"));
    assert.ok(idsArmario.includes("vestuario_gimnasio"));
    assert.ok(idsArmario.includes("vestuario_playa"));
    assert.ok(idsArmario.includes("vestuario_casa"));

    // Verificamos que si el usuario pide mantener la ropa fija ("no les puede cambiar la ropa"), SOLO se cree vestuario_base
    const armarioRopaFija = construirArmarioVestuariosContextual(
      "Son dos niños bailando en la playa y el gimnasio, pero no les puede cambiar la ropa",
      ["Bailando en la playa", "Saltando en el gimnasio"],
      ["Leo.png", "Mia.png"],
      []
    );
    assert.equal(armarioRopaFija.length, 1);
    assert.equal(armarioRopaFija[0].idVestuario, "vestuario_base");

    // Verificamos que cualquier escenario libre sugerido por el Guionista o el usuario (ej. Cocina, Espacio, Nieve) funcione de forma general
    const armarioPersonalizado = construirArmarioVestuariosContextual(
      "Un chef que viaja a la nieve",
      ["Cocinando en el restaurante", "Caminando en la montaña nevada"],
      ["Chef.png"],
      [],
      [
        {
          idVestuario: "vestuario_nieve",
          nombrePersonaje: "General",
          escenarioOLugar: "Montaña nevada",
          descripcionVestuario: "Abrigo térmico grueso, gorro de lana y botas de nieve.",
        },
      ]
    );
    assert.equal(
      detectarIdVestuarioSegunTextoEscena(
        "El chef camina por la montaña nevada bajo la tormenta",
        armarioPersonalizado
      ),
      "vestuario_nieve"
    );

    const escenasConVestuario = aplicarConsistenciaArmarioAEscenas(
      escenasDePrueba,
      armario,
      desglose.personajesSeparados
    );

    const escConsultorio = escenasConVestuario.find((e) => e.numero === 1)!;
    const escGym3 = escenasConVestuario.find((e) => e.numero === 3)!;
    const escGym4 = escenasConVestuario.find((e) => e.numero === 4)!;
    const escPlaya7 = escenasConVestuario.find((e) => e.numero === 7)!;
    const escGym9 = escenasConVestuario.find((e) => e.numero === 9)!;

    assert.equal(escConsultorio.idVestuarioAsignado, "vestuario_base");
    assert.equal(escGym3.idVestuarioAsignado, "vestuario_gimnasio");
    assert.equal(escGym4.idVestuarioAsignado, "vestuario_gimnasio");
    assert.equal(escGym9.idVestuarioAsignado, "vestuario_gimnasio");
    assert.equal(escPlaya7.idVestuarioAsignado, "vestuario_playa");

    // Verificamos que palabras como "calmar" o "armario" jamás activen vestuario_playa ("mar")
    assert.equal(
      detectarIdVestuarioSegunTextoEscena(
        "Manos a la panza, vamos a calmar al monstruo del enojo"
      ),
      "vestuario_base"
    );
    assert.equal(
      detectarIdVestuarioSegunTextoEscena(
        "Caminando por la playa frente al mar"
      ),
      "vestuario_playa"
    );

    // Verificamos que las Escenas 3, 4 y 9 en el gimnasio tengan EXACTAMENTE la misma ropa deportiva + identidad inmutable
    assert.equal(escGym3.descripcionVestuarioEscena, escGym4.descripcionVestuarioEscena);
    assert.equal(escGym4.descripcionVestuarioEscena, escGym9.descripcionVestuarioEscena);
    assert.ok(escGym3.promptImagenAncla.includes("32 años"));
    assert.ok(escGym9.promptImagenAncla.includes("vestuario_gimnasio"));

    // 4. Selección de Lámina 360° correspondiente al idVestuarioAsignado de la escena
    const promptLaminaGym = construirPromptLamina360(
      "personaje",
      "Doctora.jpg",
      "realista_cinematografico",
      "Doctora de 32 años",
      {
        idVestuario: "vestuario_gimnasio",
        descripcionVestuario: escGym3.descripcionVestuarioEscena,
        identidadFisicaInmutable: desglose.personajesSeparados[0].identidadFisicaInmutable,
      }
    );
    assert.ok(promptLaminaGym.includes("vestuario_gimnasio"));
    assert.ok(promptLaminaGym.includes("REPLACE their original clothing"));

    const laminasDelArmario = [
      {
        id: "lam_doc_base",
        nombreReferencia: "Doctora.jpg",
        urlReferenciaOriginal: "https://ejemplo.com/doc.jpg",
        tipo: "personaje" as const,
        urlLamina360: "https://storage.ejemplo.com/lamina_doc_base.png",
        promptUsado: "",
        fechaCreacion: "2026-10-26T00:00:00.000Z",
        estado: "lista" as const,
        idVestuario: "vestuario_base",
      },
      {
        id: "lam_doc_gym",
        nombreReferencia: "Doctora.jpg",
        urlReferenciaOriginal: "https://ejemplo.com/doc.jpg",
        tipo: "personaje" as const,
        urlLamina360: "https://storage.ejemplo.com/lamina_doc_gimnasio.png",
        promptUsado: promptLaminaGym,
        fechaCreacion: "2026-10-26T00:00:00.000Z",
        estado: "lista" as const,
        idVestuario: "vestuario_gimnasio",
      },
      {
        id: "lam_doc_playa",
        nombreReferencia: "Doctora.jpg",
        urlReferenciaOriginal: "https://ejemplo.com/doc.jpg",
        tipo: "personaje" as const,
        urlLamina360: "https://storage.ejemplo.com/lamina_doc_playa.png",
        promptUsado: "",
        fechaCreacion: "2026-10-26T00:00:00.000Z",
        estado: "lista" as const,
        idVestuario: "vestuario_playa",
      },
    ];

    assert.deepEqual(
      seleccionarLaminasParaEscena(["Doctora.jpg"], laminasDelArmario, "vestuario_gimnasio"),
      ["https://storage.ejemplo.com/lamina_doc_gimnasio.png"]
    );
    assert.deepEqual(
      seleccionarLaminasParaEscena(["Doctora.jpg"], laminasDelArmario, "vestuario_playa"),
      ["https://storage.ejemplo.com/lamina_doc_playa.png"]
    );
    assert.deepEqual(
      seleccionarLaminasParaEscena(["Doctora.jpg"], laminasDelArmario, "vestuario_base"),
      ["https://storage.ejemplo.com/lamina_doc_base.png"]
    );
  });
});
