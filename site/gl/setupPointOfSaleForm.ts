import { PointOfSaleFormData, database as db } from "../db/index.js";
import { autoShortcut, getElements, injectActions } from "../fun/index.js";
import { asCurrency, round } from "../fun/index.js";
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
  autoShortcut();
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
    const taxable = basePrice;
    const taxDue = magic.taxRate * basePrice;
    const totalDue = taxable + taxDue;
    inputs.baseDue.value = basePrice.toFixed(2);
    inputs.totalTax.value = taxDue.toFixed(2);
    inputs.totalDue.value = totalDue.toFixed(2);

    const totalDiscount = inputs.totalDiscount.valueAsNumber;

    const totalPaid = computeTotalPaid();
    inputs.balanceDue.value = (totalDue - totalPaid - totalDiscount).toFixed(2);
  }

  function addPaymentInputs(options?: {
    paymentType: string;
    paymentDate: string;
    paymentAmount: number;
  }) {
    const template = document.querySelector<HTMLTemplateElement>(
      "template#method-of-payment"
    );
    if (!template) throw new Error("Template not found");
    const clone = template.content.firstElementChild!.cloneNode(
      true
    ) as HTMLElement;
    clone.classList.remove("template");

    const ux = {
      paymentDate: null as any as HTMLInputElement,
      paymentType: null as any as HTMLSelectElement,
      paymentAmount: null as any as HTMLInputElement,
    };
    getElements(ux, clone);

    ux.paymentType.value = options?.paymentType || "cash";
    ux.paymentAmount.value =
      options?.paymentAmount.toFixed(2) || inputs.balanceDue.value;
    ux.paymentDate.value =
      options?.paymentDate || new Date().toISOString().split("T")[0];

    ux.paymentAmount.addEventListener("input", () => updateTotals());

    template.parentElement?.insertBefore(clone, template);
    updateTotals();
  }

  await db.init();
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
    balanceDue: null as any as HTMLInputElement,
    totalDiscount: null as any as HTMLInputElement,
    addPaymentMethod: null as any as HTMLButtonElement,
  };

  getElements(inputs, document.body);
  injectActions();

  injectIncrementorButtons(inputs.visitors);
  injectIncrementorButtons(inputs.adults);
  injectIncrementorButtons(inputs.children);
  injectIncrementorButtons(inputs.woodBundles);

  selectAllOnFocus(inputs.siteNumber);
  selectAllOnFocus(inputs.visitors);
  selectAllOnFocus(inputs.adults);
  selectAllOnFocus(inputs.children);
  selectAllOnFocus(inputs.woodBundles);

  inputs.addPaymentMethod.addEventListener("click", () => addPaymentInputs());

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

  inputs.totalDiscount.addEventListener("input", () => {
    updateTotals();
  });

  inputs.checkIn.value = new Date().toISOString().split("T")[0];
  inputs.checkIn.dispatchEvent(new Event("change"));

  inputs.quickReservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    inputs.quickReservationForm.reportValidity();

    // form inputs as json
    const formData = new FormData(inputs.quickReservationForm);
    const json = {} as Record<string, any>;

    // convert entries to an array
    Array.from(formData.entries()).forEach((entry) => {
      const [key, value] = entry;
      if (typeof json[key] === "undefined") json[key] = value;
      else if (Array.isArray(json[key])) json[key].push(value);
      else json[key] = [json[key], value];
    });

    db.upsertPointOfSale(json as PointOfSaleFormData);

    const arAccount = db.forceAccount(magic.saleAccount, "AR");
    const cashAccount = db.forceAccount(magic.cashAccount, "cash");
    const taxAccount = db.forceAccount(magic.taxAccount, "tax");
    const firewoodAccount = db.forceAccount(magic.firewoodAccount, "firewood");
    const peopleAccount = db.forceAccount(magic.peopleAccount, "guests");

    const siteNumber = inputs.siteNumber.value;
    const siteAccount = db.getAccount(parseInt(siteNumber));

    const transactionDate = new Date().toISOString().split("T")[0];

    const nameOfParty = inputs.partyName.value;
    const dates = `${inputs.checkIn.value} to ${inputs.checkOut.value}`;

    const expenses = getExpenses();

    const totalNet = Object.values(expenses).reduce((a, b) => a + b, 0);
    const totalTax = round(totalNet * magic.taxRate, 2);

    const totalDiscount = inputs.totalDiscount.valueAsNumber;
    const discountNet = totalDiscount / (1 + magic.taxRate);
    const discountTax = totalDiscount - discountNet;

    const totalPaid = computeTotalPaid();

    const balanceDue = round(
      totalNet + totalTax - totalPaid - totalDiscount,
      2
    );

    if (balanceDue) {
      await db.addTransactionPair({
        debitAccount: arAccount.id,
        creditAccount: siteAccount.id,
        date: transactionDate,
        description: `${nameOfParty}, ${dates}`,
        amt: balanceDue,
      });
    }

    await db.addTransactionPair({
      debitAccount: cashAccount.id,
      creditAccount: siteAccount.id,
      date: transactionDate,
      description: `${nameOfParty}, ${dates}`,
      amt: totalPaid,
    });

    if (discountNet) {
      await db.addTransactionPair({
        debitAccount: cashAccount.id,
        creditAccount: siteAccount.id,
        date: transactionDate,
        description: "Discount",
        amt: -discountNet,
      });
    }

    await db.addTransactionPair({
      debitAccount: taxAccount.id,
      creditAccount: siteAccount.id,
      date: transactionDate,
      description: "Tax Collected",
      amt: totalTax,
    });

    if (discountTax) {
      await db.addTransactionPair({
        debitAccount: taxAccount.id,
        creditAccount: siteAccount.id,
        date: transactionDate,
        description: "Discount",
        amt: -discountTax,
      });
    }

    if (expenses.woodBundles) {
      await db.addTransactionPair({
        debitAccount: firewoodAccount.id,
        creditAccount: siteAccount.id,
        date: transactionDate,
        description: "Firewood",
        amt: expenses.woodBundles,
      });
    }

    if (expenses.children + expenses.adults + expenses.visitors) {
      await db.addTransactionPair({
        debitAccount: peopleAccount.id,
        creditAccount: siteAccount.id,
        date: transactionDate,
        description: "Guests",
        amt: expenses.children + expenses.adults + expenses.visitors,
      });
    }

    await db.createBatch();

    printReceipt({
      nameOfParty,
      dates,
      expenses,
      totalNet,
      totalTax,
      totalCash: totalNet + totalTax,
      discountNet,
      discountTax,
      totalPaid: computeTotalPaid(),
    });

    inputs.quickReservationForm.reset();
    // window.location.href = `./general-ledger.html?batch=${batchId}`;
  });

  inputs.partyName.focus();

  // if there is an invoice number in the query string, populate the form
  const invoice = new URLSearchParams(window.location.search).get("invoice");
  if (invoice) {
    const pos = db.getPointOfSale(parseInt(invoice));
    if (!pos) throw new Error("Invalid invoice number");
    inputs.partyName.value = pos.partyName;
    inputs.siteNumber.value = pos.siteNumber;
    inputs.checkIn.value = pos.checkIn;
    inputs.checkOut.value = pos.checkOut;
    inputs.adults.value = pos.adults;
    inputs.children.value = pos.children;
    inputs.visitors.value = pos.visitors;
    inputs.woodBundles.value = pos.woodBundles;

    const paymentInfo = extractPaymentInfo(pos);
    paymentInfo.forEach((payment) => {
      addPaymentInputs(payment);
    });
  }
}

