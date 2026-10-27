# Informe del Proyecto: VoxkyStudio

Este documento está escrito en lenguaje sencillo, sin tecnicismos, para que siempre tengas claro cómo funciona tu proyecto, qué hace cada pieza y qué pasos siguen.

---

## (a) ¿Qué es el proyecto y para qué sirve?
**VoxkyStudio** es un estudio de producción de video en internet impulsado por **agentes de inteligencia artificial** (ayudantes virtuales especializados).
Sirve para que tú solo tengas que escribir la idea de un video, elegir si lo quieres para celular (Vertical `9:16`) o para pantalla horizontal (YouTube `16:9`) y subir hasta 4 fotos de ejemplo (un personaje, un producto o un estilo visual). A partir de ahí, el estudio organiza el trabajo para transformar tu idea en una producción audiovisual.

---

## (b) ¿Cómo funciona, paso a paso y con ejemplos de la vida diaria?
Imagina que entras a una agencia de cine real:
1. **La Mesa de Entrada (Barra de Comando Unificada):** Llegas a una gran tarjeta blanca donde arriba escribes la idea de tu video y ves las miniaturas de todas las fotos de referencia que quieras adjuntar (ya sin límite de 4 fotos). Abajo, dentro de la misma caja, tienes todos los controles en forma de píldoras:
   - **Botón `+`**: Para adjuntar fotos de personajes, productos o estilos.
   - **Formato**: `16:9` (YouTube/Cine), `9:16` (TikTok/Reels), `1:1` (Cuadrado), `4:5` (Retrato), `4:3` (Clásico) o `21:9` (Ultra Panorámico).
   - **Duración (`duracionObjetivo` + `toleranciaFlexible: true`)**: Por defecto en **Auto**, o tiempos como `15 seg`, `30 seg`, `1 min`, `3 min`, `5 min`, `10 min` o **Custom** (eligiendo el número y si son segundos o minutos, ej. `Custom: 7 min`). Lleva activada la regla de **tolerancia flexible** para que el futuro Agente Guionista tome el tiempo como guía natural y jamás corte una frase o idea a la mitad.
   - **Modelo de Imagen y Modelo de Video (en `fal.ai`)**: Dos píldoras azul claro para elegir con qué motor crear las imágenes (`FLUX.1 Pro Ultra`, `FLUX.1 Dev`, `FLUX.1 Schnell`, `Google Imagen 4`) y con cuál generar el video (`Kling v3 Pro`, `LTX-2.3 Pro`, `Wan 2.7 Reference`, `Veo 3`, `Seedance 2.5`, `MiniMax H3 Max`). Los modelos auxiliares de voz, análisis de visión/audio, sincronización de labios (LipSync) y mejora de calidad (Upscaling) quedan guardados internamente (`MODELOS_INTERNOS_POR_DEFECTO`) sin ensuciar la pantalla.
   - **Idioma de salida (`idiomaSalida`) y botón circular `↑`**: En la esquina inferior derecha eliges el idioma final del video (`Español`, `English`, `Français`, `Português`, `Italiano`, `Deutsch`). **Regla clave:** este idioma manda sobre el idioma en el que escribas tu idea; aunque escribas tu prompt en Español, si eliges `English`, todas las voces, diálogos y textos del video saldrán en Inglés.
2. **El Archivo Fotográfico (`Firebase Storage` — un casillero digital en la nube para guardar fotos y videos):** Cuando presionas el botón **"Comenzar Producción"**, la recepcionista muestra el cartel *"Preparando tu estudio..."*, toma tus fotos, las guarda en una carpeta con el número de tu proyecto (`referencias/{proyectoId}/`) y anota la dirección web permanente de cada foto.
3. **La Ficha Maestra (`Firebase Firestore` — un cuaderno en la nube que se actualiza en vivo):** Con los enlaces de tus fotos listos, se crea una ficha oficial dentro del archivero llamado `proyectos`. Esa ficha guarda 5 datos: tu idea (`ideaOriginal`), el formato (`9:16` o `16:9`), los enlaces de tus fotos (`imagenesReferencia`), el estado actual (`analizando_idea`) y la hora exacta (`fechaCreacion`).
4. **El Puente Secreto (`Proxy de fal.ai` — un mensajero privado del servidor):** Para que nadie que visite tu página web pueda ver ni robar tu llave secreta de inteligencia artificial (`FAL_KEY`), el navegador nunca habla directo con `fal.ai`. En su lugar, le pide todo a nuestro mensajero interno (`/api/fal/proxy`), quien pone la llave en secreto desde el servidor.
5. **Paso a la Sala de Estudio (`/estudio/[id]`):** Apenas queda guardada tu ficha maestra, la puerta se abre sola y pasas a la sala del estudio de ese proyecto, donde veremos trabajar en vivo a los agentes en el siguiente paso.

