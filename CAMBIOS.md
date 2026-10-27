# Registro de Cambios (CAMBIOS.md)

## 2026-10-27 — Sistema Universal de Vestuario Contextual (Sin textos fijos de "Consultorio"), Visor/Editor de Prompt y Eliminación de Imágenes
- **Sistema de Vestuario 100% General y Adaptable a Cualquier Historia ([`gestor_vestuario_contextual.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/guionista/gestor_vestuario_contextual.ts), [`generador_guion_fal.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/guionista/generador_guion_fal.ts) y [`SeccionArmarioVestuario.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/SeccionArmarioVestuario.tsx))**:
  - Se eliminó por completo la referencia fija a *"Consultorio"* en `vestuario_base` (ahora se llama universalmente **`"Ropa original de la foto de referencia"`** y auto-corrige cualquier proyecto previo que tuviera escrito *"Consultorio"*).
  - Si el usuario indica en su idea que **no quiere cambios de ropa** (*"no les puede cambiar la ropa"*, *"mantener la misma ropa"*), el sistema respeta esa instrucción y asigna únicamente `vestuario_base` a todas las escenas.
  - Se corrigió la búsqueda de escenarios con límites de palabra exacta para que palabras como *"calmar"* jamás activen por accidente `vestuario_playa` (*"mar"*).
  - Ahora el Agente Guionista o el propio usuario (mediante el botón **`➕ Añadir vestuario para otro escenario`** en el Paso 3) pueden crear vestuarios para **cualquier profesión, época o lugar** (Cocina, Montaña nevada, Espacio, Escuela, Fiesta, Deporte, Pijama, etc.) y también quitarlos con **`🗑️ Quitar vestuario`**.
- **Ver y Editar el Prompt Enviado + Selector de Modelo por Tarjeta ([`PantallaLaminas360Paso3.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PantallaLaminas360Paso3.tsx) y [`PantallaStoryboardPaso4.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PantallaStoryboardPaso4.tsx))**:
  - En cada Lámina 360° (Paso 3) y en cada toma del Storyboard (Paso 4) se añadió el botón **`📝 Ver / Editar Prompt`**, que muestra el prompt exacto que se envió a la IA en una caja editable, junto con un selector directo de modelo (`Seedream 5.0 Pro`, `Seedream 5.0 Lite`, `Seedream 4.5`, `Nano Banana 2.1`, `Nano Banana Pro 4K`, `FLUX Kontext Pro`, etc.) y el botón **`✨ Regenerar con este Prompt y Modelo`**.
- **Botón `🗑️ Eliminar` en Láminas 360° y Tomas del Storyboard ([`/api/agentes/generar-laminas-360/route.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/app/api/agentes/generar-laminas-360/route.ts) y [`/api/agentes/generar-imagenes-escenas/route.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/app/api/agentes/generar-imagenes-escenas/route.ts))**:
  - Si una Lámina 360° no convence al usuario, el botón **`🗑️ Eliminar`** la borra del proyecto y también limpia su caché en `biblioteca_activos` (`eliminarLaminaDeBibliotecaFirestore`) para que no vuelva a reaparecer automáticamente como reutilizada.
  - En el Storyboard (Paso 4), el botón **`🗑️ Eliminar`** quita la imagen actual de la toma y la deja limpia para regenerar.

## 2026-10-26 — Modelos Duales ByteDance Seedream (5.0 Pro/Lite/Flash y 4.5), Fichas Técnicas Individuales y Botón de Ajustes (`⚙️ Settings`)
- **Modelos Oficiales ByteDance Seedream Duales en `fal.ai` ([`constantes_mesa_entrada.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/mesa_entrada/constantes_mesa_entrada.ts))**:
  - Se añadieron al catálogo `MODELOS_IMAGEN_FAL` los 4 motores oficiales de ByteDance auditados vía MCP:
    - `bytedance/seedream/v5/pro/text-to-image` $\leftrightarrow$ `bytedance/seedream/v5/pro/edit` (**Seedream 5.0 Pro (Dual)**, `~$0.068 / img`, hasta 10 referencias).
    - `bytedance/seedream/v5/lite/text-to-image` $\leftrightarrow$ `bytedance/seedream/v5/lite/edit` (**Seedream 5.0 Lite (Dual)**, `~$0.035 / img`).
    - `bytedance/seedream/v5/flash/text-to-image` $\leftrightarrow$ `bytedance/seedream/v5/flash/edit` (**Seedream 5.0 Flash (Dual)**, `~$0.027 / img`).
    - `fal-ai/bytedance/seedream/v4.5/text-to-image` $\leftrightarrow$ `fal-ai/bytedance/seedream/v4.5/edit` (**Seedream 4.5 (Dual)**, `~$0.040 / img`).
  - Se actualizó [`generador_laminas_360.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/director_arte/generador_laminas_360.ts) y [`generador_imagenes_escenas.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/director_arte/generador_imagenes_escenas.ts) (`normalizarImageSizeSeedream`) para enrutar automáticamente a `/edit` con `image_urls` cuando hay referencias o a `/text-to-image` cuando no las hay, utilizando el parámetro oficial `image_size` (`portrait_4_3`, `landscape_16_9`, `portrait_16_9`, `square_hd`).
