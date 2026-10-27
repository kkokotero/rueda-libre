/**
 * Selector de fecha con calendario accesible.
 *
 * Reemplaza un `input[type="date"]` por un botón que abre un panel con
 * rejilla de días, navegación por mes y atajos (hoy, mañana, +7 y +14 días).
 * El input nativo se conserva oculto como fuente de verdad y sigue emitiendo
 * sus eventos `change` para que el resto del formulario reaccione igual.
 */

import {
    parseISODate,
    toISODate,
    formatDate,
    formatDateLong,
    formatMonth,
} from "../shared/dates.js";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const SHORTCUT_DATES = [
    { label: "Hoy", offset: 0 },
    { label: "Mañana", offset: 1 },
    { label: "+7 días", offset: 7 },
    { label: "+14 días", offset: 14 },
];

/** Fecha de hoy desplazada `offset` días, en formato ISO. */
/** @param {number} offset @returns {string} */
const isoAfter = (offset) => {
    const date = new Date();
    date.setDate(date.getDate() + offset);

    return toISODate(date);
};

/**
 * Enhances each native date input with an accessible calendar picker.
 * @param {import("./picker-core.js").ReservationPickerCore} pickerCore
 * @returns {void}
 */
export function initializeReservationDatePicker(pickerCore) {
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
    const enhanceDatePicker = (wrapper) => {
        if (!(wrapper instanceof HTMLElement)) return;
        /** @type {HTMLInputElement | null} */
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
        panel.className = "reservas-picker__panel reservas-datepicker__panel";
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

        calendarHeader.append(previousMonth, monthLabel, nextMonth);

        const weekdays = document.createElement("div");
        weekdays.className = "reservas-datepicker__weekdays";
        weekdays.setAttribute("aria-hidden", "true");

        for (const day of WEEKDAYS) {
            const weekday = document.createElement("span");
            weekday.textContent = day;
            weekdays.append(weekday);
        }

        const grid = document.createElement("div");
        grid.className = "reservas-datepicker__grid";
        grid.setAttribute("role", "group");
        grid.setAttribute("aria-labelledby", monthLabel.id);

        const footer = document.createElement("div");
        footer.className = "reservas-datepicker__footer";

        const shortcutButtons = SHORTCUT_DATES.map(({ label, offset }) => {
            const shortcut = document.createElement("button");
            shortcut.type = "button";
            shortcut.className = "reservas-datepicker__today";
            shortcut.textContent = label;
            shortcut.setAttribute(
                "aria-label",
                offset === 0
                    ? "Seleccionar hoy"
                    : `Seleccionar fecha en ${offset} días`,
            );
            shortcut.addEventListener("click", () => {
                const iso = isoAfter(offset);

                if (iso >= minISO && (!maxISO || iso <= maxISO)) {
                    selectDate(iso);
                }
            });
            footer.append(shortcut);

            return { button: shortcut, offset };
        });

        panel.append(calendarHeader, weekdays, grid, footer);

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

        /** @param {string} iso */
        const selectDate = (iso) => {
            native.value = iso;
            updateDisplay();
            native.dispatchEvent(new Event("change", { bubbles: true }));
            close({ focus: true });
        };

        /** @param {string} [focusISO] */
        const renderCalendar = (focusISO = "") => {
            monthLabel.textContent = formatMonth(viewYear, viewMonth);

            const currentMonth = new Date(viewYear, viewMonth, 1);

            previousMonth.disabled = currentMonth <= minMonthStart;
            nextMonth.disabled = maxMonthStart
                ? currentMonth >= maxMonthStart
                : false;

            grid.replaceChildren();

            const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
            const leadingBlanks = (firstWeekday + 6) % 7;
            const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

            for (let index = 0; index < leadingBlanks; index += 1) {
                const blank = document.createElement("span");
                blank.className = "reservas-datepicker__blank";
                blank.setAttribute("aria-hidden", "true");
                grid.append(blank);
            }

            for (let day = 1; day <= daysInMonth; day += 1) {
                const date = new Date(viewYear, viewMonth, day);
                const iso = toISODate(date);
                const dayButton = document.createElement("button");

                dayButton.type = "button";
                dayButton.className = "reservas-datepicker__day";
                dayButton.dataset.date = iso;
                dayButton.textContent = String(day);
                dayButton.setAttribute("aria-label", formatDateLong(date));
                dayButton.setAttribute(
                    "aria-pressed",
                    String(iso === selectedISO),
                );

                if (iso === todayISO) {
                    dayButton.setAttribute("aria-current", "date");
                }

                if (iso < minISO || (maxISO && iso > maxISO)) {
                    dayButton.disabled = true;
                }

                dayButton.addEventListener("click", () => {
                    selectDate(iso);
                });
                dayButton.addEventListener("keydown", handleDayKeydown);
                grid.append(dayButton);
            }

            /** @type {HTMLButtonElement | null} */
            const preferred = focusISO
                ? grid.querySelector(`[data-date="${focusISO}"]:not(:disabled)`)
                : null;
            /** @type {HTMLButtonElement | null} */
            const fallback = grid.querySelector("button:not(:disabled)");
            /** @type {HTMLButtonElement | null} */
            const target = preferred || fallback;

            if (target) {
                target.focus({ preventScroll: true });
                keepFocusedInPanel(panel);
            }
        };

        /** @param {KeyboardEvent} event */
        const handleDayKeydown = (event) => {
            if (!(event.currentTarget instanceof HTMLButtonElement)) return;
            const currentDate = parseISODate(
                event.currentTarget.dataset.date || "",
            );

            if (!currentDate) return;

            const currentDay = currentDate.getDate();
            const currentWeekday = (currentDate.getDay() + 6) % 7;
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
            } else if (event.key === "PageUp" || event.key === "PageDown") {
                const monthDelta = event.key === "PageUp" ? -1 : 1;
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

            if (nextISO < minISO || (maxISO && nextISO > maxISO)) {
                return;
            }

            viewYear = nextDate.getFullYear();
            viewMonth = nextDate.getMonth();
            renderCalendar(nextISO);
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

        const open = () => {
            if (!panel.hidden) return;

            selectedISO = native.value;

            const initialDate =
                parseISODate(selectedISO) || parseISODate(minISO) || new Date();

            viewYear = initialDate.getFullYear();
            viewMonth = initialDate.getMonth();
            activatePicker(close, () => {
                if (panel.hidden) return;

                positionPickerPanel(wrapper, button, panel, 420);
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
            const target = new Date(viewYear, viewMonth - 1, 1);

            viewYear = target.getFullYear();
            viewMonth = target.getMonth();
            renderCalendar(toISODate(target));
        });

        nextMonth.addEventListener("click", () => {
            const target = new Date(viewYear, viewMonth + 1, 1);

            viewYear = target.getFullYear();
            viewMonth = target.getMonth();
            renderCalendar(toISODate(target));
        });

        for (const { button: shortcut, offset } of shortcutButtons) {
            const iso = isoAfter(offset);

            shortcut.disabled = iso < minISO || Boolean(maxISO && iso > maxISO);
        }

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
        updateDisplay();
    };

    document
        .querySelectorAll('[data-picker="date"]')
        .forEach(enhanceDatePicker);
}
