import { Database, TransactionModel } from "../db/index.js";
import { asBatchLink, asCurrency } from "../fun/index.js";
import { globals } from "../globals.js";

export async function runSalesReport() {
  const db = new Database();
  await db.init();

  const ux = {
    startDate: null as any as HTMLInputElement,
    endDate: null as any as HTMLInputElement,
    runReport: null as any as HTMLButtonElement,
    reportResults: null as any as HTMLDivElement,
    nextMonthButton: null as any as HTMLButtonElement,
  };

  function report(sales: Array<TransactionModel & { batchId: number }>) {
    const total = sales.reduce((sum, transaction) => sum + transaction.amt, 0);
    const target = ux.reportResults;
    target.innerHTML = "";
    sales.forEach((transaction) => {
      const row = `<div>${asBatchLink(
        transaction.batchId,
        transaction.date
      )}</div><div>${
        transaction.description
      }</div><div class="align-right">${asCurrency(transaction.amt)}</div>`;
      target.insertAdjacentHTML("beforeend", row);
    });

    target.insertAdjacentHTML("beforeend", `<div class="span-all"><hr/></div>`);

    target.insertAdjacentHTML(
      "beforeend",
      `<div>Total</div><div></div><div class="align-right">${asCurrency(
        total
      )}</div>
      <div>Tax Liability</div><div></div><div class="align-right">${asCurrency(
        total * globals.TAX_RATE
      )}</div>`
    );
  }

  Object.keys(ux).forEach((key) => {
    const input = document.querySelector<HTMLElement>(`#${key}`)!;
    if (!input) throw new Error(`Input not found: ${key}`);
    (ux as any)[key] = input;
  });

  ux.nextMonthButton.addEventListener("click", () => {
    let startDate = new Date(ux.startDate.value);
    const month = startDate.getMonth();
    const year = startDate.getFullYear();

    startDate = new Date(year, month + 2, 1);
    const endDate = new Date(year, month + 3, 0);

    ux.startDate.value = startDate.toISOString().slice(0, 10);
    ux.endDate.value = endDate.toISOString().slice(0, 10);
  });

  ux.runReport.addEventListener("click", async () => {
    const startDate = ux.startDate.value;
    const endDate = ux.endDate.value;
    const sales = [] as Array<TransactionModel & { batchId: number }>;
    db.getBatches().forEach((batch) => {
      batch.transactions.forEach((transaction) => {
        if (transaction.account >= 2100 && transaction.account < 2200) {
          if (transaction.date >= startDate && transaction.date <= endDate) {
            sales.push({ batchId: batch.id, ...transaction });
          }
        }
      });
    });
    sales.sort((a, b) => a.date.localeCompare(b.date));
    // flip the sign on the amt since sales are credits toward a site/asset
    sales.forEach((transaction) => (transaction.amt = -transaction.amt));
    report(sales);
  });

  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  ux.startDate.value = firstOfMonth.toISOString().slice(0, 10);
  ux.endDate.value = lastOfMonth.toISOString().slice(0, 10);
}
