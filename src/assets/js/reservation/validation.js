/**
 * Reglas de validación del formulario de reservas.
 *
 * La API nativa (`validity`, `validationMessage`) aporta los indicadores de
 * qué falló; aquí se traducen a mensajes claros y en español para cada campo.
 */

/** @type {Record<string, string>} */
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

/** Mensaje de error para un control, o cadena vacía si es válido. */
/** @param {HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement} control @returns {string} */
export const getErrorMessage = (control) => {
    const validity = control.validity;

    if (validity.valueMissing) {
        return REQUIRED_MESSAGES[control.name] || "Completa este campo.";
    }

    if (control.name === "nombre" && control.value.trim().length < 3) {
        return "El nombre completo debe tener al menos 3 caracteres.";
    }

    if (
        control.name === "documento" &&
        (validity.patternMismatch || validity.tooShort || validity.tooLong)
    ) {
        return "El documento debe tener entre 6 y 10 dígitos.";
    }

    if (control.name === "email" && validity.typeMismatch) {
        return "Escribe un correo electrónico válido.";
    }

    if (control.name === "telefono" && validity.patternMismatch) {
        return "El celular debe tener 10 dígitos y comenzar por 3.";
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
        (validity.rangeUnderflow || validity.rangeOverflow || validity.badInput)
    ) {
        return "Elige una hora dentro del horario de atención.";
    }

    if (control.name === "hora" && validity.stepMismatch) {
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
