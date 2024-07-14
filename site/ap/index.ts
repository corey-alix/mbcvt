import { database } from "../db/index.js";
import { getElements, injectActions } from "../fun/index.js";

export async function setupAccountsPayableForm() {
  await database.init();

  const ux = {
    postToAccountForm: null as any as HTMLFormElement,
    vendor: null as any as HTMLInputElement,
    amount: null as any as HTMLInputElement,
    date: null as any as HTMLInputElement,
    submit: null as any as HTMLButtonElement,
    upsertToVendorForm: null as any as HTMLFormElement,
    vendorEditorVendorName: null as any as HTMLInputElement,
    vendorEditorLedgerAccount: null as any as HTMLInputElement,
    vendorEditorAddress: null as any as HTMLInputElement,
    vendorEditorPhone: null as any as HTMLInputElement,
    vendorEditorEmail: null as any as HTMLInputElement,
    vendorEditorContact: null as any as HTMLInputElement,
    vendorEditorSubmit: null as any as HTMLButtonElement,
    vendorList: null as any as HTMLSelectElement,
    vendorEditorButton: null as any as HTMLButtonElement,
    vendorPayButton: null as any as HTMLButtonElement,
  };

  getElements(ux, document.body);
  injectActions({
    "input-email": (input: HTMLInputElement) => {
      /* only allow valid email as input */
      input.addEventListener("input", () => {
        const value = input.value;
        if (value.match(/^.+@.+\..+$/)) {
          input.setCustomValidity("");
        } else {
          input.setCustomValidity("Invalid email address");
        }
      });
    },
    "input-telephone": (input: HTMLInputElement) => {
      /* only allow valid telephone number as input */
      input.addEventListener("input", () => {
        const value = input.value;
        if (value.match(/^\d{3}-\d{3}-\d{4}$/)) {
          input.setCustomValidity("");
        } else {
          input.setCustomValidity("Invalid telephone number");
        }
      });
    },
    "label-as-placeholder": (form: HTMLFormElement) => {
      form.querySelectorAll("label").forEach((label) => {
        const input = form.querySelector(
          `#${label.htmlFor}`
        ) as HTMLInputElement;
        input.placeholder = label.innerText;
      });
    },
    "auto-shortcut": (root: HTMLElement) => {
      // find every label with a for attribute and find the input with that id
      // if the input can be focused, setup a keyboard shortcut and modify the label text
      // to indicate the shortcut.  Prefer the first letter of the label text, but if that
      // is already used, use another letter.
      // If no letter is available, do not set a shortcut.
      const labels = Array.from(
        root.querySelectorAll<HTMLLabelElement>("label[for]")
      );

      const shortcuts = new Map<
        string,
        HTMLInputElement | HTMLButtonElement | null
      >();
      const blacklist = "d".split("");

      const inputs = labels
        .map((l) => root.querySelector<HTMLInputElement>(`#${l.htmlFor}`))
        .filter((v) => !!v) as HTMLInputElement[];

      const buttons = Array.from(
        root.querySelectorAll<HTMLButtonElement>("button")
      );

      buttons.forEach((button) => {
        if (button.disabled) return;
        const shortcut = findShortcut(button.innerText, blacklist, shortcuts);
        if (shortcut) {
          button.innerHTML = shortcut.text;
          shortcuts.set(shortcut.shortcut, button);
        }
      });

      inputs.forEach((input) => {
        if (input.disabled || input.readOnly || input.tabIndex < 0) return;
        const label = labels.find((l) => l.htmlFor === input.id);
        if (!label) return;
        const shortcut = findShortcut(label.innerText, blacklist, shortcuts);
        if (shortcut) {
          label.innerHTML = shortcut.text;
          shortcuts.set(shortcut.shortcut, input);
        }
      });

      root.addEventListener("keydown", (e) => {
        if (!e.altKey) return;
        if (e.ctrlKey || e.shiftKey || e.metaKey) return;
        const key = e.key.toLowerCase();
        if (!shortcuts.has(key)) return;
        const input = shortcuts.get(key);
        if (!input) return;
        input.focus();
        e.preventDefault();
      });
    },
    "auto-complete-gl-account": (input: HTMLInputElement) => {
      const datalist = document.createElement("datalist");
      datalist.id = `datalist_for_${input.id}`;
      input.setAttribute("list", datalist.id);
      input.insertAdjacentElement("afterend", datalist);

      const accounts = database.getAccounts();

      input.addEventListener("input", () => {
        const value = input.value;
        datalist.innerHTML = "";
        accounts.forEach((account) => {
          const searchInfo = `${account.name}`;
          if (!searchInfo.toLowerCase().includes(value.toLowerCase())) return;
          const option = document.createElement("option");
          option.value = account.id + "";
          option.textContent = account.name;
          datalist.appendChild(option);
        });
      });
    },
    "auto-populate-vendor-list": (input: HTMLSelectElement) => {
      const contacts = database.getContacts();

      contacts.forEach((vendor) => {
        const option = document.createElement("option");
        option.value = vendor.name;
        option.textContent = vendor.name;
        input.appendChild(option);
      });
    },
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
          option.text = vendor.name;
          option.value = vendor.name;
          datalist.appendChild(option);
        });
      });

      input.addEventListener("change", () => {
        const vendorName = input.value;
        const vendor = database
          .getContacts()
          .find((d) => d.name === vendorName);
        if (!vendor) {
          input.setCustomValidity(`Vendor not found: ${vendorName}`);
        } else {
          input.setCustomValidity("");
        }
      });
    },
  });

  ux.submit.addEventListener("click", () => {
    if (!ux.postToAccountForm.reportValidity()) {
      return;
    }

    const vendorName = ux.vendor.value;

    const vendor = database.getContacts().find((d) => d.name === vendorName);
    if (!vendor) {
      throw new Error(`Vendor not found: ${vendorName}`);
    }

    const amount = ux.amount.valueAsNumber;
    const date = ux.date.valueAsDate;

    ux.postToAccountForm.reset();
    ux.date.valueAsDate = new Date();
    ux.vendor.focus();
  });

  ux.vendorEditorVendorName.addEventListener("change", () => {
    const vendorName = ux.vendorEditorVendorName.value;
    const vendor = database.getContacts().find((d) => d.name === vendorName);
    if (!vendor) {
      ux.vendorEditorAddress.value = "";
      ux.vendorEditorPhone.value = "";
      ux.vendorEditorEmail.value = "";
      ux.vendorEditorContact.value = "";
    } else {
      ux.vendorEditorAddress.value = vendor.address || "";
      ux.vendorEditorPhone.value = vendor.phone || "";
      ux.vendorEditorEmail.value = vendor.email || "";
      ux.vendorEditorContact.value = vendor.contact || "";
    }
  });

  ux.vendorEditorSubmit.addEventListener("click", () => {
    if (!ux.upsertToVendorForm.reportValidity()) {
      console.error("Form is not valid");
      return;
    }

    const defaultAccountId = ux.vendorEditorLedgerAccount.valueAsNumber;
    const defaultAccount = database.getAccount(defaultAccountId);
    if (!defaultAccount) {
      throw new Error(`Account not found: ${defaultAccountId}`);
    }

    const vendorName = ux.vendorEditorVendorName.value;
    const vendor = database.getContacts().find((d) => d.name === vendorName);
    if (!vendor) {
      database.upsertContact({
        name: vendorName,
        address: ux.vendorEditorAddress.value,
        phone: ux.vendorEditorPhone.value,
        email: ux.vendorEditorEmail.value,
        contact: ux.vendorEditorContact.value,
        defaultAccountId,
        notes: "",
      });
    } else {
      vendor.address = ux.vendorEditorAddress.value;
      vendor.phone = ux.vendorEditorPhone.value;
      vendor.email = ux.vendorEditorEmail.value;
      vendor.contact = ux.vendorEditorContact.value;
      database.upsertContact(vendor);
    }
  });

  ux.vendorEditorButton.addEventListener("click", () => {
    ux.vendorEditorVendorName.value = ux.vendorList.value;
    ux.vendorEditorVendorName.dispatchEvent(new Event("change"));
    ux.vendorEditorVendorName.focus();
  });

  ux.vendorPayButton.addEventListener("click", () => {
    ux.vendor.value = ux.vendorList.value;
    ux.vendor.dispatchEvent(new Event("change"));
    ux.vendor.focus();
  });
}
function findShortcut(
  text: string,
  blacklist: string[],
  shortcuts: Map<string, HTMLInputElement | HTMLButtonElement | null>
) {
  const candidates = text
    .toLocaleLowerCase()
    .split("")
    .filter((v) => !blacklist.includes(v) && !shortcuts.has(v));

  for (let shortcut of candidates) {
    const indexOf = text
      .toLocaleLowerCase()
      .indexOf(shortcut.toLocaleLowerCase());
    if (indexOf < 0) {
      text = `${text} [${shortcut}]`;
    } else {
      const leftOf = text.slice(0, indexOf);
      const rightOf = text.slice(indexOf + 1);
      const ch = text.charAt(indexOf);
      text = `${leftOf}<u>${ch}</u>${rightOf}`;
    }
    return { text, shortcut };
  }
  return null;
}
