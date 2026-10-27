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

Vite muestra en la terminal la dirección local para abrir el sitio. Las páginas disponibles son `index.html`, `tarifas/index.html` y `reservas/index.html`.

## Compilación y previsualización

```sh
npm run build
npm run preview
```

La compilación genera el sitio listo para publicar en `dist/`. El comando de previsualización sirve esa compilación localmente.

## Calidad de código

```sh
npm run check
npm run format
```

Biome revisa JavaScript, TypeScript y los archivos de configuración del proyecto. EditorConfig define las convenciones de fin de línea e indentación.

## Estructura

- `src/index.html`, `src/tarifas/` y `src/reservas/`: páginas de entrada.
- `src/assets/css/`: estilos agrupados por página y componentes.
- `src/assets/js/`: navegación, reservas y utilidades compartidas.
- `src/assets/img/`: imágenes e iconos.
- `vite.config.ts`: raíz de Vite y entradas HTML de la compilación.
- `biome.json` y `.editorconfig`: reglas de calidad y estilo.