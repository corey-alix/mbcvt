import {
  getStickyValue,
  readQueryString,
  setStickyValue,
} from "../fun/index.js";

export function setupGeneralLedgerWelcomeForm() {
  const dbNameInput = document.getElementById("dbName") as HTMLInputElement;
  if (!dbNameInput) throw new Error("missing dbName input");

  const stickyInputs = document.querySelectorAll<HTMLInputElement>(
    "input[data-sticky-key]"
  );

  stickyInputs.forEach((input) => {
    const key = input.getAttribute("data-sticky-key")!;
    const value = getStickyValue(key, "");
    if (value) {
      input.value = value;
      const event = new Event("change");
      input.dispatchEvent(event);
    }
    input.addEventListener("change", () => {
      setStickyValue(key, input.value);
    });
  });

  // if there is a "database" query string, update the sticky value
  const databaseName = readQueryString("database");
  if (databaseName) {
    dbNameInput.value = databaseName;
    dbNameInput.dispatchEvent(new Event("change"));
  }
}
