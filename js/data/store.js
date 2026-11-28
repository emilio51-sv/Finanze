/**
 * Unico punto che legge e scrive localStorage. Lo storage e l'orologio sono iniettabili,
 * così il livello dati si può provare senza browser.
 */
import { STORAGE_KEY, LEGACY_KEYS, PREMIGRATION_PREFIX } from "./schema.js";
import { migrate } from "./migrate.js";
import { checkBackupShape, MAX_BACKUP_BYTES } from "./validate.js";
import { closeElapsedCycles } from "../core/budget.js";
import { getPayrollPayments } from "../core/cycle.js";

export class Store {
  /**
   * @param {{ storage?: Storage, now?: () => Date, onSaveError?: (e: Error) => void }} [opts]
   */
  constructor({ storage = globalThis.localStorage, now = () => new Date(), onSaveError = () => {} } = {}) {
    this.storage = storage;
    this.now = now;
    this.onSaveError = onSaveError;
    this.data = this.load();
  }

  load() {
    let raw = null;
    try {
      raw = this.storage.getItem(STORAGE_KEY);
      for (const k of LEGACY_KEYS) raw = raw || this.storage.getItem(k);
    } catch (e) { raw = null; }
    let parsed = null;
    try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = null; }
    if (raw && parsed === null) this.keepCopy("corrupt", raw);
    const { data, fromVersion, migrated, rejected } = migrate(parsed, this.now());
    if (raw && (migrated || rejected)) {
      this.keepCopy(fromVersion, raw);
      this.data = data;
      this.save();
    }
    return data;
  }

  /** Conserva una sola volta il documento grezzo prima di trasformarlo. */
  keepCopy(tag, raw) {
    try {
      const key = PREMIGRATION_PREFIX + tag;
      if (!this.storage.getItem(key)) this.storage.setItem(key, raw);
    } catch (e) { /* spazio pieno: la migrazione procede comunque */ }
  }

  /** @returns {boolean} vero se il salvataggio è riuscito */
  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      return true;
    } catch (e) {
      this.onSaveError(e);
      return false;
    }
  }

  /* ---------- movimenti ---------- */
  addTx(tx) { this.data.transactions.unshift(tx); this.save(); }
  updateTx(tx) {
    const idx = this.data.transactions.findIndex((t) => t.id === tx.id);
    if (idx !== -1) { this.data.transactions[idx] = tx; this.save(); }
  }
  removeTx(id) {
    const idx = this.data.transactions.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const removed = this.data.transactions.splice(idx, 1)[0];
    this.save();
    return { removed, idx };
  }
  /** Annulla una removeTx rimettendo il movimento nella posizione originale. */
  restoreTx({ removed, idx }) {
    this.data.transactions.splice(Math.min(idx, this.data.transactions.length), 0, removed);
    this.save();
  }
  findTx(id) { return this.data.transactions.find((t) => t.id === id) || null; }

  /* ---------- spese fisse e PAC ---------- */
  upsert(listName, item) {
    const list = this.data[listName];
    const idx = list.findIndex((x) => x.id === item.id);
    if (idx !== -1) list[idx] = item; else list.push(item);
    this.save();
  }
  remove(listName, id) {
    this.data[listName] = this.data[listName].filter((x) => x.id !== id);
    this.save();
  }

  /* ---------- parametri ---------- */
  setSetting(key, value) { this.data.settings[key] = value; this.save(); }

  /** Registra (o sostituisce, se la data esiste) un accredito di stipendio. */
  upsertPayrollPayment(payment) {
    const payments = getPayrollPayments(this.data.settings);
    const i = payments.findIndex((p) => p.date === payment.date);
    if (i >= 0) payments[i] = payment; else payments.push(payment);
    this.data.settings.payrollPayments = payments.sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Congela i cicli conclusi fino a oggi. @returns {boolean} vero se ha aggiunto fotografie */
  closeElapsedCycles() {
    const { snapshots, changed } = closeElapsedCycles(this.data, this.now());
    if (changed) { this.data.cycleSnapshots = snapshots; this.save(); }
    return changed;
  }

  /* ---------- backup ---------- */
  exportJson() {
    this.data.settings.lastBackupDate = this.now().toISOString();
    this.save();
    return JSON.stringify(this.data, null, 2);
  }

  /**
   * Prepara l'import di un backup senza toccare i dati attuali.
   * @returns {{ ok: true, data: object, count: number, rejected: number } | { ok: false, error: string }}
   */
  static prepareImport(text, now) {
    if (typeof text !== "string" || text.length > MAX_BACKUP_BYTES) return { ok: false, error: "File troppo grande per essere un backup di Finanze" };
    let d;
    try { d = JSON.parse(text); } catch (e) { return { ok: false, error: "File non valido: non è un backup di Finanze" }; }
    const shapeError = checkBackupShape(d);
    if (shapeError) return { ok: false, error: shapeError };
    const { data, rejected } = migrate(d, now);
    return { ok: true, data, count: data.transactions.length, rejected };
  }

  /** Sostituisce tutti i dati (dopo prepareImport e la conferma dell'utente). */
  replaceAll(data) {
    this.data = data;
    return this.save();
  }

  /** Elimina tutti i dati salvati, comprese le copie pre-migrazione. */
  clearAll() {
    const keys = [STORAGE_KEY, ...LEGACY_KEYS];
    try {
      for (let i = 0; i < this.storage.length; i++) {
        const k = this.storage.key(i);
        if (k && k.startsWith(PREMIGRATION_PREFIX)) keys.push(k);
      }
      keys.forEach((k) => this.storage.removeItem(k));
    } catch (e) { /* nulla da fare */ }
  }
}


