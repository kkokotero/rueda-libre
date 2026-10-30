/**
 * Selector personalizado para los `<select>` nativos del formulario.
 *
 * Cada select se convierte en un botón con `role="combobox"` que abre una
 * lista de opciones. El select original se conserva oculto como fuente de
 * verdad y sigue emitiendo `change`, así la validación y el envío del
 * formulario no cambian.
 *
 * El ciclo de vida del panel (abrir, cerrar, Escape, clic fuera) vive en
 * `./picker/behavior.js`; aquí queda el combobox: opciones, teclado y
 * selección.
 */

import { element } from "../shared/html.js";
import { createPickerBehavior } from "./picker/behavior.js";

/**
 * Replaces native selects with accessible custom listboxes.
 * @param {import("./picker-core.js").ReservationPickerCore} pickerCore
 * @returns {void}
 */
export function initializeReservationSelects(pickerCore) {
    const { getDescribedBy, getLabelText } = pickerCore;

    /** @param {Element} wrapper */
    const enhanceSelect = (wrapper) => {
        if (!(wrapper instanceof HTMLElement)) return;
        /** @type {HTMLSelectElement | null} */
        const native = wrapper.querySelector("select");

        if (!native || wrapper.classList.contains("is-enhanced")) {
            return;
        }

        wrapper.classList.add("reservas-picker");

        const label = native.labels?.[0] || null;
        const describedBy = getDescribedBy(native);
        const titleText = getLabelText(label) || "Selecciona una opción";
        const valueId = `${native.id}-value`;
        const buttonId = `${native.id}-button`;
        const menuId = `${native.id}-listbox`;

        const icon = element`<span class="icon reservas-select__icon" aria-hidden="true"></span>`;
        const value = element`<span class="reservas-select__value" id="${valueId}"></span>`;
        const chevron = element`<span class="icon reservas-select__chevron" aria-hidden="true">expand_more</span>`;

        /** @type {HTMLButtonElement} */
        const button = element`<button
            type="button"
            id="${buttonId}"
            class="reservas-select__button reservas-picker__button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded="false"
            aria-controls="${menuId}"
            aria-required="${native.required}">${icon}${value}${chevron}</button>`;

        if (describedBy) {
            button.setAttribute("aria-describedby", describedBy);
        }

        if (label) {
            if (!label.id) label.id = `${native.id}-label`;

            button.setAttribute("aria-labelledby", `${label.id} ${valueId}`);
        }

        /** @type {HTMLDivElement} */
        const menu = element`<div
            class="reservas-select__menu reservas-picker__panel"
            id="${menuId}"
            role="listbox"
            hidden></div>`;

        if (label) {
            menu.setAttribute("aria-labelledby", label.id);
        }

        /** @type {HTMLDivElement[]} */
        const optionEls = [];

        for (const option of native.options) {
            if (option.disabled) continue;

            /** @type {HTMLDivElement} */
            const item = element`<div
                class="reservas-select__option"
                id="${native.id}-option-${optionEls.length}"
                role="option"
                data-value="${option.value}"
                tabindex="-1">
                <span class="icon reservas-select__option-icon" aria-hidden="true">${option.dataset.icon || "circle"}</span>
                <span class="reservas-select__option-label">${option.textContent.trim()}</span>
                <span class="icon reservas-select__check" aria-hidden="true">check</span>
            </div>`;

            menu.append(item);
            optionEls.push(item);
        }

        let activeIndex = -1;

        const updateDisplay = () => {
            const selected = native.options[native.selectedIndex];
            const selectedValue = selected ? selected.value : "";

            value.textContent = selected
                ? selected.textContent.trim()
                : "Selecciona una opción";
            value.classList.toggle("is-placeholder", selectedValue === "");
            icon.textContent = selected?.dataset.icon || "circle";

            for (const option of optionEls) {
                option.setAttribute(
                    "aria-selected",
                    String(option.dataset.value === selectedValue),
                );
            }
        };

        /** @param {number} index */
        const setActive = (index) => {
            if (!optionEls.length) return;

            activeIndex = (index + optionEls.length) % optionEls.length;

            optionEls.forEach((option, optionIndex) => {
                option.classList.toggle(
                    "is-active",
                    optionIndex === activeIndex,
                );
            });

            const active = optionEls[activeIndex];
            button.setAttribute("aria-activedescendant", active.id);

            if (
                active.offsetTop < menu.scrollTop ||
                active.offsetTop + active.offsetHeight >
                    menu.scrollTop + menu.clientHeight
            ) {
                menu.scrollTop =
                    active.offsetTop -
                    menu.clientHeight / 2 +
                    active.offsetHeight / 2;
            }
        };

        /** @param {number} index */
        const selectOption = (index) => {
            const option = optionEls[index];

            if (!option) return;

            const selectedValue = option.dataset.value;
            if (selectedValue === undefined) return;

            native.value = selectedValue;
            native.dispatchEvent(new Event("change", { bubbles: true }));
            close({ focus: true });
        };

        optionEls.forEach((option, index) => {
            option.addEventListener("mouseenter", () => setActive(index));
            option.addEventListener("mousedown", (event) => {
                event.preventDefault();
            });
            option.addEventListener("click", () => selectOption(index));
        });

        native.addEventListener("change", updateDisplay);

        const { close, finalize } = createPickerBehavior(pickerCore, {
            wrapper,
            button,
            panel: menu,
            native,
            label,
            titleText,
            panelHeight: 256,
            // El listbox no atrapa el Tab ni ajusta el scroll al foco: la
            // navegación con Tab cierra el menú.
            keepFocus: false,
            onShown: () => {
                const selectedIndex = optionEls.findIndex(
                    (option) => option.dataset.value === native.value,
                );

                setActive(Math.max(selectedIndex, 0));
            },
            onClosed: () => {
                button.removeAttribute("aria-activedescendant");

                for (const option of optionEls) {
                    option.classList.remove("is-active");
                }

                activeIndex = -1;
            },
            // Teclado propio del combobox: flechas, Inicio/Fin, Enter/Espacio,
            // Escape y Tab. Devuelve `true` para que no actúe el handler base.
            onTriggerKeydown: (
                event,
                { open: openPicker, close: closePicker, isOpen },
            ) => {
                if (event.key === "ArrowDown") {
                    event.preventDefault();

                    if (isOpen()) {
                        setActive(activeIndex + 1);
                    } else {
                        openPicker();
                    }
                } else if (event.key === "ArrowUp") {
                    event.preventDefault();

                    if (isOpen()) {
                        setActive(activeIndex - 1);
                    } else {
                        openPicker();
                    }
                } else if (event.key === "Home") {
                    if (isOpen()) {
                        event.preventDefault();
                        setActive(0);
                    }
                } else if (event.key === "End") {
                    if (isOpen()) {
                        event.preventDefault();
                        setActive(optionEls.length - 1);
                    }
                } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();

                    if (isOpen()) {
                        selectOption(activeIndex);
                    } else {
                        openPicker();
                    }
                } else if (event.key === "Escape") {
                    if (isOpen()) {
                        event.preventDefault();
                        closePicker({ focus: true });
                    }
                } else if (event.key === "Tab") {
                    closePicker();
                } else {
                    return false;
                }

                return true;
            },
        });

        finalize();
        updateDisplay();
    };

    document.querySelectorAll("[data-select]").forEach(enhanceSelect);
}
