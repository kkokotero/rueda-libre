import img1 from "../../img/carrusel/img-1.jpg";
import img2 from "../../img/carrusel/img-2.png";
import img3 from "../../img/carrusel/img-3.png";
import img4 from "../../img/carrusel/img-4.png";
import img5 from "../../img/carrusel/img-5.png";

import { element } from "../shared/html.js";

export class CarouselItem {
  /**
   * Crea una instancia de un elemento del carrusel.
   * @param {string} src - URL de la imagen del elemento del carrusel.
   * @param {string} alt - Texto alternativo para la imagen.
   */
  constructor(src, alt) {
    this.src = src;
    this.alt = alt;
  }

  /**
   * Devuelve el elemento HTML que representa el ítem del carrusel.
   * @returns {HTMLElement} Elemento HTML del ítem del carrusel.
   */
  get element() {
    return element`<article class="carousel-item" aria-label="${this.alt}" role="group" aria-roledescription="Imagen del carrusel">
      <div class="inner">
        <img src="${this.src}" alt="${this.alt}" draggable="false" />
      </div>
    </article>`;
  }
}

export const CAROUSEL_ITEMS = [
  new CarouselItem(img1, "Imagen 1"),
  new CarouselItem(img2, "Imagen 2"),
  new CarouselItem(img3, "Imagen 3"),
  new CarouselItem(img4, "Imagen 4"),
  new CarouselItem(img5, "Imagen 5"),
];