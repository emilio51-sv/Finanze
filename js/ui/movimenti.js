/** Scheda "Movimenti": selettore ciclo, istogramma, filtri, lista raggruppata per giorno. */
import { $, shortDate } from "./dom.js";
import { ctx } from "./context.js";
import { formatValuta } from "../core/money.js";
import { toLocalDateString, parseLocalDateString } from "../core/dates.js";
import { computeFinancialsForOffset, recentDailyTotals, filterTransactions, groupByDay } from "../core/budget.js";
import { createTxElement } from "./items.js";

function renderMovimentiChart(fin) {
  const daysPassed = Math.max(1, fin.daysPassed || 1);
  $("#chart-movimenti-avg").textContent = `Media: ${formatValuta(Math.round(fin.variableExpensesCents / daysPassed))}/g`;
  const recent = recentDailyTotals(fin, 14);
  const maxVal = Math.max(5000, ...recent.map((d) => d.cents));
  const todayStr = toLocalDateString(new Date());
  $("#movimenti-bar-chart").innerHTML = recent.map(({ date: d, cents: v }) => {
    const h = v ? Math.max(8, Math.round((v / maxVal) * 100)) : 6;
    return `<div title="${d}: ${formatValuta(v)}"><i class="${v ? "on" : ""} ${d === todayStr ? "today" : ""}" style="height:${h}%"></i><span>${parseInt(d.split("-")[2], 10)}</span></div>`;
  }).join("");
}

export function renderMovimentiView() {
  const { store, state } = ctx;
  const fin = computeFinancialsForOffset(store.data, new Date(), state.monthOffset);
  $("#label-selected-month").textContent = fin.cycle.start.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
  $("#label-selected-range").textContent = `${shortDate(fin.cycle.start)} – ${shortDate(fin.cycle.end)}${state.monthOffset === 0 ? " · ciclo attuale" : ""}`;
  renderMovimentiChart(fin);
  $("#mov-sum-out").textContent = formatValuta(fin.variableExpensesCents);
  $("#mov-sum-in").textContent = formatValuta(fin.extraIncomeCents);

  const filtered = filterTransactions(fin.cycleTransactions, store.data.categories, {
    query: $("#input-search-tx").value,
    categoryId: $("#select-category-filter").value
  });

  const container = $("#all-transactions-grouped");
  container.innerHTML = "";
  $("#tx-empty-state").classList.toggle("hidden", filtered.length > 0);
  groupByDay(filtered).forEach(({ date, items, netCents }) => {
    const block = document.createElement("div");
    block.style.marginBottom = "6px";
    const label = parseLocalDateString(date).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
    block.innerHTML = `<div class="day-head"><span>${label}</span><span class="money">${netCents > 0 ? "−" : netCents < 0 ? "+" : ""}${formatValuta(Math.abs(netCents))}</span></div>`;
    items.forEach((tx) => block.appendChild(createTxElement(tx)));
    container.appendChild(block);
  });
}

export function initMovimenti() {
  const { state, actions } = ctx;
  $("#btn-month-prev").addEventListener("click", () => { state.monthOffset--; renderMovimentiView(); });
  $("#btn-month-next").addEventListener("click", () => { state.monthOffset++; renderMovimentiView(); });
  $("#input-search-tx").addEventListener("input", renderMovimentiView);
  $("#select-category-filter").addEventListener("change", renderMovimentiView);
  $("#utility-search-input").addEventListener("input", (e) => {
    if (state.activeTab !== "movimenti") { state.monthOffset = 0; actions.switchTab("movimenti", { keepScroll: true }); }
    $("#input-search-tx").value = e.target.value;
    renderMovimentiView();
  });
}
