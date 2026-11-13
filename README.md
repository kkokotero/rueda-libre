# Rueda Libre

Sitio web estático de Rueda Libre, organizado como una aplicación multipágina con Vite.

## Requisitos

- Node.js 20.19 o posterior dentro de la rama 20, o 22.12 o posterior.
- npm, incluido con Node.js.

## Instalación y desarrollo

```sh
npm install
npm run dev
```

Vite muestra en la terminal la dirección local para abrir el sitio. Las páginas disponibles son `index.html`, `tarifas/index.html`, `reservas/index.html` y `catalogo/index.html`.

## Compilación y previsualización

```sh
npm run build
npm run preview
```

La compilación genera el sitio listo para publicar en `dist/`. El comando de previsualización sirve esa compilación localmente.

## Despliegue en Vercel

El repositorio ya incluye `vercel.json`, de modo que Vercel puede compilar y publicar el sitio sin configuración adicional.

### Desde la interfaz de Vercel (recomendado)

1. Sube el proyecto a GitHub, GitLab o Bitbucket.
2. En Vercel, abre **Add New → Project** y selecciona el repositorio.
3. Vercel detecta el proyecto como **Vite**. Verifica estos valores:

   | Ajuste              | Valor            |
   | ------------------- | ---------------- |
   | Framework Preset    | Vite             |
   | Install Command     | `npm ci`         |
   | Build Command       | `npm run build`  |
   | Output Directory    | `dist`           |

   La versión de Node se define en **Project Settings → Node.js Version** (o
   con el campo `engines` de `package.json`, que Vercel también lee). No se
   puede fijar en `vercel.json`, porque esa propiedad no está permitida ahí.

4. Pulsa **Deploy**. Cada `push` a la rama principal republica el sitio.

### Desde la terminal

```sh
npx vercel            # despliegue de vista previa
npx vercel --prod     # despliegue a producción
```

El primer comando pide iniciar sesión y vincular el proyecto a una cuenta de Vercel.

### Configuración de `vercel.json`

- `outputDirectory: "dist"` indica a Vercel que el sitio publicado es la carpeta que genera `npm run build`.
- `trailingSlash: true` hace que las rutas `/tarifas/`, `/reservas/` y `/catalogo/` se sirvan siempre con barra final. Las páginas enlazan entre sí con rutas relativas (`../tarifas/`), y esa barra final es necesaria para que el navegador resuelva bien esos enlaces.
- `installCommand: "npm ci"` instala exactamente las versiones de `package-lock.json`.
- Los bloqueos de `Cache-Control` para `/assets/` aprovechan que los archivos llevan hash en el nombre y no cambian entre despliegues.

El archivo `.vercelignore` evita subir `node_modules/`, `dist/` y `docs/` al proyecto de Vercel.

## Calidad de código

```sh
npm run check
npm run format
```

Biome revisa JavaScript, TypeScript y los archivos de configuración del proyecto. EditorConfig define las convenciones de fin de línea e indentación.

## Estructura

- `src/index.html`, `src/tarifas/`, `src/reservas/` y `src/catalogo/`: páginas de entrada.
- `src/scss/`: cada HTML carga una única entrada de página (`home.scss`, `tarifas.scss` o `reservas.scss`). Estas reúnen módulos compartidos de `base/`, `components/` y `layout/`, además de módulos específicos en `pages/`, divididos por secciones y componentes.
- `src/assets/js/`: navegación, carrusel, reservas y utilidades compartidas.
- `src/img/`: imágenes e iconos.
- `vite.config.ts`: raíz de Vite y entradas HTML de la compilación.
- `vercel.json` y `.vercelignore`: configuración de publicación en Vercel.
- `biome.json` y `.editorconfig`: reglas de calidad y estilo.

## JavaScript

Los archivos de entrada (`carousel.js`, `catalogo.js` y `reservation/index.js`) conectan la página con sus módulos. El resto del código se agrupa por responsabilidad:

- `carousel/`: `carousel.js` coordina el estado; `carousel-layout.js` mide y posiciona; `carousel-animation.js` anima; `carousel-events.js` conecta mouse, teclado, rueda y toque; `carousel-item.js` describe las imágenes; `utils.js` contiene cálculos pequeños.
- `reservation/`: `form.js` valida y prepara el envío; `confirmation.js` muestra el resumen; `date-picker.js`, `time-picker.js` y `select.js` implementan controles; `picker/` y `picker-core.js` comparten su ciclo de vida, foco, etiquetas y presentación.
- `shared/`: funciones reutilizables para fechas, horarios, festivos y creación de HTML.

Las plantillas DOM y el SafeZone se apoyan en [html-box](https://www.jsdelivr.com/package/npm/html-box). `shared/html.js` centraliza las plantillas: usa `html` para crear un fragmento con varios nodos y `element` para una plantilla con una sola raíz. Los valores dinámicos se tratan como texto o nodos; no uses `unsafeHtml` con datos de formulario o contenido externo. El dropdown de escritorio usa `SafeZone` para mantenerse abierto al mover el puntero entre su botón y menú; los controles móviles mantienen su cierre modal existente.