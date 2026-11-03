import {
    measureCarouselLayout,
    calculateCarouselItemPlacements,
} from "./carousel-layout.js";
import {
    canCarouselAutoPlay,
    tickCarouselAnimation,
} from "./carousel-animation.js";
import { bindCarouselEvents } from "./carousel-events.js";
import { CarouselState } from "./carousel-state.js";
import { clampValue, positiveModulo } from "./utils.js";

/** @typedef {'multi' | 'hero' | 'center' | 'uncontained' | 'full'} CarouselLayout */
/** @typedef {typeof CarouselState[keyof typeof CarouselState]} CarouselStateValue */
/** @typedef {{widths: number[], leadIndex: number, blend: boolean, slide: boolean, maxP: number, size: number, cross: number, gap: number, bigWidth: number, step: number, free: boolean}} CarouselConfig */
/** @typedef {{i: number, j: number, x: number, w: number}} ItemPlacement */
/** @typedef {{x: number[], w: number[]}} CarouselEndState */
/** @typedef {{id: number, startX: number, startPosition: number, hasMoved: boolean, history: [number, number][]}} CarouselDrag */
/** @typedef {{index: number, total: number, atStart: boolean, atEnd: boolean}} CarouselUpdate */
/** @typedef {HTMLElement & {_j?: number, _isHidden?: boolean}} CarouselItemElement */

export { CarouselState };

