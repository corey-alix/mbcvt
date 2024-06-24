import { getStickyValue, readQueryString } from "../fun/index.js";

export const PUBLIC_KEY = "123";
export const DATABASE_NAME = getStickyValue("database-name", "test");
export const API_URL = "/api";

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

export type DatabaseSchema = {
  batches: BatchModel[];
  accounts: AccountModel[];
  transactions: TransactionModel[];
};

export class Database {
  rawSave(data: DatabaseSchema) {
    const backupKey = `${DATABASE_NAME}-backup-${Date.now()}`;
    localStorage.setItem(backupKey, JSON.stringify(this.#data));
    this.#data = data;
    this.#save();
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
    if (!result) throw `Account not found`;
    return result;
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
  } satisfies DatabaseSchema;

  constructor() {}

  async init() {
    const data = localStorage.getItem(DATABASE_NAME);
    if (data) {
      this.#data = JSON.parse(data);
    }
    await this.#load().catch((error) => {
      console.error(`Failed to load data: ${error}`);
    });
  }

  async addAccount(account: AccountModel) {
    if (!this.#data.accounts) {
      this.#data.accounts = [];
    }
    this.#data.accounts.push(account);
    await this.#save();
  }

  async updateAccount(account: AccountModel) {
    const targetAccount = this.#data.accounts.find((a) => a.id === account.id);
    if (!targetAccount) throw `Account not found`;
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
