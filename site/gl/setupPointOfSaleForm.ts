import {
  PointOfSaleFormData,
  PointOfSaleReceiptModel,
  database,
} from "../db/index.js";
import { D } from "../fun/D.js";
import {
  asDateString,
  autoShortcut,
  getElements,
  injectActions,
} from "../fun/index.js";
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
      input.dispatchEvent(new Event("input"));
    });
    decrementButton.addEventListener("click", () => {
      input.stepDown();
      input.dispatchEvent(new Event("input"));
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
        // rates.push("Daily");
      }
      if (rates.length) {
        toast(`${rates.join(", ")} rates applied`);
      }
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
    ux.paymentDate.value = options?.paymentDate || asDateString(new Date());

    ux.paymentAmount.addEventListener("input", () => updateTotals());

    template.parentElement?.insertBefore(clone, template);
    injectActions();

    updateTotals();
  }

  await database.init();
  const inputs = {
    quickReservationForm: null as any as HTMLFormElement,
    partyTelephone: null as any as HTMLInputElement,
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
    printReceiptButton: null as any as HTMLButtonElement,
    priorReceiptButton: null as any as HTMLButtonElement,
    resetForm: null as any as HTMLButtonElement,
  };

  getElements(inputs, document.body);
  injectActions({
    incrementor: injectIncrementorButtons,
  });

  inputs.resetForm.addEventListener("click", () => {
    removeQuery("batch");
    inputs.quickReservationForm.reset();
    location.reload();
  });

  inputs.priorReceiptButton.addEventListener("click", () => {
    const receipts = database.getReceipts();
    if (!receipts.length) throw "there are not receipts";
    let batchId = parseInt(getQuery("batch") || "0");
    if (!batchId) {
      batchId = receipts[receipts.length - 1].batchId;
    } else {
      let index = receipts.findIndex((r) => r.batchId === batchId) - 1;
      if (index > 0) {
        const receipt = receipts[index];
        batchId = receipt.batchId;
      } else {
        batchId = receipts[receipts.length - 1].batchId;
      }
    }
    setQuery("batch", batchId + "");
    window.location.reload();
  });

  inputs.printReceiptButton.addEventListener("click", () => {
    let batchId = getQuery("batch");
    if (!batchId) {
      batchId = prompt("Enter receipt number")!;
      if (!batchId) return;
      setQuery("batch", batchId);
    }
    const receipt = database.getReceipt(parseInt(batchId));
    if (!receipt) throw "receipt not found";
    printReceipt(receipt);
  });

  inputs.addPaymentMethod.addEventListener("click", () => addPaymentInputs());

  inputs.siteNumber.addEventListener("input", () => {
    const siteNumber = inputs.siteNumber.value.toUpperCase();
    if (!siteNumber) {
      inputs.siteName.value = "";
      return;
    }

    // validate that this site number corresponds to a GL entry
    const accounts = database
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

  inputs.checkOut.addEventListener("input", () => {
    updateTotals();
  });

  inputs.children.addEventListener("input", () => {
    updateTotals();
  });

  inputs.adults.addEventListener("input", () => {
    updateTotals();
  });

  inputs.visitors.addEventListener("input", () => {
    updateTotals();
  });

  inputs.woodBundles.addEventListener("input", () => {
    updateTotals();
  });

  inputs.totalDiscount.addEventListener("input", () => {
    updateTotals();
  });

  inputs.checkIn.value = asDateString(new Date());
  inputs.checkIn.dispatchEvent(new Event("change"));

  inputs.quickReservationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    inputs.quickReservationForm.reportValidity();

    const arAccount = database.forceAccount(magic.saleAccount, "AR");
    const cashAccount = database.forceAccount(magic.cashAccount, "cash");
    const taxAccount = database.forceAccount(magic.taxAccount, "tax");
    const firewoodAccount = database.forceAccount(
      magic.firewoodAccount,
      "firewood"
    );
    const peopleAccount = database.forceAccount(magic.peopleAccount, "guests");

    const siteNumber = inputs.siteNumber.value;
    const siteAccount = database.getAccount(parseInt(siteNumber));

    const transactionDate = asDateString(new Date());

    const partyTelephone = inputs.partyTelephone.value;
    const nameOfParty = inputs.partyName.value;
    const dates = `${D.asMd(D.asDateOnly(inputs.checkIn.value))} to ${D.asMd(
      D.asDateOnly(inputs.checkOut.value)
    )}`;

    const paidTotal = computeTotalPaid();
    const expenses = getExpenses();

    const expensesNet = round(
      Object.values(expenses).reduce((a, b) => a + b, 0),
      2
    );

    const discountGross = round(inputs.totalDiscount.valueAsNumber, 2);
    const discountTax = round(
      round(discountGross / (1 + magic.taxRate), 2) * magic.taxRate,
      2
    );

    const discountNet = discountGross - discountTax;

    const taxTotal = round(expensesNet * magic.taxRate, 2) - discountTax;

    const balanceDue = round(
      expensesNet + taxTotal - paidTotal - discountNet,
      2
    );

    await database.asAtomic(async () => {
      let batchId = 0;
      if (balanceDue) {
        database.addTransaction({
          account: arAccount.id,
          date: transactionDate,
          description: balanceDue > 0 ? "Balance" : "Credit",
          amt: balanceDue,
        });
      }

      const payments = getPayments();
      for (const payment of payments) {
        database.addTransaction({
          account: cashAccount.id,
          date: payment.date || transactionDate,
          description: payment.mop,
          amt: payment.amount,
        });
      }

      database.addTransaction({
        account: taxAccount.id,
        date: transactionDate,
        description: "Tax Due",
        amt: -taxTotal,
      });

      database.addTransaction({
        account: siteAccount.id,
        date: transactionDate,
        description: `Rental to ${nameOfParty}`,
        amt: -expenses.basePrice,
      });

      if (discountGross) {
        database.addTransaction({
          account: siteAccount.id,
          date: transactionDate,
          description: "Discount",
          amt: discountNet,
        });
      }

      if (expenses.woodBundles) {
        database.addTransaction({
          account: firewoodAccount.id,
          date: transactionDate,
          description: "Firewood",
          amt: -expenses.woodBundles,
        });
      }

      const visitorGross =
        expenses.children + expenses.adults + expenses.visitors;
      if (visitorGross) {
        database.addTransaction({
          account: peopleAccount.id,
          date: transactionDate,
          description: "Guests",
          amt: -visitorGross,
        });
      }

      // if there in an invoice number, insert correcting entries into the existing batc
      const invoice = getQuery("batch");
      if (invoice) {
        batchId = parseInt(invoice);
        const batch = database.getBatches().find((b) => b.id === batchId);
        if (!batch) throw new Error("Batch not found");
        // reverse all past transactions
        for (const transaction of batch.transactions) {
          database.addTransaction({
            account: transaction.account,
            date: transaction.date,
            description: transaction.description,
            amt: -transaction.amt,
          });
        }
        database.updateBatch(batchId);
      } else {
        batchId = await database.createBatch();
      }

      {
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
        json["batchId"] = batchId;

        await database.upsertPointOfSale(json as PointOfSaleFormData);
      }

      const receipt = {
        batchId,
        partyTelephone,
        nameOfParty,
        dates,
        expenses,
        totalNet: expensesNet,
        totalTax: taxTotal + discountTax,
        totalCash: expensesNet + taxTotal,
        discountNet,
        discountTax,
        totalPaid: computeTotalPaid(),
        balanceDue,
      } satisfies PointOfSaleReceiptModel;

      await database.upsertReceipt(receipt);
      setQuery("batch", batchId + "");
      printReceipt(receipt);
    });
  });

  inputs.partyName.focus();

  // if there is an invoice number in the query string, populate the form
  const invoice = getQuery("batch");
  if (invoice) {
    const pos = database.getPointOfSale(parseInt(invoice));
    if (!pos) throw new Error("Invalid invoice number");
    inputs.partyTelephone.value = pos.partyTelephone;
    inputs.partyName.value = pos.partyName;
    inputs.siteNumber.value = pos.siteNumber;
    inputs.checkIn.value = pos.checkIn;
    inputs.checkOut.value = pos.checkOut;
    inputs.adults.value = pos.adults;
    inputs.children.value = pos.children;
    inputs.visitors.value = pos.visitors;
    inputs.woodBundles.value = pos.woodBundles;
    inputs.totalDiscount.value = pos.totalDiscount;

    const paymentInfo = extractPaymentInfo(pos);
    paymentInfo.forEach((payment) => {
      addPaymentInputs(payment);
    });

    // setup validations
    inputs.checkOut.min = addDay(inputs.checkIn.value, 1);
  }
}

