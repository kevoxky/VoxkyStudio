# Registro de Cambios (CAMBIOS.md)

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
