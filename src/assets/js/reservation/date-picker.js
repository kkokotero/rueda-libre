/**
 * Selector de fecha con calendario accesible.
 *
 * Reemplaza un `input[type="date"]` por un botón que abre un panel con
 * rejilla de días, navegación por mes y atajos (hoy, mañana, +7 y +14 días).
 * El input nativo se conserva oculto como fuente de verdad y sigue emitiendo
 * sus eventos `change` para que el resto del formulario reaccione igual.
 *
 * El ciclo de vida del panel (abrir, cerrar, Escape, clic fuera, foco) vive
 * en `./picker/behavior.js`; aquí solo queda la lógica del calendario.
 */

import {
    parseISODate,
    toISODate,
    formatDate,
    formatDateLong,
    formatMonth,
} from "../shared/dates.js";
import { createPickerBehavior } from "./picker/behavior.js";

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

/** Índice de día de la semana empezando en lunes (0 = lunes). */
/** @param {number} weekday @returns {number} */
const mondayIndex = (weekday) => (weekday + 6) % 7;

/**
 * Enhances each native date input with an accessible calendar picker.
 * @param {import("./picker-core.js").ReservationPickerCore} pickerCore
 * @returns {void}
 */
export function initializeReservationDatePicker(pickerCore) {
    const {
        createIcon,
        getLabelText,
        getDescribedBy,
        createPickerTrigger,
        keepFocusedInPanel,
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

        /** @param {string} [focusISO] */
        const renderCalendar = (focusISO = "") => {
            monthLabel.textContent = formatMonth(viewYear, viewMonth);

            const currentMonth = new Date(viewYear, viewMonth, 1);

            previousMonth.disabled = currentMonth <= minMonthStart;
            nextMonth.disabled = maxMonthStart
                ? currentMonth >= maxMonthStart
                : false;

            grid.replaceChildren();

            const leadingBlanks = mondayIndex(
                new Date(viewYear, viewMonth, 1).getDay(),
            );
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

                dayButton.addEventListener("click", () => selectDate(iso));
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
            const currentWeekday = mondayIndex(currentDate.getDay());
            /** @type {Date | null} */
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

        /** @param {string} iso */
        const selectDate = (iso) => {
            native.value = iso;
            updateDisplay();
            native.dispatchEvent(new Event("change", { bubbles: true }));
            close({ focus: true });
        };

        /** @param {number} monthDelta */
        const goToMonth = (monthDelta) => {
            const target = new Date(viewYear, viewMonth + monthDelta, 1);

            viewYear = target.getFullYear();
            viewMonth = target.getMonth();
            renderCalendar(toISODate(target));
        };

        const { close, finalize } = createPickerBehavior(pickerCore, {
            wrapper,
            button,
            panel,
            native,
            label,
            titleText,
            panelHeight: 420,
            onOpen: () => {
                selectedISO = native.value;

                const initialDate =
                    parseISODate(selectedISO) ||
                    parseISODate(minISO) ||
                    new Date();

                viewYear = initialDate.getFullYear();
                viewMonth = initialDate.getMonth();
            },
            onShown: () => renderCalendar(selectedISO || minISO),
        });

        previousMonth.addEventListener("click", () => goToMonth(-1));
        nextMonth.addEventListener("click", () => goToMonth(1));

        for (const { label: shortcutLabel, offset } of SHORTCUT_DATES) {
            const shortcut = document.createElement("button");
            const iso = isoAfter(offset);

            shortcut.type = "button";
            shortcut.className = "reservas-datepicker__today";
            shortcut.textContent = shortcutLabel;
            shortcut.setAttribute(
                "aria-label",
                offset === 0
                    ? "Seleccionar hoy"
                    : `Seleccionar fecha en ${offset} días`,
            );
            shortcut.disabled =
                iso < minISO || Boolean(maxISO && iso > maxISO);
            shortcut.addEventListener("click", () => {
                if (iso >= minISO && (!maxISO || iso <= maxISO)) {
                    selectDate(iso);
                }
            });
            footer.append(shortcut);
        }

        native.addEventListener("change", updateDisplay);

        finalize();
        updateDisplay();
    };

    document
        .querySelectorAll('[data-picker="date"]')
        .forEach(enhanceDatePicker);
}
