
/**
 * FINANZE APP - FASE 1
 * Logica finanziaria: ciclo dal giorno 28 del mese corrente al 27 del successivo.
 * Formattazione valuta: Intl.NumberFormat it-IT.
 * Data locale: YYYY-MM-DD senza toISOString per evitare errori di fuso su iOS.
 */

// --- 1. STATO INIZIALE & COSTANTI ---
const STORAGE_KEY = "finanze_pwa_data_v1";

const DEFAULT_CATEGORIES = [
  { id: "carburante", nome: "Carburante", icona: "⛽" },
  { id: "auto", nome: "Auto & Manut.", icona: "🚗" },
  { id: "svago", nome: "Uscite & Svago", icona: "🍕" },
  { id: "shopping", nome: "Shopping", icona: "🛍" },
  { id: "abbonamenti", nome: "Abbonamenti", icona: "📱" },
  { id: "salute", nome: "Salute & Sport", icona: "💊" },
  { id: "lavoro", nome: "Lavoro", icona: "💼" },
  { id: "varie", nome: "Varie", icona: "📦" }
];

const INITIAL_DATA = {
  version: 1,
  settings: {
    salaryDay: 28, // Giorno di accredito stipendio
    monthlyIncomeCents: 180000, // Esempio base: 1.800,00 € (in centesimi)
    pacTargetCents: 20000,      // Esempio base PAC: 200,00 €
    fixedExpensesCents: 25000   // Esempio rata/quota fissa auto: 250,00 €
  },
  categories: DEFAULT_CATEGORIES,
  transactions: []
};

// --- 2. FUNZIONI DI UTILITÀ (PURE) ---
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>'"]/g, tag => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[tag] || tag));
}

function formatValuta(centesimi) {
  const euro = (centesimi || 0) / 100;
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format(euro);
}

/**
 * Restituisce "YYYY-MM-DD" in ORA LOCALE evitando disallineamenti UTC.
 */
function toLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseLocalDateString(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Calcola l'intervallo del ciclo finanziario per una data specifica.
 * Se lo stipendio è il giorno 28:
 * - Dal 28 Gennaio al 27 Febbraio = Ciclo Gennaio (inizio 28 Gennaio).
 */
function getCycleRange(referenceDate, salaryDay = 28) {
  const currentDay = referenceDate.getDate();
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();

  let startYear = year;
  let startMonth = month;

  if (currentDay < salaryDay) {
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  const startDate = new Date(startYear, startMonth, salaryDay);

  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }
  const endDate = new Date(endYear, endMonth, salaryDay - 1);

  return {
    start: startDate,
    end: endDate,
    startStr: toLocalDateString(startDate),
    endStr: toLocalDateString(endDate)
  };
}

/**
 * Calcola quanti giorni totali ha il ciclo e quanti ne rimangono incluso oggi.
 */
function getDaysMetrics(cycle, today) {
  const oneDay = 1000 * 60 * 60 * 24;
  const startMs = cycle.start.getTime();
  const endMs = cycle.end.getTime();
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  const totalDays = Math.round((endMs - startMs) / oneDay) + 1;
  const daysPassed = Math.max(1, Math.round((todayMs - startMs) / oneDay) + 1);
  const daysRemaining = Math.max(1, Math.round((endMs - todayMs) / oneDay) + 1);

  return { totalDays, daysPassed, daysRemaining };
}

// --- 3. STORE E GESTIONE DATI ---
class Store {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return INITIAL_DATA;
      const parsed = JSON.parse(raw);
      return { ...INITIAL_DATA, ...parsed, settings: { ...INITIAL_DATA.settings, ...(parsed.settings || {}) } };
    } catch (e) {
      console.error("Errore lettura dati da localStorage", e);
      return INITIAL_DATA;
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error("Impossibile salvare i dati:", e);
    }
  }

  addTransaction(tx) {
    this.data.transactions.unshift(tx);
    this.save();
  }

  removeTransaction(id) {
    const idx = this.data.transactions.findIndex(t => t.id === id);
    if (idx !== -1) {
      const removed = this.data.transactions.splice(idx, 1)[0];
      this.save();
      return removed;
    }
    return null;
  }
}

const store = new Store();