- **Botón y Modal de Ajustes del Estudio (`⚙️ Ajustes` en [`ModalAjustesEstudio.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/ModalAjustesEstudio.tsx) y [`VistaEstudioInicial.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/VistaEstudioInicial.tsx))**:
  - Se agregó el botón `⚙️ Ajustes` en la barra superior de la Sala de Estudio (`/estudio/[id]`).
  - Permite cambiar en vivo el Perfil de Calidad (`⚡ Rápido`, `👑 Pro`, `✨ Máximo`), el Modelo de Imagen (Seedream, Nano Banana, FLUX Kontext, Recraft, GPT Image), el Modelo de Video, el Estilo Visual, el Formato de Pantalla y el Idioma de Salida, recalculando el presupuesto y guardándolo al instante en Firestore.
- **Fichas Técnicas Individuales por Personaje ([`inspector_multimodal_fal.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/analista_clarificador/inspector_multimodal_fal.ts) y [`PanelClarificacionDirector.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PanelClarificacionDirector.tsx))**:
  - Cada imagen subida se inspecciona de forma individual en paralelo con etiquetas limpias (`APARIENCIA_Y_RASGOS_FISICOS:` y `ROPA_Y_CALZADO_EN_FOTO:`), mostrando tarjetas con miniatura de foto, auto-limpieza de JSON antiguo y botón *"🔄 Actualizar fichas técnicas"*.

