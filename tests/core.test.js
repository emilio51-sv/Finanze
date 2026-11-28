import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { formatValuta, parseEuroToCents, centsToInput, isValidCents, splitAmount, MAX_AMOUNT_CENTS } from "../js/core/money.js";
import { toLocalDateString, isDateString, addMonthsClamped, parseLocalDateString } from "../js/core/dates.js";
import { getPayrollCycle, getDaysMetrics, getOffsetDate, getCycleRange, getPayrollPayments } from "../js/core/cycle.js";
import { parseItalianSpokenAmount } from "../js/core/voice.js";

describe("importi", () => {
  test("formatValuta: migliaia con punto, decimali con virgola, meno tipografico", () => {
    assert.equal(formatValuta(123456), "1.234,56 €");
    assert.equal(formatValuta(-4500), "−45,00 €");
    assert.equal(formatValuta(5), "0,05 €");
    assert.equal(formatValuta(0), "0,00 €");
    assert.equal(formatValuta(undefined), "0,00 €");
    assert.equal(formatValuta(100000000), "1.000.000,00 €");
  });

  test("parseEuroToCents accetta i formati italiano e inglese", () => {
    assert.equal(parseEuroToCents("1.234,56"), 123456);
    assert.equal(parseEuroToCents("1234.56"), 123456);
    assert.equal(parseEuroToCents("25"), 2500);
    assert.equal(parseEuroToCents("25,5"), 2550);
    assert.equal(parseEuroToCents("1.000"), 100000);
    assert.equal(parseEuroToCents(" 12 € "), 1200);
    assert.equal(parseEuroToCents("0,1"), 10);
  });

  test("parseEuroToCents rifiuta testo non numerico", () => {
    assert.ok(Number.isNaN(parseEuroToCents("")));
    assert.ok(Number.isNaN(parseEuroToCents("abc")));
    assert.ok(Number.isNaN(parseEuroToCents(null)));
  });

  test("nessun errore di virgola mobile", () => {
    assert.equal(parseEuroToCents("0,29"), 29);
    assert.equal(parseEuroToCents("1,15"), 115);
    assert.equal(parseEuroToCents("4,35"), 435);
  });

  test("centsToInput e splitAmount", () => {
    assert.equal(centsToInput(123450), "1234,50");
    assert.deepEqual(splitAmount(-123456), { negative: true, int: "1.234", dec: ",56" });
  });

  test("isValidCents", () => {
    assert.ok(isValidCents(1));
    assert.ok(!isValidCents(0));
    assert.ok(isValidCents(0, { allowZero: true }));
    assert.ok(!isValidCents(-1, { allowZero: true }));
    assert.ok(!isValidCents(10.5));
    assert.ok(!isValidCents(NaN));
    assert.ok(!isValidCents(MAX_AMOUNT_CENTS + 1));
  });
});

describe("date locali", () => {
  test("toLocalDateString usa l'ora locale, anche a mezzanotte", () => {
    assert.equal(toLocalDateString(new Date(2026, 0, 1, 0, 5)), "2026-01-01");
    assert.equal(toLocalDateString(new Date(2026, 11, 31, 23, 59)), "2026-12-31");
  });

  test("isDateString riconosce solo date di calendario reali", () => {
    assert.ok(isDateString("2028-02-29"));
    assert.ok(!isDateString("2026-02-29"));
    assert.ok(!isDateString("2026-13-01"));
    assert.ok(!isDateString("2026-1-1"));
    assert.ok(!isDateString(20260101));
  });

  test("addMonthsClamped non salta il mese", () => {
    assert.equal(toLocalDateString(addMonthsClamped(parseLocalDateString("2026-01-31"), 1)), "2026-02-28");
    assert.equal(toLocalDateString(addMonthsClamped(parseLocalDateString("2028-01-31"), 1)), "2028-02-29");
    assert.equal(toLocalDateString(addMonthsClamped(parseLocalDateString("2026-12-15"), 1)), "2027-01-15");
    assert.equal(toLocalDateString(addMonthsClamped(parseLocalDateString("2026-01-15"), -1)), "2025-12-15");
  });
});

