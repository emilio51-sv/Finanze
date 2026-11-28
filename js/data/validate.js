/**
 * Validazione: nulla entra nei dati dell'app senza passare da qui.
 * Funzioni pure; non lanciano eccezioni per dati sporchi ma li segnalano.
 */
import { isValidCents, parseEuroToCents, MAX_AMOUNT_CENTS, formatValuta } from "../core/money.js";
import { isDateString } from "../core/dates.js";
import { FREQUENCIES, TX_TYPES } from "./schema.js";

/** Dimensione massima di un file di backup importabile. */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Converte in centesimi interi un valore già numerico (o stringa numerica) dei dati salvati. */
function toCents(v) {
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) v = Number(v);
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : NaN;
}

/**
 * Importo digitato dall'utente.
 * @returns {{ cents: number, error: string|null }}
 */
export function parseAmountInput(text, { allowZero = false } = {}) {
  const cents = parseEuroToCents(text);
  if (!Number.isFinite(cents) || cents < 0) return { cents: NaN, error: "Inserisci un importo valido" };
  if (!allowZero && cents === 0) return { cents, error: "Inserisci un importo maggiore di zero" };
  if (cents > MAX_AMOUNT_CENTS) return { cents, error: `L'importo massimo è ${formatValuta(MAX_AMOUNT_CENTS)}` };
  return { cents, error: null };
}

/* ---------- record singoli: restituiscono { value } oppure { error } ---------- */

export function checkTransaction(t, i = 0) {
  if (!isObj(t)) return { error: "movimento non leggibile" };
  const amountCents = toCents(t.amountCents);
  if (!isValidCents(amountCents)) return { error: "importo non valido" };
  if (!isDateString(t.date)) return { error: "data non valida" };
  if (!TX_TYPES.includes(t.type)) return { error: "tipo non valido" };
  return {
    value: {
      ...t,
      id: typeof t.id === "string" && t.id ? t.id : `tx_mig_${i}`,
      amountCents,
      categoryId: typeof t.categoryId === "string" && t.categoryId ? t.categoryId : "varie",
      note: typeof t.note === "string" ? t.note : "",
      createdAt: Number.isFinite(t.createdAt) ? t.createdAt : 0
    }
  };
}

export function checkRecurring(r, i = 0) {
  if (!isObj(r)) return { error: "spesa fissa non leggibile" };
  const amountCents = toCents(r.amountCents);
  if (!isValidCents(amountCents)) return { error: "importo non valido" };
  const day = Number.isInteger(r.day) && r.day >= 1 && r.day <= 31 ? r.day : 15;
  return {
    value: {
      ...r,
      id: typeof r.id === "string" && r.id ? r.id : `rec_mig_${i}`,
      name: typeof r.name === "string" ? r.name : "Spesa fissa",
      amountCents,
      /* una frequenza sconosciuta è sempre stata calcolata come mensile */
      frequency: FREQUENCIES.includes(r.frequency) ? r.frequency : "monthly",
      day,
      categoryId: typeof r.categoryId === "string" && r.categoryId ? r.categoryId : "varie"
    }
  };
}

export function checkGoal(g, i = 0) {
  if (!isObj(g)) return { error: "piano non leggibile" };
  const out = { ...g, id: typeof g.id === "string" && g.id ? g.id : `goal_mig_${i}`, name: typeof g.name === "string" ? g.name : "Piano" };
  for (const k of ["monthlyCents", "currentCents", "targetCents"]) {
    if (g[k] === undefined || g[k] === null) { out[k] = 0; continue; }
    const c = toCents(g[k]);
    if (!isValidCents(c, { allowZero: true })) return { error: `${k} non valido` };
    out[k] = c;
  }
  return { value: out };
}

export function checkPayment(p) {
  if (!isObj(p) || !isDateString(p.date)) return { error: "data accredito non valida" };
  const amountCents = toCents(p.amountCents);
  if (!isValidCents(amountCents, { allowZero: true })) return { error: "importo accredito non valido" };
  return { value: { date: p.date, amountCents } };
}

export function checkSnapshot(s) {
  if (!isObj(s) || !isDateString(s.startDate) || !Number.isFinite(s.balanceCents)) return { error: "fotografia ciclo non valida" };
  return { value: s };
}

/**
 * Pulisce un elenco: i record validi restano (nello stesso ordine), quelli non validi
 * finiscono in `rejected` con il motivo, così non vengono mai persi in silenzio.
 */
export function partition(list, check, kind) {
  const valid = [];
  const rejected = [];
  (Array.isArray(list) ? list : []).forEach((item, i) => {
    const r = check(item, i);
    if (r.error) rejected.push({ kind, reason: r.error, record: item });
    else valid.push(r.value);
  });
  return { valid, rejected };
}

/**
 * Controllo strutturale di un file di backup, prima di qualsiasi migrazione.
 * @returns {string|null} messaggio d'errore leggibile, oppure null se la forma è corretta
 */
export function checkBackupShape(d) {
  if (!isObj(d)) return "Il file non contiene un backup di Finanze";
  if (!isObj(d.settings)) return "Nel backup mancano i parametri";
  for (const k of ["transactions", "recurring", "goals"]) {
    if (!Array.isArray(d[k])) return "Il backup è incompleto o danneggiato";
  }
  return null;
}
