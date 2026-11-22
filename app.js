/**
 * FINANZE PWA - APPLICAZIONE COMPLETA
 * Architettura modulare vanilla: Store, Pure Math, Views, Controller
 */

const STORAGE_KEY = "finanze_pwa_master_v3";

const ICONS = {
  carburante: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 22V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v17"></path><path d="M13 10h4a2 2 0 0 1 2 2v8a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V9l-3-3"></path><circle cx="8" cy="9" r="2"></circle></svg>`,
  auto: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11 2 11.5 2 12v4c0 .6.4 1 1 1h2"></path><circle cx="7" cy="17" r="2"></circle><circle cx="17" cy="17" r="2"></circle></svg>`,
  svago: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
  shopping: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`,
  abbonamenti: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>`,
  salute: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`,
  lavoro: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>`,
  varie: `<svg class="tx-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>`
};

const DEFAULT_CATEGORIES = [
  { id: "carburante", nome: "Carburante", key: "carburante", color: "#FF9F0A" },
  { id: "auto", nome: "Auto & Manut.", key: "auto", color: "#0A84FF" },
  { id: "svago", nome: "Uscite & Svago", key: "svago", color: "#FF375F" },
  { id: "shopping", nome: "Acquisti", key: "shopping", color: "#BF5AF2" },
  { id: "abbonamenti", nome: "Servizi", key: "abbonamenti", color: "#64D2FF" },
  { id: "salute", nome: "Salute", key: "salute", color: "#30D158" },
  { id: "lavoro", nome: "Lavoro", key: "lavoro", color: "#FFD60A" },
  { id: "varie", nome: "Varie", key: "varie", color: "#8E8E93" }
];

const INITIAL_DATA = {
  version: 3,
  settings: {
    salaryDay: 28,
    monthlyIncomeCents: 180000,
    pinHash: null,
    lastBackupDate: null
  },
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  recurring: [
    { id: "rec_auto", name: "Rata Auto", amountCents: 25000, frequency: "monthly", day: 15, categoryId: "auto", active: true }
  ],
  goals: [
    { id: "goal_pac", name: "Piano Accumulo (PAC)", targetCents: 1000000, currentCents: 200000, monthlyCents: 20000, deadline: "" }
  ]
};

// --- UTILITY PURE ---
function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>'"]/g, t => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t] || t));
}

function formatValuta(cents) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
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

  return { start: startDate, end: endDate, startStr: toLocalDateString(startDate), endStr: toLocalDateString(endDate) };
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

