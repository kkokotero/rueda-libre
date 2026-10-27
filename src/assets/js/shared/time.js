/**
 * Horario de atención y utilidades sobre horas "HH:MM".
 *
 * Domingos, sábados y festivos colombianos abren de 6:00 a 14:00; el resto de
 * días, de 7:00 a 19:00. Desde el día en curso solo se ofrecen horarios
 * futuros, redondeados hacia arriba al paso indicado.
 */

import { toISODate } from "./dates.js";
import { isColombianHoliday } from "./holidays.js";

/**
 * Converts a 24-hour time string to minutes after midnight.
 * @param {string} time Time in `HH:MM` format
 * @returns {number}
 */
export const parseTime = (time) => {
    const [hours, minutes] = time.split(":").map(Number);

    return hours * 60 + minutes;
};

/**
 * Converts minutes after midnight to a zero-padded 24-hour time.
 * @param {number} totalMinutes
 * @returns {string}
 */
export const toTime = (totalMinutes) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0",
    )}`;
};

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

/** @param {string} time Time in `HH:MM` format @returns {string} */
export const formatTime = (time) => {
    const [hours, minutes] = time.split(":").map(Number);

    return timeFormatter.format(new Date(2000, 0, 1, hours, minutes));
};

/**
 * Franja de atención y horarios disponibles para una fecha.
 *
 * @param {Date} date fecha de inicio seleccionada
 * @param {number} stepMinutes intervalo entre horarios, en minutos
 * @param {Date} [now] reloj actual, para descartar los horarios ya pasados
 * @returns {{ opensAt: number, closesAt: number, firstAvailable: number, times: string[] }}
 */
export const getScheduleForDate = (date, stepMinutes, now = new Date()) => {
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    const holiday = isColombianHoliday(date);
    const opensAt = weekend || holiday ? 6 * 60 : 7 * 60;
    const closesAt = weekend || holiday ? 14 * 60 : 19 * 60;

    let firstAvailable = opensAt;

    if (toISODate(date) === toISODate(now)) {
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        firstAvailable =
            opensAt +
            Math.max(
                0,
                Math.ceil((currentMinutes + 1 - opensAt) / stepMinutes),
            ) *
                stepMinutes;
    }

    const times = [];

    for (
        let totalMinutes = firstAvailable;
        totalMinutes <= closesAt;
        totalMinutes += stepMinutes
    ) {
        times.push(toTime(totalMinutes));
    }

    return { opensAt, closesAt, firstAvailable, times };
};
