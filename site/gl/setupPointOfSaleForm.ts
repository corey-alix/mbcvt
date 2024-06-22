import { Database } from "../db/index.js";
import { asCurrency } from "../fun/index.js";
import { globals, magic } from "../globals.js";
import { minimizeRate } from "./renderPriceChart.js";
import { toast } from "./toast.js";

export type Counter = {
  actualDays: number;
  days: number;
  weeks: number;
  months: number;
  season: number;
};

export type Rates = {
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  seasonalRate: number;
};

export async function setupPointOfSaleForm() {
  const db = new Database();

  const state = {
    counter: null as Counter | null,
  };

  function selectAllOnFocus(input: HTMLInputElement) {
    input.addEventListener("focus", () => {
      input.select();
    });
  }

  function injectIncrementorButtons(input: HTMLInputElement) {
    // wrap an input in a container element that also contains a + and - button
    if (!input) throw new Error("Input not found");
    if (input.type !== "number") throw new Error("Input must be a number");

    const target = input.parentElement;
    if (!target)
      throw new Error("Input must be a child of a container element");

    const insertBefore = input.nextElementSibling;

    const container = document.createElement("div");
    container.classList.add("incrementor");

    const decrementButton = document.createElement("button");
    decrementButton.textContent = "−";

    const incrementButton = document.createElement("button");
    incrementButton.textContent = "+";

    // do not submit
    decrementButton.type = incrementButton.type = "button";

    container.append(decrementButton, input, incrementButton);
    incrementButton.addEventListener("click", () => {
      input.stepUp();
      input.dispatchEvent(new Event("change"));
    });
    decrementButton.addEventListener("click", () => {
      input.stepDown();
      input.dispatchEvent(new Event("change"));
    });

    // place the container back in the DOM
    target.insertBefore(container, insertBefore);
    input.tabIndex = -1;
  }

  function addDay(value: string, days: number): string {
    const date = new Date(value);
    const oneDay = 24 * 60 * 60 * 1000;
    const newDate = new Date(date.getTime() + days * oneDay)
      .toISOString()
      .split("T")[0];
    console.log({ newDate, value, days });
    return newDate;
  }

  function getExpenses() {
    const inDate = new Date(inputs.checkIn.value);
    const outDate = new Date(inputs.checkOut.value);
    const actualDays = Math.round(
      (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const siteNumber = parseInt(inputs.siteNumber.value);
    const isSite = magic.minSite <= siteNumber && siteNumber <= magic.maxSite;
    const isTentSite = isSite && siteNumber > magic.minTentSite;

    const dailyRate = isTentSite ? magic.tentRate : magic.rvRate;
    const weeklyRate = isTentSite ? magic.tentWeeklyRate : magic.rvWeeklyRate;
    const monthlyRate = isTentSite
      ? magic.tentMonthlyRate
      : magic.rvMonthlyRate;
    const seasonalRate = isTentSite
      ? magic.tentSeasonalRate
      : magic.rvSeasonalRate;

    const counter = {
      actualDays,
      days: actualDays,
      weeks: 0,
      months: 0,
      season: 0,
    } as Counter;

    const rates = { dailyRate, weeklyRate, monthlyRate, seasonalRate };

    let basePrice = minimizeRate(counter, rates);

    if (!state.counter || isRateClassChange(counter, state.counter)) {
      const rates = [] as string[];
      if (counter.season) {
        rates.push("Seasonal");
      }
      if (counter.months) {
        rates.push("Monthly");
      }
      if (counter.weeks) {
        rates.push("Weekly");
      }
      if (counter.days) {
        rates.push("Daily");
      }
      toast(`${rates.join(", ")} rates applied`);
      state.counter = counter;
    }

    const adults = inputs.adults.valueAsNumber;
    const children = inputs.children.valueAsNumber;

    const expenses = {
      basePrice,
      adults: 0,
      children: 0,
      visitors: 0,
      woodBundles: 0,
    };

    if (adults > magic.maxAdults) {
      expenses.adults =
        magic.extraAdult * (adults - magic.maxAdults) * actualDays;
    }

    if (children > magic.maxChildren) {
      expenses.children =
        magic.extraChild * (children - magic.maxChildren) * actualDays;
    }

    const visitors = inputs.visitors.valueAsNumber;
    if (visitors > 0) {
      expenses.visitors = magic.extraVisitor * visitors;
    }

    const woodBundles = inputs.woodBundles.valueAsNumber;
    if (woodBundles > 0) {
      expenses.woodBundles = magic.woodBundle * woodBundles;
    }

    return expenses;
  }

  function updateTotals() {
    const expenses = getExpenses();
    const basePrice = Object.values(expenses).reduce((a, b) => a + b, 0);
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

  injectIncrementorButtons(inputs.visitors);
  injectIncrementorButtons(inputs.adults);
  injectIncrementorButtons(inputs.children);
  injectIncrementorButtons(inputs.woodBundles);

  selectAllOnFocus(inputs.siteNumber);
  selectAllOnFocus(inputs.visitors);
  selectAllOnFocus(inputs.adults);
  selectAllOnFocus(inputs.children);
  selectAllOnFocus(inputs.woodBundles);

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
    updateTotals();
  });

  inputs.siteNumber.addEventListener("change", () => {
    updateTotals();
  });

  inputs.checkOut.addEventListener("change", () => {
    updateTotals();
  });

  inputs.children.addEventListener("change", () => {
    updateTotals();
  });

  inputs.adults.addEventListener("change", () => {
    updateTotals();
  });

  inputs.visitors.addEventListener("change", () => {
    updateTotals();
  });

  inputs.visitors.addEventListener("change", () => {
    updateTotals();
  });

  inputs.visitors.addEventListener("change", () => {
    updateTotals();
  });

  inputs.woodBundles.addEventListener("change", () => {
    updateTotals();
  });

  inputs.checkIn.value = new Date().toISOString().split("T")[0];
  inputs.checkIn.dispatchEvent(new Event("change"));

  inputs.quickReservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    inputs.quickReservationForm.reportValidity();

    const cashAccount = db.getAccount(magic.cashAccount);
    const taxAccount = db.getAccount(magic.taxAccount);
    const firewoodAccount = db.getAccount(magic.firewoodAccount);
    const peopleAccount = db.getAccount(magic.peopleAccount);

    const siteNumber = inputs.siteNumber.value;
    const siteAccount = db.getAccount(parseInt(siteNumber));

    const transactionDate = new Date().toISOString().split("T")[0];

    const expenses = getExpenses();
    const totalNet = Object.values(expenses).reduce((a, b) => a + b, 0);
    const totalTax = round(totalNet * magic.taxRate, 2);
    const totalCash = totalNet + totalTax;

    const nameOfParty = inputs.partyName.value;
    const dates = `${inputs.checkIn.value} to ${inputs.checkOut.value}`;

    await db.addTransaction({
      date: transactionDate,
      description: `${nameOfParty}, ${dates}`,
      account: cashAccount.id,
      amt: totalCash,
    });

    await db.addTransaction({
      account: taxAccount.id,
      date: transactionDate,
      description: "Tax Collected",
      amt: -totalTax,
    });

    if (expenses.woodBundles) {
      await db.addTransaction({
        account: firewoodAccount.id,
        date: transactionDate,
        description: "Firewood",
        amt: -expenses.woodBundles,
      });
    }

    if (expenses.children + expenses.adults + expenses.visitors) {
      await db.addTransaction({
        account: peopleAccount.id,
        date: transactionDate,
        description: "Guests",
        amt: -(expenses.children + expenses.adults + expenses.visitors),
      });
    }

    await db.addTransaction({
      account: siteAccount.id,
      date: transactionDate,
      description: `Site ${siteAccount.name}`,
      amt: -expenses.basePrice,
    });

    const batchId = await db.createBatch();

    printReceipt({
      nameOfParty,
      dates,
      expenses,
      totalNet,
      totalTax,
      totalCash,
    });

    inputs.quickReservationForm.reset();
    // window.location.href = `./general-ledger.html?batch=${batchId}`;
  });

  inputs.partyName.focus();
}