async function sha256(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- STORE CON MIGRAZIONE ---
class Store {
  constructor() {
    this.data = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem("finanze_pwa_data_v2") || localStorage.getItem("finanze_pwa_data_v1");
      if (!raw) return INITIAL_DATA;
      const p = JSON.parse(raw);
      return {
        version: 3,
        settings: { ...INITIAL_DATA.settings, ...(p.settings || {}) },
        categories: (p.categories && p.categories.length) ? p.categories : DEFAULT_CATEGORIES,
        transactions: p.transactions || [],
        recurring: p.recurring || INITIAL_DATA.recurring,
        goals: p.goals || INITIAL_DATA.goals
      };
    } catch (e) {
      return INITIAL_DATA;
    }
  }
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {}
  }
  addTx(tx) { this.data.transactions.unshift(tx); this.save(); }
  updateTx(tx) {
    const idx = this.data.transactions.findIndex(t => t.id === tx.id);
    if (idx !== -1) { this.data.transactions[idx] = tx; this.save(); }
  }
  removeTx(id) {
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

// --- CALCOLO FINANZIARIO PURO ---
function computeFinancials(storeData, refDate = new Date()) {
  const salaryDay = storeData.settings.salaryDay || 28;
  const cycle = getCycleRange(refDate, salaryDay);
  const { totalDays, daysPassed, daysRemaining } = getDaysMetrics(cycle, refDate);

  const cycleTx = storeData.transactions.filter(t => t.date >= cycle.startStr && t.date <= cycle.endStr);

  const extraIncomeCents = cycleTx.filter(t => t.type === "income").reduce((acc, t) => acc + t.amountCents, 0);
  const variableExpensesCents = cycleTx.filter(t => t.type === "expense").reduce((acc, t) => acc + t.amountCents, 0);

  // Quote fisse mensilizzate (mensili intere, trimestrali / 3, annuali / 12)
  const monthlyFixedCents = storeData.recurring
    .filter(r => r.active !== false)
    .reduce((acc, r) => {
      if (r.frequency === "annual") return acc + Math.round(r.amountCents / 12);
      if (r.frequency === "quarterly") return acc + Math.round(r.amountCents / 3);
      return acc + r.amountCents;
    }, 0);

  // PAC & Risparmio mensile
  const monthlyPacCents = storeData.goals.reduce((acc, g) => acc + (g.monthlyCents || 0), 0);

  const baseIncome = storeData.settings.monthlyIncomeCents || 0;
  const totalInflow = baseIncome + extraIncomeCents;

  // FORMULA MAESTRA DISPONIBILE
  const availableCents = totalInflow - monthlyPacCents - monthlyFixedCents - variableExpensesCents;
  const dailyBudgetCents = availableCents > 0 ? Math.floor(availableCents / daysRemaining) : 0;
  const budgetVariabilePianificato = Math.max(0, totalInflow - monthlyPacCents - monthlyFixedCents);

  const spesaAttesaAdOggi = budgetVariabilePianificato > 0 ? Math.round((budgetVariabilePianificato / totalDays) * daysPassed) : 0;
  const differenzaRitmoCents = spesaAttesaAdOggi - variableExpensesCents;

  return {
    cycle,
    totalDays,
    daysPassed,
    daysRemaining,
    baseIncome,
    extraIncomeCents,
    monthlyPacCents,
    monthlyFixedCents,
    variableExpensesCents,
    availableCents,
    dailyBudgetCents,
    budgetVariabilePianificato,
    differenzaRitmoCents,
    cycleTransactions: cycleTx
  };
}

// --- RENDERING SCHERMATE ---
let currentMonthOffset = 0;

function renderAll() {
  renderHome();
  renderMovimentiView();
  renderFisseView();
  renderStatisticheView();
  renderImpostazioniView();
}

function renderHome() {
  const fin = computeFinancials(store.data, new Date());
  const opt = { day: "numeric", month: "short" };
  document.getElementById("label-periodo").textContent = `Ciclo: ${fin.cycle.start.toLocaleDateString("it-IT", opt)} – ${fin.cycle.end.toLocaleDateString("it-IT", opt)}`;

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

  const percSpeso = fin.budgetVariabilePianificato > 0 ? Math.min(100, Math.round((fin.variableExpensesCents / fin.budgetVariabilePianificato) * 100)) : 100;
  const progressFill = document.getElementById("progress-fill");
  progressFill.style.width = `${percSpeso}%`;
  progressFill.style.backgroundColor = percSpeso >= 100 ? "var(--ios-red)" : (percSpeso >= 80 ? "var(--ios-orange)" : "var(--ios-green)");
  document.getElementById("progress-aria").setAttribute("aria-valuenow", percSpeso);
  document.getElementById("label-speso-mese").textContent = `Speso: ${formatValuta(fin.variableExpensesCents)}`;
  document.getElementById("label-perc-speso").textContent = `${percSpeso}%`;

  document.getElementById("val-budget-oggi").textContent = formatValuta(fin.dailyBudgetCents);
  document.getElementById("val-giorni-rimasti").textContent = `${fin.daysRemaining} giorni rimasti`;

  const ritmoBadge = document.getElementById("badge-ritmo-status");
  const ritmoSub = document.getElementById("val-ritmo-dettaglio");
  if (fin.differenzaRitmoCents >= 0) {
    ritmoBadge.textContent = `+${formatValuta(fin.differenzaRitmoCents)}`;
    ritmoBadge.className = "status-pill positive";
    ritmoSub.textContent = "in anticipo su target";
  } else {
    ritmoBadge.textContent = `-${formatValuta(Math.abs(fin.differenzaRitmoCents))}`;
    ritmoBadge.className = "status-pill negative";
    ritmoSub.textContent = "sopra la media attesa";
  }

  document.getElementById("val-sum-entrate").textContent = formatValuta(fin.baseIncome + fin.extraIncomeCents);
  document.getElementById("val-sum-pac").textContent = formatValuta(fin.monthlyPacCents);
  document.getElementById("val-sum-fisse").textContent = formatValuta(fin.monthlyFixedCents);
  document.getElementById("val-sum-variabili").textContent = formatValuta(fin.variableExpensesCents);

  renderRecentList(store.data.transactions.slice(0, 5));
}

function renderRecentList(recentList) {
  const container = document.getElementById("recent-transactions-list");
  const emptyState = document.getElementById("recent-empty-state");
  container.innerHTML = "";
  document.getElementById("badge-totale-movimenti").textContent = `${store.data.transactions.length} totali`;

  if (!recentList.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  recentList.forEach(tx => container.appendChild(createTxElement(tx)));
}

function createTxElement(tx) {
  const li = document.createElement("li");
  li.className = "tx-item";
  const cat = store.data.categories.find(c => c.id === tx.categoryId) || { nome: "Spesa", key: "varie" };
  const isInc = tx.type === "income";
  const dateFormatted = parseLocalDateString(tx.date).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

  li.innerHTML = `
    <div class="tx-icon-box" aria-hidden="true">${ICONS[cat.key] || ICONS.varie}</div>
    <div class="tx-details">
      <span class="tx-title">${escapeHtml(tx.note || cat.nome)}</span>
      <span class="tx-sub">${escapeHtml(cat.nome)} • ${dateFormatted}</span>
    </div>
    <span class="tx-amount" style="color: ${isInc ? 'var(--ios-green)' : 'inherit'}">${isInc ? '+' : '-'}${formatValuta(tx.amountCents)}</span>
  `;
  li.addEventListener("click", () => openTxModal(tx));
  return li;
}

// --- VISTA MOVIMENTI COMPLETA ---
function renderMovimentiView() {
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + currentMonthOffset);
  const fin = computeFinancials(store.data, targetDate);

  const opt = { month: "long", year: "numeric" };
  document.getElementById("label-selected-month").textContent = fin.cycle.start.toLocaleDateString("it-IT", opt);

  const query = document.getElementById("input-search-tx").value.trim().toLowerCase();
  const catFilter = document.getElementById("select-category-filter").value;

  const filtered = fin.cycleTransactions.filter(tx => {
    const matchCat = catFilter === "all" || tx.categoryId === catFilter;
    const matchQuery = !query || (tx.note && tx.note.toLowerCase().includes(query));
    return matchCat && matchQuery;
  });

  const container = document.getElementById("all-transactions-grouped");
  const emptyState = document.getElementById("tx-empty-state");
  container.innerHTML = "";

  if (!filtered.length) {
    emptyState.classList.remove("hidden");
    return;
  }
  emptyState.classList.add("hidden");

  // Raggruppa per data
  const groups = {};
  filtered.forEach(t => {
    if (!groups[t.date]) groups[t.date] = [];
    groups[t.date].push(t);
  });

  Object.keys(groups).sort().reverse().forEach(dateStr => {
    const dayGroup = document.createElement("div");
    dayGroup.className = "tx-day-group";

    const dayTotal = groups[dateStr].reduce((acc, t) => acc + (t.type === "expense" ? t.amountCents : -t.amountCents), 0);
    const dayDate = parseLocalDateString(dateStr);
    const dateFormatted = dayDate.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });

    const header = document.createElement("div");
    header.className = "tx-day-header";
    header.innerHTML = `<span>${dateFormatted}</span><span>Tot: ${formatValuta(dayTotal)}</span>`;
    dayGroup.appendChild(header);

    const ul = document.createElement("ul");
    ul.className = "transactions-list";
    groups[dateStr].forEach(tx => ul.appendChild(createTxElement(tx)));
    dayGroup.appendChild(ul);

    container.appendChild(dayGroup);
  });
}

