/** Scheda "Menu": profilo, aspetto, modalità rapida, parametri ciclo, dati e salvataggio. */
import { $ } from "./dom.js";
import { ctx } from "./context.js";
import { applyTheme } from "./theme.js";
import { centsToInput } from "../core/money.js";
import { toLocalDateString } from "../core/dates.js";
import { getPayrollPayments, getPayrollCycle } from "../core/cycle.js";
import { parseAmountInput } from "../data/validate.js";
import { Store } from "../data/store.js";

export function renderImpostazioniView() {
  const { store } = ctx;
  const now = new Date();
  const todayStr = toLocalDateString(now);
  const latestPayment = getPayrollPayments(store.data.settings).filter((p) => p.date <= todayStr).pop();
  const dateInput = $("#cfg-salary-date");
  if (document.activeElement !== dateInput) dateInput.value = latestPayment?.date || todayStr;
  const salaryInput = $("#cfg-cycle-salary");
  if (document.activeElement !== salaryInput) salaryInput.value = latestPayment?.amountCents === undefined ? "" : centsToInput(latestPayment.amountCents);
  const cycle = getPayrollCycle(store.data.settings, now);
  const f = { day: "2-digit", month: "2-digit", year: "numeric" };
  const lbl = `Ciclo attuale: ${cycle.start.toLocaleDateString("it-IT", f)} – ${cycle.end.toLocaleDateString("it-IT", f)}`;
  $("#cfg-salary-cycle-label").textContent = lbl;
  $("#menu-cycle").textContent = lbl;
  $("#cfg-quick-mode").checked = Boolean(store.data.settings.quickMode);
  $("#backup-status-text").textContent = store.data.settings.lastBackupDate
    ? `Ultimo backup: ${new Date(store.data.settings.lastBackupDate).toLocaleDateString("it-IT")}`
    : "Ultimo backup: mai";
  applyTheme();
}

export function renderProfilePhoto() {
  const photo = ctx.store.data.settings.profilePhoto;
  [$("#utility-profile"), $("#menu-avatar")].forEach((el) => {
    if (photo) el.innerHTML = `<img src="${photo}" alt="">`;
    else el.textContent = "FM";
  });
}

export function applyQuickModeUI() {
  const isQuick = Boolean(ctx.store.data.settings.quickMode);
  $("#modal-category-group").classList.toggle("hidden", isQuick);
  $("#select-category-filter").classList.toggle("hidden", isQuick);
  if (isQuick) $("#select-category-filter").value = "all";
}

function saveSalarySettings() {
  const { store, actions } = ctx;
  const salaryDate = $("#cfg-salary-date").value;
  const raw = $("#cfg-cycle-salary").value.trim();
  const field = $("#cfg-cycle-salary").parentElement;
  let cents = null;
  if (raw) {
    const parsed = parseAmountInput(raw, { allowZero: true });
    if (!salaryDate || parsed.error) {
      field.classList.add("is-error");
      actions.showToast(parsed.error && parsed.error.startsWith("L'importo massimo") ? parsed.error : "Inserisci una data e un importo stipendio validi");
      return;
    }
    cents = parsed.cents;
  }
  field.classList.remove("is-error");
  if (raw) store.upsertPayrollPayment({ date: salaryDate, amountCents: cents });
  store.closeElapsedCycles();
  store.save();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  actions.renderAll();
  actions.showToast("Parametri salvati");
}

function downloadBackup() {
  const json = ctx.store.exportJson();
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `finanze-backup-${toLocalDateString(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  renderImpostazioniView();
}

async function importBackup(file) {
  const { store, actions } = ctx;
  const prepared = Store.prepareImport(await file.text(), new Date());
  if (!prepared.ok) { actions.showToast(prepared.error); return; }
  const skipped = prepared.rejected ? ` ${prepared.rejected} voci non valide saranno conservate a parte e non conteggiate.` : "";
  if (!confirm(`Sostituire i dati attuali con il backup (${prepared.count} movimenti)?${skipped} L’operazione non è annullabile.`)) return;
  if (!store.replaceAll(prepared.data)) return;
  location.reload();
}

function resizePhoto(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const s = Math.min(image.width, image.height);
        canvas.getContext("2d").drawImage(image, (image.width - s) / 2, (image.height - s) / 2, s, s, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function initMenu() {
  const { store, actions } = ctx;
  $("#utility-profile").addEventListener("click", () => actions.switchTab("impostazioni"));
  $("#btn-save-settings").addEventListener("click", saveSalarySettings);
  $("#cfg-salary-date").addEventListener("change", (event) => {
    const existing = getPayrollPayments(store.data.settings).find((p) => p.date === event.target.value);
    $("#cfg-cycle-salary").value = existing ? centsToInput(existing.amountCents) : "";
  });

  $("#cfg-quick-mode").addEventListener("change", (e) => {
    store.setSetting("quickMode", e.target.checked);
    applyQuickModeUI();
    actions.renderAll();
  });

  $("#btn-export-json").addEventListener("click", () => { downloadBackup(); actions.showToast("Backup scaricato"); });
  $("#btn-import-json").addEventListener("click", () => $("#import-json-input").click());
  $("#import-json-input").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (f) importBackup(f).catch(() => actions.showToast("File non valido: non è un backup di Finanze"));
  });

  $("#btn-reset-data").addEventListener("click", () => {
    if (!confirm("Verrà scaricata una copia di backup, poi tutti i dati saranno azzerati. Continuare?")) return;
    downloadBackup();
    const typed = (prompt("Per confermare scrivi AZZERA") || "").trim().toUpperCase();
    if (typed !== "AZZERA") { actions.showToast("Azzeramento annullato"); return; }
    store.clearAll();
    location.reload();
  });

  const photoInput = $("#utility-profile-input");
  $("#menu-avatar").addEventListener("click", () => photoInput.click());
  $("#btn-change-photo").addEventListener("click", () => photoInput.click());
  photoInput.addEventListener("change", (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    resizePhoto(file).then((dataUrl) => {
      store.setSetting("profilePhoto", dataUrl);
      renderProfilePhoto();
      actions.showToast("Foto profilo aggiornata");
    }).catch(() => {});
  });
}
