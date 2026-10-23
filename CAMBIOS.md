# Registro de Cambios (CAMBIOS.md)

## 2026-10-23 — Perfiles de Producción con Precios Reales en USD (MCP fal.ai) y Tarjetas de Detalle (Tooltips)
- Se consultó el catálogo y precios oficiales mediante el servidor MCP de `fal.ai` (`get_pricing` y `search_models`) y se estructuraron las fichas técnicas reales en `constantes_mesa_entrada.ts`.
- Se creó `SelectorModeloConTooltip.tsx` con lista principal a la izquierda (`✓` y `💎`) y tarjeta flotante de información a la derecha (`CALIDAD`, `PRECIO REAL`, `VELOCIDAD`).
- Se añadió debajo de la tarjeta principal la barra flotante translúcida con los modos **⚡ Rápido**, **👑 Pro** y **✨ Máximo**, más el indicador en vivo de tarifa por minuto (`$/min`) y presupuesto total estimado del proyecto según la duración elegida.
- Se actualizaron `crear_documento_proyecto.ts`, `VistaEstudioInicial.tsx` y `tests/validar_entrada_proyecto.test.ts` para guardar y verificar `modoCalidad`, `costoEstimadoPorMinutoUSD` y `presupuestoTotalEstimadoUSD`.

## 2026-10-23 — Mejora de la Mesa de Entrada: Barra de Comando Unificada, Nuevos Formatos, Duración, Modelos e Idioma
- Se rediseñó `MesaDeEntrada.tsx` como una gran tarjeta blanca redondeada con el texto y la fila de miniaturas arriba, y una barra de herramientas inferior con botón `+` (sin límite de 4 fotos), píldoras desplegables de Formato, Duración, Modelo de Imagen, Modelo de Video, selector de Idioma y botón circular de envío (`↑`).
- Se ampliaron los formatos soportados a 6 relaciones de aspecto: `16:9`, `9:16`, `1:1`, `4:5`, `4:3` y `21:9`.
- Se añadió el selector de duración con cronómetro (`Auto`, `15 seg`, `30 seg`, `1 min`, `3 min`, `5 min`, `10 min` y `Custom` con cantidad numérica y `seg`/`min`), guardando `duracionObjetivo` y `toleranciaFlexible: true`.
- Se agregaron las píldoras azules de selección de `modeloImagen` y `modeloVideo` en `fal.ai`, y la constante interna `MODELOS_INTERNOS_POR_DEFECTO`.
- Se añadió el selector de `idiomaSalida` (`Español`, `English`, `Français`, `Português`, `Italiano`, `Deutsch`) documentando que este idioma manda sobre el idioma del prompt.
- Se actualizaron `crear_documento_proyecto.ts`, `VistaEstudioInicial.tsx` y las pruebas automáticas en `tests/validar_entrada_proyecto.test.ts`.

## 2026-10-23 — Conexión completa de Firebase (Proyecto voxkystudio) y MCP de fal.ai + Firebase
- Se creó el proyecto nuevo `VoxkyStudio` (`voxkystudio`) y su aplicación web en Firebase.
- Se guardaron automáticamente las 6 variables `NEXT_PUBLIC_FIREBASE_*` dentro de `.env` junto a `FAL_KEY`.
- Se activó la base de datos Cloud Firestore `(default)` en `voxkystudio` y se configuraron las reglas de seguridad (`firestore.rules` y `storage.rules`).
- Se dejaron conectados y activos los servidores MCP de `firebase` y `fal-ai` en `mcp_config.json` de Antigravity.

## 2026-10-23 — Rediseño en Colores Claros y Guardado en Git / GitHub
- Se actualizó el diseño visual completo de la Mesa de Entrada y de la Sala de Estudio a un tema luminoso de colores claros (fondo blanco y gris suave con acentos en índigo).
- Se guardaron los cambios en Git y se subió el proyecto al repositorio de GitHub (`https://github.com/kevoxky/VoxkyStudio.git`), verificando antes que `.env` esté excluido en `.gitignore`.

## 2026-10-22 — Paso 1: Mesa de Entrada, Seguridad de fal.ai y Estructura en Firebase
- Se creó la rama `paso-1-mesa-de-entrada` en Git (sin hacer commit automático).
- Se instalaron Next.js (App Router), Tailwind CSS, `@fal-ai/client`, `@fal-ai/server-proxy` y `firebase` sin vulnerabilidades de seguridad (`0 vulnerabilities` en `npm audit`).
- Se creó el túnel seguro en el servidor (`/api/fal/proxy`) para usar `FAL_KEY` desde el backend sin exponerla nunca en el navegador.
- Se configuró la conexión a Firebase Firestore (colección `proyectos`) y Firebase Storage (carpeta `referencias/{proyectoId}/`).
- Se construyó la interfaz de la **Mesa de Entrada** con un único contenedor centrado y sus 4 elementos: caja de texto para la idea, selector visual `9:16` / `16:9`, zona de arrastrar y soltar hasta 4 imágenes con miniaturas y botón `'Comenzar Producción'` con el indicador `'Preparando tu estudio...'`.
- Se configuró la redirección automática a `/estudio/[id]` con conexión en tiempo real al documento creado en Firestore.
- Se añadieron pruebas automáticas en `tests/validar_entrada_proyecto.test.ts`.
