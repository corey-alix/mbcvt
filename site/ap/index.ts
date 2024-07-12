import { database } from "../db/index.js";
import { getElements, injectActions } from "../fun/index.js";

export async function setupAccountsPayableForm() {
  await database.init();

  const ux = {
    vendor: null as any as HTMLInputElement,
    amount: null as any as HTMLInputElement,
    date: null as any as HTMLInputElement,
    submit: null as any as HTMLButtonElement,
  };

  getElements(ux, document.body);
  injectActions({
    "auto-complete-vendor": (input: HTMLInputElement) => {
      const datalist = document.createElement("datalist");
      datalist.id = `datalist_for_${input.id}`;
      input.setAttribute("list", datalist.id);
      input.insertAdjacentElement("afterend", datalist);

      const contacts = database.getContacts();

      input.addEventListener("input", () => {
        const value = input.value;
        datalist.innerHTML = "";
        contacts.forEach((vendor) => {
          const searchInfo = `${vendor.name}`;
          if (!searchInfo.toLowerCase().includes(value.toLowerCase())) return;
          const option = document.createElement("option");
          option.value = vendor.name;
          datalist.appendChild(option);
        });
      });
    },
  });

  ux.submit.addEventListener("click", async () => {
    const vendor = database
      .getContacts()
      .find((d) => d.name === ux.vendor.value);
    if (!vendor) {
      console.log(`Vendor not found: ${ux.vendor.value}`);
      database.addContact({
        name: ux.vendor.value,
      });
    }

    const amount = ux.amount.valueAsNumber;
    const date = ux.date.valueAsDate;
  });
}
