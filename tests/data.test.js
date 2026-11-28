import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { migrate, normalize } from "../js/data/migrate.js";
import { SCHEMA_VERSION, STORAGE_KEY, PREMIGRATION_PREFIX, createInitialData } from "../js/data/schema.js";
import { parseAmountInput, checkBackupShape, checkTransaction } from "../js/data/validate.js";
import { Store } from "../js/data/store.js";
import { computeFinancials } from "../js/core/budget.js";
import { richData, tx, NOW, memoryStorage } from "./fixtures.js";

describe("migrazioni", () => {
  test("primo avvio: nessun accredito, ciclo stimato sul giorno fisso", () => {
    const { data, fromVersion } = migrate(null, NOW);
    assert.equal(fromVersion, null);
    assert.equal(data.version, SCHEMA_VERSION);
    assert.deepEqual(data.settings.payrollPayments, []);
    const fin = computeFinancials(data, NOW);
    assert.equal(fin.cycle.startStr, "2026-11-28");
    assert.equal(fin.baseIncome, 0);
    assert.equal(data.categories.length, 8);
    assert.deepEqual(data.quarantine, []);
  });

  test("v3 → ultima versione conserva tutti i dati e i calcoli", () => {
    const before = richData();
    const { data, fromVersion, migrated, rejected } = migrate(structuredClone(before), NOW);
    assert.equal(fromVersion, 3);
    assert.ok(migrated);
    assert.equal(rejected, 0);
    assert.equal(data.version, SCHEMA_VERSION);
    assert.deepEqual(data.transactions, before.transactions);
    assert.deepEqual(data.recurring, before.recurring);
    assert.deepEqual(data.goals, before.goals);
    assert.deepEqual(data.settings.payrollPayments, before.settings.payrollPayments);
    const a = computeFinancials(before, NOW), b = computeFinancials(data, NOW);
    for (const k of ["availableCents", "dailyBudgetCents", "risparmiCents", "debitoCents", "differenzaRitmoCents"]) assert.equal(b[k], a[k], k);
  });

  test("è idempotente", () => {
    const once = migrate(richData(), NOW).data;
    const twice = migrate(structuredClone(once), NOW);
    assert.deepEqual(twice.data, once);
    assert.equal(twice.migrated, false);
    assert.equal(twice.rejected, 0);
  });

  test("v2: lo stipendio mensile diventa un accredito", () => {
    const { data, fromVersion } = migrate({ settings: { salaryDay: 27, monthlyIncomeCents: 140000 }, transactions: [], recurring: [], goals: [] }, NOW);
    assert.equal(fromVersion, 2);
    assert.deepEqual(data.settings.payrollPayments, [{ date: "2026-11-27", amountCents: 140000 }]);
  });

  test("le parti mancanti prendono i valori predefiniti", () => {
    const { data } = migrate({ version: 3, settings: {} }, NOW);
    assert.equal(data.recurring[0].id, "rec_auto");
    assert.equal(data.goals[0].id, "goal_pac");
    assert.deepEqual(data.transactions, []);
    assert.equal(data.settings.theme, "auto");
  });

  test("i record non validi vanno in quarantena, non vengono persi", () => {
    const d = richData();
    d.transactions.push({ id: "bad1", type: "expense", amountCents: "abc", date: "2026-11-28" });
    d.transactions.push({ id: "bad2", type: "expense", amountCents: 100, date: "28/11/2026" });
    d.transactions.push(null);
    d.recurring.push({ id: "r", amountCents: -5 });
    const { data, rejected } = migrate(d, NOW);
    assert.equal(rejected, 4);
    assert.equal(data.transactions.length, 9);
    assert.deepEqual(data.quarantine.map((q) => [q.kind, q.record?.id ?? null]), [["transaction", "bad1"], ["transaction", "bad2"], ["transaction", null], ["recurring", "r"]]);
  });

  test("importi salvati come stringa o con decimali vengono resi interi", () => {
    const d = richData();
    d.transactions = [{ ...tx("s", "2026-11-28", 0), amountCents: "1250" }, { ...tx("f", "2026-11-28", 0), amountCents: 99.6 }];
    const { data } = migrate(d, NOW);
    assert.deepEqual(data.transactions.map((t) => t.amountCents), [1250, 100]);
  });

  test("valori sconosciuti tornano a quelli che l'app usava già", () => {
    const d = richData();
    d.recurring[0].frequency = "weekly";
    d.settings.theme = "neon";
    const { data } = migrate(d, NOW);
    assert.equal(data.recurring[0].frequency, "monthly");
    assert.equal(data.settings.theme, "auto");
  });

  test("dati di una versione futura non vengono retrocessi", () => {
    const { data, migrated } = migrate({ ...richData(), version: 9 }, NOW);
    assert.equal(data.version, 9);
    assert.equal(migrated, false);
  });

  test("normalize conserva i campi sconosciuti", () => {
    const d = { ...createInitialData(), extra: { a: 1 } };
    d.transactions = [{ ...tx("t", "2026-11-28", 100), tag: "x" }];
    const out = normalize(d);
    assert.deepEqual(out.extra, { a: 1 });
    assert.equal(out.transactions[0].tag, "x");
  });
});

