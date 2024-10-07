import { database as db } from "../db/index.js";
import { getElements } from "../fun/index.js";
import { toast } from "./toast.js";

export { setupChartOfAccountsForm } from "./setupChartOfAccountsForm.js";
export { setupGeneralLedgerForm } from "./setupGeneralLedgerForm.js";
export { setupAccountHistoryForm } from "./setupAccountHistoryForm.js";
export { setupPointOfSaleForm } from "./setupPointOfSaleForm.js";
export { setupPointOfSaleSearchForm } from "./setupPointOfSaleSearchForm.js";
export { renderPriceChart } from "./renderPriceChart.js";
export { setupGeneralLedgerWelcomeForm } from "./setupGeneralLedgerWelcomeForm.js";
export { runSalesReport, runSalesBySiteReport } from "./runSalesReport.js";

export async function setupGeneralLedgerRawEditor() {
  const ux = {
    editor: null as any as HTMLTextAreaElement,
    save: null as any as HTMLButtonElement,
  };

  getElements(ux, document.body);

  await db.init();

  ux.editor.value = JSON.stringify(db.data, null, 2);

  ux.save.addEventListener("click", async () => {
    try {
      const data = JSON.parse(ux.editor.value);
      await db.rawSave(data);
      toast("Data saved");
    } catch (error) {
      toast(error + "");
    }
  });
}