// --- VISTA SPESE FISSE & PAC ---
function renderFisseView() {
  // Spese fisse
  const recList = document.getElementById("recurring-list");
  recList.innerHTML = "";
  store.data.recurring.forEach(r => {
    const row = document.createElement("div");
    row.className = "ios-list-row";
    row.style.cursor = "pointer";
    const freqLabel = r.frequency === "annual" ? "Annuale (/12)" : (r.frequency === "quarterly" ? "Trimestrale (/3)" : "Mensile");
    row.innerHTML = `
      <div>
        <div class="list-label">${escapeHtml(r.name)}</div>
        <div class="list-sub">${freqLabel} • Giorno ${r.day}</div>
      </div>
      <span class="list-value">${formatValuta(r.amountCents)}</span>
    `;
    row.addEventListener("click", () => openRecurringModal(r));
    recList.appendChild(row);
  });

  // Prossime scadenze 30gg
  const upList = document.getElementById("upcoming-recurring-list");
  upList.innerHTML = "";
  const today = new Date();
  store.data.recurring.forEach(r => {
    const row = document.createElement("div");
    row.className = "ios-list-row";
    row.innerHTML = `
      <div>
        <div class="list-label">${escapeHtml(r.name)}</div>
        <div class="list-sub">Addebito il ${r.day} del mese</div>
      </div>
      <span class="list-value">${formatValuta(r.amountCents)}</span>
    `;
    upList.appendChild(row);
  });

  // PAC & Obiettivi
  const goalList = document.getElementById("goals-list");
  goalList.innerHTML = "";
  store.data.goals.forEach(g => {
    const row = document.createElement("div");
    row.className = "ios-list-row";
    row.style.cursor = "pointer";
    row.innerHTML = `
      <div>
        <div class="list-label">${escapeHtml(g.name)}</div>
        <div class="list-sub">Accumulato: ${formatValuta(g.currentCents || 0)}</div>
      </div>
      <div style="text-align: right;">
        <span class="list-value">${formatValuta(g.monthlyCents)}/mese</span>
        ${g.targetCents ? `<div class="list-sub">Target: ${formatValuta(g.targetCents)}</div>` : ''}
      </div>
    `;
    row.addEventListener("click", () => openGoalModal(g));
    goalList.appendChild(row);
  });
}