// --- 4. CALCOLI FINANZIARI PURI ---
function computeFinancials(storeData, now = new Date()) {
  const salaryDay = storeData.settings.salaryDay || 28;
  const cycle = getCycleRange(now, salaryDay);
  const { totalDays, daysPassed, daysRemaining } = getDaysMetrics(cycle, now);

  // Filtra transazioni del ciclo corrente
  const cycleTx = storeData.transactions.filter(t => {
    return t.date >= cycle.startStr && t.date <= cycle.endStr;
  });

  const extraIncomeCents = cycleTx
    .filter(t => t.type === "income")
    .reduce((acc, t) => acc + t.amountCents, 0);

  const variableExpensesCents = cycleTx
    .filter(t => t.type === "expense")
    .reduce((acc, t) => acc + t.amountCents, 0);

  const baseIncome = storeData.settings.monthlyIncomeCents || 0;
  const pacCents = storeData.settings.pacTargetCents || 0;
  const fixedCents = storeData.settings.fixedExpensesCents || 0;

  // Formula Fondamentale:
  // Disponibile = (Entrata base + Extra) - PAC - Fisse - Variabili fatte
  const totalInflow = baseIncome + extraIncomeCents;
  const availableCents = totalInflow - pacCents - fixedCents - variableExpensesCents;

  // Budget giornaliero consigliato per i giorni che mancano
  const dailyBudgetCents = availableCents > 0 ? Math.floor(availableCents / daysRemaining) : 0;

  // Budget variabile totale pianificato
  const budgetVariabilePianificato = Math.max(0, totalInflow - pacCents - fixedCents);

  // Ritmo spesa: calcola la spesa media attesa fino ad oggi
  const spesaAttesaAdOggi = budgetVariabilePianificato > 0
    ? Math.round((budgetVariabilePianificato / totalDays) * daysPassed)
    : 0;

  const differenzaRitmoCents = spesaAttesaAdOggi - variableExpensesCents;

  return {
    cycle,
    totalDays,
    daysPassed,
    daysRemaining,
    baseIncome,
    extraIncomeCents,
    pacCents,
    fixedCents,
    variableExpensesCents,
    availableCents,
    dailyBudgetCents,
    budgetVariabilePianificato,
    differenzaRitmoCents,
    cycleTransactions: cycleTx
  };
}

// --- 5. CONTROLLER DI RENDERING ---
function renderHome() {
  const fin = computeFinancials(store.data, new Date());

  // Intestazione ciclo
  const options = { day: "numeric", month: "short" };
  const dStart = fin.cycle.start.toLocaleDateString("it-IT", options);
  const dEnd = fin.cycle.end.toLocaleDateString("it-IT", options);
  document.getElementById("label-periodo").textContent = `Ciclo 28 ${dStart} – ${dEnd}`;

  // Cifra Principale (Disponibile)
  const dispEl = document.getElementById("val-disponibile");
  dispEl.textContent = formatValuta(fin.availableCents);
  dispEl.className = "hero-amount " + (fin.availableCents >= 0 ? "positive" : "negative");

  // Testo di stato
  const heroSub = document.getElementById("hero-sub-text");
  if (fin.availableCents < 0) {
    heroSub.textContent = `Sei andato oltre il budget di ${formatValuta(Math.abs(fin.availableCents))}`;
    heroSub.className = "hero-sub negative";
  } else {
    heroSub.textContent = `Allocati per le spese variabili di questo ciclo`;
    heroSub.className = "hero-sub";
  }

  // Barra di avanzamento
  const percSpeso = fin.budgetVariabilePianificato > 0
    ? Math.min(100, Math.round((fin.variableExpensesCents / fin.budgetVariabilePianificato) * 100))
    : 100;
  const progressFill = document.getElementById("progress-fill");
  progressFill.style.width = `${percSpeso}%`;

  if (percSpeso >= 100) {
    progressFill.style.backgroundColor = "var(--color-negative)";
  } else if (percSpeso >= 80) {
    progressFill.style.backgroundColor = "var(--color-warning)";
  } else {
    progressFill.style.backgroundColor = "var(--color-positive)";
  }

  document.getElementById("progress-aria").setAttribute("aria-valuenow", percSpeso);
  document.getElementById("label-speso-mese").textContent = `Speso: ${formatValuta(fin.variableExpensesCents)}`;
  document.getElementById("label-perc-speso").textContent = `${percSpeso}%`;

  // Budget oggi e ritmo
  document.getElementById("val-budget-oggi").textContent = formatValuta(fin.dailyBudgetCents);
  document.getElementById("val-giorni-rimasti").textContent = `${fin.daysRemaining} giorni rimasti`;

  const ritmoValEl = document.getElementById("val-ritmo-spesa");
  const ritmoSubEl = document.getElementById("val-ritmo-dettaglio");

  if (fin.differenzaRitmoCents >= 0) {
    ritmoValEl.textContent = `+${formatValuta(fin.differenzaRitmoCents)}`;
    ritmoValEl.className = "metric-value font-sm positive";
    ritmoSubEl.textContent = "in anticipo su target";
  } else {
    ritmoValEl.textContent = `-${formatValuta(Math.abs(fin.differenzaRitmoCents))}`;
    ritmoValEl.className = "metric-value font-sm negative";
    ritmoSubEl.textContent = "sopra la media attesa";
  }

  // Riepilogo Card
  document.getElementById("val-sum-entrate").textContent = formatValuta(fin.baseIncome + fin.extraIncomeCents);
  document.getElementById("val-sum-pac").textContent = formatValuta(fin.pacCents);
  document.getElementById("val-sum-fisse").textContent = formatValuta(fin.fixedCents);
  document.getElementById("val-sum-variabili").textContent = formatValuta(fin.variableExpensesCents);

  // Ultimi movimenti (max 5)
  renderRecentTransactions(store.data.transactions.slice(0, 5));
}