describe("accredito fittizio del primo avvio (v4 → v5)", () => {
  /* dati come li lasciava la v4: accredito a zero il 28, stipendio vero registrato il 27 */
  const v4 = (realDate, extra = {}) => ({
    version: 4,
    settings: {
      salaryDay: 28, monthlyIncomeCents: 0, monthlySalaries: { "2026-11-28": 0 },
      payrollPayments: [{ date: "2026-11-28", amountCents: 0 }, { date: realDate, amountCents: 180050 }].sort((a, b) => a.date.localeCompare(b.date)),
      ...extra
    },
    transactions: [tx("t", "2026-11-28", 2550)],
    recurring: [{ id: "r", amountCents: 25000, frequency: "monthly", day: 15, categoryId: "auto" }],
    goals: [{ id: "g", monthlyCents: 20000 }],
    cycleSnapshots: []
  });

  test("stipendio registrato il giorno prima: il ciclo parte dal vero accredito", () => {
    const before = v4("2026-11-27");
    before.cycleSnapshots = [{ startDate: "2026-11-27", endDate: "2026-11-27", balanceCents: 135050 }];
    const old = computeFinancials(before, NOW);
    assert.equal(old.baseIncome, 0);
    const { data } = migrate(before, NOW);
    assert.deepEqual(data.settings.payrollPayments, [{ date: "2026-11-27", amountCents: 180050 }]);
    assert.deepEqual(data.cycleSnapshots, []);
    const fin = computeFinancials(data, NOW);
    assert.equal(fin.cycle.startStr, "2026-11-27");
    assert.equal(fin.baseIncome, 180050);
    assert.equal(fin.risparmiCents, 0);
    assert.equal(fin.availableCents, 180050 - 25000 - 20000 - 2550);
  });

  test("stipendio registrato dopo: sparisce il ciclo a zero che creava debito", () => {
    const before = v4("2026-12-01");
    const at = new Date(2026, 11, 2);
    assert.ok(computeFinancials(before, at).debitoCents > 0);
    const { data } = migrate(before, at);
    assert.equal(computeFinancials(data, at).debitoCents, 0);
  });

  test("non tocca un accredito a zero che non ha la firma del primo avvio", () => {
    const keep = (d) => migrate(d, NOW).data.settings.payrollPayments.length;
    assert.equal(keep(v4("2026-11-27", { monthlySalaries: {} })), 2);
    assert.equal(keep(v4("2026-11-27", { monthlyIncomeCents: 150000 })), 2);
    assert.equal(keep(v4("2026-06-27")), 2);
    const two = v4("2026-11-27");
    two.settings.payrollPayments.push({ date: "2026-12-28", amountCents: 0 });
    two.settings.monthlySalaries["2026-12-28"] = 0;
    assert.equal(keep(two), 3);
  });

  test("dati già in v5 non vengono più toccati", () => {
    const d = { ...v4("2026-11-27"), version: 5 };
    assert.equal(migrate(d, NOW).data.settings.payrollPayments.length, 2);
  });

  test("lo stipendio salvato dopo il primo avvio è l'unico accredito", () => {
    const s = new Store({ storage: memoryStorage(), now: () => NOW });
    s.upsertPayrollPayment({ date: "2026-11-27", amountCents: 180050 });
    assert.equal(computeFinancials(s.data, NOW).baseIncome, 180050);
  });
});

describe("validazione", () => {
  test("importi digitati", () => {
    assert.deepEqual(parseAmountInput("12,50"), { cents: 1250, error: null });
    assert.equal(parseAmountInput("0").error, "Inserisci un importo maggiore di zero");
    assert.equal(parseAmountInput("0", { allowZero: true }).error, null);
    assert.equal(parseAmountInput("").error, "Inserisci un importo valido");
    assert.equal(parseAmountInput("-5").error, "Inserisci un importo valido");
    assert.match(parseAmountInput("99999999").error, /massimo/);
  });

  test("forma del backup", () => {
    assert.equal(checkBackupShape({ settings: {}, transactions: [], recurring: [], goals: [] }), null);
    assert.ok(checkBackupShape(null));
    assert.ok(checkBackupShape([]));
    assert.ok(checkBackupShape({ settings: {}, transactions: {}, recurring: [], goals: [] }));
    assert.ok(checkBackupShape({ transactions: [], recurring: [], goals: [] }));
  });

  test("movimento", () => {
    assert.ok(checkTransaction(tx("a", "2026-11-28", 100)).value);
    assert.equal(checkTransaction({ ...tx("a", "2026-11-28", 100), type: "transfer" }).error, "tipo non valido");
    assert.equal(checkTransaction(tx("a", "2026-11-28", 0)).error, "importo non valido");
    assert.equal(checkTransaction({ ...tx("", "2026-11-28", 100), categoryId: undefined }, 7).value.id, "tx_mig_7");
  });
});

