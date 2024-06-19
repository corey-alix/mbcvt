// web component for looking up an account by name or description

type Item = { id: number; keywords: string };

const template = `
<style>
.account-lookup {
  display: flex;
  flex-direction: column;
  align-items: center;
}
input {
  outline: 1px solid;
}

input.ok {
  outline-color: green;
}
</style>
<div class="account-lookup">
  <input type="text" class="ok"/>
  <span id="match">no match</span>
</div>
`;

export class AccountLookupElement extends HTMLElement {
  internals: ElementInternals;
  #root: ShadowRoot;

  #state = {
    items: [] as Array<Item>,
    value: null as number | null,
  };

  #ux = {
    input: null as HTMLInputElement | null,
    match: null as HTMLElement | null,
  };

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.#root = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render(this.shadowRoot || this.#root);
  }

  render(root: ShadowRoot) {
    this.refresh(root);
  }

  get form() {
    return this.internals.form;
  }

  get name() {
    return this.getAttribute("name");
  }

  get type() {
    return this.localName;
  }

  static get observedAttributes() {
    return ["value", "items"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;
    switch (name) {
      case "items":
        this.items = JSON.parse(newValue);
        break;
      case "value":
        this.value = newValue ? parseInt(newValue) : null;
        break;
    }
  }

  get value() {
    return this.#state.value;
  }

  set value(value: number | null) {
    this.#state.value = value;
    this.setAttribute("value", (value || "").toString());
  }

  get items() {
    return this.#state.items;
  }

  set items(value: Array<Item>) {
    this.#state.items = value;
    this.setAttribute("items", JSON.stringify(value));
  }

  refresh(root: ShadowRoot) {
    root.innerHTML = template;
    const input = (this.#ux.input = root.querySelector("input"));
    if (!input) throw new Error("input not found");

    const match = (this.#ux.match = root.querySelector("#match"));
    if (!match) throw new Error("match not found");

    input.addEventListener("keyup", () => {
      const value = input.value;

      let item: Item | null = null;

      if (isNumericLiteral(value)) {
        console.log("value is integer", value);
        item =
          this.#state.items.find((i) => i.id === Number.parseInt(value)) ||
          null;
      } else {
        console.log("value is not a key", value);
      }

      if (!item) {
        const items = this.#state.items.filter((i) =>
          i.keywords?.includes(value)
        );

        if (items.length === 1) {
          item = items[0];
        }
      }

      if (item) {
        this.value = item.id;
        match!.textContent = `${item.id} ${item.keywords}`;
        input.classList.add("ok");
      } else {
        this.value = null;
        input.classList.remove("ok");
        match!.textContent = "";
      }
    });

    if (this.#state.value) {
      const item = this.#state.items.find((i) => i.id === this.#state.value);
      if (item) {
        this.#ux.input!.value = item.keywords;
      }
    } else {
      this.#ux.input!.value = "";
    }
  }
}

customElements.define("account-lookup", AccountLookupElement);

function isNumericLiteral(value: string) {
  return /^\d+$/.test(value);
}
