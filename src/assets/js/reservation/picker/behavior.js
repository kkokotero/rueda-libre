/**
 * Ciclo de vida compartido por los tres pickers (fecha, hora y select).
 *
 * Cada picker construye su propio botón, panel y contenido; esta factory
 * registra todo lo que se repetía entre los tres: apertura y cierre, Escape,
 * el clic fuera del panel, el posicionamiento, el foco y el montaje del
 * shell. Así, un cambio de comportamiento (p. ej. cómo se cierra) se toca en
 * un solo archivo en lugar de tres.
 */

/**
 * @typedef {object} PickerKeyHelpers
 * @property {() => void} open
 * @property {(options?: { focus?: boolean }) => void} close
 * @property {() => boolean} isOpen
 */

/**
 * @typedef {object} PickerBehaviorConfig
 * @property {HTMLElement} wrapper contenedor del disparador y del panel
 * @property {HTMLButtonElement} button disparador ya construido
 * @property {HTMLElement} panel panel ya construido, aún sin montar
 * @property {HTMLElement} native control original que queda oculto
 * @property {HTMLLabelElement | null} label
 * @property {string} titleText
 * @property {number} panelHeight alto máximo usado para posicionar el panel
 * @property {boolean} [keepFocus] gestiona Tab-trapping y scroll al foco
 *   (paneles tipo diálogo); los listbox lo desactivan
 * @property {() => void} [onOpen] estado previo a mostrarse (p. ej. regenerar el contenido)
 * @property {() => void} [onShown] render y foco iniciales tras mostrarse
 * @property {() => void} [onClosed] limpieza específica tras ocultar
 * @property {(event: KeyboardEvent, helpers: PickerKeyHelpers) => boolean} [onTriggerKeydown]
 *   maneja teclas propias del disparador; debe devolver `true` cuando la consume
 */

/**
 * Registra el ciclo de vida de un picker y devuelve sus controles.
 *
 * @param {import("../picker-core.js").ReservationPickerCore} pickerCore
 * @param {PickerBehaviorConfig} config
 * @returns {{ open: () => void, close: (options?: { focus?: boolean }) => void, finalize: () => void }}
 */
export function createPickerBehavior(pickerCore, config) {
    const {
        wrapper,
        button,
        panel,
        native,
        label,
        titleText,
        panelHeight,
        keepFocus = true,
        onOpen,
        onShown,
        onClosed,
        onTriggerKeydown,
    } = config;

    const {
        isMobilePicker,
        activatePicker,
        deactivatePicker,
        createPickerShell,
        positionPickerPanel,
        keepFocusedInPanel,
        trapMobilePickerFocus,
    } = pickerCore;

    /** @returns {boolean} */
    const isOpen = () => !panel.hidden;

    /** @param {{ focus?: boolean }} [options] */
    const close = ({ focus = false } = {}) => {
        if (panel.hidden) return;

        panel.hidden = true;
        panel.style.maxHeight = "";
        panel.removeAttribute("aria-modal");
        wrapper.classList.remove("is-open", "is-up", "is-mobile-modal");
        button.setAttribute("aria-expanded", "false");
        onClosed?.();
        deactivatePicker(close);

        if (focus) button.focus();
    };

    /** Vuelve a posicionar el panel abierto tras un resize o scroll. */
    const refresh = () => {
        if (panel.hidden) return;

        positionPickerPanel(wrapper, button, panel, panelHeight);

        if (keepFocus) keepFocusedInPanel(panel);
    };

    const open = () => {
        if (!panel.hidden) return;

        onOpen?.();

        activatePicker(close, refresh);

        panel.hidden = false;
        wrapper.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");

        if (isMobilePicker()) {
            wrapper.classList.add("is-mobile-modal");

            // `aria-modal` solo es válido en diálogos; el listbox del select
            // no lo lleva.
            if (panel.getAttribute("role") === "dialog") {
                panel.setAttribute("aria-modal", "true");
            }
        }

        onShown?.();

        positionPickerPanel(wrapper, button, panel, panelHeight);

        if (keepFocus) keepFocusedInPanel(panel);
    };

    button.addEventListener("click", () => {
        if (panel.hidden) {
            open();
        } else {
            close({ focus: true });
        }
    });

    button.addEventListener("keydown", (event) => {
        if (onTriggerKeydown?.(event, { open, close, isOpen })) return;

        if (
            panel.hidden &&
            (event.key === "ArrowDown" || event.key === "ArrowUp")
        ) {
            event.preventDefault();
            open();
        } else if (event.key === "Escape" && !panel.hidden) {
            event.preventDefault();
            close({ focus: true });
        }
    });

    panel.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            close({ focus: true });
        }
    });

    document.addEventListener("pointerdown", (event) => {
        const target = event.target;
        if (
            target instanceof Node &&
            !panel.hidden &&
            !wrapper.contains(target)
        ) {
            close();
        }
    });

    if (label) {
        label.addEventListener("click", (event) => {
            event.preventDefault();
            button.focus();
        });
    }

    /** Monta el panel en el wrapper y oculta el control nativo. */
    const finalize = () => {
        const { shell } = createPickerShell(panel, titleText, () =>
            close({ focus: true }),
        );

        if (keepFocus) trapMobilePickerFocus(shell);

        wrapper.append(button, shell);
        wrapper.classList.add("is-enhanced");
        native.tabIndex = -1;
        native.setAttribute("aria-hidden", "true");
    };

    return { open, close, finalize };
}
