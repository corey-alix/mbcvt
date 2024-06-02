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
        transactions: [],
    };
    constructor() {
        const data = localStorage.getItem("gl");
        if (data) {
            this.#data = JSON.parse(data);
        }
    }
    async addTransaction(transactionInfo) {
        if (!this.#data.transactions) {
            this.#data.transactions = [];
        }
        this.#data.transactions.push(transactionInfo);
        await this.#save();
    }
    async #save() {
        const data = JSON.stringify(this.#data);
        localStorage.setItem("gl", data);
        const persist = {
            key: "123",
            topic: "test",
            value: data,
        };
        await fetch("http://localhost:3000/api", {
            method: "POST",
            body: JSON.stringify(persist),
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}
const db = new Database();
export function setupGeneralLedgerForm() {
    // set window title
    document.title = "General Ledger";
    const form = document.getElementById("general-ledger-form");
    const date = document.getElementById("date");
    date.value = new Date().toISOString().substring(0, 10);
    const amountDebit = asAmount("amount-debit");
    var amountCredit = asAmount("amount-credit");
    const description = document.getElementById("description");
    const accountDescription = document.getElementById("account-description");
    // validate account number against the list of accounts
    const accountNumber = document.getElementById("account-number");
    accountNumber.addEventListener("input", () => {
        const account = glAccounts.find((a) => a.id === parseInt(accountNumber.value));
        if (!account) {
            accountNumber.setCustomValidity("Invalid account number");
            accountDescription.textContent = "";
        }
        else {
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
        const account = glAccounts.find((a) => a.id === parseInt(accountNumber.value));
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
        };
        await db.addTransaction(transactionInfo);
        renderTransaction(transactionInfo);
    });
    function asAmount(id) {
        const amountDebit = document.getElementById(id);
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
function renderTransaction(transactionInfo) {
    const { date, description, account, amt } = transactionInfo;
    const debit = amt > 0 ? amt : 0;
    const credit = amt < 0 ? -amt : 0;
    const template = `<tr><td>${date}</td><td>${safeHtml(description)}<td class="align-left">${account}</td><td class="align-right">${debit ? asCurrency(debit) : ""}</td><td class="align-right">${credit ? asCurrency(credit) : ""}</td></tr>`;
    const target = document.getElementById("general-ledger");
    const tbody = target.querySelector("tbody");
    tbody.insertAdjacentHTML("beforebegin", template);
}
function safeHtml(description) {
    // prevent XSS attacks
    return description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function asCurrency(amount) {
    // return the amount as USD
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}
//# sourceMappingURL=index.js.map