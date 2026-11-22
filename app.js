const STORAGE_KEY = "finanze_pwa_data_v2";

const ICONS = {
  carburante: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 22V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17"></path><path d="M13 10h4a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9l-3-3"></path><circle cx="8" cy="9" r="2"></circle></svg>`,
  auto: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>`,
  svago: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
  shopping: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  abbonamenti: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
  salute: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
  lavoro: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
  varie: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`
};

const DEFAULT_CATEGORIES = [
  { id: "carburante", nome: "Carburante", key: "carburante" },
  { id: "auto", nome: "Auto", key: "auto" },
  { id: "svago", nome: "Uscite", key: "svago" },
  { id: "shopping", nome: "Acquisti", key: "shopping" },
  { id: "abbonamenti", nome: "Servizi", key: "abbonamenti" },
  { id: "salute", nome: "Salute", key: "salute" },
  { id: "lavoro", nome: "Lavoro", key: "lavoro" },
  { id: "varie", nome: "Varie", key: "varie" }
];

const INITIAL_DATA = {
  version: 2,
  settings: {
    salaryDay: 28,
    monthlyIncomeCents: 180000,
    pacTargetCents: 20000,
    fixedExpensesCents: 25000
  },
  categories: DEFAULT_CATEGORIES,
  transactions: []
};

function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>'"]/g, t => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[t] || t));
}

function formatValuta(centesimi) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR"
  }).format((centesimi || 0) / 100);
}

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

class Store {
  constructor() {
    this.data = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("finanze_pwa_data_v1");
      if (!raw) return INITIAL_DATA;
      const parsed = JSON.parse(raw);
      return { ...INITIAL_DATA, ...parsed, settings: { ...INITIAL_DATA.settings, ...(parsed.settings || {}) } };
    } catch (e) {
      return INITIAL_DATA;
    }
  }
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {}
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

function computeFinancials(storeData, now = new Date()) {
  const salaryDay = storeData.settings.salaryDay || 28;
  const cycle = getCycleRange(now, salaryDay);
  const { totalDays, daysPassed, daysRemaining } = getDaysMetrics(cycle, now);

  const cycleTx = storeData.transactions.filter(t => t.date >= cycle.startStr && t.date <= cycle.endStr);

  const extraIncomeCents = cycleTx
    .filter(t => t.type === "income")
    .reduce((acc, t) => acc + t.amountCents, 0);

  const variableExpensesCents = cycleTx
    .filter(t => t.type === "expense")
    .reduce((acc, t) => acc + t.amountCents, 0);

  const baseIncome = storeData.settings.monthlyIncomeCents || 0;
  const pacCents = storeData.settings.pacTargetCents || 0;
  const fixedCents = storeData.settings.fixedExpensesCents || 0;

  const totalInflow = baseIncome + extraIncomeCents;
  const availableCents = totalInflow - pacCents - fixedCents - variableExpensesCents;
  const dailyBudgetCents = availableCents > 0 ? Math.floor(availableCents / daysRemaining) : 0;
  const budgetVariabilePianificato = Math.max(0, totalInflow - pacCents - fixedCents);

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

function renderHome() {
  const fin = computeFinancials(store.data, new Date());

  const opt = { day: "numeric", month: "short" };
  const dStart = fin.cycle.start.toLocaleDateString("it-IT", opt);
  const dEnd = fin.cycle.end.toLocaleDateString("it-IT", opt);
  document.getElementById("label-periodo").textContent = `Ciclo: ${dStart} – ${dEnd}`;

  const dispEl = document.getElementById("val-disponibile");
  dispEl.textContent = formatValuta(fin.availableCents);
  dispEl.style.color = fin.availableCents >= 0 ? "var(--ios-green)" : "var(--ios-red)";

  const heroSub = document.getElementById("hero-sub-text");
  if (fin.availableCents < 0) {
    heroSub.textContent = `Superato di ${formatValuta(Math.abs(fin.availableCents))}`;
    heroSub.className = "hero-sub negative";
  } else {
    heroSub.textContent = `Allocati per le spese variabili di questo ciclo`;
    heroSub.className = "hero-sub";
  }

  const percSpeso = fin.budgetVariabilePianificato > 0
    ? Math.min(100, Math.round((fin.variableExpensesCents / fin.budgetVariabilePianificato) * 100))
    : 100;
  const progressFill = document.getElementById("progress-fill");
  progressFill.style.width = `${percSpeso}%`;
  progressFill.style.backgroundColor = percSpeso >= 100 ? "var(--ios-red)" : (percSpeso >= 80 ? "var(--ios-orange)" : "var(--ios-green)");

  document.getElementById("progress-aria").setAttribute("aria-valuenow", percSpeso);
  document.getElementById("label-speso-mese").textContent = `Speso: ${formatValuta(fin.variableExpensesCents)}`;
  document.getElementById("label-perc-speso").textContent = `${percSpeso}%`;

  document.getElementById("val-budget-oggi").textContent = formatValuta(fin.dailyBudgetCents);
  document.getElementById("val-giorni-rimasti").textContent = `${fin.daysRemaining} giorni rimasti`;

  const ritmoBadge = document.getElementById("badge-ritmo-status");
  const ritmoSubEl = document.getElementById("val-ritmo-dettaglio");

  if (fin.differenzaRitmoCents >= 0) {
    ritmoBadge.textContent = `+${formatValuta(fin.differenzaRitmoCents)}`;
    ritmoBadge.className = "status-pill positive";
    ritmoSubEl.textContent = "in anticipo su target";
  } else {
    ritmoBadge.textContent = `-${formatValuta(Math.abs(fin.differenzaRitmoCents))}`;
    ritmoBadge.className = "status-pill negative";
    ritmoSubEl.textContent = "sopra la media attesa";
  }

  document.getElementById("val-sum-entrate").textContent = formatValuta(fin.baseIncome + fin.extraIncomeCents);
  document.getElementById("val-sum-pac").textContent = formatValuta(fin.pacCents);
  document.getElementById("val-sum-fisse").textContent = formatValuta(fin.fixedCents);
  document.getElementById("val-sum-variabili").textContent = formatValuta(fin.variableExpensesCents);

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

    const cat = store.data.categories.find(c => c.id === tx.categoryId) || { nome: "Spesa", key: "varie" };
    const isIncome = tx.type === "income";
    const sign = isIncome ? "+" : "-";
    const amountColor = isIncome ? "var(--ios-green)" : "inherit";

    const dateObj = parseLocalDateString(tx.date);
    const dateFormatted = dateObj.toLocaleDateString("it-IT", { day: "numeric", month: "short" });

    li.innerHTML = `
      <div class="tx-icon-box" aria-hidden="true">${ICONS[cat.key] || ICONS.varie}</div>
      <div class="tx-details">
        <span class="tx-title">${escapeHtml(tx.note || cat.nome)}</span>
        <span class="tx-sub">${escapeHtml(cat.nome)} • ${dateFormatted}</span>
      </div>
      <span class="tx-amount" style="color: ${amountColor}">${sign}${formatValuta(tx.amountCents)}</span>
    `;

    container.appendChild(li);
  });
}