export class Carousel {
    /**
     * Crea una instancia del carrusel.
     * @param {HTMLElement} rootElement - Elemento contenedor principal del carrusel.
     * @param {import('./carousel-item.js').CarouselItem[]} items - Lista de datos para rellenar el carrusel.
     */
    constructor(rootElement, items) {
        this.rootElement = rootElement;
        const viewportElement = rootElement.querySelector(".viewport");
        if (!(viewportElement instanceof HTMLElement)) {
            throw new Error("El carrusel necesita un elemento .viewport.");
        }
        this.viewportElement = viewportElement;
        this.items = items;
        /** @type {CarouselLayout} */
        this.layout = "multi";
        this.loop = true; // Desplazamiento infinito
        this.gap = 8;
        this.currentPosition = 0; // Posición continua (en unidades de item)
        this.velocity = 0; // Velocidad actual para el efecto de resorte
        this.targetPosition = 0;
        this.isSpringActive = false;
        this.isAutoPlayActive = false;
        this.speed = 0.2; // Items por segundo en auto-play
        /** @type {CarouselStateValue} */
        this.state = CarouselState.play;
        this.waitUntil = 0;
        this.holdUntil = 0;
        this.isHovered = false;
        this.isKeyboardFocused = false;
        /** @type {CarouselDrag | null} */
        this.dragData = null;
        this.prefersReducedMotion = matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;
        /** @type {CarouselConfig} */
        this.config = {
            widths: [0],
            leadIndex: 0,
            blend: false,
            slide: false,
            maxP: 0,
            size: 0,
            cross: 0,
            gap: 0,
            bigWidth: 0,
            step: 1,
            free: false,
        };
        /** @type {CarouselEndState | null} */
        this.endState = null;
        /** @type {CarouselItemElement[]} */
        this.itemElements = items.map(
            (item) => /** @type {CarouselItemElement} */ (item.element),
        );
        /** @type {((update: CarouselUpdate) => void) | null} */
        this.onUpdate = null;
        this.isVertical = false;
        this.animationFrame = 0;
        this.lastFrameTime = 0;
        /** @type {number | null} */
        this.wheelTimeout = null;
        this.suppressClick = false;

        // Construcción de elementos DOM para cada ítem
        this.viewportElement.append(...this.itemElements);
        this.bindEvents();

        let lastWidth = 0;
        let lastHeight = 0;
        let animationFrame = 0;
        const remeasure = () => {
            cancelAnimationFrame(animationFrame);
            animationFrame = requestAnimationFrame(() => this.measureLayout());
        };

        new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) return;
            const width = Math.round(entry.contentRect.width);
            const height = Math.round(entry.contentRect.height);
            if (width === lastWidth && height === lastHeight) return;
            lastWidth = width;
            lastHeight = height;
            remeasure();
        }).observe(this.rootElement);
        addEventListener("resize", remeasure);
        this.measureLayout();
    }

    /**
     * Mide y recalcula las dimensiones y configuraciones responsivas del carrusel.
     * @returns {void}
     */
    measureLayout() {
        measureCarouselLayout.call(this);
    }

    /**
     * Calcula las posiciones y tamaños actuales de cada ítem en función de una posición dada.
     * @param {number} position - Posición actual del carrusel.
     * @returns {ItemPlacement[]} Lista de objetos con datos de posicionamiento de los ítems.
     */
    calculateItemPlacements(position) {
        return calculateCarouselItemPlacements.call(this, position);
    }

    /**
     * Renderiza el estado actual del carrusel aplicando transformaciones visuales al DOM.
     * @returns {void}
     */
    render() {
        const placements = this.calculateItemPlacements(this.currentPosition);
        const { size, bigWidth, slide, maxP } = this.config;
        const isVertical = this.isVertical;
        const totalItems = this.items.length;
        const seenIndices = new Set();

        for (const { i, j, x, w } of placements) {
            if (seenIndices.has(i) || w < 1 || x > size || x + w < 0) continue;
            seenIndices.add(i);

            const element = this.itemElements[i];
            element._j = j;

            if (element._isHidden) {
                element.style.visibility = "";
                element.removeAttribute("aria-hidden");
                element._isHidden = false;
            }

            element.style.transform = isVertical
                ? `translate3d(0,${x}px,0)`
                : `translate3d(${x}px,0,0)`;
            element.style[isVertical ? "height" : "width"] = `${w}px`;
            element.style.setProperty(
                "--cap",
                String(
                    slide ? 1 : clampValue((w / bigWidth - 0.72) / 0.2, 0, 1),
                ),
            );
        }

        this.itemElements.forEach((element, index) => {
            if (!seenIndices.has(index) && !element._isHidden) {
                element.style.visibility = "hidden";
                element.setAttribute("aria-hidden", "true");
                element._isHidden = true;
            }
        });

        if (this.onUpdate) {
            this.onUpdate({
                index: positiveModulo(
                    Math.round(this.currentPosition),
                    totalItems,
                ),
                total: totalItems,
                atStart: !this.loop && this.currentPosition <= 0.001,
                atEnd: !this.loop && this.currentPosition >= maxP - 0.001,
            });
        }
    }

    /**
     * Mueve el carrusel hacia un índice o posición específica.
     * @param {number} targetIndex - Índice de destino.
     * @param {boolean} [fromAutoPlay=false] - Indica si la acción proviene del modo automático.
     * @returns {void}
     */
    goTo(targetIndex, fromAutoPlay) {
        const { maxP, free } = this.config;
        const resolvedTarget = free ? targetIndex : Math.round(targetIndex);
        this.targetPosition = this.loop
            ? resolvedTarget
            : clampValue(resolvedTarget, 0, maxP);
        this.isSpringActive = true;

        if (!fromAutoPlay) {
            this.state = CarouselState.play;
            this.holdUntil = performance.now() + 2500;
        }
        this.triggerAnimationLoop();
    }

    /**
     * Manda el carrusel al siguiente elemento.
     * @returns {void}
     */
    next() {
        this.goTo(
            (this.isSpringActive
                ? this.targetPosition
                : Math.round(this.currentPosition)) + 1,
        );
    }

    /**
     * Manda el carrusel al elemento anterior.
     * @returns {void}
     */
    prev() {
        this.goTo(
            (this.isSpringActive
                ? this.targetPosition
                : Math.round(this.currentPosition)) - 1,
        );
    }

    /**
     * Cambia el diseño visual del carrusel.
     * @param {CarouselLayout} [newLayout=this.layout] - Nombre del nuevo layout.
     * @returns {void}
     */
    setLayout(newLayout = this.layout) {
        this.layout = newLayout;
        this.isSpringActive = false;
        this.velocity = 0;
        this.measureLayout();
        this.goTo(Math.round(this.currentPosition));
    }

    /**
     * Activa o desactiva el bucle infinito.
     * @param {boolean} isEnabled - Estado del bucle.
     * @returns {void}
     */
    setLoop(isEnabled) {
        this.loop = isEnabled;
        this.isSpringActive = false;
        this.velocity = 0;
        if (!isEnabled) {
            this.currentPosition = positiveModulo(
                this.currentPosition,
                this.items.length,
            );
            this.targetPosition = this.currentPosition;
        }
        this.measureLayout();
        this.goTo(this.currentPosition);
    }

    /**
     * Activa o desactiva el desplazamiento automático.
     * @param {boolean} isEnabled - Estado del auto-play.
     * @returns {void}
     */
    setAutoPlay(isEnabled) {
        this.isAutoPlayActive = isEnabled;
        this.state = CarouselState.play;
        this.holdUntil = performance.now() + 600;
        this.triggerAnimationLoop();
    }

    /**
     * Inicia el bucle de animación por requestAnimationFrame si no está activo.
     * @returns {void}
     */
    triggerAnimationLoop() {
        if (this.animationFrame) return;
        this.lastFrameTime = performance.now();
        this.animationFrame = requestAnimationFrame((timestamp) =>
            this.animationTick(timestamp),
        );
    }

    /**
     * Comprueba si el carrusel puede reproducirse automáticamente.
     * @param {number} currentTime - Tiempo actual medido.
     * @returns {boolean} Verdadero si puede avanzar automáticamente.
     */
    canAutoPlay(currentTime) {
        return canCarouselAutoPlay.call(this, currentTime);
    }

    /**
     * Ciclo de actualización ejecutado en cada frame de animación.
     * @param {number} timestamp - Sello de tiempo actual.
     * @returns {void}
     */
    animationTick(timestamp) {
        tickCarouselAnimation.call(this, timestamp);
    }

    /**
     * Vincula los eventos de interacción táctil, de mouse, rueda y teclado.
     * @returns {void}
     */
    bindEvents() {
        bindCarouselEvents.call(this);
    }
}
