/**
 * Cicli di stipendio. Ogni ciclo va dalla data di un accredito alla vigilia del successivo;
 * finché il prossimo non è registrato, la fine è stimata a circa un mese.
 * Modulo puro: la data di riferimento è sempre passata come argomento.
 */
import { toLocalDateString, parseLocalDateString, addMonthsClamped } from "./dates.js";

/** Ciclo "a giorno fisso" usato quando non esiste ancora alcun accredito. */
export function getCycleRange(refDate, salaryDay = 28) {
  const currentDay = refDate.getDate();
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  let startYear = year;
  let startMonth = month;
  if (currentDay < salaryDay) {
    startMonth = month - 1;
    if (startMonth < 0) { startMonth = 11; startYear = year - 1; }
  }
  const startDate = new Date(startYear, startMonth, salaryDay);
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 11) { endMonth = 0; endYear = startYear + 1; }
  const endDate = new Date(endYear, endMonth, salaryDay - 1);
  return { start: startDate, end: endDate, startStr: toLocalDateString(startDate), endStr: toLocalDateString(endDate) };
}

/** Accrediti validi, ordinati per data (accetta anche il vecchio formato `monthlySalaries`). */
export function getPayrollPayments(settings) {
  const payments = Array.isArray(settings.payrollPayments)
    ? settings.payrollPayments
    : Object.entries(settings.monthlySalaries || {}).map(([date, amountCents]) => ({ date, amountCents }));
  return payments
    .filter((payment) => payment && /^\d{4}-\d{2}-\d{2}$/.test(payment.date) && Number.isFinite(payment.amountCents))
    .map((payment) => ({ date: payment.date, amountCents: payment.amountCents }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Ultimo giorno di un ciclo: la vigilia del prossimo accredito. */
export function cycleEndBefore(nextDateStr) {
  const nextDate = parseLocalDateString(nextDateStr);
  return new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate() - 1);
}

export function getPayrollCycle(settings, refDate) {
  const todayStr = toLocalDateString(refDate);
  const payments = getPayrollPayments(settings);
  const currentPayment = payments.filter((payment) => payment.date <= todayStr).pop();
  if (!currentPayment) return getCycleRange(refDate, settings.salaryDay || 28);
  const start = parseLocalDateString(currentPayment.date);
  const knownNextPayment = payments.find((payment) => payment.date > currentPayment.date);
  let nextDate = knownNextPayment ? parseLocalDateString(knownNextPayment.date) : null;
  if (!nextDate) {
    nextDate = addMonthsClamped(start, 1);
    while (toLocalDateString(nextDate) <= todayStr) nextDate = addMonthsClamped(nextDate, 1);
  }
  const end = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate() - 1);
  return { start, end, startStr: toLocalDateString(start), endStr: toLocalDateString(end) };
}

/** Giorni totali, trascorsi (oggi incluso) e rimanenti (oggi incluso); mai meno di 1. */
export function getDaysMetrics(cycle, today) {
  const oneDay = 1000 * 60 * 60 * 24;
  const startMs = cycle.start.getTime();
  const endMs = cycle.end.getTime();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const totalDays = Math.max(1, Math.round((endMs - startMs) / oneDay) + 1);
  const daysPassed = Math.max(1, Math.min(totalDays, Math.round((todayMs - startMs) / oneDay) + 1));
  const daysRemaining = Math.max(1, Math.round((endMs - todayMs) / oneDay) + 1);
  return { totalDays, daysPassed, daysRemaining };
}

/** Data di riferimento spostata di `offset` mesi, senza saltare il 29–31. */
export function getOffsetDate(now, offset) {
  const day = now.getDate();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
  return d;
}

