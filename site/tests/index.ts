import { debounce } from "../db/index.js";
import { D } from "../fun/D.js";

const assert = {
  eq(actual: any, expected: any, message: string) {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, but got ${actual}, ${message}`);
    }
  },
};

export async function run() {
  const d1 = D.asDateOnly("2021-12-15");
  assert.eq("2021-12-15", D.asYmd(d1), "asYmd test");

  let count = 0;
  const foo = debounce(() => count++);
  foo().then(() => console.assert(false, "foo 1"));
  foo().then(() => console.assert(false, "foo 2"));
  await foo(); // the others will not fire
  console.assert(count === 1, "debounce test");
}
