const PUBLIC_KEY = "123";
const DATABASE_NAME = readQueryString("database") || "test";
const API_URL = "/api";

function readQueryString(name: string) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

type TransactionModel = {
  date: string;
  description: string;
  account: number;
  amt: number;
};

type DatabaseSchema = {
  transactions: TransactionModel[];
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
  } satisfies DatabaseSchema;

  constructor() {}

  async init() {
    const data = localStorage.getItem(DATABASE_NAME);
    if (data) {
      this.#data = JSON.parse(data);
    }
    await this.#load().catch((error) => {
      console.error(`Failed to load data: ${error}`);
    });
  }

  async addTransaction(transactionInfo: TransactionModel) {
    if (!this.#data.transactions) {
      this.#data.transactions = [];
    }
    this.#data.transactions.push(transactionInfo);
    await this.#save();
  }

  async #save() {
    const data = JSON.stringify(this.#data);
    localStorage.setItem(DATABASE_NAME, data);

    await fetch(API_URL, {
      method: "POST",
      body: JSON.stringify({
        key: PUBLIC_KEY,
        topic: DATABASE_NAME,
        value: data,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  async #load() {
    const response = await fetch(`${API_URL}/${DATABASE_NAME}`, {
      method: "GET",
      headers: {
        // public key for the API
        "X-API-Key": PUBLIC_KEY,
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json()) as DatabaseSchema;
    this.#data = data;
    console.log(`Data updated from server: ${JSON.stringify(this.#data)}`);
  }
}

const db = new Database();

export async function setupGeneralLedgerForm() {
  const ux = {
    totalDebit: document.getElementById("total-debit") as HTMLElement,
    totalCredit: document.getElementById("total-credit") as HTMLElement,
    amountDebit: document.getElementById("amount-debit") as HTMLInputElement,
    amountCredit: document.getElementById("amount-credit") as HTMLInputElement,
    saveButton: document.getElementById("save-button") as HTMLButtonElement,
  };

  await db.init();
  // set window title
  document.title = "General Ledger";
  const form = document.getElementById(
    "general-ledger-form"
  ) as HTMLFormElement;

  const date = document.getElementById("date") as HTMLInputElement;
  date.value = new Date().toISOString().substring(0, 10);

  asAmount(ux.amountCredit);
  asAmount(ux.amountCredit);

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
  form.addEventListener("submit", async (event) => {
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

    asAmount(ux.amountDebit);
    asAmount(ux.amountCredit);

    const debit = parseFloat(ux.amountDebit.value || "0");
    account.balance += debit;

    const credit = parseFloat(ux.amountCredit.value || "0");
    account.balance -= credit;

    const transactionInfo = {
      date: date.value,
      description: description.value || "<no description provided>",
      account: account.id,
      amt: debit - credit,
    } satisfies TransactionModel;

    await db.addTransaction(transactionInfo);
    renderTransaction(transactionInfo);
  });

  function asAmount(amount: HTMLInputElement) {
    // must be a currency value (e.g. 123.45)
    amount.pattern = "[0-9]+(\\.[0-9]{1,2})?";
    // must be a positive number
    amount.min = "0.01";
    amount.step = "0.01";

    amount.addEventListener("input", () => {
      form.reportValidity();
    });
    return amount;
  }

  db.getTransactions().forEach((transactionInfo) => {
    renderTransaction(transactionInfo);
  });

  function compute() {
    const transactions = db.getTransactions();
    const totalDebit = transactions.reduce(
      (total, t) => total + Math.max(t.amt, 0),
      0
    );
    const totalCredit = transactions.reduce(
      (total, t) => total + Math.min(t.amt, 0),
      0
    );
    ux.totalDebit.textContent = asCurrency(totalDebit);
    ux.totalCredit.textContent = asCurrency(-totalCredit);
  }

  compute();

  ux.saveButton.addEventListener("click", () => {
    // only save if total debit equals total credit
    if (ux.totalDebit.textContent !== ux.totalCredit.textContent) {
      throw new Error("Debits and credits must balance");
    }
  });
}

function renderTransaction(transactionInfo: TransactionModel) {
  const { date, description, account, amt } = transactionInfo;
  const debit = amt > 0 ? amt : 0;
  const credit = amt < 0 ? -amt : 0;

  const template = `
  <div>${date}</div>
  <div>${safeHtml(description)}</div>
  <div class="align-left">${account}</div>
  <div class="align-right">${debit ? asCurrency(debit) : "-"}</div>
  <div class="align-right">${credit ? asCurrency(credit) : "-"}</div>
  `;
  const target = document.getElementById("general-ledger") as HTMLDivElement;
  target.insertAdjacentHTML("beforeend", template);
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

// report uncaught exceptions
window.addEventListener("error", (event) => {
  const toaster = document.getElementById("toaster") as HTMLElement;
  if (!toaster) {
    alert(`Uncaught exception: ${event.error}`);
    return;
  }

  const message = document.createElement("div");
  message.textContent = `${event.error}`;
  toaster.appendChild(message);
  setTimeout(() => {
    toaster.removeChild(message);
  }, 5000);
});
