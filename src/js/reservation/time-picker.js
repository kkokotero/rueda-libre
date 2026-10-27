/**
 * Selector de hora con reloj analógico.
 *
 * Reemplaza un `input[type="time"]` por un botón que abre un panel con campos
 * visuales y un reloj analógico, usando los horarios disponibles para la fecha.
 */

import { parseISODate, toISODate } from "../shared/dates.js";
import {
    formatTime,
    getScheduleForDate,
    parseTime,
    toTime,
} from "../shared/time.js";

/**
 * Enhances each native time input with an accessible analog-clock picker.
 * @param {import("./picker-core.js").ReservationPickerCore} pickerCore
 * @returns {void}
 */
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

    /** @param {Element} wrapper */
    const enhanceTimePicker = (wrapper) => {
        if (!(wrapper instanceof HTMLElement)) return;
        /** @type {HTMLInputElement | null} */
        const nativeInput = wrapper.querySelector('input[type="time"]');

        if (
            !(nativeInput instanceof HTMLInputElement) ||
            wrapper.classList.contains("is-enhanced")
        ) {
            return;
        }

        const native = nativeInput;
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
        panel.className = "reservas-picker__panel reservas-timepicker__panel";
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
            const datePickerButton = document.querySelector(
                '[data-picker="date"] .reservas-picker__button',
            );
            if (datePickerButton instanceof HTMLButtonElement) {
                datePickerButton.click();
            }
        });
        emptyState.append(emptyMessage, chooseDateButton);

        const clock = document.createElement("section");
        clock.className = "reservas-timepicker__clock";
        clock.setAttribute("aria-label", "Reloj visual");

        const clockHeader = document.createElement("div");
        clockHeader.className = "reservas-timepicker__clock-header";

        const clockTime = document.createElement("div");
        clockTime.className = "reservas-timepicker__clock-time";

        const clockHourField = document.createElement("div");
        clockHourField.className = "reservas-timepicker__clock-field";

        const clockHourInput = document.createElement("input");
        clockHourInput.type = "text";
        clockHourInput.id = `${panelId}-hour`;
        clockHourInput.inputMode = "numeric";
        clockHourInput.maxLength = 2;
        clockHourInput.autocomplete = "off";
        clockHourInput.className =
            "reservas-timepicker__clock-value reservas-timepicker__clock-hour";
        clockHourInput.setAttribute("aria-label", "Hora, de 1 a 12");
        clockHourInput.setAttribute("aria-describedby", `${panelId}-hint`);
        clockHourInput.placeholder = "--";
        clockHourInput.addEventListener("focus", () => {
            clockMode = "hour";
            renderClock({ syncInputs: false });
        });
        clockHourInput.addEventListener("input", () => {
            clockHourInput.value = clockHourInput.value
                .replace(/\D/g, "")
                .slice(0, 2);
        });
        clockHourInput.addEventListener("change", commitTypedTime);

        const clockHourLabel = document.createElement("label");
        clockHourLabel.className = "reservas-timepicker__clock-label";
        clockHourLabel.htmlFor = clockHourInput.id;
        clockHourLabel.textContent = "Hora";
        clockHourField.append(clockHourInput, clockHourLabel);

        const clockHint = document.createElement("span");
        clockHint.id = `${panelId}-hint`;
        clockHint.className = "reservas-timepicker__hint";
        clockHint.textContent =
            "Escribe una hora y minutos entre los horarios disponibles.";

        const clockMinuteInput = document.createElement("input");
        clockMinuteInput.type = "text";
        clockMinuteInput.id = `${panelId}-minute`;
        clockMinuteInput.inputMode = "numeric";
        clockMinuteInput.maxLength = 2;
        clockMinuteInput.autocomplete = "off";
        clockMinuteInput.className =
            "reservas-timepicker__clock-value reservas-timepicker__clock-minute";
        clockMinuteInput.setAttribute("aria-label", "Minutos, de 00 a 59");
        clockMinuteInput.setAttribute("aria-describedby", `${panelId}-hint`);
        clockMinuteInput.placeholder = "--";
        clockMinuteInput.addEventListener("focus", () => {
            clockMode = "minute";
            renderClock({ syncInputs: false });
        });
        clockMinuteInput.addEventListener("input", () => {
            clockMinuteInput.value = clockMinuteInput.value
                .replace(/\D/g, "")
                .slice(0, 2);
        });
        clockMinuteInput.addEventListener("change", commitTypedTime);

        const clockMinuteField = document.createElement("div");
        clockMinuteField.className = "reservas-timepicker__clock-field";

        const clockMinuteLabel = document.createElement("label");
        clockMinuteLabel.className = "reservas-timepicker__clock-label";
        clockMinuteLabel.htmlFor = clockMinuteInput.id;
        clockMinuteLabel.textContent = "Minuto";
        clockMinuteField.append(clockMinuteInput, clockMinuteLabel);

        const clockSeparator = document.createElement("span");
        clockSeparator.className = "reservas-timepicker__clock-separator";
        clockSeparator.textContent = ":";
        clockSeparator.setAttribute("aria-hidden", "true");

        clockTime.append(
            clockHourField,
            clockSeparator,
            clockMinuteField,
            clockHint,
        );

        const clockPeriod = document.createElement("div");
        clockPeriod.className = "reservas-timepicker__clock-period";
        clockPeriod.setAttribute("role", "group");
        clockPeriod.setAttribute("aria-label", "Período del día");

        const amButton = document.createElement("button");
        amButton.type = "button";
        amButton.className = "reservas-timepicker__clock-period-option";
        amButton.dataset.period = "AM";
        amButton.textContent = "AM";
        amButton.setAttribute("aria-label", "a. m.");
        amButton.addEventListener("click", () => selectPeriod("AM"));

        const pmButton = document.createElement("button");
        pmButton.type = "button";
        pmButton.className = "reservas-timepicker__clock-period-option";
        pmButton.dataset.period = "PM";
        pmButton.textContent = "PM";
        pmButton.setAttribute("aria-label", "p. m.");
        pmButton.addEventListener("click", () => selectPeriod("PM"));
        clockPeriod.append(amButton, pmButton);

        const clockFace = document.createElement("div");
        clockFace.className = "reservas-timepicker__clock-face";
        clockFace.id = `${panelId}-clock`;
        clockFace.setAttribute("role", "group");
        clockFace.setAttribute("aria-label", "Selecciona la hora en el reloj");

        clockHeader.append(clockTime, clockPeriod);
        clock.append(clockHeader, clockFace);

        const timePickerActions = document.createElement("div");
        timePickerActions.className = "reservas-timepicker__actions";

        const toggleClockButton = document.createElement("button");
        toggleClockButton.type = "button";
        toggleClockButton.className = "reservas-timepicker__toggle";
        toggleClockButton.setAttribute("aria-controls", clockFace.id);
        toggleClockButton.setAttribute("aria-expanded", "true");
        toggleClockButton.setAttribute("aria-label", "Ocultar reloj visual");
        toggleClockButton.append(createIcon("keyboard"));

        const confirmTimeButton = document.createElement("button");
        confirmTimeButton.type = "button";
        confirmTimeButton.className = "reservas-timepicker__confirm";
        confirmTimeButton.textContent = "Listo";
        confirmTimeButton.addEventListener("click", () => {
            if (native.value) close({ focus: true });
        });
        toggleClockButton.addEventListener("click", () => {
            const isClockVisible = !clockFace.hidden;
            clockFace.hidden = isClockVisible;
            toggleClockButton.setAttribute(
                "aria-expanded",
                String(!isClockVisible),
            );
            toggleClockButton.setAttribute(
                "aria-label",
                isClockVisible
                    ? "Mostrar reloj visual"
                    : "Ocultar reloj visual",
            );
            toggleClockButton.replaceChildren(
                createIcon(isClockVisible ? "schedule" : "keyboard"),
            );
        });
        timePickerActions.append(toggleClockButton, confirmTimeButton);

        panel.append(emptyState, clock, timePickerActions);

        // El atributo `step` del input fija el intervalo entre horarios.
        const stepMinutes = Math.max(
            5,
            Math.round((Number(native.step) || 900) / 60),
        );
        const dateControl = wrapper
            .closest("form")
            ?.elements.namedItem("fecha");
        const dateNative =
            dateControl instanceof HTMLInputElement ? dateControl : null;
        /** @type {string[]} */
        let availableTimes = [];
        /** @type {"hour" | "minute"} */
        let clockMode = "hour";

        /** @param {string} time @returns {"AM" | "PM"} */
        const getPeriod = (time) =>
            Number(time.slice(0, 2)) < 12 ? "AM" : "PM";

        /** @param {number} minutes @param {"AM" | "PM"} period @returns {string | null} */
        const findNearestTime = (minutes, period) => {
            const periodTimes = availableTimes.filter(
                (time) => getPeriod(time) === period,
            );

            if (!periodTimes.length) return null;

            return periodTimes.reduce((nearest, time) =>
                Math.abs(parseTime(time) - minutes) <
                Math.abs(parseTime(nearest) - minutes)
                    ? time
                    : nearest,
            );
        };

        /** @param {string} time */
        const selectTime = (time) => {
            native.value = time;
            native.dispatchEvent(new Event("change", { bubbles: true }));
        };

        /** @param {"AM" | "PM"} period */
        const selectPeriod = (period) => {
            if (!availableTimes.length) return;

            const currentMinutes = parseTime(native.value);
            const nextTime = findNearestTime(currentMinutes, period);

            if (nextTime) selectTime(nextTime);
        };

        /** @param {string | undefined} hour */
        const selectHour = (hour) => {
            const currentMinute = Number(native.value.slice(3));
            const hourTimes = availableTimes.filter((time) =>
                time.startsWith(`${hour}:`),
            );

            if (!hourTimes.length) return;

            const nextTime = hourTimes.reduce((nearest, time) =>
                Math.abs(Number(time.slice(3)) - currentMinute) <
                Math.abs(Number(nearest.slice(3)) - currentMinute)
                    ? time
                    : nearest,
            );

            selectTime(nextTime);
        };

        /** @param {HTMLButtonElement} dialOption */
        const selectDialOption = (dialOption) => {
            if (clockFace.dataset.mode === "hour") {
                selectHour(dialOption.dataset.hour);
                clockMode = "minute";
            } else {
                const minute = dialOption.dataset.minute;
                if (!minute) return;
                selectTime(
                    `${native.value.slice(0, 2)}:${minute.padStart(2, "0")}`,
                );
            }

            renderClock();
            const selectedDialOption = clockFace.querySelector(".is-selected");
            if (selectedDialOption instanceof HTMLButtonElement) {
                selectedDialOption.focus({ preventScroll: true });
            }
        };

        /**
         * @param {number} clientX
         * @param {number} clientY
         * @returns {HTMLButtonElement | null}
         */
        const findDialOptionAtPoint = (clientX, clientY) => {
            const faceRect = clockFace.getBoundingClientRect();
            const pointerAngle =
                (Math.atan2(
                    clientY - (faceRect.top + faceRect.height / 2),
                    clientX - (faceRect.left + faceRect.width / 2),
                ) +
                    Math.PI / 2 +
                    Math.PI * 2) %
                (Math.PI * 2);

            /** @type {NodeListOf<HTMLButtonElement>} */
            const options = clockFace.querySelectorAll(
                ".reservas-timepicker__clock-option:not(:disabled)",
            );
            return (
                [...options].reduce(
                    (nearest, option) => {
                        const rect = option.getBoundingClientRect();
                        const optionAngle =
                            (Math.atan2(
                                rect.top +
                                    rect.height / 2 -
                                    (faceRect.top + faceRect.height / 2),
                                rect.left +
                                    rect.width / 2 -
                                    (faceRect.left + faceRect.width / 2),
                            ) +
                                Math.PI / 2 +
                                Math.PI * 2) %
                            (Math.PI * 2);
                        const angleDistance = Math.abs(
                            pointerAngle - optionAngle,
                        );
                        const distance = Math.min(
                            angleDistance,
                            Math.PI * 2 - angleDistance,
                        );

                        return !nearest || distance < nearest.distance
                            ? { option, distance }
                            : nearest;
                    },
                    /** @type {{ option: HTMLButtonElement, distance: number } | null} */ (
                        null
                    ),
                )?.option ?? null
            );
        };

        /** @type {number | null} */
        let activeDialPointer = null;
        /** @type {HTMLButtonElement | null} */
        let draggedDialOption = null;

        const clearDialDrag = () => {
            draggedDialOption?.classList.remove("is-drag-target");
            draggedDialOption = null;
            activeDialPointer = null;
            clockFace.classList.remove("is-dragging");
        };

        clockFace.addEventListener("pointerdown", (event) => {
            if (
                event.button !== 0 ||
                !clockFace.querySelector(".reservas-timepicker__clock-option")
            ) {
                return;
            }

            const option = findDialOptionAtPoint(event.clientX, event.clientY);

            if (!option) return;

            event.preventDefault();
            activeDialPointer = event.pointerId;
            draggedDialOption = option;
            draggedDialOption.classList.add("is-drag-target");
            clockFace.classList.add("is-dragging");
            clockFace.setPointerCapture(event.pointerId);
        });

        clockFace.addEventListener("pointermove", (event) => {
            if (event.pointerId !== activeDialPointer) return;

            const option = findDialOptionAtPoint(event.clientX, event.clientY);

            if (option === draggedDialOption) return;

            draggedDialOption?.classList.remove("is-drag-target");
            draggedDialOption = option;
            draggedDialOption?.classList.add("is-drag-target");
        });

        clockFace.addEventListener("pointerup", (event) => {
            if (event.pointerId !== activeDialPointer) return;

            const option = findDialOptionAtPoint(event.clientX, event.clientY);

            clearDialDrag();

            if (clockFace.hasPointerCapture(event.pointerId)) {
                clockFace.releasePointerCapture(event.pointerId);
            }

            if (option) selectDialOption(option);
        });

        clockFace.addEventListener("pointercancel", clearDialDrag);
        clockFace.addEventListener("lostpointercapture", clearDialDrag);

        /** Commits the manually entered hour and minute, clamped to available slots. */
        function commitTypedTime() {
            const hour = Number(clockHourInput.value);
            const minute = Number(clockMinuteInput.value);

            if (
                !clockHourInput.value ||
                !clockMinuteInput.value ||
                hour < 1 ||
                hour > 12 ||
                minute < 0 ||
                minute > 59 ||
                !native.value
            ) {
                renderClock();
                return;
            }

            const period = getPeriod(native.value);
            const hour24 = period === "AM" ? hour % 12 : (hour % 12) + 12;
            const nextTime = findNearestTime(hour24 * 60 + minute, period);

            if (nextTime) selectTime(nextTime);
            else renderClock();
        }

        /**
         * Renders the analog dial and synchronizes its editable time fields.
         * @param {{ syncInputs?: boolean }} [options]
         */
        function renderClock({ syncInputs = true } = {}) {
            const hasSlots = availableTimes.length > 0;
            clock.hidden = !hasSlots;

            if (!hasSlots) {
                clockFace.replaceChildren();
                return;
            }

            const [hour, minute] = native.value.split(":").map(Number);
            const hour12 = hour % 12 || 12;
            const period = hour < 12 ? "AM" : "PM";
            const availableHours = [
                ...new Set(availableTimes.map((time) => time.slice(0, 2))),
            ];
            const selectedHour = String(hour).padStart(2, "0");
            const availableMinutes = availableTimes
                .filter((time) => time.startsWith(`${selectedHour}:`))
                .map((time) => Number(time.slice(3)));

            if (syncInputs) {
                clockHourInput.value = String(hour12).padStart(2, "0");
                clockMinuteInput.value = String(minute).padStart(2, "0");
            }

            clockHourInput.classList.toggle("is-active", clockMode === "hour");
            clockMinuteInput.classList.toggle(
                "is-active",
                clockMode === "minute",
            );

            for (const periodButton of [amButton, pmButton]) {
                const periodHours = availableHours.filter((availableHour) =>
                    periodButton.dataset.period === "AM"
                        ? Number(availableHour) < 12
                        : Number(availableHour) >= 12,
                );
                const isSelected = periodButton.dataset.period === period;

                periodButton.disabled = periodHours.length === 0;
                periodButton.classList.toggle("is-active", isSelected);
                periodButton.setAttribute("aria-pressed", String(isSelected));
            }

            clockFace.dataset.mode = clockMode;
            clockFace.style.setProperty(
                "--clock-hand-angle",
                clockMode === "hour"
                    ? `${(hour12 % 12) * 30}deg`
                    : `${(minute / 60) * 360}deg`,
            );
            clockFace.replaceChildren();

            const dialValues =
                clockMode === "hour"
                    ? Array.from({ length: 12 }, (_, index) => index + 1)
                    : availableMinutes;

            for (const dialValue of dialValues) {
                const number = dialValue;
                const hourIndex = number % 12;
                const minuteValue = dialValue;
                const dialOption = document.createElement("button");
                const angle =
                    (clockMode === "hour" ? hourIndex / 12 : minuteValue / 60) *
                        Math.PI *
                        2 -
                    Math.PI / 2;
                const optionHour = String(
                    period === "AM" ? number % 12 : (number % 12) + 12,
                ).padStart(2, "0");
                const label =
                    clockMode === "hour"
                        ? String(number)
                        : String(minuteValue).padStart(2, "0");
                const isSelected =
                    clockMode === "hour"
                        ? optionHour === selectedHour
                        : minuteValue === minute;
                const isAvailable =
                    clockMode === "hour"
                        ? availableHours.includes(optionHour)
                        : availableMinutes.includes(minuteValue);

                dialOption.type = "button";
                dialOption.className = "reservas-timepicker__clock-option";
                dialOption.textContent = label;
                dialOption.style.left = `${50 + Math.cos(angle) * 38}%`;
                dialOption.style.top = `${50 + Math.sin(angle) * 38}%`;
                if (clockMode === "hour") {
                    dialOption.dataset.hour = optionHour;
                } else {
                    dialOption.dataset.minute = String(minuteValue);
                }
                dialOption.disabled = !isAvailable;
                dialOption.setAttribute("aria-pressed", String(isSelected));
                dialOption.setAttribute(
                    "aria-label",
                    clockMode === "hour"
                        ? `${number} ${period === "AM" ? "a. m." : "p. m."}`
                        : `${label} ${minuteValue === 1 ? "minuto" : "minutos"}`,
                );

                if (isSelected) {
                    dialOption.classList.add("is-selected");
                }

                dialOption.addEventListener("click", () => {
                    selectDialOption(dialOption);
                });

                clockFace.append(dialOption);
            }
        }

        /** Recalculates available times from the selected date and input step. */
        const updateSlotsForDate = () => {
            const date = parseISODate(dateNative?.value || "");

            availableTimes = [];

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
                timePickerActions.hidden = true;
                renderClock();
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
            timePickerActions.hidden = !hasSlots;
            clock.hidden = !hasSlots;

            if (hasSlots) {
                if (!native.value) native.value = availableTimes[0];
                renderClock();
            }
        };

        const updateDisplay = () => {
            value.textContent = native.value
                ? formatTime(native.value)
                : "Selecciona una hora";
            value.classList.toggle("is-placeholder", !native.value);

            renderClock();
        };

        /** @param {{ focus?: boolean }} [options] */
        const close = ({ focus = false } = {}) => {
            if (panel.hidden) return;

            panel.hidden = true;
            panel.style.maxHeight = "";
            panel.removeAttribute("aria-modal");
            wrapper.classList.remove("is-open", "is-up", "is-mobile-modal");
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

                positionPickerPanel(wrapper, button, panel, 480);
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
            (availableTimes.length ? clockHourInput : chooseDateButton).focus({
                preventScroll: true,
            });
            positionPickerPanel(wrapper, button, panel, 480);

            if (availableTimes.length) {
                keepFocusedInPanel(panel);
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
