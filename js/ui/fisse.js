/** Scheda "Fisse & PAC": spese fisse e piani di accumulo. */
import { $, $$ } from "./dom.js";
import { ctx } from "./context.js";
import { formatValuta } from "../core/money.js";
import { getMonthlyFixedCents, getMonthlyPacCents } from "../core/budget.js";
import { goalElement, recurringElement } from "./items.js";

export function renderFisseView() {
  const { store } = ctx;
  const recList = $("#recurring-list");
  recList.innerHTML = "";
  const recs = store.data.recurring || [];
  $("#recurring-empty").classList.toggle("hidden", recs.length > 0);
  recs.forEach((r) => recList.appendChild(recurringElement(r)));
  $("#recurring-total").textContent = formatValuta(getMonthlyFixedCents(store.data));

  const list = $("#goals-list");
  list.innerHTML = "";
  const goals = store.data.goals || [];
  $("#goals-empty").classList.toggle("hidden", goals.length > 0);
  goals.forEach((g) => list.appendChild(goalElement(g)));
  $("#goals-total").textContent = formatValuta(getMonthlyPacCents(store.data));
}

export function showSub(id) {
  $$(".subnav-btn").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.sub === id)));
  $$(".subnav-pane").forEach((p) => p.classList.toggle("hidden", p.id !== id));
}

export function initFisse() {
  $$(".subnav-btn").forEach((b) => b.addEventListener("click", () => showSub(b.dataset.sub)));
  $$("[data-goto]").forEach((b) => b.addEventListener("click", () => {
    ctx.actions.switchTab("fisse");
    showSub(b.dataset.goto === "pac" ? "sub-pac" : "sub-fisse");
  }));
}
