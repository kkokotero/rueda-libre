import { clampValue, getWidthAtSlot, positiveModulo } from "./utils.js";

/** @typedef {{i: number, j: number, x: number, w: number}} ItemPlacement */

/**
 * @this {import('./carousel.js').Carousel}
 */
export function measureCarouselLayout() {
    const layoutType = this.layout;
    const totalItems = this.items.length;
    const itemGap = this.gap;
    const isVertical = layoutType === "full";

    this.isVertical = isVertical;
    this.viewportElement.classList.toggle("v", isVertical);
    this.viewportElement.classList.toggle("h", !isVertical);
    this.rootElement.classList.toggle("narrow", isVertical);

    const rootWidth = this.rootElement.clientWidth || 320;
    const parentFlexDirection = this.rootElement.parentElement
        ? getComputedStyle(this.rootElement.parentElement).flexDirection
        : "column";
    const availableHeight =
        parentFlexDirection === "row" ? this.rootElement.clientHeight : 0;
    const fallbackHeight = isVertical
        ? clampValue(innerHeight * 0.7, 320, 560)
        : layoutType === "uncontained"
          ? clampValue(rootWidth * 0.3, 160, 220)
          : layoutType === "multi"
            ? clampValue(rootWidth * 0.28, 190, 280)
            : clampValue(rootWidth * 0.45, 220, 380);
    const computedHeight = availableHeight || fallbackHeight;

    this.viewportElement.style.height = `${computedHeight}px`;

    const primarySize = isVertical
        ? computedHeight
        : this.viewportElement.clientWidth;
    const crossSize = isVertical
        ? this.viewportElement.clientWidth
        : computedHeight;
    const smallItemSize = primarySize < 480 ? 40 : 56;

    /** @type {number[]} */
    let keyWidths = [];
    let leadIndex = 0;
    let enableBlend = false;
    let enableSlide = false;
    let maxAllowedPosition = totalItems - 1;
    let activeGap = itemGap;
    const isInfiniteLoop = this.loop;

    if (layoutType === "hero") {
        keyWidths = [primarySize - smallItemSize - itemGap, smallItemSize];
        enableBlend = true;
    } else if (layoutType === "center") {
        keyWidths = [
            smallItemSize,
            primarySize - 2 * smallItemSize - 2 * itemGap,
            smallItemSize,
        ];
        leadIndex = 1;
    } else if (layoutType === "multi") {
        const visibleCount = primarySize < 600 ? 1 : primarySize < 1000 ? 2 : 3;
        const bigItemSize =
            (primarySize - smallItemSize - (visibleCount + 1) * itemGap) /
            (visibleCount + 0.5);
        keyWidths = [
            ...Array(visibleCount).fill(bigItemSize),
            bigItemSize / 2,
            smallItemSize,
        ];
        enableBlend = true;
        maxAllowedPosition = Math.max(0, totalItems - visibleCount);
    } else if (layoutType === "uncontained") {
        const computedWidth = Math.round(
            clampValue(primarySize * 0.4, 150, 240),
        );
        keyWidths = [computedWidth];
        enableSlide = true;
        maxAllowedPosition = Math.max(
            0,
            (totalItems * (computedWidth + itemGap) - itemGap - primarySize) /
                (computedWidth + itemGap),
        );
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
        free: layoutType === "uncontained",
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

    this.itemElements.forEach((element) => {
        element.style.width = element.style.height = "";
        element._isHidden = false;
        element.style.visibility = "";
        const innerContainer = element.firstElementChild;
        if (innerContainer instanceof HTMLElement) {
            innerContainer.style.width = innerContainer.style.height = "";
            innerContainer.style[isVertical ? "height" : "width"] =
                `${bigWidth}px`;
        }
    });

    const scaledEmSize = `${Math.round(Math.min(bigWidth, crossSize) * 0.45)}px`;
    this.rootElement.style.setProperty("--es", scaledEmSize);
    this.viewportElement.style.setProperty("--es", scaledEmSize);

    if (!isInfiniteLoop) {
        this.currentPosition = clampValue(
            this.currentPosition,
            0,
            maxAllowedPosition,
        );
        this.targetPosition = clampValue(
            this.targetPosition,
            0,
            maxAllowedPosition,
        );
    }
    this.render();
}

/**
 * @this {import('./carousel.js').Carousel}
 * @param {number} position - Posición actual del carrusel.
 * @returns {ItemPlacement[]} Posiciones y tamaños de los ítems.
 */
export function calculateCarouselItemPlacements(position) {
    const { widths, leadIndex, blend, slide, maxP, size, gap, step } =
        this.config;
    const totalItems = this.items.length;
    /** @type {ItemPlacement[]} */
    const placementList = [];

    if (this.loop) {
        if (slide) {
            const startIndex = Math.floor(position) - 1;
            const endIndex = Math.ceil(position + size / step) + 1;
            for (let j = startIndex; j <= endIndex; j++) {
                placementList.push({
                    i: positiveModulo(j, totalItems),
                    j,
                    x: (j - position) * step,
                    w: widths[0],
                });
            }
        } else {
            let currentX = 0;
            const startIndex = Math.floor(position) - leadIndex - 1;
            for (
                let j = startIndex;
                j < startIndex + widths.length + leadIndex + 6;
                j++
            ) {
                const slot = j - position + leadIndex;
                const calculatedWidth = getWidthAtSlot(slot, widths);
                placementList.push({
                    i: positiveModulo(j, totalItems),
                    j,
                    x: currentX,
                    w: calculatedWidth,
                });
                if (calculatedWidth > 0)
                    currentX +=
                        calculatedWidth +
                        gap * Math.min(1, calculatedWidth / 10);
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
        for (
            let j = Math.floor(position) - leadIndex - 1;
            j < totalItems + widths.length + 2;
            j++
        ) {
            const slot = j - position + leadIndex;
            const calculatedWidth = getWidthAtSlot(slot, widths);
            if (j >= 0 && j < totalItems) {
                positionsX[j] = currentX;
                itemWidths[j] = calculatedWidth;
            }
            if (calculatedWidth > 0)
                currentX +=
                    calculatedWidth + gap * Math.min(1, calculatedWidth / 10);
            if (currentX >= size && slot >= 0) break;
        }

        if (blend && this.endState) {
            let t = clampValue(position - (maxP - 1), 0, 1);
            t = t * t * (3 - 2 * t);
            if (t > 0) {
                const offset = position > maxP ? (maxP - position) * step : 0;
                for (let i = 0; i < totalItems; i++) {
                    positionsX[i] +=
                        (this.endState.x[i] - positionsX[i]) * t + offset;
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