function round(value: number, places: number) {
  const multiplier = Math.pow(10, places);
  return Math.round(value * multiplier) / multiplier;
}

export function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
}

function printReceipt(sale: {
  nameOfParty: string;
  dates: string;
  expenses: {
    basePrice: number;
    adults: number;
    children: number;
    visitors: number;
    woodBundles: number;
  };
  totalNet: number;
  totalTax: number;
  totalCash: number;
}) {
  const html = `
  <div class="receipt grid grid-2">
    <h1 class="span-all center">Millbrook Campground Receipt</h1>
    <div>Party</div><div class="align-right">${sale.nameOfParty}</div>
    <div>Dates</div><div class="align-right">${sale.dates}</div>
    <div>Base Price</div><div class="align-right">${asCurrency(
      sale.expenses.basePrice
    )}</div>
    <div>Adults</div><div class="align-right">${asCurrency(
      sale.expenses.adults
    )}</div>
    <div>Children</div><div class="align-right">${asCurrency(
      sale.expenses.children
    )}</div>
    <div>Visitors</div><div class="align-right">${asCurrency(
      sale.expenses.visitors
    )}</div>
    <div>Wood Bundles</div><div class="align-right">${asCurrency(
      sale.expenses.woodBundles
    )}</div>
    <div class="span-all"><hr/></div>
    <div>Total Net</div><div class="align-right">${asCurrency(
      sale.totalNet
    )}</div>
    <div>Total Tax</div><div class="align-right">${asCurrency(
      sale.totalTax
    )}</div>
    <div>Total Cash</div><div class="align-right bolder bigger">${asCurrency(
      sale.totalCash
    )}</div>
  </div>`;

  document.body.innerHTML = html;
}
function isRateClassChange(counter1: Counter, counter2: Counter) {
  console.log({ counter1, counter2 });
  if (!counter1.weeks !== !counter2.weeks) return true;
  if (!counter1.months !== !counter2.months) return true;
  if (!counter1.season !== !counter2.season) return true;
  console.log("no change");
  return false;
}
