import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));
const sourceRoot = resolve(projectRoot, "src");

export default defineConfig({
    root: sourceRoot,
    build: {
        outDir: resolve(projectRoot, "dist"),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                home: resolve(sourceRoot, "index.html"),
                tarifas: resolve(sourceRoot, "tarifas/index.html"),
                reservas: resolve(sourceRoot, "reservas/index.html"),
                catalogo: resolve(sourceRoot, "catalogo/index.html"),
            },
        },
    },
});
