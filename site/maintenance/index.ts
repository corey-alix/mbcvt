import { getElements } from "../fun/index.js";
import { database } from "../db/index.js";

export async function setupFreeChlorineForm() {

  function updateReadings() {
    const readings = database.getFreeChlorine();
    [...readings].reverse().forEach((reading) => {
      const row = ux.freeChlorineReadings.insertRow();
      row.insertCell().textContent = reading.date;
      row.insertCell().textContent = reading.freeChlorine.toString();
      row.insertCell().textContent = reading.location;
      row.insertCell().textContent = reading.comment;
    });
  }
  await database.init();

  const ux = {
    freeChlorineForm: null as any as HTMLFormElement,
    freeChlorine: null as any as HTMLInputElement,
    date: null as any as HTMLInputElement,
    location: null as any as HTMLInputElement,
    comment: null as any as HTMLTextAreaElement,
    submit: null as any as HTMLButtonElement,
    freeChlorineReadings: null as any as HTMLTableElement,
  };

  getElements(ux, document.body);

  ux.date.valueAsDate = new Date();

  ux.submit.addEventListener("click", async () => {
    const freeChlorine = ux.freeChlorine.valueAsNumber;
    const date = ux.date.valueAsDate!.toISOString().split("T")[0];
    const location = ux.location.value;
    const comment = ux.comment.value;
    await database.addFreeChlorine({ freeChlorine, date, location, comment });
    updateReadings();
    ux.freeChlorineForm.reset();
  });

  updateReadings();
}
