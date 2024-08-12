import { database as db, type AccountModel } from "../db/index.js";
import { asCurrency, asLinkToAccountHistory } from "../fun/index.js";

// list all accounts with descriptions
export class ChartOfAccounts {
  #state = {
    root: null as HTMLElement | null,
    // capture data-account-id of focused input
    focusedAccountId: "",
  };

  constructor(public accounts: AccountModel[]) {}

  render(node: HTMLElement) {
    if (!this.#state.root) {
      this.#state.root = document.createElement("div");
    }

    this.#state.root.innerHTML = "";
    node.appendChild(this.#state.root);

    const html = `
      <div class='grid'>
          <div class="header left">Account</div>
          <div class="header left">Description</div>
          <div class="header right">Balance</div>
        ${this.accounts
          .sort((a, b) => a.id - b.id)
          .map(
            (account) => `
            <div class="data align-left">${asLinkToAccountHistory(
              account.id,
              account.id + ""
            )}</div>
            <div class="data align-left">
              <input data-account-id="${account.id}" value="${account.name}"/>
            </div>
            <div class="data align-right">${asCurrency(account.balance)}</div>
        `
          )
          .join("")}
    `;
    this.#state.root.insertAdjacentHTML("beforeend", html);

    const inputs = this.#state.root.querySelectorAll("input");
    inputs.forEach((input) => {
      input.addEventListener("change", async (event) => {
        const target = event.target as HTMLInputElement;
        this.#state.focusedAccountId =
          target.getAttribute("data-account-id") || "";
        if (!this.#state.focusedAccountId) throw "Account ID not found";
        const accountId = parseInt(this.#state.focusedAccountId, 10);

        const account = this.accounts.find(
          (account) => account.id === accountId
        );
        if (!account) throw `Account not found: ${accountId}`;
        if (account) {
          account.name = target.value;
          await db.updateAccount(account);
          this.render(node);
        }
      });
    });

    const form = document.createElement("form");
    form.innerHTML = `
      <input type="number" placeholder="Account Number" required/>
      <input type="text" placeholder="Account Description" required/>
      <button>Add</button>
    `;
    this.#state.root.appendChild(form);

    const addButton = form.querySelector("button") as HTMLButtonElement;

    const accountNumber = form.querySelector(
      "input[type=number]"
    ) as HTMLInputElement;

    const accountDescription = form.querySelector(
      "input[type=text]"
    ) as HTMLInputElement;

    addButton.addEventListener("click", async () => {
      const account = {
        id: accountNumber.valueAsNumber,
        name: accountDescription.value,
        balance: 0,
      } as AccountModel;

      await db.addAccount(account);
      this.accounts = db.getAccounts();
      this.render(node);
    });
    this.#state.root.appendChild(addButton);

    if (this.#state.focusedAccountId) {
      const input = this.#state.root.querySelector(
        `input[data-account-id="${this.#state.focusedAccountId}"]`
      ) as HTMLInputElement;
      input.focus();
    } else accountNumber.focus();
  }
}

export async function setupChartOfAccountsForm() {
  await db.init();
  const chartOfAccounts = new ChartOfAccounts(db.getAccounts());
  chartOfAccounts.render(document.body);
}
