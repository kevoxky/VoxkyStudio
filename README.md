# VoxkyStudio

Aplicación web de producción audiovisual con agentes inteligentes construida con **Next.js (App Router)**, **Tailwind CSS**, **Firebase (Firestore y Storage)** y **fal.ai (`@fal-ai/client`)**.

---

## Cómo instalar el proyecto

1. Abre una terminal en la carpeta del proyecto.
2. Instala las librerías ejecutando:
   ```bash
   npm install
   ```
3. Configura tus claves secretas en el archivo `.env` (puedes guiarte mirando `.env.example`):
   - `FAL_KEY`: Tu clave secreta de fal.ai (usada únicamente en el servidor).
   - Claves `NEXT_PUBLIC_FIREBASE_*`: Los datos de conexión de tu proyecto en Firebase (Firestore y Storage).

---

## Cómo ejecutar el proyecto

- **Iniciar el servidor de desarrollo:**
  ```bash
  npm run dev
  ```
  Luego abre [http://localhost:3000](http://localhost:3000) en tu navegador.

- **Ejecutar las pruebas automáticas:**
  ```bash
  npm test
  ```

- **Construir para verificar que no hay errores:**
  ```bash
  npm run build
  ```

---

## Estructura de carpetas

```text
VoxkyStudio/
├── .env.example                          # Plantilla de variables secretas (sin datos reales)
├── README.md                             # Guía rápida de instalación y uso
├── CAMBIOS.md                            # Registro corto de avances por paso
├── INFORME_DEL_PROYECTO.md               # Guía detallada explicada en lenguaje sencillo
├── src/
│   ├── configuracion/
│   │   ├── cliente_fal.ts                # Configura fal.ai para usar el túnel seguro /api/fal/proxy
│   │   └── cliente_firebase.ts           # Conecta con Firebase Firestore y Firebase Storage
│   ├── mesa_entrada/
│   │   ├── constantes_mesa_entrada.ts    # Nombres de colecciones, formatos y límites sin textos mágicos
│   │   ├── validar_entrada_proyecto.ts   # Valida la idea, el formato (9:16 o 16:9) y hasta 4 imágenes
│   │   ├── subir_imagenes_referencia.ts  # Sube fotos a Firebase Storage en referencias/{proyectoId}/
│   │   ├── crear_documento_proyecto.ts   # Crea la ficha maestra en la colección "proyectos" de Firestore
│   │   ├── SelectorFormatoVideo.tsx      # Selector visual entre Vertical (9:16) y Horizontal (16:9)
│   │   ├── ZonaImagenesReferencia.tsx    # Zona de arrastrar y soltar hasta 4 imágenes con vista previa
│   │   └── MesaDeEntrada.tsx             # Contenedor principal centrado con los 4 elementos de la Parte 1
│   ├── estudio/
│   │   └── VistaEstudioInicial.tsx       # Sala en tiempo real (/estudio/[id]) conectada a Firestore
│   └── app/
│       ├── api/fal/proxy/route.ts        # Proxy seguro en el servidor que protege FAL_KEY
│       ├── estudio/[id]/page.tsx         # Ruta dinámica de la vista del estudio
│       ├── globals.css                   # Estilos de Tailwind CSS
│       ├── layout.tsx                    # Estructura base de la web en español
│       └── page.tsx                      # Página inicial que muestra la Mesa de Entrada
└── tests/
    └── validar_entrada_proyecto.test.ts  # Pruebas automáticas de validación y rutas de Storage
```
