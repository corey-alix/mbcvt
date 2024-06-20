import { Database } from "../db/index.js";

// move into DB
const magic = {
  tentRate: 29.0,
  rvRate: 39.0,
  tentWeeklyRate: 29 * 6,
  rvWeeklyRate: 39 * 6,
  tentMonthlyRate: 29 * 20,
  rvMonthlyRate: 39 * 20,
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

  function applyCalculator() {
    const inDate = new Date(inputs.checkIn.value);
    const outDate = new Date(inputs.checkOut.value);
    const actualDays = Math.round(
      (outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const partialWeeks = Math.ceil(actualDays / 7);
    const partialMonths = Math.ceil(actualDays / 28);
    const partialDays = actualDays;

    const siteNumber = parseInt(inputs.siteNumber.value);
    const isSite = magic.minSite <= siteNumber && siteNumber <= magic.maxSite;
    const isTentSite = isSite && siteNumber > magic.minTentSite;

    let dailyRate = isTentSite ? magic.tentRate : magic.rvRate;
    let weeklyRate = isTentSite ? magic.tentWeeklyRate : magic.rvWeeklyRate;
    let monthlyRate = isTentSite ? magic.tentMonthlyRate : magic.rvMonthlyRate;

    const counter = {
      days: partialDays,
      weeks: 0,
      months: 0,
    };

    type Counter = typeof counter;

    function computePrice(counter: Counter) {
      if (counter.days < 0) throw new Error("Negative days");
      if (counter.weeks < 0) throw new Error("Negative weeks");
      if (counter.months < 0) throw new Error("Negative months");

      return (
        counter.days * dailyRate +
        counter.weeks * weeklyRate +
        counter.months * monthlyRate
      );
    }

    function totalDays(counter: Counter) {
      return counter.days + counter.weeks * 7 + counter.months * 28;
    }

    function convertToWeek(counter: Counter) {
      if (counter.days) {
        counter.weeks += 1;
        counter.days = Math.max(0, counter.days - 7);
      }
      return counter;
    }

    function convertToMonth(counter: Counter) {
      convertToWeek(counter);
      if (counter.weeks) {
        counter.months += 1;
        counter.weeks = Math.max(0, counter.weeks - 4);
      }

      while (true) {
        const freeDays = totalDays(counter) - partialDays;
        if (!freeDays) break;
        if (counter.days) {
          counter.days = Math.max(0, counter.days - freeDays);
          continue;
        }
        if (counter.weeks) {
          counter.weeks--;
          counter.days += Math.max(0, 7 - freeDays);
          continue;
        }
        break;
      }
      return counter;
    }

    let bestPrice = 0;

    while (true) {
      bestPrice = computePrice(counter);
      const weekly = convertToWeek({ ...counter });
      const monthly = convertToMonth({ ...counter });
      if (computePrice(weekly) < bestPrice) {
        convertToWeek(counter);
        continue;
      }
      if (computePrice(monthly) < bestPrice) {
        convertToMonth(counter);
        continue;
      }
      break;
    }

    const adults = inputs.adults.valueAsNumber;

    if (adults > magic.maxAdults) {
      bestPrice += magic.extraAdult * (adults - magic.maxAdults) * partialDays;
    }

    const children = inputs.children.valueAsNumber;
    if (children > magic.maxChildren) {
      bestPrice +=
        magic.extraChild * (children - magic.maxChildren) * partialDays;
    }

    const visitors = inputs.visitors.valueAsNumber;
    if (visitors > 0) {
      bestPrice += magic.extraVisitor * visitors;
    }

    const woodBundles = inputs.woodBundles.valueAsNumber;
    if (woodBundles > 0) {
      bestPrice += magic.woodBundle * woodBundles;
    }

    inputs.baseDue.value = bestPrice.toFixed(2);
    inputs.totalTax.value = (magic.taxRate * bestPrice).toFixed(2);
    inputs.totalDue.value = ((1 + magic.taxRate) * bestPrice).toFixed(2);
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
    applyCalculator();
  });

  inputs.siteNumber.addEventListener("change", () => {
    applyCalculator();
  });

  inputs.checkOut.addEventListener("change", () => {
    applyCalculator();
  });

  inputs.children.addEventListener("change", () => {
    applyCalculator();
  });

  inputs.adults.addEventListener("change", () => {
    applyCalculator();
  });

  inputs.visitors.addEventListener("change", () => {
    applyCalculator();
  });

  inputs.visitors.addEventListener("change", () => {
    applyCalculator();
  });

  inputs.visitors.addEventListener("change", () => {
    applyCalculator();
  });

  inputs.woodBundles.addEventListener("change", () => {
    applyCalculator();
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
