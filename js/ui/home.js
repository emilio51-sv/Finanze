/** Scheda "Oggi": hero con grafico, metriche, risparmi, piani, categorie, composizione, attività recenti. */
import { $, escapeHtml, prefersReducedMotion, shortDate } from "./dom.js";
import { ctx } from "./context.js";
import { ICONS, ALERT_ICON, catColor } from "./icons.js";
import { formatValuta, splitAmount } from "../core/money.js";
import { addDays } from "../core/dates.js";
import { getPayrollPayments } from "../core/cycle.js";
import {
  computeFinancials, computeForecast, spentPercent, paceStatus, cumulativeDailyExpenses,
  categoryBreakdown, getRecentTransactions
} from "../core/budget.js";
import { createTxElement, goalElement } from "./items.js";

/* ---------- importo hero con conteggio animato ---------- */
let heroShownCents = null;
let heroRaf = 0;
function paintHeroAmount(cents) {
  const { negative, int, dec } = splitAmount(cents);
  $("#val-disp-sign").hidden = !negative;
  $("#val-disp-int").textContent = int;
  $("#val-disp-dec").textContent = dec;
  heroShownCents = cents;
}
function setHeroAmount(target) {
  cancelAnimationFrame(heroRaf);
  if (heroShownCents === null || prefersReducedMotion() || heroShownCents === target) { paintHeroAmount(target); return; }
  const from = heroShownCents;
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / 650);
    const e = 1 - Math.pow(1 - k, 3);
    paintHeroAmount(Math.round(from + (target - from) * e));
    if (k < 1) heroRaf = requestAnimationFrame(step);
  };
  heroRaf = requestAnimationFrame(step);
}

const BADGES = {
  "deficit": { className: "tag neg", html: `${ALERT_ICON}In deficit` },
  "on-track": { className: "tag pos", text: "In linea" },
  "over-pace": { className: "tag warn", text: "Sopra il ritmo" }
};

export function renderHome() {
  const { store } = ctx;
  const fin = computeFinancials(store.data, new Date());
  $("#label-periodo").textContent = `${shortDate(fin.cycle.start)} – ${shortDate(fin.cycle.end)}`;

  const isNeg = fin.availableCents < 0;
  $("#hero").classList.toggle("is-neg", isNeg);
  setHeroAmount(fin.availableCents);

  const percSpeso = spentPercent(fin);
  const badge = $("#hero-badge-status");
  const b = BADGES[paceStatus(fin)];
  badge.className = b.className;
  if (b.html) badge.innerHTML = b.html; else badge.textContent = b.text;

  $("#label-speso-mese").innerHTML = isNeg
    ? `In deficit di <b class="money">${formatValuta(Math.abs(fin.availableCents))}</b> per questo ciclo.`
    : `Spesi <b class="money">${formatValuta(fin.variableExpensesCents)}</b> su <b class="money">${formatValuta(fin.budgetVariabilePianificato)}</b> di budget variabile.`;

  const fill = $("#progress-fill");
  fill.style.width = `${percSpeso}%`;
  fill.className = isNeg ? "neg" : (percSpeso >= 85 ? "warn" : "");
  $("#progress-bar").setAttribute("aria-valuenow", String(percSpeso));
  $("#label-track-spent").textContent = `${percSpeso}% allocato`;
  $("#val-giorni-rimasti").textContent = `${fin.daysRemaining} ${fin.daysRemaining === 1 ? "giorno rimasto" : "giorni rimasti"}`;

  $("#val-budget-oggi").textContent = formatValuta(fin.dailyBudgetCents);
  const ritmoEl = $("#val-ritmo-spesa");
  if (fin.differenzaRitmoCents >= 0) {
    ritmoEl.textContent = `+${formatValuta(fin.differenzaRitmoCents)}`;
    ritmoEl.className = "money pos-txt";
    $("#val-ritmo-dettaglio").textContent = "in anticipo su target";
  } else {
    ritmoEl.textContent = `−${formatValuta(Math.abs(fin.differenzaRitmoCents))}`;
    ritmoEl.className = "money neg-txt";
    $("#val-ritmo-dettaglio").textContent = "sopra la media";
  }

  const { projectedExpenses, projectedRemainder } = computeForecast(fin);
  $("#forecast-end").textContent = formatValuta(projectedExpenses);
  const rem = $("#forecast-remaining");
  rem.textContent = formatValuta(projectedRemainder);
  rem.className = "money " + (projectedRemainder < 0 ? "neg-txt" : "pos-txt");

  $("#val-sum-entrate").textContent = formatValuta(fin.baseIncome + fin.extraIncomeCents);
  $("#val-risparmi-accantonati").textContent = formatValuta(fin.risparmiCents);
  const debt = $("#val-debito-precedente");
  debt.textContent = fin.debitoCents > 0 ? `−${formatValuta(fin.debitoCents)}` : formatValuta(0);
  debt.className = "money " + (fin.debitoCents > 0 ? "neg-txt" : "muted");
  $("#val-sum-pac").textContent = formatValuta(fin.monthlyPacCents);
  $("#val-sum-fisse").textContent = formatValuta(fin.monthlyFixedCents);
  $("#val-sum-variabili").textContent = formatValuta(fin.variableExpensesCents);

  const hasSalary = getPayrollPayments(store.data.settings).some((p) => p.amountCents > 0);
  $("#onboard-card").classList.toggle("hidden", hasSalary);

  drawHeroChart(fin, projectedExpenses);
  renderCategories(fin);
  renderHomeGoals();
  renderRecentList(getRecentTransactions(store.data.transactions, 5));
}

