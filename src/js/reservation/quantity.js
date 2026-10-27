/**
 * Selector de cantidad de bicicletas.
 *
 * Los botones −/+ recalculan el valor acotándolo entre `min` y `max` y
 * disparan `input` para que el resto del formulario (precio, validación)
 * reaccione igual que si el usuario escribiera en el campo.
 */

/**
 * Adds bounded increment/decrement controls to the reservation quantity field.
 * @param {HTMLFormElement} form
 * @returns {void}
 */
export function initializeReservationQuantity(form) {
    const quantity = form.querySelector("[data-quantity]");

    if (!quantity) return;

    const input = quantity.querySelector("input");
    const decrease = quantity.querySelector("[data-quantity-decrease]");
    const increase = quantity.querySelector("[data-quantity-increase]");
    const label = quantity.querySelector("[data-quantity-label]");

    if (
        !(input instanceof HTMLInputElement) ||
        !(decrease instanceof HTMLButtonElement) ||
        !(increase instanceof HTMLButtonElement) ||
        !(label instanceof HTMLElement)
    ) {
        return;
    }

    const min = Number(input.min) || 1;
    const max = Number(input.max) || 6;

    /** @param {number} count */
    const render = (count) => {
        const total = Math.min(max, Math.max(min, Math.round(count)));

        label.textContent = `${total} ${total === 1 ? "bicicleta" : "bicicletas"}`;
        decrease.disabled = total <= min;
        increase.disabled = total >= max;
    };

    /** @param {string | number} value @param {boolean} [dispatch] */
    const setCount = (value, dispatch = false) => {
        const count = Math.min(
            max,
            Math.max(min, Math.round(Number(value) || min)),
        );

        input.value = String(count);
        render(count);

        if (dispatch) {
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }
    };

    decrease.addEventListener("click", () => {
        setCount(Number(input.value) - 1, true);
    });

    increase.addEventListener("click", () => {
        setCount(Number(input.value) + 1, true);
    });

    input.addEventListener("focus", () => {
        input.select();
    });

    input.addEventListener("input", () => {
        const value = Number(input.value);

        if (Number.isFinite(value) && value >= min && value <= max) {
            render(value);
        }
    });

    input.addEventListener("change", () => {
        setCount(input.value, true);
    });

    input.addEventListener("blur", () => {
        setCount(input.value);
    });

    setCount(input.value);
}
