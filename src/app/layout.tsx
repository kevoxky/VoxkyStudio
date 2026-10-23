// Estructura base de todas las páginas de VoxkyStudio (idioma español y estilos globales).
// Se conecta con src/app/globals.css y envuelve a src/app/page.tsx y src/app/estudio/[id]/page.tsx.

import React from "react";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VoxkyStudio · Producción Audiovisual con Agentes",
  description:
    "Estudio web de producción audiovisual asistido por agentes inteligentes.",
};

/**
 * Envuelve el contenido de cada pantalla de la aplicación dentro de la estructura HTML principal.
 * Recibe los elementos hijos de la página activa y devuelve el documento web completo.
 */
export default function DisenoRaiz({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
