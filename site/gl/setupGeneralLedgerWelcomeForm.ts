import {
  getElements,
  getStickyValue,
  injectActions,
  readQueryString,
  setStickyValue,
} from "../fun/index.js";

export function setupGeneralLedgerWelcomeForm() {
  const ux = {
    shareUrl: null as any as HTMLInputElement,
    dbName: null as any as HTMLInputElement,
    publicKey: null as any as HTMLInputElement,
  };
  getElements(ux, document.body);
  injectActions({
    "copy-on-click": (event: HTMLInputElement) => {
      event.addEventListener("click", () => {
        event.select();
        navigator.clipboard.writeText(event.value);
      });
    },
  });

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
    ux.dbName.value = databaseName;
    ux.dbName.dispatchEvent(new Event("change"));
  }

  const publicKey = readQueryString("key");
  if (publicKey) {
    ux.publicKey.value = publicKey;
    ux.publicKey.dispatchEvent(new Event("change"));
  }

  ux.shareUrl.value = `${window.location.origin}${window.location.pathname}?database=${ux.dbName.value}&key=${ux.publicKey.value}`;
}
