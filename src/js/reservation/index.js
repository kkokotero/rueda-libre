/**
 * Punto de entrada del formulario de reservas.
 *
 * Prepara los campos (máscaras numéricas, contador de caracteres y mínimo de
 * fecha), arranca los pickers y conecta la validación. Solo se ejecuta si la
 * página trae el formulario y su bloque de estado.
 */

import { localTodayISO } from "../shared/dates.js";
import { initializeReservationForm } from "./form.js";
import { initializeReservationQuantity } from "./quantity.js";
import { createReservationPickerCore } from "./picker-core.js";
import { initializeReservationSelects } from "./select.js";
import { initializeReservationDatePicker } from "./date-picker.js";
import { initializeReservationTimePicker } from "./time-picker.js";

const form = document.getElementById("reservation-form");
const status = document.getElementById("reservation-status");

if (form instanceof HTMLFormElement && status) {
    const dateField = form.elements.namedItem("fecha");
    const documentNumber = form.elements.namedItem("documento");
    const phoneNumber = form.elements.namedItem("telefono");
    const messageField = form.elements.namedItem("mensaje");

    const clearStatus = () => {
        status.classList.remove("is-visible");
        status.replaceChildren();
    };

    if (documentNumber instanceof HTMLInputElement) {
        documentNumber.addEventListener("input", () => {
            documentNumber.value = documentNumber.value
                .replace(/[^0-9]/g, "")
                .slice(0, 10);
        });
    }

    if (phoneNumber instanceof HTMLInputElement) {
        phoneNumber.addEventListener("input", () => {
            phoneNumber.value = phoneNumber.value
                .replace(/[^0-9]/g, "")
                .slice(0, 10);
        });
    }

    if (messageField instanceof HTMLTextAreaElement) {
        const counter = document.getElementById("reserva-mensaje-counter");
        const maxLength = messageField.maxLength;

        const updateMessageCounter = () => {
            if (counter) {
                counter.textContent = `${messageField.value.length}/${maxLength}`;
            }
        };

        messageField.addEventListener("input", updateMessageCounter);
        updateMessageCounter();
    }

    if (dateField instanceof HTMLInputElement) {
        dateField.min = localTodayISO();
    }

    const pickerCore = createReservationPickerCore();

    initializeReservationSelects(pickerCore);
    initializeReservationDatePicker(pickerCore);
    initializeReservationTimePicker(pickerCore);
    initializeReservationQuantity(form);
    initializeReservationForm(form, status, clearStatus);
}
