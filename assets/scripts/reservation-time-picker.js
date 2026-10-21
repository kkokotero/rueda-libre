export function initializeReservationTimePicker(pickerCore) {
    const {
        isMobilePicker,
        activatePicker,
        deactivatePicker,
        createIcon,
        getLabelText,
        getDescribedBy,
        createPickerShell,
        positionPickerPanel,
        keepFocusedInPanel,
        trapMobilePickerFocus,
        createPickerTrigger,
    } = pickerCore;

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
        .querySelectorAll('[data-picker="time"]')
        .forEach(enhanceTimePicker);
}
