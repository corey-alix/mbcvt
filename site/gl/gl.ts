import { toast } from "./toast.js";

// report uncaught exceptions
window.addEventListener("error", (event) => {
  const message = `Uncaught exception: ${event.error}`;
  toast(message);
});

export function trigger(topic: string, data?: any) {
  const event = new CustomEvent(topic, { detail: data || null });
  window.dispatchEvent(event);
}

export function on(topic: string, callback: (event?: CustomEvent) => void) {
  window.addEventListener(topic, (event) => callback(event as CustomEvent));
}

export function asShortDate(date: string) {
  return date.substring(5, 10);
}

export function navigateTo(url: string) {
  const query = new URLSearchParams(window.location.search);
  window.location.href = `${url}?${query.toString()}`;
}
