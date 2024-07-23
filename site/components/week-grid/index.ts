import { type SiteAvailabilityModel } from "../../db/index.js";
import { asDateString } from "../../fun/index.js";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const template = `
  <style>
  .grid {
    display: grid;
    grid-template-columns: 1fr repeat(7, 1fr);
    justify-items: center;
  }
  .row-2 {
    grid-row: span 2;
  }
  .available {
    color: green;
  }
  .reserved {
    color: red;
  }
  .center {
    text-align: center;
  }
  .title {
    font-weight: bold;
    margin-bottom: 1rem;
  }

  .site {
    font-weight: bold;
    text-transform: uppercase;
    display: flex;
    justify-content: start;
    align-items: center;
  }

  .siteday {
    border-radius: 50%;
    width: 5vw;
    height: 5vw;
    border: 0.1em solid var(--color-white);
    padding: 0.2em;
    margin: 0.2em;
    text-align: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  </style>
  <div class="start-date center title">Start date</div>
  <div class="grid">
    <div class="site row-2 center">Site</div>
    <div class="day center">Mon</div>
    <div class="day center">Tue</div>
    <div class="day center">Wed</div>
    <div class="day center">Thu</div>
    <div class="day center">Fri</div>
    <div class="day center">Sat</div>
    <div class="day center">Sun</div>
    <div class="date center">Mon</div>
    <div class="date center">Tue</div>
    <div class="date center">Wed</div>
    <div class="date center">Thu</div>
    <div class="date center">Fri</div>
    <div class="date center">Sat</div>
    <div class="date center">Sun</div>
  </div>
`;

export class WeekGrid extends HTMLElement {
  #availableSites: Array<SiteAvailabilityModel> = [];
  #startDate: Date = new Date();

  constructor() {
    super();
    this.attachShadow({
      mode: "open",
    });

    this.shadowRoot!.innerHTML = template;
  }

  set startDate(value: Date) {
    const daySinceMonday = (value.getDay() + 6) % 7;
    const monday = new Date(value);
    monday.setDate(value.getDate() - daySinceMonday);
    this.#startDate = monday;
    this.refresh();
  }

  set availableSites(value: SiteAvailabilityModel[]) {
    this.#availableSites = value;
    this.refresh();
  }

  refresh() {
    const grid = this.shadowRoot!.querySelector(".grid")!;

    // remove all "data" elements
    const data = this.shadowRoot!.querySelectorAll(".data");
    data.forEach((element) => {
      element.remove();
    });

    const startDate = this.shadowRoot!.querySelector(".start-date")!;
    const endDate = new Date(this.#startDate);
    endDate.setDate(endDate.getDate() + 6);
    startDate.textContent = `${this.#startDate.toDateString()} - ${endDate.toDateString()}`;

    const days = this.shadowRoot!.querySelectorAll(".date");
    const date = new Date(this.#startDate);
    days.forEach((day, index) => {
      day.textContent = `${date.getDate()}`;
      date.setDate(date.getDate() + 1);
    });

    const sites = this.#availableSites;
    sites.forEach((site) => {
      const siteElement = document.createElement("div");
      siteElement.textContent = `${site.site}`;
      siteElement.classList.add("site", "data");
      grid.appendChild(siteElement);

      days.forEach((day, index) => {
        const date = new Date(this.#startDate);
        date.setDate(date.getDate() + index);
        const reserved = isReserved(site, asDateString(date));
        const dayElement = document.createElement("div");
        dayElement.textContent = reserved ? "X" : "A";
        dayElement.classList.add("siteday", "data");
        dayElement.classList.add(reserved ? "reserved" : "available");
        grid.appendChild(dayElement);
        dayElement.addEventListener("click", () => {
          this.trigger("cell-click", {
            site: site.site,
            date: asDateString(date),
            reserved,
          });
        });
      });
    });
  }

  trigger(topic: string, data: any) {
    this.dispatchEvent(new CustomEvent(topic, { detail: data }));
  }
}

customElements.define("week-grid", WeekGrid);

function isReserved(site: SiteAvailabilityModel, date: string) {
  return site.reserved.some((reservation) => {
    const result =
      date >= reservation.range.start && date <= reservation.range.end;
    console.log({
      site: site.site,
      date,
      start: reservation.range.start,
      end: reservation.range.end,
      result,
    });
    return result;
  });
}
