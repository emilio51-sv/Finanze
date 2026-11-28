/**
 * Calcolo del budget. Funzioni pure: ricevono i dati e la data di riferimento,
 * non leggono né scrivono nulla all'esterno e non modificano gli argomenti.
 *
 * Disponibile = (stipendio + entrate extra) − debito riportato − PAC − spese fisse − spese variabili
 * Budget di oggi = max(0, disponibile / giorni rimanenti, oggi incluso)
 */
import { toLocalDateString, addDays, dayIndex } from "./dates.js";
import { getPayrollPayments, getPayrollCycle, getDaysMetrics, getOffsetDate, cycleEndBefore } from "./cycle.js";

const sum = (list) => list.reduce((acc, t) => acc + t.amountCents, 0);
const isExpense = (t) => t.type === "expense";
const isIncome = (t) => t.type === "income";

/** Quota mensile di una spesa fissa: annuale /12, trimestrale /3, altrimenti mensile. */
export const monthlyShare = (r) =>
  r.frequency === "annual" ? Math.round(r.amountCents / 12)
  : r.frequency === "quarterly" ? Math.round(r.amountCents / 3)
  : r.amountCents;

export function getMonthlyFixedCents(data) {
  return data.recurring.filter((r) => r.active !== false).reduce((acc, r) => acc + monthlyShare(r), 0);
}

export function getMonthlyPacCents(data) {
  return data.goals.reduce((acc, goal) => acc + (goal.monthlyCents || 0), 0);
}

export const transactionsBetween = (transactions, startStr, endStr) =>
  transactions.filter((t) => t.date >= startStr && t.date <= endStr);

/** Fotografia immutabile di un ciclo concluso. */
export function createCycleSnapshot(data, payment, nextPayment, monthlyFixedCents, monthlyPacCents) {
  const endStr = toLocalDateString(cycleEndBefore(nextPayment.date));
  const transactions = transactionsBetween(data.transactions, payment.date, endStr);
  const otherIncomeCents = sum(transactions.filter(isIncome));
  const expensesCents = sum(transactions.filter(isExpense));
  return {
    startDate: payment.date,
    endDate: endStr,
    salaryCents: payment.amountCents,
    otherIncomeCents,
    expensesCents,
    monthlyFixedCents,
    monthlyPacCents,
    balanceCents: payment.amountCents + otherIncomeCents - expensesCents - monthlyFixedCents - monthlyPacCents
  };
}

/**
 * Fotografie dei cicli chiusi entro `refDate` che ancora mancano.
 * Restituisce l'elenco completo e ordinato, più `changed` se ne sono state aggiunte.
 */
export function closeElapsedCycles(data, refDate) {
  const existing = Array.isArray(data.cycleSnapshots) ? data.cycleSnapshots : [];
  const existingStarts = new Set(existing.map((s) => s.startDate));
  const payments = getPayrollPayments(data.settings);
  const todayStr = toLocalDateString(refDate);
  const monthlyFixedCents = getMonthlyFixedCents(data);
  const monthlyPacCents = getMonthlyPacCents(data);
  const added = [];
  for (let i = 0; i < payments.length - 1; i++) {
    const payment = payments[i];
    const nextPayment = payments[i + 1];
    if (nextPayment.date > todayStr) break;
    if (!existingStarts.has(payment.date)) {
      added.push(createCycleSnapshot(data, payment, nextPayment, monthlyFixedCents, monthlyPacCents));
      existingStarts.add(payment.date);
    }
  }
  if (!added.length) return { snapshots: existing, changed: false };
  const snapshots = [...existing, ...added].sort((a, b) => a.startDate.localeCompare(b.startDate));
  return { snapshots, changed: true };
}

/** Avanzi accumulati e debito riportato dai cicli precedenti a `currentCycle`. */
export function calculateHistoricalReserves(data, currentCycle, monthlyFixedCents, monthlyPacCents) {
  const payments = getPayrollPayments(data.settings);
  const snapshots = new Map((data.cycleSnapshots || []).map((s) => [s.startDate, s]));
  let risparmiCents = 0;
  let debitoCents = 0;
  for (let i = 0; i < payments.length - 1; i++) {
    const payment = payments[i];
    const nextPayment = payments[i + 1];
    if (nextPayment.date > currentCycle.startStr) break;
    const snapshot = snapshots.get(payment.date) || createCycleSnapshot(data, payment, nextPayment, monthlyFixedCents, monthlyPacCents);
    const cycleBalanceCents = snapshot.balanceCents - debitoCents;
    if (cycleBalanceCents < 0) {
      debitoCents = Math.abs(cycleBalanceCents);
    } else {
      risparmiCents += cycleBalanceCents;
      debitoCents = 0;
    }
  }
  return { risparmiCents, debitoCents };
}

/** Tutti i numeri del ciclo che contiene `refDate`. */
export function computeFinancials(data, refDate) {
  const cycle = getPayrollCycle(data.settings, refDate);
  const { totalDays, daysPassed, daysRemaining } = getDaysMetrics(cycle, refDate);
  const cycleTx = transactionsBetween(data.transactions, cycle.startStr, cycle.endStr);
  const extraIncomeCents = sum(cycleTx.filter(isIncome));
  const variableExpensesCents = sum(cycleTx.filter(isExpense));
  const monthlyFixedCents = getMonthlyFixedCents(data);
  const monthlyPacCents = getMonthlyPacCents(data);
  const cyclePayment = getPayrollPayments(data.settings).find((p) => p.date === cycle.startStr);
  const baseIncome = cyclePayment ? cyclePayment.amountCents : 0;
  const totalInflow = baseIncome + extraIncomeCents;
  const { risparmiCents, debitoCents } = calculateHistoricalReserves(data, cycle, monthlyFixedCents, monthlyPacCents);
  const availableCents = totalInflow - debitoCents - monthlyPacCents - monthlyFixedCents - variableExpensesCents;
  const dailyBudgetCents = availableCents > 0 ? Math.floor(availableCents / daysRemaining) : 0;
  const budgetVariabilePianificato = Math.max(0, totalInflow - debitoCents - monthlyPacCents - monthlyFixedCents);
  const spesaAttesaAdOggi = budgetVariabilePianificato > 0 ? Math.round((budgetVariabilePianificato / totalDays) * daysPassed) : 0;
  const differenzaRitmoCents = spesaAttesaAdOggi - variableExpensesCents;
  return {
    cycle, totalDays, daysPassed, daysRemaining, baseIncome, extraIncomeCents,
    monthlyPacCents, monthlyFixedCents, variableExpensesCents, risparmiCents, debitoCents, availableCents,
    dailyBudgetCents, budgetVariabilePianificato, differenzaRitmoCents, cycleTransactions: cycleTx
  };
}