function getPayments() {
  return Array.from(
    document.querySelectorAll<HTMLDivElement>(".method-of-payment")
  ).map((div) => {
    const paymentAmount =
      div.querySelector<HTMLInputElement>("#paymentAmount")!;
    if (!paymentAmount) throw new Error("Payment amount not found");

    const paymentType = div.querySelector<HTMLSelectElement>("#paymentType")!;
    if (!paymentType) throw new Error("Payment type not found");

    const paymentDate = div.querySelector<HTMLInputElement>("#paymentDate")!;
    if (!paymentDate) throw new Error("Payment date not found");

    return {
      mop: paymentType.value,
      amount: paymentAmount.valueAsNumber,
      date: asDateString(paymentDate.valueAsDate!),
    };
  });
}

function computeTotalPaid() {
  return getPayments().reduce((a, b) => a + b.amount, 0);
}

function printReceipt(sale: PointOfSaleReceiptModel) {
  console.log(sale);
  const { balanceDue, expenses } = sale;

  const html = `
  <div class="receipt grid grid-2">
    <h1 class="span-all center">Millbrook Campground Receipt</h1>
    <div class="span-all center">*** Beta Testing ***</div>
    <h2 class="span-all center"><a href="./general-ledger.html?batch=${
      sale.batchId
    }" class="no-border">#${(sale.batchId + "").padStart(5)}</a></h2>
    <div>Party</div><div class="bolder uppercase align-right">${
      sale.nameOfParty
    }</div>
    <div>Dates</div><div class="align-right">${sale.dates}</div>
    <div class="span-all"><hr/></div>
    <div>Base Price</div><div class="align-right">${asCurrency(
      expenses.basePrice
    )}</div>
    <div class="if-${
      expenses.adults
    }">Adults</div><div  class="align-right if-${expenses.adults}">${asCurrency(
    expenses.adults
  )}</div>
    <div class="if-${
      expenses.children
    }">Children</div><div class="align-right if-${
    expenses.children
  }">${asCurrency(expenses.children)}</div>
    <div class="if-${
      expenses.visitors
    }">Visitors</div><div class="align-right if-${
    expenses.visitors
  }">${asCurrency(expenses.visitors)}</div>
    <div class="align-right if-${
      expenses.woodBundles
    }">Wood Bundles</div><div class="align-right if-${
    expenses.woodBundles
  }">${asCurrency(expenses.woodBundles)}</div>
    <div class="span-all"><br/></div>

    <div>Price</div>
    <div class="align-right">${asCurrency(sale.totalNet)}</div>
    <div>Tax</div>
    <div class="align-right">${asCurrency(sale.totalTax)}</div>
    <div>Final Price</div>
    <div class="align-right bolder">${asCurrency(
      sale.totalNet + sale.totalTax
    )}</div>

    <div class="if-discount span-all"><br/></div>
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
    <div class="align-right bolder bigger">${asCurrency(balanceDue)}</div>
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

function getQuery(name: string) {
  const match = new URLSearchParams(window.location.search).get(name);
  return match || "";
}

function removeQuery(name: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState({}, "", url.toString());
}

function setQuery(name: string, value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  window.history.replaceState({}, "", url.toString());
}
