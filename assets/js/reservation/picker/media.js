/**
 * Punto de corte móvil de los pickers.
 *
 * Debe coincidir con el breakpoint de `pickers.css` (`@media (width <= 720px)`)
 * para que el panel pase de popover a hoja modal en el mismo instante en que
 * cambia el layout.
 */

export const MOBILE_PICKER_QUERY = "(width <= 720px)";

const mobilePickerMedia = window.matchMedia(MOBILE_PICKER_QUERY);

/** `true` cuando el picker debe comportarse como hoja modal a pantalla completa. */
export const isMobilePicker = () => mobilePickerMedia.matches;

/**
 * Ejecuta `handler` al cruzar el punto de corte móvil.
 *
 * @param {(event: MediaQueryListEvent) => void} handler
 * @param {AddEventListenerOptions} [options] para configurar o dar de baja el listener
 */
export const onMobilePickerChange = (handler, options) =>
    mobilePickerMedia.addEventListener("change", handler, options);
