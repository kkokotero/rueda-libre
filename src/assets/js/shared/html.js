import { html as htmlBox } from "html-box/html";

/**
 * Crea un fragmento HTML con `html-box`.
 *
 * Los valores interpolados se insertan como texto o nodos, no como HTML sin
 * validar. Usa `element` cuando la plantilla tenga exactamente un elemento raíz.
 */
export const html = htmlBox.fragment;

/** Crea un elemento a partir de una plantilla con una sola raíz. */
export const element = htmlBox;
