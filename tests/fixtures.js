/** Dati di prova condivisi dai test. */
export const tx = (id, date, amountCents, categoryId = "svago", type = "expense", note = "", createdAt = 1) =>
  ({ id, type, amountCents, categoryId, date, note, createdAt });

export const CATEGORIES = [
  { id: "carburante", nome: "Benzina", key: "carburante" },
  { id: "auto", nome: "Auto", key: "auto" },
  { id: "svago", nome: "Svago", key: "svago" },
  { id: "shopping", nome: "Acquisti", key: "shopping" },
  { id: "abbonamenti", nome: "Servizi", key: "abbonamenti" },
  { id: "salute", nome: "Salute", key: "salute" },
  { id: "lavoro", nome: "Lavoro", key: "lavoro" },
  { id: "varie", nome: "Varie", key: "varie" }
];

/**
 * Quattro accrediti: tre cicli chiusi (−350, −130, +1.030 prima del debito) e quello corrente.
 * I valori attesi sono quelli mostrati dalla versione precedente dell'app (index.html monolitico).
 */
export function richData() {
  return {
    version: 3,
    settings: {
      salaryDay: 28, monthlyIncomeCents: 0, monthlySalaries: {}, lastBackupDate: null, quickMode: false,
      profilePhoto: null, theme: "light", maskAmounts: false,
      payrollPayments: [
        { date: "2026-08-27", amountCents: 150000 }, { date: "2026-09-26", amountCents: 160000 },
        { date: "2026-10-27", amountCents: 155000 }, { date: "2026-11-27", amountCents: 170000 }
      ]
    },
    categories: CATEGORIES,
    transactions: [
      tx("a1", "2026-08-30", 45000, "shopping", "expense", "Vecchia spesa", 10),
      tx("a2", "2026-09-10", 90000, "auto", "expense", "Gomme", 11),
      tx("a3", "2026-10-01", 120000, "varie", "expense", "Grande spesa", 12),
      tx("a4", "2026-10-15", 3000, "svago", "expense", "Cinema", 13),
      tx("a5", "2026-11-05", 2000, "carburante", "expense", "", 14),
      tx("b1", "2026-11-27", 4550, "carburante", "expense", "Pieno", 20),
      tx("b2", "2026-11-28", 1290, "svago", "expense", "Caffè", 22),
      tx("b3", "2026-11-28", 25000, "lavoro", "income", "Rimborso", 21),
      tx("b4", "2026-11-28", 899, "abbonamenti", "expense", "Streaming", 23)
    ],
    recurring: [
      { id: "rec_auto", name: "Rata Auto", amountCents: 25000, frequency: "monthly", day: 15, categoryId: "auto", active: true },
      { id: "rec_ass", name: "Assicurazione", amountCents: 60000, frequency: "annual", day: 3, categoryId: "auto", active: true }
    ],
    goals: [{ id: "goal_pac", name: "PAC ETF", targetCents: 1000000, currentCents: 200000, monthlyCents: 20000 }],
    cycleSnapshots: []
  };
}

/** 28 novembre 2026, ore 10:30 locali. */
export const NOW = new Date(2026, 10, 28, 10, 30);

/** Storage in memoria con la stessa interfaccia di localStorage. */
export function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    dump: () => Object.fromEntries(m)
  };
}
