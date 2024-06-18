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
