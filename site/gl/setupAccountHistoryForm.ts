import { Database, TransactionModel } from "../db/index.js";
import { asBatchLink } from "../fun/index.js";
import { asCurrency } from "../fun/index.js";

export async function setupAccountHistoryForm() {
  const target = document.querySelector("#general-ledger") || document.body;
  const db = new Database();
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

  const table = document.createElement("table");
  let balance = 0;
  table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Description</th>
                <th class="align-right">Amount</th>
                <th class="align-right">Balance</th>
            </tr>
        </thead>
        <tbody>
            ${transactions
              .map(
                (transaction) => `
                <tr>
                    <td>${asBatchLink(
                      transaction.batchId,
                      transaction.date
                    )}</td>
                    <td>${transaction.description}</td>
                    <td class="align-right">${asCurrency(transaction.amt)}</td>
                    <td class="align-right">${asCurrency(
                      (balance += transaction.amt)
                    )}</td>
                </tr>
            `
              )
              .join("")}
        </tbody>
    `;
  target.appendChild(table);
}
