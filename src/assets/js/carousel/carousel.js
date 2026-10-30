import { clampValue, getWidthAtSlot, positiveModulo } from "./utils.js";

/** @typedef {'multi' | 'hero' | 'center' | 'uncontained' | 'full'} CarouselLayout */
/** @typedef {typeof CarouselState[keyof typeof CarouselState]} CarouselStateValue */
/** @typedef {{widths: number[], leadIndex: number, blend: boolean, slide: boolean, maxP: number, size: number, cross: number, gap: number, bigWidth: number, step: number, free: boolean}} CarouselConfig */
/** @typedef {{i: number, j: number, x: number, w: number}} ItemPlacement */
/** @typedef {{x: number[], w: number[]}} CarouselEndState */
/** @typedef {{id: number, startX: number, startPosition: number, hasMoved: boolean, history: [number, number][]}} CarouselDrag */
/** @typedef {{index: number, total: number, atStart: boolean, atEnd: boolean}} CarouselUpdate */
/** @typedef {HTMLElement & {_j?: number, _isHidden?: boolean}} CarouselItemElement */

export const CarouselState = {
    play: 'play',
    wait: 'wait',
    rewind: 'rewind',
}

export class Carousel {
    /**
     * Crea una instancia del carrusel.
     * @param {HTMLElement} rootElement - Elemento contenedor principal del carrusel.
     * @param {import('./carousel-item.js').CarouselItem[]} items - Lista de datos para rellenar el carrusel.
     */
    constructor(rootElement, items) {
        this.rootElement = rootElement;
        const viewportElement = rootElement.querySelector('.viewport');
        if (!(viewportElement instanceof HTMLElement)) {
            throw new Error('El carrusel necesita un elemento .viewport.');
        }
        this.viewportElement = viewportElement;
        this.items = items;
        /** @type {CarouselLayout} */
        this.layout = 'multi';
        this.loop = true;      // Desplazamiento infinito
        this.gap = 8;
        this.currentPosition = 0; // Posición continua (en unidades de item)
        this.velocity = 0;       // Velocidad actual para el efecto de resorte
        this.targetPosition = 0;
        this.isSpringActive = false;
        this.isAutoPlayActive = false;
        this.speed = 0.2;        // Items por segundo en auto-play
        /** @type {CarouselStateValue} */
        this.state = CarouselState.play;
        this.waitUntil = 0;
        this.holdUntil = 0;
        this.isHovered = false;
        this.isKeyboardFocused = false;
        /** @type {CarouselDrag | null} */
        this.dragData = null;
        this.prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
        /** @type {CarouselConfig} */
        this.config = {
            widths: [0], leadIndex: 0, blend: false, slide: false, maxP: 0,
            size: 0, cross: 0, gap: 0, bigWidth: 0, step: 1, free: false
        };
        /** @type {CarouselEndState | null} */
        this.endState = null;
        /** @type {CarouselItemElement[]} */
        this.itemElements = items.map(item => /** @type {CarouselItemElement} */ (item.element));
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

        new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;
            const width = Math.round(entry.contentRect.width);
            const height = Math.round(entry.contentRect.height);
            if (width === lastWidth && height === lastHeight) return;
            lastWidth = width;
            lastHeight = height;
            remeasure();
        }).observe(this.rootElement);
        addEventListener('resize', remeasure);
        this.measureLayout();
    }

    /**
     * Mide y recalcula las dimensiones y configuraciones responsivas del carrusel.
     * @returns {void}
     */
    measureLayout() {
        const layoutType = this.layout;
        const totalItems = this.items.length;
        const itemGap = this.gap;
        const isVertical = layoutType === 'full';

        this.isVertical = isVertical;
        this.viewportElement.classList.toggle('v', isVertical);
        this.viewportElement.classList.toggle('h', !isVertical);
        this.rootElement.classList.toggle('narrow', isVertical);

        const rootWidth = this.rootElement.clientWidth || 320;
        const parentFlexDirection = this.rootElement.parentElement
            ? getComputedStyle(this.rootElement.parentElement).flexDirection
            : 'column';
        const availableHeight = parentFlexDirection === 'row' ? this.rootElement.clientHeight : 0;
        const fallbackHeight = isVertical
            ? clampValue(innerHeight * 0.7, 320, 560)
            : layoutType === 'uncontained'
                ? clampValue(rootWidth * 0.3, 160, 220)
                : layoutType === 'multi'
                    ? clampValue(rootWidth * 0.28, 190, 280)
                    : clampValue(rootWidth * 0.45, 220, 380);
        const computedHeight = availableHeight || fallbackHeight;

        this.viewportElement.style.height = computedHeight + 'px';

        const primarySize = isVertical ? computedHeight : this.viewportElement.clientWidth;
        const crossSize = isVertical ? this.viewportElement.clientWidth : computedHeight;
        const smallItemSize = primarySize < 480 ? 40 : 56;

        /** @type {number[]} */
        let keyWidths = [];
        let leadIndex = 0;
        let enableBlend = false;
        let enableSlide = false;
        let maxAllowedPosition = totalItems - 1;
        let activeGap = itemGap;
        const isInfiniteLoop = this.loop;

        if (layoutType === 'hero') {
            keyWidths = [primarySize - smallItemSize - itemGap, smallItemSize];
            enableBlend = true;
        } else if (layoutType === 'center') {
            keyWidths = [smallItemSize, primarySize - 2 * smallItemSize - 2 * itemGap, smallItemSize];
            leadIndex = 1;
        } else if (layoutType === 'multi') {
            const visibleCount = primarySize < 600 ? 1 : primarySize < 1000 ? 2 : 3;
            const bigItemSize = (primarySize - smallItemSize - (visibleCount + 1) * itemGap) / (visibleCount + 0.5);
            keyWidths = [...Array(visibleCount).fill(bigItemSize), bigItemSize / 2, smallItemSize];
            enableBlend = true;
            maxAllowedPosition = Math.max(0, totalItems - visibleCount);
        } else if (layoutType === 'uncontained') {
            const computedWidth = Math.round(clampValue(primarySize * 0.4, 150, 240));
            keyWidths = [computedWidth];
            enableSlide = true;
            maxAllowedPosition = Math.max(0, (totalItems * (computedWidth + itemGap) - itemGap - primarySize) / (computedWidth + itemGap));
        } else {
            keyWidths = [primarySize];
            enableSlide = true;
            activeGap = 0;
        }

        const bigWidth = keyWidths[leadIndex] ?? 0;
        this.config = {
            widths: keyWidths,
            leadIndex,
            blend: enableBlend && !isInfiniteLoop,
            slide: enableSlide,
            maxP: isInfiniteLoop ? Infinity : maxAllowedPosition,
            size: primarySize,
            cross: crossSize,
            gap: activeGap,
            bigWidth,
            step: bigWidth + activeGap,
            free: layoutType === 'uncontained'
        };

        // Estado final para efectos de transición en multi-browse y hero
        this.endState = null;
        if (enableBlend && !isInfiniteLoop && maxAllowedPosition > 0) {
            const endX = new Array(totalItems).fill(0);
            const endWidths = new Array(totalItems).fill(0);
            let rightPosition = primarySize;

            for (let k = 0; k < keyWidths.length && totalItems - 1 - k >= 0; k++) {
                const itemIndex = totalItems - 1 - k;
                endWidths[itemIndex] = keyWidths[k];
                endX[itemIndex] = rightPosition - keyWidths[k];
                rightPosition -= keyWidths[k] + itemGap;
            }
            this.endState = { x: endX, w: endWidths };
        }

        this.itemElements.forEach(element => {
            element.style.width = element.style.height = '';
            element._isHidden = false;
            element.style.visibility = '';
            const innerContainer = element.firstElementChild;
            if (innerContainer instanceof HTMLElement) {
                innerContainer.style.width = innerContainer.style.height = '';
                innerContainer.style[isVertical ? 'height' : 'width'] = bigWidth + 'px';
            }
        });

        const scaledEmSize = Math.round(Math.min(bigWidth, crossSize) * 0.45) + 'px';
        this.rootElement.style.setProperty('--es', scaledEmSize);
        this.viewportElement.style.setProperty('--es', scaledEmSize);

        if (!isInfiniteLoop) {
            this.currentPosition = clampValue(this.currentPosition, 0, maxAllowedPosition);
            this.targetPosition = clampValue(this.targetPosition, 0, maxAllowedPosition);
        }
        this.render();
    }

    /**
     * Calcula las posiciones y tamaños actuales de cada ítem en función de una posición dada.
     * @param {number} position - Posición actual del carrusel.
    * @returns {ItemPlacement[]} Lista de objetos con datos de posicionamiento de los ítems.
     */
    calculateItemPlacements(position) {
        const { widths, leadIndex, blend, slide, maxP, size, gap, step } = this.config;
        const totalItems = this.items.length;
        /** @type {ItemPlacement[]} */
        const placementList = [];

        if (this.loop) {
            if (slide) {
                const startIndex = Math.floor(position) - 1;
                const endIndex = Math.ceil(position + size / step) + 1;
                for (let j = startIndex; j <= endIndex; j++) {
                    placementList.push({ i: positiveModulo(j, totalItems), j, x: (j - position) * step, w: widths[0] });
                }
            } else {
                let currentX = 0;
                const startIndex = Math.floor(position) - leadIndex - 1;
                for (let j = startIndex; j < startIndex + widths.length + leadIndex + 6; j++) {
                    const slot = j - position + leadIndex;
                    const calculatedWidth = getWidthAtSlot(slot, widths);
                    placementList.push({ i: positiveModulo(j, totalItems), j, x: currentX, w: calculatedWidth });
                    if (calculatedWidth > 0) currentX += calculatedWidth + gap * Math.min(1, calculatedWidth / 10);
                    if (currentX >= size && slot >= 0) break;
                }
            }
            return placementList;
        }

        const positionsX = new Array(totalItems).fill(0);
        const itemWidths = new Array(totalItems).fill(0);

        if (slide) {
            for (let i = 0; i < totalItems; i++) {
                positionsX[i] = (i - position) * step;
                itemWidths[i] = widths[0];
            }
        } else {
            for (let i = 0; i < totalItems; i++) {
                positionsX[i] = i < position ? 0 : size;
                itemWidths[i] = 0;
            }
            let currentX = 0;
            for (let j = Math.floor(position) - leadIndex - 1; j < totalItems + widths.length + 2; j++) {
                const slot = j - position + leadIndex;
                const calculatedWidth = getWidthAtSlot(slot, widths);
                if (j >= 0 && j < totalItems) {
                    positionsX[j] = currentX;
                    itemWidths[j] = calculatedWidth;
                }
                if (calculatedWidth > 0) currentX += calculatedWidth + gap * Math.min(1, calculatedWidth / 10);
                if (currentX >= size && slot >= 0) break;
            }

            if (blend && this.endState) {
                let t = clampValue(position - (maxP - 1), 0, 1);
                t = t * t * (3 - 2 * t);
                if (t > 0) {
                    const offset = position > maxP ? (maxP - position) * step : 0;
                    for (let i = 0; i < totalItems; i++) {
                        positionsX[i] += (this.endState.x[i] - positionsX[i]) * t + offset;
                        itemWidths[i] += (this.endState.w[i] - itemWidths[i]) * t;
                    }
                }
            }
        }

        for (let i = 0; i < totalItems; i++) {
            placementList.push({ i, j: i, x: positionsX[i], w: itemWidths[i] });
        }
        return placementList;
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
                element.style.visibility = '';
                element.removeAttribute('aria-hidden');
                element._isHidden = false;
            }

            element.style.transform = isVertical ? `translate3d(0,${x}px,0)` : `translate3d(${x}px,0,0)`;
            element.style[isVertical ? 'height' : 'width'] = w + 'px';
            element.style.setProperty('--cap', String(slide ? 1 : clampValue((w / bigWidth - 0.72) / 0.2, 0, 1)));
        }

        this.itemElements.forEach((element, index) => {
            if (!seenIndices.has(index) && !element._isHidden) {
                element.style.visibility = 'hidden';
                element.setAttribute('aria-hidden', 'true');
                element._isHidden = true;
            }
        });

        if (this.onUpdate) {
            this.onUpdate({
                index: positiveModulo(Math.round(this.currentPosition), totalItems),
                total: totalItems,
                atStart: !this.loop && this.currentPosition <= 0.001,
                atEnd: !this.loop && this.currentPosition >= maxP - 0.001
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
        this.targetPosition = this.loop ? resolvedTarget : clampValue(resolvedTarget, 0, maxP);
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
        this.goTo((this.isSpringActive ? this.targetPosition : Math.round(this.currentPosition)) + 1);
    }

    /**
     * Manda el carrusel al elemento anterior.
     * @returns {void}
     */
    prev() {
        this.goTo((this.isSpringActive ? this.targetPosition : Math.round(this.currentPosition)) - 1);
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
            this.currentPosition = positiveModulo(this.currentPosition, this.items.length);
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
        this.animationFrame = requestAnimationFrame(timestamp => this.animationTick(timestamp));
    }

    /**
     * Comprueba si el carrusel puede reproducirse automáticamente.
     * @param {number} currentTime - Tiempo actual medido.
     * @returns {boolean} Verdadero si puede avanzar automáticamente.
     */
    canAutoPlay(currentTime) {
        return this.isAutoPlayActive && !this.dragData && !this.isSpringActive &&
            currentTime > this.holdUntil && !this.isHovered &&
            !this.isKeyboardFocused && this.config.maxP > 0;
    }

    /**
     * Ciclo de actualización ejecutado en cada frame de animación.
     * @param {number} timestamp - Sello de tiempo actual.
    * @returns {void}
     */
    animationTick(timestamp) {
        this.animationFrame = 0;
        const deltaTime = Math.min((timestamp - this.lastFrameTime) / 1000, 0.034) || 0.016;
        this.lastFrameTime = timestamp;
        let isBusy = !!this.dragData;

        if (this.loop && !this.dragData) {
            const totalItems = this.items.length;
            if (this.currentPosition >= totalItems || this.currentPosition < -totalItems) {
                const offsetAdjustment = Math.floor(this.currentPosition / totalItems) * totalItems;
                this.currentPosition -= offsetAdjustment;
                this.targetPosition -= offsetAdjustment;
            }
        }

        if (!this.dragData && this.isSpringActive) {
            const springConstant = 150;
            const dampingConstant = this.prefersReducedMotion ? 25 : 19;
            this.velocity += (-springConstant * (this.currentPosition - this.targetPosition) - dampingConstant * this.velocity) * deltaTime;
            this.currentPosition += this.velocity * deltaTime;

            if (Math.abs(this.currentPosition - this.targetPosition) < 0.0008 && Math.abs(this.velocity) < 0.01) {
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

    /**
     * Vincula los eventos de interacción táctil, de mouse, rueda y teclado.
     * @returns {void}
     */
    bindEvents() {
        const viewport = this.viewportElement;
        const root = this.rootElement;
        /** @param {PointerEvent} event */
        const getCoordinates = event => this.isVertical ? event.clientY : event.clientX;

        viewport.addEventListener('pointerdown', event => {
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            this.dragData = {
                id: event.pointerId,
                startX: getCoordinates(event),
                startPosition: this.currentPosition,
                hasMoved: false,
                history: [[performance.now(), this.currentPosition]]
            };
            this.isSpringActive = false;
            this.velocity = 0;
        });

        viewport.addEventListener('pointermove', event => {
            const drag = this.dragData;
            if (!drag || event.pointerId !== drag.id) return;

            const deltaX = getCoordinates(event) - drag.startX;
            if (!drag.hasMoved) {
                if (Math.abs(deltaX) < 6) return;
                drag.hasMoved = true;
                try { viewport.setPointerCapture(event.pointerId); } catch (_) { }
                viewport.classList.add('dragging');
            }

            const { maxP, step } = this.config;
            let calculatedPosition = drag.startPosition - deltaX / step;

            if (!this.loop) {
                if (calculatedPosition < 0) calculatedPosition *= 0.35;
                if (calculatedPosition > maxP) calculatedPosition = maxP + (calculatedPosition - maxP) * 0.35;
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
            viewport.classList.remove('dragging');
            this.holdUntil = performance.now() + 2500;
            this.state = CarouselState.play;

            if (drag.hasMoved) {
                this.suppressClick = true;
                setTimeout(() => this.suppressClick = false, 0);

                const now = performance.now();
                const history = drag.history;
                const oldestEntry = history[0];
                let calculatedVelocity = isCanceled ? 0 : (this.currentPosition - oldestEntry[1]) / Math.max((now - oldestEntry[0]) / 1000, 0.016);
                calculatedVelocity = clampValue(calculatedVelocity, -8, 8);

                const { maxP, free } = this.config;
                const projection = this.currentPosition + calculatedVelocity * 0.2;
                const targetPoint = free ? projection : Math.round(projection);

                this.targetPosition = this.loop ? targetPoint : clampValue(targetPoint, 0, maxP);
                this.velocity = calculatedVelocity * 0.25;
                this.isSpringActive = true;
                this.triggerAnimationLoop();
            }
        };

        viewport.addEventListener('pointerup', event => handlePointerRelease(event, false));
        viewport.addEventListener('pointercancel', event => handlePointerRelease(event, true));

        viewport.addEventListener('click', event => {
            if (this.suppressClick) {
                event.stopPropagation();
                event.preventDefault();
                return;
            }
            if (!(event.target instanceof Element)) return;
            const itemElement = event.target.closest('.carousel-item');
            if (!(itemElement instanceof HTMLElement)) return;
            const carouselItem = /** @type {CarouselItemElement} */ (itemElement);

            const itemIndex = this.loop
                ? carouselItem._j ?? this.itemElements.indexOf(carouselItem)
                : this.itemElements.indexOf(carouselItem);
            if (itemIndex < 0) return;
            const elementWidth = parseFloat(this.isVertical ? carouselItem.style.height : carouselItem.style.width) || 0;

            if (!this.config.slide && elementWidth < this.config.bigWidth * 0.9) {
                this.goTo(itemIndex);
                return;
            }

            root.dispatchEvent(new CustomEvent('carousel-select', {
                detail: { index: itemIndex, item: this.items[itemIndex] }
            }));
        }, true);

        viewport.addEventListener('wheel', event => {
            const { maxP, step } = this.config;
            const delta = this.isVertical
                ? event.deltaY
                : (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : (event.shiftKey ? event.deltaY : 0));

            if (!delta) return;
            if (!this.loop && ((delta < 0 && this.currentPosition <= 0) || (delta > 0 && this.currentPosition >= maxP))) return;

            event.preventDefault();
            this.isSpringActive = false;
            this.velocity = 0;

            const newPosition = this.currentPosition + delta / step * (event.deltaMode === 1 ? 30 : 1);
            this.currentPosition = this.loop ? newPosition : clampValue(newPosition, 0, maxP);
            this.holdUntil = performance.now() + 2500;
            this.state = CarouselState.play;

            if (this.wheelTimeout !== null) window.clearTimeout(this.wheelTimeout);
            this.wheelTimeout = window.setTimeout(() => this.goTo(this.currentPosition), 140);
            this.triggerAnimationLoop();
        }, { passive: false });

        root.addEventListener('keydown', event => {
            const key = event.key;
            if (key === 'ArrowRight' || key === 'ArrowDown') this.next();
            else if (key === 'ArrowLeft' || key === 'ArrowUp') this.prev();
            else if (key === 'Home' && !this.loop) this.goTo(0);
            else if (key === 'End' && !this.loop) this.goTo(this.config.maxP);
            else return;
            event.preventDefault();
        });

        root.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse') this.isHovered = true;
        });
        root.addEventListener('pointerleave', () => {
            this.isHovered = false;
            this.holdUntil = performance.now() + 800;
        });
        root.addEventListener('focusin', () => {
            this.isKeyboardFocused = root.matches(':focus-visible');
        });
        root.addEventListener('focusout', () => {
            this.isKeyboardFocused = false;
        });
        viewport.addEventListener('dragstart', event => event.preventDefault());
    }
}