function renderRecentTransactions(recentList) {
  const container = document.getElementById("recent-transactions-list");
  const emptyState = document.getElementById("recent-empty-state");
  const badge = document.getElementById("badge-totale-movimenti");

  container.innerHTML = "";
  badge.textContent = `${store.data.transactions.length} totali`;

  if (!recentList || recentList.length === 0) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  recentList.forEach(tx => {
    const li = document.createElement("li");
    li.className = "tx-item";

    const cat = store.data.categories.find(c => c.id === tx.categoryId) || { nome: "Spesa", icona: "💸" };
    const isIncome = tx.type === "income";

    const sign = isIncome ? "+" : "-";
    const amountClass = isIncome ? "positive" : "";

    const dateObj = parseLocalDateString(tx.date);
    const dateFormatted = dateObj.toLocaleDateString("it-IT", { day: "numeric", month: "short" });

    li.innerHTML = `
      <div class="tx-icon-wrap" aria-hidden="true">${escapeHtml(cat.icona)}</div>
      <div class="tx-details">
        <span class="tx-title">${escapeHtml(tx.note || cat.nome)}</span>
        <span class="tx-meta">${escapeHtml(cat.nome)} • ${dateFormatted}</span>
      </div>
      <span class="tx-amount ${amountClass}">${sign}${formatValuta(tx.amountCents)}</span>
    `;

    container.appendChild(li);
  });
}

function renderCategoryChips() {
  const container = document.getElementById("category-chips-list");
  container.innerHTML = "";

  store.data.categories.forEach((cat, index) => {
    const label = document.createElement("label");
    label.className = "chip-label";
    label.innerHTML = `
      <input type="radio" name="tx-category" value="${escapeHtml(cat.id)}" ${index === 0 ? "checked" : ""}>
      <div class="chip-content">
        <span class="chip-icon">${escapeHtml(cat.icona)}</span>
        <span class="chip-name">${escapeHtml(cat.nome)}</span>
      </div>
    `;
    container.appendChild(label);
  });
}

// --- 6. GESTIONE MODALE & INPUT RAPIDO ---
const modalBackdrop = document.getElementById("modal-backdrop");
const modalAdd = document.getElementById("modal-add");
const btnOpenModal = document.getElementById("btn-open-modal");
const btnCloseModal = document.getElementById("btn-modal-close");
const formAdd = document.getElementById("form-add-transaction");
const inputAmount = document.getElementById("tx-amount");
const inputDate = document.getElementById("tx-date");

