/**
 * Date in ora locale, formato YYYY-MM-DD.
 * Mai toISOString(): restituisce UTC e sbaglia giorno attorno a mezzanotte.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDateString(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Vero se la stringa è una data di calendario reale in formato YYYY-MM-DD. */
export function isDateString(s) {
  if (typeof s !== "string" || !DATE_RE.test(s)) return false;
  return toLocalDateString(parseLocalDateString(s)) === s;
}

/** Aggiunge mesi senza saltare a quello successivo (31 gen + 1 → 28/29 feb). */
export function addMonthsClamped(date, months) {
  const targetMonth = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(date.getDate(), new Date(targetYear, normalizedMonth + 1, 0).getDate());
  return new Date(targetYear, normalizedMonth, day);
}

export const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Indice del giorno di `dateStr` rispetto all'inizio del ciclo (0 = primo giorno). */
export const dayIndex = (start, dateStr) => Math.round((parseLocalDateString(dateStr).getTime() - start.getTime()) / 86400000);
