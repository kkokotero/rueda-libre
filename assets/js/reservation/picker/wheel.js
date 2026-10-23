/**
 * Ruedas horarias (hora y minutos) del picker de tiempo.
 *
 * Cada rueda es una lista desplazable con `role="listbox"`. Además del clic y
 * del teclado, admite arrastre con el ratón: el movimiento se traduce en
 * scroll y, al soltar, se suprime el clic que el navegador emitiría sobre la
 * opción donde quedó el puntero.
 *
 * El estado de arrastre y de supresión vive en la instancia que devuelve
 * `createWheelRenderer`, de modo que dos ruedas nunca comparten drag.
 */

export function createWheelRenderer() {
    const wheelScrollTimers = new WeakMap();
    const userScrollingWheels = new WeakSet();
    const suppressWheelClick = new WeakSet();

    // Los listeners de documento se registran una sola vez y quedan ligados a
    // esta instancia para poder retirarlos con `destroy`.
    const listeners = new AbortController();
    const signal = { signal: listeners.signal };
    let activeWheelDrag = null;

    document.addEventListener(
        "pointermove",
        (event) => {
            if (
                !activeWheelDrag ||
                event.pointerId !== activeWheelDrag.pointerId ||
                event.buttons === 0
            ) {
                return;
            }

            const distance = event.clientY - activeWheelDrag.startY;

            if (Math.abs(distance) > 3) {
                activeWheelDrag.moved = true;
                userScrollingWheels.add(activeWheelDrag.wheel);
                event.preventDefault();
            }

            if (activeWheelDrag.moved) {
                activeWheelDrag.wheel.scrollTop =
                    activeWheelDrag.startScrollTop - distance;
            }
        },
        { ...signal, passive: false },
    );

    document.addEventListener(
        "pointerup",
        (event) => {
            if (activeWheelDrag?.pointerId !== event.pointerId) return;

            if (activeWheelDrag.moved) {
                const draggedWheel = activeWheelDrag.wheel;

                suppressWheelClick.add(draggedWheel);
                setTimeout(
                    () => suppressWheelClick.delete(draggedWheel),
                    0,
                );
            }

            activeWheelDrag = null;
        },
        signal,
    );

    document.addEventListener(
        "pointercancel",
        (event) => {
            if (activeWheelDrag?.pointerId === event.pointerId) {
                activeWheelDrag = null;
            }
        },
        signal,
    );

    /**
     * Anula el clic que sigue a un arrastre, para no seleccionar la opción
     * sobre la que terminó el puntero.
     *
     * Debe instalarse una sola vez por rueda, al crearla.
     */
    const guardClicks = (wheel) => {
        wheel.addEventListener(
            "click",
            (event) => {
                if (!suppressWheelClick.has(wheel)) return;

                suppressWheelClick.delete(wheel);
                event.preventDefault();
                event.stopImmediatePropagation();
            },
            true,
        );
    };

    const renderWheel = (wheel, values, selected, onSelect) => {
        clearTimeout(wheelScrollTimers.get(wheel));
        wheel.replaceChildren();

        for (const item of values) {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "reservas-timepicker__wheel-option";
            option.setAttribute("role", "option");
            option.dataset.value = item.value;
            option.textContent = item.label;
            option.setAttribute(
                "aria-selected",
                String(item.value === selected),
            );

            option.addEventListener("click", () => {
                onSelect(item.value);
                option.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                });
            });

            option.addEventListener("keydown", (event) => {
                if (
                    event.key !== "ArrowUp" &&
                    event.key !== "ArrowDown" &&
                    event.key !== "Home" &&
                    event.key !== "End"
                ) {
                    return;
                }

                event.preventDefault();

                const options = [
                    ...wheel.querySelectorAll("[role='option']"),
                ];
                const currentIndex = options.indexOf(event.currentTarget);
                const nextIndex =
                    event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? options.length - 1
                          : Math.max(
                                0,
                                Math.min(
                                    options.length - 1,
                                    currentIndex +
                                        (event.key === "ArrowDown" ? 1 : -1),
                                ),
                            );

                options[nextIndex]?.focus();
                options[nextIndex]?.scrollIntoView({ block: "center" });

                if (options[nextIndex]) {
                    onSelect(options[nextIndex].dataset.value);
                }
            });

            wheel.append(option);
        }

        wheel.onscroll = () => {
            if (!userScrollingWheels.has(wheel)) return;

            clearTimeout(wheelScrollTimers.get(wheel));
            wheelScrollTimers.set(
                wheel,
                setTimeout(() => {
                    const center = wheel.scrollTop + wheel.clientHeight / 2;
                    const options = [
                        ...wheel.querySelectorAll("[role='option']"),
                    ];
                    const nearest = options.reduce((best, option) =>
                        Math.abs(
                            option.offsetTop +
                                option.offsetHeight / 2 -
                                center,
                        ) <
                        Math.abs(
                            best.offsetTop +
                                best.offsetHeight / 2 -
                                center,
                        )
                            ? option
                            : best,
                    );

                    if (
                        nearest.dataset.value !==
                        wheel.querySelector("[aria-selected='true']")
                            ?.dataset.value
                    ) {
                        onSelect(nearest.dataset.value);
                    }

                    userScrollingWheels.delete(wheel);
                }, 100),
            );
        };

        wheel.onwheel = () => userScrollingWheels.add(wheel);
        wheel.ontouchmove = () => userScrollingWheels.add(wheel);
        wheel.onpointerdown = (event) => {
            if (event.pointerType !== "mouse") return;

            activeWheelDrag = {
                wheel,
                pointerId: event.pointerId,
                startY: event.clientY,
                startScrollTop: wheel.scrollTop,
                moved: false,
            };
        };
    };

    return {
        guardClicks,
        renderWheel,
        /** Retira los listeners de documento asociados a esta instancia. */
        destroy: () => listeners.abort(),
    };
}
