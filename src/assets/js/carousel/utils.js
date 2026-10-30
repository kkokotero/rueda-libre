/**
 * Limita un valor numérico entre un rango mínimo y máximo.
 * @param {number} value - Valor a limitar.
 * @param {number} min - Límite inferior.
 * @param {number} max - Límite superior.
 * @returns {number} Valor acotado.
 */
export const clampValue = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Realiza la operación módulo matemática (incluso para números negativos).
 * @param {number} n - Dividendo.
 * @param {number} m - Divisor.
 * @returns {number} Resultado del módulo.
 */
export const positiveModulo = (n, m) => ((n % m) + m) % m;

/**
 * Calcula el ancho de un elemento según su slot (posición relativa continua).
 * Interpola entre los anchos clave proporcionados.
 * 
 * @param {number} slotPosition - Posición relativa continua del elemento.
 * @param {number[]} widths - Lista de anchos clave.
 * @returns {number} Ancho calculado para el elemento.
 */
export function getWidthAtSlot(slotPosition, widths) {
  const totalWidths = widths.length;
  if (slotPosition <= -1) return 0;
  if (slotPosition < 0) return widths[0] * (slotPosition + 1);
  if (slotPosition >= totalWidths) return 0;
  if (slotPosition >= totalWidths - 1) return widths[totalWidths - 1] * (totalWidths - slotPosition);

  const lowerIndex = Math.floor(slotPosition);
  const fraction = slotPosition - lowerIndex;
  return widths[lowerIndex] + (widths[lowerIndex + 1] - widths[lowerIndex]) * fraction;
}