/**
 * Tema (Lumen chiaro · Obsidian scuro) e mascheramento degli importi.
 * Il primo tema è applicato da uno script inline nel <head>, prima del primo disegno;
 * questo modulo lo tiene allineato alle scelte successive e al tema di sistema.
 */
import { $, $$ } from "./dom.js";
import { ctx } from "./context.js";
import { EYE_ICON, EYE_OFF_ICON } from "./icons.js";

const THEME_COLOR = { dark: "#05060F", light: "#EEF0FF" };
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

/** Tema effettivo per una preferenza: "auto" segue il sistema. */
export const resolveTheme = (pref, systemDark) => (pref === "dark" || (pref === "auto" && systemDark) ? "dark" : "light");

export function applyTheme() {
  const pref = ctx.store.data.settings.theme || "auto";
  const theme = resolveTheme(pref, darkQuery.matches);
  document.documentElement.dataset.theme = theme;
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLOR[theme];
  $$('input[name="cfg-theme"]').forEach((r) => { r.checked = r.value === pref; });
}

function watchSystemTheme() {
  const onChange = () => { if ((ctx.store.data.settings.theme || "auto") === "auto") applyTheme(); };
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", onChange);
  else darkQuery.addListener(onChange);
}

export function applyMask() {
  const on = Boolean(ctx.store.data.settings.maskAmounts);
  document.body.classList.toggle("is-masked", on);
  const btn = $("#btn-mask");
  btn.setAttribute("aria-pressed", String(on));
  btn.setAttribute("aria-label", on ? "Mostra importi" : "Nascondi importi");
  btn.innerHTML = on ? EYE_OFF_ICON : EYE_ICON;
}

export function initTheme() {
  watchSystemTheme();
  $("#btn-mask").addEventListener("click", () => {
    ctx.store.setSetting("maskAmounts", !ctx.store.data.settings.maskAmounts);
    applyMask();
  });
  $$('input[name="cfg-theme"]').forEach((r) => r.addEventListener("change", () => {
    ctx.store.setSetting("theme", r.value);
    applyTheme();
  }));
}
