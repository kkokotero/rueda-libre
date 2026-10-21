const REQUIRED_MESSAGES = {
    nombre: "Escribe tu nombre completo.",
    tipo_documento: "Selecciona el tipo de documento.",
    documento: "Escribe tu número de documento.",
    metodo_contacto: "Elige cómo prefieres que te contactemos.",
    email: "Escribe tu correo electrónico.",
    telefono: "Escribe tu teléfono.",
    fecha: "Elige la fecha de inicio.",
    hora: "Elige la hora de inicio.",
    tipo: "Selecciona el tipo de bicicleta.",
    cantidad: "Indica cuántas bicicletas necesitas.",
    duracion: "Selecciona la duración.",
    consentimiento: "Acepta el contacto para continuar.",
};

export function initializeReservationForm(form, status, clearStatus) {
    const isFieldControl = (element) =>
        element instanceof Element &&
        element.matches("input, select, textarea");

    const getField = (control) => control.closest("[data-field]");

    const getDisplayControl = (control) => {
        const field = getField(control);

        if (!field) return control;

        if (
            control.matches(
                "select, input[type='date'], input[type='time']",
            )
        ) {
            return (
                field.querySelector(
                    ".reservas-picker__button",
                ) || control
            );
        }

        return control;
    };

    const showError = (control, message) => {
        const field = getField(control);

        if (!field) return;

        const error = field.querySelector(
            ".reservas-form__error",
        );

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

    const getErrorMessage = (control) => {
        const validity = control.validity;

        if (validity.valueMissing) {
            return (
                REQUIRED_MESSAGES[control.name] ||
                "Completa este campo."
            );
        }

        if (
            control.name === "nombre" &&
            control.value.trim().length < 1
        ) {
            return "Escribe tu nombre completo.";
        }

        if (
            control.name === "documento" &&
            control.value.trim().length < 1
        ) {
            return "Escribe tu número de documento.";
        }

        if (
            control.name === "email" &&
            validity.typeMismatch
        ) {
            return "Escribe un correo electrónico válido.";
        }

        if (control.name === "telefono") {
            if (validity.patternMismatch) {
                return "Escribe un número colombiano válido: celular o fijo, con o sin prefijo 57.";
            }
        }

        if (control.name === "mensaje" && validity.tooLong) {
            return "El comentario no puede superar los 300 caracteres.";
        }

        if (
            control.name === "fecha" &&
            (validity.rangeUnderflow || validity.badInput)
        ) {
            return "Elige una fecha de hoy en adelante.";
        }

        if (
            control.name === "hora" &&
            (validity.rangeUnderflow ||
                validity.rangeOverflow ||
                validity.badInput)
        ) {
            return "Elige una hora dentro del horario de atención.";
        }

        if (
            control.name === "hora" &&
            validity.stepMismatch
        ) {
            return "Elige una hora en intervalos de un minuto.";
        }

        if (
            control.name === "cantidad" &&
            (validity.rangeUnderflow ||
                validity.rangeOverflow ||
                validity.stepMismatch ||
                validity.badInput)
        ) {
            return "Elige entre 1 y 6 bicicletas.";
        }

        if (validity.customError) {
            return control.validationMessage;
        }

        return "";
    };

    const validateControl = (control) => {
        const message = getErrorMessage(control);
        showError(control, message);
        return message === "";
    };

    const validateAll = () => {
        let firstInvalid = null;

        form.querySelectorAll("[data-field]").forEach((field) => {
            const control = field.querySelector(
                "input, select, textarea",
            );

            if (!control) return;

            if (!validateControl(control) && !firstInvalid) {
                firstInvalid = getDisplayControl(control);
            }
        });

        return firstInvalid;
    };

    form.noValidate = true;

    form.addEventListener("input", (event) => {
        clearStatus();

        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (
            field &&
            field.classList.contains("is-invalid")
        ) {
            validateControl(event.target);
        }
    });

    form.addEventListener("change", (event) => {
        clearStatus();

        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (
            field &&
            field.querySelector(".reservas-form__error")
        ) {
            validateControl(event.target);
        }
    });

    form.addEventListener("focusout", (event) => {
        if (!isFieldControl(event.target)) return;

        const field = getField(event.target);

        if (
            field &&
            field.querySelector(".reservas-form__error")
        ) {
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

        const data = new FormData(form);
        const value = (name) =>
            String(data.get(name) || "").trim();
        const name = value("nombre");
        const date = value("fecha");
        const preferredContact = value("metodo_contacto");
        const preferredContactLabel = {
            cualquiera: "Cualquier medio",
            email: "Correo",
            telefono: "Teléfono",
        }[preferredContact];
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
            `Comentarios: ${
                value("mensaje") || "Sin comentarios"
            }`,
            `Acepta contacto: ${
                data.get("consentimiento") ? "Sí" : "No"
            }`,
        ];
        const mailto = `mailto:hola@ruedalibre.example?subject=${encodeURIComponent(
            subject,
        )}&body=${encodeURIComponent(lines.join("\n"))}`;

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

        const link = document.createElement("a");
        link.className = "reservas-form__status-link";
        link.href = mailto;

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
    });
}
