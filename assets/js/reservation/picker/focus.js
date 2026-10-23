/**
 * Gestión del foco dentro de los paneles de los pickers.
 */

import { isMobilePicker } from "./media.js";

/**
 * Ajusta el scroll del panel para que el control con foco no quede cortado.
 *
 * Se usa tras cada render o reposicionamiento, porque el panel puede haber
 * cambiado de alto y dejar el foco fuera de vista.
 */
export const keepFocusedInPanel = (panel) => {
    const active = document.activeElement;

    if (!active || !panel.contains(active)) return;

    const activeRect = active.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const padding = 8;

    if (activeRect.top < panelRect.top + padding) {
        panel.scrollTop -= panelRect.top + padding - activeRect.top;
    } else if (activeRect.bottom > panelRect.bottom - padding) {
        panel.scrollTop +=
            activeRect.bottom - (panelRect.bottom - padding);
    }
};

/**
 * Bloquea el Tab dentro del shell cuando el picker es una hoja modal móvil.
 *
 * En escritorio el panel es un popover y el Tab debe poder salir de él.
 */
export const trapMobilePickerFocus = (shell) => {
    shell.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || !isMobilePicker()) return;

        const focusables = [
            ...shell.querySelectorAll("button:not(:disabled)"),
        ].filter((element) => element.offsetParent !== null);

        if (!focusables.length) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
};
