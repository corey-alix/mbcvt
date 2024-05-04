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
export function setupGeneralLedgerForm() {
    // set window title
    document.title = "General Ledger";
    const form = document.getElementById("general-ledger-form");
    const date = document.getElementById("date");
    date.value = new Date().toISOString().substring(0, 10);
    const amount = document.getElementById("amount");
    // must be a currency value (e.g. 123.45)
    amount.pattern = "[0-9]+(\\.[0-9]{1,2})?";
    // must be a positive number
    amount.min = "0.01";
    amount.step = "0.01";
    amount.addEventListener("input", () => {
        form.reportValidity();
    });
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
}
