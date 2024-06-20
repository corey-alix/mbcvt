import { Database } from "../db/index.js";

// move into DB
const magic = {
  tentRate: 29,
  rvRate: 39,
  extraAdult: 5,
  extraChild: 5,
  extraVisitor: 2,
  woodBundle: 5,
  maxAdults: 2,
  maxChildren: 2,
  minSite: 2101,
  maxSite: 2199,
  minTentSite: 2127,
  taxRate: 0.09,
};

export async function setupPointOfSaleForm() {
  const db = new Database();

  function addDay(value: string, days: number): string {
    const date = new Date(value);
    const oneDay = 24 * 60 * 60 * 1000;
    const newDate = new Date(date.getTime() + days * oneDay)
      .toISOString()
      .split("T")[0];
    console.log({ newDate, value, days });
    return newDate;
  }

  function updateTotalDue() {
    const inDate = new Date(inputs.checkIn.value);
    const outDate = new Date(inputs.checkOut.value);
    const days = Math.round(
      (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const siteNumber = parseInt(inputs.siteNumber.value);
    const isSite = magic.minSite <= siteNumber && siteNumber <= magic.maxSite;
    const isTentSite = isSite && siteNumber > magic.minTentSite;

    let basePrice = (isTentSite ? magic.tentRate : magic.rvRate) * days;
    console.log({ isSite, isTentSite, siteNumber, basePrice });

    const adults = inputs.adults.valueAsNumber;

    if (adults > magic.maxAdults) {
      basePrice += magic.extraAdult * (adults - magic.maxAdults) * days;
    }

    const children = inputs.children.valueAsNumber;
    if (children > magic.maxChildren) {
      basePrice += magic.extraChild * (children - magic.maxChildren) * days;
    }

    const visitors = inputs.visitors.valueAsNumber;
    if (visitors > 0) {
      basePrice += magic.extraVisitor * visitors;
    }

    const woodBundles = inputs.woodBundles.valueAsNumber;
    if (woodBundles > 0) {
      basePrice += magic.woodBundle * woodBundles;
    }

    inputs.baseDue.value = basePrice.toFixed(2);
    inputs.totalTax.value = (magic.taxRate * basePrice).toFixed(2);
    inputs.totalDue.value = ((1 + magic.taxRate) * basePrice).toFixed(2);
  }

  await db.init();
  console.log("Setting up point of sale form");
  const inputs = {
    quickReservationForm: null as any as HTMLFormElement,
    partyName: null as any as HTMLInputElement,
    siteNumber: null as any as HTMLInputElement,
    siteName: null as any as HTMLInputElement,
    checkIn: null as any as HTMLInputElement,
    checkOut: null as any as HTMLInputElement,
    adults: null as any as HTMLInputElement,
    children: null as any as HTMLInputElement,
    visitors: null as any as HTMLInputElement,
    woodBundles: null as any as HTMLInputElement,
    baseDue: null as any as HTMLInputElement,
    totalTax: null as any as HTMLInputElement,
    totalDue: null as any as HTMLInputElement,
  };

  Object.keys(inputs).forEach((key) => {
    const input = document.querySelector<HTMLElement>(`#${key}`)!;
    if (!input) throw new Error(`Input not found: ${key}`);
    (inputs as any)[key] = input;
  });

  inputs.siteNumber.addEventListener("input", () => {
    const siteNumber = inputs.siteNumber.value.toUpperCase();
    if (!siteNumber) {
      inputs.siteName.value = "";
      return;
    }

    // validate that this site number corresponds to a GL entry
    const accounts = db
      .getAccounts()
      .filter(
        (a) => (a.id + "").startsWith(siteNumber) || a.name.includes(siteNumber)
      );
    const account = accounts.length === 1 ? accounts[0] : null;
    inputs.siteName.value = account ? account.name : "";
    inputs.siteNumber.setCustomValidity(account ? "" : "Invalid site number");
    inputs.siteNumber.classList.toggle("invalid", !account);
    if (account) inputs.siteNumber.value = account.id + "";
  });

  inputs.checkIn.addEventListener("change", () => {
    inputs.checkOut.min = addDay(inputs.checkIn.value, 1);
    if (!inputs.checkOut.value) {
      inputs.checkOut.value = addDay(inputs.checkIn.value, 1);
      inputs.checkOut.dispatchEvent(new Event("change"));
    }
  });

  inputs.siteNumber.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.checkOut.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.children.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.adults.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.visitors.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.visitors.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.visitors.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.woodBundles.addEventListener("change", () => {
    updateTotalDue();
  });

  inputs.checkIn.value = new Date().toISOString().split("T")[0];
  inputs.checkIn.dispatchEvent(new Event("change"));

  inputs.quickReservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    inputs.quickReservationForm.reportValidity();

    const cashAccount = db.getAccounts().find((a) => a.id === 1001);
    if (!cashAccount) throw "Cash account not found";

    const taxAccount = db.getAccounts().find((a) => a.id === 3001);
    if (!taxAccount) throw "Tax account not found";

    const siteNumber = inputs.siteNumber.value;
    const siteAccount = db
      .getAccounts()
      .find((a) => a.id === parseInt(siteNumber));
    if (!siteAccount) throw "Invalid site number";

    const transactionDate = new Date().toISOString().split("T")[0];
    const totalCash = inputs.totalDue.valueAsNumber;
    const totalTax = inputs.totalTax.valueAsNumber;

    const nameOfParty = inputs.partyName.value;

    await db.addTransaction({
      date: transactionDate,
      description: `POS: ${nameOfParty}`,
      account: cashAccount.id,
      amt: totalCash,
    });

    await db.addTransaction({
      date: transactionDate,
      description: "POS: Tax Received",
      account: taxAccount.id,
      amt: -totalTax,
    });

    await db.addTransaction({
      date: transactionDate,
      description: `POS: ${siteAccount.name}`,
      account: siteAccount.id,
      amt: -(totalCash - totalTax),
    });

    await db.createBatch();

    inputs.quickReservationForm.reset();
  });
}
