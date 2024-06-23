// save mb2024 to a file
import { readFileSync } from "fs";

const fileName = "../server/data/mb2024.json";
const mb2024 = JSON.parse(readFileSync(fileName, "utf8"));

const totals = {};
mb2024.batches.forEach((batch) => {
  batch.transactions.forEach((transaction) => {
    if (!totals[transaction.account]) {
      totals[transaction.account] = 0;
    }
    totals[transaction.account] += transaction.amt;
  });
});

mb2024.accounts.forEach((account) => {
  if (totals[account.id]) {
    account.balance = parseFloat(totals[account.id].toFixed(2));
  }
});

// save mb2024 to a file
import { writeFileSync } from "fs";
writeFileSync(fileName, JSON.stringify(mb2024));
