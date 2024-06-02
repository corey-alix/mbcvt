type TransactionModel = {
  date: string;
  description: string;
  account: number;
  amt: number;
};

const glAccounts = [
  {
    id: 1001,
    name: "Cash",
    balance: 1000,
  },
  {
    id: 2001,
    name: "Accounts Receivable",
    balance: 2000,
  },
  {
    id: 3001,
    name: "Inventory",
    balance: 3000,
  },
  {
    id: 2101,
    name: "Site F1",
    balance: 1800,
  },
];

class Database {
  getTransactions() {
    return this.#data.transactions || [];
  }

  #data = {
    transactions: [] as TransactionModel[],
  };

  constructor() {
    const data = localStorage.getItem("gl");
    if (data) {
      this.#data = JSON.parse(data);
    }
  }

  addTransaction(transactionInfo: TransactionModel) {
    if (!this.#data.transactions) {
      this.#data.transactions = [];
    }
    this.#data.transactions.push(transactionInfo);
    this.#save();
  }

  #save() {
    localStorage.setItem("gl", JSON.stringify(this.#data));
  }
}

const db = new Database();

export function setupGeneralLedgerForm() {
  // set window title
  document.title = "General Ledger";
  const form = document.getElementById(
    "general-ledger-form"
  ) as HTMLFormElement;

  const date = document.getElementById("date") as HTMLInputElement;
  date.value = new Date().toISOString().substring(0, 10);

  const amountDebit = asAmount("amount-debit");
  var amountCredit = asAmount("amount-credit");

  const description = document.getElementById(
    "description"
  ) as HTMLInputElement;

  const accountDescription = document.getElementById(
    "account-description"
  ) as HTMLElement;

  // validate account number against the list of accounts
  const accountNumber = document.getElementById(
    "account-number"
  ) as HTMLInputElement;
  accountNumber.addEventListener("input", () => {
    const account = glAccounts.find(
      (a) => a.id === parseInt(accountNumber.value)
    );
    if (!account) {
      accountNumber.setCustomValidity("Invalid account number");
      accountDescription.textContent = "";
    } else {
      accountNumber.setCustomValidity("");
      accountDescription.textContent = account.name;
    }
    // validate the form
    form.reportValidity();
  });

  // intercept form submission
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      return;
    }

    const account = glAccounts.find(
      (a) => a.id === parseInt(accountNumber.value)
    );
    if (!account) {
      throw new Error("Invalid account number");
    }

    const debit = parseFloat(amountDebit.value || "0");
    account.balance += debit;

    const credit = parseFloat(amountCredit.value || "0");
    account.balance -= credit;

    const transactionInfo = {
      date: date.value,
      description: description.value || "<no description provided>",
      account: account.id,
      amt: debit - credit,
    } satisfies TransactionModel;

    db.addTransaction(transactionInfo);
    renderTransaction(transactionInfo);
  });

  function asAmount(id: string) {
    const amountDebit = document.getElementById(id) as HTMLInputElement;
    // must be a currency value (e.g. 123.45)
    amountDebit.pattern = "[0-9]+(\\.[0-9]{1,2})?";
    // must be a positive number
    amountDebit.min = "0.01";
    amountDebit.step = "0.01";

    amountDebit.addEventListener("input", () => {
      form.reportValidity();
    });
    return amountDebit;
  }

  db.getTransactions().forEach((transactionInfo) => {
    renderTransaction(transactionInfo);
  });
}

function renderTransaction(transactionInfo: TransactionModel) {
  const { date, description, account, amt } = transactionInfo;
  const debit = amt > 0 ? amt : 0;
  const credit = amt < 0 ? -amt : 0;

  const template = `<tr><td>${date}</td><td>${safeHtml(
    description
  )}<td class="align-left">${account}</td><td class="align-right">${
    debit ? asCurrency(debit) : ""
  }</td><td class="align-right">${credit ? asCurrency(credit) : ""}</td></tr>`;
  const target = document.getElementById("general-ledger") as HTMLTableElement;
  const tbody = target.querySelector("tbody") as HTMLTableSectionElement;
  tbody.insertAdjacentHTML("beforebegin", template);
}

function safeHtml(description: string) {
  // prevent XSS attacks
  return description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function asCurrency(amount: number) {
  // return the amount as USD
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
