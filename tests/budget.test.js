import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  computeFinancials, computeFinancialsForOffset, computeForecast, spentPercent, paceStatus, closeElapsedCycles,
  calculateHistoricalReserves, getMonthlyFixedCents, getMonthlyPacCents, monthlyShare, cumulativeDailyExpenses,
  recentDailyTotals, categoryBreakdown, getRecentTransactions, filterTransactions, groupByDay
} from "../js/core/budget.js";
import { richData, tx, NOW, CATEGORIES } from "./fixtures.js";

const deepFreeze = (o) => { Object.values(o).forEach((v) => v && typeof v === "object" && deepFreeze(v)); return Object.freeze(o); };

describe("computeFinancials (valori della versione precedente)", () => {
  const fin = computeFinancials(richData(), NOW);

  test("ciclo e giorni", () => {
    assert.equal(fin.cycle.startStr, "2026-11-27");
    assert.equal(fin.cycle.endStr, "2026-12-26");
    assert.equal(fin.totalDays, 30);
    assert.equal(fin.daysPassed, 2);
    assert.equal(fin.daysRemaining, 29);
  });

  test("entrate, uscite e quote", () => {
    assert.equal(fin.baseIncome, 170000);
    assert.equal(fin.extraIncomeCents, 25000);
    assert.equal(fin.variableExpensesCents, 6739);
    assert.equal(fin.monthlyFixedCents, 30000);
    assert.equal(fin.monthlyPacCents, 20000);
  });

  test("disponibile, budget di oggi e ritmo", () => {
    assert.equal(fin.availableCents, 138261);
    assert.equal(fin.dailyBudgetCents, 4767);
    assert.equal(fin.budgetVariabilePianificato, 145000);
    assert.equal(fin.differenzaRitmoCents, 2928);
    assert.equal(spentPercent(fin), 5);
    assert.equal(paceStatus(fin), "on-track");
  });

  test("avanzi e debito dai cicli chiusi", () => {
    assert.equal(fin.risparmiCents, 55000);
    assert.equal(fin.debitoCents, 0);
  });

  test("proiezione a fine ciclo", () => {
    assert.deepEqual(computeForecast(fin), { projectedExpenses: 101085, projectedRemainder: 43915 });
  });

  test("non modifica i dati ricevuti", () => {
    const data = deepFreeze(richData());
    assert.doesNotThrow(() => computeFinancials(data, NOW));
  });
});

describe("debito riportato", () => {
  test("un ciclo in perdita riduce il successivo; un avanzo azzera il debito", () => {
    const d = richData();
    /* al 20 ottobre il ciclo corrente è quello del 26 settembre: alle spalle solo il ciclo di agosto (−350 €) */
    const sett = computeFinancials(d, new Date(2026, 9, 20));
    assert.equal(sett.debitoCents, 35000);
    assert.equal(sett.risparmiCents, 0);
    /* al 1° novembre: agosto −350, settembre −130 −350 = −480 */
    const ott = computeFinancials(d, new Date(2026, 10, 1));
    assert.equal(ott.debitoCents, 48000);
    /* oggi: ottobre +1.030 −480 = +550 di avanzo, debito azzerato */
    const nov = computeFinancials(d, NOW);
    assert.equal(nov.debitoCents, 0);
    assert.equal(nov.risparmiCents, 55000);
  });

  test("il debito entra nel disponibile e il budget di oggi non scende sotto zero", () => {
    const fin = computeFinancials(richData(), new Date(2026, 10, 1));
    assert.equal(fin.availableCents, 155000 - 48000 - 20000 - 30000 - 2000);
    const deficit = computeFinancials({ ...richData(), recurring: [{ id: "x", amountCents: 500000, frequency: "monthly" }] }, NOW);
    assert.ok(deficit.availableCents < 0);
    assert.equal(deficit.dailyBudgetCents, 0);
    assert.equal(paceStatus(deficit), "deficit");
  });
});

describe("chiusura dei cicli", () => {
  test("crea le fotografie dei cicli conclusi senza toccare l'input", () => {
    const data = deepFreeze(richData());
    const { snapshots, changed } = closeElapsedCycles(data, NOW);
    assert.ok(changed);
    assert.deepEqual(snapshots.map((s) => [s.startDate, s.endDate, s.balanceCents]), [
      ["2026-08-27", "2026-09-25", -35000],
      ["2026-09-26", "2026-10-26", -13000],
      ["2026-10-27", "2026-11-26", 103000]
    ]);
  });

  test("è idempotente", () => {
    const data = richData();
    data.cycleSnapshots = closeElapsedCycles(data, NOW).snapshots;
    const again = closeElapsedCycles(data, NOW);
    assert.equal(again.changed, false);
    assert.equal(again.snapshots, data.cycleSnapshots);
  });

  test("un ciclo non ancora concluso non viene congelato", () => {
    const { snapshots } = closeElapsedCycles(richData(), new Date(2026, 9, 20));
    assert.deepEqual(snapshots.map((s) => s.startDate), ["2026-08-27"]);
  });

  test("dopo la chiusura, modificare spese fisse o PAC non altera i cicli passati", () => {
    const data = richData();
    data.cycleSnapshots = closeElapsedCycles(data, NOW).snapshots;
    data.recurring = [];
    data.goals = [{ id: "g", monthlyCents: 90000 }];
    const fin = computeFinancials(data, NOW);
    assert.equal(fin.risparmiCents, 55000);
    assert.equal(fin.monthlyPacCents, 90000);
  });

  test("senza fotografie i cicli passati si calcolano al volo con le quote correnti", () => {
    const data = richData();
    const r = calculateHistoricalReserves(data, { startStr: "2026-11-27" }, getMonthlyFixedCents(data), getMonthlyPacCents(data));
    assert.deepEqual(r, { risparmiCents: 55000, debitoCents: 0 });
  });
});

