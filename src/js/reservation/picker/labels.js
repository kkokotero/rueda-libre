/** Texto y identificadores accesibles de los campos nativos del formulario. */

/** Texto visible de una etiqueta, sin los indicadores de obligatorio/ opcional. */
/** @param {HTMLLabelElement | null} label @returns {string} */
export const getLabelText = (label) => {
    if (!label) return "";

    const clone = /** @type {HTMLLabelElement} */ (label.cloneNode(true));

    for (const element of clone.querySelectorAll(
        ".reservas-form__required, .reservas-form__optional",
    )) {
        element.remove();
    }

    return (clone.textContent || "").replace(/\s+/g, " ").trim();
};

/** Id de la etiqueta, creándolo si el campo nativo no lo traía. */
/** @param {HTMLLabelElement | null} label @param {HTMLElement} native @returns {string} */
export const getFieldLabelId = (label, native) => {
    if (!label) return "";

    if (!label.id) {
        label.id = `${native.id}-label`;
    }

    return label.id;
};

/** `aria-describedby` del campo: su descripción previa más la de su error. */
/** @param {HTMLElement} native @returns {string} */
export const getDescribedBy = (native) => {
    const error = document.getElementById(`${native.id}-error`);

    return [native.getAttribute("aria-describedby"), error?.id]
        .filter(Boolean)
        .filter((id, index, ids) => ids.indexOf(id) === index)
        .join(" ");
};
