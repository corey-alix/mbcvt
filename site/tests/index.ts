import { D } from "../fun/D.js";

const assert = {
  eq(actual: any, expected: any, message: string) {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, but got ${actual}, ${message}`);
    }
  },
};

export function run() {
  const d1 = D.asDateOnly("2021-12-15");
  assert.eq("2021-12-15", D.asYmd(d1), "asYmd test");
}
