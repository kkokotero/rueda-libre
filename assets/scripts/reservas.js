import { initializeReservationForm } from "./reservation-form.js";
import { createReservationPickerCore } from "./reservation-picker-core.js";
import { initializeReservationDatePicker } from "./reservation-date-picker.js";
import { initializeReservationSelects } from "./reservation-select.js";
import { initializeReservationTimePicker } from "./reservation-time-picker.js";
import { initializeReservationQuantity } from "./reservation-quantity.js";

const form = document.getElementById("reservation-form");
const status = document.getElementById("reservation-status");

if (form && status) {
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
            documentNumber.value = documentNumber.value.replace(
                /[^0-9]/g,
                "",
            ).slice(0, 10);
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
        const counter = document.getElementById(
            "reserva-mensaje-counter",
        );
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
        const now = new Date();
        const localToday = new Date(
            now.getTime() - now.getTimezoneOffset() * 60000,
        );
        dateField.min = localToday.toISOString().slice(0, 10);
    }

    const pickerCore = createReservationPickerCore();
    initializeReservationSelects(pickerCore);
    initializeReservationDatePicker(pickerCore);
    initializeReservationTimePicker(pickerCore);
    initializeReservationQuantity(form);
    initializeReservationForm(form, status, clearStatus);
}