## 2026-10-26 — Biblioteca Global de Activos con Deduplicación SHA-256 y Sistema de Vestuario Contextual por Escenario
- **1. Biblioteca Global Reutilizable y Deduplicación Anti-Duplicados (`src/biblioteca/` y `biblioteca_activos`)**:
  - Se creó [`tipos_biblioteca.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/biblioteca/tipos_biblioteca.ts) y [`gestor_biblioteca_activos.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/biblioteca/gestor_biblioteca_activos.ts) con cálculo de huella digital `SHA-256` (`crypto.subtle.digest`) en el navegador antes de subir cualquier archivo.
  - Se actualizaron y desplegaron [`firestore.rules`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/firestore.rules) (`biblioteca_activos/{activoId}`) y [`storage.rules`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/storage.rules) (`/biblioteca/{nombreArchivo}`).
  - En [`subir_imagenes_referencia.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/mesa_entrada/subir_imagenes_referencia.ts), si un archivo con el mismo `hashArchivo` ya existe en `biblioteca_activos`, no vuelve a subirse: reutiliza su `url`, su `fichaIdentidadBase` y sus Láminas 360° previas. Si es nuevo, se sube una sola vez a `biblioteca/{hashArchivo}_{nombre}` y queda registrado para futuros proyectos.
- **2. Selector de Biblioteca en la Mesa de Entrada ([`ModalBibliotecaActivos.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/biblioteca/ModalBibliotecaActivos.tsx) y [`ZonaImagenesReferencia.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/mesa_entrada/ZonaImagenesReferencia.tsx))**:
  - Al pulsar el botón `+` en la Mesa de Entrada, se despliega el menú con las 2 opciones:
    1. *"💻 Subir archivo nuevo desde mi equipo"* (con detección automática anti-duplicados SHA-256).
    2. *"📚 Elegir de Mi Biblioteca (Personajes y Productos guardados)"*: abre una galería visual con filtros (*Todos*, *Personajes*, *Productos*, *Audios*) e insignia *"✨ Lámina 360° lista (Ahorro activo)"* en los activos que ya cuentan con hoja de giro.
- **3. Separación de "Identidad Física Inmutable" vs. "Vestuario Base" en Paso 2 ([`inspector_multimodal_fal.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/analista_clarificador/inspector_multimodal_fal.ts))**:
  - Se actualizó el Analista de Visión y [`PanelClarificacionDirector.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PanelClarificacionDirector.tsx) para dividir cada personaje en:
    - **Bloque A — `identidadFisicaInmutable`**: Edad exacta, forma del rostro, ojos, cejas, nariz, boca, tono de piel, corte/color de cabello, complexión corporal y accesorios fijos.
    - **Bloque B — `vestuarioOriginalFoto`**: Ropa detallada en la foto (`vestuario_base`) adaptable cuando la historia ocurre en otro escenario.
- **4. Armario de Vestuario Consistente por Lugar (`armarioVestuarios`) en el Guionista ([`gestor_vestuario_contextual.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/guionista/gestor_vestuario_contextual.ts) y [`generador_guion_fal.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/guionista/generador_guion_fal.ts))**:
  - Cuando la historia ocurre en múltiples lugares (ej. consultorio, gimnasio, playa, casa, dormir, fiesta), el Guionista crea `armarioVestuarios` y asigna `idVestuarioAsignado` a cada escena garantizando que todas las tomas de un mismo lugar (ej. Escenas 3, 4 y 9 en el gimnasio) inyecten exactamente el mismo atuendo sumado a la `identidadFisicaInmutable`.
- **5. Láminas 360° Adaptadas al Vestuario y Reutilización Automática ([`generador_laminas_360.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/director_arte/generador_laminas_360.ts), [`PantallaLaminas360Paso3.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PantallaLaminas360Paso3.tsx) y [`generador_imagenes_escenas.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/director_arte/generador_imagenes_escenas.ts))**:
  - Si ya existe una Lámina 360° en `biblioteca_activos` para el vestuario y estilo visual elegido, se reutiliza gratis sin llamar a `fal.ai`.
  - Si hay vestuarios nuevos en `armarioVestuarios` (`vestuario_gimnasio`, `vestuario_playa`, etc.), permite generar Láminas 360° de vestuario con `google/nano-banana-2.1/edit` conservando el 100% del rostro/cuerpo e inyectando la lámina exacta en cada escena según su `idVestuarioAsignado`.
- **Pruebas y Verificación**: 11 pruebas automáticas pasando al 100% en `tests/validar_entrada_proyecto.test.ts` y compilación de producción (`npm run build`) limpia con 0 errores.

## 2026-10-26 — Modelos Duales Inteligentes (Text-to-Image / Image-to-Image Autoadaptables)
- **Catálogo de Modelos Duales en [`constantes_mesa_entrada.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/mesa_entrada/constantes_mesa_entrada.ts)**:
  - Se homogeneizó el catálogo para que todos los modelos de imagen soporten los dos modos de trabajo sin fallos:
    - `google/nano-banana-2.1` $\leftrightarrow$ `google/nano-banana-2.1/edit` (hasta 14 referencias).
    - `fal-ai/nano-banana-pro` $\leftrightarrow$ `fal-ai/nano-banana-pro/edit` (4K y branding de alta gama).
    - `fal-ai/flux-pro/kontext` $\leftrightarrow$ `fal-ai/flux-pro/kontext/text-to-image` (FLUX oficial conmutador).
    - `fal-ai/flux-kontext/dev` $\leftrightarrow$ `fal-ai/flux/dev` (FLUX rápido y económico).
    - `fal-ai/recraft/v3` $\leftrightarrow$ `fal-ai/recraft/v3/image-to-image` (Diseño, vectores e ilustración).
    - `openai/gpt-image-2` $\leftrightarrow$ `openai/gpt-image-2/edit` (Escenas complejas y texto denso).
- **Enrutador Dinámico `resolverEndpointImagenSegunReferencias`**:
  - Implementado en [`generador_laminas_360.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/director_arte/generador_laminas_360.ts) y [`generador_imagenes_escenas.ts`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/agentes/director_arte/generador_imagenes_escenas.ts).
  - Si la escena tiene personajes o láminas 360°, enruta a la variante `/edit` o `/kontext` pasando `image_urls`.
  - Si la escena es un paisaje o plano ambiental sin referencias, conmuta automáticamente a la variante Text-to-Image pura con máxima resolución sin errores de parámetros.
