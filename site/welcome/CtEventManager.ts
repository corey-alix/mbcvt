import { log } from "../fun/log.js";

export class CtEventManager {
  #queue: Record<string, Array<(e?: Event) => void>> = {};
  on(topic: string, callback: (e?: Event) => void) {
    if (!this.#queue[topic]) this.#queue[topic] = [];
    this.#queue[topic].push(callback);
  }
  trigger(topic: string, e: Event) {
    log(`trigger ${topic}`);
    this.#queue[topic]?.forEach((callback) => callback(e));
  }
}
