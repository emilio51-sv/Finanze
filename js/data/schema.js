/**
 * Schema dei dati salvati sul dispositivo.
 *
 * La chiave di localStorage resta `finanze_pwa_master_v3` per compatibilità: la versione
 * dello schema è il campo `version` dentro il documento. Ogni modifica alla forma dei dati
 * richiede di alzare SCHEMA_VERSION e aggiungere un passo in migrate.js.
 *
 * Versioni
 *   1–2  chiavi `finanze_pwa_data_v1/v2`, stipendio in `settings.monthlySalaries`
 *   3    accrediti in `settings.payrollPayments`, fotografie dei cicli chiusi in `cycleSnapshots`
 *   4    importi interi garantiti, record non validi spostati in `quarantine` invece di essere persi
 *   5    niente più accredito fittizio a zero creato al primo avvio
 */
export const SCHEMA_VERSION = 5;
export const STORAGE_KEY = "finanze_pwa_master_v3";
export const LEGACY_KEYS = ["finanze_pwa_data_v2", "finanze_pwa_data_v1"];
/** Copia grezza dei dati salvata una sola volta prima di ogni migrazione di versione. */
export const PREMIGRATION_PREFIX = "finanze_pwa_premigration_v";

export const FREQUENCIES = ["monthly", "quarterly", "annual"];
export const THEMES = ["auto", "light", "dark"];
export const TX_TYPES = ["expense", "income"];

export const DEFAULT_CATEGORIES = [
  { id: "carburante", nome: "Benzina", key: "carburante" },
  { id: "auto", nome: "Auto", key: "auto" },
  { id: "svago", nome: "Svago", key: "svago" },
  { id: "shopping", nome: "Acquisti", key: "shopping" },
  { id: "abbonamenti", nome: "Servizi", key: "abbonamenti" },
  { id: "salute", nome: "Salute", key: "salute" },
  { id: "lavoro", nome: "Lavoro", key: "lavoro" },
  { id: "varie", nome: "Varie", key: "varie" }
];

export const DEFAULT_SETTINGS = {
  salaryDay: 28, monthlyIncomeCents: 0, monthlySalaries: {}, lastBackupDate: null,
  quickMode: false, profilePhoto: null, theme: "auto", maskAmounts: false
};

export const DEFAULT_RECURRING = [{ id: "rec_auto", name: "Rata Auto", amountCents: 25000, frequency: "monthly", day: 15, categoryId: "auto", active: true }];
export const DEFAULT_GOALS = [{ id: "goal_pac", name: "PAC ETF", targetCents: 1000000, currentCents: 200000, monthlyCents: 20000 }];

const clone = (v) => JSON.parse(JSON.stringify(v));

/**
 * Dati del primo avvio. Nessun accredito: finché l'utente non registra lo stipendio
 * il ciclo è stimato sul giorno fisso `salaryDay`.
 */
export function createInitialData() {
  const settings = clone(DEFAULT_SETTINGS);
  settings.payrollPayments = [];
  return {
    version: SCHEMA_VERSION,
    settings,
    categories: clone(DEFAULT_CATEGORIES),
    transactions: [],
    recurring: clone(DEFAULT_RECURRING),
    goals: clone(DEFAULT_GOALS),
    cycleSnapshots: [],
    quarantine: []
  };
}