---

## (c) ¿Qué hace cada carpeta y archivo importante?
- **`.env` y `.env.example`:** Son la caja fuerte donde se guardan las llaves secretas (`FAL_KEY` y los datos de tu cuenta de Firebase). `.env` nunca se sube a internet; `.env.example` es solo una guía vacía.
- **`src/configuracion/`:**
  - `cliente_fal.ts`: Le dice al navegador que siempre use el puente seguro `/api/fal/proxy`.
  - `cliente_firebase.ts`: Abre la conexión con la base de datos (Firestore) y el casillero de archivos (Storage).
- **`src/app/api/fal/proxy/route.ts`:** Es el guardia en el servidor que lee `FAL_KEY` del archivo `.env` y envía las órdenes a `fal.ai` de forma segura.
- **`src/mesa_entrada/`:** Contiene todo lo relacionado con la pantalla inicial del Paso 1:
  - `constantes_mesa_entrada.ts`: Guarda textos fijos y límites (máximo 4 fotos, formatos `9:16` y `16:9`, nombre de la colección `proyectos`).
  - `validar_entrada_proyecto.ts`: Revisa que no envíes una idea en blanco ni más de 4 fotos.
  - `subir_imagenes_referencia.ts`: Sube las fotos seleccionadas a `referencias/{proyectoId}/` en Firebase Storage.
  - `crear_documento_proyecto.ts`: Crea el documento en la colección `proyectos` de Firestore después de subir las fotos.
  - `SelectorFormatoVideo.tsx`: Los dos botones visuales para elegir Vertical (`9:16`) u Horizontal (`16:9`).
  - `ZonaImagenesReferencia.tsx`: El recuadro para arrastrar hasta 4 fotos y ver su miniatura.
  - `MesaDeEntrada.tsx`: La pantalla principal centrada que une únicamente los 4 elementos pedidos.
- **`src/estudio/VistaEstudioInicial.tsx`:** La pantalla `/estudio/[id]` a la que entras automáticamente al crear el proyecto y que escucha cambios en tiempo real desde Firebase.
- **`tests/validar_entrada_proyecto.test.ts`:** Pruebas automáticas que comprueban que las reglas de la Mesa de Entrada funcionen sin fallos.

---

## (d) ¿Qué se ha hecho hasta ahora? (Diario de sesiones)
### Sesión del 26 de octubre de 2026 (Biblioteca Global Anti-Duplicados SHA-256 y Vestuario Contextual por Escenario)
- **Biblioteca Global de Activos Reutilizables (`biblioteca_activos`):**
  - Antes de subir cualquier imagen, producto o canción a la nube, el sistema calcula su **huella digital única (`SHA-256`)** en el navegador.
  - Si subes de nuevo a *Leo*, *Mía* o una *Doctora* que ya habías subido antes, el sistema lo detecta al instante, **no vuelve a subir ni duplicar el archivo**, y reutiliza su dirección web, su ficha de identidad y sus Láminas 360° ya creadas (ahorrando tiempo y dinero).
  - Al pulsar el botón `+` en la Mesa de Entrada, ahora puedes elegir entre **"💻 Subir archivo nuevo desde mi equipo"** o **"📚 Elegir de Mi Biblioteca (Personajes y Productos guardados)"** con la insignia **"✨ Lámina 360° lista (Ahorro activo)"**.