function openModal() {
  modalBackdrop.classList.remove("hidden");
  modalAdd.classList.remove("hidden");
  modalBackdrop.setAttribute("aria-hidden", "false");

  // Data predefinita = Oggi
  inputDate.value = toLocalDateString(new Date());
  inputAmount.value = "";
  document.getElementById("tx-note").value = "";

  // Focus con leggero ritardo per animazione iOS
  setTimeout(() => inputAmount.focus(), 150);
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalAdd.classList.add("hidden");
  modalBackdrop.setAttribute("aria-hidden", "true");
  inputAmount.blur();
}

// Parser dell'importo digitato (gestisce virgola e punto)
function parseAmountToCents(val) {
  if (!val) return 0;
  const clean = val.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

// --- 7. ANNULLA TEMPORIZZATO (5 SECONDI) ---
let lastAddedTxId = null;
let undoTimeout = null;
const toastUndo = document.getElementById("toast-undo");
const btnToastUndo = document.getElementById("btn-toast-undo");

function showUndoToast(message, txId) {
  clearTimeout(undoTimeout);
  lastAddedTxId = txId;
  document.getElementById("toast-message").textContent = message;
  toastUndo.classList.remove("hidden");

  undoTimeout = setTimeout(() => {
    toastUndo.classList.add("hidden");
    lastAddedTxId = null;
  }, 5000);
}

btnToastUndo.addEventListener("click", () => {
  if (lastAddedTxId) {
    store.removeTransaction(lastAddedTxId);
    renderHome();
    toastUndo.classList.add("hidden");
    lastAddedTxId = null;
  }
});

// --- 8. EVENTI ---
btnOpenModal.addEventListener("click", openModal);
btnCloseModal.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

// Navigazione Tab (Placeholder per Fasi 2-5)
document.querySelectorAll(".tab-item").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab-item").forEach(t => {
      t.classList.remove("active");
      t.setAttribute("aria-selected", "false");
    });
    tab.classList.add("active");
    tab.setAttribute("aria-selected", "true");

    const target = tab.dataset.tab;
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    const secToShow = document.getElementById(`view-${target}`);
    if (secToShow) secToShow.classList.remove("hidden");

    document.getElementById("screen-title").textContent =
      target === "oggi" ? "Oggi" :
      target === "movimenti" ? "Movimenti" :
      target === "fisse" ? "Spese Fisse" :
      target === "statistiche" ? "Statistiche" : "Impostazioni";
  });
});

// Submit Transazione
formAdd.addEventListener("submit", (e) => {
  e.preventDefault();

  const amountCents = parseAmountToCents(inputAmount.value);
  if (amountCents <= 0) {
    inputAmount.focus();
    return;
  }

  const type = formAdd.elements["tx-type"].value;
  const categoryId = formAdd.elements["tx-category"] ? formAdd.elements["tx-category"].value : "varie";
  const dateVal = inputDate.value || toLocalDateString(new Date());
  const noteVal = document.getElementById("tx-note").value.trim();

  const newTx = {
    id: crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}_${Math.random()}`,
    type,
    amountCents,
    categoryId,
    date: dateVal,
    note: noteVal,
    createdAt: Date.now()
  };

  store.addTransaction(newTx);
  closeModal();
  renderHome();

  showUndoToast(`${type === "expense" ? "Spesa" : "Entrata"} di ${formatValuta(amountCents)} salvata`, newTx.id);
});

// Avviso Schermata Home se aperto da Safari normale
const isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
if (!isStandalone) {
  const warn = document.getElementById("browser-warning");
  if (warn) {
    warn.classList.remove("hidden");
    document.getElementById("btn-dismiss-browser-warning").addEventListener("click", () => {
      warn.classList.add("hidden");
    });
  }
}

// Chiedi persistenza storage se supportato
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

// Inizializzazione all'avvio
document.addEventListener("DOMContentLoaded", () => {
  renderCategoryChips();
  renderHome();
});

// --- 9. REGISTRAZIONE SERVICE WORKER ---
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            const banner = document.getElementById("sw-update-banner");
            if (banner) banner.classList.remove("hidden");
          }
        });
      });
    }).catch(err => console.log("SW non registrato:", err));
  });

  const btnRefresh = document.getElementById("btn-sw-refresh");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      window.location.reload();
    });
  }
}
