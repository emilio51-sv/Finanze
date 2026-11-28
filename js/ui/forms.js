/** Fogli di inserimento: movimento (con voce), spesa fissa, piano di accumulo. */
import { $, $$, escapeHtml } from "./dom.js";
import { ctx } from "./context.js";
import { ICONS, catColor } from "./icons.js";
import { openSheet, closeAllModals, onSheetsClosed } from "./sheets.js";
import { formatValuta, centsToInput } from "../core/money.js";
import { toLocalDateString } from "../core/dates.js";
import { monthlyShare } from "../core/budget.js";
import { parseItalianSpokenAmount } from "../core/voice.js";
import { parseAmountInput } from "../data/validate.js";

const newId = (prefix) => (window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${prefix}_${Date.now()}`);

/* =========================================================
   MOVIMENTO
   ========================================================= */
const txAmountInput = () => $("#tx-amount");

function fitTxAmountInput() {
  const input = txAmountInput();
  input.style.width = `${Math.max(1, input.value.length || 1) + 0.4}ch`;
}
function clearAmountError() {
  $("#amount-box").classList.remove("is-error");
  txAmountInput().removeAttribute("aria-invalid");
  $("#tx-amount-error").textContent = "";
}
function showAmountError(message) {
  const box = $("#amount-box");
  box.classList.remove("is-error"); void box.offsetWidth;
  box.classList.add("is-error");
  txAmountInput().setAttribute("aria-invalid", "true");
  $("#tx-amount-error").textContent = message;
  txAmountInput().focus();
}

function syncTxTitle() {
  if ($("#tx-edit-id").value) return;
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  $("#modal-tx-title").textContent = type === "income" ? "Nuova entrata extra" : "Nuova uscita";
}

export function openTxModal(tx = null) {
  clearAmountError();
  const delBtn = $("#btn-delete-tx");
  if (tx) {
    $("#modal-tx-title").textContent = "Modifica movimento";
    $("#tx-edit-id").value = tx.id;
    txAmountInput().value = centsToInput(tx.amountCents);
    $("#tx-date").value = tx.date;
    $("#tx-note").value = tx.note || "";
    delBtn.classList.remove("hidden");
    const rad = document.querySelector(`input[name="tx-type"][value="${tx.type}"]`);
    if (rad) rad.checked = true;
    const catRad = $$('input[name="tx-category"]').find((r) => r.value === tx.categoryId);
    if (catRad) catRad.checked = true;
  } else {
    $("#tx-edit-id").value = "";
    txAmountInput().value = "";
    $("#tx-date").value = toLocalDateString(new Date());
    $("#tx-note").value = "";
    delBtn.classList.add("hidden");
    const exp = document.querySelector('input[name="tx-type"][value="expense"]');
    if (exp) exp.checked = true;
    syncTxTitle();
  }
  $("#voice-status").textContent = "Dì l’importo, per esempio “venticinque e cinquanta”";
  fitTxAmountInput();
  openSheet($("#modal-add"));
  if (!tx) setTimeout(() => txAmountInput().focus(), 140);
}

function submitTx(e) {
  e.preventDefault();
  const { store, actions } = ctx;
  const { cents, error } = parseAmountInput(txAmountInput().value);
  if (error) { showAmountError(error === "Inserisci un importo valido" ? "Inserisci un importo maggiore di zero" : error); return; }
  const editId = $("#tx-edit-id").value;
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const isQuick = Boolean(store.data.settings.quickMode);
  const categoryId = isQuick ? "varie" : (document.querySelector('input[name="tx-category"]:checked')?.value || "varie");
  const existing = editId ? store.findTx(editId) : null;
  const txData = {
    id: editId || newId("tx"),
    type,
    amountCents: cents,
    categoryId: (isQuick && existing) ? existing.categoryId : categoryId,
    date: $("#tx-date").value || toLocalDateString(new Date()),
    note: $("#tx-note").value.trim(),
    createdAt: existing?.createdAt || Date.now()
  };
  if (editId) {
    store.updateTx(txData);
    actions.showToast("Movimento aggiornato");
  } else {
    store.addTx(txData);
    actions.showToast(`${type === "expense" ? "Spesa" : "Entrata"} di ${formatValuta(cents)} registrata`, () => {
      store.removeTx(txData.id);
      actions.renderAll();
    });
  }
  try { navigator.vibrate && navigator.vibrate(10); } catch (err) { /* non supportato */ }
  closeAllModals();
  actions.renderAll();
}

function deleteTx() {
  const { store, actions } = ctx;
  const id = $("#tx-edit-id").value;
  const res = id && store.removeTx(id);
  if (!res) return;
  closeAllModals();
  actions.renderAll();
  actions.showToast("Movimento eliminato", () => {
    store.restoreTx(res);
    actions.renderAll();
  });
}

/* ---------- voce ---------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

function stopVoice() {
  if (recognition) { try { recognition.abort(); } catch (e) { /* già fermo */ } recognition = null; }
  $("#voice-input-btn").classList.remove("listening");
}

function toggleVoice() {
  const voiceBtn = $("#voice-input-btn");
  const voiceStatus = $("#voice-status");
  if (!SpeechRecognition) { voiceStatus.textContent = "Il riconoscimento vocale non è disponibile in questo browser."; return; }
  if (recognition) { stopVoice(); return; }
  recognition = new SpeechRecognition();
  recognition.lang = "it-IT";
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;
  voiceBtn.classList.add("listening");
  voiceStatus.textContent = "Sto ascoltando…";
  recognition.onresult = (event) => {
    const alts = Array.from(event.results[0]);
    let amount = "";
    for (const a of alts) { amount = parseItalianSpokenAmount(a.transcript); if (amount) break; }
    if (amount) {
      txAmountInput().value = amount;
      fitTxAmountInput();
      clearAmountError();
      voiceStatus.textContent = `Rilevato: ${amount} €`;
    } else {
      voiceStatus.textContent = `Non ho capito l’importo (“${alts[0].transcript}”). Riprova.`;
    }
  };
  recognition.onerror = () => { voiceStatus.textContent = "Non sono riuscito a riconoscere l’importo. Riprova."; };
  recognition.onend = () => { voiceBtn.classList.remove("listening"); recognition = null; };
  try { recognition.start(); } catch (e) { stopVoice(); }
}

/** Categorie nel foglio movimento e nel filtro di "Movimenti". */
function initCategoryChips() {
  const container = $("#category-chips-list");
  const filterSelect = $("#select-category-filter");
  container.innerHTML = "";
  ctx.store.data.categories.forEach((cat, index) => {
    const label = document.createElement("label");
    label.className = "cat-opt";
    label.style.setProperty("--c", catColor(cat.key));
    label.innerHTML = `<input type="radio" name="tx-category" value="${escapeHtml(cat.id)}" ${index === 0 ? "checked" : ""}><span>${ICONS[cat.key] || ICONS.varie}<em>${escapeHtml(cat.nome)}</em></span>`;
    container.appendChild(label);
    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.nome;
    filterSelect.appendChild(opt);
  });
}

/* =========================================================
   SPESA FISSA
   ========================================================= */
function updateRecHint() {
  const { cents, error } = parseAmountInput($("#rec-amount").value);
  const f = $("#rec-frequency").value;
  $("#rec-monthly-hint").textContent = !error && f !== "monthly" ? `Accantonamento mensile: ${formatValuta(monthlyShare({ amountCents: cents, frequency: f }))}` : "";
}

export function openRecurringModal(rec = null) {
  const delBtn = $("#btn-delete-recurring");
  const catSelect = $("#rec-category");
  catSelect.innerHTML = ctx.store.data.categories.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nome)}</option>`).join("");
  $$("#form-recurring .field").forEach((f) => f.classList.remove("is-error"));
  if (rec) {
    $("#modal-recurring-title").textContent = "Modifica spesa fissa";
    $("#rec-edit-id").value = rec.id;
    $("#rec-name").value = rec.name;
    $("#rec-amount").value = centsToInput(rec.amountCents);
    $("#rec-frequency").value = rec.frequency;
    $("#rec-day").value = rec.day;
    catSelect.value = rec.categoryId;
    delBtn.classList.remove("hidden");
  } else {
    $("#modal-recurring-title").textContent = "Nuova spesa fissa";
    $("#rec-edit-id").value = "";
    $("#rec-name").value = "";
    $("#rec-amount").value = "";
    $("#rec-frequency").value = "monthly";
    $("#rec-day").value = 15;
    delBtn.classList.add("hidden");
  }
  updateRecHint();
  openSheet($("#modal-recurring"));
  if (!rec) setTimeout(() => $("#rec-name").focus(), 140);
}

