import { database, type SiteAvailabilityModel } from "../../db/index.js";
import { asDateString } from "../../fun/index.js";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const template = `
  <style>
  :host {
    --color-white: #ccc;
    --color-red: #a22;
    --color-black: #333;
    --color-yellow: #dd6;
  }

  .tiny {
    font-size: xx-small;
    white-space: nowrap;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr repeat(7, 1fr);
    justify-items: center;
  }

  .grid > .hidden {
    display: none;
  } 

  .grid > .not-hidden {
    display: grid;
  } 

  .row-2 {
    grid-row: span 2;
  }

  .available {
    color: var(--color-black);
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
    font-size: larger;
    text-transform: uppercase;
    display: flex;
    justify-content: start;
    align-items: center;
  }

  .siteday {
    border-radius: 50%;
    width: clamp(1em, 5vw, 2em);
    aspect-ratio: 1;
    border: 0.1em solid var(--color-white);
    padding: 0.2em;
    margin: 0.2em;
    text-align: center;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .note {
    border: 0.2em solid var(--color-yellow);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .siteday.reserved {
    background-color: var(--color-red);
  }

  .siteday.available {
    background-color: var(--color-white);
  }

  .start-date {
    position: sticky;
    top: 0;
    background-color: var(--color-black);
    height: 1em;
  }

  .header {
    font-weight: bold;
    /* prevent this column from scrolling */
    position: sticky;
    top: 1em;
    background-color: var(--color-black);
    color: var(--color-white);
    padding: 0.5em;
    margin: 0;
    /* fill */
    width: 100%;
    border-bottom: 1px solid var(--color-white);
  }

  </style>
  <div class="start-date center title">Start date</div>
  <div class="grid">
    <div class="site row-2 center">Site</div>
    <div class="header day center">Mon</div>
    <div class="header day center">Tue</div>
    <div class="header day center">Wed</div>
    <div class="header day center">Thu</div>
    <div class="header day center">Fri</div>
    <div class="header day center">Sat</div>
    <div class="header day center">Sun</div>
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

  set showAllSites(value: boolean) {
    const sites = this.shadowRoot!.querySelectorAll(
      ".site.hidden, .siteday.hidden"
    );
    sites.forEach((site) => {
      site.classList.toggle("not-hidden", value);
    });
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

  async refresh() {
    await database.init();

    const grid = this.shadowRoot!.querySelector(".grid")!;

    // if the current focus element is a grid child, restore the focus to the child in that same position
    const focused = this.shadowRoot!.activeElement;
    let focusIndex = -1;
    if (focused instanceof HTMLElement) {
      const gridChildren = Array.from(grid.children);
      focusIndex = gridChildren.indexOf(focused);
    }
    console.log({ focused, focusIndex });

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
    const notes = database.getSiteNotes();

    sites.forEach((site) => {
      const weeklyAvailability = daysOfWeek.map((dayOfWeek, index) => {
        const date = new Date(this.#startDate);
        date.setDate(date.getDate() + index);
        const note = notes.find(
          (n) => n.site === site.site && n.date === asDateString(date)
        );
        return !!note || !isReserved(site, asDateString(date));
      });

      const hidden =
        !this.showAllSites && !weeklyAvailability.some((value) => value);

      const siteElement = document.createElement("div");
      siteElement.textContent = `${site.site.substring(0, 4)}`;
      siteElement.classList.add("site", "data");
      siteElement.classList.toggle("hidden", hidden);
      grid.appendChild(siteElement);

      days.forEach((day, index) => {
        const date = new Date(this.#startDate);
        date.setDate(date.getDate() + index);
        const reserved = isReserved(site, asDateString(date));
        const dayElement = document.createElement("div");
        dayElement.tabIndex = 0;

        const siteNote = notes.find(
          (n) => n.site === site.site && n.date === asDateString(date)
        );

        dayElement.textContent = site.site.substring(0, 2);

        dayElement.classList.add("siteday", "data");
        dayElement.classList.toggle("hidden", hidden);
        dayElement.classList.add(reserved ? "reserved" : "available");
        if (siteNote) {
          dayElement.title = siteNote.note;
          dayElement.classList.add("note");
          dayElement.textContent = "";
          dayElement.insertAdjacentHTML(
            "beforeend",
            `<div class="tiny">${siteNote.note.substring(0, 6)}</div>`
          );
        }
        grid.appendChild(dayElement);

        const doit = () => {
          this.trigger("cell-click", {
            site: site.site,
            date: asDateString(date),
            reserved,
          });
        };

        dayElement.addEventListener("keypress", (event) => {
          if (event.key === "Enter") {
            doit();
          }
        });
        dayElement.addEventListener("click", doit);
      });
    });

    if (focusIndex != -1) {
      const gridChildren = Array.from(grid.children);
      const focusElement = gridChildren[focusIndex];
      if (focusElement instanceof HTMLElement) {
        focusElement.focus();
      }
    }
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
    return result;
  });
}