describe("cicli di stipendio", () => {
  const settings = (dates) => ({ payrollPayments: dates.map((date) => ({ date, amountCents: 100000 })) });

  test("il ciclo va dall'accredito alla vigilia del successivo", () => {
    const c = getPayrollCycle(settings(["2026-10-27", "2026-11-27"]), new Date(2026, 10, 3));
    assert.equal(c.startStr, "2026-10-27");
    assert.equal(c.endStr, "2026-11-26");
  });

  test("senza accredito successivo la fine è stimata a un mese", () => {
    const c = getPayrollCycle(settings(["2026-11-27"]), new Date(2026, 10, 28));
    assert.equal(c.startStr, "2026-11-27");
    assert.equal(c.endStr, "2026-12-26");
  });

  test("stima oltre il mese se l'accredito successivo tarda", () => {
    const c = getPayrollCycle(settings(["2026-10-27"]), new Date(2026, 10, 30));
    assert.equal(c.endStr, "2026-12-26");
  });

  test("accredito del 31 gennaio: fine ciclo al 27 febbraio", () => {
    const c = getPayrollCycle(settings(["2026-01-31"]), new Date(2026, 1, 10));
    assert.equal(c.endStr, "2026-02-27");
  });

  test("senza accrediti usa il giorno fisso", () => {
    const c = getPayrollCycle({ salaryDay: 28 }, new Date(2026, 0, 10));
    assert.equal(c.startStr, "2025-12-28");
    assert.equal(c.endStr, "2026-01-27");
    assert.equal(getCycleRange(new Date(2026, 0, 28), 28).startStr, "2026-01-28");
  });

  test("getPayrollPayments: ordina, scarta i non validi, legge il vecchio formato", () => {
    assert.deepEqual(getPayrollPayments({ payrollPayments: [{ date: "2026-02-01", amountCents: 1 }, { date: "x", amountCents: 2 }, { date: "2026-01-01", amountCents: 3 }] }),
      [{ date: "2026-01-01", amountCents: 3 }, { date: "2026-02-01", amountCents: 1 }]);
    assert.deepEqual(getPayrollPayments({ monthlySalaries: { "2026-01-28": 5 } }), [{ date: "2026-01-28", amountCents: 5 }]);
  });

  test("getDaysMetrics conta oggi sia nei trascorsi sia nei rimanenti", () => {
    const cycle = getPayrollCycle(settings(["2026-11-27"]), new Date(2026, 10, 28));
    assert.deepEqual(getDaysMetrics(cycle, new Date(2026, 10, 28, 23, 59)), { totalDays: 30, daysPassed: 2, daysRemaining: 29 });
    assert.deepEqual(getDaysMetrics(cycle, new Date(2026, 11, 26)), { totalDays: 30, daysPassed: 30, daysRemaining: 1 });
  });

  test("getDaysMetrics è corretto a cavallo del cambio dell'ora", () => {
    /* in Europa l'ora legale finisce l'ultima domenica di ottobre */
    const cycle = getPayrollCycle(settings(["2026-10-20", "2026-11-20"]), new Date(2026, 10, 1));
    assert.deepEqual(getDaysMetrics(cycle, new Date(2026, 10, 1)), { totalDays: 31, daysPassed: 13, daysRemaining: 19 });
  });

  test("getOffsetDate non salta il 29–31", () => {
    assert.equal(toLocalDateString(getOffsetDate(new Date(2026, 2, 31), -1)), "2026-02-28");
    assert.equal(toLocalDateString(getOffsetDate(new Date(2026, 0, 31), 1)), "2026-02-28");
    assert.equal(toLocalDateString(getOffsetDate(new Date(2026, 10, 28), -12)), "2025-11-28");
  });
});

describe("importo detto a voce", () => {
  const cases = [
    ["venticinque e cinquanta", "25,50"],
    ["duemilacinquecento", "2500"],
    ["dodici euro e trenta centesimi", "12,30"],
    ["25,50", "25,50"],
    ["25 €", "25"],
    ["centoventi", "120"],
    ["tre virgola cinque", "3,50"],
    ["ventuno", "21"],
    ["boh", ""]
  ];
  for (const [input, expected] of cases) {
    test(`"${input}" → "${expected}"`, () => assert.equal(parseItalianSpokenAmount(input), expected));
  }
});