function renderCategoryChips() {
  const container = document.getElementById("category-chips-list");
  container.innerHTML = "";

  store.data.categories.forEach((cat, index) => {
    const label = document.createElement("label");
    label.className = "cat-chip";
    label.innerHTML = `
      <input type="radio" name="tx-category" value="${escapeHtml(cat.id)}" ${index === 0 ? "checked" : ""}>
      <div class="cat-chip-box">
        <div class="cat-chip-svg-wrap">${ICONS[cat.key] || ICONS.varie}</div>
        <span class="cat-chip-name">${escapeHtml(cat.nome)}</span>
      </div>
    `;
    container.appendChild(label);
  });
}

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
  inputDate.value = toLocalDateString(new Date());
  inputAmount.value = "";
  document.getElementById("tx-note").value = "";
  setTimeout(() => inputAmount.focus(), 120);
}

function closeModal() {
  modalBackdrop.classList.add("hidden");
  modalAdd.classList.add("hidden");
  inputAmount.blur();
}

function parseAmountToCents(val) {
  if (!val) return 0;
  const clean = val.replace(/\s/g, "").replace(",", ".");
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  return Math.round(num * 100);
}

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

btnOpenModal.addEventListener("click", openModal);
btnCloseModal.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", closeModal);

document.querySelectorAll(".tab-item").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab-item").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    const target = tab.dataset.tab;
    document.querySelectorAll(".view-section").forEach(sec => sec.classList.add("hidden"));
    const secToShow = document.getElementById(`view-${target}`);
    if (secToShow) secToShow.classList.remove("hidden");

    document.getElementById("screen-title").textContent =
      target === "oggi" ? "Oggi" :
      target === "movimenti" ? "Movimenti" :
      target === "fisse" ? "Fisse & PAC" :
      target === "statistiche" ? "Statistiche" : "Menu";
  });
});

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
  showUndoToast(`${type === "expense" ? "Spesa" : "Entrata"} registrata`, newTx.id);
});

if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().catch(() => {});
}

const isStandalone = window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
if (!isStandalone) {
  const warn = document.getElementById("browser-warning");
  if (warn) {
    warn.classList.remove("hidden");
    document.getElementById("btn-dismiss-browser-warning").addEventListener("click", () => warn.classList.add("hidden"));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderCategoryChips();
  renderHome();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            const b = document.getElementById("sw-update-banner");
            if (b) b.classList.remove("hidden");
          }
        });
      });
    }).catch(() => {});
  });

  const btnR = document.getElementById("btn-sw-refresh");
  if (btnR) btnR.addEventListener("click", () => window.location.reload());
}
