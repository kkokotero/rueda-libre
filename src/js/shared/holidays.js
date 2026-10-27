/**
 * Festivos colombianos.
 *
 * Se separan tres grupos:
 *
 *  - `fixedHolidays`: fechas que caen siempre el mismo día.
 *  - `movedHolidays`: festivos con Ley Emiliani, trasladados al lunes
 *    siguiente aunque caigan en fin de semana.
 *  - `easterHolidays`: los movedizos respecto al domingo de Pascua
 *    (Jueves y Viernes Santos se quedan en su fecha; Ascensión, Corpus
 *    Christi y Sagrado Corazón se trasladan al lunes).
 */

import { toISODate } from "./dates.js";

const FIXED_HOLIDAYS = [
    [1, 1],
    [5, 1],
    [7, 20],
    [8, 7],
    [12, 8],
    [12, 25],
];

const MOVED_HOLIDAYS = [
    [1, 6],
    [3, 19],
    [6, 29],
    [8, 15],
    [10, 12],
    [11, 1],
    [11, 11],
];

/** Desplazamiento en días hasta el lunes siguiente (0 si ya es lunes). */
/** @param {Date} date @returns {number} */
const untilNextMonday = (date) => (8 - date.getDay()) % 7;

/** @param {number} year @returns {Date} */
export const getEasterSunday = (year) => {
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

/** @param {Date} date @returns {boolean} */
export const isColombianHoliday = (date) => {
    const year = date.getFullYear();
    const iso = toISODate(date);

    const fixedHolidays = FIXED_HOLIDAYS.map(([month, day]) =>
        toISODate(new Date(year, month - 1, day)),
    );

    const movedHolidays = MOVED_HOLIDAYS.map(([month, day]) => {
        const holiday = new Date(year, month - 1, day);
        holiday.setDate(holiday.getDate() + untilNextMonday(holiday));

        return toISODate(holiday);
    });

    const easter = getEasterSunday(year);
    const easterHolidays = [-3, -2, 39, 60, 68].map((offset) => {
        const holiday = new Date(easter);
        holiday.setDate(holiday.getDate() + offset);

        // Los que siguen a la Pascua se mueven al lunes siguiente.
        if (offset > 0) {
            holiday.setDate(holiday.getDate() + untilNextMonday(holiday));
        }

        return toISODate(holiday);
    });

    return [...fixedHolidays, ...movedHolidays, ...easterHolidays].includes(
        iso,
    );
};