/* ---------- grafico hero ---------- */
let heroChart = null;

/** Curva monotona (Fritsch–Carlson): non oscilla sotto lo zero né sopra i valori reali. */
function monotonePath(p) {
  const n = p.length;
  if (n === 1) return `M${p[0][0]},${p[0][1]}`;
  const dx = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = p[i + 1][0] - p[i][0]; m[i] = (p[i + 1][1] - p[i][1]) / (dx[i] || 1); }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  const f = (v) => +v.toFixed(1);
  let d = `M${f(p[0][0])},${f(p[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${f(p[i][0] + h)},${f(p[i][1] + t[i] * h)} ${f(p[i + 1][0] - h)},${f(p[i + 1][1] - t[i + 1] * h)} ${f(p[i + 1][0])},${f(p[i + 1][1])}`;
  }
  return d;
}

function drawHeroChart(fin, projected) {
  const svg = $("#hero-chart");
  const days = fin.totalDays;
  const todayIdx = Math.min(days - 1, fin.daysPassed - 1);
  const cum = cumulativeDailyExpenses(fin);
  const plan = fin.budgetVariabilePianificato;
  const maxV = Math.max(plan, cum[todayIdx] || 0, projected, 5000) * 1.1;
  const W = 320, top = 14, bottom = 118;
  const x = (i) => days > 1 ? 6 + (i * 308) / (days - 1) : 160;
  const y = (v) => bottom - (v / maxV) * (bottom - top);
  const pts = [];
  for (let i = 0; i <= todayIdx; i++) pts.push([x(i), y(cum[i])]);
  const line = monotonePath(pts);
  const last = pts[pts.length - 1];
  const projBad = projected > plan;
  svg.innerHTML = `
        <defs>
          <linearGradient id="hc-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--a1);stop-opacity:.42"/><stop offset="1" style="stop-color:var(--a1);stop-opacity:0"/></linearGradient>
          <linearGradient id="hc-line" x1="0" x2="1"><stop offset="0" style="stop-color:var(--a1)"/><stop offset="1" style="stop-color:var(--a2)"/></linearGradient>
        </defs>
        <line class="ch-base" x1="6" x2="${W - 6}" y1="${bottom}" y2="${bottom}"/>
        <line class="ch-plan" x1="${x(0)}" y1="${y(0)}" x2="${x(days - 1)}" y2="${y(plan)}"/>
        <circle class="ch-end" cx="${x(days - 1)}" cy="${y(plan)}" r="3"/>
        ${pts.length > 1 ? `<path d="${line} L${last[0].toFixed(1)},${bottom} L${pts[0][0].toFixed(1)},${bottom}Z" fill="url(#hc-area)"/>` : ""}
        ${todayIdx < days - 1 ? `<line class="ch-proj ${projBad ? "bad" : ""}" x1="${last[0].toFixed(1)}" y1="${last[1].toFixed(1)}" x2="${x(days - 1).toFixed(1)}" y2="${y(projected).toFixed(1)}"/>` : ""}
        <path d="${line}" fill="none" stroke="url(#hc-line)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle class="ch-dot-ring" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="10"/>
        <circle class="ch-dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5"/>
        <text class="ch-axis" x="6" y="134">${shortDate(fin.cycle.start)}</text>
        <text class="ch-axis" x="${W - 6}" y="134" text-anchor="end">${shortDate(fin.cycle.end)}</text>
        <g id="hero-scrub"></g>`;
  svg.setAttribute("aria-label", `Spesi ${formatValuta(cum[todayIdx] || 0)} in ${todayIdx + 1} giorni su ${days}. Budget ${formatValuta(plan)}, proiezione a fine ciclo ${formatValuta(projected)}.`);
  heroChart = { days, todayIdx, cum, x, y, start: fin.cycle.start };
}

