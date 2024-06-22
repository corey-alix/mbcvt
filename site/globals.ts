export const globals = Object.freeze({
  TAX_RATE: 0.09,
});

// move into DB
const scale = 1 / 1.09;
const baseRate = 32;

export const magic = Object.freeze({
  tentRate: baseRate * scale,
  rvRate: (baseRate + 10) * scale,
  tentWeeklyRate: baseRate * 6 * scale,
  rvWeeklyRate: (baseRate + 10) * 6 * scale,
  tentMonthlyRate: baseRate * 23 * scale,
  rvMonthlyRate: (baseRate + 10) * 23 * scale,
  tentSeasonalRate: baseRate * 49.5 * scale,
  rvSeasonalRate: (baseRate + 10) * 49.5 * scale,
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
