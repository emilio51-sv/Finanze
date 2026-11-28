/** Toast di conferma, con "Annulla" facoltativo per 5 secondi. */
import { $ } from "./dom.js";

let toastTimer = null;
let toastUndo = null;

export function showToast(msg, undoFn = null) {
  clearTimeout(toastTimer);
  toastUndo = undoFn;
  $("#toast-message").textContent = msg;
  $("#btn-toast-undo").classList.toggle("hidden", !undoFn);
  const t = $("#toast-undo");
  t.classList.add("show");
  toastTimer = setTimeout(() => { t.classList.remove("show"); toastUndo = null; }, undoFn ? 5000 : 2600);
}

export function initToast() {
  $("#btn-toast-undo").addEventListener("click", () => {
    if (toastUndo) { const fn = toastUndo; toastUndo = null; fn(); }
    $("#toast-undo").classList.remove("show");
  });
}
