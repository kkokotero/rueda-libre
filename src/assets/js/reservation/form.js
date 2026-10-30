/**
 * Validación en vivo y envío del formulario de reservas.
 *
 * No usa la validación nativa del navegador (`noValidate`): cada campo se
 * valida con la API de Constraint Validation y los errores se pintan dentro
 * del propio bloque `[data-field]`. El envío no viaja por red: arma un
 * `mailto:` con los datos, lo muestra en el estado del formulario y abre el
 * modal de confirmación con el resumen de la reserva.
 */

import { getErrorMessage } from "./validation.js";

/**
 * @typedef {import("./confirmation.js").ReservationSummary} ReservationSummary
 * @typedef {{ open: (summary: ReservationSummary, request: { href: string }) => void }} ConfirmationOpener
 */

/** `true` si el elemento es un control de formulario real. */
/** @param {EventTarget | null} element @returns {element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} */
const isFieldControl = (element) =>
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement;

/** @param {HTMLElement} control @returns {HTMLElement | null} */
const getField = (control) => control.closest("[data-field]");

/**
 * Elemento que debe recibir el foco y el `aria-invalid`.
 *
 * Los campos sustituidos por un picker pierden la apariencia nativa, así que
 * el error se marca sobre el botón que lo reemplaza.
 *
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} control
 * @returns {HTMLElement}
 */
const getDisplayControl = (control) => {
    const field = getField(control);

    if (!field) return control;

    if (control.matches("select, input[type='date'], input[type='time']")) {
        return field.querySelector(".reservas-picker__button") || control;
    }

    return control;
};

/**
 * Renders or clears a field error.
 * @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} control
 * @param {string} message
 */
const showError = (control, message) => {
    const field = getField(control);

    if (!field) return;

    const error = field.querySelector(".reservas-form__error");

    if (!error) return;

    const display = getDisplayControl(control);

    if (!message) {
        field.classList.remove("is-invalid");
        error.replaceChildren();
        display.removeAttribute("aria-invalid");
        return;
    }

    field.classList.add("is-invalid");

    const icon = document.createElement("span");
    icon.className = "icon reservas-form__error-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "error";

    const text = document.createElement("span");
    text.textContent = message;

    error.replaceChildren(icon, text);
    display.setAttribute("aria-invalid", "true");
};

/**
 * Wires live validation, mailto submission, and the confirmation dialog.
 * @param {HTMLFormElement} form
 * @param {HTMLElement} status
 * @param {() => void} clearStatus
 * @param {ConfirmationOpener | null} [confirmation] modal que se abre al enviar
 * @returns {void}
 */
export function initializeReservationForm(
    form,
    status,
    clearStatus,
    confirmation = null,
) {
    /** @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} control */
    const validateControl = (control) => {
        const message = getErrorMessage(control);
        showError(control, message);
        return message === "";
    };

    const validateAll = () => {
        /** @type {HTMLElement | null} */
        let firstInvalid = null;

        for (const field of form.querySelectorAll("[data-field]")) {
            const control = field.querySelector("input, select, textarea");

            if (
                !(
                    control instanceof HTMLInputElement ||
                    control instanceof HTMLSelectElement ||
                    control instanceof HTMLTextAreaElement
                )
            ) {
                continue;
            }

            if (!validateControl(control) && !firstInvalid) {
                firstInvalid = getDisplayControl(control);
            }
        }

        return firstInvalid;
    };

    form.noValidate = true;

    form.addEventListener("input", (event) => {
        clearStatus();

        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (field?.classList.contains("is-invalid")) {
            validateControl(event.target);
        }
    });

    form.addEventListener("change", (event) => {
        clearStatus();

        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (field?.querySelector(".reservas-form__error")) {
            validateControl(event.target);
        }
    });

    form.addEventListener("focusout", (event) => {
        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (field?.querySelector(".reservas-form__error")) {
            validateControl(event.target);
        }
    });

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearStatus();

        const firstInvalid = validateAll();

        if (firstInvalid) {
            firstInvalid.focus({ preventScroll: true });
            firstInvalid.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
            return;
        }

        const { subject, body, href } = buildRequest(form);
        const copy = buildStatusCopy();

        const link = document.createElement("a");
        link.className = "reservas-form__status-link";
        link.href = href;

        const linkIcon = document.createElement("span");
        linkIcon.className = "icon";
        linkIcon.setAttribute("aria-hidden", "true");
        linkIcon.textContent = "mail";

        const linkText = document.createElement("span");
        linkText.textContent = "Abrir correo con mi solicitud";

        link.append(linkIcon, linkText);
        status.replaceChildren(copy, link);
        status.classList.add("is-visible");
        status.focus({ preventScroll: true });

        confirmation?.open(buildSummary(form), { href });

        // `subject` y `body` ya están incrustados en `href`; se quedan como
        // valores explícitos para que el mensaje sea fácil de depurar.
        void subject;
        void body;
    });
}

