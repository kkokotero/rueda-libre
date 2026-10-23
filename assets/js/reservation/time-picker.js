/**
 * Selector de hora con ruedas de hora y minutos.
 *
 * Reemplaza un `input[type="time"]` por un botón que abre un panel con dos
 * ruedas desplazables. Los horarios disponibles salen del calendario: si aún
 * no hay fecha elegida se invita a elegirla, y si la fecha ya no tiene
 * franjas libres se avisa.
 */

import { parseISODate, toISODate } from "../shared/dates.js";
import { formatTime, getScheduleForDate, parseTime, toTime } from "../shared/time.js";
import { createWheelRenderer } from "./picker/wheel.js";

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
        emptyState.className = "reservas-timepicker__empty";

        const emptyMessage = document.createElement("p");
        emptyMessage.textContent =
            "Primero elige la fecha para ver los horarios disponibles.";

        const chooseDateButton = document.createElement("button");
        chooseDateButton.type = "button";
        chooseDateButton.className = "reservas-timepicker__choose-date";
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
            heading.className = "reservas-timepicker__wheel-title";
            heading.textContent = label;

            const list = document.createElement("div");
            list.className = "reservas-timepicker__wheel-list";
            list.setAttribute("role", "listbox");
            list.setAttribute("aria-label", label);

            section.append(heading, list);
            wheels.append(section);

            return list;
        };

        const { guardClicks, renderWheel } = createWheelRenderer();

        const hourWheel = createWheel("Hora");
        const minuteWheel = createWheel("Minutos");

        guardClicks(hourWheel);
        guardClicks(minuteWheel);

        const confirmTimeButton = document.createElement("button");
        confirmTimeButton.type = "button";
        confirmTimeButton.className = "reservas-timepicker__confirm";
        confirmTimeButton.textContent = "Listo";
        confirmTimeButton.addEventListener("click", () => {
            if (native.value) close({ focus: true });
        });

        panel.append(emptyState, wheels, confirmTimeButton);

        // El atributo `step` del input fija el intervalo entre horarios.
        const stepMinutes = Math.max(
            5,
            Math.round((Number(native.step) || 900) / 60),
        );
        const dateNative =
            wrapper.closest("form")?.elements.namedItem("fecha");
        let availableTimes = [];
        let hourOptions = [];
        let minuteOptions = [];

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

            const { opensAt, closesAt, firstAvailable, times } =
                getScheduleForDate(date, stepMinutes);

            availableTimes = times;
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
                    native.dispatchEvent(new Event("input", { bubbles: true }));
                    native.dispatchEvent(
                        new Event("change", { bubbles: true }),
                    );
                }
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
            value.classList.toggle("is-placeholder", !native.value);

            updateWheelSelection();
        };

        const updateWheelSelection = (scroll = false) => {
            const [hours, minutes] = (native.value || "").split(":");

            for (const wheel of [hourWheel, minuteWheel]) {
                for (const option of wheel.querySelectorAll("[role='option']")) {
                    const selected =
                        option.dataset.value ===
                        (wheel === hourWheel ? hours : minutes);

                    option.setAttribute("aria-selected", String(selected));

                    if (selected && scroll) {
                        option.scrollIntoView({
                            block: "center",
                            behavior: "auto",
                        });
                    }
                }
            }
        };

        const selectTime = (
            time,
            { updateMinutes = false, scroll = false } = {},
        ) => {
            native.value = time;
            updateDisplay();
            native.dispatchEvent(new Event("change", { bubbles: true }));

            if (updateMinutes) {
                renderMinuteWheel(time.slice(0, 2), time.slice(3));
            }

            if (scroll) updateWheelSelection(true);
        };

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
                    availableTimes.map((available) => available.slice(0, 2)),
                ),
            ];

            renderWheel(
                hourWheel,
                hourOptions.map((hour) => {
                    const hourNumber = Number(hour);
                    const hour12 = hourNumber % 12 || 12;
                    const meridiem = hourNumber < 12 ? "AM" : "PM";

                    return {
                        value: hour,
                        label: `${hour12} ${meridiem}`,
                    };
                }),
                selectedHour,
                (hour) => {
                    const currentMinute = (
                        native.value || `${selectedHour}:${selectedMinute}`
                    ).slice(3);
                    const minutes = availableTimes
                        .filter((available) =>
                            available.startsWith(`${hour}:`),
                        )
                        .map((available) => available.slice(3));
                    const nearestMinute = minutes.reduce((nearest, minute) =>
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

            // Sin fecha no hay horarios: se preselecciona hoy si está permitido.
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

                positionPickerPanel(wrapper, button, panel, 360);
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
            if (!panel.hidden && !wrapper.contains(event.target)) {
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

        const { shell } = createPickerShell(panel, titleText, () =>
            close({ focus: true }),
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
