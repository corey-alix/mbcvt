import { getStickyValue, readQueryString } from "../fun/index.js";
import { EventManager } from "../index.js";

export const PUBLIC_KEY = getStickyValue("public-key", "123");
export const DATABASE_NAME = getStickyValue("database-name", "test");
export const API_URL = "/api";

let isSaving = false;

function debounce(cb: () => void, wait = 20) {
  let h = 0;
  const callable = () => {
    return new Promise<void>((good, bad) => {
      clearTimeout(h);
      h = setTimeout(() => {
        try {
          cb();
          good();
        } catch (error) {
          bad(error);
        }
      }, wait);
    });
  };
  return callable;
}

export type SiteNoteModel = {
  site: string;
  date: string;
  note: string;
};

export type SiteAvailabilityModel = {
  site: string;
  reserved: {
    range: {
      start: string;
      end: string;
    };
  }[];
};

const sampleFormData = {
  batchId: 1,
  partyTelephone: "test",
  partyName: "test",
  siteNumber: "1001",
  siteName: "cash",
  checkIn: "2024-06-27",
  checkOut: "2024-06-28",
  adults: "1",
  children: "0",
  visitors: "0",
  woodBundles: "0",
  baseDue: "41.28",
  totalTax: "3.72",
  totalDiscount: "0.00",
  totalDue: "45.00",
  paymentDate: ["2024-06-27", "2024-06-27"],
  paymentType: ["cash", "check"],
  paymentAmount: ["45.00", "20.00"],
  balanceDue: "-20.00",
};

export type PointOfSaleFormData = typeof sampleFormData;

export type PointOfSaleReceiptModel = {
  batchId: number;
  partyTelephone: string;
  nameOfParty: string;
  dates: string;
  expenses: {
    basePrice: number;
    adults: number;
    children: number;
    visitors: number;
    woodBundles: number;
  };
  totalNet: number;
  totalTax: number;
  totalCash: number;
  discountNet: number;
  discountTax: number;
  totalPaid: number;
  balanceDue: number;
};

export type TransactionModel = {
  date: string;
  description: string;
  account: number;
  amt: number;
};

type AccountId = number;
type BatchId = number;

export type AccountModel = {
  id: AccountId;
  name: string;
  balance: number;
};

export type BatchModel = {
  id: BatchId;
  date: string;
  transactions: TransactionModel[];
};

export type FreeChlorineData = {
  freeChlorine: number;
  date: string;
  location: string;
  comment: string;
};

export type DatabaseSchema = {
  version: number;
  batches: BatchModel[];
  accounts: AccountModel[];
  transactions: TransactionModel[];
  pos: PointOfSaleFormData[];
  posReceipts: PointOfSaleReceiptModel[];
  freeChlorine: FreeChlorineData[];
  contacts: Contact[];
  siteAvailability: SiteAvailabilityModel[];
  siteNotes: SiteNoteModel[];
};

export type Contact = {
  name: string;
  phone: string;
  email: string;
  contact: string;
  defaultAccountId: AccountId;
  notes?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  street?: string;
};

class Database {

  async asAtomic(op: () => void) {
    op();
    await this.#save();
  }