- **Separación de Identidad Física Inmutable vs. Armario de Vestuario por Lugar:**
  - El Agente Productor separa estrictamente el **Bloque A (`identidadFisicaInmutable`: edad, rostro, ojos, piel, cabello y complexión que jamás cambian)** del **Bloque B (`vestuarioOriginalFoto`: la ropa que lleva en la foto subida, como una bata médica)**.
  - Si tu historia mantiene la ropa original (como un videoclip con personajes de ropa icónica), todas las escenas usan `vestuario_base`.
  - Si tu historia lleva al personaje por distintos lugares donde la ropa de la foto no tendría sentido (por ejemplo, una doctora que va del **consultorio** al **gimnasio**, luego a la **playa** y a **casa**), el Guionista crea un **Armario de Vestuario (`armarioVestuarios`)** con atuendos fijos para cada lugar (`vestuario_base`, `vestuario_gimnasio`, `vestuario_playa`, `vestuario_casa`).
  - **Consistencia total por lugar:** Todas las escenas que ocurran en el gimnasio (ej. Escenas 3, 4 y 9) reciben exactamente la misma ropa deportiva y la Lámina 360° de ese vestuario, manteniendo el mismo rostro en todo el video.

### Sesión del 26 de octubre de 2026 (Modelos Duales Inteligentes: Text-to-Image / Image-to-Image)
- **Modelos Híbridos Autoadaptables:** Para evitar que los modelos fallen por falta de referencias o ignoren las fotos del usuario, todo el catálogo de imágenes ahora cuenta con soporte dual:
  - Si una escena o toma tiene personajes o láminas de referencia: el sistema utiliza automáticamente el endpoint de edición (`/edit` o `/kontext`) mirando las fotos reales en `image_urls`.
  - Si una escena es una toma libre (como un paisaje, un cielo o una toma ambiental sin personajes): conmuta automáticamente al motor de Texto-a-Imagen puro sin provocar errores de parámetros.
- **Catálogo Oficial Unificado:** Nano Banana 2.1, Nano Banana Pro 4K, FLUX Kontext Pro, FLUX Kontext Dev, Recraft V3 Design y GPT Image 2 High configurados en sus parejas oficiales de generación y edición.

### Sesión del 26 de octubre de 2026 (Experiencia Wizard por Pantallas y Modelos Oficiales fal.ai)
- **Cero Scroll Infinito (Navegación por Pantallas Independientes):** Se transformó la Sala de Estudio en una experiencia interactiva tipo asistente (Wizard). Ya no se apilan todos los pasos uno debajo del otro; ahora ves únicamente la pantalla en la que estás trabajando.
- **Barra Superior de Etapas (Stepper Interactivo):**
  1. 🔍 **Paso 1: Análisis y Clarificación:** Muestra la ficha de visión, transcripción y preguntas del director.
  2. 🎬 **Paso 2: Guion y Escaleta:** Muestra la línea de tiempo interactiva y las escenas sincronizadas.
  3. 🎭 **Paso 3: Láminas 360° y Estilo:** Muestra el selector de estilo visual y las hojas de consistencia técnica.
  4. 🖼️ **Paso 4: Storyboard Visual:** Muestra la tira de láminas activas arriba y los cuadros de imagen por escena abajo.
  5. 🎥 **Paso 5: Audio, Video y Descarga:** Prepara la animación y renderizado final.
- **Cabecera Limpia y Botón "📋 Ver idea y archivos":** Al hacer clic, se abre una ventana modal flotante para consultar en cualquier momento lo que escribiste y tus archivos adjuntos sin ocupar espacio fijo en pantalla.
- **Auditoría de Modelos con el Servidor fal.ai:** Se actualizaron los modelos oficiales de video con precios reales (`Kling v3 Pro`, `Wan 3.0 Prime`, `MiniMax H3 Max` y `ByteDance Seedance 2.5`), eliminando motores deprecados.

### Sesión del 26 de octubre de 2026 (Paso 4: Enrutador Imagen-a-Imagen, 9 Estilos Artísticos y Conversión Visual con Consistencia)
- **Enrutador Obligatorio Imagen-a-Imagen (`obtenerEndpointConReferencia`):**
  - Se corrigió el problema por el cual el motor usaba modelos solo de texto (`google/nano-banana-2.1`) sin ver las fotos del usuario.
  - Ahora cualquier generación o lámina con fotos de referencia se dirige obligatoriamente a los endpoints de edición que reciben las imágenes reales (`google/nano-banana-2.1/edit`, `fal-ai/nano-banana-pro/edit` y `fal-ai/flux-pro/kontext`).
  - Se eliminó cualquier envío de nombres de archivos sueltos como texto; siempre se envían las direcciones web reales de las fotos en Firebase Storage o fal.storage (`image_urls`).
