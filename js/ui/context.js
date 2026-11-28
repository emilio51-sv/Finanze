/**
 * Stato condiviso dell'interfaccia. `actions` è popolato da app.js all'avvio: i moduli
 * di rendering lo usano solo dentro i gestori di eventi, così non si importano a vicenda.
 */
export const ctx = {
  /** @type {import("../data/store.js").Store} */
  store: null,
  state: { activeTab: "oggi", monthOffset: 0, showAllCats: false },
  actions: {
    renderAll: () => {},
    switchTab: () => {},
    showToast: () => {},
    openTxModal: () => {},
    openRecurringModal: () => {},
    openGoalModal: () => {}
  }
};