// --- VISTA STATISTICHE ---
function renderStatisticheView() {
  const fin = computeFinancials(store.data, new Date());
  const totalsByCat = {};
  fin.cycleTransactions.filter(t => t.type === "expense").forEach(t => {
    totalsByCat[t.categoryId] = (totalsByCat[t.categoryId] || 0) + t.amountCents;
  });

  const totalExpense = Object.values(totalsByCat).reduce((a, b) => a + b, 0);
  document.getElementById("donut-total-val").textContent = formatValuta(totalExpense);

  // Genera Cerchio Ciambella SVG
  const svg = document.getElementById("svg-donut");
  const legend = document.getElementById("donut-legend");
  svg.innerHTML = "";
  legend.innerHTML = "";

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = 0;

  if (totalExpense === 0) {
    svg.innerHTML = `<circle cx="100" cy="100" r="${radius}" fill="none" stroke="var(--bg-card-subtle)" stroke-width="20"/>`;
    legend.innerHTML = `<div class="empty-sub" style="text-align:center;">Nessuna spesa nel ciclo corrente.</div>`;
  } else {
    store.data.categories.forEach(cat => {
      const amount = totalsByCat[cat.id] || 0;
      if (amount <= 0) return;

      const ratio = amount / totalExpense;
      const strokeDash = ratio * circumference;
      const offset = circumference - strokeDash;

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "100");
      circle.setAttribute("cy", "100");
      circle.setAttribute("r", radius);
      circle.setAttribute("fill", "none");
      circle.setAttribute("stroke", cat.color || "var(--ios-blue)");
      circle.setAttribute("stroke-width", "22");
      circle.setAttribute("stroke-dasharray", `${strokeDash} ${circumference}`);
      circle.setAttribute("stroke-dashoffset", -accumulatedAngle);
      svg.appendChild(circle);

      accumulatedAngle += strokeDash;

      const legItem = document.createElement("div");
      legItem.className = "legend-item";
      legItem.innerHTML = `
        <div class="legend-left">
          <span class="legend-dot" style="background:${cat.color || 'var(--ios-blue)'}"></span>
          <span>${escapeHtml(cat.nome)}</span>
        </div>
        <span class="list-value">${formatValuta(amount)} (${Math.round(ratio * 100)}%)</span>
      `;
      legend.appendChild(legItem);
    });
  }

  // Barre ultimi 6 mesi
  const barContainer = document.getElementById("bar-chart-container");
  barContainer.innerHTML = "";
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const f = computeFinancials(store.data, d);
    const maxReference = Math.max(1, f.baseIncome);
    const heightRatio = Math.min(1, f.variableExpensesCents / maxReference);

    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
      <div class="bar-fill" style="height: ${Math.max(6, heightRatio * 100)}px; background: ${i === 0 ? 'var(--ios-blue)' : 'var(--bg-chip)'}"></div>
      <span class="bar-label">${d.toLocaleDateString("it-IT", { month: "narrow" })}</span>
    `;
    barContainer.appendChild(col);
  }
}

// --- VISTA IMPOSTAZIONI ---
function renderImpostazioniView() {
  document.getElementById("cfg-salary-day").value = store.data.settings.salaryDay || 28;
  document.getElementById("cfg-monthly-income").value = (store.data.settings.monthlyIncomeCents || 0) / 100;

  const pinToggle = document.getElementById("cfg-pin-enabled");
  pinToggle.checked = Boolean(store.data.settings.pinHash);
  document.getElementById("pin-change-row").classList.toggle("hidden", !pinToggle.checked);

  if (store.data.settings.lastBackupDate) {
    const bDate = new Date(store.data.settings.lastBackupDate).toLocaleDateString("it-IT");
    document.getElementById("backup-status-text").textContent = `Ultimo backup: ${bDate}`;
  }
}

// --- MODALI & CONTROLLER EVENTI ---
const modalBackdrop = document.getElementById("modal-backdrop");
const modalAdd = document.getElementById("modal-add");
const modalRecurring = document.getElementById("modal-recurring");
const modalGoal = document.getElementById("modal-goal");

function closeAllModals() {
  modalBackdrop.classList.add("hidden");
  modalAdd.classList.add("hidden");
  modalRecurring.classList.add("hidden");
  modalGoal.classList.add("hidden");
}

modalBackdrop.addEventListener("click", closeAllModals);
document.getElementById("btn-modal-close").addEventListener("click", closeAllModals);
document.getElementById("btn-modal-recurring-close").addEventListener("click", closeAllModals);
document.getElementById("btn-modal-goal-close").addEventListener("click", closeAllModals);

// Form Movimento
function openTxModal(tx = null) {
  modalBackdrop.classList.remove("hidden");
  modalAdd.classList.remove("hidden");
  const delBtn = document.getElementById("btn-delete-tx");

  if (tx) {
    document.getElementById("modal-tx-title").textContent = "Modifica Movimento";
    document.getElementById("tx-edit-id").value = tx.id;
    document.getElementById("tx-amount").value = (tx.amountCents / 100).toFixed(2).replace(".", ",");
    document.getElementById("tx-date").value = tx.date;
    document.getElementById("tx-note").value = tx.note || "";
    delBtn.classList.remove("hidden");
    const rad = document.querySelector(`input[name="tx-type"][value="${tx.type}"]`);
    if (rad) rad.checked = true;
    const catRad = document.querySelector(`input[name="tx-category"][value="${tx.categoryId}"]`);
    if (catRad) catRad.checked = true;
  } else {
    document.getElementById("modal-tx-title").textContent = "Nuovo Movimento";
    document.getElementById("tx-edit-id").value = "";
    document.getElementById("tx-amount").value = "";
    document.getElementById("tx-date").value = toLocalDateString(new Date());
    document.getElementById("tx-note").value = "";
    delBtn.classList.add("hidden");
    setTimeout(() => document.getElementById("tx-amount").focus(), 120);
  }
}

document.getElementById("btn-open-modal").addEventListener("click", () => openTxModal(null));

document.getElementById("btn-delete-tx").addEventListener("click", () => {
  const id = document.getElementById("tx-edit-id").value;
  if (id && confirm("Vuoi eliminare definitivamente questo movimento?")) {
    store.removeTx(id);
    closeAllModals();
    renderAll();
  }
});

document.getElementById("form-add-transaction").addEventListener("submit", (e) => {
  e.preventDefault();
  const rawAmt = document.getElementById("tx-amount").value.replace(/\s/g, "").replace(",", ".");
  const numAmt = parseFloat(rawAmt);
  if (isNaN(numAmt) || numAmt <= 0) return;

  const editId = document.getElementById("tx-edit-id").value;
  const type = document.querySelector('input[name="tx-type"]:checked').value;
  const categoryId = document.querySelector('input[name="tx-category"]:checked')?.value || "varie";
  const dateVal = document.getElementById("tx-date").value || toLocalDateString(new Date());
  const noteVal = document.getElementById("tx-note").value.trim();

  const txData = {
    id: editId || (crypto.randomUUID ? crypto.randomUUID() : `tx_${Date.now()}`),
    type,
    amountCents: Math.round(numAmt * 100),
    categoryId,
    date: dateVal,
    note: noteVal,
    createdAt: Date.now()
  };

  if (editId) {
    store.updateTx(txData);
  } else {
    store.addTx(txData);
    showUndoToast(`${type === "expense" ? "Spesa" : "Entrata"} registrata`, txData.id);
  }

  closeAllModals();
  renderAll();
});

// Toast Annulla per 5s
let lastAddedId = null;
let undoTimer = null;
function showUndoToast(msg, id) {
  clearTimeout(undoTimer);
  lastAddedId = id;
  document.getElementById("toast-message").textContent = msg;
  const toast = document.getElementById("toast-undo");
  toast.classList.remove("hidden");
  undoTimer = setTimeout(() => { toast.classList.add("hidden"); lastAddedId = null; }, 5000);
}

document.getElementById("btn-toast-undo").addEventListener("click", () => {
  if (lastAddedId) {
    store.removeTx(lastAddedId);
    document.getElementById("toast-undo").classList.add("hidden");
    lastAddedId = null;
    renderAll();
  }
});

// Form Recurring (Spese Fisse)
function openRecurringModal(rec = null) {
  modalBackdrop.classList.remove("hidden");
  modalRecurring.classList.remove("hidden");
  const delBtn = document.getElementById("btn-delete-recurring");

  const catSelect = document.getElementById("rec-category");
  catSelect.innerHTML = store.data.categories.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");

  if (rec) {
    document.getElementById("modal-recurring-title").textContent = "Modifica Spesa Fissa";
    document.getElementById("rec-edit-id").value = rec.id;
    document.getElementById("rec-name").value = rec.name;
    document.getElementById("rec-amount").value = (rec.amountCents / 100).toFixed(2);
    document.getElementById("rec-frequency").value = rec.frequency;
    document.getElementById("rec-day").value = rec.day;
    catSelect.value = rec.categoryId;
    delBtn.classList.remove("hidden");
  } else {
    document.getElementById("modal-recurring-title").textContent = "Nuova Spesa Fissa";
    document.getElementById("rec-edit-id").value = "";
    document.getElementById("rec-name").value = "";
    document.getElementById("rec-amount").value = "";
    delBtn.classList.add("hidden");
  }
}

document.getElementById("btn-open-recurring-modal").addEventListener("click", () => openRecurringModal(null));

document.getElementById("form-recurring").addEventListener("submit", (e) => {
  e.preventDefault();
  const editId = document.getElementById("rec-edit-id").value;
  const name = document.getElementById("rec-name").value.trim();
  const amt = parseFloat(document.getElementById("rec-amount").value);
  if (!name || isNaN(amt) || amt <= 0) return;

  const item = {
    id: editId || `rec_${Date.now()}`,
    name,
    amountCents: Math.round(amt * 100),
    frequency: document.getElementById("rec-frequency").value,
    day: parseInt(document.getElementById("rec-day").value, 10) || 15,
    categoryId: document.getElementById("rec-category").value,
    active: true
  };

  if (editId) {
    const idx = store.data.recurring.findIndex(r => r.id === editId);
    if (idx !== -1) store.data.recurring[idx] = item;
  } else {
    store.data.recurring.push(item);
  }
  store.save();
  closeAllModals();
  renderAll();
});

document.getElementById("btn-delete-recurring").addEventListener("click", () => {
  const id = document.getElementById("rec-edit-id").value;
  if (id && confirm("Eliminare questa spesa fissa?")) {
    store.data.recurring = store.data.recurring.filter(r => r.id !== id);
    store.save();
    closeAllModals();
    renderAll();
  }
});

// Form Goal (PAC)
function openGoalModal(goal = null) {
  modalBackdrop.classList.remove("hidden");
  modalGoal.classList.remove("hidden");
  const delBtn = document.getElementById("btn-delete-goal");

  if (goal) {
    document.getElementById("modal-goal-title").textContent = "Modifica Obiettivo PAC";
    document.getElementById("goal-edit-id").value = goal.id;
    document.getElementById("goal-name").value = goal.name;
    document.getElementById("goal-target").value = goal.targetCents ? (goal.targetCents / 100) : "";
    document.getElementById("goal-monthly").value = (goal.monthlyCents / 100);
    document.getElementById("goal-current").value = goal.currentCents ? (goal.currentCents / 100) : 0;
    document.getElementById("goal-deadline").value = goal.deadline || "";
    delBtn.classList.remove("hidden");
  } else {
    document.getElementById("modal-goal-title").textContent = "Nuovo Obiettivo PAC";
    document.getElementById("goal-edit-id").value = "";
    document.getElementById("goal-name").value = "";
    document.getElementById("goal-target").value = "";
    document.getElementById("goal-monthly").value = "";
    delBtn.classList.add("hidden");
  }
}

document.getElementById("btn-open-goal-modal").addEventListener("click", () => openGoalModal(null));

document.getElementById("form-goal").addEventListener("submit", (e) => {
  e.preventDefault();
  const editId = document.getElementById("goal-edit-id").value;
  const name = document.getElementById("goal-name").value.trim();
  const monthly = parseFloat(document.getElementById("goal-monthly").value);
  if (!name || isNaN(monthly) || monthly <= 0) return;

  const target = parseFloat(document.getElementById("goal-target").value) || 0;
  const current = parseFloat(document.getElementById("goal-current").value) || 0;

  const item = {
    id: editId || `goal_${Date.now()}`,
    name,
    monthlyCents: Math.round(monthly * 100),
    targetCents: Math.round(target * 100),
    currentCents: Math.round(current * 100),
    deadline: document.getElementById("goal-deadline").value || ""
  };

  if (editId) {
    const idx = store.data.goals.findIndex(g => g.id === editId);
    if (idx !== -1) store.data.goals[idx] = item;
  } else {
    store.data.goals.push(item);
  }
  store.save();
  closeAllModals();
  renderAll();
});

document.getElementById("btn-delete-goal").addEventListener("click", () => {
  const id = document.getElementById("goal-edit-id").value;
  if (id && confirm("Eliminare questo piano di risparmio?")) {
    store.data.goals = store.data.goals.filter(g => g.id !== id);
    store.save();
    closeAllModals();
    renderAll();
  }
});

// Sottotab Spese Fisse & PAC
document.querySelectorAll(".sub-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".sub-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".subtab-content").forEach(c => c.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.subtab).classList.add("active");
  });
});

// Navigazione Mese Movimenti
document.getElementById("btn-month-prev").addEventListener("click", () => { currentMonthOffset--; renderMovimentiView(); });
document.getElementById("btn-month-next").addEventListener("click", () => { currentMonthOffset++; renderMovimentiView(); });
document.getElementById("input-search-tx").addEventListener("input", renderMovimentiView);
document.getElementById("select-category-filter").addEventListener("change", renderMovimentiView);

// Salvataggio Impostazioni Parametri
document.getElementById("btn-save-settings").addEventListener("click", async () => {
  const salDay = parseInt(document.getElementById("cfg-salary-day").value, 10);
  const inc = parseFloat(document.getElementById("cfg-monthly-income").value);
  if (salDay >= 1 && salDay <= 28) store.data.settings.salaryDay = salDay;
  if (!isNaN(inc) && inc >= 0) store.data.settings.monthlyIncomeCents = Math.round(inc * 100);

  const pinVal = document.getElementById("cfg-pin-input").value.trim();
  if (document.getElementById("cfg-pin-enabled").checked && pinVal.length === 4) {
    store.data.settings.pinHash = await sha256(pinVal);
  } else if (!document.getElementById("cfg-pin-enabled").checked) {
    store.data.settings.pinHash = null;
  }

  store.save();
  alert("Impostazioni salvate con successo.");
  renderAll();
});

document.getElementById("cfg-pin-enabled").addEventListener("change", (e) => {
  document.getElementById("pin-change-row").classList.toggle("hidden", !e.target.checked);
});

// Backup & Ripristino
document.getElementById("btn-export-json").addEventListener("click", () => {
  store.data.settings.lastBackupDate = new Date().toISOString();
  store.save();
  const blob = new Blob([JSON.stringify(store.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanze-backup-${toLocalDateString(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  renderImpostazioniView();
});

document.getElementById("btn-export-csv").addEventListener("click", () => {
  const headers = "ID;Data;Tipo;Importo_Euro;Categoria;Nota\n";
  const rows = store.data.transactions.map(t => {
    return `${t.id};${t.date};${t.type};${(t.amountCents / 100).toFixed(2)};${t.categoryId};"${(t.note || '').replace(/"/g, '""')}"`;
  }).join("\n");
  const blob = new Blob(["\uFEFF" + headers + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movimenti-${toLocalDateString(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("input-import-json").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (parsed.transactions && parsed.settings) {
        if (confirm(`Trovati ${parsed.transactions.length} movimenti. Vuoi sovrascrivere i dati attuali?`)) {
          store.data = parsed;
          store.save();
          alert("Backup ripristinato con successo!");
          location.reload();
        }
      } else {
        alert("File di backup non valido.");
      }
    } catch (err) {
      alert("Errore nella lettura del file JSON.");
    }
  };
  reader.readAsText(file);
});