describe("Store", () => {
  test("primo avvio: non scrive nulla finché l'utente non agisce", () => {
    const storage = memoryStorage();
    const s = new Store({ storage, now: () => NOW });
    assert.equal(s.data.version, SCHEMA_VERSION);
    assert.equal(storage.getItem(STORAGE_KEY), null);
  });

  test("migra, salva e conserva una copia grezza della versione precedente", () => {
    const raw = JSON.stringify(richData());
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    const s = new Store({ storage, now: () => NOW });
    assert.equal(JSON.parse(storage.getItem(STORAGE_KEY)).version, SCHEMA_VERSION);
    assert.equal(storage.getItem(PREMIGRATION_PREFIX + "3"), raw);
    assert.equal(s.data.transactions.length, 9);
  });

  test("legge le vecchie chiavi v1/v2", () => {
    const storage = memoryStorage({ finanze_pwa_data_v2: JSON.stringify({ settings: { monthlyIncomeCents: 1000 }, transactions: [tx("l", "2026-11-20", 5)], recurring: [], goals: [] }) });
    const s = new Store({ storage, now: () => NOW });
    assert.equal(s.data.transactions[0].id, "l");
    assert.ok(storage.getItem(STORAGE_KEY));
  });

  test("JSON danneggiato: riparte dai valori iniziali ma conserva l'originale", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: "{rotto" });
    const s = new Store({ storage, now: () => NOW });
    assert.equal(s.data.transactions.length, 0);
    assert.equal(storage.getItem(PREMIGRATION_PREFIX + "corrupt"), "{rotto");
  });

  test("movimenti: aggiunta, modifica, eliminazione e annullamento", () => {
    const s = new Store({ storage: memoryStorage(), now: () => NOW });
    s.addTx(tx("1", "2026-11-28", 100));
    s.addTx(tx("2", "2026-11-28", 200));
    s.updateTx({ ...s.findTx("1"), amountCents: 150 });
    const res = s.removeTx("1");
    assert.equal(s.data.transactions.length, 1);
    s.restoreTx(res);
    assert.deepEqual(s.data.transactions.map((t) => [t.id, t.amountCents]), [["2", 200], ["1", 150]]);
    assert.equal(s.removeTx("nope"), null);
  });

  test("accredito: inserisce o sostituisce per data e chiude i cicli", () => {
    const s = new Store({ storage: memoryStorage(), now: () => NOW });
    s.upsertPayrollPayment({ date: "2026-10-27", amountCents: 100 });
    s.upsertPayrollPayment({ date: "2026-10-27", amountCents: 200 });
    s.upsertPayrollPayment({ date: "2026-11-27", amountCents: 300 });
    assert.deepEqual(s.data.settings.payrollPayments, [{ date: "2026-10-27", amountCents: 200 }, { date: "2026-11-27", amountCents: 300 }]);
    assert.ok(s.closeElapsedCycles());
    assert.equal(s.data.cycleSnapshots.length, 1);
    assert.equal(s.closeElapsedCycles(), false);
  });

  test("spazio pieno: segnala l'errore senza lanciare eccezioni", () => {
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error("QuotaExceededError"); };
    let reported = 0;
    const s = new Store({ storage, now: () => NOW, onSaveError: () => reported++ });
    assert.equal(s.save(), false);
    assert.equal(reported, 1);
  });

  test("import: rifiuta file non validi, migra quelli buoni", () => {
    assert.equal(Store.prepareImport("{", NOW).ok, false);
    assert.equal(Store.prepareImport(JSON.stringify({ a: 1 }), NOW).ok, false);
    assert.equal(Store.prepareImport("x".repeat(6 * 1024 * 1024), NOW).ok, false);
    const r = Store.prepareImport(JSON.stringify(richData()), NOW);
    assert.equal(r.ok, true);
    assert.equal(r.count, 9);
    assert.equal(r.data.version, SCHEMA_VERSION);
  });

  test("export e azzeramento", () => {
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(richData()), finanze_pwa_data_v1: "{}" });
    const s = new Store({ storage, now: () => NOW });
    assert.equal(JSON.parse(s.exportJson()).transactions.length, 9);
    assert.ok(s.data.settings.lastBackupDate);
    s.clearAll();
    assert.deepEqual(storage.dump(), {});
  });
});

describe("service worker", () => {
  test("mette in cache ogni file JS e CSS dell'app", () => {
    const root = fileURLToPath(new URL("..", import.meta.url));
    const sw = readFileSync(join(root, "sw.js"), "utf8");
    const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : [join(dir, f)]));
    const files = [...walk(join(root, "js")), ...walk(join(root, "css"))].map((f) => "./" + relative(root, f).split("\\").join("/"));
    for (const f of [...files, "./index.html", "./manifest.json"]) assert.ok(sw.includes(`"${f}"`), `${f} manca da ASSETS in sw.js`);
  });
});
