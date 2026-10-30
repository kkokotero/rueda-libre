/**
 * Modal de confirmación que se abre al enviar la solicitud de reserva.
 *
 * Reproduce el ciclo de vida de las hojas modales de los pickers: fondo
 * oscurecido con desenfoque, hoja centrada y cierre con Escape o clic fuera.
 * Usa el `<dialog>` nativo para heredar el bloqueo de foco y la tecla Escape
 * del navegador.
 */

import { formatDateLong, parseISODate } from "../shared/dates.js";
import { html } from "../shared/html.js";
import { createIcon } from "./picker/icons.js";

/**
 * @typedef {object} ReservationSummary
 * @property {string} name
 * @property {string} bikeType
 * @property {string} quantity
 * @property {string} isoDate
 * @property {string} time
 * @property {string} duration
 * @property {string} route
 * @property {string} contactLabel
 * @property {string} contactIcon
 */

/**
 * @typedef {object} ReservationConfirmation
 * @property {(summary: ReservationSummary, request: { href: string }) => void} open
 * @property {() => void} close
 */

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
});

/**
 * Hora "HH:MM" en texto local (p. ej. "7:00 a. m.").
 *
 * Se arma una fecha ficticia para no desplazar la hora por la zona horaria.
 *
 * @param {string} time
 * @returns {string}
 */
const formatTime = (time) => {
    const [hours, minutes] = time.split(":").map(Number);

    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return time;

    return timeFormatter.format(new Date(2000, 0, 1, hours, minutes));
};

/** @param {string} quantity @returns {string} */
const formatBikes = (quantity) =>
    `${quantity} ${quantity === "1" ? "bicicleta" : "bicicletas"}`;

/**
 * Filas del resumen: una por dato, con su glifo de Material Symbols.
 *
 * @param {ReservationSummary} summary
 * @returns {DocumentFragment[]}
 */
const buildSummaryRows = (summary) => {
    const date = parseISODate(summary.isoDate);

    /** @type {Array<[string, string, string]>} */
    const rows = [
        ["person", "Nombre", summary.name],
        ["pedal_bike", "Bicicleta", summary.bikeType],
        ["add", "Cantidad", formatBikes(summary.quantity)],
        [
            "calendar_month",
            "Fecha",
            date ? formatDateLong(date) : summary.isoDate,
        ],
        ["schedule", "Hora", formatTime(summary.time)],
        ["timer", "Duración", summary.duration],
        ["route", "Recorrido", summary.route],
        [summary.contactIcon, "Contacto", summary.contactLabel],
    ];

    return rows
        .filter(([, , value]) => value !== "")
        .map(
            ([iconName, label, value]) => html`
            <div class="reservas-modal__row">
                <dt class="reservas-modal__term">${createIcon(iconName)}${label}</dt>
                <dd class="reservas-modal__value">${value}</dd>
            </div>
        `,
        );
};

/**
 * Monta el modal de confirmación sobre el `<dialog>` de la página.
 *
 * @returns {ReservationConfirmation | null} `null` si la página no trae el diálogo
 */
export function createReservationConfirmation() {
    const dialog = document.getElementById("reservation-confirmation");

    if (!(dialog instanceof HTMLDialogElement)) return null;

    const nameSlot = dialog.querySelector("[data-confirmation-name]");
    const summaryList = dialog.querySelector("[data-confirmation-summary]");
    const mailLink = dialog.querySelector("[data-confirmation-mail]");

    if (!(summaryList instanceof HTMLDListElement)) return null;
    if (!(mailLink instanceof HTMLAnchorElement)) return null;

    const close = () => {
        if (dialog.open) dialog.close();
    };

    for (const dismiss of dialog.querySelectorAll(
        "[data-confirmation-dismiss]",
    )) {
        dismiss.addEventListener("click", close);
    }

    // El clic en el propio `<dialog>` (fuera de la hoja) cierra el modal,
    // igual que el fondo que montan los pickers.
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) close();
    });

    /** @param {ReservationSummary} summary @param {{ href: string }} request */
    const open = (summary, request) => {
        mailLink.href = request.href;

        if (nameSlot) {
            nameSlot.textContent = summary.name.split(" ")[0];
        }

        summaryList.replaceChildren(...buildSummaryRows(summary));

        if (!dialog.open) dialog.showModal();
    };

    return { open, close };
}