document.getElementById("btn-reset-data").addEventListener("click", () => {
  if (confirm("ATTENZIONE: Questa azione cancellerà tutti i movimenti e le impostazioni. Continuare?")) {
    if (confirm("Sei assolutamente sicuro? Non potrai recuperare i dati senza un backup JSON.")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }
});

// Controllo Promemoria Backup 30 Giorni
function checkBackupReminder() {
  if (!store.data.settings.lastBackupDate) return;
  const lastB = new Date(store.data.settings.lastBackupDate).getTime();
  const diffDays = (Date.now() - lastB) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) {
    const banner = document.getElementById("backup-reminder");
    banner.classList.remove("hidden");
    document.getElementById("btn-dismiss-backup-reminder").addEventListener("click", () => {
      document.getElementById("btn-export-json").click();
      banner.classList.add("hidden");
    });
  }
}

// PIN LOCK KEYPAD LOGIC
let enteredPin = "";
async function handlePinDigit(digit) {
  if (enteredPin.length < 4) {
    enteredPin += digit;
    updatePinDots();
    if (enteredPin.length === 4) {
      const hash = await sha256(enteredPin);
      if (hash === store.data.settings.pinHash) {
        document.getElementById("pin-screen").classList.add("hidden");
        enteredPin = "";
        updatePinDots();
      } else {
        navigator.vibrate?.([100, 50, 100]);
        enteredPin = "";
        updatePinDots();
        alert("PIN non corretto.");
      }
    }
  }
}

