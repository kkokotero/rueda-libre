import { CAROUSEL_ITEMS } from "./carousel/carousel-item.js";
import { Carousel } from "./carousel/carousel.js";

(() => {
    const rootElement = document.getElementById('carousel');
    if (!rootElement) return;

    const carousel = new Carousel(rootElement, CAROUSEL_ITEMS);
    carousel.setLayout('hero');
    carousel.setAutoPlay(true);
    carousel.speed = 0.1;
})()