function submitRecurring(e) {
  e.preventDefault();
  const { store, actions } = ctx;
  const editId = $("#rec-edit-id").value;
  const name = $("#rec-name").value.trim();
  const { cents, error } = parseAmountInput($("#rec-amount").value);
  $("#rec-name").parentElement.classList.toggle("is-error", !name);
  $("#rec-amount").parentElement.classList.toggle("is-error", Boolean(error));
  if (!name || error) return;
  const prev = editId ? store.data.recurring.find((r) => r.id === editId) : null;
  store.upsert("recurring", {
    id: editId || `rec_${Date.now()}`,
    name,
    amountCents: cents,
    frequency: $("#rec-frequency").value,
    day: Math.min(31, Math.max(1, parseInt($("#rec-day").value, 10) || 15)),
    categoryId: $("#rec-category").value,
    active: prev ? prev.active !== false : true
  });
  closeAllModals();
  actions.renderAll();
  actions.showToast(editId ? "Spesa fissa aggiornata" : "Spesa fissa aggiunta");
}

function deleteRecurring() {
  const id = $("#rec-edit-id").value;
  if (id && confirm("Eliminare questa spesa fissa?")) {
    ctx.store.remove("recurring", id);
    closeAllModals();
    ctx.actions.renderAll();
  }
}

