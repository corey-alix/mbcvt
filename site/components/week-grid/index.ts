const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const template = `
  <style>
  .grid {
    display: grid;
    grid-template-columns: 1fr repeat(7, 1fr);
  }
  .site {
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
  </style>
  <div class="start-date center title">Start date</div>
  <div class="grid">
    <div class="site">Site</div>
    <div class="day">Mon</div>
    <div class="day">Tue</div>
    <div class="day">Wed</div>
    <div class="day">Thu</div>
    <div class="day">Fri</div>
    <div class="day">Sat</div>
    <div class="date">Sun</div>
    <div class="date">Mon</div>
    <div class="date">Tue</div>
    <div class="date">Wed</div>
    <div class="date">Thu</div>
    <div class="date">Fri</div>
    <div class="date">Sat</div>
    <div class="day">Sun</div>
  </div>
`;

type SiteAvailability = {
  site: number;
  reserved: {
    range: {
      start: Date;
      end: Date;
    };
  }[];
};

export class WeekGrid extends HTMLElement {
  #availableSites: Array<SiteAvailability> = [];
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
    console.log({ startDate: this.#startDate });
    this.refresh();
  }

  set availableSites(value: SiteAvailability[]) {
    this.#availableSites = value;
    this.refresh();
  }

  refresh() {
    const grid = this.shadowRoot!.querySelector(".grid")!;
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
      siteElement.classList.add("site");
      grid.appendChild(siteElement);

      const date = new Date(this.#startDate);
      days.forEach((day, index) => {
        const reserved = isReserved(site, date);
        const dayElement = document.createElement("div");
        dayElement.textContent = reserved ? "X" : "A";
        dayElement.classList.add(reserved ? "reserved" : "available");
        grid.appendChild(dayElement);
        date.setDate(date.getDate() + index);
        dayElement.addEventListener("click", () => {
          console.log({
            site: site.site,
            date: date.toDateString(),
            reserved,
          });
        });
      });
    });
  }
}

customElements.define("week-grid", WeekGrid);

function isReserved(site: SiteAvailability, date: Date) {
  return site.reserved.some((reservation) => {
    const result =
      date >= reservation.range.start && date <= reservation.range.end;
    console.log({
      date,
      start: reservation.range.start,
      end: reservation.range.end,
      result,
    });
    return result;
  });
}
