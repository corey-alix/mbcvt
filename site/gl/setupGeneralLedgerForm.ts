import { database as db, TransactionModel } from "../db/index.js";
import { asLinkToAccountHistory } from "../fun/index.js";
import { readQueryString, safeHtml, asCurrency } from "../fun/index.js";
import { toast } from "./toast.js";
import { asShortDate, trigger, navigateTo, on } from "./gl.js";

export async function setupGeneralLedgerForm() {
  await db.init();

  function renderTransaction(
    transactionInfo: TransactionModel,
    transactionIndex?: number
  ) {
    const { date, description, account, amt } = transactionInfo;
    const debit = amt > 0 ? amt : 0;
    const credit = amt < 0 ? -amt : 0;

    const accountInfo = db.getAccounts().find((a) => a.id === account);
    if (!accountInfo) throw new Error(`Account not found: ${account}`);

    const template = `
    <div>${asShortDate(date)}</div>
    <div title="${
      accountInfo?.name
    }" class="align-left">${asLinkToAccountHistory(
      account,
      account + " (" + accountInfo.name + ")"
    )}</div>
    <div>${safeHtml(description)}</div>
    <div class="align-right">${debit ? asCurrency(debit) : ""}</div>
    <div class="align-right">${credit ? asCurrency(credit) : ""}</div>
    ${
      transactionIndex != null
        ? `<button class="delete-button" data-action="delete-row" data-id="${transactionIndex}">X</button>`
        : "<div></div>"
    }
    `;
    const target = ux.generalLedger;
    target.insertAdjacentHTML("beforeend", template);

    const actions = target.querySelectorAll("[data-action]");
    actions.forEach((action) => {
      const command = action.getAttribute("data-action")!;
      action.removeAttribute("data-action");
      action.addEventListener("click", () => {
        trigger(command, { element: action });
      });
    });
  }

  const state = {
    batchId: 0,
  };

  if (readQueryString("batch")) {
    state.batchId = parseInt(readQueryString("batch")!);
  }

  const ux = {
    generalLedgerForm: null as any as HTMLFormElement,
    generalLedger: null as any as HTMLElement,
    generalLedgerTotal: null as any as HTMLElement,
    totalDebit: null as any as HTMLElement,
    totalCredit: null as any as HTMLElement,
    amountDebit: null as any as HTMLInputElement,
    amountCredit: null as any as HTMLInputElement,
    date: null as any as HTMLInputElement,
    description: null as any as HTMLInputElement,
    accountDescription: null as any as HTMLInputElement,
    accountNumber: null as any as HTMLInputElement,
    saveButton: null as any as HTMLButtonElement,
    addAccountButton: null as any as HTMLButtonElement,
    addEntryButton: null as any as HTMLButtonElement,
    priorBatchButton: null as any as HTMLButtonElement,
    nextBatchButton: null as any as HTMLButtonElement,
    batchDate: null as any as HTMLElement,
    batchCurrentButton: null as any as HTMLButtonElement,
  };

  Object.keys(ux).forEach((key) => {
    const element = document.getElementById(key);
    if (!element) {
      throw new Error(`Missing element: ${key}`);
    }
    (ux as any)[key] = element;
  });

  document.querySelectorAll("[data-action]").forEach((actionNode) => {
    const actionNames = actionNode.getAttribute("data-action")?.split(" ");
    actionNames?.forEach((actionName) => {
      switch (actionName) {
        case "select-on-focus":
          actionNode.addEventListener("focus", () => {
            (actionNode as HTMLInputElement).select();
          });
          break;
      }
    });
  });

  ux.date.value = new Date().toISOString().substring(0, 10);
  ux.description.focus();

  asAmount(ux.amountCredit);
  asAmount(ux.amountDebit);

  ux.amountCredit.addEventListener("input", () => (ux.amountDebit.value = ""));
  ux.amountDebit.addEventListener("input", () => (ux.amountCredit.value = ""));

  const glAccounts = db.getAccounts();

  ux.addAccountButton.addEventListener("click", async () => {
    // navigate to chart-of-accounts.html
    navigateTo("chart-of-accounts.html");
  });

  ux.accountNumber.addEventListener("input", () => {
    const account = glAccounts.find(
      (a) => a.id === parseInt(ux.accountNumber.value)
    );

    if (!account) {
      ux.accountDescription.value = "";
      ux.accountDescription.disabled = false;
    } else {
      ux.accountDescription.value = account.name;
      ux.accountDescription.disabled = true;
    }
  });

  // intercept form submission
  ux.generalLedgerForm.addEventListener("submit", (event) => {
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
  });

  ux.batchCurrentButton.addEventListener("click", async () => {
    state.batchId = 0;
    render();
  });

  ux.addEntryButton.addEventListener("click", async (event) => {
    if (!ux.generalLedgerForm.checkValidity()) {
      return;
    }

    let account = glAccounts.find(
      (a) => a.id === parseInt(ux.accountNumber.value)
    );
    if (!account) {
      const accountDescription = ux.accountDescription.value;
      if (!accountDescription) {
        throw new Error("Account description is required");
      }
      account = {
        id: parseInt(ux.accountNumber.value),
        name: accountDescription,
        balance: 0,
      };
      await db.addAccount(account);
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

    trigger("on-add-entry");
  });

  function render() {
    const target = ux.generalLedger;
    target.innerHTML = `
    <div class="header">Date</div>
    <div class="header align-left">Account Number</div>
    <div class="header align-left">Description</div>
    <div class="header align-right">Debit</div>
    <div class="header align-right">Credit</div>
    <div></div>`;

    document.body.classList.toggle("batch-mode", !!state.batchId);

    if (state.batchId) {
      const batch = db.getBatches().find((b) => b.id === state.batchId);
      if (!batch) throw new Error(`Batch not found: ${state.batchId}`);
      ux.batchDate.textContent = batch.date.toString();

      const transactions = db.getTransactions(state.batchId);
      transactions.sort(
        (a, b) => a.date.localeCompare(b.date) || a.account - b.account
      );
      transactions.forEach((transactionInfo) => {
        renderTransaction(transactionInfo);
      });
      compute(transactions);
      // add the "batch" to the query string
      const url = new URL(window.location.href);
      url.searchParams.set("batch", state.batchId.toString());
      window.history.replaceState({}, "", url.toString());
    } else {
      ux.batchDate.textContent = "Today";
      const transactions = db.getCurrentTransactions();
      transactions.forEach((transactionInfo, index) => {
        renderTransaction(transactionInfo, index);
      });
      // remove "batch" from the query string
      const url = new URL(window.location.href);
      url.searchParams.delete("batch");
      window.history.replaceState({}, "", url.toString());
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
      ux.generalLedgerForm.reportValidity();
    });
    return amount;
  }

  function compute(transactions: TransactionModel[]) {
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

    const clone = ux.generalLedgerTotal.cloneNode(true) as HTMLElement;
    // copy all the children into ux.generalLedger
    ux.generalLedger.append(...clone.childNodes);
  }

  function updateBalance() {
    const transactions = db.getCurrentTransactions();

    let totalDebit = 0;
    let totalCredit = 0;

    transactions.forEach((t) => {
      if (t.amt < 0) totalCredit += t.amt;
      else totalDebit += t.amt;
    });

    const balance = totalCredit + totalDebit;

    ux.amountDebit.value = "";
    ux.amountCredit.value = "";

    if (balance < 0) {
      ux.amountDebit.value = (-balance).toFixed(2);
    }
    if (balance > 0) {
      ux.amountCredit.value = balance.toFixed(2);
    }
  }

  render();
  updateBalance();

  ux.saveButton.addEventListener("click", async () => {
    // only save if total debit equals total credit
    if (ux.totalDebit.textContent !== ux.totalCredit.textContent) {
      throw new Error("Debits and credits must balance");
    }

    const batchId = await db.createBatch();
    // set the batchId query string and reload this page
    const url = new URL(window.location.href);
    url.searchParams.set("batch", batchId.toString());
    window.location.reload();
  });

  on("delete-row", (event) => {
    const element = event?.detail.element as HTMLElement;
    // the element should have a data-id attribute
    const id = element.getAttribute("data-id");
    if (!id) {
      throw new Error("Missing data-id attribute");
    }
    // remove the transaction in this position
    db.deleteTransaction(parseInt(id));
    render();
  });

  on("on-add-entry", () => {
    updateBalance();
    ux.accountNumber.focus();
  });
}
