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

        const button = document.createElement("button");
        button.type = "button";
        button.id = buttonId;
        button.className = "reservas-select__button reservas-picker__button";
        button.setAttribute("role", "combobox");
        button.setAttribute("aria-haspopup", "listbox");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", menuId);

        if (native.required) {
            button.setAttribute("aria-required", "true");
        }

        if (describedBy) {
            button.setAttribute("aria-describedby", describedBy);
        }

        if (label) {
            if (!label.id) label.id = `${native.id}-label`;

            button.setAttribute("aria-labelledby", `${label.id} ${valueId}`);
        }

        const icon = document.createElement("span");
        icon.className = "icon reservas-select__icon";
        icon.setAttribute("aria-hidden", "true");

        const value = document.createElement("span");
        value.className = "reservas-select__value";
        value.id = valueId;

        const chevron = document.createElement("span");
        chevron.className = "icon reservas-select__chevron";
        chevron.setAttribute("aria-hidden", "true");
        chevron.textContent = "expand_more";

        button.append(icon, value, chevron);

        const menu = document.createElement("div");
        menu.className = "reservas-select__menu reservas-picker__panel";
        menu.id = menuId;
        menu.setAttribute("role", "listbox");
        menu.hidden = true;

        if (label) {
            menu.setAttribute("aria-labelledby", label.id);
        }

        /** @type {HTMLDivElement[]} */
        const optionEls = [];

        for (const option of native.options) {
            if (option.disabled) continue;

            const item = document.createElement("div");
            item.className = "reservas-select__option";
            item.id = `${native.id}-option-${optionEls.length}`;
            item.setAttribute("role", "option");
            item.dataset.value = option.value;
            item.tabIndex = -1;

            const optionIcon = document.createElement("span");
            optionIcon.className = "icon reservas-select__option-icon";
            optionIcon.setAttribute("aria-hidden", "true");
            optionIcon.textContent = option.dataset.icon || "circle";

            const optionLabel = document.createElement("span");
            optionLabel.className = "reservas-select__option-label";
            optionLabel.textContent = option.textContent.trim();

            const check = document.createElement("span");
            check.className = "icon reservas-select__check";
            check.setAttribute("aria-hidden", "true");
            check.textContent = "check";

            item.append(optionIcon, optionLabel, check);
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
            onTriggerKeydown: (event, { open: openPicker, close: closePicker, isOpen }) => {
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
