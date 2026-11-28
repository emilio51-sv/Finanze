/** Utilità DOM condivise dall'interfaccia. */
export const $ = (s) => document.querySelector(s);
export const $$ = (s) => Array.from(document.querySelectorAll(s));

export function escapeHtml(str) {
  if (typeof str !== "string") return "";
  return str.replace(/[&<>'"]/g, (t) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[t] || t));
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Formato data italiano breve: "28 nov". */
export const shortDate = (d) => d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
