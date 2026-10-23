/**
 * Utilidades de fechas compartidas por los pickers de fecha y hora.
 *
 * Todas las fechas se manejan en horario local: `toISODate` formatea con los
 * componentes locales para que "hoy" no se desplace por la zona horaria.
 */

export const parseISODate = (iso) => {
    if (!iso) return null;

    const [year, month, day] = String(iso).split("-").map(Number);

    if (!year || !month || !day) return null;

    const date = new Date(year, month - 1, day);

    return Number.isNaN(date.getTime()) ? null : date;
};

export const toISODate = (date) =>
    [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");

/**
 * Fecha de hoy en ISO según la zona horaria local.
 *
 * `toISOString` devuelve UTC, así que se corrige el desfase del offset antes
 * de recortar: sin esto "hoy" puede ser ayer o mañana según la zona horaria.
 */
export const localTodayISO = () => {
    const now = new Date();

    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
};

const dateFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

const longDateFormatter = new Intl.DateTimeFormat("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
});

export const formatDate = (date) => dateFormatter.format(date);

export const formatDateLong = (date) => longDateFormatter.format(date);

/** Nombre del mes en mayúscula inicial (p. ej. "Octubre de 2026"). */
export const formatMonth = (year, month) => {
    const text = monthFormatter.format(new Date(year, month, 1));

    return text.charAt(0).toUpperCase() + text.slice(1);
};
