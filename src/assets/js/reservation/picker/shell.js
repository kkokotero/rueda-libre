/**
 * Construcción y posicionamiento del panel flotante de un picker.
 *
 * En escritorio el panel se coloca junto al disparador (arriba o abajo según
 * el espacio disponible); en móvil la hoja lo ocupa todo y no necesita cálculo.
 */

import { element } from "../../shared/html.js";
import { createIcon } from "./icons.js";
import { isMobilePicker } from "./media.js";
import { getFieldLabelId } from "./labels.js";

/**
 * @param {string} titleText
 * @param {() => void} onClose
 * @returns {{ header: HTMLDivElement, closeButton: HTMLButtonElement }}
 */
const createPickerHeader = (titleText, onClose) => {
    /** @type {HTMLButtonElement} */
    const closeButton = element`<button
        type="button"
        class="reservas-picker__close"
        aria-label="Cerrar">${createIcon("close")}</button>`;

    closeButton.addEventListener("click", onClose);

    /** @type {HTMLDivElement} */
    const header = element`<div class="reservas-picker__header">
        <p class="reservas-picker__title">${titleText}</p>
        ${closeButton}
    </div>`;

    return { header, closeButton };
};

/**
 * @param {HTMLElement} panel
 * @param {string} titleText
 * @param {() => void} onClose
 * @returns {{ shell: HTMLDivElement, closeButton: HTMLButtonElement }}
 */
export const createPickerShell = (panel, titleText, onClose) => {
    const { header, closeButton } = createPickerHeader(titleText, onClose);

    /** @type {HTMLDivElement} */
    const shell = element`<div class="reservas-picker__shell">
        ${header}
        ${panel}
    </div>`;

    return { shell, closeButton };
};

/**
 * @param {HTMLInputElement} native
 * @param {HTMLLabelElement | null} label
 * @param {string} describedBy
 * @param {string} titleText
 * @returns {{ button: HTMLButtonElement, value: HTMLSpanElement, panelId: string }}
 */
export const createPickerTrigger = (native, label, describedBy, titleText) => {
    const valueId = `${native.id}-value`;
    const panelId = `${native.id}-panel`;
    const labelId = getFieldLabelId(label, native);

    const chevron = createIcon("expand_more", "reservas-picker__chevron");

    /** @type {HTMLSpanElement} */
    const value = element`<span class="reservas-picker__value" id="${valueId}"></span>`;

    /** @type {HTMLButtonElement} */
    const button = element`<button
        type="button"
        id="${native.id}-button"
        class="reservas-form__input reservas-picker__button"
        aria-haspopup="dialog"
        aria-expanded="false"
        aria-controls="${panelId}"
        aria-required="${native.required}">${value}${chevron}</button>`;

    if (describedBy) {
        button.setAttribute("aria-describedby", describedBy);
    }

    if (labelId) {
        button.setAttribute("aria-labelledby", `${labelId} ${valueId}`);
    } else {
        button.setAttribute("aria-label", titleText);
    }

    return { button, value, panelId };
};

/**
 * Coloca el panel junto al disparador: hacia abajo si cabe, hacia arriba si no.
 *
 * @param {HTMLElement} wrapper contenedor del disparador y del panel
 * @param {HTMLElement} trigger disparador que dispara el panel
 * @param {HTMLElement} panel panel a posicionar
 * @param {number} [maxHeight] alto máximo del panel en escritorio
 */
export const positionPickerPanel = (
    wrapper,
    trigger,
    panel,
    maxHeight = 256,
) => {
    if (isMobilePicker()) {
        wrapper.classList.remove("is-up");
        panel.style.maxHeight = "";
        return;
    }

    panel.style.maxHeight = "";

    const triggerRect = trigger.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const safeMargin = 24;
    const gap = 8;
    const header = document.querySelector(".site-header");
    const headerBottom = header ? header.getBoundingClientRect().bottom : 0;
    const topLimit = Math.max(16, headerBottom + 12);
    const spaceBelow =
        window.innerHeight - triggerRect.bottom - safeMargin - gap;
    const spaceAbove = triggerRect.top - topLimit - gap;
    const openUp = spaceBelow < panelHeight && spaceAbove > spaceBelow;

    wrapper.classList.toggle("is-up", openUp);
    panel.style.maxHeight = `${Math.max(
        140,
        Math.min(maxHeight, openUp ? spaceAbove : spaceBelow),
    )}px`;
};