/**
 * Datos de la reserva que resume el modal de confirmación.
 *
 * Los select se leen del DOM para reflejar el texto (y el icono) que ve el
 * usuario, en vez de duplicar aquí sus etiquetas.
 *
 * @param {HTMLFormElement} form
 * @returns {ReservationSummary}
 */
const buildSummary = (form) => {
    const data = new FormData(form);
    /** @param {string} name @returns {string} */
    const value = (name) => String(data.get(name) || "").trim();

    const contact = form.elements.namedItem("metodo_contacto");
    const contactOption =
        contact instanceof HTMLSelectElement
            ? contact.selectedOptions[0]
            : undefined;

    return {
        name: value("nombre"),
        bikeType: value("tipo"),
        quantity: value("cantidad"),
        isoDate: value("fecha"),
        time: value("hora"),
        duration: value("duracion"),
        route: value("recorrido"),
        contactLabel: contactOption?.text.trim() || "",
        contactIcon: contactOption?.dataset.icon || "swap_horiz",
    };
};

/** Aviso que se muestra junto al enlace de correo. */
const buildStatusCopy = () => {
    const copy = document.createElement("span");
    copy.className = "reservas-form__status-copy";

    const icon = document.createElement("span");
    icon.className = "icon reservas-form__status-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "mark_email_read";

    const message = document.createElement("span");
    message.textContent =
        "Tu solicitud está lista. Abre tu aplicación de correo y envíala; te confirmaremos la disponibilidad lo antes posible.";

    copy.append(icon, message);

    return copy;
};

const CONTACT_LABELS = {
    cualquiera: "Cualquier medio",
    email: "Correo",
    telefono: "Teléfono",
};

/** Asunto, cuerpo y enlace `mailto:` de la solicitud. */
/** @param {HTMLFormElement} form @returns {{ subject: string, body: string, href: string }} */
const buildRequest = (form) => {
    const data = new FormData(form);
    /** @param {string} name @returns {string} */
    const value = (name) => String(data.get(name) || "").trim();

    const name = value("nombre");
    const date = value("fecha");
    const preferredContact = /** @type {keyof typeof CONTACT_LABELS} */ (
        value("metodo_contacto")
    );
    const preferredContactLabel = CONTACT_LABELS[preferredContact];
    const subject = `Solicitud de reserva - ${name} - ${date}`;
    const lines = [
        "Hola, quiero reservar una bicicleta.",
        "",
        `Nombre: ${name}`,
        `Tipo de documento: ${value("tipo_documento")}`,
        `Número de documento: ${value("documento")}`,
        `Método de contacto preferido: ${preferredContactLabel}`,
        `Correo: ${value("email")}`,
        `Teléfono: ${value("telefono")}`,
        `Fecha de inicio: ${date}`,
        `Hora de inicio: ${value("hora")}`,
        `Tipo de bicicleta: ${value("tipo")}`,
        `Cantidad de bicicletas: ${value("cantidad")}`,
        `Duración: ${value("duracion")}`,
        `Recorrido de interés: ${value("recorrido")}`,
        `Comentarios: ${value("mensaje") || "Sin comentarios"}`,
        `Acepta contacto: ${data.get("consentimiento") ? "Sí" : "No"}`,
    ];
    const body = lines.join("\n");
    const href = `mailto:hola@ruedalibre.example?subject=${encodeURIComponent(
        subject,
    )}&body=${encodeURIComponent(body)}`;

    return { subject, body, href };
};