function computeTotalPaid() {
  const payments = Array.from(
    document.querySelectorAll<HTMLDivElement>(".method-of-payment")
  ).map((div) => {
    const paymentAmount =
      div.querySelector<HTMLInputElement>("#paymentAmount")!;
    if (!paymentAmount) throw new Error("Payment amount not found");
    return {
      amount: paymentAmount.valueAsNumber,
    };
  });

  const totalPaid = payments.reduce((a, b) => a + b.amount, 0);
  return totalPaid;
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
  discountNet: number;
  discountTax: number;
  totalPaid: number;
}) {
  console.log(sale);
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

    <div>Price</div>
    <div class="align-right">${asCurrency(sale.totalNet)}</div>
    <div>Tax</div>
    <div class="align-right">${asCurrency(sale.totalTax)}</div>
    <div>Final Price</div>
    <div class="align-right bolder">${asCurrency(
      sale.totalNet + sale.totalTax
    )}</div>

    <div class="if-discount span-all"><hr/></div>
    <div class="if-discount">Discount Net</div>
    <div class="if-discount align-right">${asCurrency(sale.discountNet)}</div>
    <div class="if-discount">Discount Tax</div>
    <div class="if-discount align-right">${asCurrency(sale.discountTax)}</div>
    <div class="if-discount">Total Discount</div>
    <div class="if-discount align-right bolder">${asCurrency(
      sale.discountNet + sale.discountTax
    )}</div>

    <div class="span-all"><hr/></div>
    <div class="">Total Paid</div>
    <div class="align-right">${asCurrency(sale.totalPaid)}</div>
    <div>Balance Due</div>
    <div class="align-right bolder bigger">${asCurrency(
      sale.totalCash - sale.discountNet - sale.discountTax - sale.totalPaid
    )}</div>
  </div>`;

  document.body.classList.toggle("discount", !!sale.discountNet);

  document.body.innerHTML = html;
}

function isRateClassChange(counter1: Counter, counter2: Counter) {
  if (!counter1.weeks !== !counter2.weeks) return true;
  if (!counter1.months !== !counter2.months) return true;
  if (!counter1.season !== !counter2.season) return true;
  return false;
}
function extractPaymentInfo(pos: PointOfSaleFormData) {
  const payments = {
    paymentType: pos.paymentType,
    paymentDate: pos.paymentDate,
    paymentAmount: pos.paymentAmount,
  };

  if (!Array.isArray(pos.paymentType)) {
    payments.paymentType = [pos.paymentType];
    payments.paymentDate = <any>[pos.paymentDate];
    payments.paymentAmount = <any>[pos.paymentAmount];
  }

  return payments.paymentType.map((_, i) => ({
    paymentType: payments.paymentType[i],
    paymentDate: payments.paymentDate[i],
    paymentAmount: parseFloat(payments.paymentAmount[i]),
  }));
}