function updatePinDots() {
  const dots = document.querySelectorAll(".pin-dots .dot");
  dots.forEach((d, i) => d.classList.toggle("filled", i < enteredPin.length));
}

document.querySelectorAll(".pin-keypad .pin-btn[data-key]").forEach(b => {
  b.addEventListener("click", () => handlePinDigit(b.dataset.key));
});
document.getElementById("btn-pin-del").addEventListener("click", () => {
  enteredPin = enteredPin.slice(0, -1);
  updatePinDots();
});

// Tab Bar Switching
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

    if (target === "movimenti") renderMovimentiView();
    if (target === "fisse") renderFisseView();
    if (target === "statistiche") renderStatisticheView();
    if (target === "impostazioni") renderImpostazioniView();
  });
});

// Chips Categorie Form Movimento
function initCategoryChips() {
  const container = document.getElementById("category-chips-list");
  const filterSelect = document.getElementById("select-category-filter");
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

    const opt = document.createElement("option");
    opt.value = cat.id;
    opt.textContent = cat.nome;
    filterSelect.appendChild(opt);
  });
}

// Inizializzazione All'Avvio
document.addEventListener("DOMContentLoaded", () => {
  initCategoryChips();
  renderAll();
  checkBackupReminder();

  if (store.data.settings.pinHash) {
    document.getElementById("pin-screen").classList.remove("hidden");
  }
});

// Service Worker & Standalone Safari Check
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

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then(reg => {
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            document.getElementById("sw-update-banner")?.classList.remove("hidden");
          }
        });
      });
    }).catch(() => {});
  });
  document.getElementById("btn-sw-refresh")?.addEventListener("click", () => window.location.reload());
}
