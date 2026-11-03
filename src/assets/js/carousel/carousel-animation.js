/**
 * Avanza la animación, el movimiento con resorte y el autoplay del carrusel.
 */

import { CarouselState } from "./carousel-state.js";

/**
 * @this {import('./carousel.js').Carousel}
 * @param {number} currentTime - Tiempo actual medido.
 * @returns {boolean} Si el carrusel puede avanzar automáticamente.
 */
export function canCarouselAutoPlay(currentTime) {
    return (
        this.isAutoPlayActive &&
        !this.dragData &&
        !this.isSpringActive &&
        currentTime > this.holdUntil &&
        !this.isHovered &&
        !this.isKeyboardFocused &&
        this.config.maxP > 0
    );
}

/**
 * @this {import('./carousel.js').Carousel}
 * @param {number} timestamp - Sello de tiempo actual.
 * @returns {void}
 */
export function tickCarouselAnimation(timestamp) {
    this.animationFrame = 0;
    const deltaTime =
        Math.min((timestamp - this.lastFrameTime) / 1000, 0.034) || 0.016;
    this.lastFrameTime = timestamp;
    let isBusy = !!this.dragData;

    if (this.loop && !this.dragData) {
        const totalItems = this.items.length;
        if (
            this.currentPosition >= totalItems ||
            this.currentPosition < -totalItems
        ) {
            const offsetAdjustment =
                Math.floor(this.currentPosition / totalItems) * totalItems;
            this.currentPosition -= offsetAdjustment;
            this.targetPosition -= offsetAdjustment;
        }
    }

    if (!this.dragData && this.isSpringActive) {
        const springConstant = 150;
        const dampingConstant = this.prefersReducedMotion ? 25 : 19;
        this.velocity +=
            (-springConstant * (this.currentPosition - this.targetPosition) -
                dampingConstant * this.velocity) *
            deltaTime;
        this.currentPosition += this.velocity * deltaTime;

        if (
            Math.abs(this.currentPosition - this.targetPosition) < 0.0008 &&
            Math.abs(this.velocity) < 0.01
        ) {
            this.currentPosition = this.targetPosition;
            this.velocity = 0;
            this.isSpringActive = false;
        }
        isBusy = true;
    } else if (!this.dragData && this.canAutoPlay(timestamp)) {
        const maxPosition = this.config.maxP;
        if (this.state === CarouselState.wait) {
            if (timestamp >= this.waitUntil) {
                this.state = CarouselState.rewind;
                this.goTo(0, true);
            }
        } else if (this.state === CarouselState.rewind) {
            this.state = CarouselState.play;
        } else {
            this.currentPosition += this.speed * deltaTime;
            if (!this.loop && this.currentPosition >= maxPosition) {
                this.currentPosition = maxPosition;
                this.state = CarouselState.wait;
                this.waitUntil = timestamp + 1500;
            }
        }
        isBusy = true;
    }

    this.render();
    if (isBusy || this.isAutoPlayActive) {
        this.triggerAnimationLoop();
    }
}
