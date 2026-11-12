/**
 * Navegación del sitio: desplegable, cajón lateral y página activa.
 *
 * Se carga como módulo en las cuatro páginas. Los componentes interactivos
 * (desplegable y cajón) los aporta Bootstrap; este archivo se encarga de lo
 * propio del sitio: marcar la página activa y cerrar el cajón al navegar.
 */

import Offcanvas from "bootstrap/js/src/offcanvas.js";
import "./bootstrap.js";

/** Quita `index.html` y la barra final para poder comparar rutas. */
/** @param {string} path @returns {string} */
const normalizePath = (path) => {
    let normalized = path.replace(/\/index\.html$/, "/");

    if (!normalized.endsWith("/")) {
        normalized += "/";
    }

    return normalized;
};

/** Ruta actual normalizada, sin ancla ni consulta. */
const currentPath = normalizePath(window.location.pathname);

/** Marca como "página actual" los enlaces que apuntan a la ruta activa. */
const markCurrentLinks = () => {
    /** @type {NodeListOf<HTMLAnchorElement>} */
    const links = document.querySelectorAll(
        ".header--menu__link, .header--drawer__link",
    );
    for (const link of links) {
        const href = link.getAttribute("href");
        if (!href) continue;
        const url = new URL(href, window.location.href);

        if (url.origin !== window.location.origin) continue;

        if (normalizePath(url.pathname) === currentPath) {
            link.setAttribute("aria-current", "page");
        }
    }
};

const initNavigation = () => {
    markCurrentLinks();

    // Al elegir una entrada del cajón, este se cierra para no tapar el
    // contenido al que se acaba de ir.
    const drawer = document.getElementById("navDrawer");

    drawer?.addEventListener("click", (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (!target.closest("a")) return;

        Offcanvas.getInstance(drawer)?.hide();
    });
};

initNavigation();
