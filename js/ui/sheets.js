/**
 * Fogli modali dal basso: apertura, chiusura (scrim, Esc, trascinamento) e gestione del focus.
 * Mentre un foglio è aperto l'app sottostante è `inert`.
 */
import { $ } from "./dom.js";

const onCloseHooks = [];
let sheets = [];
let sheetOpener = null;

/** Registra una funzione da eseguire a ogni chiusura (es. fermare il microfono). */
export const onSheetsClosed = (fn) => onCloseHooks.push(fn);
export const anySheetOpen = () => sheets.some((s) => s.classList.contains("open"));

export function openSheet(sheet) {
  if (!anySheetOpen()) sheetOpener = document.activeElement;
  sheets.forEach((s) => { if (s !== sheet) s.classList.remove("open"); });
  sheet.style.transform = "";
  sheet.scrollTop = 0;
  $("#modal-backdrop").classList.add("open");
  sheet.classList.add("open");
  $("#app").inert = true;
}

export function closeAllModals() {
  const wasOpen = anySheetOpen();
  $("#modal-backdrop").classList.remove("open");
  sheets.forEach((s) => { s.classList.remove("open", "dragging"); s.style.transform = ""; });
  $("#app").inert = false;
  onCloseHooks.forEach((fn) => fn());
  if (wasOpen && sheetOpener && document.contains(sheetOpener)) { try { sheetOpener.focus({ preventScroll: true }); } catch (e) { /* ignorato */ } }
  sheetOpener = null;
}

/** Trascinando maniglia o intestazione verso il basso di almeno 90 px il foglio si chiude. */
function enableSheetDrag(sheet) {
  const targets = [sheet.querySelector(".handle"), sheet.querySelector(".sheet-head")].filter(Boolean);
  let startY = 0, currentY = 0, dragging = false;
  targets.forEach((h) => {
    h.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".sheet-close")) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true; startY = event.clientY; currentY = 0;
      sheet.classList.add("dragging");
      h.setPointerCapture(event.pointerId);
    });
    h.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      currentY = Math.max(0, event.clientY - startY);
      sheet.style.transform = `translateY(${currentY}px)`;
    });
    const finish = (event) => {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove("dragging");
      if (currentY >= 90) closeAllModals();
      else sheet.style.transform = "";
      if (h.hasPointerCapture && h.hasPointerCapture(event.pointerId)) h.releasePointerCapture(event.pointerId);
    };
    h.addEventListener("pointerup", finish);
    h.addEventListener("pointercancel", finish);
  });
}

export function initSheets(list) {
  sheets = list;
  sheets.forEach(enableSheetDrag);
  $("#modal-backdrop").addEventListener("click", closeAllModals);
  sheets.forEach((s) => s.querySelector(".sheet-close")?.addEventListener("click", closeAllModals));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && anySheetOpen()) closeAllModals();
  });
}
