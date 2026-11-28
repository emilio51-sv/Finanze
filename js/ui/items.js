/** Righe riutilizzate in più schermate: movimento, piano di accumulo, spesa fissa. */
import { escapeHtml, shortDate } from "./dom.js";
import { ctx } from "./context.js";
import { ICONS, INCOME_COLOR, catColor } from "./icons.js";
import { formatValuta } from "../core/money.js";
import { parseLocalDateString } from "../core/dates.js";
import { monthlyShare } from "../core/budget.js";

const FALLBACK_CATEGORY = { nome: "Spesa", key: "varie" };
const findCategory = (id) => ctx.store.data.categories.find((c) => c.id === id);

function rowElement(className) {
  const el = document.createElement("div");
  el.className = className;
  el.tabIndex = 0;
  el.setAttribute("role", "button");
  return el;
}

export function createTxElement(tx) {
  const el = rowElement("item");
  const cat = findCategory(tx.categoryId) || FALLBACK_CATEGORY;
  const isInc = tx.type === "income";
  const dateFormatted = shortDate(parseLocalDateString(tx.date));
  el.style.setProperty("--c", isInc ? INCOME_COLOR : catColor(cat.key));
  const title = tx.note || (isInc ? "Entrata extra" : cat.nome);
  el.innerHTML = `
        <span class="ic">${isInc ? ICONS.income : (ICONS[cat.key] || ICONS.varie)}</span>
        <span class="item-meta"><span class="item-title">${escapeHtml(title)}</span><span class="item-sub">${isInc ? "Entrata extra" : escapeHtml(cat.nome)} · ${dateFormatted}</span></span>
        <span class="item-amt money ${isInc ? "pos" : ""}">${isInc ? "+" : "−"}${formatValuta(tx.amountCents)}</span>`;
  el.setAttribute("aria-label", `${title}, ${isInc ? "entrata" : "uscita"} di ${formatValuta(tx.amountCents)}, ${dateFormatted}. Modifica`);
  el.addEventListener("click", () => ctx.actions.openTxModal(tx));
  return el;
}

export function goalElement(g) {
  const el = rowElement("goal");
  const cur = g.currentCents || 0;
  const hasTarget = g.targetCents > 0;
  const pct = hasTarget ? Math.min(100, Math.round((cur / g.targetCents) * 100)) : 0;
  el.innerHTML = `
        <div class="goal-head">
          <span class="ic">${ICONS.goal}</span>
          <span class="item-meta"><span class="item-title">${escapeHtml(g.name)}</span><span class="item-sub money">Quota: ${formatValuta(g.monthlyCents)}/mese</span></span>
          <span class="item-amt money">${formatValuta(cur)}${hasTarget ? `<small>${pct}%</small>` : ""}</span>
        </div>
        ${hasTarget ? `<div class="bar"><i style="width:${pct}%"></i></div><div class="goal-foot money"><span>${formatValuta(cur)}</span><span>obiettivo ${formatValuta(g.targetCents)}</span></div>` : ""}`;
  el.addEventListener("click", () => ctx.actions.openGoalModal(g));
  return el;
}

const FREQUENCY_LABEL = { annual: "Annuale (/12)", quarterly: "Trimestrale (/3)" };

export function recurringElement(r) {
  const el = rowElement("item");
  const cat = findCategory(r.categoryId) || { key: "varie" };
  el.style.setProperty("--c", catColor(cat.key));
  el.innerHTML = `
          <span class="ic">${ICONS[cat.key] || ICONS.varie}</span>
          <span class="item-meta"><span class="item-title">${escapeHtml(r.name)}</span><span class="item-sub">${FREQUENCY_LABEL[r.frequency] || "Mensile"} · il ${r.day} del mese</span></span>
          <span class="item-amt money">${formatValuta(r.amountCents)}${r.frequency !== "monthly" ? `<small>${formatValuta(monthlyShare(r))}/mese</small>` : ""}</span>`;
  el.addEventListener("click", () => ctx.actions.openRecurringModal(r));
  return el;
}