/**
 * Ciclo mostrato in "Movimenti", spostato di `offset` mesi. Per un ciclo già concluso
 * i giorni si misurano sull'intero ciclo, non sul giorno di riferimento.
 */
export function computeFinancialsForOffset(data, now, offset) {
  const fin = computeFinancials(data, getOffsetDate(now, offset));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return fin.cycle.end < today ? computeFinancials(data, fin.cycle.end) : fin;
}

/** Percentuale del budget variabile già spesa, 0–100. */
export function spentPercent(fin) {
  if (fin.budgetVariabilePianificato > 0) return Math.min(100, Math.round((fin.variableExpensesCents / fin.budgetVariabilePianificato) * 100));
  return fin.variableExpensesCents > 0 ? 100 : 0;
}

/** Stato del ciclo: "deficit" · "on-track" (in linea) · "over-pace" (sopra il ritmo). */
export function paceStatus(fin) {
  if (fin.availableCents < 0) return "deficit";
  return fin.differenzaRitmoCents >= 0 ? "on-track" : "over-pace";
}

/** Proiezione lineare della spesa a fine ciclo e del resto stimato. */
export function computeForecast(fin) {
  const projectedExpenses = fin.daysPassed > 0
    ? Math.round((fin.variableExpensesCents / fin.daysPassed) * fin.totalDays)
    : fin.variableExpensesCents;
  const projectedRemainder = fin.availableCents - Math.max(0, projectedExpenses - fin.variableExpensesCents);
  return { projectedExpenses, projectedRemainder };
}

/** Spesa cumulata giorno per giorno sull'intero ciclo. */
export function cumulativeDailyExpenses(fin) {
  const daily = new Array(fin.totalDays).fill(0);
  fin.cycleTransactions.forEach((t) => {
    if (!isExpense(t)) return;
    const i = dayIndex(fin.cycle.start, t.date);
    if (i >= 0 && i < fin.totalDays) daily[i] += t.amountCents;
  });
  const cum = [];
  daily.reduce((s, v) => { s += v; cum.push(s); return s; }, 0);
  return cum;
}

/** Ultimi `n` giorni già trascorsi del ciclo con il totale speso in ciascuno. */
export function recentDailyTotals(fin, n = 14) {
  const totals = {};
  fin.cycleTransactions.filter(isExpense).forEach((t) => { totals[t.date] = (totals[t.date] || 0) + t.amountCents; });
  const dates = [];
  for (let d = fin.cycle.start; d <= fin.cycle.end && dates.length < fin.daysPassed; d = addDays(d, 1)) dates.push(toLocalDateString(d));
  return dates.slice(-n).map((date) => ({ date, cents: totals[date] || 0 }));
}

/** Spese del ciclo per categoria, dalla più alta; le categorie senza spese restano in coda. */
export function categoryBreakdown(fin, categories) {
  const by = {};
  let totalCents = 0;
  fin.cycleTransactions.filter(isExpense).forEach((t) => {
    by[t.categoryId] = (by[t.categoryId] || 0) + t.amountCents;
    totalCents += t.amountCents;
  });
  const rows = categories.map((c) => ({ category: c, cents: by[c.id] || 0 })).sort((a, b) => b.cents - a.cents);
  return { rows, totalCents };
}

/**
 * Movimenti più recenti: prima per data (dal più nuovo), a parità di data per ora di inserimento.
 * Non dipende dall'ordine in cui sono salvati.
 */
export function getRecentTransactions(transactions, n = 5) {
  return transactions
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t.date.localeCompare(a.t.date) || (b.t.createdAt || 0) - (a.t.createdAt || 0) || a.i - b.i)
    .slice(0, n)
    .map(({ t }) => t);
}

/** Ricerca su nota e nome categoria, più filtro per categoria ("all" = tutte). */
export function filterTransactions(transactions, categories, { query = "", categoryId = "all" } = {}) {
  const q = query.trim().toLowerCase();
  return transactions.filter((tx) => {
    const matchCat = categoryId === "all" || tx.categoryId === categoryId;
    if (!q) return matchCat;
    const cat = categories.find((c) => c.id === tx.categoryId);
    const hay = `${tx.note || ""} ${cat ? cat.nome : ""}`.toLowerCase();
    return matchCat && hay.includes(q);
  });
}

/** Movimenti raggruppati per giorno (dal più recente) con saldo netto del giorno (uscite positive). */
export function groupByDay(transactions) {
  const groups = {};
  transactions.forEach((t) => { (groups[t.date] = groups[t.date] || []).push(t); });
  return Object.keys(groups).sort().reverse().map((date) => ({
    date,
    items: groups[date],
    netCents: groups[date].reduce((acc, t) => acc + (isExpense(t) ? t.amountCents : -t.amountCents), 0)
  }));
}
