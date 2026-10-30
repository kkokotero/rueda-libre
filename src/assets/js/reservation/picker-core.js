/**
 * Estado compartido por los tres pickers (select, fecha y hora).
 *
 * Solo puede haber un picker abierto a la vez: al activar uno se cierra el
 * anterior y, en móvil, se monta un fondo que cubre el formulario para que el
 * panel funcione como hoja modal.
 *
 * La construcción y el posicionamiento de los paneles viven en `./picker/`;
 * aquí solo queda el ciclo de vida que los tres comparten.
 */

import { element } from "../shared/html.js";
import { isMobilePicker, onMobilePickerChange } from "./picker/media.js";
import { createIcon } from "./picker/icons.js";
import {
    getLabelText,
    getFieldLabelId,
    getDescribedBy,
} from "./picker/labels.js";
import {
    createPickerShell,
    createPickerTrigger,
    positionPickerPanel,
} from "./picker/shell.js";
import { keepFocusedInPanel, trapMobilePickerFocus } from "./picker/focus.js";

/**
 * @typedef {{ focus?: boolean }} PickerCloseOptions
 * @typedef {(options?: PickerCloseOptions) => void} PickerClose
 * @typedef {object} ReservationPickerCore
 * @property {() => boolean} isMobilePicker
 * @property {(close: PickerClose, refresh?: (() => void) | null) => void} activatePicker
 * @property {(close: PickerClose) => void} deactivatePicker
 * @property {(name: string, className?: string) => HTMLSpanElement} createIcon
 * @property {(label: HTMLLabelElement | null) => string} getLabelText
 * @property {(label: HTMLLabelElement | null, native: HTMLElement) => string} getFieldLabelId
 * @property {(native: HTMLElement) => string} getDescribedBy
 * @property {(panel: HTMLElement, titleText: string, onClose: () => void) => { shell: HTMLDivElement, closeButton: HTMLButtonElement }} createPickerShell
 * @property {(wrapper: HTMLElement, trigger: HTMLElement, panel: HTMLElement, maxHeight?: number) => void} positionPickerPanel
 * @property {(panel: HTMLElement) => void} keepFocusedInPanel
 * @property {(shell: HTMLElement) => void} trapMobilePickerFocus
 * @property {(native: HTMLInputElement, label: HTMLLabelElement | null, describedBy: string, titleText: string) => { button: HTMLButtonElement, value: HTMLSpanElement, panelId: string }} createPickerTrigger
 * @property {() => void} destroy
 */

/**
 * Creates shared lifecycle and accessibility helpers for reservation pickers.
 * @returns {ReservationPickerCore} Shared picker services consumed by the select, date, and time pickers.
 */
export function createReservationPickerCore() {
    /** @type {HTMLDivElement} */
    const pickerBackdrop = element`<div
        class="reservas-picker-backdrop"
        hidden
    ></div>`;
    document.body.append(pickerBackdrop);

    // Reúne los listeners de documento y ventana para poder retirarlos juntos.
    const listeners = new AbortController();
    const signal = { signal: listeners.signal };

    /** @type {((options?: { focus?: boolean }) => void) | null} */
    let activePickerClose = null;
    /** @type {(() => void) | null} */
    let activePickerRefresh = null;
    /** @type {((options?: { focus?: boolean }) => void) | null} */
    let modalPickerClose = null;

    /**
     * @param {(options?: { focus?: boolean }) => void} close
     * @param {(() => void) | null} [refresh]
     */
    const activatePicker = (close, refresh = null) => {
        if (activePickerClose && activePickerClose !== close) {
            activePickerClose();
        }

        activePickerClose = close;
        activePickerRefresh = refresh;

        if (isMobilePicker()) {
            modalPickerClose = close;
            pickerBackdrop.hidden = false;
            document.body.classList.add("has-picker-modal");
        }
    };

    /** @param {(options?: { focus?: boolean }) => void} close */
    const deactivatePicker = (close) => {
        if (activePickerClose === close) {
            activePickerClose = null;
            activePickerRefresh = null;
        }

        if (modalPickerClose === close) {
            modalPickerClose = null;
            pickerBackdrop.hidden = true;
            document.body.classList.remove("has-picker-modal");
        }
    };

    pickerBackdrop.addEventListener(
        "pointerdown",
        (event) => {
            event.preventDefault();

            if (activePickerClose) {
                activePickerClose({ focus: true });
            }
        },
        signal,
    );

    // Al cruzar el punto de corte el panel pasa de popover a hoja modal: se
    // cierra para que el usuario lo reabra ya en su nueva forma.
    onMobilePickerChange(() => activePickerClose?.(), signal);

    // El panel va anclado al desencadenante (posición absoluta), así que sigue
    // el layout al redimensionar; lo que hay que recalcular es su alto máximo.
    window.addEventListener("resize", () => activePickerRefresh?.(), {
        passive: true,
        ...signal,
    });

    window.addEventListener("scroll", () => activePickerRefresh?.(), {
        passive: true,
        ...signal,
    });

    return {
        isMobilePicker,
        activatePicker,
        deactivatePicker,
        createIcon,
        getLabelText,
        getFieldLabelId,
        getDescribedBy,
        createPickerShell,
        positionPickerPanel,
        keepFocusedInPanel,
        trapMobilePickerFocus,
        createPickerTrigger,
        /** Retira los listeners de fondo, resize y scroll. */
        destroy: () => listeners.abort(),
    };
}
