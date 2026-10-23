/** Crea un icono de Material Symbols ligado a un nombre de glifo. */

export const createIcon = (name, className = "") => {
    const icon = document.createElement("span");
    icon.className = `icon${className ? ` ${className}` : ""}`;
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = name;

    return icon;
};
