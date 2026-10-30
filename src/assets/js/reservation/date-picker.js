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
import { element, html } from "../shared/html.js";
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

        /** @type {HTMLButtonElement} */
        const previousMonth = element`<button
            type="button"
            class="reservas-datepicker__nav"
            aria-label="Mes anterior">${createIcon("chevron_left")}</button>`;

        /** @type {HTMLParagraphElement} */
        const monthLabel = element`<p
            class="reservas-datepicker__month"
            id="${native.id}-month"
            aria-live="polite"></p>`;

        /** @type {HTMLButtonElement} */
        const nextMonth = element`<button
            type="button"
            class="reservas-datepicker__nav"
            aria-label="Mes siguiente">${createIcon("chevron_right")}</button>`;

        const weekdays = html`<div
            class="reservas-datepicker__weekdays"
            aria-hidden="true">${WEEKDAYS.map((day) => html`<span>${day}</span>`)}</div>`;

        /** @type {HTMLDivElement} */
        const grid = element`<div
            class="reservas-datepicker__grid"
            role="group"
            aria-labelledby="${monthLabel.id}"></div>`;

        /** @type {HTMLDivElement} */
        const footer = element`<div class="reservas-datepicker__footer"></div>`;

        /** @type {HTMLDivElement} */
        const panel = element`<div
            id="${panelId}"
            class="reservas-picker__panel reservas-datepicker__panel"
            role="dialog"
            aria-label="${titleText}"
            hidden>
            <div class="reservas-datepicker__header">
                ${previousMonth}
                ${monthLabel}
                ${nextMonth}
            </div>
            ${weekdays}
            ${grid}
            ${footer}
        </div>`;

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

            const blanks = Array.from(
                { length: leadingBlanks },
                () =>
                    html`<span
                    class="reservas-datepicker__blank"
                    aria-hidden="true"></span>`,
            );

            const dayButtons = [];

            for (let day = 1; day <= daysInMonth; day += 1) {
                const date = new Date(viewYear, viewMonth, day);
                const iso = toISODate(date);
                const isUnavailable =
                    iso < minISO || Boolean(maxISO && iso > maxISO);

                /** @type {HTMLButtonElement} */
                const dayButton = element`<button
                    type="button"
                    class="reservas-datepicker__day"
                    data-date="${iso}"
                    aria-label="${formatDateLong(date)}"
                    aria-pressed="${iso === selectedISO}"
                    aria-current="${iso === todayISO ? "date" : "false"}"
                    ${isUnavailable ? "disabled" : ""}>${day}</button>`;

                dayButton.addEventListener("click", () => selectDate(iso));
                dayButton.addEventListener("keydown", handleDayKeydown);
                dayButtons.push(dayButton);
            }

            grid.replaceChildren(...blanks, ...dayButtons);

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
            const iso = isoAfter(offset);
            const isUnavailable =
                iso < minISO || Boolean(maxISO && iso > maxISO);

            const shortcut = element`<button
                type="button"
                class="reservas-datepicker__today"
                aria-label="${offset === 0 ? "Seleccionar hoy" : `Seleccionar fecha en ${offset} días`}"
                ${isUnavailable ? "disabled" : ""}>${shortcutLabel}</button>`;

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
