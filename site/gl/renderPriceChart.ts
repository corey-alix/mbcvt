import { asCurrency } from "../fun/index.js";
import { globals, magic } from "../globals.js";
import { Counter, Rates, range } from "./setupPointOfSaleForm.js";

function totalDays(counter: Counter) {
  return counter.days + counter.weeks * 7 + counter.months * 28;
}

function computePrice(counter: Counter, prices: Rates) {
  if (counter.days < 0) throw new Error("Negative days");
  if (counter.weeks < 0) throw new Error("Negative weeks");
  if (counter.months < 0) throw new Error("Negative months");
  if (counter.season < 0) throw new Error("Negative season");

  const { dailyRate, weeklyRate, monthlyRate, seasonalRate } = prices;

  const rates = [
    counter.actualDays * dailyRate,
    Math.max(counter.actualDays, magic.triggerDays.weekly) * weeklyRate,
    Math.max(counter.actualDays, magic.triggerDays.monthly) * monthlyRate,
    Math.max(counter.actualDays, magic.triggerDays.totalDaysOfOperation) *
      seasonalRate,
  ];

  return Math.min(...rates);
}

function convertToSeasonal(counter: Counter) {
  counter.days = counter.weeks = counter.months = 0;
  counter.season = 1;
  return counter;
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
    const freeDays = totalDays(counter) - counter.actualDays;
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

export function minimizeRate(counter: Counter, rates: Rates) {
  return computePrice(counter, rates);
}

function priceChart(days: Array<number>, isTentSite: boolean) {
  // generate a price chart (1-14 days, price)
  const taxRate = globals.TAX_RATE;
  const dailyRate = isTentSite ? magic.tentRate : magic.rvRate;
  const weeklyRate = isTentSite ? magic.tentWeeklyRate : magic.rvWeeklyRate;
  const monthlyRate = isTentSite ? magic.tentMonthlyRate : magic.rvMonthlyRate;
  const seasonalRate = isTentSite
    ? magic.tentSeasonalRate
    : magic.rvSeasonalRate;
  const rates = { dailyRate, weeklyRate, monthlyRate, seasonalRate };

  const prices = days.map((days) => {
    const counter = {
      actualDays: days,
      days,
      weeks: 0,
      months: 0,
      season: 0,
    } satisfies Counter;

    const price = computePrice(counter, rates);
    const tax = price * taxRate;
    const total = price + tax;
    return { days, price, tax: tax, total };
  });

  return prices;
}

export function renderPriceChart(target: HTMLElement) {
  const days = [...range(1, 14), 30, 60, 90, 120, 150];
  const tentPrices = priceChart(days, true);
  const rvPrices = priceChart(days, false);

  const rows = days
    .map(
      (day, i) =>
        `<tr>
          <td class="align-left">${day}</td>
          <td class="align-right">${asCurrency(tentPrices[i].total)}</td>
          <td class="align-right">${asCurrency(rvPrices[i].total)}</td>
        </tr>`
    )
    .join("");
  const thead = `<thead><tr>
    <th class="align-left underline bold">Days</th>
    <th class="align-right underline bold">Tent</th>
    <th class="align-right underline bold">RV</th>
    </tr></thead>`;
  const table = `<table>${thead}<tbody>${rows}</tbody></table>`;
  target.insertAdjacentHTML("beforeend", table);
}