- **Catálogo Oficial de 9 Estilos Visuales:**
  - Se crearon 9 opciones artísticas completas: *🎨 Mantener estilo de la foto*, *🧸 3D Pixar / Animación Cine*, *📺 Cartoon 2D / Animación Clásica*, *🧶 Plastilina / Stop-Motion (Claymation)*, *🎬 Realista Cinematográfico 4K*, *🌸 Anime / Ilustración Japonesa*, *💥 Cómic / Novela Gráfica*, *🧱 Mundo de Bloques / Juguete 3D*, y *🖌️ Cuento Ilustrado / Acuarela*.
- **Selector de Estilo Visual en Mesa de Entrada y en Vivo en la Sala de Estudio:**
  - Agregado en la barra inferior de la pantalla de inicio y como selector interactivo justo arriba del botón de generar láminas en `/estudio/[id]`.
  - Permite cambiar de idea estética (por ejemplo de *Realista* a *Plastilina*) en el mismo proyecto sin tener que crearlo de nuevo.
- **Regla de Oro: Identidad y Ropa Intactas + Transformación Artística:**
  - Se borraron las palabras fijas *"photorealistic"* que deformaban personajes animados a adultos reales.
  - La inteligencia artificial ahora tiene la orden estricta de respetar al 100% el rostro, edad, peinado, accesorios y vestimenta exacta de la foto (por ejemplo, si viste una playera a rayas o un disfraz), transformando únicamente el estilo artístico (textura de plastilina, trazos 2D, iluminación Pixar, etc.).

### Sesión del 26 de octubre de 2026 (Paso 4: Láminas de Consistencia 360° y Generación Visual del Storyboard)
- **Línea de Tiempo 100% Flexible y Sin Límites Fijos:** Se eliminó cualquier número fijo como 125 segundos del planificador de tomas y de la interfaz. Ahora cualquier canción o duración elegida (15 segundos, 4 minutos o lo que dure) se adapta sin cortes.
- **Historial de Proyectos en la Portada (`HistorialProyectos.tsx`):** Añadido en la página de inicio para que tus proyectos anteriores nunca desaparezcan, permitiendo volver a entrar a la sala con un clic o borrarlos de la base de datos de forma segura.
- **Láminas de Consistencia 360° de Personajes y Productos (`generador_laminas_360.ts`):** Antes de crear las escenas, cada imagen que subas se convierte en una "hoja de modelo" técnica sobre fondo gris neutro:
  - Si es una persona o personaje: muestra su cara en primer plano ultra nítido, los giros de su cabeza en diferentes ángulos y su cuerpo completo en 360° caminando y de espaldas.
  - Si es un producto: muestra el envase publicitario perfecto, sus etiquetas y texturas, y sus giros en 360°.
  - Todas estas láminas se guardan de forma permanente en Firebase Storage (`proyectos/{id}/laminas_360/`).
- **Generación Visual de Escenas con Identidad (`generador_imagenes_escenas.ts`):** Cada toma del guion se genera en paralelo usando el modelo que elegiste (`recraft-v3`, `flux-pro`, etc.) inyectando las láminas 360° para que el personaje o producto se vea idéntico en cada escena sin deformarse.
- **Panel de Estudio Paso 4 (`PanelEstudioVisualPaso4.tsx`):**
  - Galería visual con zoom para ver las láminas 360° y botón para regenerarlas.
  - Storyboard con las fotos de cada escena generada, estado en tiempo real y botón `"🎨 Regenerar esta toma"` por si quieres cambiar una imagen específica.
  - Botón de aprobación final para pasar a Sonido y Video (Pasos 5 y 6).

