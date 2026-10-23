// Configura el cliente de fal.ai para que funcione de forma segura desde el navegador.
// Se conecta con el túnel del servidor en src/app/api/fal/proxy/route.ts para no exponer nunca FAL_KEY.

import { fal } from "@fal-ai/client";

// Ruta interna de nuestro propio servidor que actúa como intermediario seguro (proxy)
export const RUTA_PROXY_FAL = "/api/fal/proxy";

/**
 * Inicializa la conexión con fal.ai indicando que todas las peticiones pasen por nuestro servidor.
 * No recibe parámetros y devuelve el cliente de fal.ai ya protegido.
 */
export function obtenerClienteFalSeguro() {
  // Configuramos proxyUrl para que el navegador jamás necesite conocer la clave secreta FAL_KEY
  fal.config({
    proxyUrl: RUTA_PROXY_FAL,
  });

  return fal;
}
