export const globals = Object.freeze({
  TAX_RATE: 0.09,
});

// move into DB
const scale = 1 / (1 + globals.TAX_RATE);
const baseRate = 33;
const rvRate = baseRate + 12;

const triggerDays = {
  weekly: 7,
  monthly: 28,
  seasonal: 42,
  totalDaysOfOperation: 150,
};

const WEEKLY_DISCOUNT = 6 / 7;
const MONTHLY_DISCOUNT = 750 / (triggerDays.monthly * rvRate); // 0.811
const SEASONAL_DISCOUNT = 1950 / (triggerDays.totalDaysOfOperation * rvRate); // 0.309

const weeklyRate = (r: number) => Math.ceil(r * WEEKLY_DISCOUNT);
const monthlyRate = (r: number) => Math.ceil(r * MONTHLY_DISCOUNT);
const seasonalRate = (r: number) => Math.ceil(r * SEASONAL_DISCOUNT);

export const magic = Object.freeze({
  triggerDays,
  tentRate: baseRate * scale,
  tentWeeklyRate: weeklyRate(baseRate) * scale,
  tentMonthlyRate: monthlyRate(baseRate) * scale,
  tentSeasonalRate: seasonalRate(baseRate) * scale,

  rvRate: rvRate * scale,
  rvWeeklyRate: weeklyRate(rvRate) * scale,
  rvMonthlyRate: monthlyRate(rvRate) * scale,
  rvSeasonalRate: seasonalRate(rvRate) * scale,

  extraAdult: 5 * scale,
  extraChild: 5 * scale,
  extraVisitor: 2 * scale,
  woodBundle: 5 * scale,

  maxAdults: 2,
  maxChildren: 2,

  minSite: 2101,
  maxSite: 2199,
  minTentSite: 2127,
  cashAccount: 1001,
  saleAccount: 2001,
  firewoodAccount: 2201,
  peopleAccount: 2202,
  taxAccount: 3001,
  taxRate: globals.TAX_RATE,
});
