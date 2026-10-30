/** Crea un icono de Material Symbols ligado a un nombre de glifo. */

import { element } from "../../shared/html.js";

/**
 * @param {string} name Material Symbols glyph name
 * @param {string} [className] Additional CSS classes
 * @returns {HTMLSpanElement}
 */
export const createIcon = (name, className = "") =>
    element`<span class="icon${className ? ` ${className}` : ""}" aria-hidden="true">${name}</span>`;
