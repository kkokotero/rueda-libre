/** Crea un icono de Material Symbols ligado a un nombre de glifo. */

/**
 * @param {string} name Material Symbols glyph name
 * @param {string} [className] Additional CSS classes
 * @returns {HTMLSpanElement}
 */
export const createIcon = (name, className = "") => {
    const icon = document.createElement("span");
    icon.className = `icon${className ? ` ${className}` : ""}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = name;

    return icon;
};
