import { database as db, TransactionModel } from "../db/index.js";
import { D } from "../fun/D.js";
import { asBatchLink, asCurrency, getElements } from "../fun/index.js";
import { globals } from "../globals.js";

async function getPointOfSales() {
  await db.init();
  const sales = db.getPointOfSales();
  return sales;
}

export async function runSalesReport() {
  await db.init();

  const ux = {
    startDate: null as any as HTMLInputElement,
    endDate: null as any as HTMLInputElement,
    runReport: null as any as HTMLButtonElement,
    reportResults: null as any as HTMLDivElement,
    nextMonthButton: null as any as HTMLButtonElement,
  };

  getElements(ux, document.body);

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

export async function runSalesBySiteReport() {
  const ux = {
    startDate: null as any as HTMLInputElement,
    endDate: null as any as HTMLInputElement,
    runReport: null as any as HTMLButtonElement,
    reportResults: null as any as HTMLDivElement,
    nextMonthButton: null as any as HTMLButtonElement,
  };
  getElements(ux, document.body);

  const today = D.dateOnly();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  ux.startDate.value = D.asYmd(firstOfMonth);
  ux.endDate.value = D.asYmd(lastOfMonth);

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
    const sales = await getPointOfSales();
    const startDate = ux.startDate.value;
    const endDate = ux.endDate.value;

    const gl = db.getAccounts();

    sales.forEach((sale) => {
      const siteId = parseInt(sale.siteNumber);
      const siteName = gl.find((account) => account.id === siteId)?.name;
      sale.siteName =
        sale.siteName || siteName || sale.siteNumber || sale.partyName;
    });
    sales.sort((a, b) => a.siteName.localeCompare(b.siteName));

    const salesToReport = sales.filter(
      (sale) => sale.checkIn >= startDate && sale.checkIn <= endDate
    );

    const sites = {} as Record<string, number>;
    console.log({ salesToReport });
    salesToReport.forEach((sale, i) => {
      const key = `${sale.siteName}`;
      const totalDue = parseFloat(sale.totalDue);
      const totalDiscount = parseFloat(sale.totalDiscount);
      const totalTax = parseFloat(sale.totalTax);
      const actualDue = totalDue - totalDiscount - totalTax;
      sites[key] = (sites[key] || 0) + actualDue;
    });

    const total = Object.values(sites).reduce((sum, total) => sum + total, 0);
    const target = ux.reportResults;
    target.innerHTML = "";
    Object.entries(sites).forEach(([site, total]) => {
      const row = `
      <div>${site}</div>
      <div></div>
      <div class="align-right">${asCurrency(total)}</div>`;
      target.insertAdjacentHTML("beforeend", row);
    });

    target.insertAdjacentHTML("beforeend", `<div class="span-all"><hr/></div>`);
    target.insertAdjacentHTML(
      "beforeend",
      `<div>Total</div><div></div><div class="align-right">${asCurrency(
        total
      )}</div>`
    );
  });
}
