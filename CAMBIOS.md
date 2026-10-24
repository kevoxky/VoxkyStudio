# Registro de Cambios (CAMBIOS.md)

## 2026-10-24 — Blindaje Multimedia del Paso 2: Subida con Respaldo fal.ai, Progreso en Vivo, Separación Visión/Whisper y Acordeón de Letra
- Se actualizaron `storage.rules` y `validar_entrada_proyecto.ts` para aceptar sin bloqueos `image/*`, `audio/*` y `video/*` (`.mp3`, `.wav`, `.m4a`, `.mp4`, `.mov`, `.webm`) de hasta 100 MB incluso cuando el navegador no envía tipo MIME estándar.
- Se blindó `subir_imagenes_referencia.ts` con límite de espera por archivo y **respaldo automático (`fal.storage.upload` vía `/api/fal/proxy`)** si Firebase Storage falla por reglas, CORS o timeout.
- Se actualizó `MesaDeEntrada.tsx` con estado de progreso paso a paso en vivo (*"Subiendo archivos multimedia (1 de 3)..."*, *"Guardando proyecto en la base de datos..."*, *"Entrando a la sala de estudio..."*) y bloque `try / catch / finally` estricto.
- Se reforzó la separación estricta en `inspector_multimodal_fal.ts` y `validar_entrada_proyecto.ts`: las imágenes van exclusivamente a `fal-ai/any-llm/vision` y los audios/videos van exclusivamente a `fal-ai/whisper` (`audio_url`).
- Se agregaron en `PanelClarificacionDirector.tsx` los acordeones desplegables limpios: *"👁️ Ficha de Identidad Visual (Clic para ver descripción)"* y *"🎵 Letra / Audio escuchado por el Agente (Clic para ver transcripción)"*.
- Se ampliaron las pruebas unitarias en `tests/validar_entrada_proyecto.test.ts` verificando el flujo con 1 canción `.mp3` + 2 imágenes `.png`.

## 2026-10-24 — Paso 2: Agente Productor Ejecutivo Multimodal, Clarificador Elástico y 5 Líneas de Producción
- Se creó la rama `paso-2-productor-ejecutivo` en Git.
- Se amplió la entrada en `src/mesa_entrada/` y `storage.rules` para soportar **Imágenes** (`.jpg`, `.png`, `.webp`), **Audios** (`.mp3`, `.wav`, `.m4a`) y **Videos** (`.mp4`, `.mov`, `.webm`), guardando en Firestore `archivosMultimedia` con `tipo: 'imagen' | 'audio' | 'video'` y `url`.
- Se construyó en `src/agentes/analista_clarificador/` el clasificador de las **5 especialidades** (`videoclip_musical`, `publicidad_comercial`, `contenido_redes_influencer`, `traduccion_doblaje_video`, `cine_serie_storyboard`), la inspección multimodal con `fal-ai/any-llm/vision` (Ojos) y `fal-ai/whisper` (Oídos con marcas de tiempo), y la **Regla de Clarificación Elástica (de 0 a N preguntas)**.
- Se crearon los endpoints desacoplados `/api/agentes/analizar-idea` y `/api/agentes/confirmar-clarificacion` preparados para VoxkyStudio y futuros Widgets/APIs B2B (`modoSilencioso: true`).
- Se creó `PanelClarificacionDirector.tsx` integrado en tiempo real dentro de `VistaEstudioInicial.tsx`.

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
