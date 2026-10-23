// Puente seguro (proxy) en el servidor para comunicarse con fal.ai sin mostrar la clave secreta en el navegador.
// Se conecta con src/configuracion/cliente_fal.ts y lee la variable secreta FAL_KEY del archivo .env.

import { route } from "@fal-ai/server-proxy/nextjs";
import { NextRequest, NextResponse } from "next/server";

// Mensaje claro en español por si falta configurar la clave en el archivo .env
const MENSAJE_ERROR_FAL_KEY =
  "Falta configurar la clave secreta FAL_KEY en tu archivo .env. Guárdala y reinicia el servidor.";

/**
 * Verifica que la variable de entorno FAL_KEY exista en el servidor antes de enviar peticiones a fal.ai.
 * Recibe el texto de la clave (o vacío) y devuelve verdadero si está lista para usarse.
 */
function tieneClaveFalConfigurada(claveFal: string | undefined): boolean {
  return Boolean(claveFal && claveFal.trim().length > 0);
}

/**
 * Procesa las peticiones POST hacia fal.ai verificando primero que la llave secreta exista en el servidor.
 * Recibe la petición del navegador y devuelve la respuesta de fal.ai o un error explicativo en español.
 */
export async function POST(peticion: NextRequest) {
  if (!tieneClaveFalConfigurada(process.env.FAL_KEY)) {
    return NextResponse.json({ error: MENSAJE_ERROR_FAL_KEY }, { status: 500 });
  }
  return route.POST(peticion);
}

/**
 * Procesa las peticiones GET hacia fal.ai verificando primero que la llave secreta exista en el servidor.
 * Recibe la petición del navegador y devuelve la respuesta de fal.ai o un error explicativo en español.
 */
export async function GET(peticion: NextRequest) {
  if (!tieneClaveFalConfigurada(process.env.FAL_KEY)) {
    return NextResponse.json({ error: MENSAJE_ERROR_FAL_KEY }, { status: 500 });
  }
  return route.GET(peticion);
}

/**
 * Procesa las peticiones PUT (por ejemplo, subida de archivos a fal.ai) de manera segura desde el servidor.
 * Recibe la petición del navegador y devuelve la respuesta de fal.ai o un error explicativo en español.
 */
export async function PUT(peticion: NextRequest) {
  if (!tieneClaveFalConfigurada(process.env.FAL_KEY)) {
    return NextResponse.json({ error: MENSAJE_ERROR_FAL_KEY }, { status: 500 });
  }
  return route.PUT(peticion);
}
