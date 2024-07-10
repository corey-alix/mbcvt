import { range } from "./fun/index.js";

const baseRate = 14;
const sewerRate = 10;
const waterRate = 5;
const powerRate = 10;
const tax = 0.09;

export const officeInfo = {
  name: "Millbrook Campground",
  address: "1152 VT RT 100, Westfield, VT 05874",
  phone: "802.744.8085",
  email: "camp@mbcg.email",
  template: {
    "{{no-vacancy}}":
      "No sites are available on this date. Please call 802.744.8085 to see if we can find a way to accommodate you.",
  },
};

export const siteMap = [
  {
    alias: "A00",
    about: "This site is located nearest the bathhouse and above the brook.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "A01",
    about:
      "This site is near the bathhouse and has a view of the brook and the pond, as well as the children's play area.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "A02",
    about:
      "This site is near the bathhouse and has a view of the brook and the pond, as well as the children's play area.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "A03",
    about:
      "This site is a short walk from the bathhouse and sits along the brook as well as the children's play area.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B04",
    about:
      "Very spacious site across the brook and nestled in on the edge of the campground.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B05",
    about: "RV site.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B06",
    about: "RV site.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B07A",
    about: "RV site with trail access on your doorstep.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B07B",
    about: "RV site with trail access on your doorstep.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B08",
    about:
      "This RV site is centrally located in section B away from the brook and across foot-bridge from the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B09",
    about:
      "This RV site is centrally located in section B away from the brook and across foot-bridge from the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B10",
    about:
      "This RV site is relatively quiet, located near the back of section B, away from the brook and across the foot-bridge from the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B11",
    about:
      "This RV site is located in the back of section B, away from the brook and across the foot-bridge from the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B12",
    about:
      "This RV site is located near the back of section B, on the brook and across the foot-bridge from the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B13",
    about:
      "This RV site is located near the back of section B, on the brook and across the foot-bridge from the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "B16",
    about:
      "Centrally located in section B, just across the foot-bridge from the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "C14",
    about:
      "This tent site is near a playful section of the brook with some privacy and shade.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "C15",
    about:
      "This tent site shares access with site C17 and has easy access to the brook.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "C17",
    about: "This spacious tent site is suitable for a small RV or camper.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "C18",
    about:
      "This spacious tent site is suitable for a small RV or camper and is close to the restrooms but a decent walk for a shower.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "C19",
    about:
      "This secluded tent site has access to beautiful views of the brook, amazing forest experience, moderate privacy and still close to the restrooms.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "C20",
    about: "Beautiful tent site with a glorious view of the brook.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "C21",
    about: "Beautiful tent site with a glorious view of the brook.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "C22",
    about:
      "This is the most isolated site in the campground, sitting alone on top of the campground away from brook and all other guests.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "F00",
    about:
      "This is an overflow site between the pond and the brook and suitable for tents or small campers. It is a short walk to the bathhouse and the office.",
    power: true,
    water: true,
    sewer: false,
  },
  {
    alias: "F01",
    about: "Overflow site closest to the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "F02",
    about: "Overflow site near the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "F03",
    about: "Overflow site near the bathhouse.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "F04",
    about: "Overflow site near the office.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "F05",
    about: "Overflow site near the office.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "F06",
    about: "Overflow site near the office and general store.",
    power: true,
    water: true,
    sewer: true,
  },
  {
    alias: "F07",
    about: "Overflow site nearest the office and general store.",
    power: true,
    water: true,
    sewer: true,
  },
]
  .map((site, siteId) => {
    let dailyRate = baseRate;
    const { power, water, sewer, about } = site;
    if (power) dailyRate += powerRate;
    if (water) dailyRate += waterRate;
    if (sewer) dailyRate += sewerRate;

    const availableDates = range(0, 99).map((_, i) => {
      const openingDate = new Date();
      openingDate.setDate(openingDate.getDate() + i);
      // yyyy-mm-dd format
      return openingDate.toISOString().split("T")[0];
    });

    // remove some dates to simulate reservations
    // randomly remove 10 dates
    for (let i = 0; i < 3; i++) {
      const indexToRemove = Math.floor(Math.random() * availableDates.length);
      availableDates.splice(indexToRemove, Math.ceil(Math.random() * 21));
    }

    dailyRate = Math.ceil(dailyRate * (1 + tax));

    return {
      site: siteId + 1,
      ...site,
      dailyRate,
      availableDates,
      about: about || "No description provided",
    };
  })
  .sort((a, b) => a.alias.localeCompare(b.alias));
