/**
 * Conecta los controles del carrusel con mouse, teclado, rueda y pantalla táctil.
 */

import { CarouselState } from "./carousel-state.js";
import { clampValue } from "./utils.js";

/** @typedef {HTMLElement & {_j?: number}} CarouselItemElement */

/**
 * @this {import('./carousel.js').Carousel}
 */
export function bindCarouselEvents() {
    const viewport = this.viewportElement;
    const root = this.rootElement;
    /** @param {PointerEvent} event */
    const getCoordinates = (event) =>
        this.isVertical ? event.clientY : event.clientX;

    viewport.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        this.dragData = {
            id: event.pointerId,
            startX: getCoordinates(event),
            startPosition: this.currentPosition,
            hasMoved: false,
            history: [[performance.now(), this.currentPosition]],
        };
        this.isSpringActive = false;
        this.velocity = 0;
    });

    viewport.addEventListener("pointermove", (event) => {
        const drag = this.dragData;
        if (!drag || event.pointerId !== drag.id) return;

        const deltaX = getCoordinates(event) - drag.startX;
        if (!drag.hasMoved) {
            if (Math.abs(deltaX) < 6) return;
            drag.hasMoved = true;
            try {
                viewport.setPointerCapture(event.pointerId);
            } catch (_) {}
            viewport.classList.add("dragging");
        }

        const { maxP, step } = this.config;
        let calculatedPosition = drag.startPosition - deltaX / step;

        if (!this.loop) {
            if (calculatedPosition < 0) calculatedPosition *= 0.35;
            if (calculatedPosition > maxP)
                calculatedPosition = maxP + (calculatedPosition - maxP) * 0.35;
        }

        this.currentPosition = calculatedPosition;
        const now = performance.now();
        drag.history.push([now, calculatedPosition]);
        while (drag.history.length > 2 && now - drag.history[0][0] > 120) {
            drag.history.shift();
        }
        this.render();
    });

    /** @param {PointerEvent} event @param {boolean} isCanceled */
    const handlePointerRelease = (event, isCanceled) => {
        const drag = this.dragData;
        if (!drag || event.pointerId !== drag.id) return;

        this.dragData = null;
        viewport.classList.remove("dragging");
        this.holdUntil = performance.now() + 2500;
        this.state = CarouselState.play;

        if (drag.hasMoved) {
            this.suppressClick = true;
            setTimeout(() => (this.suppressClick = false), 0);

            const now = performance.now();
            const history = drag.history;
            const oldestEntry = history[0];
            let calculatedVelocity = isCanceled
                ? 0
                : (this.currentPosition - oldestEntry[1]) /
                  Math.max((now - oldestEntry[0]) / 1000, 0.016);
            calculatedVelocity = clampValue(calculatedVelocity, -8, 8);

            const { maxP, free } = this.config;
            const projection = this.currentPosition + calculatedVelocity * 0.2;
            const targetPoint = free ? projection : Math.round(projection);

            this.targetPosition = this.loop
                ? targetPoint
                : clampValue(targetPoint, 0, maxP);
            this.velocity = calculatedVelocity * 0.25;
            this.isSpringActive = true;
            this.triggerAnimationLoop();
        }
    };

    viewport.addEventListener("pointerup", (event) =>
        handlePointerRelease(event, false),
    );
    viewport.addEventListener("pointercancel", (event) =>
        handlePointerRelease(event, true),
    );

    viewport.addEventListener(
        "click",
        (event) => {
            if (this.suppressClick) {
                event.stopPropagation();
                event.preventDefault();
                return;
            }
            if (!(event.target instanceof Element)) return;
            const itemElement = event.target.closest(".carousel-item");
            if (!(itemElement instanceof HTMLElement)) return;
            const carouselItem = /** @type {CarouselItemElement} */ (
                itemElement
            );

            const itemIndex = this.loop
                ? (carouselItem._j ?? this.itemElements.indexOf(carouselItem))
                : this.itemElements.indexOf(carouselItem);
            if (itemIndex < 0) return;
            const elementWidth =
                parseFloat(
                    this.isVertical
                        ? carouselItem.style.height
                        : carouselItem.style.width,
                ) || 0;

            if (
                !this.config.slide &&
                elementWidth < this.config.bigWidth * 0.9
            ) {
                this.goTo(itemIndex);
                return;
            }

            root.dispatchEvent(
                new CustomEvent("carousel-select", {
                    detail: { index: itemIndex, item: this.items[itemIndex] },
                }),
            );
        },
        true,
    );

    viewport.addEventListener(
        "wheel",
        (event) => {
            const { maxP, step } = this.config;
            const delta = this.isVertical
                ? event.deltaY
                : Math.abs(event.deltaX) > Math.abs(event.deltaY)
                  ? event.deltaX
                  : event.shiftKey
                    ? event.deltaY
                    : 0;

            if (!delta) return;
            if (
                !this.loop &&
                ((delta < 0 && this.currentPosition <= 0) ||
                    (delta > 0 && this.currentPosition >= maxP))
            )
                return;

            event.preventDefault();
            this.isSpringActive = false;
            this.velocity = 0;

            const newPosition =
                this.currentPosition +
                (delta / step) * (event.deltaMode === 1 ? 30 : 1);
            this.currentPosition = this.loop
                ? newPosition
                : clampValue(newPosition, 0, maxP);
            this.holdUntil = performance.now() + 2500;
            this.state = CarouselState.play;

            if (this.wheelTimeout !== null)
                window.clearTimeout(this.wheelTimeout);
            this.wheelTimeout = window.setTimeout(
                () => this.goTo(this.currentPosition),
                140,
            );
            this.triggerAnimationLoop();
        },
        { passive: false },
    );

    root.addEventListener("keydown", (event) => {
        const key = event.key;
        if (key === "ArrowRight" || key === "ArrowDown") this.next();
        else if (key === "ArrowLeft" || key === "ArrowUp") this.prev();
        else if (key === "Home" && !this.loop) this.goTo(0);
        else if (key === "End" && !this.loop) this.goTo(this.config.maxP);
        else return;
        event.preventDefault();
    });

    root.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse") this.isHovered = true;
    });
    root.addEventListener("pointerleave", () => {
        this.isHovered = false;
        this.holdUntil = performance.now() + 800;
    });
    root.addEventListener("focusin", () => {
        this.isKeyboardFocused = root.matches(":focus-visible");
    });
    root.addEventListener("focusout", () => {
        this.isKeyboardFocused = false;
    });
    viewport.addEventListener("dragstart", (event) => event.preventDefault());
}
