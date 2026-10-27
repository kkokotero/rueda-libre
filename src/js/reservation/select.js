/**
 * Selector personalizado para los `<select>` nativos del formulario.
 *
 * Cada select se convierte en un botón con `role="combobox"` que abre una
 * lista de opciones. El select original se conserva oculto como fuente de
 * verdad y sigue emitiendo `change`, así la validación y el envío del
 * formulario no cambian.
 */

export function initializeReservationSelects(pickerCore) {
    const {
        isMobilePicker,
        activatePicker,
        deactivatePicker,
        getDescribedBy,
        getLabelText,
        createPickerShell,
        positionPickerPanel,
    } = pickerCore;

    const enhanceSelect = (wrapper) => {
        const native = wrapper.querySelector("select");

        if (!native || wrapper.classList.contains("is-enhanced")) {
            return;
        }

        wrapper.classList.add("reservas-picker");

        const label = native.labels?.[0] || null;
        const describedBy = getDescribedBy(native);
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
            icon.textContent =
                (selected && selected.dataset.icon) || "circle";

            for (const option of optionEls) {
                option.setAttribute(
                    "aria-selected",
                    String(option.dataset.value === selectedValue),
                );
            }
        };

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

        const close = ({ focus = false } = {}) => {
            if (menu.hidden) return;

            menu.hidden = true;
            menu.style.maxHeight = "";
            wrapper.classList.remove(
                "is-open",
                "is-up",
                "is-mobile-modal",
            );
            button.setAttribute("aria-expanded", "false");
            button.removeAttribute("aria-activedescendant");

            for (const option of optionEls) {
                option.classList.remove("is-active");
            }

            activeIndex = -1;
            deactivatePicker(close);

            if (focus) button.focus();
        };

        const open = () => {
            if (!menu.hidden) return;

            activatePicker(close, () => {
                if (!menu.hidden) {
                    positionPickerPanel(wrapper, button, menu, 256);
                }
            });
            menu.hidden = false;
            wrapper.classList.add("is-open");

            if (isMobilePicker()) {
                wrapper.classList.add("is-mobile-modal");
            }

            button.setAttribute("aria-expanded", "true");
            positionPickerPanel(wrapper, button, menu, 256);

            const selectedIndex = optionEls.findIndex(
                (option) => option.dataset.value === native.value,
            );

            setActive(selectedIndex >= 0 ? selectedIndex : 0);
        };

        const selectOption = (index) => {
            const option = optionEls[index];

            if (!option) return;

            native.value = option.dataset.value;
            native.dispatchEvent(new Event("change", { bubbles: true }));
            close({ focus: true });
        };

        button.addEventListener("click", () => {
            if (menu.hidden) {
                open();
            } else {
                close();
            }
        });

        button.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                if (menu.hidden) {
                    open();
                } else {
                    setActive(activeIndex + 1);
                }
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                if (menu.hidden) {
                    open();
                } else {
                    setActive(activeIndex - 1);
                }
            } else if (event.key === "Home") {
                if (!menu.hidden) {
                    event.preventDefault();
                    setActive(0);
                }
            } else if (event.key === "End") {
                if (!menu.hidden) {
                    event.preventDefault();
                    setActive(optionEls.length - 1);
                }
            } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (menu.hidden) {
                    open();
                } else {
                    selectOption(activeIndex);
                }
            } else if (event.key === "Escape") {
                if (!menu.hidden) {
                    event.preventDefault();
                    close({ focus: true });
                }
            } else if (event.key === "Tab") {
                close();
            }
        });

        optionEls.forEach((option, index) => {
            option.addEventListener("mouseenter", () => {
                setActive(index);
            });
            option.addEventListener("mousedown", (event) => {
                event.preventDefault();
            });
            option.addEventListener("click", () => {
                selectOption(index);
            });
        });

        menu.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                close({ focus: true });
            }
        });

        document.addEventListener("pointerdown", (event) => {
            if (!menu.hidden && !wrapper.contains(event.target)) {
                close();
            }
        });

        if (label) {
            label.addEventListener("click", (event) => {
                if (!wrapper.classList.contains("is-enhanced")) {
                    return;
                }

                event.preventDefault();
                button.focus();
            });
        }

        native.addEventListener("change", updateDisplay);

        const titleText = getLabelText(label) || "Selecciona una opción";
        const { shell } = createPickerShell(menu, titleText, () =>
            close({ focus: true }),
        );

        wrapper.append(button, shell);
        wrapper.classList.add("is-enhanced");
        native.tabIndex = -1;
        native.setAttribute("aria-hidden", "true");
        updateDisplay();
    };

    document.querySelectorAll("[data-select]").forEach(enhanceSelect);
}
