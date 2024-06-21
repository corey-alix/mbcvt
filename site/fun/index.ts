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