### Sesión del 24 de octubre de 2026 (Paso 3: Reconciliador 100% de Canciones, Agente Guionista y Timeline de Escenas)
- **Cobertura del 100% de la canción sin recortes (`reconciliador_letra_whisper.ts`):** Se eliminó el tope de 25 segmentos de `fal-ai/whisper`, se conservaron los segmentos con tiempo final abierto `[inicio, null]` y se creó `reconciliarLetraYSegmentosCompletos`, que detecta si al final del texto completo quedaron frases sin marca de tiempo (como *"Manos a la panza... Adiós monstruo"* entre el segundo `90.8s` y el `125.0s`) y las reparte proporcionalmente hasta el final real del audio.
- **Medición exacta de duración y botón de recálculo:** Al adjuntar una canción o video en la Mesa de Entrada, el navegador mide su duración exacta en segundos (`duracionSegundos`). Además, en proyectos ya creados puedes pulsar **"🔄 Recalcular segmentos completos"** dentro del bloque de letra para actualizar los tiempos al instante sin volver a subir archivos.
- **Limpieza visual de la Ficha de Identidad:** Se eliminaron los asteriscos sueltos de Markdown (`**`) convirtiéndolos en negritas limpias y agradables de leer.
- **Agente Guionista Cinematográfico (`/api/agentes/generar-guion`) y Timeline (`PanelGuionTimeline.tsx`):** Al pasar a `listo_para_guion`, el sistema planifica todas las tomas consecutivas desde `0.0s` hasta el último segundo (ej. `125.0s`, entre 22 y 26 escenas de máximo 5-6 segundos sin huecos), muestra arriba una **Línea de Tiempo horizontal interactiva** y abajo las **Tarjetas de Escena editables** listas para aprobar y pasar al **Paso 4 (`listo_para_imagenes`)**.

### Sesión del 24 de octubre de 2026 (Blindaje de Subida de Canciones/Videos, Respaldo fal.ai y Acordeón de Letra)
- **Subida blindada con respaldo automático (`fal.storage.upload`):** Se ajustaron los tiempos de espera en `subir_imagenes_referencia.ts` (máximo 45s) y se conectó el almacenamiento seguro de `fal.ai` como salvavidas automático si Firebase Storage tarda o rechaza un `.mp3`, `.wav` o `.mp4` por reglas o CORS.
- **Avance real paso a paso en `MesaDeEntrada.tsx`:** Ahora ves en vivo *"Subiendo archivos multimedia (1 de 3)..."*, *"Guardando proyecto en la base de datos..."* y *"Entrando a la sala de estudio..."*, protegido con `try / catch / finally` para que nunca se quede congelado.
- **Separación estricta de Ojos y Oídos:** Se blindó `inspector_multimodal_fal.ts` para que las fotos vayan únicamente a `fal-ai/any-llm/vision` y las canciones/videos vayan únicamente a `fal-ai/whisper` (`audio_url`).
- **Acordeones desplegables en la Sala de Estudio:** En `/estudio/[id]` ahora puedes abrir con un clic *"👁️ Ficha de Identidad Visual (Clic para ver descripción)"* y *"🎵 Letra / Audio escuchado por el Agente (Clic para ver transcripción)"* con todas las marcas de tiempo de tu canción.

### Sesión del 24 de octubre de 2026 (Paso 2: Agente Productor Ejecutivo Multimodal y Clarificador Elástico)
- Se amplió el botón `+` para aceptar **imágenes, canciones/audios (`.mp3`, `.wav`, `.m4a`) y videos (`.mp4`, `.mov`, `.webm`)**, guardando el tipo de cada archivo en Firebase.
- Se creó el **Agente Productor Ejecutivo** que clasifica automáticamente cada proyecto en una de las **5 líneas de producción** (Videoclip Musical, Publicidad Comercial, Contenido Redes/Influencer, Traducción/Doblaje de Video o Cine/Serie/Storyboard).
- Se dotó al agente de **Ojos (`fal-ai/any-llm/vision`)** para describir tus fotos y **Oídos (`fal-ai/whisper`)** para transcribir la letra de tus canciones o diálogos con marcas de tiempo.
- Se programó la **Regla de Clarificación Elástica**: si ya todo está claro (o si se conecta desde un Widget externo con `modoSilencioso: true`), hace **0 preguntas** y pasa directo a `listo_para_guion`; si faltan detalles artísticos, genera solo las preguntas necesarias con botones rápidos y opción de *"Saltar preguntas (Que el Director decida por mí)"*.

