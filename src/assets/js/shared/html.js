/**
 * Construcción de DOM con plantillas literales.
 *
 * - `html` devuelve un `DocumentFragment` con todo el árbol de la plantilla.
 * - `element` devuelve el elemento raíz de una plantilla de un solo nodo.
 *
 * Los valores interpolados se escapan, así que un texto de usuario se pinta
 * tal cual y nunca se interpreta como HTML. Insertar nodos (iconos, otras
 * plantillas, listas de ellos) es igual de directo: se interpolan y van a su
 * sitio.
 */

/** Caracteres especiales de un texto y su entidad HTML. */
/** @type {Record<string, string>} */
const ENTITIES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
};

/** @param {unknown} value @returns {string} */
const escapeText = (value) =>
    String(value).replace(/[&<>"']/g, (character) => ENTITIES[character]);

/** Atributo que señala dónde va cada nodo antes de analizar el HTML. */
const NODE_MARKER = "data-html-node";

/**
 * Texto HTML equivalente a un valor interpolado.
 *
 * Los nodos (y las listas de nodos) se guardan aparte y se marcan con su
 * posición; todo lo demás se escapa.
 *
 * @param {unknown} value
 * @param {Node[]} nodes acumula los nodos que hay que recolocar
 * @returns {string}
 */
const renderValue = (value, nodes) => {
    const items = Array.isArray(value) ? value.flat(Infinity) : [value];

    return items
        .map((item) => {
            if (item instanceof Node) {
                nodes.push(item);
                return `<i ${NODE_MARKER}="${nodes.length - 1}"></i>`;
            }

            if (item === null || item === undefined || item === false) {
                return "";
            }

            return escapeText(item);
        })
        .join("");
};

/**
 * Crea un `DocumentFragment` con el árbol de una plantilla HTML.
 *
 * @param {TemplateStringsArray} strings partes fijas de la plantilla
 * @param {...unknown} values valores interpolados
 * @returns {DocumentFragment}
 */
export function html(strings, ...values) {
    /** @type {Node[]} */
    const nodes = [];

    const template = document.createElement("template");
    template.innerHTML = String.raw(
        { raw: strings },
        ...values.map((value) => renderValue(value, nodes)),
    );

    for (const marker of template.content.querySelectorAll(
        `[${NODE_MARKER}]`,
    )) {
        const node = nodes[Number(marker.getAttribute(NODE_MARKER))];

        if (node) {
            marker.replaceWith(node);
        }
    }

    return template.content;
}

/**
 * Crea el elemento raíz de una plantilla de un solo nodo.
 *
 * El tipo resultante se deduce de la variable de destino: si se usan
 * propiedades de un elemento concreto (`.disabled`, `.value`, `.dataset`…)
 * hay que anotar esa variable con su tipo.
 *
 * Lanza un error si la plantilla no tiene elemento raíz.
 *
 * @template {Element} T
 * @param {TemplateStringsArray} strings partes fijas de la plantilla
 * @param {...unknown} values valores interpolados
 * @returns {T}
 */
export function element(strings, ...values) {
    const root = html(strings, ...values).firstElementChild;

    if (!root) {
        throw new Error(
            "`element` necesita una plantilla con un elemento raíz.",
        );
    }

    return /** @type {T} */ (root);
}