describe("spese fisse e PAC", () => {
  test("quota mensile per frequenza", () => {
    assert.equal(monthlyShare({ amountCents: 60000, frequency: "annual" }), 5000);
    assert.equal(monthlyShare({ amountCents: 10000, frequency: "quarterly" }), 3333);
    assert.equal(monthlyShare({ amountCents: 25000, frequency: "monthly" }), 25000);
  });
  test("le spese disattivate non contano", () => {
    assert.equal(getMonthlyFixedCents({ recurring: [{ amountCents: 100, frequency: "monthly", active: false }, { amountCents: 200, frequency: "monthly" }] }), 200);
  });
  test("PAC senza quota vale zero", () => {
    assert.equal(getMonthlyPacCents({ goals: [{}, { monthlyCents: 500 }] }), 500);
  });
});

describe("serie per i grafici", () => {
  const fin = computeFinancials(richData(), NOW);
  test("spesa cumulata giorno per giorno", () => {
    const cum = cumulativeDailyExpenses(fin);
    assert.equal(cum.length, 30);
    assert.equal(cum[0], 4550);
    assert.equal(cum[1], 4550 + 1290 + 899);
    assert.equal(cum[29], cum[1]);
  });
  test("ultimi giorni trascorsi", () => {
    assert.deepEqual(recentDailyTotals(fin), [{ date: "2026-11-27", cents: 4550 }, { date: "2026-11-28", cents: 2189 }]);
  });
  test("categorie dalla più alta, vuote in coda", () => {
    const { rows, totalCents } = categoryBreakdown(fin, CATEGORIES);
    assert.equal(totalCents, 6739);
    assert.deepEqual(rows.slice(0, 3).map((r) => [r.category.id, r.cents]), [["carburante", 4550], ["svago", 1290], ["abbonamenti", 899]]);
    assert.equal(rows.length, 8);
  });
});

describe("movimenti", () => {
  test("attività recenti: le più nuove per prime anche se salvate in ordine sparso", () => {
    const ids = getRecentTransactions(richData().transactions, 5).map((t) => t.id);
    assert.deepEqual(ids, ["b4", "b2", "b3", "b1", "a5"]);
  });

  test("attività recenti: a parità di data e ora vale l'ordine salvato", () => {
    const list = [tx("x", "2026-11-01", 1, "svago", "expense", "", 0), tx("y", "2026-11-01", 1, "svago", "expense", "", 0)];
    assert.deepEqual(getRecentTransactions(list).map((t) => t.id), ["x", "y"]);
  });

  test("ricerca su nota e categoria, filtro per categoria", () => {
    const list = richData().transactions;
    assert.deepEqual(filterTransactions(list, CATEGORIES, { query: "  BENZ " }).map((t) => t.id), ["a5", "b1"]);
    assert.deepEqual(filterTransactions(list, CATEGORIES, { query: "pieno" }).map((t) => t.id), ["b1"]);
    assert.deepEqual(filterTransactions(list, CATEGORIES, { categoryId: "svago" }).map((t) => t.id), ["a4", "b2"]);
    assert.equal(filterTransactions(list, CATEGORIES).length, list.length);
  });

  test("raggruppamento per giorno con saldo netto", () => {
    const groups = groupByDay(computeFinancials(richData(), NOW).cycleTransactions);
    assert.deepEqual(groups.map((g) => [g.date, g.netCents, g.items.length]), [["2026-11-28", 1290 + 899 - 25000, 3], ["2026-11-27", 4550, 1]]);
  });

  test("ciclo concluso in Movimenti: giorni contati sull'intero ciclo", () => {
    const fin = computeFinancialsForOffset(richData(), NOW, -1);
    assert.equal(fin.cycle.startStr, "2026-10-27");
    assert.equal(fin.daysPassed, fin.totalDays);
    const current = computeFinancialsForOffset(richData(), NOW, 0);
    assert.equal(current.daysPassed, 2);
  });
});
