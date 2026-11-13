/**
 * Tipos de los modulos de Bootstrap que usa el sitio.
 *
 * Bootstrap 5.3 no publica declaraciones de TypeScript para su codigo
 * fuente (`js/src/*.js`), asi que se declaran aqui los metodos que el
 * proyecto realmente usa.
 */

declare module "bootstrap/js/src/offcanvas.js" {
    export default class Offcanvas {
        static getInstance(element: Element): Offcanvas | null;
        static getOrCreateInstance(element: Element): Offcanvas;
        hide(): void;
        show(): void;
        toggle(): void;
    }
}

declare module "bootstrap/js/src/dropdown.js" {
    export default class Dropdown {
        static getInstance(element: Element): Dropdown | null;
        static getOrCreateInstance(element: Element): Dropdown;
        hide(): void;
        show(): void;
        toggle(): void;
    }
}

declare module "bootstrap/js/src/collapse.js" {
    export default class Collapse {
        static getInstance(element: Element): Collapse | null;
        static getOrCreateInstance(element: Element): Collapse;
        hide(): void;
        show(): void;
        toggle(): void;
    }
}
