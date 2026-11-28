/**
 * Migrazioni dello schema. Ogni passo riceve i dati della versione precedente e
 * restituisce quelli della successiva, senza mai eliminare informazioni dell'utente.
 * Modulo puro: la data corrente è passata come argomento.
 */
import { getCycleRange } from "../core/cycle.js";
import { toLocalDateString, addDays, parseLocalDateString } from "../core/dates.js";
import {
  SCHEMA_VERSION, DEFAULT_SETTINGS, DEFAULT_CATEGORIES, DEFAULT_RECURRING, DEFAULT_GOALS, THEMES, createInitialData
} from "./schema.js";
import { partition, checkTransaction, checkRecurring, checkGoal, checkPayment, checkSnapshot } from "./validate.js";

const clone = (v) => JSON.parse(JSON.stringify(v));
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Versione dichiarata da un documento; i vecchi formati non la avevano. */
export function detectVersion(p) {
  return Number.isInteger(p?.version) && p.version > 0 ? p.version : 2;
}

/**
 * Valori predefiniti per le parti mancanti, e conversione del vecchio stipendio
 * `monthlySalaries` (v1/v2) nell'elenco di accrediti `payrollPayments` (v3).
 */
function withDefaults(p, now) {
  const settings = { ...clone(DEFAULT_SETTINGS), ...(isObj(p.settings) ? p.settings : {}) };
  settings.monthlySalaries = { ...(isObj(p.settings?.monthlySalaries) ? p.settings.monthlySalaries : {}) };
  if (Array.isArray(p.settings?.payrollPayments)) {
    settings.payrollPayments = p.settings.payrollPayments;
  } else {
    const cycle = getCycleRange(now, settings.salaryDay || 28);
    if (settings.monthlySalaries[cycle.startStr] === undefined && p.settings?.monthlyIncomeCents !== undefined) {
      settings.monthlySalaries[cycle.startStr] = p.settings.monthlyIncomeCents || 0;
    }
    settings.payrollPayments = Object.entries(settings.monthlySalaries).map(([date, amountCents]) => ({ date, amountCents }));
  }
  return {
    ...p,
    settings,
    categories: Array.isArray(p.categories) && p.categories.length ? p.categories : clone(DEFAULT_CATEGORIES),
    transactions: Array.isArray(p.transactions) ? p.transactions : [],
    recurring: Array.isArray(p.recurring) ? p.recurring : clone(DEFAULT_RECURRING),
    goals: Array.isArray(p.goals) ? p.goals : clone(DEFAULT_GOALS),
    cycleSnapshots: Array.isArray(p.cycleSnapshots) ? p.cycleSnapshots : []
  };
}

/**
 * Passi specifici di versione, applicati in ordine a chi parte da una versione inferiore.
 * Per una v5: aggiungere { to: 5, run: (p) => ... } e alzare SCHEMA_VERSION.
 */
const STEPS = [
  /* v4 introduce solo la pulizia di normalize(), che si applica sempre */
  { to: 4, run: (p) => p },
  { to: 5, run: removeFirstLaunchPlaceholder }
];

/** Massima distanza fra l'accredito fittizio e il primo stipendio vero perché lo si consideri un doppione. */
const PLACEHOLDER_WINDOW_DAYS = 31;

/**
 * Fino alla v4 il primo avvio creava un accredito a zero all'inizio del ciclo stimato
 * (insieme a `monthlySalaries[data] = 0`). Uno stipendio vero registrato pochi giorni
 * prima o dopo creava così un ciclo fantasma: a zero (debito) oppure di un solo giorno.
 *
 * Lo tolgo solo se ha esattamente quella firma, è l'unico accredito a zero e cade entro
 * un mese dal primo stipendio vero. Tolgo anche le fotografie dei cicli che toccava,
 * che vengono ricalcolate alla prossima chiusura.
 */
export function removeFirstLaunchPlaceholder(p) {
  const s = p.settings;
  const payments = Array.isArray(s.payrollPayments) ? s.payrollPayments : [];
  const zeros = payments.filter((x) => x && x.amountCents === 0);
  const real = payments.filter((x) => x && x.amountCents > 0 && typeof x.date === "string").map((x) => x.date).sort();
  if (zeros.length !== 1 || !real.length || s.monthlyIncomeCents) return p;
  const ph = zeros[0];
  if (!isObj(s.monthlySalaries) || s.monthlySalaries[ph.date] !== 0 || typeof ph.date !== "string") return p;
  const days = Math.abs(Math.round((parseLocalDateString(ph.date) - parseLocalDateString(real[0])) / 86400000));
  if (!(days <= PLACEHOLDER_WINDOW_DAYS)) return p;
  const dayBefore = toLocalDateString(addDays(parseLocalDateString(ph.date), -1));
  const touches = (snap) => snap && (snap.startDate === ph.date || snap.endDate === dayBefore);
  return {
    ...p,
    settings: { ...s, payrollPayments: payments.filter((x) => x !== ph) },
    cycleSnapshots: (p.cycleSnapshots || []).filter((snap) => !touches(snap))
  };
}

/**
 * Pulizia idempotente applicata a ogni caricamento e import. I record non validi
 * vanno in `quarantine` (che finisce anche nei backup) invece di sparire.
 */
export function normalize(p) {
  const tx = partition(p.transactions, checkTransaction, "transaction");
  const rec = partition(p.recurring, checkRecurring, "recurring");
  const goals = partition(p.goals, checkGoal, "goal");
  const pay = partition(p.settings.payrollPayments, checkPayment, "payrollPayment");
  const snaps = partition(p.cycleSnapshots, checkSnapshot, "cycleSnapshot");
  const settings = { ...p.settings, payrollPayments: pay.valid };
  if (!THEMES.includes(settings.theme)) settings.theme = "auto";
  if (!Number.isInteger(settings.salaryDay) || settings.salaryDay < 1 || settings.salaryDay > 31) settings.salaryDay = 28;
  const rejected = [...tx.rejected, ...rec.rejected, ...goals.rejected, ...pay.rejected, ...snaps.rejected];
  return {
    ...p,
    settings,
    transactions: tx.valid,
    recurring: rec.valid,
    goals: goals.valid,
    cycleSnapshots: snaps.valid,
    quarantine: [...(Array.isArray(p.quarantine) ? p.quarantine : []), ...rejected]
  };
}

/**
 * Porta qualsiasi documento salvato (o `null` al primo avvio) all'ultima versione.
 * @returns {{ data: object, fromVersion: number|null, migrated: boolean, rejected: number }}
 */
export function migrate(parsed, now) {
  if (!isObj(parsed)) return { data: createInitialData(), fromVersion: null, migrated: false, rejected: 0 };
  const fromVersion = detectVersion(parsed);
  const before = Array.isArray(parsed.quarantine) ? parsed.quarantine.length : 0;
  let data = withDefaults(parsed, now);
  for (const step of STEPS) if (fromVersion < step.to) data = step.run(data);
  data = { ...normalize(data), version: Math.max(SCHEMA_VERSION, fromVersion) };
  return { data, fromVersion, migrated: fromVersion < SCHEMA_VERSION, rejected: data.quarantine.length - before };
}
