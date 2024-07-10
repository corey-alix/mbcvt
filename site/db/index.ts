import { getStickyValue, readQueryString } from "../fun/index.js";

export const PUBLIC_KEY = getStickyValue("public-key", "123");
export const DATABASE_NAME = getStickyValue("database-name", "test");
export const API_URL = "/api";

const sampleFormData = {
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
  totalDue: "45.00",
  paymentDate: ["2024-06-27", "2024-06-27"],
  paymentType: ["cash", "check"],
  paymentAmount: ["45.00", "20.00"],
  balanceDue: "-20.00",
};

export type PointOfSaleFormData = typeof sampleFormData;

export type TransactionModel = {
  date: string;
  description: string;
  account: number;
  amt: number;
};

export type AccountModel = {
  id: number;
  name: string;
  balance: number;
};

export type BatchModel = {
  id: number;
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
  batches: BatchModel[];
  accounts: AccountModel[];
  transactions: TransactionModel[];
  pos: PointOfSaleFormData[];
  freeChlorine: FreeChlorineData[];
};

class Database {
  addFreeChlorine(data: FreeChlorineData) {
    this.#data.freeChlorine = this.#data.freeChlorine || [];
    this.#data.freeChlorine.push(data);
    return this.#save();
  }

  getFreeChlorine() {
    return this.#data.freeChlorine || [];
  }

  getPointOfSale(id: number) {
    this.#data.pos = this.#data.pos || [];
    if (id < 0 || id >= this.#data.pos.length) throw new Error("Invalid ID");
    return this.#data.pos[id];
  }

  upsertPointOfSale(pos: PointOfSaleFormData) {
    this.#data.pos = this.#data.pos || [];
    this.#data.pos.push(pos);
    return this.#save();
  }

  rawSave(data: DatabaseSchema) {
    const backupKey = `${DATABASE_NAME}-backup-${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(this.#data));
    this.#data = data;
    return this.#save();
  }

  deleteTransaction(index: number) {
    this.#data.transactions.splice(index, 1);
  }

  getBatches() {
    return this.#data.batches || [];
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

  #data = {
    accounts: [] as AccountModel[],
    batches: [] as BatchModel[],
    transactions: [] as TransactionModel[],
    pos: [] as PointOfSaleFormData[],
    freeChlorine: [] as FreeChlorineData[],
  } satisfies DatabaseSchema;

  constructor() {}

  async init() {
    const data = localStorage.getItem(DATABASE_NAME);
    if (data) {
      this.#data = JSON.parse(data);
    }
    try {
      await this.#load();
    } catch (error) {
      console.error(`Failed to load data: ${error}`);
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

  async addTransaction(transactionInfo: TransactionModel) {
    if (!this.#data.transactions) {
      this.#data.transactions = [];
    }
    this.#data.transactions.push(transactionInfo);
    await this.#save();
  }

  async #save() {
    const data = JSON.stringify(this.#data);
    localStorage.setItem(DATABASE_NAME, data);

    await fetch(API_URL, {
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
  }

  async #load() {
    const response = await fetch(`${API_URL}/${DATABASE_NAME}`, {
      method: "GET",
      headers: {
        // public key for the API
        "X-API-Key": PUBLIC_KEY,
        "Content-Type": "application/json",
      },
    });
    const data = (await response.json()) as DatabaseSchema;
    this.#data = data;
  }

  public get data() {
    return this.#data;
  }
}

export const database = new Database();
