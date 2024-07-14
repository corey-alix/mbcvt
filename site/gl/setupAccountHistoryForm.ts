import { database as db, TransactionModel } from "../db/index.js";
import { asBatchLink } from "../fun/index.js";
import { asCurrency } from "../fun/index.js";

export async function setupAccountHistoryForm() {
  const target = document.querySelector("#general-ledger") || document.body;
  await db.init();

  // read account number from query string
  const url = new URL(window.location.href);
  const accountNumber = url.searchParams.get("account");
  if (!accountNumber) {
    throw "'account' is a required query string parameter";
  }

  // get account description
  const account = db
    .getAccounts()
    .find((account) => account.id === parseInt(accountNumber));
  if (!account) {
    throw `Account not found: ${accountNumber}`;
  }
  document.title = `Account History: ${account.name}`;
  document.getElementById("title")!.textContent = document.title;

  const transactions = [] as Array<TransactionModel & { batchId: number }>;
  db.getBatches().forEach((batch) => {
    db.getTransactions(batch.id).forEach((transaction) => {
      if (transaction.account === parseInt(accountNumber)) {
        transactions.push({ batchId: batch.id, ...transaction });
      }
    });
  });

  // sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  const rowTemplate = document.getElementById(
    "row-template"
  ) as HTMLTemplateElement;
  if (!rowTemplate) throw "row-template not found";

  const table = document
    .getElementById("general-ledger")
    ?.querySelector("table");
  if (!table) throw "table not found";

  let balance = 0;

  transactions.map((transaction) => {
    const row = (
      rowTemplate.content.cloneNode(true) as HTMLElement
    ).querySelector("tr")!;
    const link = asBatchLink(transaction.batchId, transaction.date);
    const description = transaction.description;
    const amt = asCurrency(transaction.amt);
    balance += transaction.amt;
    row.querySelector("#batchLink")!.innerHTML = link;
    row.querySelector("#transactionDescription")!.innerHTML = description;
    if (transaction.amt > 0) {
      row.querySelector("#transactionDebit")!.innerHTML = amt;
    } else if (transaction.amt < 0) {
      row.querySelector("#transactionCredit")!.innerHTML = amt;
    }
    row.querySelector("#transactionBalance")!.innerHTML = asCurrency(balance);
    row.querySelector("#batchLink")!.innerHTML = link;
    rowTemplate.parentElement?.appendChild(row);
  });
}