- **Pruebas y Verificación**: 10 tests ejecutados satisfactoriamente en `tests/validar_entrada_proyecto.test.ts` y compilación de producción de Next.js (`npm run build`) completada con código 0.

## 2026-10-26 — Experiencia Wizard por Pantallas (Cero Scroll Infinito) y Auditoría Oficial de Modelos fal.ai
- **Auditoría MCP fal.ai de Modelos de Video**:
  - Se consultó el catálogo oficial en vivo vía MCP (`search_models`, `get_pricing`):
    - `minimax/h3-max-turbo/image-to-video` ($0.03/s): Previsualización económica y veloz.
    - `minimax/h3-max/reference-to-video` ($0.05/s): Movimientos suaves respetando referencias visuales.
    - `alibaba/wan-3.0-prime/reference-to-video` ($0.05/s): Motor SOTA multimodal recomendado por fal.ai para consistencia de personajes.
    - `fal-ai/kling-video/v3/pro/image-to-video` ($0.14/s): Movimiento cinematográfico profesional y audio nativo.
    - `bytedance/seedance-2.5/us/image-to-video`: Producción ultra cinematográfica con dinamismo de cámara.
  - Se eliminó el endpoint descontinuado `fal-ai/veo3` y se ajustaron los perfiles de producción.
- **Cabecera Compacta y Modal de Detalles (`ModalDetallesProyecto.tsx`)**:
  - Reemplazo de bloques fijos superiores por una cabecera minimalista de una sola línea con ID, categoría, presupuesto y el botón *"📋 Ver idea y archivos"*, que abre un modal flotante sin consumir espacio de pantalla.
- **Barra de Etapas Superior (Stepper Interactivo `BarraPasosEstudio.tsx`)**:
  - 5 pantallas independientes: (1) Análisis y Clarificación, (2) Guion y Escaleta, (3) Láminas 360° y Estilo, (4) Storyboard Visual, y (5) Producción AV y Descarga.
  - Navegación libre entre pasos ya desbloqueados o completados, y protección contra saltos hacia etapas no aprobadas aún.
- **Renderizado Exclusivo de la Pantalla Activa en `VistaEstudioInicial.tsx`**:
  - Se eliminó el scroll infinito vertical apilado. Solo se renderiza el paso activo (`pasoVisualActivo: 1 | 2 | 3 | 4 | 5`).
  - Auto-avance inteligente según el estado guardado en Firestore.