### Sesión del 27 de octubre de 2026 (Sistema de Vestuario 100% Universal, Ver/Editar el Prompt de cada imagen y Eliminar imágenes)
- **Sistema de Vestuario 100% General para Cualquier Historia o Personaje:**
  - Se quitó por completo la palabra fija *"Consultorio"*: ahora el atuendo principal se llama siempre **"Ropa original de la foto de referencia"** (`vestuario_base`).
  - Si en tu idea pides no cambiar la ropa (por ejemplo: *"no les puede cambiar la ropa"*), el sistema respeta tu orden y usa únicamente la ropa original en todo el video.
  - Si tu historia pasa por varios lugares o profesiones (un chef en la cocina, un explorador en la nieve, unos niños en la escuela, alguien haciendo ejercicio o en pijama), el Agente Guionista crea los vestuarios a medida para esa historia. Además, en el Paso 3 tienes el botón **"➕ Añadir vestuario para otro escenario"** para escribir tú mismo cualquier lugar y ropa que quieras agregar, y **"🗑️ Quitar vestuario"** para descartar cualquiera que no necesites.
- **Botón `📝 Ver / Editar Prompt` en cada imagen (Láminas 360° y Storyboard):** Ahora puedes abrir una pestaña en cualquier tarjeta para ver exactamente qué instrucción (prompt) se le envió a la inteligencia artificial, modificar el texto a tu gusto, elegir otro modelo ahí mismo (por ejemplo pasar de FLUX a Seedream 5.0 Pro o Nano Banana 2.1) y pulsar **"✨ Regenerar con este Prompt y Modelo"**.
- **Botón `🗑️ Eliminar` (con limpieza de Biblioteca):** Si una imagen generada o reutilizada no te gusta, puedes pulsar **"🗑️ Eliminar"**. Esto la quita del proyecto y también la borra de la memoria de tu Biblioteca Global para que no vuelva a cargarse sola.

### Sesión del 26 de octubre de 2026 (Modelos ByteDance Seedream, Botón ⚙️ Ajustes, Biblioteca SHA-256 y Vestuario Contextual)
- **Modelos de Imagen ByteDance Seedream (Duales):** Se agregaron al selector de la Mesa de Entrada y a la Sala de Estudio los 4 modelos oficiales de ByteDance (**Seedream 5.0 Pro**, **Seedream 5.0 Lite**, **Seedream 5.0 Flash** y **Seedream 4.5**). Todos funcionan en modo Dual: si hay fotos o Láminas 360° usan su versión `/edit` para respetar el rostro y ropa; si una escena no lleva referencias, crean desde texto.
- **Botón `⚙️ Ajustes` en la Sala de Estudio (`/estudio/[id]`):** Ahora tienes un botón de engranaje arriba a la derecha dentro del estudio para cambiar en cualquier momento de modelo de imagen (ej. pasar de Nano Banana a Seedream 5.0 Pro o Lite), modelo de video, estilo visual, formato de pantalla o idioma sin tener que salir ni empezar de cero.
- **Fichas Técnicas Individuales con Foto:** En el Paso 1 del estudio, cada personaje subido (como Leo y Mía) muestra su propia tarjeta limpia con su foto en miniatura, separando su **Apariencia y Rasgos Físicos (Fijos)** de su **Ropa y Calzado en la Foto (Vestuario Base)**, más un botón *"🔄 Actualizar fichas técnicas"*.
- **Biblioteca Global Anti-Duplicados y Armario de Vestuario:** Tus personajes y productos se guardan una sola vez gracias a su huella digital (`SHA-256`) para reutilizar gratis sus Láminas 360°, y el Guionista adapta lógicamente la ropa según el lugar de la escena (consultorio, gimnasio, playa, casa) manteniendo el mismo rostro.

### Sesión del 23 de octubre de 2026 (Perfiles Rápido/Pro/Máximo con precios reales en USD y Tooltips)
- Se consultaron en directo los precios oficiales mediante el MCP de `fal.ai` y se agregaron las fichas técnicas de cada modelo de imagen y video (calidad, precio real por imagen o segundo, y velocidad).
- Se creó el nuevo selector desplegable con **Tarjeta de Información (Hover Card)** a la derecha que muestra Calidad, Precio Real y Velocidad al pasar el mouse sobre cada modelo.
- Se añadió debajo de la caja principal la **barra flotante translúcida** con los botones **⚡ Rápido**, **👑 Pro** y **✨ Máximo**, que ajustan los motores automáticamente y calculan en vivo tanto el costo por minuto (`$/min`) como el **costo total aproximado de tu video** según la duración elegida.

