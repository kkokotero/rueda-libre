/**
 * Selector de cantidad de bicicletas.
 *
 * Los botones −/+ recalculan el valor acotándolo entre `min` y `max` y
 * disparan `input` para que el resto del formulario (precio, validación)
 * reaccione igual que si el usuario escribiera en el campo.
 */

export function initializeReservationQuantity(form) {
    const quantity = form.querySelector("[data-quantity]");

    if (!quantity) return;

    const input = quantity.querySelector("input");
    const decrease = quantity.querySelector("[data-quantity-decrease]");
    const increase = quantity.querySelector("[data-quantity-increase]");
    const label = quantity.querySelector("[data-quantity-label]");

    if (!input || !decrease || !increase || !label) return;

    const min = Number(input.min) || 1;
    const max = Number(input.max) || 6;

    const render = (count) => {
        const total = Math.min(max, Math.max(min, Math.round(count)));

        label.textContent = `${total} ${total === 1 ? "bicicleta" : "bicicletas"}`;
        decrease.disabled = total <= min;
        increase.disabled = total >= max;
    };

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
