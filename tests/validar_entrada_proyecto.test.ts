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

  it("calcula el costo real por minuto y el presupuesto total según el modo y la duración", () => {
    const costoProMin = calcularCostoPorMinutoUSD(
      "google/nano-banana-2.1",
      "fal-ai/kling-video/v3/pro/image-to-video"
    );
    assert.equal(costoProMin, 7.4);
    assert.equal(
      detectarModoCalidad(
        "google/nano-banana-2.1",
        "fal-ai/kling-video/v3/pro/image-to-video"
      ),
      "pro"
    );
    const presupuesto30Seg = calcularPresupuestoTotalUSD(costoProMin, "30 seg");
    assert.equal(presupuesto30Seg, 3.7);
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
      validarModelosFal("fal-ai/nano-banana-pro", "fal-ai/veo3").esValido,
      true
    );
    assert.equal(validarIdiomaSalida("Français").esValido, true);
    assert.equal(
      construirRutaStorageReferencia("proy_1", 0, "mi cancion.mp3"),
      "referencias/proy_1/1_mi_cancion.mp3"
    );
  });
});