- **Pantallas Modulares Especializadas**:
  - Creada [`PantallaLaminas360Paso3.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PantallaLaminas360Paso3.tsx) para la Fase 3 (Estilos y Láminas 360°).
  - Creada [`PantallaStoryboardPaso4.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PantallaStoryboardPaso4.tsx) para la Fase 4 (Tira de láminas activas y keyframes por escena con regeneración).
  - Creada [`PantallaProduccionPaso5.tsx`](file:///c:/Users/kevin/Desktop/Proyectos%20IA/VoxkyStudio/src/estudio/PantallaProduccionPaso5.tsx) para la Fase 5 (Preparación audiovisual y renderizado).
- **Pruebas y Verificación**: `npm test` al 100% (10 tests) y `npm run build` completado con éxito con todas las rutas estáticas y dinámicas optimizadas.

## 2026-10-26 — Paso 4: Enrutador Imagen-a-Imagen Obligatorio, Catálogo de 9 Estilos Visuales y Conversión Artística
- **Enrutador Obligatorio Imagen-a-Imagen (`obtenerEndpointConReferencia`)**:
  - Se eliminó el uso de modelos texto-a-imagen aislados (`google/nano-banana-2.1`). Ahora, si el usuario sube fotos de referencia, se enruta obligatoriamente a los endpoints de edición que aceptan `image_urls` o `image_url` (`google/nano-banana-2.1/edit`, `fal-ai/nano-banana-pro/edit` y `fal-ai/flux-pro/kontext`).
  - Se garantiza que nunca se envíe el nombre del archivo como texto suelto, sino sus URLs reales alojadas en Firebase Storage / fal.storage.
- **Catálogo de 9 Estilos Visuales (`ESTILOS_VISUALES_PROYECTO`)**:
  - Se agregaron los 9 estilos oficiales con instrucciones cinematográficas en inglés: *🎨 Mantener estilo de la foto*, *🧸 3D Pixar / Animación Cine*, *📺 Cartoon 2D / Animación Clásica*, *🧶 Plastilina / Stop-Motion (Claymation)*, *🎬 Realista Cinematográfico 4K*, *🌸 Anime / Ghibli*, *💥 Cómic / Novela Gráfica*, *🧱 Mundo de Bloques / Juguete 3D*, y *🖌️ Cuento Ilustrado / Acuarela*.
- **Selectores de Estilo en Mesa de Entrada y en Vivo en la Sala de Estudio**:
  - Creado `src/mesa_entrada/SelectorEstiloVisual.tsx` e integrado en la barra de comando de `MesaDeEntrada.tsx`.
  - Integrado selector en tiempo real dentro de `PanelEstudioVisualPaso4.tsx` y `PanelGuionTimeline.tsx`, permitiendo cambiar el estilo visual del proyecto sin reiniciar y actualizándolo al instante en Firestore (`estiloVisualSeleccionado`).
- **Regla de Oro en Prompts de Láminas 360° y Escenas**:
  - Se eliminaron por completo las palabras forzadas `"photorealistic"` y `"skin texture"`.
  - Se formuló la regla innegociable de preservar 100% la identidad, edad, rostro, accesorios y vestimenta exacta (`exact clothing colors and patterns from the reference image`), mientras se aplica la transformación artística del estilo seleccionado.
  - En el Paso 4B, las imágenes ancla del Timeline inyectan las Láminas 360° y la instrucción de estilo para mantener la consistencia estética y narrativa en todo el video.
- **Pruebas y Verificación**: 10 tests ejecutados satisfactoriamente en `tests/validar_entrada_proyecto.test.ts` y 0 errores de tipado en TypeScript.

## 2026-10-26 — Paso 4: Generador de Láminas de Identidad 360° (Turnaround Sheets) y Generación de Keyframes del Storyboard
- Se creó la rama `paso-4-laminas-360-imagenes` en Git.
- **Duración Dinámica e Ilimitada**: Se verificó y eliminó cualquier límite fijo de 125s en `planificador_bloques_tiempo.ts`, `PanelClarificacionDirector.tsx` y `inspector_multimodal_fal.ts`. El Timeline ahora se adapta libremente a cualquier duración (15s, 4 min, 60 min o selección Custom).
- **Reglas de Storage**: Se actualizaron y desplegaron las reglas en Firebase Storage para permitir la ruta permanente de producción `/proyectos/{proyectoId}/{tipoCarpeta}/{nombreArchivo}`.
- **Historial de Proyectos**: Se construyó `src/mesa_entrada/HistorialProyectos.tsx` en la página principal con miniaturas, badges de estado, acceso directo a la sala y eliminación segura en Firestore.
- **Fase 4A — Láminas de Consistencia 360° (`src/agentes/director_arte/generador_laminas_360.ts` y `/api/agentes/generar-laminas-360`)**:
  - Transforma automáticamente cada imagen de referencia en una hoja de consistencia técnica de estudio (Turnaround Sheet) sobre fondo gris neutro `#808080`.
  - Personajes: incluye primer plano macro de rostro, grilla de rotación de cabeza y giros de cuerpo completo de 360° (poses T, frontal, trasera, caminando).
  - Productos: incluye packshot publicitario, detalles de logo/textura/etiqueta y giros de producto en 360°.
  - Descarga desde `fal.ai` y persiste de forma permanente en Firebase Storage (`proyectos/{proyectoId}/laminas_360/`).
- **Fase 4B — Keyframes por Escena (`src/agentes/director_arte/generador_imagenes_escenas.ts` y `/api/agentes/generar-imagenes-escenas`)**:
  - Recorre las tomas aprobadas del Timeline y genera imágenes de alta fidelidad en paralelo (concurrencia de 3 tomas simultáneas) respetando el formato elegido (`16:9`, `9:16`, etc.) y el modelo de imagen del proyecto (`recraft-v3`, `flux-pro`, etc.).
  - Inyecta las URLs de las Láminas 360° relevantes para mantener idénticos rostros, ropa y objetos entre tomas.
  - Guarda los archivos en Firebase Storage (`proyectos/{proyectoId}/escenas/escena_{numero}.png`) y actualiza `imagenAnclaUrl` y `estadoImagen: 'lista'` en Firestore.
  - Soporta regeneración individual de cualquier toma con un solo clic.
- **Interfaz del Estudio — Paso 4 (`src/estudio/PanelEstudioVisualPaso4.tsx`)**:
  - Galería de Láminas 360° con visor ampliado (zoom), descarga de imagen y regeneración técnica.
  - Storyboard visual con barra de progreso, visualización de cada toma generada y botón *"🎨 Regenerar esta toma"*.
  - Botón de aprobación final *"✅ Aprobar Todas las Imágenes y Pasar a Sonido y Video (Pasos 5 y 6) →"* que actualiza el estado a `'listo_para_produccion_av'`.
- **Pruebas y Verificación**: Se agregaron tests en `tests/validar_entrada_proyecto.test.ts` (10 pruebas pasando al 100%) y tipado TypeScript verificado con 0 errores.

## 2026-10-24 — Paso 3: Reconciliador 100% de Canciones (Whisper), Agente Guionista Cinematográfico y Timeline de Escenas
- Se creó la rama `paso-3-guionista-timeline` en Git.
- Se eliminó el límite de 25 segmentos en `inspector_multimodal_fal.ts` y se creó `src/agentes/analista_clarificador/reconciliador_letra_whisper.ts` (`reconciliarLetraYSegmentosCompletos` y `convertirChunksWhisperASegmentos`) para conservar el 100% de los chunks, resolver tiempos abiertos `[inicio, null]` y rescatar cualquier estrofa final con marcas de tiempo proporcionales hasta el último segundo del audio (ej. `90.8s` a `125.0s`).
- Se añadió en `ZonaImagenesReferencia.tsx` y `subir_imagenes_referencia.ts` la lectura automática de `duracionSegundos` en el navegador (`HTMLAudioElement` / `HTMLVideoElement`), y el botón `"🔄 Recalcular segmentos completos"` junto con la limpieza visual sin asteriscos (`**`) en `PanelClarificacionDirector.tsx`.
- Se construyó en `src/agentes/guionista/` (`tipos_guion.ts`, `planificador_bloques_tiempo.ts`, `generador_guion_fal.ts`) y `/api/agentes/generar-guion/route.ts` el **Agente Guionista Cinematográfico** con cobertura total sin saltos (`0.0s` hasta el final) y generación por bloques con `max_tokens: 16000`.
- Se creó `src/estudio/PanelGuionTimeline.tsx` e integró en `VistaEstudioInicial.tsx` con Línea de Tiempo horizontal interactiva (`0:00` a `2:05`), tarjetas de escena editables y botón de aprobación hacia `'listo_para_imagenes'`.
- Se agregaron pruebas automáticas en `tests/validar_entrada_proyecto.test.ts` verificando la reconciliación de letra hasta `125s` y la cobertura sin huecos del Timeline.

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
