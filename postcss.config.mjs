// Configuración de PostCSS para procesar los estilos de Tailwind CSS.
// Se conecta automáticamente con src/app/globals.css al iniciar la aplicación.

const configuracionPostcss = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default configuracionPostcss;
