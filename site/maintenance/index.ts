import { getElements } from "../fun/index.js";
import { database } from "../db/index.js";

export async function setupFreeChlorineForm() {
  await database.init();

  const ux = {
    freeChlorine: null as any as HTMLInputElement,
    date: null as any as HTMLInputElement,
    location: null as any as HTMLInputElement,
    submit: null as any as HTMLButtonElement,
    freeChlorineReadings: null as any as HTMLTableElement,
  };

  getElements(ux, document.body);

  ux.date.valueAsDate = new Date();

  ux.submit.addEventListener("click", () => {
    const freeChlorine = ux.freeChlorine.valueAsNumber;
    const date = ux.date.valueAsDate!.toISOString().split("T")[0];
    const location = ux.location.value;
    database.addFreeChlorine({ freeChlorine, date, location });
  });

  const readings = database.getFreeChlorine();
  readings.forEach((reading) => {
    const row = ux.freeChlorineReadings.insertRow();
    row.insertCell().textContent = reading.date;
    row.insertCell().textContent = reading.freeChlorine.toString();
    row.insertCell().textContent = reading.location;
  });
}
