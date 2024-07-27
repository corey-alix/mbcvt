import { database, type SiteAvailabilityModel } from "../../db/index.js";
import { D } from "../../fun/D.js";
import { asDateString } from "../../fun/index.js";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const template = `
  <style>

  @media (prefers-color-scheme: dark) {
    :host {
      --color-white: #ccc;
      --color-red: #a22;
      --color-black: #333;
    }
  }

  @media (prefers-color-scheme: light) {
    :host {
      --color-white: #ccc;
      --color-red: #f99;
      --color-black: #000;
    }
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
    font-size: larger;
    width: 100%;
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
    border: 0.2em solid var(--color-red);
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
    height: 2em;
    color: var(--color-white);
    background-color: var(--color-black);
  }

  .header {
    font-weight: bold;
    /* prevent this column from scrolling */
    position: sticky;
    top: 2rem;
    background-color: var(--color-black);
    color: var(--color-white);
    /* fill */
    width: 100%;
    border-bottom: 1px solid var(--color-white);
  }

  .span-row {
    grid-column: span 8;
  }

  </style>
  <div class="grid">
  <div class="span-row start-date center title">Start date</div>
    <div class="header site center">Site</div>
    <div class="header day center">Mon</div>
    <div class="header day center">Tue</div>
    <div class="header day center">Wed</div>
    <div class="header day center">Thu</div>
    <div class="header day center">Fri</div>
    <div class="header day center">Sat</div>
    <div class="header day center">Sun</div>
    <div class="spacer"></div>
    <div class="date center">Mon</div>
    <div class="date center">Tue</div>
    <div class="date center">Wed</div>
    <div class="date center">Thu</div>
    <div class="date center">Fri</div>
    <div class="date center">Sat</div>
    <div class="date center">Sun</div>
  </div>
`;

function today(now = new Date()) {
  now.setHours(0, 0, 0, 0);
  return now;
}

export class WeekGrid extends HTMLElement {
  #availableSites: Array<SiteAvailabilityModel> = [];
  #startDate = asDateString(today());

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

  set startDate(value: string) {
    const monday = D.closestMonday(D.asDateOnly(value));
    this.#startDate = D.asYmd(monday);
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
    const endDate = D.addDay(D.asDateOnly(this.#startDate), 7);
    startDate.textContent = `${this.#startDate} - ${endDate.toDateString()}`;

    const days = this.shadowRoot!.querySelectorAll(".date");
    days.forEach((day, index) => {
      const date = D.addDay(D.asDateOnly(this.#startDate), index);
      day.textContent = `${D.dayOfMonth(date)}`;
    });

    const sites = this.#availableSites;
    const notes = database.getSiteNotes();

    sites.forEach((site) => {
      const weeklyAvailability = daysOfWeek.map((dayOfWeek, index) => {
        const date = D.addDay(D.asDateOnly(this.#startDate), index);
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
        const date = D.addDay(D.asDateOnly(this.#startDate), index);
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
