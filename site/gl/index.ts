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

type AccountModel = {
  id: number;
  name: string;
  balance: number;
};

type BatchModel = {
  id: number;
  date: string;
  transactions: TransactionModel[];
};

type DatabaseSchema = {
  batches: BatchModel[];
  accounts: AccountModel[];
  transactions: TransactionModel[];
};

class Database {
  getBatches() {
    return this.#data.batches || [];
  }

  async createBatch() {
    this.#data.batches = this.#data.batches || [];
    this.#data.batches.push({
      id: this.#data.batches.length + 1,
      date: new Date().toISOString().substring(0, 10),
      transactions: this.#data.transactions,
    });
    this.#data.transactions = [];
    await this.#save();
  }

  getCurrentTransactions() {
    return this.#data.transactions || [];
  }
  getAccounts() {
    return this.#data.accounts || [];
  }

  getTransactions(batchId: number) {
    return this.#data.batches.find((b) => b.id === batchId)?.transactions || [];
  }

  #data = {
    accounts: [] as AccountModel[],
    batches: [] as BatchModel[],
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

  async addAccount(account: AccountModel) {
    if (!this.#data.accounts) {
      this.#data.accounts = [];
    }
    this.#data.accounts.push(account);
    await this.#save();
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

export async function setupGeneralLedgerForm() {
  const db = new Database();
  await db.init();

  const state = {
    batchId: 0,
  };

  const ux = {
    form: document.getElementById("general-ledger-form") as HTMLFormElement,
    totalDebit: document.getElementById("total-debit") as HTMLElement,
    totalCredit: document.getElementById("total-credit") as HTMLElement,
    amountDebit: document.getElementById("amount-debit") as HTMLInputElement,
    amountCredit: document.getElementById("amount-credit") as HTMLInputElement,
    date: document.getElementById("date") as HTMLInputElement,
    description: document.getElementById("description") as HTMLInputElement,
    accountDescription: document.getElementById(
      "account-description"
    ) as HTMLElement,
    accountNumber: document.getElementById(
      "account-number"
    ) as HTMLInputElement,
    saveButton: document.getElementById("save-button") as HTMLButtonElement,
    addAccountButton: document.getElementById(
      "add-account"
    ) as HTMLButtonElement,
    addEntryButton: document.getElementById("add-entry") as HTMLButtonElement,
    priorBatchButton: document.getElementById(
      "batch-prev"
    ) as HTMLButtonElement,
    nextBatchButton: document.getElementById("batch-next") as HTMLButtonElement,
  };

  // set window title
  document.title = "General Ledger";

  ux.date.value = new Date().toISOString().substring(0, 10);
  asAmount(ux.amountCredit);
  asAmount(ux.amountDebit);

  const glAccounts = db.getAccounts();

  ux.addAccountButton.addEventListener("click", async () => {
    const accountName = prompt("Enter account name");
    if (!accountName) {
      return;
    }

    const account = {
      id: ux.accountNumber.valueAsNumber,
      name: accountName,
      balance: 0,
    } satisfies AccountModel;

    glAccounts.push(account);
    await db.addAccount(account);
  });

  ux.accountNumber.addEventListener("input", () => {
    const account = glAccounts.find(
      (a) => a.id === parseInt(ux.accountNumber.value)
    );
    ux.addAccountButton.disabled = !!account;
    if (!account) {
      ux.accountNumber.setCustomValidity("Invalid account number");
      ux.accountDescription.textContent = "";
    } else {
      ux.accountNumber.setCustomValidity("");
      ux.accountDescription.textContent = account.name;
    }
    // validate the form
    ux.form.reportValidity();
  });

  // intercept form submission
  ux.form.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  ux.priorBatchButton.addEventListener("click", async () => {
    if (state.batchId > 0) {
      state.batchId--;
      render();
    } else {
      const batches = db.getBatches();
      const maxBatchId = batches.reduce((max, b) => Math.max(max, b.id), 0);
      state.batchId = maxBatchId;
      render();
    }
    toast(`Batch ${state.batchId}`);
  });

  ux.nextBatchButton.addEventListener("click", async () => {
    const batches = db.getBatches();
    const maxBatchId = batches.reduce((max, b) => Math.max(max, b.id), 0);
    if (state.batchId < maxBatchId) {
      state.batchId++;
      render();
    } else {
      state.batchId = 0;
      render();
    }
    toast(`Batch ${state.batchId}`);
  });

  ux.addEntryButton.addEventListener("click", async (event) => {
    if (!ux.form.checkValidity()) {
      return;
    }

    const account = glAccounts.find(
      (a) => a.id === parseInt(ux.accountNumber.value)
    );
    if (!account) {
      throw new Error("Invalid account number");
    }

    const debit = parseFloat(ux.amountDebit.value || "0");
    account.balance += debit;

    const credit = parseFloat(ux.amountCredit.value || "0");
    account.balance -= credit;

    const transactionInfo = {
      date: ux.date.value,
      description: ux.description.value || "<no description provided>",
      account: account.id,
      amt: debit - credit,
    } satisfies TransactionModel;

    await db.addTransaction(transactionInfo);
    render();
  });

  function render() {
    const target = document.getElementById("general-ledger") as HTMLDivElement;
    target.innerHTML = "";

    if (state.batchId) {
      const transactions = db.getTransactions(state.batchId);
      transactions.forEach((transactionInfo) => {
        renderTransaction(transactionInfo);
      });
      compute(transactions);
    } else {
      const transactions = db.getCurrentTransactions();
      transactions.forEach((transactionInfo) => {
        renderTransaction(transactionInfo);
      });
      compute(transactions);
    }
  }

  function asAmount(amount: HTMLInputElement) {
    // must be a currency value (e.g. 123.45)
    amount.pattern = "[0-9]+(\\.[0-9]{1,2})?";
    // must be a positive number
    amount.min = "0.01";
    amount.step = "0.01";

    amount.addEventListener("input", () => {
      ux.form.reportValidity();
    });
    return amount;
  }

  function compute(transactions: TransactionModel[] ) {
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

  render();

  ux.saveButton.addEventListener("click", async () => {
    // only save if total debit equals total credit
    if (ux.totalDebit.textContent !== ux.totalCredit.textContent) {
      throw new Error("Debits and credits must balance");
    }

    await db.createBatch();
    window.location.reload();
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
  const message = `Uncaught exception: ${event.error}`;
  toast(message);
});

function toast(message: string) {
  const toaster = document.getElementById("toaster") as HTMLElement;
  if (!toaster) {
    alert(message);
    return;
  }

  const messageDiv = document.createElement("div");
  messageDiv.textContent = message;
  toaster.appendChild(messageDiv);

  setTimeout(() => {
    toaster.removeChild(messageDiv);
  }, 5000);
}
