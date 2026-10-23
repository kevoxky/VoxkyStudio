// Pruebas automáticas para verificar validaciones, perfiles de calidad (Rápido, Pro, Máximo) y cálculos en USD.
// Se conecta con src/mesa_entrada/validar_entrada_proyecto.ts y src/mesa_entrada/constantes_mesa_entrada.ts.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calcularCostoPorMinutoUSD,
  calcularPresupuestoTotalUSD,
  construirRutaStorageReferencia,
  detectarModoCalidad,
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

describe("Validaciones y Presupuesto en USD de la Mesa de Entrada", () => {
  it("rechaza una idea vacía y acepta una idea válida", () => {
    assert.equal(validarIdeaOriginal("   ").esValido, false);
    assert.equal(
      validarIdeaOriginal(
        "Un comercial cinematográfico de zapatillas corriendo bajo luces de neón."
      ).esValido,
      true
    );
  });

  it("acepta los 6 formatos de video y rechaza formatos desconocidos", () => {
    const formatosValidos = ["16:9", "9:16", "1:1", "4:5", "4:3", "21:9"];
    for (const formato of formatosValidos) {
      assert.equal(validarFormatoVideo(formato).esValido, true);
    }
    assert.equal(validarFormatoVideo("3:2").esValido, false);
  });

  it("acepta duraciones predefinidas ('Auto', '30 seg') y duraciones 'Custom: 7 min'", () => {
    assert.equal(validarDuracionObjetivo("Auto").esValido, true);
    assert.equal(validarDuracionObjetivo("30 seg").esValido, true);
    const customFormateado = formatearDuracionCustom(7, "min");
    assert.equal(customFormateado, "Custom: 7 min");
    assert.equal(validarDuracionObjetivo(customFormateado).esValido, true);
    assert.equal(validarDuracionObjetivo("Custom: 0 min").esValido, false);
  });

  it("valida los endpoints de modelos de imagen y video auditados con el MCP de fal.ai", () => {
    assert.equal(
      validarModelosFal(
        "google/nano-banana-2.1",
        "fal-ai/kling-video/v3/pro/image-to-video"
      ).esValido,
      true
    );
    assert.equal(
      validarModelosFal("fal-ai/nano-banana-pro", "fal-ai/veo3").esValido,
      true
    );
    assert.equal(
      validarModelosFal("modelo-invalido", "fal-ai/veo3").esValido,
      false
    );
    assert.ok(MODELOS_INTERNOS_POR_DEFECTO.voz);
  });

  it("calcula el costo real por minuto y el presupuesto total según el modo (Rápido, Pro, Máximo) y la duración", () => {
    // Modo Rápido: FLUX.1 Schnell ($0.003 x 12) + MiniMax H3 Max Turbo ($0.03 x 60) = $1.84 / min
    const costoRapidoMin = calcularCostoPorMinutoUSD(
      "fal-ai/flux/schnell",
      "minimax/h3-max-turbo/text-to-video"
    );
    assert.equal(costoRapidoMin, 1.84);
    assert.equal(
      detectarModoCalidad(
        "fal-ai/flux/schnell",
        "minimax/h3-max-turbo/text-to-video"
      ),
      "rapido"
    );

    // Modo Pro: Nano Banana 2.1 ($0.067 x 12) + Kling v3 Pro ($0.11 x 60) = $7.40 / min
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

    // Presupuesto para 30 seg en modo Pro: mitad de $7.40 = $3.70 USD
    const presupuesto30SegPro = calcularPresupuestoTotalUSD(
      costoProMin,
      "30 seg"
    );
    assert.equal(presupuesto30SegPro, 3.7);

    // Modo Personalizado al mezclar modelos de distintos perfiles
    assert.equal(
      detectarModoCalidad("fal-ai/flux/schnell", "fal-ai/veo3"),
      "personalizado"
    );

    assert.equal(
      validarDatosFinancierosProyecto("pro", costoProMin, presupuesto30SegPro)
        .esValido,
      true
    );
  });

  it("valida idiomas, imágenes sin límite de 4 fotos y ruta de Storage", () => {
    assert.equal(validarIdiomaSalida("Español").esValido, true);
    assert.equal(validarIdiomaSalida("English").esValido, true);

    const fotoValida = {
      name: "personaje.png",
      size: 500_000,
      type: "image/png",
    };
    assert.equal(
      validarImagenesReferencia(Array(6).fill(fotoValida)).esValido,
      true
    );

    const ruta = construirRutaStorageReferencia(
      "proyecto_abc123",
      0,
      "mi foto referencia.png"
    );
    assert.equal(ruta, "referencias/proyecto_abc123/1_mi_foto_referencia.png");
  });
});