function scrubHero(e) {
  if (!heroChart) return;
  const r = $("#hero-chart").getBoundingClientRect();
  const px = ((e.clientX - r.left) / r.width) * 320;
  const { days, todayIdx, cum, x, y, start } = heroChart;
  const i = Math.max(0, Math.min(todayIdx, Math.round(((px - 6) * (days - 1)) / 308)));
  const cx = x(i), cy = y(cum[i]);
  const label = `${shortDate(addDays(start, i))} · ${formatValuta(cum[i])}`;
  const w = Math.max(96, label.length * 6.3 + 20);
  const tx = Math.max(6 + w / 2, Math.min(314 - w / 2, cx));
  const ty = Math.max(0, cy - 40);
  $("#hero-scrub").innerHTML = `
        <line class="ch-scrub-line" x1="${cx}" x2="${cx}" y1="${cy}" y2="118"/>
        <circle class="ch-dot" cx="${cx}" cy="${cy}" r="5.5"/>
        <rect class="ch-tip-bg" x="${tx - w / 2}" y="${ty}" width="${w}" height="26" rx="13"/>
        <text class="ch-tip-tx" x="${tx}" y="${ty + 17}" text-anchor="middle">${label}</text>`;
}

/* ---------- categorie ---------- */
export function renderCategories(fin) {
  const { store, state } = ctx;
  const section = $("#section-spese-categoria");
  if (store.data.settings.quickMode) { section.classList.add("hidden"); return; }
  section.classList.remove("hidden");
  const { rows, totalCents: total } = categoryBreakdown(fin, store.data.categories);
  const max = Math.max(1, ...rows.map((r) => r.cents));
  $("#cat-total").textContent = total ? formatValuta(total) : "";
  $("#cat-total").className = "money";
  const stack = total
    ? `<div class="stack" aria-hidden="true">${rows.filter((r) => r.cents).map((r) => `<i style="--c:${catColor(r.category.key)};flex:${r.cents}"></i>`).join("")}</div>`
    : `<p class="empty" style="padding:14px 10px 6px"><b>Nessuna spesa in questo ciclo</b>Le categorie si riempiono man mano che registri.</p>`;
  const zeroCount = rows.filter((r) => !r.cents).length;
  const visible = state.showAllCats || !total ? rows : rows.filter((r) => r.cents);
  const more = total && zeroCount
    ? `<button type="button" class="cat-more" id="cat-more">${state.showAllCats ? "Mostra solo quelle con spese" : `Mostra tutte (${zeroCount} senza spese)`}</button>`
    : "";
  $("#rings-scroll-list").innerHTML = stack + visible.map(({ category: c, cents: v }) => {
    const pct = total ? Math.round((v / total) * 100) : 0;
    return `<div class="cat-row ${v ? "" : "is-zero"}" role="button" tabindex="0" data-cat-filter="${escapeHtml(c.id)}" style="--c:${catColor(c.key)}" aria-label="${escapeHtml(c.nome)}: ${formatValuta(v)}, apri i movimenti">
          <span class="ic">${ICONS[c.key] || ICONS.varie}</span>
          <div class="cat-main">
            <div class="cat-line"><span>${escapeHtml(c.nome)}</span>${v ? `<small>${pct}%</small>` : ""}<b class="money">${formatValuta(v)}</b></div>
            <div class="bar"><i style="width:${(v / max) * 100}%"></i></div>
          </div>
        </div>`;
  }).join("") + more;
}

/* ---------- piani e attività recenti ---------- */
function renderHomeGoals() {
  const goals = ctx.store.data.goals || [];
  $("#home-goals-wrap").classList.toggle("hidden", !goals.length);
  const list = $("#home-goals");
  list.innerHTML = "";
  goals.forEach((g) => list.appendChild(goalElement(g)));
}

function renderRecentList(recentList) {
  const container = $("#recent-transactions-list");
  container.innerHTML = "";
  const n = ctx.store.data.transactions.length;
  $("#badge-totale-movimenti").textContent = `${n} ${n === 1 ? "totale" : "totali"}`;
  $("#recent-empty-state").classList.toggle("hidden", recentList.length > 0);
  recentList.forEach((tx) => container.appendChild(createTxElement(tx)));
}

export function initHome() {
  const { state, actions } = ctx;
  const heroSvg = $("#hero-chart");
  const clearScrub = () => { const g = $("#hero-scrub"); if (g) g.innerHTML = ""; };
  heroSvg.addEventListener("pointermove", scrubHero);
  heroSvg.addEventListener("pointerdown", scrubHero);
  heroSvg.addEventListener("pointerleave", clearScrub);
  heroSvg.addEventListener("pointercancel", clearScrub);

  $("#rings-scroll-list").addEventListener("click", (e) => {
    if (e.target.closest("#cat-more")) {
      state.showAllCats = !state.showAllCats;
      renderCategories(computeFinancials(ctx.store.data, new Date()));
      return;
    }
    const row = e.target.closest("[data-cat-filter]");
    if (!row) return;
    $("#select-category-filter").value = row.dataset.catFilter;
    state.monthOffset = 0;
    actions.switchTab("movimenti");
  });
  $("#onboard-go").addEventListener("click", () => {
    actions.switchTab("impostazioni");
    setTimeout(() => $("#cfg-cycle-salary").focus(), 350);
  });
}