/* =========================================================
   PIANO DI ACCUMULO
   ========================================================= */
export function openGoalModal(goal = null) {
  const delBtn = $("#btn-delete-goal");
  $$("#form-goal .field").forEach((f) => f.classList.remove("is-error"));
  if (goal) {
    $("#modal-goal-title").textContent = "Modifica piano";
    $("#goal-edit-id").value = goal.id;
    $("#goal-name").value = goal.name;
    $("#goal-monthly").value = centsToInput(goal.monthlyCents || 0);
    $("#goal-current").value = centsToInput(goal.currentCents || 0);
    $("#goal-target").value = goal.targetCents ? centsToInput(goal.targetCents) : "";
    delBtn.classList.remove("hidden");
  } else {
    $("#modal-goal-title").textContent = "Nuovo piano di accumulo";
    $("#goal-edit-id").value = "";
    $("#goal-name").value = "";
    $("#goal-monthly").value = "";
    $("#goal-current").value = "";
    $("#goal-target").value = "";
    delBtn.classList.add("hidden");
  }
  openSheet($("#modal-goal"));
  if (!goal) setTimeout(() => $("#goal-name").focus(), 140);
}

/** Campo facoltativo: vuoto o non valido vale zero; oltre il limite è un errore. */
function optionalCents(input) {
  const { cents, error } = parseAmountInput(input.value, { allowZero: true });
  const tooBig = Boolean(error) && cents > 0;
  input.parentElement.classList.toggle("is-error", tooBig);
  return { cents: error ? 0 : cents, tooBig };
}

function submitGoal(e) {
  e.preventDefault();
  const { store, actions } = ctx;
  const editId = $("#goal-edit-id").value;
  const name = $("#goal-name").value.trim();
  const monthly = parseAmountInput($("#goal-monthly").value);
  $("#goal-name").parentElement.classList.toggle("is-error", !name);
  $("#goal-monthly").parentElement.classList.toggle("is-error", Boolean(monthly.error));
  const current = optionalCents($("#goal-current"));
  const target = optionalCents($("#goal-target"));
  if (!name || monthly.error || current.tooBig || target.tooBig) return;
  store.upsert("goals", {
    id: editId || `goal_${Date.now()}`,
    name,
    monthlyCents: monthly.cents,
    currentCents: current.cents,
    targetCents: target.cents
  });
  closeAllModals();
  actions.renderAll();
  actions.showToast(editId ? "Piano aggiornato" : "Piano aggiunto");
}

function deleteGoal() {
  const id = $("#goal-edit-id").value;
  if (id && confirm("Eliminare questo piano?")) {
    ctx.store.remove("goals", id);
    closeAllModals();
    ctx.actions.renderAll();
  }
}

export function initForms() {
  initCategoryChips();
  onSheetsClosed(stopVoice);

  txAmountInput().addEventListener("input", () => { fitTxAmountInput(); clearAmountError(); });
  $$('input[name="tx-type"]').forEach((r) => r.addEventListener("change", syncTxTitle));
  $("#btn-open-modal").addEventListener("click", () => openTxModal(null));
  $("#utility-add").addEventListener("click", () => openTxModal(null));
  $("#form-add-transaction").addEventListener("submit", submitTx);
  $("#btn-delete-tx").addEventListener("click", deleteTx);
  $("#voice-input-btn").addEventListener("click", toggleVoice);

  $("#rec-amount").addEventListener("input", updateRecHint);
  $("#rec-frequency").addEventListener("change", updateRecHint);
  $("#btn-open-recurring-modal").addEventListener("click", () => openRecurringModal(null));
  $("#form-recurring").addEventListener("submit", submitRecurring);
  $("#btn-delete-recurring").addEventListener("click", deleteRecurring);

  $("#btn-open-goal-modal").addEventListener("click", () => openGoalModal(null));
  $("#form-goal").addEventListener("submit", submitGoal);
  $("#btn-delete-goal").addEventListener("click", deleteGoal);
}
