import { D } from "./D.js";

export function asCurrency(amount: number) {
  // return the amount as USD
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function safeHtml(description: string) {
  // prevent XSS attacks
  return description.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function readQueryString(name: string) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

export function asLinkToAccountHistory(account: number, text: string) {
  const queryString = new URLSearchParams({
    account: account.toString(),
  });
  return `<a href="account-history.html?${queryString.toString()}">${text}</a>`;
}

export function getStickyValue<T>(name: string, defaultValue: T) {
  const key = `sticky-${name}`;
  const value = localStorage.getItem(key);
  if (!value) return defaultValue;
  return JSON.parse(value) as T;
}

export function setStickyValue<T>(name: string, value: T) {
  const key = `sticky-${name}`;
  localStorage.setItem(key, JSON.stringify(value));
}
export function asBatchLink(batchId: number, label: string) {
  const queryString = new URLSearchParams({
    batch: batchId.toString(),
  });
  return `<a href=./general-ledger.html?${queryString.toString()}>${label}</a>`;
}

export function round(value: number, places: number) {
  const multiplier = Math.pow(10, places);
  return Math.round(value * multiplier) / multiplier;
}

export function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
}
export function getElements(
  inputs: Record<string, HTMLElement>,
  root: HTMLElement
) {
  Object.keys(inputs).forEach((key) => {
    const input = root.querySelector(`#${key}`)!;
    if (!input) throw new Error(`Input not found: ${key}`);
    (inputs as any)[key] = input;
    (input as any).name = input.id;
  });

  return inputs;
}

export function injectActions(handlers: Record<string, Function> = {}) {
  const nodes = document.querySelectorAll("[data-action]");
  nodes.forEach((actionNode) => {
    const actionNames = actionNode.getAttribute("data-action")?.split(" ");
    actionNames?.forEach((actionName) => {
      if (handlers && handlers[actionName]) {
        handlers[actionName](actionNode);
        return;
      }
      switch (actionName) {
        case "date-today":
          (actionNode as HTMLInputElement).valueAsDate = new Date();
          break;
        case "select-on-focus":
          actionNode.addEventListener("focus", () => {
            (actionNode as HTMLInputElement).select();
          });
          break;
      }
    });
  });

  // remove all data-action attributes
  nodes.forEach((node) => {
    node.removeAttribute("data-action");
  });
}

const shortcuts = new Map<
  string,
  HTMLInputElement | HTMLButtonElement | HTMLAnchorElement | null
>();

const whitelist = "abcfghijklmnopqrstuvwxyz0123456789<>".split("");

function findShortcut(text: string) {
  const candidates = text
    .toLocaleLowerCase()
    .split("")
    .filter((v) => whitelist.includes(v) && !shortcuts.has(v));

  if (!candidates.length) return null;

  for (let shortcut of candidates) {
    const indexOf = text
      .toLocaleUpperCase()
      .indexOf(shortcut.toLocaleUpperCase());
    if (indexOf < 0) throw new Error("Shortcut not found");
    const leftOf = text.slice(0, indexOf);
    const rightOf = text.slice(indexOf + 1);
    const ch = text.charAt(indexOf);
    text = `${leftOf}<u>${ch}</u>${rightOf}`;
    return { text, shortcut };
  }
  return null;
}

export function autoShortcut(root = document.body) {
  // if this is a mobile device, do nothing since there is not a physical keyboard
  if (!hasPhysicalKeyboard()) {
    console.log("no physical keyboard detected");
    return;
  }

  const labels = Array.from(
    root.querySelectorAll<HTMLLabelElement>("label[for]")
  );

  const buttons = Array.from(
    root.querySelectorAll<HTMLButtonElement>("button")
  );

  buttons.forEach((button) => {
    if (button.disabled) return;
    const shortcut = findShortcut(button.innerText);
    if (shortcut) {
      button.innerHTML = shortcut.text;
      shortcuts.set(shortcut.shortcut, button);
    }
  });

  const inputs = labels
    .map((l) => root.querySelector<HTMLInputElement>(`#${l.htmlFor}`)!)
    .filter((v) => !!v);

  inputs.forEach((input) => {
    if (input.disabled || input.readOnly || input.tabIndex < 0) return;
    const label = labels.find((l) => l.htmlFor === input.id);
    if (!label) return;
    const shortcut = findShortcut(label.innerText);
    if (shortcut) {
      label.innerHTML = shortcut.text;
      shortcuts.set(shortcut.shortcut, input);
    }
  });

  const anchors = Array.from(root.querySelectorAll<HTMLAnchorElement>("a"));
  anchors.forEach((anchor) => {
    if (anchor.tabIndex < 0) return;
    const shortcut = findShortcut(anchor.innerText);
    if (shortcut) {
      anchor.innerHTML = shortcut.text;
      shortcuts.set(shortcut.shortcut, anchor);
    }
  });

  root.addEventListener("keydown", (e) => {
    if (!e.altKey) return;
    if (e.ctrlKey || e.shiftKey || e.metaKey) return;
    const key = e.key.toLowerCase();
    if (!shortcuts.has(key)) return;
    const input = shortcuts.get(key);
    if (!input) return;
    const isButton = input instanceof HTMLButtonElement;
    const isAnchor = input instanceof HTMLAnchorElement;
    if (isButton || isAnchor) {
      input.click();
      return;
    } else {
      input.focus();
    }
    e.preventDefault();
  });
}
function hasPhysicalKeyboard() {
  return !window.matchMedia("(pointer: coarse) and (hover: none)").matches;
}

export function asDateString(date: Date) {
  return D.asYmd(date);
}
