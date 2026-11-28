/**
 * Importi: sempre centesimi interi. La conversione in euro avviene solo qui.
 * Modulo puro: nessun accesso a DOM, storage o orologio.
 */

/** Limite di sicurezza per un singolo importo: 10.000.000,00 €. */
export const MAX_AMOUNT_CENTS = 1_000_000_000;

/** 1234567 → "1.234.567" */
export const groupThousands = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** Formato euro coerente ovunque: 1.234,56 € · −45,00 € (segno meno tipografico). */
export function formatValuta(cents) {
  const c = Math.round(cents || 0);
  const abs = Math.abs(c);
  return `${c < 0 ? "−" : ""}${groupThousands(Math.floor(abs / 100))},${String(abs % 100).padStart(2, "0")} €`;
}

/** Divide i centesimi in parti per l'importo grande dell'hero. */
export function splitAmount(cents) {
  const c = Math.round(cents || 0);
  const abs = Math.abs(c);
  return { negative: c < 0, int: groupThousands(Math.floor(abs / 100)), dec: "," + String(abs % 100).padStart(2, "0") };
}

/** "1.234,56" · "1234.56" · "25" · "25 €" → centesimi interi; NaN se non interpretabile. */
export function parseEuroToCents(value) {
  let s = String(value == null ? "" : value).trim().replace(/[\s€]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** Centesimi → testo per un campo di input ("1234,50"). */
export const centsToInput = (c) => (c / 100).toFixed(2).replace(".", ",");

/** Vero se è un importo in centesimi valido (intero, finito, entro il limite). */
export function isValidCents(c, { allowZero = false } = {}) {
  return Number.isSafeInteger(c) && (allowZero ? c >= 0 : c > 0) && c <= MAX_AMOUNT_CENTS;
}
