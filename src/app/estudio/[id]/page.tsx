// Página dinámica del estudio (/estudio/[id]) a la que se redirige al usuario tras crear su proyecto.
// Se conecta con src/estudio/VistaEstudioInicial.tsx pasándole el identificador único de la URL.

import React from "react";
import { VistaEstudioInicial } from "@/estudio/VistaEstudioInicial";

interface PropiedadesPaginaEstudio {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Lee el identificador del proyecto desde la dirección web (/estudio/[id]) y abre la sala del estudio.
 * Recibe los parámetros de la ruta y devuelve la vista en tiempo real del proyecto.
 */
export default async function PaginaEstudio({
  params,
}: PropiedadesPaginaEstudio) {
  const parametrosResueltos = await params;

  return <VistaEstudioInicial proyectoId={parametrosResueltos.id} />;
}
