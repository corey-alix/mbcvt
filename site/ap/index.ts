import { database } from "../db/index.js";
import { autoShortcut, getElements, injectActions } from "../fun/index.js";

export async function setupAccountsPayableForm() {
  await database.init();

  const ux = {
    postToAccountForm: null as any as HTMLFormElement,
    postToAccountVendorName: null as any as HTMLInputElement,
    postToAccountLedgerAccount: null as any as HTMLInputElement,
    postToAccountAmount: null as any as HTMLInputElement,
    postToAccountDate: null as any as HTMLInputElement,
    postToAccountDescription: null as any as HTMLInputElement,
    postToAccountSubmitButton: null as any as HTMLButtonElement,

    vendorEditorForm: null as any as HTMLFormElement,
    vendorEditorVendorName: null as any as HTMLInputElement,
    vendorEditorLedgerAccount: null as any as HTMLInputElement,
    vendorEditorAddress: null as any as HTMLInputElement,
    vendorEditorPhone: null as any as HTMLInputElement,
    vendorEditorEmail: null as any as HTMLInputElement,
    vendorEditorContact: null as any as HTMLInputElement,
    vendorEditorSubmitButton: null as any as HTMLButtonElement,

    vendorPickerList: null as any as HTMLSelectElement,
    vendorPickerEditButton: null as any as HTMLButtonElement,
    vendorPickerCreateButton: null as any as HTMLButtonElement,
    vendorPickerPayButton: null as any as HTMLButtonElement,
  };

  getElements(ux, document.body);
  injectActions({
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
      const doit = () => {
        const contacts = database.getContacts();
        input.innerHTML = "";
        contacts.forEach((vendor) => {
          const option = document.createElement("option");
          option.value = vendor.name;
          option.textContent = vendor.name;
          input.appendChild(option);
        });
      };
      doit();
      database.addEventListener("save", doit);
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
    },
    "vendor-validator": (input: HTMLInputElement) => {
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

  ux.postToAccountSubmitButton.addEventListener("click", async () => {
    if (!ux.postToAccountForm.reportValidity()) {
      return;
    }

    const postToAccountVendorName = ux.postToAccountVendorName.value;
    const postToAccountAmount = ux.postToAccountAmount.valueAsNumber;
    const postToAccountDate = ux.postToAccountDate.valueAsDate;

    const vendor = database
      .getContacts()
      .find((d) => d.name === postToAccountVendorName);
    if (!vendor) {
      throw new Error(`Vendor not found: ${postToAccountVendorName}`);
    }

    const defaultAccountId = vendor.defaultAccountId;
    if (!defaultAccountId) throw new Error("Vendor has no default account");

    const defaultAccount = database.getAccount(defaultAccountId);
    if (!defaultAccount) throw `Account not found: ${defaultAccountId}`;

    const accountsPayableAccount = database.forceAccount(
      4001,
      "Accounts Payable"
    );

    const description =
      ux.postToAccountDescription.value ||
      `Payment to ${postToAccountVendorName}`;

    await database.addTransactionPair({
      debitAccount: defaultAccountId,
      creditAccount: accountsPayableAccount.id,
      amt: postToAccountAmount,
      date: asYearMonthDay(postToAccountDate),
      description,
    });
    await database.createBatch();

    ux.postToAccountForm.reset();
    ux.postToAccountDate.valueAsDate = new Date();
    ux.postToAccountVendorName.focus();
  });

  ux.vendorEditorVendorName.addEventListener("input", () => {
    const vendorName = ux.vendorEditorVendorName.value;
    const vendor = database.getContacts().find((d) => d.name === vendorName);
    if (!vendor) {
      ux.vendorEditorForm.reset();
      ux.vendorEditorVendorName.value = vendorName;
    } else {
      ux.vendorEditorAddress.value = vendor.address || "";
      ux.vendorEditorPhone.value = vendor.phone || "";
      ux.vendorEditorEmail.value = vendor.email || "";
      ux.vendorEditorContact.value = vendor.contact || "";
      ux.vendorEditorLedgerAccount.value = vendor.defaultAccountId + "";
    }
  });

  ux.vendorEditorSubmitButton.addEventListener("click", async () => {
    if (!ux.vendorEditorForm.reportValidity()) {
      console.error("Form is not valid");
      return;
    }

    const defaultAccountId = parseInt(ux.vendorEditorLedgerAccount.value, 10);
    const defaultAccount = database.getAccount(defaultAccountId);
    if (!defaultAccount) {
      throw new Error(`Account not found: ${defaultAccountId}`);
    }

    const vendorName = ux.vendorEditorVendorName.value;
    await database.upsertContact({
      name: vendorName,
      address: ux.vendorEditorAddress.value,
      phone: ux.vendorEditorPhone.value,
      email: ux.vendorEditorEmail.value,
      contact: ux.vendorEditorContact.value,
      defaultAccountId,
      notes: "",
    });
    // notify user of success
    ux.vendorEditorForm.reset();
  });

  ux.vendorPickerCreateButton.addEventListener("click", () => {
    ux.vendorEditorVendorName.value = "";
    ux.vendorEditorVendorName.dispatchEvent(new Event("input"));
    ux.vendorEditorVendorName.dispatchEvent(new Event("change"));
    ux.vendorEditorVendorName.focus();
  });

  ux.vendorPickerEditButton.addEventListener("click", () => {
    ux.vendorEditorVendorName.value = ux.vendorPickerList.value;
    ux.vendorEditorVendorName.dispatchEvent(new Event("input"));
    ux.vendorEditorVendorName.dispatchEvent(new Event("change"));
    ux.vendorEditorVendorName.focus();
  });

  ux.vendorPickerPayButton.addEventListener("click", () => {
    ux.postToAccountVendorName.value = ux.vendorPickerList.value;
    ux.postToAccountVendorName.dispatchEvent(new Event("input"));
    ux.postToAccountVendorName.dispatchEvent(new Event("change"));
    ux.postToAccountVendorName.focus();
  });

  ux.postToAccountVendorName.addEventListener("change", () => {
    const postToAccountVendorName = ux.postToAccountVendorName.value;
    const vendor = database
      .getContacts()
      .find((d) => d.name === postToAccountVendorName);
    if (!vendor) {
      throw new Error(`Vendor not found: ${postToAccountVendorName}`);
    }

    const defaultAccountId = vendor.defaultAccountId;
    if (!defaultAccountId) throw new Error("Vendor has no default account");

    const defaultAccount = database.getAccount(defaultAccountId);
    if (!defaultAccount) throw `Account not found: ${defaultAccountId}`;

    ux.postToAccountLedgerAccount.value = defaultAccountId + "";
  });
}

function asYearMonthDay(postToAccountDate: Date | null): string {
  if (!postToAccountDate) {
    return "";
  }
  const year = postToAccountDate.getFullYear() + "";
  const month = (postToAccountDate.getMonth() + 1 + "").padStart(2, "0");
  const day = (postToAccountDate.getDate() + "").padStart(2, "0");
  return `${year}-${month}-${day}`;
}
