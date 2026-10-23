# Informe del Proyecto: VoxkyStudio

Este documento está escrito en lenguaje sencillo, sin tecnicismos, para que siempre tengas claro cómo funciona tu proyecto, qué hace cada pieza y qué pasos siguen.

---

## (a) ¿Qué es el proyecto y para qué sirve?
**VoxkyStudio** es un estudio de producción de video en internet impulsado por **agentes de inteligencia artificial** (ayudantes virtuales especializados).
Sirve para que tú solo tengas que escribir la idea de un video, elegir si lo quieres para celular (Vertical `9:16`) o para pantalla horizontal (YouTube `16:9`) y subir hasta 4 fotos de ejemplo (un personaje, un producto o un estilo visual). A partir de ahí, el estudio organiza el trabajo para transformar tu idea en una producción audiovisual.

---

## (b) ¿Cómo funciona, paso a paso y con ejemplos de la vida diaria?
Imagina que entras a una agencia de cine real:
1. **La Mesa de Entrada (Recepción):** Llegas a una mesa limpia donde entregas una hoja con tu idea escrita, dices si el video será vertical u horizontal y dejas hasta 4 fotografías sobre la mesa para que el equipo sepa cómo luce tu personaje o producto.
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
