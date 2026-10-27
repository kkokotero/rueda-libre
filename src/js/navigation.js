/**
 * Navegación del sitio: cajón móvil, desplegables y página activa.
 *
 * Se carga como módulo en las tres páginas. El `aria-current` de la página
 * activa se marca aquí en vez de escribirlo a mano en el HTML, de modo que
 * el marcado de navegación es idéntico en todas las páginas y no puede
 * desincronizarse.
 */

/** Quita `index.html` y la barra final para poder comparar rutas. */
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
    for (const link of document.querySelectorAll(
        ".header--menu__link[href], .header--drawer__link[href]",
    )) {
        const url = new URL(link.getAttribute("href"), window.location.href);

        if (url.origin !== window.location.origin) continue;

        if (normalizePath(url.pathname) === currentPath) {
            link.setAttribute("aria-current", "page");
        }
    }
};

const initNavigation = () => {
    const navToggle = document.getElementById("nav-toggle");

    if (!navToggle) return;

    markCurrentLinks();

    const dropdowns = document.querySelectorAll("[data-nav-dropdown]");

    document
        .querySelectorAll(".header--drawer a")
        .forEach((link) => {
            link.addEventListener("click", () => {
                navToggle.checked = false;
                dropdowns.forEach((dropdown) => {
                    dropdown.open = false;
                });
            });
        });

    document
        .querySelectorAll("[data-nav-dropdown] a")
        .forEach((link) => {
            link.addEventListener("click", () => {
                const dropdown = link.closest(
                    "[data-nav-dropdown]",
                );

                if (dropdown) dropdown.open = false;
            });
        });

    document.addEventListener("click", (event) => {
        dropdowns.forEach((dropdown) => {
            if (dropdown.open && !dropdown.contains(event.target)) {
                dropdown.open = false;
            }
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key !== "Escape") return;

        const openDropdown = document.querySelector(
            "[data-nav-dropdown][open]",
        );

        if (openDropdown) {
            openDropdown.open = false;
            openDropdown.querySelector("summary")?.focus();
            return;
        }

        if (navToggle.checked) {
            navToggle.checked = false;
            navToggle.focus();
        }
    });
};

initNavigation();