  deleteNote(siteNote: { site: string; date: string }) {
    this.#data.siteNotes = this.#data.siteNotes || [];
    const index = this.#data.siteNotes.findIndex(
      (s) => s.site === siteNote.site && s.date === siteNote.date
    );
    if (index === -1) throw new Error("Note not found");
    this.#data.siteNotes.splice(index, 1);
    return this.#save();
  }

  upsertNote(siteNote: { site: string; date: string; note: string }) {
    this.#data.siteNotes = this.#data.siteNotes || [];
    const index = this.#data.siteNotes.findIndex(
      (s) => s.site === siteNote.site && s.date === siteNote.date
    );
    if (index === -1) {
      this.#data.siteNotes.push(siteNote);
    } else {
      this.#data.siteNotes[index].note = siteNote.note;
    }
    return this.#save();
  }

  getSiteNotes() {
    return this.#data.siteNotes || [];
  }

  private events = new EventManager();

  addEventListener(event: string, doit: () => void) {
    this.events.on(event, doit);
  }

  getSiteAvailability() {
    return this.#data.siteAvailability || [];
  }

  async upsertSiteAvailability(site: SiteAvailabilityModel) {
    this.#data.siteAvailability = this.#data.siteAvailability || [];
    const index = this.#data.siteAvailability.findIndex(
      (s) => s.site === site.site
    );
    if (index === -1) {
      this.#data.siteAvailability.push(site);
    } else {
      this.#data.siteAvailability[index] = site;
    }
    await this.#save();
  }

  getContacts() {
    return this.#data.contacts || [];
  }

  getContact(id: number): Contact {
    this.#data.contacts = this.#data.contacts || [];
    if (!this.#data.contacts[id]) throw new Error("Invalid ID");
    return this.#data.contacts[id];
  }

  async upsertContact(contact: Contact) {
    this.#data.contacts = this.#data.contacts || [];
    const index = this.#data.contacts.findIndex((c) => c.name === contact.name);
    if (index === -1) {
      this.#data.contacts.push(contact);
    } else {
      this.#data.contacts[index] = contact;
    }
    await this.#save();
  }

  async upsertReceipt(receipt: Partial<PointOfSaleReceiptModel>) {
    this.#data.posReceipts = this.#data.posReceipts || [];
    if (!receipt.batchId) throw "receipt.batchId missing";
    const target = this.#data.posReceipts.findIndex(
      (r) => r.batchId === receipt.batchId
    );
    if (target < 0) {
      this.#data.posReceipts.push(receipt as PointOfSaleReceiptModel);
    } else {
      this.#data.posReceipts[target] = receipt as PointOfSaleReceiptModel;
    }
    await this.#save();
  }

  getReceipt(batchId: number) {
    return this.#data.posReceipts.findLast((r) => r.batchId === batchId);
  }

  getReceipts() {
    return this.#data.posReceipts;
  }

  async addFreeChlorine(data: FreeChlorineData) {
    this.#data.freeChlorine = this.#data.freeChlorine || [];
    this.#data.freeChlorine.push(data);
    await this.#save();
  }

  getFreeChlorine() {
    return this.#data.freeChlorine || [];
  }

  getPointOfSale(batchId: number) {
    this.#data.pos = this.#data.pos || [];
    const id = this.#data.pos.findIndex((p) => p.batchId === batchId);
    if (id === -1) throw new Error("Invalid batch ID");
    return this.#data.pos[id];
  }

  async upsertPointOfSale(pos: PointOfSaleFormData) {
    this.#data.pos = this.#data.pos || [];
    const index = this.#data.pos.findIndex((p) => p.batchId === pos.batchId);
    if (index === -1) {
      this.#data.pos.push(pos);
    } else {
      this.#data.pos[index] = pos;
    }
    return await this.#save();
  }

  async rawSave(data: DatabaseSchema) {
    const backupKey = `${DATABASE_NAME}-backup-${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(this.#data));
    this.#data = data;
    return await this.#save();
  }

  deleteTransaction(index: number) {
    this.#data.transactions.splice(index, 1);
  }

  getBatches() {
    return this.#data.batches || [];
  }

  async updateBatch(batchId: number) {
    this.#data.batches = this.#data.batches || [];
    const index = this.#data.batches.findIndex((b) => b.id === batchId);
    if (index < 0) throw "Batch not found";
    this.#data.batches[index].transactions.push(...this.#data.transactions);
    this.#data.transactions = [];
    simplifyTransactions(this.#data.batches[index].transactions);
    await this.#save();
  }

  async createBatch() {
    this.#data.batches = this.#data.batches || [];
    const id = this.#data.batches.length + 1;
    this.#data.batches.push({
      id,
      date: new Date().toISOString().substring(0, 10),
      transactions: this.#data.transactions,
    });
    this.#data.transactions = [];
    await this.#save();
    return id;
  }

  getCurrentTransactions() {
    return this.#data.transactions || [];
  }

  getAccount(accountId: number) {
    const result = this.#data.accounts.find((a) => a.id === accountId);
    if (!result) throw `Account not found: ${accountId}`;
    return result;
  }

  forceAccount(accountId: number, name: string) {
    let account = this.#data.accounts.find((a) => a.id === accountId);
    if (!account) {
      account = { id: accountId, name, balance: 0 };
      this.#data.accounts.push(account);
    } else {
      account.name = name;
    }
    return account;
  }

  getAccounts() {
    return this.#data.accounts || [];
  }

  getTransactions(batchId: number) {
    return this.#data.batches.find((b) => b.id === batchId)?.transactions || [];
  }

  #emptyDatabase = {
    version: 0,
    accounts: [] as AccountModel[],
    batches: [] as BatchModel[],
    transactions: [] as TransactionModel[],
    pos: [] as PointOfSaleFormData[],
    freeChlorine: [] as FreeChlorineData[],
    contacts: [] as Contact[],
    posReceipts: [] as PointOfSaleReceiptModel[],
    siteAvailability: [] as SiteAvailabilityModel[],
    siteNotes: [] as SiteNoteModel[],
  } satisfies DatabaseSchema;

  #data = { ...this.#emptyDatabase };

  #init = false;

  constructor() {}

  async init() {
    if (this.#init) return;
    const data = localStorage.getItem(DATABASE_NAME);
    if (data) {
      this.#data = JSON.parse(data);
    }
    try {
      await this.#load();
      {
        this.#data.posReceipts = this.#data.posReceipts || [];
        const hash = {} as Record<number, PointOfSaleReceiptModel>;
        this.#data.posReceipts.forEach((r) => (hash[r.batchId] = r));
        this.#data.posReceipts = Object.values(hash);
      }
      localStorage.setItem(DATABASE_NAME, JSON.stringify(this.#data));
      this.#init = true;
    } catch (error) {
      console.error(`Failed to load data: ${error}, using cached version`);
    }
  }

  async addAccount(account: AccountModel) {
    if (!this.#data.accounts) {
      this.#data.accounts = [];
    }
    if (this.#data.accounts.find((a) => a.id === account.id))
      throw `Account already exists`;
    this.#data.accounts.push(account);
    await this.#save();
  }

  async updateAccount(account: AccountModel) {
    const targetAccount = this.#data.accounts.find((a) => a.id === account.id);
    if (!targetAccount) throw `Account not found: ${account.id}`;
    targetAccount.name = account.name;
    await this.#save();
  }

  async addTransactionPair(transaction: {
    debitAccount: number;
    creditAccount: number;
    amt: number;
    date: string;
    description: string;
  }) {
    const { debitAccount, creditAccount, amt, date, description } = transaction;
    const debit = this.#data.accounts.find((a) => a.id === debitAccount);
    if (!debit) throw `Debit account not found: ${debitAccount}`;
    const credit = this.#data.accounts.find((a) => a.id === creditAccount);
    if (!credit) throw `Credit account not found: ${creditAccount}`;

    debit.balance -= amt;
    credit.balance += amt;

    this.#data.transactions = this.#data.transactions || [];

    this.#data.transactions.push({
      account: debitAccount,
      date,
      description,
      amt,
    });

    this.#data.transactions.push({
      account: creditAccount,
      date,
      description,
      amt: -amt,
    });

    await this.#save();
  }

  async addTransaction(transactionInfo: TransactionModel) {
    this.#data.transactions = this.#data.transactions || [];
    const account = this.#data.accounts.find(
      (a) => a.id === transactionInfo.account
    );
    if (!account) throw `Account not found: ${transactionInfo.account}`;

    account.balance += transactionInfo.amt;
    this.#data.transactions.push(transactionInfo);
    await this.#save();
  }

  #save = debounce(() => this.#saveNow());

  async #saveNow() {
    if (isSaving) throw new Error("Already saving");
    isSaving = true;
    try {
      const data = JSON.stringify(this.#data);
      localStorage.setItem(DATABASE_NAME, data);

      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          key: PUBLIC_KEY,
          topic: DATABASE_NAME,
          value: data,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const json = (await response.json()) as any;
      this.#data.version = json.version;
      this.events.trigger("save", new Event("save"));
    } finally {
      isSaving = false;
    }
  }

  async #load() {
    const response = await fetch(`${API_URL}/${DATABASE_NAME}`, {
      method: "GET",
      headers: {
        // prevent caching
        "Cache-Control": "no-cache",
        // public key for the API
        "X-API-Key": PUBLIC_KEY,
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json()) as DatabaseSchema;
    this.#data = { ...this.#emptyDatabase, ...data };
  }

  public get data() {
    return this.#data;
  }
}

export const database = new Database();
function simplifyTransactions(transactions: TransactionModel[]) {
  for (let i = 0; i < transactions.length; i++) {
    const t1 = transactions[i];
    let j = i + 1;
    while (j < transactions.length) {
      const t2 = transactions[j];
      if (
        t1.account === t2.account &&
        t1.date === t2.date &&
        t1.description === t2.description
      ) {
        t1.amt += transactions[j].amt;
        transactions.splice(j, 1);
      } else {
        j++;
      }
    }
  }
  // remove all 0 transactions
  for (let i = transactions.length - 1; i >= 0; i--) {
    if (transactions[i].amt === 0) transactions.splice(i, 1);
  }
}