### Sesión del 23 de octubre de 2026 (Conexión real de Firebase y MCP de fal.ai + Firebase)
- Se creó en tu cuenta de Google/Firebase el proyecto exclusivo **VoxkyStudio** (`voxkystudio`) y su aplicación web.
- Se completó automáticamente tu archivo `.env` con las 6 claves de Firebase (`NEXT_PUBLIC_FIREBASE_*`) junto a tu `FAL_KEY`.
- Se creó la base de datos **Cloud Firestore** en la nube y se subieron sus reglas de seguridad (`firestore.rules`).
- Se conectaron los dos enchufes **MCP (`firebase` y `fal-ai`)** en tu editor Antigravity (`mcp_config.json`).

### Sesión del 23 de octubre de 2026 (Tema en colores claros y respaldo en GitHub)
- Se cambió toda la interfaz de la Mesa de Entrada y de la Sala de Estudio a una paleta de colores claros (blanco limpio, grises suaves y botones resaltados en índigo).
- Se guardó el avance en Git y se conectó y subió al repositorio en la nube (`https://github.com/kevoxky/VoxkyStudio.git`), protegiendo el archivo `.env` para que nunca se suba.

### Sesión del 22 de octubre de 2026 (Paso 1 completado)
- Se configuró desde cero la aplicación web con Next.js, Tailwind CSS, Firebase y `fal.ai`.
- Se creó el proxy seguro `/api/fal/proxy` para proteger `FAL_KEY`.
- Se construyó la Mesa de Entrada con sus 4 elementos exactos, el guardado en Firebase Storage (`referencias/{proyectoId}/`) y Firestore (`proyectos`), y la redirección automática a `/estudio/[id]`.
- Se verificaron las dependencias para que no exista ninguna vulnerabilidad de seguridad.

---

## (e) ¿Qué falta o está pendiente?
- **Completar y guardar tu archivo `.env`:** Asegurarte de guardar (`Ctrl + S`) tu `FAL_KEY` y añadir las claves de tu proyecto de Firebase (ver `.env.example`).
- **Paso 2 (Siguiente sesión):** Conectar los agentes inteligentes dentro de la vista `/estudio/[id]` para que tomen la ficha en estado `analizando_idea`, analicen la historia y generen el guion y las escenas en tiempo real.

---

## (f) ¿Cómo usarlo y probarlo paso a paso?
1. Abre tu archivo `.env`, verifica que tenga tu `FAL_KEY` y las claves de Firebase (puedes copiar los nombres desde `.env.example`) y **guárdalo con `Ctrl + S`**.
2. En la terminal, inicia la aplicación con `npm run dev`.
3. Abre `http://localhost:3000` en tu navegador.
4. Escribe una idea de video en la caja de texto, elige Vertical (`9:16`) u Horizontal (`16:9`), arrastra entre 1 y 4 fotos de prueba (verás sus vistas previas pequeñas) y haz clic en **"Comenzar Producción"**.
5. Verás el indicador **"Preparando tu estudio..."**, se subirán las fotos a Firebase Storage, se creará la ficha en Firestore y pasarás automáticamente a `/estudio/[id]`.

---

## (g) Riesgos y cosas a tener en cuenta (Seguridad, Datos y Costos)
- **Seguridad de llaves:** Tu clave `FAL_KEY` jamás viaja al navegador gracias a `/api/fal/proxy`. Nunca borres `.env` de `.gitignore`.
- **Respaldo en la nube:** Recuerda subir este proyecto a **GitHub en un repositorio PRIVADO** cuando me digas *"guarda"* y *"sube"*, para no perder tu trabajo si le pasa algo a tu computadora.
- **Costos de uso:** Firebase tiene una capa gratuita amplia, y `fal.ai` cobra por cada generación de imagen/video cuando activemos los agentes en los siguientes pasos.
