// Página de inicio (/) de VoxkyStudio que presenta la Mesa de Entrada (Paso 1).
// Se conecta directamente con el componente src/mesa_entrada/MesaDeEntrada.tsx.

import React from "react";
import { MesaDeEntrada } from "@/mesa_entrada/MesaDeEntrada";

/**
 * Muestra la pantalla principal de la Parte 1 donde el usuario inicia la producción de su video.
 * No recibe parámetros y devuelve el componente MesaDeEntrada.
 */
export default function PaginaInicio() {
  return <MesaDeEntrada />;
}
