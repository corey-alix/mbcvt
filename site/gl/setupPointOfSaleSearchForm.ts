import { database } from "../db/index.js";

export async function setupPointOfSaleSearchForm() {
  await database.init();

  const rowTemplate =
    document.querySelector<HTMLTemplateElement>("#rowTemplate")!;

  const grid = rowTemplate.parentElement!;

  const receipts = database.getReceipts().toReversed();

  const data = receipts.map((r) => {
    return {
      nameOfParty: r.nameOfParty,
      dates: r.dates,
      batchId: r.batchId,
    };
  });

  function render() {
    // remove all .data-row elements
    const rows = document.querySelectorAll(".data-row");
    rows.forEach((row) => row.remove());
    data.forEach((receipt) => {
      const row = rowTemplate.content.cloneNode(true) as HTMLElement;
      const link = `<a href="pos.html?batch=${receipt.batchId}">${receipt.nameOfParty}</a>`;
      row.querySelector("#nameOfParty")!.innerHTML = link;
      row.querySelector("#dates")!.textContent = receipt.dates;
      grid.appendChild(row);
    });
  }

  render();

  const headers = document.querySelectorAll("[data-sort]");
  headers.forEach((header) => {
    header.addEventListener("click", () => {
      const key = header.getAttribute("data-sort")! as keyof (typeof data)[0];
      data.sort((a, b) => {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
        return 0;
      });
      render();
    });
  });
}
