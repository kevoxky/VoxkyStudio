// Pruebas automáticas simples para verificar las reglas de la Mesa de Entrada (Paso 1).
// Se conecta con src/mesa_entrada/validar_entrada_proyecto.ts y src/mesa_entrada/constantes_mesa_entrada.ts.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  construirRutaStorageReferencia,
  validarFormatoVideo,
  validarIdeaOriginal,
  validarImagenesReferencia,
} from "../src/mesa_entrada/validar_entrada_proyecto.ts";

describe("Validaciones de la Mesa de Entrada (Paso 1)", () => {
  it("rechaza una idea vacía y acepta una idea válida", () => {
    const resultadoVacio = validarIdeaOriginal("   ");
    assert.equal(resultadoVacio.esValido, false);

    const resultadoValido = validarIdeaOriginal(
      "Un comercial futurista de zapatillas corriendo bajo luces de neón."
    );
    assert.equal(resultadoValido.esValido, true);
  });

  it("solo permite los formatos 9:16 y 16:9", () => {
    assert.equal(validarFormatoVideo("9:16").esValido, true);
    assert.equal(validarFormatoVideo("16:9").esValido, true);
    assert.equal(validarFormatoVideo("1:1").esValido, false);
  });

  it("permite hasta 4 imágenes válidas y rechaza si se suben 5", () => {
    const fotoValida = {
      name: "personaje.png",
      size: 500_000,
      type: "image/png",
    };

    assert.equal(
      validarImagenesReferencia([fotoValida, fotoValida, fotoValida, fotoValida])
        .esValido,
      true
    );

    assert.equal(
      validarImagenesReferencia([
        fotoValida,
        fotoValida,
        fotoValida,
        fotoValida,
        fotoValida,
      ]).esValido,
      false
    );
  });

  it("construye la ruta de Firebase Storage dentro de referencias/{proyectoId}/", () => {
    const ruta = construirRutaStorageReferencia(
      "proyecto_abc123",
      0,
      "mi foto referencia.png"
    );
    assert.equal(ruta, "referencias/proyecto_abc123/1_mi_foto_referencia.png");
  });
});
