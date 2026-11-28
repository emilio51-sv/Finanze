/**
 * Punto di ingresso. Crea lo store, collega i moduli dell'interfaccia e avvia il primo rendering.
 *
 *   core/   calcolo puro (importi, date, cicli, budget, voce): nessun DOM, testato in Node
 *   data/   schema versionato, migrazioni, validazione, accesso a localStorage
 *   ui/     rendering e gestori di eventi, una schermata per modulo
 */
import { $, $$, prefersReducedMotion } from "./ui/dom.js";
import { ctx } from "./ui/context.js";
import { Store } from "./data/store.js";
import { toLocalDateString } from "./core/dates.js";
import { showToast, initToast } from "./ui/toast.js";
import { initSheets } from "./ui/sheets.js";
import { applyTheme, applyMask, initTheme } from "./ui/theme.js";
import { renderHome, initHome } from "./ui/home.js";
import { renderMovimentiView, initMovimenti } from "./ui/movimenti.js";
import { renderFisseView, initFisse } from "./ui/fisse.js";
import { renderImpostazioniView, renderProfilePhoto, applyQuickModeUI, initMenu } from "./ui/menu.js";
import { openTxModal, openRecurringModal, openGoalModal, initForms } from "./ui/forms.js";

ctx.store = new Store({ onSaveError: () => showToast("Spazio di archiviazione pieno: esporta un backup") });
try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) { /* non supportato */ }

function updateHeaderDate() {
  $("#header-date").textContent = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }).toUpperCase();
}

/** Ridisegna tutte le schermate; un errore in una non blocca le altre. */
function renderAll() {
  updateHeaderDate();
  const views = [["home", renderHome], ["movimenti", renderMovimentiView], ["fisse", renderFisseView], ["impostazioni", renderImpostazioniView], ["profilo", renderProfilePhoto]];
  for (const [name, render] of views) {
    try { render(); } catch (e) { console.error(`render ${name}`, e); }
  }
}

/* ---------- navigazione ---------- */
const TABS = ["oggi", "movimenti", "fisse", "impostazioni"];
const TAB_RENDER = { movimenti: renderMovimentiView, fisse: renderFisseView, impostazioni: renderImpostazioniView };

function switchTab(target, opts = {}) {
  if (!TABS.includes(target)) return;
  const changed = target !== ctx.state.activeTab;
  ctx.state.activeTab = target;
  $$(".dock-slot").forEach((b) => {
    if (b.dataset.tab === target) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  $("#dock").style.setProperty("--i", TABS.indexOf(target));
  TABS.forEach((t) => {
    const v = $(`#view-${t}`);
    v.classList.toggle("hidden", t !== target);
    v.classList.remove("is-entering");
  });
  const view = $(`#view-${target}`);
  if (changed) { void view.offsetWidth; view.classList.add("is-entering"); }
  if (TAB_RENDER[target]) TAB_RENDER[target]();
  if (changed && !opts.keepScroll) window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

Object.assign(ctx.actions, { renderAll, switchTab, showToast, openTxModal, openRecurringModal, openGoalModal });

/* ---------- collegamento dei moduli ---------- */
initToast();
initSheets([$("#modal-add"), $("#modal-recurring"), $("#modal-goal")]);
initTheme();
initHome();
initMovimenti();
initFisse();
initMenu();
initForms();
$$(".dock-slot").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

/* righe con role="button" utilizzabili da tastiera */
document.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches('[role="button"][tabindex="0"]')) {
    e.preventDefault();
    e.target.click();
  }
});

/* al ritorno in app in un giorno nuovo: chiusura dei cicli conclusi e ridisegno */
let lastDay = toLocalDateString(new Date());
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const today = toLocalDateString(new Date());
  if (today === lastDay) return;
  lastDay = today;
  ctx.store.closeElapsedCycles();
  renderAll();
});

/* ---------- avvio ---------- */
ctx.store.closeElapsedCycles();
applyTheme();
applyMask();
applyQuickModeUI();
renderAll();
$("#dock").style.setProperty("--i", 0);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => console.error("SW register error", err));
  });
}
