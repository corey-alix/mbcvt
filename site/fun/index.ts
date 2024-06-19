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

export function asLinkToAccountHistory(account: number) {
  const database = readQueryString("database") || "test";
  const queryString = new URLSearchParams({
    account: account.toString(),
    database,
  });
  return `<a href="account-history.html?${queryString.toString()}">${account}</a>`;
}
