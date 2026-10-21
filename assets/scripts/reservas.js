(() => {
    const form = document.getElementById("reservation-form");
    const status = document.getElementById("reservation-status");

    if (!form || !status) return;

    const dateField = form.elements.namedItem("fecha");
    const documentNumber = form.elements.namedItem("documento");
    const phoneNumber = form.elements.namedItem("telefono");

    if (documentNumber instanceof HTMLInputElement) {
        documentNumber.addEventListener("input", () => {
            documentNumber.value = documentNumber.value.replace(
                /[^0-9]/g,
                "",
            );
        });
    }

    if (phoneNumber instanceof HTMLInputElement) {
        phoneNumber.addEventListener("input", () => {
            phoneNumber.value = phoneNumber.value
                .replace(/[^0-9]/g, "")
                .slice(0, 12);
        });
    }

    if (dateField) {
        const now = new Date();
        const localToday = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000,
        );
        dateField.min = localToday.toISOString().slice(0, 10);
    }

    const REQUIRED_MESSAGES = {
        nombre: "Escribe tu nombre completo.",
        tipo_documento: "Selecciona el tipo de documento.",
        documento: "Escribe tu número de documento.",
        metodo_contacto: "Elige cómo prefieres que te contactemos.",
        email: "Escribe tu correo electrónico.",
        telefono: "Escribe tu teléfono.",
        fecha: "Elige la fecha de inicio.",
        hora: "Elige la hora de inicio.",
        tipo: "Selecciona el tipo de bicicleta.",
        cantidad: "Indica cuántas bicicletas necesitas.",
        duracion: "Selecciona la duración.",
        consentimiento: "Acepta el contacto para continuar.",
    };

    const clearStatus = () => {
        status.classList.remove("is-visible");
        status.replaceChildren();
    };

    const MOBILE_PICKER_QUERY = "(max-width: 720px)";
    const isMobilePicker = () =>
        window.matchMedia(MOBILE_PICKER_QUERY).matches;

    const pickerBackdrop = document.createElement("div");
    pickerBackdrop.className = "reservas-picker-backdrop";
    pickerBackdrop.hidden = true;
    document.body.append(pickerBackdrop);

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

    pickerBackdrop.addEventListener("pointerdown", (event) => {
        event.preventDefault();

        if (activePickerClose) {
            activePickerClose({ focus: true });
        }
    });

    window.addEventListener("resize", () => {
        if (activePickerClose) {
            activePickerClose();
        }
    });

    window.addEventListener(
        "scroll",
        () => {
            if (activePickerRefresh) {
                activePickerRefresh();
            }
        },
        { passive: true },
    );

    const createIcon = (name, className = "") => {
        const icon = document.createElement("span");
        icon.className = `icon${className ? ` ${className}` : ""}`;
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = name;
        return icon;
    };

    const getLabelText = (label) => {
        if (!label) return "";

        const clone = label.cloneNode(true);
        clone
            .querySelectorAll(
                ".reservas-form__required, .reservas-form__optional",
            )
            .forEach((element) => element.remove());

        return clone.textContent.replace(/\s+/g, " ").trim();
    };

    const getFieldLabelId = (label, native) => {
        if (!label) return "";

        if (!label.id) {
            label.id = `${native.id}-label`;
        }

        return label.id;
    };

    const getDescribedBy = (native) => {
        const error = document.getElementById(
            `${native.id}-error`,
        );

        return [native.getAttribute("aria-describedby"), error?.id]
            .filter(Boolean)
            .filter((id, index, ids) => ids.indexOf(id) === index)
            .join(" ");
    };

    const createPickerHeader = (titleText, onClose) => {
        const header = document.createElement("div");
        header.className = "reservas-picker__header";

        const title = document.createElement("p");
        title.className = "reservas-picker__title";
        title.textContent = titleText;

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "reservas-picker__close";
        closeButton.setAttribute("aria-label", "Cerrar");
        closeButton.append(createIcon("close"));
        closeButton.addEventListener("click", onClose);

        header.append(title, closeButton);

        return { header, closeButton };
    };

    const createPickerShell = (panel, titleText, onClose) => {
        const shell = document.createElement("div");
        shell.className = "reservas-picker__shell";

        const { header, closeButton } = createPickerHeader(
            titleText,
            onClose,
        );

        shell.append(header, panel);

        return { shell, closeButton };
    };

    const positionPickerPanel = (
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
        const headerBottom = header
            ? header.getBoundingClientRect().bottom
            : 0;
        const topLimit = Math.max(16, headerBottom + 12);
        const spaceBelow =
            window.innerHeight -
            triggerRect.bottom -
            safeMargin -
            gap;
        const spaceAbove =
            triggerRect.top - topLimit - gap;
        const openUp =
            spaceBelow < panelHeight && spaceAbove > spaceBelow;

        wrapper.classList.toggle("is-up", openUp);
        panel.style.maxHeight = `${Math.max(
            140,
            Math.min(maxHeight, openUp ? spaceAbove : spaceBelow),
        )}px`;
    };

    const keepFocusedInPanel = (panel) => {
        const active = document.activeElement;

        if (!active || !panel.contains(active)) return;

        const activeRect = active.getBoundingClientRect();
        const panelRect = panel.getBoundingClientRect();
        const padding = 8;

        if (activeRect.top < panelRect.top + padding) {
            panel.scrollTop -=
                panelRect.top + padding - activeRect.top;
        } else if (
            activeRect.bottom >
            panelRect.bottom - padding
        ) {
            panel.scrollTop +=
                activeRect.bottom - (panelRect.bottom - padding);
        }
    };

    const trapMobilePickerFocus = (shell) => {
        shell.addEventListener("keydown", (event) => {
            if (event.key !== "Tab" || !isMobilePicker()) return;

            const focusables = Array.from(
                shell.querySelectorAll("button:not(:disabled)"),
            ).filter((element) => element.offsetParent !== null);

            if (!focusables.length) return;

            const first = focusables[0];
            const last = focusables[focusables.length - 1];

            if (
                event.shiftKey &&
                document.activeElement === first
            ) {
                event.preventDefault();
                last.focus();
            } else if (
                !event.shiftKey &&
                document.activeElement === last
            ) {
                event.preventDefault();
                first.focus();
            }
        });
    };

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
        button.className =
            "reservas-select__button reservas-picker__button";
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

            button.setAttribute(
                "aria-labelledby",
                `${label.id} ${valueId}`,
            );
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
        menu.className =
            "reservas-select__menu reservas-picker__panel";
        menu.id = menuId;
        menu.setAttribute("role", "listbox");
        menu.hidden = true;

        if (label) {
            menu.setAttribute("aria-labelledby", label.id);
        }

        const optionEls = [];

        Array.from(native.options).forEach((option) => {
            if (option.disabled) return;

            const item = document.createElement("div");
            item.className = "reservas-select__option";
            item.id = `${native.id}-option-${optionEls.length}`;
            item.setAttribute("role", "option");
            item.dataset.value = option.value;
            item.tabIndex = -1;

            const optionIcon = document.createElement("span");
            optionIcon.className =
                "icon reservas-select__option-icon";
            optionIcon.setAttribute("aria-hidden", "true");
            optionIcon.textContent =
                option.dataset.icon || "circle";

            const optionLabel = document.createElement("span");
            optionLabel.className =
                "reservas-select__option-label";
            optionLabel.textContent = option.textContent.trim();

            const check = document.createElement("span");
            check.className = "icon reservas-select__check";
            check.setAttribute("aria-hidden", "true");
            check.textContent = "check";

            item.append(optionIcon, optionLabel, check);
            menu.append(item);
            optionEls.push(item);
        });

        let activeIndex = -1;

        const updateDisplay = () => {
            const selected = native.options[native.selectedIndex];
            const selectedValue = selected
                ? selected.value
                : "";

            value.textContent = selected
                ? selected.textContent.trim()
                : "Selecciona una opción";
            value.classList.toggle(
                "is-placeholder",
                selectedValue === "",
            );
            icon.textContent =
                (selected && selected.dataset.icon) || "circle";

            optionEls.forEach((option) => {
                option.setAttribute(
                    "aria-selected",
                    String(
                        option.dataset.value === selectedValue,
                    ),
                );
            });
        };

        const setActive = (index) => {
            if (!optionEls.length) return;

            activeIndex =
                (index + optionEls.length) % optionEls.length;

            optionEls.forEach((option, optionIndex) => {
                option.classList.toggle(
                    "is-active",
                    optionIndex === activeIndex,
                );
            });

            const active = optionEls[activeIndex];
            button.setAttribute(
                "aria-activedescendant",
                active.id,
            );

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
            optionEls.forEach((option) => {
                option.classList.remove("is-active");
            });
            activeIndex = -1;
            deactivatePicker(close);

            if (focus) button.focus();
        };

        const open = () => {
            if (!menu.hidden) return;

            activatePicker(close, () => {
                if (!menu.hidden) {
                    positionPickerPanel(
                        wrapper,
                        button,
                        menu,
                        256,
                    );
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
                (option) =>
                    option.dataset.value === native.value,
            );

            setActive(selectedIndex >= 0 ? selectedIndex : 0);
        };

        const selectOption = (index) => {
            const option = optionEls[index];

            if (!option) return;

            native.value = option.dataset.value;
            native.dispatchEvent(
                new Event("change", { bubbles: true }),
            );
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
            } else if (
                event.key === "Enter" ||
                event.key === " "
            ) {
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
            if (
                !menu.hidden &&
                !wrapper.contains(event.target)
            ) {
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

        const titleText =
            getLabelText(label) || "Selecciona una opción";
        const { shell } = createPickerShell(
            menu,
            titleText,
            () => close({ focus: true }),
        );

        wrapper.append(button, shell);
        wrapper.classList.add("is-enhanced");
        native.tabIndex = -1;
        native.setAttribute("aria-hidden", "true");
        updateDisplay();
    };

    document
        .querySelectorAll("[data-select]")
        .forEach(enhanceSelect);

    const createPickerTrigger = (
        native,
        label,
        describedBy,
        titleText,
    ) => {
        const valueId = `${native.id}-value`;
        const panelId = `${native.id}-panel`;
        const labelId = getFieldLabelId(label, native);

        const button = document.createElement("button");
        button.type = "button";
        button.id = `${native.id}-button`;
        button.className =
            "reservas-form__input reservas-picker__button";
        button.setAttribute("aria-haspopup", "dialog");
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-controls", panelId);

        if (native.required) {
            button.setAttribute("aria-required", "true");
        }

        if (describedBy) {
            button.setAttribute("aria-describedby", describedBy);
        }

        if (labelId) {
            button.setAttribute(
                "aria-labelledby",
                `${labelId} ${valueId}`,
            );
        } else {
            button.setAttribute("aria-label", titleText);
        }

        const value = document.createElement("span");
        value.className = "reservas-picker__value";
        value.id = valueId;

        const chevron = createIcon(
            "expand_more",
            "reservas-picker__chevron",
        );

        button.append(value, chevron);

        return { button, value, panelId };
    };

    const enhanceDatePicker = (wrapper) => {
        const native = wrapper.querySelector('input[type="date"]');

        if (!native || wrapper.classList.contains("is-enhanced")) {
            return;
        }

        const label = native.labels?.[0] || null;
        const titleText = getLabelText(label) || "Fecha de inicio";
        const describedBy = getDescribedBy(native);
        const { button, value, panelId } = createPickerTrigger(
            native,
            label,
            describedBy,
            titleText,
        );

        button.classList.add("reservas-datepicker__button");

        const panel = document.createElement("div");
        panel.id = panelId;
        panel.className =
            "reservas-picker__panel reservas-datepicker__panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", titleText);
        panel.hidden = true;

        const calendarHeader = document.createElement("div");
        calendarHeader.className = "reservas-datepicker__header";

        const previousMonth = document.createElement("button");
        previousMonth.type = "button";
        previousMonth.className = "reservas-datepicker__nav";
        previousMonth.setAttribute("aria-label", "Mes anterior");
        previousMonth.append(createIcon("chevron_left"));

        const monthLabel = document.createElement("p");
        monthLabel.className = "reservas-datepicker__month";
        monthLabel.id = `${native.id}-month`;
        monthLabel.setAttribute("aria-live", "polite");

        const nextMonth = document.createElement("button");
        nextMonth.type = "button";
        nextMonth.className = "reservas-datepicker__nav";
        nextMonth.setAttribute("aria-label", "Mes siguiente");
        nextMonth.append(createIcon("chevron_right"));

        calendarHeader.append(
            previousMonth,
            monthLabel,
            nextMonth,
        );

        const weekdays = document.createElement("div");
        weekdays.className = "reservas-datepicker__weekdays";
        weekdays.setAttribute("aria-hidden", "true");

        ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].forEach(
            (day) => {
                const weekday = document.createElement("span");
                weekday.textContent = day;
                weekdays.append(weekday);
            },
        );

        const grid = document.createElement("div");
        grid.className = "reservas-datepicker__grid";
        grid.setAttribute("role", "group");
        grid.setAttribute("aria-labelledby", monthLabel.id);

        const footer = document.createElement("div");
        footer.className = "reservas-datepicker__footer";

        const shortcutDates = [
            { label: "Hoy", offset: 0 },
            { label: "Mañana", offset: 1 },
            { label: "+7 días", offset: 7 },
            { label: "+14 días", offset: 14 },
        ];
        const shortcutButtons = shortcutDates.map(
            ({ label, offset }) => {
                const shortcut = document.createElement("button");
                shortcut.type = "button";
                shortcut.className =
                    "reservas-datepicker__today";
                shortcut.textContent = label;
                shortcut.setAttribute(
                    "aria-label",
                    offset === 0
                        ? "Seleccionar hoy"
                        : `Seleccionar fecha en ${offset} días`,
                );
                shortcut.addEventListener("click", () => {
                    const date = new Date();
                    date.setDate(date.getDate() + offset);
                    const iso = toISODate(date);

                    if (
                        iso >= minISO &&
                        (!maxISO || iso <= maxISO)
                    ) {
                        selectDate(iso);
                    }
                });
                footer.append(shortcut);
                return { button: shortcut, offset };
            },
        );

        panel.append(calendarHeader, weekdays, grid, footer);

        const parseISODate = (iso) => {
            if (!iso) return null;

            const [year, month, day] = iso.split("-").map(Number);

            if (!year || !month || !day) return null;

            return new Date(year, month - 1, day);
        };

        const toISODate = (date) =>
            [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0"),
            ].join("-");

        const todayISO = toISODate(new Date());
        const minISO = native.min || todayISO;
        const maxISO = native.max || "";
        const minDate = parseISODate(minISO) || new Date();
        const maxDate = parseISODate(maxISO);
        const minMonthStart = new Date(
            minDate.getFullYear(),
            minDate.getMonth(),
            1,
        );
        const maxMonthStart = maxDate
            ? new Date(maxDate.getFullYear(), maxDate.getMonth(), 1)
            : null;

        const dateFormatter = new Intl.DateTimeFormat("es-CO", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

        const longDateFormatter = new Intl.DateTimeFormat(
            "es-CO",
            {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
            },
        );

        const monthFormatter = new Intl.DateTimeFormat("es-CO", {
            month: "long",
            year: "numeric",
        });

        const formatDate = (date) => dateFormatter.format(date);

        const formatDateLong = (date) =>
            longDateFormatter.format(date);

        const formatMonth = (year, month) => {
            const text = monthFormatter.format(
                new Date(year, month, 1),
            );

            return text.charAt(0).toUpperCase() + text.slice(1);
        };

        let selectedISO = native.value;
        let viewYear = minDate.getFullYear();
        let viewMonth = minDate.getMonth();

        const updateDisplay = () => {
            const date = parseISODate(native.value);

            value.textContent = date
                ? formatDate(date)
                : "Selecciona una fecha";
            value.classList.toggle("is-placeholder", !date);
        };

        const selectDate = (iso) => {
            native.value = iso;
            updateDisplay();
            native.dispatchEvent(
                new Event("change", { bubbles: true }),
            );
            close({ focus: true });
        };

        const renderCalendar = (focusISO = "") => {
            monthLabel.textContent = formatMonth(
                viewYear,
                viewMonth,
            );

            const currentMonth = new Date(
                viewYear,
                viewMonth,
                1,
            );

            previousMonth.disabled =
                currentMonth <= minMonthStart;
            nextMonth.disabled = maxMonthStart
                ? currentMonth >= maxMonthStart
                : false;

            grid.replaceChildren();

            const firstWeekday = new Date(
                viewYear,
                viewMonth,
                1,
            ).getDay();
            const leadingBlanks = (firstWeekday + 6) % 7;
            const daysInMonth = new Date(
                viewYear,
                viewMonth + 1,
                0,
            ).getDate();

            for (
                let index = 0;
                index < leadingBlanks;
                index += 1
            ) {
                const blank = document.createElement("span");
                blank.className = "reservas-datepicker__blank";
                blank.setAttribute("aria-hidden", "true");
                grid.append(blank);
            }

            for (
                let day = 1;
                day <= daysInMonth;
                day += 1
            ) {
                const date = new Date(
                    viewYear,
                    viewMonth,
                    day,
                );
                const iso = toISODate(date);
                const dayButton =
                    document.createElement("button");

                dayButton.type = "button";
                dayButton.className =
                    "reservas-datepicker__day";
                dayButton.dataset.date = iso;
                dayButton.textContent = String(day);
                dayButton.setAttribute(
                    "aria-label",
                    formatDateLong(date),
                );
                dayButton.setAttribute(
                    "aria-pressed",
                    String(iso === selectedISO),
                );

                if (iso === todayISO) {
                    dayButton.setAttribute(
                        "aria-current",
                        "date",
                    );
                }

                if (
                    iso < minISO ||
                    (maxISO && iso > maxISO)
                ) {
                    dayButton.disabled = true;
                }

                dayButton.addEventListener("click", () => {
                    selectDate(iso);
                });
                dayButton.addEventListener(
                    "keydown",
                    handleDayKeydown,
                );
                grid.append(dayButton);
            }

            const preferred = focusISO
                ? grid.querySelector(
                      `[data-date="${focusISO}"]:not(:disabled)`,
                  )
                : null;
            const fallback = grid.querySelector(
                "button:not(:disabled)",
            );
            const target = preferred || fallback;

            if (target) {
                target.focus({ preventScroll: true });
                keepFocusedInPanel(panel);
            }
        };

        const handleDayKeydown = (event) => {
            const currentDate = parseISODate(
                event.currentTarget.dataset.date,
            );

            if (!currentDate) return;

            const currentDay = currentDate.getDate();
            const currentWeekday =
                (currentDate.getDay() + 6) % 7;
            let nextDate = null;

            if (event.key === "ArrowLeft") {
                nextDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDay - 1,
                );
            } else if (event.key === "ArrowRight") {
                nextDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDay + 1,
                );
            } else if (event.key === "ArrowUp") {
                nextDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDay - 7,
                );
            } else if (event.key === "ArrowDown") {
                nextDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDay + 7,
                );
            } else if (event.key === "Home") {
                nextDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDay - currentWeekday,
                );
            } else if (event.key === "End") {
                nextDate = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    currentDay + (6 - currentWeekday),
                );
            } else if (
                event.key === "PageUp" ||
                event.key === "PageDown"
            ) {
                const monthDelta =
                    event.key === "PageUp" ? -1 : 1;
                const targetMonth = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + monthDelta,
                    1,
                );
                const daysInTargetMonth = new Date(
                    targetMonth.getFullYear(),
                    targetMonth.getMonth() + 1,
                    0,
                ).getDate();

                nextDate = new Date(
                    targetMonth.getFullYear(),
                    targetMonth.getMonth(),
                    Math.min(currentDay, daysInTargetMonth),
                );
            } else {
                return;
            }

            event.preventDefault();

            const nextISO = toISODate(nextDate);

            if (
                nextISO < minISO ||
                (maxISO && nextISO > maxISO)
            ) {
                return;
            }

            viewYear = nextDate.getFullYear();
            viewMonth = nextDate.getMonth();
            renderCalendar(nextISO);
        };

        const close = ({ focus = false } = {}) => {
            if (panel.hidden) return;

            panel.hidden = true;
            panel.style.maxHeight = "";
            panel.removeAttribute("aria-modal");
            wrapper.classList.remove(
                "is-open",
                "is-up",
                "is-mobile-modal",
            );
            button.setAttribute("aria-expanded", "false");
            deactivatePicker(close);

            if (focus) button.focus();
        };

        const open = () => {
            if (!panel.hidden) return;

            selectedISO = native.value;

            const initialDate =
                parseISODate(selectedISO) ||
                parseISODate(minISO) ||
                new Date();

            viewYear = initialDate.getFullYear();
            viewMonth = initialDate.getMonth();
            activatePicker(close, () => {
                if (panel.hidden) return;

                positionPickerPanel(
                    wrapper,
                    button,
                    panel,
                    420,
                );
                keepFocusedInPanel(panel);
            });
            panel.hidden = false;
            wrapper.classList.add("is-open");
            button.setAttribute("aria-expanded", "true");

            if (isMobilePicker()) {
                wrapper.classList.add("is-mobile-modal");
                panel.setAttribute("aria-modal", "true");
            }

            renderCalendar(selectedISO || minISO);
            positionPickerPanel(wrapper, button, panel, 420);
            keepFocusedInPanel(panel);
        };

        previousMonth.addEventListener("click", () => {
            const target = new Date(
                viewYear,
                viewMonth - 1,
                1,
            );

            viewYear = target.getFullYear();
            viewMonth = target.getMonth();
            renderCalendar(toISODate(target));
        });

        nextMonth.addEventListener("click", () => {
            const target = new Date(
                viewYear,
                viewMonth + 1,
                1,
            );

            viewYear = target.getFullYear();
            viewMonth = target.getMonth();
            renderCalendar(toISODate(target));
        });

        shortcutButtons.forEach(({ button: shortcut, offset }) => {
            const date = new Date();
            date.setDate(date.getDate() + offset);
            const iso = toISODate(date);
            shortcut.disabled =
                iso < minISO ||
                Boolean(maxISO && iso > maxISO);
        });

        button.addEventListener("click", () => {
            if (panel.hidden) {
                open();
            } else {
                close({ focus: true });
            }
        });

        button.addEventListener("keydown", (event) => {
            if (
                panel.hidden &&
                (event.key === "ArrowDown" ||
                    event.key === "ArrowUp")
            ) {
                event.preventDefault();
                open();
            } else if (
                event.key === "Escape" &&
                !panel.hidden
            ) {
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
            if (
                !panel.hidden &&
                !wrapper.contains(event.target)
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

        native.addEventListener("change", updateDisplay);

        const { shell } = createPickerShell(
            panel,
            titleText,
            () => close({ focus: true }),
        );

        trapMobilePickerFocus(shell);
        wrapper.append(button, shell);
        wrapper.classList.add("is-enhanced");
        native.tabIndex = -1;
        native.setAttribute("aria-hidden", "true");
        updateDisplay();
    };

    const enhanceTimePicker = (wrapper) => {
        const native = wrapper.querySelector('input[type="time"]');

        if (!native || wrapper.classList.contains("is-enhanced")) {
            return;
        }

        const label = native.labels?.[0] || null;
        const titleText = getLabelText(label) || "Hora de inicio";
        const describedBy = getDescribedBy(native);
        const { button, value, panelId } = createPickerTrigger(
            native,
            label,
            describedBy,
            titleText,
        );

        button.classList.add("reservas-timepicker__button");

        const panel = document.createElement("div");
        panel.id = panelId;
        panel.className =
            "reservas-picker__panel reservas-timepicker__panel";
        panel.setAttribute("role", "dialog");
        panel.setAttribute("aria-label", titleText);
        panel.hidden = true;

        const emptyState = document.createElement("div");
        emptyState.className =
            "reservas-timepicker__empty";

        const emptyMessage = document.createElement("p");
        emptyMessage.textContent =
            "Primero elige la fecha para ver los horarios disponibles.";

        const chooseDateButton = document.createElement("button");
        chooseDateButton.type = "button";
        chooseDateButton.className =
            "reservas-timepicker__choose-date";
        chooseDateButton.append(
            createIcon("calendar_month"),
            document.createTextNode("Elegir fecha"),
        );
        chooseDateButton.addEventListener("click", () => {
            close();
            document
                .querySelector(
                    '[data-picker="date"] .reservas-picker__button',
                )
                ?.click();
        });
        emptyState.append(emptyMessage, chooseDateButton);

        const wheels = document.createElement("div");
        wheels.className = "reservas-timepicker__wheels";

        const createWheel = (label) => {
            const section = document.createElement("section");
            section.className = "reservas-timepicker__wheel";

            const heading = document.createElement("h3");
            heading.className =
                "reservas-timepicker__wheel-title";
            heading.textContent = label;

            const list = document.createElement("div");
            list.className = "reservas-timepicker__wheel-list";
            list.setAttribute("role", "listbox");
            list.setAttribute("aria-label", label);

            section.append(heading, list);
            wheels.append(section);
            return list;
        };

        const hourWheel = createWheel("Hora");
        const minuteWheel = createWheel("Minutos");
        [hourWheel, minuteWheel].forEach((wheel) => {
            wheel.addEventListener(
                "click",
                (event) => {
                    if (!suppressWheelClick.has(wheel)) return;

                    suppressWheelClick.delete(wheel);
                    event.preventDefault();
                    event.stopImmediatePropagation();
                },
                true,
            );
        });
        const confirmTimeButton = document.createElement("button");
        confirmTimeButton.type = "button";
        confirmTimeButton.className =
            "reservas-timepicker__confirm";
        confirmTimeButton.textContent = "Listo";
        confirmTimeButton.addEventListener("click", () => {
            if (native.value) close({ focus: true });
        });

        panel.append(
            emptyState,
            wheels,
            confirmTimeButton,
        );

        const parseTime = (time) => {
            const [hours, minutes] = time.split(":").map(Number);
            return hours * 60 + minutes;
        };

        const toTime = (totalMinutes) => {
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;

            return `${String(hours).padStart(2, "0")}:${String(
                minutes,
            ).padStart(2, "0")}`;
        };

        const timeFormatter = new Intl.DateTimeFormat("es-CO", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        const formatTime = (time) => {
            const [hours, minutes] = time.split(":").map(Number);

            return timeFormatter.format(
                new Date(2000, 0, 1, hours, minutes),
            );
        };

        const stepMinutes = Math.max(
            5,
            Math.round((Number(native.step) || 900) / 60),
        );
        const dateNative =
            wrapper.closest("form")?.elements.namedItem("fecha");
        let availableTimes = [];
        let hourOptions = [];
        let minuteOptions = [];
        const wheelScrollTimers = new WeakMap();
        const userScrollingWheels = new WeakSet();
        const suppressWheelClick = new WeakSet();
        let activeWheelDrag = null;

        const parseISODate = (iso) => {
            if (!iso) return null;

            const [year, month, day] = iso.split("-").map(Number);
            if (!year || !month || !day) return null;

            return new Date(year, month - 1, day);
        };

        const toISODate = (date) =>
            [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0"),
            ].join("-");

        const getEasterSunday = (year) => {
            const a = year % 19;
            const b = Math.floor(year / 100);
            const c = year % 100;
            const d = Math.floor(b / 4);
            const e = b % 4;
            const f = Math.floor((b + 8) / 25);
            const g = Math.floor((b - f + 1) / 3);
            const h = (19 * a + b - d - g + 15) % 30;
            const i = Math.floor(c / 4);
            const k = c % 4;
            const l = (32 + 2 * e + 2 * i - h - k) % 7;
            const m = Math.floor((a + 11 * h + 22 * l) / 451);
            const month = Math.floor((h + l - 7 * m + 114) / 31);
            const day = ((h + l - 7 * m + 114) % 31) + 1;

            return new Date(year, month - 1, day);
        };

        const isColombianHoliday = (date) => {
            const year = date.getFullYear();
            const iso = toISODate(date);
            const fixedHolidays = [
                [1, 1],
                [5, 1],
                [7, 20],
                [8, 7],
                [12, 8],
                [12, 25],
            ].map(([month, day]) =>
                toISODate(new Date(year, month - 1, day)),
            );
            const movedHolidays = [
                [1, 6],
                [3, 19],
                [6, 29],
                [8, 15],
                [10, 12],
                [11, 1],
                [11, 11],
            ].map(([month, day]) => {
                const holiday = new Date(year, month - 1, day);
                holiday.setDate(
                    holiday.getDate() +
                        ((8 - holiday.getDay()) % 7),
                );
                return toISODate(holiday);
            });
            const easter = getEasterSunday(year);
            const easterHolidays = [-3, -2, 39, 60, 68].map(
                (offset) => {
                    const holiday = new Date(easter);
                    holiday.setDate(
                        holiday.getDate() + offset,
                    );
                    if (offset > 0) {
                        holiday.setDate(
                            holiday.getDate() +
                                ((8 - holiday.getDay()) % 7),
                        );
                    }
                    return toISODate(holiday);
                },
            );

            return [...fixedHolidays, ...movedHolidays, ...easterHolidays]
                .includes(iso);
        };

        const updateSlotsForDate = () => {
            const date = parseISODate(dateNative?.value || "");
            availableTimes = [];
            hourOptions = [];
            minuteOptions = [];
            hourWheel.replaceChildren();
            minuteWheel.replaceChildren();

            if (!date) {
                if (native.value) {
                    native.value = "";
                    native.dispatchEvent(
                        new Event("change", { bubbles: true }),
                    );
                }
                emptyMessage.textContent =
                    "Primero elige la fecha para ver los horarios disponibles.";
                emptyState.hidden = false;
                wheels.hidden = true;
                confirmTimeButton.hidden = true;
                return;
            }

            const weekend =
                date.getDay() === 0 || date.getDay() === 6;
            const holiday = isColombianHoliday(date);
            const opensAt = weekend || holiday ? 6 * 60 : 7 * 60;
            const closesAt = weekend || holiday ? 14 * 60 : 19 * 60;
            const today = new Date();
            let firstAvailable = opensAt;

            if (toISODate(date) === toISODate(today)) {
                const currentMinutes =
                    today.getHours() * 60 + today.getMinutes();
                firstAvailable =
                    opensAt +
                    Math.max(
                        0,
                        Math.ceil(
                            (currentMinutes + 1 - opensAt) /
                                stepMinutes,
                        ),
                    ) *
                        stepMinutes;
            }

            native.min = toTime(opensAt);
            native.max = toTime(closesAt);

            if (native.value) {
                const selectedMinutes = parseTime(native.value);
                const isValid =
                    selectedMinutes >= firstAvailable &&
                    selectedMinutes <= closesAt &&
                    (selectedMinutes - opensAt) % stepMinutes === 0;

                if (!isValid) {
                    native.value = "";
                    native.dispatchEvent(
                        new Event("input", { bubbles: true }),
                    );
                    native.dispatchEvent(
                        new Event("change", { bubbles: true }),
                    );
                }
            }

            for (
                let totalMinutes = firstAvailable;
                totalMinutes <= closesAt;
                totalMinutes += stepMinutes
            ) {
                availableTimes.push(toTime(totalMinutes));
            }

            const hasSlots = availableTimes.length > 0;
            emptyMessage.textContent = hasSlots
                ? ""
                : "Ya no quedan horarios disponibles para esta fecha.";
            emptyState.hidden = hasSlots;
            chooseDateButton.hidden = hasSlots;
            wheels.hidden = !hasSlots;
            confirmTimeButton.hidden = !hasSlots;

            if (hasSlots) {
                if (!native.value) native.value = availableTimes[0];
                updateWheels(native.value);
            }
        };

        const updateDisplay = () => {
            value.textContent = native.value
                ? formatTime(native.value)
                : "Selecciona una hora";
            value.classList.toggle(
                "is-placeholder",
                !native.value,
            );

            updateWheelSelection();
        };

        const updateWheelSelection = (scroll = false) => {
            const [hours, minutes] = (native.value || "").split(":");
            [hourWheel, minuteWheel].forEach((wheel) => {
                wheel
                    .querySelectorAll("[role='option']")
                    .forEach((option) => {
                        const selected =
                            option.dataset.value ===
                            (wheel === hourWheel ? hours : minutes);
                        option.setAttribute(
                            "aria-selected",
                            String(selected),
                        );
                        if (selected && scroll) {
                            option.scrollIntoView({
                                block: "center",
                                behavior: "auto",
                            });
                        }
                    });
            });
        };

        const selectTime = (
            time,
            { updateMinutes = false, scroll = false } = {},
        ) => {
            native.value = time;
            updateDisplay();
            native.dispatchEvent(
                new Event("change", { bubbles: true }),
            );
            if (updateMinutes) {
                renderMinuteWheel(time.slice(0, 2), time.slice(3));
            }
            if (scroll) updateWheelSelection(true);
        };

        const renderWheel = (
            wheel,
            values,
            selected,
            onSelect,
        ) => {
            clearTimeout(wheelScrollTimers.get(wheel));
            wheel.replaceChildren();
            values.forEach((item) => {
                const option = document.createElement("button");
                option.type = "button";
                option.className =
                    "reservas-timepicker__wheel-option";
                option.setAttribute("role", "option");
                option.dataset.value = item.value;
                option.textContent = item.label;
                option.setAttribute(
                    "aria-selected",
                    String(item.value === selected),
                );
                option.addEventListener("click", () => {
                    onSelect(item.value);
                    option.scrollIntoView({
                        block: "center",
                        behavior: "smooth",
                    });
                });
                option.addEventListener("keydown", (event) => {
                    if (
                        event.key !== "ArrowUp" &&
                        event.key !== "ArrowDown" &&
                        event.key !== "Home" &&
                        event.key !== "End"
                    ) {
                        return;
                    }

                    event.preventDefault();
                    const options = [
                        ...wheel.querySelectorAll(
                            "[role='option']",
                        ),
                    ];
                    const currentIndex =
                        options.indexOf(event.currentTarget);
                    const nextIndex =
                        event.key === "Home"
                            ? 0
                            : event.key === "End"
                              ? options.length - 1
                              : Math.max(
                                    0,
                                    Math.min(
                                        options.length - 1,
                                        currentIndex +
                                            (event.key ===
                                            "ArrowDown"
                                                ? 1
                                                : -1),
                                    ),
                                );
                    options[nextIndex]?.focus();
                    options[nextIndex]?.scrollIntoView({
                        block: "center",
                    });
                    if (options[nextIndex]) {
                        onSelect(
                            options[nextIndex].dataset.value,
                        );
                    }
                });
                wheel.append(option);
            });

            wheel.onscroll = () => {
                if (!userScrollingWheels.has(wheel)) return;

                clearTimeout(wheelScrollTimers.get(wheel));
                wheelScrollTimers.set(
                    wheel,
                    setTimeout(() => {
                        const center =
                            wheel.scrollTop + wheel.clientHeight / 2;
                        const options = [
                            ...wheel.querySelectorAll(
                                "[role='option']",
                            ),
                        ];
                        const nearest = options.reduce(
                            (best, option) =>
                                Math.abs(
                                    option.offsetTop +
                                        option.offsetHeight / 2 -
                                        center,
                                ) <
                                Math.abs(
                                    best.offsetTop +
                                        best.offsetHeight / 2 -
                                        center,
                                )
                                    ? option
                                    : best,
                        );
                        if (
                            nearest.dataset.value !==
                            wheel.querySelector(
                                "[aria-selected='true']",
                            )?.dataset.value
                        ) {
                            onSelect(nearest.dataset.value);
                        }
                        userScrollingWheels.delete(wheel);
                    }, 100),
                );
            };
            wheel.onwheel = () =>
                userScrollingWheels.add(wheel);
            wheel.ontouchmove = () =>
                userScrollingWheels.add(wheel);
            wheel.onpointerdown = (event) => {
                if (event.pointerType !== "mouse") return;

                activeWheelDrag = {
                    wheel,
                    pointerId: event.pointerId,
                    startY: event.clientY,
                    startScrollTop: wheel.scrollTop,
                    moved: false,
                };
            };
        };

        document.addEventListener("pointermove", (event) => {
            if (
                !activeWheelDrag ||
                event.pointerId !== activeWheelDrag.pointerId ||
                event.buttons === 0
            ) {
                return;
            }

            const distance =
                event.clientY - activeWheelDrag.startY;
            if (Math.abs(distance) > 3) {
                activeWheelDrag.moved = true;
                userScrollingWheels.add(activeWheelDrag.wheel);
                event.preventDefault();
            }

            if (activeWheelDrag.moved) {
                activeWheelDrag.wheel.scrollTop =
                    activeWheelDrag.startScrollTop - distance;
            }
        });

        document.addEventListener("pointerup", (event) => {
            if (
                activeWheelDrag?.pointerId === event.pointerId
            ) {
                if (activeWheelDrag.moved) {
                    const draggedWheel =
                        activeWheelDrag.wheel;
                    suppressWheelClick.add(draggedWheel);
                    setTimeout(
                        () =>
                            suppressWheelClick.delete(
                                draggedWheel,
                            ),
                        0,
                    );
                }
                activeWheelDrag = null;
            }
        });

        document.addEventListener("pointercancel", (event) => {
            if (
                activeWheelDrag?.pointerId === event.pointerId
            ) {
                activeWheelDrag = null;
            }
        });

        const renderMinuteWheel = (hour, selectedMinute) => {
            const minutes = availableTimes
                .filter((time) => time.slice(0, 2) === hour)
                .map((time) => time.slice(3));
            minuteOptions = [...new Set(minutes)];
            renderWheel(
                minuteWheel,
                minuteOptions.map((minute) => ({
                    value: minute,
                    label: minute,
                })),
                selectedMinute,
                (minute) => {
                    selectTime(`${hour}:${minute}`);
                },
            );
            updateWheelSelection(true);
        };

        const updateWheels = (time) => {
            const [selectedHour, selectedMinute] = time.split(":");
            hourOptions = [
                ...new Set(
                    availableTimes.map((available) =>
                        available.slice(0, 2),
                    ),
                ),
            ];
            renderWheel(
                hourWheel,
                    hourOptions.map((hour) => {
                        const hourNumber = Number(hour);
                        const hour12 = hourNumber % 12 || 12;
                        const meridiem =
                            hourNumber < 12 ? "AM" : "PM";

                        return {
                            value: hour,
                            label: `${hour12} ${meridiem}`,
                        };
                    }),
                selectedHour,
                (hour) => {
                    const currentMinute = (
                        native.value ||
                        `${selectedHour}:${selectedMinute}`
                    ).slice(3);
                    const minutes = availableTimes
                        .filter((available) =>
                            available.startsWith(`${hour}:`),
                        )
                        .map((available) => available.slice(3));
                    const nearestMinute = minutes.reduce(
                        (nearest, minute) =>
                            Math.abs(Number(minute) - Number(currentMinute)) <
                            Math.abs(Number(nearest) - Number(currentMinute))
                                ? minute
                                : nearest,
                    );
                    selectTime(`${hour}:${nearestMinute}`, {
                        updateMinutes: true,
                        scroll: true,
                    });
                },
            );
            renderMinuteWheel(selectedHour, selectedMinute);
            updateWheelSelection(true);
        };

        const close = ({ focus = false } = {}) => {
            if (panel.hidden) return;

            panel.hidden = true;
            panel.style.maxHeight = "";
            panel.removeAttribute("aria-modal");
            wrapper.classList.remove(
                "is-open",
                "is-up",
                "is-mobile-modal",
            );
            button.setAttribute("aria-expanded", "false");
            deactivatePicker(close);

            if (focus) button.focus();
        };

        dateNative?.addEventListener("change", updateSlotsForDate);

        const open = () => {
            if (!panel.hidden) return;

            if (dateNative && !dateNative.value) {
                const today = toISODate(new Date());

                if (!dateNative.min || today >= dateNative.min) {
                    dateNative.value = today;
                    dateNative.dispatchEvent(
                        new Event("change", { bubbles: true }),
                    );
                }
            }

            updateSlotsForDate();
            activatePicker(close, () => {
                if (panel.hidden) return;

                positionPickerPanel(
                    wrapper,
                    button,
                    panel,
                    360,
                );
                keepFocusedInPanel(panel);
            });
            panel.hidden = false;
            wrapper.classList.add("is-open");
            button.setAttribute("aria-expanded", "true");

            if (isMobilePicker()) {
                wrapper.classList.add("is-mobile-modal");
                panel.setAttribute("aria-modal", "true");
            }

            updateDisplay();
            hourWheel
                .querySelector("[aria-selected='true']")
                ?.focus({ preventScroll: true });
            positionPickerPanel(wrapper, button, panel, 360);
            if (availableTimes.length) {
                keepFocusedInPanel(panel);
            } else {
                chooseDateButton.focus({ preventScroll: true });
            }
        };

        button.addEventListener("click", () => {
            if (panel.hidden) {
                open();
            } else {
                close({ focus: true });
            }
        });

        button.addEventListener("keydown", (event) => {
            if (
                panel.hidden &&
                (event.key === "ArrowDown" ||
                    event.key === "ArrowUp")
            ) {
                event.preventDefault();
                open();
            } else if (
                event.key === "Escape" &&
                !panel.hidden
            ) {
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
            if (
                !panel.hidden &&
                !wrapper.contains(event.target)
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

        native.addEventListener("change", updateDisplay);

        const { shell } = createPickerShell(
            panel,
            titleText,
            () => close({ focus: true }),
        );

        trapMobilePickerFocus(shell);
        wrapper.append(button, shell);
        wrapper.classList.add("is-enhanced");
        native.tabIndex = -1;
        native.setAttribute("aria-hidden", "true");
        updateSlotsForDate();
        updateDisplay();
    };

    document
        .querySelectorAll('[data-picker="date"]')
        .forEach(enhanceDatePicker);
    document
        .querySelectorAll('[data-picker="time"]')
        .forEach(enhanceTimePicker);

    const quantity = form.querySelector("[data-quantity]");

    if (quantity) {
        const input = quantity.querySelector("input");
        const decrease = quantity.querySelector(
            "[data-quantity-decrease]",
        );
        const increase = quantity.querySelector(
            "[data-quantity-increase]",
        );
        const label = quantity.querySelector(
            "[data-quantity-label]",
        );

        if (input && decrease && increase && label) {
            const min = Number(input.min) || 1;
            const max = Number(input.max) || 6;

            const render = (count) => {
                const total = Math.min(
                    max,
                    Math.max(min, Math.round(count)),
                );

                label.textContent = `${total} ${
                    total === 1 ? "bicicleta" : "bicicletas"
                }`;
                decrease.disabled = total <= min;
                increase.disabled = total >= max;
            };

            const setCount = (value, dispatch = false) => {
                const count = Math.min(
                    max,
                    Math.max(
                        min,
                        Math.round(Number(value) || min),
                    ),
                );

                input.value = String(count);
                render(count);

                if (dispatch) {
                    input.dispatchEvent(
                        new Event("input", { bubbles: true }),
                    );
                }
            };

            decrease.addEventListener("click", () => {
                setCount(Number(input.value) - 1, true);
            });

            increase.addEventListener("click", () => {
                setCount(Number(input.value) + 1, true);
            });

            input.addEventListener("focus", () => {
                input.select();
            });

            input.addEventListener("input", () => {
                const value = Number(input.value);

                if (
                    Number.isFinite(value) &&
                    value >= min &&
                    value <= max
                ) {
                    render(value);
                }
            });

            input.addEventListener("change", () => {
                setCount(input.value, true);
            });

            input.addEventListener("blur", () => {
                setCount(input.value);
            });

            setCount(input.value);
        }
    }

    const isFieldControl = (element) =>
        element instanceof Element &&
        element.matches("input, select, textarea");

    const getField = (control) => control.closest("[data-field]");

    const getDisplayControl = (control) => {
        const field = getField(control);

        if (!field) return control;

        if (
            control.matches(
                "select, input[type='date'], input[type='time']",
            )
        ) {
            return (
                field.querySelector(
                    ".reservas-picker__button",
                ) || control
            );
        }

        return control;
    };

    const showError = (control, message) => {
        const field = getField(control);

        if (!field) return;

        const error = field.querySelector(
            ".reservas-form__error",
        );

        if (!error) return;

        const display = getDisplayControl(control);

        if (!message) {
            field.classList.remove("is-invalid");
            error.replaceChildren();
            display.removeAttribute("aria-invalid");
            return;
        }

        field.classList.add("is-invalid");

        const icon = document.createElement("span");
        icon.className = "icon reservas-form__error-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "error";

        const text = document.createElement("span");
        text.textContent = message;

        error.replaceChildren(icon, text);
        display.setAttribute("aria-invalid", "true");
    };

    const getErrorMessage = (control) => {
        const validity = control.validity;

        if (validity.valueMissing) {
            return (
                REQUIRED_MESSAGES[control.name] ||
                "Completa este campo."
            );
        }

        if (
            control.name === "nombre" &&
            control.value.trim().length < 1
        ) {
            return "Escribe tu nombre completo.";
        }

        if (
            control.name === "documento" &&
            control.value.trim().length < 1
        ) {
            return "Escribe tu número de documento.";
        }

        if (
            control.name === "email" &&
            validity.typeMismatch
        ) {
            return "Escribe un correo electrónico válido.";
        }

        if (control.name === "telefono") {
            if (validity.patternMismatch) {
                return "Escribe un número colombiano válido: celular o fijo, con o sin prefijo 57.";
            }
        }

        if (
            control.name === "fecha" &&
            (validity.rangeUnderflow || validity.badInput)
        ) {
            return "Elige una fecha de hoy en adelante.";
        }

        if (
            control.name === "hora" &&
            (validity.rangeUnderflow ||
                validity.rangeOverflow ||
                validity.badInput)
        ) {
            return "Elige una hora dentro del horario de atención.";
        }

        if (
            control.name === "hora" &&
            validity.stepMismatch
        ) {
            return "Elige una hora en intervalos de un minuto.";
        }

        if (
            control.name === "cantidad" &&
            (validity.rangeUnderflow ||
                validity.rangeOverflow ||
                validity.stepMismatch ||
                validity.badInput)
        ) {
            return "Elige entre 1 y 6 bicicletas.";
        }

        if (validity.customError) {
            return control.validationMessage;
        }

        return "";
    };

    const validateControl = (control) => {
        const message = getErrorMessage(control);
        showError(control, message);
        return message === "";
    };

    const validateAll = () => {
        let firstInvalid = null;

        form.querySelectorAll("[data-field]").forEach((field) => {
            const control = field.querySelector(
                "input, select, textarea",
            );

            if (!control) return;

            if (!validateControl(control) && !firstInvalid) {
                firstInvalid = getDisplayControl(control);
            }
        });

        return firstInvalid;
    };

    form.noValidate = true;

    form.addEventListener("input", (event) => {
        clearStatus();

        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (
            field &&
            field.classList.contains("is-invalid")
        ) {
            validateControl(event.target);
        }
    });

    form.addEventListener("change", (event) => {
        clearStatus();

        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (
            field &&
            field.querySelector(".reservas-form__error")
        ) {
            validateControl(event.target);
        }
    });

    form.addEventListener("focusout", (event) => {
        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (
            field &&
            field.querySelector(".reservas-form__error")
        ) {
            validateControl(event.target);
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearStatus();

        const firstInvalid = validateAll();

        if (firstInvalid) {
            firstInvalid.focus({ preventScroll: true });
            firstInvalid.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            return;
        }

        const data = new FormData(form);
        const value = (name) =>
            String(data.get(name) || "").trim();
        const name = value("nombre");
        const date = value("fecha");
        const preferredContact = value("metodo_contacto");
        const preferredContactLabel = {
            cualquiera: "Cualquier medio",
            email: "Correo",
            telefono: "Teléfono",
        }[preferredContact];
        const subject = `Solicitud de reserva - ${name} - ${date}`;
        const lines = [
            "Hola, quiero reservar una bicicleta.",
            "",
            `Nombre: ${name}`,
            `Tipo de documento: ${value("tipo_documento")}`,
            `Número de documento: ${value("documento")}`,
            `Método de contacto preferido: ${preferredContactLabel}`,
            `Correo: ${value("email")}`,
            `Teléfono: ${value("telefono")}`,
            `Fecha de inicio: ${date}`,
            `Hora de inicio: ${value("hora")}`,
            `Tipo de bicicleta: ${value("tipo")}`,
            `Cantidad de bicicletas: ${value("cantidad")}`,
            `Duración: ${value("duracion")}`,
            `Recorrido de interés: ${value("recorrido")}`,
            `Comentarios: ${
                value("mensaje") || "Sin comentarios"
            }`,
            `Acepta contacto: ${
                data.get("consentimiento") ? "Sí" : "No"
            }`,
        ];
        const mailto = `mailto:hola@ruedalibre.example?subject=${encodeURIComponent(
            subject,
        )}&body=${encodeURIComponent(lines.join("\n"))}`;

        const copy = document.createElement("span");
        copy.className = "reservas-form__status-copy";

        const icon = document.createElement("span");
        icon.className = "icon reservas-form__status-icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = "mark_email_read";

        const message = document.createElement("span");
        message.textContent =
            "Tu solicitud está lista. Abre tu aplicación de correo y envíala; te confirmaremos la disponibilidad lo antes posible.";

        copy.append(icon, message);

        const link = document.createElement("a");
        link.className = "reservas-form__status-link";
        link.href = mailto;

        const linkIcon = document.createElement("span");
        linkIcon.className = "icon";
        linkIcon.setAttribute("aria-hidden", "true");
        linkIcon.textContent = "mail";

        const linkText = document.createElement("span");
        linkText.textContent = "Abrir correo con mi solicitud";

        link.append(linkIcon, linkText);
        status.replaceChildren(copy, link);
        status.classList.add("is-visible");
        status.focus({ preventScroll: true });
    });
})();
