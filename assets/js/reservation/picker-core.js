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
import {
    keepFocusedInPanel,
    trapMobilePickerFocus,
} from "./picker/focus.js";

export function createReservationPickerCore() {
    const pickerBackdrop = document.createElement("div");
    pickerBackdrop.className = "reservas-picker-backdrop";
    pickerBackdrop.hidden = true;
    document.body.append(pickerBackdrop);

    // Reúne los listeners de documento y ventana para poder retirarlos juntos.
    const listeners = new AbortController();
    const signal = { signal: listeners.signal };

    let activePickerClose = null;
    let activePickerRefresh = null;
    let modalPickerClose = null;

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
    window.addEventListener(
        "resize",
        () => activePickerRefresh?.(),
        { passive: true, ...signal },
    );

    window.addEventListener(
        "scroll",
        () => activePickerRefresh?.(),
        { passive: true, ...signal },
    );

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
